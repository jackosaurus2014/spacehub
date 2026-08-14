/**
 * Company roster adapter — CompanyProfile is the single source of truth.
 *
 * Historically the site had TWO company databases that could disagree:
 *   - SpaceCompany      (legacy, seeded from src/lib/companies-data.ts)
 *   - CompanyProfile    (canonical 253-company DB behind /company-profiles,
 *                        /startups, jobs relations, and funding rounds)
 *
 * Founder decision (2026-08): merge on CompanyProfile. This module adapts
 * CompanyProfile rows to the legacy "SpaceCompany" response shape that
 * /market-intel and the public v1 API were built around (marketCap/valuation
 * in BILLIONS USD, funding in MILLIONS USD, ISO-3 country codes, snake_case
 * focusAreas), so existing UI needs no changes.
 *
 * The legacy SpaceCompany Prisma model is DORMANT: the table still exists in
 * prisma/schema.prisma (deliberately unchanged — schema is owned elsewhere)
 * but no application code reads or writes it anymore. Any remaining rows are
 * migrated by scripts/merge-space-companies.ts.
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { IPO_PIPELINE } from '@/lib/startup-hub-data';

// ─── Country codes ──────────────────────────────────────────────────────────
// CompanyProfile stores ISO-2 ("US"); the legacy UI vocabulary is ISO-3 ("USA").

const ISO2_TO_ISO3: Record<string, string> = {
  US: 'USA', CN: 'CHN', RU: 'RUS', JP: 'JPN', FR: 'FRA', GB: 'GBR', UK: 'GBR',
  DE: 'DEU', IN: 'IND', KR: 'KOR', IL: 'ISR', NZ: 'NZL', AU: 'AUS', CA: 'CAN',
  LU: 'LUX', AE: 'ARE', IT: 'ITA', ES: 'ESP', FI: 'FIN', SE: 'SWE', CH: 'CHE',
  NO: 'NOR', DK: 'DNK', PL: 'POL', UA: 'UKR', SG: 'SGP', TW: 'TWN', BR: 'BRA',
  MX: 'MEX', AR: 'ARG', TR: 'TUR', SA: 'SAU', NL: 'NLD', BE: 'BEL', AT: 'AUT',
  PT: 'PRT', GR: 'GRC', CZ: 'CZE', IE: 'IRL', ZA: 'ZAF', EU: 'EUR', BG: 'BGR',
  RO: 'ROU', HU: 'HUN', SK: 'SVK', SI: 'SVN', LT: 'LTU', LV: 'LVA', EE: 'EST',
};

const ISO3_TO_ISO2: Record<string, string> = Object.fromEntries(
  Object.entries(ISO2_TO_ISO3)
    .filter(([iso2]) => iso2 !== 'UK')
    .map(([iso2, iso3]) => [iso3, iso2])
);

/** Convert a stored country code (usually ISO-2) to the legacy ISO-3 form. */
export function toLegacyCountry(country: string | null | undefined): string {
  if (!country) return '';
  const c = country.toUpperCase();
  if (c.length === 3) return c;
  return ISO2_TO_ISO3[c] || c;
}

/** All stored-code candidates for a legacy ISO-3 filter value. */
export function countryFilterValues(iso3: string): string[] {
  const c = iso3.toUpperCase();
  const iso2 = ISO3_TO_ISO2[c];
  return iso2 ? [c, iso2] : [c];
}

// ─── Pre-IPO derivation ─────────────────────────────────────────────────────
// CompanyProfile has no isPreIPO/expectedIPODate columns. The curated IPO
// pipeline in startup-hub-data.ts (asOf-stamped, source-verified) is the
// honest source for "pre-IPO" status. Entries that explicitly ruled out an
// IPO are excluded.

const PRE_IPO_ENTRIES = IPO_PIPELINE.filter(
  (e) => e.profileSlug && !/not pursuing/i.test(e.status)
);

export const PRE_IPO_SLUGS: string[] = PRE_IPO_ENTRIES.map((e) => e.profileSlug!);

const PRE_IPO_STATUS_BY_SLUG = new Map<string, string>(
  PRE_IPO_ENTRIES.map((e) => [e.profileSlug!, e.status])
);

// ─── Focus areas ────────────────────────────────────────────────────────────
// Legacy snake_case focusAreas vocabulary (src/types FOCUS_AREAS) mapped to
// CompanyProfile sector / subsector / kebab-case tags.

interface FocusMatcher {
  sectors?: string[];
  tags: string[];
}

const FOCUS_AREA_MATCHERS: Record<string, FocusMatcher> = {
  launch_provider: {
    sectors: ['launch'],
    tags: ['launch-provider', 'launch', 'launch-services', 'small-lift', 'medium-lift', 'heavy-lift', 'reusable'],
  },
  satellites: {
    sectors: ['satellite'],
    tags: ['satellites', 'satellite-manufacturing', 'satellite-operator', 'smallsat', 'small-sat', 'cubesat', 'constellation', 'satellite-bus'],
  },
  space_stations: {
    tags: ['space-station', 'space-stations', 'commercial-station', 'habitats', 'leo-destinations'],
  },
  lunar: {
    tags: ['lunar', 'moon', 'cislunar', 'lunar-lander', 'lunar-rover'],
  },
  mars: {
    tags: ['mars'],
  },
  defense: {
    sectors: ['defense'],
    tags: ['defense', 'national-security', 'missile-warning', 'missile-defense', 'space-domain-awareness'],
  },
  earth_observation: {
    tags: ['earth-observation', 'eo', 'sar', 'remote-sensing', 'hyperspectral', 'imagery', 'geospatial'],
  },
  communications: {
    tags: ['communications', 'satcom', 'connectivity', 'broadband', 'optical-communications', 'laser-comms', 'iot', 'direct-to-device'],
  },
  in_space_services: {
    tags: ['in-space-services', 'on-orbit-servicing', 'osam', 'servicing', 'debris-removal', 'space-logistics', 'in-space-transportation', 'orbital-transfer', 'rendezvous'],
  },
  manufacturing: {
    sectors: ['manufacturing'],
    tags: ['manufacturing', 'in-space-manufacturing', 'additive-manufacturing', 'spacecraft-components', 'components'],
  },
  propulsion: {
    tags: ['propulsion', 'engines', 'electric-propulsion', 'thrusters'],
  },
  space_tourism: {
    tags: ['space-tourism', 'tourism', 'human-spaceflight', 'private-astronaut'],
  },
  asteroid_mining: {
    tags: ['asteroid-mining', 'space-resources', 'space-mining', 'isru'],
  },
  space_infrastructure: {
    sectors: ['infrastructure', 'ground-segment'],
    tags: ['infrastructure', 'space-infrastructure', 'ground-segment', 'ground-stations', 'ground-station'],
  },
};

/** Derive legacy focusAreas values from a profile's sector/subsector/tags. */
export function deriveFocusAreas(
  sector: string | null,
  subsector: string | null,
  tags: string[] | null | undefined
): string[] {
  const tagSet = new Set((tags || []).map((t) => t.toLowerCase()));
  if (subsector) tagSet.add(subsector.toLowerCase());
  const sectorLower = sector?.toLowerCase() || '';

  const areas: string[] = [];
  for (const [area, matcher] of Object.entries(FOCUS_AREA_MATCHERS)) {
    const sectorHit = matcher.sectors?.includes(sectorLower) ?? false;
    const tagHit = matcher.tags.some((t) => tagSet.has(t));
    if (sectorHit || tagHit) areas.push(area);
  }

  // Fallback so every company shows at least one chip.
  if (areas.length === 0 && sector) areas.push(sector.replace(/-/g, '_'));
  return areas;
}

/** Prisma where fragment matching a legacy focusArea filter value. */
export function focusAreaWhere(focusArea: string): Prisma.CompanyProfileWhereInput {
  const matcher = FOCUS_AREA_MATCHERS[focusArea];
  if (matcher) {
    const or: Prisma.CompanyProfileWhereInput[] = [
      { tags: { hasSome: matcher.tags } },
      { subsector: { in: matcher.tags } },
    ];
    if (matcher.sectors) or.push({ sector: { in: matcher.sectors } });
    return { OR: or };
  }
  // Unknown value: loose match against sector/subsector/tags.
  const kebab = focusArea.replace(/_/g, '-');
  return {
    OR: [
      { sector: { contains: focusArea, mode: 'insensitive' } },
      { subsector: { contains: focusArea, mode: 'insensitive' } },
      { tags: { hasSome: Array.from(new Set([focusArea, kebab])) } },
    ],
  };
}

// ─── Legacy record shape ────────────────────────────────────────────────────

/**
 * Mirrors the response shape the old SpaceCompany-backed endpoints returned:
 * marketCap/valuation in BILLIONS USD, funding amounts in MILLIONS USD,
 * founded as a year, focusAreas as a parsed array.
 */
export interface LegacyCompanyRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  country: string;
  headquarters: string | null;
  founded: number | null;
  website: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  ticker: string | null;
  exchange: string | null;
  marketCap: number | null;
  stockPrice: number | null;
  priceChange24h: number | null;
  isPreIPO: boolean;
  expectedIPODate: string | null;
  lastFundingRound: string | null;
  lastFundingAmount: number | null;
  lastFundingDate: string | null;
  totalFunding: number | null;
  nextFundingRound: string | null;
  valuation: number | null;
  focusAreas: string[];
  subSectors: string[] | null;
  employeeCount: number | null;
  revenueEstimate: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const LEGACY_PROFILE_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  country: true,
  headquarters: true,
  foundedYear: true,
  website: true,
  logoUrl: true,
  isPublic: true,
  ticker: true,
  exchange: true,
  marketCap: true,
  stockPrice: true,
  priceChange24h: true,
  lastFundingRound: true,
  lastFundingDate: true,
  totalFunding: true,
  valuation: true,
  sector: true,
  subsector: true,
  tags: true,
  employeeCount: true,
  revenueEstimate: true,
  createdAt: true,
  updatedAt: true,
  fundingRounds: {
    orderBy: { date: 'desc' as const },
    take: 1,
    select: { amount: true, date: true, seriesLabel: true },
  },
} satisfies Prisma.CompanyProfileSelect;

type LegacyProfileRow = Prisma.CompanyProfileGetPayload<{
  select: typeof LEGACY_PROFILE_SELECT;
}>;

const usdToBillions = (usd: number | null | undefined): number | null =>
  usd === null || usd === undefined ? null : usd / 1_000_000_000;

const usdToMillions = (usd: number | null | undefined): number | null =>
  usd === null || usd === undefined ? null : usd / 1_000_000;

/** Adapt one CompanyProfile row to the legacy SpaceCompany response shape. */
export function profileToLegacyCompany(p: LegacyProfileRow): LegacyCompanyRecord {
  const latestRound = p.fundingRounds?.[0];
  const preIPO = !p.isPublic && PRE_IPO_STATUS_BY_SLUG.has(p.slug);
  const fundingDate = p.lastFundingDate ?? latestRound?.date ?? null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    country: toLegacyCountry(p.country),
    headquarters: p.headquarters,
    founded: p.foundedYear,
    website: p.website,
    logoUrl: p.logoUrl,
    isPublic: p.isPublic,
    ticker: p.ticker,
    exchange: p.exchange,
    marketCap: usdToBillions(p.marketCap),
    stockPrice: p.stockPrice,
    priceChange24h: p.priceChange24h,
    isPreIPO: preIPO,
    expectedIPODate: preIPO ? PRE_IPO_STATUS_BY_SLUG.get(p.slug) ?? null : null,
    lastFundingRound: p.lastFundingRound ?? latestRound?.seriesLabel ?? null,
    lastFundingAmount: usdToMillions(latestRound?.amount),
    lastFundingDate: fundingDate ? String(fundingDate.getUTCFullYear()) : null,
    totalFunding: usdToMillions(p.totalFunding),
    nextFundingRound: null, // no CompanyProfile home; legacy field retained for shape-compat
    valuation: usdToBillions(p.valuation),
    focusAreas: deriveFocusAreas(p.sector, p.subsector, p.tags),
    subSectors: p.subsector ? [p.subsector] : null,
    employeeCount: p.employeeCount,
    revenueEstimate: usdToMillions(p.revenueEstimate),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Defunct companies stay in /company-profiles but are excluded from the
 *  market roster. */
export const ROSTER_BASE_WHERE: Prisma.CompanyProfileWhereInput = {
  NOT: { status: 'defunct' },
};

export interface RosterQueryOptions {
  country?: string; // legacy ISO-3 value
  isPublic?: boolean;
  preIPO?: boolean;
  focusArea?: string;
  minFunding?: number; // millions USD (legacy semantics)
  foundedAfter?: number;
  sort?: 'totalFunding' | 'default';
  limit?: number;
  offset?: number;
}

export function buildRosterWhere(options: RosterQueryOptions): Prisma.CompanyProfileWhereInput {
  const and: Prisma.CompanyProfileWhereInput[] = [ROSTER_BASE_WHERE];

  if (options.country) {
    and.push({ country: { in: countryFilterValues(options.country) } });
  }
  if (options.isPublic !== undefined) {
    and.push({ isPublic: options.isPublic });
  }
  if (options.preIPO) {
    and.push({ slug: { in: PRE_IPO_SLUGS }, isPublic: false });
  }
  if (options.focusArea) {
    and.push(focusAreaWhere(options.focusArea));
  }
  if (options.minFunding !== undefined && options.minFunding > 0) {
    and.push({ totalFunding: { gt: 0 } });
  }
  if (options.foundedAfter !== undefined) {
    and.push({ foundedYear: { gte: options.foundedAfter } });
  }

  return { AND: and };
}

const DEFAULT_ROSTER_ORDER: Prisma.CompanyProfileOrderByWithRelationInput[] = [
  { isPublic: 'desc' },
  { marketCap: { sort: 'desc', nulls: 'last' } },
  { valuation: { sort: 'desc', nulls: 'last' } },
  { name: 'asc' },
];

export async function getRosterCompanies(
  options: RosterQueryOptions = {}
): Promise<{ companies: LegacyCompanyRecord[]; total: number }> {
  const { sort, limit = 50, offset = 0 } = options;
  const where = buildRosterWhere(options);

  const orderBy: Prisma.CompanyProfileOrderByWithRelationInput[] =
    sort === 'totalFunding'
      ? [
          { totalFunding: { sort: 'desc', nulls: 'last' } },
          { valuation: { sort: 'desc', nulls: 'last' } },
          { name: 'asc' },
        ]
      : DEFAULT_ROSTER_ORDER;

  const [rows, total] = await Promise.all([
    prisma.companyProfile.findMany({
      where,
      select: LEGACY_PROFILE_SELECT,
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.companyProfile.count({ where }),
  ]);

  return { companies: rows.map(profileToLegacyCompany), total };
}

export async function getCompanyStats() {
  const [total, publicCount, preIPOCount, countries, marketCapAgg] = await Promise.all([
    prisma.companyProfile.count({ where: ROSTER_BASE_WHERE }),
    prisma.companyProfile.count({ where: { ...ROSTER_BASE_WHERE, isPublic: true } }),
    prisma.companyProfile.count({
      where: { ...ROSTER_BASE_WHERE, isPublic: false, slug: { in: PRE_IPO_SLUGS } },
    }),
    prisma.companyProfile.groupBy({
      by: ['country'],
      where: ROSTER_BASE_WHERE,
      _count: { _all: true },
    }),
    prisma.companyProfile.aggregate({
      where: { ...ROSTER_BASE_WHERE, isPublic: true },
      _sum: { marketCap: true },
    }),
  ]);

  // Merge ISO-2 groups into legacy ISO-3 buckets.
  const byCountry: Record<string, number> = {};
  for (const group of countries) {
    if (!group.country) continue;
    const iso3 = toLegacyCountry(group.country);
    byCountry[iso3] = (byCountry[iso3] || 0) + group._count._all;
  }

  return {
    total,
    publicCount,
    privateCount: total - publicCount,
    preIPOCount,
    countriesCount: Object.keys(byCountry).length,
    // Legacy consumers expect billions USD.
    totalMarketCap: usdToBillions(marketCapAgg._sum.marketCap) || 0,
    byCountry,
  };
}

/**
 * Legacy init hook. CompanyProfile is seeded/maintained by the scripts/seed-*
 * and scripts/refresh-* pipeline, so this is a no-op that reports the current
 * roster size — kept so /api/init, /api/refresh, and /api/companies/init keep
 * working without a SpaceCompany dependency.
 */
export async function initializeCompanies(): Promise<number> {
  return prisma.companyProfile.count();
}
