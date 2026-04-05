import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/logging/logger'

/**
 * CORS Configuration
 * 
 * Defines allowed origins for cross-origin requests.
 * In production, this should match your deployed domain(s).
 */
const computeAllowedOrigins = (): string[] => {
    const origins: string[] = [];

    // Production domains are handled below via NEXT_PUBLIC_APP_URL
    // removed hardcoded runflow.schuelken.uk

    // Add the app URL from environment
    if (process.env.NEXT_PUBLIC_APP_URL) {
        origins.push(process.env.NEXT_PUBLIC_APP_URL);
        if (process.env.NEXT_PUBLIC_APP_URL.startsWith('http://')) {
            origins.push(process.env.NEXT_PUBLIC_APP_URL.replace('http://', 'https://'));
        } else if (process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
            origins.push(process.env.NEXT_PUBLIC_APP_URL.replace('https://', 'http://'));
        }
    }

    // Fallback: NEXTAUTH_URL is always available at runtime (even in Docker)
    if (process.env.NEXTAUTH_URL) {
        origins.push(process.env.NEXTAUTH_URL);
        if (process.env.NEXTAUTH_URL.startsWith('http://')) {
            origins.push(process.env.NEXTAUTH_URL.replace('http://', 'https://'));
        } else if (process.env.NEXTAUTH_URL.startsWith('https://')) {
            origins.push(process.env.NEXTAUTH_URL.replace('https://', 'http://'));
        }
    }

    // Add localhost for development
    if (process.env.NODE_ENV === 'development') {
        origins.push('http://localhost:3000');
        origins.push('http://127.0.0.1:3000');
    }

    // Remove duplicates
    return Array.from(new Set(origins));
};

const ALLOWED_ORIGINS = computeAllowedOrigins();

/**
 * Handle CORS for API routes
 */
function handleCors(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');
    const allowedOrigins = ALLOWED_ORIGINS;
    const requestOrigin = request.nextUrl.origin;
    const isSameOrigin = origin === requestOrigin;

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 });

        if (origin && (allowedOrigins.includes(origin) || isSameOrigin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Max-Age', '86400');
        }

        return response;
    }

    // For actual requests from allowed origins, we'll add headers in the response
    // For disallowed origins on API routes, block the request
    if (origin && !allowedOrigins.includes(origin) && !isSameOrigin && request.nextUrl.pathname.startsWith('/api/')) {
        // Allow webhooks and auth endpoints without origin check (they validate differently)
        if (!request.nextUrl.pathname.startsWith('/api/webhooks') &&
            !request.nextUrl.pathname.startsWith('/api/auth')) {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return null; // Continue to next middleware
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const allowedOrigins = ALLOWED_ORIGINS;
    const requestOrigin = request.nextUrl.origin;

    if (origin && (allowedOrigins.includes(origin) || origin === requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
}

// Middleware function that handles CORS, CSP, logging, and rewrites
export async function middleware(request: NextRequest) {
    // Handle CORS first
    const corsResponse = handleCors(request);
    if (corsResponse) {
        return corsResponse;
    }

    // Rewrite /api/latest/* to /api/v1/*
    const url = request.nextUrl;
    if (url.pathname.startsWith('/api/latest/')) {
        const rewriteUrl = new URL(url.pathname.replace('/api/latest/', '/api/v1/'), request.url);
        return NextResponse.rewrite(rewriteUrl);
    }

    // Generate request ID and start timing
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Log incoming request - only in development or for API routes
    const shouldLogIncoming = process.env.NODE_ENV === 'development' ||
                             url.pathname.startsWith('/api/');

    if (shouldLogIncoming) {
        logger.info('Incoming request', {
            requestId,
            method: request.method,
            path: request.nextUrl.pathname,
            userAgent: request.headers.get('user-agent'),
        });
    }

    const requestHeaders = new Headers(request.headers)

    // Override CSP (allow inline scripts to avoid blank page with Next.js inline chunks)
    const csp = [
        `default-src 'self'`,
        `script-src 'self' 'strict-dynamic' 'unsafe-inline' https: http: https://cdn.sentry.io https://*.sentry.io`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: https://*.strava.com https://*.googleusercontent.com https://dgalywyr863hv.cloudfront.net https://avatars.githubusercontent.com`,
        `font-src 'self' data:`,
        `connect-src 'self' https://www.strava.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://openrouter.ai https://*.sentry.io https://o*.ingest.sentry.io`,
        `frame-src 'none'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `manifest-src 'self'`,
        `upgrade-insecure-requests`
    ].join('; ')

    requestHeaders.set('Content-Security-Policy', csp)

    // Continue with normal middleware chain
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set('Content-Security-Policy', csp)
    // Add request ID header for tracing
    response.headers.set('x-request-id', requestId)

    const duration = Date.now() - startTime;
    const shouldLog = process.env.NODE_ENV === 'development' ||
                      request.nextUrl.pathname.startsWith('/api/') ||
                      duration > 100 ||
                      response.status >= 400;

    if (shouldLog) {
        logger.info('Request completed', {
            requestId,
            method: request.method,
            path: request.nextUrl.pathname,
            status: response.status,
            duration,
        });
    }

    if (request.nextUrl.pathname.startsWith('/api/') &&
        !request.nextUrl.pathname.startsWith('/api/auth') &&
        !request.nextUrl.pathname.startsWith('/api/webhooks') &&
        !request.nextUrl.pathname.startsWith('/api/health') &&
        !request.nextUrl.pathname.startsWith('/api/monitoring')) {
        const trackingSecret = process.env.CRON_SECRET || 'internal-tracking';
        const origin = request.nextUrl.origin;
        fetch(`${origin}/api/monitoring/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${trackingSecret}`,
            },
            body: JSON.stringify({
                routePath: request.nextUrl.pathname,
                method: request.method,
                statusCode: response.status,
                responseTime: duration,
            }),
        }).catch(() => {});
    }

    return addCorsHeaders(response, request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth endpoints)
         * - api/webhooks (webhook endpoints)
         * - login (login page)
         * - register (register page)
         * - _next/static (static files)
         * - _next/image (image optimization files)
          * - favicon.ico (favicon file)
         * - icons (public icons folder)
         * - manifest.json (PWA manifest)
         * - sw.js (Service Worker)
         * - swe-worker (Service Worker Workbox)
         * - workbox (Service Worker Libraries)
         * - api/health (health check endpoints — must be lightweight)
         * - api/monitoring (monitoring endpoints)
         * - .well-known (Android App Links / iOS Universal Links)
         */
        '/((?!api/auth|api/webhooks|api/health|api/monitoring|login|register|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|swe-worker|workbox|.well-known).*)',
    ],
}
