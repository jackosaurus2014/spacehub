/**
 * Resumable SEC insider / 5%-holder / filing-index backfill.
 *
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-sec-insider.ts --dry-run --limit 5
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-sec-insider.ts --apply --limit 15
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-sec-insider.ts --apply --all
 *
 * RUN THIS BEFORE THE RELEASE IS READ. The Space Insider Activity release
 * computes honestly from whatever rows exist, which on a cold database means
 * an empty edition that says so. One full pass fills the archive; the nightly
 * cron keeps it current from there.
 *
 * Resumability lives in DataSourceRun.cursor (the last CompanyProfile.slug
 * handled), so a run killed mid-sweep restarts where it stopped rather than
 * re-hammering EDGAR. `--restart` clears the cursor deliberately.
 *
 * Rate discipline is inside the fetcher (~5 req/s against SEC's 10 req/s fair
 * access ceiling, with a declared User-Agent). DO NOT PARALLELISE THIS SCRIPT,
 * and do not run it alongside scripts/backfill-form-d-funding.ts: the pacing
 * is per-process and the ceiling is per-requester.
 *
 * Writes nothing unless --apply is passed.
 */

import {
  syncSecInsiderSignals,
  INSIDER_DEFAULT_SINCE,
} from '../src/lib/fetchers/sec-insider-fetcher';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTART = args.includes('--restart');
const ALL = args.includes('--all');

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const limit = Number(flag('--limit') ?? (ALL ? 20 : 5));
const since = flag('--since') ?? INSIDER_DEFAULT_SINCE;
const maxDocsPerCompany = Number(flag('--max-docs') ?? 600);
const slugs = flag('--slugs')?.split(',').map((s) => s.trim()).filter(Boolean);

async function main() {
  console.log(
    `backfill-sec-insider — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ` +
      `limit=${limit} since=${since} maxDocs=${maxDocsPerCompany}` +
      `${RESTART ? ' restart' : ''}${slugs ? ` slugs=${slugs.join(',')}` : ''}`,
  );

  let pass = 0;
  const totals = {
    considered: 0,
    withCik: 0,
    filings: 0,
    ownershipDocs: 0,
    transactions: 0,
    schedule13Docs: 0,
    positions: 0,
    unstructured13: 0,
    errors: 0,
  };
  const unmatched = new Set<string>();

  // --all keeps calling the resumable sync until it reports completion, so a
  // single invocation can walk the whole roster while each pass still parks a
  // cursor that survives the process dying.
  for (;;) {
    pass++;
    const res = await syncSecInsiderSignals({
      limit,
      dryRun: !APPLY,
      restart: RESTART && pass === 1,
      since,
      slugs,
      maxDocsPerCompany,
    });

    totals.considered += res.companiesConsidered;
    totals.withCik += res.companiesWithCik;
    totals.filings += res.filingsIndexed;
    totals.ownershipDocs += res.ownershipDocsParsed;
    totals.transactions += res.transactionsWritten;
    totals.schedule13Docs += res.schedule13DocsParsed;
    totals.positions += res.positionsWritten;
    totals.unstructured13 += res.schedule13Unstructured;
    totals.errors += res.httpErrors;
    for (const slug of res.unmatched) unmatched.add(slug);

    console.log(
      `  pass ${pass}: considered=${res.companiesConsidered} cik=${res.companiesWithCik} ` +
        `filings=${res.filingsIndexed} form4docs=${res.ownershipDocsParsed} tx=${res.transactionsWritten} ` +
        `sched13=${res.schedule13DocsParsed} positions=${res.positionsWritten} ` +
        `httpErrors=${res.httpErrors} cursor=${res.cursor ?? '-'} complete=${res.complete}`,
    );

    if (!ALL || res.complete || res.companiesConsidered === 0) break;
    if (pass > 200) {
      console.error('  stopping after 200 passes — the cursor is not advancing.');
      break;
    }
  }

  console.log('\nTotals');
  console.log(`  companies considered      ${totals.considered}`);
  console.log(`  resolved to an SEC filer  ${totals.withCik}`);
  console.log(`  filings indexed           ${totals.filings}`);
  console.log(`  Form 4/5 documents parsed ${totals.ownershipDocs}`);
  console.log(`  transaction lines         ${totals.transactions}`);
  console.log(`  Schedule 13D/G parsed     ${totals.schedule13Docs}`);
  console.log(`  5%-holder rows            ${totals.positions}`);
  console.log(`  pre-2024 13D/G skipped    ${totals.unstructured13} (free-text, never scraped)`);
  console.log(`  HTTP errors               ${totals.errors}`);
  if (unmatched.size > 0) {
    // Not an error: foreign-listed and privately held companies are not SEC
    // filers and never will be. Printed so the coverage gap is visible.
    console.log(`  no SEC filer for          ${Array.from(unmatched).sort().join(', ')}`);
  }
  if (!APPLY) console.log('\nDRY RUN — nothing was written. Re-run with --apply.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
