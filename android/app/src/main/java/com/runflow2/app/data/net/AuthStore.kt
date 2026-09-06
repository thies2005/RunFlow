package com.runflow2.app.data.net

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

private val Context.authDataStore by preferencesDataStore(name = "runflow_auth")

data class AuthState(
    val loggedIn: Boolean = false,
    val userId: String? = null,
    val email: String? = null,
    val name: String? = null,
)

/**
 * Bearer-token session storage. Tokens live in a private DataStore; a
 * single-flight mutex guards refresh so concurrent 401s trigger one refresh.
 */
class AuthStore(private val context: Context) {

    private object Keys {
        val ACCESS = stringPreferencesKey("access_token")
        val REFRESH = stringPreferencesKey("refresh_token")
        val USER_ID = stringPreferencesKey("user_id")
        val EMAIL = stringPreferencesKey("email")
        val NAME = stringPreferencesKey("name")
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val refreshMutex = Mutex()
    @Volatile private var cachedAccess: String? = null
    @Volatile private var cachedRefresh: String? = null

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state

    /**
     * OAuth handshake hand-off: the browser flow ends in a runflow2:// deep
     * link; MainActivity parks the parsed result here and the login UI
     * completes the exchange. Cleared once consumed.
     */
    val pendingOAuthCode = MutableStateFlow<String?>(null)
    val pendingOAuthError = MutableStateFlow<String?>(null)

    fun offerOAuthResult(result: com.runflow2.app.data.net.StravaAuth.Callback) {
        when (result) {
            is StravaAuth.Callback.Authorized -> {
                pendingOAuthError.value = null
                pendingOAuthCode.value = result.code
            }
            is StravaAuth.Callback.Failed -> {
                pendingOAuthCode.value = null
                pendingOAuthError.value = result.error
            }
            StravaAuth.Callback.NotForUs -> Unit
        }
    }

    fun consumeOAuthCode(): String? {
        val code = pendingOAuthCode.value
        pendingOAuthCode.value = null
        return code
    }

    fun clearOAuthError() {
        pendingOAuthError.value = null
    }

    init {
        scope.launch {
            val p = context.authDataStore.data.first()
            val access = p[Keys.ACCESS]
            cachedAccess = access
            cachedRefresh = p[Keys.REFRESH]
            if (!access.isNullOrEmpty()) {
                _state.value = AuthState(
                    loggedIn = true,
                    userId = p[Keys.USER_ID],
                    email = p[Keys.EMAIL],
                    name = p[Keys.NAME],
                )
            }
        }
    }

    val stateFlow: Flow<AuthState> = context.authDataStore.data.map { p ->
        val access = p[Keys.ACCESS]
        if (access.isNullOrEmpty()) AuthState()
        else AuthState(
            loggedIn = true,
            userId = p[Keys.USER_ID],
            email = p[Keys.EMAIL],
            name = p[Keys.NAME],
        )
    }

    fun accessToken(): String? = cachedAccess
    fun refreshToken(): String? = cachedRefresh

    suspend fun saveSession(auth: AuthResponse) {
        cachedAccess = auth.accessToken
        cachedRefresh = auth.refreshToken
        context.authDataStore.edit { p ->
            p[Keys.ACCESS] = auth.accessToken
            p[Keys.REFRESH] = auth.refreshToken
            auth.user?.let { u ->
                p[Keys.USER_ID] = u.id
                u.email?.let { p[Keys.EMAIL] = it }
                u.name?.let { p[Keys.NAME] = it }
            }
        }
        _state.value = AuthState(
            loggedIn = true,
            userId = auth.user?.id,
            email = auth.user?.email,
            name = auth.user?.name,
        )
    }

    suspend fun updateTokens(access: String, refresh: String) {
        cachedAccess = access
        cachedRefresh = refresh
        context.authDataStore.edit { p ->
            p[Keys.ACCESS] = access
            p[Keys.REFRESH] = refresh
        }
    }

    suspend fun clear() {
        cachedAccess = null
        cachedRefresh = null
        _state.value = AuthState()
        context.authDataStore.edit { it.clear() }
    }

    /**
     * Single-flight refresh: the first caller refreshes, the rest reuse the
     * result. Returns the new access token or null when the session is gone.
     */
    suspend fun refreshWith(apiProvider: suspend () -> RunFlowApi): String? = refreshMutex.withLock {
        val refresh = refreshToken() ?: return@withLock null
        return@withLock try {
            val resp = apiProvider().refresh(RefreshRequest(refreshToken = refresh))
            updateTokens(resp.accessToken, resp.refreshToken)
            resp.accessToken
        } catch (e: Exception) {
            null
        }
    }
}
