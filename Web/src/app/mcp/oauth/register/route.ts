import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAllowedMcpRedirectUri } from '@/lib/mcp/oauth';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function POST(request: NextRequest) {
    try {
        const clientIdentifier = getClientIdentifier(request);
        const rateLimit = await checkRateLimitAsync(clientIdentifier, {
            limit: 10,
            windowSeconds: 3600,
            prefix: 'mcp-dcr',
        });

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'slow_down', error_description: 'Rate limit exceeded for client registration' },
                { status: 429, headers: CORS_HEADERS }
            );
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'invalid_request', error_description: 'Request body must be valid JSON' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        const {
            client_id,
            client_name,
            redirect_uris,
            grant_types = ['authorization_code', 'refresh_token'],
            response_types = ['code'],
            token_endpoint_auth_method = 'none',
        } = body || {};

        if (!client_name || typeof client_name !== 'string' || !client_name.trim() || client_name.trim().length > 100) {
            return NextResponse.json(
                { error: 'invalid_client_metadata', error_description: 'client_name is required (1-100 characters)' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        if (!Array.isArray(redirect_uris) || redirect_uris.length === 0 || redirect_uris.length > 5) {
            return NextResponse.json(
                { error: 'invalid_redirect_uri', error_description: 'redirect_uris must be an array of 1 to 5 URIs' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Validate each redirect URI against allowed hosts
        for (const uri of redirect_uris) {
            if (typeof uri !== 'string' || !isAllowedMcpRedirectUri(uri)) {
                return NextResponse.json(
                    {
                        error: 'invalid_redirect_uri',
                        error_description: `Redirect URI "${uri}" is not allowed. Supported providers are Claude, Anthropic, Google, OpenAI, supported native applications (Cursor, VS Code, etc.), and local loopback.`,
                    },
                    { status: 400, headers: CORS_HEADERS }
                );
            }
        }

        const clientData: any = {
            clientName: client_name.trim(),
            redirectUris: redirect_uris,
            grantTypes: grant_types,
            responseTypes: response_types,
            tokenEndpointAuthMethod: token_endpoint_auth_method,
        };
        if (client_id && typeof client_id === 'string') {
            clientData.clientId = client_id;
        }

        const client = await prisma.mcpOAuthClient.create({
            data: clientData,
        });

        return NextResponse.json(
            {
                client_id: client.clientId,
                client_name: client.clientName,
                redirect_uris: client.redirectUris,
                grant_types: client.grantTypes,
                response_types: client.responseTypes,
                token_endpoint_auth_method: client.tokenEndpointAuthMethod,
            },
            {
                status: 201,
                headers: CORS_HEADERS,
            }
        );
    } catch (error: any) {
        console.error('OAuth DCR registration error:', error);
        return NextResponse.json(
            { error: 'server_error', error_description: error?.message || 'Failed to register client' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
