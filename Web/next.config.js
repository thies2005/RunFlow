const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === "development",
    extendDefaultRuntimeCaching: true,
    workboxOptions: {
        disableDevLogs: true,
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "google-fonts-webfonts",
                    expiration: {
                        maxEntries: 4,
                        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                    },
                },
            },
            {
                urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "google-fonts-stylesheets",
                    expiration: {
                        maxEntries: 4,
                        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                    },
                },
            },
            {
                urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "static-font-assets",
                    expiration: {
                        maxEntries: 4,
                        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                    },
                },
            },
            {
                urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "static-image-assets",
                    expiration: {
                        maxEntries: 64,
                        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                    },
                },
            },
            {
                urlPattern: /\/_next\/image\?url=.+$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "next-image",
                    expiration: {
                        maxEntries: 64,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: /\.(?:mp3|wav|ogg)$/i,
                handler: "CacheFirst",
                options: {
                    rangeRequests: true,
                    cacheName: "static-audio-assets",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: /\.(?:js)$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "static-js-assets",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: /\.(?:css|less)$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "static-style-assets",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
                handler: "StaleWhileRevalidate",
                options: {
                    cacheName: "next-data",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: /\.(?:json|xml|csv)$/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "static-data-assets",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
            {
                urlPattern: ({ url }) => {
                    const isSameOrigin = self.origin === url.origin;
                    if (!isSameOrigin) return false;
                    const pathname = url.pathname;
                    // Cache API responses logic
                    if (pathname.startsWith("/api/")) return true;
                    return false;
                },
                handler: "NetworkFirst",
                options: {
                    cacheName: "apis",
                    expiration: {
                        maxEntries: 16,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                    networkTimeoutSeconds: 10, // Fallback to cache if network is slow
                },
            },
            {
                urlPattern: ({ url }) => {
                    const isSameOrigin = self.origin === url.origin;
                    if (!isSameOrigin) return false;
                    const pathname = url.pathname;
                    if (pathname.startsWith("/api/")) return false;
                    return true;
                },
                handler: "StaleWhileRevalidate", // aggressively cache pages
                options: {
                    cacheName: "pages",
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60, // 24 hours
                    },
                },
            },
        ],
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "dgalywyr863hv.cloudfront.net",
                pathname: "/pictures/**",
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
                ],
            },
        ];
    },
};

module.exports = withPWA(nextConfig);
