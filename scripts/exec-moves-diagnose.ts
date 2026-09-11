/**
 * Why is ExecutiveMove not being written? (2026-09-10 sentinel: newest write
 * 17 days ago.) Replays the fetcher's own filter + patterns over the last N
 * days of NewsArticle rows and reports, per appointment-looking headline,
 * where it fell out: not eligible (keyword filter), no pattern match, or
 * matched but rejected (unknown org / bad name). Read-only. Hex JSON.
 *   railway ssh -s spacehub -- npx tsx scripts/exec-moves-diagnose.ts [days=21]
 */
import prisma from '../src/lib/db';
import { isEligibleExecMoveArticle, extractMovesFromText, loadKnownCompanyNames } from '../src/lib/fetchers/executive-moves-fetcher';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');
const BROAD = /\b(appoint(s|ed|ment)?|names?d?|hires?d?|promot(es|ed)|joins?|joined|taps|steps? down|stepped down|resign(s|ed)?|depart(s|ed)?|retir(es|ed)|new (ceo|cfo|cto|coo|president|chief))\b/i;
const TITLE_WORDS = /\b(CEO|CFO|CTO|COO|CIO|president|chief|director|head of|vice president|VP)\b/i;

async function main() {
  const days = Number(process.argv[2] || 21);
  const since = new Date(Date.now() - days * 86_400_000);
  const [articles, known, newest, total] = await Promise.all([
    prisma.newsArticle.findMany({ where: { publishedAt: { gte: since } }, select: { title: true, summary: true, source: true, url: true, publishedAt: true }, orderBy: { publishedAt: 'desc' } }),
    loadKnownCompanyNames(),
    prisma.executiveMove.findMany({ orderBy: { date: 'desc' }, take: 5, select: { personName: true, toTitle: true, toCompany: true, date: true, source: true } }),
    prisma.executiveMove.count(),
  ]);
  const candidates = articles.filter((a) => BROAD.test(a.title) && TITLE_WORDS.test(`${a.title} ${a.summary || ''}`));
  const report = candidates.map((a) => {
    const eligible = isEligibleExecMoveArticle(a.title);
    const moves = eligible ? extractMovesFromText(a.title, a.summary || '', a.source || 'Unknown', a.url, known) : [];
    const rawMoves = eligible ? extractMovesFromText(a.title, a.summary || '', a.source || 'Unknown', a.url, new Set()) : [];
    const stage = !eligible ? 'not-eligible' : moves.length ? 'extracted' : rawMoves.length ? 'rejected-unknown-org' : 'no-pattern';
    return { date: a.publishedAt.toISOString().slice(0, 10), source: (a.source || '').slice(0, 20), title: a.title.slice(0, 120), stage, extracted: moves.slice(0, 2).map((m) => `${m.personName} → ${m.toTitle ?? m.fromTitle ?? "?"} @ ${m.toCompany ?? m.fromCompany ?? "?"}`), raw: rawMoves.slice(0, 2).map((m) => `${m.personName} → ${m.toTitle ?? m.fromTitle ?? "?"} @ ${m.toCompany ?? m.fromCompany ?? "?"}`) };
  });
  const byStage: Record<string, number> = {};
  for (const r of report) byStage[r.stage] = (byStage[r.stage] || 0) + 1;
  console.log('HEX', hex({ days, articles: articles.length, knownNames: known.size, candidates: candidates.length, byStage, executiveMoveTotal: total, newest, report: report.slice(0, 40) }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
