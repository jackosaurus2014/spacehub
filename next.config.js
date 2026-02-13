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
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'spaceflightnewsapi.net',
      },
      {
        protocol: 'https',
        hostname: '*.spaceflightnewsapi.net',
      },
      {
        protocol: 'https',
        hostname: 'thespacedevs.com',
      },
      {
        protocol: 'https',
        hostname: '*.thespacedevs.com',
      },
      {
        protocol: 'https',
        hostname: '*.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: '*.esa.int',
      },
      {
        protocol: 'https',
        hostname: '*.spacex.com',
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
          { key: 'Link', value: '</sw.js>; rel="serviceworker"' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googletagservices.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.spaceflightnewsapi.net https://ll.thespacedevs.com https://api.nasa.gov https://services.swpc.noaa.gov https://celestrak.org https://www.google-analytics.com https://ssd-api.jpl.nasa.gov https://epic.gsfc.nasa.gov https://eonet.gsfc.nasa.gov https://api.helioviewer.org https://eyes.jpl.nasa.gov https://api.wheretheiss.at https://www.sbir.gov https://images-api.nasa.gov https://exoplanetarchive.ipac.caltech.edu https://www.asterank.com https://pagead2.googlesyndication.com https://adservice.google.com; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" },
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
      // Service worker headers for PWA discoverability
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Digital Asset Links for Android TWA and Apple universal links
      {
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
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
      { source: '/startups', destination: '/space-capital', permanent: true },
    ];
  },
}

module.exports = withBundleAnalyzer(nextConfig)
