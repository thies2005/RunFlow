export const dynamic = 'force-dynamic';
/**
 * API Key Management Endpoints
 * 
 * GET - Returns API key info (prefix, created date, last used) - never the full key
 * POST - Generates a new API key (returns full key only once)
 * DELETE - Revokes/deletes the API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api/externalAuth';

/**
 * GET /api/settings/api-key
 * Returns API key information (never the full key)
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = await prisma.apiKey.findUnique({
            where: { userId: session.user.id },
            select: {
                id: true,
                keyPrefix: true,
                name: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
            }
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
        console.error('API key GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/settings/api-key
 * Generates a new API key (this is the ONLY time the full key is returned)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const name = body.name || 'My API Key';

        // Delete existing key if any (one key per user)
        await prisma.apiKey.deleteMany({
            where: { userId: session.user.id }
        });

        // Generate new key
        const { key, keyHash, keyPrefix } = generateApiKey();

        // Store in database
        await prisma.apiKey.create({
            data: {
                userId: session.user.id,
                keyHash,
                keyPrefix,
                name: name.substring(0, 50), // Limit name length
            }
        });

        // Return the full key (only time it's shown)
        return NextResponse.json({
            success: true,
            apiKey: key, // Full key - show only once!
            keyPrefix,
            name,
            message: 'Copy this key now. You won\'t be able to see it again.',
        });
    } catch (error) {
        console.error('API key POST error:', error);
        return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
    }
}

/**
 * DELETE /api/settings/api-key
 * Revokes/deletes the API key
 */
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.apiKey.deleteMany({
            where: { userId: session.user.id }
        });

        return NextResponse.json({ success: true, message: 'API key revoked' });
    } catch (error) {
        console.error('API key DELETE error:', error);
        return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
    }
}
