import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { POLICY_VERSIONS } from '@/lib/policyVersion';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { consents, consentType, action } = body;

        let updates = [];
        if (Array.isArray(consents)) {
            updates = consents;
        } else if (consentType && action) {
            updates = [{ consentType, action }];
        } else {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const validConsentTypes = ['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'];
        const validActions = ['GRANTED', 'WITHDRAWN'];

        for (const update of updates) {
            if (!validConsentTypes.includes(update.consentType)) {
                return NextResponse.json({ error: `Invalid consent type: ${update.consentType}` }, { status: 400 });
            }
            if (!validActions.includes(update.action)) {
                return NextResponse.json({ error: `Invalid action: ${update.action}` }, { status: 400 });
            }
        }

        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const operations = [];
        for (const update of updates) {
            operations.push(
                prisma.userConsent.create({
                    data: {
                        userId: user.id,
                        consentType: update.consentType,
                        action: update.action,
                        policyVersion:
                            update.action === 'GRANTED'
                                ? POLICY_VERSIONS[update.consentType as keyof typeof POLICY_VERSIONS]
                                : null,
                        ipAddress,
                        userAgent,
                    },
                })
            );
        }

        const results = await prisma.$transaction(operations);
        const createdConsents = results.filter((r: any) => r && typeof r === 'object' && 'consentType' in r);

        if (!Array.isArray(consents) && createdConsents.length === 1) {
            return NextResponse.json(createdConsents[0]);
        }

        return NextResponse.json({ consents: createdConsents });
    } catch (error) {
        console.error('Mobile consent update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
