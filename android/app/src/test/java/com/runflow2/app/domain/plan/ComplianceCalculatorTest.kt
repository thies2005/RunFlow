package com.runflow2.app.domain.plan

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class ComplianceCalculatorTest {

    private val zone = ZoneId.of("UTC")

    private fun dateToMillis(dateStr: String): Long {
        return LocalDate.parse(dateStr).atStartOfDay(zone).toInstant().toEpochMilli()
    }

    @Test
    fun `evaluateRatio accurately maps 3-color compliance bands`() {
        // ON_TARGET: 0.85 .. 1.15 -> GREEN
        val (s1, c1) = ComplianceCalculator.evaluateRatio(0.85)
        assertEquals(ComplianceCalculator.ComplianceStatus.ON_TARGET, s1)
        assertEquals(ComplianceCalculator.ComplianceColor.GREEN, c1)

        val (s2, c2) = ComplianceCalculator.evaluateRatio(1.00)
        assertEquals(ComplianceCalculator.ComplianceStatus.ON_TARGET, s2)
        assertEquals(ComplianceCalculator.ComplianceColor.GREEN, c2)

        val (s3, c3) = ComplianceCalculator.evaluateRatio(1.15)
        assertEquals(ComplianceCalculator.ComplianceStatus.ON_TARGET, s3)
        assertEquals(ComplianceCalculator.ComplianceColor.GREEN, c3)

        // DEVIATED: 0.60 .. 0.85 or 1.15 .. 1.35 -> AMBER
        val (s4, c4) = ComplianceCalculator.evaluateRatio(0.60)
        assertEquals(ComplianceCalculator.ComplianceStatus.DEVIATED, s4)
        assertEquals(ComplianceCalculator.ComplianceColor.AMBER, c4)

        val (s5, c5) = ComplianceCalculator.evaluateRatio(0.80)
        assertEquals(ComplianceCalculator.ComplianceStatus.DEVIATED, s5)
        assertEquals(ComplianceCalculator.ComplianceColor.AMBER, c5)

        val (s6, c6) = ComplianceCalculator.evaluateRatio(1.20)
        assertEquals(ComplianceCalculator.ComplianceStatus.DEVIATED, s6)
        assertEquals(ComplianceCalculator.ComplianceColor.AMBER, c6)

        // OFF_TARGET: < 0.60 or > 1.35 -> RED
        val (s7, c7) = ComplianceCalculator.evaluateRatio(0.55)
        assertEquals(ComplianceCalculator.ComplianceStatus.OFF_TARGET, s7)
        assertEquals(ComplianceCalculator.ComplianceColor.RED, c7)

        val (s8, c8) = ComplianceCalculator.evaluateRatio(1.40)
        assertEquals(ComplianceCalculator.ComplianceStatus.OFF_TARGET, s8)
        assertEquals(ComplianceCalculator.ComplianceColor.RED, c8)
    }

    @Test
    fun `calculateWorkoutCompliance assigns MISSED to uncompleted past sessions`() {
        val past = WorkoutEntity(
            id = "w-past",
            goalId = "g1",
            scheduledDate = dateToMillis("2026-10-20"),
            workoutType = "EASY",
            phase = "BASE",
            description = "Past run",
            isCompleted = false,
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 2400,
        )

        val result = ComplianceCalculator.calculateWorkoutCompliance(
            workout = past,
            today = LocalDate.parse("2026-10-25"),
            zoneId = zone,
        )

        assertEquals(ComplianceCalculator.ComplianceStatus.MISSED, result.status)
        assertEquals(ComplianceCalculator.ComplianceColor.RED, result.color)
    }

    @Test
    fun `calculateWorkoutCompliance assigns PENDING to uncompleted future sessions`() {
        val future = WorkoutEntity(
            id = "w-future",
            goalId = "g1",
            scheduledDate = dateToMillis("2026-10-30"),
            workoutType = "EASY",
            phase = "BASE",
            description = "Future run",
            isCompleted = false,
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 2400,
        )

        val result = ComplianceCalculator.calculateWorkoutCompliance(
            workout = future,
            today = LocalDate.parse("2026-10-25"),
            zoneId = zone,
        )

        assertEquals(ComplianceCalculator.ComplianceStatus.PENDING, result.status)
        assertEquals(ComplianceCalculator.ComplianceColor.GRAY, result.color)
    }

    @Test
    fun `calculateWorkoutCompliance tags COMPLETED_UNLINKED when completed without activity`() {
        val completedNoLink = WorkoutEntity(
            id = "w-done",
            goalId = "g1",
            scheduledDate = dateToMillis("2026-10-24"),
            workoutType = "EASY",
            phase = "BASE",
            description = "Completed run",
            isCompleted = true,
            activityId = null,
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 2400,
        )

        val result = ComplianceCalculator.calculateWorkoutCompliance(
            workout = completedNoLink,
            today = LocalDate.parse("2026-10-25"),
            zoneId = zone,
        )

        assertEquals(ComplianceCalculator.ComplianceStatus.COMPLETED_UNLINKED, result.status)
        assertEquals(ComplianceCalculator.ComplianceColor.GREEN, result.color)
    }

    @Test
    fun `calculateWeeklyCompliance aggregates planned vs actual TSS and 3-color status`() {
        val w1 = WorkoutEntity(
            id = "w1",
            goalId = "g1",
            scheduledDate = dateToMillis("2026-10-26"),
            workoutType = "EASY",
            phase = "BASE",
            description = "Easy Run",
            isCompleted = true,
            activityId = "act-1",
            plannedTss = 50.0,
            targetDistanceKm = 10.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 3000,
        )
        val act1 = ActivityEntity(
            id = "act-1",
            name = "Morning Run",
            type = "RUN",
            startDate = dateToMillis("2026-10-26"),
            distanceMeters = 10000.0,
            movingTimeSec = 3000,
            averageHr = 145.0,
            maxHr = 160,
            averageCadence = 175.0,
            totalElevation = 50.0,
            calories = 650,
            trimp = 55.0,
            trainingType = "EASY",
            estimatedVdot = 48.0,
            routeJson = null,
            lapsJson = null,
        )

        val w2 = WorkoutEntity(
            id = "w2",
            goalId = "g1",
            scheduledDate = dateToMillis("2026-10-28"),
            workoutType = "TEMPO",
            phase = "BASE",
            description = "Tempo Run",
            isCompleted = true,
            activityId = "act-2",
            plannedTss = 70.0,
            targetDistanceKm = 12.0,
            targetPaceSecPerKm = 270,
            targetDurationSec = 3240,
        )
        val act2 = ActivityEntity(
            id = "act-2",
            name = "Tempo Run",
            type = "RUN",
            startDate = dateToMillis("2026-10-28"),
            distanceMeters = 12000.0,
            movingTimeSec = 3200,
            averageHr = 165.0,
            maxHr = 175,
            averageCadence = 180.0,
            totalElevation = 40.0,
            calories = 750,
            trimp = 80.0, // 80 * 0.85 = 68 TSS
            trainingType = "TEMPO",
            estimatedVdot = 49.0,
            routeJson = null,
            lapsJson = null,
        )

        val aggregate = ComplianceCalculator.calculateWeeklyCompliance(
            workouts = listOf(w1, w2),
            activitiesById = mapOf("act-1" to act1, "act-2" to act2),
            today = LocalDate.parse("2026-10-30"),
            zoneId = zone,
        )

        assertEquals(120.0, aggregate.plannedTss, 0.01)
        assertEquals(2, aggregate.completedCount)
        assertEquals(ComplianceCalculator.ComplianceStatus.ON_TARGET, aggregate.status)
        assertEquals(ComplianceCalculator.ComplianceColor.GREEN, aggregate.statusColor)
    }
}
