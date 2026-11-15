/**
 * AI Provider - OpenAI-compatible adapter with streaming support
 * Supports any OpenAI-compatible endpoint (OpenAI, Anthropic via proxy, local LLMs, etc.)
 */

import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { resolveHostAddresses } from '@/lib/net/dnsResolve';
import {
    AiErrorCode,
    AiProviderError,
    classifyFetchError,
    parseUpstreamProviderError,
    sanitizeErrorMessage,
    type UpstreamErrorContext,
} from './errors';

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

export interface AiImageInput {
    mimeType: string;
    base64Data: string;
}

export interface AiRequestOptions {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    responseMimeType?: string;
}

export interface AiCompletionOptions extends AiRequestOptions {
    signal?: AbortSignal;
}

export interface AiConfig {
    provider: 'openai' | 'anthropic' | 'google';
    baseUrl: string;
    apiKey: string; // The active key (legacy or first key)
    apiKeys: string[]; // List of all available keys for retry
    model: string;
    keyOverride?: boolean;
    providerId?: string;
    providerSlug?: string;
    isByok?: boolean;
    fallback?: AiConfig;
    allowedUrls?: string[];
    statusOnly?: boolean;
}

const WELL_KNOWN_BASE_URLS = [
    'https://api.openai.com/v1',
    'https://api.anthropic.com',
    'https://generativelanguage.googleapis.com',
    'https://openrouter.ai/api/v1',
    'https://integrate.api.nvidia.com/v1',
    'https://open.bigmodel.cn/api/paas/v4',
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

        if (parsed.protocol !== 'https:') {
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
    const initialUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const allowedList = init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS;
    const MAX_REDIRECT_HOPS = 3;

    let currentUrl = initialUrl;
    let currentInit: RequestInit = { ...init, redirect: 'manual' };
    const initialOrigin = new URL(initialUrl).origin;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
        const parsedCurrent = new URL(currentUrl);
        await assertResolvesToPublicHost(parsedCurrent.hostname);

        if (!validateUrl(currentUrl, allowedList)) {
            throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${currentUrl}`);
        }

        const response = await fetch(hop === 0 ? input : currentUrl, currentInit);

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            response.body?.cancel();
            if (!location) {
                return response;
            }
            if (hop === MAX_REDIRECT_HOPS) {
                throw new Error('SSRF Protection: Too many redirects from AI provider endpoint');
            }
            const nextUrl = new URL(location, currentUrl).toString();
            if (!validateUrl(nextUrl, allowedList)) {
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${nextUrl}`);
            }
            await assertResolvesToPublicHost(new URL(nextUrl).hostname);

            if (new URL(nextUrl).origin !== initialOrigin && currentInit.headers) {
                const sanitizedHeaders = new Headers(currentInit.headers);
                sanitizedHeaders.delete('authorization');
                sanitizedHeaders.delete('x-api-key');
                currentInit = { ...currentInit, headers: sanitizedHeaders };
            }
            if (response.status === 301 || response.status === 302 || response.status === 303) {
                currentInit = { ...currentInit, method: 'GET', body: undefined };
            }
            currentUrl = nextUrl;
            continue;
        }

        const finalUrl = response.url;
        if (finalUrl && finalUrl !== currentUrl) {
            if (!validateUrl(finalUrl, allowedList)) {
                response.body?.cancel();
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
            }
            await assertResolvesToPublicHost(new URL(finalUrl).hostname);
        }

        return response;
    }

    throw new Error('SSRF Protection: Redirect limit exceeded');
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

export interface StreamOptions extends AiRequestOptions {
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

const KEY_ROTATION_STATUSES = new Set([429, 401, 403, 503]);

function buildErrorContext(config: AiConfig): UpstreamErrorContext {
    return {
        providerId: config.providerId,
        providerSlug: config.providerSlug,
        model: config.model,
        isByok: config.isByok,
    };
}

function resolveApiKeys(config: AiConfig): string[] {
    const keys = Array.isArray(config.apiKeys) && config.apiKeys.length > 0
        ? config.apiKeys.filter(Boolean)
        : config.apiKey
            ? [config.apiKey]
            : [];

    if (keys.length === 0) {
        throw new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 503,
            userMessage: 'AI provider API key is not configured.',
            shouldFallback: true,
            providerId: config.providerId,
            providerSlug: config.providerSlug,
            model: config.model,
        });
    }

    return keys;
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
}

function getAllowedUrls(config: AiConfig): string[] {
    return config.allowedUrls && config.allowedUrls.length > 0
        ? config.allowedUrls
        : [config.baseUrl];
}

function isReasoningModel(model: string): boolean {
    const lower = model.toLowerCase();
    return (
        /(?:^|[^a-z0-9])o[134](?:$|[^a-z0-9])/.test(lower) ||
        lower.includes('kimi') ||
        lower.includes('deepseek') ||
        lower.includes('reasoning')
    );
}

function isStrictOSeriesModel(model: string): boolean {
    return /(?:^|[^a-z0-9])o[134](?:$|[^a-z0-9])/i.test(model);
}

function buildRequestSignal(
    externalSignal?: AbortSignal,
    timeoutMs?: number
): { signal?: AbortSignal; clearTimeoutOnly: () => void; cleanup: () => void } {
    if (!timeoutMs || timeoutMs <= 0) {
        return {
            signal: externalSignal,
            clearTimeoutOnly: () => {},
            cleanup: () => {},
        };
    }

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort(externalSignal?.reason);
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort(externalSignal.reason);
        } else {
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
    }

    const timer = setTimeout(() => {
        const timeoutErr = new Error(`AI request timed out after ${timeoutMs}ms`);
        timeoutErr.name = 'TimeoutError';
        controller.abort(timeoutErr);
    }, timeoutMs);

    return {
        signal: controller.signal,
        clearTimeoutOnly: () => clearTimeout(timer),
        cleanup: () => {
            clearTimeout(timer);
            externalSignal?.removeEventListener('abort', onExternalAbort);
        },
    };
}

function shouldRetryOpenAiWithoutUnsupportedParams(status: number, rawBody: string): boolean {
    if (status !== 400 && status !== 422) return false;
    return /unsupported[_\s]?(?:param|parameter|value)|unknown[_\s]?parameter|unrecognized request argument|extra_forbidden|not supported.*(?:temperature|max_tokens|max_completion_tokens)|(?:temperature|max_tokens|max_completion_tokens).*(?:not supported|unsupported|invalid|not allowed)/i.test(
        rawBody
    );
}

function buildOpenAiPayload(opts: {
    model: string;
    messages: unknown[];
    stream: boolean;
    maxTokens: number;
    temperature: number;
    useMaxCompletionTokens: boolean;
    includeTemperature: boolean;
}): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        model: opts.model,
        messages: opts.messages,
        ...(opts.stream ? { stream: true } : {}),
        ...(opts.useMaxCompletionTokens
            ? { max_completion_tokens: opts.maxTokens }
            : { max_tokens: opts.maxTokens }),
    };
    if (opts.includeTemperature) {
        payload.temperature = opts.temperature;
    }
    return payload;
}

function createContentFilteredError(ctx: UpstreamErrorContext, detail: string): AiProviderError {
    return new AiProviderError({
        code: 'CONTENT_FILTERED',
        httpStatus: 422,
        userMessage: 'The AI provider declined to respond due to content safety policies. Please rephrase your request.',
        retryable: false,
        shouldFallback: false,
        providerId: ctx.providerId,
        providerSlug: ctx.providerSlug,
        model: ctx.model,
        internalMessage: detail,
    });
}

function createEmptyResponseError(ctx: UpstreamErrorContext, reason: string, isMaxTokens: boolean): AiProviderError {
    return new AiProviderError({
        code: 'INVALID_RESPONSE',
        httpStatus: 502,
        userMessage: isMaxTokens
            ? 'The AI response was cut off before producing output. Please try again.'
            : 'The AI provider returned an empty response. Please try again.',
        retryable: true,
        shouldFallback: true,
        providerId: ctx.providerId,
        providerSlug: ctx.providerSlug,
        model: ctx.model,
        internalMessage: reason,
    });
}

async function readResponseTextSafe(response: Response): Promise<string> {
    if (typeof response.text === 'function') {
        return (await response.text().catch(() => '')) ?? '';
    }
    if (typeof response.json === 'function') {
        try {
            const json = await response.json();
            return JSON.stringify(json);
        } catch {
            return '';
        }
    }
    return '';
}

async function fetchOpenAiWithRotation(
    config: AiConfig,
    messages: unknown[],
    opts: {
        stream: boolean;
        maxTokens: number;
        temperature: number;
        signal?: AbortSignal;
        logPrefix: string;
    }
): Promise<Response> {
    const keys = resolveApiKeys(config);
    const ctx = buildErrorContext(config);
    const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
    const allowedUrls = getAllowedUrls(config);

    for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i];
        const useMaxCompletionTokens = isReasoningModel(config.model);
        const includeTemperature = !isStrictOSeriesModel(config.model) || opts.temperature !== 0.7;

        let response: Response;
        try {
            response = await safeFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentKey}`,
                },
                body: JSON.stringify(
                    buildOpenAiPayload({
                        model: config.model,
                        messages,
                        stream: opts.stream,
                        maxTokens: opts.maxTokens,
                        temperature: opts.temperature,
                        useMaxCompletionTokens,
                        includeTemperature,
                    })
                ),
                signal: opts.signal,
                allowedUrls,
            });
        } catch (error) {
            throw classifyFetchError(error, ctx);
        }

        if (response.ok) {
            return response;
        }

        let rawBody = await readResponseTextSafe(response);

        if (shouldRetryOpenAiWithoutUnsupportedParams(response.status, rawBody)) {
            const nextUseMaxCompletionTokens =
                /max_completion_tokens/i.test(rawBody) && useMaxCompletionTokens
                    ? false
                    : /max_tokens/i.test(rawBody) && !useMaxCompletionTokens
                        ? true
                        : useMaxCompletionTokens;

            try {
                const retryResponse = await safeFetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentKey}`,
                    },
                    body: JSON.stringify(
                        buildOpenAiPayload({
                            model: config.model,
                            messages,
                            stream: opts.stream,
                            maxTokens: opts.maxTokens,
                            temperature: opts.temperature,
                            useMaxCompletionTokens: nextUseMaxCompletionTokens,
                            includeTemperature: false,
                        })
                    ),
                    signal: opts.signal,
                    allowedUrls,
                });

                if (retryResponse.ok) {
                    return retryResponse;
                }
                response = retryResponse;
                rawBody = await readResponseTextSafe(retryResponse);
            } catch (error) {
                throw classifyFetchError(error, ctx);
            }
        }

        const parsedError = parseUpstreamProviderError(
            'openai',
            response.status,
            rawBody,
            response.headers,
            ctx
        );

        if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
            logger.warn(`${opts.logPrefix} Upstream error (${response.status}), rotating to next API key`, {
                provider: config.provider,
                providerId: config.providerId,
                model: config.model,
                status: response.status,
                keyIndex: i,
                totalKeys: keys.length,
            });
            continue;
        }

        throw parsedError;
    }

    throw new AiProviderError({
        code: 'PROVIDER_UNAVAILABLE',
        httpStatus: 503,
        userMessage: 'The AI service is temporarily unavailable. Please try again shortly.',
        retryable: true,
        shouldFallback: true,
        ...ctx,
    });
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
    const reqSignal = buildRequestSignal(options?.signal, options?.timeoutMs);
    try {
        const response = await fetchOpenAiWithRotation(config, messages, {
            stream: true,
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
            signal: reqSignal.signal,
            logPrefix: '[OPENAI STREAM]',
        });
        return createOpenAIAsyncIterator(response, config, options, reqSignal);
    } catch (error: unknown) {
        reqSignal.cleanup();
        throw classifyFetchError(error, buildErrorContext(config));
    }
}

interface OpenAiStreamDelta {
    reasoning_content?: string;
    content?: string;
}

interface OpenAiStreamChunk {
    error?: { message?: string; code?: number };
    choices?: Array<{
        delta?: OpenAiStreamDelta;
        finish_reason?: string | null;
    }>;
}

function parseOpenAIStreamContent(
    trimmed: string,
    config: AiConfig,
    isReasoning: boolean,
    options?: StreamOptions
): { tokens: string[]; newIsReasoning: boolean; finishReason?: string } {
    const tokens: string[] = [];
    let newIsReasoning = isReasoning;
    let finishReason: string | undefined;

    try {
        const json = JSON.parse(trimmed.slice(6)) as OpenAiStreamChunk;

        if (json.error) {
            const embeddedStatus =
                typeof json.error.code === 'number' && json.error.code >= 400 && json.error.code < 600
                    ? json.error.code
                    : 502;
            throw parseUpstreamProviderError(
                'openai',
                embeddedStatus,
                JSON.stringify(json),
                undefined,
                buildErrorContext(config)
            );
        }

        const choice = json.choices?.[0];
        if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
        }
        const delta = choice?.delta;
        if (!delta) return { tokens, newIsReasoning, finishReason };

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
        if (error instanceof AiProviderError) {
            throw error;
        }
        logger.warn('[OPENAI STREAM] Skipped invalid JSON line', { model: config.model });
    }

    return { tokens, newIsReasoning, finishReason };
}

function createOpenAIAsyncIterator(
    response: Response,
    config: AiConfig,
    options?: StreamOptions,
    reqSignal?: { clearTimeoutOnly: () => void; cleanup: () => void }
): AsyncIterable<string> {
    const reader = response.body?.getReader();
    const ctx = buildErrorContext(config);
    if (!reader) {
        reqSignal?.cleanup();
        throw new AiProviderError({
            code: 'INVALID_RESPONSE',
            httpStatus: 502,
            userMessage: 'The AI provider returned an empty stream. Please try again.',
            retryable: true,
            shouldFallback: true,
            ...ctx,
        });
    }

    const decoder = new TextDecoder();
    let lineBuffer = '';

    return {
        async *[Symbol.asyncIterator]() {
            let isReasoning = false;
            let chunkCount = 0;
            let yieldCount = 0;
            let lastFinishReason = '';
            let finished = false;
            logger.info('[OPENAI STREAM] Starting async iterator', { model: config.model, provider: config.provider });

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    chunkCount++;

                    if (done) {
                        finished = true;
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
                        if (parsed.finishReason) {
                            lastFinishReason = parsed.finishReason.toLowerCase();
                        }
                        for (const token of parsed.tokens) {
                            if (yieldCount === 0) {
                                reqSignal?.clearTimeoutOnly();
                            }
                            yield token;
                            yieldCount++;
                        }
                        isReasoning = parsed.newIsReasoning;
                    }
                }

                if (isReasoning) {
                    yield '\n</details>\n\n';
                    yieldCount++;
                    isReasoning = false;
                }

                if (yieldCount === 0) {
                    if (lastFinishReason === 'content_filter' || lastFinishReason === 'content_filtered') {
                        throw createContentFilteredError(ctx, `OpenAI stream blocked (finish_reason=${lastFinishReason})`);
                    }
                    throw createEmptyResponseError(
                        ctx,
                        `OpenAI stream yielded 0 tokens (finish_reason=${lastFinishReason || 'unknown'})`,
                        lastFinishReason === 'length'
                    );
                }
            } catch (error) {
                const classified = classifyFetchError(error, ctx);
                logger.error('[OPENAI STREAM] Error in iterator', {
                    code: classified.code,
                    model: config.model,
                    provider: config.provider,
                    chunkCount,
                    yieldCount,
                });
                throw classified;
            } finally {
                if (!finished && typeof reader.cancel === 'function') {
                    void reader.cancel().catch(() => {});
                }
                reqSignal?.cleanup();
                logger.info('[OPENAI STREAM] Cleanup', { yieldCount, model: config.model });
                reader.releaseLock();
            }
        },
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
    const reqSignal = buildRequestSignal(options?.signal, options?.timeoutMs);
    const ctx = buildErrorContext(config);

    try {
        const keys = resolveApiKeys(config);
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        const url = `${normalizeBaseUrl(config.baseUrl)}/v1/messages`;
        const allowedUrls = getAllowedUrls(config);

        let response: Response | undefined;

        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];

            try {
                response = await safeFetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': currentKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: config.model,
                        system: systemMessage?.content,
                        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
                        stream: true,
                        max_tokens: options?.maxTokens ?? 4096,
                        temperature: options?.temperature ?? 0.7,
                    }),
                    signal: reqSignal.signal,
                    allowedUrls,
                });
            } catch (error) {
                throw classifyFetchError(error, ctx);
            }

            if (response.ok) {
                break;
            }

            const rawBody = await readResponseTextSafe(response);
            const parsedError = parseUpstreamProviderError(
                'anthropic',
                response.status,
                rawBody,
                response.headers,
                ctx
            );

            if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
                logger.warn('[ANTHROPIC STREAM] Upstream error, rotating to next API key', {
                    model: config.model,
                    status: response.status,
                    keyIndex: i,
                    totalKeys: keys.length,
                });
                continue;
            }

            throw parsedError;
        }

        const reader = response?.body?.getReader();
        if (!reader) {
            throw new AiProviderError({
                code: 'INVALID_RESPONSE',
                httpStatus: 502,
                userMessage: 'The AI provider returned an empty stream. Please try again.',
                retryable: true,
                shouldFallback: true,
                ...ctx,
            });
        }

        const decoder = new TextDecoder();
        let lineBuffer = '';

        return {
            async *[Symbol.asyncIterator]() {
                let yieldCount = 0;
                let lastStopReason = '';
                let finished = false;
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            finished = true;
                            break;
                        }

                        lineBuffer += decoder.decode(value, { stream: true });
                        const lines = lineBuffer.split('\n');
                        lineBuffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            if (!trimmed.startsWith('event: ') && !trimmed.startsWith('data: ')) continue;

                            if (trimmed.startsWith('data: ')) {
                                try {
                                    const json = JSON.parse(trimmed.slice(6)) as {
                                        type?: string;
                                        error?: unknown;
                                        message?: string;
                                        delta?: { text?: string; stop_reason?: string };
                                    };

                                    if (json.error || json.type === 'error') {
                                        throw parseUpstreamProviderError(
                                            'anthropic',
                                            502,
                                            JSON.stringify(json),
                                            undefined,
                                            ctx
                                        );
                                    }

                                    if (json.delta?.stop_reason) {
                                        lastStopReason = json.delta.stop_reason.toLowerCase();
                                    }

                                    if (json.type === 'content_block_delta' && json.delta?.text) {
                                        const content = json.delta.text;
                                        if (yieldCount === 0) {
                                            reqSignal.clearTimeoutOnly();
                                        }
                                        options?.onToken?.(content);
                                        yield content;
                                        yieldCount++;
                                    }
                                } catch (e) {
                                    if (e instanceof AiProviderError) throw e;
                                }
                            }
                        }
                    }

                    if (yieldCount === 0) {
                        if (lastStopReason === 'refusal' || lastStopReason === 'content_filter') {
                            throw createContentFilteredError(ctx, `Anthropic stream blocked (stop_reason=${lastStopReason})`);
                        }
                        throw createEmptyResponseError(
                            ctx,
                            `Anthropic stream yielded 0 tokens (stop_reason=${lastStopReason || 'unknown'})`,
                            lastStopReason === 'max_tokens'
                        );
                    }
                } catch (error) {
                    const classified = classifyFetchError(error, ctx);
                    logger.error('Anthropic stream error', {
                        code: classified.code,
                        model: config.model,
                        provider: config.provider,
                    });
                    throw classified;
                } finally {
                    if (!finished && typeof reader.cancel === 'function') {
                        void reader.cancel().catch(() => {});
                    }
                    reqSignal.cleanup();
                    reader.releaseLock();
                }
            },
        };
    } catch (error: unknown) {
        reqSignal.cleanup();
        throw classifyFetchError(error, ctx);
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
    const reqSignal = buildRequestSignal(options?.signal, options?.timeoutMs);
    const ctx = buildErrorContext(config);

    try {
        const keys = resolveApiKeys(config);
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const geminiContent = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        })).filter(m => m.parts[0].text);

        const generationConfig: Record<string, unknown> = {
            maxOutputTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
        };
        if (options?.responseMimeType) {
            generationConfig.responseMimeType = options.responseMimeType;
        }

        const url = `${normalizeBaseUrl(config.baseUrl)}/v1beta/models/${encodeURIComponent(config.model.replace(/^models\//, ''))}:streamGenerateContent`;
        const allowedUrls = getAllowedUrls(config);

        let response: Response | undefined;

        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];

            try {
                response = await safeFetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': currentKey,
                    },
                    body: JSON.stringify({
                        system_instruction: systemMessage ? {
                            parts: [{ text: systemMessage.content }],
                        } : undefined,
                        contents: geminiContent,
                        generationConfig,
                    }),
                    signal: reqSignal.signal,
                    allowedUrls,
                });
            } catch (error) {
                throw classifyFetchError(error, ctx);
            }

            if (response.ok) {
                break;
            }

            const rawBody = await readResponseTextSafe(response);
            const parsedError = parseUpstreamProviderError(
                'google',
                response.status,
                rawBody,
                response.headers,
                ctx
            );

            if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
                logger.warn('[GEMINI STREAM] Upstream error, rotating to next API key', {
                    model: config.model,
                    status: response.status,
                    keyIndex: i,
                    totalKeys: keys.length,
                });
                continue;
            }

            throw parsedError;
        }

        const reader = response?.body?.getReader();
        if (!reader) {
            throw new AiProviderError({
                code: 'INVALID_RESPONSE',
                httpStatus: 502,
                userMessage: 'The AI provider returned an empty stream. Please try again.',
                retryable: true,
                shouldFallback: true,
                ...ctx,
            });
        }

        const decoder = new TextDecoder();
        let buffer = '';

        return {
            async *[Symbol.asyncIterator]() {
                let yieldCount = 0;
                let lastFinishReason = '';
                let promptBlockReason = '';
                let finished = false;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            finished = true;
                            break;
                        }

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
                                const part = JSON.parse(jsonStr) as {
                                    error?: { code?: number; message?: string };
                                    promptFeedback?: { blockReason?: string };
                                    candidates?: Array<{
                                        finishReason?: string;
                                        content?: {
                                            parts?: Array<{ text?: string; thought?: boolean }>;
                                        };
                                    }>;
                                };

                                if (part.error) {
                                    const code = typeof part.error.code === 'number' && part.error.code >= 400 && part.error.code < 600
                                        ? part.error.code
                                        : 502;
                                    throw parseUpstreamProviderError('google', code, jsonStr, undefined, ctx);
                                }

                                if (part.promptFeedback?.blockReason) {
                                    promptBlockReason = part.promptFeedback.blockReason;
                                }

                                const candidate = part.candidates?.[0];
                                if (candidate?.finishReason) {
                                    lastFinishReason = candidate.finishReason.toUpperCase();
                                }

                                const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
                                const text = parts
                                    .filter((p) => typeof p?.text === 'string' && !p?.thought)
                                    .map((p) => p.text as string)
                                    .join('');

                                if (text) {
                                    if (yieldCount === 0) {
                                        reqSignal.clearTimeoutOnly();
                                    }
                                    options?.onToken?.(text);
                                    yield text;
                                    yieldCount++;
                                }
                            } catch (e) {
                                if (e instanceof AiProviderError) throw e;
                                logger.warn('[GEMINI STREAM] Failed to parse chunk', {
                                    error: e instanceof Error ? e.message : String(e),
                                    model: config.model,
                                });
                            }
                        }
                    }

                    if (yieldCount === 0) {
                        if (
                            promptBlockReason ||
                            ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(lastFinishReason)
                        ) {
                            throw createContentFilteredError(
                                ctx,
                                `Google stream blocked (${promptBlockReason || lastFinishReason})`
                            );
                        }
                        throw createEmptyResponseError(
                            ctx,
                            `Google stream yielded 0 tokens (finishReason=${lastFinishReason || 'unknown'})`,
                            lastFinishReason === 'MAX_TOKENS'
                        );
                    }
                } catch (error) {
                    const classified = classifyFetchError(error, ctx);
                    logger.error('Google stream error', {
                        code: classified.code,
                        model: config.model,
                        provider: config.provider,
                    });
                    throw classified;
                } finally {
                    if (!finished && typeof reader.cancel === 'function') {
                        void reader.cancel().catch(() => {});
                    }
                    reqSignal.cleanup();
                    reader.releaseLock();
                }
            },
        };
    } catch (error: unknown) {
        reqSignal.cleanup();
        throw classifyFetchError(error, ctx);
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

export async function handleError(response: Response): Promise<never> {
    const rawBody = await readResponseTextSafe(response);
    throw parseUpstreamProviderError('openai', response.status, rawBody, response.headers);
}

function resolveCompletionOptions(
    signalOrOptions?: AbortSignal | AiCompletionOptions,
    options?: AiRequestOptions
): AiCompletionOptions {
    if (!signalOrOptions) {
        return options ? { ...options } : {};
    }
    if (
        (typeof AbortSignal !== 'undefined' && signalOrOptions instanceof AbortSignal) ||
        ('aborted' in signalOrOptions && typeof (signalOrOptions as AbortSignal).aborted === 'boolean')
    ) {
        return { ...(options ?? {}), signal: signalOrOptions as AbortSignal };
    }
    return { ...(signalOrOptions as AiCompletionOptions), ...(options ?? {}) };
}

function extractOpenAiResponseText(data: unknown, ctx: UpstreamErrorContext): string {
    const payload = (data && typeof data === 'object' ? data : {}) as {
        error?: { code?: number; message?: string };
        choices?: Array<{
            finish_reason?: string | null;
            message?: {
                reasoning_content?: string;
                content?: string | Array<{ text?: string }>;
            };
        }>;
    };

    if (payload.error) {
        const code = typeof payload.error.code === 'number' && payload.error.code >= 400 && payload.error.code < 600
            ? payload.error.code
            : 502;
        throw parseUpstreamProviderError('openai', code, JSON.stringify(payload), undefined, ctx);
    }

    const choice = payload.choices?.[0];
    const finishReason = String(choice?.finish_reason || '').toLowerCase();
    const message = choice?.message;

    if (finishReason === 'content_filter' || finishReason === 'content_filtered') {
        throw createContentFilteredError(ctx, `OpenAI blocked response (finish_reason=${finishReason})`);
    }

    let contentText = '';
    if (typeof message?.content === 'string') {
        contentText = message.content;
    } else if (Array.isArray(message?.content)) {
        contentText = message.content
            .filter((part) => typeof part?.text === 'string')
            .map((part) => part.text as string)
            .join('');
    }

    let output = '';
    if (message?.reasoning_content && typeof message.reasoning_content === 'string') {
        output += `<details>\n<summary>Thinking Process</summary>\n\n${message.reasoning_content}\n</details>\n\n`;
    }
    output += contentText;

    const trimmed = output.trim();
    if (!trimmed || (!contentText.trim() && finishReason === 'length')) {
        throw createEmptyResponseError(
            ctx,
            `OpenAI empty response (finish_reason=${finishReason || 'unknown'})`,
            finishReason === 'length'
        );
    }

    return trimmed;
}

function extractAnthropicResponseText(data: unknown, ctx: UpstreamErrorContext): string {
    const payload = (data && typeof data === 'object' ? data : {}) as {
        type?: string;
        error?: unknown;
        stop_reason?: string;
        content?: Array<{ type?: string; text?: string }>;
    };

    if (payload.error || payload.type === 'error') {
        throw parseUpstreamProviderError('anthropic', 502, JSON.stringify(payload), undefined, ctx);
    }

    const stopReason = String(payload.stop_reason || '').toLowerCase();
    if (stopReason === 'refusal' || stopReason === 'content_filter') {
        throw createContentFilteredError(ctx, `Anthropic blocked response (stop_reason=${stopReason})`);
    }

    const blocks = Array.isArray(payload.content) ? payload.content : [];
    const text = blocks
        .filter((block) => (!block.type || block.type === 'text') && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('')
        .trim();

    if (!text) {
        throw createEmptyResponseError(
            ctx,
            `Anthropic empty response (stop_reason=${stopReason || 'unknown'})`,
            stopReason === 'max_tokens'
        );
    }

    return text;
}

function extractGoogleResponseText(data: unknown, ctx: UpstreamErrorContext): string {
    const payload = (data && typeof data === 'object' ? data : {}) as {
        error?: { code?: number; message?: string };
        promptFeedback?: { blockReason?: string };
        candidates?: Array<{
            finishReason?: string;
            content?: {
                parts?: Array<{ text?: string; thought?: boolean }>;
            };
        }>;
    };

    if (payload.error) {
        const code = typeof payload.error.code === 'number' && payload.error.code >= 400 && payload.error.code < 600
            ? payload.error.code
            : 502;
        throw parseUpstreamProviderError('google', code, JSON.stringify(payload), undefined, ctx);
    }

    const promptBlockReason = payload.promptFeedback?.blockReason;
    const candidate = payload.candidates?.[0];
    const finishReason = String(candidate?.finishReason || '').toUpperCase();

    if (
        promptBlockReason ||
        ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(finishReason)
    ) {
        throw createContentFilteredError(ctx, `Google blocked response (${promptBlockReason || finishReason})`);
    }

    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
        .filter((part) => typeof part?.text === 'string' && !part?.thought)
        .map((part) => part.text as string)
        .join('')
        .trim();

    if (!text) {
        throw createEmptyResponseError(
            ctx,
            `Google empty response (finishReason=${finishReason || 'unknown'})`,
            finishReason === 'MAX_TOKENS'
        );
    }

    return text;
}

async function parseJsonResponseOrThrow(response: Response, ctx: UpstreamErrorContext): Promise<unknown> {
    try {
        return await response.json();
    } catch (error) {
        throw new AiProviderError({
            code: 'INVALID_RESPONSE',
            httpStatus: 502,
            userMessage: 'The AI provider returned an unreadable response. Please try again.',
            retryable: true,
            shouldFallback: true,
            ...ctx,
            cause: error,
        });
    }
}

export async function generateCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    signalOrOptions?: AbortSignal | AiCompletionOptions,
    options?: AiRequestOptions
): Promise<string> {
    const resolved = resolveCompletionOptions(signalOrOptions, options);
    const reqSignal = buildRequestSignal(resolved.signal, resolved.timeoutMs);
    const ctx = buildErrorContext(config);

    try {
        if (config.provider === 'google') {
            return await generateGoogleCompletion(config, messages, { ...resolved, signal: reqSignal.signal });
        } else if (config.provider === 'anthropic') {
            return await generateAnthropicCompletion(config, messages, { ...resolved, signal: reqSignal.signal });
        } else {
            return await generateOpenAICompletion(config, messages, { ...resolved, signal: reqSignal.signal });
        }
    } catch (error: unknown) {
        throw classifyFetchError(error, ctx);
    } finally {
        reqSignal.cleanup();
    }
}

async function generateOpenAICompletion(
    config: AiConfig,
    messages: unknown[],
    options?: AiCompletionOptions
): Promise<string> {
    const ctx = buildErrorContext(config);
    const response = await fetchOpenAiWithRotation(config, messages, {
        stream: false,
        maxTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        signal: options?.signal,
        logPrefix: '[GEN COMP]',
    });

    const data = await parseJsonResponseOrThrow(response, ctx);
    return extractOpenAiResponseText(data, ctx);
}

async function generateAnthropicCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    options?: AiCompletionOptions
): Promise<string> {
    const keys = resolveApiKeys(config);
    const ctx = buildErrorContext(config);
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    const url = `${normalizeBaseUrl(config.baseUrl)}/v1/messages`;
    const allowedUrls = getAllowedUrls(config);

    let response: Response | undefined;

    for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i];

        try {
            response = await safeFetch(url, {
                method: 'POST',
                signal: options?.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': currentKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: config.model,
                    system: systemMessage?.content,
                    messages: userMessages.map(m => ({ role: m.role, content: m.content })),
                    max_tokens: options?.maxTokens ?? 4096,
                    temperature: options?.temperature ?? 0.7,
                }),
                allowedUrls,
            });
        } catch (error) {
            throw classifyFetchError(error, ctx);
        }

        if (response.ok) break;

        const rawBody = await readResponseTextSafe(response);
        const parsedError = parseUpstreamProviderError(
            'anthropic',
            response.status,
            rawBody,
            response.headers,
            ctx
        );

        if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
            logger.warn('[ANTHROPIC COMP] Upstream error, rotating to next API key', {
                model: config.model,
                status: response.status,
                keyIndex: i,
                totalKeys: keys.length,
            });
            continue;
        }

        throw parsedError;
    }

    if (!response) {
        throw new AiProviderError({
            code: 'PROVIDER_UNAVAILABLE',
            httpStatus: 503,
            userMessage: 'The AI service is temporarily unavailable. Please try again shortly.',
            retryable: true,
            shouldFallback: true,
            ...ctx,
        });
    }

    const data = await parseJsonResponseOrThrow(response, ctx);
    return extractAnthropicResponseText(data, ctx);
}

async function generateGoogleCompletion(
    config: AiConfig,
    messages: ChatMessage[],
    options?: AiCompletionOptions
): Promise<string> {
    const keys = resolveApiKeys(config);
    const ctx = buildErrorContext(config);
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const geminiContent = chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    })).filter(m => m.parts[0].text);

    const generationConfig: Record<string, unknown> = {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
    };
    if (options?.responseMimeType) {
        generationConfig.responseMimeType = options.responseMimeType;
    }

    const url = `${normalizeBaseUrl(config.baseUrl)}/v1beta/models/${encodeURIComponent(config.model.replace(/^models\//, ''))}:generateContent`;
    const allowedUrls = getAllowedUrls(config);

    let response: Response | undefined;

    for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i];

        try {
            response = await safeFetch(url, {
                method: 'POST',
                signal: options?.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': currentKey,
                },
                body: JSON.stringify({
                    system_instruction: systemMessage ? {
                        parts: [{ text: systemMessage.content }],
                    } : undefined,
                    contents: geminiContent,
                    generationConfig,
                }),
                allowedUrls,
            });
        } catch (error) {
            throw classifyFetchError(error, ctx);
        }

        if (response.ok) break;

        const rawBody = await readResponseTextSafe(response);
        const parsedError = parseUpstreamProviderError(
            'google',
            response.status,
            rawBody,
            response.headers,
            ctx
        );

        if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
            logger.warn('[GEMINI COMP] Upstream error, rotating to next API key', {
                model: config.model,
                status: response.status,
                keyIndex: i,
                totalKeys: keys.length,
            });
            continue;
        }

        throw parsedError;
    }

    if (!response) {
        throw new AiProviderError({
            code: 'PROVIDER_UNAVAILABLE',
            httpStatus: 503,
            userMessage: 'The AI service is temporarily unavailable. Please try again shortly.',
            retryable: true,
            shouldFallback: true,
            ...ctx,
        });
    }

    const data = await parseJsonResponseOrThrow(response, ctx);
    return extractGoogleResponseText(data, ctx);
}

function normalizeImageInput(image: AiImageInput): { mimeType: string; rawBase64: string; dataUrl: string } {
    const match = image.base64Data.match(/^data:([^;]+);base64,(.+)$/i);
    if (match) {
        const mimeType = image.mimeType || match[1] || 'image/jpeg';
        const rawBase64 = match[2];
        return {
            mimeType,
            rawBase64,
            dataUrl: `data:${mimeType};base64,${rawBase64}`,
        };
    }

    const mimeType = image.mimeType || 'image/jpeg';
    return {
        mimeType,
        rawBase64: image.base64Data,
        dataUrl: `data:${mimeType};base64,${image.base64Data}`,
    };
}

/**
 * Generate a vision completion (prompt + base64 image) across Google, Anthropic, or OpenAI-compatible endpoints.
 */
export async function generateVisionCompletion(
    config: AiConfig,
    prompt: string,
    image: AiImageInput,
    options?: AiCompletionOptions
): Promise<string> {
    const reqSignal = buildRequestSignal(options?.signal, options?.timeoutMs);
    const ctx = buildErrorContext(config);
    const normalizedImage = normalizeImageInput(image);

    try {
        if (config.provider === 'google') {
            const keys = resolveApiKeys(config);
            const generationConfig: Record<string, unknown> = {
                maxOutputTokens: options?.maxTokens ?? 4096,
                temperature: options?.temperature ?? 0.7,
            };
            if (options?.responseMimeType) {
                generationConfig.responseMimeType = options.responseMimeType;
            }

            const url = `${normalizeBaseUrl(config.baseUrl)}/v1beta/models/${encodeURIComponent(config.model.replace(/^models\//, ''))}:generateContent`;
            const allowedUrls = getAllowedUrls(config);

            let response: Response | undefined;
            for (let i = 0; i < keys.length; i++) {
                try {
                    response = await safeFetch(url, {
                        method: 'POST',
                        signal: reqSignal.signal,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': keys[i],
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        { text: prompt },
                                        {
                                            inlineData: {
                                                mimeType: normalizedImage.mimeType,
                                                data: normalizedImage.rawBase64,
                                            },
                                        },
                                    ],
                                },
                            ],
                            generationConfig,
                        }),
                        allowedUrls,
                    });
                } catch (error) {
                    throw classifyFetchError(error, ctx);
                }

                if (response.ok) break;

                const rawBody = await readResponseTextSafe(response);
                const parsedError = parseUpstreamProviderError(
                    'google',
                    response.status,
                    rawBody,
                    response.headers,
                    ctx
                );

                if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
                    logger.warn('[GEMINI VISION] Upstream error, rotating to next API key', {
                        model: config.model,
                        status: response.status,
                        keyIndex: i,
                        totalKeys: keys.length,
                    });
                    continue;
                }

                throw parsedError;
            }

            if (!response) {
                throw new AiProviderError({
                    code: 'PROVIDER_UNAVAILABLE',
                    httpStatus: 503,
                    userMessage: 'The AI service is temporarily unavailable. Please try again shortly.',
                    retryable: true,
                    shouldFallback: true,
                    ...ctx,
                });
            }

            const data = await parseJsonResponseOrThrow(response, ctx);
            return extractGoogleResponseText(data, ctx);
        }

        if (config.provider === 'anthropic') {
            const keys = resolveApiKeys(config);
            const url = `${normalizeBaseUrl(config.baseUrl)}/v1/messages`;
            const allowedUrls = getAllowedUrls(config);

            let response: Response | undefined;
            for (let i = 0; i < keys.length; i++) {
                try {
                    response = await safeFetch(url, {
                        method: 'POST',
                        signal: reqSignal.signal,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': keys[i],
                            'anthropic-version': '2023-06-01',
                        },
                        body: JSON.stringify({
                            model: config.model,
                            max_tokens: options?.maxTokens ?? 4096,
                            temperature: options?.temperature ?? 0.7,
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'image',
                                            source: {
                                                type: 'base64',
                                                media_type: normalizedImage.mimeType,
                                                data: normalizedImage.rawBase64,
                                            },
                                        },
                                        {
                                            type: 'text',
                                            text: prompt,
                                        },
                                    ],
                                },
                            ],
                        }),
                        allowedUrls,
                    });
                } catch (error) {
                    throw classifyFetchError(error, ctx);
                }

                if (response.ok) break;

                const rawBody = await readResponseTextSafe(response);
                const parsedError = parseUpstreamProviderError(
                    'anthropic',
                    response.status,
                    rawBody,
                    response.headers,
                    ctx
                );

                if (i < keys.length - 1 && (KEY_ROTATION_STATUSES.has(response.status) || parsedError.shouldRotateKey)) {
                    logger.warn('[ANTHROPIC VISION] Upstream error, rotating to next API key', {
                        model: config.model,
                        status: response.status,
                        keyIndex: i,
                        totalKeys: keys.length,
                    });
                    continue;
                }

                throw parsedError;
            }

            if (!response) {
                throw new AiProviderError({
                    code: 'PROVIDER_UNAVAILABLE',
                    httpStatus: 503,
                    userMessage: 'The AI service is temporarily unavailable. Please try again shortly.',
                    retryable: true,
                    shouldFallback: true,
                    ...ctx,
                });
            }

            const data = await parseJsonResponseOrThrow(response, ctx);
            return extractAnthropicResponseText(data, ctx);
        }

        const visionMessages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: normalizedImage.dataUrl,
                        },
                    },
                ],
            },
        ];

        const response = await fetchOpenAiWithRotation(config, visionMessages, {
            stream: false,
            maxTokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.7,
            signal: reqSignal.signal,
            logPrefix: '[OPENAI VISION]',
        });

        const data = await parseJsonResponseOrThrow(response, ctx);
        return extractOpenAiResponseText(data, ctx);
    } catch (error: unknown) {
        throw classifyFetchError(error, ctx);
    } finally {
        reqSignal.cleanup();
    }
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

async function readTestResponseBody(
    res: Response
): Promise<{ rawBody: string; parsedMessage?: string }> {
    if (typeof res.json === 'function') {
        try {
            const data = (await res.json()) as {
                error?: { message?: unknown };
                message?: unknown;
            };
            const parsedMessage =
                typeof data?.error?.message === 'string'
                    ? data.error.message
                    : typeof data?.message === 'string'
                        ? data.message
                        : undefined;
            return {
                rawBody: JSON.stringify(data),
                parsedMessage,
            };
        } catch {
            // Fall back to text body below
        }
    }

    if (typeof res.text === 'function') {
        const text = (await res.text().catch(() => '')) ?? '';
        return {
            rawBody: text,
            parsedMessage: text || undefined,
        };
    }

    return { rawBody: '' };
}

export async function testAiConfig(
    config: AiConfig,
    options?: { statusOnly?: boolean; allowedUrls?: string[] }
): Promise<{ success: boolean; error?: string; errorCode?: AiErrorCode; model?: string }> {
    try {
        const allowedUrls =
            options && 'allowedUrls' in options
                ? options.allowedUrls
                : (config.allowedUrls ?? [config.baseUrl]);
        const statusOnly = options?.statusOnly ?? config.statusOnly ?? false;
        const apiKey = config.apiKey || config.apiKeys?.[0] || '';
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const ctx: UpstreamErrorContext = {
            ...buildErrorContext(config),
            isByok: true,
        };

        if (config.provider === 'google') {
            const url = `${baseUrl}/v1beta/models/${encodeURIComponent(config.model.replace(/^models\//, ''))}`;
            const res = await safeFetch(url, {
                headers: { 'x-goog-api-key': apiKey },
                allowedUrls,
            });
            if (res.ok) return { success: true, model: config.model };

            const { rawBody, parsedMessage } = await readTestResponseBody(res);
            const parsedErr = parseUpstreamProviderError('google', res.status, rawBody, res.headers, ctx);
            if (statusOnly) {
                return { success: false, error: parsedErr.userMessage, errorCode: parsedErr.code };
            }
            const bounded = boundEchoText(parsedMessage ? sanitizeErrorMessage(parsedMessage) : undefined);
            return {
                success: false,
                error: bounded || parsedErr.userMessage,
                errorCode: parsedErr.code,
            };
        }

        if (config.provider === 'anthropic') {
            const res = await safeFetch(`${baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
                allowedUrls,
            });
            if (res.ok) return { success: true, model: config.model };

            const { rawBody, parsedMessage } = await readTestResponseBody(res);
            const parsedErr = parseUpstreamProviderError('anthropic', res.status, rawBody, res.headers, ctx);
            if (statusOnly) {
                return { success: false, error: parsedErr.userMessage, errorCode: parsedErr.code };
            }
            const bounded = boundEchoText(parsedMessage ? sanitizeErrorMessage(parsedMessage) : undefined);
            return {
                success: false,
                error: bounded || parsedErr.userMessage,
                errorCode: parsedErr.code,
            };
        }

        const chatResponse = await safeFetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: 'Hi' }],
                ...(isReasoningModel(config.model) ? { max_completion_tokens: 16 } : { max_tokens: 5 }),
            }),
            allowedUrls,
        });

        if (chatResponse.ok) return { success: true, model: config.model };

        const { rawBody, parsedMessage } = await readTestResponseBody(chatResponse);
        const parsedErr = parseUpstreamProviderError(
            'openai',
            chatResponse.status,
            rawBody,
            chatResponse.headers,
            ctx
        );
        if (statusOnly) {
            return { success: false, error: parsedErr.userMessage, errorCode: parsedErr.code };
        }

        const bounded = boundEchoText(parsedMessage ? sanitizeErrorMessage(parsedMessage) : undefined);
        return {
            success: false,
            error: bounded ? `API returned ${chatResponse.status}: ${bounded}` : parsedErr.userMessage,
            errorCode: parsedErr.code,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('SSRF Protection:')) {
            return { success: false, error: message };
        }
        const classified = classifyFetchError(error, { ...buildErrorContext(config), isByok: true });
        return { success: false, error: classified.userMessage, errorCode: classified.code };
    }
}
