/** Read-only: what do SpaceEvent video/stream URLs look like, esp. SpaceX? */
import prisma from '../src/lib/db';

async function main() {
  const events = await prisma.spaceEvent.findMany({
    where: {
      type: 'launch',
      launchDate: { gte: new Date(Date.now() - 14 * 24 * 3600 * 1000) },
      OR: [{ videoUrl: { not: null } }, { streamUrl: { not: null } }],
    },
    orderBy: { launchDate: 'desc' },
    take: 15,
    select: { name: true, agency: true, launchDate: true, videoUrl: true, streamUrl: true },
  });
  console.log(`events with URLs (last 14d + upcoming): ${events.length}`);
  for (const e of events) {
    console.log(`${e.launchDate?.toISOString().slice(0, 10)} [${e.agency}] ${e.name.slice(0, 50)}`);
    if (e.videoUrl) console.log(`   video:  ${e.videoUrl}`);
    if (e.streamUrl) console.log(`   stream: ${e.streamUrl}`);
  }

  const hostCounts = new Map<string, number>();
  const all = await prisma.spaceEvent.findMany({
    where: { OR: [{ videoUrl: { not: null } }, { streamUrl: { not: null } }] },
    select: { videoUrl: true, streamUrl: true },
    take: 500,
  });
  for (const e of all) {
    for (const u of [e.videoUrl, e.streamUrl]) {
      if (!u) continue;
      try {
        const h = new URL(u).hostname.replace('www.', '');
        hostCounts.set(h, (hostCounts.get(h) || 0) + 1);
      } catch { /* ignore */ }
    }
  }
  console.log('URL hosts:', JSON.stringify(Array.from(hostCounts.entries())));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
