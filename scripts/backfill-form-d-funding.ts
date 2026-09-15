/**
 * Resumable SEC Form D backfill for FundingRound.
 *
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-form-d-funding.ts --dry-run --limit 20
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-form-d-funding.ts --apply --limit 40
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-form-d-funding.ts --apply --all
 *
 * Resumability lives in DataSourceRun.cursor (the last CompanyProfile.slug
 * handled), so a run killed mid-sweep restarts where it stopped rather than
 * re-hammering EDGAR. `--restart` clears the cursor deliberately.
 *
 * Rate discipline is inside the fetcher (~7 req/s against SEC's 10 req/s fair
 * access ceiling, declared User-Agent). Do not parallelise this script.
 *
 * Writes nothing unless --apply is passed.
 */

import { syncFormDFunding, FORM_D_ELECTRONIC_SINCE } from '../src/lib/fetchers/sec-form-d-fetcher';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTART = args.includes('--restart');
const ALL = args.includes('--all');

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const limit = Number(flag('--limit') ?? (ALL ? 400 : 25));
const since = flag('--since') ?? FORM_D_ELECTRONIC_SINCE;
const slugs = flag('--slugs')?.split(',').map((s) => s.trim()).filter(Boolean);

async function main() {
  console.log(
    `backfill-form-d-funding — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ` +
      `limit=${limit} since=${since}${RESTART ? ' restart' : ''}${slugs ? ` slugs=${slugs.join(',')}` : ''}`,
  );

  let pass = 0;
  let totals = { created: 0, enriched: 0, personnel: 0, filings: 0, considered: 0, matched: 0, errors: 0 };

  // --all keeps calling the resumable sync until it reports completion, so a
  // single invocation can walk the whole roster while each pass still parks a
  // cursor that survives the process dying.
  for (;;) {
    pass++;
    const res = await syncFormDFunding({
      limit,
      dryRun: !APPLY,
      restart: RESTART && pass === 1,
      since,
      slugs,
    });
    totals = {
      created: totals.created + res.roundsCreated,
      enriched: totals.enriched + res.roundsEnriched,
      personnel: totals.personnel + res.personnelCreated,
      filings: totals.filings + res.filingsSeen,
      considered: totals.considered + res.companiesConsidered,
      matched: totals.matched + res.companiesMatched,
      errors: totals.errors + res.httpErrors,
    };
    console.log(
      `pass ${pass}: considered=${res.companiesConsidered} cikMatched=${res.companiesMatched} ` +
        `filings=${res.filingsSeen} created=${res.roundsCreated} enriched=${res.roundsEnriched} ` +
        `personnel=${res.personnelCreated} httpErrors=${res.httpErrors} cursor=${res.cursor} complete=${res.complete}`,
    );
    if (res.unmatched.length > 0) {
      console.log(`  no CIK: ${res.unmatched.slice(0, 20).join(', ')}${res.unmatched.length > 20 ? ' …' : ''}`);
    }
    if (!ALL || res.complete || res.companiesConsidered === 0) break;
  }

  console.log('\nTOTALS ' + JSON.stringify(totals));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { default: prisma } = await import('../src/lib/db');
    await prisma.$disconnect();
  });
