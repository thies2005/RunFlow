import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { POLICY_VERSIONS } from '@/lib/policyVersion';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const consents = await prisma.userConsent.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });

        // Get the latest active status for each consent type
        const activeConsents = Object.keys(POLICY_VERSIONS).reduce((acc, type) => {
            const latest = consents.find((c: any) => c.consentType === type);
            acc[type] = latest?.action === 'GRANTED';
            return acc;
        }, {} as Record<string, boolean>);

        return NextResponse.json({
            consents,
            active: activeConsents,
            currentVersions: POLICY_VERSIONS
        });
    } catch (error) {
        console.error('Error fetching consents:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { consentType, action } = body;

        if (!['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'].includes(consentType)) {
            return NextResponse.json({ error: 'Invalid consent type' }, { status: 400 });
        }

        if (!['GRANTED', 'WITHDRAWN'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Get user IP and user agent for audit purposes
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Log the consent
        const newConsent = await prisma.userConsent.create({
            data: {
                userId: session.user.id,
                consentType,
                action,
                policyVersion: action === 'GRANTED' ? POLICY_VERSIONS[consentType as keyof typeof POLICY_VERSIONS] : null,
                ipAddress,
                userAgent,
            }
        });

        // Handle specific withdrawal cascades
        if (consentType === 'HEALTH_DATA' && action === 'WITHDRAWN') {
            // Delete all health-related data
            await prisma.$transaction([
                prisma.activity.deleteMany({ where: { userId: session.user.id } }),
                prisma.dailyFitness.deleteMany({ where: { userId: session.user.id } }),
                prisma.dailyHealthLog.deleteMany({ where: { userId: session.user.id } }),
                prisma.supplementLog.deleteMany({ where: { supplement: { userId: session.user.id } } }),
                prisma.supplementStack.deleteMany({ where: { userId: session.user.id } }),
                prisma.supplement.deleteMany({ where: { userId: session.user.id } }),
                prisma.nutritionLog.deleteMany({ where: { userId: session.user.id } }),
                // Disable tracking
                prisma.user.update({
                    where: { id: session.user.id },
                    data: { healthTrackingEnabled: false }
                })
            ]);
        }

        return NextResponse.json(newConsent);
    } catch (error) {
        console.error('Error logging consent:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
