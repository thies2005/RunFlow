package com.runflow2.app.data.ai

import androidx.room.withTransaction
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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import java.io.IOException
import java.util.UUID

private const val MAX_ERROR_BODY_BYTES = 16_384L
private val LEADING_ERROR_PREFIX = Regex("^(?:[A-Za-z]*Error:\\s*)+", RegexOption.IGNORE_CASE)

internal fun cleanErrorMessage(raw: String?): String? {
    val cleaned = raw
        ?.trim()
        ?.replace(LEADING_ERROR_PREFIX, "")
        ?.trim()
    return cleaned?.takeIf { it.isNotEmpty() }
}

internal fun readBoundedBody(body: ResponseBody?, maxBytes: Long = MAX_ERROR_BODY_BYTES): String {
    if (body == null) return ""
    return runCatching {
        body.use {
            val source = it.source()
            source.request(maxBytes + 1)
            source.readUtf8(minOf(source.buffer.size, maxBytes))
        }
    }.getOrDefault("")
}

internal fun parseHttpErrorMessage(
    code: Int,
    rawBody: String?,
    fallback: String? = null,
): String {
    val obj = rawBody
        ?.takeIf { it.isNotBlank() }
        ?.let { runCatching { Api.json.parseToJsonElement(it) as? JsonObject }.getOrNull() }

    val serverError = cleanErrorMessage(
        (obj?.get("error") as? JsonPrimitive)?.takeIf { it.isString }?.contentOrNull
    )
    val errorCode = (obj?.get("errorCode") as? JsonPrimitive)
        ?.takeIf { it.isString }
        ?.contentOrNull
        ?.trim()
        ?.takeIf { it.isNotEmpty() }

    if (code == 401) {
        if (errorCode == "AUTH_FAILED") {
            return serverError ?: "AI provider authentication failed. Please check your AI settings."
        }
        if (serverError != null && !serverError.equals("Unauthorized", ignoreCase = true)) {
            return serverError
        }
        return "Session expired. Please sign in again."
    }

    if (serverError != null) {
        return serverError
    }

    if (fallback != null) {
        return fallback
    }

    return when (code) {
        402, 403 -> "AI coach is not enabled for your account."
        else -> "AI service temporarily unavailable ($code)"
    }
}

private fun extractHttpErrorMessage(e: HttpException, fallback: String? = null): String {
    val rawBody = readBoundedBody(e.response()?.errorBody())
    return parseHttpErrorMessage(e.code(), rawBody, fallback)
}

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

    fun observeArchivedMessages() = db.chatDao().observeAll()

    fun observeMessages(sessionId: String) = db.chatDao().observeForSession(sessionId)

    /** Messages of an activity thread ("discuss this run"), across sessions. */
    fun observeMessagesForActivity(activityId: String) = db.chatDao().observeForActivity(activityId)

    fun clearError() { _error.value = null }

    /** Returns the active session id, creating or reusing a server session. */
    suspend fun ensureSession(): String {
        val generation = client.connectionGeneration()
        client.withConnectionFence(generation) { Unit }
        settings.settingsOnce().aiSessionId.takeIf { it.isNotBlank() }?.let { return it }
        val existing = runCatching { client.api().chatSessions() }.getOrNull()
        val session = existing?.sessions?.maxByOrNull {
            Api.parseInstant(it.updatedAt) ?: Api.parseInstant(it.createdAt) ?: 0L
        } ?: client.api().createChatSession().session
        client.withConnectionFence(generation) { settings.setAiSessionId(session.id) }
        return session.id
    }

    /**
     * Session id for an activity thread: reuses the session of the newest
     * locally cached activity message (threads keep their server session), or
     * creates a fresh one. Never touches the general aiSessionId setting, so
     * the main coach conversation is unaffected by activity chats.
     */
    suspend fun ensureActivitySession(activityId: String): String {
        val generation = client.connectionGeneration()
        val session = client.api().createChatSession().session.id
        return client.withConnectionFence(generation) { session }
    }

    /** Replaces the local cache with the server-side history. */
    suspend fun loadHistory(sessionId: String) {
        val generation = client.connectionGeneration()
        try {
            val history = client.api().chatHistory(sessionId).messages
            client.withConnectionFence(generation) { db.withTransaction {
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
            } }
        } catch (e: IOException) {
            // offline: cached history stays
        } catch (e: HttpException) {
            if (e.code() != 404) {
                _error.value = extractHttpErrorMessage(e, fallback = "Could not load history (${e.code()})")
            }
        }
    }

    /** Replaces the local cache of an activity thread with the server history. */
    suspend fun loadHistoryForActivity(activityId: String) {
        val generation = client.connectionGeneration()
        try {
            val history = client.api().chatHistoryByActivity(activityId).messages
            client.withConnectionFence(generation) { db.withTransaction {
            db.chatDao().upsertAll(
                history.mapNotNull { m ->
                    m.sessionId?.let { sid ->
                        ChatMessageEntity(
                            id = m.id,
                            sessionId = sid,
                            role = m.role,
                            content = m.content,
                            createdAt = Api.parseInstant(m.createdAt) ?: 0L,
                            activityId = activityId,
                        )
                    }
                }
            )
            } }
        } catch (e: IOException) {
            // offline: cached history stays
        } catch (e: HttpException) {
            if (e.code() != 404) {
                _error.value = extractHttpErrorMessage(e, fallback = "Could not load history (${e.code()})")
            }
        }
    }

    /** Starts a fresh conversation; the old one remains on the server. */
    suspend fun newChat(): String {
        val generation = client.connectionGeneration()
        val session = client.api().createChatSession().session
        client.withConnectionFence(generation) { settings.setAiSessionId(session.id) }
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
     * removed again so the cache keeps matching the server history. A non-null
     * [activityId] scopes the exchange to that activity: the server injects
     * its full context into the coach prompt and the cached rows join the
     * activity thread.
     */
    fun send(sessionId: String, text: String, activityId: String? = null) {
        if (_streaming.value || text.isBlank()) return
        val message = text.trim()
        _streaming.value = true
        _error.value = null
        activeStream = scope.launch {
            val generation = client.connectionGeneration()
            try { client.withConnectionFence(generation) { Unit } } catch (_: IOException) {
                _streaming.value = false
                _error.value = "Enable a server connection to use AI coach."
                return@launch
            }
            val userId = UUID.randomUUID().toString()
            val assistantId = UUID.randomUUID().toString()
            var assistantText = ""
            db.chatDao().upsert(
                ChatMessageEntity(
                    id = userId, sessionId = sessionId, role = "user",
                    content = message, createdAt = System.currentTimeMillis(),
                    activityId = activityId,
                )
            )
            db.chatDao().upsert(
                ChatMessageEntity(
                    id = assistantId, sessionId = sessionId, role = "assistant",
                    content = "", createdAt = System.currentTimeMillis() + 1,
                    activityId = activityId,
                )
            )
            try {
                var lastDbFlushMs = 0L
                val sseError = streamReply(sessionId, message, activityId) { delta ->
                    assistantText += delta
                    val now = System.currentTimeMillis()
                    if (now - lastDbFlushMs >= 80L) {
                        lastDbFlushMs = now
                        client.withConnectionFence(generation) { db.chatDao().updateContent(assistantId, assistantText) }
                    }
                }
                when {
                    sseError != null -> {
                        // Server rejected the request (e.g. AI access not
                        // enabled): drop the optimistic rows so the cache
                        // keeps matching server history.
                        db.chatDao().delete(userId)
                        db.chatDao().delete(assistantId)
                        _error.value = cleanErrorMessage(sseError) ?: sseError
                    }
                    assistantText.isBlank() -> db.chatDao().updateContent(assistantId, "(no response)")
                    else -> db.chatDao().updateContent(assistantId, assistantText)
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
                _error.value = extractHttpErrorMessage(e)
            } finally {
                _streaming.value = false
            }
        }
    }

    /** Streams the reply; returns the server's error message if it sent one. */
    private suspend fun streamReply(
        sessionId: String,
        message: String,
        activityId: String? = null,
        onDelta: suspend (String) -> Unit,
    ): String? = withContext(Dispatchers.IO) {
            val body = Api.json.encodeToString(
                SendChatRequest.serializer(),
                SendChatRequest(
                    message = message,
                    sessionId = sessionId,
                    clientLocalDate = Api.localDateString(System.currentTimeMillis()),
                    activityId = activityId,
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
                    val mediaType = response.body?.contentType() ?: "application/json".toMediaType()
                    val errBody = readBoundedBody(response.body)
                    throw HttpException(
                        retrofit2.Response.error<String>(
                            response.code,
                            errBody.toResponseBody(mediaType),
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
