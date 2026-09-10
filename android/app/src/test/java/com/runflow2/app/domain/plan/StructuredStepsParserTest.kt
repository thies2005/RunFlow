package com.runflow2.app.domain.plan

import com.runflow2.app.recording.StepDurationType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pins the structuredSteps parser against both server shapes: the plan
 * generator's flat {"steps":[…]} list and the advanced builder's nested
 * {"warmup":…,"main":[…],"cooldown":…} form.
 */
class StructuredStepsParserTest {

    private val paceTable = mapOf(
        "E" to 300.0, "M" to 260.0, "T" to 240.0, "I" to 220.0, "R" to 200.0,
    )

    // ---- flat (generator) shape ----

    @Test
    fun `flat shape maps types kinds and durations`() {
        val steps = StructuredStepsParser.parse(
            """
            {"version":1,"source":"generated-plan","steps":[
              {"type":"warmup","name":"Warm-up jog","distanceMeters":1500,"paceSecondsPerKm":330},
              {"type":"work","name":"3x1K","distanceMeters":1000,"paceSecondsPerKm":240},
              {"type":"steady","name":"Steady block","durationSeconds":600},
              {"type":"recovery","name":"Float","durationSeconds":90,"paceSecondsPerKm":310},
              {"type":"cooldown","name":"Cool-down","distanceMeters":1000}
            ]}
            """.trimIndent(),
            paceTable,
        )
        assertEquals(5, steps.size)
        val warmup = steps[0]
        assertEquals("Warm-up jog", warmup.label)
        assertEquals("warmup", warmup.kind)
        assertEquals(StepDurationType.DISTANCE, warmup.durationType)
        assertEquals(1500.0, warmup.distanceM, 0.01)
        assertEquals(330.0, warmup.targetPaceSecPerKm!!, 0.01)

        assertEquals("main", steps[1].kind) // work → main
        assertEquals(1000.0, steps[1].distanceM, 0.01)
        assertEquals(StepDurationType.DISTANCE, steps[1].durationType)

        assertEquals("main", steps[2].kind) // steady → main, keeps name
        assertEquals("Steady block", steps[2].label)
        assertEquals(StepDurationType.TIME, steps[2].durationType)
        assertEquals(600.0, steps[2].durationSec, 0.01)
        assertNull(steps[2].targetPaceSecPerKm)

        assertEquals("recovery", steps[3].kind)
        assertEquals(90.0, steps[3].durationSec, 0.01)

        assertEquals("cooldown", steps[4].kind)
        assertNull(steps[4].targetPaceSecPerKm) // no pace → free run
    }

    @Test
    fun `flat shape prefers distance when both fields are present`() {
        val steps = StructuredStepsParser.parse(
            """{"steps":[{"type":"work","name":"A","distanceMeters":2000,"durationSeconds":600}]}""",
            paceTable,
        )
        assertEquals(StepDurationType.DISTANCE, steps.single().durationType)
        assertEquals(2000.0, steps.single().distanceM, 0.01)
    }

    @Test
    fun `flat steps without any duration are skipped`() {
        val steps = StructuredStepsParser.parse(
            """{"steps":[{"type":"work","name":"A","distanceMeters":0},{"type":"work","name":"B","distanceMeters":800}]}""",
            paceTable,
        )
        assertEquals(listOf("B"), steps.map { it.label })
    }

    // ---- nested (builder) shape ----

    @Test
    fun `nested shape expands reps without a trailing recovery`() {
        val steps = StructuredStepsParser.parse(
            """
            {"warmup":{"distance":1000,"pace":"E"},
             "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
             "cooldown":{"distance":1000,"pace":"E"}}
            """.trimIndent(),
            paceTable,
        )
        // warmup + 4×(400 m + rest except after last rep) + cooldown = 1 + 7 + 1
        assertEquals(9, steps.size)
        assertEquals("Warm-up 1.0 km E", steps[0].label)
        assertEquals("warmup", steps[0].kind)
        assertEquals(1000.0, steps[0].distanceM, 0.01)
        assertEquals(300.0, steps[0].targetPaceSecPerKm!!, 0.01)

        assertEquals("400 m I (1/4)", steps[1].label)
        assertEquals("main", steps[1].kind)
        assertEquals(220.0, steps[1].targetPaceSecPerKm!!, 0.01)
        assertEquals("90 s rest", steps[2].label)
        assertEquals("recovery", steps[2].kind)
        assertEquals(StepDurationType.TIME, steps[2].durationType)
        assertEquals(90.0, steps[2].durationSec, 0.01)
        assertNull(steps[2].targetPaceSecPerKm)

        assertEquals("400 m I (4/4)", steps[7].label)
        assertEquals("Cool-down 1.0 km E", steps[8].label)
        assertEquals("cooldown", steps[8].kind)
        // exactly 3 rests for 4 reps: none after the final rep
        assertEquals(3, steps.count { it.kind == "recovery" })
    }

    @Test
    fun `nested shape handles multiple main entries and single reps`() {
        val steps = StructuredStepsParser.parse(
            """
            {"main":[
              {"reps":2,"distance":800,"pace":"T","restSeconds":120},
              {"reps":1,"distance":200,"pace":"R","restSeconds":60}
            ]}
            """.trimIndent(),
            paceTable,
        )
        // 800, rest, 800 | 200 — no rest inside the single-rep entry and none between entries
        assertEquals(
            listOf("800 m T (1/2)", "120 s rest", "800 m T (2/2)", "200 m R"),
            steps.map { it.label },
        )
        assertEquals(240.0, steps[0].targetPaceSecPerKm!!, 0.01)
        assertEquals(200.0, steps[3].targetPaceSecPerKm!!, 0.01)
    }

    @Test
    fun `unknown pace letter resolves to a free-run step`() {
        val steps = StructuredStepsParser.parse(
            """{"main":[{"reps":1,"distance":400,"pace":"X"}]}""",
            paceTable,
        )
        assertNull(steps.single().targetPaceSecPerKm)
        assertEquals("400 m X", steps.single().label)
    }

    @Test
    fun `missing warmup and cooldown are fine`() {
        val steps = StructuredStepsParser.parse(
            """{"main":[{"reps":1,"distance":400,"pace":"I"}]}""",
            paceTable,
        )
        assertEquals(1, steps.size)
        assertEquals("main", steps.single().kind)
    }

    // ---- graceful degradation ----

    @Test
    fun `malformed json yields an empty list`() {
        assertTrue(StructuredStepsParser.parse("not json at all {", paceTable).isEmpty())
        assertTrue(StructuredStepsParser.parse("""{"steps": 42}""", paceTable).isEmpty())
        assertTrue(StructuredStepsParser.parse("""[1,2,3]""", paceTable).isEmpty())
    }

    @Test
    fun `null and empty inputs yield an empty list`() {
        assertTrue(StructuredStepsParser.parse(null as String?, paceTable).isEmpty())
        assertTrue(StructuredStepsParser.parse("", paceTable).isEmpty())
        assertTrue(StructuredStepsParser.parse("""{"steps":[]}""", paceTable).isEmpty())
        assertTrue(StructuredStepsParser.parse("""{"version":1,"source":"generated-plan"}""", paceTable).isEmpty())
    }

    // ---- pace table helpers ----

    @Test
    fun `pace letter table covers all letters and orders them fast to slow`() {
        val table = paceLetterTable(50.0)
        assertEquals(setOf("E", "M", "T", "I", "R"), table.keys)
        // slower zones have larger sec/km: E > M > T > I > R
        assertTrue(table.getValue("E") > table.getValue("M"))
        assertTrue(table.getValue("M") > table.getValue("T"))
        assertTrue(table.getValue("T") > table.getValue("I"))
        assertTrue(table.getValue("I") > table.getValue("R"))
    }

    @Test
    fun `threshold pace inverts into a plausible vdot`() {
        val vdot = vdotFromThresholdPaceSecPerKm(275.0)!! // 4:35/km threshold
        assertTrue(vdot in 40.0..52.0)
        assertNull(vdotFromThresholdPaceSecPerKm(0.0))
    }
}
