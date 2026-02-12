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
    keyOverride?: boolean;
    providerId?: string;
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
        const decryptedKey = decryptToken(userSettings.customApiKey);
        if (decryptedKey) {
            return {
                provider: 'openai', // Custom keys assume OpenAI-compatible for now
                baseUrl: userSettings.customBaseUrl || 'https://api.openai.com/v1',
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
            return {
                provider: globalSettings.activeProvider.type as any,
                baseUrl: globalSettings.activeProvider.baseUrl,
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
            return {
                provider: 'openai', // Legacy is always OpenAI-compatible
                baseUrl: globalSettings.defaultBaseUrl,
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
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        lineBuffer += decoder.decode(value, { stream: true });
                        const lines = lineBuffer.split('\n');
                        lineBuffer = lines.pop() || ''; // Keep the partial line for the next chunk

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || trimmed === 'data: [DONE]') continue;
                            if (!trimmed.startsWith('data: ')) continue;

                            try {
                                const json = JSON.parse(trimmed.slice(6));
                                const delta = json.choices?.[0]?.delta;

                                // Support reasoning_content (used by Kimi, DeepSeek, NVIDIA NIM)
                                if (delta?.reasoning_content) {
                                    if (!isReasoning) {
                                        yield '<think>';
                                        isReasoning = true;
                                    }
                                    options?.onToken?.(delta.reasoning_content);
                                    yield delta.reasoning_content;
                                }

                                // Standard content
                                if (delta?.content) {
                                    if (isReasoning) {
                                        yield '</think>';
                                        isReasoning = false;
                                    }
                                    options?.onToken?.(delta.content);
                                    yield delta.content;
                                }
                            } catch {
                                // Skip invalid JSON lines
                            }
                        }
                    }
                } finally {
                    if (isReasoning) {
                        yield '</think>';
                    }
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
        // Separate system message for Gemini's system_instruction field
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        // Map messages to Gemini format (user/model)
        const geminiContent = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })).filter(m => m.parts[0].text);

        const url = `${config.baseUrl}/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}`;

        const response = await fetch(url, {
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

                        /**
                         * Gemini REST stream returns a JSON array:
                         * [
                         *   { "candidates": [...] },
                         *   { "candidates": [...] }
                         * ]
                         * Each chunk may contain partial objects.
                         */

                        // Remove leading '[' if present (start of array)
                        if (buffer.startsWith('[')) {
                            buffer = buffer.slice(1);
                        }

                        // Try to extract full JSON objects
                        // We look for objects starting with '{' and ending with '}' 
                        // that are followed by a comma or the end of the array.
                        let boundary;
                        while ((boundary = findJsonBoundary(buffer)) !== -1) {
                            const jsonStr = buffer.slice(0, boundary + 1);
                            buffer = buffer.slice(boundary + 1);

                            // Clean up leading comma or whitespace for the next object
                            buffer = buffer.replace(/^\s*,\s*/, '');

                            try {
                                const part = JSON.parse(jsonStr);
                                const text = part.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    options?.onToken?.(text);
                                    yield text;
                                }
                            } catch (e) {
                                // If JSON.parse fails, it might be a partial object despite our boundary check
                                // though unlikely with findJsonBoundary. 
                                console.warn('Failed to parse Gemini chunk', e);
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
 * Find the end of its first complete JSON object in a string by tracking balanced braces.
 */
function findJsonBoundary(str: string): number {
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    let foundStart = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
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

        if (foundStart && braceCount === 0) {
            return i;
        }
    }

    return -1;
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
