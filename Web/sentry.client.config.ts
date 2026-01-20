/**
 * Sentry Client Configuration
 * 
 * This file configures the Sentry SDK for the browser (client-side).
 * It captures JavaScript errors, performance transactions, and session replays.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production if DSN is present
    enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay (optional, requires additional package)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,

    // Adjust this value based on your needs
    // Setting to 1.0 captures every error, 0.5 captures 50%, etc.
    sampleRate: 1.0,

    // Environment tag
    environment: process.env.NODE_ENV,

    // Release version (set in build process)
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

    // Filter out noisy errors
    ignoreErrors: [
        // Browser extension errors
        /chrome-extension/,
        /moz-extension/,
        // Network errors that aren't actionable
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        // User aborted requests
        'AbortError',
    ],

    // Before sending event, filter or modify
    beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
            console.error('[Sentry Debug]', hint.originalException);
            return null;
        }

        return event;
    },
});
