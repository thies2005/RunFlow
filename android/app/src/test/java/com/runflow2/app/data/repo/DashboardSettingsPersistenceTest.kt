package com.runflow2.app.data.repo

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [30])
class DashboardSettingsPersistenceTest {
    @Test fun customizationSurvivesRepositoryReconstructionAndResetPreservesOtherSettings() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val first = SettingsRepository(context)
        first.resetDashboardCustomization()
        first.setThemeMode(ThemeMode.DARK)
        first.setUseImperial(true)
        first.setPrimaryLoadMetric("TRIMP")
        first.setDashboardLayout(DashboardLayout.CYCLING)
        first.setWorkoutCardStyle(WorkoutCardStyle.DETAILED)
        first.setCountdownStyle(CountdownStyle.BOXES)
        first.setDashboardMetric(DashboardMetric.RUN_VDOT, false)
        first.setDashboardMetric(DashboardMetric.BIKE_FORM, true)
        first.setEffortCardMode("WEEK_ONLY")

        val reconstructed = SettingsRepository(context)
        val saved = reconstructed.settingsOnce()
        assertEquals(DashboardLayout.CYCLING, saved.customization.layout)
        assertEquals(WorkoutCardStyle.DETAILED, saved.customization.workoutStyle)
        assertEquals(CountdownStyle.BOXES, saved.customization.countdownStyle)
        assertEquals(DashboardCustomization().metrics - DashboardMetric.RUN_VDOT + DashboardMetric.BIKE_FORM, saved.customization.metrics)
        assertEquals("WEEK_ONLY", saved.effortCardMode)

        reconstructed.resetDashboardCustomization()
        val reset = SettingsRepository(context).settingsOnce()
        assertEquals(DashboardCustomization(), reset.customization)
        assertEquals("WEEK_AND_MONTH", reset.effortCardMode)
        assertEquals(ThemeMode.DARK, reset.themeMode)
        assertTrue(reset.useImperial)
        assertEquals("TRIMP", reset.primaryLoadMetric)
    }
    @Test fun presetsAndVisibilityPersistAndResetIndependently() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val repo = SettingsRepository(context)
        repo.resetDashboardCustomization()
        assertEquals(DashboardLayout.RUNNING, repo.settingsOnce().customization.layout)
        DashboardWidget.values().forEach { repo.setDashboardWidget(it, false) }
        repo.applyDashboardPreset(DashboardLayout.TRIATHLON)
        val saved = SettingsRepository(context).settingsOnce().customization
        assertEquals(DashboardLayout.TRIATHLON, saved.layout)
        assertEquals(presetMetrics(DashboardLayout.TRIATHLON), saved.metrics)
        assertTrue(saved.visibleWidgets.isEmpty())
        repo.setDashboardLayout(DashboardLayout.HYBRID)
        assertEquals(DashboardLayout.HYBRID, SettingsRepository(context).settingsOnce().customization.layout)
        repo.resetDashboardCustomization()
        assertEquals(DashboardCustomization(), repo.settingsOnce().customization)
    }

}
