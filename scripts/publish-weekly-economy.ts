/** Publish this week's State of the Space Economy brief (idempotent on slug). */
import { buildWeeklyEconomyReport } from '../src/lib/weekly-economy-report';
import prisma from '../src/lib/db';

async function main() {
  const report = await buildWeeklyEconomyReport();
  const existing = await prisma.aIInsight.findUnique({ where: { slug: report.slug } });
  if (existing) {
    console.log(`already exists: ${report.slug}`);
    return;
  }
  const created = await prisma.aIInsight.create({
    data: {
      title: report.title,
      slug: report.slug,
      summary: report.summary,
      content: report.content,
      category: 'market',
      sources: JSON.stringify([
        { title: 'SpaceNexus live tracking data', url: 'https://spacenexus.us/market-intel' },
      ]),
      status: 'published',
      factCheckNote: 'Data brief generated directly from SpaceNexus database aggregates — no generative content.',
    },
  });
  console.log(`published: /ai-insights/${created.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
