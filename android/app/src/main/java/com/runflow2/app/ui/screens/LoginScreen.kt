package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.data.net.EmailLoginRequest
import com.runflow2.app.data.net.StravaAuth
import com.runflow2.app.data.net.StravaLoginRequest
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onLoggedIn: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val oauthCode by container.authStore.pendingOAuthCode.collectAsState()
    val oauthError by container.authStore.pendingOAuthError.collectAsState()

    fun completeSession(auth: com.runflow2.app.data.net.AuthResponse) {
        scope.launch {
            container.authStore.saveSession(auth)
            container.appScope.launch { container.syncManager.syncNow("login") }
            busy = false
            onLoggedIn()
        }
    }

    // The browser returned from the Strava consent page — exchange the code.
    // Runs from a stable-keyed collector: consuming the code re-emits null and
    // must NOT restart (and cancel) an in-flight exchange.
    LaunchedEffect(Unit) {
        container.authStore.pendingOAuthCode.collect { code ->
            if (code == null) return@collect
            container.authStore.consumeOAuthCode()
            busy = true
            error = null
            try {
                val resp = container.network.api().stravaLogin(
                    StravaLoginRequest(
                        code = code,
                        redirectUri = StravaAuth.callbackUriFor(container.network.baseUrl),
                    )
                )
                completeSession(resp)
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: HttpException) {
                busy = false
                error = when (e.code()) {
                    401, 400 -> "Strava sign-in was rejected. Please try again."
                    else -> "Server error (${e.code()}). Try again."
                }
            } catch (e: IOException) {
                busy = false
                error = "No connection. Try again when you're back online."
            } catch (e: Exception) {
                busy = false
                error = "Sign-in failed: ${e.message ?: "unknown error"}"
            }
        }
    }

    // The deep link carried an error instead of a code.
    LaunchedEffect(Unit) {
        container.authStore.pendingOAuthError.collect { err ->
            if (err == null) return@collect
            container.authStore.clearOAuthError()
            error = when (err) {
                "access_denied" -> "Strava sign-in was cancelled."
                "invalid_state" -> "The sign-in request expired — try again."
                "missing_code" -> "Strava did not return an authorization code."
                else -> "Strava sign-in failed: $err"
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sign in") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Sign in to your RunFlow account to sync activities across devices, get Strava imports and the AI coach.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            val context = androidx.compose.ui.platform.LocalContext.current
            OutlinedButton(
                onClick = {
                    if (busy) return@OutlinedButton
                    error = null
                    container.authStore.clearOAuthError()
                    val opened = StravaAuth.openForAuthorization(context, container.network.baseUrl)
                    if (!opened) error = "No browser available to open Strava sign-in."
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.AutoMirrored.Outlined.Send, null)
                Spacer(Modifier.width(10.dp))
                Text("Continue with Strava", fontWeight = FontWeight.SemiBold)
            }

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                HorizontalDivider(Modifier.weight(1f))
                Text("or", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                HorizontalDivider(Modifier.weight(1f))
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )

            if (error != null) {
                Text(
                    error ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Button(
                onClick = {
                    if (busy) return@Button
                    busy = true
                    error = null
                    scope.launch {
                        try {
                            val resp = container.network.api()
                                .emailLogin(EmailLoginRequest(email.trim(), password))
                            completeSession(resp)
                        } catch (e: kotlinx.coroutines.CancellationException) {
                            throw e
                        } catch (e: HttpException) {
                            busy = false
                            android.util.Log.e("RunFlowLogin", "http ${e.code()}", e)
                            error = when (e.code()) {
                                401, 400 -> "Email or password is incorrect."
                                else -> "Server error (${e.code()}). Try again."
                            }
                        } catch (e: IOException) {
                            busy = false
                            android.util.Log.e("RunFlowLogin", "io", e)
                            error = "No connection. You can still use the app offline and sign in later."
                        } catch (e: Exception) {
                            busy = false
                            android.util.Log.e("RunFlowLogin", "other", e)
                            error = "Login failed: ${e.message ?: "unknown error"}"
                        }
                    }
                },
                enabled = !busy && email.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                    Spacer(Modifier.height(8.dp))
                }
                Text(if (busy) "Signing in…" else "Sign in with email", fontWeight = FontWeight.SemiBold)
            }

            Text(
                "Sync keeps working offline: runs are stored on-device first and uploaded automatically whenever a connection is available.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
