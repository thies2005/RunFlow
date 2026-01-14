/**
 * Admin Login Endpoint
 * 
 * POST /api/admin/login
 * 
 * Authenticates admin users using credentials from environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, signAdminToken, COOKIE_NAME } from '@/lib/admin/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        console.log('[Admin Login] Attempt for:', username);
        console.log('[Admin Login] Env Username configured:', !!process.env.ADMIN_USERNAME);
        console.log('[Admin Login] Env Password configured:', !!process.env.ADMIN_PASSWORD);
        if (process.env.ADMIN_USERNAME) console.log(`[Admin Login] Expected user: '${process.env.ADMIN_USERNAME}'`);

        // Validate required fields
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Verify credentials
        if (!verifyAdminCredentials(username, password)) {
            console.warn('[Admin Login] Credential mismatch');
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
            sameSite: 'lax',
            maxAge: 86400, // 24 hours
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('[Admin Login] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
