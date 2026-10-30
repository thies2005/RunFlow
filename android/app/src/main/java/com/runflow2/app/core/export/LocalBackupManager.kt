package com.runflow2.app.core.export

import android.database.Cursor
import androidx.room.withTransaction
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.PlanSnapshotEntity
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.WorkoutEntity
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.longOrNull
import java.io.InputStream
import java.io.OutputStream

/**
 * Manages full offline local backup export and restore (.runflow.json).
 *
 * Exports:
 * - ProfileEntity
 * - GoalEntity
 * - WorkoutEntity
 * - ActivityEntity
 * - DailyEntryEntity
 * - PlanSnapshotEntity
 */
class LocalBackupManager(
    private val db: AppDatabase,
) {

    data class Summary(
        val profilesCount: Int,
        val goalsCount: Int,
        val workoutsCount: Int,
        val activitiesCount: Int,
        val dailyEntriesCount: Int,
        val planSnapshotsCount: Int,
    ) {
        val totalCount: Int
            get() = profilesCount + goalsCount + workoutsCount + activitiesCount + dailyEntriesCount + planSnapshotsCount
    }

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        isLenient = true
    }

    suspend fun exportTo(outputStream: OutputStream) {
        val jsonString = exportToString()
        outputStream.write(jsonString.toByteArray(Charsets.UTF_8))
        outputStream.flush()
    }

    suspend fun exportToString(): String {
        val profile = db.profileDao().get()
        val goals = db.goalDao().observeAll().first()
        val activities = db.activityDao().all()
        val workouts = readAllWorkouts()
        val dailyEntries = readAllDailyEntries()
        val planSnapshots = readAllPlanSnapshots()

        val root = buildJsonObject {
            put("format", JsonPrimitive("runflow-backup"))
            put("version", JsonPrimitive(1))
            put("exportedAt", JsonPrimitive(System.currentTimeMillis()))

            put("profiles", buildJsonArray {
                profile?.let { add(mapProfileToJson(it)) }
            })
            put("goals", buildJsonArray {
                goals.forEach { add(mapGoalToJson(it)) }
            })
            put("workouts", buildJsonArray {
                workouts.forEach { add(mapWorkoutToJson(it)) }
            })
            put("activities", buildJsonArray {
                activities.forEach { add(mapActivityToJson(it)) }
            })
            put("dailyEntries", buildJsonArray {
                dailyEntries.forEach { add(mapDailyEntryToJson(it)) }
            })
            put("planSnapshots", buildJsonArray {
                planSnapshots.forEach { add(mapPlanSnapshotToJson(it)) }
            })
        }

        return json.encodeToString(JsonObject.serializer(), root)
    }

    suspend fun importFrom(inputStream: InputStream): Result<Summary> = runCatching {
        val content = inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        importFromString(content)
    }

    suspend fun importFromString(content: String): Summary {
        val root = json.parseToJsonElement(content).jsonObject

        val format = root["format"]?.jsonPrimitive?.content
        if (format != "runflow-backup") {
            throw IllegalArgumentException("Unsupported backup format: $format")
        }

        val profileElements = root["profiles"]?.jsonArray.orEmpty()
        val goalElements = root["goals"]?.jsonArray.orEmpty()
        val workoutElements = root["workouts"]?.jsonArray.orEmpty()
        val activityElements = root["activities"]?.jsonArray.orEmpty()
        val dailyEntryElements = root["dailyEntries"]?.jsonArray.orEmpty()
        val snapshotElements = root["planSnapshots"]?.jsonArray.orEmpty()

        val profiles = profileElements.map { mapJsonToProfile(it.jsonObject) }
        val goals = goalElements.map { mapJsonToGoal(it.jsonObject) }
        val workouts = workoutElements.map { mapJsonToWorkout(it.jsonObject) }
        val activities = activityElements.map { mapJsonToActivity(it.jsonObject) }
        val dailyEntries = dailyEntryElements.map { mapJsonToDailyEntry(it.jsonObject) }
        val planSnapshots = snapshotElements.map { mapJsonToPlanSnapshot(it.jsonObject) }

        db.withTransaction {
            profiles.firstOrNull()?.let {
                db.profileDao().upsert(it)
            }

            db.goalDao().clear()
            for (g in goals) {
                db.goalDao().upsert(g)
            }

            db.workoutDao().clear()
            if (workouts.isNotEmpty()) {
                db.workoutDao().upsertAll(workouts)
            }

            db.activityDao().clear()
            if (activities.isNotEmpty()) {
                db.activityDao().upsertAll(activities)
            }

            db.dailyEntryDao().clear()
            for (e in dailyEntries) {
                db.dailyEntryDao().upsert(e)
            }

            db.openHelper.writableDatabase.execSQL("DELETE FROM plan_snapshots")
            for (s in planSnapshots) {
                db.planSnapshotDao().insertSnapshot(s)
            }
        }

        return Summary(
            profilesCount = profiles.size,
            goalsCount = goals.size,
            workoutsCount = workouts.size,
            activitiesCount = activities.size,
            dailyEntriesCount = dailyEntries.size,
            planSnapshotsCount = planSnapshots.size,
        )
    }

    private fun readAllWorkouts(): List<WorkoutEntity> {
        val list = mutableListOf<WorkoutEntity>()
        val cursor = db.openHelper.readableDatabase.query("SELECT * FROM workouts ORDER BY scheduledDate ASC, sortIndex ASC")
        cursor.use { c ->
            while (c.moveToNext()) {
                list.add(cursorToWorkout(c))
            }
        }
        return list
    }

    private fun readAllDailyEntries(): List<DailyEntryEntity> {
        val list = mutableListOf<DailyEntryEntity>()
        val cursor = db.openHelper.readableDatabase.query("SELECT * FROM daily_entries ORDER BY date ASC")
        cursor.use { c ->
            while (c.moveToNext()) {
                list.add(cursorToDailyEntry(c))
            }
        }
        return list
    }

    private fun readAllPlanSnapshots(): List<PlanSnapshotEntity> {
        val list = mutableListOf<PlanSnapshotEntity>()
        val cursor = db.openHelper.readableDatabase.query("SELECT * FROM plan_snapshots ORDER BY id ASC")
        cursor.use { c ->
            while (c.moveToNext()) {
                list.add(cursorToPlanSnapshot(c))
            }
        }
        return list
    }

    // --- Cursor mappers ---

    private fun Cursor.optString(col: String): String? {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getString(idx) else null
    }

    private fun Cursor.reqString(col: String, default: String = ""): String {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getString(idx) else default
    }

    private fun Cursor.optInt(col: String): Int? {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getInt(idx) else null
    }

    private fun Cursor.reqInt(col: String, default: Int = 0): Int {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getInt(idx) else default
    }

    private fun Cursor.optLong(col: String): Long? {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getLong(idx) else null
    }

    private fun Cursor.reqLong(col: String, default: Long = 0L): Long {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getLong(idx) else default
    }

    private fun Cursor.optDouble(col: String): Double? {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getDouble(idx) else null
    }

    private fun Cursor.reqDouble(col: String, default: Double = 0.0): Double {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getDouble(idx) else default
    }

    private fun Cursor.reqBoolean(col: String, default: Boolean = false): Boolean {
        val idx = getColumnIndex(col)
        return if (idx >= 0 && !isNull(idx)) getInt(idx) == 1 else default
    }

    private fun cursorToWorkout(c: Cursor): WorkoutEntity {
        return WorkoutEntity(
            id = c.reqString("id"),
            goalId = c.reqString("goalId"),
            scheduledDate = c.reqLong("scheduledDate"),
            workoutType = c.reqString("workoutType"),
            phase = c.reqString("phase"),
            description = c.reqString("description"),
            targetDistanceKm = c.optDouble("targetDistanceKm"),
            targetPaceSecPerKm = c.optInt("targetPaceSecPerKm"),
            targetDurationSec = c.optInt("targetDurationSec"),
            isCompleted = c.reqBoolean("isCompleted"),
            completedAt = c.optLong("completedAt"),
            activityId = c.optString("activityId"),
            sortIndex = c.reqInt("sortIndex"),
            isDemo = c.reqBoolean("isDemo"),
            dirty = c.reqBoolean("dirty"),
            structuredStepsJson = c.optString("structuredStepsJson"),
            customName = c.optString("customName"),
            targetHrZone = c.optInt("targetHrZone"),
            targetHrMinBpm = c.optInt("targetHrMinBpm"),
            targetHrMaxBpm = c.optInt("targetHrMaxBpm"),
            targetPaceMinSecPerKm = c.optDouble("targetPaceMinSecPerKm"),
            targetPaceMaxSecPerKm = c.optDouble("targetPaceMaxSecPerKm"),
            webWorkoutType = c.optString("webWorkoutType"),
            webPhase = c.optString("webPhase"),
            targetPowerWatts = c.optInt("targetPowerWatts"),
            targetPowerMinWatts = c.optInt("targetPowerMinWatts"),
            targetPowerMaxWatts = c.optInt("targetPowerMaxWatts"),
            targetPowerZone = c.optInt("targetPowerZone"),
            targetFtpPercent = c.optInt("targetFtpPercent"),
            targetCadenceRpm = c.optInt("targetCadenceRpm"),
            targetRpe = c.optInt("targetRpe"),
            plannedTss = c.optDouble("plannedTss"),
            sport = c.reqString("sport", "RUN"),
            suggestedActivityId = c.optString("suggestedActivityId"),
            dismissedActivityId = c.optString("dismissedActivityId"),
            adaptationType = c.optString("adaptationType"),
        )
    }

    private fun cursorToDailyEntry(c: Cursor): DailyEntryEntity {
        return DailyEntryEntity(
            date = c.reqString("date"),
            restingHr = c.optInt("restingHr"),
            hrvMs = c.optDouble("hrvMs"),
            sleepMinutes = c.optInt("sleepMinutes"),
            deepMinutes = c.optInt("deepMinutes"),
            remMinutes = c.optInt("remMinutes"),
            lightMinutes = c.optInt("lightMinutes"),
            exhaustionLevel = c.optInt("exhaustionLevel"),
            muscleSoreness = c.optInt("muscleSoreness"),
            stressLevel = c.optInt("stressLevel"),
            note = c.optString("note"),
            sourceRhr = c.optString("sourceRhr"),
            sourceHrv = c.optString("sourceHrv"),
            sourceSleep = c.optString("sourceSleep"),
            manuallyEdited = c.reqBoolean("manuallyEdited"),
            updatedAt = c.reqLong("updatedAt"),
            dirty = c.reqBoolean("dirty"),
            score = c.optDouble("score"),
            state = c.optString("state"),
            confidence = c.optString("confidence"),
            componentScoresJson = c.optString("componentScoresJson"),
        )
    }

    private fun cursorToPlanSnapshot(c: Cursor): PlanSnapshotEntity {
        return PlanSnapshotEntity(
            id = c.reqLong("id"),
            goalId = c.reqString("goalId"),
            createdAtEpochMs = c.reqLong("createdAtEpochMs"),
            workoutsJson = c.reqString("workoutsJson"),
        )
    }

    // --- JSON Builders & Parsers ---

    private fun mapProfileToJson(p: ProfileEntity): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(p.id))
        put("name", JsonPrimitive(p.name))
        put("email", JsonPrimitive(p.email))
        put("sex", JsonPrimitive(p.sex))
        put("birthYear", JsonPrimitive(p.birthYear))
        put("weightKg", JsonPrimitive(p.weightKg))
        put("heightCm", JsonPrimitive(p.heightCm))
        put("hrMax", JsonPrimitive(p.hrMax))
        put("hrRest", JsonPrimitive(p.hrRest))
        put("hrZone1Max", JsonPrimitive(p.hrZone1Max))
        put("hrZone2Max", JsonPrimitive(p.hrZone2Max))
        put("hrZone3Max", JsonPrimitive(p.hrZone3Max))
        put("hrZone4Max", JsonPrimitive(p.hrZone4Max))
        put("hrZone5Max", JsonPrimitive(p.hrZone5Max))
        put("hrZone6Max", JsonPrimitive(p.hrZone6Max))
        put("hrZonesAuto", JsonPrimitive(p.hrZonesAuto))
        put("thresholdHr", JsonPrimitive(p.thresholdHr))
        put("thresholdPaceSecPerKm", JsonPrimitive(p.thresholdPaceSecPerKm))
        put("vdotCorrection", JsonPrimitive(p.vdotCorrection))
        put("effectiveVo2maxCorrection", JsonPrimitive(p.effectiveVo2maxCorrection))
        put("dirty", JsonPrimitive(p.dirty))
    }

    private fun mapJsonToProfile(o: JsonObject): ProfileEntity = ProfileEntity(
        id = o["id"]?.jsonPrimitive?.int ?: 1,
        name = o["name"]?.jsonPrimitive?.content ?: "RunFlow Athlete",
        email = o["email"]?.jsonPrimitive?.content ?: "",
        sex = o["sex"]?.jsonPrimitive?.content ?: "MALE",
        birthYear = o["birthYear"]?.jsonPrimitive?.int ?: 1995,
        weightKg = o["weightKg"]?.jsonPrimitive?.double ?: 72.0,
        heightCm = o["heightCm"]?.jsonPrimitive?.double ?: 178.0,
        hrMax = o["hrMax"]?.jsonPrimitive?.int ?: 192,
        hrRest = o["hrRest"]?.jsonPrimitive?.int ?: 52,
        hrZone1Max = o["hrZone1Max"]?.jsonPrimitive?.int ?: 130,
        hrZone2Max = o["hrZone2Max"]?.jsonPrimitive?.int ?: 148,
        hrZone3Max = o["hrZone3Max"]?.jsonPrimitive?.int ?: 160,
        hrZone4Max = o["hrZone4Max"]?.jsonPrimitive?.int ?: 170,
        hrZone5Max = o["hrZone5Max"]?.jsonPrimitive?.int ?: 178,
        hrZone6Max = o["hrZone6Max"]?.jsonPrimitive?.int ?: 187,
        hrZonesAuto = o["hrZonesAuto"]?.jsonPrimitive?.boolean ?: true,
        thresholdHr = o["thresholdHr"]?.jsonPrimitive?.int ?: 172,
        thresholdPaceSecPerKm = o["thresholdPaceSecPerKm"]?.jsonPrimitive?.int ?: 275,
        vdotCorrection = o["vdotCorrection"]?.jsonPrimitive?.double ?: 1.0,
        effectiveVo2maxCorrection = o["effectiveVo2maxCorrection"]?.jsonPrimitive?.double ?: 1.0,
        dirty = o["dirty"]?.jsonPrimitive?.boolean ?: false,
    )

    private fun mapGoalToJson(g: GoalEntity): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(g.id))
        put("name", JsonPrimitive(g.name))
        put("raceType", JsonPrimitive(g.raceType))
        put("raceDate", JsonPrimitive(g.raceDate))
        g.targetTimeSec?.let { put("targetTimeSec", JsonPrimitive(it)) }
        put("weeklyKmGoal", JsonPrimitive(g.weeklyKmGoal))
        put("planWeeks", JsonPrimitive(g.planWeeks))
        put("runsPerWeek", JsonPrimitive(g.runsPerWeek))
        put("strengthPerWeek", JsonPrimitive(g.strengthPerWeek))
        put("longRunDay", JsonPrimitive(g.longRunDay))
        put("workoutDay", JsonPrimitive(g.workoutDay))
        put("restDays", JsonPrimitive(g.restDays))
        put("taperWeeks", JsonPrimitive(g.taperWeeks))
        g.vdotAtCreation?.let { put("vdotAtCreation", JsonPrimitive(it)) }
        put("isActive", JsonPrimitive(g.isActive))
        put("createdAt", JsonPrimitive(g.createdAt))
        g.completedAt?.let { put("completedAt", JsonPrimitive(it)) }
        g.customDistanceKm?.let { put("customDistanceKm", JsonPrimitive(it)) }
        put("isDemo", JsonPrimitive(g.isDemo))
        g.planStartDate?.let { put("planStartDate", JsonPrimitive(it)) }
        put("isLocalOnly", JsonPrimitive(g.isLocalOnly))
        put("dirty", JsonPrimitive(g.dirty))
        g.creationMode?.let { put("creationMode", JsonPrimitive(it)) }
        g.guidanceLevel?.let { put("guidanceLevel", JsonPrimitive(it)) }
        g.ftpAtCreation?.let { put("ftpAtCreation", JsonPrimitive(it)) }
        g.swimCssAtCreation?.let { put("swimCssAtCreation", JsonPrimitive(it)) }
        g.phaseBlocksJson?.let { put("phaseBlocksJson", JsonPrimitive(it)) }
    }

    private fun mapJsonToGoal(o: JsonObject): GoalEntity = GoalEntity(
        id = o["id"]?.jsonPrimitive?.content ?: "",
        name = o["name"]?.jsonPrimitive?.content ?: "",
        raceType = o["raceType"]?.jsonPrimitive?.content ?: "NONE",
        raceDate = o["raceDate"]?.jsonPrimitive?.long ?: 0L,
        targetTimeSec = o["targetTimeSec"]?.jsonPrimitive?.intOrNull,
        weeklyKmGoal = o["weeklyKmGoal"]?.jsonPrimitive?.double ?: 0.0,
        planWeeks = o["planWeeks"]?.jsonPrimitive?.int ?: 0,
        runsPerWeek = o["runsPerWeek"]?.jsonPrimitive?.int ?: 0,
        strengthPerWeek = o["strengthPerWeek"]?.jsonPrimitive?.int ?: 0,
        longRunDay = o["longRunDay"]?.jsonPrimitive?.int ?: 7,
        workoutDay = o["workoutDay"]?.jsonPrimitive?.int ?: 2,
        restDays = o["restDays"]?.jsonPrimitive?.content ?: "",
        taperWeeks = o["taperWeeks"]?.jsonPrimitive?.int ?: 0,
        vdotAtCreation = o["vdotAtCreation"]?.jsonPrimitive?.doubleOrNull,
        isActive = o["isActive"]?.jsonPrimitive?.boolean ?: false,
        createdAt = o["createdAt"]?.jsonPrimitive?.long ?: 0L,
        completedAt = o["completedAt"]?.jsonPrimitive?.longOrNull,
        customDistanceKm = o["customDistanceKm"]?.jsonPrimitive?.doubleOrNull,
        isDemo = o["isDemo"]?.jsonPrimitive?.boolean ?: false,
        planStartDate = o["planStartDate"]?.jsonPrimitive?.longOrNull,
        isLocalOnly = o["isLocalOnly"]?.jsonPrimitive?.boolean ?: true,
        dirty = o["dirty"]?.jsonPrimitive?.boolean ?: false,
        creationMode = o["creationMode"]?.jsonPrimitive?.content,
        guidanceLevel = o["guidanceLevel"]?.jsonPrimitive?.content,
        ftpAtCreation = o["ftpAtCreation"]?.jsonPrimitive?.intOrNull,
        swimCssAtCreation = o["swimCssAtCreation"]?.jsonPrimitive?.intOrNull,
        phaseBlocksJson = o["phaseBlocksJson"]?.jsonPrimitive?.content,
    )

    private fun mapWorkoutToJson(w: WorkoutEntity): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(w.id))
        put("goalId", JsonPrimitive(w.goalId))
        put("scheduledDate", JsonPrimitive(w.scheduledDate))
        put("workoutType", JsonPrimitive(w.workoutType))
        put("phase", JsonPrimitive(w.phase))
        put("description", JsonPrimitive(w.description))
        w.targetDistanceKm?.let { put("targetDistanceKm", JsonPrimitive(it)) }
        w.targetPaceSecPerKm?.let { put("targetPaceSecPerKm", JsonPrimitive(it)) }
        w.targetDurationSec?.let { put("targetDurationSec", JsonPrimitive(it)) }
        put("isCompleted", JsonPrimitive(w.isCompleted))
        w.completedAt?.let { put("completedAt", JsonPrimitive(it)) }
        w.activityId?.let { put("activityId", JsonPrimitive(it)) }
        put("sortIndex", JsonPrimitive(w.sortIndex))
        put("isDemo", JsonPrimitive(w.isDemo))
        put("dirty", JsonPrimitive(w.dirty))
        w.structuredStepsJson?.let { put("structuredStepsJson", JsonPrimitive(it)) }
        w.customName?.let { put("customName", JsonPrimitive(it)) }
        w.targetHrZone?.let { put("targetHrZone", JsonPrimitive(it)) }
        w.targetHrMinBpm?.let { put("targetHrMinBpm", JsonPrimitive(it)) }
        w.targetHrMaxBpm?.let { put("targetHrMaxBpm", JsonPrimitive(it)) }
        w.targetPaceMinSecPerKm?.let { put("targetPaceMinSecPerKm", JsonPrimitive(it)) }
        w.targetPaceMaxSecPerKm?.let { put("targetPaceMaxSecPerKm", JsonPrimitive(it)) }
        w.webWorkoutType?.let { put("webWorkoutType", JsonPrimitive(it)) }
        w.webPhase?.let { put("webPhase", JsonPrimitive(it)) }
        w.targetPowerWatts?.let { put("targetPowerWatts", JsonPrimitive(it)) }
        w.targetPowerMinWatts?.let { put("targetPowerMinWatts", JsonPrimitive(it)) }
        w.targetPowerMaxWatts?.let { put("targetPowerMaxWatts", JsonPrimitive(it)) }
        w.targetPowerZone?.let { put("targetPowerZone", JsonPrimitive(it)) }
        w.targetFtpPercent?.let { put("targetFtpPercent", JsonPrimitive(it)) }
        w.targetCadenceRpm?.let { put("targetCadenceRpm", JsonPrimitive(it)) }
        w.targetRpe?.let { put("targetRpe", JsonPrimitive(it)) }
        w.plannedTss?.let { put("plannedTss", JsonPrimitive(it)) }
        put("sport", JsonPrimitive(w.sport))
        w.suggestedActivityId?.let { put("suggestedActivityId", JsonPrimitive(it)) }
        w.dismissedActivityId?.let { put("dismissedActivityId", JsonPrimitive(it)) }
        w.adaptationType?.let { put("adaptationType", JsonPrimitive(it)) }
    }

    private fun mapJsonToWorkout(o: JsonObject): WorkoutEntity = WorkoutEntity(
        id = o["id"]?.jsonPrimitive?.content ?: "",
        goalId = o["goalId"]?.jsonPrimitive?.content ?: "",
        scheduledDate = o["scheduledDate"]?.jsonPrimitive?.long ?: 0L,
        workoutType = o["workoutType"]?.jsonPrimitive?.content ?: "EASY",
        phase = o["phase"]?.jsonPrimitive?.content ?: "BASE",
        description = o["description"]?.jsonPrimitive?.content ?: "",
        targetDistanceKm = o["targetDistanceKm"]?.jsonPrimitive?.doubleOrNull,
        targetPaceSecPerKm = o["targetPaceSecPerKm"]?.jsonPrimitive?.intOrNull,
        targetDurationSec = o["targetDurationSec"]?.jsonPrimitive?.intOrNull,
        isCompleted = o["isCompleted"]?.jsonPrimitive?.boolean ?: false,
        completedAt = o["completedAt"]?.jsonPrimitive?.longOrNull,
        activityId = o["activityId"]?.jsonPrimitive?.content,
        sortIndex = o["sortIndex"]?.jsonPrimitive?.int ?: 0,
        isDemo = o["isDemo"]?.jsonPrimitive?.boolean ?: false,
        dirty = o["dirty"]?.jsonPrimitive?.boolean ?: false,
        structuredStepsJson = o["structuredStepsJson"]?.jsonPrimitive?.content,
        customName = o["customName"]?.jsonPrimitive?.content,
        targetHrZone = o["targetHrZone"]?.jsonPrimitive?.intOrNull,
        targetHrMinBpm = o["targetHrMinBpm"]?.jsonPrimitive?.intOrNull,
        targetHrMaxBpm = o["targetHrMaxBpm"]?.jsonPrimitive?.intOrNull,
        targetPaceMinSecPerKm = o["targetPaceMinSecPerKm"]?.jsonPrimitive?.doubleOrNull,
        targetPaceMaxSecPerKm = o["targetPaceMaxSecPerKm"]?.jsonPrimitive?.doubleOrNull,
        webWorkoutType = o["webWorkoutType"]?.jsonPrimitive?.content,
        webPhase = o["webPhase"]?.jsonPrimitive?.content,
        targetPowerWatts = o["targetPowerWatts"]?.jsonPrimitive?.intOrNull,
        targetPowerMinWatts = o["targetPowerMinWatts"]?.jsonPrimitive?.intOrNull,
        targetPowerMaxWatts = o["targetPowerMaxWatts"]?.jsonPrimitive?.intOrNull,
        targetPowerZone = o["targetPowerZone"]?.jsonPrimitive?.intOrNull,
        targetFtpPercent = o["targetFtpPercent"]?.jsonPrimitive?.intOrNull,
        targetCadenceRpm = o["targetCadenceRpm"]?.jsonPrimitive?.intOrNull,
        targetRpe = o["targetRpe"]?.jsonPrimitive?.intOrNull,
        plannedTss = o["plannedTss"]?.jsonPrimitive?.doubleOrNull,
        sport = o["sport"]?.jsonPrimitive?.content ?: "RUN",
        suggestedActivityId = o["suggestedActivityId"]?.jsonPrimitive?.content,
        dismissedActivityId = o["dismissedActivityId"]?.jsonPrimitive?.content,
        adaptationType = o["adaptationType"]?.jsonPrimitive?.content,
    )

    private fun mapActivityToJson(a: ActivityEntity): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(a.id))
        put("name", JsonPrimitive(a.name))
        put("type", JsonPrimitive(a.type))
        put("startDate", JsonPrimitive(a.startDate))
        put("distanceMeters", JsonPrimitive(a.distanceMeters))
        put("movingTimeSec", JsonPrimitive(a.movingTimeSec))
        a.averageHr?.let { put("averageHr", JsonPrimitive(it)) }
        a.maxHr?.let { put("maxHr", JsonPrimitive(it)) }
        a.averageCadence?.let { put("averageCadence", JsonPrimitive(it)) }
        put("totalElevation", JsonPrimitive(a.totalElevation))
        a.calories?.let { put("calories", JsonPrimitive(it)) }
        put("trimp", JsonPrimitive(a.trimp))
        a.trainingType?.let { put("trainingType", JsonPrimitive(it)) }
        put("hrZone1Sec", JsonPrimitive(a.hrZone1Sec))
        put("hrZone2Sec", JsonPrimitive(a.hrZone2Sec))
        put("hrZone3Sec", JsonPrimitive(a.hrZone3Sec))
        put("hrZone4Sec", JsonPrimitive(a.hrZone4Sec))
        put("hrZone5Sec", JsonPrimitive(a.hrZone5Sec))
        put("hrZone6Sec", JsonPrimitive(a.hrZone6Sec))
        put("hrZone7Sec", JsonPrimitive(a.hrZone7Sec))
        a.estimatedVdot?.let { put("estimatedVdot", JsonPrimitive(it)) }
        a.routeJson?.let { put("routeJson", JsonPrimitive(it)) }
        a.lapsJson?.let { put("lapsJson", JsonPrimitive(it)) }
        a.streamsJson?.let { put("streamsJson", JsonPrimitive(it)) }
        a.notes?.let { put("notes", JsonPrimitive(it)) }
        a.serverId?.let { put("serverId", JsonPrimitive(it)) }
        put("updatedAt", JsonPrimitive(a.updatedAt))
        put("dirty", JsonPrimitive(a.dirty))
        put("isDemo", JsonPrimitive(a.isDemo))
        a.hcRecordId?.let { put("hcRecordId", JsonPrimitive(it)) }
        a.averageWatts?.let { put("averageWatts", JsonPrimitive(it)) }
        a.weightedAverageWatts?.let { put("weightedAverageWatts", JsonPrimitive(it)) }
        a.maxWatts?.let { put("maxWatts", JsonPrimitive(it)) }
        put("deviceWatts", JsonPrimitive(a.deviceWatts))
        a.npWatts?.let { put("npWatts", JsonPrimitive(it)) }
        a.intensityFactor?.let { put("intensityFactor", JsonPrimitive(it)) }
        a.variabilityIndex?.let { put("variabilityIndex", JsonPrimitive(it)) }
        a.bikeTss?.let { put("bikeTss", JsonPrimitive(it)) }
        a.efficiencyFactor?.let { put("efficiencyFactor", JsonPrimitive(it)) }
        a.aerobicDecoupling?.let { put("aerobicDecoupling", JsonPrimitive(it)) }
        put("powerZone1Sec", JsonPrimitive(a.powerZone1Sec))
        put("powerZone2Sec", JsonPrimitive(a.powerZone2Sec))
        put("powerZone3Sec", JsonPrimitive(a.powerZone3Sec))
        put("powerZone4Sec", JsonPrimitive(a.powerZone4Sec))
        put("powerZone5Sec", JsonPrimitive(a.powerZone5Sec))
        put("powerZone6Sec", JsonPrimitive(a.powerZone6Sec))
        put("powerZone7Sec", JsonPrimitive(a.powerZone7Sec))
    }

    private fun mapJsonToActivity(o: JsonObject): ActivityEntity = ActivityEntity(
        id = o["id"]?.jsonPrimitive?.content ?: "",
        name = o["name"]?.jsonPrimitive?.content ?: "",
        type = o["type"]?.jsonPrimitive?.content ?: "RUN",
        startDate = o["startDate"]?.jsonPrimitive?.long ?: 0L,
        distanceMeters = o["distanceMeters"]?.jsonPrimitive?.double ?: 0.0,
        movingTimeSec = o["movingTimeSec"]?.jsonPrimitive?.int ?: 0,
        averageHr = o["averageHr"]?.jsonPrimitive?.doubleOrNull,
        maxHr = o["maxHr"]?.jsonPrimitive?.intOrNull,
        averageCadence = o["averageCadence"]?.jsonPrimitive?.doubleOrNull,
        totalElevation = o["totalElevation"]?.jsonPrimitive?.double ?: 0.0,
        calories = o["calories"]?.jsonPrimitive?.intOrNull,
        trimp = o["trimp"]?.jsonPrimitive?.double ?: 0.0,
        trainingType = o["trainingType"]?.jsonPrimitive?.content,
        hrZone1Sec = o["hrZone1Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone2Sec = o["hrZone2Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone3Sec = o["hrZone3Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone4Sec = o["hrZone4Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone5Sec = o["hrZone5Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone6Sec = o["hrZone6Sec"]?.jsonPrimitive?.int ?: 0,
        hrZone7Sec = o["hrZone7Sec"]?.jsonPrimitive?.int ?: 0,
        estimatedVdot = o["estimatedVdot"]?.jsonPrimitive?.doubleOrNull,
        routeJson = o["routeJson"]?.jsonPrimitive?.content,
        lapsJson = o["lapsJson"]?.jsonPrimitive?.content,
        streamsJson = o["streamsJson"]?.jsonPrimitive?.content,
        notes = o["notes"]?.jsonPrimitive?.content,
        serverId = o["serverId"]?.jsonPrimitive?.content,
        updatedAt = o["updatedAt"]?.jsonPrimitive?.long ?: 0L,
        dirty = o["dirty"]?.jsonPrimitive?.boolean ?: false,
        isDemo = o["isDemo"]?.jsonPrimitive?.boolean ?: false,
        hcRecordId = o["hcRecordId"]?.jsonPrimitive?.content,
        averageWatts = o["averageWatts"]?.jsonPrimitive?.doubleOrNull,
        weightedAverageWatts = o["weightedAverageWatts"]?.jsonPrimitive?.doubleOrNull,
        maxWatts = o["maxWatts"]?.jsonPrimitive?.doubleOrNull,
        deviceWatts = o["deviceWatts"]?.jsonPrimitive?.boolean ?: false,
        npWatts = o["npWatts"]?.jsonPrimitive?.doubleOrNull,
        intensityFactor = o["intensityFactor"]?.jsonPrimitive?.doubleOrNull,
        variabilityIndex = o["variabilityIndex"]?.jsonPrimitive?.doubleOrNull,
        bikeTss = o["bikeTss"]?.jsonPrimitive?.doubleOrNull,
        efficiencyFactor = o["efficiencyFactor"]?.jsonPrimitive?.doubleOrNull,
        aerobicDecoupling = o["aerobicDecoupling"]?.jsonPrimitive?.doubleOrNull,
        powerZone1Sec = o["powerZone1Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone2Sec = o["powerZone2Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone3Sec = o["powerZone3Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone4Sec = o["powerZone4Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone5Sec = o["powerZone5Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone6Sec = o["powerZone6Sec"]?.jsonPrimitive?.int ?: 0,
        powerZone7Sec = o["powerZone7Sec"]?.jsonPrimitive?.int ?: 0,
    )

    private fun mapDailyEntryToJson(e: DailyEntryEntity): JsonObject = buildJsonObject {
        put("date", JsonPrimitive(e.date))
        e.restingHr?.let { put("restingHr", JsonPrimitive(it)) }
        e.hrvMs?.let { put("hrvMs", JsonPrimitive(it)) }
        e.sleepMinutes?.let { put("sleepMinutes", JsonPrimitive(it)) }
        e.deepMinutes?.let { put("deepMinutes", JsonPrimitive(it)) }
        e.remMinutes?.let { put("remMinutes", JsonPrimitive(it)) }
        e.lightMinutes?.let { put("lightMinutes", JsonPrimitive(it)) }
        e.exhaustionLevel?.let { put("exhaustionLevel", JsonPrimitive(it)) }
        e.muscleSoreness?.let { put("muscleSoreness", JsonPrimitive(it)) }
        e.stressLevel?.let { put("stressLevel", JsonPrimitive(it)) }
        e.note?.let { put("note", JsonPrimitive(it)) }
        e.sourceRhr?.let { put("sourceRhr", JsonPrimitive(it)) }
        e.sourceHrv?.let { put("sourceHrv", JsonPrimitive(it)) }
        e.sourceSleep?.let { put("sourceSleep", JsonPrimitive(it)) }
        put("manuallyEdited", JsonPrimitive(e.manuallyEdited))
        put("updatedAt", JsonPrimitive(e.updatedAt))
        put("dirty", JsonPrimitive(e.dirty))
        e.score?.let { put("score", JsonPrimitive(it)) }
        e.state?.let { put("state", JsonPrimitive(it)) }
        e.confidence?.let { put("confidence", JsonPrimitive(it)) }
        e.componentScoresJson?.let { put("componentScoresJson", JsonPrimitive(it)) }
    }

    private fun mapJsonToDailyEntry(o: JsonObject): DailyEntryEntity = DailyEntryEntity(
        date = o["date"]?.jsonPrimitive?.content ?: "",
        restingHr = o["restingHr"]?.jsonPrimitive?.intOrNull,
        hrvMs = o["hrvMs"]?.jsonPrimitive?.doubleOrNull,
        sleepMinutes = o["sleepMinutes"]?.jsonPrimitive?.intOrNull,
        deepMinutes = o["deepMinutes"]?.jsonPrimitive?.intOrNull,
        remMinutes = o["remMinutes"]?.jsonPrimitive?.intOrNull,
        lightMinutes = o["lightMinutes"]?.jsonPrimitive?.intOrNull,
        exhaustionLevel = o["exhaustionLevel"]?.jsonPrimitive?.intOrNull,
        muscleSoreness = o["muscleSoreness"]?.jsonPrimitive?.intOrNull,
        stressLevel = o["stressLevel"]?.jsonPrimitive?.intOrNull,
        note = o["note"]?.jsonPrimitive?.content,
        sourceRhr = o["sourceRhr"]?.jsonPrimitive?.content,
        sourceHrv = o["sourceHrv"]?.jsonPrimitive?.content,
        sourceSleep = o["sourceSleep"]?.jsonPrimitive?.content,
        manuallyEdited = o["manuallyEdited"]?.jsonPrimitive?.boolean ?: false,
        updatedAt = o["updatedAt"]?.jsonPrimitive?.long ?: 0L,
        dirty = o["dirty"]?.jsonPrimitive?.boolean ?: false,
        score = o["score"]?.jsonPrimitive?.doubleOrNull,
        state = o["state"]?.jsonPrimitive?.content,
        confidence = o["confidence"]?.jsonPrimitive?.content,
        componentScoresJson = o["componentScoresJson"]?.jsonPrimitive?.content,
    )

    private fun mapPlanSnapshotToJson(s: PlanSnapshotEntity): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(s.id))
        put("goalId", JsonPrimitive(s.goalId))
        put("createdAtEpochMs", JsonPrimitive(s.createdAtEpochMs))
        put("workoutsJson", JsonPrimitive(s.workoutsJson))
    }

    private fun mapJsonToPlanSnapshot(o: JsonObject): PlanSnapshotEntity = PlanSnapshotEntity(
        id = o["id"]?.jsonPrimitive?.long ?: 0L,
        goalId = o["goalId"]?.jsonPrimitive?.content ?: "",
        createdAtEpochMs = o["createdAtEpochMs"]?.jsonPrimitive?.long ?: 0L,
        workoutsJson = o["workoutsJson"]?.jsonPrimitive?.content ?: "[]",
    )
}
