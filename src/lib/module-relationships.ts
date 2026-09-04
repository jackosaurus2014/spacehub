// Centralized module relationship mapping for RelatedModules component
// Each key is a page route (without leading /), value is an array of related modules

export interface RelatedModuleConfig {
  name: string;
  description: string;
  href: string;
  icon: string;
}

// Reusable module definitions
const MODULES: Record<string, RelatedModuleConfig> = {
  // ── Market Intelligence ──
  marketIntel: { name: 'Space Stocks & Markets', description: 'Live quotes, ETFs & benchmarks', href: '/space-stocks', icon: '📊' },
  spaceStocks: { name: 'Space Stocks', description: 'Live public space-company quotes', href: '/space-stocks', icon: '📈' },
  companyProfiles: { name: 'Company Profiles', description: 'Space industry directory', href: '/company-profiles', icon: '🏢' },
  companyResearch: { name: 'Company Research', description: 'AI-powered research', href: '/company-research', icon: '🔬' },
  spaceEconomy: { name: 'Space Economy', description: 'Economic indicators', href: '/space-stocks', icon: '💰' },
  spaceCapital: { name: 'Space Capital', description: 'Investment landscape', href: '/funding-tracker', icon: '🏦' },
  marketSizing: { name: 'Market Sizing', description: 'TAM/SAM/SOM analysis', href: '/space-stocks', icon: '📏' },
  fundingTracker: { name: 'Funding Tracker', description: 'Investment rounds', href: '/funding-tracker', icon: '💸' },
  investors: { name: 'Investor Directory', description: 'Space investors & VCs', href: '/investors', icon: '👤' },
  investmentTracker: { name: 'Investment Tracker', description: 'Deal tracking dashboard', href: '/funding-tracker', icon: '📈' },
  dealFlow: { name: 'Deal Flow', description: 'M&A and funding deals', href: '/funding-tracker', icon: '🤝' },
  maTracker: { name: 'M&A Tracker', description: 'Mergers & acquisitions', href: '/funding-tracker', icon: '🔄' },
  startupTracker: { name: 'Startup Tracker', description: 'Emerging companies', href: '/startups', icon: '🚀' },
  reportCards: { name: 'Report Cards', description: 'Company performance grades', href: '/report-cards', icon: '📝' },
  marketMap: { name: 'Market Map', description: 'Industry landscape', href: '/space-stocks', icon: '🗺️' },
  ecosystemMap: { name: 'Ecosystem Map', description: 'Industry connections', href: '/ecosystem-map', icon: '🌐' },
  industryTrends: { name: 'Industry Trends', description: 'Trend analysis', href: '/industry-trends', icon: '📈' },
  spaceScore: { name: 'Space Score', description: 'Company scoring', href: '/report-cards?view=score', icon: '⭐' },
  executiveMoves: { name: 'Executive Moves', description: 'Leadership changes', href: '/executive-moves', icon: '👔' },

  // ── News & Media ──
  news: { name: 'Space News', description: 'Latest headlines', href: '/news', icon: '📰' },
  blogs: { name: 'Industry Voices', description: 'Curated third-party expert blogs', href: '/industry-voices', icon: '✍️' },
  spaceDefense: { name: 'Space Defense', description: 'Defense & security', href: '/space-defense', icon: '🛡️' },
  aiInsights: { name: 'AI Insights', description: 'AI-generated analysis', href: '/ai-insights', icon: '🤖' },
  newsDigest: { name: 'Live Digest', description: 'Rolling 7-day digest', href: '/briefs', icon: '📋' },
  intelligenceBrief: { name: 'Intelligence Brief', description: 'Weekly briefing', href: '/intelligence-brief', icon: '📑' },
  podcasts: { name: 'Podcasts', description: 'Industry podcasts', href: '/podcasts', icon: '🎙️' },
  resources: { name: 'Resources', description: 'Curated content', href: '/resources', icon: '📚' },
  newsletters: { name: 'Newsletters', description: 'Industry newsletters', href: '/newsletters-directory', icon: '✉️' },

  // ── Business Opportunities ──
  businessOps: { name: 'Business Opportunities', description: 'Growth opportunities', href: '/procurement', icon: '💼' },
  supplyChain: { name: 'Supply Chain', description: 'Supply chain intel', href: '/supply-chain', icon: '🔗' },
  spaceMining: { name: 'Space Mining', description: 'Resource extraction', href: '/space-mining', icon: '⛏️' },
  patents: { name: 'Patents', description: 'IP landscape', href: '/patents', icon: '📜' },
  patentLandscape: { name: 'Patent Landscape', description: 'Patent trends & analysis', href: '/patents', icon: '🔎' },
  manufacturing: { name: 'Space Manufacturing', description: 'In-space production', href: '/space-manufacturing', icon: '🏭' },
  procurement: { name: 'Procurement', description: 'Government contracts', href: '/procurement', icon: '📋' },
  contractAwards: { name: 'Contract Awards', description: 'Recent awards', href: '/procurement', icon: '🏆' },
  fundingOpportunities: { name: 'Funding Opportunities', description: 'Grants & programs', href: '/procurement?tab=grants', icon: '💡' },
  fundingRounds: { name: 'Funding Rounds', description: 'Investment rounds DB', href: '/funding-tracker', icon: '💵' },
  govBudgets: { name: 'Government Budgets', description: 'Global agency spending', href: '/procurement?tab=global-budgets', icon: '🏛️' },

  // ── Mission Planning ──
  missionCost: { name: 'Mission Planner', description: 'Cost estimation', href: '/mission-cost', icon: '🧮' },
  spaceInsurance: { name: 'Space Insurance', description: 'Risk coverage', href: '/space-insurance', icon: '🛡️' },
  resourceExchange: { name: 'Resource Exchange', description: 'Trade & barter', href: '/marketplace', icon: '🔄' },
  launchWindows: { name: 'Launch Windows', description: 'Optimal timing', href: '/launch-windows', icon: '🪟' },
  launchVehicles: { name: 'Launch Vehicles', description: 'Rocket database', href: '/launch-vehicles', icon: '🚀' },
  blueprints: { name: 'Propulsion Database', description: 'Engines, buses & landers', href: '/propulsion-database', icon: '📐' },
  orbitalCosts: { name: 'Orbital Costs', description: 'Cost analysis', href: '/orbital-costs', icon: '💲' },
  orbitalCalc: { name: 'Orbital Calculator', description: 'Mechanics calculator', href: '/orbital-calculator', icon: '🔢' },
  constellationDesigner: { name: 'Constellation Designer', description: 'Design tool', href: '/constellation-designer', icon: '✨' },
  powerBudget: { name: 'Power Budget', description: 'Power calculator', href: '/power-budget-calculator', icon: '⚡' },
  linkBudget: { name: 'Link Budget', description: 'RF calculator', href: '/link-budget-calculator', icon: '📡' },
  tools: { name: 'Engineering Tools', description: 'Calculator suite', href: '/tools', icon: '🔧' },
  launchCostCalc: { name: 'Launch Cost Calculator', description: 'Cost estimation tool', href: '/launch-cost-calculator', icon: '💰' },
  launchEconomics: { name: 'Launch Economics', description: 'Cost analysis', href: '/launch-economics', icon: '📊' },
  launchManifest: { name: 'Launch Manifest', description: 'Upcoming launches', href: '/mission-control', icon: '📅' },
  launchSites: { name: 'Launch Sites', description: 'Spaceport directory', href: '/spaceports', icon: '🏗️' },
  missionSimulator: { name: 'Mission Simulator', description: 'Mission modeling', href: '/mission-simulator', icon: '🎮' },
  missionHeritage: { name: 'Mission Heritage', description: 'Historical missions', href: '/mission-heritage', icon: '🏛️' },
  missionPipeline: { name: 'Mission Pipeline', description: 'Future missions', href: '/mission-control', icon: '📋' },
  missionStats: { name: 'Mission Statistics', description: 'Launch data', href: '/mission-stats', icon: '📊' },
  unitEconomics: { name: 'Unit Economics', description: 'Business modeling', href: '/unit-economics', icon: '📐' },

  // ── Space Operations ──
  satellites: { name: 'Satellite Tracker', description: 'Orbital tracking', href: '/satellites', icon: '🛰️' },
  orbitalSlots: { name: 'GEO Slots', description: 'GEO slot allocations', href: '/spectrum?tab=geo-slots', icon: '🎯' },
  constellations: { name: 'Constellations', description: 'Constellation data', href: '/constellations', icon: '⭐' },
  groundStations: { name: 'Ground Stations', description: 'Station network', href: '/ground-stations', icon: '📡' },
  spaceStations: { name: 'Space Stations', description: 'Orbital habitats', href: '/space-stations', icon: '🏠' },
  spaceports: { name: 'Spaceports', description: 'Launch facilities', href: '/spaceports', icon: '🏗️' },
  debrisCatalog: { name: 'Debris Catalog', description: 'Tracked objects', href: '/space-environment?tab=debris', icon: '🗑️' },
  debrisRemediation: { name: 'Debris Remediation', description: 'Cleanup solutions', href: '/space-environment?tab=debris', icon: '🧹' },
  debrisTracker: { name: 'Debris Tracker', description: 'Collision risk', href: '/space-environment?tab=debris', icon: '⚠️' },

  // ── Talent & Workforce ──
  spaceTalent: { name: 'Space Talent Hub', description: 'Jobs & workforce', href: '/space-talent', icon: '👥' },
  jobs: { name: 'Space Jobs', description: 'Job listings', href: '/jobs', icon: '💼' },
  salaryBenchmarks: { name: 'Salary Benchmarks', description: 'Compensation data', href: '/space-talent?tab=salaries', icon: '💵' },
  careerGuide: { name: 'Career Guide', description: 'Career paths', href: '/space-talent?tab=insights', icon: '🎓' },
  workforceAnalytics: { name: 'Workforce Analytics', description: 'Talent trends', href: '/space-talent?tab=trends', icon: '📊' },
  educationPathways: { name: 'Education Pathways', description: 'Learning paths', href: '/space-talent?tab=insights', icon: '📚' },

  // ── Regulatory & Compliance ──
  compliance: { name: 'Compliance Hub', description: 'Regulatory overview', href: '/compliance', icon: '⚖️' },
  spectrum: { name: 'Spectrum Management', description: 'RF allocation', href: '/spectrum', icon: '📡' },
  regulatoryRisk: { name: 'Regulatory Risk', description: 'Risk assessment', href: '/compliance?tab=risk', icon: '⚠️' },
  regulatoryCalendar: { name: 'Regulatory Calendar', description: 'Upcoming deadlines', href: '/regulatory-calendar', icon: '📅' },
  regulatoryTracker: { name: 'Regulatory Tracker', description: 'Policy changes', href: '/compliance?tab=policy', icon: '📋' },
  regulations: { name: 'Regulations Explorer', description: 'Treaty database', href: '/compliance?tab=ref-all-regs', icon: '📖' },
  spaceLaw: { name: 'Space Law', description: 'Legal framework', href: '/compliance?tab=treaties', icon: '⚖️' },
  rfSpectrum: { name: 'RF Spectrum', description: 'Frequency data', href: '/spectrum', icon: '📶' },
  frequencyDB: { name: 'Frequency Database', description: 'Allocation data', href: '/spectrum', icon: '📊' },
  frequencyBands: { name: 'Frequency Bands', description: 'Band reference', href: '/spectrum', icon: '📡' },
  licensingChecker: { name: 'Licensing Checker', description: 'License requirements', href: '/licensing-checker', icon: '📋' },
  exportClassifications: { name: 'Export Classifications', description: 'ITAR/EAR reference', href: '/export-classifications', icon: '📦' },
  regulatoryAgencies: { name: 'Regulatory Agencies', description: 'Agency directory', href: '/compliance?tab=ref-agencies', icon: '🏛️' },
  complianceChecklist: { name: 'Compliance Checklist', description: 'Regulatory checklist', href: '/compliance', icon: '✅' },
  legalResources: { name: 'Legal Resources', description: 'Law firms & treaties', href: '/compliance?tab=ref-legal', icon: '📋' },

  // ── Solar System Expansion ──
  solarExploration: { name: 'Solar Exploration', description: 'Deep space missions', href: '/solar-exploration', icon: '☀️' },
  marsPlanner: { name: 'Mars Planner', description: 'Mars mission tool', href: '/mars-planner', icon: '🔴' },
  cislunar: { name: 'Cislunar Economy', description: 'Moon economy', href: '/cislunar', icon: '🌙' },
  asteroidWatch: { name: 'Asteroid Watch', description: 'NEO monitoring', href: '/asteroid-watch', icon: '☄️' },
  isru: { name: 'ISRU', description: 'Resource utilization', href: '/space-mining', icon: '⛏️' },

  // ── Space Environment ──
  spaceEnvironment: { name: 'Space Environment', description: 'Weather & debris', href: '/space-environment', icon: '🌍' },
  spaceWeather: { name: 'Space Weather', description: 'Solar conditions', href: '/space-environment?tab=weather', icon: '☀️' },
  spaceEvents: { name: 'Space Events', description: 'Industry events', href: '/space-calendar', icon: '📅' },
  earthEvents: { name: 'Earth Events', description: 'NASA EONET disasters', href: '/earth-events', icon: '🌎' },

  // ── Enthusiast Guides ──
  satelliteSpotting: { name: 'Satellite Spotting Guide', description: 'How to see satellites', href: '/whats-overhead', icon: '&#127776;' },
  auroraForecast: { name: 'Aurora Forecast', description: 'Northern lights guide', href: '/aurora-forecast', icon: '&#127752;' },

  // ── Tourism & Misc ──
  spaceTourism: { name: 'Space Tourism', description: 'Commercial flights', href: '/space-tourism', icon: '✈️' },
  spaceAgencies: { name: 'Space Agencies', description: 'Agency directory', href: '/space-agencies', icon: '🏛️' },
  spaceComms: { name: 'Space Communications', description: 'Comms systems', href: '/space-comms', icon: '📡' },
  sustainability: { name: 'Sustainability', description: 'Environmental scores', href: '/sustainability-scorecard', icon: '🌱' },
  industryScorecard: { name: 'Industry Scorecard', description: 'Quarterly industry grades', href: '/space-stocks', icon: '📊' },
  spaceCalendar: { name: 'Space Calendar', description: 'Key dates 2026', href: '/space-calendar', icon: '📅' },
  spaceEdge: { name: 'Edge Computing', description: 'In-orbit computing', href: '/space-edge-computing', icon: '💻' },
  spaceInvestors: { name: 'Space Investors', description: 'Active investors', href: '/investors', icon: '📈' },
  spaceMap: { name: 'Space Industry Map', description: 'Industry sector map', href: '/ecosystem-map', icon: '🗺️' },
  startupDirectory: { name: 'Startup Directory', description: 'Space startups', href: '/startups', icon: '🚀' },

  // ── Imagery ──
  imagery: { name: 'Imagery Marketplace', description: 'Satellite imagery', href: '/company-profiles', icon: '📷' },

  // ── Help & Support ──
  help: { name: 'Help Center', description: 'Guides & support', href: '/help', icon: '❓' },

  // ── Transparency ──
  dataSources: { name: 'Data Sources', description: 'Data transparency', href: '/data-sources', icon: '🔍' },

  // ── Marketplace ──
  alerts: { name: 'Alerts', description: 'Launch, company and market alerts by email', href: '/alerts', icon: '🔔' },
  marketplace: { name: 'Marketplace', description: 'Services & products', href: '/marketplace', icon: '🛒' },
  pricing: { name: 'Pricing', description: 'Plans & pricing', href: '/pricing', icon: '💳' },

  // ── Learning & Reference ──
  glossary: { name: 'Glossary', description: 'Industry terms', href: '/glossary', icon: '📖' },
  history: { name: 'Space History Timeline', description: 'Searchable space history database', href: '/history', icon: '⏳' },
  thisDayInSpace: { name: 'This Day in Space', description: 'On this date in space history', href: '/history#today', icon: '📅' },
  orbitGuide: { name: 'Orbit Guide', description: 'Orbit types', href: '/orbit-guide', icon: '🌀' },
  techReadiness: { name: 'Tech Readiness', description: 'TRL tracker', href: '/tech-readiness', icon: '🔬' },
  conferences: { name: 'Conferences', description: 'Industry events', href: '/space-calendar', icon: '🎤' },
  learn: { name: 'Learning Hub', description: 'Educational content', href: '/learn', icon: '📚' },
  acronyms: { name: 'Acronyms', description: 'Space acronyms', href: '/acronyms', icon: '🔤' },
  materialsDB: { name: 'Materials Database', description: 'Space materials', href: '/materials-database', icon: '🧱' },
  propulsionDB: { name: 'Propulsion Database', description: 'Engine data', href: '/propulsion-database', icon: '🔥' },
  propulsionComp: { name: 'Propulsion Comparison', description: 'Engine comparison', href: '/propulsion-database', icon: '⚡' },
  standardsRef: { name: 'Standards Reference', description: 'Industry standards', href: '/standards-reference', icon: '📏' },
};

// Page-to-related-modules mapping
export const PAGE_RELATIONS: Record<string, RelatedModuleConfig[]> = {
  // ── Market Intelligence cluster ──
  'market-intel': [MODULES.companyProfiles, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.marketSizing, MODULES.marketMap],
  'company-profiles': [MODULES.companyResearch, MODULES.reportCards, MODULES.executiveMoves, MODULES.spaceScore, MODULES.marketIntel],
  'company-research': [MODULES.companyProfiles, MODULES.aiInsights, MODULES.reportCards, MODULES.spaceScore],
  'space-economy': [MODULES.marketIntel, MODULES.govBudgets, MODULES.investmentTracker, MODULES.industryTrends, MODULES.spaceCapital],
  'guide/commercial-space-economy': [MODULES.marketIntel, MODULES.spaceCapital, MODULES.industryTrends, MODULES.companyProfiles, MODULES.govBudgets],
  'guide/blue-origin-vs-spacex': [MODULES.spaceStocks, MODULES.companyProfiles, MODULES.launchManifest, MODULES.launchVehicles],
  'guide/how-to-get-a-job-in-the-space-industry': [MODULES.jobs, MODULES.salaryBenchmarks, MODULES.workforceAnalytics, MODULES.careerGuide, MODULES.companyProfiles],
  'guide/spacex-stock-explained': [MODULES.spaceStocks, MODULES.startupTracker, MODULES.companyProfiles, MODULES.launchManifest],
  'guide/when-is-artemis-3': [MODULES.launchManifest, MODULES.learn, MODULES.companyProfiles, MODULES.launchVehicles],
  'space-capital': [MODULES.fundingTracker, MODULES.investors, MODULES.dealFlow, MODULES.spaceEconomy],
  'market-sizing': [MODULES.marketIntel, MODULES.industryTrends, MODULES.spaceEconomy, MODULES.marketMap],
  'funding-tracker': [MODULES.spaceCapital, MODULES.investors, MODULES.dealFlow, MODULES.fundingRounds, MODULES.startupTracker],
  'investors': [MODULES.spaceCapital, MODULES.fundingTracker, MODULES.dealFlow, MODULES.spaceInvestors],
  'investment-tracker': [MODULES.fundingTracker, MODULES.dealFlow, MODULES.spaceCapital, MODULES.maTracker],
  'deal-flow': [MODULES.maTracker, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.contractAwards, MODULES.investmentTracker],
  'ma-tracker': [MODULES.dealFlow, MODULES.companyProfiles, MODULES.executiveMoves, MODULES.spaceCapital],
  'startup-tracker': [MODULES.fundingTracker, MODULES.companyProfiles, MODULES.spaceCapital, MODULES.startupTracker.href === '/startup-tracker' ? MODULES.dealFlow : MODULES.dealFlow],
  'report-cards': [MODULES.companyProfiles, MODULES.spaceScore, MODULES.companyResearch],
  'market-map': [MODULES.ecosystemMap, MODULES.marketIntel, MODULES.companyProfiles, MODULES.industryTrends],
  'ecosystem-map': [MODULES.marketMap, MODULES.companyProfiles, MODULES.supplyChain, MODULES.marketIntel],
  'industry-trends': [MODULES.marketIntel, MODULES.techReadiness, MODULES.industryTrends.href === '/industry-trends' ? MODULES.spaceEconomy : MODULES.spaceEconomy, MODULES.intelligenceBrief],
  'space-score': [MODULES.companyProfiles, MODULES.reportCards, MODULES.companyResearch],
  'executive-moves': [MODULES.companyProfiles, MODULES.news, MODULES.maTracker, MODULES.spaceCapital],
  'space-investors': [MODULES.investors, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.dealFlow],
  'startups': [MODULES.fundingTracker, MODULES.companyProfiles, MODULES.investors, MODULES.startupTracker, MODULES.spaceCapital, MODULES.spaceStocks],
  'space-stocks': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.startupTracker, MODULES.fundingTracker],

  // ── News & Media cluster ──
  'news': [MODULES.newsDigest, MODULES.aiInsights, MODULES.intelligenceBrief, MODULES.blogs, MODULES.spaceDefense],
  'industry-voices': [MODULES.news, MODULES.aiInsights, MODULES.resources, MODULES.podcasts],
  'space-defense': [MODULES.news, MODULES.spaceAgencies, MODULES.compliance, MODULES.govBudgets, MODULES.procurement],
  'ai-insights': [MODULES.companyResearch, MODULES.news, MODULES.marketIntel, MODULES.intelligenceBrief],
  'news-digest': [MODULES.news, MODULES.intelligenceBrief, MODULES.aiInsights, MODULES.blogs],
  'intelligence-brief': [MODULES.newsDigest, MODULES.marketIntel, MODULES.aiInsights, MODULES.industryTrends],
  'news-aggregator': [MODULES.news, MODULES.newsDigest, MODULES.blogs, MODULES.aiInsights],
  'podcasts': [MODULES.resources, MODULES.blogs, MODULES.newsletters, MODULES.news],
  'resources': [MODULES.podcasts, MODULES.blogs, MODULES.newsletters, MODULES.learn],
  'newsletters-directory': [MODULES.resources, MODULES.blogs, MODULES.podcasts, MODULES.news],

  // ── Business Opportunities cluster ──
  'supply-chain': [MODULES.businessOps, MODULES.manufacturing, MODULES.marketplace, MODULES.companyProfiles],
  'space-mining': [MODULES.isru, MODULES.asteroidWatch, MODULES.solarExploration, MODULES.materialsDB],
  'patents': [MODULES.patentLandscape, MODULES.techReadiness, MODULES.companyProfiles, MODULES.manufacturing],
  'patent-landscape': [MODULES.patents, MODULES.techReadiness, MODULES.industryTrends, MODULES.companyResearch],
  'space-manufacturing': [MODULES.supplyChain, MODULES.blueprints, MODULES.materialsDB, MODULES.businessOps],
  'procurement': [MODULES.contractAwards, MODULES.govBudgets, MODULES.businessOps, MODULES.fundingOpportunities],
  'contract-awards': [MODULES.procurement, MODULES.govBudgets, MODULES.companyProfiles, MODULES.dealFlow],
  'funding-rounds': [MODULES.fundingTracker, MODULES.spaceCapital, MODULES.investors, MODULES.startupTracker],
  'government-budgets': [MODULES.spaceAgencies, MODULES.procurement, MODULES.contractAwards, MODULES.spaceEconomy],

  // ── Mission Planning cluster ──
  'mission-cost': [MODULES.launchCostCalc, MODULES.orbitalCosts, MODULES.launchVehicles, MODULES.spaceInsurance, MODULES.missionSimulator],
  'space-insurance': [MODULES.missionCost, MODULES.spaceInsurance.href === '/space-insurance' ? MODULES.regulatoryRisk : MODULES.regulatoryRisk, MODULES.launchVehicles],
  'resource-exchange': [MODULES.marketplace, MODULES.supplyChain, MODULES.businessOps],
  'launch-windows': [MODULES.launchManifest, MODULES.launchVehicles, MODULES.launchSites, MODULES.marsPlanner, MODULES.cislunar],
  'launch-vehicles': [MODULES.launchCostCalc, MODULES.launchEconomics, MODULES.launchSites, MODULES.missionCost, MODULES.launchManifest],
  'blueprints': [MODULES.manufacturing, MODULES.tools, MODULES.constellationDesigner, MODULES.materialsDB],
  'orbital-costs': [MODULES.missionCost, MODULES.launchCostCalc, MODULES.launchEconomics, MODULES.orbitalCalc],
  'orbital-calculator': [MODULES.orbitalCosts, MODULES.tools, MODULES.powerBudget, MODULES.constellationDesigner],
  'constellation-designer': [MODULES.constellations, MODULES.orbitalCalc, MODULES.linkBudget, MODULES.satellites],
  'power-budget-calculator': [MODULES.linkBudget, MODULES.orbitalCalc, MODULES.tools, MODULES.blueprints],
  'link-budget-calculator': [MODULES.powerBudget, MODULES.orbitalCalc, MODULES.tools, MODULES.spaceComms],
  'tools': [MODULES.orbitalCalc, MODULES.powerBudget, MODULES.linkBudget, MODULES.constellationDesigner, MODULES.launchCostCalc],
  'launch-cost-calculator': [MODULES.launchVehicles, MODULES.launchEconomics, MODULES.orbitalCosts, MODULES.missionCost],
  'launch-economics': [MODULES.launchCostCalc, MODULES.launchVehicles, MODULES.spaceEconomy, MODULES.missionCost],
  'launch-manifest': [MODULES.launchWindows, MODULES.launchVehicles, MODULES.launchSites, MODULES.missionPipeline],
  'launch-sites': [MODULES.spaceports, MODULES.launchVehicles, MODULES.launchManifest, MODULES.launchWindows],
  'mission-simulator': [MODULES.missionCost, MODULES.orbitalCalc, MODULES.launchVehicles, MODULES.missionPipeline],
  'mission-heritage': [MODULES.missionStats, MODULES.history, MODULES.missionPipeline, MODULES.spaceAgencies],
  'mission-pipeline': [MODULES.launchManifest, MODULES.missionStats, MODULES.missionHeritage, MODULES.launchVehicles],
  'mission-stats': [MODULES.missionHeritage, MODULES.missionPipeline, MODULES.launchVehicles, MODULES.govBudgets],
  'unit-economics': [MODULES.missionCost, MODULES.launchEconomics, MODULES.marketSizing, MODULES.businessOps],

  // ── Space Operations cluster ──
  'satellites': [MODULES.constellations, MODULES.orbitalSlots, MODULES.debrisTracker, MODULES.groundStations, MODULES.spaceEnvironment],
  'orbital-slots': [MODULES.satellites, MODULES.constellations, MODULES.spectrum, MODULES.orbitalCosts],
  'constellations': [MODULES.satellites, MODULES.constellationDesigner, MODULES.orbitalSlots, MODULES.groundStations],
  'ground-stations': [MODULES.spaceComms, MODULES.satellites, MODULES.spaceports, MODULES.linkBudget],
  'ground-station-directory': [MODULES.groundStations, MODULES.spaceComms, MODULES.satellites, MODULES.spaceports],
  'space-stations': [MODULES.cislunar, MODULES.solarExploration, MODULES.spaceEnvironment, MODULES.isru],
  'spaceports': [MODULES.launchSites, MODULES.launchVehicles, MODULES.groundStations, MODULES.spaceComms],
  'debris-catalog': [MODULES.debrisRemediation, MODULES.debrisTracker, MODULES.spaceEnvironment, MODULES.satellites],
  'debris-remediation': [MODULES.debrisCatalog, MODULES.debrisTracker, MODULES.sustainability, MODULES.spaceEnvironment],
  'debris-tracker': [MODULES.debrisCatalog, MODULES.debrisRemediation, MODULES.satellites, MODULES.spaceEnvironment],

  // ── Talent & Workforce cluster ──
  'space-talent': [MODULES.jobs, MODULES.salaryBenchmarks, MODULES.careerGuide, MODULES.workforceAnalytics, MODULES.educationPathways],
  'jobs': [MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.careerGuide, MODULES.companyProfiles],
  'salary-benchmarks': [MODULES.spaceTalent, MODULES.workforceAnalytics, MODULES.careerGuide, MODULES.jobs],
  'career-guide': [MODULES.educationPathways, MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.jobs],
  'workforce-analytics': [MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.industryTrends, MODULES.educationPathways],
  'education-pathways': [MODULES.careerGuide, MODULES.spaceTalent, MODULES.learn, MODULES.glossary],

  // ── Regulatory & Compliance cluster ──
  'compliance': [MODULES.regulatoryTracker, MODULES.regulatoryCalendar, MODULES.regulatoryRisk, MODULES.spaceLaw, MODULES.licensingChecker, MODULES.exportClassifications],
  'spectrum': [MODULES.rfSpectrum, MODULES.frequencyDB, MODULES.frequencyBands, MODULES.compliance, MODULES.spaceComms],
  'regulatory-risk': [MODULES.compliance, MODULES.regulatoryTracker, MODULES.regulatoryCalendar, MODULES.spaceLaw],
  'regulatory-calendar': [MODULES.compliance, MODULES.regulatoryTracker, MODULES.regulatoryRisk, MODULES.regulations],
  'regulatory-tracker': [MODULES.compliance, MODULES.regulatoryCalendar, MODULES.regulatoryRisk, MODULES.spaceLaw],
  'regulations': [MODULES.compliance, MODULES.spaceLaw, MODULES.regulatoryTracker, MODULES.regulatoryRisk],
  'space-law': [MODULES.compliance, MODULES.regulations, MODULES.regulatoryRisk, MODULES.regulatoryTracker],
  'rf-spectrum': [MODULES.spectrum, MODULES.frequencyDB, MODULES.frequencyBands, MODULES.spaceComms],
  'frequency-database': [MODULES.rfSpectrum, MODULES.spectrum, MODULES.frequencyBands, MODULES.linkBudget],
  'frequency-bands': [MODULES.frequencyDB, MODULES.rfSpectrum, MODULES.spectrum, MODULES.spaceComms],
  'licensing-checker': [MODULES.compliance, MODULES.exportClassifications, MODULES.regulatoryRisk, MODULES.regulations, MODULES.spaceLaw],
  'export-classifications': [MODULES.compliance, MODULES.licensingChecker, MODULES.regulatoryRisk, MODULES.regulations, MODULES.spaceLaw],
  'regulatory-agencies': [MODULES.compliance, MODULES.regulatoryCalendar, MODULES.regulatoryRisk, MODULES.spaceLaw, MODULES.spaceAgencies],
  'compliance-checklist': [MODULES.compliance, MODULES.licensingChecker, MODULES.exportClassifications, MODULES.regulatoryRisk, MODULES.spaceLaw],
  'legal-resources': [MODULES.compliance, MODULES.spaceLaw, MODULES.regulatoryAgencies, MODULES.regulations, MODULES.regulatoryRisk],

  // ── Solar System Expansion cluster ──
  'solar-exploration': [MODULES.marsPlanner, MODULES.cislunar, MODULES.asteroidWatch, MODULES.isru, MODULES.missionPipeline],
  'mars-planner': [MODULES.solarExploration, MODULES.isru, MODULES.missionCost, MODULES.launchWindows],
  'cislunar': [MODULES.solarExploration, MODULES.spaceStations, MODULES.isru, MODULES.marsPlanner, MODULES.launchWindows],
  'asteroid-watch': [MODULES.solarExploration, MODULES.spaceMining, MODULES.debrisCatalog, MODULES.spaceEnvironment],
  'isru': [MODULES.spaceMining, MODULES.marsPlanner, MODULES.cislunar, MODULES.solarExploration],

  // ── Space Environment cluster ──
  'space-environment': [MODULES.spaceWeather, MODULES.debrisTracker, MODULES.satellites, MODULES.solarExploration],
  'space-weather': [MODULES.spaceEnvironment, MODULES.satellites, MODULES.solarExploration, MODULES.spaceEvents],
  'space-events': [MODULES.conferences, MODULES.news, MODULES.spaceWeather, MODULES.launchManifest],
  'earth-events': [MODULES.spaceEnvironment, MODULES.spaceWeather, MODULES.satellites, MODULES.news, MODULES.asteroidWatch],

  // ── Misc pages ──
  'space-tourism': [MODULES.launchVehicles, MODULES.spaceStations, MODULES.spaceInsurance, MODULES.businessOps],
  'space-agencies': [MODULES.govBudgets, MODULES.spaceDefense, MODULES.procurement, MODULES.missionStats],
  'space-comms': [MODULES.groundStations, MODULES.linkBudget, MODULES.spectrum, MODULES.satellites],
  'sustainability-scorecard': [MODULES.debrisRemediation, MODULES.spaceEnvironment, MODULES.compliance, MODULES.reportCards],
  'space-edge-computing': [MODULES.satellites, MODULES.spaceComms, MODULES.techReadiness, MODULES.constellations],
  'marketplace': [MODULES.supplyChain, MODULES.companyProfiles, MODULES.businessOps, MODULES.procurement],
  'imagery-providers': [MODULES.satellites, MODULES.manufacturing, MODULES.marketplace, MODULES.companyProfiles],
  'advertise': [MODULES.marketplace, MODULES.companyProfiles, MODULES.pricing],
  'pricing': [MODULES.marketplace, MODULES.businessOps],

  // ── Learning & Reference ──
  'glossary': [MODULES.acronyms, MODULES.learn, MODULES.orbitGuide, MODULES.history],
  'acronyms': [MODULES.glossary, MODULES.learn, MODULES.standardsRef, MODULES.orbitGuide],
  'orbit-guide': [MODULES.orbitalCalc, MODULES.satellites, MODULES.glossary, MODULES.constellations],
  'tech-readiness': [MODULES.patentLandscape, MODULES.industryTrends, MODULES.companyResearch, MODULES.techReadiness.href === '/tech-readiness' ? MODULES.marketIntel : MODULES.marketIntel],
  'conferences': [MODULES.spaceEvents, MODULES.news, MODULES.resources, MODULES.podcasts],
  'learn': [MODULES.glossary, MODULES.careerGuide, MODULES.orbitGuide, MODULES.educationPathways],
  'learn/space-industry': [MODULES.spaceEconomy, MODULES.launchVehicles, MODULES.careerGuide, MODULES.glossary, MODULES.acronyms],
  'materials-database': [MODULES.propulsionDB, MODULES.manufacturing, MODULES.blueprints, MODULES.standardsRef],
  'propulsion-database': [MODULES.propulsionComp, MODULES.launchVehicles, MODULES.materialsDB, MODULES.tools],
  'propulsion-comparison': [MODULES.propulsionDB, MODULES.launchVehicles, MODULES.launchEconomics, MODULES.tools],
  'standards-reference': [MODULES.compliance, MODULES.glossary, MODULES.materialsDB, MODULES.regulations],
  'clean-room-reference': [MODULES.manufacturing, MODULES.standardsRef, MODULES.materialsDB, MODULES.blueprints],
  'satellite-bus-comparison': [MODULES.satellites, MODULES.constellations, MODULES.constellationDesigner, MODULES.powerBudget],
  'radiation-calculator': [MODULES.orbitalCalc, MODULES.tools, MODULES.spaceEnvironment, MODULES.powerBudget],
  'thermal-calculator': [MODULES.powerBudget, MODULES.tools, MODULES.materialsDB, MODULES.orbitalCalc],
  'supply-chain-risk': [MODULES.supplyChain, MODULES.regulatoryRisk, MODULES.companyProfiles, MODULES.marketplace],
  'supply-chain-map': [MODULES.supplyChain, MODULES.companyProfiles, MODULES.marketplace, MODULES.ecosystemMap],

  // ── Dashboard & Personal ──
  'dashboard': [MODULES.marketIntel, MODULES.news, MODULES.satellites, MODULES.launchManifest],
  'alerts': [MODULES.news, MODULES.marketIntel, MODULES.satellites, MODULES.compliance],
  'reading-list': [MODULES.news, MODULES.blogs, MODULES.resources, MODULES.aiInsights],
  'my-watchlists': [MODULES.companyProfiles, MODULES.marketIntel, MODULES.alerts, MODULES.news],
  'deals': [MODULES.dealFlow, MODULES.maTracker, MODULES.contractAwards, MODULES.fundingTracker],
  'deal-rooms': [MODULES.marketplace, MODULES.dealFlow, MODULES.companyResearch],
  'portfolio-tracker': [MODULES.investmentTracker, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.marketIntel],
  'customer-discovery': [MODULES.marketSizing, MODULES.companyProfiles, MODULES.marketplace, MODULES.industryTrends],

  // ── Business Models ──
  'business-models': [MODULES.unitEconomics, MODULES.marketSizing, MODULES.businessOps, MODULES.industryTrends],

  // ── Solutions & Marketing pages (Wave 71/72) ──
  'solutions': [MODULES.companyProfiles, MODULES.marketIntel, MODULES.tools, MODULES.satellites, MODULES.spaceCapital],
  'solutions/investors': [MODULES.companyProfiles, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.dealFlow],
  'solutions/analysts': [MODULES.marketIntel, MODULES.industryTrends, MODULES.satellites, MODULES.spaceDefense, MODULES.news],
  'solutions/engineers': [MODULES.satellites, MODULES.constellationDesigner, MODULES.orbitalCalc, MODULES.linkBudget, MODULES.tools],
  'solutions/executives': [MODULES.marketIntel, MODULES.executiveMoves, MODULES.marketMap, MODULES.contractAwards, MODULES.intelligenceBrief],
  'use-cases': [MODULES.companyProfiles, MODULES.satellites, MODULES.marketIntel, MODULES.tools, MODULES.spaceCapital],
  'report/state-of-space-2026': [MODULES.marketIntel, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.fundingTracker, MODULES.marketSizing],
  'security': [MODULES.companyProfiles, MODULES.marketIntel, MODULES.tools, MODULES.satellites, MODULES.spaceCapital],

  // ── Marketing pages ──
  'case-studies': [MODULES.companyProfiles, MODULES.fundingTracker, MODULES.compliance, MODULES.procurement, MODULES.marketIntel],
  'book-demo': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.satellites, MODULES.compliance, MODULES.spaceCapital],

  // ── Features directory ──
  'features': [MODULES.marketIntel, MODULES.satellites, MODULES.tools, MODULES.compliance, MODULES.spaceCapital],

  // ── Onboarding ──
  'getting-started': [MODULES.companyProfiles, MODULES.satellites, MODULES.marketIntel, MODULES.tools, MODULES.compliance, MODULES.businessOps],

  // ── New Pages ──
  'api-access': [MODULES.tools, MODULES.companyProfiles, MODULES.satellites, MODULES.marketIntel, MODULES.spaceEconomy],
  'why-spacenexus': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.tools, MODULES.satellites, MODULES.spaceCapital],
  'widgets': [MODULES.satellites, MODULES.spaceWeather, MODULES.launchManifest, MODULES.marketIntel, MODULES.news],

  // ── Community / Event Pages ──
  'help': [MODULES.glossary, MODULES.learn, MODULES.tools, MODULES.news],

  // ── Careers & Solutions ──
  'careers': [MODULES.spaceTalent, MODULES.jobs, MODULES.salaryBenchmarks, MODULES.careerGuide, MODULES.educationPathways],
  'solutions/space-professionals': [MODULES.satellites, MODULES.marketIntel, MODULES.tools, MODULES.companyProfiles, MODULES.spaceCapital],

  // ── Industry Scorecard & Space Calendar ──
  'industry-scorecard': [MODULES.industryTrends, MODULES.spaceEconomy, MODULES.sustainability, MODULES.marketIntel, MODULES.govBudgets],
  'space-calendar': [MODULES.spaceEvents, MODULES.conferences, MODULES.launchManifest, MODULES.news, MODULES.industryScorecard],

  // ── Space Industry Map & Startup Directory ──
  'space-map': [MODULES.ecosystemMap, MODULES.marketMap, MODULES.companyProfiles, MODULES.startupDirectory, MODULES.marketIntel],
  'startup-directory': [MODULES.startupTracker, MODULES.fundingRounds, MODULES.spaceCapital, MODULES.spaceMap, MODULES.companyProfiles],

  // ── Media Kit ──
  'media-kit': [MODULES.companyProfiles, MODULES.marketIntel, MODULES.news, MODULES.blogs, MODULES.dataSources],

  // ── Data Sources ──
  'data-sources': [MODULES.aiInsights, MODULES.news, MODULES.satellites, MODULES.spaceWeather, MODULES.companyProfiles],

  // ── Space Industry Statistics ──
  'space-stats': [MODULES.spaceEconomy, MODULES.marketIntel, MODULES.industryTrends, MODULES.govBudgets, MODULES.satellites],

  // ── Daily Digest ──
  'daily-digest': [MODULES.newsDigest, MODULES.intelligenceBrief, MODULES.news, MODULES.aiInsights, MODULES.blogs],

  // ── Ignition Tracker ──
  'ignition': [MODULES.cislunar, MODULES.marsPlanner, MODULES.launchVehicles, MODULES.procurement, MODULES.govBudgets],

  // ── Newsletter ──
  'newsletter': [MODULES.intelligenceBrief, MODULES.newsDigest, MODULES.news, MODULES.newsletters, MODULES.blogs],

  // ── Enthusiast Guide Pages ──
  'aurora-forecast': [MODULES.spaceWeather, MODULES.spaceEnvironment, MODULES.solarExploration, MODULES.satellites, MODULES.satelliteSpotting],

  // ── Alternatives & Competitors ──
  'alternatives': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.tools, MODULES.satellites, MODULES.pricing],

  // ── Blog pages ──
  'blog': [MODULES.news, MODULES.aiInsights, MODULES.blogs, MODULES.resources, MODULES.podcasts],
  'blog/[slug]': [MODULES.news, MODULES.blogs, MODULES.aiInsights, MODULES.companyProfiles, MODULES.marketIntel],

  // ── Compare hub & comparison pages ──
  'compare': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.launchVehicles, MODULES.satellites, MODULES.tools],
  'compare/ast-spacemobile-vs-lynk': [MODULES.constellations, MODULES.companyProfiles, MODULES.spaceComms, MODULES.spectrum],
  'compare/axiom-vs-vast': [MODULES.spaceStations, MODULES.companyProfiles, MODULES.startupTracker, MODULES.spaceCapital],
  'compare/astra-vs-virgin-orbit': [MODULES.launchVehicles, MODULES.launchEconomics, MODULES.companyProfiles, MODULES.startupTracker],
  'compare/bloomberg-terminal': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.spaceEconomy, MODULES.industryTrends],
  'compare/blacksky-vs-planet-labs': [MODULES.satellites, MODULES.companyProfiles, MODULES.imagery, MODULES.spaceDefense],
  'compare/boeing-vs-lockheed-space': [MODULES.companyProfiles, MODULES.spaceDefense, MODULES.procurement, MODULES.contractAwards],
  'compare/companies': [MODULES.companyProfiles, MODULES.companyResearch, MODULES.marketIntel, MODULES.reportCards],
  'compare/iceye-vs-capella-space': [MODULES.satellites, MODULES.companyProfiles, MODULES.imagery, MODULES.spaceDefense],
  'compare/iridium-vs-globalstar': [MODULES.constellations, MODULES.satellites, MODULES.spaceComms, MODULES.companyProfiles],
  'compare/launch-vehicles': [MODULES.launchVehicles, MODULES.launchEconomics, MODULES.launchCostCalc, MODULES.launchSites],
  'compare/maxar-vs-airbus-defence-space': [MODULES.satellites, MODULES.companyProfiles, MODULES.manufacturing, MODULES.imagery],
  'compare/newsletters': [MODULES.newsletters, MODULES.blogs, MODULES.podcasts, MODULES.resources],
  'compare/northrop-grumman-vs-l3harris-space': [MODULES.companyProfiles, MODULES.spaceDefense, MODULES.procurement, MODULES.satellites],
  'compare/payload-space': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.news, MODULES.aiInsights],
  'compare/planet-labs-vs-maxar': [MODULES.satellites, MODULES.companyProfiles, MODULES.imagery, MODULES.constellations],
  'compare/quilty-analytics': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.industryTrends, MODULES.spaceEconomy],
  'compare/relativity-space-vs-firefly': [MODULES.launchVehicles, MODULES.startupTracker, MODULES.companyProfiles, MODULES.launchEconomics],
  'compare/rocket-lab-vs-astra': [MODULES.launchVehicles, MODULES.startupTracker, MODULES.companyProfiles, MODULES.launchEconomics],
  'compare/rocket-lab-vs-relativity-space': [MODULES.launchVehicles, MODULES.startupTracker, MODULES.companyProfiles, MODULES.launchEconomics],
  'compare/satellite-buses': [MODULES.satellites, MODULES.constellationDesigner, MODULES.powerBudget, MODULES.blueprints],
  'compare/satellites': [MODULES.satellites, MODULES.constellations, MODULES.orbitalSlots, MODULES.spaceComms],
  'compare/spacenexus-vs-bryce-tech': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.spaceEconomy, MODULES.tools],
  'compare/spacex-vs-blue-origin': [MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics, MODULES.spaceCapital],
  'compare/spcx-vs-rklb-stock': [MODULES.spaceStocks, MODULES.marketIntel, MODULES.companyProfiles, MODULES.startupTracker],
  'compare/starship-vs-new-glenn': [MODULES.spaceStocks, MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics],
  'compare/spacex-vs-ula': [MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics, MODULES.spaceDefense],
  'compare/vulcan-centaur-vs-falcon-9': [MODULES.launchVehicles, MODULES.launchEconomics, MODULES.launchManifest, MODULES.companyProfiles, MODULES.spaceDefense],
  'compare/starlink-vs-ast-spacemobile': [MODULES.constellations, MODULES.companyProfiles, MODULES.spaceComms, MODULES.spectrum],
  'compare/starlink-vs-kuiper': [MODULES.constellations, MODULES.satellites, MODULES.spaceComms, MODULES.companyProfiles],
  'compare/starlink-vs-oneweb': [MODULES.constellations, MODULES.satellites, MODULES.spaceComms, MODULES.companyProfiles],
  'compare/viasat-vs-ses': [MODULES.spaceComms, MODULES.companyProfiles, MODULES.constellations, MODULES.spectrum],
  'compare/virgin-galactic-vs-blue-origin': [MODULES.spaceTourism, MODULES.companyProfiles, MODULES.launchVehicles, MODULES.spaceCapital],
  'compare/spacex-vs-arianespace': [MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics, MODULES.spaceDefense],
  'compare/firefly-vs-abl-space': [MODULES.launchVehicles, MODULES.startupTracker, MODULES.companyProfiles, MODULES.launchEconomics],
  'compare/spire-vs-hawkeye-360': [MODULES.satellites, MODULES.companyProfiles, MODULES.spaceDefense, MODULES.constellations],
  'compare/satellogic-vs-planet-labs': [MODULES.satellites, MODULES.companyProfiles, MODULES.imagery, MODULES.constellations],
  'compare/ses-vs-intelsat': [MODULES.spaceComms, MODULES.companyProfiles, MODULES.constellations, MODULES.spectrum],
  'compare/iridium-vs-starlink': [MODULES.constellations, MODULES.spaceComms, MODULES.companyProfiles, MODULES.satellites],
  'compare/rocket-lab-vs-spacex': [MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics, MODULES.startupTracker],
  'compare/northrop-grumman-vs-boeing-space': [MODULES.companyProfiles, MODULES.spaceDefense, MODULES.procurement, MODULES.contractAwards],
  'compare/intuitive-machines-vs-astrobotic': [MODULES.cislunar, MODULES.companyProfiles, MODULES.startupTracker, MODULES.spaceCapital],
  'compare/sierra-space-vs-axiom-space': [MODULES.spaceStations, MODULES.companyProfiles, MODULES.startupTracker, MODULES.spaceCapital],
  'compare/clearspace-vs-astroscale': [MODULES.debrisRemediation, MODULES.companyProfiles, MODULES.startupTracker, MODULES.sustainability],
  'compare/leolabs-vs-slingshot': [MODULES.satellites, MODULES.companyProfiles, MODULES.spaceDefense, MODULES.debrisTracker],
  'compare/starlab-vs-orbital-reef': [MODULES.spaceStations, MODULES.companyProfiles, MODULES.startupTracker, MODULES.spaceCapital],
  'compare/skylo-vs-ast-spacemobile': [MODULES.constellations, MODULES.companyProfiles, MODULES.spaceComms, MODULES.spectrum],
  'compare/anduril-vs-l3harris-space': [MODULES.spaceDefense, MODULES.companyProfiles, MODULES.procurement, MODULES.contractAwards],
  'compare/pulsar-fusion-vs-ad-astra': [MODULES.propulsionDB, MODULES.companyProfiles, MODULES.startupTracker, MODULES.marsPlanner],
  'compare/astrolab-vs-intuitive-machines': [MODULES.cislunar, MODULES.companyProfiles, MODULES.startupTracker, MODULES.spaceCapital],
  'compare/loft-orbital-vs-york-space': [MODULES.satellites, MODULES.companyProfiles, MODULES.spaceDefense, MODULES.manufacturing],
  'compare/spacex-starship-vs-new-glenn': [MODULES.launchVehicles, MODULES.companyProfiles, MODULES.launchEconomics, MODULES.spaceCapital],
  'compare/space42-vs-planet-labs': [MODULES.satellites, MODULES.companyProfiles, MODULES.imagery, MODULES.constellations],

  // ── Developer portal ──
  'developer': [MODULES.tools, MODULES.satellites, MODULES.marketIntel, MODULES.companyProfiles, MODULES.pricing],
  'developer/docs': [MODULES.tools, MODULES.satellites, MODULES.marketIntel, MODULES.companyProfiles],
  'developer/explorer': [MODULES.tools, MODULES.satellites, MODULES.marketIntel, MODULES.companyProfiles],

  // ── Discover ──
  'discover': [MODULES.news, MODULES.satellites, MODULES.marketIntel, MODULES.companyProfiles, MODULES.spaceEvents],

  // ── FAQ ──
  'faq': [MODULES.help, MODULES.glossary, MODULES.learn, MODULES.pricing],

  // ── Guides ──
  'guide/how-satellite-tracking-works': [MODULES.satellites, MODULES.orbitGuide, MODULES.satelliteSpotting, MODULES.constellations, MODULES.learn],
  'guide/satellite-companies': [MODULES.companyProfiles, MODULES.satellites, MODULES.constellations, MODULES.startupTracker, MODULES.marketIntel],
  'guide/satellite-tracking-guide': [MODULES.satellites, MODULES.satelliteSpotting, MODULES.orbitGuide, MODULES.constellations, MODULES.learn],
  'guide/space-business-opportunities': [MODULES.businessOps, MODULES.marketplace, MODULES.procurement, MODULES.supplyChain, MODULES.fundingOpportunities],
  'guide/space-companies-directory': [MODULES.companyProfiles, MODULES.startupDirectory, MODULES.companyResearch, MODULES.marketIntel, MODULES.reportCards],
  'guide/space-economy-value-chain': [MODULES.spaceEconomy, MODULES.marketSizing, MODULES.companyProfiles, MODULES.supplyChain, MODULES.fundingTracker],
  'guide/space-economy-investment': [MODULES.spaceCapital, MODULES.fundingTracker, MODULES.investors, MODULES.spaceEconomy],
  'guide/space-industry': [MODULES.marketIntel, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.companyProfiles, MODULES.learn],
  'guide/space-industry-market-size': [MODULES.marketSizing, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.marketIntel, MODULES.govBudgets],
  'guide/space-launch-cost-comparison': [MODULES.launchCostCalc, MODULES.launchVehicles, MODULES.launchEconomics, MODULES.orbitalCosts, MODULES.missionCost],
  'guide/space-launch-schedule-2026': [MODULES.launchManifest, MODULES.launchWindows, MODULES.launchVehicles, MODULES.spaceCalendar, MODULES.launchSites],
  'guide/space-mining-guide': [MODULES.spaceMining, MODULES.isru, MODULES.asteroidWatch, MODULES.materialsDB, MODULES.solarExploration],
  'guide/space-regulatory-compliance': [MODULES.compliance, MODULES.regulatoryTracker, MODULES.spaceLaw, MODULES.licensingChecker, MODULES.exportClassifications],
  'guide/itar-compliance-guide': [MODULES.exportClassifications, MODULES.compliance, MODULES.regulatoryRisk, MODULES.spaceLaw, MODULES.licensingChecker],
  'guide/watch-a-launch-cape-canaveral': [MODULES.launchManifest, MODULES.launchSites, MODULES.spaceWeather, MODULES.launchVehicles, MODULES.spaceCalendar],
  'guide/watch-a-launch-vandenberg': [MODULES.launchManifest, MODULES.launchSites, MODULES.spaceWeather, MODULES.launchVehicles, MODULES.spaceCalendar],
  'guide/watch-a-launch-starbase': [MODULES.launchManifest, MODULES.launchSites, MODULES.spaceWeather, MODULES.launchVehicles, MODULES.spaceCalendar],
  'guide/watch-a-launch-wallops': [MODULES.launchManifest, MODULES.launchSites, MODULES.spaceWeather, MODULES.launchVehicles, MODULES.spaceCalendar],
  'guide/watch-a-launch-kourou': [MODULES.launchManifest, MODULES.launchSites, MODULES.spaceWeather, MODULES.launchVehicles, MODULES.spaceCalendar],
  'guide/nssl-phase-3': [MODULES.procurement, MODULES.contractAwards, MODULES.launchVehicles, MODULES.spaceDefense, MODULES.regulatoryCalendar],
  'guide/kuiper-vs-starlink': [MODULES.constellations, MODULES.satellites, MODULES.launchVehicles, MODULES.spaceStocks, MODULES.companyProfiles],
  'guide/space-debris-and-traffic-management': [MODULES.debrisTracker, MODULES.satellites, MODULES.spaceEnvironment, MODULES.compliance, MODULES.sustainability],
  'guide/space-weather-risk-for-operators': [MODULES.spaceWeather, MODULES.spaceEnvironment, MODULES.auroraForecast, MODULES.alerts, MODULES.satellites],

  // ── Launch pages ──
  'launches': [MODULES.launchManifest, MODULES.launchVehicles, MODULES.launchWindows, MODULES.launchSites, MODULES.missionPipeline],
  'launch': [MODULES.launchManifest, MODULES.launchVehicles, MODULES.launchWindows, MODULES.launchSites],
  'launch/[eventId]': [MODULES.launchManifest, MODULES.launchVehicles, MODULES.launchWindows, MODULES.launchSites],

  // ── Live tracking ──
  'live': [MODULES.satellites, MODULES.launchManifest, MODULES.spaceWeather, MODULES.news, MODULES.spaceEvents],
  'live/artemis-ii-blog': [MODULES.launchManifest, MODULES.satellites, MODULES.spaceWeather, MODULES.news, MODULES.cislunar],

  // ── Market segments ──
  'market-segments': [MODULES.marketIntel, MODULES.marketSizing, MODULES.industryTrends, MODULES.spaceEconomy, MODULES.marketMap],

  // ── Night sky ──
  'night-sky': [MODULES.satelliteSpotting, MODULES.auroraForecast, MODULES.spaceWeather, MODULES.satellites, MODULES.learn],
  'night-sky-guide': [MODULES.satelliteSpotting, MODULES.auroraForecast, MODULES.spaceWeather, MODULES.satellites, MODULES.orbitGuide],

  // ── Press ──
  'press': [MODULES.news, MODULES.blogs, MODULES.companyProfiles, MODULES.marketIntel],

  // ── Regulation explainers ──
  'regulation-explainers': [MODULES.compliance, MODULES.spaceLaw, MODULES.regulations, MODULES.regulatoryTracker, MODULES.regulatoryAgencies],
  'regulation-explainers/[slug]': [MODULES.compliance, MODULES.spaceLaw, MODULES.regulations, MODULES.regulatoryTracker, MODULES.regulatoryAgencies],

  // ── Reports ──
  'reports': [MODULES.marketIntel, MODULES.industryTrends, MODULES.spaceEconomy, MODULES.companyProfiles, MODULES.news],

  // ── Sectors ──
  'sectors': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.industryTrends, MODULES.marketMap, MODULES.ecosystemMap],
  'sectors/[slug]': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.industryTrends, MODULES.marketMap],

  // ── This Day in Space ──
  'this-day-in-space': [MODULES.history, MODULES.missionHeritage, MODULES.news, MODULES.learn, MODULES.spaceAgencies],

  // ── History ──
  'history': [MODULES.thisDayInSpace, MODULES.missionHeritage, MODULES.missionStats, MODULES.glossary, MODULES.spaceAgencies],

  // ── Videos ──
  'videos': [MODULES.news, MODULES.podcasts, MODULES.blogs, MODULES.resources, MODULES.learn],

  // ── What's Overhead ──
  'whats-overhead': [MODULES.satellites, MODULES.auroraForecast, MODULES.spaceWeather, MODULES.orbitGuide, MODULES.constellations],

  // ── Tonight over your town ──
  'tonight': [MODULES.satelliteSpotting, MODULES.satellites, MODULES.auroraForecast, MODULES.spaceWeather, MODULES.orbitGuide],

  // ── Year in Review ──
  'year-in-review': [MODULES.spaceEconomy, MODULES.industryTrends, MODULES.missionStats, MODULES.fundingTracker, MODULES.govBudgets],
};

// Helper to get related modules for a page
export function getRelatedModules(pageRoute: string): RelatedModuleConfig[] {
  return PAGE_RELATIONS[pageRoute] || [];
}
