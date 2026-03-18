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
  '/notifications': 'Notifications',
  '/messages': 'Messages',
  '/changelog': "What's New",
  '/getting-started': 'Getting Started',

  // ── Explore ──
  '/mission-control': 'Mission Control',
  '/mission-pipeline': 'Mission Pipeline',
  '/mission-stats': 'Mission Statistics',
  '/mission-heritage': 'Mission Heritage',
  '/mission-simulator': 'Mission Simulator',
  '/launch': 'Launch Day',
  '/launch-manifest': 'Launch Manifest',
  '/launch-vehicles': 'Launch Vehicles',
  '/launch-windows': 'Launch Windows',
  '/launch-sites': 'Launch Sites',
  '/launch-economics': 'Launch Economics',
  '/live': 'Live Events',
  '/satellite-tracker': 'Satellite Tracker',
  '/satellites': 'Satellites',
  '/space-stations': 'Space Stations',
  '/constellations': 'Constellations',
  '/constellation-designer': 'Constellation Designer',
  '/space-events': 'Space Events',
  '/space-weather': 'Space Weather',
  '/timeline': 'Space Timeline',
  '/debris-tracker': 'Debris Tracker',
  '/debris-catalog': 'Debris Catalog',
  '/debris-remediation': 'Debris Remediation',
  '/solar-exploration': 'Solar Exploration',
  '/mars-planner': 'Mars Mission Planner',
  '/cislunar': 'Cislunar Ecosystem',
  '/asteroid-watch': 'Asteroid Watch',
  '/space-environment': 'Space Environment',
  '/earth-events': 'Earth Events',
  '/satellite-spotting': 'Satellite Spotting Guide',
  '/aurora-forecast': 'Aurora Forecast',

  // ── Intelligence ──
  '/market-intel': 'Market Intelligence',
  '/market-sizing': 'Market Sizing',
  '/market-map': 'Market Map',
  '/market-segments': 'Market Segments',
  '/space-economy': 'Space Economy',
  '/space-capital': 'Space Capital',
  '/industry-trends': 'Industry Trends',
  '/news': 'News',
  '/news-aggregator': 'News Aggregator',
  '/news-digest': 'News Digest',
  '/blogs': 'Blogs & Articles',
  '/blog': 'Blog',
  '/podcasts': 'Podcasts',
  '/newsletters-directory': 'Newsletters Directory',
  '/reports': 'Reports',
  '/report/state-of-space-2026': 'State of Space 2026',
  '/intelligence-brief': 'Intelligence Brief',
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
  '/ma-tracker': 'M&A Tracker',
  '/report-cards': 'Report Cards',
  '/ecosystem-map': 'Ecosystem Map',
  '/ai-insights': 'AI Insights',

  // ── Business ──
  '/business-opportunities': 'Business Opportunities',
  '/business-models': 'Business Models',
  '/space-talent': 'Space Talent Hub',
  '/jobs': 'Space Jobs',
  '/salary-benchmarks': 'Salary Benchmarks',
  '/workforce-analytics': 'Workforce Analytics',
  '/education-pathways': 'Education Pathways',
  '/career-guide': 'Career Guide',
  '/supply-chain': 'Supply Chain',
  '/supply-chain-map': 'Supply Chain Map',
  '/supply-chain-risk': 'Supply Chain Risk',
  '/space-mining': 'Space Mining',
  '/isru': 'ISRU',
  '/space-insurance': 'Space Insurance',
  '/space-manufacturing': 'Space Manufacturing',
  '/patents': 'Patents & IP',
  '/patent-landscape': 'Patent Landscape',
  '/resource-exchange': 'Resource Exchange',
  '/conferences': 'Conferences',

  // ── Investment ──
  '/funding-tracker': 'Funding Tracker',
  '/funding-rounds': 'Funding Rounds',
  '/funding-opportunities': 'Funding Opportunities',
  '/deal-flow': 'Deal Flow',
  '/deal-rooms': 'Deal Rooms',
  '/deals': 'Deals',
  '/investors': 'Investors',
  '/space-investors': 'Space Investors',
  '/investment-thesis': 'Investment Thesis',
  '/investment-tracker': 'Investment Tracker',
  '/portfolio-tracker': 'Portfolio Tracker',
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
  '/blueprints': 'Blueprints',
  '/propulsion-comparison': 'Propulsion Comparison',
  '/propulsion-database': 'Propulsion Database',
  '/materials-database': 'Materials Database',
  '/satellite-bus-comparison': 'Satellite Bus Comparison',
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
  '/frequency-bands': 'Frequency Bands',
  '/frequency-database': 'Frequency Database',
  '/rf-spectrum': 'RF Spectrum',
  '/space-law': 'Space Law',
  '/licensing-checker': 'Licensing Requirements Checker',
  '/export-classifications': 'Export Control Classifications',
  '/compliance-checklist': 'Compliance Checklist',
  '/legal-resources': 'Legal Resources',

  // ── Space Operations ──
  '/orbital-slots': 'Orbital Slots',
  '/spaceports': 'Spaceports',
  '/ground-stations': 'Ground Stations',
  '/ground-station-directory': 'Ground Station Directory',
  '/imagery-providers': 'Imagery Providers',
  '/space-edge-computing': 'Space Edge Computing',

  // ── Marketplace ──
  '/marketplace': 'Marketplace',
  '/marketplace/search': 'Search Listings',
  '/marketplace/copilot': 'Procurement Copilot',
  '/marketplace/rfq/new': 'New RFQ',
  '/provider-dashboard': 'Provider Dashboard',

  // ── Procurement ──
  '/procurement': 'Procurement',
  '/procurement/awards': 'Contract Awards',
  '/contract-awards': 'Contract Awards',
  '/government-budgets': 'Government Budgets',

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
  '/enterprise': 'Enterprise',
  '/book-demo': 'Book a Demo',
  '/solutions': 'Solutions',
  '/solutions/investors': 'For Investors',
  '/solutions/analysts': 'For Analysts',
  '/solutions/engineers': 'For Engineers',
  '/solutions/executives': 'For Executives',
  '/use-cases': 'Use Cases',
  '/case-studies': 'Case Studies',
  '/press': 'Press',
  '/media-kit': 'Media Kit',
  '/security': 'Security',

  // ── Legal ──
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/cookies': 'Cookie Policy',
  '/legal/dmca': 'DMCA',

  // ── New Pages ──
  '/api-access': 'API Access',
  '/newsletter-archive': 'Newsletter Archive',
  '/newsletter': 'Newsletter',
  '/why-spacenexus': 'Why SpaceNexus',
  '/reports/space-economy-2026': 'Space Economy 2026 Report',
  '/widgets': 'Widgets',

  // ── Industry Scorecard & Calendar ──
  '/industry-scorecard': 'Industry Scorecard',
  '/space-calendar': 'Space Calendar',

  // ── Space Industry Map & Startup Directory ──
  '/space-map': 'Space Industry Map',
  '/startup-directory': 'Startup Directory',

  // ── Space Industry Statistics ──
  '/space-stats': 'Space Industry Statistics',

  // ── Daily Digest ──
  '/daily-digest': 'Daily Digest',

  // ── New Pages (Wave) ──
  '/satellite-2026': 'SATELLITE 2026',
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
  '/learn/space-industry': 'Space Industry Learning Path',
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
  '/marketplace/copilot': '/marketplace',
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
  '/propulsion-comparison': '/tools',
  '/propulsion-database': '/tools',
  '/materials-database': '/tools',
  '/satellite-bus-comparison': '/tools',
  '/tech-readiness': '/tools',
  '/clean-room-reference': '/tools',
  '/standards-reference': '/tools',
  '/orbit-guide': '/tools',
  '/glossary': '/tools',
  '/blueprints': '/tools',

  // Regulatory tools → compliance parent
  '/licensing-checker': '/compliance',
  '/export-classifications': '/compliance',
  '/legal-resources': '/compliance',

  // Report sub-pages
  '/report/state-of-space-2026': '/reports',
  '/reports/space-economy-2026': '/reports',

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

  // Enthusiast guide pages
  '/satellite-spotting': '/learn',
  '/aurora-forecast': '/space-weather',

  // Learn sub-pages
  '/learn/how-to-track-satellites': '/learn',
  '/learn/satellite-launch-cost': '/learn',
  '/learn/space-companies-to-watch': '/learn',
  '/learn/space-industry': '/learn',
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
