/**
 * The Monday growth snapshot, on the command line (2026-09-14).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/growth-snapshot.ts
 *
 * `/admin/analytics` renders the same numbers, but reading them needs an
 * admin browser session, which makes the standing Monday protocol ("if
 * Monday±, growth snapshot vs the 10k curve") awkward to run from a terminal.
 * This prints the same `getGrowthSnapshot()` payload plus the gap to the
 * goal curve and the implied weekly rate needed to reach 10,000 MAU by
 * 2026-11-12. Read-only; touches no table.
 *
 * Prints `HEX <hex JSON>` — the ssh pipe mangles plain text.
 */
import { getGrowthSnapshot } from '../src/lib/growth-metrics';

const GOAL_MAU = 10_000;
const GOAL_DATE = new Date('2026-11-12T00:00:00Z');

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
