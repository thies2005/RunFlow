

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { AuthCodeType } from '@prisma/client';
import { checkRateLimit } from '@/lib/rateLimit';

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
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

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
    // Rate limit: 10 attempts per 15 minutes per email
    const rateLimitResult = checkRateLimit(email, {
        limit: 10,
        windowSeconds: 15 * 60,
        prefix: 'auth_code_verify',
    });

    if (!rateLimitResult.allowed) {
        console.warn(`[Auth] Rate limit exceeded for auth code verification: ${email}`);
        return false;
    }

    const record = await prisma.authCode.findFirst({
        where: {
            email,
            type,
            code: code.toUpperCase(), // Case insensitive comparison
            expiresAt: { gt: new Date() }
        }
    });

    if (!record) {
        return false;
    }

    // Consume the code so it can't be reused
    await prisma.authCode.delete({
        where: { id: record.id }
    });

    return true;
}
