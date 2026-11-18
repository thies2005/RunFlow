'use client';

import { useMemo } from 'react';
import type { ActivityListItem, Activity } from '@/lib/types';
import {
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
    calculateCogganPowerZones,
    calculateCyclingVo2Max,
} from '@/lib/metrics/power';

export interface CogganZoneEntry {
    name: string;
    label: string;
    color: string;
    textColor: string;
    time: number;
    minW: number;
    maxW: number | null;
    pctRange: string;
}

export interface ActivityPowerMetrics {
    ftp: number;
    npWatts: number | null;
    avgWatts: number | null;
    maxWatts: number | null;
    intensityFactor: number | null;
    variabilityIndex: number | null;
    bikeTss: number | null;
    kilojoules: number | null;
    deviceWatts: boolean;
    efficiencyFactor: number | null;
    decouplingPct: number | null;
    wPerKg: number | null;
    cyclingVo2max: number | null;
    cogganZones: CogganZoneEntry[];
    totalPowerZoneSec: number;
    activePowerZones: CogganZoneEntry[];
}

export interface PowerStreamPoint {
    timeSec: number;
    timeFormatted: string;
    watts: number;
}

export function useActivityPowerMetrics(params: {
    activity: ActivityListItem | null;
    detailedActivity: Activity | null;
    cyclingSettings: { weightKg: number | null; ftpWatts: number | null } | null;
    name: string;
    userHrMax?: number;
}): {
    powerMetrics: ActivityPowerMetrics | null;
    powerStreamData: PowerStreamPoint[];
} {
    const { activity, detailedActivity, cyclingSettings, name, userHrMax } = params;

    const powerMetrics = useMemo(() => {
        if (!activity) return null;
        const det = detailedActivity as any;
        const act = activity as any;

        const titleMatch = (name || activity.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
        const titleWatts = titleMatch ? parseInt(titleMatch[1], 10) : null;
        const validTitleWatts = titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null;

        let npWatts: number | null = det?.npWatts ?? act?.npWatts ?? det?.weightedAverageWatts ?? act?.weightedAverageWatts ?? validTitleWatts ?? null;
        let avgWatts: number | null = det?.averageWatts ?? act?.averageWatts ?? validTitleWatts ?? null;
        const maxWatts: number | null = det?.maxWatts ?? act?.maxWatts ?? null;
        let intensityFactor: number | null = det?.intensityFactor ?? act?.intensityFactor ?? null;
        let variabilityIndex: number | null = det?.variabilityIndex ?? act?.variabilityIndex ?? (npWatts && avgWatts && avgWatts > 0 ? Number((npWatts / avgWatts).toFixed(2)) : null);
        let bikeTss: number | null = det?.bikeTss ?? act?.bikeTss ?? null;
        let kilojoules: number | null = det?.kilojoules ?? act?.kilojoules ?? null;
        const deviceWatts: boolean = Boolean(det?.deviceWatts ?? act?.deviceWatts ?? validTitleWatts);
        let efficiencyFactor: number | null = det?.efficiencyFactor ?? act?.efficiencyFactor ?? (npWatts && (activity.averageHr || det?.averageHr) ? Number((npWatts / (activity.averageHr || det?.averageHr)).toFixed(2)) : null);
        let decouplingPct: number | null = det?.aerobicDecoupling ?? act?.aerobicDecoupling ?? null;

        let pz1 = det?.powerZone1Time ?? act?.powerZone1Time ?? null;
        let pz2 = det?.powerZone2Time ?? act?.powerZone2Time ?? null;
        let pz3 = det?.powerZone3Time ?? act?.powerZone3Time ?? null;
        let pz4 = det?.powerZone4Time ?? act?.powerZone4Time ?? null;
        let pz5 = det?.powerZone5Time ?? act?.powerZone5Time ?? null;
        let pz6 = det?.powerZone6Time ?? act?.powerZone6Time ?? null;
        let pz7 = det?.powerZone7Time ?? act?.powerZone7Time ?? null;

        const ftp = cyclingSettings?.ftpWatts || validTitleWatts || 220;
        let streamsObj: any = det?.streams;
        if (typeof streamsObj === 'string') {
            try { streamsObj = JSON.parse(streamsObj); } catch { streamsObj = null; }
        }
        const wattsStream: number[] | undefined = Array.isArray(streamsObj?.watts) ? streamsObj.watts : undefined;
        const timeStream: number[] | undefined = Array.isArray(streamsObj?.time) ? streamsObj.time : undefined;
        const hrStream: number[] | undefined = Array.isArray(streamsObj?.heartrate) ? streamsObj.heartrate : undefined;

        if (wattsStream && wattsStream.length > 0) {
            if (det?.npWatts == null) {
                const computedNp = calculateNormalizedPower(wattsStream);
                if (computedNp != null) npWatts = computedNp;
            }
            if (pz1 == null || det?.powerZone1Time == null) {
                const computedZones = calculatePowerZoneTimes(wattsStream, timeStream, ftp);
                pz1 = computedZones[0] ?? 0;
                pz2 = computedZones[1] ?? 0;
                pz3 = computedZones[2] ?? 0;
                pz4 = computedZones[3] ?? 0;
                pz5 = computedZones[4] ?? 0;
                pz6 = computedZones[5] ?? 0;
                pz7 = computedZones[6] ?? 0;
            }
            if (decouplingPct == null && hrStream && hrStream.length > 0) {
                decouplingPct = calculateAerobicDecoupling(wattsStream, hrStream, timeStream);
            }
        }

        const movingTime = det?.movingTime ?? act?.movingTime ?? (timeStream ? timeStream[timeStream.length - 1] - timeStream[0] : 0);
        if (intensityFactor == null && npWatts != null && ftp > 0) {
            intensityFactor = calculateIntensityFactor(npWatts, ftp);
        }
        if (bikeTss == null && npWatts != null && ftp > 0 && movingTime > 0) {
            const ifFactor = intensityFactor ?? (npWatts / ftp);
            bikeTss = calculateBikeTss(movingTime, npWatts, ifFactor, ftp);
        }
        if (kilojoules == null && avgWatts != null && movingTime > 0) {
            kilojoules = Math.round((avgWatts * movingTime) / 1000);
        }
        if (variabilityIndex == null && npWatts != null && avgWatts && avgWatts > 0) {
            variabilityIndex = calculateVariabilityIndex(npWatts, avgWatts);
        }
        if (efficiencyFactor == null && npWatts != null && (activity.averageHr || det?.averageHr)) {
            efficiencyFactor = calculateEfficiencyFactor(npWatts, activity.averageHr || det?.averageHr);
        }

        const athleteWeight = cyclingSettings?.weightKg || null;
        const wPerKg: number | null = (avgWatts && athleteWeight && athleteWeight > 0) ? Number((avgWatts / athleteWeight).toFixed(2)) : null;
        const cogganDefinitions = calculateCogganPowerZones(ftp, athleteWeight);
        const cyclingVo2max = calculateCyclingVo2Max({
            ftpWatts: ftp,
            rideWatts: npWatts ?? avgWatts,
            weightKg: athleteWeight,
            avgHr: activity.averageHr || det?.averageHr,
            maxHr: userHrMax || activity.maxHr,
        });

        const cogganZones: CogganZoneEntry[] = [
            { name: 'Z1', label: 'Active Recovery', color: 'bg-emerald-500', textColor: 'text-emerald-500', time: pz1 ?? 0, minW: cogganDefinitions[0]?.minWatts ?? 0, maxW: cogganDefinitions[0]?.maxWatts ?? null, pctRange: '<55% FTP' },
            { name: 'Z2', label: 'Endurance', color: 'bg-blue-500', textColor: 'text-blue-500', time: pz2 ?? 0, minW: cogganDefinitions[1]?.minWatts ?? 0, maxW: cogganDefinitions[1]?.maxWatts ?? null, pctRange: '56–75% FTP' },
            { name: 'Z3', label: 'Tempo', color: 'bg-cyan-500', textColor: 'text-cyan-500', time: pz3 ?? 0, minW: cogganDefinitions[2]?.minWatts ?? 0, maxW: cogganDefinitions[2]?.maxWatts ?? null, pctRange: '76–90% FTP' },
            { name: 'Z4', label: 'Threshold', color: 'bg-amber-500', textColor: 'text-amber-500', time: pz4 ?? 0, minW: cogganDefinitions[3]?.minWatts ?? 0, maxW: cogganDefinitions[3]?.maxWatts ?? null, pctRange: '91–105% FTP' },
            { name: 'Z5', label: 'VO2max', color: 'bg-orange-500', textColor: 'text-orange-500', time: pz5 ?? 0, minW: cogganDefinitions[4]?.minWatts ?? 0, maxW: cogganDefinitions[4]?.maxWatts ?? null, pctRange: '106–120% FTP' },
            { name: 'Z6', label: 'Anaerobic', color: 'bg-workout-long-run', textColor: 'text-workout-long-run', time: pz6 ?? 0, minW: cogganDefinitions[5]?.minWatts ?? 0, maxW: cogganDefinitions[5]?.maxWatts ?? null, pctRange: '121–150% FTP' },
            { name: 'Z7', label: 'Neuromuscular', color: 'bg-rose-500', textColor: 'text-rose-500', time: pz7 ?? 0, minW: cogganDefinitions[6]?.minWatts ?? 0, maxW: cogganDefinitions[6]?.maxWatts ?? null, pctRange: '>150% FTP' },
        ];
        const totalPowerZoneSec = cogganZones.reduce((sum, z) => sum + z.time, 0);
        const activePowerZones = cogganZones.filter(z => z.time > 0);

        return {
            ftp,
            npWatts,
            avgWatts,
            maxWatts,
            intensityFactor,
            variabilityIndex,
            bikeTss,
            kilojoules,
            deviceWatts,
            efficiencyFactor,
            decouplingPct,
            wPerKg,
            cyclingVo2max,
            cogganZones,
            totalPowerZoneSec,
            activePowerZones,
        };
    }, [activity, detailedActivity, cyclingSettings, name, userHrMax]);

    const powerStreamData = useMemo(() => {
        const streams = (detailedActivity as any)?.streams;
        if (!streams?.time || !streams?.watts) return [];
        const len = streams.time.length;
        const step = len > 500 ? Math.ceil(len / 500) : 1;
        const pts: PowerStreamPoint[] = [];
        for (let i = 0; i < len; i += step) {
            const t = streams.time[i];
            const mins = Math.floor(t / 60);
            const w = streams.watts[i] ?? 0;
            pts.push({
                timeSec: t,
                timeFormatted: `${mins}m`,
                watts: w,
            });
        }
        return pts;
    }, [detailedActivity]);

    return { powerMetrics, powerStreamData };
}
