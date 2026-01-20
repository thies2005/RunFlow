/**
 * Sentry Edge Configuration
 * 
 * This file configures the Sentry SDK for edge runtime (middleware).
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production if DSN is present
    enabled: process.env.NODE_ENV === 'production' && !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

    // Lower sample rate for edge (middleware runs on every request)
    tracesSampleRate: 0.05, // 5% of transactions

    // Environment tag
    environment: process.env.NODE_ENV,
});
