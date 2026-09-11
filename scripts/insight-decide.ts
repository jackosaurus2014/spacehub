/**
 * Editorial decision on a held AI insight, from the shell (2026-09-11).
 * Mirrors /api/ai-insights/[slug]/approve and /reject exactly (status +
 * reviewToken cleared); use when the review email is out of reach.
 *   railway ssh -s spacehub -- npx tsx scripts/insight-decide.ts <slug> reject|approve
 */
import prisma from '../src/lib/db';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');

async function main() {
  const [slug, decision] = process.argv.slice(2);
  if (!slug || !['reject', 'approve'].includes(decision || '')) { console.log('HEX', hex({ error: 'usage: <slug> reject|approve' })); return; }
  const before = await prisma.aIInsight.findUnique({ where: { slug }, select: { id: true, title: true, status: true, generatedAt: true } });
  if (!before) { console.log('HEX', hex({ error: 'not found', slug })); return; }
  const status = decision === 'reject' ? 'rejected' : 'published';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const after = await (prisma.aIInsight as any).update({ where: { slug }, data: { status, reviewToken: null }, select: { id: true, title: true, status: true } });
  console.log('HEX', hex({ slug, before: before.status, after: after.status, title: after.title, generatedAt: before.generatedAt }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
