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
