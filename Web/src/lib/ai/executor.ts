/**
 * Unified Fallback AI Executor
 *
 * Executes completion, streaming, and vision requests across resolved
 * CandidateTarget fallback chains, rotating through fallback targets on
 * pre-first-token failures, upstream errors, timeouts, or empty responses.
 */

import { logger } from '@/lib/logging/logger';
import {
    AiProviderError,
    classifyFetchError,
    sanitizeErrorMessage,
    toSafeUserError,
} from './errors';
import {
    AiImageInput,
    AiRequestOptions,
    ChatMessage,
    generateCompletion,
    generateVisionCompletion,
    streamChat,
} from './providers';
import { AiFunction, CandidateTarget, resolveCandidateTargets } from './routing';

export interface ExecutionResult {
    text: string;
    targetUsed: CandidateTarget;
    attempts: number;
}

export interface StreamExecutionResult {
    stream: AsyncGenerator<string>;
    targetUsed: CandidateTarget;
    attempts: number;
}

export type ExecutorRequestOptions = AiRequestOptions & {
    modelOverride?: string;
    signal?: AbortSignal;
};

function toTargetProviderError(error: unknown, target: CandidateTarget): AiProviderError {
    if (error instanceof AiProviderError) {
        return error;
    }

    const safe = toSafeUserError(error);
    const rawMsg = error instanceof Error ? error.message : String(error);

    return new AiProviderError({
        code: safe.code,
        httpStatus: safe.httpStatus,
        userMessage: safe.message,
        retryable: safe.retryable,
        shouldFallback: safe.code !== 'CONTENT_FILTERED',
        retryAfterSeconds: safe.retryAfterSeconds,
        providerId: target.providerId,
        providerSlug: target.providerSlug,
        model: target.model,
        cause: error,
        internalMessage: sanitizeErrorMessage(rawMsg),
    });
}

function selectMostInformativeError(errors: AiProviderError[]): AiProviderError {
    if (errors.length === 0) {
        return new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 503,
            userMessage: 'AI service is not configured. Please contact an administrator or configure your own API key in AI Settings.',
        });
    }
    for (let i = errors.length - 1; i >= 0; i--) {
        if (errors[i].code !== 'INVALID_RESPONSE') {
            return errors[i];
        }
    }
    return errors[errors.length - 1];
}

function buildProviderRequestOptions(options?: ExecutorRequestOptions): AiRequestOptions & { signal?: AbortSignal } {
    if (!options) return {};
    return {
        ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        ...(options.responseMimeType !== undefined ? { responseMimeType: options.responseMimeType } : {}),
        ...(options.signal !== undefined ? { signal: options.signal } : {}),
    };
}

function logFallbackWarning(
    fn: AiFunction,
    target: CandidateTarget,
    error: AiProviderError,
    attempt: number,
    totalCandidates: number
): void {
    logger.warn('[AI Executor] Candidate failed, falling back to next target', {
        fn,
        providerId: target.providerId,
        providerSlug: target.providerSlug,
        model: target.model,
        code: error.code,
        upstreamStatus: error.upstreamStatus,
        attempt,
        totalCandidates,
    });
}

/**
 * Execute a non-streaming text completion with ordered candidate fallback.
 */
export async function executeCompletionWithFallback(
    userId: string,
    fn: AiFunction,
    messages: ChatMessage[],
    options?: ExecutorRequestOptions
): Promise<ExecutionResult> {
    const { candidates } = await resolveCandidateTargets(userId, fn, {
        modelOverride: options?.modelOverride,
    });
    const reqOpts = buildProviderRequestOptions(options);
    const errors: AiProviderError[] = [];

    for (let idx = 0; idx < candidates.length; idx++) {
        const target = candidates[idx];
        const attempts = idx + 1;

        if (options?.signal?.aborted) {
            throw classifyFetchError(
                options.signal.reason ?? new Error('Request aborted'),
                {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                }
            );
        }

        try {
            const text = await generateCompletion(target, messages, reqOpts);
            if (!text || !text.trim()) {
                throw new AiProviderError({
                    code: 'INVALID_RESPONSE',
                    httpStatus: 502,
                    userMessage: 'The AI provider returned an empty response. Please try again.',
                    retryable: true,
                    shouldFallback: true,
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    internalMessage: 'Completion returned empty text',
                });
            }

            return {
                text,
                targetUsed: target,
                attempts,
            };
        } catch (err) {
            if (options?.signal?.aborted) {
                throw classifyFetchError(err, {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                });
            }

            const aiError = toTargetProviderError(err, target);
            errors.push(aiError);

            if (aiError.shouldFallback && idx < candidates.length - 1) {
                logFallbackWarning(fn, target, aiError, attempts, candidates.length);
                continue;
            }

            if (!aiError.shouldFallback) {
                throw aiError;
            }
        }
    }

    throw selectMostInformativeError(errors);
}

/**
 * Execute a streaming chat completion with pre-first-token candidate fallback.
 * Waits for the first non-empty token before returning so `targetUsed` reflects
 * the actual winning candidate and pre-first-token errors fail over cleanly.
 */
export async function executeStreamWithFallback(
    userId: string,
    fn: AiFunction,
    messages: ChatMessage[],
    options?: ExecutorRequestOptions
): Promise<StreamExecutionResult> {
    const { candidates } = await resolveCandidateTargets(userId, fn, {
        modelOverride: options?.modelOverride,
    });
    const reqOpts = buildProviderRequestOptions(options);
    const errors: AiProviderError[] = [];

    for (let idx = 0; idx < candidates.length; idx++) {
        const target = candidates[idx];
        const attempts = idx + 1;

        if (options?.signal?.aborted) {
            throw classifyFetchError(
                options.signal.reason ?? new Error('Request aborted'),
                {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                }
            );
        }

        let iterator: AsyncIterator<string> | undefined;

        try {
            const iterable = await streamChat(target, messages, reqOpts);
            iterator = iterable[Symbol.asyncIterator]();

            let leadingWhitespace = '';
            let firstChunk: string | null = null;
            while (true) {
                const step = await iterator.next();
                if (step.done) {
                    break;
                }
                if (step.value && step.value.length > 0) {
                    if (step.value.trim().length === 0) {
                        leadingWhitespace += step.value;
                    } else {
                        firstChunk = leadingWhitespace + step.value;
                        break;
                    }
                }
            }

            if (firstChunk === null) {
                await iterator.return?.().catch(() => {});
                iterator = undefined;
                throw new AiProviderError({
                    code: 'INVALID_RESPONSE',
                    httpStatus: 502,
                    userMessage: 'The AI provider returned an empty stream. Please try again.',
                    retryable: true,
                    shouldFallback: true,
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    internalMessage: 'Stream completed with zero non-empty chunks',
                });
            }

            const winningIterator = iterator;
            const winningFirstChunk = firstChunk;

            async function* createWinnerStream(): AsyncGenerator<string> {
                try {
                    yield winningFirstChunk;
                    while (true) {
                        const step = await winningIterator.next();
                        if (step.done) break;
                        if (step.value) {
                            yield step.value;
                        }
                    }
                } catch (midStreamErr) {
                    throw toTargetProviderError(midStreamErr, target);
                } finally {
                    await winningIterator.return?.().catch(() => {});
                }
            }

            return {
                stream: createWinnerStream(),
                targetUsed: target,
                attempts,
            };
        } catch (err) {
            if (iterator) {
                await iterator.return?.().catch(() => {});
            }

            if (options?.signal?.aborted) {
                throw classifyFetchError(err, {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                });
            }

            const aiError = toTargetProviderError(err, target);
            errors.push(aiError);

            if (aiError.shouldFallback && idx < candidates.length - 1) {
                logFallbackWarning(fn, target, aiError, attempts, candidates.length);
                continue;
            }

            if (!aiError.shouldFallback) {
                throw aiError;
            }
        }
    }

    throw selectMostInformativeError(errors);
}

/**
 * Execute a vision completion (prompt + image) with ordered candidate fallback.
 */
export async function executeVisionWithFallback(
    userId: string,
    fn: AiFunction,
    prompt: string,
    image: AiImageInput,
    options?: ExecutorRequestOptions
): Promise<ExecutionResult> {
    const { candidates } = await resolveCandidateTargets(userId, fn, {
        modelOverride: options?.modelOverride,
    });
    const reqOpts = buildProviderRequestOptions(options);
    const errors: AiProviderError[] = [];

    for (let idx = 0; idx < candidates.length; idx++) {
        const target = candidates[idx];
        const attempts = idx + 1;

        if (options?.signal?.aborted) {
            throw classifyFetchError(
                options.signal.reason ?? new Error('Request aborted'),
                {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                }
            );
        }

        try {
            const text = await generateVisionCompletion(target, prompt, image, reqOpts);
            if (!text || !text.trim()) {
                throw new AiProviderError({
                    code: 'INVALID_RESPONSE',
                    httpStatus: 502,
                    userMessage: 'The AI provider returned an empty response. Please try again.',
                    retryable: true,
                    shouldFallback: true,
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    internalMessage: 'Vision completion returned empty text',
                });
            }

            return {
                text,
                targetUsed: target,
                attempts,
            };
        } catch (err) {
            if (options?.signal?.aborted) {
                throw classifyFetchError(err, {
                    providerId: target.providerId,
                    providerSlug: target.providerSlug,
                    model: target.model,
                    isByok: target.isByok,
                });
            }

            const aiError = toTargetProviderError(err, target);
            errors.push(aiError);

            if (aiError.shouldFallback && idx < candidates.length - 1) {
                logFallbackWarning(fn, target, aiError, attempts, candidates.length);
                continue;
            }

            if (!aiError.shouldFallback) {
                throw aiError;
            }
        }
    }

    throw selectMostInformativeError(errors);
}
