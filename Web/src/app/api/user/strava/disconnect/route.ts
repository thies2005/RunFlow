import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const deleteActivities = body.deleteActivities === true;

        const userId = session.user.id;

        await prisma.account.deleteMany({
            where: {
                userId,
                provider: 'strava'
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                stravaAccessToken: null,
                stravaRefreshToken: null,
                stravaTokenExpiry: null,
                stravaId: null,
            }
        });

        let deletedActivitiesCount = 0;
        if (deleteActivities) {
            const deleteResult = await prisma.activity.deleteMany({
                where: {
                    userId,
                    stravaId: { gt: BigInt(0) }
                }
            });
            deletedActivitiesCount = deleteResult.count;
        }

        return NextResponse.json({
            message: 'Strava disconnected successfully',
            activitiesDeleted: deletedActivitiesCount
        });

    } catch (error) {
        console.error('Error disconnecting Strava:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
