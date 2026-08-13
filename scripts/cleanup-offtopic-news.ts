/**
 * Report (and optionally delete) existing NewsArticle rows from
 * non-space-dedicated feeds that fail the relevance guard added in
 * src/lib/news-fetcher.ts (isSpaceRelevant). The guard only applies to
 * NEW articles going forward — this script is a one-time backfill helper
 * to find/report/clean rows that slipped in before the guard existed
 * (e.g. the HSBC banking/cartel story sourced from SpaceDaily).
 *
 * Default mode is READ-ONLY: it prints a report of matching rows and
 * exits without touching the database. Deletion requires the explicit
 * --delete flag.
 *
 * Run (report only):  npx tsx scripts/cleanup-offtopic-news.ts
 * Run (delete):        npx tsx scripts/cleanup-offtopic-news.ts --delete
 *
 * NOTE: per task instructions, this script has NOT been run against the
 * database. Review the report output before ever passing --delete.
 */
import prisma from '../src/lib/db';
import { isSpaceRelevant } from '../src/lib/news-fetcher';

// Mirror of RELEVANCE_GUARD_FEEDS in src/lib/news-fetcher.ts — kept as a
// separate literal here (rather than importing a private const) since the
// guard set isn't exported; update both lists together if they change.
const RELEVANCE_GUARD_FEEDS = new Set([
  'SpaceDaily',
  'ScienceAlert Space',
  'CNN Space',
  'Wired Science',
  'TechCrunch Space',
  'GeekWire Space',
  'Federal News Network Defense',
  'Defense One',
  'DefenseScoop',
]);

async function main() {
  const shouldDelete = process.argv.includes('--delete');

  const candidates = await prisma.newsArticle.findMany({
    where: { source: { in: Array.from(RELEVANCE_GUARD_FEEDS) } },
    select: { id: true, title: true, summary: true, source: true, url: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  });

  const offtopic = candidates.filter(
    (article) => !isSpaceRelevant(article.title, article.summary || '')
  );

  console.log(`Scanned ${candidates.length} articles from guarded feeds.`);
  console.log(`Found ${offtopic.length} that fail the relevance guard:\n`);

  for (const article of offtopic) {
    console.log(`- [${article.source}] ${article.title}`);
    console.log(`  ${article.url}`);
    console.log(`  published: ${article.publishedAt.toISOString()}\n`);
  }

  if (!shouldDelete) {
    console.log('Dry run only — pass --delete to remove these rows.');
    return;
  }

  if (offtopic.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const res = await prisma.newsArticle.deleteMany({
    where: { id: { in: offtopic.map((a) => a.id) } },
  });
  console.log(`Deleted ${res.count} off-topic articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
