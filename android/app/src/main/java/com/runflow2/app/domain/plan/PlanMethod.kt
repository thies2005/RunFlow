package com.runflow2.app.domain.plan

/**
 * Which engine builds the plan. The web engine (POST /api/plans) is the same
 * generator the website uses — plans it creates sync to the account instantly.
 * Classic is the on-device Daniels port and works fully offline; plans it
 * creates stay on this device. General fitness is the web engine's no-race
 * mode (BASE/BUILD/MAINTAIN weeks without a race date).
 */
enum class PlanMethod(
    val label: String,
    val description: String,
    val requiresSignIn: Boolean,
) {
    WEB_ENGINE(
        "Web engine",
        "Same generator as the website — online it syncs to your account; without a connection the identical on-device engine builds it for later sync.",
        requiresSignIn = true,
    ),
    CLASSIC(
        "Classic (offline)",
        "Generated on this device — Daniels phases, long-run progression, taper. Works without an account, but stays on this device.",
        requiresSignIn = false,
    ),
    GENERAL_FITNESS(
        "General fitness",
        "No race needed — steady base/build/maintain weeks from the web engine. Requires sign-in.",
        requiresSignIn = true,
    ),
}

/** Wizard steps, in display order. */
enum class WizardStep {
    GOAL_METHOD,
    DATE,
    CALIBRATION,
    TARGET,
    VOLUME,
    SCHEDULE,
}

object PlanMethodFlow {

    /**
     * Steps for a method. General fitness has no race, so the race date,
     * calibration and target-time steps are skipped and a plan length is
     * picked on the volume step instead.
     */
    fun stepsFor(method: PlanMethod): List<WizardStep> = when (method) {
        PlanMethod.GENERAL_FITNESS ->
            listOf(WizardStep.GOAL_METHOD, WizardStep.VOLUME, WizardStep.SCHEDULE)
        else -> WizardStep.entries.toList()
    }
}
