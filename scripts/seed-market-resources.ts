// Seed market resources for Space Tycoon
// Run with: npx tsx scripts/seed-market-resources.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESOURCES = [
  { slug: 'lunar_water', name: 'Lunar Water Ice', category: 'water', basePrice: 50000, minPrice: 10000, maxPrice: 200000, volatility: 0.03 },
  { slug: 'mars_water', name: 'Martian Water', category: 'water', basePrice: 80000, minPrice: 20000, maxPrice: 300000, volatility: 0.04 },
  { slug: 'iron', name: 'Iron Ore', category: 'metal', basePrice: 5000, minPrice: 1000, maxPrice: 20000, volatility: 0.02 },
  { slug: 'aluminum', name: 'Aluminum', category: 'metal', basePrice: 8000, minPrice: 2000, maxPrice: 30000, volatility: 0.03 },
  { slug: 'titanium', name: 'Titanium', category: 'metal', basePrice: 25000, minPrice: 8000, maxPrice: 80000, volatility: 0.05 },
  { slug: 'platinum_group', name: 'Platinum Group Metals', category: 'precious', basePrice: 500000, minPrice: 100000, maxPrice: 2000000, volatility: 0.08 },
  { slug: 'gold', name: 'Gold', category: 'precious', basePrice: 300000, minPrice: 80000, maxPrice: 1000000, volatility: 0.06 },
  { slug: 'rare_earth', name: 'Rare Earth Elements', category: 'rare_earth', basePrice: 200000, minPrice: 50000, maxPrice: 800000, volatility: 0.07 },
  { slug: 'methane', name: 'Methane (CH4)', category: 'hydrocarbon', basePrice: 15000, minPrice: 3000, maxPrice: 60000, volatility: 0.04 },
  { slug: 'ethane', name: 'Ethane (C2H6)', category: 'hydrocarbon', basePrice: 20000, minPrice: 5000, maxPrice: 80000, volatility: 0.05 },
  { slug: 'exotic_materials', name: 'Exotic Materials', category: 'exotic', basePrice: 2000000, minPrice: 500000, maxPrice: 10000000, volatility: 0.15 },
  { slug: 'helium3', name: 'Helium-3', category: 'exotic', basePrice: 5000000, minPrice: 1000000, maxPrice: 20000000, volatility: 0.12 },
];

async function main() {
  console.log('Seeding market resources...');

  for (const r of RESOURCES) {
    await prisma.marketResource.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        name: r.name,
        category: r.category,
        basePrice: r.basePrice,
        currentPrice: r.basePrice, // Start at base price
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        volatility: r.volatility,
      },
      update: {
        name: r.name,
        category: r.category,
        basePrice: r.basePrice,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        volatility: r.volatility,
      },
    });
    console.log(`  ✓ ${r.name} (${r.slug})`);
  }

  console.log(`\nSeeded ${RESOURCES.length} market resources.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
