import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/admin/auth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface SessionReplayData {
  sessionId: string;
  events: any[];
  duration: number;
  routePath?: string;
}

// Server-side enforcement of the recorder's contract. The browser client caps
// itself at 500 events per flush (client.ts addEvent) and clamps individual
// string payloads; the server previously trusted that convention, so any
// authenticated user could persist unbounded attacker-sized event arrays.
const MAX_EVENTS = 500;                 // matches the client flush cap
const MAX_EVENT_BYTES = 2 * 1024;       // per serialized event
const MAX_TOTAL_BYTES = 512 * 1024;     // whole events array
const MAX_SESSION_ID_LENGTH = 128;      // client sends a 36-char UUID
const MAX_ROUTE_PATH_LENGTH = 200;
// Retention ceiling per user so stored replays cannot accumulate forever
// (rows were previously deleted only on account deletion).
const MAX_REPLAYS_PER_USER = 100;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (30 replays/minute per client)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, {
      limit: 30,
      windowSeconds: 60,
      prefix: 'session-replay',
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const data: SessionReplayData = await request.json();

    if (
      typeof data.sessionId !== 'string' ||
      data.sessionId.length === 0 ||
      data.sessionId.length > MAX_SESSION_ID_LENGTH ||
      !Array.isArray(data.events) ||
      data.events.length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Count and size bounds are enforced BEFORE any per-event regex work so
    // neither storage nor synchronous sanitize CPU is attacker-controlled.
    if (data.events.length > MAX_EVENTS) {
      return NextResponse.json(
        { error: `Too many events (max ${MAX_EVENTS})` },
        { status: 413 }
      );
    }
    let totalBytes = 0;
    for (const event of data.events) {
      const size = Buffer.byteLength(JSON.stringify(event));
      if (size > MAX_EVENT_BYTES) {
        return NextResponse.json({ error: 'Event too large' }, { status: 413 });
      }
      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
    }

    // Whitelist the persisted shape instead of spreading attacker properties
    // verbatim: unknown event members and nested structures are dropped.
    const sanitizedEvents = data.events.map((event: any) => ({
      type: String(event?.type ?? '').slice(0, 32),
      timestamp: Number(event?.timestamp) || 0,
      data: sanitizeEventData(event?.data),
    }));

    await prisma.sessionReplay.create({
      data: {
        userId,
        sessionId: data.sessionId,
        events: sanitizedEvents,
        routePath:
          typeof data.routePath === 'string'
            ? data.routePath.slice(0, MAX_ROUTE_PATH_LENGTH)
            : undefined,
        duration: Math.max(0, Math.min(Number(data.duration) || 0, 2_147_483_647)),
      },
    });

    // Retention cap: keep only the most recent MAX_REPLAYS_PER_USER replays
    // for this user (best-effort; never blocks the intake).
    try {
      const total = await prisma.sessionReplay.count({ where: { userId } });
      if (total > MAX_REPLAYS_PER_USER) {
        const oldest = await prisma.sessionReplay.findMany({
          where: { userId },
          select: { id: true },
          orderBy: { timestamp: 'asc' },
          take: total - MAX_REPLAYS_PER_USER,
        });
        if (oldest.length > 0) {
          await prisma.sessionReplay.deleteMany({
            where: { id: { in: oldest.map((replay) => replay.id) } },
          });
        }
      }
    } catch (retentionError) {
      console.error('Failed to trim session replays:', retentionError);
    }

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
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Truncate BEFORE the redaction regexes: they backtrack quadratically
      // on long '@'-free alphanumeric runs, so redaction cost must be bounded
      // by the (small) truncated length, not by the attacker's input size.
      const truncated = value.substring(0, 500);
      sanitized[key] = truncated
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
        .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED_TOKEN]');
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = '[REDACTED_STRUCTURE]'; // never persist nested attacker data
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return authResult.error;
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
