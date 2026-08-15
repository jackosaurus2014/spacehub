/**
 * One-time prod fix: the Investor row "Bond (formerly ICONIQ Capital)"
 * conflated two unrelated firms — Mary Meeker's Bond Capital (spun out of
 * Kleiner Perkins in 2018) and ICONIQ Capital (the separate wealth-management/
 * venture firm for tech founders, e.g. Zuckerberg/Sandberg's family office
 * roots). Bond Capital never used the ICONIQ name; whoever seeded this data
 * conflated the two. Corrects the name/description to reflect Bond Capital
 * only, matching the code fix in src/app/api/funding-tracker/init/route.ts.
 *
 * ICONIQ Capital is NOT added as a separate investor here — the seed
 * context gives no verified space portfolio/deal data for ICONIQ itself
 * (the only "evidence" was this conflated row), so adding it would be
 * unverified data. Flagged in the report instead.
 *
 * Usage:
 *   npx tsx scripts/fix-bond-iconiq-conflation.ts             # DRY RUN
 *   npx tsx scripts/fix-bond-iconiq-conflation.ts --apply     # write
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`fix-bond-iconiq-conflation — ${APPLY ? 'APPLY mode (writing)' : 'DRY RUN (pass --apply to write)'}\n`);

  const row = await prisma.investor.findFirst({
    where: { name: { contains: 'ICONIQ', mode: 'insensitive' } },
  });

  if (!row) {
    console.log('No Investor row matching "ICONIQ" found — nothing to fix (already corrected?).');
    return;
  }

  console.log('Found:', JSON.stringify({ id: row.id, name: row.name, description: row.description }, null, 2));

  const newName = 'Bond Capital';
  const newDescription = 'Growth-stage venture firm founded by Mary Meeker (formerly of Kleiner Perkins), investing in internet and technology growth companies including space.';

  console.log(`\nWould update:\n  name: "${row.name}" -> "${newName}"\n  description: "${row.description}" -> "${newDescription}"`);

  if (APPLY) {
    await prisma.investor.update({
      where: { id: row.id },
      data: { name: newName, description: newDescription },
    });
    console.log('\nUpdated.');
  } else {
    console.log('\nDry run only — re-run with --apply to write.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
