import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync } from '@/lib/rateLimit';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply rate limiting (max 3 exports per hour)
        const rateLimitResult = await checkRateLimitAsync(session.user.id, {
            limit: 3,
            windowSeconds: 3600,
            prefix: 'export_data',
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        // Fetch user with ALL associated data for export (GDPR Right to Portability)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                activities: {
                    select: {
                        name: true,
                        type: true,
                        startDate: true,
                        distance: true,
                        movingTime: true,
                        totalElevation: true,
                        averageHr: true,
                        maxHr: true,
                        calories: true,
                        averageCadence: true,
                        estimatedVdot: true,
                        trimp: true,
                        stravaId: true,
                    },
                    orderBy: { startDate: 'desc' }
                },
                goals: {
                    select: {
                        name: true,
                        raceType: true,
                        targetTime: true,
                        raceDate: true,
                        isActive: true,
                    }
                },
                DailyFitness: {
                    select: {
                        date: true,
                        trimp: true,
                        ctl: true,
                        atl: true,
                        tsb: true,
                    },
                    orderBy: { date: 'desc' }
                },
                dailyHealthLogs: {
                    select: {
                        date: true,
                        steps: true,
                        weight: true,
                    },
                    orderBy: { date: 'desc' }
                },
                supplements: {
                    select: {
                        name: true,
                        amount: true,
                        unit: true,
                        timeOfDay: true,
                        isActive: true,
                        logs: {
                            select: {
                                date: true,
                                taken: true,
                            },
                        }
                    },
                },
                chatSessions: {
                    select: {
                        title: true,
                        createdAt: true,
                        messages: {
                            select: {
                                role: true,
                                content: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Clean up sensitive/internal fields before exporting
        const {
            passwordHash,
            isAdmin,
            ...safeUserData
        } = user;

        void passwordHash;
        void isAdmin;

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `runflow-data-export-${dateStr}.json`;

        // Create response with JSON download headers, handling BigInt serialization
        return new NextResponse(
            JSON.stringify(
                safeUserData,
                (key, value) => (typeof value === 'bigint' ? value.toString() : value),
                2
            ),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'no-store, max-age=0',
                },
            }
        );
    } catch (error) {
        console.error('Data export error:', error);
        return NextResponse.json(
            { error: 'Internal server error while generating export' },
            { status: 500 }
        );
    }
}
