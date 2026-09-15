/**
 * The publication ledger for recurring releases.
 *
 * THE POINT OF THIS FILE: a missed release must be VISIBLE.
 *
 * Release editions are computed on request, so a broken franchise does not
 * throw a 500 that somebody notices — it quietly renders an empty page, or
 * worse, a plausible-looking page of zeroes. The ledger is the difference
 * between "we published August" and "August never happened". The cron writes a
 * row only when the edition actually computed; /releases reads the rows and
 * shows anything past its due date as OVERDUE; the cron emails when it finds
 * one. Nothing reads figures back out of these rows — they are a ledger, never
 * a cache.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RESEARCH_RELEASES,
  releaseDueState,
  type ReleaseDueState,
  type ResearchRelease,
} from '@/lib/research-releases';
import { editionRowCount, type ResearchReportEdition } from '@/lib/research-report-types';

export interface ReleaseLogRow {
  releaseId: string;
  period: string;
  publishedAt: Date;
  computedAt: Date;
  asOf: string;
  title: string;
  rowCount: number;
  tableCount: number;
  empty: boolean;
  inputHash: string;
  previousHash: string | null;
  unchanged: boolean;
}

/** The ledger row for one edition, or null when it was never published. */
export async function readReleaseLog(
  releaseId: string,
  period: string
): Promise<ReleaseLogRow | null> {
  try {
    return (await prisma.researchReleaseLog.findUnique({
      where: { releaseId_period: { releaseId, period } },
      select: {
        releaseId: true,
        period: true,
        publishedAt: true,
        computedAt: true,
        asOf: true,
        title: true,
        rowCount: true,
        tableCount: true,
        empty: true,
        inputHash: true,
        previousHash: true,
        unchanged: true,
      },
    })) as ReleaseLogRow | null;
  } catch (error) {
    // A ledger read failure must not take an edition page down. It degrades to
    // "not recorded", which reads as overdue — loud, which is the right way to
    // fail for something whose whole job is to be noticed.
    logger.error('Release log read failed', {
      releaseId,
      period,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Every recorded edition of one release, newest first. */
export async function listReleaseLog(releaseId: string, take = 24): Promise<ReleaseLogRow[]> {
  try {
    return (await prisma.researchReleaseLog.findMany({
      where: { releaseId },
      orderBy: { period: 'desc' },
      take,
      select: {
        releaseId: true,
        period: true,
        publishedAt: true,
        computedAt: true,
        asOf: true,
        title: true,
        rowCount: true,
        tableCount: true,
        empty: true,
        inputHash: true,
        previousHash: true,
        unchanged: true,
      },
    })) as ReleaseLogRow[];
  } catch (error) {
    logger.error('Release log list failed', {
      releaseId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Record an edition.
 *
 * `publishedAt` is set once and never rewritten: a recompute updates the
 * figures' metadata but must not make a late edition look punctual. The
 * previous edition's hash is captured so an unchanged quarter can be reported
 * as unchanged rather than dressed up as movement.
 */
export async function recordReleaseEdition(
  edition: ResearchReportEdition,
  previousHash: string | null
): Promise<void> {
  const rowCount = editionRowCount(edition);
  const unchanged = previousHash !== null && previousHash === edition.inputHash;
  const data = {
    computedAt: new Date(edition.computedAt),
    asOf: edition.asOf,
    title: edition.title,
    rowCount,
    tableCount: edition.tables.length,
    empty: edition.empty,
    inputHash: edition.inputHash,
    previousHash,
    unchanged,
    headline: edition.headline as unknown as object,
  };
  try {
    await prisma.researchReleaseLog.upsert({
      where: { releaseId_period: { releaseId: edition.releaseId, period: edition.period } },
      update: data,
      create: {
        releaseId: edition.releaseId,
        period: edition.period,
        publishedAt: new Date(),
        ...data,
      },
    });
  } catch (error) {
    logger.error('Release log write failed', {
      releaseId: edition.releaseId,
      period: edition.period,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Where every franchise stands right now, in registry order.
 *
 * One query for the whole calendar rather than one per release, because this
 * runs on the public /releases hub.
 */
export async function releaseCalendarState(now: Date = new Date()): Promise<ReleaseDueState[]> {
  let rows: { releaseId: string; period: string; publishedAt: Date }[] = [];
  try {
    rows = await prisma.researchReleaseLog.findMany({
      select: { releaseId: true, period: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 400,
    });
  } catch (error) {
    logger.error('Release calendar read failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const byKey = new Map(rows.map((r) => [`${r.releaseId}:${r.period}`, r.publishedAt]));
  return RESEARCH_RELEASES.map((release) => {
    const period = releaseDueState(release, null, now).period;
    return releaseDueState(release, byKey.get(`${release.id}:${period}`) ?? null, now);
  });
}

/** The state of one franchise. */
export async function releaseState(
  release: ResearchRelease,
  now: Date = new Date()
): Promise<ReleaseDueState> {
  const period = releaseDueState(release, null, now).period;
  const row = await readReleaseLog(release.id, period);
  return releaseDueState(release, row?.publishedAt ?? null, now);
}
