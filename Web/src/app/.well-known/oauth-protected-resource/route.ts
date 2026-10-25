import { NextRequest, NextResponse } from 'next/server';

function getOrigin(request: Request): string {
    const configured = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            // Fall through to request.url origin
        }
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
