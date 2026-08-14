// ─── Space Tycoon: Public Corporate Registry — data access ─────────────────
// Server-only Prisma access for the SEO-indexable, no-login Corporate
// Registry page (src/app/space-tycoon/registry/page.tsx). Mirrors the
// pattern in public-leaderboard.ts: select only fields that are meant to be
// public, parse the stored reportJson defensively (parseStoredCorpReport
// already sanitized everything at write time — this is defense in depth,
// not a second sanitization pass), and never leak userId/email.

import prisma from '@/lib/db';
import { parseStoredCorpReport, formatQuarterLabel, type StoredCorpReportPayload } from './corp-report-registry';

export interface PublicRegistryEntry {
  id: string;
  corpId: string;
  corpName: string;
  quarter: string;
  quarterLabel: string;
  publishedAt: Date;
  report: StoredCorpReportPayload;
}

export async function getRecentRegistryReports(limit = 30): Promise<PublicRegistryEntry[]> {
  const rows = await prisma.publishedCorpReport.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      corpId: true,
      corpName: true,
      quarter: true,
      reportJson: true,
      publishedAt: true,
    },
  });

  const entries: PublicRegistryEntry[] = [];
  for (const row of rows) {
    const report = parseStoredCorpReport(row.reportJson);
    if (!report) continue; // skip anything that doesn't parse — never render garbage
    entries.push({
      id: row.id,
      corpId: row.corpId,
      corpName: row.corpName,
      quarter: row.quarter,
      quarterLabel: formatQuarterLabel(report),
      publishedAt: row.publishedAt,
      report,
    });
  }
  return entries;
}

export async function getPublishedReportCount(): Promise<number> {
  return prisma.publishedCorpReport.count();
}
