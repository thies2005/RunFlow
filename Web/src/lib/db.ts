import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var _prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string | undefined {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) return undefined;
    try {
        const url = new URL(baseUrl);
        url.searchParams.set('connection_limit', '10');
        url.searchParams.set('pool_timeout', '30');
        return url.toString();
    } catch {
        return baseUrl;
    }
}

export const prisma = globalThis._prisma ?? new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalThis._prisma = prisma;
}

export default prisma;
