import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DAY_MS } from '@/lib/constants';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_EXPIRATION = DAY_MS; // 24 hours in milliseconds

interface CsrfTokenData {
    token: string;
    expiresAt: number;
}

function getCsrfSigningSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('CSRF signing secret (JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET) is required in production');
    }
    return secret || 'runflow-csrf-dev-secret';
}

function signCsrfNonce(nonce: string): string {
    return createHmac('sha256', getCsrfSigningSecret()).update(nonce).digest('hex');
}

export function generateCsrfToken(): string {
    const nonce = randomBytes(32).toString('hex');
    const sig = signCsrfNonce(nonce);
    return `${nonce}.${sig}`;
}

export function setCsrfCookie(response: NextResponse): string {
    const token = generateCsrfToken();
    const expiresAt = Date.now() + CSRF_TOKEN_EXPIRATION;

    // Set httpOnly cookie for server-side validation
    response.cookies.set(CSRF_COOKIE_NAME, JSON.stringify({ token, expiresAt }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRATION / 1000,
        path: '/',
    });

    // Set non-httpOnly cookie for client-side access (same token)
    response.cookies.set(`${CSRF_COOKIE_NAME}_client`, token, {
        httpOnly: false, // Client can read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRATION / 1000,
        path: '/',
    });

    return token;
}

export function getCsrfTokenFromCookie(request: NextRequest): string | null {
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

    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');
    if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
        return false;
    }

    const parts = cookieToken.split('.');
    if (parts.length !== 2) {
        return false;
    }
    const [nonce, sig] = parts;
    if (!nonce || !sig) {
        return false;
    }

    const expectedSig = signCsrfNonce(nonce);
    const sigBuf = Buffer.from(sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return false;
    }

    return true;
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
