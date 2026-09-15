import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { internalError, notFoundError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { toResearchCsv } from '@/lib/research-export';
import { allReleaseIds, citationFor, getRelease } from '@/lib/research-releases';
import {
  buildReleaseEdition,
  UnknownReleaseError,
  UnpublishedPeriodError,
} from '@/lib/research-report-build';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The COMPLETE rows behind one edition of a recurring release.
 *
 * GATE: requireResearchAccess, server-side, before a single row is read. There
 * is no client-side check in this path and no query parameter that relaxes it.
 *
 * THE PUBLIC/GATED SPLIT, and why it is drawn here.
 * Each edition page is public: the headline figures, the methodology, the
 * coverage limits and the top of every table, so the release is citable,
 * linkable and quotable by people who will never pay us. A ranking nobody can
 * see wins us nothing. What Research buys is this route — every row, every
 * column, as CSV or JSON, which is the form a firm actually models against.
 * The page and this route compute from the same builder, so the free summary
 * and the paid export can never disagree.
 *
 * ?format=json (default) returns the whole edition, coverage attached.
 * ?format=csv&table=<id>  returns one table; without `table`, the first one.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ report: string; period: string }> }
) {
  const { report, period } = await props.params;

  const release = getRelease(report);
  if (!release) {
    return notFoundError(
      `Unknown release "${report}". Available: ${allReleaseIds().join(', ')}`
    );
  }

  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  if (format !== 'csv' && format !== 'json') {
    return validationError('format must be "csv" or "json".');
  }

  let edition;
  try {
    edition = await buildReleaseEdition(release.id, period);
  } catch (error) {
    if (error instanceof UnknownReleaseError) return notFoundError(error.message);
    if (error instanceof UnpublishedPeriodError) return validationError(error.message);
    logger.error('Release export failed to build', {
      releaseId: release.id,
      period,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not build that edition.');
  }

  const citation = citationFor(release, period, edition.asOf);
  logger.info('Research release export served', {
    releaseId: release.id,
    period,
    format,
    via: gate.access.via,
    ownerUserId: gate.access.ownerUserId,
  });

  if (format === 'json') {
    return NextResponse.json(
      {
        release: {
          id: release.id,
          title: release.title,
          cadence: release.cadence,
          url: release.href(period),
        },
        period,
        periodLabel: edition.periodLabel,
        title: edition.title,
        asOf: edition.asOf,
        computedAt: edition.computedAt,
        citation,
        // Method and limits ship WITH the data. An export whose limits are
        // documented only on a web page is an export whose limits get
        // forgotten the moment it lands in a spreadsheet.
        methodology: release.methodology,
        coverage: edition.coverage,
        empty: edition.empty,
        emptyReason: edition.emptyReason ?? null,
        headline: edition.headline,
        tables: edition.tables.map((t) => ({
          id: t.id,
          label: t.label,
          description: t.description,
          columns: t.columns,
          note: t.note ?? null,
          rowCount: t.rows.length,
          rows: t.rows,
        })),
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="spacenexus-${release.id}-${period}.json"`,
          'Cache-Control': 'private, no-store',
        },
      }
    );
  }

  const tableId = url.searchParams.get('table');
  const table = tableId
    ? edition.tables.find((t) => t.id === tableId)
    : edition.tables[0];
  if (!table) {
    return notFoundError(
      tableId
        ? `This edition has no table "${tableId}". Available: ${edition.tables.map((t) => t.id).join(', ') || 'none'}`
        : 'This edition has no tables.'
    );
  }

  // Every column the table carries, not just the displayed ones: the export is
  // the wide version by design.
  const columnKeys = Array.from(
    new Set([
      ...table.columns.map((c) => c.key),
      ...table.rows.flatMap((r) => Object.keys(r)),
    ])
  );
  const csv = toResearchCsv(table.rows, columnKeys);
  const filename = `spacenexus-${release.id}-${period}-${table.id}.csv`;

  // Leading UTF-8 BOM so Excel opens accented company and investor names right.
  return new NextResponse(`﻿${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-SpaceNexus-Citation': encodeURIComponent(citation),
      'X-SpaceNexus-Coverage': encodeURIComponent(edition.coverage.join(' ')),
      'Cache-Control': 'private, no-store',
    },
  });
}
