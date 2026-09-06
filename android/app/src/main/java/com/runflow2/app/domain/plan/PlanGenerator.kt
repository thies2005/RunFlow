package com.runflow2.app.domain.plan

import com.runflow2.app.core.math.TrainingPaces
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.math.WorkoutPaceTarget
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import java.time.DayOfWeek
import java.time.LocalDate

/** Input for local plan generation. */
data class PlanSpec(
    val name: String,
    val raceType: RaceType,
    val raceDate: LocalDate,
    val startDate: LocalDate,
    val targetTimeSec: Int? = null,
    val weeklyKm: Double,
    val runsPerWeek: Int,
    val longRunKm: Double,
    val strengthPerWeek: Int = 0,
    val longRunDay: DayOfWeek = DayOfWeek.SUNDAY,
    val workoutDay: DayOfWeek = DayOfWeek.THURSDAY,
    val restDays: Set<DayOfWeek> = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
    val taperWeeks: Int = 2,
    val vdot: Double? = null,
    val customDistanceKm: Double? = null,
)

data class WorkoutDraft(
    val date: LocalDate,
    val type: WorkoutType,
    val phase: PlanPhase,
    val distanceKm: Double?,
    val durationSec: Int?,
    val targetPaceSecPerKm: Double?,
    val description: String,
)

/**
 * Local training-plan generator — a Kotlin port of the ideas in
 * Web/src/lib/plans/generators/run-ultra.ts: phase progression, 4-week load cycle
 * with recovery weeks, capped weekly growth, long-run build with time-on-feet cap,
 * quality sessions rotating by phase, and a taper into race day.
 */
object PlanGenerator {

    fun planWeeks(spec: PlanSpec): Int {
        val weeks = Format_weeks(spec.startDate, spec.raceDate)
        return weeks.coerceIn(4, 52)
    }

    private fun Format_weeks(start: LocalDate, end: LocalDate): Int {
        var w = 0
        var d = start
        while (d.isBefore(end)) {
            w++
            d = d.plusWeeks(1)
        }
        return w
    }

    fun generate(spec: PlanSpec): List<WorkoutDraft> {
        val weeks = planWeeks(spec)
        val paces = spec.vdot?.let { TrainingPaces(it) }
        val drafts = ArrayList<WorkoutDraft>(weeks * 7)

        // phase boundaries
        val nonTaper = (weeks - spec.taperWeeks).coerceAtLeast(1)
        val baseWeeks = (((nonTaper * 0.45)).toInt()).coerceIn(1, nonTaper)
        val peakWeeks = ((nonTaper * 0.25).toDouble()).toInt().coerceIn(1, nonTaper - baseWeeks).coerceAtLeast(1)
        val buildWeeks = (nonTaper - baseWeeks - peakWeeks).coerceAtLeast(1)

        val planStartMonday = spec.startDate.with(DayOfWeek.MONDAY)
        val raceWeekMonday = spec.raceDate.with(DayOfWeek.MONDAY)

        var prevWeekKm = spec.weeklyKm * 0.6
        var prevLongKm = spec.longRunKm * 0.6

        for (w in 0 until weeks) {
            val weekMonday = planStartMonday.plusWeeks(w.toLong())
            val isRaceWeek = weekMonday == raceWeekMonday
            val phase = when {
                isRaceWeek -> PlanPhase.RACE_WEEK
                w >= weeks - spec.taperWeeks -> PlanPhase.TAPER
                w < baseWeeks -> PlanPhase.BASE
                w < baseWeeks + buildWeeks -> PlanPhase.BUILD
                else -> PlanPhase.PEAK
            }
            val idxInPhase = when (phase) {
                PlanPhase.BASE -> w
                PlanPhase.BUILD -> w - baseWeeks
                PlanPhase.PEAK -> w - baseWeeks - buildWeeks
                else -> 0
            }
            val phaseLen = when (phase) {
                PlanPhase.BASE -> baseWeeks
                PlanPhase.BUILD -> buildWeeks
                PlanPhase.PEAK -> peakWeeks
                else -> 1
            }

            val isRecoveryWeek = !isRaceWeek && phase != PlanPhase.TAPER && (w + 1) % 4 == 0

            // weekly volume factor
            val progress = (idxInPhase + 1).toDouble() / phaseLen
            val volumeFactor = when (phase) {
                PlanPhase.BASE -> 0.70 + 0.30 * progress
                PlanPhase.BUILD -> 0.95 + 0.15 * progress
                PlanPhase.PEAK -> 1.00 + 0.10 * progress
                PlanPhase.TAPER -> 0.80
                PlanPhase.RACE_WEEK -> 0.45
                PlanPhase.RECOVERY -> 0.75
            }
            var weekKm = spec.weeklyKm * volumeFactor
            if (isRecoveryWeek) weekKm *= 0.80
            weekKm = (weekKm).coerceAtMost(prevWeekKm * 1.15).coerceAtLeast(spec.weeklyKm * 0.35)
            prevWeekKm = weekKm

            // long-run progression: build to target by end of peak phase
            val peakEndIdx = baseWeeks + buildWeeks + peakWeeks - 1
            var longKm: Double
            val targetLong = spec.longRunKm
            val timeCapKm = paces?.let {
                (210.0 * 60.0 / it.paceSecPerKm(WorkoutPaceTarget.LONG)) // ~3.5h max time on feet
            } ?: targetLong
            val effectiveTarget = minOf(targetLong, timeCapKm)
            if (w == 0) {
                longKm = effectiveTarget * 0.60
            } else {
                val remainingWeeks = (peakEndIdx - w).coerceAtLeast(1)
                val neededGrowth = Math.pow(effectiveTarget / prevLongKm, 1.0 / remainingWeeks)
                longKm = prevLongKm * minOf(neededGrowth, 1.10)
            }
            longKm = longKm.coerceAtMost(effectiveTarget)
            // remember the uncut progression so recovery weeks don't flatten the ramp
            prevLongKm = longKm
            if (isRecoveryWeek) longKm *= 0.75
            when (phase) {
                PlanPhase.TAPER -> longKm = minOf(longKm, effectiveTarget * 0.70)
                PlanPhase.RACE_WEEK -> longKm = minOf(longKm, effectiveTarget * 0.35)
                else -> {}
            }
            longKm = roundHalf(longKm).coerceAtLeast(4.0)

            // schedule the week
            drafts += scheduleWeek(
                spec = spec,
                weekMonday = weekMonday,
                phase = phase,
                weekKm = weekKm,
                longKm = longKm,
                qualityIdx = w,
                paces = paces,
                isRaceWeek = isRaceWeek,
            )
        }
        return drafts
    }

    private fun scheduleWeek(
        spec: PlanSpec,
        weekMonday: LocalDate,
        phase: PlanPhase,
        weekKm: Double,
        longKm: Double,
        qualityIdx: Int,
        paces: TrainingPaces?,
        isRaceWeek: Boolean,
    ): List<WorkoutDraft> {
        val out = ArrayList<WorkoutDraft>(7)
        val raceDate = spec.raceDate

        // decide quality type of the week
        val qualityType = when (phase) {
            PlanPhase.BASE -> if (qualityIdx % 2 == 0) WorkoutType.FARTLEK else WorkoutType.TEMPO
            PlanPhase.BUILD -> if (qualityIdx % 2 == 0) WorkoutType.TEMPO else WorkoutType.INTERVALS
            PlanPhase.PEAK -> if (qualityIdx % 2 == 0) WorkoutType.INTERVALS else WorkoutType.REPETITIONS
            PlanPhase.TAPER, PlanPhase.RACE_WEEK -> WorkoutType.EASY
            PlanPhase.RECOVERY -> WorkoutType.EASY
        }

        // distribute easy runs over unassigned days
        val days = DayOfWeek.entries
        val qualityDay = spec.workoutDay
        val longDay = spec.longRunDay
        val restDays = spec.restDays

        val assigned = HashSet<DayOfWeek>()
        assigned += qualityDay
        assigned += longDay
        assigned += restDays

        // number of easy runs = runsPerWeek - quality - long (>= 0)
        val easyCount = (spec.runsPerWeek - 2).coerceIn(0, 6)
        val easyDays = days.filter { it !in assigned }.let { candidates ->
            // prefer spreading: Mon, Wed, Fri order then others
            val preference = listOf(
                DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY,
                DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
            )
            candidates.sortedBy { preference.indexOf(it) }.take(easyCount)
        }

        val strengthCandidates = days.filter { it !in assigned && it !in easyDays }
        val strengthDays = strengthCandidates.take(spec.strengthPerWeek.coerceIn(0, strengthCandidates.size))

        val easyKmEach = if (easyDays.isEmpty()) 0.0 else
            roundHalf(((weekKm - longKm) * 0.62 / easyDays.size)).coerceAtLeast(4.0)

        for (d in days) {
            val date = weekMonday.with(d)
            if (date.isBefore(spec.startDate)) continue
            if (date == raceDate) {
                val raceDist = spec.customDistanceKm ?: spec.raceType.distanceKm
                val racePace = spec.targetTimeSec?.takeIf { raceDist != null && it > 0 }
                    ?.let { it / raceDist!! }
                out += WorkoutDraft(
                    date = date,
                    type = WorkoutType.RACE,
                    phase = PlanPhase.RACE_WEEK,
                    distanceKm = raceDist,
                    durationSec = spec.targetTimeSec,
                    targetPaceSecPerKm = racePace,
                    description = raceDesc(spec, raceDist),
                )
                continue
            }
            if (date.isAfter(raceDate)) continue

            when {
                d in restDays -> out += WorkoutDraft(
                    date, WorkoutType.REST, phase, null, null, null,
                    "Full rest day. Sleep, hydrate, recover.",
                )

                d == longDay -> out += WorkoutDraft(
                    date, WorkoutType.LONG_RUN, phase, longKm, null,
                    paces?.paceSecPerKm(WorkoutPaceTarget.LONG),
                    longRunDesc(phase, longKm, paces, spec),
                )

                d == qualityDay && !isRaceWeek -> out += qualityDraft(
                    date, qualityType, phase, paces, spec,
                )

                d == qualityDay && isRaceWeek -> out += WorkoutDraft(
                    date, WorkoutType.EASY, phase, 5.0, null,
                    paces?.paceSecPerKm(WorkoutPaceTarget.EASY),
                    "Shakeout run — 4 × 100 m strides, feel smooth and light.",
                )

                d in easyDays && d != longDay -> out += WorkoutDraft(
                    date, WorkoutType.EASY, phase, easyKmEach, null,
                    paces?.paceSecPerKm(WorkoutPaceTarget.EASY),
                    easyDesc(easyKmEach, paces),
                )

                d in strengthDays -> out += WorkoutDraft(
                    date, WorkoutType.STRENGTH, phase, null, 45 * 60, null,
                    "Strength & mobility — squats, lunges, core, calf raises.",
                )

                else -> out += WorkoutDraft(
                    date, WorkoutType.REST, phase, null, null, null,
                    "Easy day — walk, stretch, or complete rest.",
                )
            }
        }
        return out
    }

    private fun qualityDraft(
        date: LocalDate,
        type: WorkoutType,
        phase: PlanPhase,
        paces: TrainingPaces?,
        spec: PlanSpec,
    ): WorkoutDraft {
        val raceDist = spec.customDistanceKm ?: spec.raceType.distanceKm
        return when (type) {
            WorkoutType.TEMPO -> {
                val minutes = when (phase) {
                    PlanPhase.BASE -> 20
                    PlanPhase.BUILD -> 25
                    else -> 30
                }
                val pace = paces?.paceSecPerKm(WorkoutPaceTarget.THRESHOLD)
                val km = pace?.let { roundHalf(minutes * 60.0 / it + (minutes * 60.0 / it) * 0.25) }
                    ?: roundHalf(minutes * 0.185)
                WorkoutDraft(
                    date, WorkoutType.TEMPO, phase, km, null, pace,
                    "$minutes min at tempo pace (comfortably hard) with 2 km warm-up and cool-down.",
                )
            }

            WorkoutType.INTERVALS -> {
                val pace = paces?.paceSecPerKm(WorkoutPaceTarget.INTERVAL)
                WorkoutDraft(
                    date, WorkoutType.INTERVALS, phase, 10.0, null, pace,
                    if (raceDist != null && raceDist >= 42000)
                        "3 × 3 km at marathon pace, 3 min jog recovery."
                    else "5 × 1000 m at interval pace, 2:30 jog recovery.",
                )
            }

            WorkoutType.REPETITIONS -> WorkoutDraft(
                date, WorkoutType.REPETITIONS, phase, 9.0, null,
                paces?.paceSecPerKm(WorkoutPaceTarget.REPETITION),
                "10 × 400 m fast with 400 m jog recovery. Focus on smooth form and quick cadence.",
            )

            WorkoutType.FARTLEK -> WorkoutDraft(
                date, WorkoutType.FARTLEK, phase, 10.0, null,
                paces?.paceSecPerKm(WorkoutPaceTarget.EASY),
                "40 min fartlek — 8 × 1 min strong / 2 min easy by feel.",
            )

            else -> WorkoutDraft(
                date, WorkoutType.EASY, phase, 10.0, null,
                paces?.paceSecPerKm(WorkoutPaceTarget.EASY),
                easyDesc(10.0, paces),
            )
        }
    }

    private fun longRunDesc(phase: PlanPhase, km: Double, paces: TrainingPaces?, spec: PlanSpec): String {
        val raceDist = spec.customDistanceKm ?: spec.raceType.distanceKm
        val isRacePaced = phase == PlanPhase.PEAK && raceDist != null && raceDist >= 42000 &&
            km > spec.longRunKm * 0.75
        return if (isRacePaced) {
            "Long run — final 8 km at marathon pace. Practice fueling and rhythm."
        } else {
            "Long run at easy, conversational pace. Build time on your feet."
        }
    }

    private fun easyDesc(km: Double, paces: TrainingPaces?): String =
        "Easy aerobic run — keep it fully conversational."

    private fun raceDesc(spec: PlanSpec, raceDist: Double?): String {
        val name = spec.raceType.label
        return "Race day — $name! Trust your training, start controlled, finish strong."
    }

    private fun roundHalf(v: Double): Double = (v * 2).toLong() / 2.0

    /** Projected finish time from current VDOT, used by wizard feedback. */
    fun projectedTimeSec(vdot: Double, raceType: RaceType, customDistanceKm: Double? = null): Int? {
        val dist = raceType.distanceKm ?: customDistanceKm ?: return null
        return VdotMath.predictTimeSec(vdot, dist * 1000.0)?.toInt()
    }
}
