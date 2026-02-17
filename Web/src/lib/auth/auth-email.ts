/**
 * Email Authentication Utilities
 * 
 * Provides password hashing, verification, and validation for email/password auth.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const validation = validatePassword(password);

    if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
    }

    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    const lowerPassword = password.toLowerCase();
    const forbiddenPatterns = ['password', '123456', 'qwerty', 'admin', 'test'];

    for (const pattern of forbiddenPatterns) {
        if (lowerPassword.includes(pattern)) {
            errors.push(`Password contains a common/forbidden pattern`);
            break;
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
