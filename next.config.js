const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  staticPageGenerationTimeout: 300,
  experimental: {
    instrumentationHook: true,
    workerThreads: false, // Reduce memory usage during static generation
  },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
    // Next.js dev mode needs 'unsafe-eval' for React Fast Refresh and allows
    // HMR websockets + blob: script sources. Loosen CSP in dev only.
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googletagservices.com https://tpc.googlesyndication.com"
      : "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googletagservices.com https://tpc.googlesyndication.com";
    const connectSrc = isDev
      ? "'self' ws: wss: https://api.spaceflightnewsapi.net https://ll.thespacedevs.com https://api.nasa.gov https://services.swpc.noaa.gov https://celestrak.org https://www.google-analytics.com https://ssd-api.jpl.nasa.gov https://epic.gsfc.nasa.gov https://eonet.gsfc.nasa.gov https://api.helioviewer.org https://eyes.jpl.nasa.gov https://api.wheretheiss.at https://www.sbir.gov https://images-api.nasa.gov https://exoplanetarchive.ipac.caltech.edu https://www.asterank.com https://pagead2.googlesyndication.com https://adservice.google.com https://api.spacexdata.com https://www.googleapis.com"
      : "'self' https://api.spaceflightnewsapi.net https://ll.thespacedevs.com https://api.nasa.gov https://services.swpc.noaa.gov https://celestrak.org https://www.google-analytics.com https://ssd-api.jpl.nasa.gov https://epic.gsfc.nasa.gov https://eonet.gsfc.nasa.gov https://api.helioviewer.org https://eyes.jpl.nasa.gov https://api.wheretheiss.at https://www.sbir.gov https://images-api.nasa.gov https://exoplanetarchive.ipac.caltech.edu https://www.asterank.com https://pagead2.googlesyndication.com https://adservice.google.com https://api.spacexdata.com https://www.googleapis.com";
    const csp = `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src ${connectSrc}; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://platform.twitter.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;

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
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Link', value: '</sw.js>; rel="serviceworker"' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      // Static asset caching — immutable content-hashed files (1 year)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Font assets (1 year — self-hosted, immutable)
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Art assets (1 year)
      {
        source: '/art/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Image / font / media assets (1 year)
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/textures/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/screenshots/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // OG images and favicon assets (1 week — may change with branding updates)
      {
        source: '/:file(og-.*\\.png|favicon-.*\\.png|apple-touch-icon.*\\.png|twitter-image\\.png|spacenexus-logo\\.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      // API routes — Vary header so CDN caches per-origin correctly
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Vary',
            value: 'Accept, Accept-Encoding, Origin',
          },
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
      // API route caching — company/marketplace
      {
        source: '/api/company-profiles',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/company-profiles/:slug',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/marketplace/listings',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/api/marketplace/taxonomy',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' },
        ],
      },
      // API route caching — real-time / near-real-time data
      {
        source: '/api/launch-windows',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/satellites',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/space-environment',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/search',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      // API route caching — moderate-frequency data
      {
        source: '/api/compliance',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=1200' },
        ],
      },
      {
        source: '/api/procurement',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/space-tourism',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/supply-chain',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
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
      // /space-comms now has its own standalone page
      { source: '/imagery-marketplace', destination: '/space-manufacturing?tab=imagery', permanent: true },
      { source: '/bid-protests', destination: '/compliance?tab=protests-overview', permanent: true },
      // /startups is now the Startup & Pre-IPO Hub (2026-08) — legacy startup
      // list pages fold into it
      { source: '/startup-tracker', destination: '/startups', permanent: true },
      // Single paid plan (Pro) — retired enterprise marketing page
      { source: '/enterprise', destination: '/pricing', permanent: true },
      // Empty "coming soon" marketing page — retired in favor of /why-spacenexus
      { source: '/case-studies', destination: '/why-spacenexus', permanent: true },
      // Retired user-triggered AI features
      { source: '/marketplace/copilot', destination: '/marketplace/rfq/new', permanent: true },
      { source: '/investment-thesis', destination: '/market-intel', permanent: true },

      // ── URL consolidation (2026-08) — funding & investment ──
      { source: '/deals', destination: '/funding-tracker', permanent: true },
      { source: '/deal-flow', destination: '/funding-tracker', permanent: true },
      { source: '/funding-rounds', destination: '/funding-tracker', permanent: true },
      { source: '/ma-tracker', destination: '/funding-tracker', permanent: true },
      { source: '/investment-tracker', destination: '/funding-tracker', permanent: true },
      { source: '/space-capital', destination: '/funding-tracker', permanent: true },
      { source: '/space-investors', destination: '/investors', permanent: true },
      { source: '/portfolio-tracker', destination: '/market-intel', permanent: true },
      { source: '/startup-directory', destination: '/startups', permanent: true },
      // ── URL consolidation (2026-08) — duplicate/overlapping pages ──
      { source: '/space-map', destination: '/ecosystem-map', permanent: true },
      { source: '/conferences', destination: '/space-calendar', permanent: true },
      { source: '/space-events', destination: '/space-calendar', permanent: true },
      { source: '/contract-awards', destination: '/procurement', permanent: true },

      // ── URL consolidation — talent & careers ──
      { source: '/jobs', destination: '/space-talent?tab=jobs', permanent: true },
      { source: '/salary-benchmarks', destination: '/space-talent?tab=salaries', permanent: true },
      { source: '/workforce-analytics', destination: '/space-talent?tab=trends', permanent: true },
      { source: '/career-intelligence', destination: '/space-talent?tab=trends', permanent: true },
      { source: '/career-guide', destination: '/space-talent?tab=insights', permanent: true },
      { source: '/education-pathways', destination: '/space-talent?tab=insights', permanent: true },

      // ── URL consolidation — market intelligence ──
      { source: '/space-economy', destination: '/market-intel', permanent: true },
      { source: '/market-sizing', destination: '/market-intel', permanent: true },
      { source: '/market-segments', destination: '/market-intel', permanent: true },
      { source: '/market-map', destination: '/market-intel', permanent: true },
      { source: '/industry-scorecard', destination: '/market-intel', permanent: true },

      // ── URL consolidation — supply chain & operations ──
      { source: '/supply-chain-map', destination: '/supply-chain', permanent: true },
      { source: '/supply-chain-risk', destination: '/supply-chain', permanent: true },
      { source: '/launch-manifest', destination: '/mission-control', permanent: true },
      { source: '/mission-pipeline', destination: '/mission-control', permanent: true },
      { source: '/ground-station-directory', destination: '/ground-stations', permanent: true },
      { source: '/launch-sites', destination: '/spaceports', permanent: true },
      { source: '/satellite-tracker', destination: '/satellites', permanent: true },
      { source: '/constellation-tracker', destination: '/constellations', permanent: true },

      // ── URL consolidation — space environment ──
      { source: '/space-weather', destination: '/space-environment?tab=weather', permanent: true },
      { source: '/debris-tracker', destination: '/space-environment?tab=debris', permanent: true },
      { source: '/debris-catalog', destination: '/space-environment?tab=debris', permanent: true },
      { source: '/debris-remediation', destination: '/space-environment?tab=debris', permanent: true },

      // ── URL consolidation — spectrum, patents, compliance ──
      { source: '/frequency-bands', destination: '/spectrum', permanent: true },
      { source: '/frequency-database', destination: '/spectrum', permanent: true },
      { source: '/rf-spectrum', destination: '/spectrum', permanent: true },
      { source: '/patent-landscape', destination: '/patents', permanent: true },
      { source: '/patent-tracker', destination: '/patents', permanent: true },
      { source: '/compliance-engine', destination: '/compliance', permanent: true },
      { source: '/compliance-checklist', destination: '/compliance', permanent: true },
      { source: '/regulatory-hub', destination: '/compliance', permanent: true },

      // ── URL consolidation — misc ──
      { source: '/isru', destination: '/space-mining', permanent: true },
      { source: '/resource-exchange', destination: '/marketplace', permanent: true },
      { source: '/imagery-providers', destination: '/company-profiles', permanent: true },
      { source: '/news-digest', destination: '/daily-digest', permanent: true },
      { source: '/watchlists', destination: '/my-watchlists', permanent: true },
      { source: '/materials-db', destination: '/materials-database', permanent: true },
      { source: '/clean-room', destination: '/clean-room-reference', permanent: true },
      { source: '/space-communications', destination: '/space-comms', permanent: true },
      { source: '/standards', destination: '/standards-reference', permanent: true },
      { source: '/night-sky', destination: '/night-sky-guide', permanent: true },
      { source: '/newsletters', destination: '/newsletters-directory', permanent: true },
      { source: '/satellite-bus-comparison', destination: '/compare/satellite-buses', permanent: true },
      { source: '/propulsion-comparison', destination: '/propulsion-database', permanent: true },
      { source: '/engineering', destination: '/tools', permanent: true },
      { source: '/engineering-hub', destination: '/tools', permanent: true },
      { source: '/launches', destination: '/mission-control', permanent: true },
    ];
  },
}

module.exports = withBundleAnalyzer(nextConfig)
