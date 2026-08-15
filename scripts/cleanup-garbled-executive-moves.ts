/**
 * Report (and optionally delete) ExecutiveMove rows that fail the shape
 * validators added to src/lib/fetchers/executive-moves-fetcher.ts
 * (isLikelyPersonName / isLikelyTitle / isLikelyOrg).
 *
 * Root cause: the old fetcher regex-scanned ALL NewsArticle rows for loose
 * keywords with no name-shape validation, producing garbled fragments like
 * personName = "a Soviet lieutenant colonel" or "The most secretive
 * facility of the Cold War is" pulled out of historical/feature articles.
 * As of the 2026-08 audit, 156 of 170 rows (92%) were garbage, not people.
 *
 * Default mode is READ-ONLY: prints a report of matching rows and exits
 * without touching the database. Deletion requires the explicit --delete
 * flag.
 *
 * Run (report only): npx tsx scripts/cleanup-garbled-executive-moves.ts
 * Run (delete):       npx tsx scripts/cleanup-garbled-executive-moves.ts --delete
 */
import prisma from '../src/lib/db';
import { isLikelyPersonName, isLikelyTitle, isLikelyOrg } from '../src/lib/fetchers/executive-moves-fetcher';

function isValidRow(row: {
  personName: string;
  fromTitle: string | null;
  fromCompany: string | null;
  toTitle: string | null;
  toCompany: string | null;
}): boolean {
  if (!isLikelyPersonName(row.personName)) return false;
  if (row.fromTitle && !isLikelyTitle(row.fromTitle)) return false;
  if (row.fromCompany && !isLikelyOrg(row.fromCompany)) return false;
  if (row.toTitle && !isLikelyTitle(row.toTitle)) return false;
  if (row.toCompany && !isLikelyOrg(row.toCompany)) return false;
  return true;
}

async function main() {
  const shouldDelete = process.argv.includes('--delete');

  const rows = await prisma.executiveMove.findMany({
    orderBy: { date: 'desc' },
  });

  const invalid = rows.filter((r) => !isValidRow(r));
  const valid = rows.filter((r) => isValidRow(r));

  console.log(`Scanned ${rows.length} ExecutiveMove rows.`);
  console.log(`Found ${invalid.length} failing validation, ${valid.length} passing.\n`);

  console.log('--- Sample of rows to be DELETED (up to 20) ---');
  for (const row of invalid.slice(0, 20)) {
    console.log(`- [${row.id}] personName="${row.personName}" toTitle="${row.toTitle}" toCompany="${row.toCompany}" fromTitle="${row.fromTitle}" fromCompany="${row.fromCompany}" source="${row.source}"`);
  }

  console.log('\n--- Sample of surviving rows (up to 20) ---');
  for (const row of valid.slice(0, 20)) {
    console.log(`- [${row.id}] personName="${row.personName}" toTitle="${row.toTitle}" toCompany="${row.toCompany}" fromTitle="${row.fromTitle}" fromCompany="${row.fromCompany}" source="${row.source}"`);
  }

  if (!shouldDelete) {
    console.log('\nDry run only — pass --delete to remove these rows.');
    return;
  }

  if (invalid.length === 0) {
    console.log('\nNothing to delete.');
    return;
  }

  const res = await prisma.executiveMove.deleteMany({
    where: { id: { in: invalid.map((r) => r.id) } },
  });
  console.log(`\nDeleted ${res.count} garbled ExecutiveMove rows.`);

  const remaining = await prisma.executiveMove.count();
  console.log(`Remaining ExecutiveMove rows: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
