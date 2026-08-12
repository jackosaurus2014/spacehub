/** Preview the weekly economy report without publishing. */
import { buildWeeklyEconomyReport } from '../src/lib/weekly-economy-report';
import prisma from '../src/lib/db';

async function main() {
  const r = await buildWeeklyEconomyReport();
  console.log('TITLE:', r.title);
  console.log('SLUG:', r.slug);
  console.log('SUMMARY:', r.summary);
  console.log('---CONTENT---');
  console.log(r.content);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
