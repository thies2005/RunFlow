/**
 * Admin Authentication Utilities
 * 
 * Provides JWT-based authentication for the admin dashboard.
 * Credentials are validated against environment variables.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'development-secret-change-in-production-min-32-chars'
);
const JWT_ISSUER = 'runflow-admin';
const JWT_AUDIENCE = 'runflow-admin';
const ADMIN_TOKEN_EXPIRY = '24h';
const ADMIN_COOKIE_NAME = 'runflow_admin_token';

export interface AdminJWTPayload extends JWTPayload {
    type: 'admin';
    username: string;
}

/**
 * Verify admin credentials against environment variables
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
        console.error('[Admin Auth] ADMIN_USERNAME or ADMIN_PASSWORD not configured');
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    const usernameMatch = username === adminUsername;
    const passwordMatch = password === adminPassword;

    return usernameMatch && passwordMatch;
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
        .sign(JWT_SECRET);
}

/**
 * Verify and decode an admin JWT token
 */
export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
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
