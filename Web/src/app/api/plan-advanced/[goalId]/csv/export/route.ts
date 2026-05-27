import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import {
    workoutsToRunFlowCsv,
    workoutsToTrainingPeaksCsv,
    workoutsToFinalSurgeCsv,
    type ParsedCsvWorkout,
    type CsvFormat,
    type RunFlowCsvMetadataEntry,
} from '@/lib/plans/csv-parser';

type RouteContext = { params: Promise<{ goalId: string }> };

function formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

function formatDuration(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

function dayName(day: number | null | undefined): string {
    if (day == null || day < 0 || day > 6) return '';
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
}

function formatRestDays(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .filter((day): day is number => typeof day === 'number')
        .map(dayName)
        .filter(Boolean)
        .join('; ');
}

function metadataEntry(section: string, field: string, value: string | number | null | undefined): RunFlowCsvMetadataEntry {
    return { section, field, value: value ?? '' };
}

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                hrMax: true,
                hrRest: true,
                thresholdHeartRate: true,
                thresholdPace: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                vdotCorrectionFactor: true,
            },
        });

        const url = new URL(req.url);
        const format = (url.searchParams.get('format') || 'runflow') as CsvFormat;

        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        const parsedWorkouts: ParsedCsvWorkout[] = workouts.map(w => ({
            date: w.scheduledDate.toISOString().split('T')[0],
            workoutType: w.workoutType,
            phase: w.phase || undefined,
            name: w.customName || w.workoutType,
            description: w.description || '',
            distanceM: w.targetDistance ?? undefined,
            durationS: w.targetDuration ?? undefined,
            paceSKm: w.targetPace ?? undefined,
            hrZone: w.targetHrZone ?? undefined,
            structuredSteps: w.structuredSteps as object | undefined,
        }));

        let csv: string;
        let filename: string;

        switch (format) {
            case 'trainingpeaks':
                csv = workoutsToTrainingPeaksCsv(parsedWorkouts);
                filename = `plan-${goalId}-trainingpeaks.csv`;
                break;
            case 'finalsurge':
                csv = workoutsToFinalSurgeCsv(parsedWorkouts);
                filename = `plan-${goalId}-finalsurge.csv`;
                break;
            default:
                csv = workoutsToRunFlowCsv(parsedWorkouts, [
                    metadataEntry('Plan', 'Plan Name', goal.name),
                    metadataEntry('Plan', 'Generated At', goal.createdAt.toISOString()),
                    metadataEntry('Plan', 'Exported At', new Date().toISOString()),
                    metadataEntry('Plan', 'Workout Count', parsedWorkouts.length),
                    metadataEntry('Plan', 'Sport', goal.sport),
                    metadataEntry('Plan', 'Creation Mode', goal.creationMode),
                    metadataEntry('Plan', 'Plan Source', goal.planSource),
                    metadataEntry('Race', 'Race Type', goal.raceType ?? ''),
                    metadataEntry('Race', 'Race Date', formatDate(goal.raceDate)),
                    metadataEntry('Race', 'Target Time', formatDuration(goal.targetTime)),
                    metadataEntry('Race', 'Custom Run Distance M', goal.customDistanceM ?? goal.customRunDistM ?? ''),
                    metadataEntry('Race', 'Custom Swim Distance M', goal.customSwimDistM ?? ''),
                    metadataEntry('Race', 'Custom Bike Distance M', goal.customBikeDistM ?? ''),
                    metadataEntry('Plan Dates', 'Plan Start Date', formatDate(goal.planStartDate)),
                    metadataEntry('Plan Dates', 'First Workout Date', parsedWorkouts[0]?.date ?? ''),
                    metadataEntry('Plan Dates', 'Last Workout Date', parsedWorkouts[parsedWorkouts.length - 1]?.date ?? ''),
                    metadataEntry('Plan Dates', 'Plan Weeks', goal.planWeeks),
                    metadataEntry('Fitness', 'Current VDOT', goal.currentVdot ?? ''),
                    metadataEntry('Fitness', 'VDOT Correction Factor', user?.vdotCorrectionFactor ?? ''),
                    metadataEntry('Volume', 'Peak Weekly Mileage M', goal.weeklyMileageGoal ?? ''),
                    metadataEntry('Volume', 'Runs Per Week', goal.runsPerWeek),
                    metadataEntry('Volume', 'Rides Per Week', goal.ridesPerWeek),
                    metadataEntry('Volume', 'Swims Per Week', goal.swimsPerWeek),
                    metadataEntry('Volume', 'Strength Per Week', goal.strengthPerWeek),
                    metadataEntry('Phases', 'Taper Weeks', goal.taperWeeks),
                    metadataEntry('Phases', 'Peak Weeks', goal.peakWeeks),
                    metadataEntry('Phases', 'Build Weeks', goal.buildWeeks),
                    metadataEntry('Schedule', 'Long Run Day', dayName(goal.longRunDay)),
                    metadataEntry('Schedule', 'Quality Workout Day', dayName(goal.workoutDay)),
                    metadataEntry('Schedule', 'Swim Day', dayName(goal.swimDay)),
                    metadataEntry('Schedule', 'Rest Days', formatRestDays(goal.restDays)),
                    metadataEntry('Heart Rate', 'HR Zone Method', 'CUSTOM'),
                    metadataEntry('Heart Rate', 'Max HR', user?.hrMax ?? ''),
                    metadataEntry('Heart Rate', 'Resting HR', user?.hrRest ?? ''),
                    metadataEntry('Heart Rate', 'Threshold HR', user?.thresholdHeartRate ?? ''),
                    metadataEntry('Heart Rate', 'Threshold Pace S/KM', user?.thresholdPace ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 1 Max', user?.hrZone1Max ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 2 Max', user?.hrZone2Max ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 3 Max', user?.hrZone3Max ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 4 Max', user?.hrZone4Max ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 5 Max', user?.hrZone5Max ?? ''),
                    metadataEntry('Heart Rate Zones', 'Zone 6 Max', user?.hrZone6Max ?? ''),
                ]);
                filename = `plan-${goalId}-runflow.csv`;
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('CSV export error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
