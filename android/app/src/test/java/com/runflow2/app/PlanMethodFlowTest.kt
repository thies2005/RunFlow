package com.runflow2.app

import com.runflow2.app.domain.plan.PlanMethod
import com.runflow2.app.domain.plan.PlanMethodFlow
import com.runflow2.app.domain.plan.WizardStep
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlanMethodFlowTest {

    @Test
    fun `general fitness skips the race steps`() {
        val steps = PlanMethodFlow.stepsFor(PlanMethod.GENERAL_FITNESS)
        assertEquals(
            listOf(WizardStep.GOAL_METHOD, WizardStep.VOLUME, WizardStep.SCHEDULE),
            steps,
        )
    }

    @Test
    fun `race methods use the full flow`() {
        for (m in listOf(PlanMethod.WEB_ENGINE, PlanMethod.CLASSIC)) {
            assertEquals(WizardStep.entries.toList(), PlanMethodFlow.stepsFor(m))
        }
    }

    @Test
    fun `only classic works without sign-in`() {
        assertFalse(PlanMethod.CLASSIC.requiresSignIn)
        assertTrue(PlanMethod.WEB_ENGINE.requiresSignIn)
        assertTrue(PlanMethod.GENERAL_FITNESS.requiresSignIn)
    }
}
