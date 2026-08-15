/**
 * One-off (founder decision 2026-08-15): publish the pending_review backlog
 * of AI insights that PASSED fact-check (everything except MAJOR ISSUES).
 * Held major_issues rows stay pending for manual review.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/publish-factchecked-backlog.ts [--apply]
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const pending = await (p.aIInsight as unknown as {
    findMany: (args: unknown) => Promise<{ id: string; title: string; factCheckNote: string | null; generatedAt: Date }[]>;
  }).findMany({
    where: { status: 'pending_review' },
    select: { id: true, title: true, factCheckNote: true, generatedAt: true },
    orderBy: { generatedAt: 'asc' },
  });

  // The 07:00 retry cron regenerated same-topic articles with new slugs on
  // 8/14 and 8/15 — publish the better of each near-duplicate pair and
  // reject the twin (route-level guard added separately to stop recurrence).
  const REJECT_TITLES = [
    'Space Force Bets on Multi-Vendor Architecture, Testing Five Companies Against the SpaceX Backbone',
    "Space Command's Alabama Buildout Accelerates: Intel Operations and Billion-Dollar Construction Signal Point of No Return",
    "Artemis III's High-Stakes Countdown: NASA's 2027 Confidence Collides With Starship's Unsolved Refueling Problem",
    'Where Will the In-Space Economy Be by 2035? Mapping the Rise of Orbital Servicing and Data Centers',
  ];
  const passed = pending.filter((r) => !(r.factCheckNote || '').startsWith('MAJOR ISSUES'));
  const rejects = passed.filter((r) => REJECT_TITLES.includes(r.title));
  const publishable = passed.filter((r) => !REJECT_TITLES.includes(r.title));
  console.log(`Near-duplicate twins to reject: ${rejects.length}`);
  const held = pending.length - publishable.length;
  console.log(`Pending: ${pending.length}; publishable (fact-check passed): ${publishable.length}; held (major issues): ${held}`);
  publishable.forEach((r) => console.log('  publish:', r.generatedAt.toISOString().slice(0, 10), r.title));

  if (!apply) { console.log('\nDry run. Re-run with --apply.'); await p.$disconnect(); return; }

  const model = p.aIInsight as unknown as {
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  const res = await model.updateMany({
    where: { id: { in: publishable.map((r) => r.id) } },
    data: { status: 'published' },
  });
  console.log(`Published ${res.count} articles.`);
  const rej = await model.updateMany({
    where: { id: { in: rejects.map((r) => r.id) } },
    data: { status: 'rejected' },
  });
  console.log(`Rejected ${rej.count} near-duplicate twins.`);
  await p.$disconnect();
}
main();
