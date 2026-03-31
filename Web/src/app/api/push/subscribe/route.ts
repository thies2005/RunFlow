import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getVapidPublicKey } from '@/lib/push';

// GET - Return the VAPID public key
export async function GET() {
    return NextResponse.json({ publicKey: getVapidPublicKey() });
}

// POST - Save a push subscription
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json(
                { error: 'Missing subscription data (endpoint, keys.p256dh, keys.auth)' },
                { status: 400 }
            );
        }

        // Upsert to handle re-subscriptions
        const subscription = await prisma.pushSubscription.upsert({
            where: { endpoint },
            create: {
                userId: session.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            update: {
                userId: session.user.id,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        });

        return NextResponse.json({ success: true, id: subscription.id });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return NextResponse.json(
            { error: 'Failed to save subscription' },
            { status: 500 }
        );
    }
}

// DELETE - Remove a push subscription
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                endpoint,
                userId: session.user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing push subscription:', error);
        return NextResponse.json(
            { error: 'Failed to remove subscription' },
            { status: 500 }
        );
    }
}
