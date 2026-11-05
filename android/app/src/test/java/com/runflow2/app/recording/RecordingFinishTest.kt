package com.runflow2.app.recording

import org.junit.Assert.assertEquals
import org.junit.Test

class RecordingFinishTest {
    @Test
    fun `finish freezes clocks and distance and keep going resumes recording`() {
        val controller = RecordingController(gpsSmoothingEnabled = false)
        controller.start(null, countdownSec = 1)
        controller.beginCountdownTick()
        controller.onLocation(0.0, 0.0, 0.0, 2.5, 5f, 1_000)
        controller.onLocation(0.0002, 0.0, 0.0, 2.5, 5f, 2_000)
        controller.beginFinish()
        val frozen = controller.state.value
        controller.tick()
        controller.onLocation(0.0004, 0.0, 0.0, 3.0, 5f, 3_000)
        assertEquals(frozen, controller.state.value)
        controller.cancelFinish()
        assertEquals(RecStatus.RUNNING, controller.state.value.status)
        controller.onLocation(0.0004, 0.0, 0.0, 2.5, 5f, 4_000)
        controller.onLocation(0.0006, 0.0, 0.0, 2.5, 5f, 5_000)
        assertEquals(frozen.distanceM + 22.2, controller.state.value.distanceM, 1.0)
    }

    @Test
    fun `keep going preserves a manually paused session`() {
        val controller = RecordingController(gpsSmoothingEnabled = false)
        controller.start(null, countdownSec = 1)
        controller.beginCountdownTick()
        controller.pause()
        controller.beginFinish()
        val frozen = controller.state.value
        controller.tick()
        assertEquals(frozen, controller.state.value)
        controller.cancelFinish()
        assertEquals(RecStatus.PAUSED, controller.state.value.status)
    }
}
