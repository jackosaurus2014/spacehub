/**
 * One-time prod fix: merge duplicate ABL Space Systems / Long Wall
 * CompanyProfile rows (2026-08-14 data-integrity audit).
 *
 * Two CompanyProfile rows exist for the same company:
 *   - 'abl-space-systems' (KEEPER): name already correctly updated to
 *     "Long Wall", description "(formerly ABL Space Systems)...", tier 1,
 *     dataCompleteness 70, lastVerified set, has 2 CompanyProduct rows,
 *     2 KeyPersonnel rows, 1 CompanyEvent, 1 FacilityLocation, 1
 *     CompanyScore, 1 ServiceListing. Referenced by code as the canonical
 *     slug in scripts/seed-marketplace.ts, src/lib/space-score.ts, and
 *     src/lib/entity-linker.ts (maps "ABL Space Systems"/"ABL Space" name
 *     mentions to this slug).
 *   - 'abl-space' (LOSER): name still "ABL Space Systems" (stale, pre-
 *     rename), tier 3, dataCompleteness 35, created 2026-08-14 by
 *     scripts/merge-space-companies.ts (SpaceCompany legacy-table merge) —
 *     that script's name-matching failed to find the keeper because the
 *     keeper's name had already been changed to "Long Wall", so it created
 *     a brand-new profile instead. Its 2 FundingRound rows are exact
 *     duplicates of the keeper's 2 rounds (same date/amount/investors) —
 *     part of the FundingRound-dupe problem fixed separately by
 *     dedupe-funding-rounds.ts; deleting this profile cascades their
 *     deletion. Every other relation table (products, personnel, events,
 *     facilities, scores, listings, watchlist, digests, jobs, M&A,
 *     competitive mapping, news tags, forum, BD opportunities) has ZERO
 *     rows under the loser — verified before writing this script.
 *
 * This script:
 *   1. Copies the loser's companyId (link back to the legacy SpaceCompany
 *      row) onto the keeper if the keeper doesn't already have one.
 *   2. Deletes the loser CompanyProfile (cascades its 2 duplicate
 *      FundingRound rows).
 *
 * A redirect from /company-profiles/abl-space to
 * /company-profiles/abl-space-systems is added separately in
 * next.config.js (mirrors the existing anduril -> anduril-industries
 * pattern).
 *
 * Usage:
 *   npx tsx scripts/merge-abl-space-duplicate.ts             # DRY RUN
 *   npx tsx scripts/merge-abl-space-duplicate.ts --apply     # write
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const KEEPER_SLUG = 'abl-space-systems';
const LOSER_SLUG = 'abl-space';

async function main() {
  console.log(`merge-abl-space-duplicate — ${APPLY ? 'APPLY mode (writing)' : 'DRY RUN (pass --apply to write)'}\n`);

  const keeper = await prisma.companyProfile.findUnique({ where: { slug: KEEPER_SLUG } });
  const loser = await prisma.companyProfile.findUnique({ where: { slug: LOSER_SLUG } });

  if (!keeper) { console.error(`Keeper slug '${KEEPER_SLUG}' not found — aborting.`); process.exitCode = 1; return; }
  if (!loser) { console.log(`Loser slug '${LOSER_SLUG}' not found — already merged/deleted, nothing to do.`); return; }

  console.log(`Keeper: ${keeper.name} (${keeper.slug}, id=${keeper.id}, companyId=${keeper.companyId})`);
  console.log(`Loser:  ${loser.name} (${loser.slug}, id=${loser.id}, companyId=${loser.companyId})\n`);

  const loserRoundCount = await prisma.fundingRound.count({ where: { companyId: loser.id } });
  console.log(`Loser has ${loserRoundCount} FundingRound row(s) that will cascade-delete with it.`);

  if (!keeper.companyId && loser.companyId) {
    console.log(`\nWould link keeper.companyId = ${loser.companyId} (preserving legacy SpaceCompany link).`);
    if (APPLY) {
      await prisma.companyProfile.update({ where: { id: keeper.id }, data: { companyId: loser.companyId } });
    }
  }

  console.log(`\nWould delete loser CompanyProfile ${loser.id} (${loser.slug}).`);
  if (APPLY) {
    await prisma.companyProfile.delete({ where: { id: loser.id } });
    console.log('Deleted.');
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
