/**
 * Mobile Auth Login Endpoint (v1 alias)
 * 
 * POST /api/mobile/v1/auth/login
 * 
 * This is an alias for /api/mobile/auth/login to support Android app
 * which uses the /v1/ path prefix.
 */

export { POST } from '@/app/api/mobile/auth/login/route';
