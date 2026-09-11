package com.runflow2.app.data.sync

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.net.ActivityDto
import com.runflow2.app.data.net.ActivityStreamsDto
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.CreateActivityRequest
import com.runflow2.app.data.net.UpdateProfileRequest
import com.runflow2.app.data.net.UserDto
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** Server enum: RUN, VIRTUAL_RIDE, RIDE, WALK, HIKE, SWIM, WORKOUT, OTHER. */
fun serverTypeFromLocal(localType: String): String = if (localType == "STRENGTH") "WORKOUT" else localType

fun localTypeFromServer(serverType: String?): String = when (serverType?.uppercase()) {
    "RUN", "RIDE", "WALK", "HIKE", "SWIM", "WORKOUT", "OTHER" -> serverType.uppercase()
    "VIRTUAL_RIDE" -> "RIDE"
    else -> "OTHER"
}

fun ActivityEntity.toCreateRequest(): CreateActivityRequest = CreateActivityRequest(
    name = name,
    type = serverTypeFromLocal(type),
    startDate = Api.formatUtcDate(startDate),
    distance = distanceMeters,
    movingTime = movingTimeSec,
    elapsedTime = movingTimeSec,
    averageHr = averageHr,
    maxHr = maxHr,
    averageCadence = averageCadence,
    totalElevation = totalElevation,
    hasHeartrate = averageHr != null,
    notes = notes,
    // Streams ride along so the server (and web) can chart phone-recorded runs
    // and recompute HR-zone times; the zod schema accepts the same shape.
    streams = streams(),
)

/** Decodes the cached streams JSON (server field names). Null when absent or corrupt. */
fun ActivityEntity.streams(): ActivityStreamsDto? = streamsJson?.let { json ->
    runCatching { Api.json.decodeFromString(ActivityStreamsDto.serializer(), json) }.getOrNull()
}

/** Serializes streams in the server's wire format, dropping empty time series. */
fun ActivityStreamsDto.toJsonOrNull(): String? =
    if (time.isEmpty()) null
    else runCatching { Api.json.encodeToString(ActivityStreamsDto.serializer(), this) }.getOrNull()

/**
 * Apply a server activity onto the local row. The server wins for all
 * training metrics; local-only data (route, laps) is preserved because the
 * list endpoint does not return it.
 */
fun ActivityDto.mergeInto(existing: ActivityEntity?, now: Long): ActivityEntity {
    val local = existing ?: ActivityEntity(
        id = this.id,
        name = "",
        type = "RUN",
        startDate = 0L,
        distanceMeters = 0.0,
        movingTimeSec = 0,
        averageHr = null,
        maxHr = null,
        averageCadence = null,
        totalElevation = 0.0,
        calories = null,
        trimp = 0.0,
        trainingType = null,
        estimatedVdot = null,
        routeJson = null,
        lapsJson = null,
    )
    return local.copy(
        serverId = this.id,
        updatedAt = now,
        dirty = false,
        name = this.name ?: local.name,
        type = localTypeFromServer(this.type),
        startDate = Api.parseInstant(this.startDate) ?: local.startDate,
        distanceMeters = this.distance,
        movingTimeSec = this.movingTime,
        averageHr = this.averageHr ?: local.averageHr,
        maxHr = this.maxHr ?: local.maxHr,
        averageCadence = this.averageCadence ?: local.averageCadence,
        totalElevation = this.totalElevation,
        calories = this.calories?.toInt() ?: local.calories,
        trimp = this.trimp ?: local.trimp,
        trainingType = this.trainingType ?: local.trainingType,
        estimatedVdot = this.estimatedVdot ?: local.estimatedVdot,
        hrZone1Sec = this.hrZone1Time,
        hrZone2Sec = this.hrZone2Time,
        hrZone3Sec = this.hrZone3Time,
        hrZone4Sec = this.hrZone4Time,
        hrZone5Sec = this.hrZone5Time,
        hrZone6Sec = this.hrZone6Time,
        hrZone7Sec = this.hrZone7Time,
    )
}

/**
 * Apply a server user onto the local profile row. The email resolution order
 * is: the signed-in account's email (from the auth session — authoritative),
 * then the email the server profile carries, then whatever the profile
 * already had. This keeps the seeded demo address from surviving a login
 * when the server profile omits the email field.
 */
fun UserDto.applyTo(profile: ProfileEntity, accountEmail: String? = null): ProfileEntity {
    val resolvedEmail = accountEmail?.takeIf { it.isNotBlank() }
        ?: this.email?.takeIf { it.isNotBlank() }
        ?: profile.email
    return profile.copy(
        name = this.name?.takeIf { it.isNotBlank() } ?: profile.name,
        email = resolvedEmail,
        sex = this.sex?.uppercase()?.takeIf { it in listOf("MALE", "FEMALE", "OTHER") } ?: profile.sex,
        birthYear = Api.parseInstant(this.birthDate)?.let {
            Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).year
        } ?: profile.birthYear,
        weightKg = this.weight ?: profile.weightKg,
        heightCm = this.height ?: profile.heightCm,
        hrMax = this.hrMax ?: profile.hrMax,
        hrRest = this.hrRest ?: profile.hrRest,
        vdotCorrection = this.vdotCorrectionFactor ?: profile.vdotCorrection,
        dirty = false,
    )
}

fun ProfileEntity.toUpdateRequest(): UpdateProfileRequest {
    // Birth date is a plain date, not a wall-clock moment: anchor it to UTC so
    // the server receives 1995-01-01 regardless of device timezone.
    val birthInstant = java.time.LocalDate.of(birthYear, 1, 1)
        .atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli()
    return UpdateProfileRequest(
        name = name,
        sex = sex,
        birthDate = Api.formatUtcDate(birthInstant),
        hrMax = hrMax,
        hrRest = hrRest,
        weight = weightKg,
        height = heightCm,
        vdotCorrectionFactor = vdotCorrection,
    )
}
