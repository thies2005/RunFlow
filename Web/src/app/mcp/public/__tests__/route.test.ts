/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as mcpGet, POST as mcpPost, OPTIONS as mcpOptions } from '../route';
import { GET as exportGet } from '@/app/api/public/plan/export/route';

jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn().mockResolvedValue(null),
}));

function makeMcpRequest(method: string, body?: any, headers?: Record<string, string>): NextRequest {
    const url = 'http://localhost:3000/mcp/public';
    const reqHeaders = new Headers({
        'content-type': 'application/json',
        ...(headers || {}),
    });

    return new NextRequest(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });
}

describe('Public Stateless PlanGen MCP (/mcp/public)', () => {
    describe('JSON-RPC Protocol & Lifecycle', () => {
        it('handles initialize request with protocolVersion 2025-06-18', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2025-06-18',
                    clientInfo: { name: 'claude-desktop', version: '1.0.0' },
                },
            }, { 'x-forwarded-for': '10.0.0.1' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.jsonrpc).toBe('2.0');
            expect(data.id).toBe(1);
            expect(data.result).toBeDefined();
            expect(data.result.protocolVersion).toBe('2025-06-18');
            expect(data.result.serverInfo.name).toBe('runflow-mcp-public');
            expect(data.result.serverInfo.version).toBe('2.4.0');
            expect(data.result.capabilities.tools).toEqual({ listChanged: false });
        });

        it('handles initialize request with legacy protocolVersion 2025-03-26', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 2,
                method: 'initialize',
                params: {
                    protocolVersion: '2025-03-26',
                },
            }, { 'x-forwarded-for': '10.0.0.2' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.protocolVersion).toBe('2025-03-26');
        });

        it('handles notifications/initialized and ping', async () => {
            const notifReq = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                method: 'notifications/initialized',
            }, { 'x-forwarded-for': '10.0.0.3' });

            const notifRes = await mcpPost(notifReq);
            expect(notifRes.status).toBe(202);

            const pingReq = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 'ping-1',
                method: 'ping',
            }, { 'x-forwarded-for': '10.0.0.3' });

            const pingRes = await mcpPost(pingReq);
            expect(pingRes.status).toBe(200);
            const pingData = await pingRes.json();
            expect(pingData.result).toEqual({});
        });

        it('handles batch requests', async () => {
            const batchReq = makeMcpRequest('POST', [
                { jsonrpc: '2.0', id: 101, method: 'ping' },
                { jsonrpc: '2.0', id: 102, method: 'ping' },
            ], { 'x-forwarded-for': '10.0.0.4' });

            const res = await mcpPost(batchReq);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data).toHaveLength(2);
            expect(data[0].id).toBe(101);
            expect(data[1].id).toBe(102);
        });
    });

    describe('tools/list', () => {
        it('returns all 3 public tools with inputSchema and annotations', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 10,
                method: 'tools/list',
            }, { 'x-forwarded-for': '10.0.0.5' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result).toBeDefined();
            expect(data.result.tools).toHaveLength(3);

            const toolNames = data.result.tools.map((t: any) => t.name);
            expect(toolNames).toContain('generate_running_plan');
            expect(toolNames).toContain('calculate_vdot_paces');
            expect(toolNames).toContain('export_plan_url');

            for (const tool of data.result.tools) {
                expect(tool.description).toBeDefined();
                expect(tool.inputSchema.type).toBe('object');
                expect(tool.annotations).toEqual({
                    readOnlyHint: true,
                    idempotentHint: true,
                    destructiveHint: false,
                });
            }
        });
    });

    describe('tools/call — generate_running_plan', () => {
        it('generates a Marathon training plan with phase blocks and structured steps', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 20,
                method: 'tools/call',
                params: {
                    name: 'generate_running_plan',
                    arguments: {
                        raceType: 'MARATHON',
                        raceDate: '2026-12-01',
                        vdot: 50,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.6' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const content = data.result.structuredContent;
            expect(content.plan.raceType).toBe('MARATHON');
            expect(content.plan.vdot).toBe(50);
            expect(content.plan.totalWorkouts).toBeGreaterThan(0);

            // Phase blocks
            expect(content.phaseBlocks).toBeDefined();
            expect(Array.isArray(content.phaseBlocks)).toBe(true);
            expect(content.phaseBlocks.length).toBeGreaterThan(0);

            // Training zones
            expect(content.trainingZones.run.vdot).toBe(50);
            expect(content.trainingZones.run.paces.marathon.secPerKm).toBeGreaterThan(0);
            expect(content.trainingZones.run.paces.marathon.pacePerKm).toContain('/km');
            expect(content.trainingZones.run.paces.marathon.pacePerMile).toContain('/mi');

            // Workouts with structured steps
            expect(content.workouts.length).toBeGreaterThan(0);
            const firstWithSteps = content.workouts.find((w: any) => w.structuredSteps !== null);
            expect(firstWithSteps).toBeDefined();
            expect(firstWithSteps.structuredSteps.steps).toBeDefined();
        });

        it('generates a 100K Ultra training plan', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 21,
                method: 'tools/call',
                params: {
                    name: 'generate_running_plan',
                    arguments: {
                        raceType: 'HUNDRED_K',
                        raceDate: '2026-12-15',
                        vdot: 46,
                        weeklyVolumeKm: 85,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.7' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const content = data.result.structuredContent;
            expect(content.plan.raceType).toBe('HUNDRED_K');
            expect(content.workouts.length).toBeGreaterThan(0);
        });

        it('generates a Half Ironman triathlon plan with bike power and swim CSS zones', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 22,
                method: 'tools/call',
                params: {
                    name: 'generate_running_plan',
                    arguments: {
                        raceType: 'HALF_IRONMAN',
                        raceDate: '2026-12-20',
                        vdot: 45,
                        ftpWatts: 240,
                        swimCssSecPer100m: 110,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.8' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const content = data.result.structuredContent;
            expect(content.plan.raceType).toBe('HALF_IRONMAN');

            // Bike and Swim zones
            expect(content.trainingZones.bike.ftpWatts).toBe(240);
            expect(content.trainingZones.bike.zones.threshold.min).toBeGreaterThan(0);
            expect(content.trainingZones.swim.cssSecPer100m).toBe(110);
            expect(content.trainingZones.swim.zones.threshold.label).toBe('CSS');

            // Multi-sport workouts
            const workoutTypes = new Set(content.workouts.map((w: any) => w.type));
            expect(workoutTypes.has('RIDE') || workoutTypes.has('SWIM')).toBe(true);
        });

        it('handles past raceDate with isError: true', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 23,
                method: 'tools/call',
                params: {
                    name: 'generate_running_plan',
                    arguments: {
                        raceType: 'MARATHON',
                        raceDate: '2020-01-01',
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.9' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.isError).toBe(true);
            expect(data.result.content[0].text).toContain('future');
        });
    });

    describe('tools/call — calculate_vdot_paces', () => {
        it('calculates VDOT, equivalent predictions, and training paces from explicit vdot', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 30,
                method: 'tools/call',
                params: {
                    name: 'calculate_vdot_paces',
                    arguments: {
                        vdot: 50,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.10' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const content = data.result.structuredContent;
            expect(content.vdot).toBe(50);

            // Predictions
            expect(content.predictions['5K'].seconds).toBeGreaterThan(0);
            expect(content.predictions['5K'].formattedTime).toMatch(/^\d+:\d{2}$/);
            expect(content.predictions['MARATHON'].seconds).toBeGreaterThan(0);

            // Training paces
            expect(content.trainingPaces.easy.minPacePerKm).toMatch(/^\d+:\d{2}\/km$/);
            expect(content.trainingPaces.easy.minPacePerMile).toMatch(/^\d+:\d{2}\/mi$/);
            expect(content.trainingPaces.threshold.pacePerKm).toMatch(/^\d+:\d{2}\/km$/);
            expect(content.trainingPaces.threshold.pacePerMile).toMatch(/^\d+:\d{2}\/mi$/);
        });

        it('calculates VDOT from race distance and time', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 31,
                method: 'tools/call',
                params: {
                    name: 'calculate_vdot_paces',
                    arguments: {
                        raceDistance: '5K',
                        raceTimeSeconds: 1200, // 20:00 5K
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.11' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const content = data.result.structuredContent;
            expect(content.vdot).toBeCloseTo(49.8, 0);
        });
    });

    describe('tools/call — export_plan_url and GET /api/public/plan/export', () => {
        it('returns clickable HTML URL and GET returns valid rendered HTML', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 40,
                method: 'tools/call',
                params: {
                    name: 'export_plan_url',
                    arguments: {
                        format: 'html',
                        raceType: 'MARATHON',
                        raceDate: '2026-12-01',
                        vdot: 48,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.12' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const { url, format } = data.result.structuredContent;
            expect(format).toBe('html');
            expect(url).toContain('/api/public/plan/export?');
            expect(url).toContain('format=html');
            expect(url).toContain('raceType=MARATHON');

            // Call GET /api/public/plan/export with the generated URL
            const exportReq = new NextRequest(url, {
                headers: { 'x-forwarded-for': '10.0.0.13' },
            });
            const exportRes = await exportGet(exportReq);
            expect(exportRes.status).toBe(200);
            expect(exportRes.headers.get('content-type')).toContain('text/html');
            expect(exportRes.headers.get('content-disposition')).toContain('runflow-marathon-plan.html');

            const html = await exportRes.text();
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('MARATHON Training Plan');
            expect(html).toContain('RunFlow');
        });

        it('returns clickable CSV URL and GET returns valid RFC-compliant CSV', async () => {
            const req = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 41,
                method: 'tools/call',
                params: {
                    name: 'export_plan_url',
                    arguments: {
                        format: 'csv',
                        raceType: 'TEN_K',
                        raceDate: '2026-12-01',
                        vdot: 42,
                    },
                },
            }, { 'x-forwarded-for': '10.0.0.14' });

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.result.isError).toBe(false);
            const { url, format } = data.result.structuredContent;
            expect(format).toBe('csv');

            // Call GET /api/public/plan/export with the generated URL
            const exportReq = new NextRequest(url, {
                headers: { 'x-forwarded-for': '10.0.0.15' },
            });
            const exportRes = await exportGet(exportReq);
            expect(exportRes.status).toBe(200);
            expect(exportRes.headers.get('content-type')).toContain('text/csv');
            expect(exportRes.headers.get('content-disposition')).toContain('runflow-ten_k-plan.csv');

            const csv = await exportRes.text();
            expect(csv).toContain('Date,Day,Type,Description');
            expect(csv.split('\n').length).toBeGreaterThan(1);
        });
    });

    describe('GET and OPTIONS HTTP Endpoints', () => {
        it('supports OPTIONS preflight with CORS headers', async () => {
            const req = makeMcpRequest('OPTIONS', undefined, {
                origin: 'https://claude.ai',
                'x-forwarded-for': '10.0.0.16',
            });

            const res = await mcpOptions(req);
            expect(res.status).toBe(204);
            expect(res.headers.get('access-control-allow-origin')).toBe('https://claude.ai');
            expect(res.headers.get('access-control-allow-methods')).toContain('GET');
            expect(res.headers.get('access-control-allow-methods')).toContain('POST');
            expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
        });

        it('supports GET server status info', async () => {
            const req = makeMcpRequest('GET', undefined, { 'x-forwarded-for': '10.0.0.17' });
            const res = await mcpGet(req);

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.name).toBe('runflow-mcp-public');
            expect(data.version).toBe('2.4.0');
            expect(data.status).toBe('ok');
            expect(data.toolsCount).toBe(3);
        });

        it('supports GET SSE event stream', async () => {
            const req = makeMcpRequest('GET', undefined, {
                accept: 'text/event-stream',
                'x-forwarded-for': '10.0.0.18',
            });
            const res = await mcpGet(req);

            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toBe('text/event-stream');
        });
    });

    describe('Rate Limiting (10 requests / hour / IP)', () => {
        it('returns 429 when quota of 10 requests is exceeded', async () => {
            const testIp = '198.51.100.99';

            for (let i = 1; i <= 10; i++) {
                const req = makeMcpRequest('POST', {
                    jsonrpc: '2.0',
                    id: i,
                    method: 'ping',
                }, { 'x-forwarded-for': testIp });

                const res = await mcpPost(req);
                expect(res.status).toBe(200);
            }

            // 11th request should be rate limited
            const req11 = makeMcpRequest('POST', {
                jsonrpc: '2.0',
                id: 11,
                method: 'ping',
            }, { 'x-forwarded-for': testIp });

            const res11 = await mcpPost(req11);
            expect(res11.status).toBe(429);
            const data11 = await res11.json();
            expect(data11.error).toBe('Rate limit exceeded');
            expect(res11.headers.get('x-ratelimit-remaining')).toBe('0');
        });
    });
});
