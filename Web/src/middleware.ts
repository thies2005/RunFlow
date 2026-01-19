import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: '/login',
    },
})

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth endpoints)
         * - api/webhooks (webhook endpoints)
         * - login (login page)
         * - register (register page)
         * - _next/static (static files)
         * - _next/image (image optimization files)
          * - favicon.ico (favicon file)
         * - icons (public icons folder)
         * - manifest.json (PWA manifest)
         * - sw.js (Service Worker)
         * - swe-worker (Service Worker Workbox)
         * - .well-known (Android App Links / iOS Universal Links)
         */
        '/((?!api/auth|api/webhooks|login|register|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|swe-worker|.well-known).*)',
    ],
}
