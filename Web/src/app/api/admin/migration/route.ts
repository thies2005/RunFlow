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
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { handleError } from '@/lib/errors/handler';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import {
  slugifyRoutingConfig,
  TierRoutingConfigSchema,
  unslugifyRoutingConfig,
  type TierRoutingConfig,
} from '@/lib/ai/routing';
import { createHash } from 'crypto';

const BUNDLE_VERSION = '1';

interface MigrationProviderBundle {
  name: string;
  slug: string;
  type: string;
  baseUrl: string;
  apiKey: string | null;
  apiKeyUnavailable?: boolean;
  models: string[];
  isActive: boolean;
  monthlyTokenLimit: string | null;
}

interface MigrationGlobalSettingsBundle {
  defaultBaseUrl: string;
  defaultApiKey: string | null;
  defaultApiKeyUnavailable?: boolean;
  defaultModel: string;
  tier1Name: string;
  tier1DailyLimit: number;
  tier1MonthlyLimit: number;
  tier1DailyTokenLimit: number;
  tier1MonthlyTokenLimit: number;
  tier2Name: string;
  tier2DailyLimit: number;
  tier2MonthlyLimit: number;
  tier2DailyTokenLimit: number;
  tier2MonthlyTokenLimit: number;
  tier3Name: string;
  tier3DailyLimit: number;
  tier3MonthlyLimit: number;
  tier3DailyTokenLimit: number;
  tier3MonthlyTokenLimit: number;
  calorieSnapModel: string;
  tier1CalorieSnapLimit: number;
  tier2CalorieSnapLimit: number;
  tier3CalorieSnapLimit: number;
  mealSuggestModel: string;
  tier1MealSuggestLimit: number;
  tier2MealSuggestLimit: number;
  tier3MealSuggestLimit: number;
  activityFeedbackModel: string;
  tier1ActivityFeedbackLimit: number;
  tier2ActivityFeedbackLimit: number;
  tier3ActivityFeedbackLimit: number;
  planBuilderModel?: string;
  planMaxTokensPerAnalysis?: number;
  routingConfig?: TierRoutingConfig | null;
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  systemPrompt: string;
  allowSignups?: boolean;
  _activeProviderSlug: string | null;
  _fallbackProviderSlug: string | null;
}

function extractRoutingSlugs(config: TierRoutingConfig): string[] {
  const slugs = new Set<string>();
  for (const tierConfig of Object.values(config.tiers)) {
    if (!tierConfig) continue;
    if (tierConfig.defaultPrimary?.providerId) {
      slugs.add(tierConfig.defaultPrimary.providerId);
    }
    for (const fb of tierConfig.defaultFallbacks ?? []) {
      if (fb.providerId) slugs.add(fb.providerId);
    }
    if (tierConfig.functions) {
      for (const fnConfig of Object.values(tierConfig.functions)) {
        if (!fnConfig) continue;
        if (fnConfig.primary?.providerId) {
          slugs.add(fnConfig.primary.providerId);
        }
        for (const fb of fnConfig.fallbacks ?? []) {
          if (fb.providerId) slugs.add(fb.providerId);
        }
      }
    }
  }
  return Array.from(slugs);
}

interface MigrationBundle {
  bundleVersion: string;
  exportedAt: string;
  encryptionKeyFingerprint?: string;
  exportWarnings?: string[];
  globalAiSettings: MigrationGlobalSettingsBundle | null;
  aiProviders: MigrationProviderBundle[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseGlobalAiSettings(value: unknown): MigrationGlobalSettingsBundle | null {
  if (value == null) return null;
  if (!isRecord(value)) {
    throw new Error('Invalid globalAiSettings: expected object or null');
  }

  const getString = (key: keyof MigrationGlobalSettingsBundle): string => {
    const fieldValue = value[key];
    if (typeof fieldValue !== 'string') {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected string`);
    }
    return fieldValue;
  };

  const getNullableString = (key: keyof MigrationGlobalSettingsBundle): string | null => {
    const fieldValue = value[key];
    if (fieldValue !== null && typeof fieldValue !== 'string') {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected string or null`);
    }
    return fieldValue;
  };

  const getOptionalBoolean = (key: keyof MigrationGlobalSettingsBundle): boolean | undefined => {
    const fieldValue = value[key];
    if (fieldValue === undefined) return undefined;
    if (typeof fieldValue !== 'boolean') {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected boolean or undefined`);
    }
    return fieldValue;
  };

  const getNumber = (key: keyof MigrationGlobalSettingsBundle): number => {
    const fieldValue = value[key];
    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected number`);
    }
    return fieldValue;
  };

  const getOptionalString = (key: keyof MigrationGlobalSettingsBundle): string | undefined => {
    const fieldValue = value[key];
    if (fieldValue === undefined) return undefined;
    if (typeof fieldValue !== 'string') {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected string or undefined`);
    }
    return fieldValue;
  };

  const getOptionalNumber = (key: keyof MigrationGlobalSettingsBundle): number | undefined => {
    const fieldValue = value[key];
    if (fieldValue === undefined) return undefined;
    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
      throw new Error(`Invalid globalAiSettings.${String(key)}: expected number or undefined`);
    }
    return fieldValue;
  };

  let parsedRoutingConfig: TierRoutingConfig | null | undefined = undefined;
  if (value.routingConfig !== undefined) {
    if (value.routingConfig === null) {
      parsedRoutingConfig = null;
    } else {
      const parsed = TierRoutingConfigSchema.safeParse(value.routingConfig);
      if (!parsed.success) {
        throw new Error('Invalid globalAiSettings.routingConfig: invalid routing configuration');
      }
      parsedRoutingConfig = parsed.data;
    }
  }

  return {
    defaultBaseUrl: getString('defaultBaseUrl'),
    defaultApiKey: getNullableString('defaultApiKey'),
    defaultApiKeyUnavailable: getOptionalBoolean('defaultApiKeyUnavailable'),
    defaultModel: getString('defaultModel'),
    tier1Name: getString('tier1Name'),
    tier1DailyLimit: getNumber('tier1DailyLimit'),
    tier1MonthlyLimit: getNumber('tier1MonthlyLimit'),
    tier1DailyTokenLimit: getNumber('tier1DailyTokenLimit'),
    tier1MonthlyTokenLimit: getNumber('tier1MonthlyTokenLimit'),
    tier2Name: getString('tier2Name'),
    tier2DailyLimit: getNumber('tier2DailyLimit'),
    tier2MonthlyLimit: getNumber('tier2MonthlyLimit'),
    tier2DailyTokenLimit: getNumber('tier2DailyTokenLimit'),
    tier2MonthlyTokenLimit: getNumber('tier2MonthlyTokenLimit'),
    tier3Name: getString('tier3Name'),
    tier3DailyLimit: getNumber('tier3DailyLimit'),
    tier3MonthlyLimit: getNumber('tier3MonthlyLimit'),
    tier3DailyTokenLimit: getNumber('tier3DailyTokenLimit'),
    tier3MonthlyTokenLimit: getNumber('tier3MonthlyTokenLimit'),
    calorieSnapModel: getString('calorieSnapModel'),
    tier1CalorieSnapLimit: getNumber('tier1CalorieSnapLimit'),
    tier2CalorieSnapLimit: getNumber('tier2CalorieSnapLimit'),
    tier3CalorieSnapLimit: getNumber('tier3CalorieSnapLimit'),
    mealSuggestModel: getString('mealSuggestModel'),
    tier1MealSuggestLimit: getNumber('tier1MealSuggestLimit'),
    tier2MealSuggestLimit: getNumber('tier2MealSuggestLimit'),
    tier3MealSuggestLimit: getNumber('tier3MealSuggestLimit'),
    activityFeedbackModel: getString('activityFeedbackModel'),
    tier1ActivityFeedbackLimit: getNumber('tier1ActivityFeedbackLimit'),
    tier2ActivityFeedbackLimit: getNumber('tier2ActivityFeedbackLimit'),
    tier3ActivityFeedbackLimit: getNumber('tier3ActivityFeedbackLimit'),
    planBuilderModel: getOptionalString('planBuilderModel'),
    planMaxTokensPerAnalysis: getOptionalNumber('planMaxTokensPerAnalysis'),
    routingConfig: parsedRoutingConfig,
    dailyMessageLimit: getNumber('dailyMessageLimit'),
    monthlyMessageLimit: getNumber('monthlyMessageLimit'),
    systemPrompt: getString('systemPrompt'),
    allowSignups: getOptionalBoolean('allowSignups'),
    _activeProviderSlug: getNullableString('_activeProviderSlug'),
    _fallbackProviderSlug: getNullableString('_fallbackProviderSlug'),
  };
}

function parseProvider(provider: unknown): MigrationProviderBundle {
  if (!isRecord(provider)) {
    throw new Error('Invalid aiProviders entry: expected object');
  }

  const { name, slug, type, baseUrl, apiKey, apiKeyUnavailable, models, isActive, monthlyTokenLimit } = provider;

  if (typeof name !== 'string') throw new Error('Invalid aiProviders entry: name must be a string');
  if (typeof slug !== 'string') throw new Error('Invalid aiProviders entry: slug must be a string');
  if (typeof type !== 'string') throw new Error('Invalid aiProviders entry: type must be a string');
  if (typeof baseUrl !== 'string') throw new Error('Invalid aiProviders entry: baseUrl must be a string');
  if (apiKey !== null && typeof apiKey !== 'string') {
    throw new Error(`Invalid aiProviders.${slug || 'unknown'}.apiKey: expected string or null`);
  }
  if (apiKeyUnavailable !== undefined && typeof apiKeyUnavailable !== 'boolean') {
    throw new Error(`Invalid aiProviders.${slug || 'unknown'}.apiKeyUnavailable: expected boolean or undefined`);
  }
  if (!Array.isArray(models) || models.some((model) => typeof model !== 'string')) {
    throw new Error(`Invalid aiProviders.${slug || 'unknown'}.models: expected string[]`);
  }
  if (typeof isActive !== 'boolean') {
    throw new Error(`Invalid aiProviders.${slug || 'unknown'}.isActive: expected boolean`);
  }
  if (monthlyTokenLimit !== null && typeof monthlyTokenLimit !== 'string') {
    throw new Error(`Invalid aiProviders.${slug || 'unknown'}.monthlyTokenLimit: expected string or null`);
  }

  return {
    name,
    slug,
    type,
    baseUrl,
    apiKey,
    apiKeyUnavailable: apiKeyUnavailable === undefined ? undefined : apiKeyUnavailable,
    models,
    isActive,
    monthlyTokenLimit: monthlyTokenLimit ?? null,
  };
}

function parseMigrationBundle(value: unknown): MigrationBundle {
  if (!isRecord(value)) {
    throw new Error('Invalid migration bundle: expected JSON object');
  }

  if (value.bundleVersion !== BUNDLE_VERSION) {
    throw new Error(`Invalid or unsupported migration bundle. Expected bundleVersion "${BUNDLE_VERSION}".`);
  }

  if (typeof value.exportedAt !== 'string') {
    throw new Error('Invalid migration bundle: exportedAt must be a string');
  }

  if (value.encryptionKeyFingerprint != null && typeof value.encryptionKeyFingerprint !== 'string') {
    throw new Error('Invalid migration bundle: encryptionKeyFingerprint must be a string');
  }

  if (value.exportWarnings != null) {
    if (!Array.isArray(value.exportWarnings) || value.exportWarnings.some((entry: unknown) => typeof entry !== 'string')) {
      throw new Error('Invalid migration bundle: exportWarnings must be an array of strings');
    }
  }

  if (!Array.isArray(value.aiProviders)) {
    throw new Error('Invalid migration bundle: aiProviders must be an array');
  }

  return {
    bundleVersion: value.bundleVersion,
    exportedAt: value.exportedAt,
    encryptionKeyFingerprint:
      typeof value.encryptionKeyFingerprint === 'string' ? value.encryptionKeyFingerprint : undefined,
    exportWarnings: Array.isArray(value.exportWarnings)
      ? value.exportWarnings.filter((entry: unknown): entry is string => typeof entry === 'string')
      : undefined,
    globalAiSettings: parseGlobalAiSettings(value.globalAiSettings),
    aiProviders: value.aiProviders.map(parseProvider),
  };
}

function looksLikeBase64(value: string): boolean {
  if (!/^[A-Za-z0-9+/=]+$/.test(value)) return false;
  return value.length % 4 === 0;
}

function decryptForExport(value: string | null | undefined, label: string): { value: string | null; failed: boolean; unavailable: boolean } {
  if (value == null) return { value: null, failed: false, unavailable: false };

  try {
    return { value: decryptToken(value), failed: false, unavailable: false };
  } catch (error) {
    const base64Like = looksLikeBase64(value);
    logger.error('Migration export failed to decrypt value', {
      label,
      error: error instanceof Error ? error.message : String(error)
    });

    if (!base64Like) {
      return { value, failed: true, unavailable: false };
    }

    return { value: null, failed: true, unavailable: true };
  }
}

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
      prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: {
          activeProvider: { select: { slug: true } },
          fallbackProvider: { select: { slug: true } },
        },
      }),
      prisma.aiProvider.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const decryptFailures: string[] = [];
    const unavailableSecrets: string[] = [];

    const exportedProviders = providers.map((p) => {
      const providerKey = decryptForExport(p.apiKey, `Provider "${p.slug}" API key`);
      if (providerKey.failed) {
        decryptFailures.push(`Provider "${p.slug}" API key`);
      }
      if (providerKey.unavailable) {
        unavailableSecrets.push(`Provider "${p.slug}" API key`);
      }
      return {
        name: p.name,
        slug: p.slug,
        type: p.type,
        baseUrl: p.baseUrl,
        apiKey: providerKey.value,
        apiKeyUnavailable: providerKey.unavailable || undefined,
        models: p.models,
        isActive: p.isActive,
        monthlyTokenLimit: p.monthlyTokenLimit ? p.monthlyTokenLimit.toString() : null,
      };
    });

    const defaultApiKey = decryptForExport(globalSettings?.defaultApiKey, 'Global AI defaultApiKey');
    if (defaultApiKey.failed) {
      decryptFailures.push('Global AI defaultApiKey');
    }
    if (defaultApiKey.unavailable) {
      unavailableSecrets.push('Global AI defaultApiKey');
    }

    const exportWarnings: string[] = [];
    if (decryptFailures.length > 0) {
      exportWarnings.push(
        'Some stored secrets could not be decrypted. Plaintext values were preserved when possible; encrypted values that could not be decrypted were exported as empty and must be re-entered after import.'
      );
    }
    if (unavailableSecrets.length > 0) {
      exportWarnings.push(`Missing decryptable secrets: ${unavailableSecrets.join(', ')}`);
    }

    const providerRefs = providers.map((p) => ({ id: p.id, slug: p.slug }));
    const exportedRoutingConfig =
      globalSettings?.routingConfig != null
        ? slugifyRoutingConfig(globalSettings.routingConfig, providerRefs)
        : null;

    const settingsExport = globalSettings
      ? {
          defaultBaseUrl: globalSettings.defaultBaseUrl,
          defaultApiKey: defaultApiKey.value,
          defaultApiKeyUnavailable: defaultApiKey.unavailable || undefined,
          defaultModel: globalSettings.defaultModel,
          tier1Name: globalSettings.tier1Name,
          tier1DailyLimit: globalSettings.tier1DailyLimit,
          tier1MonthlyLimit: globalSettings.tier1MonthlyLimit,
          tier1DailyTokenLimit: globalSettings.tier1DailyTokenLimit,
          tier1MonthlyTokenLimit: globalSettings.tier1MonthlyTokenLimit,
          tier2Name: globalSettings.tier2Name,
          tier2DailyLimit: globalSettings.tier2DailyLimit,
          tier2MonthlyLimit: globalSettings.tier2MonthlyLimit,
          tier2DailyTokenLimit: globalSettings.tier2DailyTokenLimit,
          tier2MonthlyTokenLimit: globalSettings.tier2MonthlyTokenLimit,
          tier3Name: globalSettings.tier3Name,
          tier3DailyLimit: globalSettings.tier3DailyLimit,
          tier3MonthlyLimit: globalSettings.tier3MonthlyLimit,
          tier3DailyTokenLimit: globalSettings.tier3DailyTokenLimit,
          tier3MonthlyTokenLimit: globalSettings.tier3MonthlyTokenLimit,
          calorieSnapModel: globalSettings.calorieSnapModel,
          tier1CalorieSnapLimit: globalSettings.tier1CalorieSnapLimit,
          tier2CalorieSnapLimit: globalSettings.tier2CalorieSnapLimit,
          tier3CalorieSnapLimit: globalSettings.tier3CalorieSnapLimit,
          mealSuggestModel: globalSettings.mealSuggestModel,
          tier1MealSuggestLimit: globalSettings.tier1MealSuggestLimit,
          tier2MealSuggestLimit: globalSettings.tier2MealSuggestLimit,
          tier3MealSuggestLimit: globalSettings.tier3MealSuggestLimit,
          activityFeedbackModel: globalSettings.activityFeedbackModel,
          tier1ActivityFeedbackLimit: globalSettings.tier1ActivityFeedbackLimit,
          tier2ActivityFeedbackLimit: globalSettings.tier2ActivityFeedbackLimit,
          tier3ActivityFeedbackLimit: globalSettings.tier3ActivityFeedbackLimit,
          planBuilderModel: globalSettings.planBuilderModel,
          planMaxTokensPerAnalysis: globalSettings.planMaxTokensPerAnalysis,
          routingConfig: exportedRoutingConfig,
          dailyMessageLimit: globalSettings.dailyMessageLimit,
          monthlyMessageLimit: globalSettings.monthlyMessageLimit,
          systemPrompt: globalSettings.systemPrompt,
          allowSignups: globalSettings.allowSignups,
          _activeProviderSlug: globalSettings.activeProvider?.slug ?? null,
          _fallbackProviderSlug: globalSettings.fallbackProvider?.slug ?? null,
        }
      : null;

    const bundle = {
      bundleVersion: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      encryptionKeyFingerprint: encryptionKeyFingerprint(),
      exportWarnings,
      globalAiSettings: settingsExport,
      aiProviders: exportedProviders,
    };

    await logAdminAction(
      request,
      'EXPORT_MIGRATION_BUNDLE',
      { type: 'SYSTEM' },
      { providerCount: providers.length, hasGlobalSettings: !!globalSettings },
      authResult.admin.username,
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
    const bundle = parseMigrationBundle(await request.json());

    const warnings: string[] = [];
    if (bundle.exportWarnings?.length) {
      warnings.push(...bundle.exportWarnings);
    }

    const importFingerprint = bundle.encryptionKeyFingerprint;
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

    await prisma.$transaction(async (tx) => {
      for (const provider of bundle.aiProviders) {
        const baseData = {
          name: provider.name,
          slug: provider.slug,
          type: provider.type,
          baseUrl: provider.baseUrl,
          models: provider.models,
          isActive: provider.isActive,
          monthlyTokenLimit:
            provider.monthlyTokenLimit != null ? BigInt(provider.monthlyTokenLimit) : null,
        };

        const createApiKeyValue = provider.apiKey == null
          ? ''
          : provider.apiKey === ''
            ? ''
            : encryptToken(provider.apiKey);

        const updateData = provider.apiKey == null
          ? baseData
          : { ...baseData, apiKey: provider.apiKey === '' ? '' : encryptToken(provider.apiKey) };

        const createData = { ...baseData, apiKey: createApiKeyValue };

        const existing = await tx.aiProvider.findUnique({ where: { slug: baseData.slug } });
        if (existing) {
          await tx.aiProvider.update({ where: { slug: baseData.slug }, data: updateData });
          results.providersUpdated++;
        } else {
          await tx.aiProvider.create({ data: createData });
          results.providersCreated++;
        }
      }

      if (bundle.globalAiSettings) {
        const {
          _activeProviderSlug,
          _fallbackProviderSlug,
          defaultApiKey,
          defaultApiKeyUnavailable,
          allowSignups,
          planBuilderModel,
          planMaxTokensPerAnalysis,
          routingConfig,
          ...rest
        } = bundle.globalAiSettings;

        const allProviders = await tx.aiProvider.findMany({
          select: { id: true, slug: true },
        });
        const providerBySlug = new Map(allProviders.map((p) => [p.slug, p.id]));

        const activeProviderId = _activeProviderSlug ? providerBySlug.get(_activeProviderSlug) ?? null : null;
        const fallbackProviderId = _fallbackProviderSlug ? providerBySlug.get(_fallbackProviderSlug) ?? null : null;

        if (_activeProviderSlug && !activeProviderId) {
          warnings.push(`Active provider "${_activeProviderSlug}" was not found during import.`);
        }
        if (_fallbackProviderSlug && !fallbackProviderId) {
          warnings.push(`Fallback provider "${_fallbackProviderSlug}" was not found during import.`);
        }

        let resolvedRoutingConfig: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined;
        if (routingConfig !== undefined) {
          if (routingConfig === null) {
            resolvedRoutingConfig = Prisma.DbNull;
          } else {
            for (const slug of extractRoutingSlugs(routingConfig)) {
              if (!providerBySlug.has(slug)) {
                warnings.push(`Routing provider "${slug}" was not found during import and was omitted from routingConfig.`);
              }
            }
            const unslugified = unslugifyRoutingConfig(routingConfig, allProviders);
            const hasTiers = unslugified !== null && Object.keys(unslugified.tiers).length > 0;
            resolvedRoutingConfig = hasTiers
              ? (unslugified as unknown as Prisma.InputJsonValue)
              : Prisma.DbNull;
          }
        }

        const baseSettingsData = {
          ...rest,
          ...(allowSignups !== undefined ? { allowSignups } : {}),
          ...(planBuilderModel !== undefined ? { planBuilderModel } : {}),
          ...(planMaxTokensPerAnalysis !== undefined ? { planMaxTokensPerAnalysis } : {}),
          ...(resolvedRoutingConfig !== undefined ? { routingConfig: resolvedRoutingConfig } : {}),
          activeProviderId,
          fallbackProviderId,
        };

        const defaultKeyValue = defaultApiKey == null ? null : defaultApiKey === '' ? '' : encryptToken(defaultApiKey);
        const updateSettingsData = defaultApiKeyUnavailable
          ? baseSettingsData
          : { ...baseSettingsData, defaultApiKey: defaultKeyValue };
        const createSettingsData = {
          ...baseSettingsData,
          defaultApiKey: defaultApiKeyUnavailable ? null : defaultKeyValue,
        };

        const existing = await tx.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        if (existing) {
          await tx.globalAiSettings.update({ where: { id: 'singleton' }, data: updateSettingsData });
          results.globalAiSettings = 'updated';
        } else {
          await tx.globalAiSettings.create({ data: { id: 'singleton', ...createSettingsData } });
          results.globalAiSettings = 'created';
        }
      }
    });

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
      authResult.admin.username,
    );

    const response = NextResponse.json({ success: true, results });
    return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    return handleError(error);
  }
}
