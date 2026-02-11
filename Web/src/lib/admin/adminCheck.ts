/**
 * Admin Access Control
 * 
 * Used to verify if a user has administrative privileges based on their email.
 */

/**
 * Check if an email is an authorized administrator
 */
export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;

    // Check against comma-separated list in environment variables
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    // Also check single ADMIN_EMAIL for convenience
    if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
        return true;
    }

    return adminList.includes(email.toLowerCase());
}
