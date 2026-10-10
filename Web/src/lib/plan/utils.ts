import { Activity, Clock, Zap, Bike, Mountain, Flag, Dumbbell, Waves, LucideIcon } from 'lucide-react';

export const workoutStyles: Record<string, { color: string, icon: LucideIcon, label: string }> = {
    EASY: { color: 'text-workout-easy', icon: Activity, label: 'Easy Run' },
    LONG_RUN: { color: 'text-workout-long-run', icon: Mountain, label: 'Long Run' },
    TEMPO: { color: 'text-workout-tempo', icon: Zap, label: 'Tempo' },
    INTERVALS: { color: 'text-workout-interval', icon: Zap, label: 'Intervals' },
    FARTLEK: { color: 'text-accent-orange', icon: Zap, label: 'Fartlek' },
    REPETITIONS: { color: 'text-workout-interval', icon: Zap, label: 'Repetitions' },
    RECOVERY: { color: 'text-workout-recovery', icon: Activity, label: 'Recovery' },
    REST: { color: 'text-foreground-muted', icon: Clock, label: 'Rest Day' },
    RIDE: { color: 'text-accent-blue', icon: Bike, label: 'Bike Ride' },
    LONG_RIDE: { color: 'text-accent-blue', icon: Bike, label: 'Long Ride' },
    RIDE_INTERVALS: { color: 'text-workout-interval', icon: Bike, label: 'Bike Intervals' },
    BRICK: { color: 'text-workout-long-run', icon: Bike, label: 'Brick' },
    SWIM: { color: 'text-accent-blue', icon: Waves, label: 'Swim' },
    SWIM_DRILL: { color: 'text-accent-blue', icon: Waves, label: 'Swim Drill' },
    OPEN_WATER_SWIM: { color: 'text-accent-blue', icon: Waves, label: 'Open Water' },
    TRANSITION_PRACTICE: { color: 'text-foreground-muted', icon: Clock, label: 'Transition' },
    STRENGTH: { color: 'text-workout-strength', icon: Dumbbell, label: 'Strength' },
    CROSS_TRAIN: { color: 'text-workout-easy', icon: Activity, label: 'Cross Training' },
    DOUBLE_DAY: { color: 'text-foreground-secondary', icon: Activity, label: 'Double Day' },
    OTHER: { color: 'text-foreground-muted', icon: Activity, label: 'Other' },
    RACE: { color: 'text-workout-race', icon: Flag, label: 'Race' },
};

export const RUN_TYPES = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'];
export const SWIM_TYPES = ['SWIM', 'SWIM_DRILL', 'OPEN_WATER_SWIM'];

export function getPhase(weeksUntilRace: number, options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }) {
    const taperWeeks = options?.taperWeeks ?? 0;
    const peakWeeks = options?.peakWeeks ?? 0;
    const buildWeeks = options?.buildWeeks ?? 0;

    if (weeksUntilRace === 1) return { name: 'RACE WEEK', color: 'text-workout-interval border-workout-interval/40 bg-workout-interval/10' };
    if (taperWeeks > 0 && weeksUntilRace <= taperWeeks) return { name: 'TAPER', color: 'text-workout-recovery border-workout-recovery/40 bg-workout-recovery/10' };
    if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return { name: 'PEAK', color: 'text-workout-long-run border-workout-long-run/40 bg-workout-long-run/10' };
    if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return { name: 'BUILD', color: 'text-accent-orange border-accent-orange/40 bg-accent-orange/10' };
    return { name: 'BASE', color: 'text-accent-blue border-accent-blue/40 bg-accent-blue/10' };
}

// Helper function to format running pace (min/km)
export function formatPace(distanceMeters: number, timeSeconds: number): string {
    if (distanceMeters <= 0 || timeSeconds <= 0) return '-';
    const paceSecsPerKm = timeSeconds / (distanceMeters / 1000);
    const mins = Math.floor(paceSecsPerKm / 60);
    const secs = Math.round(paceSecsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

// Helper function to format swimming pace (min/100m)
export function formatSwimmingPace(distanceMeters: number, timeSeconds: number): string {
    if (distanceMeters <= 0 || timeSeconds <= 0) return '-';
    const paceSecsPer100m = timeSeconds / (distanceMeters / 100);
    const mins = Math.floor(paceSecsPer100m / 60);
    const secs = Math.round(paceSecsPer100m % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
}

// Helper to format duration like 1:30 or 0:45
export function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}
