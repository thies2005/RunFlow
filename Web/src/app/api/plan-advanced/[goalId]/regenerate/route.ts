import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/db';

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

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
            include: {
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { raceDate: 'asc' },
                },
            },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const startDate = goal.planStartDate || new Date();
        const raceDate = goal.raceDate;
        const raceType = goal.raceType;
        const totalWeeks = goal.planWeeks || 12;

        const phaseMap: Record<number, string> = {};
        if (raceType && raceDate) {
            const raceMs = new Date(raceDate).getTime();
            const startMs = new Date(startDate).getTime();
            const totalMs = raceMs - startMs;
            const weeksTotal = Math.max(1, Math.ceil(totalMs / (7 * 24 * 60 * 60 * 1000)));

            const hasTaper = goal.taperWeeks || 2;
            const hasPeak = goal.peakWeeks || 4;
            const hasBuild = goal.buildWeeks || 4;
            const hasRecovery = 1;

            let week = 1;
            const baseEnd = Math.max(1, weeksTotal - hasTaper - hasPeak - hasRecovery - hasBuild);
            for (let i = week; i <= Math.min(baseEnd, weeksTotal); i++) {
                phaseMap[i] = i <= baseEnd / 2 ? 'BASE' : 'BUILD';
            }
            week = baseEnd + 1;
            for (let i = week; i < week + hasPeak && i <= weeksTotal - hasTaper; i++) {
                phaseMap[i] = 'PEAK';
            }
            week += hasPeak;
            for (let i = week; i < week + hasTaper && i <= weeksTotal; i++) {
                phaseMap[i] = i >= weeksTotal - 1 ? 'RACE_WEEK' : 'TAPER';
            }
            week += hasTaper;
            for (let i = week; i <= weeksTotal; i++) {
                phaseMap[i] = 'RECOVERY';
            }
        } else {
            const cycleLength = 4;
            for (let i = 1; i <= totalWeeks; i++) {
                const cyclePos = ((i - 1) % cycleLength) + 1;
                if (i <= totalWeeks / 3) {
                    phaseMap[i] = cyclePos === cycleLength ? 'BASE' : 'BASE';
                } else if (i <= (totalWeeks * 2) / 3) {
                    phaseMap[i] = cyclePos === cycleLength ? 'BUILD' : 'BUILD';
                } else {
                    phaseMap[i] = 'MAINTAIN';
                }
            }
        }

        const subGoalsWithPhases = goal.subGoals.map((sg) => {
            if (!sg.raceDate || !raceDate) return { subGoalId: sg.id, affectedWeeks: [] };
            const sgRaceMs = new Date(sg.raceDate).getTime();
            const raceMs = new Date(raceDate).getTime();
            const sgWeek = Math.ceil((sgRaceMs - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
            const priority = sg.priority as string;
            const focusWeeks = priority === 'SECONDARY' ? 3 : priority === 'TUNE_UP' ? 1 : 0;
            const affectedWeeks: number[] = [];
            for (let w = Math.max(1, sgWeek - Math.floor(focusWeeks / 2)); w <= Math.min(totalWeeks, sgWeek + Math.ceil(focusWeeks / 2)); w++) {
                affectedWeeks.push(w);
                if (priority === 'SECONDARY' || priority === 'TUNE_UP') {
                    if (w === sgWeek) phaseMap[w] = 'TUNE_UP';
                    else if (w > sgWeek && priority === 'SECONDARY') phaseMap[w] = 'RECOVERY';
                }
            }
            return { subGoalId: sg.id, affectedWeeks };
        });

        await prisma.workout.updateMany({
            where: { goalId, scheduledDate: { gte: startDate } },
            data: { phase: 'BASE' as never },
        });

        const workouts = await prisma.workout.findMany({
            where: { goalId, scheduledDate: { gte: startDate } },
            orderBy: { scheduledDate: 'asc' },
        });

        for (const workout of workouts) {
            const d = new Date(workout.scheduledDate);
            const weekNum = Math.max(1, Math.ceil((d.getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)));
            const phase = phaseMap[weekNum] || 'BASE';
            await prisma.workout.update({
                where: { id: workout.id },
                data: { phase: phase as never },
            });
        }

        return NextResponse.json({
            success: true,
            phases: phaseMap,
            subGoals: subGoalsWithPhases,
            totalWeeks,
        });
    } catch (error) {
        console.error('Regenerate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
