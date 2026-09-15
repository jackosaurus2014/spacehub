/**
 * Resumable EDGAR company-facts backfill + completeness recompute.
 *
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-company-completeness.ts --report
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-company-completeness.ts --apply --all
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-company-completeness.ts --apply --derived-only --all
 *
 * --report prints the before picture: the average score, the per-category
 * averages, and which fields are missing most often. Run it before and after
 * so the delta is a measurement rather than a claim.
 *
 * Writes nothing unless --apply is passed.
 */

import prisma from '../src/lib/db';
import {
  calculateCompletenessBreakdown,
  COMPLETENESS_SCALAR_SELECT,
  COMPLETENESS_COUNT_SELECT,
} from '../src/lib/company-completeness';
import { satelliteAssetSignalAvailable } from '../src/lib/satellite-signal';
import { syncEdgarCompanyFacts } from '../src/lib/fetchers/edgar-company-facts-fetcher';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALL = args.includes('--all');
const RESTART = args.includes('--restart');
const REPORT = args.includes('--report');
const DERIVED_ONLY = args.includes('--derived-only');

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const limit = Number(flag('--limit') ?? (ALL ? 400 : 25));

/** Which scalar fields and relations are empty across the roster. */
async function report() {
  const satelliteSignalAvailable = await satelliteAssetSignalAvailable();
  const rows = await prisma.companyProfile.findMany({
    select: { ...COMPLETENESS_SCALAR_SELECT, _count: { select: COMPLETENESS_COUNT_SELECT } },
  });

  const cat = { basicInfo: 0, financialData: 0, productsOperations: 0, businessIntelligence: 0, externalData: 0 };
  let total = 0;
  const missingScalar: Record<string, number> = {};
  const missingRelation: Record<string, number> = {};

  const scalarFields = [
    'description', 'longDescription', 'ceo', 'headquarters', 'country', 'website',
    'foundedYear', 'employeeCount', 'employeeRange', 'sector', 'linkedinUrl',
    'twitterUrl', 'totalFunding', 'marketCap', 'revenueEstimate', 'ticker', 'exchange',
  ] as const;

  for (const row of rows) {
    const b = calculateCompletenessBreakdown(row, { satelliteSignalAvailable });
    total += b.total;
    cat.basicInfo += b.basicInfo;
    cat.financialData += b.financialData;
    cat.productsOperations += b.productsOperations;
    cat.businessIntelligence += b.businessIntelligence;
    cat.externalData += b.externalData;
    for (const f of scalarFields) {
      const v = (row as Record<string, unknown>)[f];
      if (v === null || v === undefined || v === '') missingScalar[f] = (missingScalar[f] ?? 0) + 1;
    }
    if (!row.tags || row.tags.length === 0) missingScalar.tags = (missingScalar.tags ?? 0) + 1;
    for (const [k, v] of Object.entries(row._count)) {
      if (!v) missingRelation[k] = (missingRelation[k] ?? 0) + 1;
    }
  }

  const n = rows.length || 1;
  console.log(`\ncompanies=${rows.length}  average completeness=${(total / n).toFixed(2)}/100`);
  console.log('category averages (of max):');
  console.log(`  basicInfo            ${(cat.basicInfo / n).toFixed(2)} / 30`);
  console.log(`  financialData        ${(cat.financialData / n).toFixed(2)} / 25`);
  console.log(`  productsOperations   ${(cat.productsOperations / n).toFixed(2)} / 20`);
  console.log(`  businessIntelligence ${(cat.businessIntelligence / n).toFixed(2)} / 15`);
  console.log(`  externalData         ${(cat.externalData / n).toFixed(2)} / 10`);
  console.log('\nmost-missing scalar fields:');
  for (const [k, v] of Object.entries(missingScalar).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} missing on ${v} (${((v / n) * 100).toFixed(0)}%)`);
  }
  console.log('\nempty relations:');
  for (const [k, v] of Object.entries(missingRelation).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} empty on ${v} (${((v / n) * 100).toFixed(0)}%)`);
  }
}

async function main() {
  if (REPORT) {
    await report();
    return;
  }

  console.log(
    `backfill-company-completeness — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ` +
      `limit=${limit}${DERIVED_ONLY ? ' derived-only' : ''}${RESTART ? ' restart' : ''}`,
  );

  let pass = 0;
  for (;;) {
    pass++;
    const res = await syncEdgarCompanyFacts({
      limit,
      dryRun: !APPLY,
      restart: RESTART && pass === 1,
      derivedOnly: DERIVED_ONLY,
    });
    console.log(
      `pass ${pass}: considered=${res.companiesConsidered} withCik=${res.companiesWithCik} ` +
        `fields=${res.fieldsFilled} filings=${res.filingsWritten} derived=${res.derivedUpdated} ` +
        `scored=${res.completenessRecomputed} httpErrors=${res.httpErrors} cursor=${res.cursor} complete=${res.complete}`,
    );
    if (!ALL || res.complete || res.companiesConsidered === 0) break;
  }

  await report();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
