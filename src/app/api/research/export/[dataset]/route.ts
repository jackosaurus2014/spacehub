import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { internalError, notFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import {
  RESEARCH_DATASETS,
  RESEARCH_DATASET_IDS,
  isResearchDatasetId,
  toResearchCsv,
} from '@/lib/research-export';

export const dynamic = 'force-dynamic';

/**
 * Full-history Research exports. GATE: requireResearchAccess, server-side,
 * before a single row is read. There is no client-side check anywhere in this
 * path, and no query parameter that relaxes it.
 *
 * This route ADDS a door. /api/export/[module] — companies, events and news for
 * any signed-in member — is untouched, as is the free plan's "CSV downloads"
 * line. Nothing that was downloadable on 2026-09-13 stopped being downloadable.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ dataset: string }> }
) {
  const { dataset } = await props.params;

  if (!isResearchDatasetId(dataset)) {
    return notFoundError(
      `Unknown dataset "${dataset}". Available: ${RESEARCH_DATASET_IDS.join(', ')}`
    );
  }

  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const spec = RESEARCH_DATASETS[dataset];
  const format = (new URL(req.url).searchParams.get('format') || 'csv').toLowerCase();
  if (format !== 'csv' && format !== 'json') {
    return notFoundError('Format must be "csv" or "json".');
  }

  try {
    const rows = await spec.rows();
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `spacenexus-research-${spec.id}-${stamp}.${format}`;

    logger.info('Research export served', {
      dataset: spec.id,
      format,
      rows: rows.length,
      via: gate.access.via,
      ownerUserId: gate.access.ownerUserId,
    });

    if (format === 'json') {
      // The coverage statement ships WITH the data. An export whose limits are
      // only documented on a web page is an export whose limits get forgotten.
      return NextResponse.json(
        {
          dataset: spec.id,
          label: spec.label,
          coverage: spec.coverage,
          generatedAt: new Date().toISOString(),
          rowCount: rows.length,
          columns: spec.columns,
          rows,
        },
        {
          headers: {
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    const csv = toResearchCsv(rows, spec.columns);
    // A leading UTF-8 BOM so Excel opens accented supplier names correctly.
    return new NextResponse(`﻿${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-SpaceNexus-Coverage': encodeURIComponent(spec.coverage),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.error('Research export failed', {
      dataset: spec.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not build that export. Please try again.');
  }
}
