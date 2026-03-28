/**
 * Mobile Authentication Utilities
 * 
 * Provides JWT-based authentication for the mobile app.
 * Web app continues to use NextAuth session-based auth.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { logger } from '@/lib/logging/logger';

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

    _jwtSecret = new TextEncoder().encode(
        secret || crypto.randomBytes(32).toString('base64')
    );
    if (!secret) {
        console.warn('[SECURITY] JWT_SECRET not set. Using random ephemeral secret (tokens will not survive restarts).');
    }
    return _jwtSecret;
}

const JWT_ISSUER = 'runflow';
const JWT_AUDIENCE = 'runflow-mobile';



// Token expiry durations
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

/**
 * JWT payload structure for RunFlow tokens
 */
export interface RunFlowJWTPayload extends JWTPayload {
    userId: string;
    type: 'access' | 'refresh';
}

/**
 * Authenticated user result from either session or JWT
 */
export interface AuthenticatedUser {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    authMethod: 'session' | 'jwt';
}

/**
 * Sign a new access token for the given user
 */
export async function signAccessToken(userId: string): Promise<string> {
    return new SignJWT({ userId, type: 'access' as const })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(getJwtSecret());
}

/**
 * Sign a new refresh token for the given user
 */
export async function signRefreshToken(userId: string): Promise<string> {
    return new SignJWT({ userId, type: 'refresh' as const })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT token
 * @returns The decoded payload or null if invalid
 */
export async function verifyJWT(token: string): Promise<RunFlowJWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret(), {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        return payload as RunFlowJWTPayload;
    } catch (error) {
        console.error('[Mobile Auth] JWT verification failed:', error);
        return null;
    }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest | Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7); // Remove 'Bearer ' prefix
}

/**
 * Unified authentication helper
 * 
 * Supports both:
 * - NextAuth session (web app with cookies)
 * - JWT Bearer token (mobile app)
 * 
 * @returns AuthenticatedUser or null if not authenticated
 */
export async function getAuthenticatedUser(
    request: NextRequest | Request
): Promise<AuthenticatedUser | null> {
    // Try JWT authentication first (mobile)
    const bearerToken = extractBearerToken(request);
    if (bearerToken) {
        const payload = await verifyJWT(bearerToken);
        if (payload && payload.type === 'access' && payload.userId) {
            // Verify user exists in database
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, email: true, name: true, image: true }
            });

            if (user) {
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    authMethod: 'jwt'
                };
            }
        }
        // Invalid JWT - don't fall through to session auth
        return null;
    }

    // Fall back to NextAuth session (web)
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            return {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
                authMethod: 'session'
            };
        }
    } catch (error) {
        console.error('[Mobile Auth] Session check failed:', error);
    }

    return null;
}

/**
 * Generate both access and refresh tokens for a user
 */
export async function generateTokenPair(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}> {
    const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(userId),
        signRefreshToken(userId)
    ]);

    // Parse expiry to seconds
    const expiresIn = parseExpiryToSeconds(ACCESS_TOKEN_EXPIRY);

    return {
        accessToken,
        refreshToken,
        expiresIn
    };
}

/**
 * Parse expiry string (e.g., '24h', '30d') to seconds
 */
function parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // Default 24 hours

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: return 86400;
    }
}

/**
 * Exchange Strava OAuth code for RunFlow JWT tokens
 * 
 * This is used by the mobile app after the user completes Strava OAuth.
 * The app sends the authorization code and we:
 * 1. Exchange it with Strava for access/refresh tokens
 * 2. Create or update the user in our database
 * 3. Return our own JWT tokens for API access
 */
export async function exchangeStravaCodeForTokens(
    code: string,
    redirectUri: string
): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; name: string | null; email: string | null; image: string | null };
} | { error: string }> {
    try {
        if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
            console.error('[Mobile Auth] Missing Strava API credentials');
            return { error: 'Server configuration error' };
        }

        // Exchange code with Strava
        const stravaResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            })
        });

        if (!stravaResponse.ok) {
            const error = await stravaResponse.text();
            console.error('[Mobile Auth] Strava token exchange failed:', error);
            return { error: 'Failed to exchange code with Strava' };
        }

        const stravaData = await stravaResponse.json();
        const { access_token, refresh_token, expires_at, athlete } = stravaData;

        if (!athlete?.id) {
            return { error: 'Invalid Strava response' };
        }

        // Import encryption utilities
        const { encryptToken } = await import('@/lib/crypto');

        // Find or create user
        // Check both User.stravaId (mobile login) and Account.providerAccountId (web login via NextAuth)
        const stravaId = String(athlete.id);

        // First try: Find by User.stravaId (mobile-created users)
        let user = await prisma.user.findUnique({
            where: { stravaId },
            select: { id: true, name: true, email: true, image: true }
        });

        // Second try: Find by Account.providerAccountId (web-created users via NextAuth)
        if (!user) {
            const existingAccount = await prisma.account.findFirst({
                where: {
                    provider: 'strava',
                    providerAccountId: stravaId
                },
                select: {
                    userId: true,
                    user: {
                        select: { id: true, name: true, email: true, image: true }
                    }
                }
            });

            if (existingAccount) {
                user = existingAccount.user;

                // Backfill User.stravaId for future lookups
                await prisma.user.update({
                    where: { id: user.id },
                    data: { stravaId }
                });
                logger.info(`[Mobile Auth] Linked existing user ${user.id} with stravaId ${stravaId}`);
            }
        }

        if (!user) {
            // Create new user
            user = await prisma.user.create({
                data: {
                    stravaId,
                    name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() || null,
                    image: athlete.profile || null,
                    stravaAccessToken: encryptToken(access_token),
                    stravaRefreshToken: encryptToken(refresh_token),
                    stravaTokenExpiry: new Date(expires_at * 1000)
                },
                select: { id: true, name: true, email: true, image: true }
            });

            // Create Account record for NextAuth compatibility
            await prisma.account.create({
                data: {
                    userId: user.id,
                    type: 'oauth',
                    provider: 'strava',
                    providerAccountId: stravaId,
                    access_token: encryptToken(access_token),
                    refresh_token: encryptToken(refresh_token),
                    expires_at,
                    token_type: 'Bearer',
                    scope: 'read,activity:read_all,profile:read_all'
                }
            });
        } else {
            // Update existing user's tokens
            await prisma.user.update({
                where: { stravaId },
                data: {
                    stravaAccessToken: encryptToken(access_token),
                    stravaRefreshToken: encryptToken(refresh_token),
                    stravaTokenExpiry: new Date(expires_at * 1000),
                    image: athlete.profile || undefined,
                    // Always update name and email if provided by Strava (e.g. scope change)
                    name: (`${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()) || undefined,
                    // Only update email if it's currently null or if Strava provides one
                    // We use undefined to skip update if athlete.email is missing
                    ...(athlete.email ? { email: athlete.email } : {})
                }
            });

            // Update Account record
            await prisma.account.updateMany({
                where: {
                    userId: user.id,
                    provider: 'strava'
                },
                data: {
                    access_token: encryptToken(access_token),
                    refresh_token: encryptToken(refresh_token),
                    expires_at
                }
            });
        }

        // Generate our JWT tokens
        const tokens = await generateTokenPair(user.id);

        return {
            ...tokens,
            user
        };
    } catch (error) {
        console.error('[Mobile Auth] Token exchange error:', error);
        return { error: 'Internal server error during authentication' };
    }
}
