/**
 * Run-once Enforcement Watch historical backfill.
 *
 *   npx tsx scripts/backfill-enforcement.ts [monthsBack]
 *
 * Pulls the last N months (default 12) of enforcement documents from the
 * Federal Register API (BIS denial/settlement orders, DDTC statutory
 * debarments, FAA/FCC civil penalties with a space hook) and upserts them as
 * category-'enforcement' RegulatoryAction rows. Idempotent — dedupKeys match
 * the daily fetcher's, so re-running only refreshes existing rows.
 *
 * Honest seeding: everything stored is a real Federal Register document with
 * its real publication date and source URL. Nothing is synthesized.
 *
 * Requires DATABASE_URL (run against prod via the Railway proxy URL).
 */

import { fetchAndStoreEnforcementActions } from '../src/lib/fetchers/enforcement-fetcher';

async function main() {
  const monthsBack = Math.min(Math.max(parseInt(process.argv[2] || '12', 10) || 12, 1), 24);
  const sinceDays = monthsBack * 30;

  console.log(`Backfilling enforcement actions from the last ~${monthsBack} months (${sinceDays} days)...`);

  // Up to 5 pages x 100 docs per term query — comfortably covers a year of
  // each enforcement stream (the busiest, BIS denial orders, runs ~350 docs
  // across a full decade).
  const result = await fetchAndStoreEnforcementActions({ sinceDays, maxPagesPerQuery: 5 });

  console.log('Backfill result:', JSON.stringify(result, null, 2));
  if (result.errors > 0) {
    console.error('Backfill completed with errors — see logs above.');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
