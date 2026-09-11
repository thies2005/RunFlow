package com.runflow2.app

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.health.HealthConnectMapping
import com.runflow2.app.data.health.HcRunSnapshot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthConnectMappingTest {

    private fun snapshot(
        recordId: String = "hc-1",
        title: String? = "Morning Run",
        startMs: Long = 1_700_000_000_000,
        minutes: Long = 45,
        distanceM: Double = 8_000.0,
        steps: Long? = 7_600,
        avgHr: Int? = 152,
        maxHr: Int? = 171,
    ) = HcRunSnapshot(
        recordId = recordId,
        title = title,
        startEpochMs = startMs,
        endEpochMs = startMs + minutes * 60_000,
        distanceMeters = distanceM,
        steps = steps,
        avgHr = avgHr,
        maxHr = maxHr,
        elevationMeters = 120.0,
        caloriesKcal = 520,
    )

    private fun existing(
        id: String = "local-1",
        startMs: Long = 1_700_000_000_000,
        distanceM: Double = 8_000.0,
        hcRecordId: String? = null,
    ) = ActivityEntity(
        id = id,
        name = "Existing",
        type = "RUN",
        startDate = startMs,
        distanceMeters = distanceM,
        movingTimeSec = 2700,
        averageHr = null,
        maxHr = null,
        averageCadence = null,
        totalElevation = 0.0,
        calories = null,
        trimp = 0.0,
        trainingType = null,
        estimatedVdot = null,
        routeJson = null,
        lapsJson = null,
        hcRecordId = hcRecordId,
    )

    // ---- importability ----

    @Test
    fun `runs below 1 km or 5 minutes are ignored`() {
        assertFalse(HealthConnectMapping.isImportable(snapshot(distanceM = 900.0)))
        assertFalse(HealthConnectMapping.isImportable(snapshot(minutes = 3)))
        assertTrue(HealthConnectMapping.isImportable(snapshot()))
    }

    @Test
    fun `importability boundaries are inclusive`() {
        assertTrue(HealthConnectMapping.isImportable(snapshot(distanceM = 1000.0)))
        assertTrue(HealthConnectMapping.isImportable(snapshot(minutes = 5)))
    }

    // ---- dedupe ----

    @Test
    fun `same Health Connect record id is a duplicate`() {
        val dup = HealthConnectMapping.isDuplicate(
            snapshot(recordId = "hc-9"),
            existingByRecordId = existing(hcRecordId = "hc-9"),
            sameStartWindow = emptyList(),
        )
        assertTrue(dup)
    }

    @Test
    fun `near-identical start and distance is a duplicate even without record id`() {
        // same start second, 1% distance difference — the same workout recorded
        // by RunFlow and shared to Health Connect by another app
        val dup = HealthConnectMapping.isDuplicate(
            snapshot(distanceM = 8_050.0),
            existingByRecordId = null,
            sameStartWindow = listOf(existing(distanceM = 8_000.0)),
        )
        assertTrue(dup)
    }

    @Test
    fun `same start but clearly different distance is not a duplicate`() {
        val dup = HealthConnectMapping.isDuplicate(
            snapshot(distanceM = 8_000.0),
            existingByRecordId = null,
            sameStartWindow = listOf(existing(distanceM = 16_000.0)),
        )
        assertFalse(dup)
    }

    @Test
    fun `duplicate distance tolerance boundary is inclusive`() {
        // exactly +10% within the window counts as the same workout
        val dup = HealthConnectMapping.isDuplicate(
            snapshot(distanceM = 8_000.0),
            existingByRecordId = null,
            sameStartWindow = listOf(existing(distanceM = 8_800.0)),
        )
        assertTrue(dup)
    }

    @Test
    fun `similar distance outside the start window is not a duplicate`() {
        val dup = HealthConnectMapping.isDuplicate(
            snapshot(startMs = 1_700_000_000_000 + 10 * 60_000),
            existingByRecordId = null,
            sameStartWindow = emptyList(), // window query would not return the old run
        )
        assertFalse(dup)
    }

    // ---- mapping ----

    @Test
    fun `snapshot maps to a local activity`() {
        val a = HealthConnectMapping.toActivityEntity(snapshot(), id = "fixed-id")
        assertEquals("fixed-id", a.id)
        assertEquals("Morning Run", a.name)
        assertEquals("RUN", a.type)
        assertEquals(8_000.0, a.distanceMeters, 1e-9)
        assertEquals(45 * 60, a.movingTimeSec)
        assertEquals(152.0, a.averageHr!!, 1e-9)
        assertEquals(171, a.maxHr)
        assertEquals(120.0, a.totalElevation, 1e-9)
        assertEquals(520, a.calories)
        assertEquals("hc-1", a.hcRecordId)
        assertNull(a.serverId)
        assertNull(a.routeJson)
        // vdot estimated from 8 km in 45 min — pinned against the same helper
        // recorded runs use, including the too-short-for-vdot guard
        assertEquals(
            com.runflow2.app.data.repo.RunFlowRepository.estimateVdot(8.0, 45 * 60),
            a.estimatedVdot,
        )
        val short = HealthConnectMapping.toActivityEntity(snapshot(distanceM = 1_500.0, minutes = 8))
        assertNull(short.estimatedVdot)
        // steps 7600 over 45 min → 168.9 steps/min average cadence
        assertEquals(7600.0 * 60 / 2700, a.averageCadence!!, 0.01)
    }

    @Test
    fun `blank titles fall back to a generated name`() {
        val a = HealthConnectMapping.toActivityEntity(snapshot(title = "  "))
        assertFalse(a.name.isBlank())
        assertTrue(a.name.startsWith("Run"))
    }
}
