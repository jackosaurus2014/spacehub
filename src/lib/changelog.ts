// In-app changelog data — "What's New" display after updates

export interface ChangelogChange {
  type: 'feature' | 'improvement' | 'fix';
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  title: string;
  description: string;
  highlight?: string; // Key metric or stat to feature
  changes: ChangelogChange[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.1.0',
    date: '2026-03-18',
    title: '130 Articles & Platform Polish',
    description:
      'Wave 143+ milestone: 130 original blog articles, blog table of contents, topics index, space industry trends dashboard, alternatives comparison, daily quiz, daily digest, 8 podcast feeds, cross-linked data pages, and a polished "Explore the Platform" homepage section. Final authority-building wave.',
    highlight: '130 articles, 63 waves complete, 590+ routes',
    changes: [
      { type: 'feature', text: '130 original blog articles covering the full breadth of the space industry' },
      { type: 'feature', text: 'Blog Table of Contents with sticky sidebar navigation for long-form articles' },
      { type: 'feature', text: 'Blog Topics Index page for browsing articles by category and tag' },
      { type: 'feature', text: '"130+ Articles" badge displayed across the platform' },
      { type: 'feature', text: 'Space Industry Trends dashboard with sector-level growth metrics' },
      { type: 'feature', text: 'Alternatives comparison page positioning SpaceNexus against competing tools' },
      { type: 'feature', text: 'Daily Space Quiz — test your space industry knowledge every day' },
      { type: 'feature', text: 'Daily Digest page with curated morning briefing content' },
      { type: 'feature', text: '8 curated podcast feeds from top space industry shows' },
      { type: 'feature', text: 'Complete List of Space ETFs and Stocks for 2026' },
      { type: 'feature', text: 'Founder\'s Guide to Starting a Space Company' },
      { type: 'feature', text: 'Satellite Constellations Explained: GPS to Starlink' },
      { type: 'feature', text: 'Space Launch Process: Countdown to Orbit guide' },
      { type: 'feature', text: 'SpaceNexus vs Quilty Space comparison article' },
      { type: 'improvement', text: 'Cross-linked data pages with related blog articles for deeper exploration' },
      { type: 'improvement', text: 'Popular Pages section on the 404 page to recover lost visitors' },
      { type: 'improvement', text: 'Trending Articles sidebar on blog listing and article pages' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-18',
    title: 'SpaceNexus 2.0 — The Complete Space Intelligence Platform',
    description:
      'Major milestone: 100 original blog articles, 30+ modules, 600+ routes, 200+ company profiles, and every tool a space professional needs — all in one platform. SpaceNexus 2.0 is the most comprehensive free space intelligence platform on the internet.',
    highlight: '100 articles, 200+ companies, 30+ modules, 600+ routes',
    changes: [
      { type: 'feature', text: '100 original blog articles covering every corner of the space industry — from satellite internet and CubeSats to space cybersecurity and nuclear propulsion' },
      { type: 'feature', text: 'Industry Scorecard with quarterly grades across 6 dimensions: Launch, Satellite, Investment, Policy, Workforce, and Innovation' },
      { type: 'feature', text: 'Space Calendar with month-by-month key dates, launches, and conferences for 2026' },
      { type: 'feature', text: 'Interactive Space Industry Map showing sector relationships and company positioning across the ecosystem' },
      { type: 'feature', text: 'Startup Directory with curated profiles of 35+ emerging space companies and funding data' },
      { type: 'feature', text: '126 space industry acronyms in the A-Z reference — the most comprehensive space acronym database available' },
      { type: 'feature', text: '69 glossary terms with detailed definitions for space industry concepts' },
      { type: 'feature', text: 'Livestream detection and embedding for YouTube and X (Twitter) live launch coverage' },
      { type: 'feature', text: 'Learning Path system for structured space industry education from beginner to advanced' },
      { type: 'feature', text: 'Newsletter landing page with email capture and past issue archive' },
      { type: 'feature', text: 'Media Kit with brand assets, logos, and press resources for journalists and partners' },
      { type: 'feature', text: '8 curated podcast feeds aggregated from top space industry shows' },
      { type: 'feature', text: '26 content sources monitored for real-time space industry news aggregation' },
      { type: 'improvement', text: 'Complete platform polish pass across all 30+ modules and 600+ routes' },
      { type: 'improvement', text: '200+ company profiles with financials, satellite assets, leadership, and news integration' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-03-17',
    title: 'Content Authority & Platform Depth',
    description:
      'Waves 125-128: 64 blog articles reaching content authority, newsletter landing page, learning path, media kit, space stats page, data sources page, startup directory, space industry map, industry scorecard, space calendar, event watchlist, daily briefing, and feedback button.',
    highlight: '64 blog articles, newsletter page, learning path, media kit',
    changes: [
      { type: 'feature', text: '64 original blog articles establishing content authority across the space industry' },
      { type: 'feature', text: 'Newsletter landing page with email capture and past issue archive' },
      { type: 'feature', text: 'Learning path system for structured space industry education' },
      { type: 'feature', text: 'Media kit page with brand assets, logos, and press resources' },
      { type: 'feature', text: 'Space stats page with live industry metrics and growth tracking' },
      { type: 'feature', text: 'Data sources transparency page listing all platform data origins' },
      { type: 'feature', text: 'Startup directory with curated profiles of emerging space companies' },
      { type: 'feature', text: 'Interactive space industry map showing sector relationships and company positioning' },
      { type: 'feature', text: 'Industry scorecard with quarterly grades across 6 industry dimensions' },
      { type: 'feature', text: 'Space calendar with month-by-month key dates for 2026' },
      { type: 'feature', text: 'Event watchlist for tracking launches and conferences' },
      { type: 'feature', text: 'Daily briefing feature with curated morning space industry updates' },
      { type: 'improvement', text: 'Feedback button for user-submitted feature requests and bug reports' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-03-17',
    title: 'Industry Intelligence & Content Milestone',
    description:
      'Waves 121-124: Space Industry Scorecard, Calendar, Map, Startup Directory, 55 blog articles, 126 acronyms, NASA APOD integration, Space History Today, event watchlist, feedback button, time tracking, and Data Sources transparency page.',
    highlight: '55 blog articles, 126 acronyms, Data Sources page, Industry Scorecard',
    changes: [
      { type: 'feature', text: 'Space Industry Scorecard with quarterly grades across 6 industry dimensions' },
      { type: 'feature', text: 'Space Calendar with month-by-month key dates for 2026' },
      { type: 'feature', text: 'Interactive Space Industry Map showing sector relationships and company positioning' },
      { type: 'feature', text: 'Startup Directory with curated profiles of 35+ emerging space companies' },
      { type: 'feature', text: '55 new blog articles covering launches, markets, technology, and analysis' },
      { type: 'feature', text: '126 space industry acronyms added to the A-Z reference' },
      { type: 'feature', text: 'NASA APOD (Astronomy Picture of the Day) integration on the dashboard' },
      { type: 'feature', text: 'Space History Today — daily historical milestones from spaceflight history' },
      { type: 'feature', text: 'Event watchlist feature for tracking launches and conferences' },
      { type: 'feature', text: 'Data Sources transparency page listing all 30+ platform data sources' },
      { type: 'improvement', text: 'Feedback button added for user-submitted feature requests and bug reports' },
      { type: 'improvement', text: 'Time tracking integration for developer productivity metrics' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-03-17',
    title: 'Platform Maturity & Content Expansion',
    description:
      'Waves 117-120: 44 blog articles, 578 build routes, comprehensive SEO with rich results, conversion optimization, and final platform polish across 40 waves of recursive development.',
    highlight: '44 blog articles, 578 routes, comprehensive SEO, conversion optimization',
    changes: [
      { type: 'feature', text: '44 original blog articles covering every aspect of the space industry' },
      { type: 'feature', text: '"SpaceNexus vs Free Tools" comparison article for competitive positioning' },
      { type: 'feature', text: '"The Bloomberg Terminal Problem" thought leadership piece' },
      { type: 'feature', text: 'Blog ItemList JSON-LD for SEO rich results on /blog' },
      { type: 'feature', text: 'Trial preview expandable section on pricing page' },
      { type: 'feature', text: 'Email signature template for founder outreach' },
      { type: 'improvement', text: 'hreflang tags added to root layout for English language SEO' },
      { type: 'improvement', text: 'Animated platform stats on pricing page with scroll-triggered counters' },
      { type: 'improvement', text: 'Reading time estimates displayed on news cards' },
      { type: 'improvement', text: 'About page enhanced with mission statement and team information' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-03-17',
    title: 'Content, Livestreams & Platform Polish',
    description:
      'Waves 106-116: 42 blog articles, livestream detection and embedding, glossary expansion, RecentlyViewed dashboard component, LinkedIn post templates, performance and mobile improvements, and honesty-first cleanup.',
    highlight: '42 articles, 69 glossary terms, livestream embedding',
    changes: [
      { type: 'feature', text: '42 blog articles covering space industry trends, launches, and analysis' },
      { type: 'feature', text: 'Livestream detection and embedding for YouTube and X platforms' },
      { type: 'feature', text: 'Livestream countdown card on landing page when no stream is active' },
      { type: 'feature', text: '69 glossary terms added to the space industry glossary' },
      { type: 'feature', text: 'RecentlyViewed dashboard component for quick navigation to past pages' },
      { type: 'feature', text: '5 LinkedIn post templates for space industry professionals' },
      { type: 'improvement', text: 'Preconnect hints for API performance optimization' },
      { type: 'improvement', text: 'UTM tracking on conversion CTAs for attribution analytics' },
      { type: 'improvement', text: 'Mobile touch targets increased to 44px minimum for accessibility' },
      { type: 'fix', text: 'Fabricated testimonials removed in favor of real social proof (honesty first)' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-03-17',
    title: 'Intelligence & Content Expansion',
    description:
      'Waves 92-103: Livestream detection and embedding, 38 original blog articles, SpaceX API and EONET integrations, USAspending federal contract data, help center, podcast aggregation, referral program, outreach templates, and comprehensive quality improvements.',
    highlight: '38 blog articles, 6 API integrations',
    changes: [
      { type: 'feature', text: 'Livestream detection and embedding system for live launch coverage' },
      { type: 'feature', text: '38 original blog articles covering space industry trends, launches, and analysis' },
      { type: 'feature', text: 'SpaceX API integration for real-time launch and vehicle data' },
      { type: 'feature', text: 'NASA EONET integration for Earth natural event tracking' },
      { type: 'feature', text: 'USAspending.gov integration for federal space contract spending data' },
      { type: 'feature', text: 'Help center with searchable FAQ and troubleshooting guides' },
      { type: 'feature', text: 'Podcast aggregation system with curated space industry feeds' },
      { type: 'feature', text: 'Referral program with tracking and reward system' },
      { type: 'feature', text: 'Outreach templates for partnerships and investor communications' },
      { type: 'improvement', text: 'Sitemap coverage expanded to all public pages' },
      { type: 'improvement', text: 'Breadcrumb labels and navigation hierarchy refined' },
      { type: 'improvement', text: 'Module relationship mappings updated for all new pages' },
      { type: 'improvement', text: 'Social sharing meta tags optimized for homepage' },
      { type: 'fix', text: 'Missing pages added to sitemap, breadcrumb config, and module relationships' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-14',
    title: 'Major Platform Update',
    description:
      'Waves 80-91: Major expansion with podcast aggregation, SpaceX API, NASA Earth Events, federal spending data, 12 new blog articles, embeddable widgets, API pricing docs, referral program, SATELLITE 2026 conference page, and dozens of fixes and improvements.',
    highlight: '9 new features, 4 improvements, 3 fixes',
    changes: [
      { type: 'feature', text: 'Podcast aggregation system with 5 curated feeds' },
      { type: 'feature', text: 'SpaceX API integration for launch and vehicle data' },
      { type: 'feature', text: 'NASA Earth Events (EONET) tracking for natural events' },
      { type: 'feature', text: 'USAspending.gov federal spending data for space-related contracts' },
      { type: 'feature', text: '12 new blog articles covering trending space industry topics' },
      { type: 'feature', text: 'Embeddable widgets page for external site integration' },
      { type: 'feature', text: 'API pricing and documentation page for developers' },
      { type: 'feature', text: 'Referral program for user growth and rewards' },
      { type: 'feature', text: 'SATELLITE 2026 conference page with schedule and exhibitors' },
      { type: 'improvement', text: 'Founding Member pricing offer with early-adopter benefits' },
      { type: 'improvement', text: 'Interactive FAQ on pricing page for common questions' },
      { type: 'improvement', text: 'Onboarding checklist on dashboard for new user guidance' },
      { type: 'improvement', text: 'Mobile responsiveness across all new and existing pages' },
      { type: 'fix', text: 'Pricing inconsistency resolved across all pages' },
      { type: 'fix', text: 'Company profiles data loading reliability improved' },
      { type: 'fix', text: 'Cron job CSRF authentication hardened' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-02-27',
    title: 'Platform Polish & Animation Overhaul',
    description:
      'A sweeping refinement pass across the entire platform: scroll-triggered animations, social sharing, PDF exports, print styles, accessibility, SEO metadata, structured data, dark theme consistency, and homepage upgrades.',
    highlight: '100+ pages enhanced',
    changes: [
      { type: 'feature', text: 'ScrollReveal entrance animations added to 100+ pages' },
      { type: 'feature', text: 'ShareButton social sharing on 13+ pages (Twitter, LinkedIn, copy link)' },
      { type: 'feature', text: 'PDF export capability for reports and company profiles' },
      { type: 'feature', text: 'Comprehensive print styles for all major pages' },
      { type: 'feature', text: 'JSON-LD structured data schemas (WebSite, FAQ, Event)' },
      { type: 'feature', text: 'Homepage Featured Tools section with quick-access cards' },
      { type: 'feature', text: 'Homepage Recent Updates feed showing latest platform changes' },
      { type: 'improvement', text: 'WCAG 2.1 AA accessibility: skip-to-content links, focus-visible outlines, ARIA labels' },
      { type: 'improvement', text: '50+ new SEO layout files with Open Graph metadata and canonical URLs' },
      { type: 'improvement', text: 'Dark theme consistency across all components and pages' },
      { type: 'improvement', text: 'Enhanced footer with comprehensive navigation and social links' },
      { type: 'improvement', text: 'AnimatedPageHeader component used across all pages' },
      { type: 'fix', text: 'Color contrast ratios improved to meet WCAG AA standards' },
      { type: 'fix', text: 'Focus management for modals and dialogs' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-14',
    title: 'Content Expansion & SEO',
    description:
      '30+ new content pages covering tools, calculators, directories, analytics, and industry reference material. Major SEO infrastructure improvements.',
    highlight: '30+ new pages',
    changes: [
      { type: 'feature', text: 'Mission Simulator for planning hypothetical missions with cost estimates' },
      { type: 'feature', text: 'Orbital Calculator for transfer orbits, delta-v, and period calculations' },
      { type: 'feature', text: 'Thermal Calculator for spacecraft thermal analysis' },
      { type: 'feature', text: 'Space industry glossary with 200+ terms and definitions' },
      { type: 'feature', text: 'Interactive space industry timeline from Sputnik to present' },
      { type: 'feature', text: 'Space FAQ page with structured data for Google Rich Results' },
      { type: 'feature', text: 'Conference directory with 50+ space industry events' },
      { type: 'feature', text: 'Podcast directory featuring top space industry shows' },
      { type: 'feature', text: 'Newsletter directory of curated space industry newsletters' },
      { type: 'feature', text: 'Market segments breakdown across 12 space sectors' },
      { type: 'feature', text: 'Patent landscape visualization for space technology IP' },
      { type: 'feature', text: 'Workforce analytics dashboard for space industry employment' },
      { type: 'feature', text: 'Funding rounds database tracking space venture capital' },
      { type: 'feature', text: 'M&A tracker for space industry acquisitions and mergers' },
      { type: 'feature', text: 'Sustainability scorecard rating companies on ESG metrics' },
      { type: 'feature', text: 'Original blog with 6 articles and RSS feed' },
      { type: 'feature', text: 'City-specific pages for 5 major space industry hubs' },
      { type: 'feature', text: 'Press kit page for media inquiries' },
      { type: 'improvement', text: 'Enhanced structured data for Google Rich Results' },
      { type: 'improvement', text: 'Page-level SEO metadata added to 10+ key pages' },
      { type: 'improvement', text: 'Homepage trust signals showing data sources and platform stats' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-12',
    title: 'Marketplace Launch',
    description:
      'Full B2B marketplace for the space industry with RFQ workflows, AI-powered procurement copilot, company comparison tools, and native mobile apps.',
    highlight: '80 marketplace listings',
    changes: [
      { type: 'feature', text: 'Space Marketplace with 80 service listings across 10 categories' },
      { type: 'feature', text: 'RFQ system with proposal submission and provider matching' },
      { type: 'feature', text: 'AI-powered procurement copilot (Claude Sonnet) for RFQ assistance' },
      { type: 'feature', text: 'Company comparison tool for side-by-side analysis' },
      { type: 'feature', text: 'Investment tracker and deal flow database' },
      { type: 'feature', text: 'Android app available on Google Play' },
      { type: 'feature', text: 'iOS app with Face ID and push notifications' },
      { type: 'feature', text: 'Non-intrusive ad integration on 8 pages with AdSense fallback' },
      { type: 'improvement', text: 'Account deletion (self-service) at /account' },
      { type: 'improvement', text: 'Provider dashboard with analytics and engagement metrics' },
      { type: 'fix', text: 'All critical, high, and medium security findings from audit resolved' },
      { type: 'fix', text: 'CSRF protection hardened on all mutation endpoints' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-10',
    title: 'Company Intelligence',
    description:
      'Comprehensive company intelligence platform with 100+ detailed profiles, Space Score ratings, satellite asset tracking, facility mapping, and news integration.',
    highlight: '100+ company profiles',
    changes: [
      { type: 'feature', text: '100+ space company profiles with 9-tab detail pages' },
      { type: 'feature', text: 'Space Score rating system across 6 dimensions' },
      { type: 'feature', text: 'Satellite asset tracking linked to company profiles' },
      { type: 'feature', text: 'Facility locations with interactive map view' },
      { type: 'feature', text: 'Executive moves tracker for leadership changes' },
      { type: 'feature', text: 'Company watchlists and saved searches' },
      { type: 'feature', text: 'News article tagging with company mention detection' },
      { type: 'improvement', text: 'News cards display company badges linking to profiles' },
      { type: 'improvement', text: 'Company directory with grid and list views, advanced filters' },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-02-08',
    title: 'Mobile & Revenue Infrastructure',
    description:
      'Native mobile experience with PWA offline support, Stripe payment integration, commercial API product with developer portal, smart alerts, and procurement intelligence.',
    highlight: '114 new files, 236 routes',
    changes: [
      { type: 'feature', text: 'PWA with offline support, install prompt, and home screen icons' },
      { type: 'feature', text: 'Stripe payment integration for Pro and Enterprise tiers' },
      { type: 'feature', text: 'Commercial API v1 with developer portal and API key management' },
      { type: 'feature', text: 'Smart alert system with configurable rules and email delivery' },
      { type: 'feature', text: 'SAM.gov procurement intelligence for government contracts' },
      { type: 'feature', text: 'Custom dashboard builder with drag-and-drop widgets' },
      { type: 'feature', text: 'Real-time launch day dashboard with live chat' },
      { type: 'feature', text: '6 mobile-optimized hooks (swipe gestures, pull-to-refresh, etc.)' },
      { type: 'improvement', text: 'Mobile navigation with swipe and gesture support' },
      { type: 'improvement', text: 'Widget system for iOS and Android home screens' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-02-05',
    title: 'Data Source Expansion',
    description:
      'Massive expansion of real-time data feeds including NASA/JPL APIs, NOAA weather, RSS aggregation, and automated cron jobs for continuous data freshness.',
    highlight: '26 fetcher functions',
    changes: [
      { type: 'feature', text: '12 new NASA/JPL API integrations (APOD, NEO, Mars Rover, etc.)' },
      { type: 'feature', text: '8 NOAA space weather data feeds' },
      { type: 'feature', text: '53 RSS feeds aggregated from industry sources' },
      { type: 'feature', text: '39 blog sources monitored for new content' },
      { type: 'feature', text: '9 automated cron jobs for data freshness' },
      { type: 'improvement', text: 'Circuit breaker pattern for all external API calls' },
      { type: 'improvement', text: 'TTL cache layer for API fallback data' },
      { type: 'improvement', text: 'HTML sanitization for all RSS feed content' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-02-01',
    title: 'Module Consolidation',
    description:
      'Consolidated 44 modules into 10 main categories with tab-based navigation, legacy redirects, and a cleaner information architecture.',
    highlight: '44 modules into 10',
    changes: [
      { type: 'improvement', text: 'Consolidated 44 modules into 10 main modules with sub-navigation' },
      { type: 'feature', text: '8 tab-based merged pages (cislunar, spectrum, talent, compliance, etc.)' },
      { type: 'feature', text: 'Space Talent Hub merging jobs and workforce analytics' },
      { type: 'feature', text: 'Space Environment page merging weather, debris, and ops awareness' },
      { type: 'improvement', text: '12 permanent redirects for legacy routes' },
      { type: 'improvement', text: 'Module configurator for personalized navigation' },
      { type: 'fix', text: 'Sidebar z-index layering issues resolved' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-01-28',
    title: 'Module Expansion',
    description:
      '13 new modules added from brainstorming research, expanding the platform to 44 total modules.',
    highlight: '44 total modules',
    changes: [
      { type: 'feature', text: 'Space Law and Regulatory Filings modules' },
      { type: 'feature', text: 'Space Economy and Launch Vehicles modules' },
      { type: 'feature', text: 'Space Stations and Cislunar Ecosystem modules' },
      { type: 'feature', text: 'Spaceports and Asteroid Watch modules' },
      { type: 'feature', text: 'Patents, Space Manufacturing, and Space Comms modules' },
      { type: 'feature', text: 'Imagery Marketplace and Space Defense modules' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-01-22',
    title: 'Navigation & Configuration',
    description:
      'Prominent navigation, module configurator, pricing updates, and 6 new modules.',
    changes: [
      { type: 'feature', text: 'Module configurator for personalizing sidebar navigation' },
      { type: 'feature', text: '6 new modules added to the platform' },
      { type: 'feature', text: 'Service provider submission form with admin email notifications' },
      { type: 'improvement', text: 'Prominent navigation buttons on Next Steps page' },
      { type: 'improvement', text: 'Updated pricing with Market Intel moved to free tier' },
      { type: 'improvement', text: 'Text contrast improvements across all modules' },
      { type: 'fix', text: 'Sidebar z-index fix for overlapping content' },
    ],
  },
  {
    version: '0.4.2',
    date: '2026-01-18',
    title: 'Developer Experience & Performance',
    description:
      'Pinned dependencies, structured logging, circuit breaker, bundle analysis, accessibility, and chart enhancements.',
    changes: [
      { type: 'feature', text: 'Bundle analyzer (ANALYZE=true) for build optimization' },
      { type: 'feature', text: 'Structured logging with src/lib/logger.ts' },
      { type: 'feature', text: 'Circuit breaker pattern for external API resilience' },
      { type: 'feature', text: 'API cache with TTL for fallback data' },
      { type: 'feature', text: 'Chart export (PNG/SVG) and zoom/pan controls' },
      { type: 'feature', text: 'Webhook dispatcher for external integrations' },
      { type: 'feature', text: 'Keyboard shortcuts modal and recently viewed items' },
      { type: 'feature', text: 'Pull-to-refresh and swipe gestures for mobile' },
      { type: 'improvement', text: 'High-contrast mode for accessibility' },
      { type: 'improvement', text: 'Screen reader improvements and keyboard navigation' },
      { type: 'improvement', text: 'Responsive charts with touch-friendly tooltips' },
      { type: 'improvement', text: 'Three.js tree shaking for smaller bundles' },
      { type: 'improvement', text: 'Prisma .select() for optimized database queries' },
      { type: 'improvement', text: 'CONTRIBUTING.md developer guide added' },
      { type: 'fix', text: 'Pinned all dependencies for reproducible builds' },
    ],
  },
  {
    version: '0.4.1',
    date: '2026-01-14',
    title: 'Security & Authentication',
    description:
      'Security hardening, authentication flows, skeleton loaders, CI pipeline, testing, and accessibility improvements.',
    changes: [
      { type: 'feature', text: 'Password reset flow with email tokens (1hr expiry, bcrypt)' },
      { type: 'feature', text: 'Email verification on registration via Resend' },
      { type: 'feature', text: 'CSRF protection with Origin/Referer header checks' },
      { type: 'feature', text: 'Rate limiting (sliding window) on all API routes' },
      { type: 'feature', text: 'Skeleton loader components for loading states' },
      { type: 'feature', text: 'Toast notification system' },
      { type: 'feature', text: 'GitHub Actions CI pipeline (lint, test, build)' },
      { type: 'feature', text: '80 tests across 4 test suites (Jest)' },
      { type: 'improvement', text: 'Anti-enumeration on forgot-password endpoint' },
      { type: 'fix', text: 'Edge Runtime compatibility for middleware (Map iterator fix)' },
    ],
  },
];

/**
 * Get changelog entries newer than a given version
 */
export function getNewEntries(lastSeenVersion: string | null): ChangelogEntry[] {
  if (!lastSeenVersion) return CHANGELOG;

  const idx = CHANGELOG.findIndex((e) => e.version === lastSeenVersion);
  if (idx <= 0) return [];

  return CHANGELOG.slice(0, idx);
}

/**
 * Get the latest version string
 */
export function getLatestVersion(): string {
  return CHANGELOG[0]?.version || '0.0.0';
}

/**
 * Get total counts by change type across all versions
 */
export function getChangelogStats() {
  let features = 0;
  let improvements = 0;
  let fixes = 0;

  for (const entry of CHANGELOG) {
    for (const change of entry.changes) {
      if (change.type === 'feature') features++;
      else if (change.type === 'improvement') improvements++;
      else if (change.type === 'fix') fixes++;
    }
  }

  return { features, improvements, fixes, totalVersions: CHANGELOG.length };
}
