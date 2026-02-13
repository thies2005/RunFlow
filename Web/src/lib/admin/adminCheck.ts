/**
 * Admin Access Control
 * 
 * Used to verify if a user has administrative privileges based on their email.
 */

import { prisma } from '@/lib/db';

async function isAdminFromDatabase(email: string): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { isAdmin: true }
        })
        return user?.isAdmin ?? false
    } catch {
        return false
    }
}

function isAdminFromEnv(email: string): boolean {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
        return true;
    }

    return adminList.includes(email.toLowerCase());
}

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;

    const emailLower = email.toLowerCase();
    const isAdminEnv = isAdminFromEnv(emailLower);
    const isAdminDb = await isAdminFromDatabase(emailLower);

    return isAdminEnv || isAdminDb;
}
