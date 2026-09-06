package com.runflow2.app.data.ai

import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ChatMessageEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.SendChatRequest
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import java.io.IOException
import java.util.UUID

/**
 * AI coach chat backed by the RunFlow server's AI endpoints. Messages are
 * cached in Room so conversations can be reread offline; streaming responses
 * update the cache incrementally. Everything requires an authenticated session.
 */
class AiCoachRepository(
    private val db: AppDatabase,
    private val client: NetworkClient,
    private val authStore: AuthStore,
    private val settings: SettingsRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _streaming = MutableStateFlow(false)
    val streaming: StateFlow<Boolean> = _streaming

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var activeStream: Job? = null

    fun observeMessages(sessionId: String) = db.chatDao().observeForSession(sessionId)

    fun clearError() { _error.value = null }

    /** Returns the active session id, creating or reusing a server session. */
    suspend fun ensureSession(): String {
        settings.settingsOnce().aiSessionId.takeIf { it.isNotBlank() }?.let { return it }
        val existing = runCatching { client.api().chatSessions() }.getOrNull()
        val session = existing?.sessions?.maxByOrNull {
            Api.parseInstant(it.updatedAt) ?: Api.parseInstant(it.createdAt) ?: 0L
        } ?: client.api().createChatSession().session
        settings.setAiSessionId(session.id)
        return session.id
    }

    /** Replaces the local cache with the server-side history. */
    suspend fun loadHistory(sessionId: String) {
        try {
            val history = client.api().chatHistory(sessionId).messages
            db.chatDao().deleteForSession(sessionId)
            db.chatDao().upsertAll(
                history.map {
                    ChatMessageEntity(
                        id = it.id,
                        sessionId = sessionId,
                        role = it.role,
                        content = it.content,
                        createdAt = Api.parseInstant(it.createdAt) ?: 0L,
                    )
                }
            )
        } catch (e: IOException) {
            // offline: cached history stays
        } catch (e: HttpException) {
            if (e.code() != 404) _error.value = "Could not load history (${e.code()})"
        }
    }

    /** Starts a fresh conversation; the old one remains on the server. */
    suspend fun newChat(): String {
        val session = client.api().createChatSession().session
        settings.setAiSessionId(session.id)
        return session.id
    }

    fun cancelStreaming() {
        activeStream?.cancel()
        activeStream = null
        _streaming.value = false
    }

    /**
     * Sends a message and streams the answer into the local cache. The user
     * bubble appears immediately (optimistic); on failure both rows are
     * removed again so the cache keeps matching the server history.
     */
    fun send(sessionId: String, text: String) {
        if (_streaming.value || text.isBlank()) return
        val message = text.trim()
        _streaming.value = true
        _error.value = null
        activeStream = scope.launch {
            val userId = UUID.randomUUID().toString()
            val assistantId = UUID.randomUUID().toString()
            var assistantText = ""
            db.chatDao().upsert(
                ChatMessageEntity(
                    id = userId, sessionId = sessionId, role = "user",
                    content = message, createdAt = System.currentTimeMillis(),
                )
            )
            db.chatDao().upsert(
                ChatMessageEntity(
                    id = assistantId, sessionId = sessionId, role = "assistant",
                    content = "", createdAt = System.currentTimeMillis() + 1,
                )
            )
            try {
                val sseError = streamReply(sessionId, message) { delta ->
                    assistantText += delta
                    db.chatDao().updateContent(assistantId, assistantText)
                }
                when {
                    sseError != null -> {
                        // Server rejected the request (e.g. AI access not
                        // enabled): drop the optimistic rows so the cache
                        // keeps matching server history.
                        db.chatDao().delete(userId)
                        db.chatDao().delete(assistantId)
                        _error.value = sseError
                    }
                    assistantText.isBlank() -> db.chatDao().updateContent(assistantId, "(no response)")
                }
            } catch (e: kotlinx.coroutines.CancellationException) {
                db.chatDao().updateContent(assistantId, assistantText.ifBlank { "(cancelled)" })
                throw e
            } catch (e: IOException) {
                db.chatDao().delete(userId)
                db.chatDao().delete(assistantId)
                _error.value = "No connection — message not sent. Try again when back online."
            } catch (e: HttpException) {
                db.chatDao().delete(userId)
                db.chatDao().delete(assistantId)
                _error.value = when (e.code()) {
                    401 -> "Session expired — sign in again."
                    402, 403 -> "AI coach is not enabled for your account."
                    else -> "AI coach error (${e.code()})"
                }
            } finally {
                _streaming.value = false
            }
        }
    }

    /** Streams the reply; returns the server's error message if it sent one. */
    private suspend fun streamReply(
        sessionId: String,
        message: String,
        onDelta: suspend (String) -> Unit,
    ): String? = withContext(Dispatchers.IO) {
            val body = Api.json.encodeToString(
                SendChatRequest.serializer(),
                SendChatRequest(
                    message = message,
                    sessionId = sessionId,
                    clientLocalDate = Api.localDateString(System.currentTimeMillis()),
                ),
            ).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("${client.baseUrl}/api/ai/chat")
                .header("Accept", "text/event-stream")
                .apply { authStore.accessToken()?.let { header("Authorization", "Bearer $it") } }
                .post(body)
                .build()

            client.okHttp.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    val errBody = response.body?.string().orEmpty()
                    throw HttpException(
                        retrofit2.Response.error<String>(
                            response.code,
                            errBody.toResponseBody("text/plain".toMediaType()),
                        )
                    )
                }
                val source = response.body?.source() ?: throw IOException("empty body")
                val parser = SseParser()
                while (!source.exhausted() && !parser.isDone) {
                    val line = source.readUtf8Line() ?: break
                    parser.feed(line + "\n").forEach { onDelta(it) }
                }
                parser.finish().forEach { onDelta(it) }
                parser.errorPayload
        }
    }
}
