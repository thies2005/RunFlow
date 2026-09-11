package com.runflow2.app

import com.runflow2.app.domain.plan.PlanMethodFlow
import com.runflow2.app.domain.plan.WizardStep
import org.junit.Assert.assertEquals
import org.junit.Test

class PlanMethodFlowTest {

    @Test
    fun `no-race goals skip the race steps`() {
        val steps = PlanMethodFlow.stepsFor(noRace = true)
        assertEquals(
            listOf(WizardStep.EVENT_TYPE, WizardStep.VOLUME, WizardStep.ADVANCED, WizardStep.SCHEDULE),
            steps,
        )
    }

    @Test
    fun `race goals use the full flow`() {
        assertEquals(WizardStep.entries.toList(), PlanMethodFlow.stepsFor(noRace = false))
    }

    @Test
    fun `the first screen is the event category and the second the specific race`() {
        val steps = PlanMethodFlow.stepsFor(noRace = false)
        assertEquals(WizardStep.EVENT_TYPE, steps.first())
        assertEquals(WizardStep.RACE, steps[1])
    }
}
