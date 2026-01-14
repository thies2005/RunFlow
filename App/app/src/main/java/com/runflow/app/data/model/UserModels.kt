package com.runflow.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val id: String? = null,
    val name: String? = null,
    val email: String? = null,
    val image: String? = null,
    val sex: Sex? = null,
    val birthDate: String? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val weight: Float? = null,
    val height: Float? = null,
    val hrZone1Max: Int = 130,
    val hrZone2Max: Int = 140,
    val hrZone3Max: Int = 150,
    val hrZone4Max: Int = 160,
    val hrZone5Max: Int = 178,
    val hrZone6Max: Int = 187,
    val thresholdHr: Int? = null,
    val thresholdPace: Int? = null,
    val vdotCorrectionFactor: Float = 1.0f
)

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val sex: Sex? = null,
    val birthDate: String? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val weight: Float? = null,
    val height: Float? = null,
    val hrZone1Max: Int? = null,
    val hrZone2Max: Int? = null,
    val hrZone3Max: Int? = null,
    val hrZone4Max: Int? = null,
    val hrZone5Max: Int? = null,
    val hrZone6Max: Int? = null,
    val thresholdHr: Int? = null,
    val thresholdPace: Int? = null,
    val vdotCorrectionFactor: Float? = null
)
