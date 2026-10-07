/**
 * AI Provider - OpenAI-compatible adapter with streaming support
 * Supports any OpenAI-compatible endpoint (OpenAI, Anthropic via proxy, local LLMs, etc.)
 */

import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { resolveHostAddresses } from '@/lib/net/dnsResolve';

/**
 * Decrypt an AI provider key, falling back to plaintext for historical data.
 *
 * Mirrors `tryDecryptOrPlaintext` in lib/strava/oauth.ts so legacy plaintext
 * keys keep working (with a logged warning) while correctly-encrypted keys are
 * decrypted. decryptToken now throws on short/corrupt values (fail-closed), so
 * callers must wrap it; AI features should degrade gracefully rather than crash.
 *
 * SECURITY: this fallback exists ONLY as a migration read path for legacy
 * plaintext rows and is logged at error level on every use. New writes always
 * go through encryptToken() (which throws when ENCRYPTION_KEY is missing or
 * invalid) - plaintext is never written. Re-saving a legacy key encrypts it.
 */
export function tryDecryptAiKey(storedKey: string, keyType: string, contextId?: string): string | null {
    if (!storedKey) return null;
    try {
        return decryptToken(storedKey);
    } catch (error) {
        logger.error('Serving legacy plaintext AI provider key (migration path only) - re-save the key to encrypt it at rest', {
            keyType,
            contextId,
            error: error instanceof Error ? error.message : String(error),
        });
        return storedKey;
    }
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiConfig {
    provider: 'openai' | 'anthropic' | 'google';
    baseUrl: string;
    apiKey: string; // The active key (legacy or first key)
    apiKeys: string[]; // List of all available keys for retry
    model: string;
    keyOverride?: boolean;
    providerId?: string;
    fallback?: AiConfig;
}

const WELL_KNOWN_BASE_URLS = [
    'https://api.openai.com/v1',
    'https://api.anthropic.com',
    'https://generativelanguage.googleapis.com',
    'https://openrouter.ai/api/v1',
];

const DEFAULT_ALLOWED_BASE_URLS = WELL_KNOWN_BASE_URLS;

function getAllowedHostnames(allowedUrls: readonly string[]): Set<string> {
    const hostnames = new Set<string>();
    for (const urlStr of allowedUrls) {
        try {
            const parsed = new URL(urlStr);
            hostnames.add(parsed.hostname.toLowerCase());
        } catch { /* skip invalid URLs */ }
    }
    return hostnames;
}

function isHostnameAllowed(hostname: string, allowedHostnames: Set<string>): boolean {
    const lower = hostname.toLowerCase();
    if (allowedHostnames.has(lower)) return true;
    const parts = lower.split('.');
    for (let i = 1; i < parts.length; i++) {
        if (allowedHostnames.has(parts.slice(i).join('.'))) return true;
    }
    return false;
}

function isPrivateIP(hostname: string): boolean {
    const privatePatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^::1$/,
        /^localhost$/,
        /^0\.0\.0\.0$/,
        /^::$/,
        /^fc00:/i,
        /^fe80:/i,
        /^169\.254\./,       // Link-local / AWS metadata service
        /^100\.64\./,        // Shared Address Space (RFC 6598)
        /^198\.51\.100\./,   // TEST-NET-2
        /^203\.0\.113\./,    // TEST-NET-3
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
}

export function validateUrl(url: string, allowedUrls: readonly string[] = DEFAULT_ALLOWED_BASE_URLS): boolean {
    try {
        const parsed = new URL(url);

        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return false;
        }

        if (isPrivateIP(parsed.hostname)) {
            return false;
        }

        if (parsed.hostname === '0.0.0.0' || parsed.hostname === '[::]' || parsed.hostname === 'localhost') {
            return false;
        }

        if (!parsed.hostname.includes('.')) {
            return false;
        }

        const allowedHostnames = getAllowedHostnames(allowedUrls);
        if (!isHostnameAllowed(parsed.hostname, allowedHostnames)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * SSRF DNS-resolution guard.
 *
 * validateUrl/validateBaseUrl only inspect the hostname STRING: a
 * caller-controlled DNS name (an attacker's A record, or a multi-label
 * internal-only name such as metadata.google.internal) passes those checks,
 * and the raw fetch would then connect to whatever the name resolves to.
 * assertResolvesToPublicHost() closes that gap by resolving the hostname the
 * same way the subsequent fetch will (getaddrinfo) and refusing
 * private / loopback / link-local / reserved targets for IPv4 and IPv6
 * BEFORE any connection is made.
 */
function isPrivateResolvedAddress(address: string): boolean {
    const ip = address.trim().toLowerCase().replace(/^\[|\]$/g, '');

    if (!ip.includes(':')) {
        // IPv4
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
            return true; // unparseable -> fail closed
        }
        const [a, b, c] = parts;
        if (a === 0 || a === 10 || a === 127) return true;                 // this-network, private, loopback
        if (a === 169 && b === 254) return true;                           // link-local (incl. cloud metadata 169.254.169.254)
        if (a === 172 && b >= 16 && b <= 31) return true;                  // private
        if (a === 192 && b === 168) return true;                           // private
        if (a === 100 && b >= 64 && b <= 127) return true;                 // CGNAT shared range (RFC 6598)
        if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;     // protocol assignments / TEST-NET-1
        if (a === 198 && (b === 18 || b === 19)) return true;              // benchmarking (RFC 2544)
        if (a === 198 && b === 51 && c === 100) return true;               // TEST-NET-2
        if (a === 203 && b === 0 && c === 113) return true;                // TEST-NET-3
        if (a >= 224) return true;                                         // multicast / reserved / limited broadcast
        return false;
    }

    // IPv6 (scope/zone ids stripped)
    const v6 = ip.split('%')[0];
    if (v6 === '::' || v6 === '::1') return true;                          // unspecified / loopback
    if (v6.startsWith('::ffff:')) {
        // IPv4-mapped address, dotted or hex form
        const rest = v6.slice('::ffff:'.length);
        if (rest.includes('.')) return isPrivateResolvedAddress(rest);
        const hex = rest.replace(/:/g, '');
        if (hex.length === 8 && /^[0-9a-f]+$/.test(hex)) {
            const bytes = hex.match(/.{2}/g)!.map((h) => parseInt(h, 16));
            return isPrivateResolvedAddress(bytes.join('.'));
        }
        return true; // unparseable mapped form -> fail closed
    }
    if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true;                        // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(v6)) return true;                        // link-local fe80::/10
    if (/^ff[0-9a-f]{2}:/.test(v6)) return true;                           // multicast ff00::/8
    if (/^2001:db8:/.test(v6)) return true;                                // documentation 2001:db8::/32
    if (/^64:ff9b:/.test(v6)) return true;                                 // NAT64 well-known prefix (embeds IPv4 space)
    if (/^100::/.test(v6)) return true;                                    // discard-only 100::/64
    return false;
}

async function assertResolvesToPublicHost(hostname: string): Promise<void> {
    let addresses: string[];
    try {
        addresses = await resolveHostAddresses(hostname);
    } catch {
        throw new Error(`SSRF Protection: DNS resolution failed for host: ${hostname}`);
    }
    if (addresses.length === 0) {
        throw new Error(`SSRF Protection: host did not resolve to any address: ${hostname}`);
    }
    for (const address of addresses) {
        if (isPrivateResolvedAddress(address)) {
            throw new Error(
                `SSRF Protection: Blocked request to host resolving to a private/reserved address: ${hostname} (${address})`
            );
        }
    }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit & { allowedUrls?: string[] }): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (!validateUrl(url, init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS)) {
        throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${url}`);
    }

    // DNS-resolution guard: hostname-string checks do not stop a
    // caller-controlled DNS name that resolves into private/link-local
    // space (internal services on the docker bridge, cloud metadata). This
    // runs for every safeFetch caller, including the self-granted-allowlist
    // shape used by testAiConfig (/api/ai/test-key) and stored BYOK/admin
    // provider base URLs.
    await assertResolvesToPublicHost(new URL(url).hostname);

    const response = await fetch(input, init);

    // Redirect re-check. fetch follows redirects by default, so response.url
    // is the final URL; this is now checked for every status (not just OK)
    // so a non-OK body fetched from a disallowed redirect target cannot flow
    // back to the caller either.
    const finalUrl = response.url;
    if (finalUrl && finalUrl !== url) {
        if (!validateUrl(finalUrl, init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS)) {
            response.body?.cancel();
            throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
        }
        await assertResolvesToPublicHost(new URL(finalUrl).hostname);
    }

    return response;
}

export function validateBaseUrl(baseUrl: string, extraAllowedUrls: string[] = []): boolean {
    try {
        const url = new URL(baseUrl);

        if (url.protocol !== 'https:') {
            return false;
        }

        if (isPrivateIP(url.hostname)) {
            return false;
        }

        if (url.hostname === '0.0.0.0' || url.hostname === '[::]' || url.hostname === 'localhost' || !url.hostname.includes('.')) {
            return false;
        }

        const allAllowed = [...WELL_KNOWN_BASE_URLS, ...extraAllowedUrls];
        const allowedHostnames = getAllowedHostnames(allAllowed);
        if (!isHostnameAllowed(url.hostname, allowedHostnames)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

export interface StreamOptions {
    onToken?: (_token: string) => void;
    signal?: AbortSignal;
}

/**
 * Get the AI configuration for a user
 * Uses user's custom config if set, otherwise falls back to global config
 */
export async function getAiConfig(userId: string): Promise<AiConfig | null> {
    // Get user's AI settings
    const userSettings = await prisma.userAiSettings.findUnique({
        where: { userId },
    });

    // AI features must be:
    // 1. Allowed by admin
    // 2. Explicitly enabled by user (opt-in)
    if (!userSettings?.adminAllowed || !userSettings?.aiEnabled) {
        return null;
    }

    // If user has custom API key AND is in BYOK mode ('none'), use their config
    if (userSettings.customApiKey && userSettings.usageTier === 'none') {
        const decryptedKey = tryDecryptAiKey(userSettings.customApiKey, 'customApiKey', userId);
        if (decryptedKey) {
            const apiKeys = decryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
            const baseUrl = userSettings.customBaseUrl || 'https://api.openai.com/v1';
            if (!validateBaseUrl(baseUrl) || apiKeys.length === 0) {
                logger.warn('[AI Config] Invalid custom config detected', { baseUrl, userId });
                return null;
            }
            return {
                provider: 'openai', // Custom keys assume OpenAI-compatible for now
                baseUrl,
                apiKey: apiKeys[0],
                apiKeys,
                model: userSettings.customModel || 'gpt-4o-mini',
            };
        }
        // Fall through if decryption failed
    }

    // Check for active provider in Global Settings
    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: {
            activeProvider: true,
            fallbackProvider: true,
        }
    });

    // 1. Use Active Provider if set
    if (globalSettings?.activeProvider) {
        const decryptedKey = tryDecryptAiKey(globalSettings.activeProvider.apiKey, 'activeProvider', globalSettings.activeProvider.id);
        if (decryptedKey) {
            const apiKeys = decryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
            const baseUrl = globalSettings.activeProvider.baseUrl;
            if (!validateBaseUrl(baseUrl, [baseUrl]) || apiKeys.length === 0) {
                logger.warn('[AI Config] Invalid activeProvider config detected', { baseUrl, providerId: globalSettings.activeProvider.id });
                return null;
            }

            let fallbackAiConfig: AiConfig | undefined;
            if (globalSettings.fallbackProvider) {
                const fbDecryptedKey = tryDecryptAiKey(globalSettings.fallbackProvider.apiKey, 'fallbackProvider', globalSettings.fallbackProvider.id);
                if (fbDecryptedKey) {
                    const fbApiKeys = fbDecryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
                    if (fbApiKeys.length > 0 && validateBaseUrl(globalSettings.fallbackProvider.baseUrl, [globalSettings.fallbackProvider.baseUrl])) {
                        fallbackAiConfig = {
                            provider: globalSettings.fallbackProvider.type as 'openai' | 'anthropic' | 'google',
                            baseUrl: globalSettings.fallbackProvider.baseUrl,
                            apiKey: fbApiKeys[0],
                            apiKeys: fbApiKeys,
                            model: globalSettings.fallbackProvider.models[0] || 'gpt-4o-mini',
                            providerId: globalSettings.fallbackProvider.id,
                        };
                    }
                }
            }

            return {
                provider: globalSettings.activeProvider.type as 'openai' | 'anthropic' | 'google',
                baseUrl,
                apiKey: apiKeys[0],
                apiKeys,
                model: globalSettings.activeProvider.models[0] || 'gpt-4o-mini', // Default to first available model
                providerId: globalSettings.activeProvider.id,
                fallback: fallbackAiConfig,
            };
        }
        // Fall through if active provider key is invalid
    }

    // 2. Fallback to Legacy Global Config
    if (globalSettings?.defaultApiKey) {
        const decryptedKey = tryDecryptAiKey(globalSettings.defaultApiKey, 'defaultApiKey');
        if (decryptedKey) {
            const apiKeys = decryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
            const baseUrl = globalSettings.defaultBaseUrl;
            if (!validateBaseUrl(baseUrl, [baseUrl]) || apiKeys.length === 0) {
                logger.warn('[AI Config] Invalid default config detected', { baseUrl });
                return null;
            }
            return {
                provider: 'openai', // Legacy is always OpenAI-compatible
                baseUrl,
                apiKey: apiKeys[0],
                apiKeys,
                model: globalSettings.defaultModel,
            };
        }
    }

    return null;
}

/**
 * Get AI config dynamically resolved by the requested model name.
 * If the user's active provider supports the model, it returns that.
 * Otherwise, it searches all configured providers for one that lists the model.
 * Falls back to getAiConfig if no match is found.
 */
export async function getAiConfigForModel(userId: string, targetModel: string): Promise<AiConfig | null> {
    const baseConfig = await getAiConfig(userId);

    if (!baseConfig) return null;

    // Check if BYOK is active
    const userSettings = await prisma.userAiSettings.findUnique({ where: { userId } });
    if (userSettings?.customApiKey && userSettings?.usageTier === 'none') {
        return { ...baseConfig, model: targetModel };
    }

    // 1. Exact or loose match in provider's configured models array
    const lowerTarget = targetModel.toLowerCase().trim();
    
    // Check if the current baseConfig (active provider) supports this model
    const activeProvider = await prisma.aiProvider.findUnique({ where: { id: baseConfig.providerId! } });
    if (activeProvider && activeProvider.models.some(m => m.toLowerCase().trim() === lowerTarget)) {
        return { ...baseConfig, model: targetModel };
    }

    const allProviders = await prisma.aiProvider.findMany({ where: { isActive: true } });
    
    // Try finding any provider that lists the model explicitly
    let matchingProvider = allProviders.find(p => p.models.some(m => m.toLowerCase().trim() === lowerTarget));

    // 2. Guess by prefix if no explicit match
    if (!matchingProvider) {
        let guessedType: 'openai' | 'anthropic' | 'google' | null = null;
        if (lowerTarget.startsWith('gpt-') || lowerTarget.startsWith('o1-') || lowerTarget.startsWith('o3-') || lowerTarget.includes('openai')) {
            guessedType = 'openai';
        } else if (lowerTarget.startsWith('claude-') || lowerTarget.includes('anthropic')) {
            guessedType = 'anthropic';
        } else if (lowerTarget.startsWith('gemini-') || lowerTarget.includes('google')) {
            guessedType = 'google';
        }

        if (guessedType) {
            matchingProvider = allProviders.find(p => p.type === guessedType);
        }
    }

    if (matchingProvider) {
        const decryptedKey = tryDecryptAiKey(matchingProvider.apiKey, 'matchingProvider', matchingProvider.id);
        if (decryptedKey) {
            const apiKeys = decryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
            if (apiKeys.length > 0 && validateBaseUrl(matchingProvider.baseUrl, [matchingProvider.baseUrl])) {
                return {
                    provider: matchingProvider.type as 'openai' | 'anthropic' | 'google',
                    baseUrl: matchingProvider.baseUrl,
                    apiKey: apiKeys[0],
                    apiKeys,
                    model: targetModel,
                    providerId: matchingProvider.id,
                };
            }
        }
    }

    // Fall back to active provider with the model forced (might fail, but it's the best we can do)
    return { ...baseConfig, model: targetModel };
}

/**
 * Check if a user has AI access (either via BYOK or admin-enabled)
 */
export async function hasAiAccess(userId: string): Promise<boolean> {
    const config = await getAiConfig(userId);
    return config !== null;
}

/**
 * Stream a chat completion from an AI provider
 */
export async function streamChat(
    config: AiConfig,
    messages: ChatMessage[],
    options?: StreamOptions
): Promise<AsyncIterable<string>> {
    if (config.provider === 'google') {
        return streamGoogle(config, messages, options);
    }

    if (config.provider === 'anthropic') {
        return streamAnthropic(config, messages, options);
    }

    // Default: OpenAI Compatible
    return streamOpenAI(config, messages, options);
}

/**
 * OpenAI Compatible Stream
 */
async function streamOpenAI(
    config: AiConfig,
    messages: ChatMessage[],
    options?: StreamOptions
): Promise<AsyncIterable<string>> {
    try {
        const response = await handleOpenAIRetry(config, messages, options);
        return createOpenAIAsyncIterator(response, config, options);
    } catch (error: unknown) {
        handlePermissionError(error, config);
        throw error;
    }
}

async function handleOpenAIRetry(
    config: AiConfig,
    messages: ChatMessage[],
    options?: StreamOptions
): Promise<Response> {
    let response: Response | undefined;

    for (let i = 0; i < config.apiKeys.length; i++) {
        const currentKey = config.apiKeys[i];

        response = await safeFetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true,
                ...(config.model.includes('kimi') || config.model.includes('deepseek') || config.model.includes('reasoning') || config.model.includes('o1')
                    ? { max_completion_tokens: 4096 }
                    : { max_tokens: 4096 }),
                temperature: 0.7,
            }),
            signal: options?.signal,
            allowedUrls: [config.baseUrl],
        });

        if (response.ok) break;

        if (response.status === 429 && i < config.apiKeys.length - 1) {
            logger.warn('[OPENAI STREAM] Rate limit hit (429), retrying with next API key', { model: config.model, keyIndex: i, totalKeys: config.apiKeys.length });
            continue;
        }

        break;
    }

    if (!response || !response.ok) {
        await handleError(response!);
    }

    return response as Response;
}

function parseOpenAIStreamContent(
    trimmed: string,
    config: AiConfig,
    isReasoning: boolean,
    options?: StreamOptions
): { tokens: string[]; newIsReasoning: boolean } {
    const tokens: string[] = [];
    let newIsReasoning = isReasoning;

    try {
        const json = JSON.parse(trimmed.slice(6));

        if (json.error) {
            const errorMsg = json.error.message || JSON.stringify(json.error);
            logger.error('[OPENAI STREAM] Provider error', { error: errorMsg, model: config.model, provider: config.provider });
            throw new Error(`OpenAI provider error: ${errorMsg}`);
        }

        const delta = json.choices?.[0]?.delta;
        if (!delta) return { tokens, newIsReasoning };

        if (delta.reasoning_content) {
            if (!newIsReasoning) {
                tokens.push('<details>\n<summary>Thinking Process</summary>\n\n');
                newIsReasoning = true;
            }
            options?.onToken?.(delta.reasoning_content);
            tokens.push(delta.reasoning_content);
        }

        if (delta.content) {
            if (newIsReasoning) {
                tokens.push('\n</details>\n\n');
                newIsReasoning = false;
            }
            options?.onToken?.(delta.content);
            tokens.push(delta.content);
        }
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('OpenAI provider error:')) {
            throw error;
        }
        logger.warn('[OPENAI STREAM] Skipped invalid JSON line', { line: trimmed, model: config.model });
    }

    return { tokens, newIsReasoning };
}

function createOpenAIAsyncIterator(
    response: Response,
    config: AiConfig,
    options?: StreamOptions
): AsyncIterable<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from AI provider');

    const decoder = new TextDecoder();
    let lineBuffer = '';

    return {
        async *[Symbol.asyncIterator]() {
            let isReasoning = false;
            let chunkCount = 0;
            let yieldCount = 0;
            logger.info('[OPENAI STREAM] Starting async iterator', { model: config.model, provider: config.provider });

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    chunkCount++;

                    if (done) {
                        logger.info('[OPENAI STREAM] Reader done', { chunkCount, yieldCount, model: config.model });
                        break;
                    }

                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === 'data: [DONE]') continue;
                        if (!trimmed.startsWith('data: ')) continue;

                        const parsed = parseOpenAIStreamContent(trimmed, config, isReasoning, options);
                        for (const token of parsed.tokens) {
                            yield token;
                            yieldCount++;
                        }
                        isReasoning = parsed.newIsReasoning;
                    }
                }
            } catch (error) {
                logger.error('[OPENAI STREAM] Error in iterator', { error: error instanceof Error ? error.message : String(error), model: config.model, provider: config.provider, chunkCount, yieldCount });
                throw error;
            } finally {
                if (isReasoning) {
                    yield '\n</details>\n\n';
                    yieldCount++;
                }
                logger.info('[OPENAI STREAM] Cleanup', { yieldCount, model: config.model });
                reader.releaseLock();
            }
        }
    };
}

/**
 * Anthropic Stream Support
 */
async function streamAnthropic(
    config: AiConfig,
    messages: ChatMessage[],
    options?: StreamOptions
): Promise<AsyncIterable<string>> {
    try {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        let response: Response | undefined;
        let _activeKeyIndex = 0;

        for (let i = 0; i < config.apiKeys.length; i++) {
            _activeKeyIndex = i;
            const currentKey = config.apiKeys[i];

            response = await safeFetch(`${config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': currentKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    system: systemMessage?.content,
                    messages: userMessages.map(m => ({ role: m.role, content: m.content })),
                    stream: true,
                    max_tokens: 4096,
                    temperature: 0.7,
                }),
                signal: options?.signal,
                allowedUrls: [config.baseUrl],
            });

            if (response.ok) {
                break; // Success! Break out of the retry loop.
            }

            if (response.status === 429 && i < config.apiKeys.length - 1) {
                logger.warn('[ANTHROPIC STREAM] Rate limit hit (429), retrying with next API key', { model: config.model, keyIndex: i, totalKeys: config.apiKeys.length });
                continue;
            }

            break; // Other error or last key, break and handle below
        }

        if (!response || !response.ok) {
            await handleError(response!);
        }

        const reader = response!.body?.getReader();
        if (!reader) throw new Error('No response body from AI provider');

        const decoder = new TextDecoder();
        let lineBuffer = '';

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        lineBuffer += decoder.decode(value, { stream: true });
                        const lines = lineBuffer.split('\n');
                        lineBuffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            if (!trimmed.startsWith('event: ') && !trimmed.startsWith('data: ')) continue;

                            if (trimmed.startsWith('data: ')) {
                                try {
                                    const json = JSON.parse(trimmed.slice(6));

                                    if (json.error || json.type === 'error') {
                                        throw new Error(`Anthropic error: ${(json.error?.message || json.message) || JSON.stringify(json)}`);
                                    }

                                    if (json.type === 'content_block_delta' && json.delta?.text) {
                                        const content = json.delta.text;
                                        options?.onToken?.(content);
                                        yield content;
                                    }
                                } catch (e) {
                                    if (e instanceof Error && e.message.startsWith('Anthropic error:')) throw e;
                                }
                            }
                        }
                    }
                } catch (error) {
                    logger.error('Anthropic stream error', { error: error instanceof Error ? error.message : String(error), model: config.model, provider: config.provider });
                    throw error;
                } finally {
                    reader.releaseLock();
                }
            }
        };
    } catch (error: unknown) {
        handlePermissionError(error, config);
        throw error;
    }
}

/**
 * Google Gemini Stream Support
 */
async function streamGoogle(
    config: AiConfig,
    messages: ChatMessage[],
    options?: StreamOptions
): Promise<AsyncIterable<string>> {
    try {
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const geminiContent = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })).filter(m => m.parts[0].text);

        let response: Response | undefined;
        let _activeKeyIndex = 0;

        for (let i = 0; i < config.apiKeys.length; i++) {
            _activeKeyIndex = i;
            const currentKey = config.apiKeys[i];
            const url = `${config.baseUrl}/v1beta/models/${config.model}:streamGenerateContent`;

            response = await safeFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': currentKey,
                },
                body: JSON.stringify({
                    system_instruction: systemMessage ? {
                        parts: [{ text: systemMessage.content }]
                    } : undefined,
                    contents: geminiContent,
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.7,
                    }
                }),
                signal: options?.signal,
                allowedUrls: [config.baseUrl],
            });

            if (response.ok) {
                break; // Success! Break out of the retry loop.
            }

            if (response.status === 429 && i < config.apiKeys.length - 1) {
                logger.warn('[GEMINI STREAM] Rate limit hit (429), retrying with next API key', { model: config.model, keyIndex: i, totalKeys: config.apiKeys.length });
                continue;
            }

            break; // Other error or last key, break and handle below
        }

        if (!response || !response.ok) {
            await handleError(response!);
        }

        const reader = response!.body?.getReader();
        if (!reader) throw new Error('No response body from AI provider');

        const decoder = new TextDecoder();
        let buffer = '';

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Remove leading '[' if present (start of array)
                        if (buffer.startsWith('[')) {
                            buffer = buffer.slice(1);
                        }

                        // Try to extract full JSON objects
                        let boundary;
                        while ((boundary = findJsonBoundary(buffer)) !== -1) {
                            // Clean up leading comma or whitespace BEFORE extracting JSON
                            buffer = buffer.replace(/^\s*,\s*/, '');

                            // Re-find boundary after cleanup (position may have changed)
                            boundary = findJsonBoundary(buffer);
                            if (boundary === -1) break;

                            const jsonStr = buffer.slice(0, boundary + 1);
                            buffer = buffer.slice(boundary + 1);

                            try {
                                const part = JSON.parse(jsonStr);
                                if (part.error) {
                                    throw new Error(`Google error: ${part.error.message || JSON.stringify(part.error)}`);
                                }
                                const text = part.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    options?.onToken?.(text);
                                    yield text;
                                }
                            } catch (e) {
                                if (e instanceof Error && e.message.startsWith('Google error:')) throw e;
                                logger.warn('[GEMINI STREAM] Failed to parse chunk', { error: e instanceof Error ? e.message : String(e), jsonPreview: jsonStr.substring(0, 100), model: config.model });
                            }
                        }
                    }
                } catch (error) {
                    logger.error('Google stream error', { error: error instanceof Error ? error.message : String(error), model: config.model, provider: config.provider });
                    throw error;
                } finally {
                    reader.releaseLock();
                }
            }
        };
    } catch (error: unknown) {
        handlePermissionError(error, config);
        throw error;
    }
}

function findJsonBoundary(str: string): number {
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    let foundStart = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') {
            inString = true;
            continue;
        }
        if (char === '{') {
            braceCount++;
            foundStart = true;
        } else if (char === '}') {
            braceCount--;
        }
        if (foundStart && braceCount === 0) return i;
    }
    return -1;
}

async function handleError(response: Response) {
    if (response.status === 429) {
        throw new Error('AI provider rate limited (429)');
    }
    if (response.status === 503) {
        throw new Error('AI API error: 503 - The AI model is temporarily overloaded. Please try again in a few minutes.');
    }
    let errorMessage = `AI API error: ${response.status}`;
    try {
        const data = await response.json();
        if (data.error?.message) errorMessage += ` - ${data.error.message}`;
        else if (data.message) errorMessage += ` - ${data.message}`;
        else errorMessage += ` - ${JSON.stringify(data)}`;
    } catch {
        const text = await response.text();
        if (text) errorMessage += ` - ${text}`;
    }
    throw new Error(errorMessage);
}

function handlePermissionError(error: unknown, config: AiConfig) {
    if (error instanceof Error && error.name === 'TypeError' && error.message === 'fetch failed') {
        throw new Error(`Failed to connect to ${config.provider} at ${config.baseUrl}. Please check the URL and internet connection.`);
    }
}

export async function generateCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
): Promise<string> {
    try {
        if (config.provider === 'google') {
            return await generateGoogleCompletion(config, messages, signal);
        } else if (config.provider === 'anthropic') {
            return await generateAnthropicCompletion(config, messages, signal);
        } else {
            return await generateOpenAICompletion(config, messages, signal);
        }
    } catch (error: unknown) {
        handlePermissionError(error, config);
        throw error;
    }
}

async function generateOpenAICompletion(
    config: AiConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
): Promise<string> {
    let response: Response | undefined;

    for (let i = 0; i < config.apiKeys.length; i++) {
        const currentKey = config.apiKeys[i];

        response = await safeFetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                max_tokens: 4096,
                temperature: 0.7,
            }),
            allowedUrls: [config.baseUrl],
        });

        if (response.ok) {
            break;
        }

        if (response.status === 429 && i < config.apiKeys.length - 1) {
            logger.warn('[GEN COMP] Rate limit hit (429), retrying with next API key', { model: config.model, keyIndex: i, totalKeys: config.apiKeys.length });
            continue;
        }

        break;
    }

    if (!response || !response.ok) await handleError(response!);
    
    // Check if body is readable, text() could consume it so only json()
    const data = await response!.json();
    
    if (data.error) {
        logger.error('[GEN COMP] Provider returned 200 OK but with error payload', { error: data.error, model: config.model });
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const message = data.choices?.[0]?.message;
    if (!message) return '';

    let output = '';
    if (message.reasoning_content) {
        output += `<details>\n<summary>Thinking Process</summary>\n\n${message.reasoning_content}\n</details>\n\n`;
    }
    if (message.content) {
        output += message.content;
    }
    
    // If somehow both were empty, fallback to logging
    if (!output) {
        logger.warn('[GEN COMP] Empty message content in response', { data: JSON.stringify(data).substring(0, 300) });
    }

    return output.trim();
}

async function generateAnthropicCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
): Promise<string> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    let response: Response | undefined;

    for (let i = 0; i < config.apiKeys.length; i++) {
        const currentKey = config.apiKeys[i];

        response = await safeFetch(`${config.baseUrl}/v1/messages`, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': currentKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: 4096,
                temperature: 0.7,
            }),
            allowedUrls: [config.baseUrl],
        });

        if (response.ok) break;

        if (response.status === 429 && i < config.apiKeys.length - 1) {
            logger.warn('[ANTHROPIC COMP] Rate limit hit (429), retrying', { model: config.model, keyIndex: i });
            continue;
        }

        break;
    }

    if (!response || !response.ok) await handleError(response!);
    const data = await response!.json();

    if (data.error || data.type === 'error') {
        logger.error('[ANTHROPIC COMP] Provider returned error payload', { error: data.error || data, model: config.model });
        throw new Error(data.error?.message || data.message || JSON.stringify(data));
    }

    if (!data.content || data.content.length === 0) {
        logger.warn('[ANTHROPIC COMP] Empty content in response', { data: JSON.stringify(data).substring(0, 300) });
        return '';
    }

    return data.content[0]?.text || '';
}

async function generateGoogleCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    signal?: AbortSignal
): Promise<string> {
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const geminiContent = chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    })).filter(m => m.parts[0].text);

    let response: Response | undefined;

    for (let i = 0; i < config.apiKeys.length; i++) {
        const currentKey = config.apiKeys[i];
        const url = `${config.baseUrl}/v1beta/models/${config.model}:generateContent`;

        response = await safeFetch(url, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': currentKey,
            },
            body: JSON.stringify({
                system_instruction: systemMessage ? {
                    parts: [{ text: systemMessage.content }]
                } : undefined,
                contents: geminiContent,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7,
                }
            }),
            allowedUrls: [config.baseUrl],
        });

        if (response.ok) break;

        if (response.status === 429 && i < config.apiKeys.length - 1) {
            logger.warn('[GEMINI COMP] Rate limit hit (429), retrying', { model: config.model, keyIndex: i });
            continue;
        }

        break;
    }

    if (!response || !response.ok) await handleError(response!);
    const data = await response!.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Cap on fetched-target body text echoed back through testAiConfig's result
 * (and thereby through /api/ai/test-key's response). The fetched endpoint is
 * attacker-selected on that route, so its body must not be relayed unbounded.
 */
const ECHO_BODY_MAX_CHARS = 500;

function boundEchoText(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    return value.length > ECHO_BODY_MAX_CHARS
        ? `${value.substring(0, ECHO_BODY_MAX_CHARS)}…[truncated]`
        : value;
}

export async function testAiConfig(config: AiConfig): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
        if (config.provider === 'google') {
            const url = `${config.baseUrl}/v1beta/models/${config.model}`;
            const res = await safeFetch(url, {
                headers: { 'x-goog-api-key': config.apiKey },
                allowedUrls: [config.baseUrl],
            });
            if (res.ok) return { success: true, model: config.model };
            const data = await res.json();
            return { success: false, error: boundEchoText(data.error?.message) || 'Google API Error' };
        }
        if (config.provider === 'anthropic') {
            const res = await safeFetch(`${config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'Hi' }]
                }),
                allowedUrls: [config.baseUrl],
            });
            if (res.ok) return { success: true, model: config.model };
            const data = await res.json();
            return { success: false, error: boundEchoText(data.error?.message) || 'Anthropic API Error' };
        }

        const chatResponse = await safeFetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5,
            }),
            allowedUrls: [config.baseUrl],
        });

        if (chatResponse.ok) return { success: true, model: config.model };

        let errorMessage = `API returned ${chatResponse.status}`;
        try {
            const data = await chatResponse.json();
            const message = boundEchoText(data.error?.message);
            if (message) errorMessage += `: ${message}`;
        } catch {
            const text = boundEchoText((await chatResponse.text().catch(() => '')) ?? '');
            if (text) errorMessage += `: ${text}`;
        }
        return { success: false, error: errorMessage };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
