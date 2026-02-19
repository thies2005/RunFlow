/** @jest-environment node */
import { countTokens, estimateChatTokens } from '../tokenCounter';
import { encodingForModel } from 'js-tiktoken';

// Mock js-tiktoken
jest.mock('js-tiktoken', () => {
  const original = jest.requireActual('js-tiktoken');
  return {
    ...original,
    encodingForModel: jest.fn(),
  };
});

describe('tokenCounter', () => {
  const mockEncodingForModel = encodingForModel as jest.Mock;
  const originalEncodingForModel = jest.requireActual('js-tiktoken').encodingForModel;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default implementation: use real encodingForModel logic
    mockEncodingForModel.mockImplementation((model) => {
      return originalEncodingForModel(model);
    });
  });

  describe('countTokens', () => {
    it('should count tokens correctly for a known model (gpt-4o)', () => {
      const text = 'Hello world';
      // "Hello" is 1 token, " world" is 1 token -> 2 tokens
      // But let's just trust the library for the exact count, or check against a known value.
      // gpt-4o uses o200k_base or similar.
      // Let's assert it returns a number > 0.
      const count = countTokens(text, 'gpt-4o');
      expect(count).toBeGreaterThan(0);
      // For short string "Hello world", it's typically 2 tokens.
      expect(count).toBe(2);
    });

    it('should handle empty string', () => {
      const count = countTokens('', 'gpt-4o');
      expect(count).toBe(0);
    });

    it('should handle special characters', () => {
      const text = 'Hello world 🌍';
      const count = countTokens(text, 'gpt-4o');
      expect(count).toBeGreaterThan(2);
    });

    it('should fallback to gpt-4 if the requested model is not found', () => {
      const invalidModel = 'invalid-model-name-123';
      const text = 'Hello world';

      // Setup mock to throw for invalid model, but succeed for gpt-4
      mockEncodingForModel.mockImplementation((model) => {
        if (model === invalidModel) {
          throw new Error('Model not found');
        }
        return originalEncodingForModel(model);
      });

      const count = countTokens(text, invalidModel);

      // Should have called encodingForModel twice: once for invalid, once for gpt-4
      expect(mockEncodingForModel).toHaveBeenCalledWith(invalidModel);
      expect(mockEncodingForModel).toHaveBeenCalledWith('gpt-4');

      // Result should be same as gpt-4
      const expectedCount = countTokens(text, 'gpt-4');
      expect(count).toBe(expectedCount);
    });

    it('should fallback to approximation if gpt-4 also fails', () => {
      const text = 'Hello world'; // 11 chars
      // Expected approximation: ceil(11 / 4) = 3

      // Setup mock to throw for everything
      mockEncodingForModel.mockImplementation(() => {
        throw new Error('All models failed');
      });

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const count = countTokens(text, 'gpt-4o');

      expect(consoleSpy).toHaveBeenCalled();
      expect(count).toBe(3); // Math.ceil(11 / 4)

      consoleSpy.mockRestore();
    });

    it('should fallback to approximation if encoding fails', () => {
        const text = 'Hello world';

        // Setup mock to return an encoder that throws on encode
        mockEncodingForModel.mockReturnValue({
            encode: jest.fn(() => {
                throw new Error('Encoding failed');
            })
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const count = countTokens(text, 'gpt-4o');

        expect(consoleSpy).toHaveBeenCalled();
        expect(count).toBe(3); // Math.ceil(11 / 4)

        consoleSpy.mockRestore();
    });
  });

  describe('estimateChatTokens', () => {
    it('should calculate total tokens correctly', () => {
      const messages = [
        { role: 'user', content: 'Hello' }, // 1 token + 4 overhead = 5
        { role: 'assistant', content: 'Hi' } // 1 token + 4 overhead = 5
      ];
      // Reply overhead = 3
      // Total = 5 + 5 + 3 = 13

      // Mock countTokens indirectly by mocking encodingForModel
      // Or just rely on real implementation for "gpt-4o" (default)
      // "Hello" is 1 token, "Hi" is 1 token.

      const total = estimateChatTokens(messages, 'gpt-4o');
      expect(total).toBe(13);
    });

    it('should handle empty messages list', () => {
      const messages: { role: string; content: string }[] = [];
      // Only reply overhead = 3
      const total = estimateChatTokens(messages, 'gpt-4o');
      expect(total).toBe(3);
    });
  });
});
