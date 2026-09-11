/**
 * AI-insight pipeline status for `railway ssh` (2026-09-10): counts by
 * status per day for the last N days, plus the newest rows. Hex-encoded JSON
 * (the ssh pipe drops the letter "s").
 *   npx tsx scripts/insights-status.ts [days=14]
 */
import prisma from '../src/lib/db';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');

async function main() {
  const days = Number(process.argv[2] || 14);
  const since = new Date(Date.now() - days * 86_400_000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any).aIInsight || (prisma as any).aiInsight || (prisma as any).insight;
  if (!model) { console.log('HEX', hex({ error: 'no insight model on client', keys: Object.keys(prisma).filter((k) => /insight/i.test(k)) })); return; }
  const rows: Array<Record<string, unknown>> = await model.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 300 });
  const byDay: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const d = String(r.createdAt).slice(0, 10); const st = String(r.status ?? '?');
    byDay[d] = byDay[d] || {}; byDay[d][st] = (byDay[d][st] || 0) + 1;
  }
  const newest = rows.slice(0, 12).map((r) => ({ slug: r.slug, created: String(r.createdAt).slice(0, 16), status: r.status, title: String(r.title ?? r.headline ?? '').slice(0, 70), published: r.publishedAt ? String(r.publishedAt).slice(0, 10) : null, rejected: r.rejectedAt ? String(r.rejectedAt).slice(0, 10) : null, reason: r.rejectionReason ?? r.reviewNote ?? null }));
  console.log('HEX', hex({ days, total: rows.length, byDay, newest }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
