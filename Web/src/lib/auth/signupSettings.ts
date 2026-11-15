import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';

const ENV_DISABLED_VALUES = new Set(['false', 'no', '0', 'off']);

export interface SignupStatus {
    allowSignups: boolean;
    envAllowSignups: boolean;
    adminAllowSignups: boolean;
}

/**
 * Checks whether the ALLOW_SIGNUPS environment variable permits signups.
 * - 'false', 'no', '0', 'off' (case-insensitive) => false (hard no)
 * - unset, empty, 'true', 'yes', '1', 'on', etc. => true (depends on admin setting)
 */
export function isEnvSignupsAllowed(
    envVal: string | undefined = process.env.ALLOW_SIGNUPS
): boolean {
    if (envVal === undefined) {
        return true;
    }
    const normalized = envVal.trim().toLowerCase();
    if (normalized === '') {
        return true;
    }
    return !ENV_DISABLED_VALUES.has(normalized);
}

/**
 * Returns the full signup eligibility status combining environment and admin DB settings.
 */
export async function getSignupStatus(): Promise<SignupStatus> {
    const envAllowSignups = isEnvSignupsAllowed();
    let adminAllowSignups = true;

    try {
        const settings = await prisma?.globalAiSettings?.findUnique?.({
            where: { id: 'singleton' },
            select: { allowSignups: true },
        });
        if (settings && typeof settings.allowSignups === 'boolean') {
            adminAllowSignups = settings.allowSignups;
        }
    } catch (error) {
        logger.warn('Failed to fetch allowSignups from GlobalAiSettings, defaulting to true', {
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return {
        allowSignups: envAllowSignups && adminAllowSignups,
        envAllowSignups,
        adminAllowSignups,
    };
}

/**
 * Checks whether new user signups are currently permitted.
 * Short-circuits when ALLOW_SIGNUPS is hard-disabled in the environment.
 */
export async function isSignupAllowed(): Promise<boolean> {
    if (!isEnvSignupsAllowed()) {
        return false;
    }
    const status = await getSignupStatus();
    return status.allowSignups;
}
