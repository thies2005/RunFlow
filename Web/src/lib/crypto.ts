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
function getEncryptionKey(): Buffer | null {
    const keyBase64 = process.env.ENCRYPTION_KEY;
    if (!keyBase64) {
        return null;
    }

    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
        logger.error('ENCRYPTION_KEY must be 32 bytes (256 bits)', { keyLength: key.length });
        return null;
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
    if (!key) {
        // Encryption not configured
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY not set in production! Cannot encrypt tokens safely.');
        }
        return plaintext;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + ciphertext
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
    if (!key) {
        // Encryption not configured - assume plaintext
        return encryptedToken;
    }

    try {
        const combined = Buffer.from(encryptedToken, 'base64');

        // Check minimum length (IV + authTag)
        if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
            // Too short to be encrypted - might be plaintext (migration scenario)
            return encryptedToken;
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
        // Decryption failed - key mismatch or corrupted data
        logger.error('Token decryption failed - possible key mismatch or data corruption. Returning raw value as migration fallback.', {
            error: error instanceof Error ? error.message : String(error),
            tokenLength: encryptedToken.length,
        });

        if (process.env.NODE_ENV === 'production') {
            throw new Error('Token decryption failed - possible key rotation or data corruption');
        }

        // Fallback: return raw value (assuming plaintext migration) for dev only
        return encryptedToken;
    }
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
    return getEncryptionKey() !== null;
}

// Startup check to warn if encryption is disabled
if (!getEncryptionKey() && process.env.NODE_ENV !== 'test') {
    console.warn('[SECURITY] ENCRYPTION_KEY not configured. OAuth tokens will be stored in plaintext.');
}
