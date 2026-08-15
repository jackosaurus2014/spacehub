/**
 * One-time prod fix: annotate the Maxar Technologies CompanyProfile to
 * reflect its 2025 restructuring (2026-08-14 data-integrity audit).
 *
 * Real-world context: Maxar was taken private by Advent International in
 * 2023 ($6.4B — already reflected in the Advent International Investor
 * row's notableDeals). In 2025 the business split: the geospatial
 * intelligence / imagery-analytics operations continued under the Vantor
 * name, while satellite manufacturing spun off as a separate company,
 * Lanteris Space Systems. The existing 'maxar-technologies' CompanyProfile
 * description conflated both halves ("satellite manufacturer" +
 * "geospatial analytics... WorldView Legion constellation") without
 * mentioning the split at all, misrepresenting Maxar as still
 * operating today exactly as it did pre-2025.
 *
 * Decision (minimal-invention path, chosen over fabricating a full
 * Vantor+Lanteris split): this script does NOT rename the record or
 * create a second CompanyProfile for Lanteris, because the existing data
 * (funding/revenue/employee figures, product lines) is not cleanly
 * separable between the two successor businesses without inventing
 * numbers that aren't in this database. Instead it updates the
 * description to honestly explain the restructuring, leaving name/slug
 * unchanged — so no next.config.js redirect is needed (the URL doesn't
 * move) and none of the ~13 code references to the 'maxar-technologies'
 * slug need updating (they still correctly resolve). If/when the team
 * wants to model Vantor and Lanteris as distinct, separately-tracked
 * companies with real independent financials, that should be a
 * deliberate follow-up with sourced data, not a guess made here.
 *
 * Usage:
 *   npx tsx scripts/fix-maxar-restructuring.ts             # DRY RUN
 *   npx tsx scripts/fix-maxar-restructuring.ts --apply     # write
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

const NEW_DESCRIPTION =
  "Geospatial intelligence and satellite manufacturer, taken private by Advent International in 2023 ($6.4B). " +
  "In 2025 Maxar's business restructured: the geospatial intelligence / imagery-analytics operations " +
  "(including the WorldView Legion constellation and defense/commercial analytics customers) continued under " +
  "the Vantor name, while satellite manufacturing spun off as a separate company, Lanteris Space Systems. " +
  "This profile reflects the pre-split Maxar Technologies entity and has not yet been divided between the " +
  "two successor businesses.";

async function main() {
  console.log(`fix-maxar-restructuring — ${APPLY ? 'APPLY mode (writing)' : 'DRY RUN (pass --apply to write)'}\n`);

  const row = await prisma.companyProfile.findUnique({ where: { slug: 'maxar-technologies' } });
  if (!row) {
    console.log("No CompanyProfile with slug 'maxar-technologies' found — nothing to fix.");
    return;
  }

  console.log('Current description:\n  ' + row.description);
  console.log('\nNew description:\n  ' + NEW_DESCRIPTION);

  if (APPLY) {
    await prisma.companyProfile.update({
      where: { id: row.id },
      data: { description: NEW_DESCRIPTION },
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
