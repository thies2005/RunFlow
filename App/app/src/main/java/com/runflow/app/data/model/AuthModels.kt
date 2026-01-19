package com.runflow.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val code: String
)

@Serializable
data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: User
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String
)

@Serializable
data class LogoutRequest(
    val refreshToken: String
)

@Serializable
data class AuthResponse(
    val success: Boolean
)

@Serializable
data class User(
    val id: String,
    val name: String? = null,
    val email: String? = null,
    val image: String? = null,
    val sex: Sex? = null,
    val birthDate: String? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val weight: Float? = null,
    val height: Float? = null,
    val hrZone1Max: Int? = 130,
    val hrZone2Max: Int? = 140,
    val hrZone3Max: Int? = 150,
    val hrZone4Max: Int? = 160,
    val vdotCorrectionFactor: Float? = 1.0f,
    val lastSyncAt: String? = null,
    val syncInProgress: Boolean = false
)

@Serializable
enum class Sex {
    MALE,
    FEMALE,
    OTHER
}

@Serializable
data class EmailLoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String? = null
)
