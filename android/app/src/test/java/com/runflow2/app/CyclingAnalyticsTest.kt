package com.runflow2.app

import com.runflow2.app.domain.analytics.ActivityInput
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.domain.model.ActivityType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import kotlin.math.roundToInt

class CyclingAnalyticsTest {

    private val today: LocalDate = LocalDate.of(2026, 9, 7)

    @Test
    fun `calculateCogganZones calculates correct 7 zone boundaries for 250W FTP`() {
        val zones = AnalyticsEngine.calculateCogganZones(ftpWatts = 250)
        assertEquals(7, zones.size)

        // Z1: Active Recovery (<55%)
        assertEquals(1, zones[0].zone)
        assertEquals("Active Recovery", zones[0].name)
        assertEquals(0, zones[0].minWatts)
        assertEquals(138, zones[0].maxWatts) // 250 * 0.55 = 137.5 -> 138

        // Z2: Endurance (56-75%)
        assertEquals(2, zones[1].zone)
        assertEquals(139, zones[1].minWatts)
        assertEquals(188, zones[1].maxWatts) // 250 * 0.75 = 187.5 -> 188

        // Z3: Tempo (76-90%)
        assertEquals(3, zones[2].zone)
        assertEquals(189, zones[2].minWatts)
        assertEquals(225, zones[2].maxWatts) // 250 * 0.90 = 225

        // Z4: Lactate Threshold (91-105%)
        assertEquals(4, zones[3].zone)
        assertEquals(226, zones[3].minWatts)
        assertEquals(263, zones[3].maxWatts) // 250 * 1.05 = 262.5 -> 263

        // Z5: VO2max (106-120%)
        assertEquals(5, zones[4].zone)
        assertEquals(264, zones[4].minWatts)
        assertEquals(300, zones[4].maxWatts) // 250 * 1.20 = 300

        // Z6: Anaerobic Capacity (121-150%)
        assertEquals(6, zones[5].zone)
        assertEquals(301, zones[5].minWatts)
        assertEquals(375, zones[5].maxWatts) // 250 * 1.50 = 375

        // Z7: Neuromuscular Power (>150%)
        assertEquals(7, zones[6].zone)
        assertEquals(376, zones[6].minWatts)
    }

    @Test
    fun `calculateNormalizedPower returns null when samples less than 30`() {
        val shortStream = List(25) { 200.0 }
        assertNull(AnalyticsEngine.calculateNormalizedPower(shortStream))
    }

    @Test
    fun `calculateNormalizedPower returns constant power for steady effort`() {
        val steadyStream = List(60) { 200.0 }
        val np = AnalyticsEngine.calculateNormalizedPower(steadyStream)
        assertNotNull(np)
        assertEquals(200.0, np!!, 1.0)
    }

    @Test
    fun `calculateNormalizedPower is higher than average for variable efforts`() {
        // Alternating 100W and 300W blocks (longer than 30s rolling window)
        val variableStream = buildList {
            repeat(3) {
                addAll(List(60) { 100.0 })
                addAll(List(60) { 300.0 })
            }
        }
        val avg = variableStream.average()
        val np = AnalyticsEngine.calculateNormalizedPower(variableStream)
        assertNotNull(np)
        assertTrue("NP ($np) should be higher than average ($avg)", np!! > avg)
    }

    @Test
    fun `calculateIntensityFactor and VariabilityIndex calculate correctly`() {
        val ifVal = AnalyticsEngine.calculateIntensityFactor(npWatts = 200.0, ftpWatts = 250)
        assertNotNull(ifVal)
        assertEquals(0.8, ifVal!!, 0.001)

        val viVal = AnalyticsEngine.calculateVariabilityIndex(npWatts = 220.0, avgWatts = 200.0)
        assertNotNull(viVal)
        assertEquals(1.10, viVal!!, 0.01)

        // Invalid inputs
        assertNull(AnalyticsEngine.calculateIntensityFactor(npWatts = 200.0, ftpWatts = 0))
        assertNull(AnalyticsEngine.calculateVariabilityIndex(npWatts = 200.0, avgWatts = 0.0))
    }

    @Test
    fun `calculateBikeTss equals 100 for 1 hour at FTP`() {
        // 1 hour at FTP (IF = 1.0, NP = 250W, FTP = 250W)
        val tss = AnalyticsEngine.calculateBikeTss(
            movingTimeSec = 3600,
            npWatts = 250.0,
            ifFactor = 1.0,
            ftpWatts = 250,
        )
        assertEquals(100.0, tss, 0.1)
    }

    @Test
    fun `estimateBikeFtpFromVdot computes reasonable FTP for runner`() {
        val estimatedFtp = AnalyticsEngine.estimateBikeFtpFromVdot(vdot = 50.0, weightKg = 70.0)
        assertNotNull(estimatedFtp)
        // (50 - 7) / 10.8 * 0.75 * 70 = 3.98 * 0.75 * 70 ~= 209 W
        assertTrue(estimatedFtp!! in 190..230)

        assertNull(AnalyticsEngine.estimateBikeFtpFromVdot(vdot = 0.0, weightKg = 70.0))
    }

    @Test
    fun `calculateEfficiencyFactor computes NP to HR ratio`() {
        val ef = AnalyticsEngine.calculateEfficiencyFactor(npWatts = 210.0, avgHr = 140.0)
        assertNotNull(ef)
        assertEquals(1.50, ef!!, 0.01)

        assertNull(AnalyticsEngine.calculateEfficiencyFactor(npWatts = 210.0, avgHr = 0.0))
    }

    @Test
    fun `calculatePowerZoneTimes distributes seconds correctly into Coggan zones`() {
        val ftp = 200 // Z1 <= 110, Z2 <= 150, Z3 <= 180, Z4 <= 210, Z5 <= 240, Z6 <= 300, Z7 > 300
        val watts = listOf(
            100.0, // Z1
            140.0, // Z2
            170.0, // Z3
            205.0, // Z4
            230.0, // Z5
            270.0, // Z6
            350.0, // Z7
        )
        val time = listOf(0.0, 10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0)
        val zoneTimes = AnalyticsEngine.calculatePowerZoneTimes(watts, time, ftp)
        assertEquals(7, zoneTimes.size)
        // Each sample should have duration 10 seconds
        for (i in 0 until 7) {
            assertEquals("Zone ${i + 1} should have 10 seconds", 10, zoneTimes[i])
        }
    }

    @Test
    fun `AnalyticsEngine compute populates cycling summary when rides exist`() {
        val ride1 = ActivityInput(
            id = "ride-1",
            type = ActivityType.RIDE,
            date = today.minusDays(2),
            distanceKm = 40.0,
            movingTimeSec = 5400,
            averageHr = 145.0,
            trimp = 90.0,
            estimatedVdot = null,
            zoneSeconds = emptyList(),
            averageWatts = 190.0,
            npWatts = 210.0,
            maxWatts = 420.0,
            intensityFactor = 0.84,
            variabilityIndex = 1.11,
            bikeTss = 85.0,
            deviceWatts = true,
        )
        val ride2 = ActivityInput(
            id = "ride-2",
            type = ActivityType.VIRTUAL_RIDE,
            date = today.minusDays(1),
            distanceKm = 25.0,
            movingTimeSec = 3600,
            averageHr = 150.0,
            trimp = 70.0,
            estimatedVdot = null,
            zoneSeconds = emptyList(),
            averageWatts = 215.0,
            npWatts = 225.0,
            maxWatts = 380.0,
            intensityFactor = 0.90,
            variabilityIndex = 1.05,
            bikeTss = 75.0,
            deviceWatts = true,
        )

        val bundle = AnalyticsEngine.compute(
            activities = listOf(ride1, ride2),
            today = today,
            vdotCorrection = 1.0,
            ftpWatts = 250,
            weightKg = 70.0,
        )

        val cycling = bundle.cycling
        assertNotNull(cycling)
        assertEquals(250, cycling!!.ftpWatts)
        assertEquals(3.57, cycling.wPerKg!!, 0.01) // 250 / 70 = 3.57
        assertTrue(cycling.ctlBike > 0.0)
        assertTrue(cycling.atlBike > 0.0)
        assertEquals(2, cycling.recentRideNpSeries.size)
        assertEquals(210.0, cycling.recentRideNpSeries[0], 0.01)
        assertEquals(225.0, cycling.recentRideNpSeries[1], 0.01)
        assertEquals(218, cycling.avgNpWatts) // (210 + 225) / 2 = 217.5 -> 218
        assertEquals(203, cycling.avgWatts) // (190 + 215) / 2 = 202.5 -> 203
        assertEquals(160, cycling.totalBikeTss30d) // 85 + 75 = 160
        assertEquals(7, cycling.powerZoneDistribution.size)
        assertNotNull(cycling.cyclingVo2max)
        assertTrue(cycling.cyclingVo2max!! > 50.0)
        // Verify Coggan power zones bucket ride duration by power (or powerZoneSeconds)
        // rather than summing empty HR zoneSeconds
        assertTrue(cycling.powerZoneDistribution.sumOf { it.seconds } > 0)
    }
}
