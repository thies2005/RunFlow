package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization.PaceLetter
import com.runflow2.app.domain.person.Personalization.PaceLetter.E
import com.runflow2.app.domain.person.Personalization.PaceLetter.I
import com.runflow2.app.domain.person.Personalization.PaceLetter.T
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Pins the structured editor's decode/encode bridge: nested builder shape,
 * generator flat → nested conversion (lossless or null → defaults), totals
 * and the exact JSON output shape.
 */
class StructuredWorkoutBuilderTest {

    private val table = mapOf(
        PaceLetter.E to 310, PaceLetter.M to 270, PaceLetter.T to 245,
        PaceLetter.I to 215, PaceLetter.R to 200,
    )

    private val nested = """
        {"warmup":{"distance":1000,"pace":"E"},
         "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
         "cooldown":{"distance":800,"pace":"E"}}
    """.trimIndent()

    // ---- decode: nested builder shape ----

    @Test
    fun `nested builder shape decodes into the draft`() {
        val draft = StructuredWorkoutBuilder.decode(nested, table)!!
        assertEquals(BuilderSection(1000, E), draft.warmup)
        assertEquals(BuilderSection(800, E), draft.cooldown)
        assertEquals(listOf(BuilderMainStep(4, 400, I, 90)), draft.main)
    }

    @Test
    fun `nested shape tolerates missing warmup cooldown reps and rest`() {
        val draft = StructuredWorkoutBuilder.decode("""{"main":[{"distance":400,"pace":"T"}]}""", table)!!
        assertEquals(BuilderSection(0, E), draft.warmup) // absent → no section
        assertEquals(BuilderSection(0, E), draft.cooldown)
        assertEquals(listOf(BuilderMainStep(1, 400, T, 0)), draft.main) // reps→1, rest→0
    }

    @Test
    fun `nested shape clamps reps and ignores entries without distance or pace`() {
        val draft = StructuredWorkoutBuilder.decode(
            """{"main":[
                {"reps":200,"distance":200,"pace":"R"},
                {"distance":300},
                {"pace":"R"},
                {"reps":2,"distance":600,"pace":"M","restSeconds":-5}
            ]}""",
            table,
        )!!
        assertEquals(
            listOf(BuilderMainStep(100, 200, PaceLetter.R, 0), BuilderMainStep(2, 600, PaceLetter.M, 0)),
            draft.main,
        )
    }

    @Test
    fun `malformed or unrecognized json returns null so callers prefill defaults`() {
        assertNull(StructuredWorkoutBuilder.decode(null, table))
        assertNull(StructuredWorkoutBuilder.decode("", table))
        assertNull(StructuredWorkoutBuilder.decode("not json", table))
        assertNull(StructuredWorkoutBuilder.decode("{}", table))
        assertNull(StructuredWorkoutBuilder.decode("""{"steps":"nope"}""", table))
        assertNull(StructuredWorkoutBuilder.decode("""{"main":"nope"}""", table))
        assertNull(StructuredWorkoutBuilder.decode("""{"main":[]}""", table)) // empty main → defaults
    }

    // ---- decode: generator flat shape → nested ----

    @Test
    fun `flat work-recovery pairs collapse into one entry with reps`() {
        // the generator's interval pattern: warmup, N×(work + rest between), cooldown
        val flat = """
            {"version":1,"source":"generated-plan","steps":[
              {"type":"warmup","name":"Warm up","distanceMeters":1500},
              {"type":"work","name":"Rep 1","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"recovery","name":"Recovery jog","durationSeconds":120},
              {"type":"work","name":"Rep 2","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"recovery","name":"Recovery jog","durationSeconds":120},
              {"type":"work","name":"Rep 3","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"recovery","name":"Recovery jog","durationSeconds":120},
              {"type":"work","name":"Rep 4","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"cooldown","name":"Cool down","distanceMeters":1000}
            ]}
        """.trimIndent()
        val draft = StructuredWorkoutBuilder.decode(flat, table)!!
        assertEquals(BuilderSection(1500, E), draft.warmup) // no pace → E
        assertEquals(BuilderSection(1000, E), draft.cooldown)
        assertEquals(listOf(BuilderMainStep(4, 800, T, 120)), draft.main) // 240 s/km → nearest letter T
    }

    @Test
    fun `flat works without recovery collapse with zero rest`() {
        val flat = """
            {"version":1,"steps":[
              {"type":"work","distanceMeters":400,"paceSecondsPerKm":215},
              {"type":"work","distanceMeters":400,"paceSecondsPerKm":215},
              {"type":"work","distanceMeters":400,"paceSecondsPerKm":215}
            ]}
        """.trimIndent()
        val draft = StructuredWorkoutBuilder.decode(flat, table)!!
        assertEquals(listOf(BuilderMainStep(3, 400, I, 0)), draft.main)
    }

    @Test
    fun `flat mixed distances become separate entries`() {
        val flat = """
            {"version":1,"steps":[
              {"type":"work","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"work","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"work","distanceMeters":200,"paceSecondsPerKm":200},
              {"type":"work","distanceMeters":200,"paceSecondsPerKm":200},
              {"type":"work","distanceMeters":200,"paceSecondsPerKm":200}
            ]}
        """.trimIndent()
        val draft = StructuredWorkoutBuilder.decode(flat, table)!!
        assertEquals(
            listOf(BuilderMainStep(2, 800, T, 0), BuilderMainStep(3, 200, PaceLetter.R, 0)),
            draft.main,
        )
    }

    @Test
    fun `flat steady main maps to a single-rep entry`() {
        val flat = """
            {"version":1,"steps":[
              {"type":"warmup","distanceMeters":1500,"paceSecondsPerKm":330},
              {"type":"work","name":"Tempo","distanceMeters":6000,"paceSecondsPerKm":245},
              {"type":"cooldown","distanceMeters":1000,"paceSecondsPerKm":330}
            ]}
        """.trimIndent()
        val draft = StructuredWorkoutBuilder.decode(flat, table)!!
        assertEquals(BuilderSection(1500, E), draft.warmup) // 330 s/km nearest → E
        assertEquals(listOf(BuilderMainStep(1, 6000, T, 0)), draft.main)
    }

    @Test
    fun `ambiguous flat shapes fall back to null`() {
        // fartlek-style timed work: nested entries are distance-based
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"warmup","durationSeconds":600},
                   {"type":"work","durationSeconds":300,"paceSecondsPerKm":240}]}""",
                table,
            ),
        )
        // recovery jog (distance-based rest): nested rest is seconds-only
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"work","distanceMeters":400},
                   {"type":"recovery","distanceMeters":200},
                   {"type":"work","distanceMeters":400}]}""",
                table,
            ),
        )
        // trailing rest after the last work: the parser would drop it
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"work","distanceMeters":400},
                   {"type":"recovery","durationSeconds":90}]}""",
                table,
            ),
        )
        // rest between works that land in different entries
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"work","distanceMeters":800},
                   {"type":"recovery","durationSeconds":90},
                   {"type":"work","distanceMeters":400}]}""",
                table,
            ),
        )
        // timed warmup / cooldown
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"warmup","durationSeconds":600},
                   {"type":"work","distanceMeters":400}]}""",
                table,
            ),
        )
        // no usable work at all
        assertNull(
            StructuredWorkoutBuilder.decode(
                """{"steps":[{"type":"warmup","distanceMeters":1000}]}""",
                table,
            ),
        )
    }

    @Test
    fun `flat conversion is lossless through the recording parser`() {
        val flat = """
            {"version":1,"steps":[
              {"type":"warmup","name":"Warm up","distanceMeters":1500},
              {"type":"work","name":"Rep 1","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"recovery","name":"Rest","durationSeconds":120},
              {"type":"work","name":"Rep 2","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"recovery","name":"Rest","durationSeconds":120},
              {"type":"work","name":"Rep 3","distanceMeters":800,"paceSecondsPerKm":240},
              {"type":"cooldown","name":"Cool down","distanceMeters":1000}
            ]}
        """.trimIndent()
        val draft = StructuredWorkoutBuilder.decode(flat, table)!!
        val encoded = StructuredWorkoutBuilder.encodeToString(draft)
        val parserTable = table.mapKeys { it.key.name }.mapValues { it.value.toDouble() }
        val fromFlat = StructuredStepsParser.parse(flat, parserTable)
        val fromNested = StructuredStepsParser.parse(encoded, parserTable)
        // identical kind/duration/distance sequence → the structure is fully
        // preserved (exact sec/km values are quantized to pace letters)
        assertEquals(fromFlat.map { it.kind }, fromNested.map { it.kind })
        assertEquals(fromFlat.map { it.distanceM }, fromNested.map { it.distanceM })
        assertEquals(fromFlat.map { it.durationSec }, fromNested.map { it.durationSec })
    }

    // ---- totals ----

    @Test
    fun `total distance sums warmup cooldown and reps times distance`() {
        val draft = StructuredWorkoutDraft(
            warmup = BuilderSection(1000, E),
            main = listOf(
                BuilderMainStep(4, 400, I, 90),
                BuilderMainStep(2, 800, T, 60),
            ),
            cooldown = BuilderSection(800, E),
        )
        assertEquals(1000 + 4 * 400 + 2 * 800 + 800, draft.totalDistanceM)
    }

    @Test
    fun `total formats like the web editor`() {
        assertEquals("400 m", formatTotalDistance(400))
        assertEquals("4.2 km", formatTotalDistance(4200))
    }

    // ---- encode ----

    @Test
    fun `encode emits the exact nested keys and values`() {
        val draft = StructuredWorkoutDraft(
            warmup = BuilderSection(1000, E),
            main = listOf(BuilderMainStep(4, 400, I, 90)),
            cooldown = BuilderSection(0, E),
        )
        val obj = StructuredWorkoutBuilder.encode(draft)
        assertEquals(setOf("warmup", "main", "cooldown"), obj.keys)
        assertEquals(setOf("distance", "pace"), obj["warmup"]!!.jsonObject.keys)
        assertEquals(setOf("distance", "pace"), obj["cooldown"]!!.jsonObject.keys)
        val entry = obj["main"]!!.jsonArray.single().jsonObject
        assertEquals(setOf("reps", "distance", "pace", "restSeconds"), entry.keys)
        assertEquals("4", entry["reps"]!!.jsonPrimitive.content)
        assertEquals("400", entry["distance"]!!.jsonPrimitive.content)
        assertEquals("I", entry["pace"]!!.jsonPrimitive.content)
        assertEquals("90", entry["restSeconds"]!!.jsonPrimitive.content)
        assertEquals("E", obj["warmup"]!!.jsonObject["pace"]!!.jsonPrimitive.content)
        assertEquals("1000", obj["warmup"]!!.jsonObject["distance"]!!.jsonPrimitive.content)
    }

    @Test
    fun `encode survives json serialization ordering`() {
        val draft = StructuredWorkoutBuilder.decode(nested, table)!!
        val encoded = StructuredWorkoutBuilder.encodeToString(draft)
        assertEquals(
            encoded,
            Json.parseToJsonElement(encoded).toString(),
        )
    }

    // ---- round-trip ----

    @Test
    fun `nested decode and encode round-trip stably`() {
        val draft = StructuredWorkoutBuilder.decode(nested, table)!!
        val encoded = StructuredWorkoutBuilder.encodeToString(draft)
        // draft → json → draft → json is a fixed point
        assertEquals(draft, StructuredWorkoutBuilder.decode(encoded, table))
        assertEquals(encoded, StructuredWorkoutBuilder.encodeToString(StructuredWorkoutBuilder.decode(encoded, table)!!))
        // also byte-stable against the canonical form
        assertEquals(
            """{"warmup":{"distance":1000,"pace":"E"},"main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],"cooldown":{"distance":800,"pace":"E"}}""",
            encoded,
        )
    }

    @Test
    fun `editor defaults encode to the documented prefill json`() {
        val json = StructuredWorkoutBuilder.encodeToString(
            com.runflow2.app.domain.person.Personalization.structuredEditorDefaults(50.0).toDraft(),
        )
        assertEquals(
            """{"warmup":{"distance":1000,"pace":"E"},"main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],"cooldown":{"distance":1000,"pace":"E"}}""",
            json,
        )
    }
}
