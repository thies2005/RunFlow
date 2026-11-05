package com.runflow2.app

import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.plan.ComplianceCalculator
import com.runflow2.app.domain.plan.ComplianceCalculator.displaySummary
import com.runflow2.app.recording.RecordingController
import com.runflow2.app.recording.RecStatus
import com.runflow2.app.domain.plan.RaceDefaultsTable
import com.runflow2.app.ui.screens.calibrationVdot
import org.junit.Assert.*
import org.junit.Test

class AuditRegressionTest {
    @Test fun `wizard calibration uses race distance in metres`() {
        val tenKm = RaceDefaultsTable.calibrationRaces.first { it.first == "10K" }
        assertEquals(40.0, calibrationVdot(tenKm.third, "0:50:00")!!, 1.0)
        assertNull(calibrationVdot(tenKm.third, ""))
    }
    @Test fun `generated instructions convert distances without rewriting imported notes`() {
        assertEquals("Original instructions (metric): Easy Run: 4.0km", Format.workoutInstructions("Easy Run: 4.0km", DistanceUnit.IMPERIAL, true))
        assertEquals("Original instructions (metric): Coach says 4.0km", Format.workoutInstructions("Coach says 4.0km", DistanceUnit.IMPERIAL, false))
        assertEquals("Easy Run: 4.0km", Format.workoutInstructions("Easy Run: 4.0km", DistanceUnit.METRIC, true))
    }
    @Test fun `summary rounding handles negative form consistently`() {
        assertEquals("55", Format.roundedIntOrDash(54.8))
        assertEquals("-7", Format.roundedIntOrDash(-6.8))
    }
    @Test fun `compliance names distance fallback instead of zero TSS`() {
        val workout = WorkoutEntity(id = "w", goalId = "g", scheduledDate = 0,
            workoutType = "EASY", phase = "BASE", description = "Easy", targetDistanceKm = 5.0, targetPaceSecPerKm = null, targetDurationSec = null, isCompleted = true)
        val result = ComplianceCalculator.calculateWeeklyCompliance(listOf(workout))
        assertEquals("Load unavailable · Distance adherence · 100%", result.displaySummary("TSS"))
        assertEquals("Not started · 1 workouts", ComplianceCalculator.calculateWeeklyCompliance(listOf(workout.copy(isCompleted = false, scheduledDate = java.time.LocalDate.now().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()))).displaySummary("TSS"))
    }
    @Test fun `paused finish confirmation cannot accrue moving time or distance`() {
        val controller = RecordingController(gpsSmoothingEnabled = false)
        controller.start(null, countdownSec = 1)
        controller.beginCountdownTick()
        controller.pause()
        val frozen = controller.state.value
        controller.tick()
        controller.onLocation(52.5, 13.4, 0.0, 3.0, 5f, t = 1000)
        assertEquals(RecStatus.PAUSED, controller.state.value.status)
        assertEquals(frozen.elapsedMovingSec, controller.state.value.elapsedMovingSec, 0.0)
        assertEquals(frozen.distanceM, controller.state.value.distanceM, 0.0)
        controller.resume()
        assertEquals(RecStatus.RUNNING, controller.state.value.status)
    }
}
