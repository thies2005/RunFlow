import { encryptToken, decryptToken, isEncryptionEnabled } from '../crypto';
import { randomBytes } from 'crypto';

describe('Token Encryption', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset process.env for each test
        process.env = { ...originalEnv };

        // Suppress console logs during tests to keep output clean
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('when encryption is enabled', () => {
        const validKey = randomBytes(32).toString('base64');

        beforeEach(() => {
            process.env.ENCRYPTION_KEY = validKey;
        });

        it('should report encryption as enabled', () => {
            expect(isEncryptionEnabled()).toBe(true);
        });

        it('should encrypt and decrypt a token correctly', () => {
            const token = 'test-token-123';
            const encrypted = encryptToken(token);

            expect(encrypted).not.toBe(token);
            expect(typeof encrypted).toBe('string');
            // Should be base64 encoded
            expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

            const decrypted = decryptToken(encrypted);
            expect(decrypted).toBe(token);
        });

        it('should produce different ciphertexts for same plaintext (random IV)', () => {
            const token = 'same-token';
            const encrypted1 = encryptToken(token);
            const encrypted2 = encryptToken(token);

            expect(encrypted1).not.toBe(encrypted2);

            expect(decryptToken(encrypted1)).toBe(token);
            expect(decryptToken(encrypted2)).toBe(token);
        });

        it('should throw when decrypting invalid data', () => {
            const invalidData = 'not-encrypted-data';
            expect(() => decryptToken(invalidData)).toThrow(/Token decryption failed/);
        });

        it('should throw on decryption with wrong key', () => {
            const token = 'secret-data';
            const encrypted = encryptToken(token);

            process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');

            expect(() => decryptToken(encrypted)).toThrow(/Token decryption failed/);
        });

        it('should handle decryption with wrong key by throwing error', () => {
            const token = 'secret-data';
            const encrypted = encryptToken(token);

            process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');

            expect(() => decryptToken(encrypted)).toThrow(/Token decryption failed/);
        });
    });

    describe('when encryption is disabled (no key)', () => {
        beforeEach(() => {
            delete process.env.ENCRYPTION_KEY;
        });

        it('should report encryption as disabled', () => {
            expect(isEncryptionEnabled()).toBe(false);
        });

        it('should throw when encrypting without key', () => {
            const token = 'plaintext-token';
            expect(() => encryptToken(token)).toThrow(/SECURITY ERROR/);
        });

        it('should throw when decrypting without key', () => {
            const token = 'plaintext-token';
            expect(() => decryptToken(token)).toThrow(/SECURITY ERROR/);
        });
    });

    describe('configuration validation', () => {
        it('should handle invalid key length', () => {
            // 16 bytes instead of 32
            process.env.ENCRYPTION_KEY = randomBytes(16).toString('base64');

            // Should behave as disabled (logs error)
            expect(isEncryptionEnabled()).toBe(false);
            expect(() => encryptToken('test')).toThrow(/SECURITY ERROR/);
        });
    });
});
