/**
 * Admin Login Endpoint
 * 
 * POST /api/admin/login
 * 
 * Authenticates admin users using credentials from environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, signAdminToken, COOKIE_NAME } from '@/lib/admin/auth';
import { setCsrfCookie } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { logger } from '@/lib/logging/logger';
import { handleError } from '@/lib/errors/handler';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';

const ADMIN_SESSION_MAX_AGE_SECONDS = 2 * 60 * 60; // 2 hours, matches ADMIN_TOKEN_EXPIRY

export async function POST(request: NextRequest) {
    try {
        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }
        const body = JSON.parse(rawBody);
        const { username, password } = body;

        logger.info('Admin login attempt', { username });

        const rateLimit = await adminRateLimit(request, 'sensitive');
        if (!rateLimit.success) {
            return rateLimit.error;
        }

        // Validate required fields
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Verify credentials
        if (!(await verifyAdminCredentials(username, password))) {
            logger.warn('Admin login credential mismatch', { username });
            await logAdminAction(request, 'LOGIN_FAILED', { type: 'SYSTEM' }, { username: String(username) }, String(username));
            // Add slight delay to prevent brute force timing attacks
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate token
        const token = await signAdminToken(username);

        // Create response without exposing the HttpOnly JWT in JSON body
        const response = NextResponse.json({
            success: true,
            expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS,
        });

        // Set HTTP-only cookie for web access
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
            path: '/',
        });

        // Set CSRF cookie for admin frontend
        setCsrfCookie(response);

        await logAdminAction(request, 'LOGIN_SUCCESS', { type: 'SYSTEM' }, { username: String(username) }, String(username));

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        return handleError(error);
    }
}
