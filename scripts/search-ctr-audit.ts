/**
 * Which pages rank but do not get clicked (2026-09-14).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/search-ctr-audit.ts [days] [minImpressions]
 *
 * The Monday growth snapshot showed 405,216 search impressions against 3,459
 * clicks — a site-wide click-through rate near 0.85%. Impressions mean the
 * pages rank; a low CTR at a given position means the title and description
 * are not earning the click. That is the cheapest growth lever we have,
 * because the traffic is already won.
 *
 * This asks Search Console for per-page clicks, impressions, CTR and average
 * position, and sorts by the clicks a page would gain if it merely converted
 * at the rate its position deserves. Position-expected CTR is a coarse,
 * well-known curve (see EXPECTED_CTR_BY_POSITION) — it is a triage tool for
 * ranking rewrite candidates, not a forecast.
 *
 * Also prints, for the worst offenders, the queries they rank for, so a
 * rewrite can use the words people actually typed.
 *
 * Read-only. Prints `HEX <hex JSON>` (the ssh pipe mangles plain text).
 */
import { fetchSearchConsoleRows } from '../src/lib/growth-metrics';

/**
 * Rough organic CTR by average position. Public aggregate studies cluster
 * tightly enough for triage: ~28% at 1, ~15% at 2, ~11% at 3, then a long
 * decay to ~1% by 10 and below. Used only to rank candidates by opportunity.
 */
const EXPECTED_CTR_BY_POSITION: Array<[number, number]> = [
  [1, 0.28], [2, 0.15], [3, 0.11], [4, 0.08], [5, 0.06],
  [6, 0.05], [7, 0.04], [8, 0.032], [9, 0.026], [10, 0.022],
  [15, 0.012], [20, 0.007], [30, 0.003], [50, 0.001],
];

export function expectedCtr(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0;
  let prev = EXPECTED_CTR_BY_POSITION[0];
  for (const point of EXPECTED_CTR_BY_POSITION) {
    if (position <= point[0]) {
      if (point === prev) return point[1];
      // Linear interpolation between the two bracketing points.
      const span = point[0] - prev[0];
      const t = span === 0 ? 0 : (position - prev[0]) / span;
      return prev[1] + (point[1] - prev[1]) * t;
    }
    prev = point;
  }
  return 0.0005;
}

async function main() {
  const days = Number(process.argv[2] || 28);
  const minImpressions = Number(process.argv[3] || 300);

  const pages = await fetchSearchConsoleRows(['page'], days, 500);
  const scored = pages
    .filter((r) => r.impressions >= minImpressions)
    .map((r) => {
      const expected = expectedCtr(r.position);
      const deservedClicks = r.impressions * expected;
      return {
        page: r.keys[0] || '',
        clicks: Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctrPct: Number((r.ctr * 100).toFixed(2)),
        position: Number(r.position.toFixed(1)),
        expectedCtrPct: Number((expected * 100).toFixed(2)),
        // The clicks this page is leaving on the table at its current rank.
        missedClicks: Math.round(Math.max(0, deservedClicks - r.clicks)),
      };
    })
    .sort((a, b) => b.missedClicks - a.missedClicks);

  // For the ten biggest opportunities, the queries they actually rank for —
  // a rewrite should use the reader's words, not ours.
  const top = scored.slice(0, 10);
  const queriesByPage: Record<string, Array<{ query: string; impressions: number; clicks: number; position: number }>> = {};
  for (const row of top) {
    try {
      const qs = await fetchSearchConsoleRows(['query'], days, 10, [
        { dimension: 'page', operator: 'equals', expression: row.page },
      ]);
      queriesByPage[row.page] = qs.map((q) => ({
        query: q.keys[0] || '',
        impressions: Math.round(q.impressions),
        clicks: Math.round(q.clicks),
        position: Number(q.position.toFixed(1)),
      }));
    } catch {
      queriesByPage[row.page] = [];
    }
  }

  const totals = scored.reduce(
    (a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions, missed: a.missed + r.missedClicks }),
    { clicks: 0, impressions: 0, missed: 0 },
  );

  console.log('HEX ' + Buffer.from(JSON.stringify({
    days,
    minImpressions,
    pagesConsidered: scored.length,
    totals,
    top: scored.slice(0, 40),
    queriesByPage,
  })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
