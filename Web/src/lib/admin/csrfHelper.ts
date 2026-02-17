/**
 * Client-side CSRF helper for the admin dashboard
 * 
 * Reads the CSRF token from the csrf_token cookie (set on login)
 * and provides it for inclusion in fetch headers.
 */

const CSRF_COOKIE_NAME = 'csrf_token_client';

/**
 * Get the CSRF token from the cookie for use in fetch requests.
 * Returns the token string or empty string if not found.
 */
export function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === CSRF_COOKIE_NAME) {
            return decodeURIComponent(value || '');
        }
    }
    return '';
}

/**
 * Get headers object with CSRF token included.
 * Merges with Content-Type: application/json by default.
 */
export function csrfHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...extra,
    };
}
