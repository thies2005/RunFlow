/**
 * Workout-type colour tokens — mapped onto the "Race Timing" design-system
 * tokens (workout-*, zone-*, accent-*) so the calendar dots/cards match the
 * rest of the app and stay correct in both light and dark mode.
 */
export const WORKOUT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    EASY:         { bg: 'bg-workout-easy/15',       text: 'text-workout-easy',       dot: 'bg-workout-easy' },
    LONG_RUN:     { bg: 'bg-workout-long-run/15',   text: 'text-workout-long-run',   dot: 'bg-workout-long-run' },
    TEMPO:        { bg: 'bg-workout-tempo/15',      text: 'text-workout-tempo',      dot: 'bg-workout-tempo' },
    INTERVALS:    { bg: 'bg-workout-interval/15',   text: 'text-workout-interval',   dot: 'bg-workout-interval' },
    FARTLEK:      { bg: 'bg-workout-race/15',       text: 'text-workout-race',       dot: 'bg-workout-race' },
    REPETITIONS:  { bg: 'bg-accent-pink/15',        text: 'text-accent-pink',        dot: 'bg-accent-pink' },
    RECOVERY:     { bg: 'bg-workout-recovery/15',   text: 'text-workout-recovery',   dot: 'bg-workout-recovery' },
    RACE:         { bg: 'bg-accent-orange/15',      text: 'text-accent-orange',      dot: 'bg-accent-orange' },
    REST:         { bg: 'bg-foreground-muted/15',   text: 'text-foreground-muted',   dot: 'bg-foreground-muted' },
    RIDE:         { bg: 'bg-accent-blue/15',        text: 'text-accent-blue',        dot: 'bg-accent-blue' },
    SWIM:         { bg: 'bg-zone-2/15',             text: 'text-zone-2',             dot: 'bg-zone-2' },
    STRENGTH:     { bg: 'bg-workout-strength/15',   text: 'text-workout-strength',   dot: 'bg-workout-strength' },
    BRICK:        { bg: 'bg-zone-4/15',             text: 'text-zone-4',             dot: 'bg-zone-4' },
    OTHER:        { bg: 'bg-foreground-muted/15',   text: 'text-foreground-muted',   dot: 'bg-foreground-muted' },
};

export function colorsFor(type: string) {
    return WORKOUT_COLORS[type] || WORKOUT_COLORS.OTHER;
}

export const PHASE_COLORS: Record<string, string> = {
    BASE: 'bg-workout-strength/15 text-workout-strength border-workout-strength/30',
    BUILD: 'bg-workout-tempo/15 text-workout-tempo border-workout-tempo/30',
    PEAK: 'bg-workout-long-run/15 text-workout-long-run border-workout-long-run/30',
    TAPER: 'bg-positive/15 text-positive border-positive/30',
    RACE_WEEK: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
    RECOVERY: 'bg-workout-recovery/15 text-workout-recovery border-workout-recovery/30',
    OFF: 'bg-foreground-muted/15 text-foreground-secondary border-foreground-muted/30',
};

export function phaseColor(phase: string): string {
    return PHASE_COLORS[phase] || PHASE_COLORS.OFF;
}
