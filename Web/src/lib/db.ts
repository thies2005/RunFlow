import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var _prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const adapter = new PrismaPg({ connectionString });

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
}

let _cachedPrisma: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
    if (process.env.NODE_ENV !== 'production' && globalThis._prisma) {
        return globalThis._prisma;
    }
    if (_cachedPrisma) {
        return _cachedPrisma;
    }
    const client = createPrismaClient();
    _cachedPrisma = client;
    if (process.env.NODE_ENV !== 'production') {
        globalThis._prisma = client;
    }
    return client;
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        return Reflect.get(getPrismaClient() as object, prop, receiver);
    },
});

export default prisma;
