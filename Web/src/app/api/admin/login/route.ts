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
import { logger } from '@/lib/logging/logger';
import { handleError } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
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
            // Add slight delay to prevent brute force timing attacks
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate token
        const token = await signAdminToken(username);

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            token,
            expiresIn: 86400, // 24 hours in seconds
        });

        // Set HTTP-only cookie for web access
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 86400, // 24 hours
            path: '/',
        });

        // Set CSRF cookie for admin frontend
        setCsrfCookie(response);

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        return handleError(error);
    }
}
