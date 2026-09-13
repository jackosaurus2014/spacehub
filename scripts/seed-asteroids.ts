// ─── Space Tycoon: seed the asteroid catalogue (mining Phase A) ─────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3. Run with:
//
//   npx tsx scripts/seed-asteroids.ts            (WORLD_EPOCH from world-reset.ts)
//   ASTEROID_SEED_SALT=<secret> npx tsx scripts/seed-asteroids.ts
//
// IDEMPOTENT: every rock is upserted on its stable id
// (asteroids.ts rockIdFor → `ast_<epoch>_<field>_<nn>`), so a re-run never
// duplicates. On an existing row only the PUBLIC identity is refreshed
// (name/class/deltaV/position); the hidden grade/risk and the live
// `reserve` are left alone so a re-run never resets depletion or reshuffles
// what corporations have already surveyed. Use --reset-hidden to re-roll
// grade/reserve/risk (a new world epoch only).
//
// The hidden roll is salted: with ASTEROID_SEED_SALT unset it falls back to
// a fixed development salt (fine for dev; set the env on Railway before the
// first production seed so the roll cannot be recomputed from the repo).
// The DB-less Railway build never runs this — hit it via `railway ssh`.

import { PrismaClient } from '@prisma/client';
import { ASTEROID_FIELDS, generateFieldRocks, rollAsteroidIntel } from '../src/lib/game/asteroids';
import { WORLD_EPOCH } from '../src/lib/game/world-reset';

const prisma = new PrismaClient();

async function main() {
  const epoch = Number(process.env.ASTEROID_EPOCH || WORLD_EPOCH);
  const salt = process.env.ASTEROID_SEED_SALT || 'dev-salt-epoch-2';
  const resetHidden = process.argv.includes('--reset-hidden');
  if (!process.env.ASTEROID_SEED_SALT) console.warn('ASTEROID_SEED_SALT is not set — using the development salt.');
  console.log(`Seeding asteroid catalogue for epoch ${epoch} (${ASTEROID_FIELDS.length} fields)…`);

  let created = 0;
  let updated = 0;
  for (const field of ASTEROID_FIELDS) {
    const rocks = generateFieldRocks(field, epoch);
    for (const rock of rocks) {
      const intel = rollAsteroidIntel(rock, salt);
      const publicCols = { epoch, fieldId: rock.fieldId, index: rock.index, name: rock.name, class: rock.class, deltaVExtra: rock.deltaVExtra, positionSeed: rock.positionSeed };
      const hiddenCols = { grade: intel.grade, reserve: intel.reserve, initialReserve: intel.reserve, risk: intel.risk, exhaustedAt: null };
      const existing = await prisma.asteroid.findUnique({ where: { id: rock.id }, select: { id: true } });
      if (!existing) {
        await prisma.asteroid.create({ data: { id: rock.id, ...publicCols, ...hiddenCols } });
        created++;
      } else {
        await prisma.asteroid.update({ where: { id: rock.id }, data: resetHidden ? { ...publicCols, ...hiddenCols } : publicCols });
        updated++;
      }
    }
    console.log(`  ${field.name}: ${rocks.length} rocks (${rocks.filter(r => r.class === 'C').length} C / ${rocks.filter(r => r.class === 'S').length} S / ${rocks.filter(r => r.class === 'M').length} M / ${rocks.filter(r => r.class === 'X').length} X)`);
  }
  const total = await prisma.asteroid.count({ where: { epoch } });
  console.log(`Done: ${created} created, ${updated} refreshed, ${total} rocks in epoch ${epoch}.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
