/**
 * Correct a published weekly economy digest whose "Launches in the next 14
 * days" line printed 0 (2026-09-10 audit): the builder matched only
 * status 'upcoming' while scheduled launches carry go/tbc/tbd. Recomputes
 * the window from the same table, rewrites the table row and the summary,
 * and appends a dated correction note. Dry run by default; `--apply` writes.
 *   railway ssh -s spacehub -- npx tsx scripts/fix-economy-digest.ts <slug> [--apply]
 */
import prisma from '../src/lib/db';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');

async function main() {
  const slug = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!slug) { console.log('HEX', hex({ error: 'usage: <slug> [--apply]' })); return; }
  const row = await prisma.aIInsight.findUnique({ where: { slug }, select: { id: true, title: true, summary: true, content: true, generatedAt: true } });
  if (!row) { console.log('HEX', hex({ error: 'not found', slug })); return; }
  const weekOf = row.generatedAt; // the brief was built at this instant
  const end = new Date(weekOf.getTime() + 14 * 86_400_000);
  const launches = await prisma.spaceEvent.findMany({
    where: { type: 'launch', launchDate: { gte: weekOf, lte: end } },
    orderBy: { launchDate: 'asc' },
    select: { name: true, rocket: true, launchDate: true, status: true },
  });
  const real = launches.filter((l) => l.rocket || l.name.includes('|'));
  const n = real.length;
  const oldRow = /\| Launches in the next 14 days \| 0 \|/;
  const oldSummary = /0 launches on the two-week horizon/;
  const dateLabel = new Date().toISOString().slice(0, 10);
  const note = `\n\n*Correction (${dateLabel}): this brief originally printed 0 launches in the next 14 days. The count only matched launches tagged "upcoming"; the tracker had ${n} launches scheduled in the window (${real.slice(0, 6).map((l) => `${l.rocket || l.name.split('|')[0].trim()} · ${l.launchDate!.toISOString().slice(0, 10)}`).join(', ')}${n > 6 ? ', …' : ''}). The query is fixed for future briefs.*`;
  const newContent = row.content.replace(oldRow, `| Launches in the next 14 days | ${n} |`) + (row.content.includes('*Correction (') ? '' : note);
  const newSummary = row.summary ? row.summary.replace(oldSummary, `${n} launches on the two-week horizon`) : row.summary;
  const changed = newContent !== row.content || newSummary !== row.summary;
  if (apply && changed) await prisma.aIInsight.update({ where: { id: row.id }, data: { content: newContent, summary: newSummary ?? undefined } });
  console.log('HEX', hex({ slug, launchesInWindow: n, window: [weekOf.toISOString(), end.toISOString()], rowMatched: oldRow.test(row.content), summaryMatched: !!row.summary && oldSummary.test(row.summary), changed, applied: apply && changed, sample: real.slice(0, 9).map((l) => `${l.launchDate!.toISOString().slice(0, 10)} ${l.status} ${l.name.slice(0, 40)}`) }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
