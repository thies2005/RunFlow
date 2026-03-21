export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

// GET - Return reminder settings for the authenticated user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let settings = await prisma.reminderSettings.findUnique({
            where: { userId: session.user.id },
        });

        // Return defaults if no settings exist yet
        if (!settings) {
            settings = {
                id: '',
                userId: session.user.id,
                supplementMorningEnabled: false,
                supplementMorningTime: '08:00',
                supplementNoonEnabled: false,
                supplementNoonTime: '12:00',
                supplementEveningEnabled: false,
                supplementEveningTime: '20:00',
                weightReminderEnabled: false,
                weightReminderTime: '07:00',
                foodBreakfastEnabled: false,
                foodBreakfastTime: '09:00',
                foodLunchEnabled: false,
                foodLunchTime: '13:00',
                foodDinnerEnabled: false,
                foodDinnerTime: '19:00',
                workoutReminderEnabled: false,
                workoutReminderMinutes: 60,
                timezone: 'UTC',
                lastSupplementMorningSent: null,
                lastSupplementNoonSent: null,
                lastSupplementEveningSent: null,
                lastWeightSent: null,
                lastFoodBreakfastSent: null,
                lastFoodLunchSent: null,
                lastFoodDinnerSent: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        // Check if user has any push subscriptions
        const subscriptionCount = await prisma.pushSubscription.count({
            where: { userId: session.user.id },
        });

        return NextResponse.json({
            ...settings,
            hasSubscription: subscriptionCount > 0,
        });
    } catch (error) {
        console.error('Error fetching reminder settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reminder settings' },
            { status: 500 }
        );
    }
}

// PUT - Update reminder settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Extract only allowed fields
        const data: Record<string, any> = {};
        const allowedBooleans = [
            'supplementMorningEnabled', 'supplementNoonEnabled', 'supplementEveningEnabled',
            'weightReminderEnabled',
            'foodBreakfastEnabled', 'foodLunchEnabled', 'foodDinnerEnabled',
            'workoutReminderEnabled',
        ];
        const allowedStrings = [
            'supplementMorningTime', 'supplementNoonTime', 'supplementEveningTime',
            'weightReminderTime',
            'foodBreakfastTime', 'foodLunchTime', 'foodDinnerTime',
            'timezone',
        ];
        const allowedInts = ['workoutReminderMinutes'];

        for (const key of allowedBooleans) {
            if (typeof body[key] === 'boolean') data[key] = body[key];
        }
        for (const key of allowedStrings) {
            if (typeof body[key] === 'string') {
                // Validate time format HH:MM
                if (key !== 'timezone' && !/^\d{2}:\d{2}$/.test(body[key])) {
                    return NextResponse.json(
                        { error: `Invalid time format for ${key}: must be HH:MM` },
                        { status: 400 }
                    );
                }
                data[key] = body[key];
            }
        }
        for (const key of allowedInts) {
            if (typeof body[key] === 'number' && Number.isInteger(body[key])) {
                data[key] = body[key];
            }
        }

        const settings = await prisma.reminderSettings.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                ...data,
            },
            update: data,
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error updating reminder settings:', error);
        return NextResponse.json(
            { error: 'Failed to update reminder settings' },
            { status: 500 }
        );
    }
}
