import { NextRequest, NextResponse } from 'next/server';
export { applyPlanDefaults, type PlanDefaultsOverrides, type AppliedPlanDefaults } from '@/lib/plans/defaults';

export interface McpToolAnnotation {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
}

export interface McpTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties?: Record<string, any>;
        required?: string[];
        [key: string]: any;
    };
    annotations?: McpToolAnnotation;
    handler: (params: any, context?: any) => Promise<any> | any;
}

export interface McpServerOptions {
    name: string;
    version?: string;
    instructions?: string;
    tools?: McpTool[];
}

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: any;
}

export interface JsonRpcSuccessResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result: any;
}

export interface JsonRpcErrorResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    error: {
        code: number;
        message: string;
        data?: any;
    };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export const JSON_RPC_ERRORS = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};

export class McpServer {
    public readonly name: string;
    public readonly version: string;
    public readonly instructions?: string;
    private tools: Map<string, McpTool> = new Map();

    constructor(options: McpServerOptions) {
        this.name = options.name;
        this.version = options.version || '2.4.0';
        this.instructions = options.instructions;
        if (options.tools) {
            for (const tool of options.tools) {
                this.registerTool(tool);
            }
        }
    }

    public registerTool(tool: McpTool): this {
        this.tools.set(tool.name, tool);
        return this;
    }

    public getTools(): McpTool[] {
        return Array.from(this.tools.values());
    }

    public async handleSingleRequest(request: any, context?: any): Promise<JsonRpcResponse | null> {
        if (!request || typeof request !== 'object' || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
            return {
                jsonrpc: '2.0',
                id: request && typeof request === 'object' && ('id' in request) ? request.id : null,
                error: {
                    code: JSON_RPC_ERRORS.INVALID_REQUEST,
                    message: 'Invalid Request: jsonrpc must be "2.0" and method must be a string',
                },
            };
        }

        const isNotification = request.id === undefined;
        const id = request.id ?? null;

        try {
            switch (request.method) {
                case 'initialize': {
                    const clientVersion = request.params?.protocolVersion;
                    const protocolVersion = clientVersion === '2025-03-26' ? '2025-03-26' : '2025-06-18';
                    const result = {
                        protocolVersion,
                        capabilities: {
                            tools: { listChanged: false },
                            prompts: { listChanged: false },
                            resources: { listChanged: false },
                        },
                        serverInfo: {
                            name: this.name,
                            version: this.version,
                        },
                        ...(this.instructions ? { instructions: this.instructions } : {}),
                    };
                    return isNotification ? null : { jsonrpc: '2.0', id, result };
                }

                case 'notifications/initialized': {
                    return isNotification ? null : { jsonrpc: '2.0', id, result: {} };
                }

                case 'ping': {
                    return isNotification ? null : { jsonrpc: '2.0', id, result: {} };
                }

                case 'tools/list': {
                    const result = {
                        tools: this.getTools().map(t => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema,
                            ...(t.annotations ? { annotations: t.annotations } : {}),
                        })),
                    };
                    return isNotification ? null : { jsonrpc: '2.0', id, result };
                }

                case 'tools/call': {
                    const params = request.params;
                    if (!params || typeof params !== 'object' || typeof params.name !== 'string') {
                        return {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: JSON_RPC_ERRORS.INVALID_PARAMS,
                                message: 'Invalid params: name is required',
                            },
                        };
                    }

                    const tool = this.tools.get(params.name);
                    if (!tool) {
                        const callResult = {
                            content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
                            isError: true,
                        };
                        return isNotification ? null : { jsonrpc: '2.0', id, result: callResult };
                    }

                    if (context?.authType === 'api_key' && tool.annotations?.readOnlyHint !== true) {
                        return isNotification ? null : {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        };
                    }

                    try {
                        const toolArgs = params.arguments || {};
                        const rawResult = await tool.handler(toolArgs, context);
                        const toolResult = Array.isArray(rawResult)
                            ? { count: rawResult.length, items: rawResult }
                            : rawResult;
                        const callResult = {
                            content: [{
                                type: 'text',
                                text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2),
                            }],
                            structuredContent: toolResult,
                            isError: false,
                        };
                        return isNotification ? null : { jsonrpc: '2.0', id, result: callResult };
                    } catch (err: any) {
                        const callResult = {
                            content: [{ type: 'text', text: err?.message || String(err) }],
                            isError: true,
                        };
                        return isNotification ? null : { jsonrpc: '2.0', id, result: callResult };
                    }
                }

                default: {
                    return isNotification ? null : {
                        jsonrpc: '2.0',
                        id,
                        error: {
                            code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
                            message: `Method not found: ${request.method}`,
                        },
                    };
                }
            }
        } catch (err: any) {
            return isNotification ? null : {
                jsonrpc: '2.0',
                id,
                error: {
                    code: JSON_RPC_ERRORS.INTERNAL_ERROR,
                    message: err?.message || 'Internal server error',
                },
            };
        }
    }

    public async handleJsonRpc(body: any, context?: any): Promise<JsonRpcResponse | (JsonRpcResponse | null)[] | null> {
        if (Array.isArray(body)) {
            if (body.length === 0) {
                return {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: JSON_RPC_ERRORS.INVALID_REQUEST,
                        message: 'Invalid Request: empty batch',
                    },
                };
            }
            if (body.length > 50) {
                return {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: JSON_RPC_ERRORS.INVALID_REQUEST,
                        message: 'Invalid Request: JSON-RPC batch size exceeds maximum of 50 requests',
                    },
                };
            }
            const results = await Promise.all(body.map(item => this.handleSingleRequest(item, context)));
            const nonNulls = results.filter((r): r is JsonRpcResponse => r !== null);
            return nonNulls.length > 0 ? nonNulls : null;
        }

        return this.handleSingleRequest(body, context);
    }

    public async handleHttpRequest(request: Request | NextRequest, context?: any): Promise<Response> {
        const origin = request.headers.get('origin') || '*';
        const sessionId = request.headers.get('mcp-session-id') || crypto.randomUUID();

        const commonHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
            'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate',
            'Mcp-Session-Id': sessionId,
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    ...commonHeaders,
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        if (request.method === 'GET') {
            const accept = request.headers.get('accept') || '';
            if (accept.includes('text/event-stream')) {
                const encoder = new TextEncoder();
                const url = new URL(request.url);
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${url.pathname}?sessionId=${sessionId}\n\n`));
                    },
                });

                return new Response(stream, {
                    status: 200,
                    headers: {
                        ...commonHeaders,
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                        'Connection': 'keep-alive',
                    },
                });
            }

            return Response.json({
                name: this.name,
                version: this.version,
                protocolVersion: '2025-06-18',
                status: 'ok',
                serverInfo: {
                    name: this.name,
                    version: this.version,
                },
                toolsCount: this.tools.size,
            }, {
                headers: commonHeaders,
            });
        }

        if (request.method === 'POST') {
            let body: any;
            try {
                const text = await request.text();
                body = text ? JSON.parse(text) : null;
            } catch {
                return Response.json({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: JSON_RPC_ERRORS.PARSE_ERROR,
                        message: 'Parse error: Invalid JSON',
                    },
                }, {
                    status: 200,
                    headers: commonHeaders,
                });
            }

            const response = await this.handleJsonRpc(body, context);

            if (response === null) {
                return new Response(null, {
                    status: 202,
                    headers: commonHeaders,
                });
            }

            const accept = request.headers.get('accept') || '';
            if (accept.includes('text/event-stream')) {
                const sseData = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
                return new Response(sseData, {
                    status: 200,
                    headers: {
                        ...commonHeaders,
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                    },
                });
            }

            return Response.json(response, {
                status: 200,
                headers: commonHeaders,
            });
        }

        return new Response('Method Not Allowed', {
            status: 405,
            headers: commonHeaders,
        });
    }
}
