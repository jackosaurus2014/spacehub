/**
 * Supply Chain BOM Risk Analysis
 *
 * Maps Bill-of-Materials (BOM) items from the 11 orbital systems in orbital-costs-data.ts
 * to supply chain risk ratings. Each component is assessed for supplier concentration,
 * lead times, geopolitical risk, technology readiness, and availability of alternatives.
 *
 * Risk levels:
 *   critical  — Single/no supplier, TRL <6, or severe geopolitical exposure
 *   high      — 1-2 qualified suppliers, long lead times, or constrained supply
 *   medium    — 3-4 suppliers with moderate lead times or qualification bottlenecks
 *   low       — Multiple suppliers, mature technology, manageable lead times
 *   no-risk   — Commodity items with broad commercial availability
 */

// ── Types ──────────────────────────────────────────

export type BOMRiskLevel = 'no-risk' | 'low' | 'medium' | 'high' | 'critical';

export type BOMCategory =
  | 'structure'
  | 'power'
  | 'thermal'
  | 'propulsion'
  | 'avionics'
  | 'life_support'
  | 'communications'
  | 'payload';

export interface BOMRiskItem {
  id: string;
  component: string;
  category: BOMCategory;
  usedIn: string[]; // orbital system slugs
  primarySuppliers: string[];
  riskLevel: BOMRiskLevel;
  riskFactors: string[];
  leadTime: string;
  alternatives: string[];
  notes: string;
}

// ── Orbital System Display Names (for UI) ─────────

export const ORBITAL_SYSTEM_NAMES: Record<string, string> = {
  'habitat-small': 'Small Habitat (4 Crew)',
  'habitat-large': 'Large Habitat (12 Crew)',
  'fabrication-facility': 'Fabrication Facility',
  'orbital-data-center': 'Orbital Data Center',
  'propellant-depot': 'Propellant Depot',
  'solar-array-small': 'Solar Array (Small)',
  'solar-array-medium': 'Solar Array (Medium)',
  'solar-array-large': 'Solar Array (Large)',
  'space-tug': 'Space Tug / OTV',
  'research-lab': 'Research Laboratory',
  'debris-removal': 'Debris Removal Platform',
};

// ── BOM Category Labels ───────────────────────────

export const BOM_CATEGORY_INFO: Record<BOMCategory, { label: string; color: string }> = {
  structure: { label: 'Structure', color: 'text-slate-300 bg-slate-500/20 border-slate-500/40' },
  power: { label: 'Power', color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40' },
  thermal: { label: 'Thermal', color: 'text-orange-300 bg-orange-500/20 border-orange-500/40' },
  propulsion: { label: 'Propulsion', color: 'text-red-300 bg-red-500/20 border-red-500/40' },
  avionics: { label: 'Avionics', color: 'text-blue-300 bg-blue-500/20 border-blue-500/40' },
  life_support: { label: 'Life Support', color: 'text-green-300 bg-green-500/20 border-green-500/40' },
  communications: { label: 'Communications', color: 'text-purple-300 bg-purple-500/20 border-purple-500/40' },
  payload: { label: 'Payload', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40' },
};

// ── Risk Level Labels ─────────────────────────────

export const RISK_LEVEL_INFO: Record<BOMRiskLevel, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    dotColor: 'bg-red-500',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
    dotColor: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    dotColor: 'bg-yellow-500',
  },
  low: {
    label: 'Low',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    dotColor: 'bg-green-500',
  },
  'no-risk': {
    label: 'No Risk',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/50',
    dotColor: 'bg-slate-500',
  },
};

// ── BOM Risk Items ────────────────────────────────

export const BOM_RISK_ITEMS: BOMRiskItem[] = [

  // ═══════════════════════════════════════════════════
  // CRITICAL RISK (7 items)
  // ═══════════════════════════════════════════════════

  {
    id: 'bom-crit-1',
    component: 'Space-Qualified GPUs / TPUs',
    category: 'payload',
    usedIn: ['orbital-data-center'],
    primarySuppliers: ['Xilinx (AMD) — FPGA workaround', 'Custom ASIC foundries'],
    riskLevel: 'critical',
    riskFactors: [
      'No rad-hard GPU/TPU exists — NVIDIA/AMD do not produce space variants',
      'FPGA-based inference is 10-100x slower than native GPU',
      'Radiation-shielded commercial GPUs add mass and limit performance',
      'US export controls on advanced AI chips restrict international supply',
      'ITAR restrictions on space-qualified computing',
    ],
    leadTime: '24-36 months (custom ASIC), 12-18 months (FPGA)',
    alternatives: [
      'XQRKU060 Kintex UltraScale FPGAs for inference workloads',
      'Spot-shielded commercial GPUs (Lumen Orbit approach)',
      'Neuromorphic processors (Intel Loihi, IBM TrueNorth research)',
    ],
    notes: 'True space-qualified GPU compute is 3-5 years away. Current orbital data center designs rely on commercial GPUs inside radiation-shielded enclosures, accepting reduced performance and added mass. This is the single largest technology gap for orbital computing.',
  },
  {
    id: 'bom-crit-2',
    component: 'Zero-Boil-Off Cryocoolers (Large-Scale)',
    category: 'thermal',
    usedIn: ['propellant-depot'],
    primarySuppliers: ['Ball Aerospace', 'Lockheed Martin NCST', 'Northrop Grumman Cryogenics'],
    riskLevel: 'critical',
    riskFactors: [
      'TRL 5-6 — no flight-qualified large-scale ZBO system exists',
      'Current cryocoolers designed for watts; depots need kilowatts of cooling',
      '100x scale-up required from instrument-class to depot-class',
      'Without ZBO, propellant depots lose 1-5% daily through boiloff',
      'Key blocker for NASA Artemis architecture and in-space refueling',
    ],
    leadTime: '36-48 months (development + qualification)',
    alternatives: [
      'Passive thermal designs with sun-shields (limited effectiveness)',
      'Thermodynamic vent systems (sacrificial boiloff management)',
      'Subcooled propellant storage (delays boiloff onset)',
    ],
    notes: 'Zero-boil-off is THE critical enabling technology for propellant depots. Without it, long-term cryogenic storage in space is impossible. NASA, Lockheed Martin, and Ball Aerospace are developing solutions, but none have flown at the required scale.',
  },
  {
    id: 'bom-crit-3',
    component: 'EVA Suit Components (Next-Generation)',
    category: 'life_support',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Collins Aerospace (sole source)'],
    riskLevel: 'critical',
    riskFactors: [
      'Collins Aerospace sole developer of xEMU/AxEMU next-gen suits',
      'Production capacity is essentially one suit at a time',
      'Significant program delays and cost overruns',
      'Critical components: life support backpack (PLSS), regenerable CO2 scrubber, dust-resistant bearings',
      '40+ year old legacy EMU suits have known water intrusion issues',
    ],
    leadTime: '24-36 months per suit',
    alternatives: [
      'David Clark Company (partial suit components)',
      'SpaceX internal EVA suit (Polaris Dawn heritage, limited capability)',
    ],
    notes: 'Sole-source dependency is the primary risk. Current production rate is wholly inadequate for Artemis lunar EVAs, ISS maintenance, and commercial station operations simultaneously. Any supplier disruption has no backup.',
  },
  {
    id: 'bom-crit-4',
    component: 'Lunar Regolith-Compatible Seals',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Parker Hannifin (R&D)', 'SKF Aerospace (R&D)', 'NASA GRC (development)'],
    riskLevel: 'critical',
    riskFactors: [
      'TRL 3-5 — no flight-proven regolith-resistant seals exist',
      'Lunar dust is abrasive, electrostatically charged, sub-micron glass shards',
      'Apollo-era experience showed rapid destruction of conventional seals',
      'Every lunar surface mechanism needs regolith-tolerant seals',
      'Fundamental unsolved engineering problem for sustained lunar presence',
    ],
    leadTime: '36-60 months (R&D + qualification)',
    alternatives: [
      'Labyrinth seals (partial protection)',
      'Magnetic fluid seals (experimental)',
      'Electrostatic dust repulsion coatings',
      'Sacrificial seal designs with in-field replacement',
    ],
    notes: 'This applies to any orbital system designed for eventual lunar operations. For LEO-only habitats the risk is lower, but Artemis-related habitat designs must account for lunar dust compatibility in airlock and EVA interface seals.',
  },
  {
    id: 'bom-crit-5',
    component: 'Large-Format IR Focal Plane Arrays',
    category: 'avionics',
    usedIn: ['debris-removal', 'research-lab'],
    primarySuppliers: ['Teledyne (formerly Rockwell Scientific)', 'Raytheon Vision Systems'],
    riskLevel: 'critical',
    riskFactors: [
      'ITAR-controlled and export-restricted',
      'Only 2 qualified US sources for 2K x 2K+ MWIR/LWIR arrays',
      'InSb and HgCdTe detector materials require specialized epitaxial growth',
      'Multi-year qualification cycles for new detector formats',
      'Demand surging from OPIR missile warning and Earth observation',
    ],
    leadTime: '18-24 months',
    alternatives: [
      'Lynred (France) — smaller formats, European alternative',
      'Microbolometer arrays (lower sensitivity, uncooled)',
    ],
    notes: 'Critical for debris tracking sensors, Earth observation instruments, and scientific payloads. The dual-supplier situation is relatively fragile given that both are US-only and ITAR-controlled, blocking allied partner sourcing.',
  },
  {
    id: 'bom-crit-6',
    component: 'Rad-Hardened SRAM / DRAM',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'solar-array-medium', 'solar-array-large',
      'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['BAE Systems (RAD750 era)', '3D-Plus (France)', 'Cobham Advanced Electronic Solutions'],
    riskLevel: 'critical',
    riskFactors: [
      'Every spacecraft requires rad-hard memory — universal dependency',
      'Lead times 12-18 months across all suppliers',
      'LEO mega-constellations consuming all available capacity',
      'Based on older process nodes with limited density',
      'No space-qualified DDR4/DDR5 or HBM equivalents exist',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'EDAC-protected commercial DRAM (LEO only, with shielding)',
      'Triple-modular redundancy with COTS memory (mass penalty)',
    ],
    notes: 'This is the most broadly impactful supply chain bottleneck in the space industry. Every orbital system in the database depends on rad-hard memory. Starlink, Kuiper, and SDA Tranche programs are consuming the majority of available production.',
  },
  {
    id: 'bom-crit-7',
    component: 'High-Bandwidth Optical Interconnects (Space-Rated)',
    category: 'communications',
    usedIn: ['orbital-data-center'],
    primarySuppliers: ['Custom development only'],
    riskLevel: 'critical',
    riskFactors: [
      'No space-qualified 400G optical transceivers exist',
      'Terrestrial 400G-ZR/ZR+ modules not rated for space environment',
      'TRL 3-4 for space-rated photonic interconnects',
      'Forces lower-bandwidth copper links with performance penalty',
      'Critical gap for data-center-class computing in orbit',
    ],
    leadTime: '36-48 months (development)',
    alternatives: [
      'Lower-bandwidth copper interconnects (significant performance penalty)',
      'Custom fiber links with space-qualified optics (lower bandwidth)',
    ],
    notes: 'Orbital data centers require data-center-class backplane connectivity (400G+). The complete absence of space-qualified high-bandwidth optical transceivers is a fundamental architecture constraint.',
  },

  // ═══════════════════════════════════════════════════
  // HIGH RISK (10 items)
  // ═══════════════════════════════════════════════════

  {
    id: 'bom-high-1',
    component: 'Xenon Propellant (Electric Propulsion)',
    category: 'propulsion',
    usedIn: ['space-tug', 'solar-array-medium', 'solar-array-large', 'debris-removal'],
    primarySuppliers: ['Air Liquide', 'Linde', 'Praxair'],
    riskLevel: 'high',
    riskFactors: [
      'Xenon is a byproduct of air separation — supply is inelastic',
      'Ukraine (major producer) has had supply disruptions',
      'Price ~$3,000/kg and rising with demand',
      'SpaceX Starlink alone consumes significant fraction of global supply',
      'LEO mega-constellations driving unprecedented demand',
    ],
    leadTime: '3-6 months (propellant), 12-18 months (tanks)',
    alternatives: [
      'Krypton propellant (more abundant, requires thruster redesign)',
      'Iodine propellant (emerging, solid storage advantages)',
    ],
    notes: 'Global xenon production is approximately 50-70 tons/year. Space demand alone could consume 20-30% of this as electric propulsion proliferates. The transition to krypton (as SpaceX has done for Starlink) alleviates some pressure.',
  },
  {
    id: 'bom-high-2',
    component: 'IDSS Docking Mechanisms',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large', 'research-lab', 'fabrication-facility'],
    primarySuppliers: ['Boeing (Starliner)', 'Sierra Space (Dream Chaser)'],
    riskLevel: 'high',
    riskFactors: [
      'Only Boeing and Sierra Space produce qualified active IDSS mechanisms',
      'No commercial off-the-shelf docking system available',
      'Every new station needs multiple IDSS ports',
      'Every visiting vehicle needs an active mechanism',
      'Custom development or licensing required per customer',
    ],
    leadTime: '18-24 months',
    alternatives: [
      'Common Berthing Mechanism (CBM) — passive, requires robotic arm',
      'Proprietary docking systems (limits interoperability)',
    ],
    notes: 'Major infrastructure bottleneck for the emerging multi-destination commercial LEO ecosystem. The lack of a COTS docking system forces expensive custom development for each program.',
  },
  {
    id: 'bom-high-3',
    component: 'Closed-Loop Water Recovery System',
    category: 'life_support',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Collins Aerospace'],
    riskLevel: 'high',
    riskFactors: [
      'Only flight-proven system is ISS WPA/UPA by Collins Aerospace',
      'No commercial off-the-shelf closed-loop water system exists',
      'Multi-year qualification required for new designs',
      'ISS WPA has reliability issues — multiple in-orbit repairs required',
      '4+ commercial stations all needing independent water systems simultaneously',
    ],
    leadTime: '24-36 months (development + qualification)',
    alternatives: [
      'Expendable water resupply (expensive, limits mission duration)',
      'Paragon Space Development alternative ECLSS (TRL 5-6)',
      'NASA technology license transfer',
    ],
    notes: 'Achieving >90% water recovery is essential for beyond-LEO missions and reduces resupply mass by thousands of kg/year. Each new commercial station must either license ISS heritage technology or develop proprietary systems at great cost and schedule risk.',
  },
  {
    id: 'bom-high-4',
    component: 'Ka-Band Phased Array Antennas',
    category: 'communications',
    usedIn: ['orbital-data-center', 'habitat-large', 'propellant-depot', 'solar-array-medium', 'solar-array-large'],
    primarySuppliers: ['Ball Aerospace', 'Viasat', 'Hughes (EchoStar)'],
    riskLevel: 'high',
    riskFactors: [
      'Demand exploding from LEO broadband and SDA constellations',
      'Each satellite needs 2-4 phased array panels',
      'GaAs/GaN MMIC chips driving arrays are in tight supply',
      'User terminal production at millions/year strains GaN wafer supply',
      'Limited number of space-qualified vendors',
    ],
    leadTime: '9-15 months',
    alternatives: [
      'Kymeta flat-panel antennas (user terminals)',
      'ThinKom phased arrays',
      'Parabolic dish antennas (heavier, mechanically steered)',
    ],
    notes: 'Ka-band phased arrays are the backbone of modern high-throughput satellite communications. The GaN/GaAs compound semiconductor supply chain is the deeper bottleneck.',
  },
  {
    id: 'bom-high-5',
    component: 'Carbon Nanotube / Advanced Composite Materials',
    category: 'structure',
    usedIn: ['solar-array-large', 'solar-array-medium', 'habitat-large'],
    primarySuppliers: ['Nanocomp Technologies', 'Toray', 'Hexcel'],
    riskLevel: 'high',
    riskFactors: [
      'CNT materials cost ~$50,000/kg at aerospace grade',
      'Limited production capacity for space-qualified composites',
      'Aerospace carbon fiber demand exceeding supply',
      'Long qualification cycles for structural applications',
      'New capacity ramping but not yet sufficient',
    ],
    leadTime: '6-12 months',
    alternatives: [
      'Standard CFRP (lower performance but more available)',
      'Aluminum-lithium alloys (heavier, well-characterized)',
      'Titanium structures (heavier, mature supply chain)',
    ],
    notes: 'Advanced composites including CNTs are essential for next-generation lightweight space structures, particularly large deployable solar arrays and mega-structures.',
  },
  {
    id: 'bom-high-6',
    component: 'Green Propellant (AF-M315E / LMP-103S)',
    category: 'propulsion',
    usedIn: ['space-tug', 'debris-removal', 'research-lab'],
    primarySuppliers: ['Aerojet Rocketdyne (ASCENT / GR-22)', 'Bradford Space (HPGP)'],
    riskLevel: 'high',
    riskFactors: [
      'Limited production — only 2 qualified propulsion system providers',
      'Chemical precursor supply chains for HAN/ADN are narrow',
      'Higher density-Isp but lower manufacturing readiness than hydrazine',
      'ESG/regulatory pressure driving rapid demand increase',
      'Dawn Aerospace (NZ) developing alternatives but not yet qualified',
    ],
    leadTime: '9-15 months',
    alternatives: [
      'Hydrazine (toxic but mature supply chain)',
      'Electric propulsion (where applicable)',
      'Cold gas thrusters (very low performance)',
    ],
    notes: 'Green propellants are increasingly specified for ESG/regulatory compliance. The production ramp-up is not keeping pace with the demand shift away from hydrazine.',
  },
  {
    id: 'bom-high-7',
    component: 'Optical Communication Terminals (OISL)',
    category: 'communications',
    usedIn: ['orbital-data-center', 'habitat-large', 'solar-array-medium', 'solar-array-large'],
    primarySuppliers: ['Mynaric (CONDOR)', 'Tesat-Spacecom (Airbus)', 'CACI/SA Photonics', 'General Atomics OIS'],
    riskLevel: 'high',
    riskFactors: [
      'Combined global production ~100-200 units/year vs 1,000+/year demand',
      'SDA Tranche 2/3 consuming unprecedented quantities',
      'SpaceX adding laser links to every Starlink satellite (6,000+ planned)',
      'Precision optical assemblies have individual bottlenecks',
      'High-power 1550nm laser sources are constrained',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'RF inter-satellite links (lower bandwidth, mature technology)',
      'Ka-band crosslinks (lower data rate)',
    ],
    notes: 'Optical inter-satellite links are the most demanded new space component of the 2020s. The gap between production capacity and demand is the widest of any space component category.',
  },
  {
    id: 'bom-high-8',
    component: 'Hall Effect Thruster Cathodes',
    category: 'propulsion',
    usedIn: ['space-tug', 'debris-removal', 'solar-array-medium', 'solar-array-large'],
    primarySuppliers: ['Busek Co.', 'Exotrail (France)', 'Safran (PPS-series)', 'SITAEL (Italy)'],
    riskLevel: 'high',
    riskFactors: [
      'Cathode lifetime determines thruster lifetime — wear-limited component',
      'BaO impregnated tungsten insert manufacturing is specialized',
      'Each Starlink satellite consumes a cathode — thousands/year demand',
      'Aerospace-grade BaO insert supply limited to few global sources',
      'LaB6 alternative cathodes offer longer life but limited heritage',
    ],
    leadTime: '6-12 months',
    alternatives: [
      'LaB6 (lanthanum hexaboride) cathodes — longer life, less heritage',
      'Cathode-less RF neutralizers (emerging, low TRL)',
    ],
    notes: 'The hollow cathode is the Achilles heel of Hall effect thrusters. Mega-constellation demand has strained production of a component that was previously a niche product.',
  },
  {
    id: 'bom-high-9',
    component: 'CO2 Removal Canisters (CDRA-type)',
    category: 'life_support',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Collins Aerospace (sole source)'],
    riskLevel: 'high',
    riskFactors: [
      'Collins Aerospace sole source for CDRA metal oxide sorbent beds',
      'No commercial production line outside NASA/Collins ecosystem',
      '4+ commercial stations all need independent CO2 removal',
      'Paragon Space Development alternative at TRL 5-6 only',
      'Production line designed for ISS sustainment, not multi-customer volume',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'LiOH canisters (expendable, short-duration backup only)',
      'Paragon Space Development alternative ECLSS (TRL 5-6)',
      'MOXIE-derived CO2 electrolysis (experimental)',
    ],
    notes: 'The Collins Aerospace sole-source dependency for ECLSS components is one of the largest structural risks in commercial space station development. Every new station program competes for the same limited production capacity.',
  },
  {
    id: 'bom-high-10',
    component: 'Space-Qualified Robotic Actuators',
    category: 'payload',
    usedIn: ['habitat-large', 'fabrication-facility', 'debris-removal', 'solar-array-large'],
    primarySuppliers: ['Maxon Motors (Switzerland)', 'Harmonic Drive Systems (Japan)', 'Moog'],
    riskLevel: 'high',
    riskFactors: [
      'Maxon and Harmonic Drive effectively sole sources for precision gearboxes',
      'Lead times 9-18 months for flight-qualified units',
      'Demand surging from Canadarm3, satellite servicing, space robotics startups',
      'Swiss and Japanese export controls add procurement complexity',
      'Precision manufacturing for vacuum/thermal cycling limits production scale',
    ],
    leadTime: '9-18 months',
    alternatives: [
      'Curtiss-Wright actuators (larger units, less precision)',
      'Custom direct-drive motors (no gearbox, limited torque)',
    ],
    notes: 'Space-qualified robotic actuators are a critical enabler for in-space assembly, servicing, and manufacturing. The concentrated supplier base in Switzerland and Japan creates geopolitical procurement risk for US programs.',
  },

  // ═══════════════════════════════════════════════════
  // MEDIUM RISK (12 items)
  // ═══════════════════════════════════════════════════

  {
    id: 'bom-med-1',
    component: 'Titanium 6Al-4V Forgings',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large', 'propellant-depot', 'fabrication-facility'],
    primarySuppliers: ['ATI Specialty Materials', 'TIMET (PCC)', 'VSMPO-AVISMA (Russia, sanctioned)', 'Kobe Steel (Japan)'],
    riskLevel: 'medium',
    riskFactors: [
      'Russian sanctions impacted 30% of global aerospace titanium',
      'Western supply chain actively diversifying but not yet sufficient',
      'Long lead times for large forgings (rocket-grade)',
      'Limited forging capacity for very large parts',
    ],
    leadTime: '6-12 months',
    alternatives: [
      'Aluminum-lithium alloys (lighter but lower strength)',
      'Inconel superalloys (heavier, for high-temp applications)',
      'Additive manufacturing of titanium parts (emerging)',
    ],
    notes: 'The Russia-Ukraine conflict exposed dangerous dependence on VSMPO-AVISMA. Western supply chains are rebuilding but large forging capacity remains constrained.',
  },
  {
    id: 'bom-med-2',
    component: 'Triple-Junction GaAs Solar Cells',
    category: 'power',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'solar-array-medium', 'space-tug',
      'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Spectrolab (Boeing)', 'SolAero (Rocket Lab)', 'AZUR SPACE (Germany)'],
    riskLevel: 'medium',
    riskFactors: [
      'Only 3-4 global suppliers of space-grade III-V solar cells',
      'High-efficiency (>30%) cells have limited production capacity',
      'New constellation demand straining capacity',
      'Gallium supply constrained by China export controls',
    ],
    leadTime: '6-9 months',
    alternatives: [
      'Perovskite-silicon tandems (emerging, lower heritage)',
      'Thin-film CIGS cells (lower efficiency, lighter)',
      'Ultra-thin silicon cells (lower efficiency, lower cost)',
    ],
    notes: 'Space solar cell production is a mature but capacity-constrained market. The acquisition of SolAero by Rocket Lab provides vertical integration for one player. AZUR SPACE provides European supply independence.',
  },
  {
    id: 'bom-med-3',
    component: 'Rad-Hard Processors (RAD750 class)',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'propellant-depot',
      'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['BAE Systems', 'Microchip Technology (SAMV71Q21RT)'],
    riskLevel: 'medium',
    riskFactors: [
      'BAE RAD750 uses 250nm process — outdated but flight-proven',
      'Long lead times (12-18 months) for flight-qualified units',
      'Limited computing power compared to modern commercial processors',
      'VORAGO and Microchip emerging but smaller ecosystem',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'VORAGO VA10820 ARM Cortex-M4 (lower power, lower performance)',
      'Microchip SAMV71Q21RT (radiation-tolerant, not fully hardened)',
      'FPGA-based soft processors (flexible, lower raw performance)',
    ],
    notes: 'The RAD750 has been the workhorse of deep space for 20 years but is showing its age. The transition to newer rad-hard processors is slow due to the extreme qualification requirements.',
  },
  {
    id: 'bom-med-4',
    component: 'MLI Blankets (Multi-Layer Insulation)',
    category: 'thermal',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Dunmore', 'Sheldahl (Orcon)', 'Aerospace Fabrication'],
    riskLevel: 'medium',
    riskFactors: [
      '6-9 month lead times for large custom orders',
      'Space-qualified manufacturing with contamination control is specialized',
      'Propellant depots may require 1,000+ m2 of specialized MLI',
      'Demand growing as commercial stations and large structures proliferate',
    ],
    leadTime: '6-9 months',
    alternatives: [
      'Spray-on foam insulation (not suitable for vacuum)',
      'Electrochromic thermal control surfaces (emerging)',
      'Deployable sunshades (for cryogenic applications)',
    ],
    notes: 'MLI is needed in quantity for every orbital system. The materials (aluminized Kapton/Mylar) are available, but space-qualified manufacturing with controlled contamination and precise layer counts is a specialized capability.',
  },
  {
    id: 'bom-med-5',
    component: 'Star Tracker Assemblies',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Ball Aerospace (CT-2020)', 'Sodern / Airbus (Hydra/Auriga)', 'Jena-Optronik (Germany)', 'Terma (Denmark)'],
    riskLevel: 'medium',
    riskFactors: [
      'Required on virtually every satellite for attitude determination',
      'Custom optical assemblies with rad-resistant glass need 8-14 month lead times',
      'Explosion of LEO constellation demand has strained production',
      'Each Starlink satellite uses a custom star tracker variant',
    ],
    leadTime: '8-14 months',
    alternatives: [
      'GPS-aided inertial navigation (lower accuracy for LEO)',
      'Sun sensor + magnetometer combo (much lower accuracy)',
    ],
    notes: 'Star trackers are essential attitude determination sensors. The market is split between Ball (US) and Sodern (EU) with smaller European players. Constellation demand has increased lead times significantly.',
  },
  {
    id: 'bom-med-6',
    component: 'Reaction Wheel Assemblies',
    category: 'avionics',
    usedIn: [
      'fabrication-facility', 'orbital-data-center', 'solar-array-small',
      'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Honeywell Aerospace', 'Collins Aerospace', 'Rockwell Collins', 'NewSpace Systems (South Africa)'],
    riskLevel: 'medium',
    riskFactors: [
      'Space qualification testing is the primary bottleneck',
      'Each unit requires extensive vibration, thermal vacuum, and life testing',
      'Bearing failures are a known failure mode in orbit',
      'NewSpace Systems provides lower-cost alternative but limited heritage',
    ],
    leadTime: '6-12 months',
    alternatives: [
      'Control moment gyroscopes (CMGs) — larger, more capable',
      'Magnetic torquers (LEO only, limited authority)',
      'RCS thrusters for momentum dumping (propellant cost)',
    ],
    notes: 'Reaction wheels are a mature technology but the qualification testing bottleneck limits production throughput. Bearing life and reliability remain active areas of concern.',
  },
  {
    id: 'bom-med-7',
    component: 'Berthing Adapters / CBM Ports',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large', 'research-lab'],
    primarySuppliers: ['Boeing (ISS heritage)', 'Thales Alenia Space'],
    riskLevel: 'medium',
    riskFactors: [
      'Custom fabrication required for each new program',
      'ISS Common Berthing Mechanism (CBM) is sole design with flight heritage',
      'Requires robotic arm for berthing (adds dependency)',
      'New commercial stations may need modified designs',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'IDSS active docking (no arm needed, but different design)',
      'Proprietary berthing mechanisms (limits interoperability)',
    ],
    notes: 'The CBM is proven technology from ISS but production is limited and each new application requires customization. The industry is gradually shifting toward IDSS active docking.',
  },
  {
    id: 'bom-med-8',
    component: 'Space-Rated FPGAs',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-medium', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Xilinx/AMD (XQRKU060)', 'Microchip (RTG4)', 'NanoXplore (NG-LARGE, France)'],
    riskLevel: 'medium',
    riskFactors: [
      'Only 2 primary space-qualified FPGA families (Xilinx + Microchip)',
      'Limited TSMC foundry capacity for rad-hard process nodes',
      'Every modern satellite requires multiple FPGAs',
      'SDA Tranche 2/3 consuming unprecedented quantities',
      'Lead times stretched to 12-24 months for some part numbers',
    ],
    leadTime: '12-24 months',
    alternatives: [
      'NanoXplore NG-LARGE (European alternative, emerging)',
      'Rad-hard ASICs (non-reconfigurable, expensive NRE)',
    ],
    notes: 'FPGAs are the programmable logic backbone of every modern satellite. The duopoly of Xilinx and Microchip for space-qualified parts creates a structural bottleneck.',
  },
  {
    id: 'bom-med-9',
    component: 'Li-Ion Battery Packs (Space-Qualified)',
    category: 'power',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'solar-array-medium', 'space-tug',
      'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['EaglePicher Technologies', 'GS Yuasa (Japan)', 'SAFT (France)', 'EnerSys/ABSL'],
    riskLevel: 'medium',
    riskFactors: [
      'Space qualification testing adds 12-18 months to cell availability',
      'Terrestrial Li-ion cells are plentiful but space qualification is slow',
      'Each mission requires specific cell/pack configuration',
      'Thermal management in vacuum is critical design consideration',
    ],
    leadTime: '9-15 months (qualified packs)',
    alternatives: [
      'Lithium polymer cells (less heritage, lighter packaging)',
      'Solid-state batteries (emerging, higher energy density)',
      'Lithium-iron-phosphate (safer, lower energy density)',
    ],
    notes: 'The terrestrial battery supply chain is massive, but the space qualification bottleneck makes space-rated packs a medium-risk item. EaglePicher and SAFT dominate the market.',
  },
  {
    id: 'bom-med-10',
    component: 'Deep Space Transponders (X/Ka-Band)',
    category: 'communications',
    usedIn: ['research-lab', 'space-tug'],
    primarySuppliers: ['L3Harris', 'General Dynamics Mission Systems', 'Thales Alenia'],
    riskLevel: 'medium',
    riskFactors: [
      'Production volumes tiny (5-15 units/year)',
      'Each transponder effectively custom-built',
      'Lunar mission surge (Artemis, CLPS, Gateway) outpacing production',
      'RF backup required for decades even as optical comms emerge',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'Optical deep space communications (DSOC — emerging)',
      'Commercial telecom transponder derivatives (modified)',
    ],
    notes: 'Deep space transponders are a niche product with very low production rates. The increase in lunar and deep space missions is creating pressure on an artisanal production line.',
  },
  {
    id: 'bom-med-11',
    component: 'Xenon/Krypton Propellant Tanks (COPV)',
    category: 'propulsion',
    usedIn: ['space-tug', 'debris-removal', 'solar-array-medium', 'solar-array-large'],
    primarySuppliers: ['Cobham Advanced', 'RUAG Space (Switzerland)', 'ARDE Inc.', 'MT Aerospace (Germany)'],
    riskLevel: 'medium',
    riskFactors: [
      'COPV rated for 350+ bar at space qualification are specialized',
      'Handful of qualified suppliers globally',
      'Tank lead times 12-18 months',
      'EP satellite proliferation driving unprecedented tank demand',
    ],
    leadTime: '12-18 months',
    alternatives: [
      'Metallic tanks (heavier, shorter lead times)',
      'Iodine storage (solid at room temperature, different tank design)',
    ],
    notes: 'High-pressure composite overwrapped pressure vessels for noble gas propellant storage are a specialized product. The EP satellite boom has created a demand surge.',
  },
  {
    id: 'bom-med-12',
    component: 'Radiation-Hardened Power Electronics',
    category: 'power',
    usedIn: ['space-tug', 'research-lab', 'debris-removal', 'propellant-depot'],
    primarySuppliers: ['Microchip Technology', 'Infineon (HIREX)', 'STMicroelectronics', 'Vishay Space'],
    riskLevel: 'medium',
    riskFactors: [
      'Deep-space missions need 100-300+ krad TID rating',
      'Limited product range based on older silicon processes',
      'Next-gen SiC/GaN power devices have minimal space heritage',
      'Lead times 18-24 months for deep-space-qualified parts',
    ],
    leadTime: '12-24 months',
    alternatives: [
      'Spot-shielded commercial power electronics (LEO only)',
      'Custom hybrid designs with redundancy',
    ],
    notes: 'Power electronics (DC-DC converters, regulators, battery charge controllers) rated for beyond-LEO radiation environments are a growing bottleneck as cislunar and deep space missions increase.',
  },

  // ═══════════════════════════════════════════════════
  // LOW RISK (11 items)
  // ═══════════════════════════════════════════════════

  {
    id: 'bom-low-1',
    component: 'Aluminum 6061-T6 Alloy Stock',
    category: 'structure',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Alcoa', 'Constellium', 'Novelis', 'Hindalco'],
    riskLevel: 'low',
    riskFactors: [
      'Widely available commodity alloy',
      'Multiple global suppliers with large production capacity',
      'Extended lead times only for very large custom forgings',
    ],
    leadTime: '2-4 weeks (stock), 3-6 months (large forgings)',
    alternatives: [
      '7075-T6 aluminum (higher strength)',
      'Al-Li 2195 (lighter, more expensive)',
    ],
    notes: 'Standard aerospace aluminum is widely available from multiple global suppliers. Risk is minimal for standard shapes and sizes.',
  },
  {
    id: 'bom-low-2',
    component: 'Al-Li 2195 Panels',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large', 'propellant-depot'],
    primarySuppliers: ['Arconic', 'Constellium', 'Aleris (now Novelis)'],
    riskLevel: 'low',
    riskFactors: [
      'Multiple suppliers in US and Europe',
      'Well-characterized material with extensive heritage (Space Shuttle ET)',
      'Higher cost than standard aluminum but readily available',
    ],
    leadTime: '4-8 weeks (plate), 3-6 months (large forgings)',
    alternatives: [
      'Standard 6061/7075 aluminum (heavier)',
      'CFRP structures (lighter, different manufacturing)',
    ],
    notes: 'Al-Li alloys are the standard pressure vessel material for space structures. Supply chain is well-established from Space Shuttle and SLS heritage.',
  },
  {
    id: 'bom-low-3',
    component: 'CFRP Truss Structures',
    category: 'structure',
    usedIn: ['habitat-large', 'solar-array-small', 'solar-array-medium', 'solar-array-large'],
    primarySuppliers: ['Toray', 'Hexcel', 'SGL Carbon', 'Mitsubishi Chemical'],
    riskLevel: 'low',
    riskFactors: [
      'Growing market with multiple qualified suppliers',
      'Aerospace CFRP capacity expanding',
      'Standard designs available from multiple fabricators',
    ],
    leadTime: '3-6 months',
    alternatives: [
      'Aluminum truss structures (heavier, faster procurement)',
      'Titanium trusses (heavier, high-temperature capable)',
    ],
    notes: 'Carbon fiber reinforced polymer structures are a growing market. While aerospace-grade demand is increasing, multiple suppliers ensure adequate availability for structural truss applications.',
  },
  {
    id: 'bom-low-4',
    component: 'Cold Plates / Heat Exchangers',
    category: 'thermal',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'research-lab',
    ],
    primarySuppliers: ['Honeywell Thermal', 'Boyd Corporation', 'Aavid (Boyd)', 'Custom fabricators'],
    riskLevel: 'low',
    riskFactors: [
      'Standard thermal management designs',
      'Multiple qualified suppliers',
      'Customization required but based on proven technology',
    ],
    leadTime: '3-6 months',
    alternatives: [
      'Heat pipe assemblies',
      'Pumped fluid loop systems',
      'Phase-change material thermal storage',
    ],
    notes: 'Thermal management hardware is a mature technology with multiple suppliers. Space-qualified cold plates and heat exchangers follow standard design practices.',
  },
  {
    id: 'bom-low-5',
    component: 'S-Band Transponders',
    category: 'communications',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'propellant-depot',
      'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['L3Harris', 'General Dynamics', 'Thales Alenia', 'RUAG Space'],
    riskLevel: 'low',
    riskFactors: [
      'Mature technology with decades of flight heritage',
      'Multiple qualified suppliers globally',
      'Standard TT&C communications equipment',
    ],
    leadTime: '4-8 months',
    alternatives: [
      'UHF systems (lower data rate, simpler)',
      'X-band transponders (higher data rate, more expensive)',
    ],
    notes: 'S-band transponders are the workhorse of spacecraft telemetry, tracking, and command (TT&C) communications. Very mature technology with a healthy supplier ecosystem.',
  },
  {
    id: 'bom-low-6',
    component: 'RCS Thrusters (Monopropellant/Bipropellant)',
    category: 'propulsion',
    usedIn: [
      'habitat-small', 'habitat-large', 'propellant-depot', 'space-tug',
      'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Aerojet Rocketdyne', 'Moog', 'AMPAC-ISP', 'Ariane Group', 'Nammo'],
    riskLevel: 'low',
    riskFactors: [
      'Multiple qualified suppliers in US and Europe',
      'Mature technology with extensive heritage',
      'Standard catalog products available',
    ],
    leadTime: '4-9 months',
    alternatives: [
      'Cold gas thrusters (lower performance, simpler)',
      'Electric propulsion RCS (lower thrust, higher efficiency)',
    ],
    notes: 'Chemical RCS thrusters are one of the most mature space technologies. Multiple suppliers offer catalog products with well-characterized performance.',
  },
  {
    id: 'bom-low-7',
    component: 'GPS / GNSS Receivers',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['General Dynamics', 'Raytheon', 'Surrey Satellite Technology', 'Novatel (Hexagon)'],
    riskLevel: 'low',
    riskFactors: [
      'Commodity technology with multiple suppliers',
      'Both military-grade and commercial receivers available',
      'Well-characterized performance in LEO',
    ],
    leadTime: '3-6 months',
    alternatives: [
      'European Galileo receivers',
      'Multi-constellation GNSS (GPS + Galileo + GLONASS)',
    ],
    notes: 'Space-grade GPS receivers are a commodity product with a healthy competitive market. Risk is minimal for LEO applications.',
  },
  {
    id: 'bom-low-8',
    component: 'Power Distribution Units',
    category: 'power',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'research-lab',
    ],
    primarySuppliers: ['Honeywell Aerospace', 'Collins Aerospace', 'EnerSys', 'Airbus Defence PDU'],
    riskLevel: 'low',
    riskFactors: [
      'Standard spacecraft subsystem with multiple suppliers',
      'Custom configuration but standard architecture',
      'Mature design heritage from multiple programs',
    ],
    leadTime: '6-9 months',
    alternatives: [
      'Custom power electronics with COTS components (mass penalty)',
    ],
    notes: 'Power distribution is a well-understood spacecraft function with multiple qualified vendors providing standard and custom configurations.',
  },
  {
    id: 'bom-low-9',
    component: 'Ammonia Loop Pumps (Thermal Control)',
    category: 'thermal',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Honeywell Aerospace', 'Collins Aerospace', 'Hamilton Sundstrand heritage'],
    riskLevel: 'low',
    riskFactors: [
      'ISS heritage technology (Active Thermal Control System)',
      'Multiple sources with flight experience',
      'Standard designs well-characterized',
    ],
    leadTime: '6-9 months',
    alternatives: [
      'Single-phase pumped loop systems',
      'Capillary pumped loops (passive)',
      'Two-phase thermal control (advanced)',
    ],
    notes: 'The ISS active thermal control system using ammonia loops provides extensive heritage. Replacement pumps and new systems are well-understood.',
  },
  {
    id: 'bom-low-10',
    component: 'Flight Computers (Non-Rad-Hard, LEO)',
    category: 'avionics',
    usedIn: ['orbital-data-center', 'fabrication-facility', 'debris-removal'],
    primarySuppliers: ['Unibap (Sweden)', 'AAC Clyde Space', 'Xiphos Technologies', 'Innoflight'],
    riskLevel: 'low',
    riskFactors: [
      'Commercial processors with radiation mitigation (LEO only)',
      'Growing NewSpace supplier base',
      'Standard Linux-based flight software ecosystem',
    ],
    leadTime: '3-6 months',
    alternatives: [
      'Rad-hard processors (longer lead, higher cost, lower performance)',
      'FPGA-based computing (flexible, space-qualified)',
    ],
    notes: 'For LEO applications with limited radiation exposure, commercial-derived flight computers are increasingly used. The NewSpace vendor ecosystem is growing rapidly.',
  },
  {
    id: 'bom-low-11',
    component: 'Propellant Tanks (Standard Metallic)',
    category: 'propulsion',
    usedIn: [
      'habitat-small', 'habitat-large', 'propellant-depot', 'space-tug',
      'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['Aerojet Rocketdyne', 'Cobham Advanced', 'ARDE Inc.', 'MT Aerospace'],
    riskLevel: 'low',
    riskFactors: [
      'Mature market with multiple qualified suppliers',
      'Standard titanium and aluminum tank designs available',
      'Catalog products for common sizes',
    ],
    leadTime: '6-9 months',
    alternatives: [
      'COPV tanks (lighter, longer lead time)',
      'Conformal tanks (custom shapes, less heritage)',
    ],
    notes: 'Standard metallic propellant tanks are a well-established product category. Multiple suppliers offer catalog and custom designs with extensive flight heritage.',
  },

  // ═══════════════════════════════════════════════════
  // NO RISK (8 items)
  // ═══════════════════════════════════════════════════

  {
    id: 'bom-nr-1',
    component: 'LOX / LH2 / LCH4 Propellants',
    category: 'propulsion',
    usedIn: ['habitat-small', 'habitat-large', 'propellant-depot'],
    primarySuppliers: ['Air Liquide', 'Linde', 'Air Products', 'Praxair (Linde)'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Commodity industrial chemicals',
      'Global production capacity vastly exceeds space demand',
      'Multiple large-scale producers on every continent',
    ],
    leadTime: '1-2 weeks',
    alternatives: [
      'Storable propellants (hydrazine/NTO) for long-duration missions',
    ],
    notes: 'Cryogenic propellants (liquid oxygen, liquid hydrogen, liquid methane) are commodity products of the industrial gas industry. Space demand is a tiny fraction of total production.',
  },
  {
    id: 'bom-nr-2',
    component: 'Potable Water',
    category: 'life_support',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['Municipal water supplies', 'Purification systems'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Commodity resource',
      'Launch-site water purification is standard',
    ],
    leadTime: 'On demand',
    alternatives: [
      'In-space water recovery (recycled)',
      'Lunar ice extraction (future ISRU)',
    ],
    notes: 'Water for initial crew supply is a commodity. The challenge is water recycling in orbit (covered under closed-loop water recovery system), not initial supply.',
  },
  {
    id: 'bom-nr-3',
    component: 'Structural Fasteners (Space-Grade)',
    category: 'structure',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'solar-array-medium', 'solar-array-large',
      'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['SPS Technologies (PCC)', 'Alcoa Fastening Systems', 'Hi-Shear (Lisi)', 'Cherry Aerospace'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Commodity aerospace hardware',
      'Multiple large suppliers',
      'Standard NAS/MS specifications',
    ],
    leadTime: '1-4 weeks (catalog), 6-8 weeks (custom)',
    alternatives: [
      'Bonded joints (adhesive, for composites)',
      'Welded joints (for metallic structures)',
    ],
    notes: 'Aerospace fasteners are a large commodity market with multiple qualified suppliers. Standard bolts, nuts, and specialty fasteners are available off the shelf.',
  },
  {
    id: 'bom-nr-4',
    component: 'Wiring Harnesses',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['TE Connectivity', 'Amphenol', 'Raychem (TE)', 'Multiple harness fabricators'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Standard manufacturing process',
      'Multiple qualified wire and connector suppliers',
      'Custom designs but commodity materials',
    ],
    leadTime: '4-8 weeks',
    alternatives: [
      'Wireless data links (limited to non-critical systems)',
      'Fiber optic harnesses (for data, not power)',
    ],
    notes: 'Wiring harnesses are custom-designed for each spacecraft but use commodity wires, connectors, and fabrication processes. Multiple contract manufacturers serve the aerospace market.',
  },
  {
    id: 'bom-nr-5',
    component: 'Thermal Interface Materials',
    category: 'thermal',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'research-lab',
    ],
    primarySuppliers: ['Henkel (Bergquist)', 'Dow Corning', 'Laird Performance Materials', 'Parker Chomerics'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Widely available from multiple manufacturers',
      'Standard thermal compounds, pads, and gap fillers',
      'Large commercial electronics market drives production',
    ],
    leadTime: '1-3 weeks',
    alternatives: [
      'Indium foil (higher performance, higher cost)',
      'Carbon-based thermal interface materials',
    ],
    notes: 'Thermal interface materials (thermal paste, pads, gap fillers) are commodity products of the electronics cooling industry. Space qualification is straightforward for outgassing-compliant grades.',
  },
  {
    id: 'bom-nr-6',
    component: 'Standard Connectors (MIL-SPEC)',
    category: 'avionics',
    usedIn: [
      'habitat-small', 'habitat-large', 'fabrication-facility', 'orbital-data-center',
      'propellant-depot', 'solar-array-small', 'space-tug', 'research-lab', 'debris-removal',
    ],
    primarySuppliers: ['TE Connectivity', 'Amphenol', 'Glenair', 'ITT Cannon'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Commodity aerospace/defense hardware',
      'Multiple large global suppliers',
      'Standard MIL-DTL-38999 and MIL-DTL-83513 specifications',
    ],
    leadTime: '2-6 weeks',
    alternatives: [
      'Micro-D connectors (smaller, lighter)',
      'Fiber optic connectors (for data)',
    ],
    notes: 'Military-specification electrical connectors are a large commodity market. Space-qualified variants with outgassing compliance are readily available from multiple vendors.',
  },
  {
    id: 'bom-nr-7',
    component: 'Freeze-Dried Food Supplies',
    category: 'life_support',
    usedIn: ['habitat-small', 'habitat-large'],
    primarySuppliers: ['NASA JSC Food Lab', 'Perma-Pak', 'Mountain House (Oregon Freeze Dry)', 'Custom suppliers'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Multiple civilian and military food suppliers',
      'Established NASA food qualification process',
      'Commercial freeze-dried food industry is large',
    ],
    leadTime: '2-4 weeks (catalog), 2-3 months (custom formulations)',
    alternatives: [
      'Shelf-stable retort pouches',
      'Fresh food (short shelf life, resupply-dependent)',
      'In-orbit plant growth (supplementary only)',
    ],
    notes: 'Space food is a commodity product leveraging the large commercial freeze-dried food industry. NASA has decades of experience qualifying and providing crew provisions.',
  },
  {
    id: 'bom-nr-8',
    component: 'Polyethylene Radiation Shielding',
    category: 'structure',
    usedIn: ['habitat-small', 'habitat-large', 'orbital-data-center'],
    primarySuppliers: ['Multiple polymer manufacturers', 'Braskem', 'SABIC', 'LyondellBasell'],
    riskLevel: 'no-risk',
    riskFactors: [
      'Commodity polymer — one of the most widely produced plastics',
      'High hydrogen content makes it effective radiation shielding',
      'Can be fabricated into tiles, blocks, or conformal shapes',
    ],
    leadTime: '1-2 weeks (stock), 4-6 weeks (custom shapes)',
    alternatives: [
      'Water shielding (dual-purpose)',
      'Borated polyethylene (enhanced neutron shielding)',
      'Regolith-based shielding (for lunar surface)',
    ],
    notes: 'High-density polyethylene (HDPE) is an effective and inexpensive radiation shielding material. Its high hydrogen content is excellent at stopping secondary neutrons from galactic cosmic rays.',
  },
];

// ── Helper Functions ──────────────────────────────

export function getBOMRiskItems(): BOMRiskItem[] {
  return BOM_RISK_ITEMS;
}

export function getBOMRiskItemsByLevel(level: BOMRiskLevel): BOMRiskItem[] {
  return BOM_RISK_ITEMS.filter((item) => item.riskLevel === level);
}

export function getBOMRiskItemsByCategory(category: BOMCategory): BOMRiskItem[] {
  return BOM_RISK_ITEMS.filter((item) => item.category === category);
}

export function getBOMRiskItemsBySystem(systemSlug: string): BOMRiskItem[] {
  return BOM_RISK_ITEMS.filter((item) => item.usedIn.includes(systemSlug));
}

export function getBOMRiskStats() {
  const items = BOM_RISK_ITEMS;
  return {
    total: items.length,
    critical: items.filter((i) => i.riskLevel === 'critical').length,
    high: items.filter((i) => i.riskLevel === 'high').length,
    medium: items.filter((i) => i.riskLevel === 'medium').length,
    low: items.filter((i) => i.riskLevel === 'low').length,
    noRisk: items.filter((i) => i.riskLevel === 'no-risk').length,
  };
}

export function getAllBOMCategories(): BOMCategory[] {
  return Array.from(new Set(BOM_RISK_ITEMS.map((item) => item.category))).sort() as BOMCategory[];
}

export function getAllUsedInSystems(): string[] {
  const systems = new Set<string>();
  for (const item of BOM_RISK_ITEMS) {
    for (const sys of item.usedIn) {
      systems.add(sys);
    }
  }
  return Array.from(systems).sort();
}
