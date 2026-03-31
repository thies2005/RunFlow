import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { POLICY_VERSIONS } from '@/lib/policyVersion';

export async function GET(req: Request) {
    try {
        const session = await auth();
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

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { consents, consentType, action } = body;

        // Normalize input to an array of consents
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

        // Validate all updates first
        for (const update of updates) {
            if (!validConsentTypes.includes(update.consentType)) {
                return NextResponse.json({ error: `Invalid consent type: ${update.consentType}` }, { status: 400 });
            }
            if (!validActions.includes(update.action)) {
                return NextResponse.json({ error: `Invalid action: ${update.action}` }, { status: 400 });
            }
        }

        // Get user IP and user agent for audit purposes
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Prepare database operations
        const operations = [];

        for (const update of updates) {
             operations.push(prisma.userConsent.create({
                data: {
                    userId: session.user.id,
                    consentType: update.consentType,
                    action: update.action,
                    policyVersion: update.action === 'GRANTED' ? POLICY_VERSIONS[update.consentType as keyof typeof POLICY_VERSIONS] : null,
                    ipAddress,
                    userAgent,
                }
            }));

            // Handle specific withdrawal cascades
            if (update.consentType === 'HEALTH_DATA' && update.action === 'WITHDRAWN') {
                // Delete all health-related data
                operations.push(prisma.activity.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.dailyFitness.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.dailyHealthLog.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.supplementLog.deleteMany({ where: { supplement: { userId: session.user.id } } }));
                operations.push(prisma.supplementStack.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.supplement.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.nutritionLog.deleteMany({ where: { userId: session.user.id } }));
                // Disable tracking
                operations.push(prisma.user.update({
                    where: { id: session.user.id },
                    data: { healthTrackingEnabled: false }
                }));
            }
        }

        // Execute all operations in a single transaction
        const results = await prisma.$transaction(operations);

        // Return the created consents (filtering out the deletion results)
        // We know the create operations are the ones that return objects with 'consentType'
        const createdConsents = results.filter((r: any) => r && typeof r === 'object' && 'consentType' in r);

        // If it was a single update request, return just that object to maintain backward compatibility (if needed)
        // strict backward compatibility might require returning just the object, not in an array.
        // However, the original code returned `newConsent` (object).
        if (!Array.isArray(consents) && createdConsents.length === 1) {
            return NextResponse.json(createdConsents[0]);
        }

        return NextResponse.json({ consents: createdConsents });

    } catch (error) {
        console.error('Error logging consent:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
