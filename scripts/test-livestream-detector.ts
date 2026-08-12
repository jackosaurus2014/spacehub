/** Live test of the upgraded livestream detector against real YouTube pages. */
import { detectLiveStreams } from '../src/lib/livestream-detector';
import prisma from '../src/lib/db';

async function main() {
  const streams = await detectLiveStreams();
  console.log(`detected: ${streams.length} streams`);
  for (const s of streams) {
    console.log(`- [${s.platform}] ${s.channelName}: ${s.title.slice(0, 80)} (viewers: ${s.viewerCount})`);
    console.log(`    ${s.watchUrl}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
