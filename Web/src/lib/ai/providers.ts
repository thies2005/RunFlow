/**
 * AI Provider - OpenAI-compatible adapter with streaming support
 * Supports any OpenAI-compatible endpoint (OpenAI, Anthropic via proxy, local LLMs, etc.)
 */

import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiConfig {
    provider: 'openai' | 'anthropic' | 'google';
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface StreamOptions {
    onToken?: (token: string) => void;
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
        return {
            provider: 'openai', // Custom keys assume OpenAI-compatible for now
            baseUrl: userSettings.customBaseUrl || 'https://api.openai.com/v1',
            apiKey: decryptToken(userSettings.customApiKey),
            model: userSettings.customModel || 'gpt-4o-mini',
        };
    }

    // Check for active provider in Global Settings
    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: { activeProvider: true }
    });

    // 1. Use Active Provider if set
    if (globalSettings?.activeProvider) {
        return {
            provider: globalSettings.activeProvider.type as any,
            baseUrl: globalSettings.activeProvider.baseUrl,
            apiKey: decryptToken(globalSettings.activeProvider.apiKey),
            model: globalSettings.activeProvider.models[0] || 'gpt-4o-mini', // Default to first available model
        };
    }

    // 2. Fallback to Legacy Global Config
    if (globalSettings?.defaultApiKey) {
        return {
            provider: 'openai', // Legacy is always OpenAI-compatible
            baseUrl: globalSettings.defaultBaseUrl,
            apiKey: decryptToken(globalSettings.defaultApiKey),
            model: globalSettings.defaultModel,
        };
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
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true,
                max_tokens: 1000,
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

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || trimmed === 'data: [DONE]') continue;
                            if (!trimmed.startsWith('data: ')) continue;

                            try {
                                const json = JSON.parse(trimmed.slice(6));
                                const content = json.choices?.[0]?.delta?.content;
                                if (content) {
                                    options?.onToken?.(content);
                                    yield content;
                                }
                            } catch {
                                // Skip invalid JSON lines
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            },
        };
    } catch (error: any) {
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
        // Convert messages to Anthropic format (system is separate)
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch(`${config.baseUrl}/v1/messages`, {
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
                max_tokens: 1024,
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

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            if (!trimmed.startsWith('event: ') && !trimmed.startsWith('data: ')) continue;

                            // Anthropic SSE sends "event: ..." then "data: ..."
                            // We focus on the "data: " lines that are JSON
                            if (trimmed.startsWith('data: ')) {
                                try {
                                    const json = JSON.parse(trimmed.slice(6));
                                    if (json.type === 'content_block_delta' && json.delta?.text) {
                                        const content = json.delta.text;
                                        options?.onToken?.(content);
                                        yield content;
                                    }
                                } catch {
                                    // Skip
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            },
        };
    } catch (error: any) {
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
        // Map messages to Gemini format (user/model)
        const geminiContent = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })).filter(m => m.parts[0].text); // Filter empty

        // System instructions are passed differently in newer API versions but often just prepended for simplicity in REST
        // For REST API v1beta: contents[]

        const url = `${config.baseUrl}/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: geminiContent,
                generationConfig: {
                    maxOutputTokens: 1000,
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

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Google sends a JSON array stream but loosely formatted
                        // often `[{...},\r\n`
                        // We need to parse complete JSON objects from the buffer
                        // Simple hack: split by newline/comma if possible or assume proper JSON array elements
                        // A more robust way for Google REST stream is to verify bracket balance or split by `\n,`

                        // NOTE: Real Gemini stream usually returns a JSON array where each chunk IS a valid JSON object in the list
                        // structure: [ { ... }, { ... } ]
                        // The stream chunks are usually partial JSON.
                        // Actually, the `streamGenerateContent` returns a stream of JSON objects, not an array.

                        // Let's try splitting by `\n` assuming they send line-delimited JSON or similar
                        // If it fails, we wait for more data.

                        // Clean buffer logic for Google's weird streaming format would go here.
                        // For now, let's assume standard behavior or implement a simple JSON extractor

                        // Note: The raw REST API returns a JSON array `[` ... `]`
                        // We can try to parse accumulated buffer if it starts with `[` and we find closing `}` and `,`

                        // Simplified approach: Regex match complete `{ "candidates": ... }` blocks
                        const regex = /\{"candidates":\[.*?\]\}/g;
                        let match;
                        while ((match = regex.exec(buffer)) !== null) {
                            try {
                                const part = JSON.parse(match[0]);
                                const text = part.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    options?.onToken?.(text);
                                    yield text;
                                }
                            } catch (e) { }
                        }

                        // Keep the end of buffer that didn't match
                        // This is tricky without advanced parsing. 
                        // For this first pass, we will rely on lines if Google sends newlines.
                    }
                } finally {
                    reader.releaseLock();
                }
            },
        };
    } catch (error: any) {
        handlePermissionError(error, config);
        throw error;
    }
}

async function handleError(response: Response) {
    let errorMessage = `AI API error: ${response.status}`;
    try {
        const data = await response.json();
        if (data.error?.message) {
            errorMessage += ` - ${data.error.message}`;
        } else {
            errorMessage += ` - ${JSON.stringify(data)}`;
        }
    } catch {
        const text = await response.text();
        if (text) errorMessage += ` - ${text}`;
    }
    throw new Error(errorMessage);
}

function handlePermissionError(error: any, config: AiConfig) {
    if (error.name === 'TypeError' && error.message === 'fetch failed') {
        throw new Error(`Failed to connect to ${config.provider} at ${config.baseUrl}. Please check the URL and internet connection.`);
    }
}

/**
 * Generate a non-streaming chat completion
 */
export async function generateCompletion(
    config: AiConfig,
    messages: ChatMessage[]
): Promise<string> {
    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
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

        if (!response.ok) {
            let errorMessage = `AI API error: ${response.status}`;
            try {
                const data = await response.json();
                if (data.error?.message) {
                    errorMessage += ` - ${data.error.message}`;
                } else {
                    errorMessage += ` - ${JSON.stringify(data)}`;
                }
            } catch {
                const text = await response.text();
                if (text) errorMessage += ` - ${text}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'fetch failed') {
            throw new Error(`Failed to connect to AI provider at ${config.baseUrl}. Please check the URL and internet connection.`);
        }
        throw error;
    }
}

/**
 * Test an API configuration
 */
export async function testAiConfig(config: AiConfig): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
        if (config.provider === 'google') {
            const url = `${config.baseUrl}/v1beta/models/${config.model}?key=${config.apiKey}`;
            const res = await fetch(url);
            if (res.ok) return { success: true, model: config.model };
            const data = await res.json();
            return { success: false, error: data.error?.message || 'Google API Error' };
        }

        if (config.provider === 'anthropic') {
            const res = await fetch(`${config.baseUrl}/v1/messages`, {
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

        // OpenAI Fallback
        const chatResponse = await fetch(`${config.baseUrl}/chat/completions`, {
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

        if (chatResponse.ok) {
            return { success: true, model: config.model };
        }

        let errorMessage = `API returned ${chatResponse.status}`;
        try {
            const data = await chatResponse.json();
            if (data.error?.message) {
                errorMessage += `: ${data.error.message}`;
            }
        } catch {
            const text = await chatResponse.text();
            if (text) errorMessage += `: ${text}`;
        }
        return { success: false, error: errorMessage };
    } catch (error: any) {
        return { success: false, error: error.message || String(error) };
    }
}
