package com.runflow2.app.core.export

import android.content.Context
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.repo.date
import com.runflow2.app.data.repo.type
import java.io.File

/**
 * Builds the CSV export of a plan's workouts — same columns and metric
 * values as the web export engine (`/api/mobile/v1/goals/[id]/export?format=csv`):
 * Date, Day, Type, Description, Distance (km), Duration, Pace, Phase,
 * Intensity Zone. Pure Kotlin so the row mapping is unit-testable.
 */
class PlanCsvExporter {

    fun build(workouts: List<WorkoutEntity>): String {
        val headers = listOf("Date", "Day", "Type", "Description", "Distance (km)", "Duration", "Pace", "Phase", "Intensity Zone")
        val lines = mutableListOf(headers.joinToString(","))
        for (w in workouts.sortedBy { it.scheduledDate }) {
            // server-pulled rows carry the raw web enum in workoutType;
            // device-generated rows keep it in webWorkoutType (RIDE collapsed
            // from LONG_RIDE etc.) — prefer it so the CSV matches the web
            val rawType = w.webWorkoutType?.takeIf { it.isNotBlank() } ?: w.workoutType
            val row = listOf(
                w.date().toString(),
                Format.dayShort(w.date().dayOfWeek),
                rawType.replace('_', ' '),
                "\"${displayTitle(w).replace("\"", "\"\"")}\"",
                w.targetDistanceKm?.let { String.format(java.util.Locale.ENGLISH, "%.1f", it) } ?: "-",
                w.targetDurationSec?.let { Format.duration(it) } ?: "-",
                w.targetPaceSecPerKm?.let { Format.pace(it.toDouble()) } ?: "-",
                w.phase.replace('_', ' '),
                "", // intensity zone: not stored locally
            )
            lines += row.joinToString(",")
        }
        return lines.joinToString("\n")
    }

    private fun displayTitle(w: WorkoutEntity): String =
        w.customName?.takeIf { it.isNotBlank() } ?: w.description
}

/** Writes the plan CSV into `cache/exports/` (same naming as the PDF export). */
fun exportCsvToCache(context: Context, goal: GoalEntity, workouts: List<WorkoutEntity>): File {
    val dir = File(context.cacheDir, "exports").apply { mkdirs() }
    val file = File(dir, "runflow-${goal.raceType.lowercase()}-plan.csv")
    file.writeText(PlanCsvExporter().build(workouts), Charsets.UTF_8)
    return file
}
