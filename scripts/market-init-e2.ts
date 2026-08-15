// ─── Wave E2 "Goods on the Book" — prod market/init reseed ─────────────────
// docs/ECONOMY_PVP_2026-08.md §E2. Mirrors
// src/app/api/space-tycoon/market/init/route.ts's EXACT idempotent upsert
// logic (same field set, same "existing rows keep currentPrice/totalSupply,
// only static reference fields move") — this script exists only because we
// need to run that logic once directly against the prod DATABASE_URL rather
// than through an authenticated HTTP call. It seeds/re-links:
//   - the 13 crafted-product resources (production-chains.ts outputs) +
//     the new life_support_pack, promoted to RESOURCE_MAP this wave
//   - the 7 adopted colony-era orphan slugs (ammonia, sulfur,
//     solar_concentrate, organic_compounds, deuterium, bio_samples,
//     antimatter_precursors) — these already have live MarketResource rows
//     from a standalone pre-RESOURCE_MAP seed; this call re-links them to
//     RESOURCE_MAP without moving currentPrice (update path leaves
//     currentPrice untouched, exactly like the live route)
// Every other pre-existing resource in RESOURCE_MAP is also touched
// (idempotent update, no functional change) — this is intentionally the
// SAME set market/init already seeds on every call, not a new code path.
//
// Run with: DATABASE_URL='<prod-url>' npx tsx scripts/market-init-e2.ts

import { PrismaClient } from '@prisma/client';
import { RESOURCES } from '../src/lib/game/resources';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Wave E2 market/init reseed (prod) ---');
  console.log(`RESOURCES in RESOURCE_MAP: ${RESOURCES.length}\n`);

  let created = 0;
  let updated = 0;
  const createdSlugs: string[] = [];
  const updatedSlugs: string[] = [];

  for (const r of RESOURCES) {
    const existing = await prisma.marketResource.findUnique({ where: { slug: r.id } });
    if (existing) {
      await prisma.marketResource.update({
        where: { slug: r.id },
        data: {
          name: r.name,
          category: r.category,
          basePrice: r.baseMarketPrice,
          volatility: r.volatility,
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
          description: r.description,
        },
      });
      updated++;
      updatedSlugs.push(r.id);
    } else {
      await prisma.marketResource.create({
        data: {
          slug: r.id,
          name: r.name,
          category: r.category,
          description: r.description,
          basePrice: r.baseMarketPrice,
          currentPrice: r.baseMarketPrice,
          volatility: r.volatility,
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
          totalSupply: 0,
          totalDemand: 0,
          priceHistory: [r.baseMarketPrice],
        },
      });
      created++;
      createdSlugs.push(r.id);
    }
  }

  console.log(`Created: ${created}`);
  if (createdSlugs.length) console.log(`  ${createdSlugs.join(', ')}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total RESOURCE_MAP rows reconciled: ${RESOURCES.length}`);

  const totalRows = await prisma.marketResource.count();
  console.log(`\nTotal MarketResource rows in DB (including any remaining orphans): ${totalRows}`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
