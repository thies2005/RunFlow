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
 * the conversation can be reread offline. Requires sign-in. With a non-null
 * [activityId] (local row id) the screen becomes a "discuss this run" thread:
 * the server injects the activity's context into every prompt and history is
 * scoped to the activity.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiCoachScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onLogin: () -> Unit,
    activityId: String? = null,
) {
    val auth by container.authStore.state.collectAsState()
    val streaming by container.aiCoach.streaming.collectAsState()
    val error by container.aiCoach.error.collectAsState()

    var sessionId by remember { mutableStateOf<String?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var input by remember { mutableStateOf("") }

    // Activity thread target: the SERVER id the chat API understands, plus
    // the display name. Null when the row is local-only (no server context).
    var chatActivity by remember { mutableStateOf<Pair<String, String>?>(null) }
    LaunchedEffect(activityId) {
        chatActivity = activityId?.let { localId ->
            container.repository.activity(localId)
                ?.takeIf { it.serverId != null }
                ?.let { it.serverId!! to it.name }
        }
    }

    val listState = rememberLazyListState()

    // Resolve / create the chat session and refresh history when opening.
    LaunchedEffect(auth.loggedIn, chatActivity?.first) {
        if (auth.loggedIn) {
            loadError = null
            val target = chatActivity
            try {
                val id = if (target != null) {
                    container.aiCoach.ensureActivitySession(target.first).also {
                        container.aiCoach.loadHistoryForActivity(target.first)
                    }
                } else {
                    container.aiCoach.ensureSession().also {
                        container.aiCoach.loadHistory(it)
                    }
                }
                sessionId = id
            } catch (e: IOException) {
                loadError = "Offline — cached conversation only."
                sessionId = if (target != null) null else tryOfflineSession(container)
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
                title = {
                    Text(
                        chatActivity?.second?.let { "Coach · $it" } ?: "AI Coach",
                        maxLines = 1,
                    )
                },
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
                                        .onSuccess {
                                            // A fresh session keeps an activity
                                            // thread scoped: history reload is
                                            // activity-filtered, only the
                                            // server session id changes.
                                            sessionId = it
                                        }
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

        val target = chatActivity
        val messages = if (target != null) {
            container.aiCoach.observeMessagesForActivity(target.first)
                .collectAsState(initial = emptyList()).value
        } else {
            sessionId
                ?.let { container.aiCoach.observeMessages(it).collectAsState(initial = emptyList()).value }
                ?: emptyList()
        }

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
                    activityId != null && target == null -> Column(
                        Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("This run hasn't synced yet", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Once the activity reaches your account you can discuss it here.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    messages.isEmpty() -> Column(
                        Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        EmptyConversation(offlineNote = loadError != null, aboutActivity = target != null)
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
                        placeholder = {
                            Text(if (target != null) "Ask about this run…" else "Ask your coach…")
                        },
                        modifier = Modifier.weight(1f),
                        maxLines = 4,
                        keyboardOptions = KeyboardOptions.Default,
                        enabled = !streaming,
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            val id = sessionId ?: return@IconButton
                            container.aiCoach.send(id, input, target?.first)
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
            if (isUser) {
                Text(
                    shown,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            } else {
                // assistant replies arrive as markdown (web renders the same
                // content with react-markdown) — headings, lists, bold, code
                com.runflow2.app.ui.components.MarkdownText(
                    markdown = shown,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun EmptyConversation(modifier: Modifier = Modifier, offlineNote: Boolean, aboutActivity: Boolean = false) {
    Column(
        modifier.padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            if (aboutActivity) "Ask about this run" else "Ask anything about your training",
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            when {
                offlineNote -> "Offline — your conversation will load once you're connected again."
                aboutActivity -> "Pacing, effort, how it fit the plan — the coach sees this run's full data."
                else -> "Race strategy, pacing, recovery, plan tweaks — your coach knows your training data."
            },
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
