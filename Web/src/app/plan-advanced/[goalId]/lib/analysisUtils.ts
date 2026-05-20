import { startOfWeek, format } from 'date-fns';

type Workout = {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    targetDistance: number | null;
    targetDuration: number | null;
    targetHrZone: number | null;
    phase: string;
};

export const PHASE_COLORS: Record<string, string> = {
    BASE: '#3b82f6',
    BUILD: '#f97316',
    PEAK: '#ef4444',
    TAPER: '#22c55e',
    RACE_WEEK: '#a855f7',
    RECOVERY: '#06b6d4',
    ENDURANCE: '#2563eb',
    MENTAL_PREP: '#7c3aed',
    TUNE_UP: '#f59e0b',
    MAINTAIN: '#6b7280',
    OFF: '#6b7280',
};

export const ZONE_COLORS: Record<number, string> = {
    1: '#4ade80',
    2: '#a3e635',
    3: '#facc15',
    4: '#fb923c',
    5: '#ef4444',
};

const RUN_TYPES = new Set([
    'LONG_RUN', 'FARTLEK', 'TEMPO', 'EASY', 'RECOVERY', 'INTERVALS', 'REPETITIONS', 'RACE',
]);

const BIKE_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS']);

const SWIM_TYPES = new Set(['SWIM', 'OPEN_WATER_SWIM', 'SWIM_DRILL']);

function getModality(type: string): 'run' | 'bike' | 'swim' | 'strength' | 'other' {
    if (RUN_TYPES.has(type)) return 'run';
    if (BIKE_TYPES.has(type)) return 'bike';
    if (SWIM_TYPES.has(type)) return 'swim';
    if (type === 'STRENGTH') return 'strength';
    return 'other';
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
    EASY: '#3b82f6',
    LONG_RUN: '#22c55e',
    TEMPO: '#f97316',
    INTERVALS: '#eab308',
    FARTLEK: '#f59e0b',
    REPETITIONS: '#ef4444',
    RECOVERY: '#06b6d4',
    RACE: '#a855f7',
    RIDE: '#14b8a6',
    SWIM: '#6366f1',
    STRENGTH: '#ec4899',
    CROSS_TRAIN: '#84cc16',
    OTHER: '#64748b',
    BRICK: '#8b5cf6',
    OPEN_WATER_SWIM: '#0ea5e9',
    LONG_RIDE: '#10b981',
    RIDE_INTERVALS: '#14b8a6',
    SWIM_DRILL: '#60a5fa',
    TRANSITION_PRACTICE: '#d946ef',
    DOUBLE_DAY: '#fb7185',
};

export function workoutTypeDistribution(workouts: Workout[]): WorkoutTypeSlice[] {
    const counts = new Map<string, number>();
    for (const w of workouts) {
        if (w.workoutType === 'REST') continue;
        counts.set(w.workoutType, (counts.get(w.workoutType) || 0) + 1);
    }

    let entries = Array.from(counts.entries())
        .map(([type, count]) => ({ type, count, color: WORKOUT_HEX_COLORS[type] || '#64748b' }))
        .sort((a, b) => b.count - a.count);

    const total = entries.reduce((s, e) => s + e.count, 0);

    if (entries.length > 8) {
        const top = entries.slice(0, 7);
        const otherEntries = entries.slice(7);
        const otherCount = otherEntries.reduce((s, e) => s + e.count, 0);
        top.push({ type: 'Other', count: otherCount, color: '#64748b' });
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
                color: PHASE_COLORS[currentPhase] || '#6b7280',
            });
            currentPhase = weekPhase;
            startLabel = weeks[i].weekLabel;
        }
    }

    bands.push({
        startLabel,
        endLabel: weeks[weeks.length - 1].weekLabel,
        phase: currentPhase,
        color: PHASE_COLORS[currentPhase] || '#6b7280',
    });

    return bands;
}
