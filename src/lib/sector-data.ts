// ─── Space Industry Sector Directory ──────────────────────────────────────────
// Programmatic SEO: each sector becomes a /sectors/[slug] page targeting
// "[sector] companies", "[sector] market size", "[sector] startups" keywords.

export interface SectorCompany {
  name: string;
  slug?: string; // Link to /company-profiles/[slug] if exists
  description: string;
  tier: 'leader' | 'challenger' | 'emerging';
}

export interface SectorDefinition {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  marketSize: string;          // e.g., "$12.5B (2025)"
  growthRate: string;          // e.g., "+8.2% CAGR"
  keyMetric: string;           // e.g., "320+ launches in 2025"
  icon: string;
  tier: 1 | 2 | 3;            // Market size tier
  keywords: string[];
  companies: SectorCompany[];
  relatedSectors: string[];    // slugs of related sectors
  trends: string[];            // 3-4 key trends
}

export const SECTORS: SectorDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Major segments ($10B+, high search volume)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'launch-services',
    name: 'Launch Services',
    description: 'Companies that launch payloads to orbit, including rocket manufacturers and launch service providers.',
    longDescription: 'The launch services sector encompasses companies that design, manufacture, and operate launch vehicles to deliver payloads to orbit. This includes traditional heavy-lift providers, emerging small-launch companies, and the rapidly growing rideshare market. Reusability has fundamentally changed the economics, with SpaceX leading a price revolution that has expanded the addressable market.',
    marketSize: '$16.2B (2025)',
    growthRate: '+12% CAGR',
    keyMetric: '320+ orbital launches in 2025',
    icon: '🚀',
    tier: 1,
    keywords: ['launch services companies', 'rocket companies', 'space launch providers', 'launch vehicle manufacturers', 'commercial launch market'],
    companies: [
      { name: 'SpaceX', slug: 'spacex', description: 'Dominant launch provider with Falcon 9/Heavy and Starship', tier: 'leader' },
      { name: 'Rocket Lab', slug: 'rocket-lab', description: 'Small launch leader with Electron, developing medium-lift Neutron', tier: 'leader' },
      { name: 'ULA', slug: 'ula', description: 'Boeing-Lockheed JV operating Atlas V and Vulcan Centaur', tier: 'leader' },
      { name: 'Arianespace', description: 'European launch provider with Ariane 6 and Vega-C', tier: 'leader' },
      { name: 'Relativity Space', slug: 'relativity-space', description: '3D-printed rockets, developing Terran R medium-lift vehicle', tier: 'challenger' },
      { name: 'Firefly Aerospace', slug: 'firefly-aerospace', description: 'Small-to-medium launch with Alpha and MLV', tier: 'challenger' },
      { name: 'ABL Space Systems', description: 'Responsive small launch with RS1', tier: 'emerging' },
      { name: 'Stoke Space', description: 'Fully reusable rocket development', tier: 'emerging' },
    ],
    relatedSectors: ['satellite-manufacturing', 'space-logistics', 'propulsion-systems'],
    trends: [
      'Reusability driving costs below $2,000/kg to LEO',
      'Mega-constellation demand driving launch cadence records',
      'Methane-LOX engines becoming the standard for next-gen vehicles',
      'Responsive launch capabilities for military applications',
    ],
  },
  {
    slug: 'satellite-communications',
    name: 'Satellite Communications',
    description: 'LEO, MEO, and GEO satellite operators providing broadband, IoT, and mobile connectivity services.',
    longDescription: 'Satellite communications is the largest commercial space segment, providing broadband internet, direct-to-device connectivity, IoT/M2M, maritime, aviation, and government communications. The sector is being transformed by LEO mega-constellations offering low-latency broadband, while GEO operators pivot to high-throughput architectures.',
    marketSize: '$138B (2025)',
    growthRate: '+5.8% CAGR',
    keyMetric: '10,200+ active satellites in orbit',
    icon: '📡',
    tier: 1,
    keywords: ['satellite communications companies', 'satellite internet providers', 'LEO broadband', 'satellite IoT', 'SATCOM market'],
    companies: [
      { name: 'SpaceX (Starlink)', slug: 'spacex', description: 'Dominant LEO broadband with 6,000+ satellites, 4M+ subscribers', tier: 'leader' },
      { name: 'SES', description: 'Multi-orbit operator (GEO + MEO O3b mPOWER)', tier: 'leader' },
      { name: 'Eutelsat OneWeb', description: 'Combined GEO + LEO operator, 648 LEO satellites', tier: 'leader' },
      { name: 'Viasat', description: 'GEO high-capacity broadband and government SATCOM', tier: 'leader' },
      { name: 'Amazon (Project Kuiper)', description: 'LEO broadband constellation, 3,236 planned satellites', tier: 'challenger' },
      { name: 'Telesat (Lightspeed)', description: 'Enterprise-focused LEO constellation', tier: 'challenger' },
      { name: 'AST SpaceMobile', slug: 'ast-spacemobile', description: 'Direct-to-device broadband via large satellite arrays', tier: 'emerging' },
      { name: 'Lynk Global', description: 'Satellite-to-phone connectivity', tier: 'emerging' },
    ],
    relatedSectors: ['ground-segment', 'satellite-manufacturing', 'earth-observation'],
    trends: [
      'LEO broadband constellations capturing market share from GEO',
      'Direct-to-device (D2D) service emerging via 3GPP NTN standards',
      'Optical inter-satellite links replacing RF for backbone connectivity',
      'Aviation and maritime becoming fastest-growing vertical markets',
    ],
  },
  {
    slug: 'earth-observation',
    name: 'Earth Observation & Remote Sensing',
    description: 'Satellite imagery, radar, and analytics companies providing geospatial intelligence.',
    longDescription: 'Earth observation encompasses companies that collect, process, and distribute satellite imagery and geospatial data. The sector spans optical, SAR (synthetic aperture radar), hyperspectral, and RF sensing, serving markets from agriculture and insurance to defense and climate monitoring. AI-driven analytics are increasingly the value differentiator.',
    marketSize: '$7.8B (2025)',
    growthRate: '+9.5% CAGR',
    keyMetric: '1,000+ EO satellites in orbit',
    icon: '🛰️',
    tier: 1,
    keywords: ['earth observation companies', 'satellite imagery providers', 'remote sensing companies', 'geospatial analytics', 'SAR satellite companies'],
    companies: [
      { name: 'Maxar Technologies', slug: 'maxar', description: 'Sub-30cm optical imagery, WorldView constellation', tier: 'leader' },
      { name: 'Planet Labs', slug: 'planet-labs', description: 'Daily global coverage, 200+ Dove/SuperDove satellites', tier: 'leader' },
      { name: 'Airbus Defence & Space', description: 'Pléiades Neo and SPOT constellation, SAR and optical', tier: 'leader' },
      { name: 'BlackSky', slug: 'blacksky', description: 'Real-time intelligence and analytics platform', tier: 'challenger' },
      { name: 'Capella Space', description: 'Commercial SAR constellation, all-weather imaging', tier: 'challenger' },
      { name: 'Umbra', description: 'High-resolution SAR with on-demand tasking', tier: 'emerging' },
      { name: 'Satellogic', slug: 'satellogic', description: 'Sub-meter multispectral and hyperspectral constellation', tier: 'emerging' },
    ],
    relatedSectors: ['satellite-communications', 'defense-intelligence', 'climate-tech'],
    trends: [
      'AI and ML analytics becoming the primary value proposition',
      'SAR demand growing for all-weather, day-night capability',
      'Hyperspectral imaging enabling precision agriculture at scale',
      'Government demand for commercial imagery as a service',
    ],
  },
  {
    slug: 'defense-intelligence',
    name: 'Defense & National Security Space',
    description: 'Space systems for military communications, surveillance, missile warning, and space domain awareness.',
    longDescription: 'Defense space encompasses companies providing military-grade satellite communications, persistent surveillance, missile warning, navigation warfare, and space domain awareness. Government spending on space defense is accelerating globally, driven by great-power competition and the recognition of space as a warfighting domain.',
    marketSize: '$52B (2025)',
    growthRate: '+7.5% CAGR',
    keyMetric: '$52B in government space budgets',
    icon: '🛡️',
    tier: 1,
    keywords: ['defense space companies', 'military satellite companies', 'space domain awareness', 'national security space', 'space defense market'],
    companies: [
      { name: 'Northrop Grumman', description: 'Satellites, launch vehicles (OmegA), missile warning', tier: 'leader' },
      { name: 'Lockheed Martin Space', description: 'GPS III, SBIRS, Orion spacecraft, military SATCOM', tier: 'leader' },
      { name: 'L3Harris Technologies', description: 'Missile warning sensors, ground systems, small sats', tier: 'leader' },
      { name: 'Boeing Space', description: 'WGS, SDA satellites, ISS, Starliner', tier: 'leader' },
      { name: 'Raytheon (RTX)', description: 'Space sensors, ground terminals, missile defense', tier: 'leader' },
      { name: 'York Space Systems', description: 'Proliferated LEO defense satellites (SDA Tranche)', tier: 'challenger' },
      { name: 'True Anomaly', description: 'Space domain awareness and proximity operations', tier: 'emerging' },
    ],
    relatedSectors: ['launch-services', 'satellite-communications', 'space-situational-awareness'],
    trends: [
      'Proliferated LEO architectures replacing exquisite GEO satellites',
      'Commercial SATCOM augmenting military communications',
      'Space domain awareness becoming a priority investment area',
      'Hypersonic missile tracking from space driving sensor development',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Growing segments ($1-10B)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'satellite-manufacturing',
    name: 'Satellite Manufacturing',
    description: 'Design and production of spacecraft buses, payloads, and satellite subsystems.',
    longDescription: 'Satellite manufacturing encompasses the design, integration, and testing of complete spacecraft as well as the subsystem suppliers that provide solar arrays, antennas, propulsion, avionics, and other components. The sector is shifting from bespoke GEO platforms to high-volume production lines for LEO constellations.',
    marketSize: '$8.4B (2025)',
    growthRate: '+6.2% CAGR',
    keyMetric: '2,800+ satellites manufactured in 2025',
    icon: '🏭',
    tier: 2,
    keywords: ['satellite manufacturing companies', 'spacecraft manufacturers', 'satellite bus providers', 'space hardware companies'],
    companies: [
      { name: 'Airbus Defence & Space', description: 'OneSat, Eurostar, OneWeb satellites', tier: 'leader' },
      { name: 'Thales Alenia Space', description: 'Spacebus, Iridium NEXT, space station modules', tier: 'leader' },
      { name: 'Maxar Technologies', slug: 'maxar', description: 'SSL/MDA 1300 bus, robotic arms', tier: 'leader' },
      { name: 'Ball Aerospace', description: 'Science missions, JWST mirrors, defense payloads', tier: 'leader' },
      { name: 'York Space Systems', description: 'S-CLASS standard bus for SDA proliferated LEO', tier: 'challenger' },
      { name: 'Terran Orbital', slug: 'terran-orbital', description: 'Small satellite manufacturing at scale', tier: 'challenger' },
    ],
    relatedSectors: ['launch-services', 'satellite-communications', 'propulsion-systems'],
    trends: [
      'Mass production replacing bespoke manufacturing for LEO constellations',
      'Software-defined satellites enabling flexible mission reconfiguration',
      'Electric propulsion becoming standard for orbit raising and station-keeping',
      'Modular bus architectures reducing development time and cost',
    ],
  },
  {
    slug: 'ground-segment',
    name: 'Ground Segment & Infrastructure',
    description: 'Ground stations, antenna networks, and cloud-based ground station services.',
    longDescription: 'The ground segment connects satellites to terrestrial networks, encompassing ground station antennas, network operations centers, and the increasingly important ground-station-as-a-service (GSaaS) cloud platforms. The sector is being disrupted by virtualized, cloud-native ground infrastructure.',
    marketSize: '$5.2B (2025)',
    growthRate: '+8.1% CAGR',
    keyMetric: '3,000+ ground stations worldwide',
    icon: '📶',
    tier: 2,
    keywords: ['ground segment companies', 'ground station providers', 'satellite ground infrastructure', 'GSaaS companies'],
    companies: [
      { name: 'AWS Ground Station', description: 'Cloud-based ground station as a service', tier: 'leader' },
      { name: 'Microsoft Azure Orbital', description: 'Cloud ground station and satellite data processing', tier: 'leader' },
      { name: 'KSAT', description: 'Largest commercial ground station network, 25+ sites globally', tier: 'leader' },
      { name: 'Viasat (RTE)', description: 'Real-time Earth ground network', tier: 'leader' },
      { name: 'Leaf Space', description: 'Ground segment as a service for LEO operators', tier: 'challenger' },
      { name: 'Atlas Space Operations', description: 'Cloud-native ground station automation', tier: 'emerging' },
    ],
    relatedSectors: ['satellite-communications', 'earth-observation', 'satellite-manufacturing'],
    trends: [
      'Ground-station-as-a-service replacing owned infrastructure',
      'Cloud-native architectures reducing cost per contact',
      'Optical ground stations for high-bandwidth satellite links',
      'Edge computing at ground stations for real-time data processing',
    ],
  },
  {
    slug: 'space-tourism',
    name: 'Space Tourism & Human Spaceflight',
    description: 'Companies offering suborbital flights, orbital experiences, and commercial space stations.',
    longDescription: 'Space tourism encompasses suborbital joy rides, orbital experiences, and the emerging commercial space station market. While still nascent in revenue terms, the sector represents the most visible consumer-facing space market and is attracting significant investment in commercial LEO destinations.',
    marketSize: '$1.2B (2025)',
    growthRate: '+18% CAGR',
    keyMetric: '40+ private citizens flown to space',
    icon: '🧑‍🚀',
    tier: 2,
    keywords: ['space tourism companies', 'commercial spaceflight', 'space travel companies', 'orbital tourism', 'commercial space stations'],
    companies: [
      { name: 'SpaceX', slug: 'spacex', description: 'Crew Dragon orbital tourism, Polaris program, Dear Moon', tier: 'leader' },
      { name: 'Blue Origin', description: 'New Shepard suborbital tourism, Orbital Reef station', tier: 'leader' },
      { name: 'Axiom Space', description: 'ISS modules, private astronaut missions (Ax-1 through Ax-4)', tier: 'leader' },
      { name: 'Virgin Galactic', slug: 'virgin-galactic', description: 'SpaceShipTwo suborbital experience', tier: 'challenger' },
      { name: 'Voyager Space (Starlab)', description: 'Commercial space station with Airbus partnership', tier: 'challenger' },
      { name: 'Space Perspective', description: 'Stratospheric balloon tourism', tier: 'emerging' },
    ],
    relatedSectors: ['launch-services', 'life-support-systems', 'space-habitats'],
    trends: [
      'Commercial space stations replacing ISS by 2030',
      'Cost per seat declining as vehicle reusability improves',
      'Point-to-point suborbital transport emerging as a use case',
      'Space tourism becoming a marketing/media platform for brands',
    ],
  },
  {
    slug: 'space-situational-awareness',
    name: 'Space Situational Awareness & Traffic Management',
    description: 'Tracking orbital objects, predicting conjunctions, and managing space traffic.',
    longDescription: 'Space situational awareness (SSA) and space traffic management (STM) encompass tracking the 44,000+ cataloged objects in orbit, predicting close approaches, and coordinating maneuvers to avoid collisions. The sector is critical for the long-term sustainability of the orbital environment.',
    marketSize: '$1.8B (2025)',
    growthRate: '+11% CAGR',
    keyMetric: '44,500+ tracked orbital objects',
    icon: '🔭',
    tier: 2,
    keywords: ['space situational awareness companies', 'space tracking', 'orbital debris tracking', 'space traffic management', 'SSA market'],
    companies: [
      { name: 'LeoLabs', description: 'LEO mapping radar network, conjunction assessment', tier: 'leader' },
      { name: 'ExoAnalytic Solutions', description: 'Optical telescope network for GEO tracking', tier: 'leader' },
      { name: 'Slingshot Aerospace', description: 'AI-powered SSA analytics and visualization', tier: 'challenger' },
      { name: 'Kayhan Space', description: 'Autonomous collision avoidance and STM', tier: 'emerging' },
      { name: 'Privateer Space', description: 'Open-source space mapping (founded by Steve Wozniak)', tier: 'emerging' },
    ],
    relatedSectors: ['space-debris-removal', 'defense-intelligence', 'satellite-communications'],
    trends: [
      'Mega-constellations dramatically increasing conjunction event rates',
      'AI/ML-powered conjunction screening replacing manual analysis',
      'Commercial SSA supplementing government catalogues (18th SDS)',
      'Space sustainability regulations creating compliance demand',
    ],
  },
  {
    slug: 'on-orbit-servicing',
    name: 'On-Orbit Servicing & Life Extension',
    description: 'Satellite refueling, repair, inspection, and life extension services in space.',
    longDescription: 'On-orbit servicing encompasses technologies that extend satellite life, repair failures, refuel propellant, and perform inspection in space. The sector is transitioning from technology demonstrations to commercial operations, with the GEO life extension market proving the business case.',
    marketSize: '$1.5B (2025)',
    growthRate: '+22% CAGR',
    keyMetric: '5+ commercial servicing missions completed',
    icon: '🔧',
    tier: 2,
    keywords: ['satellite servicing companies', 'on-orbit servicing', 'satellite life extension', 'in-space servicing', 'satellite refueling'],
    companies: [
      { name: 'Northrop Grumman (SpaceLogistics)', description: 'MEV-1/2 life extension, Mission Robotic Vehicle', tier: 'leader' },
      { name: 'Astroscale', description: 'ELSA-d debris removal demo, ELSA-M commercial service', tier: 'leader' },
      { name: 'Orbit Fab', description: 'In-space fuel depots and refueling interfaces', tier: 'challenger' },
      { name: 'ClearSpace (Astroscale)', description: 'ESA-contracted debris removal mission', tier: 'challenger' },
      { name: 'Starfish Space', description: 'Otter satellite servicing vehicle', tier: 'emerging' },
    ],
    relatedSectors: ['space-debris-removal', 'space-situational-awareness', 'satellite-manufacturing'],
    trends: [
      'GEO life extension proven commercially (MEV-1/2)',
      'Standard docking interfaces being adopted by new satellite designs',
      'Government procurement programs funding ADR demonstrations',
      'In-space assembly emerging for large structures',
    ],
  },
  {
    slug: 'propulsion-systems',
    name: 'Space Propulsion',
    description: 'Rocket engines, electric propulsion, and advanced propulsion technologies.',
    longDescription: 'Space propulsion encompasses the engines and thrusters that power launch vehicles and spacecraft. The sector spans chemical rockets, electric propulsion (Hall thrusters, ion engines, electrospray), and emerging technologies like nuclear thermal propulsion. Propulsion is often the most technically challenging and highest-value subsystem.',
    marketSize: '$6.8B (2025)',
    growthRate: '+7.8% CAGR',
    keyMetric: '50+ active propulsion companies',
    icon: '🔥',
    tier: 2,
    keywords: ['space propulsion companies', 'rocket engine manufacturers', 'electric propulsion', 'thruster companies', 'spacecraft propulsion'],
    companies: [
      { name: 'Aerojet Rocketdyne (L3Harris)', description: 'RS-25, RL10, AR1 engines for SLS and commercial', tier: 'leader' },
      { name: 'SpaceX', slug: 'spacex', description: 'Merlin, Raptor engines — full-flow staged combustion', tier: 'leader' },
      { name: 'Safran (ArianeGroup)', description: 'Vulcain, Vinci, Prometheus engines for Ariane', tier: 'leader' },
      { name: 'Busek', description: 'Hall thrusters, electrospray, and green propulsion', tier: 'challenger' },
      { name: 'Accion Systems (now Benchmark)', description: 'TILE electrospray thrusters for smallsats', tier: 'challenger' },
      { name: 'Ursa Major', description: 'Hadley and Ripley engines, vertically integrated propulsion', tier: 'emerging' },
    ],
    relatedSectors: ['launch-services', 'satellite-manufacturing', 'in-space-transportation'],
    trends: [
      'Methane-LOX replacing RP-1/LOX as preferred propellant combination',
      'Electric propulsion standard for LEO constellation station-keeping',
      'Green monopropellant replacing hydrazine for small satellites',
      'Nuclear thermal propulsion receiving renewed government investment (DRACO)',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Emerging segments (<$1B but fast-growing)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'space-debris-removal',
    name: 'Space Debris Removal',
    description: 'Active debris removal technologies including nets, harpoons, robotic arms, and ion beam methods.',
    longDescription: 'Active debris removal (ADR) addresses the growing threat of orbital debris by physically deorbiting non-functional satellites and rocket bodies. The sector is transitioning from government-funded demonstrations to commercial services, driven by regulatory pressure and the need to protect LEO mega-constellations.',
    marketSize: '$350M (2025)',
    growthRate: '+35% CAGR',
    keyMetric: '27,000+ tracked debris objects',
    icon: '🗑️',
    tier: 3,
    keywords: ['space debris removal companies', 'active debris removal', 'orbital cleanup', 'ADR companies', 'space sustainability'],
    companies: [
      { name: 'Astroscale', description: 'ELSA-d demo, ELSA-M end-of-life service, ADRAS-J inspection', tier: 'leader' },
      { name: 'ClearSpace', description: 'ESA ClearSpace-1 mission to remove Vega adapter', tier: 'challenger' },
      { name: 'D-Orbit', description: 'Decommissioning and last-mile delivery services', tier: 'challenger' },
      { name: 'Neumann Space', description: 'Solid metal propulsion for debris mitigation', tier: 'emerging' },
    ],
    relatedSectors: ['space-situational-awareness', 'on-orbit-servicing', 'space-sustainability'],
    trends: [
      'FCC 5-year deorbit rule creating compliance market',
      'ESA and JAXA funding first commercial ADR missions',
      'Insurance industry beginning to price orbital debris risk',
      'Just-in-time collision avoidance as an interim service',
    ],
  },
  {
    slug: 'in-space-manufacturing',
    name: 'In-Space Manufacturing',
    description: 'Microgravity manufacturing of fiber optics, semiconductors, bioprinting, and other high-value products.',
    longDescription: 'In-space manufacturing leverages the microgravity environment to produce materials and products impossible or impractical to make on Earth. The sector is in early commercial stages, with ZBLAN optical fiber and protein crystallization as the first commercially viable products.',
    marketSize: '$180M (2025)',
    growthRate: '+45% CAGR',
    keyMetric: 'First commercial products returning from orbit',
    icon: '🏭',
    tier: 3,
    keywords: ['in-space manufacturing companies', 'microgravity manufacturing', 'space factory', 'orbital manufacturing'],
    companies: [
      { name: 'Varda Space Industries', description: 'Orbital pharmacy — drug manufacturing in microgravity', tier: 'leader' },
      { name: 'Space Forge', description: 'Semiconductor manufacturing in microgravity, returnable ForgeStar', tier: 'challenger' },
      { name: 'Redwire', description: 'ISS-based manufacturing, 3D printing, ceramic manufacturing', tier: 'challenger' },
      { name: 'Made In Space (Redwire)', description: 'Archinaut robotic manufacturing, fiber optics', tier: 'challenger' },
    ],
    relatedSectors: ['space-habitats', 'launch-services', 'on-orbit-servicing'],
    trends: [
      'ZBLAN fiber optics as first commercially viable microgravity product',
      'Pharmaceutical manufacturing emerging as highest-value use case',
      'Reentry capsules enabling return of manufactured goods to Earth',
      'Commercial space stations providing manufacturing platforms post-ISS',
    ],
  },
  {
    slug: 'space-mining',
    name: 'Asteroid & Lunar Mining',
    description: 'Resource extraction from asteroids, the Moon, and other celestial bodies.',
    longDescription: 'Space mining encompasses the identification, extraction, and processing of resources from asteroids, the lunar surface, and other bodies. Near-term focus is on lunar water ice (for propellant) and regolith processing, while long-term ambitions target asteroid metals. ISRU (in-situ resource utilization) is critical to sustainable deep-space exploration.',
    marketSize: '$120M (2025)',
    growthRate: '+25% CAGR',
    keyMetric: 'Artemis program driving lunar ISRU investment',
    icon: '⛏️',
    tier: 3,
    keywords: ['asteroid mining companies', 'lunar mining', 'space mining companies', 'ISRU companies', 'space resources'],
    companies: [
      { name: 'ispace', description: 'Lunar landers (HAKUTO-R), lunar resource surveys', tier: 'leader' },
      { name: 'Intuitive Machines', slug: 'intuitive-machines', description: 'CLPS lunar landers, lunar infrastructure', tier: 'leader' },
      { name: 'Astroforge', description: 'Asteroid mining, refining precious metals in space', tier: 'emerging' },
      { name: 'OffWorld', description: 'Robotic mining systems for Moon and Mars', tier: 'emerging' },
    ],
    relatedSectors: ['propulsion-systems', 'space-habitats', 'in-space-manufacturing'],
    trends: [
      'NASA CLPS program funding commercial lunar landers',
      'Artemis Accords (43 signatories) establishing resource rights framework',
      'Water ice at lunar poles as near-term propellant production target',
      'AstroForge attempting first commercial asteroid mining mission',
    ],
  },
  {
    slug: 'climate-tech',
    name: 'Space-Based Climate Technology',
    description: 'Satellites monitoring greenhouse gases, methane emissions, deforestation, and climate change.',
    longDescription: 'Space-based climate technology uses satellites to monitor and measure climate change indicators including greenhouse gas concentrations, methane emissions from oil/gas infrastructure, deforestation rates, sea level rise, and ocean temperature. The sector is growing rapidly as carbon markets and ESG regulations create demand for verifiable emissions data.',
    marketSize: '$800M (2025)',
    growthRate: '+30% CAGR',
    keyMetric: '15+ dedicated GHG monitoring satellites',
    icon: '🌍',
    tier: 3,
    keywords: ['space climate tech companies', 'methane monitoring satellites', 'GHG monitoring from space', 'climate satellite companies'],
    companies: [
      { name: 'GHGSat', description: 'Methane and CO2 monitoring from satellite constellation', tier: 'leader' },
      { name: 'Kayrros', description: 'AI-powered methane detection using satellite data', tier: 'challenger' },
      { name: 'Pixxel', description: 'Hyperspectral Earth observation for environmental monitoring', tier: 'challenger' },
      { name: 'Carbon Mapper', description: 'Methane and CO2 point-source detection satellites', tier: 'emerging' },
      { name: 'Muon Space', description: 'Microwave radiometry for climate data', tier: 'emerging' },
    ],
    relatedSectors: ['earth-observation', 'satellite-manufacturing', 'ground-segment'],
    trends: [
      'Carbon credit verification creating commercial demand for emissions data',
      'Methane detection from space becoming regulatory requirement',
      'ESG reporting standards driving corporate demand for satellite monitoring',
      'Government mandates (EPA methane rule) creating compliance market',
    ],
  },
  {
    slug: 'space-logistics',
    name: 'Space Logistics & Transportation',
    description: 'In-space transportation, orbital transfer vehicles, and last-mile delivery in orbit.',
    longDescription: 'Space logistics encompasses the movement of payloads between orbits, last-mile delivery from rideshare to final orbit, and the emerging in-space transportation network. The sector is enabled by electric propulsion and growing demand from constellation operators who need efficient orbit raising and plane changes.',
    marketSize: '$650M (2025)',
    growthRate: '+20% CAGR',
    keyMetric: '50+ orbital transfer missions per year',
    icon: '🚛',
    tier: 3,
    keywords: ['space logistics companies', 'orbital transfer vehicles', 'space tug companies', 'last mile delivery space'],
    companies: [
      { name: 'Momentus', slug: 'momentus', description: 'Vigoride orbital transfer vehicle, water plasma propulsion', tier: 'challenger' },
      { name: 'D-Orbit', description: 'ION carrier for last-mile orbital delivery', tier: 'leader' },
      { name: 'Exolaunch', description: 'Rideshare deployment and separation systems', tier: 'leader' },
      { name: 'Spaceflight Inc (Firefly)', description: 'Rideshare mission management and brokerage', tier: 'leader' },
      { name: 'Impulse Space', description: 'Orbital transfer and Mars transportation', tier: 'emerging' },
    ],
    relatedSectors: ['launch-services', 'propulsion-systems', 'satellite-manufacturing'],
    trends: [
      'Last-mile delivery becoming standard for rideshare missions',
      'Electric propulsion enabling efficient orbit transfers',
      'LEO-to-GEO transfer as a service replacing dedicated launches',
      'Cislunar logistics emerging for Artemis program support',
    ],
  },
];

export const SECTOR_MAP = new Map(SECTORS.map(s => [s.slug, s]));

/** Get sectors related to a given sector */
export function getRelatedSectors(slug: string): SectorDefinition[] {
  const sector = SECTOR_MAP.get(slug);
  if (!sector) return [];
  return sector.relatedSectors
    .map(s => SECTOR_MAP.get(s))
    .filter(Boolean) as SectorDefinition[];
}
