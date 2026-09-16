/**
 * SpaceNexus Research — full-history data exports.
 *
 * What is NEW here, and what deliberately is not:
 *   NEW      — complete, uncapped, analyst-shaped extracts of the funding,
 *              supply-chain and Space Score data as CSV or JSON.
 *   UNCHANGED — /api/export/[module] (companies, events, news; any signed-in
 *              member; 1,000 rows) is untouched. So are the per-chart and
 *              per-dataset CSV routes and the free "CSV downloads" line on the
 *              Explorer plan. Research adds a second, wider door; it does not
 *              narrow the existing one.
 *
 * Every dataset here is read-only and side-effect free.
 */

import prisma from '@/lib/db';
import {
  COMPANIES_HOUSE_ATTRIBUTION_LONG,
  COMPANIES_HOUSE_LICENCE_NAME,
  COMPANIES_HOUSE_LICENCE_URL,
  UK_REGISTRY_SOURCE_LABEL,
} from '@/lib/uk-registry/attribution';
import {
  SUPPLY_CHAIN_COMPANIES,
  SUPPLY_RELATIONSHIPS,
  SUPPLY_SHORTAGES,
} from '@/lib/supply-chain-data';
import { BOM_RISK_ITEMS } from '@/lib/supply-chain-bom-risks';
import { getLeaderboard } from '@/lib/space-score';

export type ResearchDatasetId =
  | 'funding-rounds'
  | 'supply-chain-companies'
  | 'supply-chain-relationships'
  | 'supply-chain-shortages'
  | 'bom-risks'
  | 'space-score-history';

export interface ResearchDataset {
  id: ResearchDatasetId;
  label: string;
  /** Column order for CSV. Also the JSON key order. */
  columns: string[];
  /**
   * Honest coverage statement. Shown on /research and returned in the export's
   * own metadata, because an export whose limits are undocumented is how a
   * research product loses a customer.
   */
  coverage: string;
  rows: () => Promise<Record<string, unknown>[]>;
}

// ---------------------------------------------------------------------------
// Attribution and provenance — what travels INSIDE every file
// ---------------------------------------------------------------------------

/**
 * A credit that has to appear wherever the data it describes is shown or
 * shipped.
 *
 * `required: true` means the licence is conditional: reuse is granted ONLY
 * while the credit is given. The Open Government Licence v3.0, which covers
 * the Crown-copyright UK Companies House register, says the rights "end
 * automatically" if the condition is not met. That is not a courtesy line we
 * can drop to save a row in a CSV.
 */
export interface SourceCredit {
  source: string;
  licence: string;
  licenceUrl: string;
  /** The wording the Information Provider specifies, verbatim. */
  statement: string;
  required: boolean;
}

/**
 * Register-derived facts reach these exports indirectly and that still counts.
 * companies-house-fetcher.ts writes CompanyProfile.foundedYear and .legalName
 * and creates KeyPersonnel rows from the register (see the recordProvenance
 * calls with source = UK_REGISTRY_SOURCE_LABEL), and those profile fields are
 * joined into the funding-rounds export and read on every release edition. So
 * the credit ships with the file, not only on /data-sources.
 */
export const RESEARCH_SOURCE_CREDITS: SourceCredit[] = [
  {
    source: UK_REGISTRY_SOURCE_LABEL,
    licence: COMPANIES_HOUSE_LICENCE_NAME,
    licenceUrl: COMPANIES_HOUSE_LICENCE_URL,
    statement: COMPANIES_HOUSE_ATTRIBUTION_LONG,
    required: true,
  },
];

/** One line per credit, licence URL included. Used in CSV headers and email. */
export const RESEARCH_ATTRIBUTION_LINES: string[] = RESEARCH_SOURCE_CREDITS.map(
  (c) => `${c.statement} Licence: ${c.licenceUrl}`
);

export interface ExportProvenance {
  /** What this file is, in the product's own words. */
  title: string;
  /** The page the file was produced from, so a stray CSV can be traced back. */
  sourceUrl?: string;
  /** The citation line, where the surface has one. */
  citation?: string;
  /** A standing legal notice (e.g. not investment advice), where one applies. */
  notice?: string | null;
  /** The honest coverage statement(s) — what these numbers cannot see. */
  coverage: string[];
  rowCount?: number;
  generatedAt?: Date;
}

/**
 * The provenance block that goes INSIDE a CSV.
 *
 * Why inside: coverage and attribution used to travel only as the
 * X-SpaceNexus-Coverage response header. A header survives exactly as long as
 * the HTTP response — the moment the file is on an analyst's disk it says
 * nothing about what it can and cannot see, which contradicts /research's own
 * promise that the statement is "attached to the file, not just printed on
 * this page". A spreadsheet opened in six months has to answer for itself.
 *
 * Shape: leading `#` comment rows, each emitted as ONE quoted CSV field so a
 * strict parser sees a single-column row rather than ragged columns, and every
 * row still reads as plain text in column A of Excel.
 */
export function csvProvenanceHeader(p: ExportProvenance): string {
  const when = (p.generatedAt ?? new Date()).toISOString();
  const lines: string[] = [
    `# ${p.title}`,
    '# SpaceNexus Research export — https://spacenexus.us/research',
    `# Generated: ${when}`,
  ];
  if (typeof p.rowCount === 'number') lines.push(`# Rows: ${p.rowCount}`);
  if (p.sourceUrl) lines.push(`# Source page: ${p.sourceUrl}`);
  if (p.citation) lines.push(`# Cite as: ${p.citation}`);
  if (p.notice) lines.push(`# Notice: ${p.notice}`);
  for (const c of p.coverage) lines.push(`# Coverage: ${c}`);
  for (const line of RESEARCH_ATTRIBUTION_LINES) lines.push(`# Attribution: ${line}`);
  lines.push('#');
  // csvCell quotes anything containing a comma, quote or newline, so each
  // comment survives as one field.
  // CRLF row separators, matching toResearchCsv and what Excel expects.
  const CRLF = String.fromCharCode(13, 10);
  return lines.map(csvCell).join(CRLF) + CRLF;
}

/** The same provenance as a JSON object, for the .json exports. */
export function jsonProvenance(): {
  attribution: string[];
  sources: SourceCredit[];
} {
  return {
    attribution: RESEARCH_ATTRIBUTION_LINES,
    sources: RESEARCH_SOURCE_CREDITS,
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (Array.isArray(value)) s = value.join('; ');
  else s = String(value);
  // Neutralise spreadsheet formula injection: a leading =, +, - or @ makes
  // Excel evaluate the cell. Prefixing an apostrophe keeps the text visible
  // and inert, which matters because some of these fields are ingested from
  // press releases and ATS feeds.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC-4180 CSV with CRLF row separators, which is what Excel expects. */
export function toResearchCsv(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  const head = columns.map(csvCell).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(','));
  return [head, ...body].join('\r\n');
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const companyById = new Map(SUPPLY_CHAIN_COMPANIES.map((c) => [c.id, c]));

export const RESEARCH_DATASETS: Record<ResearchDatasetId, ResearchDataset> = {
  'funding-rounds': {
    id: 'funding-rounds',
    label: 'Funding rounds (full history)',
    coverage:
      'Every funding round we hold, from the earliest dated round to today, joined to the company profile. Amounts are as reported; undisclosed rounds are present with a blank amount rather than dropped. Sources are named per row.',
    columns: [
      'roundId',
      'date',
      'companySlug',
      'companyName',
      'ticker',
      'sector',
      'subsector',
      'country',
      'headquarters',
      'seriesLabel',
      'roundType',
      'amountUsd',
      'currency',
      'preValuation',
      'postValuation',
      'leadInvestor',
      'investors',
      'investorCount',
      'source',
      'sourceUrl',
      'notes',
    ],
    rows: async () => {
      const rounds = await prisma.fundingRound.findMany({
        orderBy: [{ date: 'desc' }, { id: 'asc' }],
        include: {
          company: {
            select: {
              slug: true,
              name: true,
              ticker: true,
              sector: true,
              subsector: true,
              country: true,
              headquarters: true,
            },
          },
        },
      });
      return rounds.map((r) => ({
        roundId: r.id,
        date: r.date ? r.date.toISOString().slice(0, 10) : '',
        companySlug: r.company?.slug ?? '',
        companyName: r.company?.name ?? '',
        ticker: r.company?.ticker ?? '',
        sector: r.company?.sector ?? '',
        subsector: r.company?.subsector ?? '',
        country: r.company?.country ?? '',
        headquarters: r.company?.headquarters ?? '',
        seriesLabel: r.seriesLabel ?? '',
        roundType: r.roundType ?? '',
        amountUsd: r.amount ?? '',
        currency: r.currency,
        preValuation: r.preValuation ?? '',
        postValuation: r.postValuation ?? '',
        leadInvestor: r.leadInvestor ?? '',
        investors: r.investors ?? [],
        investorCount: (r.investors ?? []).length,
        source: r.source ?? '',
        sourceUrl: r.sourceUrl ?? '',
        notes: r.notes ?? '',
      }));
    },
  },

  'supply-chain-companies': {
    id: 'supply-chain-companies',
    label: 'Supply-chain companies',
    coverage:
      'Our curated aerospace supply-chain roster: primes and tier 1-3 suppliers with country, products, declared customers and suppliers, and a criticality rating. Curated, not exhaustive — it covers the suppliers that matter to Western launch, satellite and station programmes.',
    columns: [
      'id',
      'slug',
      'name',
      'tier',
      'criticality',
      'country',
      'countryCode',
      'headquarters',
      'employeeCount',
      'annualRevenueUsd',
      'products',
      'customers',
      'suppliers',
      'website',
      'description',
    ],
    rows: async () =>
      SUPPLY_CHAIN_COMPANIES.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        tier: c.tier,
        criticality: c.criticality,
        country: c.country,
        countryCode: c.countryCode,
        headquarters: c.headquarters ?? '',
        employeeCount: c.employeeCount ?? '',
        annualRevenueUsd: c.annualRevenue ?? '',
        products: c.products,
        customers: c.customers,
        suppliers: c.suppliers,
        website: c.website ?? '',
        description: c.description ?? '',
      })),
  },

  'supply-chain-relationships': {
    id: 'supply-chain-relationships',
    label: 'Supply-chain relationships',
    coverage:
      'Directed supplier-to-customer edges with geopolitical risk, criticality and, where disclosed, annual contract value. Edges are documented relationships only; an absent edge means we have no public evidence, not that none exists.',
    columns: [
      'id',
      'supplierId',
      'supplierName',
      'supplierTier',
      'supplierCountry',
      'customerId',
      'customerName',
      'customerTier',
      'customerCountry',
      'products',
      'annualValueUsd',
      'geopoliticalRisk',
      'isCritical',
      'notes',
    ],
    rows: async () =>
      SUPPLY_RELATIONSHIPS.map((r) => {
        const supplier = companyById.get(r.supplierId);
        const customer = companyById.get(r.customerId);
        return {
          id: r.id,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          supplierTier: supplier?.tier ?? '',
          supplierCountry: supplier?.countryCode ?? '',
          customerId: r.customerId,
          customerName: r.customerName,
          customerTier: customer?.tier ?? '',
          customerCountry: customer?.countryCode ?? '',
          products: r.products,
          annualValueUsd: r.annualValue ?? '',
          geopoliticalRisk: r.geopoliticalRisk,
          isCritical: r.isCritical,
          notes: r.notes ?? '',
        };
      }),
  },

  'supply-chain-shortages': {
    id: 'supply-chain-shortages',
    label: 'Material shortages',
    coverage:
      'Tracked material and component shortages with severity, affected products, named alternative suppliers and geopolitical drivers. Maintained by hand; dates reflect when we recorded the shortage, not necessarily when it began.',
    columns: [
      'id',
      'material',
      'category',
      'severity',
      'affectedProducts',
      'impactedCompanies',
      'alternativeSuppliers',
      'geopoliticalFactors',
      'startDate',
      'estimatedResolution',
      'notes',
    ],
    rows: async () =>
      SUPPLY_SHORTAGES.map((s) => ({
        id: s.id,
        material: s.material,
        category: s.category,
        severity: s.severity,
        affectedProducts: s.affectedProducts,
        impactedCompanies: s.impactedCompanies,
        alternativeSuppliers: s.alternativeSuppliers,
        geopoliticalFactors: s.geopoliticalFactors ?? [],
        startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : '',
        estimatedResolution: s.estimatedResolution ?? '',
        notes: s.notes,
      })),
  },

  'bom-risks': {
    id: 'bom-risks',
    label: 'BOM risk items',
    coverage:
      'Bill-of-materials risk register for orbital systems: component, category, risk level, lead time, primary suppliers, qualified alternatives and historical incidents. Analyst-maintained; the risk levels are our assessment, and the factors behind each one are exported with it.',
    columns: [
      'id',
      'component',
      'category',
      'riskLevel',
      'leadTime',
      'usedIn',
      'primarySuppliers',
      'supplierCompanyIds',
      'alternatives',
      'alternativeCount',
      'riskFactors',
      'affectedSubsystems',
      'costImpactRange',
      'mitigationCount',
      'historicalIncidentCount',
      'notes',
    ],
    rows: async () =>
      BOM_RISK_ITEMS.map((b) => ({
        id: b.id,
        component: b.component,
        category: b.category,
        riskLevel: b.riskLevel,
        leadTime: b.leadTime,
        usedIn: b.usedIn,
        primarySuppliers: b.primarySuppliers,
        supplierCompanyIds: b.supplierCompanyIds ?? [],
        alternatives: b.alternatives,
        alternativeCount: b.alternatives.length,
        riskFactors: b.riskFactors,
        affectedSubsystems: b.affectedSubsystems ?? [],
        costImpactRange: b.costImpactRange ?? '',
        mitigationCount: (b.mitigationStrategies ?? []).length,
        historicalIncidentCount: (b.historicalIncidents ?? []).length,
        notes: b.notes,
      })),
  },

  'space-score-history': {
    id: 'space-score-history',
    label: 'Space Score history',
    coverage:
      'Daily Space Score readings with the per-pillar breakdown and the methodology version in force. History begins the day snapshots started (2026-09) and is NOT backfilled — earlier dates do not exist and we will not invent them. The current leaderboard stays free for everyone at /space-score.',
    columns: [
      'day',
      'companySlug',
      'companyName',
      'sector',
      'score',
      'tier',
      'methodologyVersion',
      'components',
    ],
    rows: async () => {
      const snaps = await prisma.spaceScoreSnapshot.findMany({
        orderBy: [{ day: 'desc' }, { companySlug: 'asc' }],
      });
      return snaps.map((s) => ({
        day: s.day.toISOString().slice(0, 10),
        companySlug: s.companySlug,
        companyName: s.companyName,
        sector: s.sector ?? '',
        score: s.score,
        tier: s.tier ?? '',
        methodologyVersion: s.methodologyVersion,
        components: s.components ? JSON.stringify(s.components) : '',
      }));
    },
  },
};

export const RESEARCH_DATASET_IDS = Object.keys(RESEARCH_DATASETS) as ResearchDatasetId[];

export function isResearchDatasetId(value: string): value is ResearchDatasetId {
  return Object.prototype.hasOwnProperty.call(RESEARCH_DATASETS, value);
}

/**
 * Write today's Space Score reading for every scored company. Idempotent per
 * UTC day thanks to the (companySlug, day) unique constraint, so a cron retry
 * updates rather than duplicating.
 */
export async function captureSpaceScoreSnapshot(now: Date = new Date()): Promise<{
  day: string;
  written: number;
}> {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const leaderboard = getLeaderboard();
  let written = 0;

  for (const entry of leaderboard) {
    const payload = {
      companySlug: entry.slug,
      companyName: entry.name,
      day,
      score: Math.round(entry.score.total),
      tier: entry.score.tier?.label ?? null,
      sector: entry.sector ?? null,
      components: entry.score.breakdown.map((d) => ({
        key: d.key,
        name: d.name,
        score: d.score,
        maxScore: d.maxScore,
      })),
      methodologyVersion: SPACE_SCORE_METHODOLOGY_VERSION,
    };
    await prisma.spaceScoreSnapshot.upsert({
      where: { companySlug_day: { companySlug: entry.slug, day } },
      create: payload,
      update: payload,
    });
    written += 1;
  }

  return { day: day.toISOString().slice(0, 10), written };
}

/**
 * Bump this whenever calculateSpaceScore's weights change, so a subscriber
 * reading a two-year-old row can tell which rulebook produced it. Changing the
 * weights without bumping it silently corrupts the time series.
 */
export const SPACE_SCORE_METHODOLOGY_VERSION = '1';
