package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching user profile locally.
 * Mirrors the UserProfile model from the API.
 */
@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey
    val id: String,
    val name: String?,
    val email: String?,
    val image: String?,
    val sex: String?, // Stored as string, converted from Sex enum
    val birthDate: String?,
    val hrMax: Int?,
    val hrRest: Int?,
    val weight: Float?,
    val height: Float?,
    val hrZone1Max: Int,
    val hrZone2Max: Int,
    val hrZone3Max: Int,
    val hrZone4Max: Int,
    val vdotCorrectionFactor: Float,
    val cachedAt: Long = System.currentTimeMillis()
)
