import crypto from 'crypto';
import type { NextRequest } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET || '';

/**
 * Verifies that a cron request is authorized via the shared CRON_SECRET.
 * Accepts the secret via the Authorization header (preferred, "Bearer <secret>")
 * or a "secret" query parameter (legacy).
 */
export function verifyCronSecret(request: NextRequest): boolean {
    if (!CRON_SECRET) return false;

    const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (headerSecret) {
        try {
            const a = Buffer.from(headerSecret);
            const b = Buffer.from(CRON_SECRET);
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    const querySecret = request.nextUrl.searchParams.get('secret');
    if (querySecret) {
        try {
            const a = Buffer.from(querySecret);
            const b = Buffer.from(CRON_SECRET);
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    return false;
}
