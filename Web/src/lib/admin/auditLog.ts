import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { getClientIP } from '@/lib/rateLimitAdmin';

export type AdminAction =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'VIEW_USERS'
    | 'VIEW_USER_DETAILS'
    | 'DELETE_USER'
    | 'RESET_PASSWORD'
    | 'TOGGLE_AI_ACCESS'
    | 'MODIFY_AI_SETTINGS'
    | 'MODIFY_PROVIDERS'
    | 'MODIFY_WORKOUT_TEMPLATES'
    | 'VIEW_BACKUPS'
    | 'UPLOAD_BACKUP'
    | 'DOWNLOAD_BACKUP'
    | 'DELETE_BACKUP'
    | 'RECALCULATE_FITNESS'
    | 'VIEW_SYSTEM_STATS'
    | 'VIEW_ANALYTICS'
    | 'MODIFY_ERROR_LOGS'
    | 'MODIFY_RELEASES'
    | 'MODIFY_FEEDBACK_QUEUE'
    | 'RUN_MIGRATION'
    | 'EXPORT_MIGRATION_BUNDLE'
    | 'IMPORT_MIGRATION_BUNDLE';

interface AuditLogTarget {
    type: 'USER' | 'BACKUP' | 'SETTINGS' | 'SYSTEM' | 'PROVIDER' | 'WORKOUT_TEMPLATE' | 'ERROR_LOG' | 'RELEASE' | 'FEEDBACK_QUEUE';
    id?: string;
}

/**
 * Logs an administrative action to the database for GDPR accountability (Art. 5(2)).
 * Ensure this is only called after a successful admin authorization.
 */
export async function logAdminAction(
    req: NextRequest,
    action: AdminAction,
    target?: AuditLogTarget,
    details?: Record<string, any>,
    adminUser?: string
) {
    try {
        const resolvedAdminUser = adminUser || 'SYSTEM_ADMIN';

        // Extract client IP using trusted proxy configuration
        const ipAddress = typeof getClientIP === 'function' ? getClientIP(req) : 'unknown';

        const userAgent = req.headers.get('user-agent') || 'unknown';

        await prisma.adminAuditLog.create({
            data: {
                adminUser: resolvedAdminUser,
                action,
                targetType: target?.type,
                targetId: target?.id,
                details: details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent,
            }
        });

    } catch (error) {
        // We log the failure but do not throw to prevent breaking the main administrative action
        logger.error('Failed to write admin audit log', {
            action,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
