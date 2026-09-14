/**
 * Read an AI insight and its fact-check note (2026-09-14).
 *   railway ssh -s spacehub -- npx tsx scripts/insight-read.ts <title-substring|slug> [--full]
 * Prints `HEX <hex JSON>`; --full includes the body.
 */
import prisma from '../src/lib/db';

async function main() {
  const q = process.argv[2] || '';
  const full = process.argv.includes('--full');
  const rows = await prisma.aIInsight.findMany({
    where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] },
    orderBy: { generatedAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, status: true, category: true, generatedAt: true, factCheckNote: true, sources: true, summary: true, content: true },
  });
  const out = rows.map((r) => ({
    slug: r.slug, title: r.title, status: r.status, category: r.category,
    generatedAt: r.generatedAt, factCheckNote: r.factCheckNote, sources: r.sources,
    summary: r.summary, contentLength: r.content.length,
    content: full ? r.content : undefined,
  }));
  console.log('HEX ' + Buffer.from(JSON.stringify(out)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
