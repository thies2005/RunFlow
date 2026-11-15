/**
 * Typed AI Error Taxonomy & Upstream Error Normalization
 *
 * Centralizes all AI provider, quota, routing, and transport errors so callers
 * can make deterministic key-rotation and fallback decisions while never leaking
 * secrets, stack traces, or raw upstream JSON payloads to clients.
 */

export type AiErrorCode =
    | 'NOT_CONFIGURED'
    | 'AI_DISABLED'
    | 'USER_LIMIT_REACHED'
    | 'PROVIDER_QUOTA_EXCEEDED'
    | 'RATE_LIMITED'
    | 'AUTH_FAILED'
    | 'MODEL_NOT_FOUND'
    | 'CONTEXT_TOO_LONG'
    | 'CONTENT_FILTERED'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'PROVIDER_UNAVAILABLE'
    | 'INVALID_RESPONSE';

export type AiProviderType = 'openai' | 'anthropic' | 'google';

export interface AiProviderErrorOptions {
    code: AiErrorCode;
    httpStatus: number;
    userMessage: string;
    retryable?: boolean;
    shouldFallback?: boolean;
    shouldRotateKey?: boolean;
    retryAfterSeconds?: number;
    providerId?: string;
    providerSlug?: string;
    model?: string;
    upstreamStatus?: number;
    cause?: unknown;
    internalMessage?: string;
}

export class AiProviderError extends Error {
    readonly code: AiErrorCode;
    readonly httpStatus: number;
    readonly userMessage: string;
    readonly retryable: boolean;
    readonly shouldFallback: boolean;
    readonly shouldRotateKey: boolean;
    readonly retryAfterSeconds?: number;
    readonly providerId?: string;
    readonly providerSlug?: string;
    readonly model?: string;
    readonly upstreamStatus?: number;
    override readonly cause?: unknown;

    constructor(options: AiProviderErrorOptions) {
        super(
            options.internalMessage || options.userMessage,
            options.cause !== undefined ? { cause: options.cause } : undefined
        );
        this.name = 'AiProviderError';
        Object.setPrototypeOf(this, AiProviderError.prototype);

        this.code = options.code;
        this.httpStatus = options.httpStatus;
        this.userMessage = options.userMessage;
        this.retryable = options.retryable ?? false;
        this.shouldFallback = options.shouldFallback ?? false;
        this.shouldRotateKey = options.shouldRotateKey ?? false;
        this.retryAfterSeconds = options.retryAfterSeconds;
        this.providerId = options.providerId;
        this.providerSlug = options.providerSlug;
        this.model = options.model;
        this.upstreamStatus = options.upstreamStatus;
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export interface UpstreamErrorContext {
    providerId?: string;
    providerSlug?: string;
    model?: string;
    isByok?: boolean;
}

export interface SafeUserError {
    message: string;
    code: AiErrorCode;
    httpStatus: number;
    retryAfterSeconds?: number;
    retryable: boolean;
}

interface ParsedUpstreamDetails {
    message: string;
    code: string;
    type: string;
    statusText: string;
    reasons: string[];
    retryDelaySeconds?: number;
}

function getHeaderCaseInsensitive(
    headers: Headers | Record<string, string | undefined> | undefined,
    name: string
): string | undefined {
    if (!headers) return undefined;
    if (typeof (headers as Headers).get === 'function') {
        return (headers as Headers).get(name) ?? undefined;
    }
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(headers as Record<string, string | undefined>)) {
        if (key.toLowerCase() === target && typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function parseRetryAfterHeader(
    headers: Headers | Record<string, string | undefined> | undefined
): number | undefined {
    const raw = getHeaderCaseInsensitive(headers, 'retry-after');
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
        return Math.max(1, Math.ceil(numeric));
    }

    const parsedDate = Date.parse(trimmed);
    if (Number.isFinite(parsedDate)) {
        const deltaSeconds = Math.ceil((parsedDate - Date.now()) / 1000);
        if (deltaSeconds > 0) {
            return deltaSeconds;
        }
    }

    return undefined;
}

function parseRetryDelayString(value: unknown): number | undefined {
    if (typeof value !== 'string') return undefined;
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*s$/i);
    if (!match) return undefined;
    const seconds = Number(match[1]);
    return Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.ceil(seconds)) : undefined;
}

function extractUpstreamDetails(rawBody: string): ParsedUpstreamDetails {
    const fallback: ParsedUpstreamDetails = {
        message: rawBody.slice(0, 1000),
        code: '',
        type: '',
        statusText: '',
        reasons: [],
    };

    if (!rawBody || !rawBody.trim()) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(rawBody);
        const root = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!root || typeof root !== 'object') {
            return fallback;
        }

        const errObj =
            root.error && typeof root.error === 'object'
                ? root.error
                : root;

        const messageParts: string[] = [];
        if (typeof errObj.message === 'string') messageParts.push(errObj.message);
        if (typeof root.message === 'string' && root.message !== errObj.message) {
            messageParts.push(root.message);
        }
        if (typeof errObj.metadata?.raw === 'string') {
            messageParts.push(errObj.metadata.raw);
        }

        const reasons: string[] = [];
        let retryDelaySeconds: number | undefined;
        if (Array.isArray(errObj.details)) {
            for (const detail of errObj.details) {
                if (!detail || typeof detail !== 'object') continue;
                if (typeof detail.reason === 'string') {
                    reasons.push(detail.reason);
                }
                if (retryDelaySeconds === undefined && detail.retryDelay !== undefined) {
                    retryDelaySeconds = parseRetryDelayString(detail.retryDelay);
                }
            }
        }

        return {
            message: messageParts.join(' ').trim() || fallback.message,
            code: typeof errObj.code === 'string' || typeof errObj.code === 'number' ? String(errObj.code) : '',
            type: typeof errObj.type === 'string' ? errObj.type : '',
            statusText: typeof errObj.status === 'string' ? errObj.status : '',
            reasons,
            retryDelaySeconds,
        };
    } catch {
        return fallback;
    }
}

/**
 * Map an HTTP status and raw body from an upstream AI provider to a typed AiProviderError.
 * Safe against non-JSON, empty, or malformed upstream payloads.
 */
export function parseUpstreamProviderError(
    _providerType: AiProviderType,
    status: number,
    rawBody: string,
    headers?: Headers | Record<string, string | undefined>,
    ctx?: UpstreamErrorContext
): AiProviderError {
    const details = extractUpstreamDetails(rawBody);
    const retryAfterSeconds = parseRetryAfterHeader(headers) ?? details.retryDelaySeconds;

    const combinedText = [
        details.message,
        details.code,
        details.type,
        details.statusText,
        ...details.reasons,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    const baseCtx = {
        providerId: ctx?.providerId,
        providerSlug: ctx?.providerSlug,
        model: ctx?.model,
        upstreamStatus: status,
        internalMessage: `Upstream ${status} (${ctx?.providerSlug || _providerType}${ctx?.model ? `/${ctx.model}` : ''}): ${sanitizeErrorMessage(details.message || rawBody.slice(0, 300))}`,
    };

    const isByok = Boolean(ctx?.isByok);

    // 1. Auth / Permission failures (401, 403, or Google 400 API_KEY_INVALID)
    const isGoogleKeyInvalid =
        details.reasons.some((r) => r.toUpperCase() === 'API_KEY_INVALID') ||
        /api[_\s]?key.*(invalid|not valid|expired|revoked)|invalid[_\s]?api[_\s]?key|incorrect api key/i.test(combinedText);

    if (
        status === 401 ||
        status === 403 ||
        details.statusText === 'UNAUTHENTICATED' ||
        details.statusText === 'PERMISSION_DENIED' ||
        details.type === 'authentication_error' ||
        details.type === 'permission_error' ||
        details.code === 'invalid_api_key' ||
        isGoogleKeyInvalid
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'AUTH_FAILED',
            httpStatus: isByok ? (status === 403 ? 403 : 401) : 502,
            userMessage: isByok
                ? 'Your API key was rejected by the provider. Please check your AI settings.'
                : 'AI service authentication failed with provider. Please try again later or contact support.',
            retryable: false,
            shouldFallback: true,
            shouldRotateKey: true,
        });
    }

    // 2. Provider Quota / Credits exhausted (402, OpenAI insufficient_quota, OpenRouter credits, Google quota)
    const hasQuotaExhaustionSignal =
        status === 402 ||
        details.code === 'insufficient_quota' ||
        details.type === 'insufficient_quota' ||
        details.code === 'billing_hard_limit_reached' ||
        /insufficient[_\s]?quota|exceeded your current quota|insufficient credits|more credits|requires more credits|credit balance is too low|billing.*limit|quota exceeded/i.test(
            combinedText
        );

    if (hasQuotaExhaustionSignal) {
        return new AiProviderError({
            ...baseCtx,
            code: 'PROVIDER_QUOTA_EXCEEDED',
            httpStatus: isByok ? 402 : 503,
            userMessage: isByok
                ? 'Your AI provider account has insufficient quota or credits. Please check your billing with the provider.'
                : 'The AI provider quota has been exceeded. Please try again later.',
            retryable: false,
            shouldFallback: true,
            shouldRotateKey: true,
        });
    }

    // 3. Rate Limited (429, Anthropic rate_limit_error, Gemini RESOURCE_EXHAUSTED without quota text)
    if (
        status === 429 ||
        details.type === 'rate_limit_error' ||
        details.code === 'rate_limit_exceeded' ||
        details.statusText === 'RESOURCE_EXHAUSTED'
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'RATE_LIMITED',
            httpStatus: 429,
            userMessage: retryAfterSeconds
                ? `AI provider rate limit reached. Please wait ${retryAfterSeconds}s and try again.`
                : 'AI provider is temporarily rate-limited. Please try again in a moment.',
            retryable: true,
            shouldFallback: true,
            shouldRotateKey: true,
            retryAfterSeconds,
        });
    }

    // 4. Content / Safety Filter
    if (
        details.code === 'content_filter' ||
        details.type === 'content_filter' ||
        /content[_\s]?filter|content[_\s]?policy|prohibited[_\s]?content|blocked by.*safety|finish[_\s]?reason.*\b(safety|recitation)\b|output blocked by content filtering/i.test(
            combinedText
        )
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'CONTENT_FILTERED',
            httpStatus: 422,
            userMessage: 'The AI provider declined to respond due to content safety policies. Please rephrase your request.',
            retryable: false,
            shouldFallback: false,
            shouldRotateKey: false,
        });
    }

    // 5. Context Length Exceeded
    if (
        status === 413 ||
        details.code === 'context_length_exceeded' ||
        /context[_\s]?length[_\s]?exceeded|maximum context length|max.*tokens.*exceeded|prompt is too long|too many tokens|input.*too long|exceeds the maximum number of tokens/i.test(
            combinedText
        )
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'CONTEXT_TOO_LONG',
            httpStatus: 400,
            userMessage: 'The request is too long for the selected AI model. Try shortening your message or starting a new conversation.',
            retryable: false,
            shouldFallback: true,
            shouldRotateKey: false,
        });
    }

    // 6. Model Not Found / Unsupported Model
    if (
        status === 404 ||
        details.code === 'model_not_found' ||
        details.type === 'not_found_error' ||
        details.statusText === 'NOT_FOUND' ||
        (status === 400 &&
            /model.*not found|does not exist|invalid model|unknown model|not a valid model|no endpoints found|not supported for generatecontent/i.test(
                combinedText
            ))
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'MODEL_NOT_FOUND',
            httpStatus: 502,
            userMessage: isByok
                ? 'The configured AI model was not found or is not supported by your provider. Check your model name in AI Settings.'
                : 'The configured AI model is currently unavailable. Please try again later.',
            retryable: false,
            shouldFallback: true,
            shouldRotateKey: false,
        });
    }

    // 7. Timeouts (408, 504)
    if (status === 408 || status === 504 || details.statusText === 'DEADLINE_EXCEEDED') {
        return new AiProviderError({
            ...baseCtx,
            code: 'TIMEOUT',
            httpStatus: 504,
            userMessage: 'The AI provider took too long to respond. Please try again.',
            retryable: true,
            shouldFallback: true,
            shouldRotateKey: false,
        });
    }

    // 8. Provider Unavailable / Overloaded (500, 502, 503, 529)
    if (
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 529 ||
        details.type === 'overloaded_error' ||
        details.statusText === 'UNAVAILABLE' ||
        details.statusText === 'INTERNAL'
    ) {
        return new AiProviderError({
            ...baseCtx,
            code: 'PROVIDER_UNAVAILABLE',
            httpStatus: 503,
            userMessage: 'The AI service is temporarily unavailable or overloaded. Please try again shortly.',
            retryable: true,
            shouldFallback: true,
            shouldRotateKey: status === 503,
        });
    }

    // 9. Other 4xx bad request / invalid response
    if (status >= 400 && status < 500) {
        return new AiProviderError({
            ...baseCtx,
            code: 'INVALID_RESPONSE',
            httpStatus: isByok ? 400 : 502,
            userMessage: isByok
                ? 'The AI provider rejected the request. Please check your model and provider configuration in AI Settings.'
                : 'The AI provider could not process this request. Please try again.',
            retryable: false,
            shouldFallback: true,
            shouldRotateKey: false,
        });
    }

    return new AiProviderError({
        ...baseCtx,
        code: 'PROVIDER_UNAVAILABLE',
        httpStatus: 503,
        userMessage: 'The AI service encountered an unexpected error. Please try again shortly.',
        retryable: status >= 500,
        shouldFallback: true,
        shouldRotateKey: false,
    });
}

/**
 * Classify transport/fetch errors (AbortError, TimeoutError, network failures) into AiProviderError.
 */
export function classifyFetchError(error: unknown, ctx?: UpstreamErrorContext): AiProviderError {
    if (error instanceof AiProviderError) {
        return error;
    }

    const errName = error instanceof Error ? error.name : '';
    const errMsg = error instanceof Error ? error.message : String(error);

    if (
        errName === 'AbortError' ||
        errName === 'TimeoutError' ||
        /\b(timed out|timeout|aborted)\b/i.test(errMsg)
    ) {
        return new AiProviderError({
            code: 'TIMEOUT',
            httpStatus: 504,
            userMessage: 'The AI provider took too long to respond. Please try again.',
            retryable: true,
            shouldFallback: true,
            shouldRotateKey: false,
            providerId: ctx?.providerId,
            providerSlug: ctx?.providerSlug,
            model: ctx?.model,
            cause: error,
            internalMessage: sanitizeErrorMessage(errMsg),
        });
    }

    return new AiProviderError({
        code: 'NETWORK_ERROR',
        httpStatus: 503,
        userMessage: 'Could not reach the AI provider. Please try again shortly.',
        retryable: true,
        shouldFallback: true,
        shouldRotateKey: false,
        providerId: ctx?.providerId,
        providerSlug: ctx?.providerSlug,
        model: ctx?.model,
        cause: error,
        internalMessage: sanitizeErrorMessage(errMsg),
    });
}

/**
 * Strip `Error:` prefixes, stack traces, API keys, Bearer tokens, and embedded JSON blobs.
 */
export function sanitizeErrorMessage(raw: string): string {
    if (!raw) return '';

    let cleaned = raw
        // Strip stack trace lines
        .replace(/\r?\n\s+at\s+[\s\S]*/g, '')
        // Strip leading "Error:" / "TypeError:" etc.
        .replace(/^(?:[A-Za-z]*Error:\s*)+/i, '')
        // Redact Bearer tokens, API key query params, and API key headers
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
        .replace(/([?&](?:api_)?key)=[^&\s"']+/gi, '$1=[REDACTED]')
        .replace(/(\bx-(?:goog-)?api-key\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1[REDACTED]')
        // Redact common API key prefixes (OpenAI, Anthropic, Google, NVIDIA, Groq, xAI, OpenRouter)
        .replace(/\bsk-(?:proj-|ant-|or-v1-)?[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
        .replace(/\bAIza[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_KEY]')
        .replace(/\bnvapi-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
        .replace(/\bgsk_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
        .replace(/\bxai-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
        // Strip embedded raw JSON error objects/arrays
        .replace(/\{[\s\S]*"(?:error|message|status|code)"[\s\S]*\}/g, '')
        .trim();

    // Collapse extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

/**
 * Convert any thrown value into a safe user-facing error descriptor.
 * Guarantees no API keys, stack traces, `Error:` prefixes, or raw JSON leak to callers.
 */
export function toSafeUserError(error: unknown): SafeUserError {
    if (error instanceof AiProviderError) {
        const sanitized = sanitizeErrorMessage(error.userMessage);
        return {
            message: sanitized || 'An AI service error occurred. Please try again.',
            code: error.code,
            httpStatus: error.httpStatus,
            ...(error.retryAfterSeconds !== undefined
                ? { retryAfterSeconds: error.retryAfterSeconds }
                : {}),
            retryable: error.retryable,
        };
    }

    const errName = error instanceof Error ? error.name : '';
    const rawMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    const lower = rawMsg.toLowerCase();

    if (errName === 'AbortError' || errName === 'TimeoutError' || /\b(timed out|timeout)\b/.test(lower)) {
        return {
            message: 'The AI request timed out. Please try again.',
            code: 'TIMEOUT',
            httpStatus: 504,
            retryable: true,
        };
    }

    if (
        (error instanceof TypeError && lower.includes('fetch')) ||
        /\b(econnrefused|enotfound|econnreset|etimedout|network|failed to connect|ssrf protection)\b/.test(lower)
    ) {
        return {
            message: 'Could not reach the AI provider. Please try again shortly.',
            code: 'NETWORK_ERROR',
            httpStatus: 503,
            retryable: true,
        };
    }

    if (/\b429\b|rate.?limit|too many requests/.test(lower)) {
        return {
            message: 'AI provider is temporarily rate-limited. Please try again in a moment.',
            code: 'RATE_LIMITED',
            httpStatus: 429,
            retryable: true,
        };
    }

    if (/\b503\b|overloaded|temporarily unavailable/.test(lower)) {
        return {
            message: 'The AI service is temporarily unavailable. Please try again shortly.',
            code: 'PROVIDER_UNAVAILABLE',
            httpStatus: 503,
            retryable: true,
        };
    }

    if (/\b401\b|\b403\b|unauthorized|invalid.?api.?key|authentication/.test(lower)) {
        return {
            message: 'AI provider authentication failed. Please check your configuration or try again later.',
            code: 'AUTH_FAILED',
            httpStatus: 502,
            retryable: false,
        };
    }

    return {
        message: 'An unexpected AI service error occurred. Please try again.',
        code: 'PROVIDER_UNAVAILABLE',
        httpStatus: 500,
        retryable: true,
    };
}
