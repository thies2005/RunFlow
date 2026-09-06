package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.runflow2.app.AppContainer
import com.runflow2.app.data.db.ChatMessageEntity
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

/**
 * AI coach chat: streamed answers from the RunFlow server, cached in Room so
 * the conversation can be reread offline. Requires sign-in.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiCoachScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onLogin: () -> Unit,
) {
    val auth by container.authStore.state.collectAsState()
    val streaming by container.aiCoach.streaming.collectAsState()
    val error by container.aiCoach.error.collectAsState()

    var sessionId by remember { mutableStateOf<String?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var input by remember { mutableStateOf("") }

    val listState = rememberLazyListState()

    // Resolve / create the chat session and refresh history when opening.
    LaunchedEffect(auth.loggedIn) {
        if (auth.loggedIn) {
            loadError = null
            try {
                val id = container.aiCoach.ensureSession()
                container.aiCoach.loadHistory(id)
                sessionId = id
            } catch (e: IOException) {
                loadError = "Offline — cached conversation only."
                sessionId = tryOfflineSession(container)
            } catch (e: HttpException) {
                loadError = "Could not open chat (${e.code()})."
            }
        }
    }

    // Stop token streaming when leaving the screen.
    DisposableEffect(Unit) {
        onDispose { container.aiCoach.cancelStreaming() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Coach") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            if (!streaming && auth.loggedIn) {
                                container.appScope.launch {
                                    runCatching { container.aiCoach.newChat() }
                                        .onSuccess { sessionId = it }
                                }
                            }
                        },
                        enabled = auth.loggedIn && !streaming,
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "New chat")
                    }
                },
            )
        },
    ) { padding ->
        if (!auth.loggedIn) {
            SignInPlaceholder(onLogin)
            return@Scaffold
        }

        val messages = sessionId
            ?.let { container.aiCoach.observeMessages(it).collectAsState(initial = emptyList()).value }
            ?: emptyList()

        // Auto-scroll to the newest message while streaming.
        LaunchedEffect(messages.size, messages.lastOrNull()?.content?.length) {
            if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
        }

        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .navigationBarsPadding(),
        ) {
            Box(Modifier.weight(1f)) {
                when {
                    sessionId == null && loadError == null -> CircularProgressIndicator(
                        Modifier.align(Alignment.Center),
                    )
                    messages.isEmpty() -> Column(
                        Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        EmptyConversation(offlineNote = loadError != null)
                        val err = error ?: loadError
                        if (err != null) {
                            Text(
                                err,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                    else -> LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(
                            horizontal = 16.dp, vertical = 12.dp,
                        ),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(messages.size) { i -> MessageBubble(messages[i]) }
                        if (loadError != null || error != null) {
                            item {
                                Text(
                                    (error ?: loadError) ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.padding(horizontal = 4.dp),
                                )
                            }
                        }
                    }
                }
            }

            Surface(tonalElevation = 2.dp) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        placeholder = { Text("Ask your coach…") },
                        modifier = Modifier.weight(1f),
                        maxLines = 4,
                        keyboardOptions = KeyboardOptions.Default,
                        enabled = !streaming,
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            val id = sessionId ?: return@IconButton
                            container.aiCoach.send(id, input)
                            input = ""
                        },
                        enabled = !streaming && input.isNotBlank() && sessionId != null,
                    ) {
                        if (streaming) {
                            CircularProgressIndicator(Modifier.width(22.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(
                                Icons.AutoMirrored.Outlined.Send,
                                contentDescription = "Send",
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(m: ChatMessageEntity) {
    val isUser = m.role == "user"
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
    ) {
        val shown = m.content.ifBlank { "…" }
        Box(
            Modifier
                .widthIn(max = 300.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isUser) 16.dp else 4.dp,
                        bottomEnd = if (isUser) 4.dp else 16.dp,
                    )
                )
                .background(
                    if (isUser) MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.surfaceVariant
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(
                shown,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isUser) MaterialTheme.colorScheme.onPrimaryContainer
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun EmptyConversation(modifier: Modifier = Modifier, offlineNote: Boolean) {
    Column(
        modifier.padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Ask anything about your training", style = MaterialTheme.typography.titleMedium)
        Text(
            if (offlineNote) "Offline — your conversation will load once you're connected again."
            else "Race strategy, pacing, recovery, plan tweaks — your coach knows your training data.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SignInPlaceholder(onLogin: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
    ) {
        Text("The AI coach needs your account", style = MaterialTheme.typography.titleMedium)
        Text(
            "Sign in to chat with a coach that sees your training history, fitness and race goals.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        androidx.compose.material3.Button(onClick = onLogin) { Text("Sign in") }
    }
}

/** Best-effort offline fallback: reuse the last session id from settings. */
private suspend fun tryOfflineSession(container: AppContainer): String? =
    container.settings.settingsOnce().aiSessionId.takeIf { it.isNotBlank() }
