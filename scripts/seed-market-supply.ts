// ─── Seed Market Supply ──────────────────────────────────────────────────────
// Sets OPENING supply quantities for all resources on the global market.
// Safe to re-run (only updates totalSupply if it's currently 0).
//
// Balance Pass 14: `startingSupply` is the opening stock (a small fraction of
// the pricing baseline for anything off-world and unharvested), NOT the
// pricing yardstick — that is `baselineSupply`. A created row gets its
// currentPrice from the supply-implied fundamental so a freshly seeded world
// opens hungry, matching /api/space-tycoon/market/init. To reprice a world
// that is ALREADY running, use scripts/tycoon-opening-scarcity.ts.

import { PrismaClient } from '@prisma/client';
import { RESOURCES } from '../src/lib/game/resources';
import { getFundamentalPrice } from '../src/lib/game/market-engine';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Market Supply Seeder ---\n');

  let updated = 0;
  let skipped = 0;

  for (const res of RESOURCES) {
    const existing = await prisma.marketResource.findUnique({
      where: { slug: res.id },
    });

    if (!existing) {
      const openingPrice = getFundamentalPrice(
        res.baseMarketPrice, res.startingSupply, res.baselineSupply, res.minPrice, res.maxPrice,
      );
      // Create the market resource if it doesn't exist
      await prisma.marketResource.create({
        data: {
          slug: res.id,
          name: res.name,
          description: res.description,
          category: res.category,
          basePrice: res.baseMarketPrice,
          currentPrice: openingPrice,
          minPrice: res.minPrice,
          maxPrice: res.maxPrice,
          volatility: res.volatility,
          totalSupply: res.startingSupply,
          totalDemand: 0,
          priceHistory: [],
        },
      });
      console.log(`  + Created ${res.name}: ${res.startingSupply.toLocaleString()} units (baseline ${res.baselineSupply.toLocaleString()}) @ $${(openingPrice / 1000).toFixed(0)}K opening / $${(res.baseMarketPrice / 1000).toFixed(0)}K base`);
      updated++;
    } else if (existing.totalSupply === 0) {
      // Update supply if currently empty
      await prisma.marketResource.update({
        where: { slug: res.id },
        data: {
          totalSupply: res.startingSupply,
          maxPrice: res.maxPrice, // Also update max price (raised for scarcity headroom)
        },
      });
      console.log(`  ~ Updated ${res.name}: 0 → ${res.startingSupply.toLocaleString()} units`);
      updated++;
    } else {
      console.log(`  - ${res.name}: already has ${existing.totalSupply.toLocaleString()} units (skipped)`);
      skipped++;
    }
  }

  console.log(`\nDone! Updated ${updated}, skipped ${skipped}.`);
  console.log('\nOpening supply summary (opening / baseline; NPC rate is the MATURE rate, ramped in by origin):');
  console.log('─'.repeat(60));
  for (const res of RESOURCES) {
    const price = `$${(res.baseMarketPrice / 1000).toFixed(0)}K`;
    const supply = `${res.startingSupply.toLocaleString()}/${res.baselineSupply.toLocaleString()}`;
    const restock = `${res.npcRestockPerHour}/hr`;
    console.log(`  ${res.icon} ${res.name.padEnd(25)} ${supply.padStart(14)} units  ${price.padStart(8)} base  ${restock.padStart(8)} NPC  ${res.origin}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
