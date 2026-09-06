package com.runflow2.app.data.net

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
    private val authStore: AuthStore,
    @Volatile var baseUrl: String = Api.DEFAULT_BASE_URL,
) {
    @Volatile private var cachedApi: RunFlowApi? = null
    private val apiLock = Any()

    private val authHeaderInterceptor = Interceptor { chain ->
        val request = chain.request()
        val token = authStore.accessToken()
        val skipAuth = request.url.encodedPath.let {
            it.endsWith("/auth/refresh") || it.endsWith("/auth/email-login")
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
            if (responseCount(response) >= 2) return null
            val newToken = runBlocking {
                authStore.refreshWith { api() }
            } ?: return null
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
