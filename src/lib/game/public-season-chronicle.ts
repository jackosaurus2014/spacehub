// ─── Space Tycoon: Public Season Chronicle — data access (LS7) ─────────────
// Server-only Prisma access for the SEO-indexable, no-login archive pages
// (src/app/space-tycoon/seasons/[n]/page.tsx) and the
// /api/space-tycoon/seasons/chronicle route. Mirrors public-era-chronicle.ts
// / public-leaderboard.ts's pattern: thin selects, defensive parsing, never
// leak userId/email. The stored `results` column already only ever contains
// what assembleSeasonChronicle() produced (top-3 companyName/title/score,
// not full standings) — nothing here is more exposed than the seasons
// leaderboard route already serves unauthenticated.

import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import type { SeasonChronicleRecord } from './season-chronicle';

// Sealed rows are written with a real JSON object (assembleSeasonChronicle's
// output), never an explicit JSON "null" literal — so an unsealed row's
// `results` column is SQL NULL (Prisma.DbNull), not Prisma.JsonNull. Filter
// accordingly for "has this season been sealed" queries.
const SEALED_FILTER = { not: Prisma.DbNull } as const;

function parseRecord(json: unknown): SeasonChronicleRecord | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as Partial<SeasonChronicleRecord>;
  if (typeof r.seasonNumber !== 'number' || !Array.isArray(r.topPlacements)) return null;
  return r as SeasonChronicleRecord;
}

/** One sealed season's Chronicle record, or null if the season hasn't
 *  concluded (or hasn't been sealed by the cron yet). */
export async function getSealedSeasonChronicle(seasonNumber: number): Promise<SeasonChronicleRecord | null> {
  const row = await prisma.seasonalEvent.findFirst({
    where: { seasonNumber, results: SEALED_FILTER },
    select: { results: true },
  });
  return row ? parseRecord(row.results) : null;
}

/** Most recent sealed seasons, newest first. */
export async function getRecentSealedSeasons(limit = 12): Promise<SeasonChronicleRecord[]> {
  const rows = await prisma.seasonalEvent.findMany({
    where: { results: SEALED_FILTER },
    orderBy: { seasonNumber: 'desc' },
    take: limit,
    select: { results: true },
  });
  const out: SeasonChronicleRecord[] = [];
  for (const row of rows) {
    const record = parseRecord(row.results);
    if (record) out.push(record);
  }
  return out;
}

export async function getSealedSeasonCount(): Promise<number> {
  return prisma.seasonalEvent.count({ where: { results: SEALED_FILTER } });
}
