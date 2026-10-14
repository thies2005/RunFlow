import { NextRequest, NextResponse } from 'next/server';

function getOrigin(request: Request): string {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
        return `${proto}://${host}`;
    }
    const url = new URL(request.url);
    return url.origin;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function GET(request: NextRequest) {
    const origin = getOrigin(request);

    return NextResponse.json(
        {
            resource: `${origin}/mcp`,
            authorization_servers: [origin],
            bearer_methods_supported: ['header'],
            scopes_supported: ['mcp:full'],
        },
        {
            headers: CORS_HEADERS,
        }
    );
}
