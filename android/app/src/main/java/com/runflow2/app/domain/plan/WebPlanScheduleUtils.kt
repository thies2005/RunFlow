package com.runflow2.app.domain.plan

import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * Port of Web/src/lib/plans/schedule-utils.ts `fixBackToBackSameType`
 * (L26-99): after generation, walk the date-sorted workouts and repair
 * same-type back-to-back days by swapping with a different-type workout 2-3
 * days later, or (when no rest days exist) nudging the second workout one day
 * later. Race-day workouts and dates on/after the race are protected.
 */
object WebPlanScheduleUtils {

    fun fixBackToBackSameType(
        workouts: List<WebGeneratedWorkout>,
        raceDate: LocalDate? = null,
        restDays: List<Int>? = null,
        protectedTypes: Set<String> = setOf("RACE"),
    ): MutableList<WebGeneratedWorkout> {
        val restDaySet = HashSet(restDays ?: emptyList())
        // copy then sort by date, like the web's spread + sort
        val sorted = workouts.toMutableList()
        sorted.sortBy { it.date }

        var i = 1
        var iterations = 0
        val maxIterations = workouts.size * 4

        while (i < sorted.size && iterations < maxIterations) {
            iterations++
            val prev = sorted[i - 1]
            val curr = sorted[i]

            if (dayDiff(prev.date, curr.date) != 1L || prev.type != curr.type) {
                i++
                continue
            }

            if (protectedTypes.contains(curr.type) || (raceDate != null && !curr.date.isBefore(raceDate))) {
                i++
                continue
            }

            var changed = false

            var offset = 2
            while (offset <= 3 && !changed) {
                val candidateIdx = i + offset
                if (candidateIdx >= sorted.size) break
                val candidate = sorted[candidateIdx]
                if (protectedTypes.contains(candidate.type)) {
                    offset++
                    continue
                }
                if (candidate.type == curr.type || candidate.type == prev.type) {
                    offset++
                    continue
                }

                val candidateDate = candidate.date
                val currDate = curr.date
                if (restDaySet.contains(jsDay(candidateDate)) || restDaySet.contains(jsDay(currDate))) {
                    offset++
                    continue
                }
                if (raceDate != null && !candidateDate.isBefore(raceDate)) {
                    offset++
                    continue
                }

                sorted[i] = curr.copy(date = candidateDate)
                sorted[candidateIdx] = candidate.copy(date = currDate)
                changed = true
                offset++
            }

            if (!changed && restDaySet.isEmpty()) {
                val shifted = curr.date.plusDays(1)

                val nextIdx = i + 1
                val next = sorted.getOrNull(nextIdx)
                val overlapsNext = next != null && (!shifted.isBefore(next.date))
                val crossesRace = raceDate != null && !shifted.isBefore(raceDate)

                if (!overlapsNext && !crossesRace) {
                    sorted[i] = curr.copy(date = shifted)
                    changed = true
                }
            }

            if (!changed) {
                i++
                continue
            }

            sorted.sortBy { it.date }
            i = maxOf(1, i - 1)
        }

        return sorted
    }

    private fun dayDiff(a: LocalDate, b: LocalDate): Long = ChronoUnit.DAYS.between(a, b)
}
