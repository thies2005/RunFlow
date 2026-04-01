import { Activity, Clock, Zap, Bike, Mountain, Flag, Dumbbell, Waves, LucideIcon } from 'lucide-react';

export const workoutStyles: Record<string, { color: string, icon: LucideIcon, label: string }> = {
    EASY: { color: 'text-green-400', icon: Activity, label: 'Easy Run' },
    LONG_RUN: { color: 'text-blue-400', icon: Mountain, label: 'Long Run' },
    TEMPO: { color: 'text-yellow-400', icon: Zap, label: 'Tempo' },
    INTERVALS: { color: 'text-red-400', icon: Zap, label: 'Intervals' },
    RECOVERY: { color: 'text-teal-400', icon: Activity, label: 'Recovery' },
    REST: { color: 'text-gray-500', icon: Clock, label: 'Rest Day' },
    RIDE: { color: 'text-orange-400', icon: Bike, label: 'Bike Ride' },
    SWIM: { color: 'text-cyan-400', icon: Waves, label: 'Swim' },
    STRENGTH: { color: 'text-pink-400', icon: Dumbbell, label: 'Strength' },
    OTHER: { color: 'text-gray-400', icon: Activity, label: 'Other' },
    RACE: { color: 'text-purple-400', icon: Flag, label: 'Race' },
};

export const RUN_TYPES = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE', 'REPETITIONS'];
export const SWIM_TYPES = ['SWIM'];

export function getPhase(weeksUntilRace: number, options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }) {
    const taperWeeks = options?.taperWeeks ?? 0;
    const peakWeeks = options?.peakWeeks ?? 0;
    const buildWeeks = options?.buildWeeks ?? 0;

    if (taperWeeks > 0 && weeksUntilRace <= taperWeeks) return { name: 'TAPER', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' };
    if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return { name: 'PEAK', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
    if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return { name: 'BUILD', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
    return { name: 'BASE', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
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

