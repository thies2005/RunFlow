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

    // If user has custom API key, use their config
    if (userSettings?.customApiKey) {
        return {
            baseUrl: userSettings.customBaseUrl || 'https://api.openai.com/v1',
            apiKey: decryptToken(userSettings.customApiKey),
            model: userSettings.customModel || 'gpt-4o-mini',
        };
    }

    // Otherwise, use global config if user is enabled
    if (!userSettings?.aiEnabled) {
        return null; // AI not enabled for this user
    }

    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
    });

    if (!globalSettings?.defaultApiKey) {
        return null; // No global API key configured
    }

    return {
        baseUrl: globalSettings.defaultBaseUrl,
        apiKey: decryptToken(globalSettings.defaultApiKey),
        model: globalSettings.defaultModel,
    };
}

/**
 * Check if a user has AI access (either via BYOK or admin-enabled)
 */
export async function hasAiAccess(userId: string): Promise<boolean> {
    const config = await getAiConfig(userId);
    return config !== null;
}

/**
 * Stream a chat completion from an OpenAI-compatible API
 */
export async function streamChat(
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
            let errorMessage = `AI API error: ${response.status}`;
            try {
                // Try to parse JSON error first
                const data = await response.json();
                if (data.error?.message) {
                    errorMessage += ` - ${data.error.message}`;
                } else {
                    errorMessage += ` - ${JSON.stringify(data)}`;
                }
            } catch {
                // Fallback to text
                const text = await response.text();
                if (text) errorMessage += ` - ${text}`;
            }
            throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body from AI provider');
        }

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
        // Enhance error message if it's a fetch error
        if (error.name === 'TypeError' && error.message === 'fetch failed') {
            throw new Error(`Failed to connect to AI provider at ${config.baseUrl}. Please check the URL and internet connection.`);
        }
        throw error;
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
export async function testAiConfig(config: AiConfig): Promise<{ success: boolean; error?: string }> {
    try {
        // Some providers don't verify key on /models, so we prefer a minimal chat completion
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
            return { success: true };
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
