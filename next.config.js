const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  staticPageGenerationTimeout: 300,
  // Pin the tracing root to this checkout so a nested worktree (or a parent
  // directory with its own lockfile) is never inferred as the workspace root.
  outputFileTracingRoot: __dirname,
  // Next 15: instrumentation.ts is stable, `experimental.instrumentationHook` removed.
  experimental: {
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
    // Content-Security-Policy and X-Frame-Options are set per request in
    // src/middleware.ts (built by src/lib/csp.ts): frame-ancestors differs
    // for /embed/* and /widgets/*, and nonce-eligible routes get a per-request
    // nonce. Setting either here as well would send two CSP headers that the
    // browser intersects (which is exactly how the embeds broke). Keep only
    // the request-independent headers below.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Link', value: '</sw.js>; rel="serviceworker"' },
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
      { source: '/orbital-services', destination: '/marketplace', permanent: true },
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
      { source: '/investment-thesis', destination: '/space-stocks', permanent: true },

      // ── URL consolidation (2026-08) — funding & investment ──
      { source: '/deals', destination: '/funding-tracker', permanent: true },
      { source: '/deal-flow', destination: '/funding-tracker', permanent: true },
      { source: '/funding-rounds', destination: '/funding-tracker', permanent: true },
      { source: '/ma-tracker', destination: '/funding-tracker', permanent: true },
      { source: '/investment-tracker', destination: '/funding-tracker', permanent: true },
      { source: '/space-capital', destination: '/funding-tracker', permanent: true },
      { source: '/space-investors', destination: '/investors', permanent: true },
      { source: '/portfolio-tracker', destination: '/space-stocks', permanent: true },
      { source: '/startup-directory', destination: '/startups', permanent: true },
      // ── URL consolidation (2026-08) — duplicate/overlapping pages ──
      { source: '/space-map', destination: '/ecosystem-map', permanent: true },
      { source: '/conferences', destination: '/space-calendar', permanent: true },
      { source: '/space-events', destination: '/space-calendar', permanent: true },
      { source: '/contract-awards', destination: '/procurement', permanent: true },

      // ── URL consolidation — talent & careers ──
      // 2026-09-01: /jobs is a real server-rendered hub again (src/app/jobs) —
      // the 2026-08-29 '/jobs' → '/space-talent?tab=jobs' 301 was removed so the
      // masthead's hottest business entry has a crawlable page. /space-talent
      // still accepts ?tab=jobs (aliased to the workforce board) for old links.
      { source: '/salary-benchmarks', destination: '/space-talent?tab=salaries', permanent: true },
      { source: '/workforce-analytics', destination: '/space-talent?tab=trends', permanent: true },
      { source: '/career-intelligence', destination: '/space-talent?tab=trends', permanent: true },
      { source: '/career-guide', destination: '/space-talent?tab=insights', permanent: true },
      { source: '/education-pathways', destination: '/space-talent?tab=insights', permanent: true },

      // ── URL consolidation — market intelligence ──
      { source: '/space-economy', destination: '/space-stocks', permanent: true },
      { source: '/market-sizing', destination: '/space-stocks', permanent: true },
      { source: '/market-segments', destination: '/space-stocks', permanent: true },
      { source: '/market-map', destination: '/space-stocks', permanent: true },
      { source: '/industry-scorecard', destination: '/space-stocks', permanent: true },

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
      // '/space-weather' redirect removed 2026-09-01: it is a real page again
      // (src/app/space-weather) — a public, indexable NOAA/DONKI read.
      { source: '/debris', destination: '/space-environment?tab=debris', permanent: true },
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
      { source: '/mission-debriefs/us-eva-98-2', destination: '/mission-debriefs/us-eva-98', permanent: true },
      { source: '/news-digest', destination: '/intelligence-brief', permanent: true },
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
      // (2026-08-28) '/launches' is a real page again — launches by site.

      // ── URL consolidation (2026-08) — regulatory cluster folds into /compliance ──
      // Note: /regulation-explainers is intentionally NOT redirected — it's a live,
      // cron-fed content system (nightly generation, sitemap-registered per-article
      // pages) rather than a duplicative orphan page. See IA cleanup notes.
      { source: '/regulations', destination: '/compliance?tab=ref-all-regs', permanent: true },
      { source: '/regulatory-agencies', destination: '/compliance?tab=ref-agencies', permanent: true },
      { source: '/regulatory-risk', destination: '/compliance?tab=risk', permanent: true },
      { source: '/regulatory-tracker', destination: '/compliance?tab=policy', permanent: true },
      { source: '/legal', destination: '/compliance', permanent: true },
      { source: '/legal-resources', destination: '/compliance?tab=ref-legal', permanent: true },

      // ── URL consolidation (2026-08) — /reports is the canonical hub ──
      { source: '/report/monthly', destination: '/reports/monthly', permanent: true },
      { source: '/report/state-of-space-2026', destination: '/reports/state-of-space-2026', permanent: true },

      // ── Duplicate company profile merged (2026-08) ──
      { source: '/company-profiles/anduril', destination: '/company-profiles/anduril-industries', permanent: true },
      { source: '/company-profiles/abl-space', destination: '/company-profiles/abl-space-systems', permanent: true },

      // ── Artemis Program Tracker (2026-08) ──
      { source: '/artemis-tracker', destination: '/artemis', permanent: true },

      // ── Newsletter/brief surface consolidation (2026-08) ──
      // /newsletter-archive's hardcoded "past editions" content merged into
      // the DB-backed /intelligence-brief hub (PublishedBrief). /briefs (live
      // 7-day digest) and /newsletters-directory (external newsletter
      // directory) are different, unaffected surfaces.
      { source: '/newsletter-archive', destination: '/intelligence-brief', permanent: true },
      // /daily-digest retired (2026-08-14, founder decision): it was a thin
      // restyling of /news's top-5; /briefs is the canonical live digest.
      { source: '/daily-digest', destination: '/intelligence-brief', permanent: true },
      // SATELLITE 2026 ran Mar 23-26, 2026 — the event landing page was still
      // collecting meeting requests + offering a promo code 5 months later.
      { source: '/satellite-2026', destination: '/space-calendar', permanent: true },

      // ── Consolidation wave (2026-08-14): merges + declutter ──
      // Static/duplicate surfaces folded into stronger hubs.
      { source: '/timeline', destination: '/history', permanent: true },
      { source: '/satellite-spotting', destination: '/whats-overhead', permanent: true },
      { source: '/discover', destination: '/getting-started', permanent: true },
      // Legacy static /learn articles superseded by /guide counterparts
      { source: '/learn/space-industry', destination: '/guide/space-industry', permanent: true },
      { source: '/learn/space-industry-market-size', destination: '/guide/space-industry-market-size', permanent: true },
      { source: '/learn/satellite-launch-cost', destination: '/guide/space-launch-cost-comparison', permanent: true },
      { source: '/learn/how-to-track-satellites', destination: '/guide/satellite-tracking-guide', permanent: true },
      { source: '/learn/space-companies-to-watch', destination: '/guide/space-companies-directory', permanent: true },
      // Alerts family consolidated onto the /alerts hub
      { source: '/launch-alerts', destination: '/alerts', permanent: true },
      { source: '/saved-searches', destination: '/alerts?tab=saved-searches', permanent: true },
      { source: '/notifications', destination: '/alerts?tab=notifications', permanent: true },
      { source: '/satellite-alerts', destination: '/alerts?tab=satellite-passes', permanent: true },
      // Developer surfaces 4 -> 2
      { source: '/api-access', destination: '/developer', permanent: true },
      { source: '/integrations', destination: '/data-sources', permanent: true },
      // /market-intel merged into /space-stocks (last consumer of the
      // abandoned SpaceCompany table; ETFs + benchmarks ported over)
      { source: '/market-intel', destination: '/space-stocks', permanent: true },
      // /blogs renamed — third-party blog aggregator vs our own /blog was a
      // perpetual naming collision (founder-approved rename)
      // /blogs used to point at /industry-voices (<=5 views/28d); /blog is
      // the actual article hub and the site's top user-acquirer.
      { source: '/blogs', destination: '/blog', permanent: true },
      // Misspelled path observed receiving real traffic in GA4 (external or
      // stale link somewhere) — catch it rather than 404 it.
      { source: '/funding-tracjer', destination: '/funding-tracker', permanent: true },
      // 2026-08-26: two compare pages ranked for the same queries and split the
      // clicks (Search Console: 4.1k + 7.0k impressions, both <0.5% CTR). The
      // stronger page absorbed the other's table rows; this consolidates the ranking.
      { source: '/compare/spacex-vs-rocket-lab', destination: '/compare/rocket-lab-vs-spacex', permanent: true },
      // Opportunity trio consolidated into the /procurement hub
      { source: '/business-opportunities', destination: '/procurement', permanent: true },
      { source: '/funding-opportunities', destination: '/procurement?tab=grants', permanent: true },
      // Demoted-module salvage merges (content ported into hub tabs)
      { source: '/orbital-slots', destination: '/spectrum?tab=geo-slots', permanent: true },
      { source: '/government-budgets', destination: '/procurement?tab=global-budgets', permanent: true },
      { source: '/blueprints', destination: '/propulsion-database', permanent: true },
    ];
  },
}

module.exports = withBundleAnalyzer(nextConfig)
