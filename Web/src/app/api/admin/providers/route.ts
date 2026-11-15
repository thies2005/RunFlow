/**
 * Admin AI Providers API
 * GET /api/admin/providers - List all providers
 * POST /api/admin/providers - Create a new provider
 * DELETE /api/admin/providers?id=... - Delete a provider
 * PUT /api/admin/providers - Update a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { validateBaseUrl } from '@/lib/ai/providers';
import { parseRoutingConfig, scrubProviderFromRoutingConfig } from '@/lib/ai/routing';

const VALID_PROVIDER_TYPES = new Set(['openai', 'anthropic', 'google']);

function getPrismaErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
        return (error as { code: string }).code;
    }
    return undefined;
}

function parseMonthlyTokenLimit(raw: unknown): { ok: true; value: bigint | null } | { ok: false } {
    if (raw === undefined || raw === null || raw === '') {
        return { ok: true, value: null };
    }
    try {
        const parsed = typeof raw === 'bigint' ? raw : BigInt(String(raw).trim());
        if (parsed < BigInt(0)) return { ok: false };
        return { ok: true, value: parsed };
    } catch {
        return { ok: false };
    }
}

/** Validate that a provider URL is safe (public HTTPS only, or localhost HTTP in development) */
function isValidProviderUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    if (parsed.username || parsed.password) {
        return false;
    }

    const bareHost = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (process.env.NODE_ENV === 'development') {
        if (
            parsed.protocol === 'http:' &&
            (bareHost === 'localhost' || bareHost === '127.0.0.1' || bareHost === '::1')
        ) {
            return true;
        }
    }

    if (
        bareHost === '::1' ||
        bareHost === '::' ||
        bareHost.startsWith('fe80:') ||
        bareHost.startsWith('fc') ||
        bareHost.startsWith('fd')
    ) {
        return false;
    }

    return validateBaseUrl(url, [url]);
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

        const trimmedName = typeof name === 'string' ? name.trim() : '';
        const trimmedSlug = typeof slug === 'string' ? slug.trim() : '';
        const trimmedType = typeof type === 'string' ? type.trim() : '';
        const trimmedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
        const trimmedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';

        if (!trimmedName || !trimmedType || !trimmedBaseUrl || !trimmedSlug) {
            return NextResponse.json({ error: 'Name, slug, type, and baseUrl are required' }, { status: 400 });
        }

        if (!trimmedApiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        if (!VALID_PROVIDER_TYPES.has(trimmedType)) {
            return NextResponse.json({ error: 'Provider type must be openai, anthropic, or google' }, { status: 400 });
        }

        if (!isValidProviderUrl(trimmedBaseUrl)) {
            return NextResponse.json(
                { error: 'Invalid base URL. Must be a public HTTPS URL (localhost HTTP is allowed in development only).' },
                { status: 400 }
            );
        }

        const parsedLimit = parseMonthlyTokenLimit(monthlyTokenLimit);
        if (!parsedLimit.ok) {
            return NextResponse.json({ error: 'monthlyTokenLimit must be a non-negative integer' }, { status: 400 });
        }

        if (models !== undefined && (!Array.isArray(models) || models.some((m) => typeof m !== 'string'))) {
            return NextResponse.json({ error: 'models must be an array of strings' }, { status: 400 });
        }

        const provider = await prisma.aiProvider.create({
            data: {
                name: trimmedName,
                slug: trimmedSlug,
                type: trimmedType,
                baseUrl: trimmedBaseUrl,
                apiKey: encryptToken(trimmedApiKey),
                models: models || [],
                isActive: true, // Default active
                monthlyTokenLimit: parsedLimit.value,
            },
        });

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id: provider.id }, {
            action: 'CREATE',
            name: provider.name,
            slug: provider.slug
        }, authResult.admin.username);

        const response = NextResponse.json({
            success: true,
            provider: {
                ...provider,
                apiKey: null,
                monthlyTokenLimit: provider.monthlyTokenLimit ? provider.monthlyTokenLimit.toString() : null
            }
        });

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
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

        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const updateData: Prisma.AiProviderUpdateInput = {};
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (type !== undefined) {
            const trimmedType = typeof type === 'string' ? type.trim() : '';
            if (!VALID_PROVIDER_TYPES.has(trimmedType)) {
                return NextResponse.json({ error: 'Provider type must be openai, anthropic, or google' }, { status: 400 });
            }
            updateData.type = trimmedType;
        }
        if (baseUrl !== undefined) {
            const trimmedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
            if (!trimmedBaseUrl || !isValidProviderUrl(trimmedBaseUrl)) {
                return NextResponse.json(
                    { error: 'Invalid base URL. Must be a public HTTPS URL (localhost HTTP is allowed in development only).' },
                    { status: 400 }
                );
            }
            updateData.baseUrl = trimmedBaseUrl;
        }
        if (typeof apiKey === 'string' && apiKey.trim()) {
            updateData.apiKey = encryptToken(apiKey.trim()); // Only update if provided
        }
        if (models !== undefined) {
            if (!Array.isArray(models) || models.some((m) => typeof m !== 'string')) {
                return NextResponse.json({ error: 'models must be an array of strings' }, { status: 400 });
            }
            updateData.models = models;
        }
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);
        if (monthlyTokenLimit !== undefined) {
            const parsedLimit = parseMonthlyTokenLimit(monthlyTokenLimit);
            if (!parsedLimit.ok) {
                return NextResponse.json({ error: 'monthlyTokenLimit must be a non-negative integer' }, { status: 400 });
            }
            updateData.monthlyTokenLimit = parsedLimit.value;
        }

        const provider = await prisma.aiProvider.update({
            where: { id },
            data: updateData,
        });

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id: provider.id }, {
            action: 'UPDATE',
            name: provider.name,
            updatedFields: Object.keys(updateData)
        }, authResult.admin.username);

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
        const code = getPrismaErrorCode(error);
        if (code === 'P2025') {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }
        if (code === 'P2002') {
            return NextResponse.json({ error: 'A provider with this slug already exists' }, { status: 400 });
        }
        console.error('Providers PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export { PUT as PATCH };

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
        await prisma.$transaction(async (tx) => {
            // Clear active/fallback/routingConfig references if deleting a referenced provider
            const globalSettings = await tx.globalAiSettings.findUnique({ where: { id: 'singleton' } });
            if (globalSettings) {
                const clearData: Prisma.GlobalAiSettingsUncheckedUpdateInput = {};
                if (globalSettings.activeProviderId === id) clearData.activeProviderId = null;
                if (globalSettings.fallbackProviderId === id) clearData.fallbackProviderId = null;

                if (globalSettings.routingConfig != null) {
                    const currentParsed = parseRoutingConfig(globalSettings.routingConfig);
                    const scrubbed = scrubProviderFromRoutingConfig(globalSettings.routingConfig, id);
                    if (JSON.stringify(scrubbed) !== JSON.stringify(currentParsed)) {
                        const hasTiers = scrubbed !== null && Object.keys(scrubbed.tiers).length > 0;
                        clearData.routingConfig = hasTiers
                            ? (scrubbed as unknown as Prisma.InputJsonValue)
                            : Prisma.DbNull;
                    }
                }

                if (Object.keys(clearData).length > 0) {
                    await tx.globalAiSettings.update({
                        where: { id: 'singleton' },
                        data: clearData,
                    });
                }
            }

            await tx.aiProvider.delete({
                where: { id },
            });
        });

        await logAdminAction(request, 'MODIFY_PROVIDERS', { type: 'PROVIDER', id }, {
            action: 'DELETE'
        }, authResult.admin.username);

        const response = NextResponse.json({ success: true });
        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        if (getPrismaErrorCode(error) === 'P2025') {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }
        console.error('Providers DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
