package com.runflow2.app.recording

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RecordingSaveEligibilityTest {
    @Test
    fun `stationary strength session with time can be saved`() {
        val strength = RecordingState(status = RecStatus.PAUSED, sportType = "WORKOUT", elapsedMovingSec = 6.0)
        assertTrue(strength.isSaveable())
        assertFalse(strength.copy(elapsedMovingSec = 0.0).isSaveable())
        assertFalse(strength.copy(status = RecStatus.IDLE).isSaveable())
    }

    @Test
    fun `distance sports retain gps noise threshold`() {
        val run = RecordingState(status = RecStatus.PAUSED, sportType = "RUN", elapsedMovingSec = 6.0)
        assertFalse(run.copy(distanceM = 10.0).isSaveable())
        assertTrue(run.copy(distanceM = 10.1).isSaveable())
    }
}
