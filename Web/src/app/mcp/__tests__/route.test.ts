/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { GET as getProtectedResource } from '@/app/.well-known/oauth-protected-resource/route';
import { GET as getAuthorizationServer } from '@/app/.well-known/oauth-authorization-server/route';
import { POST as registerClient } from '@/app/mcp/oauth/register/route';
import { POST as authorizePost } from '@/app/mcp/oauth/authorize/route';
import { POST as tokenPost } from '@/app/mcp/oauth/token/route';
import { GET as mcpGet, POST as mcpPost } from '@/app/mcp/route';
import { evaluatePlanSafety } from '@/lib/mcp/safety';

// Mock dependencies
jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/auth', () => ({
    auth: jest.fn(() => Promise.resolve({
        user: { id: 'user-paid-1', email: 'pro@runflow.com', name: 'Pro Runner' },
    })),
}));

jest.mock('@/lib/db', () => {
    const mockDbInternal: any = {
        mcpOAuthClient: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
        mcpOAuthCode: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        mcpOAuthToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        apiKey: {
            findFirst: jest.fn(),
            update: jest.fn().mockResolvedValue({}),
        },
        goal: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        workout: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        activity: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
        dailyFitness: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
        dailyReadinessRecord: {
            findMany: jest.fn(),
        },
        dailyHealthLog: {
            findMany: jest.fn(),
        },
        readinessBaseline: {
            findFirst: jest.fn(),
        },
        planSnapshot: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn(async (cbOrArray: any) => {
            if (Array.isArray(cbOrArray)) {
                return Promise.all(cbOrArray);
            }
            return cbOrArray(mockDbInternal);
        }),
    };
    return { prisma: mockDbInternal };
});

import { prisma } from '@/lib/db';
const mockDb = prisma as any;

jest.mock('@/lib/metrics/fitnessCache', () => ({
    ensureFitnessCacheUpToDate: jest.fn().mockResolvedValue(undefined),
    updateFitnessCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/plans/adapt', () => ({
    adaptPlanAfterCompletion: jest.fn().mockResolvedValue({ adapted: true }),
}));

jest.mock('@/lib/plans/recalculate-paces', () => ({
    recalculateWorkoutPaces: jest.fn().mockResolvedValue({ updatedCount: 4, skippedCount: 0 }),
}));

function makeRequest(url: string, method: string, body?: any, headers?: Record<string, string>): NextRequest {
    const reqHeaders = new Headers({
        'content-type': 'application/json',
        ...(headers || {}),
    });

    return new NextRequest(url, {
        method,
        headers: reqHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
}

describe('Paid-Premium MCP Suite (/mcp)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. OAuth Discovery Endpoints', () => {
        it('returns protected resource metadata at /.well-known/oauth-protected-resource', async () => {
            const req = makeRequest('https://runflow.schuelken.uk/.well-known/oauth-protected-resource', 'GET');
            const res = await getProtectedResource(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.resource).toBe('https://runflow.schuelken.uk/mcp');
            expect(data.authorization_servers).toContain('https://runflow.schuelken.uk');
            expect(data.bearer_methods_supported).toEqual(['header']);
            expect(data.scopes_supported).toEqual(['mcp:full']);
        });

        it('returns authorization server metadata at /.well-known/oauth-authorization-server', async () => {
            const req = makeRequest('https://runflow.schuelken.uk/.well-known/oauth-authorization-server', 'GET');
            const res = await getAuthorizationServer(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.issuer).toBe('https://runflow.schuelken.uk');
            expect(data.authorization_endpoint).toBe('https://runflow.schuelken.uk/mcp/oauth/authorize');
            expect(data.token_endpoint).toBe('https://runflow.schuelken.uk/mcp/oauth/token');
            expect(data.registration_endpoint).toBe('https://runflow.schuelken.uk/mcp/oauth/register');
            expect(data.code_challenge_methods_supported).toEqual(['S256']);
        });

        it('returns 401 with WWW-Authenticate header on unauthenticated request to /mcp', async () => {
            const req = makeRequest('https://runflow.schuelken.uk/mcp', 'POST', {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
            });

            const res = await mcpPost(req);
            expect(res.status).toBe(401);
            const wwwAuth = res.headers.get('www-authenticate');
            expect(wwwAuth).toContain('Bearer realm="RunFlow MCP"');
            expect(wwwAuth).toContain('resource_metadata="https://runflow.schuelken.uk/.well-known/oauth-protected-resource"');
        });
    });

    describe('2. OAuth 2.1 Registration, Authorization & PKCE Token Exchange', () => {
        it('registers Claude Desktop client via Dynamic Client Registration (RFC 7591)', async () => {
            mockDb.mcpOAuthClient.create.mockResolvedValue({
                id: 'client-db-1',
                clientId: 'cuid-claude-client',
                clientName: 'Claude Desktop',
                redirectUris: ['https://claude.ai/api/mcp/callback'],
                grantTypes: ['authorization_code', 'refresh_token'],
                responseTypes: ['code'],
                tokenEndpointAuthMethod: 'none',
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                client_name: 'Claude Desktop',
                redirect_uris: ['https://claude.ai/api/mcp/callback'],
            });

            const res = await registerClient(req);
            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data.client_id).toBe('cuid-claude-client');
            expect(data.client_name).toBe('Claude Desktop');
            expect(data.redirect_uris).toEqual(['https://claude.ai/api/mcp/callback']);
        });

        it('rejects client registration with unauthorized redirect URI', async () => {
            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                client_name: 'Untrusted App',
                redirect_uris: ['https://attacker.evil.com/callback'],
            });

            const res = await registerClient(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_redirect_uri');
        });

        it('rejects authorization for Free Tier user (none / tier1)', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-free-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier1' },
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'test-challenge',
            });

            const res = await authorizePost(req);
            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data.error).toBe('forbidden');
            expect(data.error_description).toContain('Paid Premium');
        });

        it('issues authorization code for Paid Premium user (tier2/3/admin)', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier2' },
            });

            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'cuid-claude-client',
                redirectUris: ['https://claude.ai/api/mcp/callback'],
            });

            mockDb.mcpOAuthCode.create.mockResolvedValue({ id: 'code-1' });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'abc-challenge-123',
                state: 'random-state-1',
            });

            const res = await authorizePost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.redirect_uri).toContain('https://claude.ai/api/mcp/callback?code=rf_code_');
            expect(data.redirect_uri).toContain('state=random-state-1');
            expect(mockDb.mcpOAuthCode.create).toHaveBeenCalledTimes(1);
        });

        it('exchanges code for tokens using PKCE S256 verification', async () => {
            const codeVerifier = 'high-entropy-pkce-verifier-string-1234567890';
            const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

            mockDb.mcpOAuthCode.findUnique.mockResolvedValue({
                id: 'code-row-1',
                clientId: 'cuid-claude-client',
                userId: 'user-paid-1',
                redirectUri: 'https://claude.ai/api/mcp/callback',
                codeChallenge,
                codeChallengeMethod: 'S256',
                scope: 'mcp:full',
                expiresAt: new Date(Date.now() + 60000),
                usedAt: null,
                user: {
                    id: 'user-paid-1',
                    isAdmin: false,
                    aiSettings: { usageTier: 'tier3' },
                },
            });

            mockDb.mcpOAuthCode.update.mockResolvedValue({});
            mockDb.mcpOAuthToken.create.mockResolvedValue({ id: 'token-row-1' });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/token', 'POST', {
                grant_type: 'authorization_code',
                client_id: 'cuid-claude-client',
                code: 'rf_code_abc',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_verifier: codeVerifier,
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.access_token).toMatch(/^rf_mcp_/);
            expect(data.refresh_token).toMatch(/^rf_mcpr_/);
            expect(data.token_type).toBe('Bearer');
            expect(data.expires_in).toBe(30 * 86400);
            expect(mockDb.mcpOAuthCode.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) })
            );
        });

        it('rejects token exchange when PKCE verifier is invalid', async () => {
            mockDb.mcpOAuthCode.findUnique.mockResolvedValue({
                id: 'code-row-2',
                clientId: 'cuid-claude-client',
                userId: 'user-paid-1',
                redirectUri: 'https://claude.ai/api/mcp/callback',
                codeChallenge: 'expected-correct-challenge',
                expiresAt: new Date(Date.now() + 60000),
                usedAt: null,
                user: { id: 'user-paid-1', isAdmin: true, aiSettings: { usageTier: 'tier3' } },
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/token', 'POST', {
                grant_type: 'authorization_code',
                client_id: 'cuid-claude-client',
                code: 'rf_code_abc',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_verifier: 'wrong-verifier',
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_grant');
        });
    });

    describe('3. Dual Authentication (OAuth & API Key) & Paid Gate on /mcp', () => {
        it('authenticates via OAuth Bearer token (rf_mcp_...)', async () => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-1',
                userId: 'user-paid-1',
                clientId: 'cuid-claude-client',
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: null,
                user: {
                    id: 'user-paid-1',
                    name: 'Pro Athlete',
                    email: 'pro@test.com',
                    isAdmin: false,
                    aiSettings: { usageTier: 'tier2', aiEnabled: true },
                },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                { jsonrpc: '2.0', id: 10, method: 'tools/list' },
                { Authorization: 'Bearer rf_mcp_0123456789abcdef0123456789abcdef' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.tools).toBeDefined();
            expect(data.result.tools.length).toBe(16);
        });

        it('authenticates via personal API Key (rf_...)', async () => {
            mockDb.apiKey.findFirst.mockResolvedValue({
                id: 'key-1',
                userId: 'user-paid-1',
                expiresAt: new Date(Date.now() + 86400000),
                user: { id: 'user-paid-1', name: 'Pro Athlete', email: 'pro@test.com' },
            });

            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: true,
                aiSettings: { usageTier: 'tier3', aiEnabled: true },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                { jsonrpc: '2.0', id: 11, method: 'ping' },
                { Authorization: 'Bearer rf_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result).toEqual({});
        });

        it('returns JSON-RPC error -32002 if user downgraded to free tier', async () => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-2',
                userId: 'user-downgraded',
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: null,
                user: {
                    id: 'user-downgraded',
                    isAdmin: false,
                    aiSettings: { usageTier: 'none', aiEnabled: false },
                },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                { jsonrpc: '2.0', id: 12, method: 'tools/list' },
                { Authorization: 'Bearer rf_mcp_downgraded' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data.error.code).toBe(-32002);
            expect(data.error.message).toContain('active Paid Premium account');
        });
    });

    describe('4. Tools: Strava Scrubbing Compliance (get_recent_activities)', () => {
        it('strictly scrubs Strava-synced activities and attaches compliance notice', async () => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-1',
                userId: 'user-paid-1',
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: null,
                user: {
                    id: 'user-paid-1',
                    isAdmin: true,
                    aiSettings: { usageTier: 'tier3' },
                },
            });

            mockDb.activity.findMany.mockResolvedValue([
                {
                    id: 'act-strava-1',
                    stravaId: BigInt(9876543210),
                    type: 'RUN',
                    name: 'Morning Secret Strava Run',
                    description: 'Running with GPS stream details',
                    startDate: new Date('2026-10-10T08:00:00Z'),
                    distance: 10000,
                    movingTime: 3000,
                    elapsedTime: 3100,
                    averageHr: 155,
                    runningTss: 65,
                    npWatts: null,
                    rawJson: { sensitive: 'gps-points' },
                    streams: [{ type: 'latlng', data: [[0, 0]] }],
                },
                {
                    id: 'act-manual-2',
                    stravaId: null,
                    type: 'RUN',
                    name: 'Treadmill Easy 5K',
                    description: 'Indoor manual workout',
                    startDate: new Date('2026-10-09T08:00:00Z'),
                    distance: 5000,
                    movingTime: 1500,
                    elapsedTime: 1500,
                    averageHr: 140,
                    runningTss: 30,
                },
            ]);

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 20,
                    method: 'tools/call',
                    params: {
                        name: 'get_recent_activities',
                        arguments: { days: 14 },
                    },
                },
                { Authorization: 'Bearer rf_mcp_pro' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            const activities = data.result.structuredContent;

            expect(activities).toHaveLength(2);

            // Strava activity: name, description, rawJson, streams must be omitted
            const stravaAct = activities[0];
            expect(stravaAct.id).toBe('act-strava-1');
            expect(stravaAct.name).toBeUndefined();
            expect(stravaAct.description).toBeUndefined();
            expect(stravaAct.rawJson).toBeUndefined();
            expect(stravaAct.streams).toBeUndefined();
            expect(stravaAct.distance).toBe(10000);
            expect(stravaAct.runningTss).toBe(65);
            expect(stravaAct.stravaComplianceNotice).toContain('Activity title, description, and raw GPS/sensor streams are omitted');

            // Non-Strava manual activity: retains name and description
            const manualAct = activities[1];
            expect(manualAct.id).toBe('act-manual-2');
            expect(manualAct.name).toBe('Treadmill Easy 5K');
            expect(manualAct.description).toBe('Indoor manual workout');
            expect(manualAct.stravaComplianceNotice).toBeUndefined();
        });
    });

    describe('5. Mutation Tools, Snapshots & Safety Advisory Engine', () => {
        beforeEach(() => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-1',
                userId: 'user-paid-1',
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: null,
                user: {
                    id: 'user-paid-1',
                    isAdmin: true,
                    aiSettings: { usageTier: 'tier3' },
                },
            });
        });

        it('create_structured_workout creates snapshot and returns safetyAdvisory', async () => {
            mockDb.goal.findFirst.mockResolvedValue({
                id: 'goal-1',
                userId: 'user-paid-1',
                ftpAtCreation: 250,
                workouts: [],
            });

            mockDb.workout.create.mockResolvedValue({
                id: 'w-new-1',
                goalId: 'goal-1',
                scheduledDate: new Date('2026-11-01T07:00:00Z'),
                workoutType: 'INTERVALS',
                description: '5x1000m VO2max intervals',
                plannedTss: 75,
            });

            mockDb.goal.findUnique.mockResolvedValue({
                id: 'goal-1',
                userId: 'user-paid-1',
                workouts: [
                    {
                        scheduledDate: new Date('2026-11-01T07:00:00Z'),
                        workoutType: 'INTERVALS',
                        targetDistance: 8000,
                        plannedTss: 75,
                    },
                ],
            });

            mockDb.planSnapshot.create.mockResolvedValue({ id: 'snap-1' });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 30,
                    method: 'tools/call',
                    params: {
                        name: 'create_structured_workout',
                        arguments: {
                            goalId: 'goal-1',
                            scheduledDate: '2026-11-01',
                            workoutType: 'INTERVALS',
                            description: '5x1000m VO2max intervals',
                            targetDistance: 8000,
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_pro' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.structuredContent.success).toBe(true);
            expect(data.result.structuredContent.workout).toBeDefined();
            expect(data.result.structuredContent.safetyAdvisory).toBeDefined();
            expect(mockDb.planSnapshot.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        goalId: 'goal-1',
                        operation: 'ai_mcp_mutation',
                    }),
                })
            );
        });

        it('evaluates consecutive_hard_days in safety engine', async () => {
            mockDb.goal.findUnique.mockResolvedValue({
                id: 'goal-safety',
                userId: 'user-paid-1',
                workouts: [
                    {
                        scheduledDate: new Date('2026-11-05T08:00:00Z'),
                        workoutType: 'INTERVALS',
                        targetDistance: 10000,
                        plannedTss: 80,
                    },
                    {
                        scheduledDate: new Date('2026-11-06T08:00:00Z'),
                        workoutType: 'TEMPO',
                        targetDistance: 12000,
                        plannedTss: 85,
                    },
                ],
            });

            const advisories = await evaluatePlanSafety('goal-safety', mockDb);
            expect(advisories.some((a) => a.rule === 'consecutive_hard_days')).toBe(true);
            const hardDayAdv = advisories.find((a) => a.rule === 'consecutive_hard_days');
            expect(hardDayAdv?.level).toBe('critical');
            expect(hardDayAdv?.message).toContain('Consecutive hard workout days');
        });

        it('evaluates long_run_cap (>35% of weekly running distance) in safety engine', async () => {
            mockDb.goal.findUnique.mockResolvedValue({
                id: 'goal-safety-longrun',
                userId: 'user-paid-1',
                workouts: [
                    {
                        scheduledDate: new Date('2026-11-02T08:00:00Z'), // Monday
                        workoutType: 'EASY',
                        sport: 'RUN',
                        targetDistance: 5000,
                        plannedTss: 30,
                    },
                    {
                        scheduledDate: new Date('2026-11-08T08:00:00Z'), // Sunday
                        workoutType: 'LONG_RUN',
                        sport: 'RUN',
                        targetDistance: 25000, // 25km / 30km total = 83% > 35%
                        plannedTss: 160,
                    },
                ],
            });

            const advisories = await evaluatePlanSafety('goal-safety-longrun', mockDb);
            expect(advisories.some((a) => a.rule === 'long_run_cap')).toBe(true);
            const longRunAdv = advisories.find((a) => a.rule === 'long_run_cap');
            expect(longRunAdv?.level).toBe('warning');
            expect(longRunAdv?.message).toContain('exceeding the 35% recommended threshold');
        });

        it('recalibrate_thresholds updates profile and triggers recalculateWorkoutPaces', async () => {
            mockDb.user.update.mockResolvedValue({});
            mockDb.goal.findFirst.mockResolvedValue({
                id: 'goal-active',
                userId: 'user-paid-1',
                currentVdot: 48,
            });
            mockDb.workout.findMany.mockResolvedValue([]);
            mockDb.planSnapshot.create.mockResolvedValue({ id: 'snap-recal' });
            mockDb.goal.findUnique.mockResolvedValue({ id: 'goal-active', userId: 'user-paid-1', workouts: [] });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 35,
                    method: 'tools/call',
                    params: {
                        name: 'recalibrate_thresholds',
                        arguments: {
                            vdot: 52.5,
                            ftpWatts: 275,
                            thresholdHeartRate: 168,
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_pro' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.structuredContent.success).toBe(true);
            expect(mockDb.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        ftpWatts: 275,
                        thresholdHeartRate: 168,
                    }),
                })
            );
        });

        it('save_weekly_coaching_summary writes snapshot isolated with coaching_summary operation', async () => {
            mockDb.goal.findFirst.mockResolvedValue({ id: 'goal-active', userId: 'user-paid-1' });
            mockDb.planSnapshot.create.mockResolvedValue({ id: 'snap-coach-1' });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 36,
                    method: 'tools/call',
                    params: {
                        name: 'save_weekly_coaching_summary',
                        arguments: {
                            weekNumber: 4,
                            startDate: '2026-11-02',
                            summary: 'Great build week. Volume reached 65km with solid threshold execution.',
                            actionItems: ['Focus on recovery sleep', 'Hydrate well before Saturday long run'],
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_pro' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.structuredContent.operation).toBe('coaching_summary');
            expect(mockDb.planSnapshot.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        operation: 'coaching_summary',
                    }),
                })
            );
        });
    });
});
