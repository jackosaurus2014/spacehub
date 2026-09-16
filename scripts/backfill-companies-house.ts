/**
 * Resumable UK Companies House backfill.
 *
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-companies-house.ts --dry-run
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-companies-house.ts --apply
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-companies-house.ts --apply --slugs skyrora,space-forge
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-companies-house.ts --apply --retry-misses
 *
 * Resumability lives in DataSourceRun.cursor (the last CompanyProfile.slug
 * handled), so a run killed mid-sweep restarts where it stopped. `--restart`
 * clears the cursor deliberately.
 *
 * Rate discipline is inside src/lib/uk-registry/client.ts: ~1.4 req/s against
 * a published ceiling of 600 per five minutes, with a pause when the window
 * runs low. Do not parallelise this script - the pacing is per-process, and
 * Companies House suspends keys that push at the limit.
 *
 * COMPANIES_HOUSE_API_KEY must be present in the environment. It lives in
 * Railway, so run this over `railway ssh` rather than locally, and note that a
 * container deployed BEFORE the variable was added will not have it: the run
 * fails loudly rather than reporting an empty sweep.
 *
 * Writes nothing unless --apply is passed.
 */

import { syncUkRegistry } from '../src/lib/fetchers/companies-house-fetcher';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTART = args.includes('--restart');
const RETRY_MISSES = args.includes('--retry-misses');

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const limit = Number(flag('--limit') ?? 200);
const slugs = flag('--slugs')?.split(',').map((s) => s.trim()).filter(Boolean);

async function main() {
  console.log(
    `backfill-companies-house — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ` +
      `limit=${limit}${RESTART ? ' restart' : ''}${RETRY_MISSES ? ' retry-misses' : ''}` +
      `${slugs ? ` slugs=${slugs.join(',')}` : ''}`,
  );

  const result = await syncUkRegistry({
    limit,
    restart: RESTART,
    dryRun: !APPLY,
    retryMisses: RETRY_MISSES,
    slugs,
  });

  console.log('\n--- result ---');
  console.log(`considered            ${result.companiesConsidered}`);
  console.log(`resolved (new links)  ${result.resolved}`);
  console.log(`already linked        ${result.alreadyLinked}`);
  console.log(`refused               ${result.refused}`);
  console.log(`officers written      ${result.officersWritten}`);
  console.log(`PSC written           ${result.pscWritten}`);
  console.log(`filings written       ${result.filingsWritten}`);
  console.log(`status events         ${result.statusEvents}`);
  console.log(`KeyPersonnel created  ${result.personnelCreated}`);
  console.log(`profile fields filled ${result.profileFieldsFilled}`);
  console.log(`completeness rescored ${result.completenessRecomputed}`);
  console.log(`requests              ${result.requests} (min window remaining ${result.minRateLimitRemaining})`);
  console.log(`http errors           ${result.httpErrors}`);
  console.log(`cursor                ${result.cursor} complete=${result.complete}`);

  if (result.statusContradictions.length > 0) {
    console.log('\n--- register contradicts our editorial status ---');
    for (const line of result.statusContradictions) console.log('  ' + line);
  }

  if (result.unresolved.length > 0) {
    console.log('\n--- left unresolved (deliberately: precision over recall) ---');
    for (const line of result.unresolved) console.log('  ' + line);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
