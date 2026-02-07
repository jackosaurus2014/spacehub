const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/api/companies',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/news',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/events',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/blogs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/stocks',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // v0.7.0 module consolidation - preserve legacy URLs
      { source: '/lunar-gateway', destination: '/cislunar?tab=gateway', permanent: true },
      { source: '/spectrum-auctions', destination: '/spectrum?tab=auctions', permanent: true },
      { source: '/space-jobs', destination: '/space-talent?tab=jobs', permanent: true },
      { source: '/workforce', destination: '/space-talent?tab=workforce', permanent: true },
      { source: '/solar-flares', destination: '/space-environment?tab=weather', permanent: true },
      { source: '/debris-monitor', destination: '/space-environment?tab=debris', permanent: true },
      { source: '/operational-awareness', destination: '/space-environment?tab=operations', permanent: true },
      { source: '/space-law', destination: '/compliance?tab=treaties', permanent: true },
      { source: '/regulatory-filings', destination: '/compliance?tab=filings', permanent: true },
      { source: '/orbital-services', destination: '/orbital-slots?tab=services', permanent: true },
      { source: '/space-comms', destination: '/spaceports?tab=communications', permanent: true },
      { source: '/imagery-marketplace', destination: '/space-manufacturing?tab=imagery', permanent: true },
      { source: '/bid-protests', destination: '/compliance?tab=protests-overview', permanent: true },
    ];
  },
}

module.exports = withBundleAnalyzer(nextConfig)
