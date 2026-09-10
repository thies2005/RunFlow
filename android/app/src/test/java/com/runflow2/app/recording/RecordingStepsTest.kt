package com.runflow2.app.recording

import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Drives the step engine through deterministic GPS hops (each ~22 m apart, so
 * the <60 m noise filter accepts them; implied speed is unphysical, so the
 * Kalman smoothing is disabled — these tests target the step engine, GPS
 * filtering is covered by RecordingSmoothingTest). TIME-step advancement
 * depends on the wall clock and is covered by the pure
 * [RecordingController.stepRemaining] / [RecordingController.stepCountdownCue]
 * helpers instead.
 */
class RecordingStepsTest {

    private fun distStep(label: String, meters: Double, kind: String = "main") =
        StepRuntime(label, kind, StepDurationType.DISTANCE, 0.0, meters, 240.0)

    private fun timeStep(label: String, seconds: Double, kind: String = "recovery") =
        StepRuntime(label, kind, StepDurationType.TIME, seconds, 0.0, null)

    @Test
    fun `distance steps advance on gps progress and record splits`() = runTest {
        val controller = RecordingController(gpsSmoothingEnabled = false)
        val events = ArrayList<VoiceEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            controller.voice.collect { events += it }
        }
        controller.start(
            null,
            countdownSec = 1,
            resolvedSteps = listOf(distStep("400 m I (1/2)", 30.0), timeStep("90 s rest", 90.0)),
        )
        controller.beginCountdownTick() // 1 -> 0 -> RUNNING
        assertEquals(0, controller.state.value.activeStepIndex)
        assertEquals(30.0, controller.state.value.currentStepRemaining!!, 0.01)

        // first fix anchors lastPt without distance; each hop adds ~22.2 m
        controller.onLocation(0.0, 0.0, 0.0, 2.5, 5f, t = 1_000)
        controller.onLocation(0.0002, 0.0, 0.0, 2.5, 5f, t = 2_000)
        val afterOne = controller.state.value
        assertEquals(0, afterOne.activeStepIndex)
        assertEquals(22.0, afterOne.distanceM, 1.0)
        assertTrue(afterOne.stepProgress in 0.5f..0.9f)
        assertEquals(8.0, afterOne.currentStepRemaining!!, 2.0)

        // second hop crosses the 30 m threshold -> step 0 done, rest begins
        controller.onLocation(0.0004, 0.0, 0.0, 2.5, 5f, t = 3_000)
        val afterTwo = controller.state.value
        assertEquals(1, afterTwo.activeStepIndex)
        assertEquals(0f, afterTwo.stepProgress, 0.001f)
        assertEquals(90.0, afterTwo.currentStepRemaining!!, 0.001)
        assertEquals(1, afterTwo.stepSplits.size)
        val split = afterTwo.stepSplits.single()
        assertEquals("400 m I (1/2)", split.label)
        assertEquals(0, split.index)
        assertEquals(44.0, split.distanceM, 1.0)

        val labels = events.filterIsInstance<VoiceEvent.StepDone>()
        assertEquals(listOf("400 m I (1/2)"), labels.map { it.label })
        val starts = events.filterIsInstance<VoiceEvent.StepStart>()
        assertEquals(listOf("400 m I (1/2)", "90 s rest"), starts.map { it.label })
    }

    @Test
    fun `final completion clears the active step and keeps the splits`() = runTest {
        val controller = RecordingController(gpsSmoothingEnabled = false)
        controller.start(
            null,
            countdownSec = 1,
            resolvedSteps = listOf(distStep("Warm-up 1.0 km", 20.0, kind = "warmup"), distStep("400 m I", 20.0)),
        )
        controller.beginCountdownTick()
        controller.onLocation(0.0, 0.0, 0.0, 2.5, 5f, t = 1_000)
        controller.onLocation(0.0002, 0.0, 0.0, 2.5, 5f, t = 2_000) // ~22 m: step 0 done
        controller.onLocation(0.0004, 0.0, 0.0, 2.5, 5f, t = 3_000) // ~44 m: step 1 done
        val s = controller.state.value
        assertEquals(-1, s.activeStepIndex)
        assertEquals(1f, s.stepProgress, 0.001f)
        assertNull(s.currentStepRemaining)
        assertEquals(2, s.stepSplits.size)
        assertEquals(listOf("Warm-up 1.0 km", "400 m I"), s.stepSplits.map { it.label })
    }

    // ---- pure countdown / remaining math ----

    @Test
    fun `step remaining clamps at zero for both duration types`() {
        val time = timeStep("90 s rest", 90.0)
        assertEquals(80.0, RecordingController.stepRemaining(time, 0.0, 10.0), 0.001)
        assertEquals(0.0, RecordingController.stepRemaining(time, 0.0, 95.0), 0.001)
        val dist = distStep("400 m I", 400.0)
        assertEquals(300.0, RecordingController.stepRemaining(dist, 100.0, 0.0), 0.001)
        assertEquals(0.0, RecordingController.stepRemaining(dist, 450.0, 0.0), 0.001)
    }

    @Test
    fun `countdown cue fires once per second boundary in the last three seconds`() {
        assertEquals(3, RecordingController.stepCountdownCue(2.4, 0))
        assertEquals(3, RecordingController.stepCountdownCue(3.0, 0))
        assertNull(RecordingController.stepCountdownCue(2.4, 3)) // 3 already spoken
        assertEquals(2, RecordingController.stepCountdownCue(2.0, 3))
        assertEquals(1, RecordingController.stepCountdownCue(0.4, 2))
        assertNull(RecordingController.stepCountdownCue(0.4, 1))
        assertNull(RecordingController.stepCountdownCue(5.0, 0)) // outside the window
        assertNull(RecordingController.stepCountdownCue(0.0, 0))
    }
}
