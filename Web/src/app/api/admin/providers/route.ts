/**
 * Admin AI Providers API
 * GET /api/admin/providers - List all providers
 * POST /api/admin/providers - Create a new provider
 * DELETE /api/admin/providers?id=... - Delete a provider
 * PUT /api/admin/providers - Update a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';

/** Validate that a provider URL is safe (https only, or localhost for dev) */
function isValidProviderUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        // Allow https in production, http only for localhost/dev
        if (parsed.protocol === 'https:') return true;
        if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
        return false;
    } catch {
        return false;
    }
}


export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const providers = await prisma.aiProvider.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Don't return full API keys, just a mask or existence check
        const safeProviders = providers.map(p => ({
            ...p,
            apiKey: null, // Don't send masked string to client
            hasKey: !!p.apiKey,
            // Convert BigInt to string for JSON serialization
            monthlyTokenLimit: p.monthlyTokenLimit ? p.monthlyTokenLimit.toString() : null
        }));

        const response = NextResponse.json({ providers: safeProviders });
        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Providers GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const body = await request.json();
        const { name, type, baseUrl, apiKey, models, slug, monthlyTokenLimit } = body;

        if (!name || !type || !baseUrl || !apiKey || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isValidProviderUrl(baseUrl)) {
            return NextResponse.json({ error: 'Invalid base URL. Must be a valid HTTPS URL.' }, { status: 400 });
        }

        const provider = await prisma.aiProvider.create({
            data: {
                name,
                slug,
                type,
                baseUrl,
                apiKey: encryptToken(apiKey),
                models: models || [],
                isActive: true, // Default active
                monthlyTokenLimit: monthlyTokenLimit ? BigInt(monthlyTokenLimit) : null,
            },
        });

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id: provider.id }, {
            action: 'CREATE',
            name: provider.name,
            slug: provider.slug
        });

        const response = NextResponse.json({
            success: true,
            provider: {
                ...provider,
                apiKey: null,
                monthlyTokenLimit: provider.monthlyTokenLimit ? provider.monthlyTokenLimit.toString() : null
            }
        });

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A provider with this slug already exists' }, { status: 400 });
        }
        console.error('Providers POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const body = await request.json();
        const { id, name, type, baseUrl, apiKey, models, isActive, monthlyTokenLimit } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (type) updateData.type = type;
        if (baseUrl) {
            if (!isValidProviderUrl(baseUrl)) {
                return NextResponse.json({ error: 'Invalid base URL. Must be a valid HTTPS URL.' }, { status: 400 });
            }
            updateData.baseUrl = baseUrl;
        }
        if (apiKey) updateData.apiKey = encryptToken(apiKey); // Only update if provided
        if (models) updateData.models = models;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (monthlyTokenLimit !== undefined) {
            updateData.monthlyTokenLimit = monthlyTokenLimit ? BigInt(monthlyTokenLimit) : null;
        }

        const provider = await prisma.aiProvider.update({
            where: { id },
            data: updateData,
        });

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id: provider.id }, {
            action: 'UPDATE',
            name: provider.name,
            updatedFields: Object.keys(updateData)
        });

        const response = NextResponse.json({
            success: true,
            provider: {
                ...provider,
                apiKey: null,
                monthlyTokenLimit: provider.monthlyTokenLimit ? provider.monthlyTokenLimit.toString() : null
            }
        });

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Providers PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
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

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id }, {
            action: 'DELETE'
        });

        const response = NextResponse.json({ success: true });
        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Providers DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
