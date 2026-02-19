/**
 * @jest-environment node
 */
import { hashApiKey, generateApiKey } from '../externalAuth';
import { createHash } from 'crypto';

// Mock prisma to avoid DB connection issues
jest.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('External Auth API', () => {
  describe('hashApiKey', () => {
    it('should be deterministic', () => {
      const key = 'rf_test_key_123';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should generate correct SHA-256 hash', () => {
      const key = 'rf_test_key_123';
      const expectedHash = createHash('sha256').update(key).digest('hex');
      expect(hashApiKey(key)).toBe(expectedHash);
    });

    it('should produce different hashes for different keys', () => {
        const key1 = 'rf_key_1';
        const key2 = 'rf_key_2';
        expect(hashApiKey(key1)).not.toBe(hashApiKey(key2));
    });
  });

  describe('generateApiKey', () => {
    it('should return a key with correct format', () => {
      const { key, keyHash, keyPrefix } = generateApiKey();

      // Check key format: rf_ + 32 bytes hex (64 chars) = 67 chars
      expect(key).toMatch(/^rf_[a-f0-9]{64}$/);
      expect(key.length).toBe(67);

      // Check prefix
      expect(keyPrefix).toBe(key.substring(0, 11) + '...');

      // Check hash consistency
      expect(keyHash).toBe(hashApiKey(key));
    });

    it('should generate unique keys', () => {
        const result1 = generateApiKey();
        const result2 = generateApiKey();
        expect(result1.key).not.toBe(result2.key);
    });
  });
});
