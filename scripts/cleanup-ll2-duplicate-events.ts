/**
 * One-off cleanup for the Aug 2026 duplicate-mission-card bug.
 *
 * Two ingest paths wrote the SAME Launch Library launch under different
 * externalId conventions: events-fetcher.ts used the raw LL2 UUID while
 * launch-windows-data.ts used `ll2-<uuid>` — producing two SpaceEvent rows
 * (and two mission cards) for every launch both crons touched.
 *
 * Fix applied in code: launch-windows-data.ts now uses the raw UUID.
 * This script repairs prod data:
 *   1. DELETE `ll2-`-prefixed rows that have a raw-UUID twin (the raw row is
 *      the one the 15-minute events cron actively updates).
 *   2. RENAME remaining `ll2-`-prefixed rows (no twin) to the raw UUID so
 *      future upserts from either path converge on one row.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/cleanup-ll2-duplicate-events.ts [--apply]
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const twins = await p.$queryRawUnsafe<{ dup_id: string; name: string }[]>(
    `SELECT b.id as dup_id, b.name FROM "SpaceEvent" a
     JOIN "SpaceEvent" b ON b."externalId" = 'll2-' || a."externalId"`
  );
  console.log(`Duplicate (prefixed) rows with a raw twin: ${twins.length}`);
  twins.slice(0, 8).forEach((t) => console.log('  will delete:', t.name));

  const strays = await p.$queryRawUnsafe<{ id: string; ext: string; name: string }[]>(
    `SELECT id, "externalId" as ext, name FROM "SpaceEvent"
     WHERE "externalId" LIKE 'll2-%'
       AND REPLACE("externalId", 'll2-', '') NOT IN (SELECT "externalId" FROM "SpaceEvent" WHERE "externalId" NOT LIKE 'll2-%')`
  );
  console.log(`Prefixed rows with NO twin (will rename to raw): ${strays.length}`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to execute.');
    await p.$disconnect();
    return;
  }

  const del = await p.spaceEvent.deleteMany({ where: { id: { in: twins.map((t) => t.dup_id) } } });
  console.log(`Deleted ${del.count} duplicate rows.`);

  let renamed = 0;
  for (const s of strays) {
    await p.spaceEvent.update({ where: { id: s.id }, data: { externalId: s.ext.replace(/^ll2-/, '') } });
    renamed++;
  }
  console.log(`Renamed ${renamed} stray prefixed rows to raw UUIDs.`);
  await p.$disconnect();
}
main();
