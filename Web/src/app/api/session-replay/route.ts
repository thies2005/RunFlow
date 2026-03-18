import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

export const dynamic = 'force-dynamic';

interface SessionReplayData {
  sessionId: string;
  events: any[];
  duration: number;
  routePath?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const data: SessionReplayData = await request.json();

    if (!data.sessionId || !Array.isArray(data.events)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const sanitizedEvents = data.events.map((event: any) => ({
      ...event,
      data: sanitizeEventData(event.data),
    }));

    await prisma.sessionReplay.create({
      data: {
        userId,
        sessionId: data.sessionId,
        events: sanitizedEvents,
        routePath: data.routePath,
        duration: data.duration,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save session replay:', error);
    return NextResponse.json(
      { error: 'Failed to save session replay' },
      { status: 500 }
    );
  }
}

function sanitizeEventData(data: any): any {
  if (!data) return data;

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
        .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED_TOKEN]')
        .substring(0, 500);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    const sessions = await prisma.sessionReplay.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.sessionReplay.count({ where });

    return NextResponse.json({
      sessions,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Failed to fetch session replays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session replays' },
      { status: 500 }
    );
  }
}
