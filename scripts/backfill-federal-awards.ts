/**
 * Resumable USAspending federal-award backfill for FederalAward.
 *
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-federal-awards.ts --dry-run --limit 10
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-federal-awards.ts --apply --limit 25
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-federal-awards.ts --apply --all
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-federal-awards.ts --apply --slugs rocket-lab,planet-labs --force
 *
 * Resumability lives in DataSourceRun.cursor (the last CompanyProfile.slug
 * handled), so a run killed mid-sweep restarts where it stopped rather than
 * re-asking the API about every company it already did. `--restart` clears the
 * cursor deliberately; `--force` ignores the 30-day coverage TTL.
 *
 * Rate discipline is inside the fetcher (~1 request/second against a free
 * public service, with a declared User-Agent). Do not parallelise this script.
 *
 * Writes nothing unless --apply is passed.
 */

import {
  syncFederalAwards,
  DEFAULT_SINCE,
  USASPENDING_SEARCH_FLOOR,
} from '../src/lib/fetchers/usaspending-awards-fetcher';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTART = args.includes('--restart');
const FORCE = args.includes('--force');
const ALL = args.includes('--all');

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const limit = Number(flag('--limit') ?? (ALL ? 50 : 10));
const since = flag('--since') ?? DEFAULT_SINCE;
const slugs = flag('--slugs')?.split(',').map((s) => s.trim()).filter(Boolean);

if (since < USASPENDING_SEARCH_FLOOR) {
  console.error(
    `--since ${since} is before the award-search floor ${USASPENDING_SEARCH_FLOOR}. ` +
      'Older awards exist only in the bulk-download endpoints, which this pipeline does not use.'
  );
  process.exit(1);
}

async function main() {
  console.log(
    `backfill-federal-awards — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ` +
      `limit=${limit} since=${since}${RESTART ? ' restart' : ''}${FORCE ? ' force' : ''}` +
      `${slugs ? ` slugs=${slugs.join(',')}` : ''}`
  );

  let pass = 0;
  const totals = {
    considered: 0,
    searched: 0,
    skippedFresh: 0,
    skippedGeneric: 0,
    withAwards: 0,
    recipientsSeen: 0,
    recipientsRejected: 0,
    awards: 0,
    dollars: 0,
    errors: 0,
  };
  const truncated = new Set<string>();

  // --all keeps calling the resumable sync until it reports completion, so a
  // single invocation can walk the whole roster while each pass still parks a
  // cursor that survives the process dying.
  for (;;) {
    pass++;
    const res = await syncFederalAwards({
      limit,
      dryRun: !APPLY,
      restart: RESTART && pass === 1,
      force: FORCE,
      since,
      slugs,
    });

    totals.considered += res.companiesConsidered;
    totals.searched += res.companiesSearched;
    totals.skippedFresh += res.companiesSkippedFresh;
    totals.skippedGeneric += res.companiesSkippedGenericName;
    totals.withAwards += res.companiesWithAwards;
    totals.recipientsSeen += res.recipientsSeen;
    totals.recipientsRejected += res.recipientsRejected;
    totals.awards += res.awardsWritten;
    totals.dollars += res.dollarsWritten;
    totals.errors += res.httpErrors;
    for (const slug of res.truncatedCompanies) truncated.add(slug);

    console.log(
      `pass ${pass}: considered=${res.companiesConsidered} searched=${res.companiesSearched} ` +
        `skippedFresh=${res.companiesSkippedFresh} skippedGeneric=${res.companiesSkippedGenericName} ` +
        `withAwards=${res.companiesWithAwards} awards=${res.awardsWritten} ` +
        `$${Math.round(res.dollarsWritten).toLocaleString('en-US')} ` +
        `rejected=${res.recipientsRejected} httpErrors=${res.httpErrors} ` +
        `cursor=${res.cursor} complete=${res.complete}`
    );

    if (!ALL || res.complete || res.companiesConsidered === 0) break;
  }

  console.log('\n--- totals ---');
  console.log(`companies considered      ${totals.considered}`);
  console.log(`companies searched        ${totals.searched}`);
  console.log(`skipped (fresh coverage)  ${totals.skippedFresh}`);
  console.log(`skipped (generic name)    ${totals.skippedGeneric}`);
  console.log(`companies with awards     ${totals.withAwards}`);
  console.log(`recipients seen           ${totals.recipientsSeen}`);
  console.log(`recipients refused        ${totals.recipientsRejected}`);
  console.log(`awards written            ${totals.awards}`);
  console.log(`dollars obligated         $${Math.round(totals.dollars).toLocaleString('en-US')}`);
  console.log(`http errors               ${totals.errors}`);
  if (truncated.size > 0) {
    console.log(
      `TRUNCATED (totals are a floor): ${Array.from(truncated).sort().join(', ')}`
    );
  }
  if (!APPLY) console.log('\nDRY RUN — nothing was written.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
