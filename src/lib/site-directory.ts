// ─── Site directory ───────────────────────────────────────────────────────────
// One curated map of every live surface, in the groups a visitor thinks in.
// Feeds two things:
//   • the navigation (each top-level menu shows a group's `nav: true` rows —
//     the handful people actually use — and ends with "Everything in …" that
//     opens the full group on /tools);
//   • /tools, the searchable directory of everything else.
//
// Why (2026-08-28): the old menus listed 46 links across four dropdowns.
// The 28-day usage census found 52 of 115 trafficked sections at ≤5 views,
// and the founder asked for the long tail to leave the menus without the
// pages disappearing. `nav` = earns a menu slot (traffic or strategic);
// everything else is one click further, in the directory.
//
// Mothballed suites (src/lib/mothballed-routes.ts) are deliberately absent.

export interface DirectoryEntry {
  name: string;
  href: string;
  description: string;
  icon: string;
  /** Show in the top navigation dropdown for its group. */
  nav?: boolean;
  /** Proven audience (GA4/Search Console) — surfaced first in the directory. */
  hot?: boolean;
  /** Pro-gated surface. */
  pro?: boolean;
}

export interface DirectoryGroup {
  key: 'launches' | 'news' | 'markets' | 'business' | 'learn' | 'ops' | 'reference';
  label: string;
  blurb: string;
  /** Appears as a top-level menu. Groups without it live only in the directory. */
  menu?: boolean;
  entries: DirectoryEntry[];
}

export const SITE_DIRECTORY: readonly DirectoryGroup[] = [
  {
    key: 'launches', label: 'Launches', blurb: 'What is flying, when, from where — and how to watch.', menu: true,
    entries: [
      { name: 'Mission Control', href: '/mission-control', description: 'Live countdowns, streams and every upcoming mission', icon: '🚀', nav: true, hot: true },
      { name: 'Rockets', href: '/rockets', description: 'Every rocket: cost, payload, record, next launch', icon: '🛸', nav: true, hot: true },
      { name: 'Launches by Site', href: '/launches', description: 'Cape, Vandenberg, Starbase… month by month', icon: '📍', nav: true },
      { name: 'Launch Cadence Index', href: '/launch-cadence', description: 'Live YoY launch pace by provider and country — citable', icon: '📊', nav: true },
      { name: 'Slip Explorer', href: '/launch-slips', description: 'Announced vs actual launch dates — a ledger nobody can backfill', icon: '⏳' },
      { name: 'Starship Tracker', href: '/starship', description: 'Flight history, program roles and news', icon: '🔥', nav: true, hot: true },
      { name: 'Artemis Tracker', href: '/artemis', description: 'Moon program milestones and hardware', icon: '🌙', nav: true },
      { name: 'Satellite Tracker', href: '/satellites', description: 'Live orbital map — ISS, Starlink and more', icon: '🛰️', nav: true, hot: true },
      { name: 'How Many Satellites?', href: '/how-many-satellites', description: 'Live orbital census — payloads, debris, constellations', icon: '🔢' },
      { name: "What's Overhead", href: '/whats-overhead', description: 'When the ISS passes over your house', icon: '🔭', nav: true },
      { name: 'Launch Predictions', href: '/predictions', description: 'Will it fly this window? Stake your call', icon: '🎯', nav: true },
      { name: 'Launch Countdown', href: '/countdown', description: 'Next liftoff, live', icon: '⏱️' },
      { name: 'Mission Debriefs', href: '/mission-debriefs', description: 'What happened after the stream ended', icon: '📝' },
      { name: 'Aurora Forecast', href: '/aurora-forecast', description: 'Northern lights and the Kp index', icon: '🌌' },
      { name: 'Launch Vehicle Database', href: '/launch-vehicles', description: 'Sortable specs, reliability and cost per kg', icon: '📊' },
      { name: 'Launch Windows', href: '/launch-windows', description: 'Planetary transfer windows', icon: '🪟' },
      { name: 'Spaceports', href: '/spaceports', description: 'Pad-by-pad spaceport directory', icon: '🏗️' },
      { name: 'Live', href: '/live', description: 'Livestreams in progress', icon: '📺' },
      { name: 'Space Calendar', href: '/space-calendar', description: 'Launches, conferences and events', icon: '📅' },
      { name: 'Watch a launch: Cape Canaveral', href: '/guide/watch-a-launch-cape-canaveral', description: 'Public viewing spots and tips', icon: '🎟️' },
      { name: 'Watch a launch: Vandenberg', href: '/guide/watch-a-launch-vandenberg', description: 'Public viewing spots and tips', icon: '🎟️' },
      { name: 'Watch a launch: Starbase', href: '/guide/watch-a-launch-starbase', description: 'Public viewing spots and road closures', icon: '🎟️' },
      { name: 'Can you see a launch from your city?', href: '/guide/watch-a-launch/orlando', description: 'Orlando, LA, Houston, DC and more — distance, direction, what you will see', icon: '🏙️' },
    ],
  },
  {
    key: 'news', label: 'News', blurb: 'Reporting, analysis and the twice-weekly digest.', menu: true,
    entries: [
      { name: 'News Feed', href: '/news', description: 'Latest space industry news, curated', icon: '📰', nav: true, hot: true },
      { name: 'Blog', href: '/blog', description: 'Guides, analysis and market reports', icon: '✍️', nav: true, hot: true },
      { name: 'AI Insights', href: '/ai-insights', description: 'Daily analysis, fact-checked before publishing', icon: '🤖', nav: true },
      { name: 'M/Th Digest', href: '/newsletter', description: 'The briefing, Mondays and Thursdays', icon: '✉️', nav: true },
      { name: 'Charts', href: '/chart', description: 'Launches, funding and jobs, drawn from our own trackers', icon: '📈', nav: true },
      { name: 'Podcasts', href: '/podcasts', description: 'Space podcast directory', icon: '🎙️', nav: true },
      { name: 'Space Defense', href: '/space-defense', description: 'Military space and national security', icon: '🛡️', nav: true },
      { name: 'Brief Archive', href: '/intelligence-brief', description: 'Past intelligence briefs', icon: '📑' },
      { name: 'Industry Voices', href: '/industry-voices', description: 'Curated third-party expert blogs', icon: '🗣️' },
      { name: 'Industry Reports', href: '/reports', description: 'In-depth research reports', icon: '📚' },
      { name: 'Executive Moves', href: '/executive-moves', description: 'Leadership changes across the industry', icon: '👔' },
      { name: 'Newsletters Directory', href: '/newsletters-directory', description: 'Other space newsletters worth reading', icon: '📮' },
      { name: 'Year in Review', href: '/year-in-review', description: 'The year in space, summarized', icon: '🗓️' },
    ],
  },
  {
    key: 'markets', label: 'Markets', blurb: 'Companies, capital and who is winning.', menu: true,
    entries: [
      { name: 'Space Stocks', href: '/space-stocks', description: 'Live quotes, ETFs and industry benchmarks', icon: '📈', nav: true, hot: true },
      { name: 'Company Profiles', href: '/company-profiles', description: 'The space industry directory', icon: '🏢', nav: true, hot: true },
      { name: 'Funding Rounds & M&A', href: '/funding-tracker', description: 'Live rounds, deals and acquisitions', icon: '💸', nav: true },
      { name: 'Startups & Pre-IPO', href: '/startups', description: 'Private companies, rounds and IPO watch', icon: '🚀', nav: true, hot: true },
      { name: 'Compare Companies', href: '/compare', description: 'Head-to-head: SpaceX vs Blue Origin and 50 more', icon: '⚖️', nav: true, hot: true },
      { name: 'Investors', href: '/investors', description: 'Investor directory and deal flow', icon: '🏦', nav: true },
      { name: 'Report Cards', href: '/report-cards', description: 'Quarterly company grades', icon: '📝' },
      { name: 'Industry Stats', href: '/space-stats', description: 'Key statistics, sourced', icon: '📊' },
      { name: 'Free Datasets', href: '/datasets', description: 'Companies, rounds, launch log — CSV, free with attribution', icon: '📦', nav: true },
      { name: 'Constellations', href: '/constellations', description: 'Mega-constellation operator intel', icon: '⭐' },
      { name: 'Ecosystem Map', href: '/ecosystem-map', description: 'How the industry connects', icon: '🌐' },
      { name: 'Industry Trends', href: '/industry-trends', description: 'Where the sector is moving', icon: '📉' },
      { name: 'Space Score', href: '/report-cards?view=score', description: 'Composite company scoring', icon: '⭐' },
      { name: 'Company Research', href: '/company-research', description: 'Deep-dive research workspace', icon: '🔬', pro: true },
      { name: 'My Watchlists', href: '/my-watchlists', description: 'Companies and topics you follow', icon: '👁️' },
    ],
  },
  {
    key: 'business', label: 'Business', blurb: 'Contracts, compliance and the supply chain.', menu: true,
    entries: [
      { name: 'Contracts & Opportunities', href: '/procurement', description: 'Contracts, grants, SBIR and budgets', icon: '📋', nav: true },
      { name: 'Regulatory Radar', href: '/regulatory-radar', description: 'Live rules, enforcement and deadlines', icon: '📡', nav: true },
      { name: 'Compliance Hub', href: '/compliance', description: 'Licensing, space law and filings', icon: '⚖️', nav: true, pro: true },
      { name: 'Jobs', href: '/jobs', description: 'Thousands of space jobs, synced daily', icon: '💼', nav: true, hot: true },
      { name: 'Hiring Trends', href: '/hiring-trends', description: 'Who is hiring — weekly velocity from daily snapshots', icon: '📈', nav: true },
      { name: 'Hire Talent', href: '/hire', description: 'Get your openings in front of the industry', icon: '🤝', nav: true },
      { name: 'Service Providers', href: '/marketplace', description: 'Verified space service directory', icon: '🛒', nav: true },
      { name: 'Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain intelligence', icon: '🔗' },
      { name: 'Space Talent Hub', href: '/space-talent', description: 'Salaries, trends and career paths', icon: '👥' },
      { name: 'Patents', href: '/patents', description: 'Space technology patent trends', icon: '📜' },
      { name: 'Spectrum', href: '/spectrum', description: 'Allocations, auctions and filings', icon: '📶' },
      { name: 'Export Compliance Q&A', href: '/export-compliance-qa', description: 'ITAR/EAR questions, answered', icon: '📦' },
      { name: 'Export Classifications', href: '/export-classifications', description: 'USML and ECCN lookups', icon: '🗂️' },
      { name: 'Licensing Checker', href: '/licensing-checker', description: 'Which licences does your mission need?', icon: '✅' },
      { name: 'Regulatory Calendar', href: '/regulatory-calendar', description: 'Comment deadlines and effective dates', icon: '📅' },
      { name: 'Mission Cost & Insurance', href: '/mission-cost', description: 'Cost estimates and risk pricing', icon: '🧮' },
      { name: 'Space Insurance', href: '/space-insurance', description: 'Launch and in-orbit coverage explained', icon: '🛡️' },
      { name: 'Space Manufacturing', href: '/space-manufacturing', description: 'In-space manufacturing intel', icon: '🏭' },
      { name: 'BD Pipeline', href: '/bd-pipeline', description: 'Track your business-development pipeline', icon: '📈', pro: true },
      { name: 'Executive Command Center', href: '/executive-command-center', description: 'Your company at a glance', icon: '🖥️', pro: true },
      { name: 'Advertise', href: '/advertise', description: 'Sponsor the digest', icon: '📣' },
    ],
  },
  {
    key: 'learn', label: 'Learn', blurb: 'Courses, guides and the reference shelf.', menu: true,
    entries: [
      { name: 'Learning Zone', href: '/learn', description: 'Six tracks, calculators and quizzes', icon: '📚', nav: true, hot: true },
      { name: 'Guides', href: '/guide', description: 'Launch costs, schedules, the industry explained', icon: '🧭', nav: true, hot: true },
      { name: 'Cost to launch a satellite', href: '/guide/cost-to-launch/satellite', description: 'By size and orbit, 2026 prices', icon: '💰', hot: true },
      { name: 'Cost to launch a CubeSat', href: '/guide/cost-to-launch/cubesat', description: '1U to 12U, rideshare and ISS', icon: '🧊' },
      { name: 'Cost to send a person to space', href: '/guide/cost-to-launch/person', description: 'Suborbital to ISS seat prices', icon: '🧑‍🚀' },
      // Compare lives in Markets; the freed Learn slot goes to the two proven ops calculators (SYNTHESIS.md item 20).
      { name: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Compare launch costs across vehicles', icon: '💰', nav: true, hot: true },
      { name: 'Mission Simulator', href: '/mission-simulator', description: 'Fly a mission end to end', icon: '🎮', nav: true },
      { name: 'Build Guides', href: '/build-guides', description: 'CanSat, balloon and ISS-receiver projects', icon: '🛠️', nav: true },
      { name: 'Space History', href: '/history', description: 'Searchable milestones', icon: '⏳', nav: true },
      { name: 'Glossary', href: '/glossary', description: 'Key terms defined', icon: '📖', nav: true },
      { name: 'Space Quiz', href: '/space-quiz', description: 'Test yourself', icon: '❓' },
      { name: 'Beginners', href: '/beginners', description: 'Start here', icon: '🌱' },
      { name: 'Orbit Guide', href: '/orbit-guide', description: 'LEO, MEO, GEO and everything between', icon: '🌀' },
      { name: 'Acronyms', href: '/acronyms', description: 'The alphabet soup, decoded', icon: '🔤' },
      { name: 'Night Sky Guide', href: '/night-sky-guide', description: 'What to look for tonight', icon: '🌠' },
      { name: 'Reading List', href: '/reading-list', description: 'Books worth your time', icon: '📕' },
      { name: 'Space Agencies', href: '/space-agencies', description: 'Every national agency', icon: '🏛️' },
      { name: 'Solar System', href: '/solar-exploration', description: '3D planetary visualization', icon: '☀️' },
      { name: 'Videos', href: '/videos', description: 'Curated video library', icon: '🎬' },
    ],
  },
  {
    key: 'ops', label: 'Engineering & Operations', blurb: 'Calculators and operational data for people building things.',
    entries: [
      { name: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Compare launch costs across vehicles', icon: '💰', hot: true },
      { name: 'Mission Simulator', href: '/mission-simulator', description: 'Fly a mission end to end', icon: '🎮', hot: true },
      { name: 'Orbital Calculator', href: '/orbital-calculator', description: 'Periods, velocities, transfers', icon: '🔢' },
      { name: 'Link Budget Calculator', href: '/link-budget-calculator', description: 'Close the link', icon: '📡' },
      { name: 'Power Budget Calculator', href: '/power-budget-calculator', description: 'Size the array and battery', icon: '⚡' },
      { name: 'Thermal Calculator', href: '/thermal-calculator', description: 'Radiator and equilibrium temperatures', icon: '🌡️' },
      { name: 'Radiation Calculator', href: '/radiation-calculator', description: 'Dose by orbit and shielding', icon: '☢️' },
      { name: 'Constellation Designer', href: '/constellation-designer', description: 'Walker patterns and coverage', icon: '✨' },
      { name: 'Unit Economics', href: '/unit-economics', description: 'Per-satellite, per-launch economics', icon: '📐' },
      { name: 'Launch Economics', href: '/launch-economics', description: 'Cost analysis across providers', icon: '📊' },
      { name: 'Orbital Costs', href: '/orbital-costs', description: 'What it costs to be in each orbit', icon: '💲' },
      { name: 'Space Environment', href: '/space-environment', description: 'Space weather, debris and operations', icon: '🌍' },
      { name: 'Asteroid Watch', href: '/asteroid-watch', description: 'Near-Earth objects and planetary defense', icon: '☄️' },
      { name: 'Ground Stations', href: '/ground-stations', description: 'Networks and coverage', icon: '📡' },
      { name: 'Space Stations', href: '/space-stations', description: 'ISS, Tiangong and the commercial stations', icon: '🏠' },
      { name: 'Space Communications', href: '/space-comms', description: 'Bands, relays and networks', icon: '📶' },
      { name: 'Propulsion Database', href: '/propulsion-database', description: 'Engines and thrusters compared', icon: '🔥' },
      { name: 'Materials Database', href: '/materials-database', description: 'Space-grade materials', icon: '🧱' },
      { name: 'Standards Reference', href: '/standards-reference', description: 'ECSS, NASA and MIL standards', icon: '📏' },
      { name: 'Clean Room Reference', href: '/clean-room-reference', description: 'Classes and practices', icon: '🧪' },
      { name: 'Tech Readiness', href: '/tech-readiness', description: 'TRL scales explained', icon: '🔬' },
      { name: 'Mission Heritage', href: '/mission-heritage', description: 'Flight heritage lookups', icon: '🏛️' },
      { name: 'Mission Stats', href: '/mission-stats', description: 'Mission statistics', icon: '📈' },
      { name: 'Mars Planner', href: '/mars-planner', description: 'Missions and launch windows', icon: '🔴' },
      { name: 'Cislunar', href: '/cislunar', description: 'Gateway, Artemis and the lunar economy', icon: '🌙' },
      { name: 'Space Mining', href: '/space-mining', description: 'Resources, ISRU and the players', icon: '⛏️' },
      { name: 'Space Tourism', href: '/space-tourism', description: 'Who is selling seats', icon: '✈️' },
      { name: 'Space Edge Computing', href: '/space-edge-computing', description: 'Compute in orbit', icon: '💻' },
      { name: 'Sustainability Scorecard', href: '/sustainability-scorecard', description: 'Debris and sustainability grades', icon: '🌱' },
      { name: 'Earth Events', href: '/earth-events', description: 'Natural events seen from orbit', icon: '🌎' },
      { name: 'Debris Monitor', href: '/space-environment?tab=debris', description: 'The catalogue, from CelesTrak', icon: '🗑️' },
    ],
  },
  {
    key: 'reference', label: 'Reference & Data', blurb: 'Sources, stats and the machinery behind the site.',
    entries: [
      { name: 'Data Sources', href: '/data-sources', description: 'Where every number comes from', icon: '🔍' },
      { name: 'Embeddable Widgets', href: '/widgets', description: 'Countdowns and tickers for your site', icon: '🧩' },
      { name: 'Developer API', href: '/developer', description: 'Programmatic access', icon: '🧑‍💻' },
      { name: 'Alerts', href: '/alerts', description: 'Launch, regulatory and market alerts by email', icon: '🔔' },
      { name: 'My Desk', href: '/desk', description: 'Your companies, launches and alerts in one screen', icon: '🗄️' },
      { name: 'Dashboard', href: '/dashboard', description: 'Your saved items and alerts', icon: '🖥️' },
      { name: 'Space Tycoon', href: '/space-tycoon', description: 'The economic strategy MMO', icon: '🎮', hot: true },
      { name: 'What is Space Tycoon?', href: '/space-tycoon/about', description: 'A free browser space MMO built on economics — how it plays and compares', icon: '🛰️' },
      { name: 'Space Tycoon dev log', href: '/space-tycoon/dev-log', description: 'What changed in the game, when, and why', icon: '📓' },
      { name: 'Community', href: '/community', description: 'Where the community gathers', icon: '👥' },
      { name: 'Help Center', href: '/help', description: 'Answers and how-tos', icon: '❓' },
      { name: 'Feedback', href: '/feedback', description: 'Tell us what to build', icon: '💬' },
      { name: 'About', href: '/about', description: 'Who runs SpaceNexus and why', icon: 'ℹ️' },
      { name: 'Pricing', href: '/pricing', description: 'Free forever for enthusiasts; Pro for business tools', icon: '💳' },
    ],
  },
];

export function navItemsFor(key: DirectoryGroup['key']): DirectoryEntry[] {
  return SITE_DIRECTORY.find((g) => g.key === key)?.entries.filter((e) => e.nav) ?? [];
}

export function allDirectoryEntries(): Array<DirectoryEntry & { group: DirectoryGroup['key']; groupLabel: string }> {
  return SITE_DIRECTORY.flatMap((g) => g.entries.map((e) => ({ ...e, group: g.key, groupLabel: g.label })));
}
