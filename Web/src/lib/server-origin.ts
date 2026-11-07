/** Canonical public origin used for OAuth redirects. Never infer it from request headers. */
export function serverOrigin(): string {
    const value = process.env.NEXTAUTH_URL;
    if (!value) throw new Error('NEXTAUTH_URL must be set to the public server origin');
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Invalid NEXTAUTH_URL'); }
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('NEXTAUTH_URL must be an HTTPS origin without a path, query, or credentials');
    }
    return url.origin;
}
