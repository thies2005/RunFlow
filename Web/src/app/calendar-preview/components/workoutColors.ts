/**
 * Workout-type colour tokens — mirrors the advanced plan editor's palette
 * (`plan-advanced/.../Shared/WorkoutTypeColors.ts`) so the calendar dots/cards
 * match the rest of the app.
 */
export const WORKOUT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    EASY:         { bg: 'bg-blue-500/20',  text: 'text-blue-400',  dot: 'bg-blue-400' },
    LONG_RUN:     { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
    TEMPO:        { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
    INTERVALS:    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
    FARTLEK:      { bg: 'bg-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
    REPETITIONS:  { bg: 'bg-red-500/20',    text: 'text-red-400',    dot: 'bg-red-400' },
    RECOVERY:     { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
    RACE:         { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
    REST:         { bg: 'bg-foreground/20',   text: 'text-foreground-muted',   dot: 'bg-foreground/30' },
    RIDE:         { bg: 'bg-teal-500/20',   text: 'text-teal-400',   dot: 'bg-teal-400' },
    SWIM:         { bg: 'bg-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-400' },
    STRENGTH:     { bg: 'bg-pink-500/20',   text: 'text-pink-400',   dot: 'bg-pink-400' },
    BRICK:        { bg: 'bg-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
    OTHER:        { bg: 'bg-foreground/20',  text: 'text-foreground-muted',  dot: 'bg-foreground/30' },
};

export function colorsFor(type: string) {
    return WORKOUT_COLORS[type] || WORKOUT_COLORS.OTHER;
}

export const PHASE_COLORS: Record<string, string> = {
    BASE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    BUILD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    PEAK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TAPER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    RACE_WEEK: 'bg-green-500/20 text-green-400 border-green-500/30',
    RECOVERY: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    OFF: 'bg-foreground/20 text-foreground-secondary border-foreground/30',
};

export function phaseColor(phase: string): string {
    return PHASE_COLORS[phase] || PHASE_COLORS.OFF;
}
