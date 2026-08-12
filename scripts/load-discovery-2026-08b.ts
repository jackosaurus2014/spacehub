/**
 * Load script: Discovery Dataset (2026-08) — Part B (sections E + F)
 *
 * Continuation of scripts/load-discovery-2026-08.ts, which loaded dataset
 * sections A–D (~49 new company minimal profiles + rounds/corrections for
 * tracked companies). This script loads ONLY the later curated passes:
 *
 *  - Section E ("second-wave verified findings"): missed rounds for
 *    already-tracked companies (Space Forge x2, Northwood Space Series B +
 *    field update, Zeno Power Series B, Scout Space Series A), a targeted
 *    leadInvestor enrichment on an existing Neuraspace round, an
 *    Observable Space profile enrichment (fields only, no round), and 21
 *    new minimal company profiles (ground-segment/cyber + corroborated
 *    international) with their rounds where verified.
 *  - Section F ("final sweep batch"): 19 missed rounds for tracked
 *    companies, plus 5 field corrections (2 of which append a note to an
 *    existing description rather than overwrite it).
 *
 * Sections A–D are NOT re-implemented here — see load-discovery-2026-08.ts.
 * This script assumes that script has already run (it resolves companies
 * such as Northwood Space, Zeno Power, and Observable Space that were
 * created there).
 *
 * Structural template: scripts/load-discovery-2026-08.ts — same
 * CompanyResolver (normalized-name + slug lookup with alias support),
 * idempotent FundingRound creation (skip when a row already exists for the
 * same companyId + seriesLabel + year/month), minimal-profile creation for
 * unmatched companies, guarded corrections (including guarded
 * description-append corrections), and a summary printout.
 *
 * IDEMPOTENT — safe to run more than once:
 *  - Companies are matched by normalized name / slug (plus small alias
 *    lists for companies whose dataset name may not match their stored
 *    name) before creating.
 *  - Funding rounds are skipped if a row already exists for the same
 *    companyId + seriesLabel + year/month of date.
 *  - Plain field corrections are idempotent field sets (re-applying is a
 *    no-op).
 *  - Description-append corrections (Orbex, Space Perspective) check
 *    whether the note is already present before appending.
 *  - The Neuraspace round enrichment only touches a round matched by
 *    companyId + year/month + leadInvestor IS NULL, so re-running after
 *    the first successful update finds no match and is a no-op.
 *
 * Known dataset adaptations (see inline comments at each affected record):
 *  - Several rounds carry no clean series label in the source (Cailabs,
 *    Wyvern); transcribed literally as seriesLabel 'Round' per the
 *    load-discovery-2026-08.ts GITAI precedent.
 *  - Several rows have sourceUrl null in the dataset (redirect-only /
 *    aggregator-only citations); sourceUrl is set to null while the
 *    sourceName is preserved in the `source` field.
 *  - Month-precision dates (Letara, BlueStar-style, Satellogic, BlackSky)
 *    use day '01' with a note recording the precision loss.
 *  - Portal Space Systems / Star Catcher Industries / Skylo Technologies /
 *    Rocket Factory Augsburg are resolved via small alias lists after
 *    confirming actual stored names in scripts/seed-new-companies-2026.ts,
 *    scripts/seed-batch-5-emerging.ts, and scripts/seed-new-companies-2026.ts
 *    respectively (Portal Space Systems is stored as "Portal Space"; the
 *    others matched exactly but are aliased defensively).
 *
 * Usage:
 *   npx tsx scripts/load-discovery-2026-08b.ts
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
// stored in the DB. Each list is tried in order against the resolver's
// snapshot (taken once, at start of run).
const PORTAL_NAMES = ['Portal Space Systems', 'Portal Space'];
const STAR_CATCHER_NAMES = ['Star Catcher Industries', 'Star Catcher'];
const SKYLO_NAMES = ['Skylo Technologies', 'Skylo'];
const RFA_NAMES = ['Rocket Factory Augsburg', 'RFA'];

function resolveAny(resolver: CompanyResolver, names: string[]): ProfileRef | undefined {
  for (const n of names) {
    const hit = resolver.resolve(n);
    if (hit) return hit;
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────────
// Part 1 data — new company minimal profiles (dataset section E)
// ────────────────────────────────────────────────────────────────

interface NewCompanyInfo {
  name: string;
  description: string;
  country: string; // ISO-2
  headquarters?: string;
  foundedYear?: number;
  sector: string;
  dataCompleteness: number;
  isPublic?: boolean;
  ticker?: string;
  exchange?: string;
  ownershipType?: string; // default 'private'
}

const NEW_COMPANIES_E: NewCompanyInfo[] = [
  // -- ground-segment / space-cyber --
  { name: 'Cailabs', description: 'Developer of photonics-based optical ground stations for satellite communications; over 10 stations under contract.', country: 'FR', sector: 'ground-segment', dataCompleteness: 25 },
  { name: 'Skynopy', description: 'Provider of ground-station-as-a-service (GSaaS) network infrastructure, scaling toward 100+ stations.', country: 'FR', foundedYear: 2024, sector: 'ground-segment', dataCompleteness: 25 },
  { name: 'Quindar', description: 'Developer of AI-powered mission-control software for satellite operators.', country: 'US', headquarters: 'Colorado, US', sector: 'software', dataCompleteness: 25 },
  { name: 'Leanspace', description: 'Developer of a cloud-based satellite operations and mission-management platform.', country: 'FR', sector: 'software', dataCompleteness: 25 },
  { name: 'QOSMIC', description: 'Developer of satellite downlink ground infrastructure, including laser communication terminals.', country: 'IN', sector: 'ground-segment', dataCompleteness: 25 },
  { name: 'Quadsat', description: 'Developer of drone-based antenna testing and RF interference measurement systems.', country: 'DK', sector: 'ground-segment', dataCompleteness: 25 },
  { name: 'Xiphera', description: 'Developer of hardware cryptography IP cores for space applications; holds an ESA ARTES contract for optical-link security.', country: 'FI', sector: 'space-cybersecurity', dataCompleteness: 25 },

  // -- corroborated international --
  { name: 'PAVE Space', description: 'Developer of an in-space tug for satellite orbit-transfer services.', country: 'CH', foundedYear: 2024, sector: 'in-space-transportation', dataCompleteness: 25 },
  { name: 'ENPULSION', description: 'Manufacturer of FEEP (field-emission electric propulsion) thrusters; over 320 units delivered.', country: 'AT', foundedYear: 2016, sector: 'propulsion', dataCompleteness: 25 },
  { name: 'LiveEO', description: 'Provider of AI-driven satellite Earth-observation analytics for infrastructure monitoring, including the Twinspector constellation.', country: 'DE', headquarters: 'Berlin, Germany', foundedYear: 2018, sector: 'analytics', dataCompleteness: 25 },
  { name: 'Infinite Orbits', description: 'Developer of the Endurance in-orbit servicing and inspection spacecraft; holds a €150M services backlog.', country: 'FR', headquarters: 'Toulouse, France', foundedYear: 2017, sector: 'in-space-servicing', dataCompleteness: 25 },
  { name: 'SWISSto12', description: 'Manufacturer of the HummingSat 3D-printed GEO satellite platform; reported $140M in 2025 revenue.', country: 'CH', headquarters: 'Renens, Switzerland', sector: 'satellite-manufacturing', dataCompleteness: 25 },
  { name: 'Letara', description: 'Developer of hybrid plastic-fuel rocket propulsion systems; a Hokkaido University spinout.', country: 'JP', headquarters: 'Hokkaido, Japan', sector: 'propulsion', dataCompleteness: 25 },
  { name: 'InspeCity', description: 'Developer of in-orbit satellite servicing, life-extension, and deorbit systems.', country: 'IN', headquarters: 'Mumbai, India', foundedYear: 2022, sector: 'in-space-servicing', dataCompleteness: 25 },
  { name: 'OrbitAID Aerospace', description: 'Developer of in-orbit satellite refueling systems; made its first commercial sale to Space Machines Company.', country: 'IN', headquarters: 'Chennai, India', foundedYear: 2021, sector: 'in-space-servicing', dataCompleteness: 25 },
  { name: 'Southern Launch', description: 'Operator of launch and re-entry ranges in South Australia (Koonibba, Whalers Way).', country: 'AU', headquarters: 'South Australia, Australia', sector: 'launch-services', dataCompleteness: 25 },
  { name: 'Wyvern', description: 'Developer of hyperspectral Earth-imaging satellite payloads and constellation.', country: 'CA', headquarters: 'Edmonton, Canada', sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'GHGSat', description: 'Operator of a 14-satellite constellation monitoring methane and other greenhouse-gas emissions.', country: 'CA', headquarters: 'Montreal, Canada', foundedYear: 2011, sector: 'earth-observation', dataCompleteness: 25 },
  { name: 'Venturi Space', description: "Developer of lunar and Martian rover mobility systems; supplies chassis technology to Astrolab. Note: a €250M corporate investment in a Toulouse rover factory was announced June 2026 — not a VC funding round.", country: 'MC', headquarters: 'Monaco', foundedYear: 2020, sector: 'space-infrastructure', dataCompleteness: 25 },
  { name: 'Marlan Space', description: 'Satellite manufacturer operating the Orbitworks joint venture with Loft Orbital, capitalized at over $100M. Note: Orbitworks JV capitalization is a joint-venture structure, not a VC funding round.', country: 'AE', headquarters: 'Abu Dhabi, UAE', foundedYear: 2024, sector: 'satellite-manufacturing', dataCompleteness: 25 },
  // Public: WSE-listed per dataset.
  { name: 'Creotech Instruments', description: 'Manufacturer of satellite platforms and space electronics; publicly listed on the Warsaw Stock Exchange. Note: a ~$118M share issuance was announced May 2026 to scale production to 40+ satellites/year — a public-market issuance, not a VC round.', country: 'PL', sector: 'satellite-manufacturing', dataCompleteness: 25, isPublic: true, ticker: 'CRI', exchange: 'WSE', ownershipType: 'public' },
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

const NEW_COMPANY_ROUNDS_E: RoundInput[] = [
  { companyName: 'Cailabs', date: '2025-09-12', amount: 67_000_000, seriesLabel: 'Round', roundType: 'equity', leadInvestor: 'European Investment Bank', notes: "Series label not specified in source; transcribed literally as 'Round'. Original: €37M EIB tranche + additional funds; full composition not itemized in source.", source: 'Via Satellite', sourceUrl: 'https://www.satellitetoday.com/telecommunications/2025/09/optical-ground-station-startup-cailabs-raises-57m-euro-with-eib-backing/' },
  { companyName: 'Skynopy', date: '2025-06-30', amount: 17_600_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Alven', investors: ['Expansion', 'Omnes', 'Heartcore', 'CNES'], source: 'Payload', sourceUrl: 'https://payloadspace.com/skynopy-raises-e15m-to-expand-its-ground-station-service/' },
  { companyName: 'Quindar', date: '2025-11-19', amount: 18_000_000, seriesLabel: 'Series A', roundType: 'equity', notes: 'No single lead investor named in source; source via Google News redirect, corroborated by multiple outlets.', source: 'SpaceNews', sourceUrl: null },
  { companyName: 'Leanspace', date: '2025-11-17', amount: 10_500_000, seriesLabel: 'Series A', roundType: 'equity', notes: 'Original: €10.5M. No single lead investor named; source via Google News redirect.', source: 'SpaceNews', sourceUrl: null },
  { companyName: 'QOSMIC', date: '2026-06-24', amount: 3_330_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Accel / Prosus', notes: 'Source via Google News redirect.', source: 'Evertiq', sourceUrl: null },
  { companyName: 'Quadsat', date: '2025-07-17', amount: 5_800_000, seriesLabel: 'Series A Extension', roundType: 'equity', notes: 'No single lead investor named; source via Google News redirect.', source: 'Via Satellite', sourceUrl: null },
  { companyName: 'PAVE Space', date: '2026-03-25', amount: 40_000_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Visionaries Club / Creandum', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/switzerlands-pave-space-closes-40-million-seed-funding-round/' },
  { companyName: 'ENPULSION', date: '2026-03-03', amount: 24_300_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Nordwind Growth', notes: 'Original: €22.5M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/enpulsion-secures-e22-5-million-to-expand-us-market-presence/' },
  { companyName: 'LiveEO', date: '2026-05-06', amount: 30_200_000, seriesLabel: 'Growth', roundType: 'equity', investors: ['Helantic', 'b2venture', 'EIC'], notes: 'Original: €28M. No single lead investor named.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/liveeo-secures-e28-million-to-accelerate-push-into-defence-applications/' },
  { companyName: 'Infinite Orbits', date: '2025-11-17', amount: 43_200_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'EIC Fund', notes: 'Original: €40M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/in-orbit-servicing-startup-infinite-orbits-raises-e40-million-in-new-funding/' },
  { companyName: 'SWISSto12', date: '2026-07-16', amount: 70_000_000, seriesLabel: 'Series C', roundType: 'equity', investors: ['CNB Capital', 'Swisscom Ventures'], notes: 'Original: €61M. No single lead investor named; additional investors participated.', source: 'Electronics Weekly', sourceUrl: 'https://electronicsweekly.com/news/business/finance/swissto12-70m-raises-series-c-for-hummingsat-development-2026-07/' },
  { companyName: 'Letara', date: '2025-03-01', amount: 4_300_000, seriesLabel: 'Seed Extension', roundType: 'equity', investors: ['ANA Trading', 'SMBC VC', 'Toyoda Gosei'], notes: 'Original: ¥650M. No single lead investor named; date precision is month-only per source.', source: 'The Bridge', sourceUrl: 'https://thebridge.jp/en/2025/03/letara-developer-of-hybrid-engines-for-spacecraft-raises-additional-650-million-yen-in-seed-round' },
  { companyName: 'InspeCity', date: '2025-05-07', amount: 5_600_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'Ashish Kacholia', source: 'Inc42', sourceUrl: 'https://inc42.com/buzz/inspecity-bags-5-6-mn-to-build-in-orbit-satellite-servicing-solutions/' },
  { companyName: 'OrbitAID Aerospace', date: '2025-01-15', amount: 1_500_000, seriesLabel: 'Pre-seed', roundType: 'equity', leadInvestor: 'Unicorn India Ventures', notes: 'Date precision is mid-January per source.', source: 'Payload', sourceUrl: 'https://payloadspace.com/exclusive-orbitaid-to-support-indian-aussie-collab-with-refueling-tech/' },
  { companyName: 'Southern Launch', date: '2026-06-30', amount: 16_500_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Brindabella & Company / NRFC', notes: 'Original: A$25M.', source: 'Lot Fourteen', sourceUrl: 'https://lotfourteen.com.au/southern-launch-closes-25m-series-a-funding/' },
  { companyName: 'Wyvern', date: '2024-10-18', amount: 6_000_000, seriesLabel: 'Round', roundType: 'equity', leadInvestor: 'Squadra Ventures', notes: "Series label not specified in source; transcribed literally as 'Round'. Original: C$8.2M.", source: 'Payload', sourceUrl: 'https://payloadspace.com/wyvern-raises-6m-to-boost-hyperspectral-data-biz/' },
  { companyName: 'GHGSat', date: '2025-09-15', amount: 34_000_000, seriesLabel: 'Convertible Note', roundType: 'convertible_note', leadInvestor: 'Yaletown Partners', notes: 'Original: C$47M.', source: 'GHGSat', sourceUrl: 'https://ghgsat.com/resources/ghgsat-secures-47m-in-new-funding-to-accelerate-global-expansion/' },
  // Xiphera, Venturi Space, Marlan Space, Creotech Instruments: profile only per dataset — no round rows.
];

// ────────────────────────────────────────────────────────────────
// Part 3 data — rounds for TRACKED companies (dataset section E)
// ────────────────────────────────────────────────────────────────

interface TrackedRoundInput extends Omit<RoundInput, 'companyName'> {
  companyNames: string[];
}

const TRACKED_ROUNDS_E: TrackedRoundInput[] = [
  { companyNames: ['Space Forge'], date: '2025-05-14', amount: 30_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'NATO Innovation Fund', investors: ['World Fund', 'NSSIF', 'British Business Bank'], notes: 'Original: £22.6M; corroborated by European Spaceflight.', source: 'Via Satellite', sourceUrl: 'https://www.satellitetoday.com/finance/2025/05/16/space-forge-raises-30m-led-by-nato-innovation-fund/' },
  { companyNames: ['Space Forge'], date: '2026-06-11', amount: 13_400_000, seriesLabel: 'Grant', roundType: 'grant', leadInvestor: 'ESA / UK Space Agency', notes: 'GSTP programme award for Pridwen heat shield — non-dilutive, not equity. Original: £10M.', source: 'Via Satellite', sourceUrl: 'https://www.satellitetoday.com/finance/2026/06/11/space-forge-secures-10-million-of-new-investment-through-european-uk-space-agencies/' },
  { companyNames: ['Northwood Space'], date: '2026-01-27', amount: 100_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Washington Harbour Partners / a16z', source: 'Payload', sourceUrl: 'https://payloadspace.com/northwood-closes-100m-series-b/' },
  { companyNames: ['Zeno Power'], date: '2025-05-14', amount: 50_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Hanaco Ventures', investors: ['Seraphim', 'Balerion', 'JAWS', 'Vanderbilt'], notes: 'Date now confirmed (was skipped as null in the first load pass); corroborated by 5+ outlets.', source: 'Payload', sourceUrl: 'https://payloadspace.com/zeno-power-raises-50m-series-b/' },
  { companyNames: ['Scout Space'], date: '2026-05-06', amount: 18_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Washington Harbour Partners', investors: ['Noblis Ventures', 'Fusion Fund', 'Decisive Point', 'VIPC'], notes: 'Corroborated by SpaceNews/PR Newswire.', source: 'Payload', sourceUrl: 'https://payloadspace.com/scout-space-closes-18m-series-a/' },
  // Skyrora: no loadable round per dataset (Polyakov capital injection amount
  // undisclosed; Orbex asset bid announced but not closed) — intentionally
  // skipped, no row added.
];

// ────────────────────────────────────────────────────────────────
// Part 4 data — plain field corrections (section E: Northwood Space;
// section F: Mynaric, York Space Systems, ALL.SPACE)
// ────────────────────────────────────────────────────────────────

interface CorrectionInput {
  companyNames: string[];
  data: Record<string, unknown>;
}

const CORRECTIONS: CorrectionInput[] = [
  // Section E
  { companyNames: ['Northwood Space'], data: { totalFunding: 136_300_000, lastFundingRound: 'Series B', lastFundingDate: utcDate('2026-01-27') } },
  // Section F
  { companyNames: ['Mynaric'], data: { status: 'acquired', parentCompany: 'Rocket Lab' } },
  { companyNames: ['York Space Systems'], data: { isPublic: true, ticker: 'YSS', ownershipType: 'public', lastFundingRound: 'IPO', lastFundingDate: utcDate('2026-01-21') } }, // exchange intentionally left untouched — unconfirmed per dataset
  { companyNames: ['ALL.SPACE'], data: { status: 'acquired', parentCompany: 'York Space Systems' } },
];

// ────────────────────────────────────────────────────────────────
// Part 5 data — guarded description-append corrections (section F)
// ────────────────────────────────────────────────────────────────

interface AppendCorrectionInput {
  companyNames: string[];
  noteSentence: string; // appended verbatim to the end of description if not already present
  data?: Record<string, unknown>;
}

const APPEND_CORRECTIONS: AppendCorrectionInput[] = [
  {
    companyNames: ['Orbex'],
    noteSentence:
      ' — entered administration Feb 2026 (debts up to £49M) after The Exploration Company sale talks collapsed; Skyrora bid on select assets pending.',
    data: { status: 'defunct' },
  },
  {
    companyNames: ['Space Perspective'],
    noteSentence: " — shut down early 2025, acquired/revived by Spain's Eos X Space July 2025.",
    data: { status: 'acquired', parentCompany: 'Eos X Space' },
  },
];

// ────────────────────────────────────────────────────────────────
// Part 6 data — rounds for TRACKED companies (dataset section F)
// ────────────────────────────────────────────────────────────────

const TRACKED_ROUNDS_F: TrackedRoundInput[] = [
  { companyNames: ['Momentus'], date: '2026-04-16', amount: 5_000_000, seriesLabel: 'Private Placement', roundType: 'equity', notes: '$3.75/share via A.G.P.', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/MNTS/momentus-announces-closing-of-5-million-private-placement-of-common-nmw3p22d0fvt.html' },
  { companyNames: ['Momentus'], date: '2026-05-27', amount: 25_000_000, seriesLabel: 'Private Placement', roundType: 'equity', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/MNTS/momentus-announces-pricing-of-a-25-million-private-placement-of-c5irjz3ptoza.html' },
  { companyNames: ['Momentus'], date: '2026-06-12', amount: 25_000_000, seriesLabel: 'Registered Direct', roundType: 'equity', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/MNTS/momentus-announces-pricing-of-a-25-million-registered-direct-tj8bvoc0xng6.html' },
  { companyNames: ['Orbex'], date: '2025-01-29', amount: 25_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'UK Government', investors: ['EIFO', 'Octopus Ventures'], notes: 'Original: £23M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/uk-government-backs-orbex-with-20m-investment/' },
  { companyNames: PORTAL_NAMES, date: '2025-04-03', amount: 17_500_000, seriesLabel: 'Seed', roundType: 'equity', leadInvestor: 'AlleyCorp', source: 'Payload', sourceUrl: 'https://payloadspace.com/portal-space-systems-raises-staggering-17-5m-seed/' },
  { companyNames: PORTAL_NAMES, date: '2026-04-09', amount: 50_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Geodesic Capital / Mach33', source: 'Payload', sourceUrl: 'https://payloadspace.com/portal-closes-50m-series-a/' },
  { companyNames: ['Reflect Orbital'], date: '2025-05-14', amount: 20_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Lux Capital', investors: ['Sequoia'], source: 'Payload', sourceUrl: 'https://payloadspace.com/reflect-orbital-raises-20m-series-a/' },
  { companyNames: STAR_CATCHER_NAMES, date: '2026-05-12', amount: 65_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'B Capital / Shield Capital / Cerberus Ventures', notes: 'Total raised $88M.', source: 'Payload', sourceUrl: 'https://payloadspace.com/star-catcher-closes-65m-series-a/' },
  { companyNames: ['Tomorrow.io'], date: '2026-02-03', amount: 175_000_000, seriesLabel: 'Series F', roundType: 'equity', leadInvestor: 'Stonecourt Capital / HarbourVest Partners', source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/tomorrowio-announces-175m-financing-to-deploy-deepsky-the-worlds-first-ai-native-weather-satellite-constellation-302677432.html' },
  { companyNames: ['Tomorrow.io'], date: '2026-05-18', amount: 35_000_000, seriesLabel: 'Series F Extension', roundType: 'equity', leadInvestor: 'Pitango / Harel Insurance', notes: 'Round total $210M.', source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/tomorrowio-expands-investment-from-pitango-and-harel-insurance-increasing-series-f-to-210m-302774218.html' },
  { companyNames: ['X-Bow Systems'], date: '2025-05-12', amount: 105_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Lockheed Martin (strategic)', notes: 'Multi-outlet via Google News; primary source unresolved.', source: 'PR Newswire / SpaceNews', sourceUrl: null },
  { companyNames: ['Sidus Space'], date: '2026-05-27', amount: 100_000_000, seriesLabel: 'Registered Direct', roundType: 'equity', notes: '$5.08/share via ThinkEquity.', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/SIDU/sidus-space-announces-pricing-of-100-million-registered-direct-bitt6i7ciat4.html' },
  { companyNames: ['Satellogic'], date: '2026-05-01', amount: 35_000_000, seriesLabel: 'Registered Direct', roundType: 'equity', notes: 'Date precision is month-only per source; disclosed in Q1 2026 results.', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/SATL/satellogic-reports-first-quarter-2026-financial-tk1mpbryp9lu.html' },
  { companyNames: ['Spire Global'], date: '2026-04-09', amount: 70_000_000, seriesLabel: 'Private Placement', roundType: 'equity', notes: 'Two outlets via Google News; primary source unresolved.', source: 'Investing.com / Globe and Mail', sourceUrl: null },
  { companyNames: ['BlackSky'], date: '2026-08-01', amount: 150_000_000, seriesLabel: 'ATM Issuance', roundType: 'equity', notes: 'Date precision is month-only per source; Q2 2026 results — cash reached $244.1M.', source: 'StockTitan', sourceUrl: 'https://www.stocktitan.net/news/BKSY/black-sky-reports-second-quarter-2026-pqs3rk9pqf3u.html' },
  { companyNames: ['Pixxel'], date: '2026-05-22', amount: 100_000_000, seriesLabel: 'Growth', roundType: 'equity', notes: 'Pre-money ~$400M; lead attribution conflicts (GIC vs Temasek) — leadInvestor left blank; total funding >$190M since 2019.', source: 'Outlook Business', sourceUrl: 'https://outlookbusiness.com/enterprise/startups/pixxel-expands-funding-round-to-100-mn-after-deepinder-goyal-steps-back' },
  { companyNames: ['Gravitics'], date: '2025-03-26', amount: 60_000_000, seriesLabel: 'STRATFI Grant', roundType: 'grant', leadInvestor: 'SpaceWERX / U.S. Space Force', notes: 'Up to $60M combined government/private match for Orbital Carrier.', source: 'Gravitics', sourceUrl: 'https://gravitics.com/news/orbital-carriers-stratfi' },
  { companyNames: SKYLO_NAMES, date: '2025-02-27', amount: 30_000_000, seriesLabel: 'Growth', roundType: 'equity', notes: 'No single lead investor named; multi-outlet via Google News.', source: 'SpaceNews / Via Satellite / Business Wire', sourceUrl: null },
  { companyNames: RFA_NAMES, date: '2025-12-02', amount: 205_700_000, seriesLabel: 'Grant', roundType: 'grant', leadInvestor: 'ESA European Launcher Challenge (Germany, UK)', notes: 'Original: €190.51M.', source: 'European Spaceflight', sourceUrl: 'https://europeanspaceflight.com/over-e900-million-committed-to-european-launcher-challenge/' },
];

// ────────────────────────────────────────────────────────────────
// Round creation helper (shared by Parts 2, 3, 6)
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
  console.log('=== SpaceNexus: Discovery Load (2026-08) — Part B (sections E + F) ===');

  const resolver = new CompanyResolver();
  await resolver.load();

  // ── Part 1: new company minimal profiles (section E) ──────────
  console.log('\n-- Part 1: new company profiles (section E) --\n');

  let companiesCreated = 0;
  let companiesMatched = 0;

  for (const info of NEW_COMPANIES_E) {
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

  // ── Part 2: funding rounds for new companies (section E) ───────
  console.log('-- Part 2: funding rounds (new companies, section E) --\n');

  const newRoundCounters: RoundCounters = { created: 0, skipped: 0, failed: 0 };

  for (const round of NEW_COMPANY_ROUNDS_E) {
    const company = resolver.resolve(round.companyName);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyName} ${round.seriesLabel ?? ''} ${round.date}`);
      newRoundCounters.failed++;
      continue;
    }
    await createRoundIfNew(company, round, newRoundCounters);
  }

  console.log(`\n  Summary: ${newRoundCounters.created} created, ${newRoundCounters.skipped} skipped (already exist), ${newRoundCounters.failed} failed\n`);

  // ── Part 3: funding rounds for tracked companies (section E) ───
  console.log('-- Part 3: funding rounds (tracked companies, section E) --\n');

  const trackedRoundCountersE: RoundCounters = { created: 0, skipped: 0, failed: 0 };

  for (const round of TRACKED_ROUNDS_E) {
    const company = resolveAny(resolver, round.companyNames);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyNames.join(' / ')} ${round.seriesLabel ?? ''} ${round.date}`);
      trackedRoundCountersE.failed++;
      continue;
    }
    await createRoundIfNew(company, { ...round, companyName: company.name }, trackedRoundCountersE);
  }

  console.log(`\n  Summary: ${trackedRoundCountersE.created} created, ${trackedRoundCountersE.skipped} skipped (already exist), ${trackedRoundCountersE.failed} failed\n`);

  // ── Part 4: Neuraspace round leadInvestor enrichment (section E) ─
  console.log('-- Part 4: Neuraspace round enrichment (section E) --\n');

  let neuraspaceEnriched = 0;
  let neuraspaceSkipped = 0;

  const neuraspace = resolver.resolve('Neuraspace');
  if (!neuraspace) {
    console.error('  ! Skipped Neuraspace round enrichment (company not resolved)');
    neuraspaceSkipped++;
  } else {
    const candidateRounds = await prisma.fundingRound.findMany({
      where: { companyId: neuraspace.id, leadInvestor: null },
      select: { id: true, date: true, seriesLabel: true },
    });
    const target = candidateRounds.find((r) => r.date.getUTCFullYear() === 2026 && r.date.getUTCMonth() === 7); // August = month index 7

    if (!target) {
      console.log('  = Skipped (no matching 2026-08 round with null leadInvestor found)');
      neuraspaceSkipped++;
    } else {
      try {
        await prisma.fundingRound.update({
          where: { id: target.id },
          data: { leadInvestor: 'Lince Capital / Explorer Investments / Armilar Venture Partners' },
        });
        neuraspaceEnriched++;
        console.log(`  ^ Enriched: Neuraspace — ${target.seriesLabel ?? '(no series label)'} leadInvestor set`);
      } catch (err) {
        neuraspaceSkipped++;
        console.error('  ! Failed to enrich Neuraspace round:', err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\n  Summary: ${neuraspaceEnriched} enriched, ${neuraspaceSkipped} skipped\n`);

  // ── Part 5: Observable Space field enrichment (section E) ──────
  console.log('-- Part 5: Observable Space field enrichment (section E) --\n');

  let observableSpaceEnriched = 0;
  let observableSpaceSkipped = 0;

  const observableSpace = resolver.resolve('Observable Space');
  if (!observableSpace) {
    console.error('  ! Skipped Observable Space enrichment (company not resolved)');
    observableSpaceSkipped++;
  } else {
    try {
      await prisma.companyProfile.update({
        where: { id: observableSpace.id },
        data: {
          description: 'Formed from the OurSky + PlaneWave Instruments merger; laser-comm ground stations, sensing, and in-space optical payloads.',
          headquarters: 'Los Angeles, CA / Detroit, MI',
          foundedYear: 2025,
          lastVerified: new Date(),
        },
      });
      observableSpaceEnriched++;
      console.log('  ^ Enriched: Observable Space (description, headquarters, foundedYear) — no new round added');
    } catch (err) {
      observableSpaceSkipped++;
      console.error('  ! Failed to enrich Observable Space:', err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${observableSpaceEnriched} enriched, ${observableSpaceSkipped} skipped\n`);

  // ── Part 6: funding rounds for tracked companies (section F) ───
  console.log('-- Part 6: funding rounds (tracked companies, section F) --\n');

  const trackedRoundCountersF: RoundCounters = { created: 0, skipped: 0, failed: 0 };

  for (const round of TRACKED_ROUNDS_F) {
    const company = resolveAny(resolver, round.companyNames);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyNames.join(' / ')} ${round.seriesLabel ?? ''} ${round.date}`);
      trackedRoundCountersF.failed++;
      continue;
    }
    await createRoundIfNew(company, { ...round, companyName: company.name }, trackedRoundCountersF);
  }

  console.log(`\n  Summary: ${trackedRoundCountersF.created} created, ${trackedRoundCountersF.skipped} skipped (already exist), ${trackedRoundCountersF.failed} failed\n`);

  // ── Part 7: plain field corrections (section E + F) ────────────
  console.log('-- Part 7: company field corrections --\n');

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

  // ── Part 8: guarded description-append corrections (section F) ─
  console.log('-- Part 8: description-append corrections (section F) --\n');

  let appendsApplied = 0;
  let appendsSkipped = 0;

  for (const appendCorrection of APPEND_CORRECTIONS) {
    const company = resolveAny(resolver, appendCorrection.companyNames);
    if (!company) {
      console.error(`  ! Skipped append correction (company not resolved): ${appendCorrection.companyNames.join(' / ')}`);
      appendsSkipped++;
      continue;
    }

    const full = await prisma.companyProfile.findUnique({
      where: { id: company.id },
      select: { description: true },
    });

    if (!full) {
      console.error(`  ! Skipped append correction (profile vanished mid-run): ${company.name}`);
      appendsSkipped++;
      continue;
    }

    const alreadyPresent = full.description?.includes(appendCorrection.noteSentence.trim()) ?? false;
    if (alreadyPresent) {
      appendsSkipped++;
      console.log(`  = Skipped (note already present): ${company.name}`);
      continue;
    }

    const description = full.description ? `${full.description}${appendCorrection.noteSentence}` : appendCorrection.noteSentence.trim();

    try {
      await prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          description,
          ...(appendCorrection.data ?? {}),
          lastVerified: new Date(),
        },
      });
      appendsApplied++;
      console.log(`  ^ Updated (description appended): ${company.name}`);
    } catch (err) {
      appendsSkipped++;
      console.error(`  ! Failed to update ${company.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${appendsApplied} applied, ${appendsSkipped} skipped\n`);

  console.log('=== Done ===');
  console.log(`  New companies (section E): ${companiesCreated} created, ${companiesMatched} matched`);
  console.log(`  Funding rounds (new companies, section E): ${newRoundCounters.created} created, ${newRoundCounters.skipped} skipped, ${newRoundCounters.failed} failed`);
  console.log(`  Funding rounds (tracked companies, section E): ${trackedRoundCountersE.created} created, ${trackedRoundCountersE.skipped} skipped, ${trackedRoundCountersE.failed} failed`);
  console.log(`  Neuraspace round enrichment: ${neuraspaceEnriched} enriched, ${neuraspaceSkipped} skipped`);
  console.log(`  Observable Space field enrichment: ${observableSpaceEnriched} enriched, ${observableSpaceSkipped} skipped`);
  console.log(`  Funding rounds (tracked companies, section F): ${trackedRoundCountersF.created} created, ${trackedRoundCountersF.skipped} skipped, ${trackedRoundCountersF.failed} failed`);
  console.log(`  Plain corrections: ${correctionsApplied} applied, ${correctionsSkipped} skipped`);
  console.log(`  Description-append corrections: ${appendsApplied} applied, ${appendsSkipped} skipped`);
}

main()
  .catch((err) => {
    console.error('Load failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
