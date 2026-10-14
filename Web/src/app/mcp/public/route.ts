import { NextRequest, NextResponse } from 'next/server';
import { McpServer, type McpTool, applyPlanDefaults } from '@/lib/mcp/server';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig } from '@/lib/rateLimit';
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
                description: 'Peak weekly running volume goal in kilometers.',
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
                description: 'Custom race distance in meters (when raceType is CUSTOM_DISTANCE).',
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

        const raceDateObj = new Date(raceDate);
        if (isNaN(raceDateObj.getTime())) {
            throw new Error('Invalid raceDate. Must be a valid date string (e.g. YYYY-MM-DD).');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (raceDateObj <= today) {
            throw new Error('raceDate must be in the future.');
        }

        let vdot = typeof args.vdot === 'number' && args.vdot > 0 ? args.vdot : 0;
        if (!vdot) {
            if (args.raceDistance && args.raceTimeSeconds && args.raceTimeSeconds > 0) {
                const distM = !isNaN(Number(args.raceDistance)) ? Number(args.raceDistance) : args.raceDistance;
                vdot = calculateVdot({ distance: distM as any, timeSeconds: Number(args.raceTimeSeconds) });
            }
        }
        if (!vdot || vdot <= 0) {
            vdot = 40;
        }

        const ftpWatts = typeof args.ftpWatts === 'number' && args.ftpWatts > 0
            ? args.ftpWatts
            : estimateBikeFtpFromVdot(vdot);

        const swimCssSecPer100m = typeof args.swimCssSecPer100m === 'number' && args.swimCssSecPer100m > 0
            ? args.swimCssSecPer100m
            : estimateSwimPaceFromVdot(vdot);

        const defaults = applyPlanDefaults({
            raceType,
            vdot,
            runsPerWeek: args.runsPerWeek,
            ridesPerWeek: args.ridesPerWeek,
            swimsPerWeek: args.swimsPerWeek,
            strengthPerWeek: args.strengthPerWeek,
            weeklyVolumeKm: args.weeklyVolumeKm,
            taperWeeks: args.taperWeeks,
            peakWeeks: args.peakWeeks,
            buildWeeks: args.buildWeeks,
            longRunDay: args.longRunDay,
            workoutDay: args.workoutDay,
            swimDay: args.swimDay,
        });

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
            workoutDay: defaults.workoutDay,
            swimDay: defaults.swimDay,
            ftpWatts,
            swimCssSecPer100m,
            customDistanceM: args.customDistanceM,
        };

        const workouts = generateTrainingPlan(config);
        const phaseBlocks = buildPlanPhaseBlocks(config, workouts);

        const runPaces = calculateTrainingPaces(vdot);
        const bikeZones = calculateBikeZones(ftpWatts);
        const swimPaces = calculateSwimPaces(swimCssSecPer100m);

        const totalMeters = workouts.reduce((s, w) => s + (w.totalDistance || 0), 0);

        return {
            plan: {
                raceType,
                raceDate: raceDateObj.toISOString().split('T')[0],
                vdot,
                totalWorkouts: workouts.length,
                totalDistanceKm: (totalMeters / 1000).toFixed(1),
                runsPerWeek: config.runsPerWeek,
                ridesPerWeek: config.ridesPerWeek,
                swimsPerWeek: config.swimsPerWeek,
                strengthPerWeek: config.strengthPerWeek,
            },
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
        let vdot = typeof args.vdot === 'number' && args.vdot > 0 ? args.vdot : 0;

        if (!vdot && args.raceDistance && args.raceTimeSeconds && args.raceTimeSeconds > 0) {
            const distM = !isNaN(Number(args.raceDistance)) ? Number(args.raceDistance) : args.raceDistance;
            vdot = calculateVdot({ distance: distM as any, timeSeconds: Number(args.raceTimeSeconds) });
        }

        if (!vdot && args.targetDistance && args.targetTimeSeconds && args.targetTimeSeconds > 0) {
            const distM = !isNaN(Number(args.targetDistance)) ? Number(args.targetDistance) : args.targetDistance;
            vdot = calculateVdot({ distance: distM as any, timeSeconds: Number(args.targetTimeSeconds) });
        }

        if (!vdot || vdot <= 0) {
            throw new Error('Please provide either a valid vdot, or raceDistance and raceTimeSeconds, or targetDistance and targetTimeSeconds.');
        }

        vdot = Math.round(vdot * 10) / 10;

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
        if (context?.request?.nextUrl?.origin) {
            origin = context.request.nextUrl.origin;
        } else if (context?.request?.headers?.get('host')) {
            const host = context.request.headers.get('host');
            const proto = host.includes('localhost') ? 'http' : 'https';
            origin = `${proto}://${host}`;
        } else {
            origin = process.env.NEXT_PUBLIC_APP_URL || 'https://runflow.schuelken.uk';
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
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, PUBLIC_MCP_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, PUBLIC_MCP_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function OPTIONS(request: NextRequest) {
    return publicMcpServer.handleHttpRequest(request, { request });
}
