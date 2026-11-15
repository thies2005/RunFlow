/**
 * @jest-environment node
 */

jest.mock('@/lib/net/dnsResolve', () => ({
    resolveHostAddresses: jest.fn().mockResolvedValue(['93.184.216.34']),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('../routing', () => {
    const actual = jest.requireActual('../routing');
    return {
        ...actual,
        resolveCandidateTargets: jest.fn(),
    };
});

import { resolveHostAddresses } from '@/lib/net/dnsResolve';
import {
    AiProviderError,
    parseUpstreamProviderError,
    sanitizeErrorMessage,
    toSafeUserError,
} from '../errors';
import {
    executeCompletionWithFallback,
    executeStreamWithFallback,
    executeVisionWithFallback,
} from '../executor';
import { CandidateTarget, resolveCandidateTargets } from '../routing';

const mockResolveTargets = resolveCandidateTargets as jest.MockedFunction<typeof resolveCandidateTargets>;
const mockResolveHost = resolveHostAddresses as jest.MockedFunction<typeof resolveHostAddresses>;

function makeTarget(overrides: Partial<CandidateTarget> = {}): CandidateTarget {
    return {
        provider: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'AIzaTestKeyPrimary12345',
        apiKeys: ['AIzaTestKeyPrimary12345'],
        model: 'gemini-2.5-flash',
        providerId: 'prov-1',
        providerSlug: 'google-free',
        providerName: 'Google Free',
        allowedUrls: ['https://generativelanguage.googleapis.com'],
        ...overrides,
    };
}

function mockJsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    return {
        ok: status >= 200 && status < 300,
        status,
        url: '',
        headers: new Headers(headers),
        json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
        text: async () => raw,
        body: null,
    };
}

function mockSseResponse(chunks: string[], errorAfterChunks?: Error) {
    const encoder = new TextEncoder();
    let index = 0;
    return {
        ok: true,
        status: 200,
        url: '',
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        text: async () => chunks.join(''),
        body: {
            getReader() {
                return {
                    async read() {
                        if (index < chunks.length) {
                            const value = encoder.encode(chunks[index++]);
                            return { done: false, value };
                        }
                        if (errorAfterChunks) {
                            throw errorAfterChunks;
                        }
                        return { done: true, value: undefined };
                    },
                    releaseLock() {},
                    cancel: async () => {},
                };
            },
            cancel: async () => {},
        },
    };
}

describe('AI Executor & Provider Failover (executor.ts)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveHost.mockResolvedValue(['93.184.216.34']);
        global.fetch = jest.fn();
    });

    describe('executeCompletionWithFallback', () => {
        it('supports same-provider model downgrade (paid:gemini-2.5-pro -> paid:gemini-2.5-flash)', async () => {
            const proTarget = makeTarget({
                providerId: 'prov-paid',
                providerSlug: 'google-paid',
                model: 'gemini-2.5-pro',
                apiKey: 'AIzaPaidKey12345678',
                apiKeys: ['AIzaPaidKey12345678'],
            });
            const flashTarget = makeTarget({
                providerId: 'prov-paid',
                providerSlug: 'google-paid',
                model: 'gemini-2.5-flash',
                apiKey: 'AIzaPaidKey12345678',
                apiKeys: ['AIzaPaidKey12345678'],
            });

            mockResolveTargets.mockResolvedValue({
                candidates: [proTarget, flashTarget],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(
                    mockJsonResponse(429, { error: { message: 'Quota exceeded for pro model', status: 'RESOURCE_EXHAUSTED' } })
                )
                .mockResolvedValueOnce(
                    mockJsonResponse(200, {
                        candidates: [{ content: { parts: [{ text: 'Downgraded flash response' }] } }],
                    })
                );

            const res = await executeCompletionWithFallback('user-1', 'planBuilder', [
                { role: 'user', content: 'Build a 10k plan' },
            ]);

            expect(res.text).toBe('Downgraded flash response');
            expect(res.attempts).toBe(2);
            expect(res.targetUsed.model).toBe('gemini-2.5-flash');
            expect(res.targetUsed.providerId).toBe('prov-paid');
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('gemini-2.5-pro');
            expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('gemini-2.5-flash');
        });

        it('supports cross-provider failover (paid:google -> free:google -> openrouter)', async () => {
            const paidGoogle = makeTarget({
                providerId: 'prov-paid',
                providerSlug: 'google-paid',
                model: 'gemini-2.5-pro',
            });
            const freeGoogle = makeTarget({
                providerId: 'prov-free',
                providerSlug: 'google-free',
                model: 'gemini-2.5-flash',
            });
            const openRouter = makeTarget({
                provider: 'openai',
                providerId: 'prov-or',
                providerSlug: 'openrouter',
                baseUrl: 'https://openrouter.ai/api/v1',
                apiKey: 'sk-or-v1-test12345678',
                apiKeys: ['sk-or-v1-test12345678'],
                model: 'openai/gpt-4o-mini',
                allowedUrls: ['https://openrouter.ai/api/v1'],
            });

            mockResolveTargets.mockResolvedValue({
                candidates: [paidGoogle, freeGoogle, openRouter],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mockJsonResponse(503, { error: { message: 'Overloaded' } }))
                .mockResolvedValueOnce(mockJsonResponse(429, { error: { message: 'Rate limited' } }))
                .mockResolvedValueOnce(
                    mockJsonResponse(200, {
                        choices: [{ message: { content: 'OpenRouter rescue' } }],
                    })
                );

            const res = await executeCompletionWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hello' },
            ]);

            expect(res.text).toBe('OpenRouter rescue');
            expect(res.attempts).toBe(3);
            expect(res.targetUsed.providerSlug).toBe('openrouter');
        });

        it.each([429, 401, 403, 503])(
            'rotates through all API keys on HTTP %i before failing over to next target',
            async (status) => {
                const target1 = makeTarget({
                    provider: 'openai',
                    providerId: 'prov-openai',
                    providerSlug: 'openai-multi',
                    baseUrl: 'https://api.openai.com/v1',
                    apiKey: 'sk-key-1-12345678',
                    apiKeys: ['sk-key-1-12345678', 'sk-key-2-12345678', 'sk-key-3-12345678'],
                    model: 'gpt-4o-mini',
                    allowedUrls: ['https://api.openai.com/v1'],
                });
                const target2 = makeTarget({
                    provider: 'openai',
                    providerId: 'prov-or',
                    providerSlug: 'openrouter',
                    baseUrl: 'https://openrouter.ai/api/v1',
                    apiKey: 'sk-or-v1-backup12345',
                    apiKeys: ['sk-or-v1-backup12345'],
                    model: 'openai/gpt-4o-mini',
                    allowedUrls: ['https://openrouter.ai/api/v1'],
                });

                mockResolveTargets.mockResolvedValue({
                    candidates: [target1, target2],
                    userSettings: {} as never,
                    globalSettings: null,
                });

                (global.fetch as jest.Mock)
                    .mockResolvedValueOnce(mockJsonResponse(status, { error: { message: `Fail key 1 (${status})` } }))
                    .mockResolvedValueOnce(mockJsonResponse(status, { error: { message: `Fail key 2 (${status})` } }))
                    .mockResolvedValueOnce(mockJsonResponse(status, { error: { message: `Fail key 3 (${status})` } }))
                    .mockResolvedValueOnce(
                        mockJsonResponse(200, {
                            choices: [{ message: { content: 'Success on target 2' } }],
                        })
                    );

                const res = await executeCompletionWithFallback('user-1', 'chat', [
                    { role: 'user', content: 'Hi' },
                ]);

                expect(res.text).toBe('Success on target 2');
                expect(res.attempts).toBe(2);
                expect(global.fetch).toHaveBeenCalledTimes(4);

                const calls = (global.fetch as jest.Mock).mock.calls;
                expect(calls[0][1].headers.Authorization).toBe('Bearer sk-key-1-12345678');
                expect(calls[1][1].headers.Authorization).toBe('Bearer sk-key-2-12345678');
                expect(calls[2][1].headers.Authorization).toBe('Bearer sk-key-3-12345678');
                expect(calls[3][1].headers.Authorization).toBe('Bearer sk-or-v1-backup12345');
            }
        );

        it('rotates key and succeeds on second key of first target without falling back', async () => {
            const target1 = makeTarget({
                provider: 'anthropic',
                providerId: 'prov-anth',
                providerSlug: 'anthropic',
                baseUrl: 'https://api.anthropic.com',
                apiKey: 'sk-ant-key1-123456',
                apiKeys: ['sk-ant-key1-123456', 'sk-ant-key2-123456'],
                model: 'claude-3-5-sonnet-latest',
                allowedUrls: ['https://api.anthropic.com'],
            });
            const target2 = makeTarget({ providerId: 'prov-2', providerSlug: 'backup' });

            mockResolveTargets.mockResolvedValue({
                candidates: [target1, target2],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mockJsonResponse(429, { error: { type: 'rate_limit_error', message: 'Rate limit' } }))
                .mockResolvedValueOnce(
                    mockJsonResponse(200, {
                        content: [{ type: 'text', text: 'Anthropic key 2 worked' }],
                    })
                );

            const res = await executeCompletionWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hi' },
            ]);

            expect(res.text).toBe('Anthropic key 2 worked');
            expect(res.attempts).toBe(1);
            expect(res.targetUsed.providerId).toBe('prov-anth');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('executeStreamWithFallback', () => {
        const target1 = makeTarget({
            provider: 'openai',
            providerId: 'prov-1',
            providerSlug: 'openai-primary',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-stream-1-12345678',
            apiKeys: ['sk-stream-1-12345678'],
            model: 'gpt-4o-mini',
            allowedUrls: ['https://api.openai.com/v1'],
        });
        const target2 = makeTarget({
            provider: 'openai',
            providerId: 'prov-2',
            providerSlug: 'openrouter-backup',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: 'sk-or-v1-stream2-12345',
            apiKeys: ['sk-or-v1-stream2-12345'],
            model: 'openai/gpt-4o-mini',
            allowedUrls: ['https://openrouter.ai/api/v1'],
        });

        async function collectStream(stream: AsyncGenerator<string>): Promise<string> {
            let out = '';
            for await (const chunk of stream) {
                out += chunk;
            }
            return out;
        }

        it('fails over on pre-first-token upstream error', async () => {
            mockResolveTargets.mockResolvedValue({
                candidates: [target1, target2],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mockJsonResponse(503, { error: { message: 'Service unavailable' } }))
                .mockResolvedValueOnce(
                    mockSseResponse([
                        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
                        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
                        'data: [DONE]\n\n',
                    ])
                );

            const res = await executeStreamWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hi' },
            ]);

            expect(res.attempts).toBe(2);
            expect(res.targetUsed.providerId).toBe('prov-2');
            await expect(collectStream(res.stream)).resolves.toBe('Hello world');
        });

        it('fails over on 0-token stream', async () => {
            mockResolveTargets.mockResolvedValue({
                candidates: [target1, target2],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mockSseResponse(['data: [DONE]\n\n']))
                .mockResolvedValueOnce(
                    mockSseResponse([
                        'data: {"choices":[{"delta":{"content":"Recovered"}}]}\n\n',
                        'data: [DONE]\n\n',
                    ])
                );

            const res = await executeStreamWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hi' },
            ]);

            expect(res.attempts).toBe(2);
            expect(res.targetUsed.providerId).toBe('prov-2');
            await expect(collectStream(res.stream)).resolves.toBe('Recovered');
        });

        it('fails over on whitespace-only stream', async () => {
            mockResolveTargets.mockResolvedValue({
                candidates: [target1, target2],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(
                    mockSseResponse([
                        'data: {"choices":[{"delta":{"content":"   "}}]}\n\n',
                        'data: {"choices":[{"delta":{"content":"\\n\\t"}}]}\n\n',
                        'data: [DONE]\n\n',
                    ])
                )
                .mockResolvedValueOnce(
                    mockSseResponse([
                        'data: {"choices":[{"delta":{"content":"Non-empty"}}]}\n\n',
                        'data: [DONE]\n\n',
                    ])
                );

            const res = await executeStreamWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hi' },
            ]);

            expect(res.attempts).toBe(2);
            expect(res.targetUsed.providerId).toBe('prov-2');
            await expect(collectStream(res.stream)).resolves.toBe('Non-empty');
        });

        it('does NOT fail over on mid-stream error after a real token and propagates sanitized error', async () => {
            mockResolveTargets.mockResolvedValue({
                candidates: [target1, target2],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock).mockResolvedValueOnce(
                mockSseResponse(
                    ['data: {"choices":[{"delta":{"content":"First token"}}]}\n\n'],
                    new Error('Connection reset with Bearer sk-secret-token-12345678')
                )
            );

            const res = await executeStreamWithFallback('user-1', 'chat', [
                { role: 'user', content: 'Hi' },
            ]);

            expect(res.attempts).toBe(1);
            expect(res.targetUsed.providerId).toBe('prov-1');

            const received: string[] = [];
            let caught: unknown;
            try {
                for await (const chunk of res.stream) {
                    received.push(chunk);
                }
            } catch (err) {
                caught = err;
            }

            expect(received).toEqual(['First token']);
            expect(caught).toBeInstanceOf(AiProviderError);
            const aiErr = caught as AiProviderError;
            expect(aiErr.message).not.toContain('sk-secret-token-12345678');
            expect(aiErr.userMessage).not.toContain('sk-secret-token-12345678');
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('executeVisionWithFallback', () => {
        it('falls back across Google, Anthropic, and OpenAI targets', async () => {
            const googleTarget = makeTarget({
                provider: 'google',
                providerId: 'prov-g',
                providerSlug: 'google',
                baseUrl: 'https://generativelanguage.googleapis.com',
                model: 'gemini-2.5-flash',
                allowedUrls: ['https://generativelanguage.googleapis.com'],
            });
            const anthropicTarget = makeTarget({
                provider: 'anthropic',
                providerId: 'prov-a',
                providerSlug: 'anthropic',
                baseUrl: 'https://api.anthropic.com',
                apiKey: 'sk-ant-test12345678',
                apiKeys: ['sk-ant-test12345678'],
                model: 'claude-3-5-sonnet-latest',
                allowedUrls: ['https://api.anthropic.com'],
            });
            const openaiTarget = makeTarget({
                provider: 'openai',
                providerId: 'prov-o',
                providerSlug: 'openai',
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'sk-openai-test12345678',
                apiKeys: ['sk-openai-test12345678'],
                model: 'gpt-4o-mini',
                allowedUrls: ['https://api.openai.com/v1'],
            });

            mockResolveTargets.mockResolvedValue({
                candidates: [googleTarget, anthropicTarget, openaiTarget],
                userSettings: {} as never,
                globalSettings: null,
            });

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mockJsonResponse(503, { error: { message: 'Google unavailable' } }))
                .mockResolvedValueOnce(mockJsonResponse(429, { error: { type: 'rate_limit_error', message: 'Anthropic rate limit' } }))
                .mockResolvedValueOnce(
                    mockJsonResponse(200, {
                        choices: [{ message: { content: '{"calories": 550}' } }],
                    })
                );

            const res = await executeVisionWithFallback(
                'user-1',
                'calorieSnap',
                'Estimate calories',
                { mimeType: 'image/jpeg', base64Data: 'ZmFrZS1pbWFnZQ==' }
            );

            expect(res.text).toBe('{"calories": 550}');
            expect(res.attempts).toBe(3);
            expect(res.targetUsed.provider).toBe('openai');
        });
    });

    describe('parseUpstreamProviderError & toSafeUserError secret redaction', () => {
        const secrets = [
            'AIzaSySecretGoogleKey123456',
            'sk-proj-SecretOpenAiKey12345678',
            'sk-ant-SecretAnthropicKey12345',
            'BearerSuperSecretToken123',
        ];

        it('redacts ?key=, &api_key=, x-api-key, Bearer, sk-, and AIza in parseUpstreamProviderError and sanitizeErrorMessage', () => {
            const rawPayload = JSON.stringify({
                error: {
                    message:
                        'Request failed at https://generativelanguage.googleapis.com/v1beta?key=AIzaSySecretGoogleKey123456&api_key=sk-proj-SecretOpenAiKey12345678 with header x-api-key: sk-ant-SecretAnthropicKey12345 and Authorization: Bearer BearerSuperSecretToken123',
                },
            });

            const parsed = parseUpstreamProviderError('google', 500, rawPayload, undefined, {
                providerId: 'prov-1',
                providerSlug: 'google-paid',
                model: 'gemini-2.5-flash',
            });

            for (const secret of secrets) {
                expect(parsed.message).not.toContain(secret);
                expect(parsed.userMessage).not.toContain(secret);
            }

            const sanitized = sanitizeErrorMessage(
                'Error: Fetch failed for https://example.com?key=AIzaSySecretGoogleKey123456&api_key=sk-proj-SecretOpenAiKey12345678 x-api-key=sk-ant-SecretAnthropicKey12345 Bearer BearerSuperSecretToken123\n    at Object.<anonymous> (/app/src/foo.ts:10:5)'
            );
            for (const secret of secrets) {
                expect(sanitized).not.toContain(secret);
            }
            expect(sanitized).not.toContain('Error:');
            expect(sanitized).not.toContain('/app/src/foo.ts');
            expect(sanitized).toContain('[REDACTED]');
        });

        it('toSafeUserError never leaks secrets or stack traces', () => {
            const errWithSecret = new AiProviderError({
                code: 'AUTH_FAILED',
                httpStatus: 401,
                userMessage:
                    'Rejected key sk-proj-SecretOpenAiKey12345678 at ?key=AIzaSySecretGoogleKey123456 with Bearer BearerSuperSecretToken123',
            });

            const safe = toSafeUserError(errWithSecret);
            for (const secret of secrets) {
                expect(safe.message).not.toContain(secret);
            }
            expect(safe.code).toBe('AUTH_FAILED');
            expect(safe.httpStatus).toBe(401);

            const rawError = new Error(
                'Upstream 429 rate limit for x-api-key: sk-ant-SecretAnthropicKey12345 &api_key=AIzaSySecretGoogleKey123456'
            );
            const safeRaw = toSafeUserError(rawError);
            for (const secret of secrets) {
                expect(safeRaw.message).not.toContain(secret);
            }
            expect(safeRaw.code).toBe('RATE_LIMITED');
        });
    });
});
