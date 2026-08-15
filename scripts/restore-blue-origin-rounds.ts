/**
 * URGENT one-time fix: restore 2 FundingRound rows for Blue Origin that
 * were WRONGLY deleted by an earlier version of dedupe-funding-rounds.ts.
 *
 * That script's first fix (removing the 60-day date-clustering window
 * entirely, to correctly catch the K2 Space Series A $50M triplicate whose
 * dates span ~94 days) was too broad: it also collapsed Blue Origin's THREE
 * genuinely distinct "Bezos Investment" $1B rounds (2021-01-01, 2023-01-01,
 * 2024-10-01 — Jeff Bezos's well-documented recurring ~$1B/year AMZN-stock-
 * sale commitment to fund Blue Origin) into a single kept row, deleting the
 * other two as if they were accidental seed-rerun duplicates. They are not:
 * the seed source (FUNDING_ROUNDS in src/app/api/funding-tracker/init/route.ts,
 * lines 792-794) defines all three intentionally, at three different dates.
 *
 * This script recreates the 2 deleted rows using the exact field values
 * from that seed source. It is idempotent: it only inserts if a row with
 * the same (companyId, date, amount, seriesLabel) doesn't already exist.
 *
 * Usage:
 *   npx tsx scripts/restore-blue-origin-rounds.ts             # DRY RUN
 *   npx tsx scripts/restore-blue-origin-rounds.ts --apply     # write
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

const ROUNDS_TO_RESTORE = [
  { date: '2023-01-01', amount: 1000000000, seriesLabel: 'Bezos Investment', roundType: 'equity', leadInvestor: 'Jeff Bezos', investors: ['Jeff Bezos'], source: 'Press Release' },
  { date: '2024-10-01', amount: 1000000000, seriesLabel: 'Bezos Investment', roundType: 'equity', leadInvestor: 'Jeff Bezos', investors: ['Jeff Bezos'], source: 'Press Release' },
];

async function main() {
  console.log(`restore-blue-origin-rounds — ${APPLY ? 'APPLY mode (writing)' : 'DRY RUN (pass --apply to write)'}\n`);

  const company = await prisma.companyProfile.findFirst({ where: { name: 'Blue Origin' } });
  if (!company) {
    console.error('Blue Origin CompanyProfile not found — aborting.');
    process.exitCode = 1;
    return;
  }
  console.log(`Blue Origin companyId: ${company.id}\n`);

  const existing = await prisma.fundingRound.findMany({
    where: { companyId: company.id, seriesLabel: 'Bezos Investment' },
  });
  console.log(`Existing "Bezos Investment" rounds currently in DB: ${existing.length}`);
  for (const r of existing) console.log(`  date=${r.date.toISOString().slice(0, 10)} amount=${r.amount}`);

  for (const r of ROUNDS_TO_RESTORE) {
    const already = existing.some(
      (e) => e.date.toISOString().slice(0, 10) === r.date && e.amount === r.amount
    );
    if (already) {
      console.log(`\nSKIP (already present): ${r.date}`);
      continue;
    }
    console.log(`\n${APPLY ? 'CREATING' : 'WOULD CREATE'}: date=${r.date} amount=${r.amount} seriesLabel="${r.seriesLabel}"`);
    if (APPLY) {
      await prisma.fundingRound.create({
        data: {
          companyId: company.id,
          date: new Date(r.date),
          amount: r.amount,
          seriesLabel: r.seriesLabel,
          roundType: r.roundType,
          leadInvestor: r.leadInvestor,
          investors: r.investors,
          source: r.source,
        },
      });
    }
  }

  if (!APPLY) console.log('\nDry run only — re-run with --apply to write.');

  const final = await prisma.fundingRound.findMany({
    where: { companyId: company.id, seriesLabel: 'Bezos Investment' },
    orderBy: { date: 'asc' },
  });
  console.log(`\n"Bezos Investment" rounds now in DB: ${final.length}`);
  for (const r of final) console.log(`  date=${r.date.toISOString().slice(0, 10)} amount=${r.amount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
