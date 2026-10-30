import { startOfWeek, format } from 'date-fns';

export interface WorkoutItem {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    targetDistance: number | null;
    targetDuration: number | null;
    targetHrZone: number | null;
    phase: string;
    sport?: string | null;
    isCompleted?: boolean;
    plannedTss?: number | null;
    targetPowerWatts?: number | null;
    targetPowerMinWatts?: number | null;
    targetPowerMaxWatts?: number | null;
    targetFtpPercent?: number | null;
    structuredSteps?: any;
    linkedActivity?: {
        distance?: number | null;
        movingTime?: number | null;
        trimp?: number | null;
        runningTss?: number | null;
        bikeTss?: number | null;
    } | null;
}

export type Workout = WorkoutItem;

export const PHASE_COLORS: Record<string, string> = {
    BASE: '#1f4fa8',
    BUILD: '#b45309',
    PEAK: '#c0392f',
    TAPER: '#2e7d5b',
    RACE_WEEK: '#7a52be',
    RECOVERY: '#2e7d5b',
    ENDURANCE: '#1f4fa8',
    MENTAL_PREP: '#7a52be',
    TUNE_UP: '#b45309',
    MAINTAIN: '#6e747b',
    OFF: '#6e747b',
};

export const ZONE_COLORS: Record<number, string> = {
    1: '#2e7d5b',
    2: '#65a30d',
    3: '#b45309',
    4: '#c2410c',
    5: '#c0392f',
};

const RUN_TYPES = new Set([
    'LONG_RUN', 'FARTLEK', 'TEMPO', 'EASY', 'RECOVERY', 'INTERVALS', 'REPETITIONS', 'RACE',
]);

const BIKE_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

const SWIM_TYPES = new Set(['SWIM', 'OPEN_WATER_SWIM', 'SWIM_DRILL']);

function getModality(type: string, sport?: string | null): 'run' | 'bike' | 'swim' | 'strength' | 'other' {
    const sp = (sport || '').toUpperCase();
    if (sp === 'BIKE' || BIKE_TYPES.has(type)) return 'bike';
    if (sp === 'RUN' || RUN_TYPES.has(type)) return 'run';
    if (sp === 'SWIM' || SWIM_TYPES.has(type)) return 'swim';
    if (sp === 'STRENGTH' || type === 'STRENGTH') return 'strength';
    return 'other';
}

function estimateFallbackTss(w: WorkoutItem): number {
    if (w.plannedTss && w.plannedTss > 0) return w.plannedTss;
    const durSec = w.targetDuration ?? (w.targetDistance ? (w.targetDistance / 1000) * 330 : 0);
    if (!durSec || durSec <= 0) return 0;
    const hours = durSec / 3600;
    const mod = getModality(w.workoutType, w.sport);
    let intensityFactor = 0.75;
    if (['INTERVALS', 'REPETITIONS', 'RIDE_INTERVALS'].includes(w.workoutType)) {
        intensityFactor = 0.92;
    } else if (['TEMPO', 'FARTLEK', 'BRICK'].includes(w.workoutType)) {
        intensityFactor = 0.85;
    } else if (['LONG_RUN', 'LONG_RIDE'].includes(w.workoutType)) {
        intensityFactor = 0.72;
    } else if (mod === 'strength') {
        intensityFactor = 0.6;
    }
    return Math.round(hours * Math.pow(intensityFactor, 2) * 100);
}

export interface WeekGroup {
    weekStart: Date;
    weekLabel: string;
    workouts: Workout[];
}

export function groupByIsoWeek(workouts: Workout[]): WeekGroup[] {
    const weekMap = new Map<string, Workout[]>();

    for (const w of workouts) {
        const d = new Date(w.scheduledDate);
        if (isNaN(d.getTime())) continue;
        const monday = startOfWeek(d, { weekStartsOn: 1 });
        const key = monday.toISOString().split('T')[0];
        if (!weekMap.has(key)) weekMap.set(key, []);
        weekMap.get(key)!.push(w);
    }

    return Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_key, weekWorkouts], index) => {
            const monday = new Date(weekWorkouts[0].scheduledDate);
            const weekStart = startOfWeek(monday, { weekStartsOn: 1 });
            const weekLabel = `W${index + 1} ${format(weekStart, 'M/d')}`;
            return { weekStart, weekLabel, workouts: weekWorkouts };
        });
}

export interface WeeklyVolumePoint {
    label: string;
    km: number;
    phase: string;
}

export function weeklyRunningVolume(weeks: WeekGroup[]): WeeklyVolumePoint[] {
    return weeks.map((week) => {
        const runWorkouts = week.workouts.filter((w) => RUN_TYPES.has(w.workoutType));
        const km = runWorkouts.reduce((sum, w) => sum + (w.targetDistance ?? 0), 0) / 1000;

        const phaseCounts = new Map<string, number>();
        for (const w of runWorkouts) {
            const p = w.phase || 'BASE';
            phaseCounts.set(p, (phaseCounts.get(p) || 0) + 1);
        }
        let phase = 'BASE';
        let maxCount = 0;
        for (const [p, count] of phaseCounts) {
            if (count > maxCount) {
                maxCount = count;
                phase = p;
            }
        }

        return { label: week.weekLabel, km: Math.round(km * 10) / 10, phase };
    });
}

export interface LongRunPoint {
    date: string;
    km: number;
    phase: string;
}

export function longRunProgression(workouts: Workout[]): LongRunPoint[] {
    return workouts
        .filter((w) => w.workoutType === 'LONG_RUN' && (w.targetDistance ?? 0) > 0)
        .map((w) => {
            const d = new Date(w.scheduledDate);
            return {
                date: isNaN(d.getTime()) ? '' : format(d, 'M/d'),
                km: Math.round(((w.targetDistance ?? 0) / 1000) * 10) / 10,
                phase: w.phase || 'BASE',
            };
        })
        .filter((p) => p.date !== '');
}

export interface WeeklyLoadPoint {
    label: string;
    run: number;
    bike: number;
    swim: number;
    strength: number;
}

export function weeklyLoadByModality(weeks: WeekGroup[]): WeeklyLoadPoint[] {
    return weeks.map((week) => {
        let run = 0, bike = 0, swim = 0, strength = 0;
        for (const w of week.workouts) {
            const modality = getModality(w.workoutType);
            const hours = (w.targetDuration ?? 0) / 3600;
            switch (modality) {
                case 'run': run += hours; break;
                case 'bike': bike += hours; break;
                case 'swim': swim += hours; break;
                case 'strength': strength += hours; break;
            }
        }
        return {
            label: week.weekLabel,
            run: Math.round(run * 10) / 10,
            bike: Math.round(bike * 10) / 10,
            swim: Math.round(swim * 10) / 10,
            strength: Math.round(strength * 10) / 10,
        };
    });
}

export interface WorkoutTypeSlice {
    type: string;
    count: number;
    pct: number;
    color: string;
}

const WORKOUT_HEX_COLORS: Record<string, string> = {
    EASY: '#6e747b',
    LONG_RUN: '#2e7d5b',
    TEMPO: '#b45309',
    INTERVALS: '#c0392f',
    FARTLEK: '#b45309',
    REPETITIONS: '#c0392f',
    RECOVERY: '#2e7d5b',
    RACE: '#7a52be',
    RIDE: '#2e7d5b',
    SWIM: '#1f4fa8',
    STRENGTH: '#1f4fa8',
    CROSS_TRAIN: '#6e747b',
    OTHER: '#6e747b',
    BRICK: '#7a52be',
    OPEN_WATER_SWIM: '#1f4fa8',
    LONG_RIDE: '#2e7d5b',
    RIDE_INTERVALS: '#2e7d5b',
    SWIM_DRILL: '#1f4fa8',
    TRANSITION_PRACTICE: '#7a52be',
    DOUBLE_DAY: '#c0392f',
};

export function workoutTypeDistribution(workouts: Workout[]): WorkoutTypeSlice[] {
    const counts = new Map<string, number>();
    for (const w of workouts) {
        if (w.workoutType === 'REST') continue;
        counts.set(w.workoutType, (counts.get(w.workoutType) || 0) + 1);
    }

    let entries = Array.from(counts.entries())
        .map(([type, count]) => ({ type, count, color: WORKOUT_HEX_COLORS[type] || '#6e747b' }))
        .sort((a, b) => b.count - a.count);

    const total = entries.reduce((s, e) => s + e.count, 0);

    if (entries.length > 8) {
        const top = entries.slice(0, 7);
        const otherEntries = entries.slice(7);
        const otherCount = otherEntries.reduce((s, e) => s + e.count, 0);
        top.push({ type: 'Other', count: otherCount, color: '#6e747b' });
        entries = top;
    }

    return entries.map((e) => ({
        ...e,
        pct: total > 0 ? Math.round((e.count / total) * 1000) / 10 : 0,
    }));
}

export interface HrZoneBar {
    zone: number;
    name: string;
    km: number;
    color: string;
}

const ZONE_NAMES: Record<number, string> = {
    1: 'Zone 1 (Easy)',
    2: 'Zone 2 (Aerobic)',
    3: 'Zone 3 (Tempo)',
    4: 'Zone 4 (Threshold)',
    5: 'Zone 5 (VO2max)',
};

export function hrZoneDistribution(workouts: Workout[]): HrZoneBar[] {
    const zoneKm = new Map<number, number>();
    for (let z = 1; z <= 5; z++) zoneKm.set(z, 0);

    for (const w of workouts) {
        if (!RUN_TYPES.has(w.workoutType)) continue;
        if (w.targetHrZone == null || w.targetHrZone <= 0) continue;
        const km = (w.targetDistance ?? 0) / 1000;
        if (km > 0) {
            zoneKm.set(w.targetHrZone, (zoneKm.get(w.targetHrZone) || 0) + km);
        }
    }

    return Array.from(zoneKm.entries()).map(([zone, km]) => ({
        zone,
        name: ZONE_NAMES[zone],
        km: Math.round(km * 10) / 10,
        color: ZONE_COLORS[zone],
    }));
}

export interface PhaseBand {
    startLabel: string;
    endLabel: string;
    phase: string;
    color: string;
}

export function computePhaseBands(weeks: WeekGroup[]): PhaseBand[] {
    if (weeks.length === 0) return [];

    const bands: PhaseBand[] = [];
    let currentPhase = weeks[0].workouts[0]?.phase || 'BASE';
    let startLabel = weeks[0].weekLabel;

    for (let i = 1; i < weeks.length; i++) {
        const weekPhase = weeks[i].workouts[0]?.phase || 'BASE';
        if (weekPhase !== currentPhase) {
            bands.push({
                startLabel,
                endLabel: weeks[i - 1].weekLabel,
                phase: currentPhase,
                color: PHASE_COLORS[currentPhase] || '#6e747b',
            });
            currentPhase = weekPhase;
            startLabel = weeks[i].weekLabel;
        }
    }

    bands.push({
        startLabel,
        endLabel: weeks[weeks.length - 1].weekLabel,
        phase: currentPhase,
        color: PHASE_COLORS[currentPhase] || '#6e747b',
    });

    return bands;
}

export interface WeeklyTssPoint {
    weekLabel: string;
    phase: string;
    plannedTss: number;
    actualTss: number;
    bikeTss: number;
    runTss: number;
    strengthTss: number;
    swimTss: number;
}

export function weeklyTssProgression(weeks: WeekGroup[]): WeeklyTssPoint[] {
    return weeks.map((week) => {
        let plannedTss = 0;
        let actualTss = 0;
        let bikeTss = 0;
        let runTss = 0;
        let strengthTss = 0;
        let swimTss = 0;

        const phaseCounts = new Map<string, number>();

        for (const w of week.workouts) {
            if (w.workoutType === 'REST') continue;
            const p = w.phase || 'BASE';
            phaseCounts.set(p, (phaseCounts.get(p) || 0) + 1);

            const wTss = w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateFallbackTss(w);
            plannedTss += wTss;

            const mod = getModality(w.workoutType, w.sport);
            if (mod === 'bike') bikeTss += wTss;
            else if (mod === 'run') runTss += wTss;
            else if (mod === 'strength') strengthTss += wTss;
            else if (mod === 'swim') swimTss += wTss;

            if (w.isCompleted) {
                const actTss =
                    w.linkedActivity?.bikeTss ||
                    w.linkedActivity?.runningTss ||
                    w.linkedActivity?.trimp ||
                    wTss;
                actualTss += actTss;
            }
        }

        let phase = 'BASE';
        let maxCount = 0;
        for (const [p, count] of phaseCounts) {
            if (count > maxCount) {
                maxCount = count;
                phase = p;
            }
        }

        return {
            weekLabel: week.weekLabel,
            phase,
            plannedTss: Math.round(plannedTss),
            actualTss: Math.round(actualTss),
            bikeTss: Math.round(bikeTss),
            runTss: Math.round(runTss),
            strengthTss: Math.round(strengthTss),
            swimTss: Math.round(swimTss),
        };
    });
}

export interface WeeklyCyclingVolumePoint {
    weekLabel: string;
    phase: string;
    km: number;
    actualKm: number;
    hours: number;
    rideCount: number;
}

export function weeklyCyclingVolume(weeks: WeekGroup[]): WeeklyCyclingVolumePoint[] {
    return weeks.map((week) => {
        let km = 0;
        let actualKm = 0;
        let totalSec = 0;
        let rideCount = 0;
        const phaseCounts = new Map<string, number>();

        for (const w of week.workouts) {
            const isBike = w.sport === 'BIKE' || BIKE_TYPES.has(w.workoutType);
            if (!isBike || w.workoutType === 'REST') continue;

            rideCount++;
            const p = w.phase || 'BASE';
            phaseCounts.set(p, (phaseCounts.get(p) || 0) + 1);

            let rideKm = 0;
            if (w.targetDistance && w.targetDistance > 0) {
                rideKm = w.targetDistance / 1000;
            } else if (w.targetDuration && w.targetDuration > 0) {
                let estSpeedKmh = 28;
                if (['RIDE_INTERVALS', 'BIKE_INTERVALS'].includes(w.workoutType)) {
                    estSpeedKmh = 32;
                } else if (w.workoutType === 'BIKE_TEMPO' || w.workoutType === 'TEMPO') {
                    estSpeedKmh = 31;
                } else if (w.workoutType === 'LONG_RIDE') {
                    estSpeedKmh = 29;
                } else if (w.targetPowerWatts && w.targetPowerWatts > 0) {
                    estSpeedKmh = Math.max(24, Math.min(38, 20 + w.targetPowerWatts / 20));
                }
                rideKm = (w.targetDuration / 3600) * estSpeedKmh;
            }

            km += rideKm;
            totalSec += w.targetDuration || 0;

            if (w.isCompleted) {
                const actDist =
                    w.linkedActivity?.distance && w.linkedActivity.distance > 0
                        ? w.linkedActivity.distance / 1000
                        : rideKm;
                actualKm += actDist;
            }
        }

        let phase = 'BASE';
        let maxCount = 0;
        for (const [p, count] of phaseCounts) {
            if (count > maxCount) {
                maxCount = count;
                phase = p;
            }
        }

        return {
            weekLabel: week.weekLabel,
            phase,
            km: Math.round(km * 10) / 10,
            actualKm: Math.round(actualKm * 10) / 10,
            hours: Math.round((totalSec / 3600) * 10) / 10,
            rideCount,
        };
    });
}

export interface PowerZoneBar {
    zone: number;
    name: string;
    hours: number;
    color: string;
}

export const POWER_ZONE_COLORS: Record<number, string> = {
    1: '#94a3b8',
    2: '#3b82f6',
    3: '#10b981',
    4: '#f59e0b',
    5: '#ef4444',
    6: '#8b5cf6',
};

const POWER_ZONE_NAMES: Record<number, string> = {
    1: 'Z1 Active Recovery',
    2: 'Z2 Endurance',
    3: 'Z3 Tempo',
    4: 'Z4 Threshold',
    5: 'Z5 VO2max',
    6: 'Z6 Anaerobic',
};

export function powerZoneDistribution(workouts: WorkoutItem[]): PowerZoneBar[] {
    const zoneHours = new Map<number, number>();
    for (let z = 1; z <= 6; z++) zoneHours.set(z, 0);

    for (const w of workouts) {
        const isBike = w.sport === 'BIKE' || BIKE_TYPES.has(w.workoutType);
        if (!isBike) continue;
        const durHours = (w.targetDuration ?? 0) / 3600;
        if (durHours <= 0) continue;

        let z = 2;
        if (w.workoutType === 'RIDE_INTERVALS') z = 4;
        else if (w.workoutType === 'RECOVERY') z = 1;
        else if (w.workoutType === 'LONG_RIDE') z = 2;
        else if (w.workoutType === 'TEMPO') z = 3;

        if (w.targetPowerWatts && w.targetPowerWatts > 0) {
            if (w.targetFtpPercent && w.targetFtpPercent > 0) {
                const pct = w.targetFtpPercent;
                if (pct <= 55) z = 1;
                else if (pct <= 75) z = 2;
                else if (pct <= 90) z = 3;
                else if (pct <= 105) z = 4;
                else if (pct <= 120) z = 5;
                else z = 6;
            }
        }

        zoneHours.set(z, (zoneHours.get(z) || 0) + durHours);
    }

    return Array.from(zoneHours.entries()).map(([zone, hours]) => ({
        zone,
        name: POWER_ZONE_NAMES[zone],
        hours: Math.round(hours * 10) / 10,
        color: POWER_ZONE_COLORS[zone],
    }));
}
