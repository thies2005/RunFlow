/**
 * External API Authentication Helper
 * 
 * Provides API key validation for external read-only API access.
 * Used by AI assistants (like OpenClaw) to query user data.
 */

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

/**
 * Generate a new API key with prefix
 * Format: rf_<32 random hex chars>
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
    const bytes = randomBytes(32);
    const key = `rf_${bytes.toString('hex')}`;
    const keyHash = hashApiKey(key);
    const keyPrefix = key.substring(0, 11) + '...'; // rf_abc1234...

    return { key, keyHash, keyPrefix };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return the associated user
 * Updates lastUsedAt timestamp on successful validation
 */
export async function validateApiKey(authHeader: string | null): Promise<{
    userId: string;
    user: { id: string; name: string | null; email: string | null };
} | null> {
    if (!authHeader) return null;

    // Extract key from "Bearer rf_xxx" format
    const match = authHeader.match(/^Bearer\s+(rf_[a-f0-9]+)$/i);
    if (!match) return null;

    const key = match[1];
    const keyHash = hashApiKey(key);

    // Find API key in database with user data
    const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            }
        }
    });

    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null;
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(() => { /* ignore update errors */ });

    return {
        userId: apiKey.userId,
        user: apiKey.user,
    };
}

/**
 * Get user from API key for external API routes
 * Returns null if invalid/expired key
 */
export async function getExternalApiUser(request: Request): Promise<{
    userId: string;
    user: { id: string; name: string | null; email: string | null };
} | null> {
    const authHeader = request.headers.get('Authorization');
    return validateApiKey(authHeader);
}

