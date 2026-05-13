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
} from '@/lib/plans/csv-parser';

async function checkPremium(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    return true;
}

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

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
                csv = workoutsToRunFlowCsv(parsedWorkouts);
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
