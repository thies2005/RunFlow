
import { encodingForModel, TiktokenModel } from "js-tiktoken";

/**
 * countTokens
 * 
 * Counts the number of tokens in a text string for a specific model.
 * Uses js-tiktoken for accurate counting.
 * 
 * @param text The text to count tokens for
 * @param model The model name (e.g., "gpt-4", "gpt-3.5-turbo")
 * @returns The number of tokens
 */
export function countTokens(text: string, model: string = "gpt-4o"): number {
    try {
        // Map model names to tiktoken models if needed
        // js-tiktoken supports most OpenAI models out of the box
        // specific handling for newer models might be needed if library is outdated
        // but gpt-4o is generally supported or falls back to cl100k_base

        // Fallback for non-OpenAI models or unmapped ones to a reasonable default
        let encoder;
        try {
            encoder = encodingForModel(model as TiktokenModel);
        } catch (e) {
            // If model not found, default to cl100k_base (GPT-4/3.5)
            encoder = encodingForModel("gpt-4");
        }

        const tokens = encoder.encode(text);
        return tokens.length;
    } catch (error) {
        console.warn("Token counting failed, using approximation", error);
        // Fallback: 1 token ~= 4 chars
        return Math.ceil(text.length / 4);
    }
}

/**
 * estimateChatTokens
 * 
 * Estimates the total tokens for a chat request including system prompt,
 * history, user message, and some overhead for protocol.
 * 
 * @param messages The list of messages
 * @param model The model name
 * @returns Estimated total tokens
 */
export function estimateChatTokens(messages: { role: string; content: string }[], model: string): number {
    let total = 0;

    for (const msg of messages) {
        // Content tokens
        total += countTokens(msg.content, model);

        // Per-message overhead (approx 3-4 tokens)
        total += 4;
    }

    // Reply overhead
    total += 3;

    return total;
}
