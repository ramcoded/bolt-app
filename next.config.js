/** @type {import('next').NextConfig} */

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          // Security headers
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          // CORS — restrict to own origin only
          { key: 'Access-Control-Allow-Origin',      value: appUrl },
          { key: 'Access-Control-Allow-Methods',     value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
