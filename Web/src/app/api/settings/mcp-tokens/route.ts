import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tokens = await prisma.mcpOAuthToken.findMany({
            where: {
                userId: session.user.id,
                revokedAt: null,
            },
            select: {
                id: true,
                clientId: true,
                scope: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
                client: {
                    select: {
                        clientName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            tokens: tokens.map((token) => ({
                id: token.id,
                clientId: token.clientId,
                client: {
                    clientName: token.client.clientName,
                },
                clientName: token.client.clientName,
                scope: token.scope,
                createdAt: token.createdAt,
                lastUsedAt: token.lastUsedAt,
                expiresAt: token.expiresAt,
            })),
        });
    } catch (error) {
        console.error('Failed to list MCP tokens:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryTokenId = searchParams.get('tokenId') || searchParams.get('id');

        let bodyTokenId: string | undefined;
        try {
            const body = await request.json();
            bodyTokenId = body?.tokenId || body?.id;
        } catch {
            // Body is optional or not JSON
        }

        const tokenId = queryTokenId || bodyTokenId;

        const whereClause = tokenId
            ? { id: tokenId, userId: session.user.id, revokedAt: null }
            : { userId: session.user.id, revokedAt: null };

        const result = await prisma.mcpOAuthToken.updateMany({
            where: whereClause,
            data: {
                revokedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            revokedCount: result.count,
            count: result.count,
        });
    } catch (error) {
        console.error('Failed to revoke MCP tokens:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
