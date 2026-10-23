import { type McpTool } from '@/lib/mcp/server';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';
import { calculateCogganPowerZones, calculateIntensityFactor, calculateBikeTss } from '@/lib/metrics/power';
import { getCyclingAnalytics } from '@/lib/metrics/cyclingAnalytics';
import { calculateBikeZones } from '@/lib/plans/bike-zones';
import { calculateSwimPaces } from '@/lib/plans/swim-pace';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';
import { prisma } from '@/lib/db';

const STRAVA_COMPLIANCE_NOTICE =
    'Activity title, description, and raw GPS/sensor streams are omitted for Strava-synced activities per Strava API terms. To inspect raw Strava activity details or streams, please use the official Strava MCP server.';

export const getAthleteProfileTool: McpTool = {
    name: 'get_athlete_profile',
    description:
        'Get athlete profile including VDOT, training paces, Bike FTP & Coggan zones (with W/kg bounds), Swim CSS & paces, HR zones, weight, and preferences.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: { type: 'object', properties: {} },
    handler: async (_params: any, context?: any) => {
        const userId = context?.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                weight: true,
                height: true,
                useImperial: true,
                vdotCorrectionFactor: true,
                ftpWatts: true,
                autoEstimateFtp: true,
                swimCssSecPer100m: true,
                hrMax: true,
                hrRest: true,
                thresholdHeartRate: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                hrZoneMethod: true,
            },
        });

        if (!user) throw new Error('Athlete profile not found');

        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const runActivities = await prisma.activity.findMany({
            where: {
                userId,
                type: 'RUN',
                startDate: { gte: ninetyDaysAgo },
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                type: true,
            },
            orderBy: { startDate: 'desc' },
        });

        const effectiveVdot = bestEffortVdot(runActivities, user.vdotCorrectionFactor || 1.0);
        const vdot = effectiveVdot > 0 ? effectiveVdot : 45;
        const runningPaces = calculateTrainingPaces(vdot);

        const ftp = user.ftpWatts || 200;
        const weightKg = user.weight || 70;
        const wPerKg = Number((ftp / weightKg).toFixed(2));
        const cogganPowerZones = calculateCogganPowerZones(ftp, weightKg);
        const planBikeZones = calculateBikeZones(ftp);

        const swimCss = user.swimCssSecPer100m || 120;
        const swimZones = calculateSwimPaces(swimCss);

        const hrZones = {
            method: user.hrZoneMethod || 'LTHR',
            hrMax: user.hrMax,
            hrRest: user.hrRest,
            thresholdHeartRate: user.thresholdHeartRate,
            zones: {
                z1Recovery: { min: user.hrRest || 50, max: user.hrZone1Max },
                z2Aerobic: { min: user.hrZone1Max + 1, max: user.hrZone2Max },
                z3Tempo: { min: user.hrZone2Max + 1, max: user.hrZone3Max },
                z4SubThreshold: { min: user.hrZone3Max + 1, max: user.hrZone4Max },
                z5SuperThreshold: { min: user.hrZone4Max + 1, max: user.hrZone5Max },
                z6AerobicCapacity: { min: user.hrZone5Max + 1, max: user.hrZone6Max },
            },
        };

        const formatPaceMile = (secPerKm: number) => {
            const secPerMile = Math.round(secPerKm * 1.609344);
            const mins = Math.floor(secPerMile / 60);
            const secs = Math.round(secPerMile % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
        };
        const formatPaceKm = (secPerKm: number) => {
            const mins = Math.floor(secPerKm / 60);
            const secs = Math.round(secPerKm % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}/km`;
        };

        return {
            athlete: {
                id: user.id,
                name: user.name,
                weightKg,
                heightCm: user.height,
                useImperial: user.useImperial,
            },
            running: {
                vdot,
                effectiveVdot,
                vdotCorrectionFactor: user.vdotCorrectionFactor,
                paces: {
                    easy: {
                        minPerKm: `${formatPaceKm(runningPaces.easy.min)} - ${formatPaceKm(runningPaces.easy.max)}`,
                        minPerMile: `${formatPaceMile(runningPaces.easy.min)} - ${formatPaceMile(runningPaces.easy.max)}`,
                        secondsPerKmMin: runningPaces.easy.min,
                        secondsPerKmMax: runningPaces.easy.max,
                    },
                    marathon: {
                        minPerKm: formatPaceKm(runningPaces.marathon),
                        minPerMile: formatPaceMile(runningPaces.marathon),
                        secondsPerKm: runningPaces.marathon,
                    },
                    threshold: {
                        minPerKm: formatPaceKm(runningPaces.threshold),
                        minPerMile: formatPaceMile(runningPaces.threshold),
                        secondsPerKm: runningPaces.threshold,
                    },
                    interval: {
                        minPerKm: formatPaceKm(runningPaces.interval),
                        minPerMile: formatPaceMile(runningPaces.interval),
                        secondsPerKm: runningPaces.interval,
                    },
                    repetition: {
                        minPerKm: formatPaceKm(runningPaces.repetition),
                        minPerMile: formatPaceMile(runningPaces.repetition),
                        secondsPerKm: runningPaces.repetition,
                    },
                },
            },
            cycling: {
                ftpWatts: user.ftpWatts,
                wPerKg,
                autoEstimateFtp: user.autoEstimateFtp,
                cogganPowerZones,
                planBikeZones,
            },
            swimming: {
                cssSecPer100m: user.swimCssSecPer100m,
                zones: swimZones,
            },
            heartRate: hrZones,
        };
    },
};

export const getFitnessMetricsTool: McpTool = {
    name: 'get_fitness_metrics',
    description:
        'Get current PMC (CTL/ATL/TSB) metrics, complete Running and Cycling PMC series (including atlRunning and tsbRunning), workload ratio, weekly ramp rate, and overtraining risk classification.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: {
                type: 'number',
                description: 'Number of history days to inspect (default: 42, max: 180)',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 42, 7), 180);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        await ensureFitnessCacheUpToDate(userId);

        const records = await prisma.dailyFitness.findMany({
            where: {
                userId,
                date: { gte: cutoff },
            },
            orderBy: { date: 'asc' },
        });

        const current = records.length > 0 ? records[records.length - 1] : null;

        let rampRate = 0;
        if (records.length >= 7) {
            const sevenDaysAgo = records[records.length - 7];
            rampRate = Number(((current?.ctl || 0) - (sevenDaysAgo?.ctl || 0)).toFixed(1));
        }

        const currentTsb = current?.tsb || 0;
        let overtrainingRisk = 'optimal';
        if (currentTsb < -30 || rampRate > 8) {
            overtrainingRisk = 'high_risk';
        } else if (currentTsb < -10) {
            overtrainingRisk = 'overreaching';
        } else if (currentTsb > 15) {
            overtrainingRisk = 'fresh_or_detraining';
        }

        const atlDecay = Math.exp(-1 / 7);
        let currentAtlRun = records.length > 0 ? Number(records[0].ctlRunning || 0) : 0;

        const series = records.map(r => {
            currentAtlRun = currentAtlRun * atlDecay + Number(r.runningTss || 0) * (1 - atlDecay);
            const atlRunning = Number(currentAtlRun.toFixed(1));
            const tsbRunning = Number((Number(r.ctlRunning || 0) - currentAtlRun).toFixed(1));
            return {
                date: r.date.toISOString().split('T')[0],
                ctl: Number(r.ctl.toFixed(1)),
                atl: Number(r.atl.toFixed(1)),
                tsb: Number(r.tsb.toFixed(1)),
                ctlRunning: Number(r.ctlRunning.toFixed(1)),
                atlRunning,
                tsbRunning,
                ctlBike: Number(r.ctlBike.toFixed(1)),
                atlBike: Number(r.atlBike.toFixed(1)),
                tsbBike: Number(r.tsbBike.toFixed(1)),
                runningTss: Number(r.runningTss.toFixed(1)),
                bikeTss: Number(r.bikeTss.toFixed(1)),
                trimp: Number(r.trimp.toFixed(1)),
            };
        });

        const latestSeriesPoint = series.length > 0 ? series[series.length - 1] : null;
        const workloadRatio =
            current && current.ctl > 0 ? Number((current.atl / current.ctl).toFixed(2)) : 0;

        return {
            current: current
                ? {
                      date: current.date.toISOString().split('T')[0],
                      combinedPmc: {
                          ctl: Number(current.ctl.toFixed(2)),
                          atl: Number(current.atl.toFixed(2)),
                          tsb: Number(current.tsb.toFixed(2)),
                          workloadRatio,
                      },
                      runningPmc: {
                          ctlRunning: Number(current.ctlRunning.toFixed(2)),
                          atlRunning: latestSeriesPoint?.atlRunning ?? 0,
                          tsbRunning: latestSeriesPoint?.tsbRunning ?? 0,
                      },
                      cyclingPmc: {
                          ctlBike: Number(current.ctlBike.toFixed(2)),
                          atlBike: Number(current.atlBike.toFixed(2)),
                          tsbBike: Number(current.tsbBike.toFixed(2)),
                      },
                      weeklyRampRate: rampRate,
                      overtrainingRisk,
                  }
                : null,
            series,
        };
    },
};

export const getCyclingAnalyticsTool: McpTool = {
    name: 'get_cycling_analytics',
    description:
        'Get Mean Maximal Power curve (5s..60m Watts and W/kg), eFTP, recent NP/IF/VI trends, Coggan power distribution, and Aerobic Efficiency decoupling trends with Strava compliance scrubbing.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: {
                type: 'number',
                description: 'Lookback window in days (default: 42, max: 365)',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = params.days;
        const range =
            typeof days === 'number'
                ? days <= 42
                    ? '42d'
                    : days <= 90
                    ? '90d'
                    : days <= 180
                    ? '180d'
                    : '365d'
                : typeof params.range === 'string'
                ? params.range
                : '42d';
        return getCyclingAnalytics(userId, range, { scrubStrava: true });
    },
};

export const getRecentActivitiesTool: McpTool = {
    name: 'get_recent_activities',
    description:
        'Get completed activities in a date window wrapped in a top-level object ({ count, activities }) with strict Strava compliance scrubbing and normalized cycling IF/TSS.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (1..180, default: 30)' },
            sportType: { type: 'string', description: 'Filter by sport type (e.g. RUN, RIDE, VIRTUAL_RIDE, SWIM, WORKOUT)' },
            limit: { type: 'number', description: 'Maximum activities to return (default: 50, max: 100)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 30, 1), 180);
        const limit = Math.min(Math.max(params.limit || 50, 1), 100);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { ftpWatts: true },
        });
        const resolvedFtp = user?.ftpWatts && user.ftpWatts > 0 ? user.ftpWatts : null;

        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: cutoff },
                ...(params.sportType ? { type: params.sportType as any } : {}),
            },
            orderBy: { startDate: 'desc' },
            take: limit,
        });

        const formattedActivities = activities.map(a => {
            const isStrava = a.stravaId !== null && a.stravaId !== undefined;
            const isRide = a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE';
            let intensityFactor = a.intensityFactor;
            let bikeTss = a.bikeTss;

            if (isRide && resolvedFtp && a.npWatts && a.npWatts > 0) {
                const expectedIf = calculateIntensityFactor(a.npWatts, resolvedFtp);
                if (expectedIf !== null && (intensityFactor == null || Math.abs(intensityFactor - expectedIf) > 0.08)) {
                    intensityFactor = expectedIf;
                    bikeTss = calculateBikeTss(a.movingTime, a.npWatts, expectedIf, resolvedFtp);
                }
            }

            const basePayload = {
                id: a.id,
                startDate: a.startDate,
                type: a.type,
                sportType: a.sportType,
                trainingType: a.trainingType,
                distance: a.distance,
                movingTime: a.movingTime,
                elapsedTime: a.elapsedTime,
                totalElevation: a.totalElevation,
                averageHr: a.averageHr,
                maxHr: a.maxHr,
                averageWatts: a.averageWatts,
                weightedAverageWatts: a.weightedAverageWatts,
                maxWatts: a.maxWatts,
                deviceWatts: a.deviceWatts,
                npWatts: a.npWatts,
                intensityFactor,
                variabilityIndex: a.variabilityIndex,
                bikeTss,
                runningTss: a.runningTss,
                trimp: a.trimp,
                estimatedVdot: a.estimatedVdot,
                efficiencyFactor: a.efficiencyFactor,
                aerobicDecoupling: a.aerobicDecoupling,
                hrZone1Time: a.hrZone1Time,
                hrZone2Time: a.hrZone2Time,
                hrZone3Time: a.hrZone3Time,
                hrZone4Time: a.hrZone4Time,
                hrZone5Time: a.hrZone5Time,
                hrZone6Time: a.hrZone6Time,
                hrZone7Time: a.hrZone7Time,
                powerZone1Time: a.powerZone1Time,
                powerZone2Time: a.powerZone2Time,
                powerZone3Time: a.powerZone3Time,
                powerZone4Time: a.powerZone4Time,
                powerZone5Time: a.powerZone5Time,
                powerZone6Time: a.powerZone6Time,
                powerZone7Time: a.powerZone7Time,
            };

            if (isStrava) {
                return {
                    ...basePayload,
                    stravaComplianceNotice: STRAVA_COMPLIANCE_NOTICE,
                };
            }

            return {
                ...basePayload,
                name: a.name,
                description: a.description,
            };
        });

        return {
            count: formattedActivities.length,
            activities: formattedActivities,
        };
    },
};

export const getReadinessAndHealthTool: McpTool = {
    name: 'get_readiness_and_health',
    description:
        'Get latest DailyReadinessRecord (reconciled with multi-sport DailyFitness CTL/ATL/TSB load) and recent DailyHealthLog records. Uses compact history by default to stay well under LLM context limits.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (default: 7, max: 30)' },
            compact: {
                type: 'boolean',
                description: 'If true (default), omits duplicate nested JSON sub-objects on historical readiness rows to reduce payload size by ~85%.',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 7, 1), 30);
        const compact = params.compact !== undefined ? Boolean(params.compact) : true;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        await ensureFitnessCacheUpToDate(userId);

        const [readinessRecords, healthLogs, baseline, latestFitness] = await Promise.all([
            prisma.dailyReadinessRecord.findMany({
                where: { userId, date: { gte: cutoff } },
                orderBy: { date: 'desc' },
                take: days,
            }),
            prisma.dailyHealthLog.findMany({
                where: { userId, date: { gte: cutoff } },
                orderBy: { date: 'desc' },
                take: days,
            }),
            prisma.readinessBaseline.findFirst({
                where: { userId },
            }),
            prisma.dailyFitness.findFirst({
                where: { userId },
                orderBy: { date: 'desc' },
            }),
        ]);

        const reconcileLoadJson = (rawLoad: any) => {
            if (!latestFitness) return rawLoad;
            const loadObj = rawLoad && typeof rawLoad === 'object' ? { ...(rawLoad as Record<string, any>) } : {};
            const combinedCtl = Number(latestFitness.ctl.toFixed(2));
            const combinedAtl = Number(latestFitness.atl.toFixed(2));
            const combinedTsb = Number(latestFitness.tsb.toFixed(2));
            const combinedRatio = combinedCtl > 0 ? Number((combinedAtl / combinedCtl).toFixed(3)) : 0;

            if (
                loadObj.trimpStrategy === 'unavailable' ||
                loadObj.ctl === undefined ||
                Math.abs(Number(loadObj.ctl || 0) - combinedCtl) > 1.0
            ) {
                return {
                    ...loadObj,
                    hrTrimpCtl: loadObj.ctl ?? null,
                    hrTrimpAtl: loadObj.atl ?? null,
                    ctl: combinedCtl,
                    atl: combinedAtl,
                    tsb: combinedTsb,
                    ctlRunning: Number(latestFitness.ctlRunning.toFixed(2)),
                    ctlBike: Number(latestFitness.ctlBike.toFixed(2)),
                    workloadRatio: combinedRatio,
                    loadSource: 'combined_multi_sport_tss',
                };
            }
            return loadObj;
        };

        const latestRaw = readinessRecords.length > 0 ? readinessRecords[0] : null;
        const latestReadiness = latestRaw
            ? {
                  ...latestRaw,
                  loadJson: reconcileLoadJson(latestRaw.loadJson),
              }
            : null;

        const readinessHistory = readinessRecords.map((r, idx) => {
            const reconciledLoad = idx === 0 ? reconcileLoadJson(r.loadJson) : r.loadJson;
            if (!compact) {
                return {
                    ...r,
                    loadJson: reconciledLoad,
                };
            }
            return {
                id: r.id,
                date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
                compositeScore: r.compositeScore,
                state: r.state,
                confidence: r.confidence,
                restingHr: r.restingHr,
                maxHr: r.maxHr,
                reasons: r.reasons,
                subjectiveJson: r.subjectiveJson,
                loadSummary:
                    reconciledLoad && typeof reconciledLoad === 'object'
                        ? {
                              ctl: (reconciledLoad as any).ctl ?? null,
                              atl: (reconciledLoad as any).atl ?? null,
                              tsb: (reconciledLoad as any).tsb ?? null,
                              workloadRatio: (reconciledLoad as any).workloadRatio ?? null,
                          }
                        : null,
            };
        });

        return {
            latestReadiness,
            readinessHistory,
            healthLogs,
            baseline,
        };
    },
};

export const logDailyHealthTool: McpTool = {
    name: 'log_daily_health',
    description:
        'Log or update daily health biometrics (weight, steps, waterIntake, activeCalories) and subjective wellness readiness metrics (soreness, fatigue, sleepQuality, stress, mood, notes) for a date.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD (defaults to today UTC)' },
            weightKg: { type: 'number', description: 'Body weight in kg (20..300)' },
            steps: { type: 'number', description: 'Daily step count' },
            waterIntakeMl: { type: 'number', description: 'Daily water intake in mL' },
            activeCalories: { type: 'number', description: 'Active calories burned' },
            restingHr: { type: 'number', description: 'Morning resting heart rate in bpm' },
            soreness: { type: 'number', description: 'Subjective muscle soreness (1=none .. 10=severe)' },
            fatigue: { type: 'number', description: 'Subjective fatigue (1=fresh .. 10=exhausted)' },
            sleepQuality: { type: 'number', description: 'Subjective sleep quality (1=poor .. 10=excellent)' },
            stress: { type: 'number', description: 'Subjective stress level (1=low .. 10=high)' },
            mood: { type: 'number', description: 'Subjective mood (1=low .. 10=great)' },
            notes: { type: 'string', description: 'Optional wellness or recovery notes' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const dateStr = params.date || new Date().toISOString().split('T')[0];
        const parsedDate = new Date(`${dateStr}T00:00:00.000Z`);
        if (isNaN(parsedDate.getTime())) {
            throw new Error(`Invalid date format: ${params.date}. Expected YYYY-MM-DD.`);
        }

        const weight =
            typeof params.weightKg === 'number' && params.weightKg >= 20 && params.weightKg <= 300
                ? params.weightKg
                : undefined;
        const steps =
            typeof params.steps === 'number' && params.steps >= 0 ? Math.round(params.steps) : undefined;
        const waterIntake =
            typeof params.waterIntakeMl === 'number' && params.waterIntakeMl >= 0
                ? Math.round(params.waterIntakeMl)
                : undefined;
        const activeCalories =
            typeof params.activeCalories === 'number' && params.activeCalories >= 0
                ? params.activeCalories
                : undefined;

        const healthLog = await prisma.dailyHealthLog.upsert({
            where: {
                userId_date: {
                    userId,
                    date: parsedDate,
                },
            },
            create: {
                userId,
                date: parsedDate,
                ...(weight !== undefined && { weight }),
                ...(steps !== undefined && { steps }),
                ...(waterIntake !== undefined && { waterIntake }),
                ...(activeCalories !== undefined && { activeCalories }),
            },
            update: {
                ...(weight !== undefined && { weight }),
                ...(steps !== undefined && { steps }),
                ...(waterIntake !== undefined && { waterIntake }),
                ...(activeCalories !== undefined && { activeCalories }),
            },
        });

        if (weight !== undefined) {
            await prisma.user.update({
                where: { id: userId },
                data: { weight },
            });
        }

        const hasSubjective =
            params.soreness !== undefined ||
            params.fatigue !== undefined ||
            params.sleepQuality !== undefined ||
            params.stress !== undefined ||
            params.mood !== undefined ||
            params.notes !== undefined ||
            params.restingHr !== undefined;

        let readinessRecord: any = null;
        if (hasSubjective) {
            const subjectivePayload = {
                ...(params.soreness !== undefined && { soreness: params.soreness }),
                ...(params.fatigue !== undefined && { fatigue: params.fatigue }),
                ...(params.sleepQuality !== undefined && { sleepQuality: params.sleepQuality }),
                ...(params.stress !== undefined && { stress: params.stress }),
                ...(params.mood !== undefined && { mood: params.mood }),
                ...(params.notes !== undefined && { notes: String(params.notes).slice(0, 500) }),
                updatedAt: new Date().toISOString(),
            };

            const existingReadiness = await prisma.dailyReadinessRecord.findFirst({
                where: { userId, date: parsedDate },
            });

            if (existingReadiness) {
                readinessRecord = await prisma.dailyReadinessRecord.update({
                    where: { id: existingReadiness.id },
                    data: {
                        subjectiveJson: {
                            ...(existingReadiness.subjectiveJson && typeof existingReadiness.subjectiveJson === 'object'
                                ? (existingReadiness.subjectiveJson as Record<string, any>)
                                : {}),
                            ...subjectivePayload,
                        },
                        ...(typeof params.restingHr === 'number' && { restingHr: Math.round(params.restingHr) }),
                    },
                });
            }
        }

        return {
            success: true,
            date: dateStr,
            healthLog,
            readinessSubjectiveUpdated: Boolean(readinessRecord),
        };
    },
};

export const getRunningAnalyticsTool: McpTool = {
    name: 'get_running_analytics',
    description:
        'Get running telemetry analytics including volume summary, VDOT progression, best-effort pace curve across standard distances, HR zone distribution, and Strava-scrubbed runs series.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (default: 42, max: 365)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 42, 7), 365);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [user, runs] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { vdotCorrectionFactor: true },
            }),
            prisma.activity.findMany({
                where: {
                    userId,
                    type: 'RUN',
                    startDate: { gte: cutoff },
                },
                orderBy: { startDate: 'asc' },
                take: 500,
            }),
        ]);

        const effectiveVdot = bestEffortVdot(runs, user?.vdotCorrectionFactor || 1.0);
        const vdot = effectiveVdot > 0 ? effectiveVdot : 45;
        const trainingPaces = calculateTrainingPaces(vdot);

        const totalRuns = runs.length;
        const totalDistanceM = Math.round(runs.reduce((s, r) => s + (r.distance || 0), 0));
        const totalMovingTimeSec = runs.reduce((s, r) => s + (r.movingTime || 0), 0);
        const totalElevationM = Math.round(runs.reduce((s, r) => s + (r.totalElevation || 0), 0));
        const totalRunningTss = Math.round(runs.reduce((s, r) => s + (r.runningTss || 0), 0));
        const avgPaceSecPerKm =
            totalDistanceM > 0 ? Math.round((totalMovingTimeSec / totalDistanceM) * 1000) : null;

        const hrZoneDistributionSec = [
            runs.reduce((s, r) => s + (r.hrZone1Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone2Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone3Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone4Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone5Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone6Time || 0), 0),
            runs.reduce((s, r) => s + (r.hrZone7Time || 0), 0),
        ];

        const runsSeries = runs.map(r => {
            const isStrava = r.stravaId !== null && r.stravaId !== undefined;
            const paceSecPerKm = r.distance > 0 ? Math.round((r.movingTime / r.distance) * 1000) : null;
            return {
                id: r.id,
                date: r.startDate.toISOString(),
                ...(isStrava ? { stravaComplianceNotice: STRAVA_COMPLIANCE_NOTICE } : { name: r.name }),
                distanceM: r.distance,
                movingTimeSec: r.movingTime,
                paceSecPerKm,
                averageHr: r.averageHr,
                maxHr: r.maxHr,
                runningTss: r.runningTss,
                estimatedVdot: r.estimatedVdot,
                efficiencyFactor: r.efficiencyFactor,
                aerobicDecoupling: r.aerobicDecoupling,
            };
        });

        return {
            vdot: {
                effectiveVdot,
                vdotCorrectionFactor: user?.vdotCorrectionFactor || 1.0,
                trainingPaces,
            },
            summary: {
                totalRuns,
                totalDistanceM,
                totalMovingTimeSec,
                totalElevationM,
                totalRunningTss,
                avgPaceSecPerKm,
            },
            hrZoneDistributionSec,
            runsSeries,
        };
    },
};

export const getSwimmingAnalyticsTool: McpTool = {
    name: 'get_swimming_analytics',
    description:
        'Get swimming telemetry analytics including total swim distance, CSS (sec/100m), swim pace zones, and Strava-scrubbed swims series.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (default: 42, max: 365)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 42, 7), 365);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [user, swims] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { swimCssSecPer100m: true },
            }),
            prisma.activity.findMany({
                where: {
                    userId,
                    type: 'SWIM',
                    startDate: { gte: cutoff },
                },
                orderBy: { startDate: 'asc' },
                take: 500,
            }),
        ]);

        const cssSecPer100m = user?.swimCssSecPer100m || 120;
        const swimZones = calculateSwimPaces(cssSecPer100m);

        const totalSwims = swims.length;
        const totalDistanceM = Math.round(swims.reduce((s, a) => s + (a.distance || 0), 0));
        const totalMovingTimeSec = swims.reduce((s, a) => s + (a.movingTime || 0), 0);
        const avgPaceSecPer100m =
            totalDistanceM > 0 ? Math.round((totalMovingTimeSec / totalDistanceM) * 100) : null;

        const swimsSeries = swims.map(a => {
            const isStrava = a.stravaId !== null && a.stravaId !== undefined;
            const paceSecPer100m = a.distance > 0 ? Math.round((a.movingTime / a.distance) * 100) : null;
            return {
                id: a.id,
                date: a.startDate.toISOString(),
                ...(isStrava ? { stravaComplianceNotice: STRAVA_COMPLIANCE_NOTICE } : { name: a.name }),
                distanceM: a.distance,
                movingTimeSec: a.movingTime,
                paceSecPer100m,
                averageHr: a.averageHr,
                trimp: a.trimp,
            };
        });

        return {
            cssSecPer100m,
            zones: swimZones,
            summary: {
                totalSwims,
                totalDistanceM,
                totalMovingTimeSec,
                avgPaceSecPer100m,
            },
            swimsSeries,
        };
    },
};

export const TELEMETRY_MCP_TOOLS: McpTool[] = [
    getAthleteProfileTool,
    getFitnessMetricsTool,
    getCyclingAnalyticsTool,
    getRecentActivitiesTool,
    getReadinessAndHealthTool,
    logDailyHealthTool,
    getRunningAnalyticsTool,
    getSwimmingAnalyticsTool,
];
