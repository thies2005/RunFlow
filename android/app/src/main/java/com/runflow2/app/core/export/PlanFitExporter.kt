package com.runflow2.app.core.export

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.plan.structured.Duration
import com.runflow2.app.domain.plan.structured.RepeatGroup
import com.runflow2.app.domain.plan.structured.StepNode
import com.runflow2.app.domain.plan.structured.StructuredStep
import com.runflow2.app.domain.plan.structured.StructuredWorkoutV2
import com.runflow2.app.domain.plan.structured.Target
import kotlinx.serialization.json.Json
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Standards-compliant binary Garmin / Coros / Wahoo .FIT workout exporter with zero dependencies.
 *
 * Emits:
 * - 14-byte FIT header (.FIT signature + header CRC)
 * - file_id message (mesg 0, type=5 workout, manufacturer=255 development)
 * - workout message (mesg 26: sport, capabilities, num_valid_steps, wkt_name)
 * - workout_step messages (mesg 27: message_index, step_name, duration_type, duration_value,
 *   target_type, target_value, custom_target_value_low/high, intensity)
 * - trailing CRC-16 (FIT CRC table algorithm)
 */
object PlanFitExporter {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    // FIT 16-element CRC table
    private val CRC_TABLE = intArrayOf(
        0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
        0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
    )

    fun updateCrc(crc: Int, b: Int): Int {
        var c = crc
        val byteVal = b and 0xFF
        var tmp = CRC_TABLE[c and 0xF]
        c = (c ushr 4) and 0x0FFF
        c = c xor tmp xor CRC_TABLE[byteVal and 0xF]
        tmp = CRC_TABLE[c and 0xF]
        c = (c ushr 4) and 0x0FFF
        c = c xor tmp xor CRC_TABLE[(byteVal ushr 4) and 0xF]
        return c and 0xFFFF
    }

    fun computeCrc(bytes: ByteArray, offset: Int = 0, length: Int = bytes.size - offset): Int {
        var crc = 0
        for (i in offset until (offset + length)) {
            crc = updateCrc(crc, bytes[i].toInt())
        }
        return crc and 0xFFFF
    }

    // FIT constants
    const val BASE_TYPE_ENUM = 0x00
    const val BASE_TYPE_UINT16 = 0x84
    const val BASE_TYPE_UINT32 = 0x86
    const val BASE_TYPE_STRING = 0x07
    const val BASE_TYPE_UINT32Z = 0x8C

    const val MESG_NUM_FILE_ID = 0
    const val MESG_NUM_WORKOUT = 26
    const val MESG_NUM_WORKOUT_STEP = 27

    const val SPORT_GENERIC = 0
    const val SPORT_RUNNING = 1
    const val SPORT_CYCLING = 2
    const val SPORT_SWIMMING = 5
    const val SPORT_TRAINING = 10

    const val INTENSITY_ACTIVE = 0
    const val INTENSITY_REST = 1
    const val INTENSITY_WARMUP = 2
    const val INTENSITY_COOLDOWN = 3

    const val DURATION_TIME = 0
    const val DURATION_DISTANCE = 1
    const val DURATION_OPEN = 5
    const val DURATION_REPEAT_UNTIL_STEPS_CMPLT = 6

    const val TARGET_SPEED = 0
    const val TARGET_HEART_RATE = 1
    const val TARGET_OPEN = 2
    const val TARGET_POWER = 4

    data class StepDescriptor(
        val name: String,
        val durationType: Int,
        val durationValue: Long, // ms or cm or step index
        val targetType: Int,
        val targetValue: Long, // repeat count, or zone, or 0
        val targetLow: Long, // speed mm/s, HR +100, power +1000
        val targetHigh: Long,
        val intensity: Int,
    )

    fun resolveSport(sport: String?, workoutType: String?): Int {
        val s = (sport ?: workoutType ?: "").uppercase(Locale.ROOT)
        return when {
            s.contains("BIKE") || s.contains("RIDE") || s.contains("CYCL") -> SPORT_CYCLING
            s.contains("SWIM") -> SPORT_SWIMMING
            s.contains("STRENGTH") || s.contains("GYM") || s.contains("CORE") -> SPORT_TRAINING
            s.contains("RUN") || s.contains("INTERVAL") || s.contains("TEMPO") || s.contains("FARTLEK") -> SPORT_RUNNING
            else -> SPORT_GENERIC
        }
    }

    fun buildStepDescriptors(workout: WorkoutEntity, ftpWatts: Int = 200): List<StepDescriptor> {
        val descriptors = mutableListOf<StepDescriptor>()

        val v2 = workout.structuredStepsJson?.let { raw ->
            runCatching {
                json.decodeFromJsonElement(StructuredWorkoutV2.serializer(), json.parseToJsonElement(raw))
            }.getOrNull()
        }

        if (v2 != null && v2.steps.isNotEmpty()) {
            fun emitStructuredStep(step: StructuredStep) {
                var durType = DURATION_OPEN
                var durVal = 0L
                when (val d = step.duration) {
                    is Duration.Time -> {
                        durType = DURATION_TIME
                        durVal = (d.seconds * 1000L).coerceAtLeast(1000L)
                    }
                    is Duration.Distance -> {
                        durType = DURATION_DISTANCE
                        durVal = (d.meters * 100.0).roundToInt().toLong().coerceAtLeast(1000L)
                    }
                    is Duration.LapPress -> {
                        durType = DURATION_OPEN
                        durVal = 0L
                    }
                }

                var targetType = TARGET_OPEN
                var targetVal = 0L
                var targetLow = 0L
                var targetHigh = 0L

                when (val t = step.target) {
                    is Target.Pace -> {
                        targetType = TARGET_SPEED
                        val minPace = (t.min ?: t.max ?: 300.0).coerceAtLeast(60.0)
                        val maxPace = (t.max ?: t.min ?: 300.0).coerceAtLeast(minPace)
                        targetLow = (1_000_000.0 / maxPace).roundToInt().toLong()
                        targetHigh = (1_000_000.0 / minPace).roundToInt().toLong()
                    }
                    is Target.Hr -> {
                        targetType = TARGET_HEART_RATE
                        if (t.minBpm != null || t.maxBpm != null) {
                            val minB = (t.minBpm ?: t.maxBpm ?: 140).toLong()
                            val maxB = (t.maxBpm ?: t.minBpm ?: 160).toLong()
                            targetLow = minB + 100L
                            targetHigh = maxB + 100L
                        } else if (t.zone != null) {
                            targetVal = t.zone.toLong()
                        }
                    }
                    is Target.Power -> {
                        targetType = TARGET_POWER
                        if (t.minWatts != null || t.maxWatts != null) {
                            val minW = (t.minWatts ?: t.maxWatts ?: 200).toLong()
                            val maxW = (t.maxWatts ?: t.minWatts ?: 200).toLong()
                            targetLow = minW + 1000L
                            targetHigh = maxW + 1000L
                        } else if (t.ftpPercent != null && t.ftpPercent > 0) {
                            val w = (ftpWatts * t.ftpPercent / 100.0).roundToInt().toLong()
                            targetLow = w + 1000L
                            targetHigh = w + 1000L
                        }
                    }
                    else -> {
                        targetType = TARGET_OPEN
                    }
                }

                val intensity = when (step.kind.lowercase(Locale.ROOT)) {
                    "warmup" -> INTENSITY_WARMUP
                    "cooldown" -> INTENSITY_COOLDOWN
                    "recovery" -> INTENSITY_REST
                    else -> INTENSITY_ACTIVE
                }

                descriptors.add(
                    StepDescriptor(
                        name = step.label ?: step.kind,
                        durationType = durType,
                        durationValue = durVal,
                        targetType = targetType,
                        targetValue = targetVal,
                        targetLow = targetLow,
                        targetHigh = targetHigh,
                        intensity = intensity,
                    )
                )
            }

            fun emitNode(node: StepNode) {
                when (node) {
                    is RepeatGroup -> {
                        val startIndex = descriptors.size
                        for (child in node.steps) {
                            emitNode(child)
                        }
                        val times = node.times.coerceAtLeast(1)
                        if (times > 1) {
                            descriptors.add(
                                StepDescriptor(
                                    name = node.label ?: "Repeat",
                                    durationType = DURATION_REPEAT_UNTIL_STEPS_CMPLT,
                                    durationValue = startIndex.toLong(),
                                    targetType = TARGET_OPEN,
                                    targetValue = times.toLong(),
                                    targetLow = 0L,
                                    targetHigh = 0L,
                                    intensity = INTENSITY_ACTIVE,
                                )
                            )
                        }
                        if (node.setRest != null) {
                            val restDur = when (val r = node.setRest) {
                                is Duration.Time -> (r.seconds * 1000L)
                                is Duration.Distance -> (r.meters * 100.0).roundToInt().toLong()
                                is Duration.LapPress -> 0L
                                else -> 0L
                            }
                            val restType = if (node.setRest is Duration.Distance) DURATION_DISTANCE else DURATION_TIME
                            descriptors.add(
                                StepDescriptor(
                                    name = "Set Rest",
                                    durationType = restType,
                                    durationValue = restDur,
                                    targetType = TARGET_OPEN,
                                    targetValue = 0L,
                                    targetLow = 0L,
                                    targetHigh = 0L,
                                    intensity = INTENSITY_REST,
                                )
                            )
                        }
                    }
                    is StructuredStep -> emitStructuredStep(node)
                }
            }

            for (node in v2.steps) {
                emitNode(node)
            }
        } else {
            // Fallback: build warmup / main / cooldown from workout targets
            val totalDurSec = workout.targetDurationSec ?: 0
            val totalDistMeters = ((workout.targetDistanceKm ?: 0.0) * 1000.0).roundToInt()

            var mainTargetType = TARGET_OPEN
            var mainTargetVal = 0L
            var mainTargetLow = 0L
            var mainTargetHigh = 0L

            val pWatts = workout.targetPowerWatts ?: 0
            val pMinWatts = workout.targetPowerMinWatts ?: pWatts
            val pMaxWatts = workout.targetPowerMaxWatts ?: pWatts

            val paceMin = workout.targetPaceMinSecPerKm ?: workout.targetPaceSecPerKm?.toDouble() ?: 0.0
            val paceMax = workout.targetPaceMaxSecPerKm ?: paceMin

            val hrMin = workout.targetHrMinBpm ?: 0
            val hrMax = workout.targetHrMaxBpm ?: hrMin
            val hrZone = workout.targetHrZone ?: 0

            if (pWatts > 0 || pMinWatts > 0) {
                mainTargetType = TARGET_POWER
                mainTargetLow = (pMinWatts.coerceAtLeast(pWatts) + 1000).toLong()
                mainTargetHigh = (pMaxWatts.coerceAtLeast(pWatts) + 1000).toLong()
            } else if (paceMin > 0.0) {
                mainTargetType = TARGET_SPEED
                mainTargetLow = (1_000_000.0 / paceMax.coerceAtLeast(paceMin)).roundToInt().toLong()
                mainTargetHigh = (1_000_000.0 / paceMin).roundToInt().toLong()
            } else if (hrMin > 0) {
                mainTargetType = TARGET_HEART_RATE
                mainTargetLow = (hrMin + 100).toLong()
                mainTargetHigh = (hrMax + 100).toLong()
            } else if (hrZone > 0) {
                mainTargetType = TARGET_HEART_RATE
                mainTargetVal = hrZone.toLong()
            }

            if (totalDistMeters > 2000) {
                val warmDist = (totalDistMeters * 0.15).roundToInt()
                val coolDist = (totalDistMeters * 0.15).roundToInt()
                val mainDist = totalDistMeters - warmDist - coolDist

                descriptors.add(
                    StepDescriptor(
                        name = "Warmup",
                        durationType = DURATION_DISTANCE,
                        durationValue = warmDist * 100L,
                        targetType = TARGET_OPEN,
                        targetValue = 0L,
                        targetLow = 0L,
                        targetHigh = 0L,
                        intensity = INTENSITY_WARMUP,
                    )
                )
                descriptors.add(
                    StepDescriptor(
                        name = "Main",
                        durationType = DURATION_DISTANCE,
                        durationValue = mainDist * 100L,
                        targetType = mainTargetType,
                        targetValue = mainTargetVal,
                        targetLow = mainTargetLow,
                        targetHigh = mainTargetHigh,
                        intensity = INTENSITY_ACTIVE,
                    )
                )
                descriptors.add(
                    StepDescriptor(
                        name = "Cooldown",
                        durationType = DURATION_DISTANCE,
                        durationValue = coolDist * 100L,
                        targetType = TARGET_OPEN,
                        targetValue = 0L,
                        targetLow = 0L,
                        targetHigh = 0L,
                        intensity = INTENSITY_COOLDOWN,
                    )
                )
            } else if (totalDurSec >= 900) {
                val warmSec = (totalDurSec * 0.15).roundToInt().coerceAtMost(600)
                val coolSec = (totalDurSec * 0.15).roundToInt().coerceAtMost(600)
                val mainSec = totalDurSec - warmSec - coolSec

                descriptors.add(
                    StepDescriptor(
                        name = "Warmup",
                        durationType = DURATION_TIME,
                        durationValue = warmSec * 1000L,
                        targetType = TARGET_OPEN,
                        targetValue = 0L,
                        targetLow = 0L,
                        targetHigh = 0L,
                        intensity = INTENSITY_WARMUP,
                    )
                )
                descriptors.add(
                    StepDescriptor(
                        name = "Main",
                        durationType = DURATION_TIME,
                        durationValue = mainSec * 1000L,
                        targetType = mainTargetType,
                        targetValue = mainTargetVal,
                        targetLow = mainTargetLow,
                        targetHigh = mainTargetHigh,
                        intensity = INTENSITY_ACTIVE,
                    )
                )
                descriptors.add(
                    StepDescriptor(
                        name = "Cooldown",
                        durationType = DURATION_TIME,
                        durationValue = coolSec * 1000L,
                        targetType = TARGET_OPEN,
                        targetValue = 0L,
                        targetLow = 0L,
                        targetHigh = 0L,
                        intensity = INTENSITY_COOLDOWN,
                    )
                )
            } else {
                val dur = if (totalDurSec > 0) totalDurSec * 1000L else if (totalDistMeters > 0) totalDistMeters * 100L else 1800 * 1000L
                val durType = if (totalDurSec > 0) DURATION_TIME else if (totalDistMeters > 0) DURATION_DISTANCE else DURATION_TIME
                descriptors.add(
                    StepDescriptor(
                        name = workout.customName ?: workout.workoutType,
                        durationType = durType,
                        durationValue = dur,
                        targetType = mainTargetType,
                        targetValue = mainTargetVal,
                        targetLow = mainTargetLow,
                        targetHigh = mainTargetHigh,
                        intensity = INTENSITY_ACTIVE,
                    )
                )
            }
        }

        return descriptors
    }

    fun export(workout: WorkoutEntity, ftpWatts: Int = 200, vdot: Double = 45.0): ByteArray {
        val sport = resolveSport(workout.sport, workout.workoutType)
        val title = (workout.customName ?: workout.workoutType).take(15)
        val steps = buildStepDescriptors(workout, ftpWatts)

        val dataOut = ByteArrayOutputStream()

        fun writeFixedString(str: String, len: Int) {
            val bytes = str.toByteArray(Charsets.UTF_8)
            for (i in 0 until len) {
                if (i < bytes.size && i < len - 1) {
                    dataOut.write(bytes[i].toInt())
                } else {
                    dataOut.write(0)
                }
            }
        }

        fun writeU8(v: Int) = dataOut.write(v and 0xFF)
        fun writeU16LE(v: Int) {
            dataOut.write(v and 0xFF)
            dataOut.write((v ushr 8) and 0xFF)
        }
        fun writeU32LE(v: Long) {
            dataOut.write((v and 0xFF).toInt())
            dataOut.write(((v ushr 8) and 0xFF).toInt())
            dataOut.write(((v ushr 16) and 0xFF).toInt())
            dataOut.write(((v ushr 24) and 0xFF).toInt())
        }

        // 1. Definition Message for File ID (Local 0, Global 0)
        writeU8(0x40) // Definition, local 0
        writeU8(0x00) // Reserved
        writeU8(0x00) // Little Endian
        writeU16LE(MESG_NUM_FILE_ID)
        writeU8(5) // 5 fields
        writeU8(0); writeU8(1); writeU8(BASE_TYPE_ENUM)
        writeU8(1); writeU8(2); writeU8(BASE_TYPE_UINT16)
        writeU8(2); writeU8(2); writeU8(BASE_TYPE_UINT16)
        writeU8(3); writeU8(4); writeU8(BASE_TYPE_UINT32Z)
        writeU8(4); writeU8(4); writeU8(BASE_TYPE_UINT32)

        // 1b. Data Message for File ID
        val fitEpochSecs = ((System.currentTimeMillis() / 1000L) - 631065600L).coerceAtLeast(0L)
        writeU8(0x00) // Data, local 0
        writeU8(5) // type = workout (5)
        writeU16LE(255) // manufacturer = development
        writeU16LE(0) // product
        writeU32LE(0L) // serial
        writeU32LE(fitEpochSecs) // time_created

        // 2. Definition Message for Workout (Local 1, Global 26)
        writeU8(0x41) // Definition, local 1
        writeU8(0x00)
        writeU8(0x00)
        writeU16LE(MESG_NUM_WORKOUT)
        writeU8(4) // 4 fields
        writeU8(4); writeU8(1); writeU8(BASE_TYPE_ENUM)
        writeU8(5); writeU8(4); writeU8(BASE_TYPE_UINT32Z)
        writeU8(6); writeU8(2); writeU8(BASE_TYPE_UINT16)
        writeU8(8); writeU8(16); writeU8(BASE_TYPE_STRING)

        // 2b. Data Message for Workout
        writeU8(0x01) // Data, local 1
        writeU8(sport)
        writeU32LE(0x20L) // capabilities: custom workout
        writeU16LE(steps.size)
        writeFixedString(title, 16)

        // 3. Definition Message for Workout Step (Local 2, Global 27)
        writeU8(0x42) // Definition, local 2
        writeU8(0x00)
        writeU8(0x00)
        writeU16LE(MESG_NUM_WORKOUT_STEP)
        writeU8(9) // 9 fields
        writeU8(254); writeU8(2); writeU8(BASE_TYPE_UINT16)
        writeU8(0); writeU8(16); writeU8(BASE_TYPE_STRING)
        writeU8(1); writeU8(1); writeU8(BASE_TYPE_ENUM)
        writeU8(2); writeU8(4); writeU8(BASE_TYPE_UINT32)
        writeU8(3); writeU8(1); writeU8(BASE_TYPE_ENUM)
        writeU8(4); writeU8(4); writeU8(BASE_TYPE_UINT32)
        writeU8(5); writeU8(4); writeU8(BASE_TYPE_UINT32)
        writeU8(6); writeU8(4); writeU8(BASE_TYPE_UINT32)
        writeU8(7); writeU8(1); writeU8(BASE_TYPE_ENUM)

        // 3b. Data Messages for each step
        for (i in steps.indices) {
            val step = steps[i]
            writeU8(0x02) // Data, local 2
            writeU16LE(i)
            writeFixedString(step.name, 16)
            writeU8(step.durationType)
            writeU32LE(step.durationValue)
            writeU8(step.targetType)
            writeU32LE(step.targetValue)
            writeU32LE(step.targetLow)
            writeU32LE(step.targetHigh)
            writeU8(step.intensity)
        }

        val dataBytes = dataOut.toByteArray()
        val dataSize = dataBytes.size

        // Build 14-byte Header
        val header = ByteArray(14)
        header[0] = 14
        header[1] = 0x20 // FIT 2.0
        // Profile version 2132 (0x0854)
        header[2] = 0x54
        header[3] = 0x08
        // Data size (UInt32 LE)
        val bb = ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN)
        bb.position(4)
        bb.putInt(dataSize)
        // .FIT
        header[8] = 0x2E.toByte() // '.'
        header[9] = 0x46.toByte() // 'F'
        header[10] = 0x49.toByte() // 'I'
        header[11] = 0x54.toByte() // 'T'

        val headerCrc = computeCrc(header, 0, 12)
        header[12] = (headerCrc and 0xFF).toByte()
        header[13] = ((headerCrc ushr 8) and 0xFF).toByte()

        // Combine header + data
        val fullWithoutFileCrc = ByteArray(14 + dataSize)
        System.arraycopy(header, 0, fullWithoutFileCrc, 0, 14)
        System.arraycopy(dataBytes, 0, fullWithoutFileCrc, 14, dataSize)

        // Compute File CRC
        val fileCrc = computeCrc(fullWithoutFileCrc)

        val result = ByteArray(14 + dataSize + 2)
        System.arraycopy(fullWithoutFileCrc, 0, result, 0, 14 + dataSize)
        result[14 + dataSize] = (fileCrc and 0xFF).toByte()
        result[14 + dataSize + 1] = ((fileCrc ushr 8) and 0xFF).toByte()

        return result
    }

    fun exportToCache(context: Context, workout: WorkoutEntity, ftpWatts: Int = 200, vdot: Double = 45.0): File {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val slug = (workout.customName ?: workout.workoutType)
            .lowercase(Locale.ENGLISH)
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .ifBlank { "workout" }
        val file = File(dir, "runflow-$slug.fit")
        file.writeBytes(export(workout, ftpWatts, vdot))
        return file
    }

    fun createShareIntent(context: Context, workout: WorkoutEntity, ftpWatts: Int = 200, vdot: Double = 45.0): Intent {
        val file = exportToCache(context, workout, ftpWatts, vdot)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "application/octet-stream"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, workout.customName ?: workout.description)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return Intent.createChooser(send, "Export .fit workout")
    }

    fun share(context: Context, workout: WorkoutEntity, ftpWatts: Int = 200, vdot: Double = 45.0) {
        val intent = createShareIntent(context, workout, ftpWatts, vdot)
        context.startActivity(intent)
    }
}
