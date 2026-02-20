/**
 * Customer Discovery Database — taxonomy, segments, and matching logic
 *
 * Cross-references company profiles with procurement data to help
 * entrepreneurs answer "Who would buy my product?"
 */

export interface CustomerSegment {
  id: string;
  name: string;
  type: 'government' | 'prime_contractor' | 'commercial' | 'international' | 'end_user';
  description: string;
  annualBudgetRange?: string;
  procurementCategories: string[];
  techNeeds: string[];
  decisionCycle: string;
  icon: string;
}

export interface ProcurementCategory {
  id: string;
  name: string;
  naicsCodes: string[];
  description: string;
  typicalBudget: string;
  keyBuyers: string[];
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  government: 'Government Agency',
  prime_contractor: 'Prime Contractor',
  commercial: 'Commercial Space',
  international: 'International Agency',
  end_user: 'End-User Industry',
};

export const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  government: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  prime_contractor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  commercial: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  international: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  end_user: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  // ── Government agencies ──
  {
    id: 'nasa',
    name: 'NASA',
    type: 'government',
    description: 'Primary US civil space agency. $25B annual budget. Buys launch services, spacecraft, instruments, ground systems, and research services.',
    annualBudgetRange: '$25B-$28B',
    procurementCategories: ['launch_services', 'spacecraft', 'instruments', 'ground_systems', 'research', 'it_services'],
    techNeeds: ['Lunar surface systems', 'Mars technologies', 'Earth science instruments', 'Advanced propulsion', 'Life support', 'Habitation systems'],
    decisionCycle: '12-36 months',
    icon: '\u{1F680}',
  },
  {
    id: 'space-force',
    name: 'US Space Force / Space Systems Command',
    type: 'government',
    description: 'DoD space operations. ~$30B annual budget across classified and unclassified programs. Buys satellites, launch, ground control, SSA, and space defense systems.',
    annualBudgetRange: '$28B-$33B',
    procurementCategories: ['launch_services', 'satellites', 'ground_systems', 'ssa', 'communications', 'defense_systems'],
    techNeeds: ['Resilient space architecture', 'Responsive launch', 'On-orbit servicing', 'Space domain awareness', 'Cyber-hardened ground systems'],
    decisionCycle: '18-36 months',
    icon: '\u{1F6E1}\uFE0F',
  },
  {
    id: 'nro',
    name: 'National Reconnaissance Office (NRO)',
    type: 'government',
    description: 'Designs, builds, launches, and maintains US intelligence satellites. Significant commercial imagery purchasing program.',
    annualBudgetRange: '$17B-$20B',
    procurementCategories: ['satellites', 'launch_services', 'imagery_services', 'ground_systems'],
    techNeeds: ['Advanced imaging', 'Signal intelligence', 'Small satellite constellations', 'Rapid revisit'],
    decisionCycle: '12-24 months',
    icon: '\u{1F50D}',
  },
  {
    id: 'darpa',
    name: 'DARPA',
    type: 'government',
    description: 'Advanced research projects for DoD. Funds high-risk, high-reward space technologies. Programs typically 3-5 years.',
    annualBudgetRange: '$4B-$5B total ($500M+ space)',
    procurementCategories: ['research', 'prototyping', 'defense_systems'],
    techNeeds: ['Revolutionary propulsion', 'Autonomous spacecraft', 'Large space structures', 'Novel sensors'],
    decisionCycle: '6-18 months',
    icon: '\u{1F9EA}',
  },
  {
    id: 'noaa',
    name: 'NOAA',
    type: 'government',
    description: 'Operates environmental satellite systems (GOES, JPSS). Increasing commercial data buys for weather and ocean monitoring.',
    annualBudgetRange: '$2B-$3B (satellite programs)',
    procurementCategories: ['satellites', 'instruments', 'data_services', 'ground_systems'],
    techNeeds: ['Next-gen weather sensors', 'Commercial weather data', 'Ocean monitoring', 'Space weather instruments'],
    decisionCycle: '12-24 months',
    icon: '\u{1F30A}',
  },
  {
    id: 'faa',
    name: 'FAA Office of Commercial Space Transportation',
    type: 'government',
    description: 'Regulates and licenses commercial launch and reentry. Growing need for space traffic management technology.',
    annualBudgetRange: '$30M-$50M',
    procurementCategories: ['it_services', 'research', 'ssa'],
    techNeeds: ['Space traffic management', 'Launch safety analysis', 'Reentry tracking', 'Regulatory compliance tools'],
    decisionCycle: '6-12 months',
    icon: '\u2708\uFE0F',
  },
  {
    id: 'sda',
    name: 'Space Development Agency (SDA)',
    type: 'government',
    description: 'Acquiring and deploying proliferated LEO constellations for missile warning, tracking, and data transport. Rapid acquisition model.',
    annualBudgetRange: '$4B-$6B',
    procurementCategories: ['satellites', 'communications', 'ground_systems', 'sensors'],
    techNeeds: ['Mesh networking', 'Optical inter-satellite links', 'Missile tracking sensors', 'Rapid satellite manufacturing'],
    decisionCycle: '6-12 months',
    icon: '\u{1F4E1}',
  },

  // ── Prime contractors ──
  {
    id: 'lockheed-martin',
    name: 'Lockheed Martin Space',
    type: 'prime_contractor',
    description: 'Largest space prime contractor. $12B+ space revenue. Builds satellites, launch vehicles (through ULA), and deep space systems. Active subcontracting program.',
    annualBudgetRange: '$12B-$14B space revenue',
    procurementCategories: ['components', 'subsystems', 'software', 'testing', 'materials'],
    techNeeds: ['Advanced materials', 'Radiation-hard electronics', 'AI/ML for autonomy', 'Additive manufacturing', 'Digital engineering'],
    decisionCycle: '6-18 months',
    icon: '\u{1F3ED}',
  },
  {
    id: 'northrop-grumman',
    name: 'Northrop Grumman Space',
    type: 'prime_contractor',
    description: '$12B+ space revenue. Builds satellites, solid rocket motors (SRBs), Cygnus spacecraft, and in-space servicing vehicles (MEV).',
    annualBudgetRange: '$11B-$13B space revenue',
    procurementCategories: ['components', 'subsystems', 'propulsion', 'software', 'materials'],
    techNeeds: ['Composite structures', 'Electric propulsion', 'Autonomous operations', 'Small satellite buses'],
    decisionCycle: '6-18 months',
    icon: '\u{1F3ED}',
  },
  {
    id: 'boeing-space',
    name: 'Boeing Space & Launch',
    type: 'prime_contractor',
    description: 'ISS prime contractor, SLS core stage, Starliner crew vehicle, WGS/GPS satellites. Significant subcontracting.',
    annualBudgetRange: '$4B-$6B space revenue',
    procurementCategories: ['components', 'subsystems', 'avionics', 'software', 'life_support'],
    techNeeds: ['Space station systems', 'Crew vehicle components', 'GNC systems', 'Environmental control'],
    decisionCycle: '6-18 months',
    icon: '\u{1F3ED}',
  },
  {
    id: 'l3harris',
    name: 'L3Harris Technologies',
    type: 'prime_contractor',
    description: '$6B+ space revenue. Leading provider of space-based sensors, payloads, antennas, and ground systems.',
    annualBudgetRange: '$6B-$7B space revenue',
    procurementCategories: ['sensors', 'antennas', 'ground_systems', 'communications', 'components'],
    techNeeds: ['Advanced RF systems', 'Optical communications', 'Hyperspectral sensors', 'Resilient ground networks'],
    decisionCycle: '6-12 months',
    icon: '\u{1F4E1}',
  },
  {
    id: 'rtx-raytheon',
    name: 'RTX / Raytheon',
    type: 'prime_contractor',
    description: 'Major defense prime with growing space portfolio. Missile warning sensors, space-based radar, and advanced communications.',
    annualBudgetRange: '$3B-$5B space revenue',
    procurementCategories: ['sensors', 'communications', 'defense_systems', 'components', 'software'],
    techNeeds: ['Infrared sensors', 'Space-based radar', 'Anti-jam communications', 'Cyber defense'],
    decisionCycle: '6-18 months',
    icon: '\u{1F3ED}',
  },

  // ── Commercial space companies ──
  {
    id: 'spacex',
    name: 'SpaceX',
    type: 'commercial',
    description: 'World\'s leading launch provider and Starlink operator. Buys components, materials, and services for Falcon, Dragon, Starship, and Starlink.',
    annualBudgetRange: '$8B-$12B estimated procurement',
    procurementCategories: ['components', 'materials', 'avionics', 'testing', 'ground_infrastructure'],
    techNeeds: ['Heat shield materials', 'Avionics components', 'Solar cells', 'User terminals', 'Ground station equipment'],
    decisionCycle: '1-6 months',
    icon: '\u{1F985}',
  },
  {
    id: 'blue-origin',
    name: 'Blue Origin',
    type: 'commercial',
    description: 'Developing New Glenn launch vehicle, Blue Moon lander, and Orbital Reef station. Significant component procurement.',
    annualBudgetRange: '$3B-$5B estimated',
    procurementCategories: ['components', 'materials', 'propulsion', 'avionics', 'life_support'],
    techNeeds: ['Cryogenic components', 'Composite structures', 'Crew systems', 'Habitation modules'],
    decisionCycle: '3-12 months',
    icon: '\u{1F535}',
  },
  {
    id: 'amazon-kuiper',
    name: 'Amazon / Project Kuiper',
    type: 'commercial',
    description: 'Building 3,236-satellite broadband constellation. Massive procurement of satellite components, user terminals, and ground infrastructure.',
    annualBudgetRange: '$10B+ total investment',
    procurementCategories: ['components', 'communications', 'ground_infrastructure', 'materials', 'testing'],
    techNeeds: ['Phased array antennas', 'Ka-band transponders', 'User terminal manufacturing', 'Satellite bus mass production'],
    decisionCycle: '3-12 months',
    icon: '\u{1F310}',
  },

  // ── International agencies ──
  {
    id: 'esa',
    name: 'European Space Agency (ESA)',
    type: 'international',
    description: 'EUR 7.8B budget (2025). Procurement through geographic return principle. Open to international partners for technology development.',
    annualBudgetRange: '\u20AC7B-\u20AC8B',
    procurementCategories: ['spacecraft', 'instruments', 'launch_services', 'research', 'ground_systems'],
    techNeeds: ['Climate monitoring instruments', 'Deep space propulsion', 'Rover systems', 'Telecommunications satellites'],
    decisionCycle: '12-36 months',
    icon: '\u{1F1EA}\u{1F1FA}',
  },
  {
    id: 'jaxa',
    name: 'JAXA (Japan)',
    type: 'international',
    description: 'Japanese space agency. Active in lunar exploration (SLIM), ISS operations, and satellite development. Growing international partnerships.',
    annualBudgetRange: '\u00A5400B (~$2.7B)',
    procurementCategories: ['spacecraft', 'instruments', 'launch_services', 'research'],
    techNeeds: ['Lunar surface systems', 'Debris removal', 'Earth observation', 'Communication satellites'],
    decisionCycle: '12-24 months',
    icon: '\u{1F1EF}\u{1F1F5}',
  },
  {
    id: 'isro',
    name: 'ISRO (India)',
    type: 'international',
    description: 'Indian Space Research Organisation. Rapidly growing commercial launch services (PSLV/GSLV). Active lunar and Mars programs.',
    annualBudgetRange: '~$1.5B',
    procurementCategories: ['spacecraft', 'instruments', 'launch_services', 'research', 'ground_systems'],
    techNeeds: ['Reusable launch vehicles', 'Human spaceflight systems', 'Navigation satellites', 'Remote sensing'],
    decisionCycle: '12-24 months',
    icon: '\u{1F1EE}\u{1F1F3}',
  },

  // ── End-user industries ──
  {
    id: 'agriculture',
    name: 'Agriculture / Precision Farming',
    type: 'end_user',
    description: 'Uses satellite imagery for crop monitoring, yield prediction, and precision agriculture. $3B+ market for space-derived ag data.',
    procurementCategories: ['data_services', 'analytics', 'imagery_services'],
    techNeeds: ['Multispectral imagery', 'SAR for all-weather monitoring', 'AI-powered crop analytics', 'IoT connectivity'],
    decisionCycle: '3-6 months',
    icon: '\u{1F33E}',
  },
  {
    id: 'energy',
    name: 'Energy & Utilities',
    type: 'end_user',
    description: 'Uses satellite monitoring for pipeline integrity, offshore platform monitoring, methane detection, and grid management.',
    procurementCategories: ['data_services', 'imagery_services', 'iot_connectivity', 'analytics'],
    techNeeds: ['Methane detection', 'Pipeline monitoring', 'Offshore monitoring', 'Grid resilience analytics'],
    decisionCycle: '6-12 months',
    icon: '\u26A1',
  },
  {
    id: 'finance-insurance',
    name: 'Finance & Insurance',
    type: 'end_user',
    description: 'Uses satellite data for alternative data analytics, crop insurance validation, infrastructure risk assessment, and supply chain monitoring.',
    procurementCategories: ['data_services', 'analytics'],
    techNeeds: ['Alt data feeds', 'Automated damage assessment', 'Supply chain visibility', 'Economic activity indicators'],
    decisionCycle: '1-6 months',
    icon: '\u{1F4B0}',
  },
  {
    id: 'maritime',
    name: 'Maritime / Shipping',
    type: 'end_user',
    description: 'Uses satellite communications and tracking for vessel monitoring, route optimization, and regulatory compliance (AIS).',
    procurementCategories: ['communications', 'data_services', 'iot_connectivity'],
    techNeeds: ['VSAT broadband', 'IoT fleet tracking', 'Ice monitoring', 'Piracy detection'],
    decisionCycle: '3-12 months',
    icon: '\u{1F6A2}',
  },
  {
    id: 'telecom',
    name: 'Telecommunications',
    type: 'end_user',
    description: 'Mobile network operators and ISPs using satellite for backhaul, direct-to-device, and rural broadband expansion.',
    procurementCategories: ['communications', 'ground_infrastructure', 'data_services'],
    techNeeds: ['Direct-to-device satellite', 'LEO broadband backhaul', 'Spectrum sharing', 'Edge computing'],
    decisionCycle: '6-18 months',
    icon: '\u{1F4F6}',
  },
  {
    id: 'mining-resources',
    name: 'Mining & Natural Resources',
    type: 'end_user',
    description: 'Uses satellite imagery and IoT for mine site monitoring, resource exploration, environmental compliance, and fleet tracking.',
    procurementCategories: ['data_services', 'imagery_services', 'iot_connectivity', 'analytics'],
    techNeeds: ['Change detection', 'Geological mapping', 'Tailings dam monitoring', 'Remote site connectivity'],
    decisionCycle: '3-12 months',
    icon: '\u26CF\uFE0F',
  },
];

export const PROCUREMENT_CATEGORIES: ProcurementCategory[] = [
  {
    id: 'launch_services',
    name: 'Launch Services',
    naicsCodes: ['336414', '336415'],
    description: 'Orbital and suborbital launch, rideshare, deployment services',
    typicalBudget: '$50M-$500M per contract',
    keyBuyers: ['NASA', 'Space Force', 'NRO', 'Commercial operators'],
  },
  {
    id: 'satellites',
    name: 'Satellite Systems',
    naicsCodes: ['336414'],
    description: 'Complete satellite buses, payloads, and integrated spacecraft',
    typicalBudget: '$10M-$2B per satellite program',
    keyBuyers: ['NASA', 'Space Force', 'NRO', 'NOAA', 'Commercial operators'],
  },
  {
    id: 'components',
    name: 'Components & Subsystems',
    naicsCodes: ['334511', '334220', '335999'],
    description: 'Avionics, sensors, reaction wheels, solar panels, batteries, structures',
    typicalBudget: '$100K-$50M per order',
    keyBuyers: ['All primes', 'SpaceX', 'Blue Origin', 'Satellite manufacturers'],
  },
  {
    id: 'ground_systems',
    name: 'Ground Systems & Infrastructure',
    naicsCodes: ['334220', '541330'],
    description: 'Antenna networks, ground stations, mission control software, telemetry',
    typicalBudget: '$5M-$500M',
    keyBuyers: ['NASA', 'Space Force', 'Commercial operators', 'Ground station networks'],
  },
  {
    id: 'data_services',
    name: 'Data & Analytics Services',
    naicsCodes: ['518210', '541512'],
    description: 'Satellite imagery, geospatial analytics, space weather data, RF monitoring',
    typicalBudget: '$500K-$50M per year',
    keyBuyers: ['NRO', 'NGA', 'NOAA', 'Agriculture', 'Energy', 'Finance'],
  },
  {
    id: 'software',
    name: 'Space Software & IT',
    naicsCodes: ['541511', '541512', '541519'],
    description: 'Mission planning, flight software, simulation, digital twin, C2 systems',
    typicalBudget: '$1M-$100M',
    keyBuyers: ['All primes', 'NASA', 'Space Force', 'Commercial operators'],
  },
  {
    id: 'communications',
    name: 'Communications Equipment',
    naicsCodes: ['334220', '334290'],
    description: 'Transponders, antennas, terminals, optical links, RF systems',
    typicalBudget: '$1M-$200M',
    keyBuyers: ['All primes', 'Constellation operators', 'Ground networks', 'Maritime'],
  },
  {
    id: 'research',
    name: 'Research & Development',
    naicsCodes: ['541715', '541712'],
    description: 'Technology R&D, materials science, propulsion research, testing',
    typicalBudget: '$100K-$25M',
    keyBuyers: ['NASA', 'DARPA', 'Space Force', 'NSF', 'Universities'],
  },
  {
    id: 'materials',
    name: 'Advanced Materials',
    naicsCodes: ['331313', '335991'],
    description: 'Composites, alloys, thermal protection, radiation shielding, ceramics',
    typicalBudget: '$500K-$10M',
    keyBuyers: ['All primes', 'SpaceX', 'Launch providers', 'Satellite manufacturers'],
  },
  {
    id: 'propulsion',
    name: 'Propulsion Systems',
    naicsCodes: ['336415'],
    description: 'Engines, thrusters, propellant tanks, electric propulsion, solid motors',
    typicalBudget: '$5M-$200M',
    keyBuyers: ['Launch providers', 'Satellite manufacturers', 'NASA', 'DARPA'],
  },
  {
    id: 'testing',
    name: 'Testing & Qualification',
    naicsCodes: ['541380'],
    description: 'Vibration testing, thermal vacuum, EMI/EMC, radiation testing, environmental testing',
    typicalBudget: '$100K-$10M',
    keyBuyers: ['All satellite manufacturers', 'Component vendors', 'NASA', 'DoD'],
  },
  {
    id: 'sensors',
    name: 'Sensors & Instruments',
    naicsCodes: ['334511', '334519'],
    description: 'Optical, infrared, hyperspectral, radar, and lidar instruments for space missions',
    typicalBudget: '$5M-$500M',
    keyBuyers: ['NASA', 'NRO', 'NOAA', 'ESA', 'L3Harris'],
  },
  {
    id: 'imagery_services',
    name: 'Imagery & Geospatial Services',
    naicsCodes: ['518210', '541370'],
    description: 'Satellite imagery acquisition, processing, and analytics services',
    typicalBudget: '$1M-$100M per year',
    keyBuyers: ['NRO', 'NGA', 'Agriculture', 'Insurance', 'Energy'],
  },
  {
    id: 'ssa',
    name: 'Space Situational Awareness',
    naicsCodes: ['541715', '334511'],
    description: 'Space tracking, debris monitoring, conjunction assessment, space traffic management',
    typicalBudget: '$5M-$200M',
    keyBuyers: ['Space Force', 'FAA', 'Commercial operators', 'ESA'],
  },
  {
    id: 'analytics',
    name: 'Analytics & AI/ML',
    naicsCodes: ['541512', '541519'],
    description: 'Machine learning models, data pipelines, predictive analytics for space data',
    typicalBudget: '$500K-$20M',
    keyBuyers: ['NGA', 'NRO', 'Agriculture', 'Finance', 'Energy'],
  },
];

/**
 * Match potential customers given a set of product categories and tech keywords.
 * Returns segments sorted by relevance (most matching categories first).
 */
export function findPotentialCustomers(
  productCategories: string[],
  companySize: 'startup' | 'small' | 'medium' | 'large',
  techKeywords: string[]
): CustomerSegment[] {
  if (productCategories.length === 0 && techKeywords.length === 0) {
    return [];
  }

  const scored = CUSTOMER_SEGMENTS.map(segment => {
    // Count procurement category matches
    const categoryMatches = productCategories.filter(pc =>
      segment.procurementCategories.includes(pc)
    ).length;

    // Count tech keyword matches (partial, case-insensitive)
    const techMatches = techKeywords.filter(kw =>
      segment.techNeeds.some(need => need.toLowerCase().includes(kw.toLowerCase()))
    ).length;

    // Also check description for keyword matches
    const descriptionMatches = techKeywords.filter(kw =>
      segment.description.toLowerCase().includes(kw.toLowerCase())
    ).length;

    const totalScore = categoryMatches * 3 + techMatches * 2 + descriptionMatches;

    return { segment, categoryMatches, techMatches, descriptionMatches, totalScore };
  });

  return scored
    .filter(s => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(s => s.segment);
}
