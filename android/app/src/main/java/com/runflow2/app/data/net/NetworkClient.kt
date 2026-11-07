package com.runflow2.app.data.net

import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import java.io.IOException
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * OkHttp + Retrofit wiring: bearer-token header injection, single-flight 401
 * refresh with one automatic retry, and a hot-swappable base URL (settings).
 */
class NetworkClient(
    private val authStore: SessionTokenStore?,
    initialBaseUrl: String = "",
    private val settings: SettingsRepository? = null,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
    serverUrlFlow: Flow<String>? = settings?.settings?.map { it.serverUrl },
) {
    @Volatile
    var previousBaseUrl: String? = Api.normalizeServerUrl(initialBaseUrl)
        internal set

    @Volatile
    internal var onOriginSwitched: (() -> Unit)? = null

    @Volatile
    var baseUrl: String = Api.normalizeServerUrl(initialBaseUrl)
        private set

    @Volatile private var cachedApi: RunFlowApi? = null
    private val apiLock = Any()
    private val generation = AtomicLong(0)
    private val lifecycleMutex = Mutex()

    fun connectionGeneration(): Long = generation.get()
    fun invalidateConnection() {
        generation.incrementAndGet()
        okHttp.dispatcher.cancelAll()
    }
    suspend fun <T> withConnectionFence(expected: Long, block: suspend () -> T): T = lifecycleMutex.withLock {
        val policy = settings?.settingsOnce()
        if (generation.get() != expected || (policy != null && (!policy.connectionEnabled || policy.serverUrl.isBlank()))) {
            throw IOException("Server connection changed")
        }
        block()
    }
    suspend fun awaitConnectionWrites() = lifecycleMutex.withLock { }

    private val originReady = CompletableDeferred<Unit>()
    private val originState = MutableStateFlow<Result<String>?>(null)

    init {
        if (serverUrlFlow == null) {
            originState.value = Result.success(baseUrl)
            originReady.complete(Unit)
        }
        else observeServerUrl(serverUrlFlow, scope)
        settings?.let { store -> scope.launch { store.settings.collect { if (!it.connectionEnabled || it.serverUrl.isBlank()) okHttp.dispatcher.cancelAll() } } }
    }

    suspend fun awaitReady() = originReady.await()

    suspend fun awaitOrigin(serverUrls: Flow<String>) {
        combine(originState, serverUrls) { origin, url -> origin to Api.normalizeServerUrl(url) }
            .first { (origin, desired) -> origin != null && (origin.isFailure || origin.getOrNull() == desired) }
            .first!!.getOrThrow()
    }

    internal fun observeServerUrl(serverUrlFlow: Flow<String>, scope: CoroutineScope): Job = scope.launch {
        var first = true
        try {
            serverUrlFlow.collect { rawUrl ->
                val normalized = Api.normalizeServerUrl(rawUrl)
                if (!first && previousBaseUrl != normalized) {
                    AppLog.i("Net", "Server origin changed from $previousBaseUrl to $normalized — clearing session")
                    invalidateConnection()
                    awaitConnectionWrites()
                    authStore?.clear()
                    onOriginSwitched?.invoke()
                }
                previousBaseUrl = normalized
                synchronized(apiLock) {
                    if (baseUrl != normalized) {
                        baseUrl = normalized
                        cachedApi = null
                    }
                }
                first = false
                originState.value = Result.success(normalized)
                originReady.complete(Unit)
            }
        } catch (e: CancellationException) {
            originState.value = Result.failure(e)
            originReady.cancel(e)
            throw e
        } catch (e: Exception) {
            AppLog.e("Net", "Server settings observation failed", e)
            originState.value = Result.failure(e)
            originReady.completeExceptionally(e)
        }
    }

    internal fun requestAllowed(policy: com.runflow2.app.data.repo.AppSettings, method: String, path: String): Boolean {
        if (method == "GET" || method == "HEAD") return true
        return when {
            path.startsWith("/api/mobile/v1/activities") -> policy.uploadActivitiesEnabled
            path.startsWith("/api/mobile/v1/readiness") -> policy.healthMetricsSyncEnabled
            path.startsWith("/api/mobile/v1/user/profile") || path.startsWith("/api/mobile/v1/workouts") ||
                path.startsWith("/api/mobile/v1/goals") || path.startsWith("/api/plans") ||
                path.startsWith("/api/plan-advanced/") -> policy.uploadPlansEnabled
            else -> true
        }
    }

    private fun isAuthEndpoint(path: String): Boolean =
        path.endsWith("/auth/refresh") || path.endsWith("/auth/email-login") ||
            path.endsWith("/auth/register") || path.endsWith("/auth/login") ||
            path.endsWith("/auth/forgot-password") ||
            path.endsWith("/auth/reset-password")

    private val authHeaderInterceptor = Interceptor { chain ->
        val request = chain.request()
        val requestGeneration = generation.get()
        val policy = settings?.let { runBlocking { it.settingsOnce() } }
        if (policy != null && (!policy.connectionEnabled || policy.serverUrl.isBlank())) throw IOException("Server connection is disabled")
        val origin = request.url.newBuilder().encodedPath("/").query(null).fragment(null).build().toString().removeSuffix("/")
        if (policy != null && Api.normalizeServerUrl(policy.serverUrl) != origin) throw IOException("Server origin changed")
        if (policy != null && !requestAllowed(policy, request.method, request.url.encodedPath)) throw IOException("Upload consent is disabled")
        val authed = synchronized(apiLock) {
            if (request.url.newBuilder().encodedPath("/").query(null).fragment(null).build().toString().removeSuffix("/") != baseUrl) {
                throw IOException("Server origin changed; retry the request")
            }
            val token = authStore?.accessToken()
            val skipAuth = isAuthEndpoint(request.url.encodedPath)
            if (!skipAuth && !token.isNullOrEmpty()) {
                request.newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                request
            }
        }
        val response = chain.proceed(authed)
        val currentPolicy = settings?.let { runBlocking { it.settingsOnce() } }
        if (generation.get() != requestGeneration || (currentPolicy != null &&
                (!currentPolicy.connectionEnabled || currentPolicy.serverUrl.isBlank() || Api.normalizeServerUrl(currentPolicy.serverUrl) != origin ||
                    !requestAllowed(currentPolicy, request.method, request.url.encodedPath)))) {
            response.close()
            throw IOException("Server connection changed")
        }
        response
    }

    private val tokenAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            if (isAuthEndpoint(response.request.url.encodedPath)) return null
            // One retry per request: give up if we already refreshed for it.
            if (responseCount(response) >= 2) {
                AppLog.w("Net", "giving up on ${response.request.url.encodedPath} after repeated 401s")
                return null
            }
            val requestUrl = response.request.url
            val requestOrigin = requestUrl.newBuilder().encodedPath("/").query(null).fragment(null).build()
            val origin = requestOrigin.toString().removeSuffix("/")
            if (baseUrl != origin) return null
            // Bind refresh to the server which issued the 401, never a later setting.
            val originalApi = createApi(requestOrigin.toString())
            AppLog.i("Net", "401 on ${requestUrl.encodedPath} — refreshing session")
            val refreshGeneration = generation.get()
            val newToken = runBlocking {
                try {
                    withConnectionFence(refreshGeneration) {
                        authStore?.refreshWith {
                            if (baseUrl != origin) throw IOException("Server origin changed during refresh")
                            originalApi
                        }
                    }
                } catch (_: IOException) { null }
            } ?: run {
                AppLog.w("Net", "token refresh failed — request left unauthenticated")
                return null
            }
            if (baseUrl != origin) return null
            return response.request.newBuilder()
                .header("Authorization", "Bearer $newToken")
                .build()
        }

        private fun responseCount(response: Response): Int {
            var count = 1
            var prior = response.priorResponse
            while (prior != null) {
                count++
                prior = prior.priorResponse
            }
            return count
        }
    }

    val okHttp: OkHttpClient by lazy { OkHttpClient.Builder()
        .followRedirects(false)
        .followSslRedirects(false)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authHeaderInterceptor)
        .authenticator(tokenAuthenticator)
        .build() }

    fun api(): RunFlowApi {
        if (baseUrl.isBlank()) throw IOException("No server configured")
        cachedApi?.let { return it }
        synchronized(apiLock) {
            cachedApi?.let { return it }
            return createApi(baseUrl).also { cachedApi = it }
        }
    }

    private fun createApi(origin: String): RunFlowApi = Retrofit.Builder()
        .baseUrl(if (origin.endsWith("/")) origin else "$origin/")
        .client(okHttp)
        .addConverterFactory(Api.json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(RunFlowApi::class.java)

    /** Force a rebuild after the server URL setting changes. */
    fun reset() = synchronized(apiLock) { cachedApi = null }
}
