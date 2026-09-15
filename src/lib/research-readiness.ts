/**
 * Is SpaceNexus Research fit to sell, right now? (2026-09-15)
 *
 * The founder authorised launching at $399 "once you believe we have
 * sufficient content and agentic workflows in place to augment and keep the
 * Research-level info fresh and accurate". Belief is not a thing anyone can
 * check, so this module turns that sentence into criteria a machine
 * re-evaluates continuously.
 *
 * TWO REASONS IT HAS TO BE CONTINUOUS rather than a one-off launch checklist:
 *
 *   1. Launching is not the end state. A paying subscriber is owed accuracy
 *      in month seven, not just on the day they bought. A feed that dies
 *      quietly in November is the same broken promise as one that was never
 *      wired — and we have shipped exactly that failure before: two FCC
 *      fetchers sat dead for weeks behind a swallowed 403 and the only
 *      symptom was an empty tab.
 *   2. The pricing-truth rule. /pricing may promise only what the code
 *      enforces; this extends it to "and what the data actually delivers".
 *      Selling a quarterly that has not been computed is the same class of
 *      mistake as advertising a discount checkout does not apply.
 *
 * So `checkResearchReadiness()` is wired into content-accuracy, and the
 * question "can we launch?" and the question "is what we sold still true?"
 * are answered by the same function.
 *
 * It deliberately does NOT read the feature flag. Readiness and availability
 * are separate: this says whether the product is worth selling, the flag says
 * whether it is on sale, and the founder owns the second.
 */
import prisma from '@/lib/db';
import { RESEARCH_PLAN, RESEARCH_CAPABILITIES, getResearchPriceId } from '@/lib/research';
import { seriesReleases, latestPeriod, type ResearchRelease } from '@/lib/research-releases';
import { readReleaseLog } from '@/lib/research-release-log';
import { chartWeekKey } from '@/lib/chart-week-keys';

export interface ReadinessCriterion {
  id: string;
  /** What a buyer would be owed if this failed. */
  label: string;
  ok: boolean;
  detail: string;
  /** A blocker stops a launch. A warning is a known limit we disclose. */
  severity: 'blocker' | 'warning';
}

export interface ResearchReadiness {
  ready: boolean;
  checkedAt: string;
  blockers: ReadinessCriterion[];
  warnings: ReadinessCriterion[];
  criteria: ReadinessCriterion[];
}

/** Rounds added in this window must all carry a source URL. */
const SOURCE_WINDOW_DAYS = 30;

/** A release with no edition at all cannot be advertised. */
async function checkEditionsExist(releases: ResearchRelease[], now: Date): Promise<ReadinessCriterion> {
  const missing: string[] = [];
  for (const r of releases) {
    const period = latestPeriod(r, now);
    try {
      const row = await readReleaseLog(r.id, period);
      if (!row) missing.push(`${r.id} (${period})`);
    } catch {
      missing.push(`${r.id} (lookup failed)`);
    }
  }
  return {
    id: 'releases-have-current-edition',
    label: 'Every advertised release has published its current edition',
    ok: missing.length === 0,
    severity: 'blocker',
    detail: missing.length === 0
      ? `${releases.length} release(s), all current`
      : `No edition for: ${missing.join('; ')}. An advertised quarterly nobody has computed is a promise we are not keeping.`,
  };
}

/** The weekly habit is a headline deliverable; a gap in it is visible. */
async function checkChartOfTheWeek(now: Date): Promise<ReadinessCriterion> {
  const week = chartWeekKey(now);
  let published = false;
  try {
    published = (await prisma.chartWeeklyEdition.count({ where: { weekKey: week } })) > 0;
  } catch {
    /* table missing reads as not published */
  }
  return {
    id: 'chart-of-the-week-current',
    label: 'This week’s chart is pinned',
    ok: published,
    severity: 'warning',
    detail: published
      ? `${week} published`
      : `${week} not pinned yet. The chart publishes Wednesday 15:30 UTC, so early in the week this is expected rather than wrong.`,
  };
}

/** Every funding row we would export must say where it came from. */
async function checkRowsCiteSources(): Promise<ReadinessCriterion> {
  const since = new Date(Date.now() - SOURCE_WINDOW_DAYS * 24 * 3600_000);
  try {
    const recent = await prisma.fundingRound.count({ where: { createdAt: { gte: since } } });
    const unsourced = await prisma.fundingRound.count({
      where: { createdAt: { gte: since }, OR: [{ sourceUrl: null }, { sourceUrl: '' }] },
    });
    return {
      id: 'exported-rows-cite-a-source',
      label: 'Every recent funding row cites a source a buyer can open',
      ok: unsourced === 0,
      severity: 'blocker',
      detail: unsourced === 0
        ? `All ${recent} round(s) added in ${SOURCE_WINDOW_DAYS}d carry a source URL`
        : `${unsourced} of ${recent} round(s) added in ${SOURCE_WINDOW_DAYS}d have no source URL. An unciteable row is worse than a missing one in a product sold to investors.`,
    };
  } catch (err) {
    return {
      id: 'exported-rows-cite-a-source',
      label: 'Every recent funding row cites a source a buyer can open',
      ok: false,
      severity: 'blocker',
      detail: `Could not verify: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    };
  }
}

/** Nothing in the exported corpus may have been generated by a model. */
async function checkNothingGenerated(): Promise<ReadinessCriterion> {
  try {
    // An ALLOW-list, not a deny-list. A deny-list of 'generated' /
    // 'estimated' / 'inferred' only catches a writer that admits what it did;
    // a new one inventing its own label sails straight past it. The schema
    // names exactly five honest methods, and "derived" there means computed
    // from other provenanced rows, never estimated.
    const ALLOWED = ['official-filing', 'press-release', 'news', 'derived', 'manual'];
    const total = await prisma.dataProvenance.count();
    const suspect = await prisma.dataProvenance.count({ where: { method: { notIn: ALLOWED } } });
    const methods = await prisma.dataProvenance.groupBy({ by: ['method'], _count: { method: true } });
    const breakdown = methods.map(m => `${m.method} ${m._count.method}`).join(', ');
    return {
      id: 'no-generated-values',
      label: 'Every exported value names an honest provenance method',
      ok: suspect === 0,
      severity: 'blocker',
      detail: suspect === 0
        ? `${total} provenance record(s): ${breakdown}`
        : `${suspect} record(s) use a method outside the allowed set (${ALLOWED.join(', ')}). Found: ${breakdown}. Anything a model produced must not be in a product sold to investors.`,
    };
  } catch (err) {
    return {
      id: 'no-generated-values',
      label: 'No exported value was generated or estimated',
      ok: false,
      severity: 'blocker',
      detail: `Could not verify: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    };
  }
}

/** The feeds that keep it fresh must have run, and run successfully. */
async function checkFeedsAlive(): Promise<ReadinessCriterion> {
  const since = new Date(Date.now() - 3 * 24 * 3600_000);
  try {
    const runs = await prisma.dataSourceRun.findMany({
      where: { startedAt: { gte: since } },
      select: { source: true, ok: true },
      take: 500,
    });
    if (runs.length === 0) {
      return {
        id: 'freshness-feeds-alive',
        label: 'The feeds that keep the data current are running',
        ok: false,
        severity: 'blocker',
        detail: 'No source run recorded in 3 days. Either the nightly sync is not firing or it is not recording, and both mean the data silently ages.',
      };
    }
    const failing = [...new Set(runs.filter(r => !r.ok).map(r => r.source))];
    return {
      id: 'freshness-feeds-alive',
      label: 'The feeds that keep the data current are running',
      ok: failing.length === 0,
      severity: 'blocker',
      detail: failing.length === 0
        ? `${runs.length} run(s) in 3d across ${new Set(runs.map(r => r.source)).size} source(s), all ok`
        : `Failing: ${failing.join(', ')}`,
    };
  } catch (err) {
    return {
      id: 'freshness-feeds-alive',
      label: 'The feeds that keep the data current are running',
      ok: false,
      severity: 'blocker',
      detail: `Could not verify: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    };
  }
}

/** A price that does not exist is a buy button that 500s. */
function checkPriceConfigured(): ReadinessCriterion {
  const id = getResearchPriceId();
  return {
    id: 'stripe-price-configured',
    label: `A ${RESEARCH_PLAN.currency.toUpperCase()} ${RESEARCH_PLAN.priceYearly}/${RESEARCH_PLAN.interval} price exists`,
    ok: id !== null,
    severity: 'blocker',
    detail: id !== null
      ? 'Configured. pricing-integrity.ts diffs its amount and interval against the advertised plan.'
      : 'STRIPE_PRICE_RESEARCH_YEARLY is not set. Create a recurring yearly price on a new product — NOT the STRIPE_PRICE_ENTERPRISE_* vars, which are monthly 49.99 and would mischarge every buyer.',
  };
}

/** Every advertised capability must still name a gate that exists. */
function checkCapabilitiesGated(): ReadinessCriterion {
  const ungated = RESEARCH_CAPABILITIES.filter(c => !c.enforcedBy || !c.accessFlag);
  return {
    id: 'capabilities-are-gated',
    label: 'Every advertised capability names the file that enforces it',
    ok: ungated.length === 0,
    severity: 'blocker',
    detail: ungated.length === 0
      ? `${RESEARCH_CAPABILITIES.length} capability(ies), all gated`
      : `Ungated: ${ungated.map(c => c.id).join(', ')}`,
  };
}

/**
 * The whole answer. Blockers stop a launch; warnings are limits we disclose
 * on the page rather than hide.
 */
export async function checkResearchReadiness(now: Date = new Date()): Promise<ResearchReadiness> {
  const releases = seriesReleases();
  const criteria: ReadinessCriterion[] = [
    checkPriceConfigured(),
    checkCapabilitiesGated(),
    await checkEditionsExist(releases, now),
    await checkRowsCiteSources(),
    await checkNothingGenerated(),
    await checkFeedsAlive(),
    await checkChartOfTheWeek(now),
  ];
  const blockers = criteria.filter(c => !c.ok && c.severity === 'blocker');
  const warnings = criteria.filter(c => !c.ok && c.severity === 'warning');
  return {
    ready: blockers.length === 0,
    checkedAt: now.toISOString(),
    blockers,
    warnings,
    criteria,
  };
}
