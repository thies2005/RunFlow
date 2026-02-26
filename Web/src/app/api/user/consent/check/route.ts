import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { POLICY_VERSIONS } from '@/lib/policyVersion';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function GET(req: Request) {
    try {
        // Rate limiting to prevent abuse
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

        const consents = await prisma.userConsent.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });

        // Determine if there is any required policy that the user has NOT actively granted for the current version
        let needsReconsent = false;
        const missingPolicies: string[] = [];

        for (const [policyType, currentVersion] of Object.entries(POLICY_VERSIONS)) {
            // Find the LATEST consent entry for this specific type
            const latestConsent = consents.find((c: any) => c.consentType === policyType);

            // If they haven't explicitly granted consent, or their granted consent is for an older version
            if (!latestConsent || latestConsent.action !== 'GRANTED' || latestConsent.policyVersion !== currentVersion) {
                needsReconsent = true;
                missingPolicies.push(policyType);
            }
        }

        return NextResponse.json({ needsReconsent, missingPolicies });
    } catch (error) {
        console.error('Error checking reconsent status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
