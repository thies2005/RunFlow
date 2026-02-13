/**
 * AI Provider - OpenAI-compatible adapter with streaming support
 * Supports any OpenAI-compatible endpoint (OpenAI, Anthropic via proxy, local LLMs, etc.)
 */

import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiConfig {
    provider: 'openai' | 'anthropic' | 'google';
    baseUrl: string;
    apiKey: string;
    model: string;
    keyOverride?: boolean;
    providerId?: string;
}

const ALLOWED_BASE_URLS = [
  'https://api.openai.com/v1',
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
] as const;

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
  ];

  return privatePatterns.some(pattern => pattern.test(hostname));
}

export function validateUrl(url: string, allowedBaseUrls: readonly string[] = ALLOWED_BASE_URLS): boolean {
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

    const isAllowedBase = allowedBaseUrls.some(allowed => url.startsWith(allowed));
    return isAllowedBase;
  } catch {
    return false;
  }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (!validateUrl(url, ALLOWED_BASE_URLS)) {
    throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${url}`);
  }

  const response = await fetch(input, init);

  if (!response.ok) {
    return response;
  }

  const finalUrl = response.url;

  if (finalUrl && finalUrl !== url && !validateUrl(finalUrl, ALLOWED_BASE_URLS)) {
    response.body?.cancel();
    throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
  }

  return response;
}

export function validateBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    // Verify exact hostname match to prevent SSRF bypasses
    const allowedHostname = ALLOWED_BASE_URLS
      .map(allowed => new URL(allowed).hostname)
      .some(host => url.hostname === host);
    
    if (!allowedHostname) {
      return false;
    }
    
    // Ensure it starts with the allowed prefix
    return ALLOWED_BASE_URLS.some(allowed => baseUrl.startsWith(allowed));
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
        const decryptedKey = decryptToken(userSettings.customApiKey);
        if (decryptedKey) {
            const baseUrl = userSettings.customBaseUrl || 'https://api.openai.com/v1';
            if (!validateBaseUrl(baseUrl)) {
                logger.warn('[AI Config] Invalid customBaseUrl detected', { baseUrl, userId });
                return null;
            }
            return {
                provider: 'openai', // Custom keys assume OpenAI-compatible for now
                baseUrl,
                apiKey: decryptedKey,
                model: userSettings.customModel || 'gpt-4o-mini',
            };
        }
        // Fall through if decryption failed
    }

    // Check for active provider in Global Settings
    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: { activeProvider: true }
    });

    // 1. Use Active Provider if set
    if (globalSettings?.activeProvider) {
        const decryptedKey = decryptToken(globalSettings.activeProvider.apiKey);
        if (decryptedKey) {
            const baseUrl = globalSettings.activeProvider.baseUrl;
            if (!validateBaseUrl(baseUrl)) {
                logger.warn('[AI Config] Invalid activeProvider.baseUrl detected', { baseUrl, providerId: globalSettings.activeProvider.id });
                return null;
            }
            return {
                provider: globalSettings.activeProvider.type as 'openai' | 'anthropic' | 'google',
                baseUrl,
                apiKey: decryptedKey,
                model: globalSettings.activeProvider.models[0] || 'gpt-4o-mini', // Default to first available model
                providerId: globalSettings.activeProvider.id,
            };
        }
        // Fall through if active provider key is invalid
    }

    // 2. Fallback to Legacy Global Config
    if (globalSettings?.defaultApiKey) {
        const decryptedKey = decryptToken(globalSettings.defaultApiKey);
        if (decryptedKey) {
        const baseUrl = globalSettings.defaultBaseUrl;
        if (!validateBaseUrl(baseUrl)) {
            logger.warn('[AI Config] Invalid defaultBaseUrl detected', { baseUrl });
            return null;
        }
            return {
                provider: 'openai', // Legacy is always OpenAI-compatible
                baseUrl,
                apiKey: decryptedKey,
                model: globalSettings.defaultModel,
            };
        }
    }

    return null;
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
        const response = await safeFetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true,
                // Use max_completion_tokens for reasoning models if applicable, else max_tokens
                ...(config.model.includes('kimi') || config.model.includes('deepseek') || config.model.includes('reasoning') || config.model.includes('o1')
                    ? { max_completion_tokens: 4096 }
                    : { max_tokens: 4096 }),
                temperature: 0.7,
            }),
            signal: options?.signal,
        });

        if (!response.ok) {
            await handleError(response);
        }

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
                        const bytesRead = value?.length || 0;

                        if (done) {
                            logger.info('[OPENAI STREAM] Reader done', { chunkCount, yieldCount, model: config.model });
                            break;
                        }

                        if (chunkCount % 5 === 0) {
                            logger.info('[OPENAI STREAM] Processing chunks', { chunkCount, bytesRead, bufferSize: lineBuffer.length, model: config.model });
                        }

                        lineBuffer += decoder.decode(value, { stream: true });
                        const lines = lineBuffer.split('\n');
                        lineBuffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || trimmed === 'data: [DONE]') continue;
                            if (!trimmed.startsWith('data: ')) continue;

                            try {
                                const json = JSON.parse(trimmed.slice(6));

                                if (json.error) {
                                    const errorMsg = json.error.message || JSON.stringify(json.error);
                                    logger.error('[OPENAI STREAM] Provider error', { error: errorMsg, model: config.model, provider: config.provider });
                                    throw new Error(`OpenAI provider error: ${errorMsg}`);
                                }

                                const delta = json.choices?.[0]?.delta;
                                if (!delta) continue;

                                if (delta.reasoning_content) {
                                    if (!isReasoning) {
                                        yield '<think>';
                                        yieldCount++;
                                        isReasoning = true;
                                    }
                                    options?.onToken?.(delta.reasoning_content);
                                    yield delta.reasoning_content;
                                    yieldCount++;
                                }

                                if (delta.content) {
                                    if (isReasoning) {
                                        yield '</think>';
                                        yieldCount++;
                                        isReasoning = false;
                                    }
                                    options?.onToken?.(delta.content);
                                    yield delta.content;
                                    yieldCount++;
                                }
                            } catch (error) {
                                if (error instanceof Error && error.message.startsWith('OpenAI provider error:')) {
                                    throw error;
                                }
                                logger.warn('[OPENAI STREAM] Skipped invalid JSON line', { line: trimmed, model: config.model });
                            }
                        }
                    }
                } catch (error) {
                    logger.error('[OPENAI STREAM] Error in iterator', { error: error instanceof Error ? error.message : String(error), model: config.model, provider: config.provider, chunkCount, yieldCount });
                    throw error;
                } finally {
                    // M-07 fix: Use matching closing tag </think> instead of </thinking>
                    if (isReasoning) {
                        yield '</think>';
                        yieldCount++;
                    }
                    logger.info('[OPENAI STREAM] Cleanup', { yieldCount, model: config.model });
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

        const response = await safeFetch(`${config.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
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
        });

        if (!response.ok) {
            await handleError(response);
        }

        const reader = response.body?.getReader();
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

        const url = `${config.baseUrl}/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}`;

        const response = await safeFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        });

        if (!response.ok) {
            await handleError(response);
        }

        const reader = response.body?.getReader();
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
    messages: ChatMessage[]
): Promise<string> {
    try {
        const response = await safeFetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });
        if (!response.ok) await handleError(response);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error: unknown) {
        handlePermissionError(error, config);
        throw error;
    }
}

export async function testAiConfig(config: AiConfig): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
        if (config.provider === 'google') {
            const url = `${config.baseUrl}/v1beta/models/${config.model}?key=${config.apiKey}`;
            const res = await safeFetch(url);
            if (res.ok) return { success: true, model: config.model };
            const data = await res.json();
            return { success: false, error: data.error?.message || 'Google API Error' };
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
                })
            });
            if (res.ok) return { success: true, model: config.model };
            const data = await res.json();
            return { success: false, error: data.error?.message || 'Anthropic API Error' };
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
        });
        if (chatResponse.ok) return { success: true, model: config.model };
        let errorMessage = `API returned ${chatResponse.status}`;
        try {
            const data = await chatResponse.json();
            if (data.error?.message) errorMessage += `: ${data.error.message}`;
        } catch {
            const text = await chatResponse.text();
            if (text) errorMessage += `: ${text}`;
        }
        return { success: false, error: errorMessage };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
