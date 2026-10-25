import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { McpServer, type McpTool, applyPlanDefaults } from '@/lib/mcp/server';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig, type RateLimitResult } from '@/lib/rateLimit';
import { generateTrainingPlan, buildPlanPhaseBlocks, type PlanConfig } from '@/lib/plans';
import { calculateTrainingPaces, calculateVdot, predictRaceTime, formatPace, formatTime, type RaceDistance } from '@/lib/metrics/vdot';
import { calculateBikeZones, estimateBikeFtpFromVdot } from '@/lib/plans/bike-zones';
import { calculateSwimPaces, estimateSwimPaceFromVdot } from '@/lib/plans/swim-pace';
import { RaceType } from '@/generated/prisma/browser';

const PUBLIC_MCP_RATE_LIMIT: RateLimitConfig = {
    limit: 10,
    windowSeconds: 3600,
    prefix: 'mcp-public',
};

// Operator tier for bulk testing (e.g. plan generation from a local agent):
// a token matching PUBLIC_MCP_TOKEN (falling back to CRON_SECRET) via
// Authorization: Bearer or ?token= unlocks a high-volume bucket. Anonymous
// callers keep the 10/hour public limit.
// Operator hourly cap is configurable: PUBLIC_MCP_OPERATOR_LIMIT = requests per
// hour (unset or invalid → 600; 0 → unlimited).
const OPERATOR_HOURLY_LIMIT = (() => {
    const raw = Number.parseInt(process.env.PUBLIC_MCP_OPERATOR_LIMIT ?? '', 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : 600;
})();

const OPERATOR_MCP_RATE_LIMIT: RateLimitConfig = {
    limit: OPERATOR_HOURLY_LIMIT,
    windowSeconds: 3600,
    prefix: 'mcp-public-operator',
};

function operatorTokenMatches(provided: string, expected: string): boolean {
    if (!provided || !expected || provided.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function isOperatorRequest(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const provided = bearer || request.nextUrl.searchParams.get('token');
    if (!provided) return false;
    const dedicated = process.env.PUBLIC_MCP_TOKEN || '';
    if (dedicated && operatorTokenMatches(provided, dedicated)) return true;
    const cronSecret = process.env.CRON_SECRET || '';
    return cronSecret ? operatorTokenMatches(provided, cronSecret) : false;
}

async function checkPublicMcpRateLimit(request: NextRequest): Promise<RateLimitResult | null> {
    if (isOperatorRequest(request)) {
        if (OPERATOR_HOURLY_LIMIT === 0) {
            return null; // unlimited
        }
        return checkRateLimitAsync('operator', OPERATOR_MCP_RATE_LIMIT);
    }
    return checkRateLimitAsync(getClientIdentifier(request), PUBLIC_MCP_RATE_LIMIT);
}

const ALL_17_RACE_TYPES = [
    'FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON',
    'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE',
    'TWELVE_HOUR', 'TWENTY_FOUR_HOUR', 'BACKYARD_ULTRA',
    'CUSTOM_DISTANCE',
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
] as const;

function formatPaceMile(secPerKm: number): string {
    const secPerMile = Math.round(secPerKm * 1.609344);
    const mins = Math.floor(secPerMile / 60);
    const secs = Math.round(secPerMile % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
}

const TRI_RACE_TYPE_SET = new Set<string>([
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
]);
const ULTRA_RACE_TYPE_SET = new Set<string>([
    'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE',
    'TWELVE_HOUR', 'TWENTY_FOUR_HOUR', 'BACKYARD_ULTRA',
]);

function parseStrictRaceDate(raceDate: unknown): Date {
    if (typeof raceDate !== 'string' || !raceDate.trim()) {
        throw new Error('Invalid raceDate. Must be a valid date string (e.g. YYYY-MM-DD).');
    }
    const trimmed = raceDate.trim();
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    const raceDateObj = new Date(trimmed);
    if (isNaN(raceDateObj.getTime())) {
        throw new Error('Invalid raceDate. Must be a valid date string (e.g. YYYY-MM-DD).');
    }
    if (ymdMatch) {
        const year = Number(ymdMatch[1]);
        const month = Number(ymdMatch[2]);
        const day = Number(ymdMatch[3]);
        if (
            raceDateObj.getUTCFullYear() !== year ||
            raceDateObj.getUTCMonth() + 1 !== month ||
            raceDateObj.getUTCDate() !== day
        ) {
            throw new Error(`Invalid raceDate "${trimmed}". Calendar date does not exist.`);
        }
    }
    return raceDateObj;
}

function sanitizePublicOrigin(rawOrigin: string): string {
    try {
        const parsed = new URL(rawOrigin);
        if (parsed.hostname === '0.0.0.0' || parsed.hostname === '::' || parsed.hostname === '[::]') {
            parsed.hostname = 'localhost';
            if (!process.env.NEXTAUTH_URL && !process.env.NEXT_PUBLIC_APP_URL) {
                parsed.protocol = 'http:';
            }
        }
        return parsed.origin;
    } catch {
        return 'https://runflow.schuelken.uk';
    }
}

const generateRunningPlanTool: McpTool = {
    name: 'generate_running_plan',
    description: 'Generate a personalized running, ultra-marathon, or triathlon training plan with canonical structured steps, phase blocks, and training zones.',
    annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
    },
    inputSchema: {
        type: 'object',
        properties: {
            raceType: {
                type: 'string',
                enum: ALL_17_RACE_TYPES,
                description: 'Target race distance or event type (all 17 supported race types).',
            },
            raceDate: {
                type: 'string',
                description: 'Target race date in YYYY-MM-DD or ISO 8601 format (must be in the future).',
            },
            vdot: {
                type: 'number',
                minimum: 30,
                maximum: 85,
                description: 'Jack Daniels VDOT fitness score (30 to 85). If omitted, can be derived from raceDistance and raceTimeSeconds.',
            },
            raceDistance: {
                type: 'string',
                description: 'Recent race distance (5K, 10K, HALF, MARATHON, or meters) used with raceTimeSeconds to calculate VDOT.',
            },
            raceTimeSeconds: {
                type: 'number',
                description: 'Recent race finish time in seconds.',
            },
            runsPerWeek: {
                type: 'integer',
                minimum: 2,
                maximum: 7,
                description: 'Number of running sessions per week.',
            },
            ridesPerWeek: {
                type: 'integer',
                minimum: 0,
                maximum: 7,
                description: 'Number of cycling sessions per week.',
            },
            swimsPerWeek: {
                type: 'integer',
                minimum: 0,
                maximum: 7,
                description: 'Number of swim sessions per week.',
            },
            strengthPerWeek: {
                type: 'integer',
                minimum: 0,
                maximum: 7,
                description: 'Number of strength sessions per week.',
            },
            weeklyVolumeKm: {
                type: 'number',
                minimum: 10,
                maximum: 200,
                description: 'Peak weekly running volume goal in kilometers (10 to 200).',
            },
            ftpWatts: {
                type: 'number',
                description: 'Cycling Functional Threshold Power in watts for power zones.',
            },
            swimCssSecPer100m: {
                type: 'number',
                description: 'Critical Swim Speed in seconds per 100m for swim paces.',
            },
            customDistanceM: {
                type: 'number',
                minimum: 400,
                maximum: 300000,
                description: 'Custom race distance in meters (when raceType is CUSTOM_DISTANCE or CUSTOM_TRI).',
            },
            customSwimDistM: {
                type: 'number',
                minimum: 100,
                maximum: 20000,
                description: 'Custom swim leg distance in meters (when raceType is CUSTOM_TRI).',
            },
            customBikeDistM: {
                type: 'number',
                minimum: 1000,
                maximum: 300000,
                description: 'Custom bike leg distance in meters (when raceType is CUSTOM_TRI).',
            },
            customRunDistM: {
                type: 'number',
                minimum: 400,
                maximum: 100000,
                description: 'Custom run leg distance in meters (when raceType is CUSTOM_TRI).',
            },
            taperWeeks: {
                type: 'integer',
                description: 'Number of taper weeks leading up to race day.',
            },
            peakWeeks: {
                type: 'integer',
                description: 'Number of peak training weeks before taper.',
            },
            buildWeeks: {
                type: 'integer',
                description: 'Number of build weeks before peak phase.',
            },
            longRunDay: {
                type: 'integer',
                minimum: 0,
                maximum: 6,
                description: 'Preferred day of week for long run (0=Sunday, 6=Saturday).',
            },
            workoutDay: {
                type: 'integer',
                minimum: 0,
                maximum: 6,
                description: 'Preferred day of week for quality workout (0=Sunday, 6=Saturday).',
            },
            swimDay: {
                type: 'integer',
                minimum: 0,
                maximum: 6,
                description: 'Preferred day of week for swim session (0=Sunday, 6=Saturday).',
            },
        },
        required: ['raceType', 'raceDate'],
    },
    handler: async (args: any) => {
        const { raceType, raceDate } = args;
        if (!raceType || !ALL_17_RACE_TYPES.includes(raceType)) {
            throw new Error(`Invalid raceType. Supported race types: ${ALL_17_RACE_TYPES.join(', ')}`);
        }

        const raceDateObj = parseStrictRaceDate(raceDate);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (raceDateObj <= today) {
            throw new Error('raceDate must be in the future.');
        }

        const horizonDays = (raceDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (horizonDays > 104 * 7) {
            throw new Error('raceDate is too far in the future. Plans are limited to 104 weeks.');
        }

        const warnings: string[] = [];
        const isTri = TRI_RACE_TYPE_SET.has(raceType);
        const isUltra = ULTRA_RACE_TYPE_SET.has(raceType);

        if (args.vdot !== undefined && args.vdot !== null) {
            if (typeof args.vdot !== 'number' || !Number.isFinite(args.vdot) || args.vdot < 30 || args.vdot > 85) {
                throw new Error('Invalid vdot. VDOT must be between 30 and 85.');
            }
        }

        if (raceType === 'CUSTOM_DISTANCE') {
            if (typeof args.customDistanceM !== 'number' || !Number.isFinite(args.customDistanceM) || args.customDistanceM <= 0) {
                throw new Error('customDistanceM is required and must be a positive number (in meters) when raceType is CUSTOM_DISTANCE.');
            }
            if (args.customDistanceM < 400 || args.customDistanceM > 250000) {
                throw new Error('customDistanceM must be between 400m and 250,000m (250km).');
            }
        }

        if (isTri) {
            if (
                (args.ridesPerWeek !== undefined && args.ridesPerWeek !== null && args.ridesPerWeek <= 0) ||
                (args.swimsPerWeek !== undefined && args.swimsPerWeek !== null && args.swimsPerWeek <= 0) ||
                (args.runsPerWeek !== undefined && args.runsPerWeek !== null && args.runsPerWeek <= 0)
            ) {
                throw new Error('Triathlon plans require at least 1 run, 1 ride, and 1 swim per week (ridesPerWeek >= 1, swimsPerWeek >= 1, runsPerWeek >= 1).');
            }
        }

        if (args.runsPerWeek !== undefined && args.runsPerWeek !== null) {
            if (typeof args.runsPerWeek !== 'number' || args.runsPerWeek < 2 || args.runsPerWeek > 7) {
                throw new Error('runsPerWeek must be an integer between 2 and 7.');
            }
            if (isUltra && args.runsPerWeek < 3) {
                warnings.push(`Ultra training requires at least 3 runs/week; runsPerWeek was raised from ${args.runsPerWeek} to 3.`);
            }
        }

        let vdot = typeof args.vdot === 'number' ? args.vdot : 0;
        if (!vdot) {
            if (args.raceDistance && args.raceTimeSeconds && args.raceTimeSeconds > 0) {
                const distM = !isNaN(Number(args.raceDistance)) ? Number(args.raceDistance) : args.raceDistance;
                const derived = calculateVdot({ distance: distM as any, timeSeconds: Number(args.raceTimeSeconds) });
                if (derived < 30 || derived > 85) {
                    const clamped = Math.max(30, Math.min(85, derived));
                    warnings.push(`Derived VDOT ${derived} was clamped to supported range [30, 85] (${clamped}).`);
                    vdot = clamped;
                } else {
                    vdot = derived;
                }
            }
        } else if (args.raceDistance && args.raceTimeSeconds && args.raceTimeSeconds > 0) {
            warnings.push(`Both explicit vdot (${vdot}) and raceDistance/raceTimeSeconds were provided; using explicit vdot.`);
        }
        if (!vdot || vdot <= 0) {
            vdot = 40;
            warnings.push('No vdot or recent race result provided; defaulted to VDOT 40.');
        }

        const ftpWatts = typeof args.ftpWatts === 'number' && args.ftpWatts > 0
            ? args.ftpWatts
            : estimateBikeFtpFromVdot(vdot);

        const swimCssSecPer100m = typeof args.swimCssSecPer100m === 'number' && args.swimCssSecPer100m > 0
            ? args.swimCssSecPer100m
            : estimateSwimPaceFromVdot(vdot);

        let requestedVolumeKm = args.weeklyVolumeKm;
        if (requestedVolumeKm !== undefined && requestedVolumeKm !== null) {
            if (typeof requestedVolumeKm !== 'number' || !Number.isFinite(requestedVolumeKm) || requestedVolumeKm <= 0) {
                throw new Error('weeklyVolumeKm must be a positive number.');
            }
            if (requestedVolumeKm > 200) {
                warnings.push(`Requested weeklyVolumeKm (${requestedVolumeKm}km) exceeds the 200km ceiling and was clamped.`);
                requestedVolumeKm = 200;
            }
        }

        const defaults = applyPlanDefaults({
            raceType,
            vdot,
            runsPerWeek: isUltra && typeof args.runsPerWeek === 'number' ? Math.max(3, args.runsPerWeek) : args.runsPerWeek,
            ridesPerWeek: args.ridesPerWeek,
            swimsPerWeek: args.swimsPerWeek,
            strengthPerWeek: args.strengthPerWeek,
            weeklyVolumeKm: requestedVolumeKm,
            taperWeeks: args.taperWeeks,
            peakWeeks: args.peakWeeks,
            buildWeeks: args.buildWeeks,
            longRunDay: args.longRunDay,
            workoutDay: args.workoutDay,
            swimDay: args.swimDay,
        });

        let resolvedWorkoutDay = defaults.workoutDay;
        if (defaults.longRunDay === resolvedWorkoutDay) {
            resolvedWorkoutDay = (defaults.longRunDay + 3) % 7;
            warnings.push(`workoutDay (${defaults.workoutDay}) collided with longRunDay (${defaults.longRunDay}); shifted quality workout day to ${resolvedWorkoutDay}.`);
        }

        const config: PlanConfig = {
            vdot,
            raceType: raceType as RaceType,
            raceDate: raceDateObj,
            runsPerWeek: defaults.runsPerWeek,
            ridesPerWeek: defaults.ridesPerWeek,
            swimsPerWeek: defaults.swimsPerWeek,
            strengthPerWeek: defaults.strengthPerWeek,
            weeklyMileageGoal: defaults.weeklyVolumeKm * 1000,
            taperWeeks: defaults.taperWeeks,
            peakWeeks: defaults.peakWeeks,
            buildWeeks: defaults.buildWeeks,
            longRunDay: defaults.longRunDay,
            workoutDay: resolvedWorkoutDay,
            swimDay: defaults.swimDay,
            ftpWatts,
            swimCssSecPer100m,
            customDistanceM: args.customDistanceM,
            customSwimDistM: args.customSwimDistM,
            customBikeDistM: args.customBikeDistM,
            customRunDistM: args.customRunDistM,
        };

        const workouts = generateTrainingPlan(config);
        const phaseBlocks = buildPlanPhaseBlocks(config, workouts);

        const runPaces = calculateTrainingPaces(vdot);
        const bikeZones = calculateBikeZones(ftpWatts);
        const swimPaces = calculateSwimPaces(swimCssSecPer100m);

        const SWIM_WORKOUT_SET = new Set(['SWIM', 'SWIM_DRILL', 'OPEN_WATER_SWIM']);
        const runMeters = workouts
            .filter(w => !SWIM_WORKOUT_SET.has(w.type))
            .reduce((s, w) => s + (w.totalDistance || 0), 0);
        const swimMeters = workouts
            .filter(w => SWIM_WORKOUT_SET.has(w.type))
            .reduce((s, w) => s + (w.totalDistance || 0), 0);

        const nonRacePhasePeaks = phaseBlocks
            .filter(b => b.phase !== 'RACE_WEEK')
            .map(b => b.weeklyRunKmTarget);
        const deliveredPeakKm = nonRacePhasePeaks.length > 0 ? Math.max(...nonRacePhasePeaks) : 0;
        if (
            args.weeklyVolumeKm !== undefined &&
            args.weeklyVolumeKm !== null &&
            deliveredPeakKm > 0 &&
            Math.abs(deliveredPeakKm - args.weeklyVolumeKm) / Math.max(1, args.weeklyVolumeKm) > 0.20
        ) {
            warnings.push(`Requested weeklyVolumeKm (${args.weeklyVolumeKm}km) was adjusted to a safe race-specific peak of ~${deliveredPeakKm.toFixed(1)}km/week.`);
        }

        return {
            plan: {
                raceType,
                raceDate: raceDateObj.toISOString().split('T')[0],
                vdot,
                totalWorkouts: workouts.length,
                totalDistanceKm: (runMeters / 1000).toFixed(1),
                totalSwimMeters: Math.round(swimMeters),
                runsPerWeek: config.runsPerWeek,
                ridesPerWeek: config.ridesPerWeek,
                swimsPerWeek: config.swimsPerWeek,
                strengthPerWeek: config.strengthPerWeek,
            },
            warnings,
            phaseBlocks,
            trainingZones: {
                run: {
                    vdot,
                    paces: {
                        easy: {
                            minSecPerKm: runPaces.easy.min,
                            maxSecPerKm: runPaces.easy.max,
                            minPacePerKm: formatPace(runPaces.easy.min),
                            maxPacePerKm: formatPace(runPaces.easy.max),
                            minPacePerMile: formatPaceMile(runPaces.easy.min),
                            maxPacePerMile: formatPaceMile(runPaces.easy.max),
                        },
                        marathon: {
                            secPerKm: runPaces.marathon,
                            pacePerKm: formatPace(runPaces.marathon),
                            pacePerMile: formatPaceMile(runPaces.marathon),
                        },
                        threshold: {
                            secPerKm: runPaces.threshold,
                            pacePerKm: formatPace(runPaces.threshold),
                            pacePerMile: formatPaceMile(runPaces.threshold),
                        },
                        interval: {
                            secPerKm: runPaces.interval,
                            pacePerKm: formatPace(runPaces.interval),
                            pacePerMile: formatPaceMile(runPaces.interval),
                        },
                        repetition: {
                            secPerKm: runPaces.repetition,
                            pacePerKm: formatPace(runPaces.repetition),
                            pacePerMile: formatPaceMile(runPaces.repetition),
                        },
                    },
                },
                bike: {
                    ftpWatts,
                    zones: bikeZones,
                },
                swim: {
                    cssSecPer100m: swimCssSecPer100m,
                    zones: swimPaces,
                },
            },
            workouts: workouts.map(w => ({
                date: w.date.toISOString().split('T')[0],
                type: w.type,
                description: w.description,
                displayDescription: w.displayDescription || w.description,
                totalDistance: w.totalDistance,
                targetPace: w.targetPace,
                targetDuration: w.targetDuration,
                phase: w.phase,
                intensityZone: w.intensityZone || null,
                targetHrZone: w.targetHrZone,
                targetHrZoneLabel: w.targetHrZoneLabel || null,
                targetPaceZoneLabel: w.targetPaceZoneLabel || null,
                targetPowerWatts: w.targetPowerWatts || null,
                targetPowerMinWatts: w.targetPowerMinWatts || null,
                targetPowerMaxWatts: w.targetPowerMaxWatts || null,
                targetPowerZone: w.targetPowerZone || null,
                plannedTss: w.plannedTss || null,
                structuredSteps: w.structuredSteps || null,
            })),
        };
    },
};

const calculateVdotPacesTool: McpTool = {
    name: 'calculate_vdot_paces',
    description: 'Calculate Jack Daniels VDOT score, equivalent race predictions (5K, 10K, Half Marathon, Marathon), and training paces in sec/km, min/km, and min/mile.',
    annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
    },
    inputSchema: {
        type: 'object',
        properties: {
            vdot: {
                type: 'number',
                description: 'Jack Daniels VDOT score.',
            },
            raceDistance: {
                type: 'string',
                description: 'Race distance (5K, 10K, HALF, MARATHON, or meters).',
            },
            raceTimeSeconds: {
                type: 'number',
                description: 'Race finish time in seconds.',
            },
            targetDistance: {
                type: 'string',
                description: 'Target race distance (5K, 10K, HALF, MARATHON, or meters).',
            },
            targetTimeSeconds: {
                type: 'number',
                description: 'Target race time in seconds.',
            },
        },
    },
    handler: async (args: any) => {
        if (args.vdot !== undefined && args.vdot !== null) {
            if (typeof args.vdot !== 'number' || !Number.isFinite(args.vdot) || args.vdot < 30 || args.vdot > 85) {
                throw new Error('Invalid vdot. VDOT must be between 30 and 85.');
            }
        }
        let vdot = typeof args.vdot === 'number' && args.vdot >= 30 && args.vdot <= 85 ? args.vdot : 0;

        if (!vdot && args.raceDistance && args.raceTimeSeconds && args.raceTimeSeconds > 0) {
            const distM = !isNaN(Number(args.raceDistance)) ? Number(args.raceDistance) : args.raceDistance;
            vdot = calculateVdot({ distance: distM as any, timeSeconds: Number(args.raceTimeSeconds) });
        }

        if (!vdot && args.targetDistance && args.targetTimeSeconds && args.targetTimeSeconds > 0) {
            const distM = !isNaN(Number(args.targetDistance)) ? Number(args.targetDistance) : args.targetDistance;
            vdot = calculateVdot({ distance: distM as any, timeSeconds: Number(args.targetTimeSeconds) });
        }

        if (!vdot || vdot <= 0) {
            throw new Error('Please provide either a valid vdot (30 to 85), or raceDistance and raceTimeSeconds, or targetDistance and targetTimeSeconds.');
        }

        vdot = Math.max(30, Math.min(85, Math.round(vdot * 10) / 10));

        const distances: RaceDistance[] = ['5K', '10K', 'HALF', 'MARATHON'];
        const predictions: Record<string, { seconds: number; formattedTime: string }> = {};

        for (const dist of distances) {
            const seconds = predictRaceTime(vdot, dist);
            predictions[dist] = {
                seconds,
                formattedTime: formatTime(seconds),
            };
        }

        const paces = calculateTrainingPaces(vdot);

        return {
            vdot,
            predictions,
            trainingPaces: {
                easy: {
                    minSecPerKm: paces.easy.min,
                    maxSecPerKm: paces.easy.max,
                    minPacePerKm: formatPace(paces.easy.min),
                    maxPacePerKm: formatPace(paces.easy.max),
                    minPacePerMile: formatPaceMile(paces.easy.min),
                    maxPacePerMile: formatPaceMile(paces.easy.max),
                },
                marathon: {
                    secPerKm: paces.marathon,
                    pacePerKm: formatPace(paces.marathon),
                    pacePerMile: formatPaceMile(paces.marathon),
                },
                threshold: {
                    secPerKm: paces.threshold,
                    pacePerKm: formatPace(paces.threshold),
                    pacePerMile: formatPaceMile(paces.threshold),
                },
                interval: {
                    secPerKm: paces.interval,
                    pacePerKm: formatPace(paces.interval),
                    pacePerMile: formatPaceMile(paces.interval),
                },
                repetition: {
                    secPerKm: paces.repetition,
                    pacePerKm: formatPace(paces.repetition),
                    pacePerMile: formatPaceMile(paces.repetition),
                },
            },
        };
    },
};

const exportPlanUrlTool: McpTool = {
    name: 'export_plan_url',
    description: 'Generate a direct clickable URL to download or view/print the training plan in HTML or CSV format.',
    annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
    },
    inputSchema: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['html', 'csv'],
                default: 'html',
                description: 'Export format: "html" for printable view or "csv" for spreadsheet.',
            },
            raceType: {
                type: 'string',
                description: 'Target race type.',
            },
            raceDate: {
                type: 'string',
                description: 'Race date (YYYY-MM-DD).',
            },
            vdot: {
                type: 'number',
                description: 'VDOT score.',
            },
            raceDistance: {
                type: 'string',
                description: 'Race distance used with raceTimeSeconds.',
            },
            raceTimeSeconds: {
                type: 'number',
                description: 'Race time in seconds.',
            },
            runsPerWeek: { type: 'integer' },
            ridesPerWeek: { type: 'integer' },
            swimsPerWeek: { type: 'integer' },
            strengthPerWeek: { type: 'integer' },
            weeklyVolumeKm: { type: 'number' },
            taperWeeks: { type: 'integer' },
            peakWeeks: { type: 'integer' },
            buildWeeks: { type: 'integer' },
            longRunDay: { type: 'integer' },
            workoutDay: { type: 'integer' },
            swimDay: { type: 'integer' },
            customDistanceM: { type: 'number' },
        },
        required: ['raceType', 'raceDate'],
    },
    handler: async (args: any, context?: any) => {
        const { raceType, raceDate } = args;
        if (!raceType || !raceDate) {
            throw new Error('Both raceType and raceDate are required to generate an export URL.');
        }

        const format = args.format === 'csv' ? 'csv' : 'html';
        const params = new URLSearchParams();
        params.set('format', format);
        params.set('raceType', raceType);
        params.set('raceDate', raceDate);

        if (args.vdot) params.set('vdot', String(args.vdot));
        if (args.raceDistance) params.set('raceDistance', String(args.raceDistance));
        if (args.raceTimeSeconds) params.set('raceTimeSeconds', String(args.raceTimeSeconds));
        if (args.runsPerWeek) params.set('runsPerWeek', String(args.runsPerWeek));
        if (args.ridesPerWeek) params.set('ridesPerWeek', String(args.ridesPerWeek));
        if (args.swimsPerWeek) params.set('swimsPerWeek', String(args.swimsPerWeek));
        if (args.strengthPerWeek) params.set('strengthPerWeek', String(args.strengthPerWeek));
        if (args.weeklyVolumeKm) params.set('weeklyVolumeKm', String(args.weeklyVolumeKm));
        if (args.taperWeeks) params.set('taperWeeks', String(args.taperWeeks));
        if (args.peakWeeks) params.set('peakWeeks', String(args.peakWeeks));
        if (args.buildWeeks) params.set('buildWeeks', String(args.buildWeeks));
        if (args.longRunDay !== undefined) params.set('longRunDay', String(args.longRunDay));
        if (args.workoutDay !== undefined) params.set('workoutDay', String(args.workoutDay));
        if (args.swimDay !== undefined) params.set('swimDay', String(args.swimDay));
        if (args.customDistanceM) params.set('customDistanceM', String(args.customDistanceM));

        let origin = '';
        if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('0.0.0.0')) {
            try { origin = new URL(process.env.NEXTAUTH_URL).origin; } catch {}
        }
        if (!origin && process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('0.0.0.0')) {
            try { origin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin; } catch {}
        }
        if (!origin) {
            const rawHost = context?.request?.headers?.get('x-forwarded-host')?.split(',')[0]?.trim()
                || context?.request?.headers?.get('host')?.split(',')[0]?.trim();
            if (rawHost) {
                const normalizedHost = rawHost.replace(/^(0\.0\.0\.0|\[::\]|::)(?=:|$)/, 'localhost');
                const isLocal = normalizedHost.startsWith('localhost') || normalizedHost.startsWith('127.0.0.1');
                const proto = context?.request?.headers?.get('x-forwarded-proto')?.split(',')[0]?.trim()
                    || (isLocal ? 'http' : 'https');
                origin = sanitizePublicOrigin(`${proto}://${normalizedHost}`);
            } else if (context?.request?.nextUrl?.origin) {
                origin = sanitizePublicOrigin(context.request.nextUrl.origin);
            } else {
                origin = 'https://runflow.schuelken.uk';
            }
        }

        const url = `${origin}/api/public/plan/export?${params.toString()}`;

        return {
            url,
            format,
            instructions: format === 'html'
                ? 'Open this URL in any browser to view, print, or save your complete training plan.'
                : 'Open this URL in any browser to download your complete training plan as a CSV file.',
        };
    },
};

const publicMcpServer = new McpServer({
    name: 'runflow-mcp-public',
    version: '2.4.0',
    instructions: 'Stateless running and endurance training plan generator and VDOT calculator by RunFlow.',
    tools: [
        generateRunningPlanTool,
        calculateVdotPacesTool,
        exportPlanUrlTool,
    ],
});

export async function GET(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function POST(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (Array.isArray(body)) {
            if (body.length > 10) {
                return NextResponse.json(
                    {
                        jsonrpc: '2.0',
                        id: null,
                        error: {
                            code: -32600,
                            message: 'Invalid Request: Public MCP batch size exceeds maximum of 10 requests',
                        },
                    },
                    { status: 400 }
                );
            }
            const toolCalls = body.filter((item: unknown) => Boolean(item && typeof item === 'object' && (item as { method?: string }).method === 'tools/call')).length;
            for (let i = 1; i < toolCalls; i++) {
                const extraLimit = await checkPublicMcpRateLimit(request);
                if (extraLimit && !extraLimit.allowed) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded' },
                        { status: 429, headers: rateLimitHeaders(extraLimit) }
                    );
                }
            }
        }
    } catch {
        // Malformed JSON is handled downstream by publicMcpServer.handleHttpRequest
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function OPTIONS(request: NextRequest) {
    return publicMcpServer.handleHttpRequest(request, { request });
}
