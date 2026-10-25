package com.runflow2.app.data.net

import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
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

/**
 * OkHttp + Retrofit wiring: bearer-token header injection, single-flight 401
 * refresh with one automatic retry, and a hot-swappable base URL (settings).
 */
class NetworkClient(
    private val authStore: AuthStore?,
    initialBaseUrl: String = Api.DEFAULT_BASE_URL,
    settings: SettingsRepository? = null,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) {
    @Volatile
    var previousBaseUrl: String? = Api.normalizeServerUrl(initialBaseUrl)
        internal set

    @Volatile
    internal var onOriginSwitched: (() -> Unit)? = null

    @Volatile
    var baseUrl: String = Api.normalizeServerUrl(initialBaseUrl)
        set(value) {
            val normalized = Api.normalizeServerUrl(value)
            val prev = previousBaseUrl
            if (prev != null && prev != normalized) {
                AppLog.i("Net", "Server origin changed from $prev to $normalized via baseUrl setter — clearing session")
                scope.launch { runCatching { authStore?.clear() } }
                onOriginSwitched?.invoke()
            }
            previousBaseUrl = normalized
            field = normalized
        }

    @Volatile private var cachedApi: RunFlowApi? = null
    private val apiLock = Any()

    init {
        val targetSettings = settings ?: SettingsRepository.instance
        if (targetSettings != null) {
            observeSettings(targetSettings, scope)
        }
    }

    fun observeSettings(settings: SettingsRepository, scope: CoroutineScope): Job =
        observeServerUrl(settings.settings.map { it.serverUrl }, scope)

    fun observeServerUrl(serverUrlFlow: Flow<String>, scope: CoroutineScope): Job {
        return scope.launch {
            var isFirstEmission = true
            serverUrlFlow.collect { rawUrl ->
                val normalized = Api.normalizeServerUrl(rawUrl)
                val prev = previousBaseUrl
                if (!isFirstEmission && prev != null && prev != normalized) {
                    AppLog.i("Net", "Server origin changed from $prev to $normalized — clearing session")
                    runCatching { authStore?.clear() }
                    onOriginSwitched?.invoke()
                }
                isFirstEmission = false
                previousBaseUrl = normalized
                if (baseUrl != normalized) {
                    baseUrl = normalized
                    reset()
                }
            }
        }
    }

    private val authHeaderInterceptor = Interceptor { chain ->
        val request = chain.request()
        val token = authStore?.accessToken()
        val skipAuth = request.url.encodedPath.let {
            it.endsWith("/auth/refresh") ||
                it.endsWith("/auth/email-login") ||
                it.endsWith("/auth/register") ||
                it.endsWith("/auth/forgot-password")
        }
        val authed = if (!skipAuth && !token.isNullOrEmpty()) {
            request.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            request
        }
        chain.proceed(authed)
    }

    private val tokenAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            // One retry per request: give up if we already refreshed for it.
            if (responseCount(response) >= 2) {
                AppLog.w("Net", "giving up on ${response.request.url.encodedPath} after repeated 401s")
                return null
            }
            AppLog.i("Net", "401 on ${response.request.url.encodedPath} — refreshing session")
            val newToken = runBlocking {
                authStore?.refreshWith { api() }
            } ?: run {
                AppLog.w("Net", "token refresh failed — request left unauthenticated")
                return null
            }
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

    val okHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authHeaderInterceptor)
        .authenticator(tokenAuthenticator)
        .build()

    fun api(): RunFlowApi {
        cachedApi?.let { return it }
        synchronized(apiLock) {
            cachedApi?.let { return it }
            val retrofit = Retrofit.Builder()
                .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
                .client(okHttp)
                .addConverterFactory(Api.json.asConverterFactory("application/json".toMediaType()))
                .build()
            return retrofit.create(RunFlowApi::class.java).also { cachedApi = it }
        }
    }

    /** Force a rebuild after the server URL setting changes. */
    fun reset() = synchronized(apiLock) { cachedApi = null }
}
