import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_EXPIRATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

interface CsrfTokenData {
    token: string;
    expiresAt: number;
}

export function generateCsrfToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
}

export function setCsrfCookie(response: NextResponse): string {
    const token = generateCsrfToken();
    const expiresAt = Date.now() + CSRF_TOKEN_EXPIRATION;

    response.cookies.set(CSRF_COOKIE_NAME, JSON.stringify({ token, expiresAt }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRATION / 1000,
        path: '/',
    });

    return token;
}

function getCsrfTokenFromCookie(request: NextRequest): string | null {
    const cookie = request.cookies.get(CSRF_COOKIE_NAME);
    if (!cookie || !cookie.value) {
        return null;
    }

    try {
        const data: CsrfTokenData = JSON.parse(cookie.value);
        if (!data || !data.token || !data.expiresAt) {
            return null;
        }

        if (Date.now() > data.expiresAt) {
            return null;
        }

        return data.token;
    } catch {
        return null;
    }
}

function getCsrfTokenFromHeader(request: NextRequest): string | null {
    const token = request.headers.get('X-CSRF-Token');
    return token || null;
}

export function validateCsrfToken(request: NextRequest): boolean {
    const cookieToken = getCsrfTokenFromCookie(request);
    const headerToken = getCsrfTokenFromHeader(request);

    if (!cookieToken || !headerToken) {
        return false;
    }

    if (cookieToken.length !== headerToken.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < cookieToken.length; i++) {
        result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
    }

    return result === 0;
}

export function csrfValidationErrorResponse(): NextResponse {
    return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
    );
}

export function getCsrfCookieName(): string {
    return CSRF_COOKIE_NAME;
}
