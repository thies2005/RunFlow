import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api/externalAuth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = await prisma.apiKey.findUnique({
            where: { userId: user.id },
            select: {
                keyPrefix: true,
                name: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
            },
        });

        if (!apiKey) {
            return NextResponse.json({ hasKey: false });
        }

        return NextResponse.json({
            hasKey: true,
            keyPrefix: apiKey.keyPrefix,
            name: apiKey.name,
            createdAt: apiKey.createdAt,
            lastUsedAt: apiKey.lastUsedAt,
            expiresAt: apiKey.expiresAt,
        });
    } catch (error) {
        console.error('Mobile API key GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const name = body.name || 'My API Key';

        await prisma.apiKey.deleteMany({ where: { userId: user.id } });

        const { key, keyHash, keyPrefix } = generateApiKey();

        await prisma.apiKey.create({
            data: {
                userId: user.id,
                keyHash,
                keyPrefix,
                name: name.substring(0, 50),
            },
        });

        return NextResponse.json({
            success: true,
            apiKey: key,
            keyPrefix,
            name,
            message: 'Copy this key now. You won\'t be able to see it again.',
        });
    } catch (error) {
        console.error('Mobile API key POST error:', error);
        return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.apiKey.deleteMany({ where: { userId: user.id } });

        return NextResponse.json({ success: true, message: 'API key revoked' });
    } catch (error) {
        console.error('Mobile API key DELETE error:', error);
        return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
    }
}
