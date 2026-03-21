export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { differenceInMinutes } from 'date-fns';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;

        // Fetch targets to get goal hours
        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId }
        });

        // Fetch the most recent active session (endTime is null)
        const currentSession = await prisma.fastingSession.findFirst({
            where: { userId, endTime: null },
            orderBy: { startTime: 'desc' }
        });

        // Fetch recent completed history (last 10)
        const history = await prisma.fastingSession.findMany({
            where: { userId, endTime: { not: null } },
            orderBy: { endTime: 'desc' },
            take: 10
        });

        return NextResponse.json({ 
            currentSession, 
            history,
            goalHours: target?.fastingGoalHours || 16,
            enabled: target?.fastingEnabled || false
        });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch fasting data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        const { action } = body; // 'start', 'end', or 'cancel'

        // Check for an existing active session
        const activeSession = await prisma.fastingSession.findFirst({
            where: { userId, endTime: null }
        });

        if (action === 'start') {
            if (activeSession) {
                return NextResponse.json({ error: 'A fasting session is already active.' }, { status: 400 });
            }
            
            const newSession = await prisma.fastingSession.create({
                data: {
                    userId,
                    startTime: new Date()
                }
            });
            return NextResponse.json(newSession);
        }

        if (action === 'end') {
            if (!activeSession) {
                return NextResponse.json({ error: 'No active fasting session found to end.' }, { status: 400 });
            }

            const endTime = new Date();

            const updatedSession = await prisma.fastingSession.update({
                where: { id: activeSession.id },
                data: {
                    endTime
                }
            });
            return NextResponse.json(updatedSession);
        }

        if (action === 'cancel') {
            if (!activeSession) {
                return NextResponse.json({ error: 'No active fasting session to cancel.' }, { status: 400 });
            }

            await prisma.fastingSession.delete({
                where: { id: activeSession.id }
            });

            return NextResponse.json({ success: true, message: 'Session cancelled' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to manage fasting session' }, { status: 500 });
    }
}
