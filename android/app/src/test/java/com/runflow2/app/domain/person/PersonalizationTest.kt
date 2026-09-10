package com.runflow2.app.domain.person

import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.person.Personalization.HrZoneMethod
import com.runflow2.app.domain.person.Personalization.PaceLetter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Golden values hand-computed from the web sources (cross-checked against the
 * TS math itself); each test cites the exact lines it pins:
 *  - Web/src/lib/metrics/vdot.ts L109-164
 *  - Web/src/lib/metrics/hr-zones.ts L49-166
 *  - Web/src/lib/plans/defaults.ts L15-130
 *  - Web/src/components/PlanSetupForm.tsx L81-85
 *  - Web/src/app/plan-advanced/[goalId]/components/Editor/WorkoutDetailPanel.tsx L88-94
 */
class PersonalizationTest {

    // ---- training paces (vdot.ts L137-164) ----

    @Test
    fun `vdot 40 paces match web calculateTrainingPaces`() {
        // Hand-computed from vdot.ts L109-123 + L128-132:
        //  easy.min  = round(60000 / v(0.79)) = round(60000/180.109) = 333
        //  easy.max  = round(60000 / v(0.65)) = round(60000/154.307) = 389
        //  marathon  = round(60000 / v(0.78)) = round(60000/178.287) = 337
        //  threshold = round(60000 / v(0.88)) = round(60000/196.368) = 306
        //  interval  = round(60000 / v(1.00)) = round(60000/217.672) = 276
        //  repetition= round(60000 / v(1.05)) = round(60000/226.426) = 265
        val p = Personalization.trainingPaces(40.0)
        assertEquals(333, p.easy.minSecPerKm)
        assertEquals(389, p.easy.maxSecPerKm)
        assertEquals(337, p.marathon)
        assertEquals(306, p.threshold)
        assertEquals(276, p.interval)
        assertEquals(265, p.repetition)
        // WorkoutDetailPanel.tsx L89: E value = round((min+max)/2) = round(361) = 361
        assertEquals(361, p.target(PaceLetter.E))
    }

    @Test
    fun `vdot 50 paces match web calculateTrainingPaces`() {
        // v(0.79)=215.472 -> 278; v(0.65)=184.198 -> 326; v(0.78)=213.268 -> 281;
        // v(0.88)=235.112 -> 255; v(1.00)=260.772 -> 230; v(1.05)=271.294 -> 221
        val p = Personalization.trainingPaces(50.0)
        assertEquals(278, p.easy.minSecPerKm)
        assertEquals(326, p.easy.maxSecPerKm)
        assertEquals(281, p.marathon)
        assertEquals(255, p.threshold)
        assertEquals(230, p.interval)
        assertEquals(221, p.repetition)
        assertEquals(302, p.target(PaceLetter.E))
    }

    @Test
    fun `pace hierarchy easy slower than marathon than threshold than interval than repetition`() {
        // Same invariant as Web vdot.test.ts L106-109
        val p = Personalization.trainingPaces(45.0)
        assertTrue(p.easy.maxSecPerKm > p.marathon)
        assertTrue(p.marathon > p.threshold)
        assertTrue(p.threshold > p.interval)
        assertTrue(p.interval > p.repetition)
    }

    // ---- HR zones: LTHR (hr-zones.ts L104-123) ----

    @Test
    fun `lthr zones for lthr 165`() {
        // hr-zones.ts L107-112 with lthr=165:
        //  z1=round(123.75)=124, z2=round(143.55)=144, z3=round(155.1)=155,
        //  z4=165, z5=round(173.25)=173, z6=round(181.5)=182
        val result = Personalization.hrZones(hrMax = 185, lthr = 165, method = HrZoneMethod.LTHR)
        assertEquals(HrZoneMethod.LTHR, result.method)
        val zones = result.zones!!
        assertEquals(7, zones.size)
        // labels from hr-zones.ts L22-30
        assertEquals("Z1 Recovery", zones[0].label)
        assertEquals("Z2 Aerobic", zones[1].label)
        assertEquals("Z3 Tempo", zones[2].label)
        assertEquals("Z4 Threshold", zones[3].label)
        assertEquals("Z5 VO2max", zones[4].label)
        assertEquals("Z6 Anaerobic", zones[5].label)
        assertEquals("Z7 Neuromuscular", zones[6].label)
        // bands with +1 mins (L115-122)
        assertEquals(0, zones[0].minBpm); assertEquals(124, zones[0].maxBpm)
        assertEquals(125, zones[1].minBpm); assertEquals(144, zones[1].maxBpm)
        assertEquals(145, zones[2].minBpm); assertEquals(155, zones[2].maxBpm)
        assertEquals(156, zones[3].minBpm); assertEquals(165, zones[3].maxBpm)
        assertEquals(166, zones[4].minBpm); assertEquals(173, zones[4].maxBpm)
        assertEquals(174, zones[5].minBpm); assertEquals(182, zones[5].maxBpm)
        assertEquals(183, zones[6].minBpm); assertNull(zones[6].maxBpm)
    }

    // ---- HR zones: Karvonen (hr-zones.ts L125-153) ----

    @Test
    fun `karvonen zones for hrMax 185 hrRest 55`() {
        // hrr = 130 (L128); L130-141:
        //  z1Min=round(65+55)=120, z1Max=round(78+55)=133, z2Max=round(91+55)=146,
        //  z3Max=round(104+55)=159, z4Max=round(117+55)=172,
        //  z5Max=round(123.5+55)=round(178.5)=179, z6Max=185
        // Zone mins reuse the previous max (L132-142) and Z7 max is hrMax (L151).
        val result = Personalization.hrZones(hrMax = 185, hrRest = 55, method = HrZoneMethod.KARVONEN)
        assertEquals(HrZoneMethod.KARVONEN, result.method)
        val zones = result.zones!!
        assertEquals(120, zones[0].minBpm); assertEquals(133, zones[0].maxBpm)
        assertEquals(133, zones[1].minBpm); assertEquals(146, zones[1].maxBpm)
        assertEquals(146, zones[2].minBpm); assertEquals(159, zones[2].maxBpm)
        assertEquals(159, zones[3].minBpm); assertEquals(172, zones[3].maxBpm)
        assertEquals(172, zones[4].minBpm); assertEquals(179, zones[4].maxBpm)
        assertEquals(179, zones[5].minBpm); assertEquals(185, zones[5].maxBpm)
        assertEquals(185, zones[6].minBpm); assertEquals(185, zones[6].maxBpm)
    }

    // ---- HR zones: CUSTOM (hr-zones.ts L49-102) ----

    @Test
    fun `custom boundaries below 100 are percentages of hrMax`() {
        // hrMax=200 (L49-71: 200>=100 so <=100 values scale): 60,70,80,90,95,100 ->
        // 120,140,160,180,190,200; bands from L93-101 with +1 mins, Z7 open-ended.
        val result = Personalization.hrZones(
            hrMax = 200,
            customBoundaries = listOf(60, 70, 80, 90, 95, 100),
            method = HrZoneMethod.CUSTOM,
        )
        assertEquals(HrZoneMethod.CUSTOM, result.method)
        val zones = result.zones!!
        assertEquals(120, zones[0].maxBpm)
        assertEquals(140, zones[1].maxBpm)
        assertEquals(160, zones[2].maxBpm)
        assertEquals(180, zones[3].maxBpm)
        assertEquals(190, zones[4].maxBpm)
        assertEquals(200, zones[5].maxBpm)
        assertEquals(201, zones[6].minBpm)
        assertNull(zones[6].maxBpm)
        assertEquals(141, zones[2].minBpm)
    }

    @Test
    fun `custom boundaries above 100 stay absolute bpm`() {
        // hr-zones.ts L64-70: values >100 are never scaled, even with hrMax present.
        val result = Personalization.buildCustomZones(
            Personalization.HrZoneInput(
                hrZone1Max = 120, hrZone2Max = 140, hrZone3Max = 155,
                hrZone4Max = 168, hrZone5Max = 180, hrZone6Max = 195,
                hrMax = 190,
            ),
        )!!
        assertEquals(120, result[0].maxBpm)
        assertEquals(195, result[5].maxBpm)
    }

    @Test
    fun `non-increasing custom boundaries are rejected`() {
        // hr-zones.ts L91 -> null
        val result = Personalization.buildCustomZones(
            Personalization.HrZoneInput(
                hrZone1Max = 140, hrZone2Max = 130, hrZone3Max = 155,
                hrZone4Max = 168, hrZone5Max = 180, hrZone6Max = 195,
            ),
        )
        assertNull(result)
    }

    @Test
    fun `resolve order is custom then lthr then karvonen`() {
        // hr-zones.ts L155-166
        val all = Personalization.hrZones(
            hrMax = 185, hrRest = 55, lthr = 165,
            customBoundaries = listOf(60, 70, 80, 90, 95, 100),
        )
        assertEquals(HrZoneMethod.CUSTOM, all.method)

        val noCustom = Personalization.hrZones(hrMax = 185, hrRest = 55, lthr = 165)
        assertEquals(HrZoneMethod.LTHR, noCustom.method)

        val karvonenOnly = Personalization.hrZones(hrMax = 185, hrRest = 55)
        assertEquals(HrZoneMethod.KARVONEN, karvonenOnly.method)

        val none = Personalization.hrZones(hrMax = 185)
        assertEquals(HrZoneMethod.UNKNOWN, none.method)
        assertNull(none.zones)
    }

    // ---- adjustDefaultsForVdot (defaults.ts L91-108) ----

    @Test
    fun `vdot adjustment at 28 45 55 for marathon`() {
        // MARATHON defaults: runs 5, weekly 58 (defaults.ts L28-31).
        val base = Personalization.getRaceDefaults("MARATHON")
        assertEquals(5, base.runsPerWeek)
        assertEquals(58, base.weeklyVolumeKm)

        // vdot 28 <30 (L94-95): factor 0.85, 58*0.85=49.3 -> round 49 (L105);
        // runsPerWeek -1 clamped 3..7 (L106): 5-1=4
        val d28 = Personalization.adjustDefaultsForVdot(base, 28.0)
        assertEquals(49, d28.weeklyVolumeKm)
        assertEquals(4, d28.runsPerWeek)

        // vdot 45 in [40,50) (L98-99): factor 1.10, 58*1.1=63.8 -> 64; runs unchanged
        val d45 = Personalization.adjustDefaultsForVdot(base, 45.0)
        assertEquals(64, d45.weeklyVolumeKm)
        assertEquals(5, d45.runsPerWeek)

        // vdot 55 >=50 (L100-101): factor 1.15, 58*1.15=66.725 -> 67; runs unchanged
        val d55 = Personalization.adjustDefaultsForVdot(base, 55.0)
        assertEquals(67, d55.weeklyVolumeKm)
        assertEquals(5, d55.runsPerWeek)

        // vdot <= 0 returns defaults untouched (L92)
        val d0 = Personalization.adjustDefaultsForVdot(base, 0.0)
        assertEquals(58, d0.weeklyVolumeKm)
        assertEquals(5, d0.runsPerWeek)
    }

    @Test
    fun `unknown race type falls back to marathon defaults`() {
        // defaults.ts L88
        assertEquals(Personalization.getRaceDefaults("MARATHON"), Personalization.getRaceDefaults("SOME_UNKNOWN_RACE"))
    }

    // ---- getScaledPhaseDefaults (defaults.ts L110-130) ----

    @Test
    fun `scaled phases for marathon 8 12 and 24 week plans`() {
        // MARATHON taper/peak/build = 2/3/4, total 9 (defaults.ts L30).
        // 8 weeks (L119): minBase=3, budget=5, proportion 5/9=0.5556 (L125):
        //  taper=round(1.111)=1, peak=round(1.667)=2, build=5-1-2=2
        assertEquals(Personalization.PhaseWeeks(1, 2, 2), Personalization.getScaledPhaseDefaults("MARATHON", 8))
        // 12 weeks: minBase=4, budget=8, proportion 8/9=0.889:
        //  taper=round(1.778)=2, peak=round(2.667)=3, build=8-2-3=3
        assertEquals(Personalization.PhaseWeeks(2, 3, 3), Personalization.getScaledPhaseDefaults("MARATHON", 12))
        // 24 weeks: budget=20 >= total 9 -> defaults unchanged (L122-124)
        assertEquals(Personalization.PhaseWeeks(2, 3, 4), Personalization.getScaledPhaseDefaults("MARATHON", 24))
        // 6 weeks: minBase=2, budget=4, proportion 4/9=0.444:
        //  taper=round(0.889)=1, peak=round(1.333)=1, build=4-1-1=2
        assertEquals(Personalization.PhaseWeeks(1, 1, 2), Personalization.getScaledPhaseDefaults("MARATHON", 6))
    }

    // ---- personPlanDefaults (composition incl. PlanSetupForm.tsx L81-85) ----

    @Test
    fun `person plan defaults combine vdot scaling phases and max long run`() {
        // MARATHON, vdot 28, 12 weeks: weekly 58->49 (x0.85), runs 5->4,
        // phases (2,3,3); maxLongRunKm = max(6, min(round(49*0.55)=27, cap 32)) = 27
        val d = Personalization.personPlanDefaults("MARATHON", 28.0, 12)
        assertEquals(4, d.runsPerWeek)
        assertEquals(49, d.weeklyKm)
        assertEquals(27, d.maxLongRunKm)
        assertEquals(2, d.taperWeeks)
        assertEquals(3, d.peakWeeks)
        assertEquals(3, d.buildWeeks)

        // vdot 45: weekly 64 -> round(64*0.55)=35 capped at race cap 32
        val d45 = Personalization.personPlanDefaults("MARATHON", 45.0, 12)
        assertEquals(64, d45.weeklyKm)
        assertEquals(32, d45.maxLongRunKm)

        // RaceType overload keys identically to the web table
        assertEquals(d45, Personalization.personPlanDefaults(RaceType.MARATHON, 45.0, 12))
    }

    // ---- structuredEditorDefaults ----

    @Test
    fun `structured editor defaults for vdot 45 resolve paces and emit builder json`() {
        // vdot 45 (vdot.ts L137-164): easy 303-354, interval 251;
        // E target = round((303+354)/2) = round(328.5) = 329 (WorkoutDetailPanel.tsx L89)
        val e = Personalization.structuredEditorDefaults(45.0)
        assertEquals(1000, e.warmupDistanceM)
        assertEquals(PaceLetter.E, e.warmupPace)
        assertEquals(329, e.warmupPaceSecPerKm)
        assertEquals(4, e.mainReps)
        assertEquals(400, e.mainDistanceM)
        assertEquals(PaceLetter.I, e.mainPace)
        assertEquals(251, e.mainPaceSecPerKm)
        assertEquals(90, e.restSeconds)
        assertEquals(1000, e.cooldownDistanceM)
        assertEquals(PaceLetter.E, e.cooldownPace)
        assertEquals(329, e.cooldownPaceSecPerKm)

        // Exact BUILDER nested structuredSteps shape (the form StructuredStepsParser parses)
        assertEquals(
            """{"warmup":{"distance":1000,"pace":"E"},"main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],"cooldown":{"distance":1000,"pace":"E"}}""",
            e.toJsonString(),
        )
    }
}
