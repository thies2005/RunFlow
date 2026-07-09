/**
 * Token encryption utility for securing OAuth tokens at rest
 * Uses AES-256-GCM for authenticated encryption
 * 
 * Requires ENCRYPTION_KEY environment variable (32 bytes, base64 encoded)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '@/lib/logging/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * Returns null if not configured (encryption disabled)
 */
function getEncryptionKey(): Buffer {
    const keyBase64 = process.env.ENCRYPTION_KEY;
    if (!keyBase64) {
        throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing.');
    }

    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
        throw new Error(`CRITICAL SECURITY ERROR: ENCRYPTION_KEY must be 32 bytes (256 bits). Got ${key.length} bytes.`);
    }

    return key;
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded ciphertext with IV and auth tag prepended
 * Format: base64(IV + authTag + ciphertext)
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted string, or original if encryption not configured
 */
export function encryptToken(plaintext: string): string {
    const key = getEncryptionKey();

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt an encrypted token
 * Expects base64-encoded string with IV and auth tag prepended
 * 
 * @param encryptedToken - The encrypted string from encryptToken()
 * @returns Decrypted plaintext, or original if encryption not configured or decryption fails
 */
export function decryptToken(encryptedToken: string): string {
    const key = getEncryptionKey();

    try {
        const combined = Buffer.from(encryptedToken, 'base64');

        // Fail closed: data shorter than IV + auth tag cannot be a value
        // produced by encryptToken(). Treating such values as plaintext would
        // silently expose plaintext-at-rest data; throw instead.
        if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
            throw new Error('Token decryption failed: value is too short to be encrypted (possible plaintext-at-rest data). Re-encrypt this token or run the migration.');
        }

        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    } catch (error) {
        logger.error('Token decryption failed - possible key mismatch or data corruption.', {
            error: error instanceof Error ? error.message : String(error),
            tokenLength: encryptedToken.length,
        });

        throw new Error('Token decryption failed - possible key rotation or data corruption');
    }
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
    try {
        getEncryptionKey();
        return true;
    } catch {
        return false;
    }
}

// Note: Encryption key is validated at runtime when encrypt/decrypt functions are called.
// We do NOT validate at module load time because env vars may not be available during build.
