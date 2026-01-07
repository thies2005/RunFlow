import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncActivityById } from '@/lib/strava/sync';

/**
 * Safely convert a value to BigInt, handling edge cases
 */
function safeBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || "STRAVA";


export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new NextResponse(JSON.stringify({ 'hub.challenge': challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { object_type, aspect_type, object_id, owner_id, updates } = body;

        console.log('Webhook received:', body);

        // Handle Deauthorization
        // Event: object_type='athlete', updates={ authorized: 'false' }
        if (object_type === 'athlete' && updates?.authorized === 'false') {
            console.log(`Deauthorization received for Strava Athlete ${owner_id}`);

            const stravaId = owner_id.toString();

            // Find user connected to this Strava ID
            const account = await prisma.account.findFirst({
                where: {
                    provider: 'strava',
                    providerAccountId: stravaId
                },
                include: { user: true }
            });

            if (account) {
                // Delete the User (Cascades to Account, Sessions, Goals, Activities)
                // This ensures we strictly comply with data deletion requests.
                await prisma.user.delete({
                    where: { id: account.userId }
                });
                console.log(`Deleted user ${account.userId} due to Strava deauthorization.`);
            }
        }

        // Handle Activity Events (create, update, delete)
        if (object_type === 'activity') {
            const stravaAthleteId = owner_id.toString();

            // Find user by Strava account
            const account = await prisma.account.findFirst({
                where: {
                    provider: 'strava',
                    providerAccountId: stravaAthleteId
                }
            });

            if (account) {
                if (aspect_type === 'create' || aspect_type === 'update') {
                    // Fire-and-forget: sync the activity without awaiting
                    // This ensures we return 200 immediately to Strava
                    syncActivityById(account.userId, object_id).catch((error) => {
                        console.error(`Webhook sync error for activity ${object_id}:`, error);
                    });
                } else if (aspect_type === 'delete') {
                    // Delete the activity from our database
                    await prisma.activity.deleteMany({
                        where: { stravaId: safeBigInt(object_id) }
                    });
                    console.log(`Deleted activity ${object_id} due to Strava webhook.`);
                }
            } else {
                console.warn(`Webhook: No user found for Strava athlete ${stravaAthleteId}`);
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

