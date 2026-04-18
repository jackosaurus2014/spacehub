/**
 * Seed 5 public countdown widgets pointed at real upcoming SpaceEvent launches
 * within the next 90 days.
 *
 * Run with: npx tsx scripts/seed-countdowns.ts
 *
 * Idempotent: uses upsert by slug. If no suitable SpaceEvents exist the script
 * logs a warning and exits cleanly (no synthetic data).
 */

import prisma from '../src/lib/db';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const THEME_ROTATION: Array<'dark' | 'light' | 'minimal' | 'retro'> = [
  'dark',
  'retro',
  'minimal',
  'light',
  'dark',
];

async function main() {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const events = await prisma.spaceEvent.findMany({
    where: {
      launchDate: { gte: now, lte: cutoff },
      status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
    },
    orderBy: { launchDate: 'asc' },
    take: 25,
  });

  if (events.length === 0) {
    console.warn(
      '[seed-countdowns] No upcoming SpaceEvents in the next 90 days; nothing to seed.'
    );
    return;
  }

  // Deduplicate by mission name, then take the first 5 unique entries.
  const seen = new Set<string>();
  const picks = events
    .filter((e) => {
      const key = e.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);

  let created = 0;
  let updated = 0;

  for (let i = 0; i < picks.length; i++) {
    const evt = picks[i];
    if (!evt.launchDate) continue;

    const baseSlug = slugify(evt.name) || `countdown-${i + 1}`;
    const slug = `${baseSlug}-seed`;
    const theme = THEME_ROTATION[i % THEME_ROTATION.length];

    const existing = await prisma.countdownWidget.findUnique({ where: { slug } });

    if (existing) {
      await prisma.countdownWidget.update({
        where: { slug },
        data: {
          missionName: evt.name,
          targetTime: evt.launchDate,
          eventId: evt.id,
          theme,
        },
      });
      updated++;
    } else {
      await prisma.countdownWidget.create({
        data: {
          slug,
          missionName: evt.name,
          targetTime: evt.launchDate,
          eventId: evt.id,
          theme,
        },
      });
      created++;
    }
  }

  console.log(
    `[seed-countdowns] done. created=${created} updated=${updated} total=${picks.length}`
  );
}

main()
  .catch((err) => {
    console.error('[seed-countdowns] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
