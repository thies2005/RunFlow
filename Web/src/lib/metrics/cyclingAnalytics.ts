import { prisma } from '@/lib/db';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';
import {
    CogganPowerZone,
    STANDARD_POWER_DURATIONS,
    calculatePowerCurve,
    estimateFtpFromPowerCurve,
    calculateCogganPowerZones,
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
} from '@/lib/metrics/power';

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
    const now = new Date();
    let cutoff: Date;

    switch (range?.toLowerCase()) {
        case '42d':
            cutoff = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
            break;
        case '180d':
            cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
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
            averageHr: true,
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
    const resolvedFtp = user?.ftpWatts ?? allTimeEftp ?? 200;
    const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
    const zones = calculateCogganPowerZones(resolvedFtp, weightKg);

    // Map over rangeRides so any ride missing stored metrics computes them on the fly
    const enrichedRides = rangeRides.map(r => {
        let streamsObj: any = r.streams;
        if (typeof streamsObj === 'string') {
            try {
                streamsObj = JSON.parse(streamsObj);
            } catch {
                streamsObj = null;
            }
        }
        const wattsStream: number[] | undefined = Array.isArray(streamsObj?.watts) ? streamsObj.watts : undefined;
        const timeStream: number[] | undefined = Array.isArray(streamsObj?.time) ? streamsObj.time : undefined;
        const hrStream: number[] | undefined = Array.isArray(streamsObj?.heartrate) ? streamsObj.heartrate : undefined;

        let npWatts = r.npWatts;
        let intensityFactor = r.intensityFactor;
        let variabilityIndex = r.variabilityIndex;
        let bikeTss = r.bikeTss;
        let efficiencyFactor = r.efficiencyFactor;
        let aerobicDecoupling = r.aerobicDecoupling;
        let powerZone1Time = r.powerZone1Time;
        let powerZone2Time = r.powerZone2Time;
        let powerZone3Time = r.powerZone3Time;
        let powerZone4Time = r.powerZone4Time;
        let powerZone5Time = r.powerZone5Time;
        let powerZone6Time = r.powerZone6Time;
        let powerZone7Time = r.powerZone7Time;

        if (wattsStream && wattsStream.length > 0) {
            if (npWatts == null) {
                npWatts = calculateNormalizedPower(wattsStream, timeStream, r.weightedAverageWatts, r.averageWatts);
            }
            if (intensityFactor == null && npWatts != null) {
                intensityFactor = calculateIntensityFactor(npWatts, resolvedFtp);
            }
            if (variabilityIndex == null && npWatts != null && r.averageWatts) {
                variabilityIndex = calculateVariabilityIndex(npWatts, r.averageWatts);
            }
            if (bikeTss == null && npWatts != null && intensityFactor != null) {
                bikeTss = calculateBikeTss(r.movingTime, npWatts, intensityFactor, resolvedFtp);
            }
            if (efficiencyFactor == null && npWatts != null) {
                const avgHr = r.averageHr ?? (hrStream && hrStream.length > 0 ? (hrStream.reduce((a, b) => a + b, 0) / hrStream.length) : null);
                if (avgHr) {
                    efficiencyFactor = calculateEfficiencyFactor(npWatts, avgHr);
                }
            }
            if (aerobicDecoupling == null && hrStream && hrStream.length > 0) {
                aerobicDecoupling = calculateAerobicDecoupling(wattsStream, hrStream, timeStream);
            }
            if (powerZone1Time == null) {
                const zTimes = calculatePowerZoneTimes(wattsStream, timeStream, resolvedFtp);
                powerZone1Time = zTimes[0];
                powerZone2Time = zTimes[1];
                powerZone3Time = zTimes[2];
                powerZone4Time = zTimes[3];
                powerZone5Time = zTimes[4];
                powerZone6Time = zTimes[5];
                powerZone7Time = zTimes[6];
            }
        } else {
            // No streams but average watts or weighted average watts
            const np = r.npWatts ?? r.weightedAverageWatts ?? r.averageWatts ?? null;
            if (npWatts == null && np != null) {
                npWatts = np;
            }
            if (intensityFactor == null && npWatts != null) {
                intensityFactor = calculateIntensityFactor(npWatts, resolvedFtp);
            }
            if (bikeTss == null && npWatts != null) {
                const ifFactor = intensityFactor ?? (npWatts / resolvedFtp);
                bikeTss = calculateBikeTss(r.movingTime, npWatts, ifFactor, resolvedFtp);
            }
            if (variabilityIndex == null && npWatts != null && r.averageWatts) {
                variabilityIndex = calculateVariabilityIndex(npWatts, r.averageWatts);
            }
            if (efficiencyFactor == null && npWatts != null && r.averageHr) {
                efficiencyFactor = calculateEfficiencyFactor(npWatts, r.averageHr);
            }
        }

        return {
            ...r,
            npWatts,
            intensityFactor,
            variabilityIndex,
            bikeTss,
            efficiencyFactor,
            aerobicDecoupling,
            powerZone1Time,
            powerZone2Time,
            powerZone3Time,
            powerZone4Time,
            powerZone5Time,
            powerZone6Time,
            powerZone7Time,
        };
    });

    // Summary calculations
    const totalRides = enrichedRides.length;
    const totalDistanceM = enrichedRides.reduce((s, r) => s + r.distance, 0);
    const totalMovingTimeSec = enrichedRides.reduce((s, r) => s + r.movingTime, 0);
    const totalElevationM = enrichedRides.reduce((s, r) => s + (r.totalElevation ?? 0), 0);
    const totalKilojoules = enrichedRides.reduce((s, r) => s + (r.kilojoules ?? 0), 0);
    const totalBikeTss = Math.round(enrichedRides.reduce((s, r) => s + (r.bikeTss ?? 0), 0));

    const ridesWithAvgWatts = enrichedRides.filter(r => (r.averageWatts ?? 0) > 0);
    const avgWatts = ridesWithAvgWatts.length > 0
        ? Math.round(ridesWithAvgWatts.reduce((s, r) => s + (r.averageWatts || 0), 0) / ridesWithAvgWatts.length)
        : null;

    const maxWattsObserved = enrichedRides.reduce((max, r) => Math.max(max, r.maxWatts ?? 0), 0);
    const maxWatts = maxWattsObserved > 0 ? maxWattsObserved : null;

    const ridesWithNp = enrichedRides.filter(r => (r.npWatts ?? 0) > 0);
    const avgNpWatts = ridesWithNp.length > 0
        ? Math.round(ridesWithNp.reduce((s, r) => s + (r.npWatts || 0), 0) / ridesWithNp.length)
        : null;

    const ridesWithIf = enrichedRides.filter(r => (r.intensityFactor ?? 0) > 0);
    const avgIf = ridesWithIf.length > 0
        ? Number((ridesWithIf.reduce((s, r) => s + (r.intensityFactor || 0), 0) / ridesWithIf.length).toFixed(3))
        : null;

    const ridesWithVi = enrichedRides.filter(r => (r.variabilityIndex ?? 0) > 0);
    const avgVi = ridesWithVi.length > 0
        ? Number((ridesWithVi.reduce((s, r) => s + (r.variabilityIndex || 0), 0) / ridesWithVi.length).toFixed(2))
        : null;

    const ridesWithEf = enrichedRides.filter(r => (r.efficiencyFactor ?? 0) > 0);
    const avgEfficiencyFactor = ridesWithEf.length > 0
        ? Number((ridesWithEf.reduce((s, r) => s + (r.efficiencyFactor || 0), 0) / ridesWithEf.length).toFixed(2))
        : null;

    const ridesWithDecoupling = enrichedRides.filter(r => r.aerobicDecoupling !== null);
    const avgDecouplingPct = ridesWithDecoupling.length > 0
        ? Number((ridesWithDecoupling.reduce((s, r) => s + (r.aerobicDecoupling || 0), 0) / ridesWithDecoupling.length).toFixed(1))
        : null;

    // Zone distribution (sum of seconds in power zones 1..7)
    const zoneDistributionSec = [
        enrichedRides.reduce((s, r) => s + (r.powerZone1Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone2Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone3Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone4Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone5Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone6Time ?? 0), 0),
        enrichedRides.reduce((s, r) => s + (r.powerZone7Time ?? 0), 0),
    ];

    // Chronological rides series
    const ridesSeries = enrichedRides.map(r => ({
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

    const atlDecay = Math.exp(-1 / 7);
    let currentAtlRun = dailyFitnessRecords.length > 0 ? (dailyFitnessRecords[0].ctlRunning || 0) : 0;
    const pmcSeries = dailyFitnessRecords.map(df => {
        currentAtlRun = currentAtlRun * atlDecay + (df.runningTss || 0) * (1 - atlDecay);
        const atlRun = Number(currentAtlRun.toFixed(1));
        const tsbRun = Number((df.ctlRunning - currentAtlRun).toFixed(1));
        return {
            date: df.date.toISOString().split('T')[0],
            ctlCombined: Number(df.ctl.toFixed(1)),
            atlCombined: Number(df.atl.toFixed(1)),
            tsbCombined: Number(df.tsb.toFixed(1)),
            ctlRunning: Number(df.ctlRunning.toFixed(1)),
            atlRunning: atlRun,
            tsbRunning: tsbRun,
            ctlBike: Number(df.ctlBike.toFixed(1)),
            atlBike: Number(df.atlBike.toFixed(1)),
            tsbBike: Number(df.tsbBike.toFixed(1)),
            runTss: Number(df.runningTss.toFixed(1)),
            bikeTss: Number(df.bikeTss.toFixed(1)),
            trimp: Number(df.trimp.toFixed(1)),
        };
    });

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
