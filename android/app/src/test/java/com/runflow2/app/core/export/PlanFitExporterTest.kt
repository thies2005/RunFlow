package com.runflow2.app.core.export

import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class PlanFitExporterTest {

    @Test
    fun `export generates valid FIT header, correct data size, and valid CRC-16`() {
        val workout = WorkoutEntity(
            id = "w1",
            goalId = "g1",
            scheduledDate = 1730000000000L,
            workoutType = "TEMPO",
            phase = "BUILD",
            description = "45m Tempo Run",
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 270,
            targetDurationSec = 2700,
            customName = "Tempo Session",
            sport = "RUN",
        )

        val fitBytes = PlanFitExporter.export(workout)

        assertTrue(fitBytes.size > 16)
        assertEquals(14.toByte(), fitBytes[0]) // Header size
        assertEquals(0x20.toByte(), fitBytes[1]) // Protocol 2.0

        val bb = ByteBuffer.wrap(fitBytes).order(ByteOrder.LITTLE_ENDIAN)
        val dataSize = bb.getInt(4)
        assertEquals(fitBytes.size, 14 + dataSize + 2)

        // ".FIT" signature
        val sig = String(fitBytes.sliceArray(8..11), Charsets.US_ASCII)
        assertEquals(".FIT", sig)

        // Verify header CRC
        val expectedHeaderCrc = PlanFitExporter.computeCrc(fitBytes, 0, 12)
        val actualHeaderCrc = (fitBytes[12].toInt() and 0xFF) or ((fitBytes[13].toInt() and 0xFF) shl 8)
        assertEquals(expectedHeaderCrc, actualHeaderCrc)

        // Verify file CRC
        val expectedFileCrc = PlanFitExporter.computeCrc(fitBytes, 0, 14 + dataSize)
        val actualFileCrc = (fitBytes[14 + dataSize].toInt() and 0xFF) or ((fitBytes[14 + dataSize + 1].toInt() and 0xFF) shl 8)
        assertEquals(expectedFileCrc, actualFileCrc)

        // FIT CRC property: CRC of the full file including trailing 2-byte file CRC is 0
        assertEquals(0, PlanFitExporter.computeCrc(fitBytes))
    }

    @Test
    fun `export handles structuredSteps with repeat groups`() {
        val json = """
            {
                "version": 2,
                "source": "engine",
                "steps": [
                    {
                        "kind": "warmup",
                        "duration": { "type": "distance", "meters": 1500.0 }
                    },
                    {
                        "kind": "repeat",
                        "times": 4,
                        "steps": [
                            {
                                "kind": "work",
                                "duration": { "type": "distance", "meters": 800.0 },
                                "target": { "type": "pace", "min": 190.0, "max": 200.0 }
                            },
                            {
                                "kind": "recovery",
                                "duration": { "type": "time", "seconds": 120 }
                            }
                        ]
                    },
                    {
                        "kind": "cooldown",
                        "duration": { "type": "time", "seconds": 600 }
                    }
                ]
            }
        """.trimIndent()

        val workout = WorkoutEntity(
            id = "w2",
            goalId = "g1",
            scheduledDate = 1730000000000L,
            workoutType = "INTERVALS",
            phase = "BUILD",
            description = "4x800m track intervals",
            customName = "Track Intervals",
            sport = "RUN",
            structuredStepsJson = json,
            targetDistanceKm = 0.0,
            targetPaceSecPerKm = 0,
            targetDurationSec = 0,
        )

        val fitBytes = PlanFitExporter.export(workout)
        assertEquals(0, PlanFitExporter.computeCrc(fitBytes))

        val steps = PlanFitExporter.buildStepDescriptors(workout)
        // Warmup, Work, Recovery, Repeat step, Cooldown = 5 steps
        assertEquals(5, steps.size)
        assertEquals(PlanFitExporter.DURATION_REPEAT_UNTIL_STEPS_CMPLT, steps[3].durationType)
        assertEquals(1L, steps[3].durationValue) // loop back to index 1 (Work)
        assertEquals(4L, steps[3].targetValue) // 4 times
    }
}
