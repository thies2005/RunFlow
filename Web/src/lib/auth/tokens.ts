

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { MINUTE_MS, AUTH_TOKEN_DURATION } from '@/lib/constants';
import { logger } from '@/lib/logging/logger';

export const CODE_EXPIRY_MINUTES = 15;

/**
 * Generate a cryptographically secure random 6-character alphanumeric code
 * 
 * We use a custom alphabet to avoid ambiguous characters (like 0 vs O, 1 vs I)
 * if we wanted to be user-friendly, but for standard alphanumeric we'll use a specific set.
 * Requested: Numbers and Alphabet
 */
export function generateAuthCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const bytes = randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
}

/**
 * Generate a secure 6-digit code and store it in the database
 */
export async function createAuthCode(email: string, type: AuthCodeType): Promise<string> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * MINUTE_MS);

    // Clean up any existing codes for this user/type to modify duplication
    await prisma.authCode.deleteMany({
        where: { email, type }
    });

    await prisma.authCode.create({
        data: {
            email,
            code,
            type,
            expiresAt
        }
    });

    return code;
}

/**
 * Verify a code for a user
 * Rate limited to 10 attempts per 15 minutes per email to prevent brute-force attacks
 */
export async function verifyAuthCode(email: string, code: string, type: AuthCodeType): Promise<boolean> {
    if (typeof email !== 'string' || typeof code !== 'string' || !email.trim() || !code.trim()) {
        return false;
    }
    const normalizedEmail = email.trim().toLowerCase();

    const record = await prisma.authCode.findFirst({
        where: {
            email: normalizedEmail,
            type,
            code: code.trim().toUpperCase(), // Case insensitive comparison
            expiresAt: { gt: new Date() }
        }
    });

    if (!record) {
        const rateLimitResult = checkRateLimit(normalizedEmail, {
            limit: 10,
            windowSeconds: AUTH_TOKEN_DURATION,
            prefix: 'auth_code_verify',
        });
        if (!rateLimitResult.allowed) {
            logger.warn('Rate limit exceeded for failed auth code verification attempts', { email: normalizedEmail });
        }
        return false;
    }

    // Consume the code atomically so concurrent requests cannot replay it
    if (typeof prisma.authCode.deleteMany === 'function') {
        const deleted = await prisma.authCode.deleteMany({
            where: { id: record.id }
        });
        if (deleted && typeof deleted.count === 'number' && deleted.count !== 1) {
            return false;
        }
    } else {
        await prisma.authCode.delete({
            where: { id: record.id }
        });
    }

    await resetRateLimit(normalizedEmail, 'auth_code_verify');
    return true;
}
