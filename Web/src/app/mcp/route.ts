import { NextRequest, NextResponse } from 'next/server';
import { McpServer, type McpTool } from '@/lib/mcp/server';
import { validateMcpOAuthToken, isUserPaidPremium } from '@/lib/mcp/oauth';
import { validateApiKey } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, rateLimitHeaders } from '@/lib/rateLimit';
import { evaluatePlanSafety } from '@/lib/mcp/safety';
import { createSnapshot } from '@/lib/plan/snapshot';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';
import { calculateCogganPowerZones } from '@/lib/metrics/power';
import { getCyclingAnalytics } from '@/lib/metrics/cyclingAnalytics';
import { calculateBikeZones } from '@/lib/plans/bike-zones';
import { calculateSwimPaces } from '@/lib/plans/swim-pace';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { ensureFitnessCacheUpToDate, updateFitnessCache } from '@/lib/metrics/fitnessCache';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { createPlanWithWorkouts } from '@/lib/services/plan-creation';
import { parseStructuredWorkout, summarizeStructuredWorkout, flattenStructuredWorkout, type StructuredWorkoutV2 } from '@/lib/plans/structured';
import { buildStructuredStepsForWorkout } from '@/lib/plans';
import { prisma } from '@/lib/db';
import { WorkoutType, PlanPhase, RaceType, PlanSport } from '@/generated/prisma/client';

function getOrigin(request: Request): string {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXTAUTH_URL).origin; } catch {}
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXT_PUBLIC_APP_URL).origin; } catch {}
    }
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
        || request.headers.get('host')?.split(',')[0]?.trim();
    if (host) {
        return `${proto}://${host}`;
    }
    try {
        return new URL(request.url).origin;
    } catch {}
    return 'https://localhost';
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate',
};

// -------------------------------------------------------------
// Read Tools
// -------------------------------------------------------------

const getAthleteProfileTool: McpTool = {
    name: 'get_athlete_profile',
    description: 'Get athlete profile including VDOT, training paces, Bike FTP & Coggan zones, Swim CSS & paces, HR zones, weight, and preferences.',
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
        const cogganPowerZones = calculateCogganPowerZones(ftp);
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

const getFitnessMetricsTool: McpTool = {
    name: 'get_fitness_metrics',
    description: 'Get current PMC (CTL/ATL/TSB) metrics, Running and Cycling PMC series, weekly ramp rate, and overtraining risk classification.',
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

        // Weekly ramp rate: difference in CTL over last 7 days
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

        const series = records.map(r => ({
            date: r.date.toISOString().split('T')[0],
            ctl: Number(r.ctl.toFixed(1)),
            atl: Number(r.atl.toFixed(1)),
            tsb: Number(r.tsb.toFixed(1)),
            ctlRunning: Number(r.ctlRunning.toFixed(1)),
            ctlBike: Number(r.ctlBike.toFixed(1)),
            atlBike: Number(r.atlBike.toFixed(1)),
            tsbBike: Number(r.tsbBike.toFixed(1)),
            runningTss: Number(r.runningTss.toFixed(1)),
            bikeTss: Number(r.bikeTss.toFixed(1)),
            trimp: Number(r.trimp.toFixed(1)),
        }));

        return {
            current: current
                ? {
                      date: current.date.toISOString().split('T')[0],
                      combinedPmc: { ctl: current.ctl, atl: current.atl, tsb: current.tsb },
                      runningPmc: { ctlRunning: current.ctlRunning },
                      cyclingPmc: { ctlBike: current.ctlBike, atlBike: current.atlBike, tsbBike: current.tsbBike },
                      weeklyRampRate: rampRate,
                      overtrainingRisk,
                  }
                : null,
            series,
        };
    },
};

const getCyclingAnalyticsTool: McpTool = {
    name: 'get_cycling_analytics',
    description: 'Get Mean Maximal Power curve (5s..60m Watts and W/kg), eFTP, recent NP/IF/VI trends, Coggan power distribution, and Aerobic Efficiency decoupling trends.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: {
                type: 'number',
                description: 'Lookback window in days (default: 42, max: 180)',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = params.days;
        const range = typeof days === 'number'
            ? (days <= 42 ? '42d' : days <= 90 ? '90d' : '365d')
            : (typeof params.range === 'string' ? params.range : '90d');
        return getCyclingAnalytics(userId, range);
    },
};

const getTrainingPlanTool: McpTool = {
    name: 'get_training_plan',
    description: 'Get active or specified training plan, including structured phase blocks, target volume/TSS goals, coaching summaries, and workouts in window.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID (defaults to currently active plan)' },
            startDate: { type: 'string', description: 'Start date window in YYYY-MM-DD' },
            endDate: { type: 'string', description: 'End date window in YYYY-MM-DD' },
            includeAllWorkouts: { type: 'boolean', description: 'If true, returns all workouts regardless of date' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({
                  where: { id: params.goalId, userId, deletedAt: null },
              })
            : await prisma.goal.findFirst({
                  where: { userId, isActive: true, deletedAt: null },
                  orderBy: { createdAt: 'desc' },
              });

        if (!goal) {
            return { plan: null, message: 'No active training plan found' };
        }

        let workoutWhere: any = { goalId: goal.id };

        if (!params.includeAllWorkouts) {
            const start = params.startDate
                ? new Date(params.startDate)
                : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const end = params.endDate
                ? new Date(params.endDate)
                : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);

            workoutWhere.scheduledDate = {
                gte: start,
                lte: end,
            };
        }

        const workouts = await prisma.workout.findMany({
            where: workoutWhere,
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        const coachingSummaries = await prisma.planSnapshot.findMany({
            where: {
                goalId: goal.id,
                operation: 'coaching_summary',
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        return {
            goal: {
                id: goal.id,
                name: goal.name,
                raceType: goal.raceType,
                raceDate: goal.raceDate,
                planStartDate: goal.planStartDate,
                targetTime: goal.targetTime,
                currentVdot: goal.currentVdot,
                ftpAtCreation: goal.ftpAtCreation,
                swimCssAtCreation: goal.swimCssAtCreation,
                weeklyMileageGoal: goal.weeklyMileageGoal,
                weeklyBikeTssGoal: goal.weeklyBikeTssGoal,
                weeklySwimMetersGoal: goal.weeklySwimMetersGoal,
                targetWeeklyTss: goal.targetWeeklyTss,
                phaseBlocks: goal.phaseBlocks,
            },
            coachingSummaries: coachingSummaries.map(s => ({
                id: s.id,
                createdAt: s.createdAt,
                description: s.description,
                data: s.snapshot,
            })),
            workoutsCount: workouts.length,
            workouts: workouts.map(w => ({
                id: w.id,
                scheduledDate: w.scheduledDate,
                workoutType: w.workoutType,
                sport: w.sport,
                phase: w.phase,
                order: w.order,
                description: w.description,
                customName: w.customName,
                notes: w.notes,
                targetDistance: w.targetDistance,
                targetDuration: w.targetDuration,
                targetPace: w.targetPace,
                targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm,
                targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm,
                targetPowerWatts: w.targetPowerWatts,
                targetPowerMinWatts: w.targetPowerMinWatts,
                targetPowerMaxWatts: w.targetPowerMaxWatts,
                targetHrMinBpm: w.targetHrMinBpm,
                targetHrMaxBpm: w.targetHrMaxBpm,
                plannedTss: w.plannedTss,
                isCompleted: w.isCompleted,
                completedAt: w.completedAt,
                linkedActivityId: w.linkedActivityId,
                structuredSteps: w.structuredSteps,
            })),
        };
    },
};

const getRecentActivitiesTool: McpTool = {
    name: 'get_recent_activities',
    description: 'Get completed activities in a date window with strict Strava compliance scrubbing applied.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (1..180, default: 30)' },
            sportType: { type: 'string', description: 'Filter by sport type (e.g. RUN, RIDE, SWIM)' },
            limit: { type: 'number', description: 'Maximum activities to return (default: 50)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 30, 1), 180);
        const limit = Math.min(Math.max(params.limit || 50, 1), 100);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: cutoff },
                ...(params.sportType ? { type: params.sportType as any } : {}),
            },
            orderBy: { startDate: 'desc' },
            take: limit,
        });

        // HARD STRAVA API COMPLIANCE RULE:
        // For any activity with stravaId != null, NEVER include name, description, rawJson,
        // streams, laps, or splits GPS/sensor arrays. Return only RunFlow computed derivative metrics.
        return activities.map(a => {
            const isStrava = a.stravaId !== null && a.stravaId !== undefined;
            if (isStrava) {
                return {
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
                    intensityFactor: a.intensityFactor,
                    variabilityIndex: a.variabilityIndex,
                    bikeTss: a.bikeTss,
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
                    stravaComplianceNotice:
                        'Activity title, description, and raw GPS/sensor streams are omitted for Strava-synced activities per Strava API terms. To inspect raw Strava activity details or streams, please use the official Strava MCP server.',
                };
            }

            return {
                id: a.id,
                name: a.name,
                description: a.description,
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
                intensityFactor: a.intensityFactor,
                variabilityIndex: a.variabilityIndex,
                bikeTss: a.bikeTss,
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
        });
    },
};

const getReadinessAndHealthTool: McpTool = {
    name: 'get_readiness_and_health',
    description: 'Get latest DailyReadinessRecord (composite readiness score, sleep, HRV, RHR) and recent DailyHealthLog records.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            days: { type: 'number', description: 'Lookback window in days (default: 7, max: 30)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const days = Math.min(Math.max(params.days || 7, 1), 30);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const readinessRecords = await prisma.dailyReadinessRecord.findMany({
            where: {
                userId,
                date: { gte: cutoff },
            },
            orderBy: { date: 'desc' },
            take: days,
        });

        const healthLogs = await prisma.dailyHealthLog.findMany({
            where: {
                userId,
                date: { gte: cutoff },
            },
            orderBy: { date: 'desc' },
            take: days,
        });

        const baseline = await prisma.readinessBaseline.findFirst({
            where: { userId },
        });

        return {
            latestReadiness: readinessRecords.length > 0 ? readinessRecords[0] : null,
            readinessHistory: readinessRecords,
            healthLogs,
            baseline,
        };
    },
};

// -------------------------------------------------------------
// Write / Mutation Tools
// -------------------------------------------------------------

const createTrainingPlanTool: McpTool = {
    name: 'create_training_plan',
    description: 'Create and persist a complete training plan with structured workouts and phase blocks.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Name of the plan or race' },
            raceType: { type: 'string', description: 'Race distance or event type (e.g. MARATHON, HALF_MARATHON, TEN_K, FIVE_K, HALF_IRONMAN)' },
            raceDate: { type: 'string', description: 'Race date in YYYY-MM-DD' },
            targetTime: { type: 'number', description: 'Goal race time in seconds' },
            planStartDate: { type: 'string', description: 'Start date in YYYY-MM-DD' },
            weeklyMileageGoal: { type: 'number', description: 'Peak weekly running volume in meters' },
            runsPerWeek: { type: 'number', description: 'Number of runs per week' },
            ridesPerWeek: { type: 'number', description: 'Number of bike rides per week' },
            swimsPerWeek: { type: 'number', description: 'Number of swim sessions per week' },
            sport: { type: 'string', description: 'Plan sport (RUN, TRIATHLON, NO_RACE)' },
        },
        required: ['name', 'raceType'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;

        if (params.raceDate) {
            const raceDate = new Date(params.raceDate);
            if (isNaN(raceDate.getTime())) {
                throw new Error('Invalid raceDate format');
            }
            if (Math.abs(raceDate.getTime() - Date.now()) > 104 * 7 * 24 * 60 * 60 * 1000) {
                throw new Error('Race date must be within 104 weeks from today');
            }
        }

        const result = await createPlanWithWorkouts({
            userId,
            name: params.name,
            raceType: params.raceType as RaceType,
            raceDate: params.raceDate || null,
            targetTime: params.targetTime || null,
            planStartDate: params.planStartDate || null,
            weeklyMileageGoal: params.weeklyMileageGoal || null,
            runsPerWeek: params.runsPerWeek || null,
            ridesPerWeek: params.ridesPerWeek || null,
            swimsPerWeek: params.swimsPerWeek || null,
            sport: (params.sport as PlanSport) || 'RUN',
            deactivateExisting: true,
        });

        // Create snapshot of initial state
        await createSnapshot(result.goal.id, 'Initial plan creation via MCP', 'ai_mcp_mutation');
        const safetyAdvisory = await evaluatePlanSafety(result.goal.id);

        return {
            success: true,
            goalId: result.goal.id,
            goal: result.goal,
            safetyAdvisory,
        };
    },
};

const updateTrainingPlanPhasesTool: McpTool = {
    name: 'update_training_plan_phases',
    description: 'Update plan phase blocks, weekly volume & TSS targets, race date, or target time.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID to update' },
            phaseBlocks: { type: 'array', description: 'Updated structured phaseBlocks array' },
            weeklyMileageGoal: { type: 'number', description: 'Peak weekly running distance in meters' },
            weeklyBikeTssGoal: { type: 'number', description: 'Peak weekly cycling TSS' },
            weeklySwimMetersGoal: { type: 'number', description: 'Peak weekly swim volume in meters' },
            targetWeeklyTss: { type: 'number', description: 'Target weekly total TSS' },
            raceDate: { type: 'string', description: 'New race date in YYYY-MM-DD' },
            targetTime: { type: 'number', description: 'Target race time in seconds' },
        },
        required: ['goalId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = await prisma.goal.findFirst({
            where: { id: params.goalId, userId, deletedAt: null },
        });

        if (!goal) throw new Error('Goal not found or access denied');

        await createSnapshot(goal.id, 'Update plan phases and targets via MCP', 'ai_mcp_mutation');

        const updated = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                ...(params.phaseBlocks !== undefined && { phaseBlocks: params.phaseBlocks }),
                ...(params.weeklyMileageGoal !== undefined && { weeklyMileageGoal: params.weeklyMileageGoal }),
                ...(params.weeklyBikeTssGoal !== undefined && { weeklyBikeTssGoal: params.weeklyBikeTssGoal }),
                ...(params.weeklySwimMetersGoal !== undefined && { weeklySwimMetersGoal: params.weeklySwimMetersGoal }),
                ...(params.targetWeeklyTss !== undefined && { targetWeeklyTss: params.targetWeeklyTss }),
                ...(params.raceDate !== undefined && { raceDate: params.raceDate ? new Date(params.raceDate) : null }),
                ...(params.targetTime !== undefined && { targetTime: params.targetTime }),
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: updated.id,
            updatedGoal: updated,
            safetyAdvisory,
        };
    },
};

const structuredStepsSchema = {
    type: 'object',
    description: 'Structured workout steps v2 tree (version: 2, steps: Array<Step | RepeatGroup>). Supports nested repeats, distance/time durations, and pace/power/hr/cadence/rpe targets.',
    properties: {
        version: { type: 'number', description: 'Schema version (2)' },
        source: { type: 'string', description: 'Source identifier (e.g. mcp, engine, coach, editor)' },
        sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'], description: 'Primary workout sport' },
        steps: {
            type: 'array',
            description: 'Ordered list of step nodes (StructuredStep or RepeatGroup)',
            items: {
                type: 'object',
                properties: {
                    kind: {
                        type: 'string',
                        enum: ['warmup', 'work', 'recovery', 'cooldown', 'steady', 'transition', 'repeat'],
                        description: 'Step kind: warmup, work, recovery, cooldown, steady, transition, or repeat for blocks',
                    },
                    label: { type: 'string', description: 'Step label or title' },
                    times: { type: 'number', description: 'Number of times to repeat steps (for kind: repeat, 1-100)' },
                    setRest: {
                        type: 'object',
                        description: 'Rest duration between repeat sets',
                        properties: {
                            type: { type: 'string', enum: ['time', 'distance', 'lap_press'] },
                            seconds: { type: 'number' },
                            meters: { type: 'number' },
                        },
                    },
                    duration: {
                        type: 'object',
                        description: 'Step duration (distance, time, or lap_press)',
                        properties: {
                            type: { type: 'string', enum: ['distance', 'time', 'lap_press'] },
                            meters: { type: 'number', description: 'Distance in meters' },
                            seconds: { type: 'number', description: 'Time in seconds' },
                        },
                    },
                    target: {
                        type: 'object',
                        description: 'Target intensity (pace, power, hr, cadence, rpe, free)',
                        properties: {
                            type: { type: 'string', enum: ['pace', 'power', 'hr', 'cadence', 'rpe', 'free'] },
                            unit: { type: 'string', enum: ['sec_per_km', 'sec_per_100m', 'sec_per_mile'] },
                            min: { type: 'number', description: 'Fast pace bound in seconds' },
                            max: { type: 'number', description: 'Slow pace bound in seconds' },
                            minWatts: { type: 'number', description: 'Lower power bound in watts' },
                            maxWatts: { type: 'number', description: 'Upper power bound in watts' },
                            ftpPercent: { type: 'number', description: 'Percentage of FTP' },
                            zoneLabel: { type: 'string', description: 'Zone label (e.g. E, M, T, Z2, etc.)' },
                            minBpm: { type: 'number', description: 'Lower HR bound in bpm' },
                            maxBpm: { type: 'number', description: 'Upper HR bound in bpm' },
                            zone: { type: 'number', description: 'HR zone number (1-5)' },
                            value: { type: 'number', description: 'RPE value (1-10)' },
                        },
                    },
                    cadenceRpm: { type: 'number', description: 'Cadence RPM target' },
                    hrZone: { type: 'number', description: 'Target HR zone number' },
                    notes: { type: 'string', description: 'Step coaching notes' },
                    steps: {
                        type: 'array',
                        description: 'Nested child steps (for kind: repeat)',
                        items: { type: 'object' },
                    },
                },
            },
        },
    },
};

function normalizeMcpStructuredSteps(
    raw: any,
    workoutType?: string | null,
    sport?: string | null,
    vdot?: number,
    ftpWatts?: number,
): StructuredWorkoutV2 | null {
    if (!raw) return null;
    let candidate = raw;
    if (typeof candidate === 'object' && candidate !== null) {
        if (!candidate.version && (Array.isArray(candidate.steps) || Array.isArray(candidate))) {
            candidate = {
                version: 2,
                source: 'mcp',
                steps: Array.isArray(candidate) ? candidate : candidate.steps,
            };
        }
    }
    return parseStructuredWorkout(candidate, workoutType || sport, vdot, ftpWatts);
}

const createStructuredWorkoutTool: McpTool = {
    name: 'create_structured_workout',
    description: 'Insert a new structured workout with canonical steps, targets, and auto-computed planned TSS.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID to attach workout to' },
            scheduledDate: { type: 'string', description: 'Scheduled date in YYYY-MM-DD or ISO' },
            workoutType: { type: 'string', description: 'Workout type (e.g. INTERVALS, TEMPO, EASY, LONG_RUN, RIDE, SWIM)' },
            description: { type: 'string', description: 'Detailed workout description' },
            customName: { type: 'string', description: 'Custom display title' },
            sport: { type: 'string', description: 'Sport (RUN, BIKE, SWIM, STRENGTH)' },
            phase: { type: 'string', description: 'Phase (BASE, BUILD, PEAK, TAPER)' },
            order: { type: 'number', description: 'Order of workout within the day' },
            notes: { type: 'string', description: 'Athlete coaching notes' },
            targetDistance: { type: 'number', description: 'Target distance in meters' },
            targetDuration: { type: 'number', description: 'Target duration in seconds' },
            targetPace: { type: 'number', description: 'Target pace in seconds per km' },
            targetPaceMinSecondsPerKm: { type: 'number', description: 'Fast pace bound in sec/km' },
            targetPaceMaxSecondsPerKm: { type: 'number', description: 'Slow pace bound in sec/km' },
            targetPaceZoneLabel: { type: 'string', description: 'Target pace zone label (e.g. E, M, T, I, R)' },
            targetPowerWatts: { type: 'number', description: 'Target cycling watts' },
            targetPowerMinWatts: { type: 'number', description: 'Low power bound in watts' },
            targetPowerMaxWatts: { type: 'number', description: 'High power bound in watts' },
            targetPowerZone: { type: 'number', description: 'Target Coggan power zone (integer 1..7)' },
            targetFtpPercent: { type: 'number', description: 'Target intensity as % of FTP' },
            targetCadenceRpm: { type: 'number', description: 'Target cadence in RPM' },
            targetRpe: { type: 'number', description: 'Target RPE on 1-10 scale' },
            targetHrZone: { type: 'number', description: 'Target HR zone (1-5)' },
            targetHrMinBpm: { type: 'number', description: 'Low HR bound in bpm' },
            targetHrMaxBpm: { type: 'number', description: 'High HR bound in bpm' },
            plannedTss: { type: 'number', description: 'Planned TSS (auto-computed if omitted)' },
            structuredSteps: structuredStepsSchema,
        },
        required: ['goalId', 'scheduledDate', 'workoutType', 'description'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = await prisma.goal.findFirst({
            where: { id: params.goalId, userId, deletedAt: null },
        });

        if (!goal) throw new Error('Goal not found or access denied');

        await createSnapshot(goal.id, `Create workout ${params.workoutType} on ${params.scheduledDate}`, 'ai_mcp_mutation');

        const sport = params.sport || (params.workoutType?.startsWith('RIDE') ? 'BIKE' : params.workoutType?.startsWith('SWIM') ? 'SWIM' : 'RUN');
        const vdot = goal.currentVdot || 45;
        const ftpWatts = goal.ftpAtCreation || undefined;

        let structuredSteps = normalizeMcpStructuredSteps(
            params.structuredSteps,
            params.workoutType,
            sport,
            vdot,
            ftpWatts,
        );

        if (!structuredSteps) {
            structuredSteps = buildStructuredStepsForWorkout(
                {
                    type: params.workoutType as WorkoutType,
                    description: params.description,
                    totalDistance: params.targetDistance || 0,
                    targetDuration: params.targetDuration || null,
                    targetPace: params.targetPace || null,
                    targetHrZone: params.targetHrZone || null,
                } as any,
                { vdot, ftpWatts },
            );
        }

        let targetDistance = params.targetDistance ?? null;
        let targetDuration = params.targetDuration ?? null;
        let targetPaceMinSecondsPerKm = params.targetPaceMinSecondsPerKm ?? null;
        let targetPaceMaxSecondsPerKm = params.targetPaceMaxSecondsPerKm ?? null;
        let targetPowerMinWatts = params.targetPowerMinWatts ?? null;
        let targetPowerMaxWatts = params.targetPowerMaxWatts ?? null;
        let plannedTss = params.plannedTss;

        if (structuredSteps) {
            const summary = summarizeStructuredWorkout(structuredSteps, params.targetPace, ftpWatts);
            const flattened = flattenStructuredWorkout(structuredSteps);

            let derivedMinPace: number | undefined;
            let derivedMaxPace: number | undefined;
            let derivedMinWatts: number | undefined;
            let derivedMaxWatts: number | undefined;

            for (const s of flattened) {
                if (s.target?.type === 'pace') {
                    if (s.target.min) derivedMinPace = derivedMinPace ? Math.min(derivedMinPace, s.target.min) : s.target.min;
                    if (s.target.max) derivedMaxPace = derivedMaxPace ? Math.max(derivedMaxPace, s.target.max) : s.target.max;
                } else if (s.target?.type === 'power') {
                    if (s.target.minWatts) derivedMinWatts = derivedMinWatts ? Math.min(derivedMinWatts, s.target.minWatts) : s.target.minWatts;
                    if (s.target.maxWatts) derivedMaxWatts = derivedMaxWatts ? Math.max(derivedMaxWatts, s.target.maxWatts) : s.target.maxWatts;
                }
            }

            if (targetDistance == null && summary.totalDistanceMeters > 0) {
                targetDistance = summary.totalDistanceMeters;
            }
            if (targetDuration == null && summary.totalDurationSeconds > 0) {
                targetDuration = summary.totalDurationSeconds;
            }
            if (targetPaceMinSecondsPerKm == null && derivedMinPace) {
                targetPaceMinSecondsPerKm = derivedMinPace;
            }
            if (targetPaceMaxSecondsPerKm == null && derivedMaxPace) {
                targetPaceMaxSecondsPerKm = derivedMaxPace;
            }
            if (targetPowerMinWatts == null && derivedMinWatts) {
                targetPowerMinWatts = derivedMinWatts;
            }
            if (targetPowerMaxWatts == null && derivedMaxWatts) {
                targetPowerMaxWatts = derivedMaxWatts;
            }
            if (plannedTss === undefined && summary.estimatedTss > 0) {
                plannedTss = summary.estimatedTss;
            }
        }

        if (plannedTss === undefined) {
            plannedTss = calculateWorkoutPlannedTss({
                workoutType: params.workoutType as WorkoutType,
                sport,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || null,
                targetPace: params.targetPace || null,
                structuredSteps: structuredSteps || null,
                ftpWatts,
            });
        }

        let normalizedPowerZone: number | null = null;
        if (params.targetPowerZone !== undefined && params.targetPowerZone !== null && params.targetPowerZone !== '') {
            const parsed = typeof params.targetPowerZone === 'number'
                ? Math.round(params.targetPowerZone)
                : parseInt(String(params.targetPowerZone).replace(/^Z/i, ''), 10);
            normalizedPowerZone = isNaN(parsed) ? null : parsed;
        }

        const workout = await prisma.workout.create({
            data: {
                goalId: goal.id,
                scheduledDate: new Date(params.scheduledDate),
                workoutType: params.workoutType as WorkoutType,
                description: params.description,
                customName: params.customName || null,
                sport,
                phase: (params.phase as PlanPhase) || 'BASE',
                order: params.order || 0,
                notes: params.notes || null,
                targetDistance: targetDistance || null,
                targetDuration: targetDuration || null,
                targetPace: params.targetPace || null,
                targetPaceMinSecondsPerKm: targetPaceMinSecondsPerKm || null,
                targetPaceMaxSecondsPerKm: targetPaceMaxSecondsPerKm || null,
                targetPaceZoneLabel: params.targetPaceZoneLabel || null,
                targetPowerWatts: params.targetPowerWatts || null,
                targetPowerMinWatts: targetPowerMinWatts || null,
                targetPowerMaxWatts: targetPowerMaxWatts || null,
                targetPowerZone: normalizedPowerZone,
                targetFtpPercent: params.targetFtpPercent ?? null,
                targetCadenceRpm: params.targetCadenceRpm ?? null,
                targetRpe: params.targetRpe ?? null,
                targetHrZone: params.targetHrZone ?? null,
                targetHrMinBpm: params.targetHrMinBpm || null,
                targetHrMaxBpm: params.targetHrMaxBpm || null,
                plannedTss,
                structuredSteps: (structuredSteps as any) || undefined,
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            workout,
            safetyAdvisory,
        };
    },
};

const modifyWorkoutTool: McpTool = {
    name: 'modify_workout',
    description: 'Update fields, description, structured steps, or targets on an existing workout and recalculate planned TSS.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to modify' },
            description: { type: 'string' },
            customName: { type: 'string' },
            workoutType: { type: 'string' },
            phase: { type: 'string' },
            sport: { type: 'string' },
            notes: { type: 'string' },
            targetDistance: { type: 'number' },
            targetDuration: { type: 'number' },
            targetPace: { type: 'number' },
            targetPaceMinSecondsPerKm: { type: 'number' },
            targetPaceMaxSecondsPerKm: { type: 'number' },
            targetPaceZoneLabel: { type: 'string', description: 'Target pace zone label (e.g. E, M, T, I, R)' },
            targetPowerWatts: { type: 'number' },
            targetPowerMinWatts: { type: 'number' },
            targetPowerMaxWatts: { type: 'number' },
            targetPowerZone: { type: 'number', description: 'Target Coggan power zone (integer 1..7)' },
            targetFtpPercent: { type: 'number', description: 'Target intensity as % of FTP' },
            targetCadenceRpm: { type: 'number', description: 'Target cadence in RPM' },
            targetRpe: { type: 'number', description: 'Target RPE on 1-10 scale' },
            targetHrZone: { type: 'number', description: 'Target HR zone (1-5)' },
            targetHrMinBpm: { type: 'number' },
            targetHrMaxBpm: { type: 'number' },
            plannedTss: { type: 'number' },
            structuredSteps: structuredStepsSchema,
        },
        required: ['workoutId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        await createSnapshot(workout.goalId, `Modify workout ${workout.id}`, 'ai_mcp_mutation');

        const workoutType = (params.workoutType || workout.workoutType) as WorkoutType;
        const sport = params.sport || workout.sport;
        const vdot = workout.goal.currentVdot || 45;
        const ftpWatts = workout.goal.ftpAtCreation || undefined;

        let structuredSteps: StructuredWorkoutV2 | null = workout.structuredSteps
            ? parseStructuredWorkout(workout.structuredSteps)
            : null;
        if (params.structuredSteps !== undefined) {
            structuredSteps = normalizeMcpStructuredSteps(
                params.structuredSteps,
                workoutType,
                sport,
                vdot,
                ftpWatts,
            );
        }

        let targetDistance = params.targetDistance !== undefined ? params.targetDistance : workout.targetDistance;
        let targetDuration = params.targetDuration !== undefined ? params.targetDuration : workout.targetDuration;
        let targetPaceMinSecondsPerKm = params.targetPaceMinSecondsPerKm !== undefined ? params.targetPaceMinSecondsPerKm : workout.targetPaceMinSecondsPerKm;
        let targetPaceMaxSecondsPerKm = params.targetPaceMaxSecondsPerKm !== undefined ? params.targetPaceMaxSecondsPerKm : workout.targetPaceMaxSecondsPerKm;
        let targetPowerMinWatts = params.targetPowerMinWatts !== undefined ? params.targetPowerMinWatts : workout.targetPowerMinWatts;
        let targetPowerMaxWatts = params.targetPowerMaxWatts !== undefined ? params.targetPowerMaxWatts : workout.targetPowerMaxWatts;
        let plannedTss = params.plannedTss;

        if (params.structuredSteps !== undefined && structuredSteps) {
            const summary = summarizeStructuredWorkout(structuredSteps, params.targetPace ?? workout.targetPace, ftpWatts);
            const flattened = flattenStructuredWorkout(structuredSteps);

            let derivedMinPace: number | undefined;
            let derivedMaxPace: number | undefined;
            let derivedMinWatts: number | undefined;
            let derivedMaxWatts: number | undefined;

            for (const s of flattened) {
                if (s.target?.type === 'pace') {
                    if (s.target.min) derivedMinPace = derivedMinPace ? Math.min(derivedMinPace, s.target.min) : s.target.min;
                    if (s.target.max) derivedMaxPace = derivedMaxPace ? Math.max(derivedMaxPace, s.target.max) : s.target.max;
                } else if (s.target?.type === 'power') {
                    if (s.target.minWatts) derivedMinWatts = derivedMinWatts ? Math.min(derivedMinWatts, s.target.minWatts) : s.target.minWatts;
                    if (s.target.maxWatts) derivedMaxWatts = derivedMaxWatts ? Math.max(derivedMaxWatts, s.target.maxWatts) : s.target.maxWatts;
                }
            }

            if (params.targetDistance === undefined && summary.totalDistanceMeters > 0) {
                targetDistance = summary.totalDistanceMeters;
            }
            if (params.targetDuration === undefined && summary.totalDurationSeconds > 0) {
                targetDuration = summary.totalDurationSeconds;
            }
            if (params.targetPaceMinSecondsPerKm === undefined && derivedMinPace) {
                targetPaceMinSecondsPerKm = derivedMinPace;
            }
            if (params.targetPaceMaxSecondsPerKm === undefined && derivedMaxPace) {
                targetPaceMaxSecondsPerKm = derivedMaxPace;
            }
            if (params.targetPowerMinWatts === undefined && derivedMinWatts) {
                targetPowerMinWatts = derivedMinWatts;
            }
            if (params.targetPowerMaxWatts === undefined && derivedMaxWatts) {
                targetPowerMaxWatts = derivedMaxWatts;
            }
            if (plannedTss === undefined && summary.estimatedTss > 0) {
                plannedTss = summary.estimatedTss;
            }
        }

        if (plannedTss === undefined) {
            plannedTss = calculateWorkoutPlannedTss({
                workoutType,
                sport,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || null,
                targetPace: (params.targetPace !== undefined ? params.targetPace : workout.targetPace) || null,
                structuredSteps: structuredSteps || null,
                ftpWatts,
            });
        }

        let normalizedPowerZone: number | null | undefined = undefined;
        if (params.targetPowerZone !== undefined) {
            if (params.targetPowerZone === null || params.targetPowerZone === '') {
                normalizedPowerZone = null;
            } else {
                const parsed = typeof params.targetPowerZone === 'number'
                    ? Math.round(params.targetPowerZone)
                    : parseInt(String(params.targetPowerZone).replace(/^Z/i, ''), 10);
                normalizedPowerZone = isNaN(parsed) ? null : parsed;
            }
        }

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: {
                ...(params.description !== undefined && { description: params.description }),
                ...(params.customName !== undefined && { customName: params.customName }),
                ...(params.workoutType !== undefined && { workoutType }),
                ...(params.phase !== undefined && { phase: params.phase as PlanPhase }),
                ...(params.sport !== undefined && { sport }),
                ...(params.notes !== undefined && { notes: params.notes }),
                ...(targetDistance !== undefined && { targetDistance }),
                ...(targetDuration !== undefined && { targetDuration }),
                ...(params.targetPace !== undefined && { targetPace: params.targetPace }),
                ...(targetPaceMinSecondsPerKm !== undefined && { targetPaceMinSecondsPerKm }),
                ...(targetPaceMaxSecondsPerKm !== undefined && { targetPaceMaxSecondsPerKm }),
                ...(params.targetPaceZoneLabel !== undefined && { targetPaceZoneLabel: params.targetPaceZoneLabel }),
                ...(params.targetPowerWatts !== undefined && { targetPowerWatts: params.targetPowerWatts }),
                ...(targetPowerMinWatts !== undefined && { targetPowerMinWatts }),
                ...(targetPowerMaxWatts !== undefined && { targetPowerMaxWatts }),
                ...(normalizedPowerZone !== undefined && { targetPowerZone: normalizedPowerZone }),
                ...(params.targetFtpPercent !== undefined && { targetFtpPercent: params.targetFtpPercent }),
                ...(params.targetCadenceRpm !== undefined && { targetCadenceRpm: params.targetCadenceRpm }),
                ...(params.targetRpe !== undefined && { targetRpe: params.targetRpe }),
                ...(params.targetHrZone !== undefined && { targetHrZone: params.targetHrZone }),
                ...(params.targetHrMinBpm !== undefined && { targetHrMinBpm: params.targetHrMinBpm }),
                ...(params.targetHrMaxBpm !== undefined && { targetHrMaxBpm: params.targetHrMaxBpm }),
                plannedTss,
                ...(params.structuredSteps !== undefined && { structuredSteps: (structuredSteps as any) ?? undefined }),
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            safetyAdvisory,
        };
    },
};

const rescheduleWorkoutTool: McpTool = {
    name: 'reschedule_workout',
    description: 'Reschedule a workout to a new date and optional order.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to reschedule' },
            scheduledDate: { type: 'string', description: 'Target date in YYYY-MM-DD' },
            order: { type: 'number', description: 'Optional order within the target day' },
        },
        required: ['workoutId', 'scheduledDate'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        await createSnapshot(workout.goalId, `Reschedule workout ${workout.id} to ${params.scheduledDate}`, 'ai_mcp_mutation');

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: {
                scheduledDate: new Date(params.scheduledDate),
                ...(params.order !== undefined && { order: params.order }),
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            safetyAdvisory,
        };
    },
};

const swapWorkoutsTool: McpTool = {
    name: 'swap_workouts',
    description: 'Swap scheduled dates and orders between two planned workouts.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutIdA: { type: 'string', description: 'First workout ID' },
            workoutIdB: { type: 'string', description: 'Second workout ID' },
        },
        required: ['workoutIdA', 'workoutIdB'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workoutA = await prisma.workout.findUnique({
            where: { id: params.workoutIdA },
            include: { goal: true },
        });
        const workoutB = await prisma.workout.findUnique({
            where: { id: params.workoutIdB },
            include: { goal: true },
        });

        if (!workoutA || !workoutB || workoutA.goal.userId !== userId || workoutB.goal.userId !== userId) {
            throw new Error('Workouts not found or access denied');
        }

        if (params.workoutIdA === params.workoutIdB) {
            return {
                success: true,
                workoutA,
                workoutB: workoutA,
                safetyAdvisory: [],
            };
        }

        await createSnapshot(workoutA.goalId, `Swap workouts ${workoutA.id} and ${workoutB.id}`, 'ai_mcp_mutation');
        if (workoutA.goalId !== workoutB.goalId) {
            await createSnapshot(workoutB.goalId, `Swap workouts ${workoutA.id} and ${workoutB.id}`, 'ai_mcp_mutation');
        }

        const [updatedA, updatedB] = await prisma.$transaction([
            prisma.workout.update({
                where: { id: workoutA.id },
                data: {
                    scheduledDate: workoutB.scheduledDate,
                    order: workoutB.order,
                },
            }),
            prisma.workout.update({
                where: { id: workoutB.id },
                data: {
                    scheduledDate: workoutA.scheduledDate,
                    order: workoutA.order,
                },
            }),
        ]);

        const safetyAdvisory = await evaluatePlanSafety(workoutA.goalId);

        return {
            success: true,
            workoutA: updatedA,
            workoutB: updatedB,
            safetyAdvisory,
        };
    },
};

const deleteWorkoutTool: McpTool = {
    name: 'delete_workout',
    description: 'Delete a planned workout from the training plan after taking an auto-snapshot.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to delete' },
        },
        required: ['workoutId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        await createSnapshot(workout.goalId, `Delete workout ${workout.id} (${workout.description})`, 'ai_mcp_mutation');

        await prisma.workout.delete({
            where: { id: workout.id },
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            deletedWorkoutId: params.workoutId,
            safetyAdvisory,
        };
    },
};

const markWorkoutStatusTool: McpTool = {
    name: 'mark_workout_status',
    description: 'Mark workout as completed or uncompleted, optionally link an activity, and trigger adaptive plan recalibration.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'Workout ID' },
            isCompleted: { type: 'boolean', description: 'Completion status' },
            completedAt: { type: 'string', description: 'ISO completion timestamp' },
            linkedActivityId: { type: 'string', description: 'Activity ID to link' },
        },
        required: ['workoutId', 'isCompleted'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        if (params.linkedActivityId) {
            const ownedActivity = await prisma.activity.findFirst({
                where: { id: params.linkedActivityId, userId },
                select: { id: true },
            });
            if (!ownedActivity) {
                throw new Error('Linked activity not found or access denied');
            }
        }

        await createSnapshot(workout.goalId, `Mark workout ${workout.id} as ${params.isCompleted ? 'completed' : 'uncompleted'}`, 'ai_mcp_mutation');

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: {
                isCompleted: params.isCompleted,
                completedAt: params.isCompleted
                    ? params.completedAt
                        ? new Date(params.completedAt)
                        : new Date()
                    : null,
                linkedActivityId: params.linkedActivityId || null,
            },
        });

        if (params.isCompleted) {
            await adaptPlanAfterCompletion(workout.goalId, userId).catch(err => {
                console.warn('Adaptation after completion error:', err);
            });
        }

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            safetyAdvisory,
        };
    },
};

const recalibrateThresholdsTool: McpTool = {
    name: 'recalibrate_thresholds',
    description: 'Update athlete thresholds (VDOT, Bike FTP, Swim CSS, HR zones), recalculate future workout paces/targets, and update fitness cache.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            vdot: { type: 'number', description: 'New VDOT score' },
            ftpWatts: { type: 'number', description: 'New Cycling FTP in Watts' },
            swimCssSecPer100m: { type: 'number', description: 'New Swim CSS in seconds per 100m' },
            thresholdHeartRate: { type: 'number', description: 'Lactate threshold heart rate in bpm' },
            hrMax: { type: 'number', description: 'Maximum heart rate in bpm' },
            hrRest: { type: 'number', description: 'Resting heart rate in bpm' },
            hrZone1Max: { type: 'number' },
            hrZone2Max: { type: 'number' },
            hrZone3Max: { type: 'number' },
            hrZone4Max: { type: 'number' },
            hrZone5Max: { type: 'number' },
            hrZone6Max: { type: 'number' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;

        // Update user thresholds
        await prisma.user.update({
            where: { id: userId },
            data: {
                ...(params.ftpWatts !== undefined && { ftpWatts: params.ftpWatts }),
                ...(params.swimCssSecPer100m !== undefined && { swimCssSecPer100m: params.swimCssSecPer100m }),
                ...(params.thresholdHeartRate !== undefined && { thresholdHeartRate: params.thresholdHeartRate }),
                ...(params.hrMax !== undefined && { hrMax: params.hrMax }),
                ...(params.hrRest !== undefined && { hrRest: params.hrRest }),
                ...(params.hrZone1Max !== undefined && { hrZone1Max: params.hrZone1Max }),
                ...(params.hrZone2Max !== undefined && { hrZone2Max: params.hrZone2Max }),
                ...(params.hrZone3Max !== undefined && { hrZone3Max: params.hrZone3Max }),
                ...(params.hrZone4Max !== undefined && { hrZone4Max: params.hrZone4Max }),
                ...(params.hrZone5Max !== undefined && { hrZone5Max: params.hrZone5Max }),
                ...(params.hrZone6Max !== undefined && { hrZone6Max: params.hrZone6Max }),
            },
        });

        const activeGoal = await prisma.goal.findFirst({
            where: { userId, isActive: true, deletedAt: null },
        });

        let safetyAdvisory: any[] = [];

        if (activeGoal) {
            await createSnapshot(activeGoal.id, 'Recalibrate thresholds via MCP', 'ai_mcp_mutation');

            if (params.vdot !== undefined || params.thresholdHeartRate !== undefined || params.hrMax !== undefined) {
                const effectiveVdot = params.vdot || activeGoal.currentVdot || 45;
                await recalculateWorkoutPaces(activeGoal.id, effectiveVdot, {
                    thresholdHeartRate: params.thresholdHeartRate,
                    hrMax: params.hrMax,
                    hrRest: params.hrRest,
                    hrZone1Max: params.hrZone1Max,
                    hrZone2Max: params.hrZone2Max,
                    hrZone3Max: params.hrZone3Max,
                    hrZone4Max: params.hrZone4Max,
                    hrZone5Max: params.hrZone5Max,
                    hrZone6Max: params.hrZone6Max,
                });
            }

            if (params.ftpWatts !== undefined) {
                const bikeWorkouts = await prisma.workout.findMany({
                    where: {
                        goalId: activeGoal.id,
                        isCompleted: false,
                        sport: 'BIKE',
                    },
                });

                for (const bw of bikeWorkouts) {
                    const newTss = calculateWorkoutPlannedTss({
                        workoutType: bw.workoutType,
                        sport: 'BIKE',
                        targetDistance: bw.targetDistance || 0,
                        targetDuration: bw.targetDuration || null,
                        structuredSteps: bw.structuredSteps || null,
                        ftpWatts: params.ftpWatts,
                    });

                    await prisma.workout.update({
                        where: { id: bw.id },
                        data: { plannedTss: newTss },
                    });
                }
            }

            await updateFitnessCache(userId, [{ startDate: new Date() }]).catch(() => {});
            safetyAdvisory = await evaluatePlanSafety(activeGoal.id);
        }

        return {
            success: true,
            updatedThresholds: params,
            safetyAdvisory,
        };
    },
};

const importPlanWorkoutsBatchTool: McpTool = {
    name: 'import_plan_workouts_batch',
    description: 'Batch-import multiple workouts (e.g., extracted from a MyWhoosh/TrainingPeaks calendar screenshot or CSV table in AI chat) into the active training plan in a single atomic operation with an undo snapshot.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Optional goalId. Defaults to the active plan.' },
            replaceExistingUncompleted: {
                type: 'boolean',
                description: 'If true, clears existing uncompleted workouts in the date range before inserting.',
            },
            workouts: {
                type: 'array',
                description: 'Array of workouts extracted from the calendar screenshot or schedule (max 200).',
                items: {
                    type: 'object',
                    properties: {
                        scheduledDate: { type: 'string', description: 'ISO date YYYY-MM-DD' },
                        workoutType: {
                            type: 'string',
                            description: 'RIDE, RIDE_INTERVALS, LONG_RIDE, EASY, LONG_RUN, TEMPO, INTERVALS, FARTLEK, RECOVERY, SWIM, STRENGTH, REST, OTHER',
                        },
                        customName: { type: 'string', description: 'Workout title (e.g. Sweet Spot 3x10m)' },
                        description: { type: 'string', description: 'Workout structure / interval summary' },
                        targetDurationMinutes: { type: 'number', description: 'Planned duration in minutes' },
                        targetDistanceMeters: { type: 'number', description: 'Planned distance in meters (optional)' },
                        targetFtpPercent: { type: 'number', description: 'Target %FTP for cycling workouts (e.g. 88)' },
                        plannedTss: { type: 'number', description: 'Planned TSS if shown on calendar' },
                        phase: { type: 'string', description: 'BASE, BUILD, PEAK, TAPER, RACE_WEEK, RECOVERY' },
                    },
                    required: ['scheduledDate', 'workoutType'],
                },
            },
        },
        required: ['workouts'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        if (!Array.isArray(params.workouts) || params.workouts.length === 0) {
            throw new Error('workouts must be a non-empty array');
        }
        if (params.workouts.length > 200) {
            throw new Error('Maximum 200 workouts per batch import call');
        }

        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: String(params.goalId), userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null } });

        if (!goal) {
            throw new Error('No active training plan found. Call create_training_plan first.');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { ftpWatts: true },
        });
        const ftpWatts = user?.ftpWatts || goal.ftpAtCreation || 200;
        const vdot = goal.currentVdot || 45;

        await createSnapshot(goal.id, 'Before MCP batch calendar import', 'mcp_batch_import');

        const validTypes = new Set<string>(Object.values(WorkoutType));
        const validPhases = new Set<string>(Object.values(PlanPhase));

        const rows = params.workouts.map((raw: any, idx: number) => {
            const d = new Date(raw.scheduledDate);
            if (isNaN(d.getTime())) {
                throw new Error(`Invalid scheduledDate at index ${idx}: ${raw.scheduledDate}`);
            }
            const wt = validTypes.has(String(raw.workoutType).toUpperCase())
                ? (String(raw.workoutType).toUpperCase() as WorkoutType)
                : WorkoutType.RIDE;
            const phase = validPhases.has(String(raw.phase || '').toUpperCase())
                ? (String(raw.phase).toUpperCase() as PlanPhase)
                : PlanPhase.BASE;
            const durationSec = typeof raw.targetDurationMinutes === 'number' && raw.targetDurationMinutes > 0
                ? Math.min(86400, Math.round(raw.targetDurationMinutes * 60))
                : null;
            const distM = typeof raw.targetDistanceMeters === 'number' && raw.targetDistanceMeters > 0
                ? Math.min(300000, Math.round(raw.targetDistanceMeters))
                : null;
            const ftpPct = typeof raw.targetFtpPercent === 'number' && raw.targetFtpPercent > 0
                ? Math.min(250, Math.max(20, Math.round(raw.targetFtpPercent)))
                : null;
            const isBike = wt === 'RIDE' || wt === 'LONG_RIDE' || wt === 'RIDE_INTERVALS' || wt === 'BRICK';
            const sport = isBike ? 'BIKE' : wt === 'SWIM' || wt === 'OPEN_WATER_SWIM' ? 'SWIM' : 'RUN';
            const desc = String(raw.description || raw.customName || wt).slice(0, 1000);
            const structuredSteps = buildStructuredStepsForWorkout(
                {
                    type: wt,
                    description: desc,
                    totalDistance: distM ?? 0,
                    targetDuration: durationSec ?? 3600,
                    targetPace: null,
                    targetHrZone: null,
                } as any,
                { vdot, ftpWatts },
            );
            return {
                goalId: goal.id,
                scheduledDate: d,
                workoutType: wt,
                sport,
                phase,
                customName: raw.customName ? String(raw.customName).slice(0, 160) : null,
                description: desc,
                targetDuration: durationSec,
                targetDistance: distM,
                targetFtpPercent: ftpPct,
                targetPowerWatts: ftpPct ? Math.round((ftpWatts * ftpPct) / 100) : null,
                plannedTss: typeof raw.plannedTss === 'number' ? raw.plannedTss : null,
                structuredSteps: structuredSteps as any,
                order: idx,
            };
        });

        await prisma.$transaction(async (tx) => {
            if (params.replaceExistingUncompleted) {
                const dates = rows.map((r: { scheduledDate: Date }) => r.scheduledDate.getTime());
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                await tx.workout.deleteMany({
                    where: {
                        goalId: goal.id,
                        isCompleted: false,
                        scheduledDate: { gte: minDate, lte: maxDate },
                    },
                });
            }
            await tx.workout.createMany({ data: rows });
        });

        return {
            success: true,
            goalId: goal.id,
            importedCount: rows.length,
            firstDate: rows[0]?.scheduledDate.toISOString().split('T')[0],
            lastDate: rows[rows.length - 1]?.scheduledDate.toISOString().split('T')[0],
        };
    },
};

const saveWeeklyCoachingSummaryTool: McpTool = {
    name: 'save_weekly_coaching_summary',
    description: 'Save a weekly coaching advice summary with action items into plan snapshots (rendered on calendar and plan header).',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID (defaults to active plan)' },
            weekNumber: { type: 'number', description: 'Training plan week number' },
            startDate: { type: 'string', description: 'Start date of the week in YYYY-MM-DD' },
            summary: { type: 'string', description: 'Markdown-formatted coaching summary' },
            actionItems: { type: 'array', items: { type: 'string' }, description: 'Specific focus action items' },
        },
        required: ['summary'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const targetGoal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!targetGoal) throw new Error('Goal not found or access denied');

        const snapshot = await prisma.planSnapshot.create({
            data: {
                goalId: targetGoal.id,
                snapshot: {
                    weekNumber: params.weekNumber,
                    startDate: params.startDate,
                    summary: params.summary,
                    actionItems: params.actionItems || [],
                } as unknown as object[],
                description: params.summary.slice(0, 200),
                operation: 'coaching_summary',
            },
        });

        return {
            success: true,
            snapshotId: snapshot.id,
            operation: 'coaching_summary',
        };
    },
};

// -------------------------------------------------------------
// MCP Server Instance
// -------------------------------------------------------------

const paidMcpServer = new McpServer({
    name: 'runflow-personal',
    version: '2.4.0',
    instructions:
        'RunFlow Personal MCP server for paid premium athletes. Access full workout profiles, fitness metrics, cycling analytics, health & readiness, and manage training plans with automated safety advisories and snapshots.',
    tools: [
        getAthleteProfileTool,
        getFitnessMetricsTool,
        getCyclingAnalyticsTool,
        getTrainingPlanTool,
        getRecentActivitiesTool,
        getReadinessAndHealthTool,
        createTrainingPlanTool,
        updateTrainingPlanPhasesTool,
        createStructuredWorkoutTool,
        modifyWorkoutTool,
        rescheduleWorkoutTool,
        swapWorkoutsTool,
        deleteWorkoutTool,
        markWorkoutStatusTool,
        recalibrateThresholdsTool,
        importPlanWorkoutsBatchTool,
        saveWeeklyCoachingSummaryTool,
    ],
});

// -------------------------------------------------------------
// Authentication & Paid Premium Verification Helper
// -------------------------------------------------------------

async function authenticatePaidUser(request: Request): Promise<{
    user: any;
    userId: string;
    isPaidPremium: boolean;
    authType: 'oauth' | 'api_key';
} | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    // 1. Check OAuth Bearer token (rf_mcp_...)
    const oauthMatch = authHeader.match(/^Bearer\s+(rf_mcp_\S+)$/i);
    if (oauthMatch) {
        const oauthResult = await validateMcpOAuthToken(oauthMatch[1]);
        if (oauthResult && oauthResult.valid) {
            return {
                user: oauthResult.user,
                userId: oauthResult.userId,
                isPaidPremium: oauthResult.isPaidPremium,
                authType: 'oauth',
            };
        }
        return null;
    }

    // 2. Check API key (rf_...)
    const apiKeyResult = await validateApiKey(authHeader);
    if (apiKeyResult) {
        const user = await prisma.user.findUnique({
            where: { id: apiKeyResult.userId },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
                aiSettings: {
                    select: {
                        usageTier: true,
                        aiEnabled: true,
                    },
                },
            },
        });

        if (user) {
            return {
                user,
                userId: user.id,
                isPaidPremium: isUserPaidPremium(user),
                authType: 'api_key',
            };
        }
    }

    return null;
}

// -------------------------------------------------------------
// Route Handlers (OPTIONS, GET, POST)
// -------------------------------------------------------------

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

// MCP session teardown: clients (Claude Desktop, Cursor, etc.) DELETE /mcp with
// their Mcp-Session-Id header to end a session; this server is stateless, so 204.
export async function DELETE() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version',
        },
    });
}

export async function GET(request: NextRequest) {
    const origin = getOrigin(request);
    const auth = await authenticatePaidUser(request);

    if (!auth) {
        return new Response(
            JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
            {
                status: 401,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json',
                    'WWW-Authenticate': `Bearer realm="RunFlow MCP", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
                },
            }
        );
    }

    if (!auth.isPaidPremium) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32002,
                    message: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                },
            },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    return paidMcpServer.handleHttpRequest(request, {
        userId: auth.userId,
        user: auth.user,
        isPaidPremium: auth.isPaidPremium,
        authType: auth.authType,
    });
}

const WRITE_MCP_TOOLS = new Set([
    'log_workout_completion',
    'modify_workout',
    'create_training_plan',
    'delete_workout',
    'recalibrate_thresholds',
    'save_coaching_summary',
]);

export async function POST(request: NextRequest) {
    const origin = getOrigin(request);
    const auth = await authenticatePaidUser(request);

    if (!auth) {
        return new Response(
            JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
            {
                status: 401,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json',
                    'WWW-Authenticate': `Bearer realm="RunFlow MCP", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
                },
            }
        );
    }

    if (!auth.isPaidPremium) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32002,
                    message: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                },
            },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    // Rate limiting: 60 req / min per authenticated userId
    const rateLimit = await checkRateLimitAsync(auth.userId, {
        limit: 60,
        windowSeconds: 60,
        prefix: 'mcp-paid',
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32000,
                    message: 'Rate limit exceeded: 60 requests per minute allowed.',
                },
            },
            {
                status: 429,
                headers: {
                    ...CORS_HEADERS,
                    ...rateLimitHeaders(rateLimit),
                },
            }
        );
    }

    let body: any = null;
    try {
        const cloned = request.clone();
        body = await cloned.json();
    } catch {}

    if (body && typeof body === 'object') {
        const requests = Array.isArray(body) ? body : [body];
        for (const req of requests) {
            if (req && req.method === 'tools/call') {
                const toolName = req.params?.name;
                if (auth.authType === 'api_key' && toolName && WRITE_MCP_TOOLS.has(toolName)) {
                    return NextResponse.json(
                        {
                            jsonrpc: '2.0',
                            id: req.id ?? null,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        },
                        { status: 403, headers: CORS_HEADERS }
                    );
                }
            }
        }
    }

    return paidMcpServer.handleHttpRequest(request, {
        userId: auth.userId,
        user: auth.user,
        isPaidPremium: auth.isPaidPremium,
        authType: auth.authType,
    });
}
