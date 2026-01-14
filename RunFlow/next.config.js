/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'dgalywyr863hv.cloudfront.net',
                pathname: '/pictures/**',
            },
        ],
    },
};

module.exports = nextConfig;
