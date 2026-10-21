import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
    calculateCogganPowerZones,
    calculatePowerCurve,
    estimateFtpFromPowerCurve,
} from '@/lib/metrics/power';

export const dynamic = 'force-dynamic';

async function getHighestEstimatedFtp(userId: string): Promise<number | null> {
    const rides = await prisma.activity.findMany({
        where: {
            userId,
            type: { in: ['RIDE', 'VIRTUAL_RIDE'] },
        },
        select: {
            name: true,
            averageWatts: true,
            weightedAverageWatts: true,
            streams: true,
        },
        orderBy: { startDate: 'desc' },
        take: 50,
    });

    let highestEftp: number | null = null;

    for (const r of rides) {
        let eftp: number | null = null;
        const streams = r.streams as { watts?: number[]; time?: number[] } | null;
        const titleMatch = (r.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
        const titleWatts = titleMatch ? parseInt(titleMatch[1], 10) : null;
        const validTitleWatts = titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null;

        if (/\bftp\s*test\b/i.test(r.name || '') && validTitleWatts) {
            eftp = validTitleWatts;
        } else if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
            const curve = calculatePowerCurve(streams.watts, streams.time);
            eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts ?? validTitleWatts);
        } else if (r.weightedAverageWatts || r.averageWatts || validTitleWatts) {
            eftp = estimateFtpFromPowerCurve([], r.weightedAverageWatts ?? r.averageWatts ?? validTitleWatts);
        }

        if (eftp && (highestEftp === null || eftp > highestEftp)) {
            highestEftp = eftp;
        }
    }

    return highestEftp;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                ftpWatts: true,
                autoEstimateFtp: true,
                swimCssSecPer100m: true,
                matchToMyWhoosh: true,
                weight: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const eFtpWatts = await getHighestEstimatedFtp(userId);
        const resolvedFtp = user.ftpWatts ?? eFtpWatts ?? null;
        const weightKg = user.weight && user.weight > 0 ? user.weight : null;
        const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
        const zones = resolvedFtp ? calculateCogganPowerZones(resolvedFtp, weightKg) : [];

        return NextResponse.json({
            ftpWatts: user.ftpWatts,
            eFtpWatts,
            resolvedFtp,
            autoEstimateFtp: user.autoEstimateFtp,
            swimCssSecPer100m: user.swimCssSecPer100m,
            matchToMyWhoosh: user.matchToMyWhoosh ?? false,
            weightKg,
            wPerKg,
            zones,
        });
    } catch (error) {
        console.error('Failed to get cycling settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { ftpWatts, autoEstimateFtp, swimCssSecPer100m, matchToMyWhoosh } = body;

        // Validation
        if (ftpWatts !== undefined && ftpWatts !== null) {
            if (typeof ftpWatts !== 'number' || isNaN(ftpWatts) || ftpWatts < 30 || ftpWatts > 800) {
                return NextResponse.json({ error: 'ftpWatts must be a number between 30 and 800' }, { status: 400 });
            }
        }

        if (autoEstimateFtp !== undefined && typeof autoEstimateFtp !== 'boolean') {
            return NextResponse.json({ error: 'autoEstimateFtp must be a boolean' }, { status: 400 });
        }

        if (matchToMyWhoosh !== undefined && typeof matchToMyWhoosh !== 'boolean') {
            return NextResponse.json({ error: 'matchToMyWhoosh must be a boolean' }, { status: 400 });
        }

        if (swimCssSecPer100m !== undefined && swimCssSecPer100m !== null) {
            if (typeof swimCssSecPer100m !== 'number' || isNaN(swimCssSecPer100m) || swimCssSecPer100m < 30 || swimCssSecPer100m > 600) {
                return NextResponse.json({ error: 'swimCssSecPer100m must be a number between 30 and 600' }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(ftpWatts !== undefined && { ftpWatts: ftpWatts === null ? null : Math.round(ftpWatts) }),
                ...(autoEstimateFtp !== undefined && { autoEstimateFtp }),
                ...(swimCssSecPer100m !== undefined && { swimCssSecPer100m: swimCssSecPer100m === null ? null : Math.round(swimCssSecPer100m) }),
                ...(matchToMyWhoosh !== undefined && { matchToMyWhoosh }),
            },
            select: {
                ftpWatts: true,
                autoEstimateFtp: true,
                swimCssSecPer100m: true,
                matchToMyWhoosh: true,
                weight: true,
            },
        });

        const eFtpWatts = await getHighestEstimatedFtp(userId);
        const resolvedFtp = updatedUser.ftpWatts ?? eFtpWatts ?? null;
        const weightKg = updatedUser.weight && updatedUser.weight > 0 ? updatedUser.weight : null;
        const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
        const zones = resolvedFtp ? calculateCogganPowerZones(resolvedFtp, weightKg) : [];

        return NextResponse.json({
            ftpWatts: updatedUser.ftpWatts,
            eFtpWatts,
            resolvedFtp,
            autoEstimateFtp: updatedUser.autoEstimateFtp,
            swimCssSecPer100m: updatedUser.swimCssSecPer100m,
            matchToMyWhoosh: updatedUser.matchToMyWhoosh ?? false,
            weightKg,
            wPerKg,
            zones,
        });
    } catch (error) {
        console.error('Failed to update cycling settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
