/**
 * Can we launch SpaceNexus Research, and is it still true? (2026-09-15)
 *
 *   railway ssh -s spacehub -- npx tsx scripts/research-readiness.ts
 *
 * Prints every readiness criterion with its verdict. Blockers stop a launch;
 * warnings are limits we disclose rather than hide. The same function runs
 * continuously inside content-accuracy, so this script is the on-demand view
 * of a question that is already being watched.
 *
 * Read-only. Prints `HEX <hex JSON>`.
 */
import { checkResearchReadiness } from '../src/lib/research-readiness';
import { RESEARCH_PLAN, isResearchTierEnabled, getResearchPriceId } from '../src/lib/research';

async function main() {
  const r = await checkResearchReadiness();
  console.log('HEX ' + Buffer.from(JSON.stringify({
    ready: r.ready,
    checkedAt: r.checkedAt,
    advertised: `${RESEARCH_PLAN.currency.toUpperCase()} ${RESEARCH_PLAN.priceYearly}/${RESEARCH_PLAN.interval}, ${RESEARCH_PLAN.totalSeats} seats`,
    flagOn: isResearchTierEnabled(),
    priceConfigured: getResearchPriceId() !== null,
    criteria: r.criteria.map(c => ({ ok: c.ok, severity: c.severity, id: c.id, detail: c.detail })),
  })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
