package com.runflow2.app.core.export

import android.content.Context
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.plan.structured.Duration
import com.runflow2.app.domain.plan.structured.RepeatGroup
import com.runflow2.app.domain.plan.structured.StepNode
import com.runflow2.app.domain.plan.structured.StructuredStep
import com.runflow2.app.domain.plan.structured.StructuredWorkoutV2
import com.runflow2.app.domain.plan.structured.Target
import kotlinx.serialization.json.Json
import java.io.File
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Exports a [WorkoutEntity] to a Zwift / MyWhoosh `.zwo` XML file in
 * `cache/exports/` so athletes can open or share structured cycling workouts
 * directly from the Android Plan screen.
 */
object PlanZwoExporter {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    fun buildZwoXml(workout: WorkoutEntity, ftpWatts: Int = 200): String {
        val safeFtp = ftpWatts.coerceAtLeast(100)
        val title = xmlEscape(workout.customName?.takeIf { it.isNotBlank() } ?: workout.description.take(80))
        val desc = xmlEscape(workout.description)
        val sportType = if (workout.sport.equals("RUN", ignoreCase = true) &&
            workout.workoutType !in setOf("RIDE", "LONG_RIDE", "RIDE_INTERVALS", "CROSS_TRAIN")
        ) "run" else "bike"

        val v2 = workout.structuredStepsJson?.let {
            runCatching { json.decodeFromJsonElement(StructuredWorkoutV2.serializer(), json.parseToJsonElement(it)) }.getOrNull()
        }

        val bodyLines = mutableListOf<String>()
        if (v2 != null && v2.steps.isNotEmpty()) {
            v2.steps.forEach { node ->
                renderNode(node, safeFtp, bodyLines)
            }
        } else {
            val dur = (workout.targetDurationSec ?: 3600).coerceAtLeast(300)
            val powerFrac = workout.targetFtpPercent?.let { it / 100.0 }
                ?: workout.targetPowerWatts?.let { it.toDouble() / safeFtp }
                ?: 0.65
            bodyLines += """        <SteadyState Duration="$dur" Power="${fmtPower(powerFrac)}" />"""
        }

        return buildString {
            appendLine("""<?xml version="1.0" encoding="UTF-8"?>""")
            appendLine("""<workout_file>""")
            appendLine("""    <author>RunFlow</author>""")
            appendLine("""    <name>$title</name>""")
            appendLine("""    <description>$desc</description>""")
            appendLine("""    <sportType>$sportType</sportType>""")
            appendLine("""    <workout>""")
            bodyLines.forEach { appendLine(it) }
            appendLine("""    </workout>""")
            append("""</workout_file>""")
        }
    }

    private fun renderNode(node: StepNode, ftpWatts: Int, out: MutableList<String>) {
        when (node) {
            is StructuredStep -> {
                val durSec = durationSeconds(node.duration)
                val p = powerFraction(node.target, ftpWatts)
                val cadAttr = node.cadenceRpm?.let { """ Cadence="$it"""" } ?: ""
                when (node.kind) {
                    "warmup" -> out += """        <Warmup Duration="$durSec" PowerLow="${fmtPower(p * 0.75)}" PowerHigh="${fmtPower(p)}"$cadAttr />"""
                    "cooldown" -> out += """        <Cooldown Duration="$durSec" PowerLow="${fmtPower(p)}" PowerHigh="${fmtPower(p * 0.70)}"$cadAttr />"""
                    else -> out += """        <SteadyState Duration="$durSec" Power="${fmtPower(p)}"$cadAttr />"""
                }
            }
            is RepeatGroup -> {
                val work = node.steps.filterIsInstance<StructuredStep>().firstOrNull { it.kind == "work" || it.kind == "steady" }
                    ?: node.steps.filterIsInstance<StructuredStep>().firstOrNull()
                val rec = node.steps.filterIsInstance<StructuredStep>().firstOrNull { it.kind == "recovery" }
                if (work != null) {
                    val onDur = durationSeconds(work.duration)
                    val offDur = rec?.let { durationSeconds(it.duration) }
                        ?: node.setRest?.let { durationSeconds(it) }
                        ?: 120
                    val onPower = powerFraction(work.target, ftpWatts)
                    val offPower = rec?.let { powerFraction(it.target, ftpWatts) } ?: 0.50
                    val cadAttr = work.cadenceRpm?.let { """ Cadence="$it"""" } ?: ""
                    out += """        <IntervalsT Repeat="${node.times.coerceAtLeast(1)}" OnDuration="$onDur" OffDuration="$offDur" OnPower="${fmtPower(onPower)}" OffPower="${fmtPower(offPower)}"$cadAttr />"""
                }
            }
        }
    }

    private fun durationSeconds(d: Duration): Int = when (d) {
        is Duration.Time -> d.seconds.coerceAtLeast(10)
        is Duration.Distance -> (d.meters / 8.0).roundToInt().coerceAtLeast(30)
        is Duration.LapPress -> 300
    }

    private fun powerFraction(target: Target?, ftpWatts: Int): Double = when (target) {
        is Target.Power -> when {
            target.ftpPercent != null && target.ftpPercent > 0 -> target.ftpPercent / 100.0
            target.minWatts != null && target.maxWatts != null -> ((target.minWatts + target.maxWatts) / 2.0) / ftpWatts
            target.minWatts != null -> target.minWatts.toDouble() / ftpWatts
            else -> 0.65
        }
        is Target.Rpe -> (target.value.coerceIn(1, 10) * 0.10)
        else -> 0.65
    }.coerceIn(0.30, 1.80)

    private fun fmtPower(frac: Double): String = String.format(Locale.US, "%.2f", frac)

    private fun xmlEscape(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")

    fun exportToCache(context: Context, workout: WorkoutEntity, ftpWatts: Int = 200): File {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val slug = (workout.customName ?: workout.workoutType)
            .lowercase(Locale.ENGLISH)
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .ifBlank { "workout" }
        val file = File(dir, "runflow-$slug.zwo")
        file.writeText(buildZwoXml(workout, ftpWatts), Charsets.UTF_8)
        return file
    }
}
