// ─── Seed Market Supply ──────────────────────────────────────────────────────
// Sets starting supply quantities for all resources on the global market.
// Safe to re-run (only updates totalSupply if it's currently 0).

import { PrismaClient } from '@prisma/client';
import { RESOURCES } from '../src/lib/game/resources';

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
      // Create the market resource if it doesn't exist
      await prisma.marketResource.create({
        data: {
          slug: res.id,
          name: res.name,
          description: res.description,
          category: res.category,
          basePrice: res.baseMarketPrice,
          currentPrice: res.baseMarketPrice,
          minPrice: res.minPrice,
          maxPrice: res.maxPrice,
          volatility: res.volatility,
          totalSupply: res.startingSupply,
          totalDemand: 0,
          priceHistory: [],
        },
      });
      console.log(`  + Created ${res.name}: ${res.startingSupply.toLocaleString()} units @ $${(res.baseMarketPrice / 1000).toFixed(0)}K base`);
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
  console.log('\nStarting supply summary:');
  console.log('─'.repeat(60));
  for (const res of RESOURCES) {
    const price = `$${(res.baseMarketPrice / 1000).toFixed(0)}K`;
    const supply = res.startingSupply.toLocaleString();
    const restock = `${res.npcRestockPerHour}/hr`;
    console.log(`  ${res.icon} ${res.name.padEnd(25)} ${supply.padStart(8)} units  ${price.padStart(8)} base  ${restock.padStart(8)} NPC`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
