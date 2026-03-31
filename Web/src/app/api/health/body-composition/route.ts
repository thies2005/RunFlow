import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;

        const measurements = await prisma.bodyMeasurement.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        });

        // Use standard JS date formatting
        const formatted = measurements.map((m: any) => ({
            ...m,
            dateStr: toUtcDayKey(m.date)
        }));

        return NextResponse.json({ measurements: formatted });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch body composition data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        const { dateStr, weight, bodyFat, muscleMass, chest, waist, hips, arms, thighs } = body;

        if (!dateStr) {
            return NextResponse.json({ error: 'Missing date (yyyy-mm-dd)' }, { status: 400 });
        }

        // Compute midnight UTC date from "yyyy-mm-dd" safely
        const date = parseUtcDayKey(toUtcDayKey(dateStr));

        const record = await prisma.bodyMeasurement.upsert({
            where: {
                userId_date: {
                    userId,
                    date
                }
            },
            update: {
                weight: weight !== undefined ? weight : undefined,
                bodyFat: bodyFat !== undefined ? bodyFat : undefined,
                muscleMass: muscleMass !== undefined ? muscleMass : undefined,
                chest: chest !== undefined ? chest : undefined,
                waist: waist !== undefined ? waist : undefined,
                hips: hips !== undefined ? hips : undefined,
                arms: arms !== undefined ? arms : undefined,
                thighs: thighs !== undefined ? thighs : undefined,
            },
            create: {
                userId,
                date,
                weight,
                bodyFat,
                muscleMass,
                chest,
                waist,
                hips,
                arms,
                thighs
            }
        });

        // Also sync weight back to DailyHealthLog if weight is provided, mapping exact date
        if (weight !== undefined && weight !== null) {
            await upsertDailyHealthLog({
                db: prisma,
                userId,
                date,
                weight,
                source: 'manual',
            });
        }

        return NextResponse.json({ success: true, record });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to save body composition data' }, { status: 500 });
    }
}
