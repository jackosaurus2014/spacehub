/**
 * One-time prod cleanup: dedupe FundingRound rows created by repeated seed
 * runs (e.g. Hadrian Series C $117M x2 + Series B $90M dupes, K2 Space
 * Series A $50M x3 — 2026-08-14 data-integrity audit).
 *
 * Groups rows by (companyId, amount, seriesLabel) — an exact match on all
 * three is treated as the same real-world round. (An earlier version of
 * this script also required dates to fall within a 60-day window of each
 * other, per the original ask, but real data broke that assumption: the
 * K2 Space Series A $50M triplicate spans 2024-02-27 to 2024-06-01 — ~94
 * days — because one copy came from an accurate Payload-sourced backfill
 * and the other two from an earlier seed run's placeholder
 * first-of-the-month date. A company raising the exact same round label
 * for the exact same dollar amount is not a real scenario at any date
 * distance, so the date window was dropped in favor of the exact-match
 * triple alone.) Within each duplicate group, keeps the row with a
 * non-null sourceUrl (or the oldest row if none/all have one) and deletes
 * the rest.
 *
 * Usage:
 *   npx tsx scripts/dedupe-funding-rounds.ts             # DRY RUN
 *   npx tsx scripts/dedupe-funding-rounds.ts --apply     # delete dupes
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

interface Row {
  id: string;
  companyId: string;
  date: Date;
  amount: number | null;
  seriesLabel: string | null;
  sourceUrl: string | null;
  source: string | null;
  createdAt: Date;
}

async function main() {
  console.log(`dedupe-funding-rounds — ${APPLY ? 'APPLY mode (deleting)' : 'DRY RUN (pass --apply to delete)'}\n`);

  const rows: Row[] = await prisma.fundingRound.findMany({
    select: {
      id: true, companyId: true, date: true, amount: true, seriesLabel: true,
      sourceUrl: true, source: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total FundingRound rows: ${rows.length}\n`);

  const byExactKey = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r.companyId}|${r.amount ?? 'null'}|${(r.seriesLabel || '').toLowerCase().trim()}`;
    if (!byExactKey.has(k)) byExactKey.set(k, []);
    byExactKey.get(k)!.push(r);
  }

  const toDelete: Row[] = [];
  const groupsReported: { key: string; rows: Row[]; kept: Row }[] = [];

  for (const [key, group] of Array.from(byExactKey.entries())) {
    if (group.length < 2) continue;
    // Keep: prefer a row with a non-null sourceUrl; tie-break to oldest
    // (earliest createdAt = first seeded).
    const withUrl = group.filter((r) => r.sourceUrl);
    const pool = withUrl.length > 0 ? withUrl : group;
    const kept = pool.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    const dupes = group.filter((r) => r.id !== kept.id);
    toDelete.push(...dupes);
    groupsReported.push({ key, rows: group, kept });
  }

  console.log(`Duplicate groups found: ${groupsReported.length}`);
  console.log(`Rows to delete: ${toDelete.length}\n`);

  for (const g of groupsReported) {
    console.log(`GROUP ${g.key} (${g.rows.length} rows):`);
    for (const r of g.rows) {
      const mark = r.id === g.kept.id ? 'KEEP  ' : 'DELETE';
      console.log(`  ${mark} id=${r.id} date=${r.date.toISOString().slice(0, 10)} source=${r.source} sourceUrl=${r.sourceUrl || '(none)'} createdAt=${r.createdAt.toISOString()}`);
    }
  }

  if (APPLY && toDelete.length > 0) {
    const result = await prisma.fundingRound.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
    console.log(`\nDeleted ${result.count} duplicate rows.`);
  } else if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to delete.');
  }

  const remaining = await prisma.fundingRound.count();
  console.log(`\nFundingRound total: before=${rows.length}, currently in DB=${remaining}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
