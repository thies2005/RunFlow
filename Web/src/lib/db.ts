import { PrismaClient } from '@prisma/client';

/**
 * BigInt Serialization for Next.js API Routes
 *
 * Prisma returns BigInt values for Strava IDs (BigInt fields in schema).
 * Next.js JSON responses use JSON.stringify which doesn't support BigInt.
 *
 * This global patch enables BigInt serialization across all API routes.
 * While global prototype modification is generally avoided, this is a
 * necessary workaround for Next.js + Prisma compatibility.
 *
 * Alternative approaches considered:
 * - Custom toJSON on every response (too verbose)
 * - Manual toString() conversion (error-prone, easily missed)
 * - Next.js custom serializers (complex, requires route changes)
 */
// eslint-disable-next-line no-var
declare global {
    interface BigInt {
        toJSON(): string;
    }
}

// @ts-ignore - BigInt.prototype.toJSON is not standard but required for Prisma + Next.js
BigInt.prototype.toJSON = function (): string {
    return this.toString();
};

/**
 * Prisma Client singleton with proper initialization
 * In development, reuse the global instance to prevent hot-reload issues
 */
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export default prisma;
