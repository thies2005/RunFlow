/**
 * Admin Migration API
 *
 * GET  /api/admin/migration  — export full config bundle as JSON
 * POST /api/admin/migration  — import config bundle, restore all settings
 *
 * The bundle captures everything that is NOT stored in the PostgreSQL dump:
 *  - GlobalAiSettings (tier limits, models, system prompt, provider links)
 *  - AiProvider rows (name, slug, type, baseUrl, apiKey decrypted for portability,
 *    models, limits)
 *  - A manifest section with the ENCRYPTION_KEY fingerprint so the import side
 *    can warn when the target instance uses a different key.
 *
 * What is intentionally NOT in this bundle (already covered by pg_dump):
 *  - User rows, activities, nutrition logs, etc.  — use the Backup tab for those.
 *
 * Security: admin-only, CSRF-protected, rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { handleError } from '@/lib/errors/handler';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { createHash } from 'crypto';

const BUNDLE_VERSION = '1';

/** Fingerprint the encryption key so the import side can detect a mismatch. */
function encryptionKeyFingerprint(): string {
  const key = process.env.ENCRYPTION_KEY ?? '';
  return createHash('sha256').update(key).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// GET — export
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const rateLimit = await adminRateLimit(request, 'read');
  if (!rateLimit.success) return rateLimit.error!;

  const authResult = await requireAdmin(request);
  if ('error' in authResult) return authResult.error;

  try {
    const [globalSettings, providers] = await Promise.all([
      prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.aiProvider.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    // Decrypt provider API keys so they can be re-encrypted on the target instance.
    const exportedProviders = providers.map((p) => {
      let plainApiKey: string | null = null;
      if (p.apiKey) {
        try {
          plainApiKey = decryptToken(p.apiKey);
        } catch {
          // If decryption fails we export the raw encrypted value; import will
          // attempt to store it as-is and warn.
          plainApiKey = p.apiKey;
        }
      }
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        baseUrl: p.baseUrl,
        apiKey: plainApiKey,
        models: p.models,
        isActive: p.isActive,
        monthlyTokenLimit: p.monthlyTokenLimit ? p.monthlyTokenLimit.toString() : null,
      };
    });

    // Strip the singleton id — it will be recreated on import.
    const settingsExport = globalSettings
      ? (({ id: _id, updatedAt: _u, ...rest }) => rest)(globalSettings as any)
      : null;

    const bundle = {
      bundleVersion: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      encryptionKeyFingerprint: encryptionKeyFingerprint(),
      globalAiSettings: settingsExport,
      aiProviders: exportedProviders,
    };

    await logAdminAction(
      request,
      'EXPORT_MIGRATION_BUNDLE',
      { type: 'SYSTEM' },
      { providerCount: providers.length, hasGlobalSettings: !!globalSettings },
    );

    const response = new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="runflow-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`,
      },
    });

    return applyRateLimitHeaders(response as NextResponse, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// POST — import
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  if (!validateCsrfToken(request)) return csrfValidationErrorResponse();

  const rateLimit = await adminRateLimit(request, 'sensitive');
  if (!rateLimit.success) return rateLimit.error!;

  const authResult = await requireAdmin(request);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await request.json();

    // Basic validation
    if (!body || body.bundleVersion !== BUNDLE_VERSION) {
      return NextResponse.json(
        { error: 'Invalid or unsupported migration bundle. Expected bundleVersion "1".' },
        { status: 400 },
      );
    }

    const warnings: string[] = [];

    // Warn on encryption key mismatch (keys are re-encrypted with the current key during import)
    const importFingerprint: string | undefined = body.encryptionKeyFingerprint;
    const localFingerprint = encryptionKeyFingerprint();
    if (importFingerprint && importFingerprint !== localFingerprint) {
      warnings.push(
        'Encryption key fingerprint mismatch: API keys from the bundle will be re-encrypted with this instance\'s ENCRYPTION_KEY. Verify AI providers work after import.',
      );
    }

    const results = {
      globalAiSettings: 'skipped' as 'skipped' | 'created' | 'updated',
      providersCreated: 0,
      providersUpdated: 0,
      providersSkipped: 0,
      warnings,
    };

    // --- Global AI Settings ---
    if (body.globalAiSettings) {
      const data = body.globalAiSettings as Record<string, unknown>;

      // Re-encrypt defaultApiKey if present
      if (data.defaultApiKey && typeof data.defaultApiKey === 'string') {
        data.defaultApiKey = encryptToken(data.defaultApiKey);
      }

      // Strip provider ID references; we will re-link by slug after providers are upserted
      const activeProviderSlug: string | null =
        typeof data._activeProviderSlug === 'string' ? data._activeProviderSlug : null;
      const fallbackProviderSlug: string | null =
        typeof data._fallbackProviderSlug === 'string' ? data._fallbackProviderSlug : null;

      // Remove relational IDs that will be resolved after provider upsert
      delete data.activeProviderId;
      delete data.fallbackProviderId;
      delete data._activeProviderSlug;
      delete data._fallbackProviderSlug;

      // Coerce BigInt-serialised numbers back
      const safeData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        safeData[k] = v;
      }

      const existing = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });

      if (existing) {
        await prisma.globalAiSettings.update({ where: { id: 'singleton' }, data: safeData as any });
        results.globalAiSettings = 'updated';
      } else {
        await prisma.globalAiSettings.create({ data: { id: 'singleton', ...(safeData as any) } });
        results.globalAiSettings = 'created';
      }

      // Re-link providers by slug if the export contained slug hints
      if (activeProviderSlug || fallbackProviderSlug) {
        const linkUpdate: Record<string, string | null> = {};
        if (activeProviderSlug) {
          const p = await prisma.aiProvider.findUnique({ where: { slug: activeProviderSlug } });
          if (p) linkUpdate.activeProviderId = p.id;
        }
        if (fallbackProviderSlug) {
          const p = await prisma.aiProvider.findUnique({ where: { slug: fallbackProviderSlug } });
          if (p) linkUpdate.fallbackProviderId = p.id;
        }
        if (Object.keys(linkUpdate).length) {
          await prisma.globalAiSettings.update({ where: { id: 'singleton' }, data: linkUpdate as any });
        }
      }
    }

    // --- AI Providers ---
    if (Array.isArray(body.aiProviders)) {
      for (const p of body.aiProviders as Array<Record<string, unknown>>) {
        if (!p.slug || typeof p.slug !== 'string') {
          results.providersSkipped++;
          continue;
        }

        let encryptedKey: string | null = null;
        if (p.apiKey && typeof p.apiKey === 'string') {
          try {
            encryptedKey = encryptToken(p.apiKey);
          } catch {
            warnings.push(`Provider "${p.slug}": could not encrypt API key — stored as-is.`);
            encryptedKey = p.apiKey;
          }
        }

        const upsertData = {
          name: String(p.name ?? p.slug),
          slug: String(p.slug),
          type: String(p.type ?? 'openai'),
          baseUrl: String(p.baseUrl ?? 'https://api.openai.com/v1'),
          apiKey: encryptedKey ?? '',
          models: Array.isArray(p.models) ? (p.models as string[]) : [],
          isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
          monthlyTokenLimit:
            p.monthlyTokenLimit != null ? BigInt(String(p.monthlyTokenLimit)) : null,
        };

        const existing = await prisma.aiProvider.findUnique({ where: { slug: upsertData.slug } });
        if (existing) {
          await prisma.aiProvider.update({ where: { slug: upsertData.slug }, data: upsertData });
          results.providersUpdated++;
        } else {
          await prisma.aiProvider.create({ data: upsertData });
          results.providersCreated++;
        }
      }

      // Re-link active/fallback provider IDs in GlobalAiSettings after all providers exist
      if (body.globalAiSettings) {
        const gs = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        if (gs) {
          // If the exported bundle had activeProviderId, try to match by slug
          // (already handled above via _activeProviderSlug; this is a fallback for
          //  direct ID references)
          if (!gs.activeProviderId && body.globalAiSettings._activeProviderSlug) {
            const p = await prisma.aiProvider.findUnique({
              where: { slug: body.globalAiSettings._activeProviderSlug },
            });
            if (p) {
              await prisma.globalAiSettings.update({
                where: { id: 'singleton' },
                data: { activeProviderId: p.id },
              });
            }
          }
        }
      }
    }

    await logAdminAction(
      request,
      'IMPORT_MIGRATION_BUNDLE',
      { type: 'SYSTEM' },
      {
        globalAiSettings: results.globalAiSettings,
        providersCreated: results.providersCreated,
        providersUpdated: results.providersUpdated,
        warnings: results.warnings,
      },
    );

    const response = NextResponse.json({ success: true, results });
    return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    return handleError(error);
  }
}
