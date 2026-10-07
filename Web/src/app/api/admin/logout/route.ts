/**
 * Admin Logout Endpoint
 *
 * POST /api/admin/logout
 *
 * Server-side session termination for the admin dashboard. The previous
 * logout was a client-only `document.cookie = 'runflow_admin_token=; ...'`
 * write, which browsers silently ignore for HttpOnly cookies (RFC 6265), so
 * the cookie kept authorizing /api/admin/* for the remainder of the JWT's
 * 2h lifetime after the user clicked Logout. Logout MUST go through this
 * endpoint, which expires the cookie server-side (Max-Age=0) with the same
 * attributes the login route used to set it (httpOnly, secure in
 * production, sameSite strict, host-only, path /) so the browser deletes
 * exactly the cookie that was issued.
 *
 * CSRF: protected by the same double-submit cookie pair the login route
 * issues (httpOnly csrf_token + readable csrf_token_client); the
 * X-CSRF-Token header must match the httpOnly csrf_token cookie.
 *
 * Residual (accepted): the admin JWT is stateless and short-lived (2h,
 * ADMIN_TOKEN_EXPIRY in lib/admin/auth.ts) with no server-side denylist, so
 * a token already exfiltrated out of the browser stays valid until its exp.
 * Server-side cookie invalidation is the session-termination contract for
 * the admin realm; adding revocation state would require schema changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully',
    });

    // Expire the httpOnly admin cookie server-side so subsequent /api/admin/*
    // requests from this browser profile are unauthenticated.
    response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
    });

    return response;
}
