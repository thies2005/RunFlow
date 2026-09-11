package com.runflow2.app

import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.plan.PlanSpec
import com.runflow2.app.domain.plan.WebPlanEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate

/**
 * Pins the two parallel PlanSpec mappings against each other: the server
 * request ([toCreatePlanRequest], what POST /api/plans receives) and the
 * offline generator config ([WebPlanEngine.configFromSpec], what the on-device
 * port of the web engine runs). If these drift apart, offline plans silently
 * stop matching what the server would have generated — this test is the trip
 * wire.
 *
 * vdot is deliberately not compared: the server resolves it from the account
 * profile + calibration payload, while the offline config carries the
 * locally-computed effective VDOT. Everything that IS generator input on both
 * sides must match field for field.
 */
class PlanConfigParityTest {

    private val start = LocalDate.of(2026, 9, 10)

    private fun specs(): List<Pair<String, PlanSpec>> = listOf(
        "road marathon" to PlanSpec(
            name = "Berlin Marathon",
            raceType = RaceType.MARATHON,
            raceDate = start.plusWeeks(16),
            startDate = start,
            targetTimeSec = 13_500,
            weeklyKm = 58.0,
            runsPerWeek = 5,
            longRunKm = 30.0,
            strengthPerWeek = 1,
            longRunDay = DayOfWeek.SUNDAY,
            workoutDay = DayOfWeek.THURSDAY,
            restDays = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
            vdot = 47.5,
            calibrationTimeSec = 1_290,
            calibrationDistance = "10K",
        ),
        "triathlon" to PlanSpec(
            name = "Ironman 70.3",
            raceType = RaceType.HALF_IRONMAN,
            raceDate = start.plusWeeks(20),
            startDate = start,
            weeklyKm = 40.0,
            runsPerWeek = 3,
            longRunKm = 18.0,
            restDays = setOf(DayOfWeek.MONDAY, DayOfWeek.FRIDAY),
            vdot = 44.0,
        ),
        "general fitness (no race)" to PlanSpec(
            name = "Winter base",
            raceType = RaceType.NONE,
            raceDate = start.plusWeeks(12),
            startDate = start,
            weeklyKm = 45.0,
            runsPerWeek = 4,
            longRunKm = 20.0,
            vdot = 42.0,
        ),
        "custom distance ultra" to PlanSpec(
            name = "Custom 60K",
            raceType = RaceType.CUSTOM_DISTANCE,
            raceDate = start.plusWeeks(14),
            startDate = start,
            weeklyKm = 70.0,
            runsPerWeek = 5,
            longRunKm = 34.0,
            vdot = 50.0,
            customDistanceKm = 60.0,
        ),
        "custom triathlon with advanced options" to PlanSpec(
            name = "Custom Tri",
            raceType = RaceType.CUSTOM_TRI,
            raceDate = start.plusWeeks(18),
            startDate = start,
            targetTimeSec = 15_000,
            weeklyKm = 35.0,
            runsPerWeek = 3,
            longRunKm = 22.0,
            restDays = setOf(DayOfWeek.MONDAY, DayOfWeek.FRIDAY),
            vdot = 44.0,
            ridesPerWeek = 2,
            swimsPerWeek = 2,
            strengthPerWeek = 2,
            startWeeklyKm = 25.0,
            peakWeeks = 3,
            buildWeeks = 5,
            swimDay = DayOfWeek.TUESDAY,
            customSwimKm = 1.9,
            customBikeKm = 90.0,
            customRunKm = 21.1,
            maxHeartRate = 190,
            restingHeartRate = 50,
            thresholdHeartRate = 175,
            thresholdPaceSecPerKm = 255,
        ),
        "backyard ultra with loop and laps" to PlanSpec(
            name = "Backyard",
            raceType = RaceType.BACKYARD_ULTRA,
            raceDate = start.plusWeeks(20),
            startDate = start,
            weeklyKm = 60.0,
            runsPerWeek = 5,
            longRunKm = 35.0,
            vdot = 48.0,
            backyardLoopKm = 6.706,
            targetLaps = 16,
        ),
    )

    @Test
    fun `offline config matches the server request for every generator input`() {
        specs().forEach { (label, spec) ->
            val req = spec.toCreatePlanRequest()
            val cfg = WebPlanEngine.configFromSpec(spec)

            // race identity
            assertEquals("$label raceType", req.raceType, cfg.raceType)
            // (no-race: the server sends raceDate=null; the offline config carries a
            // synthetic race date that WebPlanNoRace ignores in favour of
            // weeksTotal — output parity is pinned by the no-race fixtures)
            if (req.raceDate != null) {
                assertEquals("$label raceDate", req.raceDate, cfg.raceDate.toString())
            }
            assertEquals(
                "$label sport",
                req.sport == "TRIATHLON",
                cfg.sport == "TRIATHLON",
            )

            // volume + schedule
            assertEquals("$label runsPerWeek", req.runsPerWeek, cfg.runsPerWeek)
            assertEquals("$label strengthPerWeek", req.strengthPerWeek, cfg.strengthPerWeek)
            // rides/swims: asserted when the spec sets them; when null, the
            // offline config applies the server pipeline's fallback (own test)
            spec.ridesPerWeek?.let { assertEquals("$label ridesPerWeek", it, cfg.ridesPerWeek) }
            spec.swimsPerWeek?.let { assertEquals("$label swimsPerWeek", it, cfg.swimsPerWeek) }
            assertEquals("$label weeklyMileageGoal", req.weeklyMileageGoal!!, cfg.weeklyMileageGoal!!, 1e-9)
            assertEquals("$label startWeeklyMileage", req.startWeeklyMileage, cfg.startWeeklyMileage)
            assertEquals("$label maxLongRunKm", req.maxLongRunKm!!, cfg.maxLongRunKm!!, 1e-9)
            assertEquals("$label taperWeeks", req.taperWeeks, cfg.taperWeeks)
            assertEquals("$label peakWeeks", req.peakWeeks, cfg.peakWeeks)
            assertEquals("$label buildWeeks", req.buildWeeks, cfg.buildWeeks)
            assertEquals("$label longRunDay", req.longRunDay, cfg.longRunDay)
            assertEquals("$label workoutDay", req.workoutDay, cfg.workoutDay)
            assertEquals("$label swimDay", req.swimDay, cfg.swimDay)
            assertEquals("$label restDays", req.restDays!!.sorted(), cfg.restDays!!.sorted())

            // targets + custom distances
            assertEquals("$label targetTime", req.targetTime?.toDouble(), cfg.targetTime)
            assertEquals("$label customDistanceM", req.customDistanceM, cfg.customDistanceM)
            assertEquals("$label customSwimDistM", req.customSwimDistM, cfg.customSwimDistM)
            assertEquals("$label customBikeDistM", req.customBikeDistM, cfg.customBikeDistM)
            assertEquals("$label customRunDistM", req.customRunDistM, cfg.customRunDistM)

            // heart-rate profile
            assertEquals("$label maxHeartRate", req.maxHeartRate, cfg.hrMax)
            assertEquals("$label restingHeartRate", req.restingHeartRate, cfg.hrRest)
            assertEquals("$label thresholdHeartRate", req.thresholdHeartRate, cfg.thresholdHeartRate)
            assertEquals(
                "$label thresholdPace",
                req.thresholdPaceSecondsPerKm?.toDouble(),
                spec.thresholdPaceSecPerKm?.toDouble(),
            )

            // the server receives a Monday-snapped planStartDate; the offline
            // engine snaps to the same week start internally
            assertEquals(
                "$label week start",
                LocalDate.parse(req.planStartDate!!),
                cfg.startDate!!.with(DayOfWeek.MONDAY),
            )

            // no-race plans: explicit length must agree (server durationWeeks
            // vs offline weeksTotal)
            if (req.durationWeeks != null) {
                assertEquals("$label durationWeeks", req.durationWeeks, cfg.weeksTotal)
            } else {
                assertNull("$label weeksTotal only for no-race", cfg.weeksTotal)
            }
        }
    }

    @Test
    fun `missing cross-training defaults mirror the server pipeline`() {
        // The web's plan-creation fills missing per-sport frequencies with
        // `ridesPerWeek ?? (TRIATHLON ? 2 : 0)` before the generator runs; the
        // offline configFromSpec applies the same fallback so an offline plan
        // matches what the server would have generated.
        val tri = specs().first { it.first.contains("triathlon") }.second.copy(ridesPerWeek = null, swimsPerWeek = null)
        val triCfg = WebPlanEngine.configFromSpec(tri)
        assertEquals(2, triCfg.ridesPerWeek)
        assertEquals(2, triCfg.swimsPerWeek)

        val run = specs().first { it.first == "road marathon" }.second.copy(ridesPerWeek = null, swimsPerWeek = null)
        val runCfg = WebPlanEngine.configFromSpec(run)
        assertEquals(0, runCfg.ridesPerWeek)
        assertEquals(0, runCfg.swimsPerWeek)
    }

    @Test
    fun `server-only metadata maps onto the request`() {
        // backyardLoopDistM/targetLaps are goal metadata the server stores
        // (loop-time prediction, laps goal); the web GENERATOR does not shape
        // workouts from them either, so the offline WebPlanConfig has no
        // counterpart — parity holds without them. thresholdPace updates the
        // user profile server-side only. These assertions pin the request
        // mapping so a silent always-null regression cannot pass.
        val backyard = specs().first { it.first.startsWith("backyard") }.second
        val backyardReq = backyard.toCreatePlanRequest()
        assertEquals(6706.0, backyardReq.backyardLoopDistM!!, 1e-9)
        assertEquals(16, backyardReq.targetLaps)

        val tri = specs().first { it.first.startsWith("custom triathlon") }.second
        val triReq = tri.toCreatePlanRequest()
        assertEquals("TRIATHLON", triReq.sport)
        assertEquals(1900.0, triReq.customSwimDistM!!, 1e-9)
        assertEquals(90000.0, triReq.customBikeDistM!!, 1e-9)
        assertEquals(21100.0, triReq.customRunDistM!!, 1e-9)
        assertEquals(255.0, triReq.thresholdPaceSecondsPerKm!!, 1e-9)
    }

    @Test
    fun `day numbering is the JS convention on both paths`() {
        val spec = specs().first().second
        val req = spec.toCreatePlanRequest()
        val cfg = WebPlanEngine.configFromSpec(spec)

        // Sunday = 0 … Saturday = 6, matching the web's getDay():
        // long run Sunday(0), quality Thursday(4), rest Tuesday+Friday(2, 5)
        assertEquals(0, cfg.longRunDay)
        assertEquals(4, cfg.workoutDay)
        assertEquals(listOf(2, 5), cfg.restDays!!.sorted())
        assertEquals(req.longRunDay, cfg.longRunDay)
        assertEquals(req.workoutDay, cfg.workoutDay)
    }
}
