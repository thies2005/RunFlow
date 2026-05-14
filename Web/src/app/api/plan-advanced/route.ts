import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const url = new URL(req.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

        const goals = await prisma.goal.findMany({
            where: {
                userId: session.user.id,
                planSource: 'advanced',
                parentGoalId: null,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: { workouts: true, snapshots: true },
                },
            },
        });

        return NextResponse.json({ plans: goals });
    } catch (error) {
        console.error('Advanced plans list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const body = await req.json();
        const { name, sport, raceType, raceDate, planStartDate, planSource, creationMode, customDistanceM, customSwimDistM, customBikeDistM, customRunDistM, backyardLoopDistM, backyardLoopTimeS, targetLaps, subGoals } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
        }

        if (!sport || !['RUN', 'TRIATHLON'].includes(sport)) {
            return NextResponse.json({ error: 'Valid sport is required (RUN or TRIATHLON)' }, { status: 400 });
        }

        if (planStartDate) {
            const d = new Date(planStartDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: 'Invalid planStartDate' }, { status: 400 });
            }
        }

        if (raceDate) {
            const d = new Date(raceDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: 'Invalid raceDate' }, { status: 400 });
            }
        }

        const goal = await prisma.goal.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                sport,
                planSource: planSource || 'advanced',
                creationMode: creationMode || 'EXPERT_MANUAL',
                planStartDate: planStartDate ? new Date(planStartDate) : null,
                raceType: raceType || null,
                raceDate: raceDate ? new Date(raceDate) : null,
                customDistanceM: customDistanceM ?? null,
                customSwimDistM: customSwimDistM ?? null,
                customBikeDistM: customBikeDistM ?? null,
                customRunDistM: customRunDistM ?? null,
                backyardLoopDistM: backyardLoopDistM ?? null,
                backyardLoopTimeS: backyardLoopTimeS ?? null,
                targetLaps: targetLaps ?? null,
                isActive: true,
            },
        });

        if (subGoals && Array.isArray(subGoals) && subGoals.length > 0) {
            for (const sg of subGoals) {
                if (!sg.name || typeof sg.name !== 'string' || !sg.name.trim()) continue;

                await prisma.goal.create({
                    data: {
                        userId: session.user.id,
                        name: sg.name.trim(),
                        parentGoalId: goal.id,
                        sport: sg.sport || sport,
                        raceType: sg.raceType || null,
                        raceDate: sg.raceDate ? new Date(sg.raceDate) : null,
                        priority: sg.priority || 'SECONDARY',
                        planSource: 'advanced',
                        creationMode: 'EXPERT_MANUAL',
                    },
                });
            }
        }

        const created = await prisma.goal.findUnique({
            where: { id: goal.id },
            include: {
                subGoals: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
            },
        });

        return NextResponse.json({ plan: created }, { status: 201 });
    } catch (error) {
        console.error('Advanced plan create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
