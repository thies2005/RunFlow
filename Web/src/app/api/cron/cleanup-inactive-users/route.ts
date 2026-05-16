import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    // Only allow cron job requests (e.g. from Vercel)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find users inactive for more than 3 years (1095 days)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        const inactiveUsers = await prisma.user.findMany({
            where: {
                updatedAt: {
                    lt: threeYearsAgo,
                },
            },
            select: {
                id: true,
            },
        });

        if (inactiveUsers.length === 0) {
            return NextResponse.json({ message: 'No inactive users found' });
        }

        const userIds = inactiveUsers.map(u => u.id);

        // Delete them (Casade will take care of related data)
        const deleteResult = await prisma.user.deleteMany({
            where: {
                id: {
                    in: userIds,
                },
            },
        });

        return NextResponse.json({
            message: `Successfully deleted ${deleteResult.count} inactive users for GDPR compliance.`,
            deletedCount: deleteResult.count
        });
    } catch (error) {
        console.error('Error running GDPR inactive user cleanup:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
