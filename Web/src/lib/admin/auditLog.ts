import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logging/logger';

type AdminAction =
    | 'VIEW_USERS'
    | 'VIEW_USER_DETAILS'
    | 'DELETE_USER'
    | 'RESET_PASSWORD'
    | 'TOGGLE_AI_ACCESS'
    | 'MODIFY_AI_SETTINGS'
    | 'MODIFY_PROVIDERS'
    | 'VIEW_BACKUPS'
    | 'UPLOAD_BACKUP'
    | 'DOWNLOAD_BACKUP'
    | 'DELETE_BACKUP'
    | 'RECALCULATE_FITNESS'
    | 'VIEW_SYSTEM_STATS'
    | 'VIEW_ANALYTICS';

interface AuditLogTarget {
    type: 'USER' | 'BACKUP' | 'SETTINGS' | 'SYSTEM' | 'PROVIDER';
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
    details?: Record<string, any>
) {
    try {
        // Since admin auth is handled via a shared global password in this system,
        // we use a generic identifier. In a multi-admin setup, this would be the admin's User ID.
        const adminUser = 'SYSTEM_ADMIN';

        // Safely extract client IP from headers
        const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';

        const userAgent = req.headers.get('user-agent') || 'unknown';

        await prisma.adminAuditLog.create({
            data: {
                adminUser,
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
