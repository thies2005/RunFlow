import { NextRequest, NextResponse } from 'next/server';
import { McpServer, type McpTool } from '@/lib/mcp/server';
import { validateMcpOAuthToken, isUserPaidPremium } from '@/lib/mcp/oauth';
import { validateApiKey } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, rateLimitHeaders } from '@/lib/rateLimit';
import { TELEMETRY_MCP_TOOLS } from '@/lib/mcp/tools/telemetry';
import { WORKOUT_MCP_TOOLS } from '@/lib/mcp/tools/workouts';
import { PLAN_MCP_TOOLS } from '@/lib/mcp/tools/plans';
import { prisma } from '@/lib/db';

function getOrigin(request: Request): string {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXTAUTH_URL).origin; } catch {}
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXT_PUBLIC_APP_URL).origin; } catch {}
    }
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
        || request.headers.get('host')?.split(',')[0]?.trim();
    if (host) {
        return `${proto}://${host}`;
    }
    try {
        return new URL(request.url).origin;
    } catch {}
    return 'https://localhost';
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate',
};

const ALL_PERSONAL_MCP_TOOLS: McpTool[] = [
    ...TELEMETRY_MCP_TOOLS,
    ...PLAN_MCP_TOOLS,
    ...WORKOUT_MCP_TOOLS,
];

const paidMcpServer = new McpServer({
    name: 'runflow-personal',
    version: '3.0.0',
    instructions: [
        'RunFlow Personal MCP Server v3.0 for paid premium athletes.',
        'LOW-FATIGUE AGENT EXECUTION PROTOCOL (MANDATORY):',
        '1. NEVER loop over single-workout mutation tools (modify_workout, reschedule_workout, delete_workout, mark_workout_status, create_structured_workout) when modifying 2 or more workouts. ALWAYS batch mutations into a single atomic call using modify_workouts_batch, import_plan_workouts_batch, reschedule_workouts_batch, shift_plan_dates, delete_workouts_batch, or mark_workouts_status_batch so the user only sees ONE confirmation prompt.',
        '2. When creating a custom multi-week training plan (such as a cycling, MyWhoosh, strength, or hybrid plan), ALWAYS call create_custom_training_plan with phaseBlocks and workouts in a single atomic turn rather than calling create_training_plan (which runs the standard running/triathlon template generator).',
        '3. When inspecting an entire training plan (includeAllWorkouts: true), keep includeStructuredSteps: false (the default) so all workouts fit comfortably in context without truncation.',
        '4. Before or after destructive bulk changes, use list_plan_snapshots and restore_plan_snapshot for instant single-turn rollback.',
    ].join('\n'),
    tools: ALL_PERSONAL_MCP_TOOLS,
});

async function authenticatePaidUser(request: Request): Promise<{
    user: any;
    userId: string;
    isPaidPremium: boolean;
    authType: 'oauth' | 'api_key';
} | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    // 1. Check OAuth Bearer token (rf_mcp_...)
    const oauthMatch = authHeader.match(/^Bearer\s+(rf_mcp_\S+)$/i);
    if (oauthMatch) {
        const oauthResult = await validateMcpOAuthToken(oauthMatch[1]);
        if (oauthResult && oauthResult.valid) {
            return {
                user: oauthResult.user,
                userId: oauthResult.userId,
                isPaidPremium: oauthResult.isPaidPremium,
                authType: 'oauth',
            };
        }
        return null;
    }

    // 2. Check API key (rf_...)
    const apiKeyResult = await validateApiKey(authHeader);
    if (apiKeyResult) {
        const user = await prisma.user.findUnique({
            where: { id: apiKeyResult.userId },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
                aiSettings: {
                    select: {
                        usageTier: true,
                        aiEnabled: true,
                    },
                },
            },
        });

        if (user) {
            return {
                user,
                userId: user.id,
                isPaidPremium: isUserPaidPremium(user),
                authType: 'api_key',
            };
        }
    }

    return null;
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function DELETE() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version',
        },
    });
}

export async function GET(request: NextRequest) {
    const origin = getOrigin(request);
    const auth = await authenticatePaidUser(request);

    if (!auth) {
        return new Response(
            JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
            {
                status: 401,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json',
                    'WWW-Authenticate': `Bearer realm="RunFlow MCP", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
                },
            }
        );
    }

    if (!auth.isPaidPremium) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32002,
                    message: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                },
            },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    return paidMcpServer.handleHttpRequest(request, {
        userId: auth.userId,
        user: auth.user,
        isPaidPremium: auth.isPaidPremium,
        authType: auth.authType,
    });
}

const LEGACY_WRITE_MCP_TOOL_ALIASES = new Set([
    'log_workout_completion',
    'save_coaching_summary',
]);

const WRITE_MCP_TOOLS = new Set([
    ...Array.from(LEGACY_WRITE_MCP_TOOL_ALIASES),
    ...ALL_PERSONAL_MCP_TOOLS
        .filter(t => t.annotations?.readOnlyHint !== true)
        .map(t => t.name),
]);

export async function POST(request: NextRequest) {
    const origin = getOrigin(request);
    const auth = await authenticatePaidUser(request);

    if (!auth) {
        return new Response(
            JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
            {
                status: 401,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json',
                    'WWW-Authenticate': `Bearer realm="RunFlow MCP", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
                },
            }
        );
    }

    if (!auth.isPaidPremium) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32002,
                    message: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                },
            },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    // Rate limiting: 60 req / min per authenticated userId
    const rateLimit = await checkRateLimitAsync(auth.userId, {
        limit: 60,
        windowSeconds: 60,
        prefix: 'mcp-paid',
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32000,
                    message: 'Rate limit exceeded: 60 requests per minute allowed.',
                },
            },
            {
                status: 429,
                headers: {
                    ...CORS_HEADERS,
                    ...rateLimitHeaders(rateLimit),
                },
            }
        );
    }

    let body: any = null;
    try {
        const cloned = request.clone();
        body = await cloned.json();
    } catch {}

    if (body && typeof body === 'object') {
        const requests = Array.isArray(body) ? body : [body];
        for (const req of requests) {
            if (req && req.method === 'tools/call') {
                const toolName = req.params?.name;
                if (auth.authType === 'api_key' && toolName && WRITE_MCP_TOOLS.has(toolName)) {
                    return NextResponse.json(
                        {
                            jsonrpc: '2.0',
                            id: req.id ?? null,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        },
                        { status: 403, headers: CORS_HEADERS }
                    );
                }
            }
        }
    }

    return paidMcpServer.handleHttpRequest(request, {
        userId: auth.userId,
        user: auth.user,
        isPaidPremium: auth.isPaidPremium,
        authType: auth.authType,
    });
}
