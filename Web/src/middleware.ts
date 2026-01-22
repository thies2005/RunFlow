import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration
 * 
 * Defines allowed origins for cross-origin requests.
 * In production, this should match your deployed domain(s).
 */
const getAllowedOrigins = (): string[] => {
    const origins: string[] = [];

    // Production domains - add your deployed domain(s) here
    origins.push('https://runflow.schuelken.uk');
    origins.push('http://runflow.schuelken.uk');

    // Add the app URL from environment
    if (process.env.NEXT_PUBLIC_APP_URL) {
        origins.push(process.env.NEXT_PUBLIC_APP_URL);
        // Also add https version if http was provided and vice versa
        if (process.env.NEXT_PUBLIC_APP_URL.startsWith('http://')) {
            origins.push(process.env.NEXT_PUBLIC_APP_URL.replace('http://', 'https://'));
        } else if (process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
            origins.push(process.env.NEXT_PUBLIC_APP_URL.replace('https://', 'http://'));
        }
    }

    // Add localhost for development
    if (process.env.NODE_ENV === 'development') {
        origins.push('http://localhost:3000');
        origins.push('http://127.0.0.1:3000');
    }

    // Remove duplicates
    return [...new Set(origins)];
};

/**
 * Handle CORS for API routes
 */
function handleCors(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');
    const allowedOrigins = getAllowedOrigins();

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 });

        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Max-Age', '86400');
        }

        return response;
    }

    // For actual requests from allowed origins, we'll add headers in the response
    // For disallowed origins on API routes, block the request
    if (origin && !allowedOrigins.includes(origin) && request.nextUrl.pathname.startsWith('/api/')) {
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
    const allowedOrigins = getAllowedOrigins();

    if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
}

// Wrap the auth middleware to add CORS handling
export default withAuth({
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized: ({ token, req }) => {
            // Allow public routes
            return true;
        }
    }
});

// Middleware function that runs before withAuth
export async function middleware(request: NextRequest) {
    // Handle CORS first
    const corsResponse = handleCors(request);
    if (corsResponse) {
        return corsResponse;
    }

    // Continue with normal middleware chain
    const response = NextResponse.next();
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
         * - .well-known (Android App Links / iOS Universal Links)
         */
        '/((?!api/auth|api/webhooks|login|register|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|swe-worker|workbox|.well-known).*)',
    ],
}
