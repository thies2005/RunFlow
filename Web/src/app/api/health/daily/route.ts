import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

// Helper to ensure dates are handled as midnight UTC
function getMidnightUTCDate(dateStr: string) {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // e.g. ?date=2023-10-01
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

        const date = getMidnightUTCDate(dateStr);

        const dailyHealth = await prisma.dailyHealthLog.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date
                }
            }
        });

        // Get supplement logs for this date (for this user's supplements)
        const supplementLogs = await prisma.supplementLog.findMany({
            where: {
                date,
                supplement: {
                    userId: session.user.id
                }
            },
            include: { supplement: true }
        });

        return NextResponse.json({
            dailyHealth,
            supplementLogs
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date: dateStr, action } = body;

        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });
        const date = getMidnightUTCDate(dateStr);

        // Action routing based on requested operation
        if (action === 'toggleSupplement') {
            const { supplementId, taken } = body;

            // Verify ownership
            const supp = await prisma.supplement.findUnique({ where: { id: supplementId } });
            if (!supp || supp.userId !== session.user.id) {
                return NextResponse.json({ error: 'Supplement not found' }, { status: 404 });
            }

            const log = await prisma.supplementLog.upsert({
                where: {
                    supplementId_date: { supplementId, date }
                },
                update: { taken },
                create: { supplementId, date, taken }
            });
            return NextResponse.json(log);
        }

        if (action === 'updateHealth') {
            const { steps, weight } = body;

            const health = await prisma.dailyHealthLog.upsert({
                where: {
                    userId_date: { userId: session.user.id, date }
                },
                update: {
                    ...(steps !== undefined && { steps }),
                    ...(weight !== undefined && { weight })
                },
                create: {
                    userId: session.user.id,
                    date,
                    steps,
                    weight
                }
            });
            return NextResponse.json(health);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return handleError(error);
    }
}
