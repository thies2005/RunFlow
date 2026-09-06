package com.runflow2.app.data.seed

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.ProfileDao
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.WorkoutDao
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.plan.PlanGenerator
import com.runflow2.app.domain.plan.PlanSpec
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * Seeds the local database with ~6 months of realistic training history and an
 * active marathon plan so every screen is meaningful on first launch.
 */
class DemoSeeder(
    private val profileDao: ProfileDao,
    private val workoutDao: WorkoutDao,
) {

    suspend fun seed(
        insertActivity: suspend (ActivityEntity) -> Unit,
        insertGoal: suspend (GoalEntity) -> Unit,
    ) {
        val profile = ProfileEntity(
            name = "Thies",
            email = "thies@runflow.app",
            sex = "MALE",
            birthYear = 1998,
            weightKg = 71.5,
            heightCm = 181.0,
            hrMax = 192,
            hrRest = 52,
            hrZone1Max = 130,
            hrZone2Max = 148,
            hrZone3Max = 160,
            hrZone4Max = 170,
            hrZone5Max = 178,
            hrZone6Max = 187,
            thresholdHr = 173,
            thresholdPaceSecPerKm = 285,
            vdotCorrection = 1.0,
        )
        profileDao.upsert(profile)

        val today = LocalDate.now()
        val monday = today.with(DayOfWeek.MONDAY)
        val rnd = Random(42)

        // VDOT ramps 38.5 -> 48.5 over 26 weeks
        val weeks = 26
        for (w in 0 until weeks) {
            val weekMonday = monday.minusWeeks((weeks - 1 - w).toLong())
            val vdot = 38.5 + (48.5 - 38.5) * (w.toDouble() / (weeks - 1))
            val isCurrentWeek = weekMonday == monday
            val recoveryWeek = (w + 1) % 4 == 0

            // session templates for the week: (dayOffset, kind)
            val longKm = (16.0 + 14.0 * w / (weeks - 1)).let { if (recoveryWeek) it * 0.8 else it }
            val sessions = listOf(
                Triple(0, "easy", 8.0 + rnd.nextDouble() * 2.5), // Mon
                Triple(2, "quality", 10.0 + rnd.nextDouble() * 2.0), // Wed
                Triple(4, "easy", 7.0 + rnd.nextDouble() * 2.0), // Fri
                Triple(5, "long", longKm), // Sat
            )
            val withSunday = if (rnd.nextBoolean()) sessions + Triple(6, "recovery", 6.0 + rnd.nextDouble()) else sessions

            for ((dayOff, kind, km) in withSunday) {
                val date = weekMonday.plusDays(dayOff.toLong())
                if (isCurrentWeek && date.isAfter(today)) continue
                if (date.isAfter(today)) continue
                seedRun(insertActivity, date, kind, km, vdot, rnd, profile)
            }
            // occasional ride for variety
            if (w % 3 == 1 && !isCurrentWeek) {
                seedRide(insertActivity, weekMonday.plusDays(3), 32.0 + rnd.nextDouble() * 18, rnd)
            }
        }

        // completed goal: half marathon 8 weeks ago
        val hmDate = today.minusWeeks(8)
        val hmGoalId = UUID.randomUUID().toString()
        insertGoal(
            GoalEntity(
                id = hmGoalId,
                name = "Cologne Half Marathon",
                raceType = RaceType.HALF_MARATHON.name,
                raceDate = Format.epochMillis(hmDate, LocalTime.of(10, 0)),
                targetTimeSec = 5700,
                weeklyKmGoal = 50.0,
                planWeeks = 12,
                runsPerWeek = 4,
                strengthPerWeek = 0,
                longRunDay = DayOfWeek.SATURDAY.value,
                workoutDay = DayOfWeek.THURSDAY.value,
                restDays = "2,5",
                taperWeeks = 2,
                vdotAtCreation = 42.0,
                isActive = false,
                createdAt = Format.epochMillis(hmDate.minusWeeks(12)),
                completedAt = Format.epochMillis(hmDate, LocalTime.of(12, 0)),
            ),
        )
        // the race itself as an activity
        seedRun(insertActivity, hmDate, "race", 21.0975, 44.8, rnd, profile, name = "Cologne Half Marathon 🏅", time = LocalTime.of(10, 5))

        // active goal: marathon in 9 weeks with generated plan
        val raceDate = today.plusWeeks(9).with(DayOfWeek.SUNDAY)
        val spec = PlanSpec(
            name = "Berlin Marathon",
            raceType = RaceType.MARATHON,
            raceDate = raceDate,
            startDate = raceDate.minusWeeks(16),
            targetTimeSec = 3 * 3600 + 45 * 60,
            weeklyKm = 58.0,
            runsPerWeek = 5,
            longRunKm = 30.0,
            strengthPerWeek = 1,
            longRunDay = DayOfWeek.SUNDAY,
            workoutDay = DayOfWeek.THURSDAY,
            restDays = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
            taperWeeks = 2,
            vdot = 47.5,
        )
        val goalId = UUID.randomUUID().toString()
        insertGoal(
            GoalEntity(
                id = goalId,
                name = spec.name,
                raceType = spec.raceType.name,
                raceDate = Format.epochMillis(spec.raceDate, LocalTime.of(9, 15)),
                targetTimeSec = spec.targetTimeSec,
                weeklyKmGoal = spec.weeklyKm,
                planWeeks = PlanGenerator.planWeeks(spec),
                runsPerWeek = spec.runsPerWeek,
                strengthPerWeek = spec.strengthPerWeek,
                longRunDay = spec.longRunDay.value,
                workoutDay = spec.workoutDay.value,
                restDays = spec.restDays.joinToString(",") { it.value.toString() },
                taperWeeks = spec.taperWeeks,
                vdotAtCreation = spec.vdot,
                isActive = true,
                createdAt = System.currentTimeMillis() - 7 * 86_400_000L,
                customDistanceKm = null,
            ),
        )
        val drafts = PlanGenerator.generate(spec)
        val workouts = drafts.mapIndexed { i, d ->
            WorkoutEntity(
                id = UUID.randomUUID().toString(),
                goalId = goalId,
                scheduledDate = Format.epochMillis(d.date, LocalTime.of(7, 30)),
                workoutType = d.type.name,
                phase = d.phase.name,
                description = d.description,
                targetDistanceKm = d.distanceKm,
                targetPaceSecPerKm = d.targetPaceSecPerKm?.toInt(),
                targetDurationSec = d.durationSec,
                isCompleted = d.date.isBefore(today) && d.type.name != "REST",
                completedAt = if (d.date.isBefore(today)) Format.epochMillis(d.date, LocalTime.of(9, 0)) else null,
                activityId = null,
                sortIndex = i,
            )
        }
        workoutDao.upsertAll(workouts.map { it.copy(isDemo = true) })
    }

    private suspend fun seedRun(
        insert: suspend (ActivityEntity) -> Unit,
        date: LocalDate,
        kind: String,
        km: Double,
        vdot: Double,
        rnd: Random,
        profile: ProfileEntity,
        name: String? = null,
        time: LocalTime = LocalTime.of(7, 15),
    ) {
        val paces = TrainingPacesAt(vdot)
        data class Session(var pace: Double, var hr: Double, var maxHr: Int, val label: String, val type: String)
        val base: Session = when (kind) {
            "easy" -> Session(paces.easy * 1.03, 132.0, 151, "Morning Run", "EASY")
            "recovery" -> Session(paces.easy * 1.10, 124.0, 142, "Recovery Run", "RECOVERY")
            "long" -> Session(paces.easy * 1.05, 138.0, 158, "Long Run", "LONG_RUN")
            "quality" ->
                if (rnd.nextBoolean()) Session(paces.threshold * 0.99, 158.0, 175, "Tempo Run", "TEMPO")
                else Session(paces.interval * 1.01, 162.0, 181, "Interval Session", "INTERVALS")
            "race" -> Session(paces.threshold * 1.02, 168.0, 186, "Race", "RACE")
            else -> Session(paces.easy, 135.0, 155, "Run", "EASY")
        }
        base.pace *= 1 + rnd.nextDouble() * 0.04 - 0.02
        base.hr += rnd.nextDouble() * 6 - 3
        base.maxHr += rnd.nextInt(-2, 3)

        val distanceKm = (km * 20).roundToInt() / 20.0
        val paceSecFinal = base.pace
        val movingTime = (distanceKm * paceSecFinal).roundToInt()
        val avgHr = base.hr
        val trimp = TrainingLoad.trimpFromHr(movingTime / 60.0, avgHr, profile.hrMax, profile.hrRest) ?: 0.0
        val estVdot = if (distanceKm >= 5.0) VdotMath.vdot(distanceKm * 1000.0, movingTime * (0.97 + rnd.nextDouble() * 0.06)) else null
        val zones = synthZones(movingTime, avgHr, profile, rnd)

        insert(
            ActivityEntity(
                id = UUID.randomUUID().toString(),
                name = name ?: "${base.label} · ${Format.date(date)}",
                type = "RUN",
                startDate = Format.epochMillis(date, time),
                distanceMeters = distanceKm * 1000.0,
                movingTimeSec = movingTime,
                averageHr = avgHr,
                maxHr = base.maxHr,
                averageCadence = (168 + rnd.nextInt(-4, 6)).toDouble(),
                totalElevation = distanceKm * (6 + rnd.nextDouble() * 10),
                calories = (movingTime / 60.0 * (0.9 + rnd.nextDouble() * 0.25) * 10.5).toInt(),
                trimp = trimp,
                trainingType = base.type,
                hrZone1Sec = zones[0],
                hrZone2Sec = zones[1],
                hrZone3Sec = zones[2],
                hrZone4Sec = zones[3],
                hrZone5Sec = zones[4],
                hrZone6Sec = zones[5],
                hrZone7Sec = zones[6],
                estimatedVdot = estVdot,
                routeJson = synthRoute(rnd, distanceKm),
                lapsJson = synthLaps(distanceKm, paceSecFinal, rnd),
            ),
        )
    }

    private suspend fun seedRide(insert: suspend (ActivityEntity) -> Unit, date: LocalDate, km: Double, rnd: Random) {
        val duration = (km * 1000 / (8.2 + rnd.nextDouble())).roundToInt()
        insert(
            ActivityEntity(
                id = UUID.randomUUID().toString(),
                name = "Weekend Ride",
                type = "RIDE",
                startDate = Format.epochMillis(date, LocalTime.of(10, 30)),
                distanceMeters = km * 1000.0,
                movingTimeSec = duration,
                averageHr = 128.0,
                maxHr = 152,
                averageCadence = null,
                totalElevation = km * 4,
                calories = (duration / 60.0 * 9.5).toInt(),
                trimp = TrainingLoad.trimpFromHr(duration / 60.0, 128.0, 192, 52) ?: 0.0,
                trainingType = "CROSS_TRAIN",
                estimatedVdot = null,
                routeJson = synthRoute(rnd, km),
                lapsJson = null,
            ),
        )
    }

    /** Rough pace anchors for a VDOT. */
    private class TrainingPacesAt(val vdot: Double) {
        val easy get() = VdotMath.paceSecPerKmForFraction(vdot, 0.71)
        val threshold get() = VdotMath.paceSecPerKmForFraction(vdot, 0.87)
        val interval get() = VdotMath.paceSecPerKmForFraction(vdot, 0.98)
    }

    private fun synthZones(totalSec: Int, avgHr: Double, p: ProfileEntity, rnd: Random): List<Int> {
        val bounds = listOf(0, p.hrZone1Max, p.hrZone2Max, p.hrZone3Max, p.hrZone4Max, p.hrZone5Max, p.hrZone6Max, 999)
        var center = 1
        for (i in 1..7) if (avgHr > bounds[i]) center = i + 1
        center = center.coerceIn(1, 7)
        val weights = IntArray(7)
        weights[center - 1] = 60
        if (center > 1) weights[center - 2] = 22
        if (center < 7) weights[center] = 18
        // normalize + jitter
        val jittered = weights.map { (it * (100 + rnd.nextInt(-15, 15)) / 100.0).coerceAtLeast(0.0) }
        val sum = jittered.sum().takeIf { it > 0 } ?: 1.0
        return jittered.map { (it / sum * totalSec).toInt() }
    }

    private fun synthRoute(rnd: Random, km: Double): String {
        val homeLat = 50.9385 + rnd.nextDouble() * 0.01
        val homeLng = 6.9603 + rnd.nextDouble() * 0.01
        val pts = ArrayList<String>(40)
        var lat = homeLat
        var lng = homeLng
        val steps = (km.coerceAtMost(30.0) * 1.6).toInt().coerceIn(12, 48)
        var heading = rnd.nextDouble() * Math.PI * 2
        for (i in 0 until steps) {
            heading += rnd.nextDouble() * 0.8 - 0.4
            lat += Math.cos(heading) * 0.0009
            lng += Math.sin(heading) * 0.0013
            pts += "[${"%.5f".format(lat)},${"%.5f".format(lng)}]"
        }
        return "[" + pts.joinToString(",") + "]"
    }

    private fun synthLaps(km: Double, paceSecPerKm: Double, rnd: Random): String {
        val full = km.toInt()
        if (full < 1) return "[]"
        val laps = (0 until full).map { i ->
            val p = (paceSecPerKm * (1 + rnd.nextDouble() * 0.05 - 0.025)).roundToInt()
            """{"km":${i + 1},"durSec":$p,"paceSecPerKm":$p}"""
        }
        return "[" + laps.joinToString(",") + "]"
    }
}
