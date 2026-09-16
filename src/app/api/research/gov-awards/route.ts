import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { csvProvenanceHeader, jsonProvenance, toResearchCsv } from '@/lib/research-export';
import prisma from '@/lib/db';
import {
  DEFAULT_SINCE,
  USASPENDING_SOURCE_KEY,
  USASPENDING_SOURCE_LABEL,
} from '@/lib/fetchers/usaspending-awards-fetcher';
import {
  isSpaceCoded,
  shortAgency,
  SPACE_NAICS_CODES,
  SPACE_PSC_CODES,
  SPACE_PSC_PREFIXES,
} from '@/lib/gov-awards/aggregate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Federal award rows for tracked space companies — the screening door.
 *
 * GATE: requireResearchAccess, server-side, before a single row is read. There
 * is no client-side check in this path and no query parameter that relaxes it.
 *
 * WHAT THIS IS FOR, and why it is separate from the release export.
 * /api/research/reports/federal-space-awards/<quarter> serves ONE published
 * edition: a fixed quarter, fixed tables, citable. This route serves the
 * underlying table on the buyer's own terms — any company, any agency, any
 * date range, any floor — because the question a strategy team actually asks
 * ("everything NASA has put on contract with these six companies since 2023")
 * does not fit a quarterly edition.
 *
 * Every row carries sourceUrl, so any figure in a model built on this file can
 * be walked back to the government record it came from.
 *
 * Query parameters, all optional:
 *   company=slug[,slug]   restrict to these CompanyProfile slugs
 *   agency=text           case-insensitive substring of the awarding agency
 *   since=YYYY-MM-DD      earliest base obligation date (default: our window)
 *   until=YYYY-MM-DD      latest base obligation date, exclusive
 *   minAmount=number      floor on obligated amount
 *   includeVehicles=true  include IDVs, which are excluded by default because
 *                         their value double-counts the orders beneath them
 *   spaceCoded=true       only awards the GOVERNMENT codes as space work
 *                         (space vehicles, space R&D, space transportation and
 *                         launch, space research, satellite telecom). For a
 *                         diversified prime this is the difference between its
 *                         space business and its whole federal book.
 *   format=csv|json       default json
 *   limit=1..5000         default 1000
 */
const MAX_LIMIT = 5000;
const DEFAULT_LIMIT = 1000;

const COVERAGE = [
  'Prime federal awards only, from USAspending.gov. Subawards are not included: that file is reported voluntarily and incompletely.',
  'Amounts are the OBLIGATED total on the award — money actually placed on contract — not an announced ceiling.',
  'Indefinite-delivery vehicles are excluded by default. Their reported value is the sum of the orders placed under them, and those orders are separate rows here, so including both counts the same money twice.',
  'spaceCoded says whether the GOVERNMENT codes the award as space work, through the award’s own product/service or industry code — never our reading of the description. The code and its official description travel with every row so the call can be checked. For a diversified prime, filtering on it is the difference between its space business and its whole federal book.',
  'The space-coded flag deliberately excludes the "guided missile and space vehicle manufacturing" industry codes, which conflate missiles with spacecraft, so it is a conservative floor.',
  'A row appears only where the recipient could be attributed to a tracked company on a Unique Entity ID, an exact name, or a name followed solely by generic corporate or federal-contracting words. matchQuality on every row says which.',
  'recipientName is the government’s spelling of the recipient. Compare it with company and matchQuality before citing a row.',
  'Defense contract records reach USAspending on a reporting lag of up to 90 days, so recent quarters are systematically incomplete and grow on later reads.',
  'Classified and unacknowledged procurement is not published on USAspending at all.',
];

function parseDay(value: string | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  if (format !== 'csv' && format !== 'json') {
    return validationError('format must be "csv" or "json".');
  }

  const sinceParam = url.searchParams.get('since');
  const untilParam = url.searchParams.get('until');
  if (sinceParam && !parseDay(sinceParam)) {
    return validationError('since must be YYYY-MM-DD.');
  }
  if (untilParam && !parseDay(untilParam)) {
    return validationError('until must be YYYY-MM-DD.');
  }
  const since = parseDay(sinceParam) ?? new Date(`${DEFAULT_SINCE}T00:00:00.000Z`);
  const until = parseDay(untilParam);

  const minAmountRaw = url.searchParams.get('minAmount');
  const minAmount = minAmountRaw === null ? null : Number(minAmountRaw);
  if (minAmount !== null && !Number.isFinite(minAmount)) {
    return validationError('minAmount must be a number.');
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  const slugs = (url.searchParams.get('company') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const agency = (url.searchParams.get('agency') ?? '').trim();
  const includeVehicles = url.searchParams.get('includeVehicles') === 'true';
  const spaceCodedOnlyFilter = url.searchParams.get('spaceCoded') === 'true';

  // The space-coded flag is set membership over the award's own PSC and NAICS
  // codes, so it pushes down into the query rather than filtering after `take`
  // — which would silently return fewer rows than the caller asked for.
  const spaceWhere = {
    OR: [
      ...SPACE_PSC_PREFIXES.map((p) => ({ pscCode: { startsWith: p } })),
      { pscCode: { in: [...SPACE_PSC_CODES] } },
      { naicsCode: { in: [...SPACE_NAICS_CODES] } },
      // Grants carry no product/service code; the government's own assistance
      // listing title is what names them as space work.
      { cfdaProgramTitle: { contains: 'space', mode: 'insensitive' as const } },
    ],
  };

  try {
    const rows = await prisma.federalAward.findMany({
      where: {
        companyId: { not: null },
        ...(slugs.length ? { companySlug: { in: slugs } } : {}),
        ...(agency ? { awardingAgency: { contains: agency, mode: 'insensitive' as const } } : {}),
        ...(includeVehicles ? {} : { countsTowardTotals: true }),
        ...(minAmount !== null ? { amount: { gte: minAmount } } : {}),
        ...(spaceCodedOnlyFilter ? spaceWhere : {}),
        actionDate: { gte: since, ...(until ? { lt: until } : {}) },
      },
      orderBy: [{ actionDate: 'desc' }, { amount: 'desc' }, { generatedInternalId: 'asc' }],
      take: limit,
      select: {
        generatedInternalId: true,
        awardIdPiid: true,
        awardGroup: true,
        awardType: true,
        countsTowardTotals: true,
        companySlug: true,
        matchedName: true,
        matchQuality: true,
        recipientName: true,
        recipientUei: true,
        amount: true,
        totalOutlays: true,
        awardingAgency: true,
        awardingSubAgency: true,
        actionDate: true,
        startDate: true,
        endDate: true,
        naicsCode: true,
        naicsDescription: true,
        pscCode: true,
        pscDescription: true,
        cfdaNumber: true,
        cfdaProgramTitle: true,
        description: true,
        sourceUrl: true,
        observedAt: true,
      },
    });

    const lastRun = await prisma.dataSourceRun.findFirst({
      where: { source: USASPENDING_SOURCE_KEY },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, finishedAt: true, ok: true },
    });

    const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
    const flat = rows.map((r) => ({
      awardId: r.awardIdPiid,
      usaspendingId: r.generatedInternalId,
      company: r.matchedName ?? '',
      companySlug: r.companySlug ?? '',
      matchQuality: r.matchQuality ?? '',
      recipientName: r.recipientName,
      recipientUei: r.recipientUei ?? '',
      obligatedUsd: r.amount,
      outlaysUsd: r.totalOutlays,
      countsTowardTotals: r.countsTowardTotals ? 'yes' : 'no',
      awardGroup: r.awardGroup,
      awardType: r.awardType ?? '',
      agency: shortAgency(r.awardingAgency),
      agencyFullName: r.awardingAgency,
      subAgency: r.awardingSubAgency ?? '',
      obligationDate: iso(r.actionDate),
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
      spaceCoded: isSpaceCoded(r) ? 'yes' : 'no',
      naicsCode: r.naicsCode ?? '',
      naicsDescription: r.naicsDescription ?? '',
      pscCode: r.pscCode ?? '',
      pscDescription: r.pscDescription ?? '',
      cfdaNumber: r.cfdaNumber ?? '',
      cfdaProgramTitle: r.cfdaProgramTitle ?? '',
      description: r.description ?? '',
      sourceUrl: r.sourceUrl,
      observedAt: r.observedAt.toISOString(),
    }));

    logger.info('Research federal-award rows served', {
      rows: flat.length,
      format,
      via: gate.access.via,
      ownerUserId: gate.access.ownerUserId,
    });

    const columns = flat.length > 0 ? Object.keys(flat[0]) : [];
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      // Coverage and source credits go INSIDE the file, not only in the
      // X-SpaceNexus-Coverage header that stops existing the moment the
      // download finishes.
      const provenance = csvProvenanceHeader({
        title: `SpaceNexus Research - federal awards (${USASPENDING_SOURCE_LABEL})`,
        sourceUrl: 'https://spacenexus.us/research',
        coverage: COVERAGE,
        ...jsonProvenance(),
        rowCount: flat.length,
      });
      const csv = toResearchCsv(flat, columns);
      return new NextResponse(`﻿${provenance}${csv}`, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="spacenexus-federal-awards-${stamp}.csv"`,
          'X-SpaceNexus-Coverage': encodeURIComponent(COVERAGE.join(' ')),
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return NextResponse.json(
      {
        source: USASPENDING_SOURCE_LABEL,
        // The limits ship WITH the data. An export whose limits are documented
        // only on a web page is an export whose limits get forgotten the moment
        // it lands in a spreadsheet.
        coverage: COVERAGE,
        filters: {
          company: slugs,
          agency: agency || null,
          since: iso(since),
          until: until ? iso(until) : null,
          minAmount,
          includeVehicles,
          spaceCoded: spaceCodedOnlyFilter,
          limit,
        },
        feed: lastRun
          ? {
              lastRunStartedAt: lastRun.startedAt.toISOString(),
              lastRunFinishedAt: lastRun.finishedAt?.toISOString() ?? null,
              lastRunOk: lastRun.ok,
            }
          : null,
        rowCount: flat.length,
        truncated: flat.length === limit,
        columns,
        rows: flat,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="spacenexus-federal-awards-${stamp}.json"`,
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    logger.error('Federal award export failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not read the federal award table.');
  }
}
