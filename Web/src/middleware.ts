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
         */
        '/((?!api/auth|api/webhooks|login|register|_next/static|_next/image|favicon.ico|icons).*)',
    ],
}
