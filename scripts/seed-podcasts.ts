/**
 * Seed the podcast directory (Podcast model) with a verified roster of
 * space-industry and AI-infrastructure podcasts.
 *
 * Every feedUrl below was verified by actually fetching the RSS feed and
 * confirming it returns valid XML with real episode items — no guessed
 * URLs. See the task report for the list of candidates that were dropped
 * because their feed could not be verified.
 *
 * Idempotent: upserts by `slug`, so re-running never creates duplicates
 * and safely refreshes metadata (description, artwork, category, etc.)
 * for existing rows.
 *
 * Run with:
 *   npx tsx scripts/seed-podcasts.ts            # upsert Podcast rows only
 *   npx tsx scripts/seed-podcasts.ts --sync      # also fetch each RSS feed
 *                                                 # and upsert its episodes
 *                                                 # (initial full sync)
 */

import prisma from '../src/lib/db';
import { generateSlug } from '../src/lib/marketplace-types';
import { syncPodcastFeed } from '../src/lib/podcast-sync';
import { PODCAST_ROSTER as ROSTER, validateRoster } from '../src/lib/podcast-roster';

async function main() {
  const doSync = process.argv.includes('--sync');

  const check = validateRoster(ROSTER);
  if (!check.valid) {
    console.error('Roster validation failed:');
    for (const err of check.errors) console.error(`  - ${err}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Seeding podcast directory (${ROSTER.length} shows)…`);

  let created = 0;
  let updated = 0;

  for (const show of ROSTER) {
    const slug = generateSlug(show.name);

    const existing = await prisma.podcast.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      await prisma.podcast.update({
        where: { slug },
        data: {
          name: show.name,
          description: show.description,
          feedUrl: show.feedUrl,
          websiteUrl: show.websiteUrl,
          author: show.author,
          category: show.category,
          language: 'en',
        },
      });
      updated++;
    } else {
      await prisma.podcast.create({
        data: {
          slug,
          name: show.name,
          description: show.description,
          feedUrl: show.feedUrl,
          websiteUrl: show.websiteUrl,
          author: show.author,
          category: show.category,
          language: 'en',
        },
      });
      created++;
    }
  }

  console.log(`Podcast rows: ${created} created, ${updated} updated.`);

  if (doSync) {
    console.log('Running initial full sync (fetching each RSS feed)…');
    const podcasts = await prisma.podcast.findMany({
      where: { slug: { in: ROSTER.map((s) => generateSlug(s.name)) } },
      select: { id: true, slug: true, name: true, feedUrl: true },
    });

    let syncedOk = 0;
    let syncedFailed = 0;
    let totalEpisodes = 0;

    for (const podcast of podcasts) {
      const result = await syncPodcastFeed(podcast);
      if (result.success) {
        syncedOk++;
        totalEpisodes += result.totalEpisodes;
        console.log(
          `  [ok] ${podcast.name}: ${result.upserted} episodes upserted (${result.totalEpisodes} total)`,
        );
      } else {
        syncedFailed++;
        console.warn(`  [FAIL] ${podcast.name}: ${result.error}`);
      }
    }

    console.log(
      `Sync complete: ${syncedOk} shows synced ok, ${syncedFailed} failed, ${totalEpisodes} total episodes across synced shows.`,
    );
  }

  const podcastCount = await prisma.podcast.count();
  const episodeCount = await prisma.podcastEpisode.count();
  console.log(`Directory totals — Podcasts: ${podcastCount}, Episodes: ${episodeCount}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
