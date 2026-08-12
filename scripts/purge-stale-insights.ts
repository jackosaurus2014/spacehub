/**
 * Delete the stale pending_review AI-insight backlog — but only if NONE of it
 * is newer than 2026-08-01 (guard requested by Jay).
 * Run: npx tsx scripts/purge-stale-insights.ts
 */
import prisma from '../src/lib/db';

const CUTOFF = new Date('2026-08-01T00:00:00Z');

async function main() {
  const pending = await prisma.aIInsight.count({ where: { status: 'pending_review' } });
  const recent = await prisma.aIInsight.count({
    where: { status: 'pending_review', generatedAt: { gte: CUTOFF } },
  });
  console.log(`pending_review: ${pending}, of which newer than Aug 1: ${recent}`);

  if (recent > 0) {
    console.log('ABORT: backlog contains articles newer than Aug 1 — not deleting.');
    process.exit(2);
  }

  const res = await prisma.aIInsight.deleteMany({ where: { status: 'pending_review' } });
  console.log(`deleted: ${res.count} pending_review articles`);

  const remaining = await prisma.aIInsight.groupBy({ by: ['status'], _count: { _all: true } });
  console.log('remaining by status:', JSON.stringify(remaining));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
