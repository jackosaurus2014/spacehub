// ─── Space Tycoon: Public Corporate Chronicle — data access ────────────────
// Server-only Prisma access for the SEO-indexable, no-login Chronicle page
// (src/app/space-tycoon/chronicle/page.tsx) and the Chronicle section on
// public corp profiles (src/app/space-tycoon/corp/[id]/page.tsx). Mirrors
// public-registry.ts's pattern exactly: select only public-safe fields,
// parse the stored recordJson defensively (already sanitized at write time —
// this is defense in depth), never leak userId/email.

import prisma from '@/lib/db';
import { parseStoredCorpEra, type StoredCorpEraPayload } from './corp-era-registry';

export interface PublicChronicleEntry {
  id: string;
  corpId: string;
  corpName: string;
  eraKey: string;
  publishedAt: Date;
  era: StoredCorpEraPayload;
}

export async function getRecentChronicleEntries(limit = 30): Promise<PublicChronicleEntry[]> {
  const rows = await prisma.corpEraRecord.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      corpId: true,
      corpName: true,
      eraKey: true,
      recordJson: true,
      publishedAt: true,
    },
  });

  const entries: PublicChronicleEntry[] = [];
  for (const row of rows) {
    const era = parseStoredCorpEra(row.recordJson);
    if (!era) continue; // never render garbage
    entries.push({
      id: row.id,
      corpId: row.corpId,
      corpName: row.corpName,
      eraKey: row.eraKey,
      publishedAt: row.publishedAt,
      era,
    });
  }
  return entries;
}

export async function getPublishedChronicleCount(): Promise<number> {
  return prisma.corpEraRecord.count();
}

/** All published eras for ONE corporation, oldest first — the shape the
 *  public corp profile page's Chronicle section renders. */
export async function getCorpChronicle(corpId: string): Promise<StoredCorpEraPayload[]> {
  const rows = await prisma.corpEraRecord.findMany({
    where: { corpId },
    orderBy: { publishedAt: 'asc' },
    select: { recordJson: true },
  });
  const eras: StoredCorpEraPayload[] = [];
  for (const row of rows) {
    const era = parseStoredCorpEra(row.recordJson);
    if (era) eras.push(era);
  }
  return eras;
}
