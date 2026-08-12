/** Read-only: dump recent news for article research. */
import prisma from '../src/lib/db';

async function main() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const articles = await prisma.newsArticle.findMany({
    where: { publishedAt: { gte: cutoff } },
    orderBy: { publishedAt: 'desc' },
    take: 80,
    select: { title: true, summary: true, url: true, source: true, category: true, publishedAt: true },
  });
  for (const a of articles) {
    console.log(`[${a.category}] ${a.publishedAt.toISOString().slice(0, 16)} ${a.source}`);
    console.log(`  ${a.title}`);
    if (a.summary) console.log(`  ${a.summary.slice(0, 220).replace(/\s+/g, ' ')}`);
    console.log(`  ${a.url}`);
  }
  console.log(`total: ${articles.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
