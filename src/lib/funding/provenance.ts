/**
 * Field-level provenance, and the run ledger every data fetcher writes.
 *
 * The Research tier is sold to investors, so the product's claim is not
 * "here is a number" but "here is a number, here is the document it came
 * from, and here is when we read it". `DataProvenance` is where that second
 * half lives; nothing in this file ever produces a value, it only records
 * where a value already came from.
 *
 * Hard rule, enforced by `assertNotGenerated` below: `method` may never be a
 * model/LLM output. Extraction from a cited document is provenance;
 * generation is fabrication. A single invented round would cost more than the
 * whole dataset is worth.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/** How a value was obtained. See DataProvenance.method in schema.prisma. */
export type ProvenanceMethod =
  | 'official-filing'
  | 'press-release'
  | 'news'
  | 'derived'
  | 'manual';

export const PROVENANCE_METHODS: readonly ProvenanceMethod[] = [
  'official-filing',
  'press-release',
  'news',
  'derived',
  'manual',
] as const;

export interface ProvenanceRecord {
  entity: string;
  entityId: string;
  field: string;
  value: unknown;
  source: string;
  sourceUrl?: string | null;
  sourceRef?: string | null;
  method: ProvenanceMethod;
  /** When the SOURCE published the fact - not when we fetched it. */
  observedAt: Date;
  verifiedAt?: Date | null;
}

/**
 * Words that mark a value as produced rather than reported. A source string
 * containing any of them is refused outright, so no pipeline can quietly
 * launder a model output into the dataset as a cited fact.
 */
const GENERATED_SOURCE_MARKERS = [
  'gpt',
  'claude',
  'gemini',
  'llm',
  'ai-generated',
  'ai generated',
  'estimated',
  'estimate',
  'inferred',
  'synthetic',
];

/**
 * Guard against the one failure mode that would sink the product: a model
 * output being laundered into the dataset as if it were sourced. Anything
 * that smells like generation is rejected loudly rather than stored.
 */
export function assertNotGenerated(method: string, source: string): void {
  if (!PROVENANCE_METHODS.includes(method as ProvenanceMethod)) {
    throw new Error(
      'DataProvenance.method "' + method + '" is not allowed (' + PROVENANCE_METHODS.join(', ') + ')',
    );
  }
  const lowered = source.toLowerCase();
  const hit = GENERATED_SOURCE_MARKERS.find((marker) => lowered.includes(marker));
  if (hit) {
    throw new Error(
      'Refusing to record provenance with source "' + source + '": "' + hit +
        '" indicates a generated or estimated value, not a cited one.',
    );
  }
}

function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Upsert one provenance record. Idempotent on
 * (entity, entityId, field, source) so re-running a fetcher refreshes the
 * verification stamp instead of piling up duplicates.
 */
export async function recordProvenance(rec: ProvenanceRecord): Promise<void> {
  assertNotGenerated(rec.method, rec.source);
  const value = stringify(rec.value);
  await prisma.dataProvenance.upsert({
    where: {
      entity_entityId_field_source: {
        entity: rec.entity,
        entityId: rec.entityId,
        field: rec.field,
        source: rec.source,
      },
    },
    update: {
      value,
      sourceUrl: rec.sourceUrl ?? null,
      sourceRef: rec.sourceRef ?? null,
      method: rec.method,
      observedAt: rec.observedAt,
      verifiedAt: rec.verifiedAt ?? new Date(),
    },
    create: {
      entity: rec.entity,
      entityId: rec.entityId,
      field: rec.field,
      value,
      source: rec.source,
      sourceUrl: rec.sourceUrl ?? null,
      sourceRef: rec.sourceRef ?? null,
      method: rec.method,
      observedAt: rec.observedAt,
      verifiedAt: rec.verifiedAt ?? new Date(),
    },
  });
}

/** Batch form of {@link recordProvenance}; failures are logged, never thrown. */
export async function recordProvenanceMany(recs: ProvenanceRecord[]): Promise<number> {
  let written = 0;
  for (const rec of recs) {
    try {
      await recordProvenance(rec);
      written++;
    } catch (err) {
      logger.warn('recordProvenance failed', {
        entity: rec.entity,
        entityId: rec.entityId,
        field: rec.field,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return written;
}

/** Everything we can show a reader about one row's fields. */
export async function getProvenanceFor(entity: string, entityId: string) {
  return prisma.dataProvenance.findMany({
    where: { entity, entityId },
    orderBy: [{ field: 'asc' }, { observedAt: 'desc' }],
  });
}

// ---------------------------------------------------------------------------
// Run ledger
// ---------------------------------------------------------------------------

export interface RunCounters {
  itemsSeen: number;
  itemsWritten: number;
  httpErrors: number;
  detail?: Record<string, unknown>;
  cursor?: string | null;
  complete?: boolean;
}

/** Open a run row. Call {@link finishRun} in a finally block, always. */
export async function startRun(source: string, cursor?: string | null): Promise<string> {
  const row = await prisma.dataSourceRun.create({
    data: { source, cursor: cursor ?? null },
    select: { id: true },
  });
  return row.id;
}

/**
 * Close a run row honestly.
 *
 * `ok` is false whenever the run threw OR wrote nothing while collecting HTTP
 * errors - the exact shape of the two FCC fetchers that read as healthy for
 * weeks while returning nothing behind a swallowed 403.
 */
export async function finishRun(
  runId: string,
  counters: RunCounters,
  error?: unknown,
): Promise<void> {
  const fatal = error
    ? error instanceof Error
      ? error.message + '\n' + (error.stack ?? '')
      : String(error)
    : null;
  const deadFeed = counters.itemsWritten === 0 && counters.httpErrors > 0;
  await prisma.dataSourceRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      ok: !fatal && !deadFeed,
      cursor: counters.cursor ?? null,
      complete: counters.complete ?? false,
      itemsSeen: counters.itemsSeen,
      itemsWritten: counters.itemsWritten,
      httpErrors: counters.httpErrors,
      error:
        fatal ??
        (deadFeed
          ? 'Feed returned ' + counters.httpErrors + ' HTTP error(s) and wrote nothing.'
          : null),
      detail: (counters.detail ?? undefined) as never,
    },
  });
}

/** The most recent run for a source, whatever its outcome. */
export async function latestRun(source: string) {
  return prisma.dataSourceRun.findFirst({
    where: { source },
    orderBy: { startedAt: 'desc' },
  });
}

/** The resume cursor to start from: the last run's cursor unless it finished. */
export async function resumeCursor(source: string): Promise<string | null> {
  const last = await prisma.dataSourceRun.findFirst({
    where: { source },
    orderBy: { startedAt: 'desc' },
    select: { cursor: true, complete: true },
  });
  if (!last || last.complete) return null;
  return last.cursor;
}
