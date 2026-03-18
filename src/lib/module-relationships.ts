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
  marketIntel: { name: 'Market Intelligence', description: 'Industry analysis & trends', href: '/market-intel', icon: '📊' },
  companyProfiles: { name: 'Company Profiles', description: 'Space industry directory', href: '/company-profiles', icon: '🏢' },
  companyResearch: { name: 'Company Research', description: 'AI-powered research', href: '/company-research', icon: '🔬' },
  spaceEconomy: { name: 'Space Economy', description: 'Economic indicators', href: '/space-economy', icon: '💰' },
  spaceCapital: { name: 'Space Capital', description: 'Investment landscape', href: '/space-capital', icon: '🏦' },
  marketSizing: { name: 'Market Sizing', description: 'TAM/SAM/SOM analysis', href: '/market-sizing', icon: '📏' },
  fundingTracker: { name: 'Funding Tracker', description: 'Investment rounds', href: '/funding-tracker', icon: '💸' },
  investors: { name: 'Investor Directory', description: 'Space investors & VCs', href: '/investors', icon: '👤' },
  investmentTracker: { name: 'Investment Tracker', description: 'Deal tracking dashboard', href: '/investment-tracker', icon: '📈' },
  investmentThesis: { name: 'Investment Thesis', description: 'AI-generated analysis', href: '/investment-thesis', icon: '🎯' },
  dealFlow: { name: 'Deal Flow', description: 'M&A and funding deals', href: '/deal-flow', icon: '🤝' },
  maTracker: { name: 'M&A Tracker', description: 'Mergers & acquisitions', href: '/ma-tracker', icon: '🔄' },
  startupTracker: { name: 'Startup Tracker', description: 'Emerging companies', href: '/startup-tracker', icon: '🚀' },
  reportCards: { name: 'Report Cards', description: 'Company performance grades', href: '/report-cards', icon: '📝' },
  marketMap: { name: 'Market Map', description: 'Industry landscape', href: '/market-map', icon: '🗺️' },
  ecosystemMap: { name: 'Ecosystem Map', description: 'Industry connections', href: '/ecosystem-map', icon: '🌐' },
  industryTrends: { name: 'Industry Trends', description: 'Trend analysis', href: '/industry-trends', icon: '📈' },
  spaceScore: { name: 'Space Score', description: 'Company scoring', href: '/space-score', icon: '⭐' },
  executiveMoves: { name: 'Executive Moves', description: 'Leadership changes', href: '/executive-moves', icon: '👔' },

  // ── News & Media ──
  news: { name: 'Space News', description: 'Latest headlines', href: '/news', icon: '📰' },
  blogs: { name: 'Blogs & Articles', description: 'Industry analysis', href: '/blogs', icon: '✍️' },
  spaceDefense: { name: 'Space Defense', description: 'Defense & security', href: '/space-defense', icon: '🛡️' },
  aiInsights: { name: 'AI Insights', description: 'AI-generated analysis', href: '/ai-insights', icon: '🤖' },
  newsDigest: { name: 'Daily Digest', description: 'Curated headlines', href: '/news-digest', icon: '📋' },
  intelligenceBrief: { name: 'Intelligence Brief', description: 'Weekly briefing', href: '/intelligence-brief', icon: '📑' },
  podcasts: { name: 'Podcasts', description: 'Industry podcasts', href: '/podcasts', icon: '🎙️' },
  resources: { name: 'Resources', description: 'Curated content', href: '/resources', icon: '📚' },
  newsletters: { name: 'Newsletters', description: 'Industry newsletters', href: '/newsletters-directory', icon: '✉️' },

  // ── Business Opportunities ──
  businessOps: { name: 'Business Opportunities', description: 'Growth opportunities', href: '/business-opportunities', icon: '💼' },
  supplyChain: { name: 'Supply Chain', description: 'Supply chain intel', href: '/supply-chain', icon: '🔗' },
  spaceMining: { name: 'Space Mining', description: 'Resource extraction', href: '/space-mining', icon: '⛏️' },
  patents: { name: 'Patents', description: 'IP landscape', href: '/patents', icon: '📜' },
  patentLandscape: { name: 'Patent Landscape', description: 'Patent trends & analysis', href: '/patent-landscape', icon: '🔎' },
  manufacturing: { name: 'Space Manufacturing', description: 'In-space production', href: '/space-manufacturing', icon: '🏭' },
  procurement: { name: 'Procurement', description: 'Government contracts', href: '/procurement', icon: '📋' },
  contractAwards: { name: 'Contract Awards', description: 'Recent awards', href: '/contract-awards', icon: '🏆' },
  fundingOpportunities: { name: 'Funding Opportunities', description: 'Grants & programs', href: '/funding-opportunities', icon: '💡' },
  fundingRounds: { name: 'Funding Rounds', description: 'Investment rounds DB', href: '/funding-rounds', icon: '💵' },
  govBudgets: { name: 'Government Budgets', description: 'Agency spending', href: '/government-budgets', icon: '🏛️' },

  // ── Mission Planning ──
  missionCost: { name: 'Mission Planner', description: 'Cost estimation', href: '/mission-cost', icon: '🧮' },
  spaceInsurance: { name: 'Space Insurance', description: 'Risk coverage', href: '/space-insurance', icon: '🛡️' },
  resourceExchange: { name: 'Resource Exchange', description: 'Trade & barter', href: '/resource-exchange', icon: '🔄' },
  launchWindows: { name: 'Launch Windows', description: 'Optimal timing', href: '/launch-windows', icon: '🪟' },
  launchVehicles: { name: 'Launch Vehicles', description: 'Rocket database', href: '/launch-vehicles', icon: '🚀' },
  blueprints: { name: 'Blueprints', description: 'Technical designs', href: '/blueprints', icon: '📐' },
  orbitalCosts: { name: 'Orbital Costs', description: 'Cost analysis', href: '/orbital-costs', icon: '💲' },
  orbitalCalc: { name: 'Orbital Calculator', description: 'Mechanics calculator', href: '/orbital-calculator', icon: '🔢' },
  constellationDesigner: { name: 'Constellation Designer', description: 'Design tool', href: '/constellation-designer', icon: '✨' },
  powerBudget: { name: 'Power Budget', description: 'Power calculator', href: '/power-budget-calculator', icon: '⚡' },
  linkBudget: { name: 'Link Budget', description: 'RF calculator', href: '/link-budget-calculator', icon: '📡' },
  tools: { name: 'Engineering Tools', description: 'Calculator suite', href: '/tools', icon: '🔧' },
  launchCostCalc: { name: 'Launch Cost Calculator', description: 'Cost estimation tool', href: '/launch-cost-calculator', icon: '💰' },
  launchEconomics: { name: 'Launch Economics', description: 'Cost analysis', href: '/launch-economics', icon: '📊' },
  launchManifest: { name: 'Launch Manifest', description: 'Upcoming launches', href: '/launch-manifest', icon: '📅' },
  launchSites: { name: 'Launch Sites', description: 'Spaceport directory', href: '/launch-sites', icon: '🏗️' },
  missionSimulator: { name: 'Mission Simulator', description: 'Mission modeling', href: '/mission-simulator', icon: '🎮' },
  missionHeritage: { name: 'Mission Heritage', description: 'Historical missions', href: '/mission-heritage', icon: '🏛️' },
  missionPipeline: { name: 'Mission Pipeline', description: 'Future missions', href: '/mission-pipeline', icon: '📋' },
  missionStats: { name: 'Mission Statistics', description: 'Launch data', href: '/mission-stats', icon: '📊' },
  unitEconomics: { name: 'Unit Economics', description: 'Business modeling', href: '/unit-economics', icon: '📐' },

  // ── Space Operations ──
  satellites: { name: 'Satellite Tracker', description: 'Orbital tracking', href: '/satellites', icon: '🛰️' },
  orbitalSlots: { name: 'Orbital Slots', description: 'Slot management', href: '/orbital-slots', icon: '🎯' },
  constellations: { name: 'Constellations', description: 'Constellation data', href: '/constellations', icon: '⭐' },
  groundStations: { name: 'Ground Stations', description: 'Station network', href: '/ground-stations', icon: '📡' },
  spaceStations: { name: 'Space Stations', description: 'Orbital habitats', href: '/space-stations', icon: '🏠' },
  spaceports: { name: 'Spaceports', description: 'Launch facilities', href: '/spaceports', icon: '🏗️' },
  debrisCatalog: { name: 'Debris Catalog', description: 'Tracked objects', href: '/debris-catalog', icon: '🗑️' },
  debrisRemediation: { name: 'Debris Remediation', description: 'Cleanup solutions', href: '/debris-remediation', icon: '🧹' },
  debrisTracker: { name: 'Debris Tracker', description: 'Collision risk', href: '/debris-tracker', icon: '⚠️' },

  // ── Talent & Workforce ──
  spaceTalent: { name: 'Space Talent Hub', description: 'Jobs & workforce', href: '/space-talent', icon: '👥' },
  jobs: { name: 'Space Jobs', description: 'Job listings', href: '/jobs', icon: '💼' },
  salaryBenchmarks: { name: 'Salary Benchmarks', description: 'Compensation data', href: '/salary-benchmarks', icon: '💵' },
  careerGuide: { name: 'Career Guide', description: 'Career paths', href: '/career-guide', icon: '🎓' },
  workforceAnalytics: { name: 'Workforce Analytics', description: 'Talent trends', href: '/workforce-analytics', icon: '📊' },
  educationPathways: { name: 'Education Pathways', description: 'Learning paths', href: '/education-pathways', icon: '📚' },

  // ── Regulatory & Compliance ──
  compliance: { name: 'Compliance Hub', description: 'Regulatory overview', href: '/compliance', icon: '⚖️' },
  spectrum: { name: 'Spectrum Management', description: 'RF allocation', href: '/spectrum', icon: '📡' },
  regulatoryRisk: { name: 'Regulatory Risk', description: 'Risk assessment', href: '/regulatory-risk', icon: '⚠️' },
  regulatoryCalendar: { name: 'Regulatory Calendar', description: 'Upcoming deadlines', href: '/regulatory-calendar', icon: '📅' },
  regulatoryTracker: { name: 'Regulatory Tracker', description: 'Policy changes', href: '/regulatory-tracker', icon: '📋' },
  regulations: { name: 'Regulations Explorer', description: 'Treaty database', href: '/regulations', icon: '📖' },
  spaceLaw: { name: 'Space Law', description: 'Legal framework', href: '/space-law', icon: '⚖️' },
  rfSpectrum: { name: 'RF Spectrum', description: 'Frequency data', href: '/rf-spectrum', icon: '📶' },
  frequencyDB: { name: 'Frequency Database', description: 'Allocation data', href: '/frequency-database', icon: '📊' },
  frequencyBands: { name: 'Frequency Bands', description: 'Band reference', href: '/frequency-bands', icon: '📡' },

  // ── Solar System Expansion ──
  solarExploration: { name: 'Solar Exploration', description: 'Deep space missions', href: '/solar-exploration', icon: '☀️' },
  marsPlanner: { name: 'Mars Planner', description: 'Mars mission tool', href: '/mars-planner', icon: '🔴' },
  cislunar: { name: 'Cislunar Economy', description: 'Moon economy', href: '/cislunar', icon: '🌙' },
  asteroidWatch: { name: 'Asteroid Watch', description: 'NEO monitoring', href: '/asteroid-watch', icon: '☄️' },
  isru: { name: 'ISRU', description: 'Resource utilization', href: '/isru', icon: '⛏️' },

  // ── Space Environment ──
  spaceEnvironment: { name: 'Space Environment', description: 'Weather & debris', href: '/space-environment', icon: '🌍' },
  spaceWeather: { name: 'Space Weather', description: 'Solar conditions', href: '/space-weather', icon: '☀️' },
  spaceEvents: { name: 'Space Events', description: 'Industry events', href: '/space-events', icon: '📅' },
  earthEvents: { name: 'Earth Events', description: 'NASA EONET disasters', href: '/earth-events', icon: '🌎' },

  // ── Tourism & Misc ──
  spaceTourism: { name: 'Space Tourism', description: 'Commercial flights', href: '/space-tourism', icon: '✈️' },
  spaceAgencies: { name: 'Space Agencies', description: 'Agency directory', href: '/space-agencies', icon: '🏛️' },
  spaceComms: { name: 'Space Communications', description: 'Comms systems', href: '/space-comms', icon: '📡' },
  sustainability: { name: 'Sustainability', description: 'Environmental scores', href: '/sustainability-scorecard', icon: '🌱' },
  spaceEdge: { name: 'Edge Computing', description: 'In-orbit computing', href: '/space-edge-computing', icon: '💻' },
  spaceInvestors: { name: 'Space Investors', description: 'Active investors', href: '/space-investors', icon: '📈' },

  // ── Marketplace ──
  marketplace: { name: 'Marketplace', description: 'Services & products', href: '/marketplace', icon: '🛒' },
  pricing: { name: 'Pricing', description: 'Plans & pricing', href: '/pricing', icon: '💳' },

  // ── Learning & Reference ──
  glossary: { name: 'Glossary', description: 'Industry terms', href: '/glossary', icon: '📖' },
  timeline: { name: 'Timeline', description: 'Space history', href: '/timeline', icon: '⏳' },
  orbitGuide: { name: 'Orbit Guide', description: 'Orbit types', href: '/orbit-guide', icon: '🌀' },
  techReadiness: { name: 'Tech Readiness', description: 'TRL tracker', href: '/tech-readiness', icon: '🔬' },
  conferences: { name: 'Conferences', description: 'Industry events', href: '/conferences', icon: '🎤' },
  learn: { name: 'Learning Hub', description: 'Educational content', href: '/learn', icon: '📚' },
  acronyms: { name: 'Acronyms', description: 'Space acronyms', href: '/acronyms', icon: '🔤' },
  materialsDB: { name: 'Materials Database', description: 'Space materials', href: '/materials-database', icon: '🧱' },
  propulsionDB: { name: 'Propulsion Database', description: 'Engine data', href: '/propulsion-database', icon: '🔥' },
  propulsionComp: { name: 'Propulsion Comparison', description: 'Engine comparison', href: '/propulsion-comparison', icon: '⚡' },
  standardsRef: { name: 'Standards Reference', description: 'Industry standards', href: '/standards-reference', icon: '📏' },
};

// Page-to-related-modules mapping
export const PAGE_RELATIONS: Record<string, RelatedModuleConfig[]> = {
  // ── Market Intelligence cluster ──
  'market-intel': [MODULES.companyProfiles, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.marketSizing, MODULES.marketMap],
  'company-profiles': [MODULES.companyResearch, MODULES.reportCards, MODULES.executiveMoves, MODULES.spaceScore, MODULES.marketIntel],
  'company-research': [MODULES.companyProfiles, MODULES.aiInsights, MODULES.reportCards, MODULES.investmentThesis],
  'space-economy': [MODULES.marketIntel, MODULES.govBudgets, MODULES.investmentTracker, MODULES.industryTrends, MODULES.spaceCapital],
  'space-capital': [MODULES.fundingTracker, MODULES.investors, MODULES.dealFlow, MODULES.spaceEconomy, MODULES.investmentThesis],
  'market-sizing': [MODULES.marketIntel, MODULES.industryTrends, MODULES.spaceEconomy, MODULES.marketMap],
  'funding-tracker': [MODULES.spaceCapital, MODULES.investors, MODULES.dealFlow, MODULES.fundingRounds, MODULES.startupTracker],
  'investors': [MODULES.spaceCapital, MODULES.fundingTracker, MODULES.dealFlow, MODULES.spaceInvestors],
  'investment-tracker': [MODULES.fundingTracker, MODULES.dealFlow, MODULES.spaceCapital, MODULES.maTracker, MODULES.investmentThesis],
  'investment-thesis': [MODULES.investmentTracker, MODULES.companyResearch, MODULES.reportCards, MODULES.spaceScore],
  'deal-flow': [MODULES.maTracker, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.contractAwards, MODULES.investmentTracker],
  'ma-tracker': [MODULES.dealFlow, MODULES.companyProfiles, MODULES.executiveMoves, MODULES.spaceCapital],
  'startup-tracker': [MODULES.fundingTracker, MODULES.companyProfiles, MODULES.spaceCapital, MODULES.startupTracker.href === '/startup-tracker' ? MODULES.dealFlow : MODULES.dealFlow],
  'report-cards': [MODULES.companyProfiles, MODULES.spaceScore, MODULES.companyResearch, MODULES.investmentThesis],
  'market-map': [MODULES.ecosystemMap, MODULES.marketIntel, MODULES.companyProfiles, MODULES.industryTrends],
  'ecosystem-map': [MODULES.marketMap, MODULES.companyProfiles, MODULES.supplyChain, MODULES.marketIntel],
  'industry-trends': [MODULES.marketIntel, MODULES.techReadiness, MODULES.industryTrends.href === '/industry-trends' ? MODULES.spaceEconomy : MODULES.spaceEconomy, MODULES.intelligenceBrief],
  'space-score': [MODULES.companyProfiles, MODULES.reportCards, MODULES.companyResearch, MODULES.investmentThesis],
  'executive-moves': [MODULES.companyProfiles, MODULES.news, MODULES.maTracker, MODULES.spaceCapital],
  'space-investors': [MODULES.investors, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.dealFlow],

  // ── News & Media cluster ──
  'news': [MODULES.newsDigest, MODULES.aiInsights, MODULES.intelligenceBrief, MODULES.blogs, MODULES.spaceDefense],
  'blogs': [MODULES.news, MODULES.aiInsights, MODULES.resources, MODULES.podcasts],
  'space-defense': [MODULES.news, MODULES.spaceAgencies, MODULES.compliance, MODULES.govBudgets, MODULES.procurement],
  'ai-insights': [MODULES.companyResearch, MODULES.news, MODULES.marketIntel, MODULES.intelligenceBrief],
  'news-digest': [MODULES.news, MODULES.intelligenceBrief, MODULES.aiInsights, MODULES.blogs],
  'intelligence-brief': [MODULES.newsDigest, MODULES.marketIntel, MODULES.aiInsights, MODULES.industryTrends],
  'news-aggregator': [MODULES.news, MODULES.newsDigest, MODULES.blogs, MODULES.aiInsights],
  'podcasts': [MODULES.resources, MODULES.blogs, MODULES.newsletters, MODULES.news],
  'resources': [MODULES.podcasts, MODULES.blogs, MODULES.newsletters, MODULES.learn],
  'newsletters-directory': [MODULES.resources, MODULES.blogs, MODULES.podcasts, MODULES.news],

  // ── Business Opportunities cluster ──
  'business-opportunities': [MODULES.procurement, MODULES.supplyChain, MODULES.marketplace, MODULES.fundingOpportunities, MODULES.contractAwards],
  'supply-chain': [MODULES.businessOps, MODULES.manufacturing, MODULES.marketplace, MODULES.companyProfiles],
  'space-mining': [MODULES.isru, MODULES.asteroidWatch, MODULES.solarExploration, MODULES.materialsDB],
  'patents': [MODULES.patentLandscape, MODULES.techReadiness, MODULES.companyProfiles, MODULES.manufacturing],
  'patent-landscape': [MODULES.patents, MODULES.techReadiness, MODULES.industryTrends, MODULES.companyResearch],
  'space-manufacturing': [MODULES.supplyChain, MODULES.blueprints, MODULES.materialsDB, MODULES.businessOps],
  'procurement': [MODULES.contractAwards, MODULES.govBudgets, MODULES.businessOps, MODULES.fundingOpportunities],
  'contract-awards': [MODULES.procurement, MODULES.govBudgets, MODULES.companyProfiles, MODULES.dealFlow],
  'funding-opportunities': [MODULES.fundingTracker, MODULES.procurement, MODULES.businessOps, MODULES.govBudgets],
  'funding-rounds': [MODULES.fundingTracker, MODULES.spaceCapital, MODULES.investors, MODULES.startupTracker],
  'government-budgets': [MODULES.spaceAgencies, MODULES.procurement, MODULES.contractAwards, MODULES.spaceEconomy],

  // ── Mission Planning cluster ──
  'mission-cost': [MODULES.launchCostCalc, MODULES.orbitalCosts, MODULES.launchVehicles, MODULES.spaceInsurance, MODULES.missionSimulator],
  'space-insurance': [MODULES.missionCost, MODULES.spaceInsurance.href === '/space-insurance' ? MODULES.regulatoryRisk : MODULES.regulatoryRisk, MODULES.launchVehicles],
  'resource-exchange': [MODULES.marketplace, MODULES.supplyChain, MODULES.businessOps],
  'launch-windows': [MODULES.launchManifest, MODULES.launchVehicles, MODULES.launchSites, MODULES.missionCost],
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
  'mission-heritage': [MODULES.missionStats, MODULES.timeline, MODULES.missionPipeline, MODULES.spaceAgencies],
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
  'satellite-tracker': [MODULES.satellites, MODULES.constellations, MODULES.orbitalSlots, MODULES.spaceEnvironment, MODULES.groundStations],

  // ── Talent & Workforce cluster ──
  'space-talent': [MODULES.jobs, MODULES.salaryBenchmarks, MODULES.careerGuide, MODULES.workforceAnalytics, MODULES.educationPathways],
  'jobs': [MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.careerGuide, MODULES.companyProfiles],
  'salary-benchmarks': [MODULES.spaceTalent, MODULES.workforceAnalytics, MODULES.careerGuide, MODULES.jobs],
  'career-guide': [MODULES.educationPathways, MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.jobs],
  'workforce-analytics': [MODULES.spaceTalent, MODULES.salaryBenchmarks, MODULES.industryTrends, MODULES.educationPathways],
  'education-pathways': [MODULES.careerGuide, MODULES.spaceTalent, MODULES.learn, MODULES.glossary],

  // ── Regulatory & Compliance cluster ──
  'compliance': [MODULES.regulatoryTracker, MODULES.regulatoryCalendar, MODULES.regulatoryRisk, MODULES.spaceLaw, MODULES.regulations],
  'spectrum': [MODULES.rfSpectrum, MODULES.frequencyDB, MODULES.frequencyBands, MODULES.compliance, MODULES.spaceComms],
  'regulatory-risk': [MODULES.compliance, MODULES.regulatoryTracker, MODULES.regulatoryCalendar, MODULES.spaceLaw],
  'regulatory-calendar': [MODULES.compliance, MODULES.regulatoryTracker, MODULES.regulatoryRisk, MODULES.regulations],
  'regulatory-tracker': [MODULES.compliance, MODULES.regulatoryCalendar, MODULES.regulatoryRisk, MODULES.spaceLaw],
  'regulations': [MODULES.compliance, MODULES.spaceLaw, MODULES.regulatoryTracker, MODULES.regulatoryRisk],
  'space-law': [MODULES.compliance, MODULES.regulations, MODULES.regulatoryRisk, MODULES.regulatoryTracker],
  'rf-spectrum': [MODULES.spectrum, MODULES.frequencyDB, MODULES.frequencyBands, MODULES.spaceComms],
  'frequency-database': [MODULES.rfSpectrum, MODULES.spectrum, MODULES.frequencyBands, MODULES.linkBudget],
  'frequency-bands': [MODULES.frequencyDB, MODULES.rfSpectrum, MODULES.spectrum, MODULES.spaceComms],

  // ── Solar System Expansion cluster ──
  'solar-exploration': [MODULES.marsPlanner, MODULES.cislunar, MODULES.asteroidWatch, MODULES.isru, MODULES.missionPipeline],
  'mars-planner': [MODULES.solarExploration, MODULES.isru, MODULES.missionCost, MODULES.launchWindows],
  'cislunar': [MODULES.solarExploration, MODULES.spaceStations, MODULES.isru, MODULES.marsPlanner],
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
  'glossary': [MODULES.acronyms, MODULES.learn, MODULES.orbitGuide, MODULES.timeline],
  'acronyms': [MODULES.glossary, MODULES.learn, MODULES.standardsRef, MODULES.orbitGuide],
  'timeline': [MODULES.missionHeritage, MODULES.missionStats, MODULES.glossary, MODULES.spaceAgencies],
  'orbit-guide': [MODULES.orbitalCalc, MODULES.satellites, MODULES.glossary, MODULES.constellations],
  'tech-readiness': [MODULES.patentLandscape, MODULES.industryTrends, MODULES.companyResearch, MODULES.techReadiness.href === '/tech-readiness' ? MODULES.marketIntel : MODULES.marketIntel],
  'conferences': [MODULES.spaceEvents, MODULES.news, MODULES.resources, MODULES.podcasts],
  'learn': [MODULES.glossary, MODULES.careerGuide, MODULES.orbitGuide, MODULES.educationPathways],
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
  'deal-rooms': [MODULES.deals, MODULES.investmentThesis, MODULES.dealFlow, MODULES.companyResearch],
  'portfolio-tracker': [MODULES.investmentTracker, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.marketIntel],
  'customer-discovery': [MODULES.marketSizing, MODULES.companyProfiles, MODULES.marketplace, MODULES.industryTrends],

  // ── Business Models ──
  'business-models': [MODULES.unitEconomics, MODULES.marketSizing, MODULES.businessOps, MODULES.industryTrends],

  // ── Solutions & Marketing pages (Wave 71/72) ──
  'solutions': [MODULES.companyProfiles, MODULES.marketIntel, MODULES.tools, MODULES.satellites, MODULES.spaceCapital],
  'solutions/investors': [MODULES.companyProfiles, MODULES.fundingTracker, MODULES.spaceCapital, MODULES.dealFlow, MODULES.investmentThesis],
  'solutions/analysts': [MODULES.marketIntel, MODULES.industryTrends, MODULES.satellites, MODULES.spaceDefense, MODULES.news],
  'solutions/engineers': [MODULES.satellites, MODULES.constellationDesigner, MODULES.orbitalCalc, MODULES.linkBudget, MODULES.tools],
  'solutions/executives': [MODULES.marketIntel, MODULES.executiveMoves, MODULES.marketMap, MODULES.contractAwards, MODULES.intelligenceBrief],
  'use-cases': [MODULES.companyProfiles, MODULES.satellites, MODULES.marketIntel, MODULES.tools, MODULES.spaceCapital],
  'report/state-of-space-2026': [MODULES.marketIntel, MODULES.spaceEconomy, MODULES.industryTrends, MODULES.fundingTracker, MODULES.marketSizing],
  'enterprise': [MODULES.companyProfiles, MODULES.aiInsights, MODULES.regulatoryTracker, MODULES.procurement, MODULES.contractAwards],
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
  'newsletter-archive': [MODULES.newsletters, MODULES.newsDigest, MODULES.intelligenceBrief, MODULES.blogs, MODULES.resources],
  'why-spacenexus': [MODULES.marketIntel, MODULES.companyProfiles, MODULES.tools, MODULES.satellites, MODULES.spaceCapital],
  'widgets': [MODULES.satellites, MODULES.spaceWeather, MODULES.launchManifest, MODULES.marketIntel, MODULES.news],

  // ── Community / Event Pages ──
  'satellite-2026': [MODULES.spaceEvents, MODULES.conferences, MODULES.news, MODULES.companyProfiles, MODULES.marketplace],
  'help': [MODULES.glossary, MODULES.learn, MODULES.tools, MODULES.news],
};

// Helper to get related modules for a page
export function getRelatedModules(pageRoute: string): RelatedModuleConfig[] {
  return PAGE_RELATIONS[pageRoute] || [];
}
