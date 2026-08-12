/** Read-only: status of the AI insights pipeline. */
import prisma from '../src/lib/db';

async function main() {
  const byStatus = await prisma.aIInsight.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.log('By status:', JSON.stringify(byStatus));

  const latest = await prisma.aIInsight.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 5,
    select: { title: true, status: true, generatedAt: true, factCheckNote: true },
  });
  for (const a of latest) {
    console.log(
      `${a.generatedAt.toISOString().slice(0, 10)}  [${a.status}]  ${a.title.slice(0, 60)}  fc: ${(a.factCheckNote || '').slice(0, 60)}`
    );
  }

  const pending = await prisma.aIInsight.count({ where: { status: 'pending_review' } });
  console.log(`pending_review total: ${pending}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
