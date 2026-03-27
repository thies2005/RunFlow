/**
 * Sentry Server Configuration
 * 
 * This file configures the Sentry SDK for server-side (API routes, SSR).
 * It captures Node.js errors and API route exceptions.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,

    enabled: process.env.NODE_ENV === 'production' && !!process.env.SENTRY_DSN,

    // Performance Monitoring for server
    tracesSampleRate: 0.1, // 10% of transactions

    // Environment tag
    environment: process.env.NODE_ENV,

    // Release version
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

    // Filter out expected errors
    ignoreErrors: [
        // Rate limit errors are expected
        'Too many requests',
        // Auth errors are expected
        'Unauthorized',
        // User-caused validation errors
        'Missing required fields',
    ],

    // Before sending event
    beforeSend(event, hint) {
        // Sentry already captures error details in the main event.
        // Only add non-sensitive context here.
        return event;
    },
});
