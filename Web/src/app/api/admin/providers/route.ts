/**
 * Admin AI Providers API
 * GET /api/admin/providers - List all providers
 * POST /api/admin/providers - Create a new provider
 * DELETE /api/admin/providers?id=... - Delete a provider
 * PUT /api/admin/providers - Update a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';

async function isAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_session');
    return adminToken?.value === process.env.ADMIN_SESSION_TOKEN;
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const providers = await prisma.aiProvider.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Don't return full API keys, just a mask or existence check
        const safeProviders = providers.map(p => ({
            ...p,
            apiKey: null, // Don't send masked string to client
            hasKey: !!p.apiKey
        }));

        return NextResponse.json({ providers: safeProviders });
    } catch (error) {
        console.error('Providers GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, baseUrl, apiKey, models, slug } = body;

        if (!name || !type || !baseUrl || !apiKey || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const provider = await prisma.aiProvider.create({
            data: {
                name,
                slug,
                type,
                baseUrl,
                apiKey: encryptToken(apiKey),
                models: models || [],
                isActive: true,
            },
        });

        return NextResponse.json({ success: true, provider: { ...provider, apiKey: null } });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A provider with this slug already exists' }, { status: 400 });
        }
        console.error('Providers POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name, type, baseUrl, apiKey, models, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (type) updateData.type = type;
        if (baseUrl) updateData.baseUrl = baseUrl;
        if (apiKey) updateData.apiKey = encryptToken(apiKey); // Only update if provided
        if (models) updateData.models = models;
        if (isActive !== undefined) updateData.isActive = isActive;

        const provider = await prisma.aiProvider.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, provider: { ...provider, apiKey: null } });
    } catch (error) {
        console.error('Providers PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    try {
        // Check if it's the active provider
        const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        if (globalSettings?.activeProviderId === id) {
            // Reset active provider before deleting
            await prisma.globalAiSettings.update({
                where: { id: 'singleton' },
                data: { activeProviderId: null }
            });
        }

        await prisma.aiProvider.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Providers DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
