// ============================================================
// Supply Chain Relationship Graph — Data Model & Helpers
// ============================================================

export interface GraphNode {
  id: string;
  name: string;
  slug?: string;
  sector: 'launch' | 'satellite' | 'defense' | 'infrastructure' | 'analytics' | 'materials' | 'electronics' | 'propulsion' | 'government' | 'communications' | 'robotics' | 'habitat';
  tier: 'prime' | 'tier1' | 'tier2' | 'startup';
  revenue?: string;
  employees?: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'supplier' | 'customer' | 'partner' | 'investor' | 'competitor' | 'acquirer';
  label?: string;
  strength: number; // 1-10
}

// ============================================================
// Sector colors / display metadata
// ============================================================

export const SECTOR_COLORS: Record<GraphNode['sector'], string> = {
  launch: '#3b82f6',       // blue-500
  satellite: '#22c55e',    // green-500
  defense: '#a855f7',      // purple-500
  infrastructure: '#f97316', // orange-500
  analytics: '#06b6d4',   // cyan-500
  materials: '#eab308',    // yellow-500
  electronics: '#ec4899',  // pink-500
  propulsion: '#ef4444',   // red-500
  government: '#6b7280',   // gray-500
  communications: '#14b8a6', // teal-500
  robotics: '#8b5cf6',    // violet-500
  habitat: '#0ea5e9',     // sky-500
};

export const SECTOR_LABELS: Record<GraphNode['sector'], string> = {
  launch: 'Launch',
  satellite: 'Satellite / EO',
  defense: 'Defense / Intel',
  infrastructure: 'Infrastructure',
  analytics: 'Analytics / Data',
  materials: 'Materials / Mining',
  electronics: 'Electronics / Semis',
  propulsion: 'Propulsion',
  government: 'Government',
  communications: 'Communications',
  robotics: 'Robotics / Mechanisms',
  habitat: 'Habitat / Life Support',
};

export const EDGE_TYPE_COLORS: Record<GraphEdge['type'], string> = {
  supplier: '#60a5fa',    // blue-400
  customer: '#34d399',    // emerald-400
  partner: '#c084fc',     // purple-400
  investor: '#fbbf24',    // amber-400
  competitor: '#f87171',  // red-400
  acquirer: '#fb923c',    // orange-400
};

export const EDGE_TYPE_LABELS: Record<GraphEdge['type'], string> = {
  supplier: 'Supplier',
  customer: 'Customer',
  partner: 'Partner',
  investor: 'Investor',
  competitor: 'Competitor',
  acquirer: 'Acquirer',
};

// ============================================================
// GRAPH NODES (80+)
// ============================================================

export const GRAPH_NODES: GraphNode[] = [
  // ── Primes (Launch) ──────────────────────────────────────
  { id: 'spacex', name: 'SpaceX', slug: 'spacex', sector: 'launch', tier: 'prime', revenue: '$5B+', employees: 13000 },
  { id: 'blue-origin', name: 'Blue Origin', slug: 'blue-origin', sector: 'launch', tier: 'prime', revenue: '$1B+', employees: 11000 },
  { id: 'ula', name: 'United Launch Alliance', slug: 'ula', sector: 'launch', tier: 'prime', revenue: '$3B+', employees: 3000 },
  { id: 'rocket-lab', name: 'Rocket Lab', slug: 'rocket-lab', sector: 'launch', tier: 'tier1', revenue: '$245M', employees: 1800 },
  { id: 'firefly', name: 'Firefly Aerospace', slug: 'firefly-aerospace', sector: 'launch', tier: 'startup', revenue: '$50M', employees: 700 },
  { id: 'relativity', name: 'Relativity Space', slug: 'relativity-space', sector: 'launch', tier: 'startup', revenue: '<$50M', employees: 800 },
  { id: 'astra', name: 'Astra', slug: 'astra', sector: 'launch', tier: 'startup', revenue: '<$50M', employees: 300 },
  { id: 'virgin-galactic', name: 'Virgin Galactic', slug: 'virgin-galactic', sector: 'launch', tier: 'tier1', revenue: '$1M', employees: 800 },

  // ── Defense Primes ───────────────────────────────────────
  { id: 'northrop-grumman', name: 'Northrop Grumman', slug: 'northrop-grumman', sector: 'defense', tier: 'prime', revenue: '$37B', employees: 90000 },
  { id: 'lockheed-martin', name: 'Lockheed Martin', slug: 'lockheed-martin', sector: 'defense', tier: 'prime', revenue: '$67B', employees: 116000 },
  { id: 'boeing', name: 'Boeing', slug: 'boeing', sector: 'defense', tier: 'prime', revenue: '$66B', employees: 140000 },
  { id: 'l3harris', name: 'L3Harris Technologies', slug: 'l3harris', sector: 'defense', tier: 'prime', revenue: '$18B', employees: 50000 },
  { id: 'rtx', name: 'RTX / Raytheon', slug: 'rtx', sector: 'defense', tier: 'prime', revenue: '$69B', employees: 180000 },
  { id: 'bae-systems', name: 'BAE Systems', slug: 'bae-systems', sector: 'defense', tier: 'prime', revenue: '$25B', employees: 90000 },
  { id: 'general-dynamics', name: 'General Dynamics', slug: 'general-dynamics', sector: 'defense', tier: 'prime', revenue: '$39B', employees: 100000 },

  // ── Defense / Intel Startups ─────────────────────────────
  { id: 'anduril', name: 'Anduril Industries', slug: 'anduril', sector: 'defense', tier: 'startup', revenue: '$500M+', employees: 2500 },
  { id: 'shield-ai', name: 'Shield AI', slug: 'shield-ai', sector: 'defense', tier: 'startup', revenue: '$200M+', employees: 900 },
  { id: 'spideroak', name: 'SpiderOak', slug: 'spideroak', sector: 'defense', tier: 'startup', revenue: '<$50M', employees: 100 },

  // ── Satellite / EO ───────────────────────────────────────
  { id: 'planet', name: 'Planet Labs', slug: 'planet-labs', sector: 'satellite', tier: 'tier1', revenue: '$191M', employees: 900 },
  { id: 'spire', name: 'Spire Global', slug: 'spire-global', sector: 'satellite', tier: 'tier1', revenue: '$100M', employees: 600 },
  { id: 'blacksky', name: 'BlackSky Technology', slug: 'blacksky', sector: 'satellite', tier: 'tier1', revenue: '$97M', employees: 400 },
  { id: 'hawkeye360', name: 'HawkEye 360', slug: 'hawkeye-360', sector: 'satellite', tier: 'startup', revenue: '$80M', employees: 350 },
  { id: 'capella', name: 'Capella Space', slug: 'capella-space', sector: 'satellite', tier: 'startup', revenue: '$50M+', employees: 300 },
  { id: 'satellogic', name: 'Satellogic', slug: 'satellogic', sector: 'satellite', tier: 'startup', revenue: '$30M', employees: 400 },
  { id: 'maxar', name: 'Maxar Technologies', slug: 'maxar', sector: 'satellite', tier: 'prime', revenue: '$1.8B', employees: 4500 },
  { id: 'airbus-ds', name: 'Airbus Defence & Space', slug: 'airbus-defence-space', sector: 'satellite', tier: 'prime', revenue: '$12B', employees: 35000 },

  // ── Infrastructure / Servicing ───────────────────────────
  { id: 'orbit-fab', name: 'Orbit Fab', slug: 'orbit-fab', sector: 'infrastructure', tier: 'startup', revenue: '<$50M', employees: 50 },
  { id: 'astroscale', name: 'Astroscale', slug: 'astroscale', sector: 'infrastructure', tier: 'startup', revenue: '$30M', employees: 500 },
  { id: 'momentus', name: 'Momentus', slug: 'momentus', sector: 'infrastructure', tier: 'startup', revenue: '$10M', employees: 100 },
  { id: 'd-orbit', name: 'D-Orbit', slug: 'd-orbit', sector: 'infrastructure', tier: 'startup', revenue: '$40M', employees: 200 },
  { id: 'redwire', name: 'Redwire Corporation', slug: 'redwire', sector: 'infrastructure', tier: 'tier1', revenue: '$276M', employees: 700 },
  { id: 'terran-orbital', name: 'Terran Orbital', slug: 'terran-orbital', sector: 'satellite', tier: 'tier1', revenue: '$100M', employees: 500 },

  // ── Habitat / Stations ───────────────────────────────────
  { id: 'axiom', name: 'Axiom Space', slug: 'axiom-space', sector: 'habitat', tier: 'tier1', revenue: '$200M+', employees: 1200 },
  { id: 'sierra-space', name: 'Sierra Space', slug: 'sierra-space', sector: 'habitat', tier: 'tier1', revenue: '$150M+', employees: 1500 },
  { id: 'vast', name: 'Vast', slug: 'vast', sector: 'habitat', tier: 'startup', revenue: '<$50M', employees: 400 },

  // ── Key Suppliers (Propulsion) ───────────────────────────
  { id: 'aerojet-rocketdyne', name: 'Aerojet Rocketdyne (L3H)', slug: 'aerojet-rocketdyne', sector: 'propulsion', tier: 'tier1', revenue: '$2.2B', employees: 5000 },
  { id: 'busek', name: 'Busek Co.', slug: 'busek', sector: 'propulsion', tier: 'startup', revenue: '$20M', employees: 120 },
  { id: 'bradford-space', name: 'Bradford Space', slug: 'bradford-space', sector: 'propulsion', tier: 'startup', revenue: '$15M', employees: 200 },

  // ── Key Suppliers (Electronics / Avionics) ───────────────
  { id: 'collins-aerospace', name: 'Collins Aerospace (RTX)', slug: 'collins-aerospace', sector: 'electronics', tier: 'tier1', revenue: '$13B', employees: 70000 },
  { id: 'honeywell', name: 'Honeywell Aerospace', slug: 'honeywell-aerospace', sector: 'electronics', tier: 'tier1', revenue: '$13.6B', employees: 40000 },
  { id: 'ball-aerospace', name: 'Ball Aerospace', slug: 'ball-aerospace', sector: 'electronics', tier: 'tier1', revenue: '$2B', employees: 5500 },
  { id: 'draper', name: 'Draper Laboratory', slug: 'draper-laboratory', sector: 'electronics', tier: 'tier1', revenue: '$800M', employees: 1700 },
  { id: 'moog', name: 'Moog Inc.', slug: 'moog', sector: 'electronics', tier: 'tier1', revenue: '$3.2B', employees: 13000 },
  { id: 'curtiss-wright', name: 'Curtiss-Wright', slug: 'curtiss-wright', sector: 'electronics', tier: 'tier2', revenue: '$2.6B', employees: 8500 },
  { id: 'cobham', name: 'Cobham Advanced', slug: 'cobham-advanced', sector: 'electronics', tier: 'tier2', revenue: '$1B', employees: 3500 },

  // ── Semiconductors ───────────────────────────────────────
  { id: 'analog-devices', name: 'Analog Devices', slug: 'analog-devices', sector: 'electronics', tier: 'tier2', revenue: '$12B', employees: 24000 },
  { id: 'texas-instruments', name: 'Texas Instruments', slug: 'texas-instruments', sector: 'electronics', tier: 'tier2', revenue: '$17B', employees: 30000 },
  { id: 'tsmc', name: 'TSMC', slug: 'tsmc', sector: 'electronics', tier: 'tier2', revenue: '$70B+', employees: 65000 },
  { id: 'microchip', name: 'Microchip Technology', sector: 'electronics', tier: 'tier2', revenue: '$8B', employees: 22000 },

  // ── Materials / Mining ───────────────────────────────────
  { id: 'mp-materials', name: 'MP Materials', slug: 'mp-materials', sector: 'materials', tier: 'tier2', revenue: '$500M', employees: 500 },
  { id: 'ati-specialty', name: 'ATI Specialty', slug: 'ati-specialty', sector: 'materials', tier: 'tier2', revenue: '$4B', employees: 7000 },
  { id: 'materion', name: 'Materion', slug: 'materion', sector: 'materials', tier: 'tier2', revenue: '$1.7B', employees: 2500 },
  { id: 'hexcel', name: 'Hexcel', sector: 'materials', tier: 'tier2', revenue: '$1.5B', employees: 5000 },
  { id: 'toray', name: 'Toray Industries', sector: 'materials', tier: 'tier2', revenue: '$19B', employees: 49000 },

  // ── Communications ───────────────────────────────────────
  { id: 'mynaric', name: 'Mynaric', slug: 'mynaric', sector: 'communications', tier: 'startup', revenue: '$30M', employees: 500 },
  { id: 'thales-alenia', name: 'Thales Alenia Space', slug: 'thales-alenia', sector: 'communications', tier: 'tier1', revenue: '$2.5B', employees: 8500 },
  { id: 'viasat', name: 'Viasat', slug: 'viasat', sector: 'communications', tier: 'tier1', revenue: '$3.5B', employees: 7000 },
  { id: 'ses', name: 'SES', slug: 'ses', sector: 'communications', tier: 'tier1', revenue: '$2B', employees: 2000 },
  { id: 'telesat', name: 'Telesat', slug: 'telesat', sector: 'communications', tier: 'tier1', revenue: '$700M', employees: 500 },
  { id: 'iridium', name: 'Iridium Communications', slug: 'iridium', sector: 'communications', tier: 'tier1', revenue: '$780M', employees: 600 },

  // ── Robotics ─────────────────────────────────────────────
  { id: 'mda-space', name: 'MDA Space', slug: 'mda-space', sector: 'robotics', tier: 'tier1', revenue: '$500M', employees: 3000 },
  { id: 'gitai', name: 'GITAI', slug: 'gitai', sector: 'robotics', tier: 'startup', revenue: '<$20M', employees: 100 },

  // ── Lunar Landers ────────────────────────────────────────
  { id: 'intuitive-machines', name: 'Intuitive Machines', slug: 'intuitive-machines', sector: 'infrastructure', tier: 'tier1', revenue: '$80M', employees: 600 },
  { id: 'astrobotic', name: 'Astrobotic', slug: 'astrobotic', sector: 'infrastructure', tier: 'startup', revenue: '$30M', employees: 350 },

  // ── European Launch ──────────────────────────────────────
  { id: 'arianegroup', name: 'ArianeGroup', slug: 'arianegroup', sector: 'launch', tier: 'tier1', revenue: '$3.5B', employees: 9000 },
  { id: 'safran', name: 'Safran', slug: 'safran', sector: 'propulsion', tier: 'tier1', revenue: '$20B', employees: 83000 },

  // ── Analytics / Data ─────────────────────────────────────
  { id: 'leoLabs', name: 'LeoLabs', slug: 'leolabs', sector: 'analytics', tier: 'startup', revenue: '$30M', employees: 100 },
  { id: 'slingshot', name: 'Slingshot Aerospace', slug: 'slingshot-aerospace', sector: 'analytics', tier: 'startup', revenue: '$50M', employees: 200 },
  { id: 'kayhan', name: 'Kayhan Space', slug: 'kayhan-space', sector: 'analytics', tier: 'startup', revenue: '<$10M', employees: 40 },

  // ── Government ───────────────────────────────────────────
  { id: 'nasa', name: 'NASA', sector: 'government', tier: 'prime', revenue: '$25.4B budget', employees: 18000 },
  { id: 'dod-sf', name: 'DoD / Space Force', sector: 'government', tier: 'prime', revenue: '$30B+ space budget', employees: 16000 },
  { id: 'nro', name: 'NRO', sector: 'government', tier: 'prime', revenue: 'Classified', employees: 3000 },
  { id: 'noaa', name: 'NOAA', sector: 'government', tier: 'tier1', revenue: '$6.3B budget' },
  { id: 'faa', name: 'FAA / AST', sector: 'government', tier: 'tier1', revenue: '$19B budget' },
  { id: 'darpa', name: 'DARPA', sector: 'government', tier: 'tier1', revenue: '$4B budget', employees: 220 },
  { id: 'sda', name: 'Space Dev Agency', sector: 'government', tier: 'tier1', revenue: '$4.6B budget' },

  // ── Orbit Computing ──────────────────────────────────────
  { id: 'lumen-orbit', name: 'Lumen Orbit', slug: 'lumen-orbit', sector: 'infrastructure', tier: 'startup', revenue: '<$10M', employees: 50 },

  // ── Additional notable companies ─────────────────────────
  { id: 'parker-hannifin', name: 'Parker Hannifin', slug: 'parker-hannifin', sector: 'materials', tier: 'tier2', revenue: '$19B', employees: 58000 },
  { id: 'te-connectivity', name: 'TE Connectivity', slug: 'te-connectivity', sector: 'electronics', tier: 'tier2', revenue: '$16B', employees: 85000 },
  { id: 'stmicro', name: 'STMicroelectronics', slug: 'stmicroelectronics', sector: 'electronics', tier: 'tier2', revenue: '$17B', employees: 50000 },
  { id: 'spectrolab', name: 'Spectrolab (Boeing)', sector: 'electronics', tier: 'tier2', revenue: '$200M', employees: 800 },
  { id: 'solaero', name: 'SolAero (Rocket Lab)', sector: 'electronics', tier: 'tier2', revenue: '$50M', employees: 300 },
];

// ============================================================
// GRAPH EDGES (150+)
// ============================================================

export const GRAPH_EDGES: GraphEdge[] = [
  // ── SpaceX relationships ─────────────────────────────────
  { source: 'spacex', target: 'nasa', type: 'customer', label: 'Crew/Cargo/Artemis HLS', strength: 10 },
  { source: 'spacex', target: 'dod-sf', type: 'customer', label: 'National security launches', strength: 9 },
  { source: 'spacex', target: 'nro', type: 'customer', label: 'Classified launches', strength: 8 },
  { source: 'honeywell', target: 'spacex', type: 'supplier', label: 'Avionics & sensors', strength: 7 },
  { source: 'moog', target: 'spacex', type: 'supplier', label: 'Valves & actuators', strength: 6 },
  { source: 'te-connectivity', target: 'spacex', type: 'supplier', label: 'Connectors & harnesses', strength: 5 },
  { source: 'hexcel', target: 'spacex', type: 'supplier', label: 'Carbon fiber composites', strength: 6 },
  { source: 'spacex', target: 'blue-origin', type: 'competitor', label: 'Launch market', strength: 8 },
  { source: 'spacex', target: 'ula', type: 'competitor', label: 'DoD launch competition', strength: 9 },

  // ── Blue Origin relationships ────────────────────────────
  { source: 'blue-origin', target: 'nasa', type: 'customer', label: 'HLS Option B', strength: 8 },
  { source: 'blue-origin', target: 'ula', type: 'supplier', label: 'BE-4 engines for Vulcan', strength: 10 },
  { source: 'honeywell', target: 'blue-origin', type: 'supplier', label: 'Guidance systems', strength: 6 },
  { source: 'moog', target: 'blue-origin', type: 'supplier', label: 'Propulsion components', strength: 5 },
  { source: 'parker-hannifin', target: 'blue-origin', type: 'supplier', label: 'Seals & fluid systems', strength: 5 },
  { source: 'draper', target: 'blue-origin', type: 'supplier', label: 'GN&C for Blue Moon', strength: 7 },

  // ── ULA relationships ────────────────────────────────────
  { source: 'ula', target: 'nasa', type: 'customer', label: 'Science mission launches', strength: 8 },
  { source: 'ula', target: 'dod-sf', type: 'customer', label: 'NSSL Phase 2 launches', strength: 9 },
  { source: 'aerojet-rocketdyne', target: 'ula', type: 'supplier', label: 'RL10 upper stage engine', strength: 9 },
  { source: 'northrop-grumman', target: 'ula', type: 'supplier', label: 'Solid rocket boosters (GEM-63XL)', strength: 8 },

  // ── Northrop Grumman relationships ───────────────────────
  { source: 'northrop-grumman', target: 'nasa', type: 'customer', label: 'SLS boosters, Cygnus cargo', strength: 9 },
  { source: 'northrop-grumman', target: 'dod-sf', type: 'customer', label: 'Missile defense, satellites', strength: 10 },
  { source: 'northrop-grumman', target: 'nro', type: 'customer', label: 'Classified programs', strength: 9 },
  { source: 'aerojet-rocketdyne', target: 'northrop-grumman', type: 'supplier', label: 'Thrusters & engines', strength: 7 },
  { source: 'moog', target: 'northrop-grumman', type: 'supplier', label: 'Actuators & controls', strength: 6 },
  { source: 'mynaric', target: 'northrop-grumman', type: 'supplier', label: 'CONDOR optical terminals', strength: 7 },
  { source: 'mda-space', target: 'northrop-grumman', type: 'supplier', label: 'MEV servicing robotics', strength: 7 },
  { source: 'cobham', target: 'northrop-grumman', type: 'supplier', label: 'Space electronics', strength: 5 },

  // ── Lockheed Martin relationships ────────────────────────
  { source: 'lockheed-martin', target: 'nasa', type: 'customer', label: 'Orion spacecraft, OSIRIS-REx', strength: 10 },
  { source: 'lockheed-martin', target: 'dod-sf', type: 'customer', label: 'GPS III, SBIRS, missile defense', strength: 10 },
  { source: 'lockheed-martin', target: 'nro', type: 'customer', label: 'Classified reconnaissance', strength: 9 },
  { source: 'aerojet-rocketdyne', target: 'lockheed-martin', type: 'supplier', label: 'Propulsion systems', strength: 8 },
  { source: 'l3harris', target: 'lockheed-martin', type: 'supplier', label: 'Sensors & payloads', strength: 7 },
  { source: 'honeywell', target: 'lockheed-martin', type: 'supplier', label: 'Avionics & GN&C', strength: 7 },
  { source: 'draper', target: 'lockheed-martin', type: 'supplier', label: 'Guidance & navigation', strength: 6 },
  { source: 'materion', target: 'lockheed-martin', type: 'supplier', label: 'Beryllium structures', strength: 6 },
  { source: 'busek', target: 'lockheed-martin', type: 'supplier', label: 'Electric propulsion', strength: 5 },
  { source: 'ball-aerospace', target: 'lockheed-martin', type: 'supplier', label: 'Instruments & sensors', strength: 6 },

  // ── Boeing relationships ─────────────────────────────────
  { source: 'boeing', target: 'nasa', type: 'customer', label: 'SLS core stage, Starliner, ISS', strength: 10 },
  { source: 'boeing', target: 'dod-sf', type: 'customer', label: 'WGS, X-37B', strength: 8 },
  { source: 'aerojet-rocketdyne', target: 'boeing', type: 'supplier', label: 'RS-25 engines for SLS', strength: 10 },
  { source: 'l3harris', target: 'boeing', type: 'supplier', label: 'Comms & sensors', strength: 7 },
  { source: 'honeywell', target: 'boeing', type: 'supplier', label: 'Avionics systems', strength: 7 },
  { source: 'ball-aerospace', target: 'boeing', type: 'supplier', label: 'Instruments', strength: 5 },
  { source: 'ati-specialty', target: 'boeing', type: 'supplier', label: 'Titanium & alloys', strength: 7 },
  { source: 'spectrolab', target: 'boeing', type: 'supplier', label: 'Solar cells (subsidiary)', strength: 8 },
  { source: 'curtiss-wright', target: 'boeing', type: 'supplier', label: 'Electronics & actuation', strength: 5 },

  // ── L3Harris relationships ───────────────────────────────
  { source: 'l3harris', target: 'dod-sf', type: 'customer', label: 'Satellite payloads, ground systems', strength: 9 },
  { source: 'l3harris', target: 'nasa', type: 'customer', label: 'Instruments & comms', strength: 7 },
  { source: 'l3harris', target: 'nro', type: 'customer', label: 'Classified payloads', strength: 8 },
  { source: 'analog-devices', target: 'l3harris', type: 'supplier', label: 'Signal processing ICs', strength: 7 },
  { source: 'texas-instruments', target: 'l3harris', type: 'supplier', label: 'Analog & embedded', strength: 6 },
  { source: 'l3harris', target: 'aerojet-rocketdyne', type: 'acquirer', label: 'Acquired 2023 ($4.7B)', strength: 10 },

  // ── RTX / Raytheon relationships ─────────────────────────
  { source: 'rtx', target: 'dod-sf', type: 'customer', label: 'Missile warning, sensors', strength: 9 },
  { source: 'rtx', target: 'lockheed-martin', type: 'supplier', label: 'Sensors for SBIRS/OPIR', strength: 7 },
  { source: 'rtx', target: 'northrop-grumman', type: 'supplier', label: 'Radar & EW payloads', strength: 6 },
  { source: 'collins-aerospace', target: 'rtx', type: 'supplier', label: 'Subsidiary (ECLSS/EVA)', strength: 10 },

  // ── BAE Systems relationships ────────────────────────────
  { source: 'bae-systems', target: 'dod-sf', type: 'customer', label: 'EW, cyber, space', strength: 8 },
  { source: 'bae-systems', target: 'l3harris', type: 'partner', label: 'EW collaboration', strength: 5 },

  // ── Satellite companies ──────────────────────────────────
  { source: 'planet', target: 'spacex', type: 'customer', label: 'Rideshare launches', strength: 7 },
  { source: 'planet', target: 'rocket-lab', type: 'customer', label: 'Dedicated launches', strength: 6 },
  { source: 'spire', target: 'spacex', type: 'customer', label: 'Rideshare launches', strength: 5 },
  { source: 'blacksky', target: 'rocket-lab', type: 'customer', label: 'Dedicated launches', strength: 7 },
  { source: 'blacksky', target: 'dod-sf', type: 'customer', label: 'ISR imagery', strength: 6 },
  { source: 'hawkeye360', target: 'dod-sf', type: 'customer', label: 'RF geolocation intel', strength: 7 },
  { source: 'hawkeye360', target: 'nro', type: 'customer', label: 'SIGINT analytics', strength: 6 },
  { source: 'capella', target: 'spacex', type: 'customer', label: 'SAR sat launches', strength: 5 },
  { source: 'capella', target: 'dod-sf', type: 'customer', label: 'SAR imagery', strength: 6 },
  { source: 'satellogic', target: 'spacex', type: 'customer', label: 'Constellation launches', strength: 5 },
  { source: 'maxar', target: 'nasa', type: 'customer', label: 'Power & Prop Module (Gateway)', strength: 8 },
  { source: 'maxar', target: 'dod-sf', type: 'customer', label: 'EO imagery & satellites', strength: 8 },
  { source: 'maxar', target: 'nro', type: 'customer', label: 'WorldView imagery', strength: 7 },
  { source: 'honeywell', target: 'maxar', type: 'supplier', label: 'Avionics & actuators', strength: 5 },
  { source: 'cobham', target: 'maxar', type: 'supplier', label: 'RF electronics', strength: 5 },

  // ── Airbus DS ────────────────────────────────────────────
  { source: 'arianegroup', target: 'airbus-ds', type: 'supplier', label: 'Ariane 6 stages & propulsion', strength: 9 },
  { source: 'thales-alenia', target: 'airbus-ds', type: 'supplier', label: 'Satellite platforms', strength: 7 },
  { source: 'safran', target: 'arianegroup', type: 'supplier', label: 'Vulcain engine components', strength: 9 },
  { source: 'stmicro', target: 'airbus-ds', type: 'supplier', label: 'Semiconductors & MEMS', strength: 5 },
  { source: 'stmicro', target: 'thales-alenia', type: 'supplier', label: 'Space electronics', strength: 5 },
  { source: 'stmicro', target: 'safran', type: 'supplier', label: 'Power & sensing ICs', strength: 5 },

  // ── Infrastructure / Servicing ───────────────────────────
  { source: 'orbit-fab', target: 'dod-sf', type: 'customer', label: 'In-space fuel depots', strength: 5 },
  { source: 'orbit-fab', target: 'astroscale', type: 'partner', label: 'Refueling partnership', strength: 6 },
  { source: 'astroscale', target: 'darpa', type: 'customer', label: 'Debris removal demos', strength: 5 },
  { source: 'astroscale', target: 'spacex', type: 'customer', label: 'Launches for ADRAS', strength: 5 },
  { source: 'redwire', target: 'nasa', type: 'customer', label: 'ISS experiments, Roll-Out Solar', strength: 7 },
  { source: 'redwire', target: 'lockheed-martin', type: 'supplier', label: 'Deployable structures', strength: 5 },
  { source: 'd-orbit', target: 'spacex', type: 'customer', label: 'ION satellite carrier launches', strength: 5 },
  { source: 'momentus', target: 'spacex', type: 'customer', label: 'Vigoride transfer vehicle', strength: 4 },
  { source: 'terran-orbital', target: 'sda', type: 'customer', label: 'SDA Tranche satellites', strength: 7 },
  { source: 'terran-orbital', target: 'lockheed-martin', type: 'partner', label: 'Satellite bus partnership', strength: 6 },

  // ── Habitat / Stations ───────────────────────────────────
  { source: 'axiom', target: 'nasa', type: 'customer', label: 'ISS modules, commercial station', strength: 9 },
  { source: 'axiom', target: 'spacex', type: 'customer', label: 'Crew Dragon missions (Ax-1-4)', strength: 8 },
  { source: 'collins-aerospace', target: 'axiom', type: 'supplier', label: 'ECLSS & EVA suits (AxEMU)', strength: 9 },
  { source: 'thales-alenia', target: 'axiom', type: 'supplier', label: 'Pressurized modules', strength: 9 },
  { source: 'sierra-space', target: 'nasa', type: 'customer', label: 'Dream Chaser cargo, Orbital Reef', strength: 8 },
  { source: 'sierra-space', target: 'ula', type: 'customer', label: 'Dream Chaser on Vulcan', strength: 7 },
  { source: 'sierra-space', target: 'blue-origin', type: 'partner', label: 'Orbital Reef partnership', strength: 8 },
  { source: 'collins-aerospace', target: 'sierra-space', type: 'supplier', label: 'Life support systems', strength: 7 },
  { source: 'honeywell', target: 'sierra-space', type: 'supplier', label: 'Avionics & controls', strength: 5 },
  { source: 'vast', target: 'spacex', type: 'customer', label: 'Haven-1 on Falcon 9', strength: 7 },
  { source: 'collins-aerospace', target: 'vast', type: 'supplier', label: 'ECLSS components', strength: 6 },

  // ── Rocket Lab relationships ─────────────────────────────
  { source: 'rocket-lab', target: 'nasa', type: 'customer', label: 'CAPSTONE, ELaNa, Venus probe', strength: 7 },
  { source: 'rocket-lab', target: 'dod-sf', type: 'customer', label: 'Responsive launch', strength: 6 },
  { source: 'rocket-lab', target: 'sda', type: 'customer', label: 'SDA Tranche transport', strength: 6 },
  { source: 'bradford-space', target: 'rocket-lab', type: 'supplier', label: 'Green propulsion (Photon)', strength: 5 },
  { source: 'solaero', target: 'rocket-lab', type: 'supplier', label: 'Solar cells (acquired subsidiary)', strength: 8 },

  // ── Propulsion relationships ─────────────────────────────
  { source: 'aerojet-rocketdyne', target: 'spacex', type: 'supplier', label: 'Thrusters (Dragon)', strength: 6 },
  { source: 'ati-specialty', target: 'aerojet-rocketdyne', type: 'supplier', label: 'Superalloys & titanium', strength: 8 },
  { source: 'mp-materials', target: 'honeywell', type: 'supplier', label: 'Rare earth magnets', strength: 6 },
  { source: 'parker-hannifin', target: 'aerojet-rocketdyne', type: 'supplier', label: 'Seals & fluid systems', strength: 6 },
  { source: 'parker-hannifin', target: 'moog', type: 'supplier', label: 'Hydraulic components', strength: 5 },

  // ── Semiconductor supply chain ───────────────────────────
  { source: 'tsmc', target: 'analog-devices', type: 'supplier', label: 'Advanced node fab', strength: 9 },
  { source: 'tsmc', target: 'microchip', type: 'supplier', label: 'Specialty node fab', strength: 7 },
  { source: 'analog-devices', target: 'honeywell', type: 'supplier', label: 'ADCs & signal chain', strength: 6 },
  { source: 'analog-devices', target: 'ball-aerospace', type: 'supplier', label: 'Precision components', strength: 5 },
  { source: 'texas-instruments', target: 'honeywell', type: 'supplier', label: 'Power management ICs', strength: 5 },

  // ── Lunar lander relationships ───────────────────────────
  { source: 'intuitive-machines', target: 'nasa', type: 'customer', label: 'CLPS lunar delivery', strength: 8 },
  { source: 'intuitive-machines', target: 'spacex', type: 'customer', label: 'Nova-C on Falcon 9', strength: 7 },
  { source: 'honeywell', target: 'intuitive-machines', type: 'supplier', label: 'IMU & nav avionics', strength: 6 },
  { source: 'aerojet-rocketdyne', target: 'intuitive-machines', type: 'supplier', label: 'Propulsion', strength: 5 },
  { source: 'astrobotic', target: 'nasa', type: 'customer', label: 'CLPS & VIPER delivery', strength: 8 },
  { source: 'astrobotic', target: 'ula', type: 'customer', label: 'Griffin on Vulcan', strength: 7 },
  { source: 'honeywell', target: 'astrobotic', type: 'supplier', label: 'Avionics', strength: 5 },

  // ── Defense startups ─────────────────────────────────────
  { source: 'anduril', target: 'dod-sf', type: 'customer', label: 'Counter-UAS, mesh sensors', strength: 7 },
  { source: 'anduril', target: 'darpa', type: 'customer', label: 'Autonomous systems R&D', strength: 6 },
  { source: 'shield-ai', target: 'dod-sf', type: 'customer', label: 'Autonomous aircraft AI', strength: 6 },
  { source: 'spideroak', target: 'dod-sf', type: 'customer', label: 'Zero-trust space cyber', strength: 5 },

  // ── Communications relationships ─────────────────────────
  { source: 'mynaric', target: 'l3harris', type: 'supplier', label: 'Optical terminals', strength: 6 },
  { source: 'mynaric', target: 'sda', type: 'customer', label: 'CONDOR for Tranche programs', strength: 7 },
  { source: 'viasat', target: 'dod-sf', type: 'customer', label: 'SATCOM services', strength: 7 },
  { source: 'ses', target: 'dod-sf', type: 'customer', label: 'SATCOM capacity', strength: 6 },
  { source: 'ses', target: 'spacex', type: 'customer', label: 'Launches for O3b', strength: 6 },
  { source: 'telesat', target: 'spacex', type: 'customer', label: 'Lightspeed launches', strength: 5 },
  { source: 'iridium', target: 'spacex', type: 'customer', label: 'NEXT constellation launches', strength: 8 },
  { source: 'thales-alenia', target: 'telesat', type: 'supplier', label: 'Lightspeed satellite bus', strength: 7 },
  { source: 'thales-alenia', target: 'ses', type: 'supplier', label: 'O3b mPOWER satellites', strength: 7 },

  // ── SDA (proliferated architecture) ──────────────────────
  { source: 'sda', target: 'l3harris', type: 'customer', label: 'Tranche tracking layer', strength: 8 },
  { source: 'sda', target: 'northrop-grumman', type: 'customer', label: 'Tranche transport layer', strength: 8 },
  { source: 'sda', target: 'lockheed-martin', type: 'customer', label: 'Tranche tracking layer', strength: 7 },

  // ── Robotics relationships ───────────────────────────────
  { source: 'mda-space', target: 'nasa', type: 'customer', label: 'Canadarm3 for Gateway', strength: 9 },
  { source: 'gitai', target: 'nasa', type: 'customer', label: 'ISS robotics demo', strength: 5 },
  { source: 'gitai', target: 'axiom', type: 'customer', label: 'Station assembly robots', strength: 4 },

  // ── Analytics relationships ──────────────────────────────
  { source: 'leoLabs', target: 'dod-sf', type: 'customer', label: 'SSA tracking data', strength: 5 },
  { source: 'slingshot', target: 'dod-sf', type: 'customer', label: 'Space domain awareness', strength: 6 },
  { source: 'kayhan', target: 'dod-sf', type: 'customer', label: 'Conjunction assessment', strength: 4 },

  // ── Cross-sector partnerships ────────────────────────────
  { source: 'spacex', target: 'nasa', type: 'partner', label: 'Commercial Crew / Artemis HLS', strength: 10 },
  { source: 'boeing', target: 'lockheed-martin', type: 'partner', label: 'ULA joint venture', strength: 9 },
  { source: 'northrop-grumman', target: 'lockheed-martin', type: 'supplier', label: 'Solid motors & payloads', strength: 7 },
  { source: 'general-dynamics', target: 'dod-sf', type: 'customer', label: 'Ground systems & IT', strength: 7 },

  // ── Material relationships ───────────────────────────────
  { source: 'materion', target: 'ball-aerospace', type: 'supplier', label: 'Beryllium mirrors/structures', strength: 7 },
  { source: 'toray', target: 'boeing', type: 'supplier', label: 'Carbon fiber prepreg', strength: 6 },
  { source: 'toray', target: 'northrop-grumman', type: 'supplier', label: 'Composite materials', strength: 5 },
  { source: 'hexcel', target: 'spacex', type: 'supplier', label: 'Composite structures', strength: 5 },

  // ── DARPA / Advanced R&D ─────────────────────────────────
  { source: 'darpa', target: 'northrop-grumman', type: 'customer', label: 'Blackjack, R&D programs', strength: 6 },
  { source: 'darpa', target: 'lockheed-martin', type: 'customer', label: 'Hypersonic & space R&D', strength: 6 },

  // ── Lumen Orbit ──────────────────────────────────────────
  { source: 'lumen-orbit', target: 'spacex', type: 'customer', label: 'Launch to orbit', strength: 5 },
  { source: 'cobham', target: 'lumen-orbit', type: 'supplier', label: 'Rad-hard electronics', strength: 6 },

  // ── Additional cross-links ───────────────────────────────
  { source: 'firefly', target: 'dod-sf', type: 'customer', label: 'Responsive launch TACRL', strength: 5 },
  { source: 'relativity', target: 'dod-sf', type: 'customer', label: 'Terran R contracts', strength: 4 },
  { source: 'te-connectivity', target: 'honeywell', type: 'supplier', label: 'Sensors & connectors', strength: 5 },
  { source: 'te-connectivity', target: 'northrop-grumman', type: 'supplier', label: 'Wiring harnesses', strength: 5 },
  { source: 'te-connectivity', target: 'boeing', type: 'supplier', label: 'Connectors', strength: 5 },
  { source: 'microchip', target: 'ball-aerospace', type: 'supplier', label: 'Space-rated FPGAs (RTG4)', strength: 6 },
  { source: 'microchip', target: 'l3harris', type: 'supplier', label: 'Rad-tolerant processors', strength: 6 },
];

// ============================================================
// Helper Functions
// ============================================================

/** Get all edges connected to a given node (both as source and target). */
export function getNodeConnections(nodeId: string): {
  node: GraphNode | undefined;
  edges: GraphEdge[];
  connectedNodes: GraphNode[];
} {
  const node = GRAPH_NODES.find((n) => n.id === nodeId);
  const edges = GRAPH_EDGES.filter(
    (e) => e.source === nodeId || e.target === nodeId
  );
  const connectedIds = new Set(
    edges.map((e) => (e.source === nodeId ? e.target : e.source))
  );
  const connectedNodes = GRAPH_NODES.filter((n) => connectedIds.has(n.id));
  return { node, edges, connectedNodes };
}

/** BFS shortest path between two nodes. Returns node IDs in order, or empty if no path. */
export function findPath(sourceId: string, targetId: string): string[] {
  if (sourceId === targetId) return [sourceId];

  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const node of GRAPH_NODES) {
    adj.set(node.id, new Set());
  }
  for (const edge of GRAPH_EDGES) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  // BFS
  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, string>();
  const queue: string[] = [sourceId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;

    for (const neighbor of Array.from(neighbors)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === targetId) {
        // Reconstruct path
        const path: string[] = [targetId];
        let step = targetId;
        while (step !== sourceId) {
          step = parent.get(step)!;
          path.unshift(step);
        }
        return path;
      }
      queue.push(neighbor);
    }
  }

  return []; // No path found
}

/** Filter graph to a subset of sectors. Returns both filtered nodes and edges (only those with both endpoints in the filtered set). */
export function getSubgraph(
  sectorFilter?: GraphNode['sector'][],
  typeFilter?: GraphEdge['type'][]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let nodes = [...GRAPH_NODES];
  let edges = [...GRAPH_EDGES];

  if (sectorFilter && sectorFilter.length > 0) {
    nodes = nodes.filter((n) => sectorFilter.includes(n.sector));
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  }

  if (typeFilter && typeFilter.length > 0) {
    edges = edges.filter((e) => typeFilter.includes(e.type));
  }

  return { nodes, edges };
}

/** Get edge between two specific nodes (if any). */
export function getEdgeBetween(
  nodeA: string,
  nodeB: string
): GraphEdge | undefined {
  return GRAPH_EDGES.find(
    (e) =>
      (e.source === nodeA && e.target === nodeB) ||
      (e.source === nodeB && e.target === nodeA)
  );
}

/** Get all unique sectors from the graph. */
export function getAllSectors(): GraphNode['sector'][] {
  return Array.from(new Set(GRAPH_NODES.map((n) => n.sector)));
}

/** Get all unique edge types from the graph. */
export function getAllEdgeTypes(): GraphEdge['type'][] {
  return Array.from(new Set(GRAPH_EDGES.map((e) => e.type)));
}
