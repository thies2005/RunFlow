/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { GET as getProtectedResource } from '@/app/.well-known/oauth-protected-resource/route';
import { GET as getAuthorizationServer } from '@/app/.well-known/oauth-authorization-server/route';
import { POST as registerClient } from '@/app/mcp/oauth/register/route';
import { GET as authorizeGet, POST as authorizePost } from '@/app/mcp/oauth/authorize/route';
import { POST as tokenPost } from '@/app/mcp/oauth/token/route';
import { GET as mcpGet, POST as mcpPost } from '@/app/mcp/route';
import { evaluatePlanSafety } from '@/lib/mcp/safety';
import { createConsentCsrfToken, isAllowedMcpRedirectUri, getPublicOrigin } from '@/lib/mcp/oauth';

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
            update: jest.fn(),
        },
        mcpOAuthCode: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        mcpOAuthToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
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
        process.env.NEXTAUTH_URL = 'https://runflow.schuelken.uk';
        process.env.NEXT_PUBLIC_APP_URL = 'https://runflow.schuelken.uk';
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

        it('rejects client registration with invalid redirect URIs', async () => {
            // Still invalid under the universal policy: dangerous schemes,
            // non-loopback http, and path traversal.
            const invalidUris = [
                'javascript:alert(1)',
                'http://example.com/cb',
                'https://claude.ai/../evil',
            ];

            for (const invalidUri of invalidUris) {
                const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                    client_name: 'Evil App',
                    redirect_uris: [invalidUri],
                });

                const res = await registerClient(req);
                expect(res.status).toBe(400);
                const data = await res.json();
                expect(data.error).toBe('invalid_redirect_uri');
            }
        });

        it('ignores client_id in register body and enforces server-generated cuid() (RF-001)', async () => {
            mockDb.mcpOAuthClient.create.mockResolvedValue({
                id: 'client-db-2',
                clientId: 'server-generated-cuid',
                clientName: 'Spoofer Client',
                redirectUris: ['https://legit.app/callback'],
                grantTypes: ['authorization_code', 'refresh_token'],
                responseTypes: ['code'],
                tokenEndpointAuthMethod: 'none',
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                client_id: 'attacker-chosen-client-id',
                client_name: 'Spoofer Client',
                redirect_uris: ['https://legit.app/callback'],
            });

            const res = await registerClient(req);
            expect(res.status).toBe(201);
            expect(mockDb.mcpOAuthClient.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.not.objectContaining({
                        clientId: 'attacker-chosen-client-id',
                    }),
                })
            );
        });

        it('rejects client registration when redirect_uris is empty or omitted (RF-001)', async () => {
            const reqEmpty = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                client_name: 'No Redirects Client',
                redirect_uris: [],
            });
            const resEmpty = await registerClient(reqEmpty);
            expect(resEmpty.status).toBe(400);
            const dataEmpty = await resEmpty.json();
            expect(dataEmpty.error).toBe('invalid_redirect_uri');

            const reqOmitted = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                client_name: 'No Redirects Client',
            });
            const resOmitted = await registerClient(reqOmitted);
            expect(resOmitted.status).toBe(400);
            const dataOmitted = await resOmitted.json();
            expect(dataOmitted.error).toBe('invalid_redirect_uri');
        });

        it('accepts lookalike https redirect URIs under the universal policy', async () => {
            // Task 1.1 (universal https): any https host containing a dot is a
            // valid callback — lookalike hosts are accepted by design so arbitrary
            // remote MCP clients can register their own endpoints.
            mockDb.mcpOAuthClient.create.mockResolvedValue({
                id: 'client-db-2',
                clientId: 'cuid-universal-client',
                clientName: 'Universal Client',
                redirectUris: ['https://attacker.evil.com/callback'],
                grantTypes: ['authorization_code', 'refresh_token'],
                responseTypes: ['code'],
                tokenEndpointAuthMethod: 'none',
            });

            const lookalikeUris = [
                'https://attacker.evil.com/callback',
                'https://claude.ai.evil.com/cb',
                'https://google.com.attacker.com',
            ];

            for (const lookalikeUri of lookalikeUris) {
                const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/register', 'POST', {
                    client_name: 'Universal Client',
                    redirect_uris: [lookalikeUri],
                });

                const res = await registerClient(req);
                expect(res.status).toBe(201);
            }
        });

        it('applies the universal https policy via isAllowedMcpRedirectUri', () => {
            // Must allow:
            expect(isAllowedMcpRedirectUri('https://vertexaisearch.cloud.google.com/oauth/callback')).toBe(true);
            expect(isAllowedMcpRedirectUri('https://oauth-redirect.googleusercontent.com/r/project')).toBe(true);
            expect(isAllowedMcpRedirectUri('https://gemini.google.com/oauth')).toBe(true);
            expect(isAllowedMcpRedirectUri('cursor://anyscheme/callback')).toBe(true);
            expect(isAllowedMcpRedirectUri('vscode://vscode.github-authentication/did-authenticate')).toBe(true);
            expect(isAllowedMcpRedirectUri('http://127.0.0.1:8080/callback')).toBe(true);
            expect(isAllowedMcpRedirectUri('http://localhost:3000/callback')).toBe(true);

            // Universal https policy: any https host containing a dot is a valid
            // callback, including lookalike hosts (accepted by design — Task 1.1).
            expect(isAllowedMcpRedirectUri('https://claude.ai.evil.com/cb')).toBe(true);
            expect(isAllowedMcpRedirectUri('https://google.com.attacker.com')).toBe(true);

            // Must reject:
            expect(isAllowedMcpRedirectUri('http://example.com/cb')).toBe(false);
            expect(isAllowedMcpRedirectUri('javascript:alert(1)')).toBe(false);
            expect(isAllowedMcpRedirectUri('https://claude.ai/../evil')).toBe(false);
            expect(isAllowedMcpRedirectUri('https://claude.ai/%2e%2e/evil')).toBe(false);

            // Universal https policy (Task 1.1): the only https gate is "hostname
            // contains a dot", so dotted-quad IPv4 hosts (incl. private ranges)
            // are accepted by design.
            expect(isAllowedMcpRedirectUri('https://10.0.0.1/cb')).toBe(true);
            expect(isAllowedMcpRedirectUri('https://192.168.1.1/cb')).toBe(true);
        });

        it('resolves public origin properly via getPublicOrigin with reverse-proxy headers when env unset', () => {
            const origNextAuth = process.env.NEXTAUTH_URL;
            const origAppUrl = process.env.NEXT_PUBLIC_APP_URL;
            delete process.env.NEXTAUTH_URL;
            delete process.env.NEXT_PUBLIC_APP_URL;

            try {
                const reqForwarded = new Request('http://0.0.0.0:3000/mcp/oauth/authorize', {
                    headers: {
                        'x-forwarded-proto': 'https',
                        'x-forwarded-host': 'runflow.schuelken.uk',
                    },
                });
                expect(getPublicOrigin(reqForwarded)).toBe('https://runflow.schuelken.uk');

                const reqHost = new Request('http://localhost:3000/mcp/oauth/authorize', {
                    headers: {
                        host: 'runflow.schuelken.uk',
                    },
                });
                expect(getPublicOrigin(reqHost)).toBe('https://runflow.schuelken.uk');
            } finally {
                process.env.NEXTAUTH_URL = origNextAuth;
                process.env.NEXT_PUBLIC_APP_URL = origAppUrl;
            }
        });

        it('enforces canonical origin precedence over spoofed host headers (RF-007)', () => {
            process.env.NEXTAUTH_URL = 'https://runflow.schuelken.uk';
            const reqSpoofed = new Request('http://0.0.0.0:3000/mcp/oauth/authorize', {
                headers: {
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'evil-attacker.com',
                    host: 'evil-attacker.com',
                },
            });
            expect(getPublicOrigin(reqSpoofed)).toBe('https://runflow.schuelken.uk');
        });

        it('rejects GET /mcp/oauth/authorize with HTTP 400 invalid_client if client does not exist (RF-001)', async () => {
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue(null);

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp/oauth/authorize?client_id=auto-gemini-client&redirect_uri=https://oauth-redirect.googleusercontent.com/r/project&client_name=Google%20Gemini',
                'GET',
                undefined,
                {
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'runflow.schuelken.uk',
                }
            );

            const res = await authorizeGet(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_client');
            expect(mockDb.mcpOAuthClient.create).not.toHaveBeenCalled();
        });

        it('rejects GET /mcp/oauth/authorize with HTTP 400 invalid_redirect_uri if redirect_uri is not registered (RF-001)', async () => {
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'gemini-client-1',
                clientName: 'Google Gemini',
                redirectUris: ['https://gemini.google.com/oauth'],
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp/oauth/authorize?client_id=gemini-client-1&redirect_uri=https://oauth-redirect.googleusercontent.com/r/project',
                'GET',
                undefined,
                {
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'runflow.schuelken.uk',
                }
            );

            const res = await authorizeGet(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_redirect_uri');
            expect(mockDb.mcpOAuthClient.update).not.toHaveBeenCalled();
        });

        it('redirects to /mcp/authorize on GET when client exists and redirect_uri is registered (RF-001)', async () => {
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'claude-client-1',
                clientName: 'Claude',
                redirectUris: ['https://claude.ai/callback'],
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp/oauth/authorize?client_id=claude-client-1&redirect_uri=https://claude.ai/callback',
                'GET'
            );

            const res = await authorizeGet(req);
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('https://runflow.schuelken.uk/mcp/authorize');
            expect(mockDb.mcpOAuthClient.update).not.toHaveBeenCalled();
        });

        it('rejects GET /mcp/oauth/authorize when redirect_uri fails the universal validator', async () => {
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'claude-client-1',
                clientName: 'Claude',
                redirectUris: ['https://claude.ai/callback'],
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp/oauth/authorize?client_id=claude-client-1&redirect_uri=http://example.com/cb',
                'GET'
            );

            const res = await authorizeGet(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_redirect_uri');
        });

        it('validates Origin header on POST /mcp/oauth/authorize allowing reverse-proxy public origin', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier2' },
            });

            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'cuid-claude-client',
                redirectUris: ['https://claude.ai/api/mcp/callback'],
            });

            // Rejected untrusted origin
            const reqBadOrigin = makeRequest(
                'http://0.0.0.0:3000/mcp/oauth/authorize',
                'POST',
                {
                    client_id: 'cuid-claude-client',
                    redirect_uri: 'https://claude.ai/api/mcp/callback',
                    code_challenge: 'test-challenge',
                },
                {
                    origin: 'https://evil-cross-origin.com',
                }
            );
            const resBadOrigin = await authorizePost(reqBadOrigin);
            expect(resBadOrigin.status).toBe(403);

            // Allowed public origin via x-forwarded headers
            const consentCsrfToken = createConsentCsrfToken({
                userId: 'user-paid-1',
                clientId: 'cuid-claude-client',
                redirectUri: 'https://claude.ai/api/mcp/callback',
                codeChallenge: 'abc-challenge-123',
                state: 'random-state-1',
            });
            mockDb.mcpOAuthCode.create.mockResolvedValue({ id: 'code-1' });

            const reqGoodOrigin = makeRequest(
                'http://0.0.0.0:3000/mcp/oauth/authorize',
                'POST',
                {
                    client_id: 'cuid-claude-client',
                    redirect_uri: 'https://claude.ai/api/mcp/callback',
                    code_challenge: 'abc-challenge-123',
                    state: 'random-state-1',
                    consentCsrfToken,
                },
                {
                    origin: 'https://runflow.schuelken.uk',
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'runflow.schuelken.uk',
                }
            );
            const resGoodOrigin = await authorizePost(reqGoodOrigin);
            expect(resGoodOrigin.status).toBe(200);
        });

        it('rejects POST /mcp/oauth/authorize with HTTP 400 invalid_client if client does not exist (RF-001)', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier2' },
            });
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue(null);

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'non-existent-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'test-challenge',
            });

            const res = await authorizePost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_client');
        });

        it('rejects POST /mcp/oauth/authorize with HTTP 400 invalid_redirect_uri if redirect_uri is not registered (RF-001)', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier2' },
            });
            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'cuid-claude-client',
                redirectUris: ['https://claude.ai/api/mcp/callback'],
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://evil.com/callback',
                code_challenge: 'test-challenge',
            });

            const res = await authorizePost(req);
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

        it('rejects authorization POST when consentCsrfToken is missing or invalid (HTTP 403)', async () => {
            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: false,
                aiSettings: { usageTier: 'tier2' },
            });

            mockDb.mcpOAuthClient.findUnique.mockResolvedValue({
                clientId: 'cuid-claude-client',
                redirectUris: ['https://claude.ai/api/mcp/callback'],
            });

            // Missing token
            const reqMissing = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'abc-challenge-123',
                state: 'random-state-1',
            });
            const resMissing = await authorizePost(reqMissing);
            expect(resMissing.status).toBe(403);
            const dataMissing = await resMissing.json();
            expect(dataMissing.error_description).toContain('consent CSRF token');

            // Forged/invalid token
            const reqForged = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'abc-challenge-123',
                state: 'random-state-1',
                consentCsrfToken: `${Date.now() + 60000}.bad-signature-deadbeef`,
            });
            const resForged = await authorizePost(reqForged);
            expect(resForged.status).toBe(403);
        });

        it('issues authorization code for Paid Premium user with valid consentCsrfToken', async () => {
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

            const consentCsrfToken = createConsentCsrfToken({
                userId: 'user-paid-1',
                clientId: 'cuid-claude-client',
                redirectUri: 'https://claude.ai/api/mcp/callback',
                codeChallenge: 'abc-challenge-123',
                state: 'random-state-1',
            });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/authorize', 'POST', {
                client_id: 'cuid-claude-client',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_challenge: 'abc-challenge-123',
                state: 'random-state-1',
                consentCsrfToken,
            });

            const res = await authorizePost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.redirect_uri).toContain('https://claude.ai/api/mcp/callback?code=rf_code_');
            expect(data.redirect_uri).toContain('state=random-state-1');
            expect(mockDb.mcpOAuthCode.create).toHaveBeenCalledTimes(1);
        });

        it('exchanges code for tokens using PKCE S256 verification and atomic single-use claim', async () => {
            const codeVerifier = 'high-entropy-pkce-verifier-string-1234567890';
            const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

            mockDb.mcpOAuthCode.updateMany.mockResolvedValue({ count: 1 });
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
            expect(mockDb.mcpOAuthCode.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) })
            );
        });

        it('rejects replayed authorization_code on token POST when updateMany returns count 0', async () => {
            mockDb.mcpOAuthCode.updateMany.mockResolvedValue({ count: 0 });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/token', 'POST', {
                grant_type: 'authorization_code',
                client_id: 'cuid-claude-client',
                code: 'rf_code_replayed',
                redirect_uri: 'https://claude.ai/api/mcp/callback',
                code_verifier: 'high-entropy-pkce-verifier-string-1234567890',
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_grant');
            expect(data.error_description).toContain('already used');
            expect(mockDb.mcpOAuthToken.create).not.toHaveBeenCalled();
        });

        it('rejects token exchange when PKCE verifier is invalid', async () => {
            mockDb.mcpOAuthCode.updateMany.mockResolvedValue({ count: 1 });
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
                code_verifier: 'wrong-verifier-1234567890123456789012345678901234567890',
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_grant');
        });

        it('exchanges refresh_token for new token pair and atomically revokes old token', async () => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-old-1',
                clientId: 'cuid-claude-client',
                userId: 'user-paid-1',
                scope: 'mcp:full',
                revokedAt: null,
                refreshExpiresAt: new Date(Date.now() + 86400000),
                user: { id: 'user-paid-1', isAdmin: false, aiSettings: { usageTier: 'tier3' } },
            });
            mockDb.mcpOAuthToken.updateMany.mockResolvedValue({ count: 1 });
            mockDb.mcpOAuthToken.create.mockResolvedValue({ id: 'tok-new-1' });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/token', 'POST', {
                grant_type: 'refresh_token',
                client_id: 'cuid-claude-client',
                refresh_token: 'rf_mcpr_oldtoken123456789012345678901234567890',
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.access_token).toMatch(/^rf_mcp_/);
            expect(data.refresh_token).toMatch(/^rf_mcpr_/);
            expect(mockDb.mcpOAuthToken.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'tok-old-1', revokedAt: null },
                    data: expect.objectContaining({ revokedAt: expect.any(Date) }),
                })
            );
        });

        it('rejects replayed refresh_token when atomic revocation returns count 0', async () => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-old-2',
                clientId: 'cuid-claude-client',
                userId: 'user-paid-1',
                scope: 'mcp:full',
                revokedAt: null,
                refreshExpiresAt: new Date(Date.now() + 86400000),
                user: { id: 'user-paid-1', isAdmin: false, aiSettings: { usageTier: 'tier3' } },
            });
            mockDb.mcpOAuthToken.updateMany.mockResolvedValue({ count: 0 });

            const req = makeRequest('https://runflow.schuelken.uk/mcp/oauth/token', 'POST', {
                grant_type: 'refresh_token',
                client_id: 'cuid-claude-client',
                refresh_token: 'rf_mcpr_replayed123456789012345678901234567890',
            });

            const res = await tokenPost(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('invalid_grant');
            expect(data.error_description).toContain('already used or revoked');
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

        it('rejects external API keys (rf_*) on write tools with HTTP 403 and JSON-RPC -32003 (RF-002)', async () => {
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

            const writeTools = [
                'log_workout_completion',
                'modify_workout',
                'create_training_plan',
                'delete_workout',
                'recalibrate_thresholds',
                'save_coaching_summary',
            ];

            for (const toolName of writeTools) {
                const req = makeRequest(
                    'https://runflow.schuelken.uk/mcp',
                    'POST',
                    {
                        jsonrpc: '2.0',
                        id: 99,
                        method: 'tools/call',
                        params: {
                            name: toolName,
                            arguments: {},
                        },
                    },
                    { Authorization: 'Bearer rf_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
                );

                const res = await mcpPost(req);
                expect(res.status).toBe(403);
                const data = await res.json();
                expect(data.error.code).toBe(-32003);
                expect(data.error.message).toBe('External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools');
            }
        });

        it('permits read-only tools via external API keys (rf_*) (RF-002)', async () => {
            mockDb.apiKey.findFirst.mockResolvedValue({
                id: 'key-1',
                userId: 'user-paid-1',
                expiresAt: new Date(Date.now() + 86400000),
                user: { id: 'user-paid-1', name: 'Pro Athlete', email: 'pro@test.com' },
            });

            mockDb.user.findUnique.mockResolvedValue({
                id: 'user-paid-1',
                isAdmin: true,
                vdot: 52,
                trainingPaces: {},
                aiSettings: { usageTier: 'tier3', aiEnabled: true },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 100,
                    method: 'tools/call',
                    params: {
                        name: 'get_athlete_profile',
                        arguments: {},
                    },
                },
                { Authorization: 'Bearer rf_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result).toBeDefined();
            expect(data.error).toBeUndefined();
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

    describe('6. Security & Tenant Isolation on Mutation Tools', () => {
        beforeEach(() => {
            mockDb.mcpOAuthToken.findUnique.mockResolvedValue({
                id: 'tok-attacker-1',
                userId: 'user-attacker',
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: null,
                user: {
                    id: 'user-attacker',
                    isAdmin: false,
                    aiSettings: { usageTier: 'tier3' },
                },
            });
        });

        it('rejects modify_workout when workout belongs to another user (victim)', async () => {
            mockDb.workout.findUnique.mockResolvedValue({
                id: 'w-victim-1',
                goalId: 'goal-victim',
                goal: { userId: 'victim-user-id', ftpAtCreation: 250 },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 101,
                    method: 'tools/call',
                    params: {
                        name: 'modify_workout',
                        arguments: {
                            workoutId: 'w-victim-1',
                            description: 'Malicious modification',
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_attacker' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.isError).toBe(true);
            expect(data.result.content[0].text).toContain('Workout not found or access denied');
            expect(mockDb.workout.update).not.toHaveBeenCalled();
        });

        it('rejects swap_workouts when either workout belongs to another user', async () => {
            mockDb.workout.findUnique
                .mockResolvedValueOnce({
                    id: 'w-attacker-1',
                    goalId: 'goal-attacker',
                    goal: { userId: 'user-attacker' },
                })
                .mockResolvedValueOnce({
                    id: 'w-victim-2',
                    goalId: 'goal-victim',
                    goal: { userId: 'victim-user-id' },
                });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 102,
                    method: 'tools/call',
                    params: {
                        name: 'swap_workouts',
                        arguments: {
                            workoutIdA: 'w-attacker-1',
                            workoutIdB: 'w-victim-2',
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_attacker' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.isError).toBe(true);
            expect(data.result.content[0].text).toContain('Workouts not found or access denied');
            expect(mockDb.$transaction).not.toHaveBeenCalled();
        });

        it('rejects delete_workout when workout belongs to another user', async () => {
            mockDb.workout.findUnique.mockResolvedValue({
                id: 'w-victim-1',
                goalId: 'goal-victim',
                goal: { userId: 'victim-user-id' },
            });

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 103,
                    method: 'tools/call',
                    params: {
                        name: 'delete_workout',
                        arguments: {
                            workoutId: 'w-victim-1',
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_attacker' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.isError).toBe(true);
            expect(data.result.content[0].text).toContain('Workout not found or access denied');
            expect(mockDb.workout.delete).not.toHaveBeenCalled();
        });

        it('rejects mark_workout_status when linkedActivityId belongs to another user', async () => {
            mockDb.workout.findUnique.mockResolvedValue({
                id: 'w-attacker-1',
                goalId: 'goal-attacker',
                goal: { userId: 'user-attacker' },
            });
            mockDb.activity.findFirst.mockResolvedValue(null); // Activity not found for user-attacker

            const req = makeRequest(
                'https://runflow.schuelken.uk/mcp',
                'POST',
                {
                    jsonrpc: '2.0',
                    id: 104,
                    method: 'tools/call',
                    params: {
                        name: 'mark_workout_status',
                        arguments: {
                            workoutId: 'w-attacker-1',
                            isCompleted: true,
                            linkedActivityId: 'act-victim-secret',
                        },
                    },
                },
                { Authorization: 'Bearer rf_mcp_attacker' }
            );

            const res = await mcpPost(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.result.isError).toBe(true);
            expect(data.result.content[0].text).toContain('Linked activity not found or access denied');
            expect(mockDb.workout.update).not.toHaveBeenCalled();
        });
    });
});
