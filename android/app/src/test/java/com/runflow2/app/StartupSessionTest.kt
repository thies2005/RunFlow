package com.runflow2.app

import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.SessionTokenStore
import com.runflow2.app.data.net.RunFlowApi
import com.runflow2.app.data.net.RefreshRequest
import com.runflow2.app.data.sync.guardSyncFailures
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.TimeUnit
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.ExecutionException
import java.io.IOException
import java.util.concurrent.atomic.AtomicReference

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class StartupSessionTest {
    private class Tokens : SessionTokenStore {
        private val mutex = Mutex()
        @Volatile var access: String? = "old"
        var refresh = "refresh"
        var clears = 0
        val clearing = CountDownLatch(1)
        override fun accessToken() = access
        override suspend fun clear() {
            clearing.countDown()
            mutex.withLock { clears++; access = null }
        }
        override suspend fun refreshWith(apiProvider: suspend () -> RunFlowApi): String? = mutex.withLock { try {
            val result = apiProvider().refresh(RefreshRequest(refresh))
            access = result.accessToken
            refresh = result.refreshToken
            access
        } catch (e: CancellationException) { throw e }
          catch (e: Exception) { null } }
    }

    @Test fun `delayed initial custom origin preserves session then only real switch clears`() = runTest {
        val urls = MutableSharedFlow<String>()
        val tokens = Tokens()
        val client = NetworkClient(tokens, scope = backgroundScope, serverUrlFlow = urls)
        val ready = async { client.awaitReady() }
        advanceUntilIdle()
        assertFalse(ready.isCompleted)
        urls.emit("https://custom.example/path")
        ready.await()
        assertEquals("https://custom.example", client.baseUrl)
        assertEquals("old", tokens.access)
        urls.emit("https://CUSTOM.example:443/another")
        advanceUntilIdle()
        assertEquals(0, tokens.clears)
        urls.emit("https://other.example")
        advanceUntilIdle()
        assertEquals(1, tokens.clears)
        assertNull(tokens.access)
        assertEquals("https://other.example", client.baseUrl)
    }

    @Test fun `settings restoration failure reaches readiness`() = runTest {
        val tokens = Tokens()
        val client = NetworkClient(tokens, scope = backgroundScope, serverUrlFlow = flow { throw IllegalStateException("settings failed") })
        advanceUntilIdle()
        try {
            client.awaitReady()
            fail("expected settings failure")
        } catch (expected: IllegalStateException) {
            assertEquals("settings failed", expected.message)
        }
        assertEquals("old", tokens.access)
    }

    @Test fun `observer cancellation releases origin waiters after initial restoration`() = runTest {
        val urls = MutableSharedFlow<String>()
        val client = NetworkClient(null)
        val observer = client.observeServerUrl(urls, backgroundScope)
        advanceUntilIdle()
        urls.emit(Api.DEFAULT_BASE_URL)
        advanceUntilIdle()
        val waiting = async { runCatching { client.awaitOrigin(flowOf("https://different.example")) } }
        advanceUntilIdle()
        assertFalse(waiting.isCompleted)
        observer.cancel()
        advanceUntilIdle()
        assertTrue(waiting.await().exceptionOrNull() is CancellationException)
    }

    @Test fun `origin switch waits for old refresh and never sends its credentials to new host`() {
        MockWebServer().use { oldServer -> MockWebServer().use { newServer ->
            oldServer.enqueue(MockResponse().setResponseCode(401))
            oldServer.enqueue(MockResponse().setBody("""{"accessToken":"old-host-new-token","refreshToken":"old-host-new-refresh"}""")
                .setBodyDelay(500, TimeUnit.MILLISECONDS))
            oldServer.enqueue(MockResponse().setResponseCode(200))
            newServer.enqueue(MockResponse().setResponseCode(200))
            val tokens = Tokens()
            val urls = MutableStateFlow(oldServer.url("/").toString())
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
            val executor = Executors.newSingleThreadExecutor()
            try {
                val client = NetworkClient(tokens, scope = scope, serverUrlFlow = urls)
                runBlocking { withTimeout(5000) { client.awaitReady() } }
                val request = executor.submit<Int> {
                    client.okHttp.newCall(Request.Builder().url(oldServer.url("/protected")).build())
                        .execute().use { it.code }
                }
                assertEquals("/protected", oldServer.takeRequest(5, TimeUnit.SECONDS)!!.path)
                assertEquals("/api/mobile/v1/auth/refresh", oldServer.takeRequest(5, TimeUnit.SECONDS)!!.path)
                urls.value = newServer.url("/").toString()
                assertTrue(tokens.clearing.await(5, TimeUnit.SECONDS))
                runBlocking { withTimeout(5000) { client.awaitOrigin(urls) } }
                try {
                    request.get(5, TimeUnit.SECONDS)
                } catch (expected: ExecutionException) {
                    assertTrue(expected.cause is IOException)
                }
                assertNull(tokens.access)
                client.okHttp.newCall(Request.Builder().url(newServer.url("/protected")).build())
                    .execute().close()
                assertNull(newServer.takeRequest(5, TimeUnit.SECONDS)!!.getHeader("Authorization"))
                assertEquals(1, newServer.requestCount)
                // A retained old Retrofit/API request must not acquire a new-host token.
                tokens.access = "new-host-token"
                try {
                    client.okHttp.newCall(Request.Builder().url(oldServer.url("/stale-request")).build())
                        .execute().close()
                    fail("stale origin request must be rejected")
                } catch (expected: IOException) {
                    assertTrue(expected.message!!.contains("origin changed"))
                }
            } finally {
                scope.cancel()
                executor.shutdownNow()
            }
        } }
    }

    @Test fun `refresh 401 terminates without clearing tokens`() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(401))
            server.enqueue(MockResponse().setResponseCode(401))
            val tokens = Tokens()
            val client = NetworkClient(tokens, initialBaseUrl = server.url("/").toString())
            val call = client.okHttp.newCall(Request.Builder().url(server.url("/protected")).build())
            call.timeout().timeout(5, TimeUnit.SECONDS)
            call.execute().use { assertEquals(401, it.code) }
            assertEquals(2, server.requestCount)
            assertEquals("old", tokens.access)
            assertEquals("refresh", tokens.refresh)
        }
    }

    @Test fun `request token snapshot cannot straddle server switch and new sign in`() {
        MockWebServer().use { oldServer -> MockWebServer().use { newServer ->
            oldServer.enqueue(MockResponse().setResponseCode(200))
            val entered = CountDownLatch(1)
            val release = CountDownLatch(1)
            val cleared = CountDownLatch(1)
            val switched = CountDownLatch(1)
            val access = AtomicReference<String?>("old")
            val tokens = object : SessionTokenStore {
                override fun accessToken(): String? {
                    entered.countDown()
                    check(release.await(5, TimeUnit.SECONDS))
                    return access.get()
                }
                override suspend fun clear() { access.set(null); cleared.countDown() }
                override suspend fun refreshWith(apiProvider: suspend () -> RunFlowApi): String? = null
            }
            val urls = MutableStateFlow(oldServer.url("/").toString())
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
            val executor = Executors.newFixedThreadPool(2)
            try {
                val client = NetworkClient(tokens, scope = scope, serverUrlFlow = urls)
                runBlocking { withTimeout(5000) { client.awaitReady() } }
                val request = executor.submit {
                    client.okHttp.newCall(Request.Builder().url(oldServer.url("/protected")).build())
                        .execute().close()
                }
                assertTrue(entered.await(5, TimeUnit.SECONDS))
                urls.value = newServer.url("/").toString()
                val signIn = executor.submit {
                    runBlocking { withTimeout(5000) { client.awaitOrigin(urls) } }
                    access.set("new-host-token")
                    switched.countDown()
                }
                assertTrue(cleared.await(5, TimeUnit.SECONDS))
                assertFalse(switched.await(200, TimeUnit.MILLISECONDS))
                release.countDown()
                request.get(5, TimeUnit.SECONDS)
                signIn.get(5, TimeUnit.SECONDS)
                assertNotEquals("Bearer new-host-token", oldServer.takeRequest(5, TimeUnit.SECONDS)!!.getHeader("Authorization"))
                assertEquals(0, newServer.requestCount)
            } finally {
                release.countDown()
                scope.cancel()
                executor.shutdownNow()
            }
        } }
    }

    @Test fun `successful refresh retries with new token`() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(401))
            server.enqueue(MockResponse().setBody("""{"accessToken":"new","refreshToken":"new-refresh"}"""))
            server.enqueue(MockResponse().setResponseCode(200))
            val tokens = Tokens()
            val client = NetworkClient(tokens, initialBaseUrl = server.url("/").toString())
            client.okHttp.newCall(Request.Builder().url(server.url("/protected")).build()).execute().use { assertEquals(200, it.code) }
            assertEquals("Bearer old", server.takeRequest().getHeader("Authorization"))
            assertNull(server.takeRequest().getHeader("Authorization"))
            assertEquals("Bearer new", server.takeRequest().getHeader("Authorization"))
            assertEquals("new-refresh", tokens.refresh)
        }
    }

    @Test fun `malformed server response becomes sync failure while retaining session`() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setBody("{invalid"))
            val tokens = Tokens()
            val client = NetworkClient(tokens, initialBaseUrl = server.url("/").toString())
            var reported: Exception? = null
            val result = guardSyncFailures({ client.api().activities(limit = 10, offset = 0); error("expected malformed response") }) { reported = it }
            assertEquals(1, result.failed)
            assertNotNull(reported)
            assertEquals("old", tokens.access)
            assertEquals("refresh", tokens.refresh)
        }
    }

    @Test fun `sync guard propagates cancellation`() = runTest {
        try {
            guardSyncFailures({ throw CancellationException("cancelled") }) { fail("cancellation must propagate") }
            fail("expected cancellation")
        } catch (expected: CancellationException) { assertEquals("cancelled", expected.message) }
    }
}
