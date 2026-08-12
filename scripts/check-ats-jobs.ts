/** Read-only: verify synced ATS jobs in the DB. */
import prisma from '../src/lib/db';

async function main() {
  const bySource = await prisma.spaceJobPosting.groupBy({
    by: ['source'],
    _count: { _all: true },
  });
  console.log('by source:', JSON.stringify(bySource));

  const byCompany = await prisma.spaceJobPosting.groupBy({
    by: ['company'],
    where: { source: { not: null }, isActive: true },
    _count: { _all: true },
  });
  console.log('active synced jobs by company:');
  for (const c of byCompany.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${c.company}: ${c._count._all}`);
  }

  const sample = await prisma.spaceJobPosting.findFirst({
    where: { source: { not: null } },
    select: { title: true, company: true, location: true, sourceUrl: true, category: true, seniorityLevel: true, postedDate: true },
  });
  console.log('sample:', JSON.stringify(sample, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
