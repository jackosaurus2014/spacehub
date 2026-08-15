/**
 * Centralized breadcrumb configuration for all routes.
 *
 * ROUTE_LABELS: human-readable names for each route segment
 * ROUTE_PARENTS: maps a route to its parent route (for building the trail)
 *
 * Dynamic segments like [slug] are resolved at render time by the
 * AutoBreadcrumb component. Any route NOT in the config will fall back
 * to slug → Title Case conversion (e.g., "space-mining" → "Space Mining").
 */

// ─── Route Labels ────────────────────────────────────────────────────────────
// Maps URL path segments → display labels.
// Only needed when the slug-to-title fallback would produce a wrong label.

export const ROUTE_LABELS: Record<string, string> = {
  // ── Core ──
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/dashboard/builder': 'Dashboard Builder',
  '/dashboard/templates': 'Dashboard Templates',
  '/search': 'Search',
  '/messages': 'Messages',
  '/changelog': "What's New",
  '/getting-started': 'Getting Started',

  // ── Explore ──
  '/mission-control': 'Mission Control',
  '/mission-stats': 'Mission Statistics',
  '/mission-heritage': 'Mission Heritage',
  '/mission-simulator': 'Mission Simulator',
  '/launch': 'Launch Day',
  '/launch-vehicles': 'Launch Vehicles',
  '/launch-windows': 'Launch Windows',
  '/launch-economics': 'Launch Economics',
  '/live': 'Live Events',
  '/satellites': 'Satellites',
  '/space-stations': 'Space Stations',
  '/constellations': 'Constellations',
  '/constellation-designer': 'Constellation Designer',
  '/space-events': 'Space Events',
  '/solar-exploration': 'Solar Exploration',
  '/mars-planner': 'Mars Mission Planner',
  '/cislunar': 'Cislunar Ecosystem',
  '/asteroid-watch': 'Asteroid Watch',
  '/space-environment': 'Space Environment',
  '/earth-events': 'Earth Events',
  '/aurora-forecast': 'Aurora Forecast',
  '/guide/watch-a-launch-cape-canaveral': 'Watch a Launch: Cape Canaveral',
  '/guide/watch-a-launch-vandenberg': 'Watch a Launch: Vandenberg',
  '/guide/watch-a-launch-starbase': 'Watch a Launch: Starbase',

  // ── Intelligence ──
  '/space-stocks': 'Space Stocks',
  '/industry-trends': 'Industry Trends',
  '/news': 'News',
  '/news-aggregator': 'News Aggregator',
  '/blogs': 'Blogs & Articles',
  '/blog': 'Blog',
  '/podcasts': 'Podcasts',
  '/newsletters-directory': 'Newsletters Directory',
  '/reports': 'Reports',
  '/reports/state-of-space-2026': 'State of Space 2026',
  '/intelligence-brief': 'Intelligence Brief Hub',
  '/company-profiles': 'Companies',
  '/company-research': 'Company Research',
  '/compare': 'Compare',
  '/compare/companies': 'Compare Companies',
  '/compare/launch-vehicles': 'Compare Launch Vehicles',
  '/compare/satellite-buses': 'Compare Satellite Buses',
  '/compare/satellites': 'Compare Satellites',
  '/compare/bloomberg-terminal': 'vs Bloomberg Terminal',
  '/compare/quilty-analytics': 'vs Quilty Analytics',
  '/compare/payload-space': 'vs Payload Space',
  '/executive-moves': 'Executive Moves',
  '/space-score': 'SpaceNexus Score',
  '/space-agencies': 'Space Agencies',
  '/space-defense': 'Space Defense',
  '/report-cards': 'Report Cards',
  '/ecosystem-map': 'Ecosystem Map',
  '/ai-insights': 'AI Insights',

  // ── Business ──
  '/business-opportunities': 'Business Opportunities',
  '/business-models': 'Business Models',
  '/space-talent': 'Space Talent Hub',
  '/supply-chain': 'Supply Chain',
  '/space-mining': 'Space Mining',
  '/space-insurance': 'Space Insurance',
  '/space-manufacturing': 'Space Manufacturing',
  '/patents': 'Patents & IP',
  '/conferences': 'Conferences',

  // ── Investment ──
  '/funding-tracker': 'Funding Tracker',
  '/funding-opportunities': 'Funding Opportunities',
  '/deal-rooms': 'Deal Rooms',
  '/investors': 'Investors',
  '/startup-tracker': 'Startup Tracker',
  '/unit-economics': 'Unit Economics',
  '/space-tourism': 'Space Tourism',
  '/customer-discovery': 'Customer Discovery',

  // ── Tools / Calculators ──
  '/tools': 'Tools',
  '/orbital-calculator': 'Orbital Calculator',
  '/thermal-calculator': 'Thermal Calculator',
  '/link-budget-calculator': 'Link Budget Calculator',
  '/power-budget-calculator': 'Power Budget Calculator',
  '/radiation-calculator': 'Radiation Calculator',
  '/launch-cost-calculator': 'Launch Cost Calculator',
  '/mission-cost': 'Mission Cost Simulator',
  '/orbital-costs': 'Orbital Costs',
  '/propulsion-database': 'Propulsion Database',
  '/materials-database': 'Materials Database',
  '/tech-readiness': 'Technology Readiness Assessment',
  '/clean-room-reference': 'Clean Room Reference',
  '/standards-reference': 'Standards Reference',
  '/space-comms': 'Space Communications',
  '/orbit-guide': 'Orbit Guide',
  '/acronyms': 'Space Acronyms',
  '/glossary': 'Glossary',

  // ── Regulatory ──
  '/compliance': 'Regulatory Compliance',
  '/regulations': 'Regulations',
  '/regulatory-calendar': 'Regulatory Calendar',
  '/regulatory-tracker': 'Regulatory Tracker',
  '/regulatory-risk': 'Regulatory Risk',
  '/regulation-explainers': 'Regulation Explainers',
  '/regulatory-agencies': 'Regulatory Agencies Directory',
  '/spectrum': 'Spectrum Management',
  '/licensing-checker': 'Licensing Requirements Checker',
  '/export-classifications': 'Export Control Classifications',
  '/legal-resources': 'Legal Resources',

  // ── Space Operations ──
  '/spaceports': 'Spaceports',
  '/ground-stations': 'Ground Stations',
  '/space-edge-computing': 'Space Edge Computing',

  // ── Marketplace ──
  '/marketplace': 'Marketplace',
  '/marketplace/search': 'Search Listings',
  '/marketplace/rfq/new': 'New RFQ',
  '/provider-dashboard': 'Provider Dashboard',

  // ── Procurement ──
  '/procurement': 'Procurement',
  '/procurement/awards': 'Contract Awards',

  // ── Community ──
  '/community': 'Community',
  '/community/forums': 'Forums',
  '/community/directory': 'Member Directory',
  '/community/profile': 'Profile',
  '/community/guidelines': 'Community Guidelines',

  // ── Account & Auth ──
  '/login': 'Sign In',
  '/register': 'Create Account',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/verify-email': 'Verify Email',
  '/pricing': 'Pricing',
  '/my-watchlists': 'My Watchlists',
  '/reading-list': 'Reading List',

  // ── Info / Marketing ──
  '/about': 'About',
  '/contact': 'Contact',
  '/faq': 'FAQ',
  '/features': 'Features',
  '/book-demo': 'Book a Demo',
  '/solutions': 'Solutions',
  '/solutions/investors': 'For Investors',
  '/solutions/analysts': 'For Analysts',
  '/solutions/engineers': 'For Engineers',
  '/solutions/executives': 'For Executives',
  '/use-cases': 'Use Cases',
  '/press': 'Press',
  '/media-kit': 'Media Kit',
  '/security': 'Security',

  // ── Legal ──
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/cookies': 'Cookie Policy',
  '/legal/dmca': 'DMCA',
  '/accessibility': 'Accessibility Statement',

  // ── New Pages ──
  '/newsletter': 'Newsletter',
  '/why-spacenexus': 'Why SpaceNexus',
  '/reports/space-economy-2026': 'Space Economy 2026 Report',
  '/widgets': 'Widgets',

  // ── Space Calendar ──
  '/space-calendar': 'Space Calendar',

  // ── Space Industry Map ──
  '/space-map': 'Space Industry Map',

  // ── Space Industry Statistics ──
  '/space-stats': 'Space Industry Statistics',

  // ── Daily Digest ──

  // ── New Pages (Wave) ──
  '/advertise': 'Advertise',
  '/help': 'Help Center',
  '/checkout/success': 'Checkout Success',
  '/careers': 'Careers',
  '/solutions/space-professionals': 'For Space Professionals',

  // ── Alternatives & Competitors ──
  '/alternatives': 'Alternatives & Competitors',

  // ── Data Sources ──
  '/data-sources': 'Data Sources',

  // ── Developer ──
  '/developer': 'Developer Portal',
  '/developer/docs': 'API Documentation',
  '/developer/explorer': 'API Explorer',

  // ── Guides ──
  '/guide/space-industry': 'Space Industry Guide',
  '/learn': 'Learn',
};

// ─── Route Parents ───────────────────────────────────────────────────────────
// Maps a route to its logical parent. AutoBreadcrumb walks this chain
// to build the full trail: Home > Parent > ... > Current.
// Routes NOT listed here are treated as direct children of Home.

export const ROUTE_PARENTS: Record<string, string> = {
  // Dashboard children
  '/dashboard/builder': '/dashboard',
  '/dashboard/templates': '/dashboard',

  // Solution pages
  '/solutions/investors': '/solutions',
  '/solutions/analysts': '/solutions',
  '/solutions/engineers': '/solutions',
  '/solutions/executives': '/solutions',
  '/solutions/space-professionals': '/solutions',

  // Community pages
  '/community/forums': '/community',
  '/community/directory': '/community',
  '/community/profile': '/community',
  '/community/guidelines': '/community',

  // Marketplace pages
  '/marketplace/search': '/marketplace',
  '/marketplace/rfq/new': '/marketplace',

  // Comparison pages
  '/compare/companies': '/compare',
  '/compare/launch-vehicles': '/compare',
  '/compare/satellite-buses': '/compare',
  '/compare/satellites': '/compare',
  '/compare/bloomberg-terminal': '/compare',
  '/compare/quilty-analytics': '/compare',
  '/compare/payload-space': '/compare',

  // Procurement pages
  '/procurement/awards': '/procurement',

  // Developer pages
  '/developer/docs': '/developer',
  '/developer/explorer': '/developer',

  // Tools / Calculators → parent is /tools
  '/orbital-calculator': '/tools',
  '/thermal-calculator': '/tools',
  '/link-budget-calculator': '/tools',
  '/power-budget-calculator': '/tools',
  '/radiation-calculator': '/tools',
  '/launch-cost-calculator': '/tools',
  '/mission-cost': '/tools',
  '/mission-simulator': '/tools',
  '/orbital-costs': '/tools',
  '/propulsion-database': '/tools',
  '/materials-database': '/tools',
  '/tech-readiness': '/tools',
  '/clean-room-reference': '/tools',
  '/standards-reference': '/tools',
  '/orbit-guide': '/tools',
  '/glossary': '/tools',

  // Regulatory tools → compliance parent
  '/licensing-checker': '/compliance',
  '/export-classifications': '/compliance',
  '/legal-resources': '/compliance',

  // Report sub-pages
  '/reports/state-of-space-2026': '/reports',
  '/reports/space-economy-2026': '/reports',
  '/reports/monthly': '/reports',

  // Guide pages → /learn parent
  '/guide/space-industry': '/learn',
  '/guide/satellite-tracking-guide': '/learn',
  '/guide/space-business-opportunities': '/learn',
  '/guide/space-economy-investment': '/learn',
  '/guide/space-regulatory-compliance': '/learn',
  '/guide/commercial-space-economy': '/learn',
  '/guide/how-satellite-tracking-works': '/learn',
  '/guide/itar-compliance-guide': '/learn',
  '/guide/space-industry-market-size': '/learn',
  '/guide/space-launch-cost-comparison': '/learn',
  '/guide/space-launch-schedule-2026': '/learn',
  '/guide/watch-a-launch-cape-canaveral': '/learn',
  '/guide/watch-a-launch-vandenberg': '/learn',
  '/guide/watch-a-launch-starbase': '/learn',

  // Enthusiast guide pages
  '/aurora-forecast': '/space-environment',

  // Learn sub-pages
  '/learn/how-to-track-satellites': '/learn',
  '/learn/space-companies-to-watch': '/learn',
  '/learn/space-industry-market-size': '/learn',

  // Checkout pages
  '/checkout/success': '/pricing',

  // Legal pages
  '/legal/dmca': '/terms',

  // Media Kit → Press parent
  '/media-kit': '/press',

  // Blog
  '/blog': '/blogs',
};

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert a URL slug to a human-readable label (fallback when not in config). */
export function slugToLabel(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bApi\b/g, 'API')
    .replace(/\bRfq\b/g, 'RFQ')
    .replace(/\bIp\b/g, 'IP')
    .replace(/\bIsru\b/g, 'ISRU')
    .replace(/\bMa\b/g, 'M&A')
    .replace(/\bRf\b/g, 'RF')
    .replace(/\bFaq\b/g, 'FAQ')
    .replace(/\bDmca\b/g, 'DMCA')
    .replace(/\bAi\b/g, 'AI');
}

/**
 * Build a breadcrumb trail for a given pathname.
 * Returns an array of { label, href } items (Home → ... → current page).
 */
export function buildBreadcrumbTrail(
  pathname: string
): { label: string; href: string }[] {
  // Never show breadcrumbs on homepage
  if (pathname === '/') return [];

  const trail: { label: string; href: string }[] = [];

  // Walk the parent chain
  let current = pathname;
  const visited = new Set<string>();

  while (current && current !== '/' && !visited.has(current)) {
    visited.add(current);
    const label = ROUTE_LABELS[current] || slugToLabel(current.split('/').pop() || '');
    trail.unshift({ label, href: current });

    // Check for explicit parent
    const parent = ROUTE_PARENTS[current];
    if (parent) {
      current = parent;
    } else {
      // Implicit parent: go up one path segment
      const segments = current.split('/').filter(Boolean);
      if (segments.length > 1) {
        current = '/' + segments.slice(0, -1).join('/');
      } else {
        break; // Top-level page, parent is Home
      }
    }
  }

  // Prepend Home
  trail.unshift({ label: 'Home', href: '/' });

  return trail;
}
