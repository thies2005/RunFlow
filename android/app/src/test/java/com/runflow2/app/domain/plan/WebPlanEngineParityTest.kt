package com.runflow2.app.domain.plan

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Golden-fixture parity between the Kotlin port of the web training-plan
 * generator ([WebPlanEngine]) and the TypeScript original
 * (Web/src/lib/plans/index.ts + generators/).
 *
 * Fixtures are produced by Web/scripts/export-plan-fixtures.ts, which runs the
 * real web generator over a fixed config matrix and writes one JSON file per
 * config (plus manifest.json) to app/src/test/resources/plan_fixtures. This
 * test rebuilds the same WebPlanConfig in Kotlin, runs [WebPlanEngine], and
 * asserts per-workout equality: workout type, phase, date (day offset from
 * planStartDate), distance (±0.5 m), pace (±0.1 s/km), duration (±0.5 s),
 * structured-step sequence, and the exact technical description string.
 *
 * Regenerate fixtures with:
 *   cd Web && node scripts/run-export-plan-fixtures.cjs
 */
class WebPlanEngineParityTest {

    // ------------------------------------------------------------------
    // Fixture DTOs (camelCase, mirroring the exporter's JSON)
    // ------------------------------------------------------------------

    @Serializable
    data class FixtureConfig(
        val vdot: Double,
        val raceType: String? = null,
        val raceDate: String,
        val startDate: String? = null,
        val sport: String? = null,
        val runsPerWeek: Int? = null,
        val ridesPerWeek: Int? = null,
        val strengthPerWeek: Int? = null,
        val swimsPerWeek: Int? = null,
        val weeklyMileageGoal: Double? = null,
        val startWeeklyMileage: Double? = null,
        val taperWeeks: Int? = null,
        val peakWeeks: Int? = null,
        val buildWeeks: Int? = null,
        val maxLongRunKm: Double? = null,
        val longRunDay: Int? = null,
        val workoutDay: Int? = null,
        val swimDay: Int? = null,
        val restDays: List<Int>? = null,
        val weeksTotal: Int? = null,
        val targetVdot: Double? = null,
        val targetTime: Double? = null,
        val thresholdHeartRate: Int? = null,
        val hrZone1Max: Int? = null,
        val hrZone2Max: Int? = null,
        val hrZone3Max: Int? = null,
        val hrZone4Max: Int? = null,
        val hrZone5Max: Int? = null,
        val hrZone6Max: Int? = null,
        val hrMax: Int? = null,
        val hrRest: Int? = null,
        val customDistanceM: Double? = null,
        val customSwimDistM: Double? = null,
        val customBikeDistM: Double? = null,
        val customRunDistM: Double? = null,
    )

    @Serializable
    data class FixtureStep(
        val type: String,
        val name: String = "",
        val distanceMeters: Double? = null,
        val durationSeconds: Double? = null,
        val paceSecondsPerKm: Double? = null,
        val hrZone: Int? = null,
    )

    @Serializable
    data class FixturePlan(
        val version: Int = 1,
        val source: String = "generated-plan",
        val steps: List<FixtureStep> = emptyList(),
    )

    @Serializable
    data class FixtureWorkout(
        val id: String,
        val date: String,
        val type: String,
        val phase: String? = null,
        val description: String,
        val displayDescription: String? = null,
        val sport: String? = null,
        val intensityZone: String? = null,
        val totalDistance: Double,
        val targetPace: Double? = null,
        val targetDuration: Double? = null,
        val targetHrZone: Int? = null,
        val targetHrZoneLabel: String? = null,
        val targetHrMinBpm: Double? = null,
        val targetHrMaxBpm: Double? = null,
        val targetPaceZoneLabel: String? = null,
        val targetPaceMinSecondsPerKm: Double? = null,
        val targetPaceMaxSecondsPerKm: Double? = null,
        val structuredSteps: FixturePlan? = null,
    )

    @Serializable
    data class FixtureFile(val name: String, val config: FixtureConfig, val workouts: List<FixtureWorkout>)

    @Serializable
    data class ManifestEntry(val name: String, val config: FixtureConfig, val workoutCount: Int = 0)

    @Serializable
    data class FixtureManifest(val fixtures: List<ManifestEntry>)

    private val json = Json { ignoreUnknownKeys = true }

    private fun resource(name: String): String {
        val stream = javaClass.classLoader?.getResourceAsStream("plan_fixtures/$name")
            ?: error("missing test resource plan_fixtures/$name")
        return stream.bufferedReader().use { it.readText() }
    }

    // ------------------------------------------------------------------
    // Temporary divergence allowlist: fixture name -> workout indices whose
    // description is allowed to differ while templates are reconciled.
    // MUST stay empty for full parity; entries are reported in the failure.
    // ------------------------------------------------------------------
    private val descriptionAllowlist: Map<String, Set<Int>> = emptyMap()

    @Test
    fun manifestCoversTheRaceMatrix() {
        val manifest = json.decodeFromString<FixtureManifest>(resource("manifest.json"))
        val names = manifest.fixtures.map { it.name }
        assertTrue("expected >= 20 fixtures, got ${names.size}", names.size >= 20)
        val required = listOf(
            "five_k_v40", "ten_k_v40", "half_marathon_v40", "marathon_v40",
            "fifty_k_v40", "hundred_k_v40", "hundred_mile_v40",
            "backyard_ultra_v40", "sprint_tri_v40", "no_race_v40",
        )
        for (r in required) {
            assertTrue("manifest missing $r", r in names)
        }
    }

    @Test
    fun kotlinEngineMatchesWebGeneratorOnEveryFixture() {
        val manifest = json.decodeFromString<FixtureManifest>(resource("manifest.json"))
        assertTrue("no fixtures in manifest", manifest.fixtures.isNotEmpty())

        val allowlistedMismatches = StringBuilder()

        for (entry in manifest.fixtures) {
            val fixture = json.decodeFromString<FixtureFile>(resource("${entry.name}.json"))
            val config = toPlanConfig(fixture.config)
            val actual = WebPlanEngine.generateTrainingPlan(config)
            val expected = fixture.workouts

            assertEquals(
                "${entry.name}: workout count differs",
                expected.size,
                actual.size,
            )

            val allowed = descriptionAllowlist[entry.name] ?: emptySet()

            for (i in expected.indices) {
                val e = expected[i]
                val a = actual[i]
                val ctx = "${entry.name}#${i} (${e.type} ${e.date})"

                assertEquals("$ctx: type", e.type, a.type)
                assertEquals("$ctx: phase", e.phase, a.phase)
                assertEquals(
                    "$ctx: date",
                    LocalDate.parse(e.date),
                    a.date,
                )
                assertEqualsDouble("$ctx: totalDistance", e.totalDistance, a.totalDistance, 0.5)
                assertEqualsNullableDouble("$ctx: targetPace", e.targetPace, a.targetPace, 0.1)
                assertEqualsNullableDouble("$ctx: targetDuration", e.targetDuration, a.targetDuration, 0.5)
                assertEquals("$ctx: targetHrZone", e.targetHrZone, a.targetHrZone)
                assertEquals("$ctx: displayDescription", e.displayDescription, a.displayDescription)
                assertEquals("$ctx: sport", e.sport, a.sport)
                assertEquals("$ctx: intensityZone", e.intensityZone, a.intensityZone)
                assertEquals("$ctx: targetHrZoneLabel", e.targetHrZoneLabel, a.targetHrZoneLabel)
                assertEqualsNullableDouble("$ctx: targetHrMinBpm", e.targetHrMinBpm, a.targetHrMinBpm, 0.5)
                assertEqualsNullableDouble("$ctx: targetHrMaxBpm", e.targetHrMaxBpm, a.targetHrMaxBpm, 0.5)
                assertEquals("$ctx: targetPaceZoneLabel", e.targetPaceZoneLabel, a.targetPaceZoneLabel)
                assertEqualsNullableDouble(
                    "$ctx: targetPaceMinSecondsPerKm",
                    e.targetPaceMinSecondsPerKm, a.targetPaceMinSecondsPerKm, 0.1,
                )
                assertEqualsNullableDouble(
                    "$ctx: targetPaceMaxSecondsPerKm",
                    e.targetPaceMaxSecondsPerKm, a.targetPaceMaxSecondsPerKm, 0.1,
                )

                // structuredSteps: kind / distance / duration sequence
                val expectedSteps = e.structuredSteps?.steps ?: emptyList()
                val actualSteps = a.structuredSteps?.steps ?: emptyList()
                assertEquals("$ctx: structuredSteps count", expectedSteps.size, actualSteps.size)
                for (s in expectedSteps.indices) {
                    val es = expectedSteps[s]
                    val asStep = actualSteps[s]
                    val sctx = "$ctx step#$s"
                    assertEquals("$sctx kind", es.type, asStep.type)
                    assertEquals("$sctx name", es.name, asStep.name)
                    assertEqualsNullableDouble("$sctx distance", es.distanceMeters, asStep.distanceMeters, 0.5)
                    assertEqualsNullableDouble("$sctx duration", es.durationSeconds, asStep.durationSeconds, 0.5)
                    assertEqualsNullableDouble(
                        "$sctx pace", es.paceSecondsPerKm, asStep.paceSecondsPerKm, 0.1,
                    )
                    assertEquals("$sctx hrZone", es.hrZone, asStep.hrZone)
                }

                // the hard one: exact technical description
                if (e.description != a.description) {
                    if (i in allowed) {
                        allowlistedMismatches.appendLine(
                            "${entry.name}#$i:\n  web: ${e.description}\n  kt:  $a.description",
                        )
                    } else {
                        assertEquals("$ctx: description", e.description, a.description)
                    }
                }
            }
        }

        if (allowlistedMismatches.isNotEmpty()) {
            System.out.println(
                "WARNING: description divergences accepted via allowlist:\n$allowlistedMismatches",
            )
        }
    }

    private fun toPlanConfig(c: FixtureConfig): WebPlanConfig = WebPlanConfig(
        vdot = c.vdot,
        targetVdot = c.targetVdot,
        targetTime = c.targetTime,
        raceType = c.raceType,
        raceDate = LocalDate.parse(c.raceDate),
        startDate = c.startDate?.let { LocalDate.parse(it) },
        sport = c.sport,
        runsPerWeek = c.runsPerWeek,
        ridesPerWeek = c.ridesPerWeek,
        strengthPerWeek = c.strengthPerWeek,
        swimsPerWeek = c.swimsPerWeek,
        weeklyMileageGoal = c.weeklyMileageGoal,
        startWeeklyMileage = c.startWeeklyMileage,
        taperWeeks = c.taperWeeks,
        peakWeeks = c.peakWeeks,
        buildWeeks = c.buildWeeks,
        maxLongRunKm = c.maxLongRunKm,
        longRunDay = c.longRunDay,
        workoutDay = c.workoutDay,
        swimDay = c.swimDay,
        restDays = c.restDays,
        weeksTotal = c.weeksTotal,
        thresholdHeartRate = c.thresholdHeartRate,
        hrZone1Max = c.hrZone1Max,
        hrZone2Max = c.hrZone2Max,
        hrZone3Max = c.hrZone3Max,
        hrZone4Max = c.hrZone4Max,
        hrZone5Max = c.hrZone5Max,
        hrZone6Max = c.hrZone6Max,
        hrMax = c.hrMax,
        hrRest = c.hrRest,
        customDistanceM = c.customDistanceM,
        customSwimDistM = c.customSwimDistM,
        customBikeDistM = c.customBikeDistM,
        customRunDistM = c.customRunDistM,
    )

    private fun assertEqualsDouble(message: String, expected: Double, actual: Double, tolerance: Double) {
        assertTrue(
            "$message: expected <$expected> ±$tolerance but was <$actual>",
            kotlin.math.abs(expected - actual) <= tolerance,
        )
    }

    private fun assertEqualsNullableDouble(message: String, expected: Double?, actual: Double?, tolerance: Double) {
        if (expected == null || actual == null) {
            assertEquals(message, expected, actual)
        } else {
            assertTrue(
                "$message: expected <$expected> ±$tolerance but was <$actual>",
                kotlin.math.abs(expected - actual) <= tolerance,
            )
        }
    }
}
