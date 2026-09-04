/**
 * Refresh script: Startup Funding Data (2025-2026)
 *
 * Adds ~50 verified funding rounds (Series C-H, IPOs, growth rounds,
 * convertible notes) for space startups from mid-2025 through August 2026,
 * creates minimal CompanyProfile rows for any company not already in the
 * database, applies a handful of company-level field corrections (public
 * listings, valuations, totalFunding, lastFundingRound/Date), and dedupes
 * the two Anduril Industries profiles (canonical 'anduril-industries' vs.
 * legacy duplicate 'anduril').
 *
 * IDEMPOTENT — safe to run more than once:
 *  - Companies are matched by normalized name / slug before creating.
 *  - Funding rounds are skipped if a row already exists for the same
 *    companyId + seriesLabel + year/month of date.
 *  - Company field corrections are plain field sets (re-applying is a
 *    no-op).
 *  - Anduril dedupe is guarded: if slug 'anduril' no longer exists
 *    (already merged), that phase is skipped.
 *
 * Usage:
 *   npx tsx scripts/refresh-startup-funding-2026.ts
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
  // All dataset dates are YYYY-MM-DD; parse as UTC midnight so local
  // timezone (Windows dev machine or Railway container) can't shift the
  // month, which would break the year/month idempotency check.
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

// Cases where the dataset's company name doesn't normalize-match the
// name or slug already stored in the DB.
const ALIAS_SLUGS: Record<string, string> = {
  'Voyager Technologies': 'voyager-space',
};

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
    const aliasSlug = ALIAS_SLUGS[name];
    if (aliasSlug) {
      const hit = this.profiles.find((p) => p.slug === aliasSlug);
      if (hit) return hit;
    }
    const n = normalize(name);
    return this.byNormName.get(n) ?? this.bySlug.get(n);
  }

  register(p: ProfileRef) {
    this.profiles.push(p);
    this.byNormName.set(normalize(p.name), p);
    this.bySlug.set(normalize(p.slug), p);
  }
}

// ────────────────────────────────────────────────────────────────
// Part 1 — minimal-profile fallback data
// (used only when a company from the funding dataset has no existing
// CompanyProfile match; most of these are expected to already exist)
// ────────────────────────────────────────────────────────────────

interface CompanyInfo {
  country: string;
  sector: string;
  description: string;
}

const COMPANY_INFO: Record<string, CompanyInfo> = {
  'Stoke Space': { country: 'US', sector: 'launch', description: 'US launch startup developing the Nova fully reusable rocket.' },
  Vast: { country: 'US', sector: 'infrastructure', description: 'Developer of the Haven series of commercial space stations.' },
  'Impulse Space': { country: 'US', sector: 'infrastructure', description: 'Developer of in-space propulsion kick stages and orbital transfer vehicles.' },
  'K2 Space': { country: 'US', sector: 'satellite', description: 'Manufacturer of large, high-power satellite platforms.' },
  'Loft Orbital': { country: 'US', sector: 'satellite', description: 'Provider of satellite infrastructure-as-a-service, hosting customer payloads on shared satellites.' },
  'Axiom Space': { country: 'US', sector: 'infrastructure', description: 'Developer of commercial space station modules and ISS-successor infrastructure.' },
  'Firefly Aerospace': { country: 'US', sector: 'launch', description: 'Launch vehicle and lunar lander company, publicly traded on Nasdaq (FLY).' },
  Astranis: { country: 'US', sector: 'satellite', description: 'Developer of MicroGEO small geostationary communications satellites.' },
  'Varda Space Industries': { country: 'US', sector: 'manufacturing', description: 'Manufacturer of in-space microgravity products using autonomous spacecraft with Earth-return capsules.' },
  'True Anomaly': { country: 'US', sector: 'defense', description: 'Developer of autonomous space domain awareness and orbital security spacecraft.' },
  Castelion: { country: 'US', sector: 'defense', description: 'Manufacturer of hypersonic strike weapons founded by SpaceX veterans.' },
  Hadrian: { country: 'US', sector: 'manufacturing', description: 'Builder of highly automated precision-machining factories for aerospace and defense parts.' },
  'Muon Space': { country: 'US', sector: 'satellite', description: 'Developer of a climate-monitoring Earth observation satellite constellation.' },
  Apex: { country: 'US', sector: 'satellite', description: 'Manufacturer of standardized satellite buses for rapid deployment.' },
  'Turion Space': { country: 'US', sector: 'satellite', description: 'Developer of maneuverable satellites for space domain awareness and in-orbit servicing.' },
  'Starfish Space': { country: 'US', sector: 'satellite', description: 'Developer of the Otter satellite-servicing spacecraft.' },
  'Sierra Space': { country: 'US', sector: 'infrastructure', description: 'Developer of the Dream Chaser spaceplane and commercial space station modules.' },
  'Anduril Industries': { country: 'US', sector: 'defense', description: 'AI-first defense technology company and Golden Dome missile shield prime contractor.' },
  SpinLaunch: { country: 'US', sector: 'launch', description: 'Developer of kinetic launch and satellite systems.' },
  'Ursa Major': { country: 'US', sector: 'manufacturing', description: 'Developer of rocket propulsion engines for launch and hypersonic vehicles.' },
  'Voyager Technologies': { country: 'US', sector: 'infrastructure', description: 'Space technology holding company and parent of the Starlab commercial space station joint venture, publicly traded on NYSE (VOYG).' },
  SpaceX: { country: 'US', sector: 'launch', description: 'Launch, satellite broadband (Starlink), and human spaceflight company, publicly traded on Nasdaq (SPCX).' },
  'Orbit Fab': { country: 'US', sector: 'satellite', description: 'Developer of orbital satellite refueling infrastructure.' },
  Neuraspace: { country: 'PT', sector: 'analytics', description: 'Developer of AI-based satellite collision-avoidance software.' },
  ICEYE: { country: 'FI', sector: 'satellite', description: 'Operator of a synthetic aperture radar (SAR) Earth observation satellite constellation.' },
  'Isar Aerospace': { country: 'DE', sector: 'launch', description: 'Developer of the Spectrum small-lift orbital rocket.' },
  'D-Orbit': { country: 'IT', sector: 'satellite', description: 'Developer of orbital transfer vehicles for satellite deployment logistics.' },
  'Skyroot Aerospace': { country: 'IN', sector: 'launch', description: "Developer of the Vikram family of small orbital launch vehicles; India's first space unicorn." },
  'Agnikul Cosmos': { country: 'IN', sector: 'launch', description: 'Developer of 3D-printed small satellite launch vehicles.' },
  'Xona Space Systems': { country: 'US', sector: 'satellite', description: 'Developer of a commercial precision navigation and timing (PNT) satellite constellation.' },
  'PLD Space': { country: 'ES', sector: 'launch', description: 'Developer of the Miura family of small orbital launch vehicles.' },
  EnduroSat: { country: 'BG', sector: 'satellite', description: 'Manufacturer of ESPA-class small satellites and satellite subsystems.' },
  'Bellatrix Aerospace': { country: 'IN', sector: 'manufacturing', description: 'Developer of in-space propulsion systems for satellites.' },
  LandSpace: { country: 'CN', sector: 'launch', description: 'Developer of methane-fueled reusable orbital rockets.' },
  'Blue Origin': { country: 'US', sector: 'launch', description: 'Human spaceflight, launch vehicle, and lunar lander company founded by Jeff Bezos.' },
  'Relativity Space': { country: 'US', sector: 'manufacturing', description: 'Developer of 3D-printed launch vehicles, including the Terran R rocket.' },
};

// ────────────────────────────────────────────────────────────────
// Part 2 — funding rounds
// ────────────────────────────────────────────────────────────────

interface RoundInput {
  companyName: string;
  date: string; // YYYY-MM-DD
  amount: number; // full USD
  seriesLabel: string;
  roundType: string;
  postValuation?: number;
  leadInvestor?: string;
  investors?: string[];
  source: string;
  sourceUrl: string;
  notes?: string;
}

const FUNDING_ROUNDS: RoundInput[] = [
  { companyName: 'Stoke Space', date: '2025-10-09', amount: 510_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'US Innovative Technology Fund', investors: ['776', 'Breakthrough Energy', 'Glade Brook Capital', 'Industrious Ventures', 'NFX', 'Toyota Ventures', 'Washington Harbour Partners'], source: 'Aviation Week', sourceUrl: 'https://aviationweek.com/space/commercial-space/stoke-space-raises-510-million-series-d-round' },
  { companyName: 'Stoke Space', date: '2026-02-11', amount: 350_000_000, seriesLabel: 'Series D Extension', roundType: 'equity', leadInvestor: 'B Capital', investors: ['Shield Capital', 'Cerberus Ventures'], source: 'Business Wire', sourceUrl: 'https://www.businesswire.com/news/home/20260210581633/en/' },
  { companyName: 'Vast', date: '2026-03-05', amount: 500_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Balerion Space Ventures', investors: ['IQT', 'Qatar Investment Authority', 'Mitsui & Co.', 'MUFG', 'Nikon', 'Stellar Ventures', 'Space Capital', 'Earthrise Ventures'], notes: 'Includes $200M debt (of $500M total: $300M equity + $200M debt)', source: 'Vast', sourceUrl: 'https://www.vastspace.com/updates/vast-secures-500m-in-funding-to-accelerate-production-of-haven-space-stations' },
  { companyName: 'Impulse Space', date: '2025-06-03', amount: 300_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Linse Capital', investors: ['DFJ Growth'], source: 'SpaceNews', sourceUrl: 'https://spacenews.com/impulse-space-raises-300-million-for-expansion-and-new-technology-development/' },
  { companyName: 'Impulse Space', date: '2026-06-02', amount: 500_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: '137 Ventures / Banner VC', investors: ['Founders Fund', 'Lux Capital', 'Linse Capital'], source: 'SpaceNews', sourceUrl: 'https://spacenews.com/impulse-space-raises-500-million/' },
  { companyName: 'K2 Space', date: '2025-02-13', amount: 110_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Lightspeed Venture Partners / Altimeter Capital', investors: ['Alpine Space Ventures', 'First Round Capital'], source: 'Payload', sourceUrl: 'https://payloadspace.com/k2-space-raises-110m-series-b/' },
  { companyName: 'K2 Space', date: '2025-12-12', amount: 250_000_000, postValuation: 3_000_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Redpoint Ventures', investors: ['T. Rowe Price', 'Altimeter Capital', 'Hedosophia', 'Lightspeed'], source: 'Payload', sourceUrl: 'https://payloadspace.com/k2-space-raises-250m-series-c/' },
  { companyName: 'K2 Space', date: '2026-08-03', amount: 500_000_000, postValuation: 6_800_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Kleiner Perkins / ICONIQ', investors: ['CapitalG', 'Lightspeed', 'Altimeter', 'Spark Capital', 'Sands Capital', 'ARK Invest'], source: 'GovCon Wire', sourceUrl: 'https://www.govconwire.com/articles/k2-space-500-million-series-d-funding-round' },
  { companyName: 'Loft Orbital', date: '2025-01-15', amount: 170_000_000, postValuation: 1_000_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Tikehau Capital / AXIAL', investors: ['Temasek', 'Supernova', 'Tribeca Venture Partners', 'Starburst VC', 'Bpifrance', 'Foundation Capital'], source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2025/01/15/loft-orbital-lands-a-fresh-170-million-after-logging-over-500-million-of-bookings/' },
  { companyName: 'Axiom Space', date: '2025-03-26', amount: 100_000_000, postValuation: 2_000_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: '1789 Capital / Type One Ventures', investors: [], notes: 'Down round', source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com/news/articles/2025-03-26/1789-capital-type-one-ventures-to-back-axiom-space-at-2-billion-valuation' },
  { companyName: 'Axiom Space', date: '2026-06-04', amount: 525_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Type One Ventures / Qatar Investment Authority', investors: ['1789 Capital'], notes: 'Oversubscribed final close; initial $350M close Feb 2026', source: 'Axiom', sourceUrl: 'https://www.axiomspace.com/release/axiom-space-closes-oversubscribed-financing-at-525m' },
  { companyName: 'Firefly Aerospace', date: '2025-05-29', amount: 50_000_000, seriesLabel: 'Strategic', roundType: 'equity', leadInvestor: 'Northrop Grumman', investors: [], source: 'Northrop Grumman', sourceUrl: 'https://news.northropgrumman.com/launch/Northrop-Grumman-Invests-50-Million-in-Firefly-Aerospace-to-Advance-Eclipse-Medium-Launch-Vehicle' },
  { companyName: 'Firefly Aerospace', date: '2025-08-07', amount: 998_600_000, seriesLabel: 'IPO', roundType: 'ipo', postValuation: 8_500_000_000, investors: [], notes: 'Nasdaq: FLY, priced $45/share', source: 'CNBC', sourceUrl: 'https://www.cnbc.com/2025/08/07/rocket-maker-firefly-aerospace-fly-stock-ipo.html' },
  { companyName: 'Astranis', date: '2026-05-06', amount: 300_000_000, postValuation: 2_800_000_000, seriesLabel: 'Series E', roundType: 'equity', leadInvestor: 'Snowpoint Ventures / Franklin Templeton', investors: ['Andreessen Horowitz', 'BlackRock', 'Baillie Gifford', 'Fidelity'], source: 'Payload', sourceUrl: 'https://payloadspace.com/astranis-raises-300m-series-e/' },
  { companyName: 'Varda Space Industries', date: '2025-07-10', amount: 187_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Natural Capital / Shrug Capital', investors: ['Founders Fund', 'Khosla Ventures', 'Lux Capital'], source: 'SpaceNews', sourceUrl: 'https://spacenews.com/varda-space-industries-raises-187-million/' },
  { companyName: 'True Anomaly', date: '2025-04-30', amount: 260_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Accel', investors: ['Meritech Capital', 'Eclipse', 'Riot Ventures', 'Menlo Ventures'], notes: 'Equity + debt', source: 'True Anomaly', sourceUrl: 'https://www.trueanomaly.space/newsroom/announcing-our-260m-fundraise' },
  { companyName: 'True Anomaly', date: '2026-04-28', amount: 650_000_000, postValuation: 2_200_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Eclipse / Riot Ventures', investors: ['Paradigm', 'Atreides', 'VanEck', 'Accel'], source: 'SpaceNews', sourceUrl: 'https://spacenews.com/true-anomaly-raises-650-million-reaching-2-2-billion-valuation/' },
  { companyName: 'Castelion', date: '2025-01-29', amount: 100_000_000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Lightspeed Venture Partners', investors: ['a16z', 'Lavrock Ventures'], notes: '$70M equity + $30M debt (SVB)', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/spacex-veterans-hypersonic-weapons-startup-secures-100-million/' },
  { companyName: 'Castelion', date: '2025-12-05', amount: 350_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Altimeter Capital / Lightspeed', investors: ['a16z', 'General Catalyst', 'Space VC'], source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/castelion-closes-350-million-series-b-to-mass-produce-us-hypersonic-weapons-302633732.html' },
  { companyName: 'Castelion', date: '2026-08-19', amount: 1_000_000_000, seriesLabel: 'Series C', roundType: 'equity', postValuation: 13_000_000_000, leadInvestor: 'JPMorganChase Strategic Investment Group / Andreessen Horowitz / Carlyle', investors: ['Lightspeed Venture Partners', 'Lavrock Ventures', 'Altimeter', 'General Catalyst', 'Interlagos', 'T. Rowe Price Associates'], source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/castelion-raises-1-billion-series-c-to-scale-production-of-low-cost-hypersonic-weapons-302855711.html', notes: '$800M equity plus a $250M committed revolving credit facility; funds Blackbeard hypersonic missile production (fielding targeted 2027) and the Project Ranger campus in Rio Rancho, NM. Company HQ moved to Torrance, CA.' },
  { companyName: 'Hadrian', date: '2025-07-17', amount: 260_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Founders Fund / Lux Capital', investors: ['a16z', 'Altimeter Capital'], source: 'CNBC', sourceUrl: 'https://www.cnbc.com/2025/07/17/hadrian-funding-round-thiel-founders-fund.html' },
  { companyName: 'Hadrian', date: '2025-12-19', amount: 131_000_000, postValuation: 1_600_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'T. Rowe Price accounts', investors: [], source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/hadrian-partners-with-t-rowe-price-to-accelerate-the-reindustrialization-of-america-302657125.html' },
  { companyName: 'Hadrian', date: '2026-08-06', amount: 1_370_000_000, postValuation: 7_870_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'JPMorgan Strategic Investment Group', investors: ['WCM', 'Washington Harbour', 'Valor', '137 Ventures', 'Baillie Gifford'], source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/hadrian-raises-1-37b-series-d-to-build-highly-automated-factories-to-accelerate-americas-industrial-renewal-302844408.html' },
  { companyName: 'Muon Space', date: '2025-06-12', amount: 44_500_000, seriesLabel: 'Series B Extension', roundType: 'equity', leadInvestor: 'Congruent Ventures', investors: ['ArcTern Ventures', 'Activate Capital'], notes: '+$45M credit facility', source: 'Payload', sourceUrl: 'https://payloadspace.com/muon-hauls-in-44-5m-for-series-b-extension/' },
  { companyName: 'Apex', date: '2025-04-29', amount: 200_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Point72 Ventures', investors: ['8VC', 'a16z', 'Washington Harbour Partners'], source: 'Payload', sourceUrl: 'https://payloadspace.com/apex-raises-200m-series-c/' },
  { companyName: 'Apex', date: '2025-09-12', amount: 200_000_000, postValuation: 1_000_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Interlagos', investors: [], source: 'PR Newswire', sourceUrl: 'https://www.prnewswire.com/news-releases/apex-raises-200-million-series-d-financing-302554449.html' },
  { companyName: 'Turion Space', date: '2026-04-15', amount: 75_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Washington Harbour Partners', investors: ['Aurelia Foundry', 'Magnetar Capital'], notes: 'Amount reported as $75M+', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/turion-space-raises-75-million-to-expand-maneuverable-satellite-fleet/' },
  { companyName: 'Starfish Space', date: '2026-04-07', amount: 110_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Point72 Ventures', investors: ['Activate Capital', 'Shield Capital', 'NightDragon', 'Munich Re Ventures'], source: 'GeekWire', sourceUrl: 'https://www.geekwire.com/2026/starfish-space-raises-more-than-100m-to-scale-up-its-satellite-servicing-missions/' },
  { companyName: 'Sierra Space', date: '2026-03-05', amount: 550_000_000, postValuation: 8_000_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'LuminArx Capital Management', investors: ['Andalusian Private Capital', 'Coatue', 'General Atlantic', 'Moore Strategic Ventures'], source: 'Sierra Space', sourceUrl: 'https://www.sierraspace.com/press-releases/sierra-space-closes-550-million-in-series-c-round-with-a-valuation-of-8-billion/' },
  { companyName: 'Anduril Industries', date: '2025-06-05', amount: 2_500_000_000, postValuation: 30_500_000_000, seriesLabel: 'Series G', roundType: 'equity', leadInvestor: 'Founders Fund', investors: [], source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2025/06/05/anduril-raises-2-5b-at-30-5b-valuation-led-by-founders-fund/' },
  { companyName: 'Anduril Industries', date: '2026-05-13', amount: 5_000_000_000, postValuation: 61_000_000_000, seriesLabel: 'Series H', roundType: 'equity', leadInvestor: 'Thrive Capital', investors: ['a16z'], source: 'TechCrunch', sourceUrl: 'https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/' },
  { companyName: 'SpinLaunch', date: '2025-08-18', amount: 30_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'ATW Partners', investors: ['Kongsberg Defence & Aerospace'], source: 'Business Wire', sourceUrl: 'https://www.businesswire.com/news/home/20250818553463/en/' },
  { companyName: 'Ursa Major', date: '2025-11-18', amount: 100_000_000, seriesLabel: 'Series E', roundType: 'equity', leadInvestor: 'Eclipse', investors: ['Woodline Partners', 'Principia Growth', 'XN', 'Alsop Louie Partners'], notes: '+$50M debt facility', source: 'Ursa Major', sourceUrl: 'https://ursamajor.com/media/press-release/ursa-major-raises-100-million-closes-series-e/' },
  { companyName: 'Voyager Technologies', date: '2025-06-12', amount: 402_300_000, seriesLabel: 'IPO', roundType: 'ipo', postValuation: 3_800_000_000, investors: [], notes: 'NYSE: VOYG, priced $31/share', source: 'Business Wire', sourceUrl: 'https://www.businesswire.com/news/home/20250612596347/en/' },
  { companyName: 'SpaceX', date: '2026-06-12', amount: 75_000_000_000, seriesLabel: 'IPO', roundType: 'ipo', postValuation: 1_780_000_000_000, investors: [], notes: 'Nasdaq: SPCX, priced $135/share; debut-day market cap ~$2.1T', source: 'CNBC', sourceUrl: 'https://www.cnbc.com/2026/06/12/spacex-ipo-spcx-live-updates.html' },
  { companyName: 'Orbit Fab', date: '2026-03-16', amount: 20_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Stride Capital', investors: [], source: 'SpaceWatch', sourceUrl: 'https://spacewatch.global/2026/03/orbit-fab-enters-new-growth-chapter-amidst-leadership-transition-and-20-million-series-b-raise/' },
  { companyName: 'Neuraspace', date: '2026-08-05', amount: 18_000_000, seriesLabel: 'Series B', roundType: 'equity', investors: [], notes: 'Original: €15.6M (€6M VC + €9.6M public funding)', source: 'Payload', sourceUrl: 'https://payloadspace.com/neuraspace-raises-e15-6m-to-scale-its-sda-service/' },
  { companyName: 'ICEYE', date: '2025-12-05', amount: 216_000_000, postValuation: 2_800_000_000, seriesLabel: 'Series E', roundType: 'equity', leadInvestor: 'General Catalyst', investors: [], notes: 'Original: €150M primary + €50M secondary; post-money valuation €2.4B', source: 'SpaceWatch', sourceUrl: 'https://spacewatch.global/2025/12/iceye-secures-new-funding-in-successful-series-e-round-led-by-general-catalyst/' },
  { companyName: 'ICEYE', date: '2026-06-09', amount: 486_000_000, postValuation: 12_000_000_000, seriesLabel: 'Series F', roundType: 'equity', leadInvestor: 'General Atlantic', investors: ['Qatar Investment Authority', 'TCV', 'Nokia'], notes: 'Original: €450M primary (round total >€1B); post-money valuation >€10B', source: 'ICEYE', sourceUrl: 'https://www.iceye.com/newsroom/press-releases/iceye-leads-a-new-era-of-sovereign-intelligence-from-space-with-1b-funding-round' },
  { companyName: 'Isar Aerospace', date: '2025-07-01', amount: 162_000_000, seriesLabel: 'Convertible Note', roundType: 'convertible_note', leadInvestor: 'Eldridge Industries', investors: [], notes: 'Original: €150M; date precision is month-only per source', source: 'Tech Funding News', sourceUrl: 'https://techfundingnews.com/isar-aerospace-funding-270m-molten-ventures/' },
  { companyName: 'Isar Aerospace', date: '2026-06-09', amount: 292_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Island Green Capital / Molten Ventures', investors: ['HV Capital', 'Lakestar', 'UVC Partners', 'KfW Capital'], notes: 'Original: €270M', source: 'Isar Aerospace', sourceUrl: 'https://isaraerospace.com/press/isar-aerospace-secures-eur-270m-to-provide-sovereign-space-capabilities-globally' },
  { companyName: 'D-Orbit', date: '2026-01-22', amount: 53_000_000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Azimut Group', investors: [], notes: 'First tranche; full close pending', source: 'Payload', sourceUrl: 'https://payloadspace.com/d-orbit-raises-53m-to-fund-acquisition-efforts/' },
  { companyName: 'Skyroot Aerospace', date: '2026-05-07', amount: 60_000_000, postValuation: 1_100_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'GIC / Sherpalo Ventures', investors: ['BlackRock-managed funds', 'Arkam Ventures'], notes: "India's first space unicorn", source: 'Via Satellite', sourceUrl: 'https://www.satellitetoday.com/finance/2026/05/07/skyroot-secures-60m-in-funding-becoming-indias-first-space-unicorn/' },
  { companyName: 'Agnikul Cosmos', date: '2025-11-22', amount: 17_000_000, postValuation: 500_000_000, seriesLabel: 'Bridge', roundType: 'equity', investors: [], source: 'Business Standard', sourceUrl: 'https://www.business-standard.com/companies/start-ups/spacetech-major-agnikul-raises-17-mn-in-funding-round-at-500-mn-valuation-125112200175_1.html' },
  { companyName: 'Xona Space Systems', date: '2025-06-26', amount: 92_000_000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Craft Ventures', investors: [], source: 'Via Satellite', sourceUrl: 'https://www.satellitetoday.com/finance/2025/06/26/xona-raises-close-to-100m-in-new-funding-round/' },
  { companyName: 'Xona Space Systems', date: '2026-03-26', amount: 170_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Mohari Ventures Natural Capital', investors: [], source: 'Xona', sourceUrl: 'https://www.xonaspace.com/news/series-c' },
  { companyName: 'PLD Space', date: '2026-03-01', amount: 209_000_000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Mitsubishi Electric Corporation', investors: ['Spanish CDTI', 'COFIDES', 'Nazca Capital'], notes: 'Original: €180M; date precision is month-only per source', source: 'Payload', sourceUrl: 'https://payloadspace.com/pld-space-closes-e180m-series-c-eyes-flight-test-this-year/' },
  { companyName: 'EnduroSat', date: '2025-05-01', amount: 46_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Founders Fund', investors: [], notes: 'Original: €43M; date precision is month-only per source', source: 'EnduroSat', sourceUrl: 'https://www.endurosat.com/news/endurosat-secures-43m-to-accelerate-espa-satellite-manufacturing/' },
  { companyName: 'EnduroSat', date: '2025-10-30', amount: 104_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Riot Ventures / GV / Lux Capital', investors: [], source: 'Payload', sourceUrl: 'https://payloadspace.com/endurosat-raises-100m-opens-new-space-center/' },
  { companyName: 'Bellatrix Aerospace', date: '2026-03-01', amount: 20_000_000, seriesLabel: 'Pre-Series B', roundType: 'equity', leadInvestor: 'Cactus Partners', investors: [], notes: 'Date precision is month-only per source', source: 'YourStory', sourceUrl: 'https://yourstory.com/2026/03/bellatrix-aerospace-raises-20-million-led-by-cactus-partners' },
  { companyName: 'LandSpace', date: '2025-12-01', amount: 123_000_000, seriesLabel: 'Growth', roundType: 'equity', investors: [], notes: 'State-backed funding; date precision is month-only per source', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/chinas-landspace-secures-state-backed-funding-for-reusable-rockets/' },
  { companyName: 'Blue Origin', date: '2026-07-08', amount: 10_000_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Coatue Management', investors: ['Jeff Bezos ($2B personal)'], notes: "First-ever outside round; up to $10B at ~$130B pre-money", source: 'CNBC', sourceUrl: 'https://www.cnbc.com/2026/07/08/blue-origin-bezos-fundraising.html' },
  { companyName: 'Relativity Space', date: '2025-03-01', amount: 800_000_000, seriesLabel: 'Growth', roundType: 'equity', leadInvestor: 'Eric Schmidt', investors: [], notes: 'Schmidt became CEO; approximate figure per reporting; date precision is month-only per source', source: 'SpaceNews', sourceUrl: 'https://spacenews.com/relativity-names-eric-schmidt-as-ceo-as-it-updates-terran-r-development/' },
];

// ────────────────────────────────────────────────────────────────
// Part 3 — company field corrections
// ────────────────────────────────────────────────────────────────

interface CorrectionInput {
  companyName: string;
  data: Record<string, unknown>;
}

const CORRECTIONS: CorrectionInput[] = [
  { companyName: 'Castelion', data: { valuation: 13_000_000_000, totalFunding: 1_250_000_000, lastFundingRound: 'Series C', lastFundingDate: utcDate('2026-08-19'), headquarters: 'Torrance, California' } },
  { companyName: 'SpaceX', data: { isPublic: true, ticker: 'SPCX', exchange: 'NASDAQ', ownershipType: 'public', marketCap: 2_100_000_000_000, valuation: 2_100_000_000_000, lastFundingRound: 'IPO', lastFundingDate: utcDate('2026-06-12') } },
  { companyName: 'Firefly Aerospace', data: { isPublic: true, ticker: 'FLY', exchange: 'NASDAQ', ownershipType: 'public', lastFundingRound: 'IPO', lastFundingDate: utcDate('2025-08-07'), valuation: 8_500_000_000 } },
  { companyName: 'Voyager Technologies', data: { isPublic: true, ticker: 'VOYG', exchange: 'NYSE', ownershipType: 'public', lastFundingRound: 'IPO', lastFundingDate: utcDate('2025-06-12'), valuation: 3_800_000_000 } },
  { companyName: 'Anduril Industries', data: { valuation: 61_000_000_000, totalFunding: 12_000_000_000, lastFundingRound: 'Series H', lastFundingDate: utcDate('2026-05-13') } },
  { companyName: 'Sierra Space', data: { valuation: 8_000_000_000, totalFunding: 2_240_000_000, lastFundingRound: 'Series C', lastFundingDate: utcDate('2026-03-05') } },
  { companyName: 'Vast', data: { totalFunding: 1_300_000_000, lastFundingRound: 'Growth', lastFundingDate: utcDate('2026-03-05'), valuation: 2_300_000_000 } },
  { companyName: 'Blue Origin', data: { valuation: 130_000_000_000, lastFundingRound: 'Growth (Coatue)', lastFundingDate: utcDate('2026-07-08') } },
  { companyName: 'Axiom Space', data: { valuation: 2_500_000_000, lastFundingRound: 'Growth', lastFundingDate: utcDate('2026-06-04') } },
  { companyName: 'Relativity Space', data: { lastFundingRound: 'Growth (Schmidt)', lastFundingDate: utcDate('2025-03-01') } },
  { companyName: 'Stoke Space', data: { totalFunding: 1_895_000_000, lastFundingRound: 'Series D Extension', lastFundingDate: utcDate('2026-02-11') } },
  { companyName: 'True Anomaly', data: { valuation: 2_200_000_000, totalFunding: 1_010_000_000, lastFundingRound: 'Series D', lastFundingDate: utcDate('2026-04-28') } },
  { companyName: 'K2 Space', data: { valuation: 6_800_000_000, totalFunding: 970_000_000, lastFundingRound: 'Series D', lastFundingDate: utcDate('2026-08-03') } },
  { companyName: 'Hadrian', data: { valuation: 7_870_000_000, lastFundingRound: 'Series D', lastFundingDate: utcDate('2026-08-06') } },
  { companyName: 'ICEYE', data: { valuation: 12_000_000_000, lastFundingRound: 'Series F', lastFundingDate: utcDate('2026-06-09') } },
  { companyName: 'Impulse Space', data: { totalFunding: 975_000_000, lastFundingRound: 'Series D', lastFundingDate: utcDate('2026-06-02') } },
  { companyName: 'Astranis', data: { valuation: 2_800_000_000, lastFundingRound: 'Series E', lastFundingDate: utcDate('2026-05-06') } },
];

// ────────────────────────────────────────────────────────────────
// Part 4 — Anduril dedupe
// ────────────────────────────────────────────────────────────────

const ANDURIL_DUPLICATE_SLUG = 'anduril';
const ANDURIL_CANONICAL_SLUG = 'anduril-industries';

async function dedupeAnduril() {
  console.log('\n-- Part 4: Anduril dedupe --\n');

  const duplicate = await prisma.companyProfile.findUnique({
    where: { slug: ANDURIL_DUPLICATE_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!duplicate) {
    console.log(`  Slug '${ANDURIL_DUPLICATE_SLUG}' not found — already deduped or never existed. Skipping.`);
    return;
  }

  const canonical = await prisma.companyProfile.findUnique({
    where: { slug: ANDURIL_CANONICAL_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!canonical) {
    console.error(`  ERROR: canonical slug '${ANDURIL_CANONICAL_SLUG}' not found. Cannot merge duplicate '${ANDURIL_DUPLICATE_SLUG}' — skipping dedupe.`);
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const products = await tx.companyProduct.updateMany({
      where: { companyId: duplicate.id },
      data: { companyId: canonical.id },
    });
    const personnel = await tx.keyPersonnel.updateMany({
      where: { companyId: duplicate.id },
      data: { companyId: canonical.id },
    });
    await tx.companyProfile.delete({ where: { id: duplicate.id } });
    return { products: products.count, personnel: personnel.count };
  });

  console.log(`  Merged duplicate '${ANDURIL_DUPLICATE_SLUG}' (${duplicate.id}) into canonical '${ANDURIL_CANONICAL_SLUG}' (${canonical.id})`);
  console.log(`    Reassigned ${result.products} product(s), ${result.personnel} key personnel row(s)`);
  console.log(`    Deleted duplicate profile '${ANDURIL_DUPLICATE_SLUG}'`);
}

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SpaceNexus: Refresh Startup Funding Data (2025-2026) ===');

  // Part 4 runs first so the company index built below already reflects
  // the merged Anduril profile (no lingering 'anduril' duplicate).
  await dedupeAnduril();

  const resolver = new CompanyResolver();
  await resolver.load();

  // ── Part 1: company matching / minimal-profile creation ──────
  console.log('\n-- Part 1: company matching --\n');

  const uniqueCompanyNames = Array.from(new Set(FUNDING_ROUNDS.map((r) => r.companyName)));
  let companiesCreated = 0;
  let companiesMatched = 0;

  for (const name of uniqueCompanyNames) {
    const existing = resolver.resolve(name);
    if (existing) {
      companiesMatched++;
      continue;
    }

    const info = COMPANY_INFO[name];
    if (!info) {
      console.warn(`  ! WARNING: no dataset info for "${name}" — creating with generic fallback description/sector. Please enrich manually.`);
    }

    const slug = slugify(name);
    try {
      const created = await prisma.companyProfile.create({
        data: {
          slug,
          name,
          description: info?.description ?? `${name} is a space industry company referenced in 2025-2026 funding data; profile pending manual enrichment.`,
          country: info?.country,
          sector: info?.sector ?? 'other',
          ownershipType: 'private',
          isPublic: false,
          tier: 3,
          dataCompleteness: 25,
        },
        select: { id: true, slug: true, name: true },
      });
      resolver.register(created);
      companiesCreated++;
      console.log(`  + Created: ${name} (slug: ${slug})`);
    } catch (err) {
      console.error(`  ! Failed to create profile for "${name}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${companiesCreated} created, ${companiesMatched} matched to existing profiles\n`);

  // ── Part 2: funding rounds upsert ─────────────────────────────
  console.log('-- Part 2: funding rounds --\n');

  let roundsCreated = 0;
  let roundsSkipped = 0;
  let roundsFailed = 0;

  for (const round of FUNDING_ROUNDS) {
    const company = resolver.resolve(round.companyName);
    if (!company) {
      console.error(`  ! Skipped round (company not resolved): ${round.companyName} ${round.seriesLabel} ${round.date}`);
      roundsFailed++;
      continue;
    }

    const roundDate = utcDate(round.date);

    const existingForSeries = await prisma.fundingRound.findMany({
      where: { companyId: company.id, seriesLabel: round.seriesLabel },
      select: { id: true, date: true },
    });

    const duplicate = existingForSeries.find(
      (r) => r.date.getUTCFullYear() === roundDate.getUTCFullYear() && r.date.getUTCMonth() === roundDate.getUTCMonth()
    );

    if (duplicate) {
      roundsSkipped++;
      console.log(`  = Skipped (already exists): ${company.name} — ${round.seriesLabel} (${round.date})`);
      continue;
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
      roundsCreated++;
      console.log(`  + Created: ${company.name} — ${round.seriesLabel} $${(round.amount / 1_000_000).toLocaleString()}M (${round.date})`);
    } catch (err) {
      roundsFailed++;
      console.error(`  ! Failed to create round for ${company.name} — ${round.seriesLabel}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Summary: ${roundsCreated} created, ${roundsSkipped} skipped (already exist), ${roundsFailed} failed\n`);

  // ── Part 3: company field corrections ─────────────────────────
  console.log('-- Part 3: company field corrections --\n');

  let correctionsApplied = 0;
  let correctionsSkipped = 0;

  for (const correction of CORRECTIONS) {
    const company = resolver.resolve(correction.companyName);
    if (!company) {
      console.error(`  ! Skipped correction (company not resolved): ${correction.companyName}`);
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

  console.log('=== Done ===');
  console.log(`  Companies: ${companiesCreated} created, ${companiesMatched} matched`);
  console.log(`  Funding rounds: ${roundsCreated} created, ${roundsSkipped} skipped, ${roundsFailed} failed`);
  console.log(`  Corrections: ${correctionsApplied} applied, ${correctionsSkipped} skipped`);
}

main()
  .catch((err) => {
    console.error('Refresh failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
