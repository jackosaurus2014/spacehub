// Seed Zone records for the Territory/Zone Influence system
// Run with: npx tsx scripts/seed-zones.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ZONES = [
  // ─── Major Zones ──────────────────────────────────────────────────────────
  { slug: 'zone_leo', name: 'Low Earth Orbit', parentZone: null, tier: 1 },
  { slug: 'zone_geo', name: 'Geostationary Belt', parentZone: null, tier: 1 },
  { slug: 'zone_lunar', name: 'Cislunar Space', parentZone: null, tier: 2 },
  { slug: 'zone_mars', name: 'Mars System', parentZone: null, tier: 3 },
  { slug: 'zone_belt', name: 'Asteroid Belt', parentZone: null, tier: 3 },
  { slug: 'zone_jupiter', name: 'Jupiter System', parentZone: null, tier: 4 },
  { slug: 'zone_saturn', name: 'Saturn System', parentZone: null, tier: 4 },
  { slug: 'zone_outer', name: 'Outer System', parentZone: null, tier: 5 },

  // ─── LEO Sub-Zones ────────────────────────────────────────────────────────
  { slug: 'sub_leo_comms', name: 'Communications Belt', parentZone: 'zone_leo', tier: 1 },
  { slug: 'sub_leo_stations', name: 'Station Cluster', parentZone: 'zone_leo', tier: 1 },
  { slug: 'sub_leo_observation', name: 'Observation Ring', parentZone: 'zone_leo', tier: 1 },
  { slug: 'sub_leo_launch', name: 'Launch Corridor', parentZone: 'zone_leo', tier: 1 },

  // ─── GEO Sub-Zones ────────────────────────────────────────────────────────
  { slug: 'sub_geo_comms', name: 'GEO Comms Arc', parentZone: 'zone_geo', tier: 1 },
  { slug: 'sub_geo_monitoring', name: 'Persistent Watch', parentZone: 'zone_geo', tier: 1 },
  { slug: 'sub_geo_power', name: 'Power Belt', parentZone: 'zone_geo', tier: 1 },

  // ─── Lunar Sub-Zones ──────────────────────────────────────────────────────
  { slug: 'sub_lunar_mining', name: 'Shackleton Basin', parentZone: 'zone_lunar', tier: 2 },
  { slug: 'sub_lunar_habitats', name: 'Settlement Zone', parentZone: 'zone_lunar', tier: 2 },
  { slug: 'sub_lunar_gateway', name: 'Orbital Gateway', parentZone: 'zone_lunar', tier: 2 },

  // ─── Mars Sub-Zones ───────────────────────────────────────────────────────
  { slug: 'sub_mars_mining', name: 'Hellas Extraction', parentZone: 'zone_mars', tier: 3 },
  { slug: 'sub_mars_colony', name: 'Olympus Settlement', parentZone: 'zone_mars', tier: 3 },
  { slug: 'sub_mars_orbital', name: 'Deimos Station', parentZone: 'zone_mars', tier: 3 },

  // ─── Belt Sub-Zones ───────────────────────────────────────────────────────
  { slug: 'sub_belt_mining', name: 'Ceres Fields', parentZone: 'zone_belt', tier: 3 },
  { slug: 'sub_belt_fabrication', name: 'Belt Forge', parentZone: 'zone_belt', tier: 3 },
  { slug: 'sub_belt_station', name: 'Belt Waystation', parentZone: 'zone_belt', tier: 3 },

  // ─── Jupiter Sub-Zones ────────────────────────────────────────────────────
  { slug: 'sub_jupiter_europa', name: 'Europa Abyss', parentZone: 'zone_jupiter', tier: 4 },
  { slug: 'sub_jupiter_ganymede', name: 'Ganymede Colony', parentZone: 'zone_jupiter', tier: 4 },
  { slug: 'sub_jupiter_station', name: 'Jove Station', parentZone: 'zone_jupiter', tier: 4 },

  // ─── Saturn Sub-Zones ─────────────────────────────────────────────────────
  { slug: 'sub_saturn_titan', name: 'Titan Lakes', parentZone: 'zone_saturn', tier: 4 },
  { slug: 'sub_saturn_enceladus', name: 'Enceladus Geysers', parentZone: 'zone_saturn', tier: 4 },
  { slug: 'sub_saturn_station', name: 'Kronos Hub', parentZone: 'zone_saturn', tier: 4 },

  // ─── Outer Sub-Zones ──────────────────────────────────────────────────────
  { slug: 'sub_outer_kuiper', name: 'Kuiper Mining', parentZone: 'zone_outer', tier: 5 },
  { slug: 'sub_outer_relay', name: 'Deep Space Network', parentZone: 'zone_outer', tier: 5 },
  { slug: 'sub_outer_frontier', name: 'The Frontier', parentZone: 'zone_outer', tier: 5 },
];

async function main() {
  console.log('Seeding zones for Territory/Zone Influence system...\n');

  let created = 0;
  let updated = 0;

  for (const zone of ZONES) {
    const existing = await prisma.zone.findUnique({
      where: { slug: zone.slug },
    });

    if (existing) {
      await prisma.zone.update({
        where: { slug: zone.slug },
        data: {
          name: zone.name,
          parentZone: zone.parentZone,
          tier: zone.tier,
        },
      });
      console.log(`  ~ Updated: ${zone.name} (${zone.slug})`);
      updated++;
    } else {
      await prisma.zone.create({
        data: {
          slug: zone.slug,
          name: zone.name,
          parentZone: zone.parentZone,
          tier: zone.tier,
        },
      });
      console.log(`  + Created: ${zone.name} (${zone.slug})`);
      created++;
    }
  }

  console.log(`\nDone! Created ${created}, updated ${updated} zones.`);
  console.log(`Total: ${ZONES.filter(z => !z.parentZone).length} major zones, ${ZONES.filter(z => z.parentZone).length} sub-zones.`);
}

main()
  .catch((e) => {
    console.error('Error seeding zones:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
