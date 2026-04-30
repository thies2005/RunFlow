import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POLICY_VERSIONS } from '@/lib/policyVersion';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const consents = await prisma.userConsent.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        let needsReconsent = false;
        const missingPolicies: string[] = [];

        for (const [policyType, currentVersion] of Object.entries(POLICY_VERSIONS)) {
            const latestConsent = consents.find((c: any) => c.consentType === policyType);
            if (!latestConsent || latestConsent.action !== 'GRANTED' || latestConsent.policyVersion !== currentVersion) {
                needsReconsent = true;
                missingPolicies.push(policyType);
            }
        }

        return NextResponse.json({ needsReconsent, missingPolicies });
    } catch (error) {
        console.error('Mobile consent check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
