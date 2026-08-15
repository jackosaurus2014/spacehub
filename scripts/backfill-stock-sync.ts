/**
 * One-off backfill for the stock-price split-brain fix.
 *
 * Runs the same logic as src/app/api/cron/stock-sync/route.ts directly
 * against a target DATABASE_URL (does not require the route to be deployed
 * yet). Prints before/after for every public ticker'd company, plus the
 * /api/companies/stats-equivalent totalMarketCap before and after.
 *
 * Run: DATABASE_URL='postgresql://...' npx tsx scripts/backfill-stock-sync.ts
 */
export {};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set. Run with DATABASE_URL=... npx tsx scripts/backfill-stock-sync.ts');
  }

  // Import after DATABASE_URL is confirmed set -- src/lib/db.ts reads it at
  // PrismaClient construction time.
  const { default: prisma } = await import('../src/lib/db');
  const { getLiveQuotesBatch } = await import('../src/lib/stock-quote');
  const { getCompanyStats } = await import('../src/lib/company-roster');

  const statsBefore = await getCompanyStats();
  console.log(`/api/companies/stats totalMarketCap BEFORE: $${statsBefore.totalMarketCap.toFixed(1)}B\n`);

  const companies = await prisma.companyProfile.findMany({
    where: { isPublic: true, ticker: { not: null } },
    select: { id: true, slug: true, name: true, ticker: true, stockPrice: true, marketCap: true },
    orderBy: { slug: 'asc' },
  });

  const validCompanies = companies.filter((c) => c.ticker && c.ticker.trim().length > 0);
  console.log(`Found ${validCompanies.length} public companies with a ticker.\n`);

  const beforeTotalMarketCap = validCompanies.reduce((sum, c) => sum + (c.marketCap || 0), 0);

  const tickers = validCompanies.map((c) => c.ticker as string);
  const quotes = await getLiveQuotesBatch(tickers);

  let updated = 0;
  const skipped: string[] = [];
  const failed: { ticker: string; slug: string; error: string }[] = [];
  const rows: {
    slug: string;
    ticker: string;
    beforePrice: number | null;
    afterPrice: number | null;
    beforeCap: number | null;
    afterCap: number | null;
  }[] = [];

  for (const company of validCompanies) {
    const ticker = (company.ticker as string).trim().toUpperCase();
    const fields = quotes.get(ticker);

    if (!fields) {
      skipped.push(`${ticker} (${company.slug})`);
      rows.push({
        slug: company.slug,
        ticker,
        beforePrice: company.stockPrice,
        afterPrice: company.stockPrice,
        beforeCap: company.marketCap,
        afterCap: company.marketCap,
      });
      continue;
    }

    try {
      await prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          stockPrice: fields.stockPrice,
          marketCap: fields.marketCap ?? undefined,
          priceChange24h: fields.priceChange24h ?? undefined,
          lastVerified: new Date(),
        },
      });
      updated++;
      rows.push({
        slug: company.slug,
        ticker,
        beforePrice: company.stockPrice,
        afterPrice: fields.stockPrice,
        beforeCap: company.marketCap,
        afterCap: fields.marketCap ?? company.marketCap,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      failed.push({ ticker, slug: company.slug, error: msg });
    }
  }

  console.log('=== Before/After (all synced tickers) ===');
  for (const r of rows) {
    const capB = r.beforeCap ? `$${(r.beforeCap / 1e9).toFixed(2)}B` : 'null';
    const capA = r.afterCap ? `$${(r.afterCap / 1e9).toFixed(2)}B` : 'null';
    console.log(
      `${r.ticker.padEnd(8)} ${r.slug.padEnd(28)} price ${String(r.beforePrice ?? 'null').padEnd(10)} -> ${String(r.afterPrice ?? 'null').padEnd(10)}  cap ${capB.padEnd(10)} -> ${capA}`
    );
  }

  console.log(`\nUpdated: ${updated} / ${validCompanies.length}`);
  console.log(`Skipped (no live quote): ${skipped.length}`, skipped);
  console.log(`Failed (DB write error): ${failed.length}`, failed);

  console.log(`\ntotalMarketCap (public ticker'd cos, sum of raw marketCap) before: $${(beforeTotalMarketCap / 1e12).toFixed(3)}T`);

  const statsAfter = await getCompanyStats();
  console.log(`\n/api/companies/stats totalMarketCap AFTER:  $${statsAfter.totalMarketCap.toFixed(1)}B`);
  console.log(`/api/companies/stats totalMarketCap BEFORE: $${statsBefore.totalMarketCap.toFixed(1)}B`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
