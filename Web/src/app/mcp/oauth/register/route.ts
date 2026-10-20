import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { isAllowedMcpRedirectUri, hashToken } from '@/lib/mcp/oauth';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

// RFC 7591 §2: these auth methods require a client secret issued at registration
const CONFIDENTIAL_AUTH_METHODS = new Set(['client_secret_basic', 'client_secret_post']);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
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

        // RFC 7591 §2: client_name is OPTIONAL — default when omitted or blank
        const resolvedClientName =
            typeof client_name === 'string' && client_name.trim().length > 0
                ? client_name.trim().slice(0, 100)
                : 'MCP Client';

        // RFC 7591 §2: redirect_uris is OPTIONAL (native clients may omit it) and
        // some MCP connectors send a bare string instead of an array — normalize
        // all three shapes. Every URI is re-validated at authorization time, where
        // unknown-but-valid URIs are appended to the client anyway.
        let normalizedRedirectUris: string[] = [];
        if (typeof redirect_uris === 'string') {
            normalizedRedirectUris = [redirect_uris];
        } else if (Array.isArray(redirect_uris)) {
            normalizedRedirectUris = redirect_uris.filter(
                (uri: unknown): uri is string => typeof uri === 'string'
            );
        }

        if (normalizedRedirectUris.length > 20) {
            return NextResponse.json(
                { error: 'invalid_redirect_uri', error_description: 'redirect_uris must contain at most 20 URIs' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Validate each redirect URI against allowed schemes/hosts
        for (const uri of normalizedRedirectUris) {
            if (!isAllowedMcpRedirectUri(uri)) {
                return NextResponse.json(
                    {
                        error: 'invalid_redirect_uri',
                        error_description: `Redirect URI "${uri}" is not allowed. Use an https:// URI, an RFC 8252 loopback URI (http://localhost, http://127.0.0.1, http://[::1]), or a valid custom app URI scheme (e.g. cursor://, vscode://, claude://).`,
                    },
                    { status: 400, headers: CORS_HEADERS }
                );
            }
        }

        const clientData: any = {
            clientName: resolvedClientName,
            redirectUris: normalizedRedirectUris,
            grantTypes: grant_types,
            responseTypes: response_types,
            tokenEndpointAuthMethod: token_endpoint_auth_method,
        };
        if (client_id && typeof client_id === 'string') {
            clientData.clientId = client_id;
        }

        // RFC 7591 §3.2.1: confidential clients MUST receive a client_secret in
        // the registration response. Store only the hash; return it exactly once.
        let issuedClientSecret: string | undefined;
        if (typeof token_endpoint_auth_method === 'string' && CONFIDENTIAL_AUTH_METHODS.has(token_endpoint_auth_method)) {
            issuedClientSecret = `rf_mcp_cs_${randomBytes(32).toString('hex')}`;
            clientData.clientSecretHash = hashToken(issuedClientSecret);
        }

        const client = await prisma.mcpOAuthClient.create({
            data: clientData,
        });

        const registrationResponse: Record<string, unknown> = {
            client_id: client.clientId,
            client_name: client.clientName,
            redirect_uris: client.redirectUris,
            grant_types: client.grantTypes,
            response_types: client.responseTypes,
            token_endpoint_auth_method: client.tokenEndpointAuthMethod,
        };
        if (issuedClientSecret) {
            registrationResponse.client_secret = issuedClientSecret;
            registrationResponse.client_secret_expires_at = 0;
        }

        return NextResponse.json(registrationResponse, {
            status: 201,
            headers: CORS_HEADERS,
        });
    } catch (error: any) {
        console.error('OAuth DCR registration error:', error);
        return NextResponse.json(
            { error: 'server_error', error_description: error?.message || 'Failed to register client' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
