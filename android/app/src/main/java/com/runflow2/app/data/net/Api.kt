package com.runflow2.app.data.net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Wire contract for https://runflow.schuelken.uk — mirrors the Flutter app's
 * Dio models exactly (see flutter/lib/data/models and api_constants.dart).
 * Mobile API lives under /api/mobile/v1, the AI coach under /api/ai.
 */
object Api {
    const val DEFAULT_BASE_URL = "https://runflow.schuelken.uk"

    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = false
        coerceInputValues = true
        isLenient = true
    }

    /** Lenient ISO-8601 parsing: instant, offset and (rare) plain forms. */
    fun parseInstant(raw: String?): Long? = runCatching {
        when {
            raw == null -> null
            raw.endsWith("Z") || raw.substringAfterLast('T', "").contains("Z") ->
                Instant.parse(raw).toEpochMilli()
            raw.length > 19 -> OffsetDateTime.parse(raw).toInstant().toEpochMilli()
            else -> OffsetDateTime.parse("${raw}Z").toInstant().toEpochMilli()
        }
    }.getOrNull()

    fun formatUtcDate(epochMillis: Long): String =
        DateTimeFormatter.ISO_INSTANT.format(Instant.ofEpochMilli(epochMillis))

    fun localDateString(epochMillis: Long): String {
        val d = LocalDate.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneId.systemDefault())
        return "%04d-%02d-%02d".format(d.year, d.monthValue, d.dayOfMonth)
    }
}

// ---------- auth ----------

@Serializable
data class EmailLoginRequest(val email: String, val password: String)

@Serializable
data class StravaLoginRequest(
    val code: String,
    val redirectUri: String? = null,
)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long? = null,
    val tokenType: String? = null,
    val user: UserDto? = null,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String? = null,
    val name: String? = null,
    val image: String? = null,
    val sex: String? = null,
    val birthDate: String? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val weight: Double? = null,
    val height: Double? = null,
    val vdotCorrectionFactor: Double? = null,
    val emailVerified: Boolean? = null,
)

// ---------- activities ----------

@Serializable
data class CreateActivityRequest(
    val name: String,
    val type: String,
    val startDate: String, // UTC ISO
    val distance: Double, // meters
    val movingTime: Int, // seconds
    val elapsedTime: Int, // seconds
    val averageHr: Double? = null,
    val maxHr: Int? = null,
    val averageCadence: Double? = null,
    val totalElevation: Double? = null,
    val hasHeartrate: Boolean? = null,
    val notes: String? = null,
)

@Serializable
data class UpdateActivityRequest(
    val name: String? = null,
    val notes: String? = null,
    val type: String? = null,
)

@Serializable
data class ActivityDto(
    val id: String,
    val stravaId: String? = null,
    val type: String? = null,
    val name: String? = null,
    val startDate: String? = null,
    val distance: Double = 0.0,
    val movingTime: Int = 0,
    val averageSpeed: Double? = null,
    val averageHr: Double? = null,
    val maxHr: Int? = null,
    val averageCadence: Double? = null,
    val hasHeartrate: Boolean = false,
    val totalElevation: Double = 0.0,
    val trimp: Double? = null,
    val runningTss: Double? = null,
    val estimatedVdot: Double? = null,
    val trainingType: String? = null,
    @SerialName("hrZone1Time") val hrZone1Time: Int = 0,
    @SerialName("hrZone2Time") val hrZone2Time: Int = 0,
    @SerialName("hrZone3Time") val hrZone3Time: Int = 0,
    @SerialName("hrZone4Time") val hrZone4Time: Int = 0,
    @SerialName("hrZone5Time") val hrZone5Time: Int = 0,
    @SerialName("hrZone6Time") val hrZone6Time: Int = 0,
    @SerialName("hrZone7Time") val hrZone7Time: Int = 0,
    val calories: Double? = null,
)

@Serializable
data class ActivitiesResponse(
    val activities: List<ActivityDto> = emptyList(),
    val total: Int = 0,
    val limit: Int = 0,
    val offset: Int = 0,
    val hasMore: Boolean = false,
)

@Serializable
data class ActivityWrapper(val activity: ActivityDto)

// ---------- profile ----------

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val sex: String? = null,
    val birthDate: String? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val weight: Double? = null,
    val height: Double? = null,
    val vdotCorrectionFactor: Double? = null,
)

@Serializable
data class UserWrapper(val user: UserDto)

// ---------- server-side sync trigger ----------

@Serializable
data class TriggerSyncResponse(
    val success: Boolean = false,
    val activitiesSynced: Int = 0,
    val lastSyncAt: String? = null,
)

// ---------- AI coach ----------

@Serializable
data class ChatSessionDto(
    val id: String,
    val title: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class ChatSessionsWrapper(val sessions: List<ChatSessionDto> = emptyList())

@Serializable
data class ChatSessionWrapper(val session: ChatSessionDto)

@Serializable
data class ChatMessageDto(
    val id: String,
    val sessionId: String? = null,
    val role: String = "user",
    val content: String = "",
    val createdAt: String? = null,
)

@Serializable
data class ChatMessagesWrapper(val messages: List<ChatMessageDto> = emptyList())

@Serializable
data class SendChatRequest(
    val message: String,
    val sessionId: String,
    val clientLocalDate: String,
)

/**
 * All paths are absolute (leading slash) so one Retrofit instance serves both
 * the /api/mobile/v1 API and the /api/ai coach endpoints.
 */
interface RunFlowApi {
    // auth (unauthenticated endpoints)
    @POST("/api/mobile/v1/auth/email-login")
    suspend fun emailLogin(@Body body: EmailLoginRequest): AuthResponse

    @POST("/api/mobile/v1/auth/login")
    suspend fun stravaLogin(@Body body: StravaLoginRequest): AuthResponse

    @POST("/api/mobile/v1/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponse

    // activities
    @GET("/api/mobile/v1/activities")
    suspend fun activities(
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0,
    ): ActivitiesResponse

    @POST("/api/mobile/v1/activities")
    suspend fun createActivity(@Body body: CreateActivityRequest): ActivityWrapper

    @PUT("/api/mobile/v1/activities/{id}")
    suspend fun updateActivity(@Path("id") id: String, @Body body: UpdateActivityRequest): ActivityWrapper

    // profile
    @GET("/api/mobile/v1/user/profile")
    suspend fun profile(): UserWrapper

    @PUT("/api/mobile/v1/user/profile")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): UserWrapper

    // server-side sync (e.g. Strava import); 409 = already running
    @POST("/api/mobile/v1/sync")
    suspend fun triggerServerSync(): TriggerSyncResponse

    // AI coach
    @GET("/api/ai/chat/sessions")
    suspend fun chatSessions(): ChatSessionsWrapper

    @POST("/api/ai/chat/sessions")
    suspend fun createChatSession(): ChatSessionWrapper

    @DELETE("/api/ai/chat/sessions")
    suspend fun deleteChatSession(@Query("sessionId") sessionId: String): retrofit2.Response<Unit>

    @GET("/api/ai/chat/history")
    suspend fun chatHistory(@Query("sessionId") sessionId: String): ChatMessagesWrapper
}
