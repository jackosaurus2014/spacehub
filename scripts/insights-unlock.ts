/**
 * Delete today's (UTC) AI-insights generation lock so the generator can be
 * re-run after a failed attempt (2026-09-10). Prints hex JSON.
 *   railway ssh -s spacehub -- npx tsx scripts/insights-unlock.ts [YYYY-MM-DD]
 */
import prisma from '../src/lib/db';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');

async function main() {
  const day = process.argv[2] || new Date().toISOString().slice(0, 10);
  const contentKey = `ai-insights:generation-lock:${day}`;
  const res = await prisma.dynamicContent.deleteMany({ where: { contentKey } });
  const rowsToday = await prisma.aIInsight.count({ where: { generatedAt: { gte: new Date(`${day}T00:00:00Z`) } } });
  console.log('HEX', hex({ day, contentKey, deleted: res.count, insightRowsToday: rowsToday }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
