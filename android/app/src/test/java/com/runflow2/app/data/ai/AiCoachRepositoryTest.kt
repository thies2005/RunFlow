package com.runflow2.app.data.ai

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.net.AuthResponse
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.UserDto
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [30])
class AiCoachRepositoryTest {
    private lateinit var ctx: Context
    private lateinit var db: AppDatabase
    private lateinit var server: MockWebServer
    private lateinit var client: NetworkClient
    private lateinit var auth: AuthStore
    private lateinit var settings: SettingsRepository
    private lateinit var coach: AiCoachRepository

    @Before
    fun setUp() = runBlocking {
        ctx = ApplicationProvider.getApplicationContext()
        db = Room.inMemoryDatabaseBuilder(ctx, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        server = MockWebServer().apply { start() }
        settings = SettingsRepository(ctx)
        settings.setServerUrl(server.url("/").toString())
        settings.setConnectionEnabled(true)
        auth = AuthStore(ctx)
        auth.state.first { it.initialized }
        auth.saveSession(AuthResponse("qa-token", "qa-refresh", user = UserDto("user1")))
        client = NetworkClient(auth, settings = settings)
        client.awaitReady()
        coach = AiCoachRepository(db, client, auth, settings)
    }

    @After
    fun tearDown() {
        coach.cancelStreaming()
        server.shutdown()
        db.close()
    }

    @Test
    fun `parseHttpErrorMessage surfaces JSON error and strips Error prefix`() {
        assertEquals(
            "Daily AI message limit reached. Resets at midnight UTC.",
            parseHttpErrorMessage(
                429,
                """{"error":"Error: Daily AI message limit reached. Resets at midnight UTC.","errorCode":"USER_LIMIT_REACHED"}""",
            ),
        )
        assertEquals(
            "Please add your own API key in AI Settings.",
            parseHttpErrorMessage(
                403,
                """{"error":"Please add your own API key in AI Settings.","errorCode":"NOT_CONFIGURED"}""",
            ),
        )
        assertEquals(
            "The AI service is temporarily unavailable. Please try again shortly.",
            parseHttpErrorMessage(
                503,
                """{"error":"The AI service is temporarily unavailable. Please try again shortly.","errorCode":"PROVIDER_UNAVAILABLE"}""",
            ),
        )
    }

    @Test
    fun `parseHttpErrorMessage handles 401 session vs provider auth and non-JSON fallbacks`() {
        assertEquals(
            "Session expired. Please sign in again.",
            parseHttpErrorMessage(401, """{"error":"Unauthorized"}"""),
        )
        assertEquals(
            "Session expired. Please sign in again.",
            parseHttpErrorMessage(401, ""),
        )
        assertEquals(
            "Your API key was rejected by the provider. Please check your AI settings.",
            parseHttpErrorMessage(
                401,
                """{"error":"Your API key was rejected by the provider. Please check your AI settings.","errorCode":"AUTH_FAILED"}""",
            ),
        )
        assertEquals(
            "AI coach is not enabled for your account.",
            parseHttpErrorMessage(403, "<html>Forbidden</html>"),
        )
        assertEquals(
            "AI service temporarily unavailable (502)",
            parseHttpErrorMessage(502, "<html>Bad Gateway</html>"),
        )
        assertEquals(
            "AI service temporarily unavailable (504)",
            parseHttpErrorMessage(504, ""),
        )
    }

    @Test
    fun `readBoundedBody caps oversized payloads safely`() {
        val huge = "x".repeat(40_000).toResponseBody("text/plain".toMediaType())
        val read = readBoundedBody(huge, maxBytes = 1024L)
        assertEquals(1024, read.length)
    }

    @Test
    fun `send surfaces 429 JSON error message and clears optimistic messages`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(429)
                .addHeader("Content-Type", "application/json")
                .setBody("""{"error":"Daily AI message limit reached.","errorCode":"USER_LIMIT_REACHED"}""")
        )

        coach.send("s1", "How was my run?")
        awaitStreamingFinished()

        assertEquals("Daily AI message limit reached.", coach.error.value)
        assertTrue(db.chatDao().observeForSession("s1").first().isEmpty())
    }

    @Test
    fun `send falls back to unavailable message on non-JSON 503`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(503)
                .setBody("<html>Service Unavailable</html>")
        )

        coach.send("s2", "Plan tomorrow")
        awaitStreamingFinished()

        assertEquals("AI service temporarily unavailable (503)", coach.error.value)
        assertTrue(db.chatDao().observeForSession("s2").first().isEmpty())
    }

    @Test
    fun `send distinguishes BYOK 401 AUTH_FAILED from expired session 401`() = runBlocking {
        // 1) BYOK 401 with AUTH_FAILED (refresh fails, original 401 body returned)
        server.enqueue(
            MockResponse()
                .setResponseCode(401)
                .addHeader("Content-Type", "application/json")
                .setBody("""{"error":"Your API key was rejected by the provider. Please check your AI settings.","errorCode":"AUTH_FAILED"}""")
        )
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Invalid refresh token"}"""))

        coach.send("s3", "Test key")
        awaitStreamingFinished()

        assertEquals(
            "Your API key was rejected by the provider. Please check your AI settings.",
            coach.error.value,
        )

        // 2) Session 401 with generic Unauthorized
        server.enqueue(
            MockResponse()
                .setResponseCode(401)
                .addHeader("Content-Type", "application/json")
                .setBody("""{"error":"Unauthorized"}""")
        )
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Invalid refresh token"}"""))

        coach.send("s4", "Hello")
        awaitStreamingFinished()

        assertEquals("Session expired. Please sign in again.", coach.error.value)
    }

    @Test
    fun `send strips Error prefix from SSE error events`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "text/event-stream")
                .setBody(
                    "data: {\"sessionId\":\"s5\"}\n\n" +
                        "data: {\"error\":\"Error: AI provider is temporarily rate-limited.\",\"errorCode\":\"RATE_LIMITED\"}\n\n"
                )
        )

        coach.send("s5", "Analyze week")
        awaitStreamingFinished()

        assertEquals("AI provider is temporarily rate-limited.", coach.error.value)
        assertTrue(db.chatDao().observeForSession("s5").first().isEmpty())
    }

    private suspend fun awaitStreamingFinished() {
        coach.streaming.first { !it }
    }
}
