/**
 * One-shot: apply the tightened space-relevance guard to already-stored
 * NewsArticle rows and report (or delete) the ones it would now block.
 *
 * Background (2026-08-20 audit): SpaceDaily's RSS appends a syndication
 * trailer — "The post <title> appeared first on Space Daily." — to every
 * item. The outlet name contains the substring "space", which satisfied the
 * relevance guard's 'space' keyword on EVERY SpaceDaily item, making the
 * guard a no-op for the one feed that most needs it. General-interest
 * science and lifestyle filler (mown-grass chemistry, raven cognition, Stoic
 * quotes-of-the-day, Finnish saunas) reached the top of the live news feed.
 * src/lib/news-fetcher.ts now strips feed boilerplate and the feed's own
 * branding before scoring, with a word-boundary tier for solar-system body
 * names so real planetary science is not caught in the tightening.
 *
 * Only feeds in RELEVANCE_GUARD_FEEDS are evaluated. Space-dedicated feeds
 * (NASA, SpaceNews, Payload, Universe Today, …) bypass the guard at fetch
 * time and are never touched here.
 *
 * Usage:
 *   npx tsx scripts/purge-offtopic-news.ts                 # dry run (default)
 *   npx tsx scripts/purge-offtopic-news.ts --days=60        # widen the window
 *   npx tsx scripts/purge-offtopic-news.ts --apply          # delete
 */

import prisma from '../src/lib/db';
import {
  isSpaceRelevant,
  isEntertainmentCoverage,
  RELEVANCE_GUARD_FEEDS,
} from '../src/lib/news-fetcher';

interface Row {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  category: string;
  publishedAt: Date;
}

function parseDays(): number {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  const value = arg ? Number(arg.split('=')[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : 30;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const days = parseDays();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = (await prisma.newsArticle.findMany({
    where: {
      source: { in: Array.from(RELEVANCE_GUARD_FEEDS) },
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, title: true, summary: true, source: true, category: true, publishedAt: true },
  })) as Row[];

  // Entertainment coverage is checked first, mirroring the live fetch path
  // (founder directive 2026-08-20) — a Star Trek recap passes the space
  // keyword tiers on its own vocabulary.
  const offTopic = rows.filter(
    (row) =>
      isEntertainmentCoverage(row.title) ||
      !isSpaceRelevant(row.title, row.summary || '', row.source)
  );

  const bySource = new Map<string, number>();
  for (const row of offTopic) bySource.set(row.source, (bySource.get(row.source) || 0) + 1);

  console.log(`Mode: ${apply ? 'APPLY (deleting)' : 'DRY RUN (no writes — pass --apply to delete)'}`);
  console.log(`Window: last ${days} days (since ${since.toISOString().slice(0, 10)})`);
  console.log(`Guarded feeds examined: ${RELEVANCE_GUARD_FEEDS.size}`);
  console.log(`Rows examined: ${rows.length}`);
  console.log(`Rows the tightened guard would block: ${offTopic.length}`);

  if (bySource.size > 0) {
    console.log('\n--- by source ---');
    for (const [source, count] of Array.from(bySource.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${source}: ${count}`);
    }
  }

  if (offTopic.length > 0) {
    console.log('\n--- WOULD DELETE ---');
    for (const row of offTopic) {
      console.log(`  ${row.publishedAt.toISOString().slice(0, 10)} [${row.source}/${row.category}] ${row.title.slice(0, 120)}`);
    }
  }

  if (!apply) {
    console.log('\nDry run complete. Review the list above, then re-run with --apply to delete.');
    return;
  }

  if (offTopic.length === 0) {
    console.log('\nNothing to delete.');
    return;
  }

  const result = await prisma.newsArticle.deleteMany({
    where: { id: { in: offTopic.map((row) => row.id) } },
  });
  console.log(`\nDeleted ${result.count} off-topic article(s).`);
}

main()
  .catch((error) => {
    console.error('purge-offtopic-news failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
