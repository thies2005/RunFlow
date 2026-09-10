package com.runflow2.app.data.net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
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

    /**
     * Server URLs are origin-only (scheme + host + optional port). Paths like
     * /api/mobile/v1 must never be part of the base: API endpoints are
     * host-absolute, but the OAuth redirect URI is built by concatenation and
     * a path would silently produce a nonexistent callback URL.
     */
    fun normalizeServerUrl(input: String): String {
        val raw = input.trim()
        if (raw.isEmpty()) return DEFAULT_BASE_URL
        val withScheme = if (raw.startsWith("http://") || raw.startsWith("https://")) raw else "https://$raw"
        return runCatching {
            val uri = java.net.URI(withScheme)
            val port = if (uri.port > 0) ":${uri.port}" else ""
            "${uri.scheme}://${uri.host}$port"
        }.getOrDefault(DEFAULT_BASE_URL)
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

// ---------- plans ----------
//
// The server generates plans (VDOT resolution → phases → sport dispatch) and
// /api/plans accepts the mobile JWT, so the app delegates creation to the web
// engine and reconciles plans like any other entity. DTOs stay narrow, with
// one exception: structuredSteps arrives as arbitrary JSON in two server
// shapes (generator flat {"steps":[…]} and builder nested
// {"warmup":…,"main":[…],"cooldown":…}) and is captured as a raw JsonElement,
// stringified only when persisted. The builder's HR/pace ranges are captured
// too (ints for bpm, seconds-per-km doubles for pace); zone *label* strings
// and other web-only fields (_count, color, …) are still dropped via
// ignoreUnknownKeys.

@Serializable
data class PlanWorkoutDto(
    val id: String,
    val goalId: String? = null,
    val scheduledDate: String? = null, // ISO; plan dates are UTC midnights
    val workoutType: String? = null,
    val description: String? = null,
    val phase: String? = null,
    val order: Int? = null,
    val targetDistance: Double? = null, // meters
    val targetDuration: Int? = null, // seconds
    val targetPace: Double? = null, // seconds per km
    // builder target range: pace bounds in seconds per km, HR bounds in bpm
    val targetPaceMinSecondsPerKm: Double? = null,
    val targetPaceMaxSecondsPerKm: Double? = null,
    val targetHrZone: Int? = null,
    val targetHrMinBpm: Int? = null,
    val targetHrMaxBpm: Int? = null,
    val structuredSteps: JsonElement? = null, // raw shape; parsed at record time
    val isCompleted: Boolean = false,
    val completedAt: String? = null,
    val linkedActivityId: String? = null,
    val customName: String? = null,
    val displayDesc: String? = null,
)

@Serializable
data class PlanGoalDto(
    val id: String,
    val name: String? = null,
    val raceType: String? = null,
    val raceDate: String? = null, // ISO
    val planStartDate: String? = null,
    val createdAt: String? = null,
    val targetTime: Int? = null, // seconds
    val currentVdot: Double? = null,
    val weeklyMileageGoal: Double? = null, // meters
    val planWeeks: Int? = null,
    val runsPerWeek: Int? = null,
    val strengthPerWeek: Int? = null,
    val taperWeeks: Int? = null,
    val longRunDay: Int? = null, // 0=Sunday..6=Saturday
    val workoutDay: Int? = null,
    val swimDay: Int? = null,
    val restDays: List<Int>? = null, // 0..6
    val isActive: Boolean = false,
    val completedAt: String? = null,
    val sport: String? = null,
    val customDistanceM: Double? = null,
    // builder plan metadata
    val creationMode: String? = null,
    val guidanceLevel: String? = null,
    val workouts: List<PlanWorkoutDto> = emptyList(),
)

@Serializable
data class PlansResponse(val goals: List<PlanGoalDto> = emptyList())

@Serializable
data class CreatePlanResponse(val goal: PlanGoalDto, val plan: PlanGoalDto? = null)

/**
 * Body for POST /api/plans/import — an explicit workout list (NO server-side
 * regeneration), the upload path for device-created plans. Units mirror
 * [CreatePlanRequest]/[CreateWorkoutRequest]: meters, seconds, seconds per km,
 * date-only strings, JS days 0..6. workoutType/phase carry the RAW web enum
 * values so server-only types (BRICK, TRANSITION_PRACTICE, …) and phases
 * (ENDURANCE, TUNE_UP, …) survive the round trip.
 */
@Serializable
data class ImportPlanRequest(
    val name: String,
    val sport: String? = null, // RUN | TRIATHLON
    val raceType: String? = null, // null for no-race plans
    val raceDate: String? = null, // YYYY-MM-DD
    val planStartDate: String? = null, // YYYY-MM-DD
    val targetTime: Int? = null, // seconds
    val planWeeks: Int? = null,
    val taperWeeks: Int? = null,
    val peakWeeks: Int? = null,
    val buildWeeks: Int? = null,
    val currentVdot: Double? = null,
    val weeklyMileageGoal: Int? = null, // meters
    val runsPerWeek: Int? = null,
    val ridesPerWeek: Int? = null,
    val swimsPerWeek: Int? = null,
    val strengthPerWeek: Int? = null,
    val longRunDay: Int? = null, // 0=Sunday..6=Saturday
    val workoutDay: Int? = null,
    val restDays: List<Int>? = null, // 0..6
    val creationMode: String? = null, // server defaults to EXPERT_MANUAL
    val workouts: List<ImportWorkoutRequest>,
)

/** One workout of [ImportPlanRequest]; [localId] is echoed back in the idMap. */
@Serializable
data class ImportWorkoutRequest(
    val localId: String,
    val scheduledDate: String, // YYYY-MM-DD
    val workoutType: String, // raw web enum value
    val phase: String, // raw web enum value
    val description: String? = null,
    val customName: String? = null,
    val targetDistance: Double? = null, // meters
    val targetDuration: Int? = null, // seconds
    val targetPace: Double? = null, // seconds per km
    val targetHrZone: Int? = null,
    val targetHrMinBpm: Int? = null,
    val targetHrMaxBpm: Int? = null,
    val targetPaceMinSecondsPerKm: Double? = null,
    val targetPaceMaxSecondsPerKm: Double? = null,
    val structuredSteps: JsonElement? = null, // generator flat shape, raw
    val order: Int, // explicit, always sent (server default is the array index)
)

/** Response of POST /api/plans/import: new goal id + localId → server workout id. */
@Serializable
data class ImportPlanResponse(
    val goalId: String,
    val idMap: Map<String, String> = emptyMap(),
)

/** Body for POST /api/plans — the web's PlanCreateInputSchema (distances in meters, days 0..6). */
@Serializable
data class CreatePlanRequest(
    val name: String,
    val sport: String? = null, // RUN | TRIATHLON | NO_RACE
    val raceType: String? = null,
    val raceDate: String? = null, // YYYY-MM-DD (parses as UTC midnight server-side)
    val planStartDate: String? = null,
    val durationWeeks: Int? = null, // plan length for NO_RACE plans
    val runsPerWeek: Int? = null,
    val strengthPerWeek: Int? = null,
    val weeklyMileageGoal: Double? = null, // meters
    val maxLongRunKm: Double? = null, // kilometers
    val taperWeeks: Int? = null,
    val longRunDay: Int? = null,
    val workoutDay: Int? = null,
    val restDays: List<Int>? = null,
    val targetTime: Int? = null, // seconds
    val calibrationTime: Int? = null, // seconds
    val calibrationDistance: String? = null, // 5K | 10K | HALF | MARATHON
    val customDistanceM: Double? = null,
    val planSource: String? = null,
)

@Serializable
data class PatchWorkoutRequest(
    val workoutType: String? = null,
    val description: String? = null,
    val targetDistance: Double? = null, // meters
    val targetPace: Double? = null, // seconds per km
    val targetDuration: Int? = null, // seconds
    val scheduledDate: String? = null, // YYYY-MM-DD
    val isCompleted: Boolean? = null,
    // builder fields (seconds per km / bpm as on the wire)
    val customName: String? = null,
    val targetHrZone: Int? = null,
    val targetHrMinBpm: Int? = null,
    val targetHrMaxBpm: Int? = null,
    val targetPaceMinSecondsPerKm: Double? = null,
    val targetPaceMaxSecondsPerKm: Double? = null,
    // builder structuredSteps (nested builder JSON, raw); the current server
    // PATCH route ignores this field — sent for forward compatibility until
    // the server task whitelists it
    val structuredSteps: JsonElement? = null,
)

@Serializable
data class UpdateGoalRequest(
    val name: String? = null,
    val targetTime: Int? = null,
    val isActive: Boolean? = null,
)

/**
 * Body for POST /api/plan-advanced/{goalId}/workouts. The route requires a
 * valid scheduledDate, a server WorkoutType and a non-empty description;
 * everything else is optional and defaults server-side.
 */
@Serializable
data class CreateWorkoutRequest(
    val scheduledDate: String, // YYYY-MM-DD
    val workoutType: String,
    val description: String,
    val phase: String? = null, // server PlanPhase name
    val customName: String? = null,
    val targetDistance: Double? = null, // meters
    val targetPace: Double? = null, // seconds per km
    val targetDuration: Int? = null, // seconds
    val structuredSteps: JsonElement? = null, // builder nested shape, raw
)

/** Outbox payload for workout_create: the create body plus the owning goal. */
@Serializable
data class WorkoutCreatePayload(
    val goalId: String,
    val workout: CreateWorkoutRequest,
)

/** Outbox payload for workout_delete: the delete route is goal-scoped. */
@Serializable
data class WorkoutDeletePayload(val goalId: String)

@Serializable
data class WorkoutWrapper(val workout: PlanWorkoutDto)

@Serializable
data class GoalWrapper(val goal: PlanGoalDto)

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

    // plans — /api/plans is the web app's own API and accepts the mobile JWT.
    // POST runs the full server generation pipeline and returns the goal
    // including all generated workouts (201, aliased as both goal and plan).
    @GET("/api/plans")
    suspend fun plans(): PlansResponse

    @POST("/api/plans")
    suspend fun createPlan(@Body body: CreatePlanRequest): CreatePlanResponse

    // Uploads a device-created plan (explicit workout list — the server does
    // NOT regenerate). Returns the new server goal id plus a localId → server
    // workout id map for the local remap. (201, raw web enums stored
    // verbatim.)
    @POST("/api/plans/import")
    suspend fun importPlan(@Body body: ImportPlanRequest): ImportPlanResponse

    // workout-level edits (targets, description, date shift, completion)
    @PATCH("/api/mobile/v1/workouts/{id}")
    suspend fun patchWorkout(@Path("id") id: String, @Body body: PatchWorkoutRequest): PlanWorkoutDto

    // workout create/delete on existing plans (goal-scoped web routes that
    // accept the mobile JWT; create snapshots, returns 201 + { workout })
    @POST("/api/plan-advanced/{goalId}/workouts")
    suspend fun createWorkout(@Path("goalId") goalId: String, @Body body: CreateWorkoutRequest): WorkoutWrapper

    @DELETE("/api/plan-advanced/{goalId}/workouts/{workoutId}")
    suspend fun deleteWorkout(
        @Path("goalId") goalId: String,
        @Path("workoutId") workoutId: String,
    ): retrofit2.Response<Unit>

    // goal-level edits (metadata only) and delete (hard delete)
    @PUT("/api/mobile/v1/goals/{id}")
    suspend fun updateGoal(@Path("id") id: String, @Body body: UpdateGoalRequest): GoalWrapper

    @DELETE("/api/mobile/v1/goals/{id}")
    suspend fun deleteGoal(@Path("id") id: String): retrofit2.Response<Unit>

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
