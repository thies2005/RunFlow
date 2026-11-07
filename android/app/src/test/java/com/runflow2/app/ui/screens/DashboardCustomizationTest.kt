package com.runflow2.app.ui.screens

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.repo.*
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class DashboardCustomizationTest {
    private fun ride(date: LocalDate, tss: Double?) = ActivityEntity(
        id = date.toString(), name = "Ride", type = "RIDE",
        startDate = date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli(),
        distanceMeters = 10000.0, movingTimeSec = 100, averageHr = null, maxHr = null,
        averageCadence = null, totalElevation = 0.0, calories = null, trimp = 25.0,
        trainingType = null, estimatedVdot = null, routeJson = null, lapsJson = null, bikeTss = tss,
    )

    @Test fun defaultsAndInvalidValues() {
        assertEquals(WorkoutCardStyle.COMPACT, DashboardCustomization().workoutStyle)
        assertEquals(DashboardLayout.HYBRID, parseEnum("invalid", DashboardLayout.HYBRID))
        assertEquals(DashboardCustomization().metrics, parseDashboardMetrics(null))
        assertEquals(emptySet<DashboardMetric>(), parseDashboardMetrics(emptySet()))
        assertEquals(setOf(DashboardMetric.RUN_VDOT), parseDashboardMetrics(setOf("RUN_VDOT", "unknown")))
    }

    @Test fun weeklyTssExcludesFutureAndDoesNotUseTrimp() {
        val monday = LocalDate.of(2026, 11, 2)
        val activities = listOf(ride(monday.minusDays(1), 99.0), ride(monday, 40.0), ride(monday.plusDays(2), null))
        assertEquals(40.0, currentWeekBikeTss(activities, monday.plusDays(1))!!, 0.01)
        assertNull(currentWeekBikeTss(activities, monday.plusDays(2)))
        assertEquals(0.0, currentWeekBikeTss(activities, monday.minusDays(2))!!, 0.01)
    }

    @Test fun periodFilteringIncludesBoundariesAcrossYearAndExcludesFuture() {
        val dates = listOf(
            LocalDate.of(2025, 12, 31), LocalDate.of(2026, 1, 1),
            LocalDate.of(2026, 1, 4), LocalDate.of(2026, 1, 5),
            LocalDate.of(2026, 1, 7), LocalDate.of(2026, 1, 8),
        )
        val activities = dates.map { ride(it, 40.0) }
        val today = LocalDate.of(2026, 1, 7)
        assertEquals(dates.slice(3..4).map { it.toString() },
            periodActivities(activities, LocalDate.of(2026, 1, 5), today).map { it.id })
        assertEquals(dates.slice(1..4).map { it.toString() },
            periodActivities(activities, today.withDayOfMonth(1), today).map { it.id })
        assertEquals(listOf(dates[0].toString(), dates[1].toString()),
            periodActivities(activities, dates[0], dates[1]).map { it.id })
    }

    @Test fun mixedLoadUsesEstimatedTssAndDoesNotTreatMissingTrimpAsZero() {
        val day = LocalDate.of(2026, 11, 2)
        val bike = ride(day, 70.0).copy(trimp = 30.0)
        val run = ride(day.plusDays(1), null).copy(type = "RUN", trimp = 40.0)
        assertEquals(70.0, actualTss(listOf(bike))!!, 0.01)
        assertEquals("TSS", tssLabel(listOf(bike)))
        assertEquals(104.0, actualTss(listOf(bike, run))!!, 0.01)
        assertEquals("estimated TSS", tssLabel(listOf(bike, run)))
        assertEquals(70.0, actualTrimp(listOf(bike, run))!!, 0.01)
        val missing = run.copy(trimp = 0.0)
        assertNull(actualTrimp(listOf(bike, missing)))
        assertEquals("estimated TSS", tssLabel(listOf(bike.copy(bikeTss = null))))
    }

    @Test fun missingEffortIsUnavailableButEmptyAndValidTotalsRemainUsable() {
        val day = LocalDate.of(2026, 11, 2)
        val bike = ride(day, 70.0)
        val missingRide = ride(day.plusDays(1), null).copy(trimp = 0.0)
        val missingRun = missingRide.copy(type = "RUN")
        assertEquals(0.0, actualTss(emptyList())!!, 0.01)
        assertNull(actualTss(listOf(missingRide)))
        assertNull(actualTss(listOf(bike, missingRun)))
        val run = missingRun.copy(trimp = 40.0)
        assertEquals(104.0, actualTss(listOf(bike, run))!!, 0.01)
    }

    @Test fun swimDistanceNormalizesTypeAndExcludesFuture() {
        val monday = LocalDate.of(2026, 11, 2)
        val swims = listOf(
            ride(monday.minusDays(1), null).copy(type = "SWIM"),
            ride(monday, null).copy(type = " swim ", distanceMeters = 1800.0),
            ride(monday.plusDays(2), null).copy(type = "SWIM", distanceMeters = 2000.0),
            ride(monday, null).copy(type = "RIDE", distanceMeters = 5000.0),
        )
        assertEquals(1.8, swimDistanceKm(swims, monday, monday.plusDays(1)), 0.001)
    }

    @Test fun effortRatioPreservesOverTargetAndRejectsMissingTarget() {
        assertEquals(300.0 / 220.0, effortRatio(300.0, 220.0)!!, 0.0001)
        assertNull(effortRatio(100.0, null))
        assertNull(effortRatio(100.0, 0.0))
    }

}
