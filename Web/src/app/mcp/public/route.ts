import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { McpServer } from '@/lib/mcp/server';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig, type RateLimitResult } from '@/lib/rateLimit';
import { calculateVdotPacesTool, exportPlanUrlTool, generateRunningPlanTool } from './tools';

const PUBLIC_MCP_RATE_LIMIT: RateLimitConfig = {
    limit: 10,
    windowSeconds: 3600,
    prefix: 'mcp-public',
};

// Operator tier for bulk testing (e.g. plan generation from a local agent):
// a token matching PUBLIC_MCP_TOKEN (falling back to CRON_SECRET) via
// Authorization: Bearer or ?token= unlocks a high-volume bucket. Anonymous
// callers keep the 10/hour public limit.
// Operator hourly cap is configurable: PUBLIC_MCP_OPERATOR_LIMIT = requests per
// hour (unset or invalid → 600; 0 → unlimited).
const OPERATOR_HOURLY_LIMIT = (() => {
    const raw = Number.parseInt(process.env.PUBLIC_MCP_OPERATOR_LIMIT ?? '', 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : 600;
})();

const OPERATOR_MCP_RATE_LIMIT: RateLimitConfig = {
    limit: OPERATOR_HOURLY_LIMIT,
    windowSeconds: 3600,
    prefix: 'mcp-public-operator',
};

function operatorTokenMatches(provided: string, expected: string): boolean {
    if (!provided || !expected || provided.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function isOperatorRequest(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const provided = bearer || request.nextUrl.searchParams.get('token');
    if (!provided) return false;
    const dedicated = process.env.PUBLIC_MCP_TOKEN || '';
    if (dedicated && operatorTokenMatches(provided, dedicated)) return true;
    const cronSecret = process.env.CRON_SECRET || '';
    return cronSecret ? operatorTokenMatches(provided, cronSecret) : false;
}

async function checkPublicMcpRateLimit(request: NextRequest): Promise<RateLimitResult | null> {
    if (isOperatorRequest(request)) {
        if (OPERATOR_HOURLY_LIMIT === 0) {
            return null; // unlimited
        }
        return checkRateLimitAsync('operator', OPERATOR_MCP_RATE_LIMIT);
    }
    return checkRateLimitAsync(getClientIdentifier(request), PUBLIC_MCP_RATE_LIMIT);
}

const publicMcpServer = new McpServer({
    name: 'runflow-mcp-public',
    version: '2.4.0',
    instructions: 'Stateless running and endurance training plan generator and VDOT calculator by RunFlow.',
    tools: [
        generateRunningPlanTool,
        calculateVdotPacesTool,
        exportPlanUrlTool,
    ],
});

export async function GET(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function POST(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (Array.isArray(body)) {
            if (body.length > 10) {
                return NextResponse.json(
                    {
                        jsonrpc: '2.0',
                        id: null,
                        error: {
                            code: -32600,
                            message: 'Invalid Request: Public MCP batch size exceeds maximum of 10 requests',
                        },
                    },
                    { status: 400 }
                );
            }
            const toolCalls = body.filter((item: unknown) => Boolean(item && typeof item === 'object' && (item as { method?: string }).method === 'tools/call')).length;
            for (let i = 1; i < toolCalls; i++) {
                const extraLimit = await checkPublicMcpRateLimit(request);
                if (extraLimit && !extraLimit.allowed) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded' },
                        { status: 429, headers: rateLimitHeaders(extraLimit) }
                    );
                }
            }
        }
    } catch {
        // Malformed JSON is handled downstream by publicMcpServer.handleHttpRequest
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}

export async function OPTIONS(request: NextRequest) {
    return publicMcpServer.handleHttpRequest(request, { request });
}
