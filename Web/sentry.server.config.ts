/**
 * Sentry Server Configuration
 * 
 * This file configures the Sentry SDK for server-side (API routes, SSR).
 * It captures Node.js errors and API route exceptions.
 */

import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";

Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production if DSN is present
    enabled: process.env.NODE_ENV === 'production' && !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

    // Performance Monitoring for server
    tracesSampleRate: 0.1,

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

    // Integrations
    integrations: [
        // Prisma integration for database query tracking
        Sentry.prismaIntegration(),
    ],

    // Before sending event
    beforeSend(event, hint) {
        if (hint.originalException instanceof Error) {
            event.extra = {
                ...event.extra,
                errorMessage: hint.originalException.message,
                errorStack: hint.originalException.stack,
            };
        }

        return event;
    },
});
