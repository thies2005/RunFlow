import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
    dest: "public",
    cacheOnFrontEndNav: false,
    aggressiveFrontEndNavCaching: false,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    extendDefaultRuntimeCaching: true,
    publicExcludes: ["!index.html"],
    fallbacks: {
        document: "/~offline",
    },
    workboxOptions: {
        importScripts: ["/push-sw.js"],
        skipWaiting: true,
        clientsClaim: true,
        disableDevLogs: true,
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "google-fonts-webfonts",
                    expiration: {
                        maxEntries: 4,
                        maxAgeSeconds: 365 * 24 * 60 * 60,
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
                        maxAgeSeconds: 7 * 24 * 60 * 60,
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
                        maxAgeSeconds: 7 * 24 * 60 * 60,
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
                        maxAgeSeconds: 30 * 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
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
                        maxAgeSeconds: 24 * 60 * 60,
                    },
                },
            },
            {
                urlPattern: ({ url }) => {
                    const isSameOrigin = self.origin === url.origin;
                    if (!isSameOrigin) {
                        return false;
                    }

                    return url.pathname.startsWith("/api/");
                },
                handler: "NetworkFirst",
                options: {
                    cacheName: "apis",
                    expiration: {
                        maxEntries: 16,
                        maxAgeSeconds: 24 * 60 * 60,
                    },
                    networkTimeoutSeconds: 10,
                },
            },
            {
                urlPattern: ({ url }) => {
                    const isSameOrigin = self.origin === url.origin;
                    if (!isSameOrigin) {
                        return false;
                    }

                    return !url.pathname.startsWith("/api/");
                },
                handler: "NetworkFirst",
                options: {
                    cacheName: "pages",
                    networkTimeoutSeconds: 5,
                    expiration: {
                        maxEntries: 32,
                        maxAgeSeconds: 24 * 60 * 60,
                    },
                },
            },
        ],
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    compress: true,
    experimental: {
        optimizePackageImports: [
            "lucide-react",
            "date-fns",
            "@tanstack/react-query",
            "recharts",
            "framer-motion",
            "react-markdown",
            "dompurify",
            "rehype-raw",
            "rehype-sanitize",
            "remark-gfm",
            "sonner",
            "js-tiktoken",
            "react-window",
        ],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "dgalywyr863hv.cloudfront.net",
                pathname: "/pictures/**",
            },
            {
                protocol: "https",
                hostname: "*.strava.com",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            },
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
                    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                    { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
                    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            { source: '/api/mobile/v1/health/daily', destination: '/api/health/daily' },
            { source: '/api/mobile/v1/health/daily/:path*', destination: '/api/health/daily/:path*' },
            { source: '/api/mobile/v1/nutrition/:path*', destination: '/api/health/nutrition/:path*' },
            { source: '/api/mobile/v1/supplements/:path*', destination: '/api/health/supplements/:path*' },
            { source: '/api/mobile/v1/fasting/:path*', destination: '/api/health/fasting/:path*' },
            { source: '/api/mobile/v1/body-composition', destination: '/api/health/body-composition' },
            { source: '/api/mobile/v1/health/sync-batch', destination: '/api/health/sync-batch' },
            { source: '/api/mobile/v1/health/insights/:path*', destination: '/api/health/insights/:path*' },
            { source: '/api/mobile/v1/health/history', destination: '/api/health/history' },
            { source: '/api/mobile/v1/health/nutrition-analytics', destination: '/api/health/nutrition/analytics' },
            { source: '/api/mobile/v1/health/supplement-analytics', destination: '/api/health/supplements/analytics' },
        ];
    },
};

export default withPWAConfig(nextConfig);
