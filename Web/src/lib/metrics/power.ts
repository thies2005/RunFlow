/**
 * Cycling Power Engine
 *
 * Implements Coggan 7 power zones, Normalized Power (NP), Intensity Factor (IF),
 * Variability Index (VI), Bike TSS, Mean Maximal Power (MMP) curve,
 * automatic eFTP estimation, Aerobic Efficiency Factor (EF), and Aerobic Decoupling (Pw:HR).
 */

export interface CogganPowerZone {
    zone: number;
    name: string;
    minWatts: number;
    maxWatts: number;
    minWkg: number | null;
    maxWkg: number | null;
}

export const STANDARD_POWER_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

/**
 * Calculates Coggan 7-zone power distribution based on Functional Threshold Power (FTP).
 *
 * Z1 Active Recovery: <= 55%
 * Z2 Endurance: 56 - 75%
 * Z3 Tempo: 76 - 90%
 * Z4 Lactate Threshold: 91 - 105%
 * Z5 VO2max: 106 - 120%
 * Z6 Anaerobic Capacity: 121 - 150%
 * Z7 Neuromuscular Power: > 150%
 */
export function calculateCogganPowerZones(
    ftpWatts: number,
    weightKg?: number | null
): CogganPowerZone[] {
    if (!ftpWatts || ftpWatts <= 0) {
        return [];
    }

    const weight = weightKg && weightKg > 0 ? weightKg : null;

    const z1Max = Math.round(ftpWatts * 0.55);
    const z2Max = Math.round(ftpWatts * 0.75);
    const z3Max = Math.round(ftpWatts * 0.90);
    const z4Max = Math.round(ftpWatts * 1.05);
    const z5Max = Math.round(ftpWatts * 1.20);
    const z6Max = Math.round(ftpWatts * 1.50);

    const formatWkg = (watts: number | null): number | null => {
        if (watts === null || !weight) return null;
        return Number((watts / weight).toFixed(2));
    };

    return [
        {
            zone: 1,
            name: 'Active Recovery',
            minWatts: 0,
            maxWatts: z1Max,
            minWkg: 0,
            maxWkg: formatWkg(z1Max),
        },
        {
            zone: 2,
            name: 'Endurance',
            minWatts: z1Max + 1,
            maxWatts: z2Max,
            minWkg: formatWkg(z1Max + 1),
            maxWkg: formatWkg(z2Max),
        },
        {
            zone: 3,
            name: 'Tempo',
            minWatts: z2Max + 1,
            maxWatts: z3Max,
            minWkg: formatWkg(z2Max + 1),
            maxWkg: formatWkg(z3Max),
        },
        {
            zone: 4,
            name: 'Lactate Threshold',
            minWatts: z3Max + 1,
            maxWatts: z4Max,
            minWkg: formatWkg(z3Max + 1),
            maxWkg: formatWkg(z4Max),
        },
        {
            zone: 5,
            name: 'VO2max',
            minWatts: z4Max + 1,
            maxWatts: z5Max,
            minWkg: formatWkg(z4Max + 1),
            maxWkg: formatWkg(z5Max),
        },
        {
            zone: 6,
            name: 'Anaerobic Capacity',
            minWatts: z5Max + 1,
            maxWatts: z6Max,
            minWkg: formatWkg(z5Max + 1),
            maxWkg: formatWkg(z6Max),
        },
        {
            zone: 7,
            name: 'Neuromuscular Power',
            minWatts: z6Max + 1,
            maxWatts: 9999,
            minWkg: formatWkg(z6Max + 1),
            maxWkg: null,
        },
    ];
}

/**
 * Calculates Normalized Power (NP) from a watts stream and optional time stream.
 *
 * Algorithm:
 * 1. Calculate 30-second rolling average power.
 * 2. Raise each 30s rolling value to the 4th power.
 * 3. Calculate the mean of the 4th-power values.
 * 4. Take the 4th root of the mean.
 *
 * Fallback hierarchy: if stream < 30s or missing, falls back to fallbackWeightedAvg ?? fallbackAvg ?? null.
 */
export function calculateNormalizedPower(
    wattsStream?: number[] | null,
    timeStream?: number[] | null,
    fallbackWeightedAvg?: number | null,
    fallbackAvg?: number | null
): number | null {
    if (!wattsStream || wattsStream.length === 0) {
        return fallbackWeightedAvg ?? fallbackAvg ?? null;
    }

    const n = wattsStream.length;

    // If time stream is provided and valid, interpolate to a 1-second grid
    if (timeStream && timeStream.length === n && n > 1) {
        const t0 = timeStream[0];
        const tEnd = timeStream[n - 1];
        const totalDurationSec = tEnd - t0 + 1;

        if (totalDurationSec < 30) {
            return fallbackWeightedAvg ?? fallbackAvg ?? null;
        }

        const secWatts = new Float32Array(totalDurationSec);
        for (let i = 0; i < n; i++) {
            const startSec = Math.max(0, timeStream[i] - t0);
            const nextSec = (i < n - 1)
                ? Math.min(timeStream[i + 1] - t0, startSec + 30)
                : startSec + 1;
            const w = wattsStream[i];
            for (let s = startSec; s < nextSec && s < totalDurationSec; s++) {
                secWatts[s] = w;
            }
        }

        const prefix = new Float64Array(totalDurationSec + 1);
        for (let s = 0; s < totalDurationSec; s++) {
            prefix[s + 1] = prefix[s] + secWatts[s];
        }

        const rollingCount = totalDurationSec - 30 + 1;
        if (rollingCount <= 0) {
            return fallbackWeightedAvg ?? fallbackAvg ?? null;
        }

        let sum4th = 0;
        for (let s = 29; s < totalDurationSec; s++) {
            const rollingAvg = (prefix[s + 1] - prefix[s + 1 - 30]) / 30;
            sum4th += Math.pow(rollingAvg, 4);
        }

        const mean4th = sum4th / rollingCount;
        return Math.round(Math.pow(mean4th, 0.25));
    }

    // Default uniform 1Hz sampling assumption
    if (n < 30) {
        return fallbackWeightedAvg ?? fallbackAvg ?? null;
    }

    const prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + wattsStream[i];
    }

    const rollingCount = n - 30 + 1;
    let sum4th = 0;
    for (let i = 29; i < n; i++) {
        const rollingAvg = (prefix[i + 1] - prefix[i + 1 - 30]) / 30;
        sum4th += Math.pow(rollingAvg, 4);
    }

    const mean4th = sum4th / rollingCount;
    return Math.round(Math.pow(mean4th, 0.25));
}

/**
 * Calculates Intensity Factor (IF) = NP / FTP.
 */
export function calculateIntensityFactor(npWatts: number, ftpWatts: number): number | null {
    if (!npWatts || !ftpWatts || ftpWatts <= 0 || npWatts <= 0) {
        return null;
    }
    return Number((npWatts / ftpWatts).toFixed(3));
}

/**
 * Calculates Variability Index (VI) = NP / Average Power.
 */
export function calculateVariabilityIndex(npWatts: number, avgWatts: number): number | null {
    if (!avgWatts || avgWatts <= 0 || !npWatts || npWatts <= 0) {
        return null;
    }
    return Number((npWatts / avgWatts).toFixed(2));
}

/**
 * Calculates Cycling Training Stress Score (Bike TSS).
 * Formula: TSS = ((movingTimeSec * npWatts * IF) / (ftpWatts * 3600)) * 100
 */
export function calculateBikeTss(
    movingTimeSec: number,
    npWatts: number,
    ifFactor: number,
    ftpWatts: number
): number {
    if (!ftpWatts || ftpWatts <= 0 || !npWatts || npWatts <= 0 || !movingTimeSec || movingTimeSec <= 0 || !ifFactor || ifFactor <= 0) {
        return 0;
    }
    return Math.round(((movingTimeSec * npWatts * ifFactor) / (ftpWatts * 3600)) * 100);
}

/**
 * Calculates Mean Maximal Power (MMP) power curve across standard durations:
 * [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600] seconds.
 */
export function calculatePowerCurve(
    wattsStream: number[],
    timeStream?: number[]
): { durationSec: number; peakWatts: number }[] {
    if (!wattsStream || wattsStream.length === 0) {
        return [];
    }

    const n = wattsStream.length;
    let secWatts: Float32Array;
    let totalSec: number;

    if (timeStream && timeStream.length === n && n > 1) {
        const t0 = timeStream[0];
        const tEnd = timeStream[n - 1];
        totalSec = tEnd - t0 + 1;
        secWatts = new Float32Array(totalSec);
        for (let i = 0; i < n; i++) {
            const startSec = Math.max(0, timeStream[i] - t0);
            const nextSec = (i < n - 1)
                ? Math.min(timeStream[i + 1] - t0, startSec + 30)
                : startSec + 1;
            const w = wattsStream[i];
            for (let s = startSec; s < nextSec && s < totalSec; s++) {
                secWatts[s] = w;
            }
        }
    } else {
        totalSec = n;
        secWatts = new Float32Array(wattsStream);
    }

    const prefix = new Float64Array(totalSec + 1);
    for (let s = 0; s < totalSec; s++) {
        prefix[s + 1] = prefix[s] + secWatts[s];
    }

    const results: { durationSec: number; peakWatts: number }[] = [];

    for (const d of STANDARD_POWER_DURATIONS) {
        if (totalSec >= d) {
            let maxWindowSum = 0;
            for (let s = 0; s <= totalSec - d; s++) {
                const windowSum = prefix[s + d] - prefix[s];
                if (windowSum > maxWindowSum) {
                    maxWindowSum = windowSum;
                }
            }
            results.push({
                durationSec: d,
                peakWatts: Math.round(maxWindowSum / d),
            });
        }
    }

    return results;
}

/**
 * Calculates Critical Power from 300s (5m) and 1200s (20m) power peaks using the 2-parameter model:
 * CP = (W20 * 1200 - W5 * 300) / (1200 - 300) = (W20 * 1200 - W5 * 300) / 900
 */
export function calculateCriticalPower(peak300Watts: number, peak1200Watts: number): number {
    return Math.round((peak1200Watts * 1200 - peak300Watts * 300) / 900);
}

/**
 * Estimates FTP (eFTP) from power curve or fallback weighted average watts.
 *
 * Primary: 95% of 20-minute (1200s) peak power (or Critical Power 2-parameter model if options.useCriticalPower = true).
 * Fallback: 95% of weighted average watts on rides >= 20 minutes.
 */
export function estimateFtpFromPowerCurve(
    powerCurve: { durationSec: number; peakWatts: number }[],
    fallbackWeightedAvg?: number | null,
    options?: { useCriticalPower?: boolean }
): number | null {
    const peak1200 = powerCurve.find(p => p.durationSec === 1200)?.peakWatts;
    const peak300 = powerCurve.find(p => p.durationSec === 300)?.peakWatts;

    if (peak1200 && peak1200 > 0) {
        if (options?.useCriticalPower && peak300 && peak300 > 0) {
            const cp = calculateCriticalPower(peak300, peak1200);
            if (cp > 0 && cp <= peak1200) {
                return cp;
            }
        }
        return Math.round(0.95 * peak1200);
    }

    if (fallbackWeightedAvg && fallbackWeightedAvg > 0) {
        return Math.round(0.95 * fallbackWeightedAvg);
    }

    return null;
}

/**
 * Estimates cycling FTP from running VDOT.
 * Based on VO2max to cycling power relationship:
 * Power at VO2max (W/kg) ~ (VO2 - 7) / 10.8; FTP is ~75% of VO2max power.
 */
export function estimateBikeFtpFromVdot(vdot: number, weightKg: number = 70): number | null {
    if (!vdot || vdot <= 0 || weightKg <= 0) return null;
    const powerVo2PerKg = Math.max(0, (vdot - 7) / 10.8);
    const ftpPerKg = powerVo2PerKg * 0.75;
    return Math.round(ftpPerKg * weightKg);
}

/**
 * Calculates Aerobic Efficiency Factor (EF) = NP / Average HR.
 */
export function calculateEfficiencyFactor(npWatts: number, avgHr: number): number | null {
    if (!avgHr || avgHr <= 0 || !npWatts || npWatts <= 0) {
        return null;
    }
    return Number((npWatts / avgHr).toFixed(2));
}

/**
 * Calculates Aerobic Decoupling (Pw:HR %) by comparing first half to second half efficiency factors.
 * Decoupling % = ((EF1 - EF2) / EF1) * 100
 */
export function calculateAerobicDecoupling(
    wattsStream: number[],
    hrStream: number[],
    timeStream?: number[]
): number | null {
    if (!wattsStream || !hrStream || wattsStream.length < 60 || hrStream.length < 60) {
        return null;
    }

    const n = Math.min(wattsStream.length, hrStream.length);
    const mid = Math.floor(n / 2);

    const watts1 = wattsStream.slice(0, mid);
    const watts2 = wattsStream.slice(mid, n);
    const hr1 = hrStream.slice(0, mid);
    const hr2 = hrStream.slice(mid, n);

    const time1 = timeStream && timeStream.length >= n ? timeStream.slice(0, mid) : undefined;
    const time2 = timeStream && timeStream.length >= n ? timeStream.slice(mid, n) : undefined;

    const np1 = calculateNormalizedPower(watts1, time1);
    const np2 = calculateNormalizedPower(watts2, time2);

    const validHr1 = hr1.filter(h => h > 30);
    const validHr2 = hr2.filter(h => h > 30);

    if (!np1 || !np2 || validHr1.length === 0 || validHr2.length === 0) {
        return null;
    }

    const avgHr1 = validHr1.reduce((sum, h) => sum + h, 0) / validHr1.length;
    const avgHr2 = validHr2.reduce((sum, h) => sum + h, 0) / validHr2.length;

    if (avgHr1 <= 0 || avgHr2 <= 0) {
        return null;
    }

    const ef1 = np1 / avgHr1;
    const ef2 = np2 / avgHr2;

    if (ef1 <= 0) {
        return null;
    }

    return Number((((ef1 - ef2) / ef1) * 100).toFixed(1));
}

/**
 * Calculates time (seconds) spent in each of the 7 Coggan power zones.
 * Returns [z1Sec, z2Sec, z3Sec, z4Sec, z5Sec, z6Sec, z7Sec].
 */
export function calculatePowerZoneTimes(
    wattsStream: number[],
    timeStream?: number[],
    ftpWatts?: number | null
): number[] {
    const zones = [0, 0, 0, 0, 0, 0, 0];
    if (!ftpWatts || ftpWatts <= 0 || !wattsStream || wattsStream.length === 0) {
        return zones;
    }

    const z1Max = ftpWatts * 0.55;
    const z2Max = ftpWatts * 0.75;
    const z3Max = ftpWatts * 0.90;
    const z4Max = ftpWatts * 1.05;
    const z5Max = ftpWatts * 1.20;
    const z6Max = ftpWatts * 1.50;

    const n = wattsStream.length;
    for (let i = 0; i < n; i++) {
        const duration = (timeStream && i < timeStream.length - 1)
            ? Math.min(Math.max(timeStream[i + 1] - timeStream[i], 0), 30)
            : 1;

        const w = wattsStream[i];
        if (w <= z1Max) zones[0] += duration;
        else if (w <= z2Max) zones[1] += duration;
        else if (w <= z3Max) zones[2] += duration;
        else if (w <= z4Max) zones[3] += duration;
        else if (w <= z5Max) zones[4] += duration;
        else if (w <= z6Max) zones[5] += duration;
        else zones[6] += duration;
    }

    return zones.map(z => Math.round(z));
}

export interface CyclingAnalyticsData {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: CogganPowerZone[];
    };
    summary: {
        totalRides: number;
        totalDistanceM: number;
        totalMovingTimeSec: number;
        totalElevationM: number;
        totalKilojoules: number;
        avgWatts: number | null;
        maxWatts: number | null;
        avgNpWatts: number | null;
        avgIf: number | null;
        avgVi: number | null;
        totalBikeTss: number;
        avgEfficiencyFactor: number | null;
        avgDecouplingPct: number | null;
    };
    powerCurve: {
        durationsSec: number[];
        peakWatts: number[];
        peakWkg: (number | null)[];
        allTimePeakWatts: number[];
    };
    zoneDistributionSec: number[];
    ridesSeries: Array<{
        id: string;
        date: string;
        name: string;
        distanceM: number;
        movingTimeSec: number;
        avgWatts: number | null;
        npWatts: number | null;
        maxWatts: number | null;
        if: number | null;
        vi: number | null;
        bikeTss: number | null;
        ef: number | null;
        decouplingPct: number | null;
        deviceWatts: boolean;
    }>;
    pmcSeries: Array<{
        date: string;
        ctlCombined: number;
        atlCombined: number;
        tsbCombined: number;
        ctlRunning: number;
        atlRunning: number;
        tsbRunning: number;
        ctlBike: number;
        atlBike: number;
        tsbBike: number;
        runTss: number;
        bikeTss: number;
        trimp: number;
    }>;
}

export async function getCyclingAnalytics(
    userId: string,
    range: string = '90d'
): Promise<CyclingAnalyticsData> {
    const { prisma } = await import('@/lib/db');
    const { ensureFitnessCacheUpToDate } = await import('@/lib/metrics/fitnessCache');

    const now = new Date();
    let cutoff: Date;

    switch (range?.toLowerCase()) {
        case '42d':
            cutoff = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
            break;
        case '180d':
            cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case '365d':
        case '1_year':
            cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
            cutoff = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
        default:
            cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
    }

    // 1. Fetch user settings
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            ftpWatts: true,
            autoEstimateFtp: true,
            weight: true,
        },
    });

    const weightKg = user?.weight && user.weight > 0 ? user.weight : null;

    // 2. Fetch all rides for all-time curves and eFTP (capped at 3 years / 1000 rides for memory safety)
    const allRides = await prisma.activity.findMany({
        where: {
            userId,
            type: { in: ['RIDE', 'VIRTUAL_RIDE'] },
            startDate: { gte: new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000) },
        },
        take: 1000,
        select: {
            id: true,
            startDate: true,
            name: true,
            distance: true,
            movingTime: true,
            totalElevation: true,
            averageWatts: true,
            weightedAverageWatts: true,
            maxWatts: true,
            kilojoules: true,
            npWatts: true,
            intensityFactor: true,
            variabilityIndex: true,
            bikeTss: true,
            efficiencyFactor: true,
            aerobicDecoupling: true,
            deviceWatts: true,
            powerZone1Time: true,
            powerZone2Time: true,
            powerZone3Time: true,
            powerZone4Time: true,
            powerZone5Time: true,
            powerZone6Time: true,
            powerZone7Time: true,
            streams: true,
        },
        orderBy: { startDate: 'asc' },
    });

    // Compute all-time peak power curve & all-time eFTP
    const allTimePeakWatts = STANDARD_POWER_DURATIONS.map(() => 0);
    let allTimeEftp: number | null = null;

    for (const r of allRides) {
        const streams = r.streams as { watts?: number[]; time?: number[] } | null;
        let eftp: number | null = null;

        if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
            const curve = calculatePowerCurve(streams.watts, streams.time);
            curve.forEach(pt => {
                const durIdx = STANDARD_POWER_DURATIONS.indexOf(pt.durationSec);
                if (durIdx !== -1 && pt.peakWatts > allTimePeakWatts[durIdx]) {
                    allTimePeakWatts[durIdx] = pt.peakWatts;
                }
            });
            eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts);
        } else if (r.weightedAverageWatts || r.averageWatts) {
            eftp = estimateFtpFromPowerCurve([], r.weightedAverageWatts ?? r.averageWatts);
        }

        if (eftp && (allTimeEftp === null || eftp > allTimeEftp)) {
            allTimeEftp = eftp;
        }
    }

    // Filter rides to requested range
    const rangeRides = allRides.filter(r => r.startDate >= cutoff);

    // Range peak power curve
    const rangePeakWatts = STANDARD_POWER_DURATIONS.map(() => 0);
    for (const r of rangeRides) {
        const streams = r.streams as { watts?: number[]; time?: number[] } | null;
        if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
            const curve = calculatePowerCurve(streams.watts, streams.time);
            curve.forEach(pt => {
                const durIdx = STANDARD_POWER_DURATIONS.indexOf(pt.durationSec);
                if (durIdx !== -1 && pt.peakWatts > rangePeakWatts[durIdx]) {
                    rangePeakWatts[durIdx] = pt.peakWatts;
                }
            });
        }
    }

    const rangePeakWkg = rangePeakWatts.map(watts => {
        if (!watts || !weightKg) return null;
        return Number((watts / weightKg).toFixed(2));
    });

    // Resolve FTP
    const resolvedFtp = user?.ftpWatts ?? allTimeEftp ?? null;
    const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
    const zones = resolvedFtp ? calculateCogganPowerZones(resolvedFtp, weightKg) : [];

    // Summary calculations
    const totalRides = rangeRides.length;
    const totalDistanceM = rangeRides.reduce((s, r) => s + r.distance, 0);
    const totalMovingTimeSec = rangeRides.reduce((s, r) => s + r.movingTime, 0);
    const totalElevationM = rangeRides.reduce((s, r) => s + (r.totalElevation ?? 0), 0);
    const totalKilojoules = rangeRides.reduce((s, r) => s + (r.kilojoules ?? 0), 0);
    const totalBikeTss = Math.round(rangeRides.reduce((s, r) => s + (r.bikeTss ?? 0), 0));

    const ridesWithAvgWatts = rangeRides.filter(r => (r.averageWatts ?? 0) > 0);
    const avgWatts = ridesWithAvgWatts.length > 0
        ? Math.round(ridesWithAvgWatts.reduce((s, r) => s + (r.averageWatts || 0), 0) / ridesWithAvgWatts.length)
        : null;

    const maxWattsObserved = rangeRides.reduce((max, r) => Math.max(max, r.maxWatts ?? 0), 0);
    const maxWatts = maxWattsObserved > 0 ? maxWattsObserved : null;

    const ridesWithNp = rangeRides.filter(r => (r.npWatts ?? 0) > 0);
    const avgNpWatts = ridesWithNp.length > 0
        ? Math.round(ridesWithNp.reduce((s, r) => s + (r.npWatts || 0), 0) / ridesWithNp.length)
        : null;

    const ridesWithIf = rangeRides.filter(r => (r.intensityFactor ?? 0) > 0);
    const avgIf = ridesWithIf.length > 0
        ? Number((ridesWithIf.reduce((s, r) => s + (r.intensityFactor || 0), 0) / ridesWithIf.length).toFixed(3))
        : null;

    const ridesWithVi = rangeRides.filter(r => (r.variabilityIndex ?? 0) > 0);
    const avgVi = ridesWithVi.length > 0
        ? Number((ridesWithVi.reduce((s, r) => s + (r.variabilityIndex || 0), 0) / ridesWithVi.length).toFixed(2))
        : null;

    const ridesWithEf = rangeRides.filter(r => (r.efficiencyFactor ?? 0) > 0);
    const avgEfficiencyFactor = ridesWithEf.length > 0
        ? Number((ridesWithEf.reduce((s, r) => s + (r.efficiencyFactor || 0), 0) / ridesWithEf.length).toFixed(2))
        : null;

    const ridesWithDecoupling = rangeRides.filter(r => r.aerobicDecoupling !== null);
    const avgDecouplingPct = ridesWithDecoupling.length > 0
        ? Number((ridesWithDecoupling.reduce((s, r) => s + (r.aerobicDecoupling || 0), 0) / ridesWithDecoupling.length).toFixed(1))
        : null;

    // Zone distribution (sum of seconds in power zones 1..7)
    const zoneDistributionSec = [
        rangeRides.reduce((s, r) => s + (r.powerZone1Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone2Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone3Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone4Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone5Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone6Time ?? 0), 0),
        rangeRides.reduce((s, r) => s + (r.powerZone7Time ?? 0), 0),
    ];

    // Chronological rides series
    const ridesSeries = rangeRides.map(r => ({
        id: r.id,
        date: r.startDate.toISOString(),
        name: r.name,
        distanceM: r.distance,
        movingTimeSec: r.movingTime,
        avgWatts: r.averageWatts ?? null,
        npWatts: r.npWatts ?? null,
        maxWatts: r.maxWatts ?? null,
        if: r.intensityFactor ?? null,
        vi: r.variabilityIndex ?? null,
        bikeTss: r.bikeTss ?? null,
        ef: r.efficiencyFactor ?? null,
        decouplingPct: r.aerobicDecoupling ?? null,
        deviceWatts: r.deviceWatts,
    }));

    // Daily fitness series (PMC)
    await ensureFitnessCacheUpToDate(userId);
    const dailyFitnessRecords = await prisma.dailyFitness.findMany({
        where: {
            userId,
            date: { gte: cutoff },
        },
        orderBy: { date: 'asc' },
    });

    const pmcSeries = dailyFitnessRecords.map(df => ({
        date: df.date.toISOString().split('T')[0],
        ctlCombined: Number(df.ctl.toFixed(1)),
        atlCombined: Number(df.atl.toFixed(1)),
        tsbCombined: Number(df.tsb.toFixed(1)),
        ctlRunning: Number(df.ctlRunning.toFixed(1)),
        atlRunning: 0,
        tsbRunning: Number(df.ctlRunning.toFixed(1)),
        ctlBike: Number(df.ctlBike.toFixed(1)),
        atlBike: Number(df.atlBike.toFixed(1)),
        tsbBike: Number(df.tsbBike.toFixed(1)),
        runTss: Number(df.runningTss.toFixed(1)),
        bikeTss: Number(df.bikeTss.toFixed(1)),
        trimp: Number(df.trimp.toFixed(1)),
    }));

    return {
        ftp: {
            ftpWatts: user?.ftpWatts ?? null,
            eFtpWatts: allTimeEftp,
            autoEstimateFtp: user?.autoEstimateFtp ?? true,
            weightKg,
            wPerKg,
            zones,
        },
        summary: {
            totalRides,
            totalDistanceM,
            totalMovingTimeSec,
            totalElevationM,
            totalKilojoules,
            avgWatts,
            maxWatts,
            avgNpWatts,
            avgIf,
            avgVi,
            totalBikeTss,
            avgEfficiencyFactor,
            avgDecouplingPct,
        },
        powerCurve: {
            durationsSec: STANDARD_POWER_DURATIONS,
            peakWatts: rangePeakWatts,
            peakWkg: rangePeakWkg,
            allTimePeakWatts,
        },
        zoneDistributionSec,
        ridesSeries,
        pmcSeries,
    };
}
