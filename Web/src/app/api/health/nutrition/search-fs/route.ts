import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { searchFatSecret } from '@/lib/data/externalFoodSearch';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (30 searches/minute per client)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, {
        limit: 30,
        windowSeconds: 60,
        prefix: 'nutrition-search',
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const fsResults = await searchFatSecret(query);
        return NextResponse.json(fsResults);
    } catch (error) {
        console.error('FatSecret search error:', error);
        return NextResponse.json({ error: 'Failed to fetch from FatSecret' }, { status: 500 });
    }
}
