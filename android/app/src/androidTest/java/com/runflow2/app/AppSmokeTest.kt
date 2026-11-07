package com.runflow2.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isSelectable
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Exercises the real Room/DataStore-backed app, without an account or backend.
 * Use a dedicated emulator: completing onboarding persists its normal local state.
 */
@RunWith(AndroidJUnit4::class)
class AppSmokeTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun offlineLaunchAndMainNavigation() {
        val app = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation()
            .targetContext.applicationContext as RunFlowApp
        kotlinx.coroutines.runBlocking {
            val settings = app.container.settings.settingsOnce()
            org.junit.Assert.assertTrue("Fresh install must not select a server", settings.serverUrl.isBlank())
            org.junit.Assert.assertFalse(settings.connectionEnabled)
            org.junit.Assert.assertFalse(settings.uploadActivitiesEnabled)
            org.junit.Assert.assertFalse(settings.uploadPlansEnabled)
            org.junit.Assert.assertFalse(settings.healthMetricsSyncEnabled)
        }
        compose.waitUntil(timeoutMillis = 30_000) {
            compose.onAllNodes(hasText("Skip")).fetchSemanticsNodes().isNotEmpty() ||
                compose.onAllNodes(hasText("Decide later")).fetchSemanticsNodes().isNotEmpty() ||
                compose.onAllNodes(hasText("Today") and isSelectable()).fetchSemanticsNodes().isNotEmpty()
        }
        if (compose.onAllNodes(hasText("Skip")).fetchSemanticsNodes().isNotEmpty()) {
            compose.onNodeWithText("Skip").performClick()
        }
        if (compose.onAllNodes(hasText("Decide later")).fetchSemanticsNodes().isNotEmpty()) {
            compose.onNodeWithText("Decide later").performClick()
        }
        for (tab in listOf("Plan", "Analytics", "Athlete", "Today")) {
            compose.onNode(hasText(tab) and isSelectable())
                .assertIsDisplayed().performClick().assertIsSelected()
        }
    }
}
