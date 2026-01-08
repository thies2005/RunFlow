import { PrismaClient } from '@prisma/client';

// Patch BigInt to be JSON serializable globally
// This prevents crashes when passing BigInt values (Strava IDs) to client components
// @ts-ignore - BigInt.prototype.toJSON is not standard but widely supported and necessary
BigInt.prototype.toJSON = function (): string { return this.toString(); };

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export default prisma;
