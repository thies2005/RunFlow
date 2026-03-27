/**
 * Admin Authentication Utilities
 * 
 * Provides JWT-based authentication for the admin dashboard.
 * Credentials are validated against environment variables and database.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/auth-email';

// JWT configuration - uses lazy initialization to avoid build-time errors
let _jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
    if (_jwtSecret) return _jwtSecret;

    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error(
            '[SECURITY] JWT_SECRET environment variable is required in production. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
        );
    }

    if (secret && secret.length < 32 && process.env.NODE_ENV === 'production') {
        console.warn('[SECURITY] JWT_SECRET is too short (< 32 chars). It is recommended to use a longer secret for production safety.');
    }

    _jwtSecret = new TextEncoder().encode(
        secret || crypto.randomBytes(32).toString('base64')
    );
    if (!secret) {
        console.warn('[SECURITY] JWT_SECRET not set. Using random ephemeral secret (tokens will not survive restarts).');
    }
    return _jwtSecret;
}

const JWT_ISSUER = 'runflow-admin';
const JWT_AUDIENCE = 'runflow-admin';

const ADMIN_TOKEN_EXPIRY = '2h';
const ADMIN_COOKIE_NAME = 'runflow_admin_token';

export interface AdminJWTPayload extends JWTPayload {
    type: 'admin';
    username: string;
}

/**
 * Verify admin credentials against environment variables and database
 */
export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    const safeCompare = (a: string, b: string) => {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    };

    if (adminUsername) {
        const usernameValid = safeCompare(username, adminUsername);

        if (usernameValid) {
            if (adminPasswordHash) {
                if (await bcrypt.compare(password, adminPasswordHash)) {
                    return true;
                }
            }

            if (adminPassword) {
                const passwordValid = safeCompare(password, adminPassword);
                if (passwordValid) return true;
            }
        }
    }

    if (adminPasswordHash && !adminUsername) {
        if (await bcrypt.compare(password, adminPasswordHash)) {
            return true;
        }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: username.toLowerCase() },
            select: { isAdmin: true, passwordHash: true }
        });

        if (user?.isAdmin && user.passwordHash) {
            const passwordValid = await verifyPassword(password, user.passwordHash);
            return passwordValid;
        }
    } catch (error) {
        console.error('[Admin Auth] Database error:', error);
    }

    return false;
}

/**
 * Sign a new admin JWT token
 */
export async function signAdminToken(username: string): Promise<string> {
    return new SignJWT({ type: 'admin' as const, username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(ADMIN_TOKEN_EXPIRY)
        .sign(getJwtSecret());
}

/**
 * Verify and decode an admin JWT token
 */
export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret(), {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });

        if ((payload as AdminJWTPayload).type !== 'admin') {
            return null;
        }

        return payload as AdminJWTPayload;
    } catch (error) {
        console.error('[Admin Auth] JWT verification failed:', error);
        return null;
    }
}

/**
 * Extract admin token from request (header or cookie)
 */
function extractAdminToken(request: NextRequest): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Try cookie
    const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (cookieToken) {
        return cookieToken;
    }

    return null;
}

/**
 * Middleware to require admin authentication
 * Returns the admin payload if authenticated, or an error response
 */
export async function requireAdmin(request: NextRequest): Promise<{ admin: AdminJWTPayload } | { error: NextResponse }> {
    const token = extractAdminToken(request);

    if (!token) {
        return {
            error: NextResponse.json(
                { error: 'Unauthorized', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        };
    }

    const admin = await verifyAdminToken(token);

    if (!admin) {
        return {
            error: NextResponse.json(
                { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
                { status: 401 }
            )
        };
    }

    return { admin };
}

/**
 * Cookie name for client-side access
 */
export const COOKIE_NAME = ADMIN_COOKIE_NAME;
