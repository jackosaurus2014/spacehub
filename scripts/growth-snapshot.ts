/**
 * The Monday growth snapshot, on the command line (2026-09-14).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/growth-snapshot.ts
 *
 * `/admin/analytics` renders the same numbers, but reading them needs an
 * admin browser session, which makes the standing Monday protocol ("if
 * Monday±, growth snapshot vs the curve") awkward to run from a terminal.
 * This prints the same `getGrowthSnapshot()` payload plus the gap to the
 * goal curve and the implied weekly rate needed to reach the current goal.
 * Read-only; touches no table.
 *
 * Prints `HEX <hex JSON>` — the ssh pipe mangles plain text.
 */
import { getGrowthSnapshot, GROWTH_GOAL_TARGET, GROWTH_GOAL_DATE } from '../src/lib/growth-metrics';

// Read from the curve rather than restated here, so a re-base moves both.
const GOAL_MAU = GROWTH_GOAL_TARGET;
const GOAL_DATE = new Date(`${GROWTH_GOAL_DATE}T00:00:00Z`);

async function main() {
  const snap = await getGrowthSnapshot();
  const weeksLeft = Math.max(
    1,
    (GOAL_DATE.getTime() - Date.now()) / (7 * 24 * 3600_000),
  );
  const mau = snap.mau;

  const out = {
    generatedAt: snap.generatedAt,
    mau,
    wau: snap.wau,
    searchClicks: snap.searchClicks,
    searchImpressions: snap.searchImpressions,
    // Our own cookieless count, which does not depend on the cookie banner.
    // GA4's MAU only sees visitors who accepted it; on 2026-09-17 that was
    // 748 against 2,916 Search Console clicks from Google alone.
    measuredUniques30d: snap.measured ? snap.measured.uniques : null,
    measuredPageViews30d: snap.measured ? snap.measured.pageViews : null,
    measuredDaysCovered: snap.measured ? snap.measured.daysCovered : null,
    curveTarget: snap.goal.currentTarget,
    // Negative means behind the curve.
    gapToCurve: mau === null ? null : mau - snap.goal.currentTarget,
    onTrack: snap.goal.onTrack,
    weeksToGoal: Number(weeksLeft.toFixed(1)),
    // What the next weeks have to look like for the goal to still land.
    requiredWeeklyAdds: mau === null ? null : Math.ceil((GOAL_MAU - mau) / weeksLeft),
    requiredWeeklyGrowthPct:
      mau === null || mau <= 0
        ? null
        : Number(((Math.pow(GOAL_MAU / mau, 1 / weeksLeft) - 1) * 100).toFixed(1)),
    milestones: snap.goal.milestones,
    errors: snap.errors,
  };
  console.log('HEX ' + Buffer.from(JSON.stringify(out)).toString('hex'));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
