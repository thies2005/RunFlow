package com.runflow.app.data.remote

import com.runflow.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface RunFlowApiService {

    // ==================== AUTH ====================
    @POST("mobile/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("mobile/v1/auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<AuthResponse>

    @POST("mobile/v1/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    // ==================== DASHBOARD ====================
    @GET("mobile/v1/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    // ==================== ACTIVITIES ====================
    @GET("mobile/v1/activities")
    suspend fun getActivities(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("type") type: String? = null,
        @Query("raceEligible") raceEligible: Boolean? = null
    ): Response<ActivitiesResponse>

    @GET("mobile/v1/activities/{id}")
    suspend fun getActivity(@Path("id") id: String): Response<ActivityDetailResponse>

    @GET("mobile/v1/activities/{id}/type")
    suspend fun getActivityType(@Path("id") id: String): Response<Map<String, String>>

    @POST("mobile/v1/activities")
    suspend fun createActivity(@Body request: ManualActivityRequest): Response<Activity>

    // ==================== WORKOUTS ====================
    @GET("mobile/v1/workouts")
    suspend fun getWorkouts(
        @Query("goalId") goalId: String? = null,
        @Query("weekStart") weekStart: String? = null,
        @Query("weekEnd") weekEnd: String? = null
    ): Response<WorkoutsResponse>

    @GET("mobile/v1/workouts/{id}")
    suspend fun getWorkout(@Path("id") id: String): Response<Workout>

    @POST("mobile/v1/workouts")
    suspend fun createWorkout(@Body request: CreateWorkoutRequest): Response<Workout>

    @PATCH("mobile/v1/workouts/{id}")
    suspend fun updateWorkout(
        @Path("id") id: String,
        @Body request: UpdateWorkoutRequest
    ): Response<Workout>

    @DELETE("mobile/v1/workouts/{id}")
    suspend fun deleteWorkout(@Path("id") id: String): Response<AuthResponse>

    @POST("mobile/v1/workouts/{id}/complete")
    suspend fun completeWorkout(
        @Path("id") id: String,
        @Body request: CompleteWorkoutRequest
    ): Response<Workout>

    // ==================== GOALS ====================
    @GET("mobile/v1/goals")
    suspend fun getGoals(): Response<GoalsResponse>

    @GET("mobile/v1/goals/{id}")
    suspend fun getGoal(@Path("id") id: String): Response<Goal>

    @POST("mobile/v1/goals")
    suspend fun createGoal(@Body request: CreateGoalRequest): Response<Goal>

    @PATCH("mobile/v1/goals/{id}")
    suspend fun updateGoal(
        @Path("id") id: String,
        @Body request: UpdateGoalRequest
    ): Response<Goal>

    @DELETE("mobile/v1/goals/{id}")
    suspend fun deleteGoal(@Path("id") id: String): Response<AuthResponse>

    // ==================== SYNC ====================
    @GET("mobile/v1/sync")
    suspend fun getSyncStatus(): Response<SyncStatus>

    @POST("mobile/v1/sync")
    suspend fun triggerSync(): Response<QuickSyncResponse>

    // ==================== ANALYTICS ====================
    @GET("mobile/v1/analytics/stats")
    suspend fun getAnalyticsStats(): Response<AnalyticsStats>

    @GET("mobile/v1/analytics/history")
    suspend fun getAnalyticsHistory(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<AnalyticsHistoryResponse>

    // ==================== USER PROFILE ====================
    @GET("mobile/v1/user/profile")
    suspend fun getUserProfile(): Response<UserProfile>

    @PATCH("mobile/v1/user/profile")
    suspend fun updateUserProfile(@Body request: UpdateProfileRequest): Response<UserProfile>
}

// Helper class for API responses

