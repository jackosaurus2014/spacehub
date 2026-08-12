/**
 * Load script: Discovery Dataset (2026-08)
 *
 * Loads the curated "discovery" pass gathered 2026-08-12: ~49 new
 * space-industry company minimal profiles (US, space-adjacent, YC
 * early-stage, and international — Europe / Asia-Pacific / China / Middle
 * East), their funding rounds where verified, plus missed rounds and field
 * corrections for companies already tracked in the database (including two
 * guarded renames: Aetherflux -> Cowboy Space Corp, ABL Space Systems ->
 * Long Wall).
 *
 * Structural template: scripts/refresh-startup-funding-2026.ts — same
 * CompanyResolver (normalized-name + slug lookup with alias support),
 * idempotent FundingRound creation (skip when a row already exists for the
 * same companyId + seriesLabel + year/month), minimal-profile creation for
 * unmatched companies, guarded corrections, and a summary printout.
 *
 * IDEMPOTENT — safe to run more than once:
 *  - Companies are matched by normalized name / slug (plus a small
 *    alias list for tracked companies whose dataset name may not match
 *    their stored name) before creating.
 *  - Funding rounds are skipped if a row already exists for the same
 *    companyId + seriesLabel + year/month of date.
 *  - Company field corrections are plain field sets (re-applying is a
 *    no-op).
 *  - Renames are guarded: skipped once the stored name already equals the
 *    target name.
 *
 * Known dataset adaptations (see full list in the script header comments
 * inline below each affected record):
 *  - Zeno Power's Series B ($50M) has no date in the source dataset; since
 *    FundingRound.date is required (non-nullable) in the schema, no round
 *    row is created for it — only the company profile.
 *  - A few sector/country fields were dataset-compound (e.g. "comms/
 *    ground-segment", "US-JP") and were collapsed to a single value; see
 *    inline comments.
 *
 * Usage:
 *   npx tsx scripts/load-discovery-2026-08.ts
 */

import prisma from '../src/lib/db';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function utcDate(iso: string): Date {
  // All dataset dates are YYYY-MM-DD (day '01' used for month-precision
  // sources, noted in the round's `notes` field); parse as UTC midnight so
  // local timezone can't shift the month, which would break the
  // year/month idempotency check.
  return new Date(`${iso}T00:00:00.000Z`);
}

// ────────────────────────────────────────────────────────────────
// Company resolver (name/slug matching against existing profiles)
// ────────────────────────────────────────────────────────────────

interface ProfileRef {
  id: string;
  slug: string;
  name: string;
}

class CompanyResolver {
  private profiles: ProfileRef[] = [];
  private byNormName = new Map<string, ProfileRef>();
  private bySlug = new Map<string, ProfileRef>();

  async load() {
    const rows = await prisma.companyProfile.findMany({
      select: { id: true, slug: true, name: true },
    });
    this.profiles = rows;
    this.byNormName.clear();
    this.bySlug.clear();
    for (const p of rows) {
      this.byNormName.set(normalize(p.name), p);
      this.bySlug.set(normalize(p.slug), p);
    }
  }

  resolve(name: string): ProfileRef | undefined {
    const n = normalize(name);
    return this.byNormName.get(n) ?? this.bySlug.get(n);
  }

  register(p: ProfileRef) {
    this.profiles.push(p);
    this.byNormName.set(normalize(p.name), p);
    this.bySlug.set(normalize(p.slug), p);
  }
}

// Tracked companies whose dataset name may not match the name currently
// stored in the DB (e.g. because this very script renames them, or because
// the DB uses a fuller legal-ish name). Each list is tried in order; the
// first match against the resolver's snapshot (taken once, at start of
// run) wins. This makes resolution correct on both the first run (old
// name still in DB) and subsequent runs (new name now in DB).
const AETHERFLUX_NAMES = ['Aetherflux', 'Cowboy Space Corp', 'Cowboy Space'];
const ABL_NAMES = ['ABL Space Systems', 'Long Wall'];
const KATALYST_NAMES = ['Katalyst Space', 'Katalyst Space Technologies'];

function resolveAny(resolver: CompanyResolver, names: string[]): ProfileRef | undefined {
  for (const n of names) {
    const hit = resolver.resolve(n);
    if (hit) return hit;
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────────
// Part 1 data — new company minimal profiles (dataset sections A + D)
// ────────────────────────────────────────────────────────────────

interface NewCompanyInfo {
  name: string;
  description: string;
  country: string; // ISO-2
  headquarters?: string;
  foundedYear?: number;
  sector: string;
  dataCompleteness: number; // 25 default, 15 for YC profile-only entries
  isPublic?: boolean;
  ticker?: string;
  exchange?: string;
  ownershipType?: string; // default 'private'
}

const NEW_COMPANIES: NewCompanyInfo[] = [
  // -- Section A: US (dataCompleteness 25) --
  { name: 'Starcloud', description: 'Builds GPU data centers in low Earth orbit; flew the first Nvidia H100 satellite in November 2025.', country: 'US', headquarters: 'Redmond, WA, US', foundedYear: 2024, sector: 'space-infrastructure', dataCompleteness: 25 },
  // Dataset sector given as "comms/ground-segment" (compound); collapsed to the more specific 'ground-segment'.
  { name: 'Northwood Space', description: 'Vertically-integrated satellite ground stations.', country: 'US', headquarters: 'El Segundo, CA, US', foundedYear: 2023, sector: 'ground-segment', dataCompleteness: 25 },
  { name: 'Lux Aeterna', description: 'Developer of the Delphi reusable, reentry-survivable satellite bus.', country: 'US', headquarters: 'Denver, CO, US', sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'Samara Aerospace', description: 'Developer of vibration-cancellation structures for satellite stability.', country: 'US', headquarters: 'San Francisco, CA, US', sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'Aethero', description: 'Developer of space-grade edge computing hardware.', country: 'US', headquarters: 'San Francisco, CA, US', foundedYear: 2023, sector: 'space-infrastructure', dataCompleteness: 25 },
  { name: 'Sophia Space', description: 'Developer of passively-cooled orbital compute tiles; a Caltech spinout.', country: 'US', headquarters: 'California, US', sector: 'space-infrastructure', dataCompleteness: 25 },
  { name: 'Apolink', description: 'Developer of a hybrid RF-optical inter-satellite relay network.', country: 'US', headquarters: 'Palo Alto, CA, US', foundedYear: 2024, sector: 'comms', dataCompleteness: 25 },

  // -- Section A: space-adjacent (dataCompleteness 25) --
  { name: 'Zeno Power', description: 'Developer of radioisotope power systems (nuclear batteries) for spacecraft.', country: 'US', sector: 'space-energy', dataCompleteness: 25 },
  { name: 'Antares Industries', description: 'Developer of the R1 modular nuclear microreactor for remote and space power, with Space Force, DIU, and NASA contracts.', country: 'US', headquarters: 'Torrance, CA, US', foundedYear: 2023, sector: 'space-energy', dataCompleteness: 25 },
  { name: 'Observable Space', description: 'Developer of laser-communication terminals for satellite and data-center links.', country: 'US', sector: 'comms', dataCompleteness: 25 },
  { name: 'Endeavor Optical Networks', description: 'Developer of a laser-satellite constellation for data-center traffic. Also known as EON.', country: 'US', foundedYear: 2026, sector: 'comms', dataCompleteness: 25 },
  { name: 'SkyFi', description: 'AI-powered Earth-intelligence platform offering on-demand satellite imagery tasking.', country: 'US', headquarters: 'Austin, TX, US', sector: 'analytics', dataCompleteness: 25 },
  { name: 'Ravee Optics', description: 'Developer of meta-optics for compact laser-communication terminals.', country: 'US', headquarters: 'Dayton, OH, US', foundedYear: 2024, sector: 'comms', dataCompleteness: 25 },
  { name: 'Diffraqtion', description: 'Developer of quantum-camera satellite payloads; an MIT/UMD spinout.', country: 'US', sector: 'analytics', dataCompleteness: 25 },
  // 'BlueStar Optical Domain' removed 2026-08-12: company name could not be
  // corroborated (the cited SpaceNews article is real but never names the firm
  // in any accessible source). Deleted from prod; do not re-seed.
  // Dataset lists dual HQ/country "Los Angeles/Tokyo, US-JP"; first-listed location (US) used for the ISO-2 country field.
  { name: 'GITAI', description: 'Developer of space labor robots for stations, lunar surface operations, and satellite servicing.', country: 'US', headquarters: 'Los Angeles, CA, US / Tokyo, Japan', sector: 'robotics', dataCompleteness: 25 },

  // -- Section A: YC early-stage, profile only (dataCompleteness 15) --
  { name: 'Dispatch', description: 'Developer of refurbishable reentry vehicles; flew a Mach 20+ heat-shield test.', country: 'US', headquarters: 'San Francisco, CA, US', foundedYear: 2025, sector: 'in-space-manufacturing', dataCompleteness: 15 },
  { name: 'Reditus Space', description: 'Developer of reusable reentry capsules for zero-gravity manufacturing; first orbital recovery mission planned for March 2026.', country: 'US', headquarters: 'Atlanta, GA, US', foundedYear: 2024, sector: 'in-space-manufacturing', dataCompleteness: 15 },
  { name: 'Basalt', description: 'Developer of AI-controlled satellite constellations (Diamond AI); flew the Spirit-EEL mission.', country: 'US', headquarters: 'San Francisco, CA, US', foundedYear: 2023, sector: 'software', dataCompleteness: 15 },
  { name: 'Beyond Reach Labs', description: 'Developer of deployable solar arrays and radiators, with over $175M in customer LOIs.', country: 'US', headquarters: 'New York, NY, US', foundedYear: 2023, sector: 'space-infrastructure', dataCompleteness: 15 },
  { name: 'Cascade Space', description: 'Developer of a commercial deep-space ground-station network for lunar downlink.', country: 'US', headquarters: 'San Francisco, CA, US', foundedYear: 2025, sector: 'comms', dataCompleteness: 15 },
  { name: 'Constellation Space', description: 'Developer of machine-learning link-failure prediction for satellite fleets; backers include Nvidia, OpenAI, and Samsung Next.', country: 'US', headquarters: 'Seattle, WA, US', foundedYear: 2025, sector: 'software', dataCompleteness: 15 },
  { name: 'Wardstone', description: 'Developer of modular space-based interceptor platforms.', country: 'US', headquarters: 'Los Angeles, CA, US', foundedYear: 2025, sector: 'defense-space', dataCompleteness: 15 },
  { name: 'Orbital Operations', description: 'Developer of a reusable liquid-hydrogen orbital defense vehicle.', country: 'US', headquarters: 'Los Angeles, CA, US', foundedYear: 2024, sector: 'defense-space', dataCompleteness: 15 },

  // -- Section D: Europe (dataCompleteness 25) --
  // Dataset lists dual HQ/country "Bordeaux/Munich, FR/DE"; first-listed location (FR) used for the ISO-2 country field.
  { name: 'The Exploration Company', description: 'Developer of the Nyx reusable orbital return capsule for cargo and crew.', country: 'FR', headquarters: 'Bordeaux, France / Munich, Germany', foundedYear: 2021, sector: 'in-space-transportation', dataCompleteness: 25 },
  { name: 'Constellr', description: 'Operator of a thermal-infrared Earth observation constellation for agriculture, water, and defense applications.', country: 'DE', headquarters: 'Freiburg, Germany', foundedYear: 2020, sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'Reflex Aerospace', description: 'Manufacturer of customizable satellite buses for civil and defense customers.', country: 'DE', headquarters: 'Berlin, Germany / Munich, Germany', foundedYear: 2021, sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'ATMOS Space Cargo', description: 'Developer of the PHOENIX recoverable in-orbit cargo capsule, already flown.', country: 'DE', headquarters: 'Lichtenau, Germany', foundedYear: 2021, sector: 'in-space-transportation', dataCompleteness: 25 },
  { name: 'Aerospacelab', description: 'Operator of a scaled satellite manufacturing megafactory.', country: 'BE', headquarters: 'Charleroi, Belgium', foundedYear: 2018, sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'OroraTech', description: 'Operator of a thermal-infrared wildfire-detection satellite constellation.', country: 'DE', headquarters: 'Munich, Germany', foundedYear: 2018, sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'U-Space', description: 'Manufacturer of small satellites, with CNES contracts.', country: 'FR', headquarters: 'Toulouse, France', foundedYear: 2018, sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'NewOrbit', description: 'Developer of very-low-Earth-orbit (VLEO) satellites.', country: 'GB', headquarters: 'Reading, UK', sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'SatVu', description: 'Operator of the HotSat thermal-infrared satellite constellation. Legal name Satellite Vu.', country: 'GB', headquarters: 'London, UK', sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'Magdrive', description: 'Developer of high-thrust metal-propellant electric propulsion.', country: 'GB', headquarters: 'Harwell, UK', foundedYear: 2019, sector: 'propulsion', dataCompleteness: 25 },
  { name: 'Spaceflux', description: 'Operator of an optical/SWIR telescope network with AI-based space situational awareness; UK government and MDA contracts.', country: 'GB', headquarters: 'London, UK', foundedYear: 2022, sector: 'space-situational-awareness', dataCompleteness: 25 },
  { name: 'Oxford Space Systems', description: 'Manufacturer of deployable antennas (Wrapped Rib SAR), with 5 in-orbit deployments.', country: 'GB', headquarters: 'Harwell, UK', foundedYear: 2013, sector: 'satellite-manufacturing', dataCompleteness: 25 },

  // -- Section D: Asia-Pacific (dataCompleteness 25) --
  { name: 'ElevationSpace', description: 'Developer of the ELS-R small reentry cargo vehicle.', country: 'JP', headquarters: 'Sendai, Japan', foundedYear: 2021, sector: 'in-space-transportation', dataCompleteness: 25 },
  { name: 'ispace', description: "Developer of lunar landers and rovers; leads ESA's first commercial lunar rover mission.", country: 'JP', headquarters: 'Tokyo, Japan', foundedYear: 2010, sector: 'lunar', dataCompleteness: 25, isPublic: true, ticker: '9348', exchange: 'TSE', ownershipType: 'public' },
  { name: 'PierSight Space', description: 'Developer of a SAR and AIS maritime surveillance satellite constellation; the Varuna demo satellite has flown.', country: 'IN', headquarters: 'Ahmedabad, India', foundedYear: 2023, sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'TakeMe2Space', description: 'Developer of in-orbit AI compute satellites (OrbitLab); MOI-1 flew in January 2026.', country: 'IN', headquarters: 'Hyderabad, India', foundedYear: 2024, sector: 'space-infrastructure', dataCompleteness: 25 },
  { name: 'SatSure', description: 'Provider of Earth observation decision-intelligence and AI foundation models for agriculture and climate.', country: 'IN', headquarters: 'Bengaluru, India', foundedYear: 2017, sector: 'analytics', dataCompleteness: 25 },
  { name: 'Manastu Space', description: 'Developer of green propulsion and collision-avoidance systems, flight-proven on PSLV.', country: 'IN', headquarters: 'Mumbai, India', foundedYear: 2017, sector: 'propulsion', dataCompleteness: 25 },
  { name: 'Unastella', description: 'Developer of liquid-propellant small launch vehicles; launched the first private rocket from South Korean soil in May 2025.', country: 'KR', headquarters: 'Seoul, South Korea', foundedYear: 2022, sector: 'launch', dataCompleteness: 25 },
  { name: 'TelePIX', description: 'Developer of optical payloads and onboard AI (TetraPLEX flown; BlueBON satellite).', country: 'KR', headquarters: 'Seoul, South Korea', foundedYear: 2019, sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'Skykraft', description: 'Provider of satellite VHF communications and surveillance for air traffic management.', country: 'AU', headquarters: 'Canberra, Australia', foundedYear: 2017, sector: 'satellite-manufacturing', dataCompleteness: 25 },

  // -- Section D: China (dataCompleteness 25) --
  { name: 'Orienspace', description: 'Developer of the Gravity-1 (flown) and reusable Gravity-2 launch vehicles.', country: 'CN', headquarters: 'Yantai, China', foundedYear: 2020, sector: 'launch', dataCompleteness: 25 },
  { name: 'Deep Blue Aerospace', description: 'Developer of the Nebula-1 VTVL reusable rocket.', country: 'CN', headquarters: 'Beijing, China', foundedYear: 2016, sector: 'launch', dataCompleteness: 25 },
  { name: 'GalaxySpace', description: 'Operator of a flat-panel LEO broadband satellite constellation.', country: 'CN', headquarters: 'Beijing, China', sector: 'satellite-operator', dataCompleteness: 25 },

  // -- Section D: Middle East (dataCompleteness 25) --
  { name: 'Ramon.Space', description: 'Developer of radiation-tolerant onboard computing; holds a Eutelsat OneWeb contract.', country: 'IL', sector: 'space-infrastructure', dataCompleteness: 25 },
];

// ────────────────────────────────────────────────────────────────
// Part 2 data — funding rounds for the new companies above
// ────────────────────────────────────────────────────────────────

interface RoundInput {
  companyName: string;
  date: string; // YYYY-MM-DD
  amount: number; // full USD
  seriesLabel: string | null;
  roundType: string;
  postValuation?: number;
  leadInvestor?: string;
  investors?: string[];
  source: string;
  sourceUrl: string | null;
  notes?: string;
}

const NEW_COMPANY_ROUNDS: RoundInput[] = [
  { companyName: 'Starcloud', date: '2026-03-30', amount: 170_000_000, seriesLabel: 'Series A', roundType: 'equity', postValuation: 1_100_000_000, leadInvestor: 'Benchmark / EQT Ventures', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/03/30/starcloud-raises-170-million-series-ato-build-data-centers-in-space/' },
  { companyName: 'Northwood Space', date: '2025-04-23', amount: 30_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Alpine Space Ventures / a16z', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/northwood-raises-30-million-to-establish-ground-station-network/' },
  { companyName: 'Lux Aeterna', date: '2025-06-25', amount: 10_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Space Capital', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/lux-aeterna-raises-10-million-for-reusable-satellite-ahead-of-2027-demo/' },
  { companyName: 'Samara Aerospace', date: '2026-01-20', amount: 10_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Balerion Space Ventures', source: 'Payload', sourceUrl: 'https://payloadspace.com/samara-closes-10m-seed-round/' },
  { companyName: 'Aethero', date: '2025-06-10', amount: 8_400_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Kindred Ventures', source: 'Business Wire', sourceUrl: 'https://www.businesswire.com/news/home/20250610441726/en/' },
  { companyName: 'Sophia Space', date: '2026-02-26', amount: 10_000_000, seriesLabel: 'Seed', roundType: 'equity', investors: ['Alpha Funds', 'KDDI', 'Unlock'], notes: 'No single lead investor per source.', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/02/26/sophia-space-raises-10m-seed-to-demo-novel-space-computers/' },
  { companyName: 'Apolink', date: '2025-07-11', amount: 4_300_000, seriesLabel: 'Seed', roundType: 'equity', postValuation: 45_000_000, notes: 'No single lead investor per source (four co-investors).', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2025/07/11/yc-backed-apolink-by-19-year-old-bags-4-3m-to-build-24-7-connectivity-for-leo-satellites/' },
  // Zeno Power's Series B ($50M) has no date in the source dataset ("date null"); FundingRound.date is
  // required (non-nullable) in the Prisma schema, so no round row is created here — profile only.
  { companyName: 'Antares Industries', date: '2025-12-02', amount: 96_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Shine Capital', source: 'Interesting Engineering', sourceUrl: 'https://interestingengineering.com/energy/power-earth-space-with-modular-nuclear-reactor' },
  { companyName: 'Observable Space', date: '2026-05-28', amount: 90_000_000, seriesLabel: 'Debut Round', roundType: 'equity', leadInvestor: 'Lux Capital', investors: ['Upfront', 'Detroit VP', 'Island Green', 'RTX Ventures'], notes: 'Co-leads per source.', source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com/news/articles/2026-05-28/space-startup-raises-funds-for-laser-satellite-communications' },
  { companyName: 'Endeavor Optical Networks', date: '2026-08-04', amount: 10_750_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'General Catalyst / Andreessen Horowitz', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/08/04/eon-wants-to-move-the-data-superhighway-from-ocean-fiber-to-space-lasers/' },
  { companyName: 'SkyFi', date: '2026-01-14', amount: 12_700_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Buoyant Ventures / IronGate', source: 'SkyFi', sourceUrl: 'https://skyfi.com/en/press/skyfi-series-a-12-7-million-2026' },
  { companyName: 'Ravee Optics', date: '2026-07-13', amount: 6_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'BIG Global Investment JSC', source: 'Fundraise Insider', sourceUrl: 'https://fundraiseinsider.com/blog/ravee-optics-raises-6m-seed-for-satellite-laser-terminals/' },
  { companyName: 'Diffraqtion', date: '2026-01-13', amount: 4_200_000, seriesLabel: 'Pre-Seed', roundType: 'equity', leadInvestor: 'QDNL Participations', source: 'The Quantum Insider', sourceUrl: 'https://thequantuminsider.com/2026/01/13/diffraqtion-raises-4-2-million-to-build-quantum-camera-enabled-satellite-and-telescope-constellations/' },
  // BlueStar Optical Domain round removed — see note in COMPANY_INFO above.
  { companyName: 'GITAI', date: '2024-11-13', amount: 15_500_000, seriesLabel: 'Round', roundType: 'equity', notes: "Series label not specified in source; transcribed literally as 'Round'. No single lead investor named.", source: 'GITAI', sourceUrl: 'https://gitai.tech/news' },

  { companyName: 'The Exploration Company', date: '2024-11-01', amount: 160_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Balderton Capital / Plural', notes: 'Date precision is month-only per source; sourceUrl unverified.', source: 'TechFundingNews / Balderton (press reporting)', sourceUrl: null },
  { companyName: 'Constellr', date: '2024-02-10', amount: 44_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Alpine Space Ventures / Lakestar', notes: 'Original: €37M.', source: 'Constellr', sourceUrl: 'https://www.constellr.com/article/constellr-secures-eu37-million-series-a-funding-to-deliver-defence-grade-thermal-intelligence' },
  { companyName: 'Reflex Aerospace', date: '2025-11-04', amount: 57_500_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Human Element', notes: 'Original: €50M.', source: 'Reflex Aerospace', sourceUrl: 'https://www.reflexaerospace.com/press-releases/reflex-aerospace-series-a' },
  { companyName: 'ATMOS Space Cargo', date: '2026-04-22', amount: 29_800_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Expansion / Balnord', notes: 'Original: €25.7M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/atmos-space-cargo-raises-e25-7-million-to-begin-space-return-operations/' },
  { companyName: 'Aerospacelab', date: '2025-08-26', amount: 110_000_000, seriesLabel: 'Series B', roundType: 'equity', notes: 'Original: €94M. No single lead investor named.', source: 'Aerospacelab', sourceUrl: 'https://www.aerospacelab.com/blog/press-releases-1/aerospacelab-secures-94-million-eur-110-million-usd-to-accelerate-its-ambitious-roadmap-35' },
  { companyName: 'OroraTech', date: '2024-10-15', amount: 27_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Korys / European Circular Bioeconomy Fund', notes: 'Original: €25M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/ororatech-secures-e25m-series-b-to-expand-wildfire-monitoring-service/' },
  { companyName: 'U-Space', date: '2025-11-12', amount: 27_800_000, seriesLabel: 'Series A', roundType: 'equity', notes: 'Original: €24M. No single lead investor named.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/french-satellite-manufacturer-u-space-raises-e24m-in-series-a-funding/' },
  { companyName: 'NewOrbit', date: '2026-06-08', amount: 18_500_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Voyager Ventures', source: 'NewOrbit', sourceUrl: 'https://neworbit.space/news/we-raised-usd18-5m-to-open-earth-s-last-empty-orbit' },
  { companyName: 'SatVu', date: '2026-02-17', amount: 40_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Molten Ventures', investors: ['NATO Innovation Fund', 'Lockheed Martin'], notes: 'Original: £30M.', source: 'Satellite Vu', sourceUrl: 'https://www.satellitevu.com/news/nato-innovation-fund-backs-thermal-intelligence-with-multi-million-satvu-investment' },
  { companyName: 'Magdrive', date: '2025-02-25', amount: 10_500_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Redalpine', investors: ['Founders Fund'], source: 'UKspace', sourceUrl: 'https://www.ukspace.org/magdrive-raises-10-5m-seed-funding-to-enable-a-new-era-of-sustainable-space-exploration/' },
  { companyName: 'Spaceflux', date: '2026-04-27', amount: 4_400_000, seriesLabel: 'Seed Extension', roundType: 'equity', leadInvestor: 'Blackfinch Ventures', notes: 'Original: £3.5M; single-source.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/spaceflux-extends-funding-round-bringing-total-to-9-million/' },
  { companyName: 'Oxford Space Systems', date: '2024-01-15', amount: 3_800_000, seriesLabel: 'Growth', roundType: 'equity', notes: 'Original: £3M. No single lead investor named.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/oxford-space-systems-secures-3m-in-additional-funding/' },

  { companyName: 'ElevationSpace', date: '2026-06-19', amount: 40_000_000, seriesLabel: 'Series B', roundType: 'equity', notes: 'Original: ¥6.4B. No single lead investor named (Beyond Next Ventures et al.).', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/elevationspace-advances-work-on-commercial-reentry-vehicle/' },
  { companyName: 'PierSight Space', date: '2025-05-30', amount: 8_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Alpha Wave Ventures / Elevation Capital', notes: 'Cumulative total per source.', source: 'Crescent Enterprises', sourceUrl: 'https://www.crescententerprises.com/news/space-tech-startup-piersight-adds-strategic-investors-bringing-total-funding-to-8-million/' },
  { companyName: 'TakeMe2Space', date: '2026-01-08', amount: 5_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Chiratae Ventures', notes: 'Original: ₹44.9 crore.', source: 'Inc42', sourceUrl: 'https://inc42.com/buzz/takeme2space-raises-5-mn-to-expand-its-satellite-constellation/' },
  { companyName: 'SatSure', date: '2023-08-29', amount: 15_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Baring PE India / Promus Ventures', source: 'Reuters', sourceUrl: 'https://www.reuters.com/science/indias-satsure-bags-26-million-grant-build-ai-powered-earth-observation-models-2026-06-11/' },
  { companyName: 'Manastu Space', date: '2023-10-26', amount: 3_000_000, seriesLabel: 'Bridge', roundType: 'equity', leadInvestor: 'Indian Angel Network', source: 'Inc42', sourceUrl: 'https://inc42.com/buzz/spacetech-startup-manastu-bags-another-3-mn-in-less-than-two-months/' },
  { companyName: 'Unastella', date: '2026-06-01', amount: 24_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Altos Ventures', notes: 'Original: ₩33.5B.', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/06/01/unastella-a-south-korean-rocket-startup-that-launched-from-home-raises-24m/' },
  { companyName: 'TelePIX', date: '2026-03-01', amount: 11_000_000, seriesLabel: 'Pre-IPO', roundType: 'equity', notes: 'Original: ₩15B; date precision is month-only per source; single-source; no single lead investor named.', source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/telepix-unveils-first-high-resolution-images-from-bluebonthe-worlds-first-blue-carbon-monitoring-satellite-302469013.html' },
  { companyName: 'Skykraft', date: '2023-10-17', amount: 78_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Foresight Australia', notes: 'Original: A$120M.', source: 'SmartCompany', sourceUrl: 'https://www.smartcompany.com.au/startupsmart/skykraft-canberra-satellite-maker-raises-120-million/' },

  { companyName: 'Orienspace', date: '2026-08-05', amount: 14_800_000, seriesLabel: 'Pre-C', roundType: 'equity', leadInvestor: 'Vertex Capital', notes: 'RMB ~100M tranche; RMB 1.7B+ raised across 5 rounds total per source; targeting IPO.', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/chinese-launch-startup-orienspace-targets-ipo-secures-funding-for-reusable-gravity-2-rocket/' },
  // Deep Blue Aerospace and GalaxySpace: profile only per dataset (round amount undisclosed/unconfirmed) — no round row.

  { companyName: 'Ramon.Space', date: '2023-06-28', amount: 26_000_000, seriesLabel: 'Growth', roundType: 'equity', investors: ['Ingrasys (Foxconn)', 'Abu Dhabi SDF'], notes: 'No single lead investor named.', source: 'Calcalist', sourceUrl: 'https://www.calcalistech.com/ctechnews/article/hynhfqyun' },
];

// ────────────────────────────────────────────────────────────────
// Part 3 data — rounds for TRACKED companies (dataset sections B + D2)
// ────────────────────────────────────────────────────────────────

interface TrackedRoundInput extends Omit<RoundInput, 'companyName'> {
  companyNames: string[];
}

const TRACKED_ROUNDS: TrackedRoundInput[] = [
  { companyNames: AETHERFLUX_NAMES, date: '2025-04-02', amount: 50_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Index Ventures / Interlagos', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2025/04/02/space-solar-startup-aetherflux-raises-50m-to-launch-first-space-demo-in-2026/' },
  { companyNames: AETHERFLUX_NAMES, date: '2026-05-08', amount: 275_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Index Ventures', investors: ['IVP', 'Blossom', 'SAIC'], notes: 'Corroborated by Business Wire: https://www.businesswire.com/news/home/20260508036993/en/', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/cowboy-raises-275-million-to-build-rockets-with-orbital-data-center-upper-stages/' },
  { companyNames: ['CesiumAstro'], date: '2026-02-02', amount: 470_000_000, seriesLabel: 'Series C', roundType: 'equity', notes: 'Equity + debt. No single lead investor named.', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/cesiumastro-to-scale-operations-with-470-million-in-equity-and-debt-financing/' },
  { companyNames: ['Hermeus'], date: '2026-04-07', amount: 350_000_000, seriesLabel: 'Growth', roundType: 'equity', postValuation: 1_000_000_000, leadInvestor: 'Khosla Ventures', notes: '$200M equity + $150M debt.', source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/04/07/hermeus-raises-350m-to-build-unmanned-hypersonic-fighters/' },
  { companyNames: ['Gilmour Space'], date: '2026-01-20', amount: 145_000_000, seriesLabel: 'Series E', roundType: 'equity', postValuation: 1_000_000_000, leadInvestor: 'National Reconstruction Fund Corp & Hostplus', notes: 'Original: A$217M.', source: 'StartupDaily', sourceUrl: 'https://www.startupdaily.net/topic/funding/rocket-fuel-gilmour-space-hits-unicorn-status-after-217-million-series-e/' },
  { companyNames: ['Gilmour Space'], date: '2026-05-28', amount: 14_200_000, seriesLabel: 'Series E Extension', roundType: 'equity', leadInvestor: 'Australian Retirement Trust (QIC)', source: 'Forbes Australia', sourceUrl: 'https://www.forbes.com.au/news/entrepreneurs/aussie-space-unicorn-scores-fresh-14-2m-amid-spacex-ipo-frenzy/' },
  { companyNames: ['HyImpulse'], date: '2025-10-16', amount: 52_500_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Campus Founders Ventures', notes: 'Original: €45M (€15M equity + €30M additional).', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/german-launch-startup-hyimpulse-raises-45-million-euros/' },
  { companyNames: ['Hubble Network'], date: '2025-09-17', amount: 70_000_000, seriesLabel: 'Series B', roundType: 'equity', notes: 'No single lead investor named.', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/hubble-network-raises-70-million-to-accelerate-60-satellite-bluetooth-constellation/' },
  { companyNames: ['Lunar Outpost'], date: '2026-05-08', amount: 30_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Industrious Ventures', source: 'Payload', sourceUrl: 'https://payloadspace.com/lunar-outpost-closes-30m-series-b-unveils-new-rover/' },
  { companyNames: KATALYST_NAMES, date: '2026-06-16', amount: 12_000_000, seriesLabel: null, roundType: 'equity', leadInvestor: 'Geodesic Capital', notes: 'Funds first GEO servicing mission Nexus-1; aggregators label this a Series A. Series label left null per source.', source: 'Katalyst Space', sourceUrl: 'https://www.katalystspace.com/news/katalyst-raises-12m-to-send-space-robot-to-geo-for-satellite-servicing' },
  { companyNames: ['HawkEye 360'], date: '2025-12-18', amount: 150_000_000, seriesLabel: 'Series E', roundType: 'equity', leadInvestor: 'NightDragon / Center15 Capital', source: 'Payload', sourceUrl: 'https://payloadspace.com/hawkeye-360-closes-150m-financing-round-acquires-innovative-signal-analysis/' },
  { companyNames: ['HawkEye 360'], date: '2026-05-07', amount: 416_000_000, seriesLabel: 'IPO', roundType: 'ipo', postValuation: 3_150_000_000, notes: 'NYSE: HAWK, priced $26/share, +30.8% debut.', source: 'Reuters/Payload (verified via Google News 2026-08-12)', sourceUrl: 'https://payloadspace.com/' },
  { companyNames: ['GalaxEye'], date: '2026-03-12', amount: 4_800_000, seriesLabel: 'Series A Extension', roundType: 'equity', leadInvestor: 'Mounttech Growth Fund', notes: 'Original: ₹44.2 crore.', source: 'Inc42', sourceUrl: 'https://inc42.com/buzz/exclusive-galaxeye-raises-%E2%82%B944-cr-in-ongoing-series-a-funding-round/' },
  // Section D2
  { companyNames: ['Kepler Communications'], date: '2023-04-14', amount: 92_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'IA Ventures', notes: 'Original: CAD 122.7M.', source: 'BetaKit', sourceUrl: 'https://betakit.com/kepler-communications-raises-122-7-million-cad-to-launch-more-high-speed-satellites/' },
  // CAS Space (tracked): IPO filing is intentionally EXCLUDED from this script per dataset instructions —
  // it goes into curated hub data (RECENT_IPOS / IPO_PIPELINE), not the FundingRound table.
];

// ────────────────────────────────────────────────────────────────
// Part 4 data — plain field corrections for TRACKED companies
// ────────────────────────────────────────────────────────────────

interface CorrectionInput {
  companyNames: string[];
  data: Record<string, unknown>;
}

const CORRECTIONS: CorrectionInput[] = [
  { companyNames: ['Astrobotic'], data: { status: 'acquired', parentCompany: 'Voyager Technologies' } },
  { companyNames: ['Capella Space'], data: { status: 'acquired', parentCompany: 'IonQ' } },
  { companyNames: ['HawkEye 360'], data: { isPublic: true, ticker: 'HAWK', exchange: 'NYSE', ownershipType: 'public', valuation: 3_150_000_000, lastFundingRound: 'IPO', lastFundingDate: utcDate('2026-05-07') } },
  { companyNames: ['Hermeus'], data: { valuation: 1_000_000_000, lastFundingRound: 'Growth', lastFundingDate: utcDate('2026-04-07') } },
  { companyNames: ['Gilmour Space'], data: { valuation: 1_000_000_000, lastFundingRound: 'Series E', lastFundingDate: utcDate('2026-05-28') } },
  { companyNames: ['CesiumAstro'], data: { lastFundingRound: 'Series C', lastFundingDate: utcDate('2026-02-02') } },
];

// ────────────────────────────────────────────────────────────────
// Part 5 data — guarded renames
// ────────────────────────────────────────────────────────────────

interface RenameInput {
  candidateNames: string[];
  newName: string;
  legalName?: string;
  descriptionNote: string;
  extraData: Record<string, unknown>;
}

const RENAMES: RenameInput[] = [
  {
    candidateNames: AETHERFLUX_NAMES,
    newName: 'Cowboy Space Corp',
    legalName: 'Cowboy Space Corporation',
    descriptionNote: '(formerly Aetherflux)',
    extraData: {
      totalFunding: 365_000_000,
      lastFundingRound: 'Series B',
      lastFundingDate: utcDate('2026-05-08'),
    },
  },
  {
    candidateNames: ABL_NAMES,
    newName: 'Long Wall',
    descriptionNote: '(formerly ABL Space Systems)',
    extraData: {
      sector: 'defense-space',
    },
  },
];

// ────────────────────────────────────────────────────────────────
// Round creation helper (shared by Part 2 and Part 3)
// ────────────────────────────────────────────────────────────────

interface RoundCounters {
  created: number;
  skipped: number;
  failed: number;
}

async function createRoundIfNew(company: ProfileRef, round: RoundInput, counters: RoundCounters) {
  const roundDate = utcDate(round.date);

  const existingForSeries = await prisma.fundingRound.findMany({
    where: { companyId: company.id, seriesLabel: round.seriesLabel },
    select: { id: true, date: true },
  });

  const duplicate = existingForSeries.find(
    (r) => r.date.getUTCFullYear() === roundDate.getUTCFullYear() && r.date.getUTCMonth() === roundDate.getUTCMonth()
  );

  if (duplicate) {
    counters.skipped++;
    console.log(`  = Skipped (already exists): ${company.name} — ${round.seriesLabel ?? '(no series label)'} (${round.date})`);
    return;
  }

  try {
    await prisma.fundingRound.create({
      data: {
        companyId: company.id,
        date: roundDate,
        amount: round.amount,
        currency: 'USD',
        seriesLabel: round.seriesLabel,
        roundType: round.roundType,
        postValuation: round.postValuation,
        leadInvestor: round.leadInvestor,
        investors: round.investors ?? [],
        source: round.source,
        sourceUrl: round.sourceUrl,
        notes: round.notes,
      },
    });
    counters.created++;
    console.log(`  + Created: ${company.name} — ${round.seriesLabel ?? '(no series label)'} $${(round.amount / 1_000_000).toLocaleString()}M (${round.date})`);
  } catch (err) {
    counters.failed++;
    console.error(`  ! Failed to create round for ${company.name} — ${round.seriesLabel ?? '(no series label)'}:`, err instanceof Error ? err.message : err);
  }
}

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SpaceNexus: Discovery Load (2026-08) ===');

  const resolver = new CompanyResolver();
  await resolver.load();

  // ── Part 1: new company minimal profiles ──────────────────────
  console.log('\n-- Part 1: new company profiles --\n');

  let companiesCreated = 0;
  let companiesMatched = 0;

  for (const info of NEW_COMPANIES) {
    const existing = resolver.resolve(info.name);
    if (existing) {
      companiesMatched++;
      console.log(`  = Matched existing profile: ${info.name} (already in DB as "${existing.name}")`);
      continue;
    }

    const slug = slugify(info.name);
    try {
      const created = await prisma.companyProfile.create({
        data: {
          slug,
          name: info.name,
          description: info.description,
          country: info.country,
          headquarters: info.headquarters,
          foundedYear: info.foundedYear,
          sector: info.sector,
          ownershipType: info.ownershipType ?? 'private',
          isPublic: info.isPublic ?? false,
          ticker: info.ticker,
          exchange: info.exchange,
          tier: 3,
          dataCompleteness: info.dataCompleteness,
        },
        select: { id: true, slug: true, name: true },
      });
      resolver.register(created);
      companiesCreated++;
      console.log(`  + Created: ${info.name} (slug: ${slug})`);
    } catch (err) {
      console.error(`  ! Failed to create profile for "${info.name}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${companiesCreated} created, ${companiesMatched} matched to existing profiles\n`);

  // ── Part 2: funding rounds for new companies ──────────────────
  console.log('-- Part 2: funding rounds (new companies) --\n');

  const newRoundCounters: RoundCounters = { created: 0, skipped: 0, failed: 0 };

  for (const round of NEW_COMPANY_ROUNDS) {
    const company = resolver.resolve(round.companyName);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyName} ${round.seriesLabel ?? ''} ${round.date}`);
      newRoundCounters.failed++;
      continue;
    }
    await createRoundIfNew(company, round, newRoundCounters);
  }

  console.log(`\n  Summary: ${newRoundCounters.created} created, ${newRoundCounters.skipped} skipped (already exist), ${newRoundCounters.failed} failed\n`);

  // ── Part 3: funding rounds for tracked companies ───────────────
  console.log('-- Part 3: funding rounds (tracked companies) --\n');

  const trackedRoundCounters: RoundCounters = { created: 0, skipped: 0, failed: 0 };

  for (const round of TRACKED_ROUNDS) {
    const company = resolveAny(resolver, round.companyNames);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyNames.join(' / ')} ${round.seriesLabel ?? ''} ${round.date}`);
      trackedRoundCounters.failed++;
      continue;
    }
    await createRoundIfNew(company, { ...round, companyName: company.name }, trackedRoundCounters);
  }

  console.log(`\n  Summary: ${trackedRoundCounters.created} created, ${trackedRoundCounters.skipped} skipped (already exist), ${trackedRoundCounters.failed} failed\n`);

  // ── Part 4: field corrections for tracked companies ────────────
  console.log('-- Part 4: company field corrections --\n');

  let correctionsApplied = 0;
  let correctionsSkipped = 0;

  for (const correction of CORRECTIONS) {
    const company = resolveAny(resolver, correction.companyNames);
    if (!company) {
      console.error(`  ! Skipped correction (company not resolved): ${correction.companyNames.join(' / ')}`);
      correctionsSkipped++;
      continue;
    }

    try {
      await prisma.companyProfile.update({
        where: { id: company.id },
        data: { ...correction.data, lastVerified: new Date() },
      });
      correctionsApplied++;
      console.log(`  ^ Updated: ${company.name} (${Object.keys(correction.data).join(', ')})`);
    } catch (err) {
      correctionsSkipped++;
      console.error(`  ! Failed to update ${company.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${correctionsApplied} applied, ${correctionsSkipped} skipped\n`);

  // ── Part 5: guarded renames ─────────────────────────────────────
  console.log('-- Part 5: renames --\n');

  let renamesApplied = 0;
  let renamesSkipped = 0;

  for (const rename of RENAMES) {
    const company = resolveAny(resolver, rename.candidateNames);
    if (!company) {
      console.error(`  ! Skipped rename (company not resolved): ${rename.candidateNames.join(' / ')}`);
      renamesSkipped++;
      continue;
    }

    const full = await prisma.companyProfile.findUnique({
      where: { id: company.id },
      select: { name: true, description: true },
    });

    if (!full) {
      console.error(`  ! Skipped rename (profile vanished mid-run): ${company.name}`);
      renamesSkipped++;
      continue;
    }

    if (full.name === rename.newName) {
      renamesSkipped++;
      console.log(`  = Skipped (already renamed): ${rename.newName}`);
      continue;
    }

    const description = full.description
      ? full.description.includes(rename.descriptionNote)
        ? full.description
        : `${rename.descriptionNote} ${full.description}`
      : rename.descriptionNote;

    try {
      await prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          name: rename.newName,
          ...(rename.legalName ? { legalName: rename.legalName } : {}),
          description,
          ...rename.extraData,
          lastVerified: new Date(),
        },
      });
      renamesApplied++;
      console.log(`  ^ Renamed: ${full.name} -> ${rename.newName}`);
    } catch (err) {
      renamesSkipped++;
      console.error(`  ! Failed to rename ${full.name} -> ${rename.newName}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${renamesApplied} applied, ${renamesSkipped} skipped\n`);

  console.log('=== Done ===');
  console.log(`  New companies: ${companiesCreated} created, ${companiesMatched} matched`);
  console.log(`  Funding rounds (new companies): ${newRoundCounters.created} created, ${newRoundCounters.skipped} skipped, ${newRoundCounters.failed} failed`);
  console.log(`  Funding rounds (tracked companies): ${trackedRoundCounters.created} created, ${trackedRoundCounters.skipped} skipped, ${trackedRoundCounters.failed} failed`);
  console.log(`  Corrections: ${correctionsApplied} applied, ${correctionsSkipped} skipped`);
  console.log(`  Renames: ${renamesApplied} applied, ${renamesSkipped} skipped`);
}

main()
  .catch((err) => {
    console.error('Load failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
