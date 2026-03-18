import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton with proper initialization
 * In development, reuse the global instance to prevent hot-reload issues
 */
declare global {
    // eslint-disable-next-line no-var
    var _prisma: PrismaClient | undefined;
}

export const prisma = globalThis._prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalThis._prisma = prisma;
}

export default prisma;
