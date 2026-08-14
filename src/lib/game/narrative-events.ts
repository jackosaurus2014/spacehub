// ─── Space Tycoon: Narrative Event Chains (4X Upgrade Wave W4) ──────────────
// docs/4X_BASELINE_2026-08.md Part 2c: "Event & anomaly chains — 44 hard-sci
// narrative events." Before this wave the game had 4 player choices total
// (random-events.ts's 4 `category: 'choice'` entries) and zero multi-stage
// narrative content — the doc's #1.5 "MAJOR" gap versus Stellaris/MoO2.
//
// This module adds 12 chains / 44 stages, unified under one schema:
//  - ChainDefinition: static content (stages, cadence, eligibility).
//  - ChainProgressState: per-player save state (which stage, flags, timing).
//  - advanceNarrativeChains(): called once per game-month from game-engine's
//    processTick, beside the existing random-events step. Deterministic:
//    every roll (chain start, stage escalation, rolled outcomes) is seeded
//    via mulberry32(hashStringToSeed(...)) off the SHARED world-month index
//    (server-time.ts getGlobalGameDate().totalMonths) — the same pattern
//    hazards.ts and market-events.ts use ("no Math.random anywhere in this
//    module" — hazards.ts:38). generateId() (Date.now()+Math.random) is used
//    only for record/event ids, never for gameplay outcomes, matching the
//    codebase-wide convention (hazards.ts does the same).
//  - Choice consequences route ONLY through hooks other waves already wired
//    real: money ledger (totalEarned/totalSpent), workforce.morale, global
//    reputation (reputation.ts), per-faction standing (factions.ts
//    shiftReputation), activeEffects (revenue/cost/research-speed
//    multipliers — random-events.ts's existing mechanism, extended with an
//    optional researchSpeedMultiplier field consumed in game-engine's
//    researchSpeedMult calc), miningBonuses (the same array survey-probe
//    discoveries and expeditions already write to), and a small new
//    chainHazardMitigationBonuses array consumed by hazards.ts's mitigation
//    functions (additive, capped by the existing MITIGATION_CAP).
//    unlockRareTechId is stored as a forward-compatible flag list
//    (state.unlockedRareTechIds) — research-tree.ts is off-limits to this
//    wave (concurrent agent), so rare-tech GATING lands in wave W10; this
//    wave issues the grant so nothing is lost when W10 wires the consumer.
//
// Cadence (CLAUDE.md "don't collapse the tempo"):
//  - TACTICAL — space_weather_ladder. Escalates almost every eligible month;
//    recurring (a new storm cycle can start again after a cooldown).
//  - QUARTERLY — accord_council. One vote fires per game-quarter, exactly at
//    the quarter boundary (monthIndex % 3 === 0) — the senate loop.
//  - CAMPAIGN — everything else (Europa arc, ISO flyby, contamination,
//    superconductor crisis, industry shocks, crew health, the four lore
//    arcs). Low monthly start probability, multi-month gaps between stages,
//    one-shot (no recurrence) — these are the slow-burn, campaign-scale
//    beats SESSION_DESIGN.md flags as under-served.

import type { GameState, GameEvent } from './types';
import { generateId, mulberry32, hashStringToSeed } from './formulas';
import { shiftReputation, type FactionId } from './factions';
import { addReputationPoints } from './reputation';
// 4X Wave W13 (Corporate Doctrine & Board Politics, docs/4X_BASELINE_2026-08.md
// §1.7): "low approval triggers demands via the existing event/choice
// channel" — BOARD_POLITICS_DEMAND below is that channel. Read-only use of
// corporate-doctrine.ts's pure approval selector; no state written there.
import { getConstituencyApprovals } from './corporate-doctrine';

// ─── Schema ───────────────────────────────────────────────────────────────

export interface ChainConsequence {
  /** Short label used in the event log and consequence preview. */
  label: string;
  /** Honest P&L: cost debited (totalSpent) and/or reward credited
   *  (totalEarned) as SEPARATE ledger lines — see the emergency_contract
   *  sign-bug fix in random-events.ts for why these are kept distinct
   *  instead of a single net moneyDelta. */
  moneyCost?: number;
  moneyReward?: number;
  resourceGrant?: Record<string, number>;
  /** Global reputation (reputation.ts) — never decreases via this path. */
  reputationPoints?: number;
  /** Per-faction standing shift (factions.ts shiftReputation; -100..100). */
  factionRep?: Partial<Record<FactionId, number>>;
  /** Workforce morale delta, clamped to the same 0.5-1.15 band
   *  updateCrewWellbeing uses (workforce.ts:293). */
  moraleDelta?: number;
  /** Temporary multipliers via the existing activeEffects mechanism
   *  (random-events.ts ActiveEffect, extended with researchSpeedMultiplier). */
  revenueMultiplier?: number;
  costMultiplier?: number;
  researchSpeedMultiplier?: number;
  effectDurationMonths?: number;
  /** Reuses the existing miningBonuses array (survey/expedition-sourced). */
  miningBonus?: { locationId: string; resourceId: string; bonusPct: number; durationMonths: number };
  /** New but additive: temporary hazard mitigation bonus, summed into
   *  hazards.ts getShipHazardMitigation / getBuildingHazardMitigation. */
  hazardMitigationBonus?: { amount: number; durationMonths: number };
  /** Forward-compatible flag grant — consumed by a future research-tree
   *  wave (W10 per the doc); stored now so nothing discovered here is lost. */
  unlockRareTechId?: string;
  /** Per-chain-progress flags set on resolution, read by later stages
   *  (e.g. Europa arc: did the player announce early?). */
  setFlags?: Record<string, boolean>;
}

export interface ResolveContext {
  state: GameState;
  progress: ChainProgressState;
  monthIndex: number;
}

export interface ChainStageChoice {
  label: string;
  description: string;
  consequence?: ChainConsequence;
  /** Dynamic consequence (world-shared or flag-branched roll), overrides
   *  `consequence` when present. */
  resolve?: (ctx: ResolveContext) => ChainConsequence;
}

export interface ChainStage {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: 'info' | 'choice';
  /** Static consequence for 'info' stages. */
  consequence?: ChainConsequence;
  /** Dynamic consequence for 'info' stages (rolled outcomes / flag branches). */
  resolve?: (ctx: ResolveContext) => ChainConsequence;
  choices?: ChainStageChoice[];
  /** 4X Wave W5 (docs/4X_BASELINE_2026-08.md Part 3.4): presentation hint,
   *  static data only — no state/save impact. When set to 'cinematic', the
   *  space-tycoon page's CinematicOverlay queue presents a full-screen
   *  moment for this stage's arrival instead of (or ahead of, for 'choice'
   *  stages) the usual toast/modal treatment. Reserved for chain-head
   *  stages (stageIndex 0) on campaign/quarterly-cadence chains — the
   *  tactical space_weather_ladder is deliberately left unflagged: it
   *  escalates almost every eligible month while active, and a full-screen
   *  stinger on that cadence would violate CLAUDE.md's "don't collapse the
   *  tempo" principle. Accord Council's vote head IS flagged despite its
   *  quarterly recurrence — the W5 wave entry explicitly calls out a
   *  "vote" stinger, and quarterly is rare enough to stay an event. */
  presentationHint?: 'cinematic';
}

export type ChainCadence = 'tactical' | 'quarterly' | 'campaign';

export interface ChainDefinition {
  id: string;
  name: string;
  cadence: ChainCadence;
  stages: ChainStage[];
  /** Tactical/campaign: chance per eligible month that a dormant chain starts. */
  startProbabilityPerMonth?: number;
  /** Minimum months between automatic stage advances (campaign pacing). */
  minStageGapMonths?: number;
  /** If true, chain restarts from stage 0 after completion + cooldown. */
  recurring?: boolean;
  cooldownMonthsAfterCompletion?: number;
  /** Chance an eligible active (non-choice) stage advances this month
   *  (tactical ladder escalation roll). Defaults to 1 (always) for
   *  quarterly/campaign, which use their own gating instead. */
  advanceProbability?: number;
  eligibility?: (state: GameState) => boolean;
}

export interface ChainProgressState {
  chainId: string;
  stageIndex: number;
  status: 'active' | 'completed';
  startedAtMonth: number;
  lastAdvancedMonth: number;
  awaitingChoice?: boolean;
  completedAtMonth?: number;
  flags?: Record<string, boolean>;
}

export interface PendingChainChoiceUI {
  eventId: string;
  eventName: string;
  eventIcon: string;
  eventDescription: string;
  choices: { label: string; description: string; consequencePreview?: string[] }[];
  chainId?: string;
  chainName?: string;
  stageIndex?: number;
  totalStages?: number;
}

// ─── Deterministic RNG helpers (mirrors hazards.ts / market-events.ts) ──────

/** World-shared roll: identical for every player on the same world-month. */
function worldRng(tag: string, monthIndex: number): () => number {
  return mulberry32(hashStringToSeed(`stw-chain-world:${tag}:${monthIndex}`));
}

/** Per-player-progress roll: deterministic given the player's own chain
 *  history (which stage started when), but not shared across players —
 *  matches hazards.ts's "target pick" tier (occurrence is shared weather,
 *  which asset gets hit is player-specific). */
function progressRng(chainId: string, tag: string, anchorMonth: number): () => number {
  return mulberry32(hashStringToSeed(`stw-chain-progress:${chainId}:${tag}:${anchorMonth}`));
}

// ─── Consequence preview (for the modal's "what happens if I pick this") ───

export function consequencePreview(c: ChainConsequence): string[] {
  const out: string[] = [];
  if (c.moneyCost) out.push(`-$${(c.moneyCost / 1_000_000).toFixed(0)}M`);
  if (c.moneyReward) out.push(`+$${(c.moneyReward / 1_000_000).toFixed(0)}M`);
  if (c.resourceGrant) {
    for (const [id, qty] of Object.entries(c.resourceGrant)) out.push(`+${qty} ${id.replace(/_/g, ' ')}`);
  }
  if (c.reputationPoints) out.push(`${c.reputationPoints > 0 ? '+' : ''}${c.reputationPoints} reputation`);
  if (c.factionRep) {
    for (const [fid, delta] of Object.entries(c.factionRep)) {
      if (!delta) continue;
      out.push(`${delta > 0 ? '+' : ''}${delta} standing (${fid.replace('the-', '').replace(/-/g, ' ')})`);
    }
  }
  if (c.moraleDelta) out.push(`${c.moraleDelta > 0 ? '+' : ''}${Math.round(c.moraleDelta * 100)}% morale`);
  if (c.revenueMultiplier && c.revenueMultiplier !== 1) out.push(`revenue ×${c.revenueMultiplier} (${c.effectDurationMonths || 1}mo)`);
  if (c.costMultiplier && c.costMultiplier !== 1) out.push(`costs ×${c.costMultiplier} (${c.effectDurationMonths || 1}mo)`);
  if (c.researchSpeedMultiplier && c.researchSpeedMultiplier !== 1) out.push(`research ×${c.researchSpeedMultiplier} (${c.effectDurationMonths || 1}mo)`);
  if (c.miningBonus) out.push(`+${c.miningBonus.bonusPct}% ${c.miningBonus.resourceId.replace(/_/g, ' ')} @ ${c.miningBonus.locationId.replace(/_/g, ' ')} (${c.miningBonus.durationMonths}mo)`);
  if (c.hazardMitigationBonus) out.push(`+${Math.round(c.hazardMitigationBonus.amount * 100)}% hazard mitigation (${c.hazardMitigationBonus.durationMonths}mo)`);
  if (c.unlockRareTechId) out.push(`unlocks: ${c.unlockRareTechId.replace(/_/g, ' ')}`);
  if (out.length === 0) out.push('No direct effect');
  return out;
}

// ─── Applying a consequence to state (the wired-hooks dispatcher) ──────────

export function applyChainConsequence(
  state: GameState,
  consequence: ChainConsequence,
  monthIndex: number,
): GameState {
  let next: GameState = { ...state };

  if (consequence.moneyCost) {
    next = { ...next, money: next.money - consequence.moneyCost, totalSpent: next.totalSpent + consequence.moneyCost };
  }
  if (consequence.moneyReward) {
    next = { ...next, money: next.money + consequence.moneyReward, totalEarned: next.totalEarned + consequence.moneyReward };
  }
  if (consequence.resourceGrant) {
    const resources = { ...next.resources };
    for (const [id, qty] of Object.entries(consequence.resourceGrant)) {
      resources[id] = (resources[id] || 0) + qty;
    }
    next = { ...next, resources };
  }
  if (consequence.reputationPoints) {
    next = addReputationPoints(next, consequence.reputationPoints);
  }
  if (consequence.factionRep) {
    for (const [fid, delta] of Object.entries(consequence.factionRep)) {
      if (!delta) continue;
      next = shiftReputation(next, fid as FactionId, delta);
    }
  }
  if (consequence.moraleDelta && next.workforce) {
    const morale = next.workforce.morale ?? 1.0;
    next = {
      ...next,
      workforce: { ...next.workforce, morale: Math.max(0.5, Math.min(1.15, morale + consequence.moraleDelta)) },
    };
  }
  if (consequence.effectDurationMonths && (consequence.revenueMultiplier || consequence.costMultiplier || consequence.researchSpeedMultiplier)) {
    const totalMonths = next.gameDate.year * 12 + next.gameDate.month;
    const activeEffects: NonNullable<GameState['activeEffects']> = [...(next.activeEffects || [])];
    activeEffects.push({
      eventId: `chain_${generateId()}`,
      label: consequence.label,
      expiresAtMonth: totalMonths + consequence.effectDurationMonths,
      revenueMultiplier: consequence.revenueMultiplier || 1,
      costMultiplier: consequence.costMultiplier || 1,
      // Additive field consumed by game-engine's researchSpeedMult calc.
      researchSpeedMultiplier: consequence.researchSpeedMultiplier || 1,
    });
    next = { ...next, activeEffects };
  }
  if (consequence.miningBonus) {
    const currentMonth = next.gameDate.year * 12 + next.gameDate.month;
    const bonus = {
      locationId: consequence.miningBonus.locationId,
      resourceId: consequence.miningBonus.resourceId,
      bonusPct: consequence.miningBonus.bonusPct,
      expiresAtMonth: currentMonth + consequence.miningBonus.durationMonths,
    };
    next = { ...next, miningBonuses: [...(next.miningBonuses || []), bonus] };
  }
  if (consequence.hazardMitigationBonus) {
    const durationMs = consequence.hazardMitigationBonus.durationMonths * 6 * 60 * 60 * 1000; // 1 game-month = 6 real hours
    const bonuses = [...(next.chainHazardMitigationBonuses || [])];
    bonuses.push({
      amount: consequence.hazardMitigationBonus.amount,
      expiresAtMs: Date.now() + durationMs,
      source: consequence.label,
    });
    next = { ...next, chainHazardMitigationBonuses: bonuses };
  }
  if (consequence.unlockRareTechId) {
    const known = next.unlockedRareTechIds || [];
    if (!known.includes(consequence.unlockRareTechId)) {
      next = { ...next, unlockedRareTechIds: [...known, consequence.unlockRareTechId] };
    }
  }

  return next;
}

// ─── Chain content: 12 chains / 44 stages ───────────────────────────────────
// See docs/4X_BASELINE_2026-08.md Part 2c for the source spec. Numbering
// below mirrors the doc's event numbers (1-44) as stage ids; the doc leaves
// deliberate numeric gaps per decade block (1-10 space weather, 11-20
// Europa/contamination, 21-30 ISO/Accord, 31-40 industry/crew, 41-44 lore) —
// this wave fills every block to its full 10 (44 total with the 4 lore
// arcs), authoring genuinely new hard-sci-accurate stages for the gaps
// rather than leaving stubs.

const SPACE_WEATHER_LADDER: ChainDefinition = {
  id: 'space_weather_ladder',
  name: 'Space Weather Ladder',
  cadence: 'tactical',
  recurring: true,
  cooldownMonthsAfterCompletion: 4,
  startProbabilityPerMonth: 0.05,
  advanceProbability: 0.6,
  minStageGapMonths: 0,
  stages: [
    {
      id: 'sw_01', name: 'M-Class Solar Flare', icon: '🌤️', kind: 'info',
      description: 'A GOES-scale M-class flare erupts on the Earth-facing solar disk. HF radio blackouts ripple across your comsat customers.',
      consequence: { label: 'M-Class Flare', revenueMultiplier: 0.97, effectDurationMonths: 1 },
    },
    {
      id: 'sw_02', name: 'X-Class Escalation', icon: '⚡', kind: 'choice',
      description: 'The active region intensifies to X-class. Fleet operators across the belt are bracing for a rough cycle.',
      choices: [
        { label: 'Safe-mode the fleet', description: 'Power down non-essential systems fleet-wide. Costs a month of productivity, but the hardware rides it out clean.',
          consequence: { label: 'Fleet Safe-Mode', revenueMultiplier: 0.85, effectDurationMonths: 1 } },
        { label: 'Ride it out', description: 'Keep operating at full tilt and accept the hardware risk.',
          consequence: { label: 'Storm Damage (uninsured exposure)', moneyCost: 140_000_000 } },
      ],
    },
    {
      id: 'sw_03', name: 'Carrington-Class CME Warning', icon: '🌋', kind: 'choice',
      description: 'A halo coronal mass ejection erupts — trajectory modeling gives a 48-hour Earth-directed impact window. This is Carrington-class energy.',
      choices: [
        { label: 'Emergency shielding spend', description: 'Rush-harden critical assets before impact.',
          consequence: { label: 'Emergency Shielding', moneyCost: 220_000_000, hazardMitigationBonus: { amount: 0.12, durationMonths: 2 } } },
        { label: 'Insurance top-up', description: 'Buy supplemental coverage ahead of the storm — cheaper, less protective.',
          consequence: { label: 'Insurance Top-Up', moneyCost: 60_000_000, hazardMitigationBonus: { amount: 0.03, durationMonths: 1 } } },
        { label: 'Evacuate crews', description: 'Pull crew off exposed stations until the storm passes — safety first, but it costs downtime.',
          consequence: { label: 'Crew Evacuation', moneyCost: 40_000_000, moraleDelta: 0.03 } },
      ],
    },
    {
      id: 'sw_04', name: 'Aftermath: Repair Market Surge', icon: '🛠️', kind: 'info',
      description: 'Post-storm repair demand spikes across the industry. Your procurement desk buys the dip on repair materials.',
      consequence: { label: 'Repair Materials Windfall', resourceGrant: { iron: 80, titanium: 20 } },
    },
    {
      id: 'sw_05', name: 'Solar Radio Science Windfall', icon: '📡', kind: 'info',
      description: "A well-instrumented ground station captured the storm's radio burst spectrum end-to-end — a clean dataset for space-weather researchers.",
      consequence: { label: 'Radio Science Windfall', reputationPoints: 400, researchSpeedMultiplier: 1.06, effectDurationMonths: 2 },
    },
    {
      id: 'sw_06', name: 'GNSS Timing Drift', icon: '🛰️', kind: 'info',
      description: 'Ionospheric disturbance from the storm cycle degrades GPS/GNSS timing precision for downstream customers.',
      consequence: { label: 'GNSS Timing Drift', revenueMultiplier: 0.98, effectDurationMonths: 1 },
    },
    {
      id: 'sw_07', name: 'Aurora Tourism Windfall', icon: '🌌', kind: 'info',
      description: 'Aurora visible down to mid-latitudes drives a burst of orbital-tourism bookings and livestream interest.',
      consequence: { label: 'Aurora Tourism Windfall', revenueMultiplier: 1.06, effectDurationMonths: 2 },
    },
    {
      id: 'sw_08', name: 'Safe-Mode Recovery Costs', icon: '🔧', kind: 'info',
      description: 'Bringing safe-mode satellites back to nominal ops after the cycle carries real recommissioning costs.',
      consequence: { label: 'Recommissioning Costs', moneyCost: 25_000_000 },
    },
    {
      id: 'sw_09', name: 'Solar Cycle Maximum Forecast', icon: '📈', kind: 'info',
      description: "NOAA's Space Weather Prediction Center issues an updated solar-maximum forecast — your risk models get sharper for the season.",
      consequence: { label: 'Forecast Update', hazardMitigationBonus: { amount: 0.04, durationMonths: 3 } },
    },
    {
      id: 'sw_10', name: 'SWPC Model Upgrade', icon: '🧭', kind: 'info',
      description: 'An upgraded Space Weather Prediction Center feed subscription extends your hazard warning lead time for the rest of the cycle.',
      consequence: { label: 'SWPC Model Upgrade', hazardMitigationBonus: { amount: 0.05, durationMonths: 4 }, reputationPoints: 150 },
    },
  ],
};

const EUROPA_BIOSIGNATURE_ARC: ChainDefinition = {
  id: 'europa_biosignature',
  name: 'Europa Biosignature Arc',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.02,
  minStageGapMonths: 2,
  eligibility: (state) => (state.unlockedLocations || []).includes('jupiter_system'),
  stages: [
    {
      id: 'eu_11', name: 'Ambiguous Chemistry', icon: '🧊', kind: 'choice', presentationHint: 'cinematic',
      description: "Europa Clipper II's cryobot returns disequilibrium chemistry from the ice-shell brine — a classic biosignature ambiguity. Could be abiotic serpentinization. Could be something else.",
      choices: [
        { label: 'Announce now', description: 'Go public immediately. Reputational upside if it holds — real risk if it does not.',
          consequence: { label: 'Early Announcement', reputationPoints: 600, setFlags: { announcedEarly: true } } },
        { label: 'Replicate first', description: 'Slower, safer. Fund a confirmatory descent before you speak.',
          consequence: { label: 'Replication Funding', moneyCost: 60_000_000, setFlags: { replicatedFirst: true } } },
      ],
    },
    {
      id: 'eu_12', name: 'Replication Attempt', icon: '🔬', kind: 'info',
      description: 'A second cryobot descent runs the confirmatory assay, weighted by instrument quality and the science team on assignment.',
      resolve: ({ monthIndex }) => {
        const rng = worldRng('europa-replication', monthIndex);
        const positive = rng() < 0.55;
        return { label: positive ? 'Second Descent: Positive Signal' : 'Second Descent: Inconclusive', moneyCost: 90_000_000, setFlags: { replicationPositive: positive } };
      },
    },
    {
      id: 'eu_13', name: 'The Debate', icon: '🗣️', kind: 'info',
      description: 'Dr. Vale and a rival astrobiology team publicly split on interpretation. Xenogenic-biomatter futures swing on the headlines.',
      consequence: { label: 'Public Debate', reputationPoints: 100, costMultiplier: 1.02, effectDurationMonths: 1 },
    },
    {
      id: 'eu_14', name: 'Resolution', icon: '🧬', kind: 'info',
      description: 'The scientific community reaches consensus — for now.',
      resolve: ({ progress }) => {
        const flags = progress.flags || {};
        if (flags.replicationPositive) {
          return {
            label: 'Europan Biochemistry Confirmed',
            unlockRareTechId: 'europan_biochemistry',
            reputationPoints: 2500,
            moneyReward: 400_000_000,
          };
        }
        if (flags.announcedEarly) {
          return { label: 'Announcement Refuted', reputationPoints: -400 };
        }
        return { label: 'Cautious Path Vindicated', moneyReward: 30_000_000 };
      },
    },
    {
      id: 'eu_18', name: 'Lander Fleet Expansion', icon: '🚀', kind: 'choice',
      description: 'Fund a second Europa lander to broaden the survey, or conserve the budget for other programs.',
      choices: [
        { label: 'Fund expansion', description: 'A second descent vehicle widens the sampling footprint.',
          consequence: { label: 'Lander Expansion Funded', moneyCost: 180_000_000, miningBonus: { locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 12, durationMonths: 8 } } },
        { label: 'Conserve budget', description: 'Hold the line on program spend.',
          consequence: { label: 'Budget Conserved' } },
      ],
    },
    {
      id: 'eu_19', name: 'COSPAR Category V Review', icon: '📜', kind: 'info',
      description: "The Accord's planetary-protection board formally reclassifies Europa under COSPAR Category V restricted-Earth-return rules.",
      consequence: { label: 'COSPAR Category V', costMultiplier: 1.03, effectDurationMonths: 3, factionRep: { 'echo-remnants': 8 } },
    },
    {
      id: 'eu_20', name: 'Enceladus Comparison Study', icon: '🪐', kind: 'info',
      description: "Cross-referencing against Cassini's Enceladus plume data strengthens your ocean-world models.",
      consequence: { label: 'Comparative Ocean-World Study', reputationPoints: 200, researchSpeedMultiplier: 1.04, effectDurationMonths: 2 },
    },
    {
      id: 'eu_15', name: 'Planetary-Protection Fight', icon: '⚖️', kind: 'choice',
      description: 'The Accord Council debates formal extraction restrictions on Europa. Lobby your position.',
      choices: [
        { label: 'Support restrictions', description: 'Side with Echo Remnants and the precautionary bloc.',
          consequence: { label: 'Supported Restrictions', factionRep: { 'echo-remnants': 12, 'the-dominion': 6 }, costMultiplier: 1.05, effectDurationMonths: 6 } },
        { label: 'Oppose restrictions', description: 'Keep Europa open for extraction.',
          consequence: { label: 'Opposed Restrictions', factionRep: { 'echo-remnants': -10, 'the-dominion': -4 }, revenueMultiplier: 1.05, effectDurationMonths: 6 } },
      ],
    },
  ],
};

const CONTAMINATION_PROTOCOLS: ChainDefinition = {
  id: 'contamination_protocols',
  name: 'Contamination & Protocols',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.018,
  minStageGapMonths: 3,
  eligibility: (state) => (state.unlockedLocations || []).length >= 4,
  stages: [
    {
      id: 'cp_16', name: 'Quarantine Scare', icon: '🧪', kind: 'choice', presentationHint: 'cinematic',
      description: 'A restricted sample-return canister shows a seal-integrity anomaly on final approach.',
      choices: [
        { label: 'Full BSL-4 hold', description: 'Delay and cost, but zero exposure risk.',
          consequence: { label: 'Full Containment Hold', moneyCost: 150_000_000, reputationPoints: 300 } },
        { label: 'Partial release', description: 'Release the low-risk fraction now — a real gamble on the seal.',
          resolve: ({ monthIndex }) => {
            const rng = progressRng('contamination_protocols', 'cp16-partial', monthIndex);
            const clean = rng() < 0.6;
            return clean
              ? { label: 'Partial Release — Clean', moneyCost: 20_000_000, moneyReward: 50_000_000 }
              : { label: 'Partial Release — Breach', moneyCost: 220_000_000, reputationPoints: -500 };
          } },
        { label: 'Destroy sample', description: 'Lose the payoff entirely, gain Accord trust.',
          consequence: { label: 'Sample Destroyed', reputationPoints: 250 } },
      ],
    },
    {
      id: 'cp_17', name: 'Forward-Contamination Inquiry', icon: '🛰️', kind: 'choice',
      description: 'An uncrewed lander broke sterility category on an outer-system touchdown. The Accord opens an inquiry.',
      choices: [
        { label: 'Pay the fine', description: 'Settle quickly and move on.',
          consequence: { label: 'Fine Paid', moneyCost: 90_000_000 } },
        { label: 'Contest the finding', description: 'Your negotiators argue the case — outcome depends on standing with the Dominion.',
          resolve: ({ state }) => {
            const dominionRep = state.factionReputation?.['the-dominion'] ?? 0;
            return dominionRep >= 10
              ? { label: 'Finding Successfully Contested', reputationPoints: 200 }
              : { label: 'Finding Contested — Lost', moneyCost: 160_000_000, reputationPoints: -200 };
          } },
      ],
    },
  ],
};

const ISO_FLYBY: ChainDefinition = {
  id: 'iso_flyby',
  name: 'Interstellar Object Flyby',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.015,
  minStageGapMonths: 1,
  stages: [
    {
      id: 'iso_21', name: 'ISO Detected', icon: '☄️', kind: 'info', presentationHint: 'cinematic',
      description: "Deep-sky surveys flag an interstellar object on a hyperbolic trajectory — 'Oumuamua/Borisov-class. Trajectory publishes; you have weeks, not months.",
      consequence: { label: 'ISO Detected', reputationPoints: 150 },
    },
    {
      id: 'iso_22', name: 'Intercept Decision', icon: '🎯', kind: 'choice',
      description: 'No dedicated interceptor is on station — a rapid-response observation campaign is your only shot before the object leaves the inner system.',
      choices: [
        { label: 'Fund rapid observation campaign', description: 'Redirect assets for a best-effort observation window.',
          consequence: { label: 'Observation Campaign Funded', moneyCost: 260_000_000, setFlags: { observationFunded: true } } },
        { label: 'Let it pass', description: 'Save the money. The object leaves unobserved.',
          consequence: { label: 'Object Passes Unobserved' } },
      ],
    },
    {
      id: 'iso_23', name: 'Composition Result', icon: '🔭', kind: 'info',
      description: 'The observation campaign returns its verdict.',
      resolve: ({ progress, monthIndex }) => {
        if (!progress.flags?.observationFunded) {
          return { label: 'Object Departed Unobserved' };
        }
        const rng = worldRng('iso-composition', monthIndex);
        const roll = rng();
        if (roll < 0.5) return { label: 'Mundane Comet — Survey Data Sold', moneyReward: 40_000_000 };
        if (roll < 0.85) return { label: 'Anomalous Acceleration — Press Cycle', researchSpeedMultiplier: 1.08, effectDurationMonths: 3, reputationPoints: 500 };
        return { label: 'Exotic Composition Confirmed', unlockRareTechId: 'iso_materials_analysis', factionRep: { 'hive-collective': 10 }, reputationPoints: 1000 };
      },
    },
    {
      id: 'iso_29', name: 'Naming Rights Auction', icon: '🏷️', kind: 'choice',
      description: 'The IAU opens a sponsor naming-rights auction for the newly catalogued object.',
      choices: [
        { label: 'Bid for naming rights', description: 'A prestige play — your name on a piece of astronomical history.',
          consequence: { label: 'Naming Rights Won', moneyCost: 50_000_000, reputationPoints: 300 } },
        { label: 'Pass', description: 'Not worth it.', consequence: { label: 'Passed on Auction' } },
      ],
    },
    {
      id: 'iso_30', name: 'DSN Time-Share Dispute', icon: '📡', kind: 'info',
      description: 'Deep Space Network scheduling conflicts from the observation surge briefly bump your comms priority.',
      consequence: { label: 'DSN Scheduling Friction', costMultiplier: 1.02, effectDurationMonths: 1 },
    },
  ],
};

const ACCORD_COUNCIL: ChainDefinition = {
  id: 'accord_council',
  name: 'Accord Council Quarterly Session',
  cadence: 'quarterly',
  recurring: true,
  cooldownMonthsAfterCompletion: 0,
  stages: [
    {
      id: 'ac_24', name: 'Debris-Mitigation Standard', icon: '🛰️', kind: 'choice', presentationHint: 'cinematic',
      description: 'The Council votes on a binding debris-mitigation standard for all Accord-signatory operators.',
      choices: [
        { label: 'Support the standard', description: 'Higher deorbit compliance costs, lower Kessler-cascade risk.',
          consequence: { label: 'Debris Standard Supported', costMultiplier: 1.04, effectDurationMonths: 4, hazardMitigationBonus: { amount: 0.05, durationMonths: 6 }, factionRep: { 'the-dominion': 6 } } },
        { label: 'Oppose the standard', description: 'Keep costs down; the Dominion notices.',
          consequence: { label: 'Debris Standard Opposed', revenueMultiplier: 1.02, effectDurationMonths: 4, factionRep: { 'the-dominion': -6, 'void-corsairs': 4 } } },
      ],
    },
    {
      id: 'ac_25', name: 'Nuclear Launch Licensing', icon: '☢️', kind: 'choice',
      description: 'A licensing framework for NTR/fission launches is on the floor.',
      choices: [
        { label: 'Support licensing', description: 'NTR/fission builds pay a license fee — but the Dominion backs you.',
          consequence: { label: 'Licensing Supported', costMultiplier: 1.03, effectDurationMonths: 6, factionRep: { 'the-dominion': 8 } } },
        { label: 'Oppose licensing', description: 'Deregulated efficiency, but the optics are bad.',
          consequence: { label: 'Licensing Opposed', revenueMultiplier: 1.02, effectDurationMonths: 6, reputationPoints: -100, factionRep: { 'the-syndicate': 6, 'the-dominion': -8 } } },
      ],
    },
    {
      id: 'ac_26', name: 'He-3 Export Framework', icon: '⚛️', kind: 'choice',
      description: 'A framework for helium-3 export controls is proposed.',
      choices: [
        { label: 'Support tight controls', description: 'Lower trade volume, but goodwill with regulators.',
          consequence: { label: 'He-3 Controls Supported', revenueMultiplier: 0.98, effectDurationMonths: 4, reputationPoints: 200 } },
        { label: 'Support open export', description: 'More trade, but the Dominion dislikes the loosened oversight.',
          consequence: { label: 'Open Export Supported', revenueMultiplier: 1.04, effectDurationMonths: 4, factionRep: { 'the-syndicate': 6, 'the-dominion': -4 } } },
      ],
    },
    {
      id: 'ac_27', name: 'Planetary-Protection Categories', icon: '📋', kind: 'choice',
      description: 'The Council reviews COSPAR-derived planetary-protection categories for outer-system bodies.',
      choices: [
        { label: 'Strict categories', description: 'Echo Remnants approve; compliance costs rise.',
          consequence: { label: 'Strict Categories', factionRep: { 'echo-remnants': 10 }, costMultiplier: 1.03, effectDurationMonths: 4 } },
        { label: 'Permissive categories', description: 'More extraction access; the Remnants are displeased.',
          consequence: { label: 'Permissive Categories', factionRep: { 'echo-remnants': -8 }, revenueMultiplier: 1.03, effectDurationMonths: 4 } },
      ],
    },
    {
      id: 'ac_28', name: 'Crewed-Mission Duty-of-Care', icon: '🩺', kind: 'choice',
      description: 'A duty-of-care standard mandating medic staffing on crewed missions is on the floor.',
      choices: [
        { label: 'Support the mandate', description: 'Medic staffing costs rise; crew morale improves.',
          consequence: { label: 'Duty-of-Care Mandate Supported', costMultiplier: 1.02, effectDurationMonths: 6, moraleDelta: 0.03 } },
        { label: 'Oppose the mandate', description: 'Save on staffing costs; crew morale suffers.',
          consequence: { label: 'Duty-of-Care Mandate Opposed', revenueMultiplier: 1.02, effectDurationMonths: 6, moraleDelta: -0.02 } },
      ],
    },
  ],
};

const SUPERCONDUCTOR_CRISIS: ChainDefinition = {
  id: 'superconductor_crisis',
  name: 'Room-Temperature Superconductor Crisis',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.02,
  stages: [
    {
      id: 'sc_31', name: 'Superconductor Replication Claim', icon: '⚛️', kind: 'choice', presentationHint: 'cinematic',
      description: 'A lab claims a room-temperature, ambient-pressure superconductor — LK-99 echoes. Replication attempts are underway across the industry, ties to your own superconductors research.',
      choices: [
        { label: 'License early', description: 'Pay now for exclusive early access. The claim is unverified — same roll for everyone this world-month.',
          resolve: ({ monthIndex }) => {
            const rng = worldRng('superconductor-claim', monthIndex);
            const real = rng() < 0.30;
            return real
              ? { label: 'Claim Replicated — Early License Pays Off', moneyCost: 200_000_000, reputationPoints: 3000, researchSpeedMultiplier: 1.15, effectDurationMonths: 6, unlockRareTechId: 'vacuum_metallurgy_breakthrough' }
              : { label: 'Claim Debunked — Licensing Fee Lost', moneyCost: 200_000_000, reputationPoints: -300 };
          } },
        { label: 'Wait for replication', description: 'Safe path — sit out the licensing gamble entirely.',
          consequence: { label: 'Waited for Replication' } },
      ],
    },
  ],
};

const INDUSTRY_SHOCKS: ChainDefinition = {
  id: 'industry_shocks',
  name: 'Industry & Research Shocks',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.02,
  minStageGapMonths: 2,
  stages: [
    {
      id: 'is_32', name: 'Fusion Ignition Milestone', icon: '☢️', kind: 'info', presentationHint: 'cinematic',
      description: 'A national lab confirms sustained fusion ignition gain — a global research-speed window opens on the power spine.',
      consequence: { label: 'Fusion Ignition Milestone', researchSpeedMultiplier: 1.1, effectDurationMonths: 3, reputationPoints: 300 },
    },
    {
      id: 'is_33', name: 'Pu-238 Shortage', icon: '🔋', kind: 'choice',
      description: 'RTG-dependent programs stall as Pu-238 production lags demand.',
      choices: [
        { label: 'Fund production restart', description: 'Underwrite a production restart.',
          consequence: { label: 'Pu-238 Restart Funded', moneyCost: 150_000_000, reputationPoints: 400 } },
        { label: 'Wait it out', description: 'RTG-dependent programs run behind schedule.',
          consequence: { label: 'RTG Programs Delayed', costMultiplier: 1.03, effectDurationMonths: 4 } },
      ],
    },
    {
      id: 'is_34', name: 'Kessler Near-Miss', icon: '💥', kind: 'choice',
      description: 'A LEO conjunction cascade warning forces an industry-wide debris-avoidance scramble.',
      choices: [
        { label: 'Fund avoidance maneuvers', description: 'Real protection, real cost.',
          consequence: { label: 'Avoidance Maneuvers Funded', moneyCost: 70_000_000, hazardMitigationBonus: { amount: 0.06, durationMonths: 3 } } },
        { label: 'Accept the risk', description: 'Save the money, ride the odds.',
          consequence: { label: 'Risk Accepted' } },
      ],
    },
    {
      id: 'is_35', name: 'Megaconstellation Astronomy Backlash', icon: '🔭', kind: 'choice',
      description: 'Astronomers protest your telecom constellation\'s light pollution — set against your own science-program output.',
      choices: [
        { label: 'Side with telecom revenue', description: 'Keep the constellation running at full tilt.',
          consequence: { label: 'Sided with Telecom', revenueMultiplier: 1.05, effectDurationMonths: 4, factionRep: { 'echo-remnants': -6 } } },
        { label: 'Side with dark-sky science', description: 'Throttle back for observatory windows.',
          consequence: { label: 'Sided with Astronomy', reputationPoints: 400, factionRep: { 'echo-remnants': 6 }, revenueMultiplier: 0.97, effectDurationMonths: 4 } },
      ],
    },
    {
      id: 'is_39', name: 'Insurance Underwriters Consortium', icon: '🏦', kind: 'info',
      description: 'Outer Rim Insurance Mutual revises its risk models industry-wide after the recent hazard cycle.',
      consequence: { label: 'Premium Revision', costMultiplier: 1.02, effectDurationMonths: 3 },
    },
    {
      id: 'is_40', name: 'Automation Labor Transition', icon: '🤖', kind: 'choice',
      description: "New autonomy research threatens to displace crew roles. The Orbital Engineers' Union is watching closely.",
      choices: [
        { label: 'Fund retraining program', description: 'Retrain displaced crew into new roles.',
          consequence: { label: 'Retraining Funded', moneyCost: 90_000_000, moraleDelta: 0.05 } },
        { label: 'Proceed with layoffs', description: 'Cut costs immediately — morale takes the hit.',
          consequence: { label: 'Layoffs Proceeded', moneyReward: 40_000_000, moraleDelta: -0.08 } },
      ],
    },
  ],
};

const CREW_HEALTH_CRISIS: ChainDefinition = {
  id: 'crew_health_crisis',
  name: 'Crew Health Crisis',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.018,
  minStageGapMonths: 2,
  stages: [
    {
      id: 'ch_36', name: 'SANS Cluster', icon: '👁️', kind: 'choice', presentationHint: 'cinematic',
      description: 'A cluster of Spaceflight-Associated Neuro-ocular Syndrome cases appears across your long-duration crews.',
      choices: [
        { label: 'Mitigation protocol', description: 'Fund countermeasures.',
          consequence: { label: 'SANS Mitigation', moneyCost: 60_000_000, moraleDelta: 0.02 } },
        { label: 'Rotate crews', description: 'Shorter tours reduce exposure, at an operational cost.',
          consequence: { label: 'Crew Rotation', costMultiplier: 1.02, effectDurationMonths: 3, moraleDelta: -0.02 } },
      ],
    },
    {
      id: 'ch_37', name: 'Radiation Exposure Audit', icon: '☢️', kind: 'choice',
      description: 'A dose-limit breach is found in your outer-system crew logs.',
      choices: [
        { label: 'Stand down affected crews', description: 'Safety first — revenue takes a hit.',
          consequence: { label: 'Crews Stood Down', revenueMultiplier: 0.95, effectDurationMonths: 2, moraleDelta: 0.03 } },
        { label: 'Contest the finding', description: 'Push back on the audit — the Dominion is not pleased.',
          consequence: { label: 'Finding Contested', moneyCost: 30_000_000, factionRep: { 'the-dominion': -5 } } },
      ],
    },
    {
      id: 'ch_38', name: 'Mars Dust Pandemic Echo', icon: '🦠', kind: 'choice',
      description: "A novel respiratory illness clusters among Mars surface crews — the 2097 Dust Pandemic is still a living memory out here.",
      choices: [
        { label: 'Full containment', description: 'Lock down affected habitats.',
          consequence: { label: 'Containment Enforced', moneyCost: 120_000_000, moraleDelta: 0.04 } },
        { label: 'Vaccine program', description: 'Fund a rapid vaccine program — expensive, but decisive.',
          consequence: { label: 'Vaccine Program Funded', moneyCost: 200_000_000, reputationPoints: 500, moraleDelta: 0.06 } },
        { label: 'Evacuation', description: 'Pull crews off Mars until it passes.',
          consequence: { label: 'Crews Evacuated', moneyCost: 80_000_000, revenueMultiplier: 0.9, effectDurationMonths: 2 } },
      ],
    },
  ],
};

const GREAT_SILENCE_RECURRENCE: ChainDefinition = {
  id: 'great_silence_recurrence',
  name: 'Great Silence Recurrence',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.01,
  stages: [
    {
      id: 'gs_41', name: 'Great Silence Recurrence', icon: '🐝', kind: 'info', presentationHint: 'cinematic',
      description: 'Every Hive Collective interface station goes dormant simultaneously — just like 2103. Xenogenic-biomatter trade freezes for the duration; resolution rolls after several months, then traffic resumes as if nothing happened.',
      consequence: { label: 'Great Silence Recurrence', costMultiplier: 1.02, effectDurationMonths: 2, factionRep: { 'hive-collective': 5 }, reputationPoints: 300 },
    },
  ],
};

const TRITON_ARCHIVE_FOLLOWUP: ChainDefinition = {
  id: 'triton_archive_followup',
  name: 'Triton Archive Follow-Up',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.01,
  stages: [
    {
      id: 'ta_42', name: 'Triton Archive Follow-Up', icon: '🏛️', kind: 'choice', presentationHint: 'cinematic',
      description: 'Echo Remnants commission a follow-up investigation into the 2149 Triton Archive breach — they want your help tracing the intrusion.',
      choices: [
        { label: 'Assist the investigation', description: 'Espionage-flavored intel work, paid in trust and access.',
          consequence: { label: 'Assisted Investigation', moneyCost: 40_000_000, factionRep: { 'echo-remnants': 15 }, unlockRareTechId: 'precursor_studies', reputationPoints: 400 } },
        { label: 'Stay out of it', description: 'Not your fight.', consequence: { label: 'Declined Involvement' } },
      ],
    },
  ],
};

const WANDERER1_ANOMALY: ChainDefinition = {
  id: 'wanderer1_anomaly',
  name: 'Wanderer-1 Data Anomaly',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.01,
  stages: [
    {
      id: 'w1_43', name: 'Wanderer-1 Data Anomaly', icon: '🛰️', kind: 'info', presentationHint: 'cinematic',
      description: "Re-analysis of Wanderer-1's 2147 Proxima telemetry turns up an unexplained anomaly in the return dataset.",
      resolve: ({ monthIndex }) => {
        const rng = worldRng('wanderer1-anomaly', monthIndex);
        return rng() < 0.65
          ? { label: 'Wanderer-1: Proxima Intel', reputationPoints: 300, researchSpeedMultiplier: 1.05, effectDurationMonths: 2 }
          : { label: 'Wanderer-1: Red Herring', reputationPoints: 50 };
      },
    },
  ],
};

const RING_FIRE_ANNIVERSARY: ChainDefinition = {
  id: 'ring_fire_anniversary',
  name: 'Ring Fire Anniversary Regulations',
  cadence: 'campaign',
  recurring: false,
  startProbabilityPerMonth: 0.01,
  eligibility: (state) => (state.unlockedLocations || []).includes('saturn_system'),
  stages: [
    {
      id: 'rf_44', name: 'Ring Fire Anniversary Review', icon: '🪐', kind: 'choice', presentationHint: 'cinematic',
      description: 'The Ring Fire anniversary triggers a mandatory Saturn-operations safety review — 1,800 dead in 2137 is not ancient history out here.',
      choices: [
        { label: 'Fund retrofit', description: 'Real safety investment, real cost.',
          consequence: { label: 'Safety Retrofit Funded', moneyCost: 130_000_000, hazardMitigationBonus: { amount: 0.08, durationMonths: 6 } } },
        { label: 'Standing pat', description: 'Skip the retrofit. The industry notices.',
          consequence: { label: 'Deferred Retrofit', reputationPoints: -100 } },
      ],
    },
  ],
};

// 4X Wave W13 (Corporate Doctrine & Board Politics): the "existing
// event/choice channel" §1.7 asks low constituency approval to route
// through. Recurring (cooldown 6 months — a bloc can rise up again after
// things settle) rather than one-shot like most campaign chains, since
// board politics is an ongoing pressure, not a single arc.
const BOARD_POLITICS_DEMAND: ChainDefinition = {
  id: 'board_politics_demand',
  name: 'Constituency Demands',
  cadence: 'campaign',
  recurring: true,
  cooldownMonthsAfterCompletion: 6,
  startProbabilityPerMonth: 0.15,
  eligibility: (state) => getConstituencyApprovals(state).some(a => a.approval < 35),
  stages: [
    {
      id: 'bp_45', name: 'Constituency Demands', icon: '📢', kind: 'choice',
      description: 'Approval has fallen sharply within one of your workforce constituencies. Their representatives are asking for a hearing.',
      choices: [
        { label: 'Grant concessions', description: 'Fund a relief package — wage top-ups, safety spend, whatever it takes.',
          consequence: { label: 'Concessions Granted', moneyCost: 50_000_000, moraleDelta: 0.05 } },
        { label: 'Hold the line', description: 'No concessions. The board backs cost discipline — the workforce notices.',
          consequence: { label: 'Held the Line', moraleDelta: -0.05, costMultiplier: 1.02, effectDurationMonths: 2 } },
      ],
    },
  ],
};

export const CHAIN_DEFINITIONS: ChainDefinition[] = [
  SPACE_WEATHER_LADDER,
  EUROPA_BIOSIGNATURE_ARC,
  CONTAMINATION_PROTOCOLS,
  ISO_FLYBY,
  ACCORD_COUNCIL,
  SUPERCONDUCTOR_CRISIS,
  INDUSTRY_SHOCKS,
  CREW_HEALTH_CRISIS,
  GREAT_SILENCE_RECURRENCE,
  TRITON_ARCHIVE_FOLLOWUP,
  WANDERER1_ANOMALY,
  RING_FIRE_ANNIVERSARY,
  BOARD_POLITICS_DEMAND,
];

export const CHAIN_MAP = new Map(CHAIN_DEFINITIONS.map(c => [c.id, c]));

/** Total authored event count — 44 per docs/4X_BASELINE_2026-08.md Part 2c
 *  (Wave W4's original deliverable), +1 from Wave W13's board_politics_demand
 *  chain (docs/4X_BASELINE_2026-08.md §1.7's "existing event/choice channel"
 *  for low constituency approval). */
export const TOTAL_NARRATIVE_EVENT_COUNT = CHAIN_DEFINITIONS.reduce((sum, c) => sum + c.stages.length, 0);

/** 4X Wave W5: does this chain stage carry the cinematic presentation hint?
 *  Pure lookup against static content — used by the page's cinematic-queue
 *  watcher to decide whether a newly-arrived pendingChoice or eventLog entry
 *  should enqueue a full-screen CinematicOverlay moment. */
export function isCinematicChainStage(chainId: string, stageIndex: number): boolean {
  const def = CHAIN_MAP.get(chainId);
  return def?.stages[stageIndex]?.presentationHint === 'cinematic';
}

/** Lookup table from an info-stage's logged event title (`${icon} ${name}`,
 *  the exact format advanceNarrativeChains uses in narrative-events.ts) to
 *  its chain context — lets the page's eventLog-diff watcher recognize a
 *  cinematic info-stage without re-deriving the title format itself. Only
 *  'info'-kind cinematic stages are included; 'choice'-kind ones surface via
 *  the pendingChoice watcher instead (they never reach eventLog until the
 *  player has already resolved them). */
export const CINEMATIC_INFO_STAGE_TITLES: Map<string, { chainId: string; chainName: string; stageIndex: number; icon: string; name: string; description: string }> = (() => {
  const map = new Map<string, { chainId: string; chainName: string; stageIndex: number; icon: string; name: string; description: string }>();
  for (const def of CHAIN_DEFINITIONS) {
    def.stages.forEach((stage, stageIndex) => {
      if (stage.presentationHint !== 'cinematic' || stage.kind !== 'info') return;
      map.set(`${stage.icon} ${stage.name}`, {
        chainId: def.id, chainName: def.name, stageIndex,
        icon: stage.icon, name: stage.name, description: stage.description,
      });
    });
  }
  return map;
})();

// ─── Progress helpers ────────────────────────────────────────────────────

function getProgress(state: GameState, chainId: string): ChainProgressState | undefined {
  return (state.narrativeChains || []).find(p => p.chainId === chainId);
}

function upsertProgress(chains: ChainProgressState[], progress: ChainProgressState): ChainProgressState[] {
  const idx = chains.findIndex(p => p.chainId === progress.chainId);
  if (idx < 0) return [...chains, progress];
  const next = [...chains];
  next[idx] = progress;
  return next;
}

function buildPendingChoice(def: ChainDefinition, progress: ChainProgressState, stage: ChainStage): PendingChainChoiceUI {
  return {
    eventId: `${def.id}:${stage.id}`,
    eventName: stage.name,
    eventIcon: stage.icon,
    eventDescription: stage.description,
    choices: (stage.choices || []).map(c => ({
      label: c.label,
      description: c.description,
      consequencePreview: c.resolve ? undefined : consequencePreview(c.consequence || { label: c.label }),
    })),
    chainId: def.id,
    chainName: def.name,
    stageIndex: progress.stageIndex,
    totalStages: def.stages.length,
  };
}

/** Should a quarterly chain's next stage fire this month? Exactly once per
 *  quarter, at the quarter boundary — the senate loop (SESSION_DESIGN.md). */
function isQuarterBoundary(monthIndex: number): boolean {
  return monthIndex % 3 === 0;
}

/**
 * Advance all narrative chains by one game-month. Deterministic (world-month
 * seeded rolls only). Applies 'info' stage consequences immediately; for
 * 'choice' stages, sets a pendingChoice ONLY if `allowNewChoice` is true
 * (the caller — game-engine's processTick — passes false when random-events
 * already claimed the single pendingChoice slot this tick).
 */
export function advanceNarrativeChains(
  state: GameState,
  monthIndex: number,
  now: number,
  allowNewChoice: boolean,
): { state: GameState; events: GameEvent[]; pendingChoice: PendingChainChoiceUI | null } {
  let out = state;
  const events: GameEvent[] = [];
  let chains = [...(out.narrativeChains || [])];
  let pendingChoice: PendingChainChoiceUI | null = null;
  let choiceSlotTaken = !allowNewChoice;

  for (const def of CHAIN_DEFINITIONS) {
    if (def.eligibility && !def.eligibility(out)) continue;
    let progress = getProgress(out, def.id);

    // ── Start a dormant chain ──────────────────────────────────────────
    if (!progress || (progress.status === 'completed' && def.recurring)) {
      if (progress?.status === 'completed' && def.recurring) {
        const cooldown = def.cooldownMonthsAfterCompletion ?? 0;
        if (monthIndex - (progress.completedAtMonth ?? 0) < cooldown) continue;
      }
      let shouldStart = false;
      if (def.cadence === 'quarterly') {
        shouldStart = isQuarterBoundary(monthIndex);
      } else {
        const rng = worldRng(`start:${def.id}`, monthIndex);
        shouldStart = rng() < (def.startProbabilityPerMonth ?? 0.02);
      }
      if (!shouldStart) continue;
      progress = { chainId: def.id, stageIndex: 0, status: 'active', startedAtMonth: monthIndex, lastAdvancedMonth: monthIndex, flags: {} };
      chains = upsertProgress(chains, progress);
    }

    if (progress.status !== 'active') continue;
    const stage = def.stages[progress.stageIndex];
    if (!stage) continue;

    // ── Awaiting a choice already presented — nothing to do until resolved ──
    if (progress.awaitingChoice) continue;

    // ── Gate automatic advancement (tactical escalation roll / campaign gap /
    //    quarterly boundary). The FIRST stage of a freshly-started chain
    //    always resolves the same month it starts (mirrors hazards.ts: this
    //    month's storm is this month's storm). ──────────────────────────
    const justStarted = progress.stageIndex === 0 && progress.startedAtMonth === monthIndex && progress.lastAdvancedMonth === monthIndex;
    let readyToResolve = justStarted;
    if (!readyToResolve) {
      if (def.cadence === 'quarterly') {
        readyToResolve = isQuarterBoundary(monthIndex);
      } else {
        const gap = def.minStageGapMonths ?? 1;
        if (monthIndex - progress.lastAdvancedMonth < gap) {
          readyToResolve = false;
        } else if (def.cadence === 'tactical') {
          // Seeded on the CURRENT month (not lastAdvancedMonth) so a failed
          // roll doesn't recompute the identical value forever — each
          // eligible month is a fresh, still-deterministic attempt.
          const rng = progressRng(def.id, `advance:${progress.stageIndex}`, monthIndex);
          readyToResolve = rng() < (def.advanceProbability ?? 0.6);
        } else {
          const rng = progressRng(def.id, `advance:${progress.stageIndex}`, monthIndex);
          readyToResolve = rng() < 0.5;
        }
      }
    }
    if (!readyToResolve) continue;

    if (stage.kind === 'choice') {
      if (choiceSlotTaken) continue; // retry next month
      pendingChoice = buildPendingChoice(def, progress, stage);
      progress = { ...progress, awaitingChoice: true, lastAdvancedMonth: monthIndex };
      chains = upsertProgress(chains, progress);
      choiceSlotTaken = true;
      continue;
    }

    // 'info' stage — resolve (static or dynamic) and apply immediately.
    const consequence = stage.resolve ? stage.resolve({ state: out, progress, monthIndex }) : (stage.consequence || { label: stage.name });
    out = applyChainConsequence(out, consequence, monthIndex);
    events.push({
      id: generateId(), date: out.gameDate, type: 'random_event',
      title: `${stage.icon} ${stage.name}`,
      description: consequence.label !== stage.name ? `${stage.description} — ${consequence.label}` : stage.description,
    });

    const nextFlags = { ...(progress.flags || {}), ...(consequence.setFlags || {}) };
    const nextStageIndex = progress.stageIndex + 1;
    if (nextStageIndex >= def.stages.length) {
      progress = { ...progress, flags: nextFlags, status: 'completed', completedAtMonth: monthIndex, lastAdvancedMonth: monthIndex };
    } else {
      progress = { ...progress, flags: nextFlags, stageIndex: nextStageIndex, lastAdvancedMonth: monthIndex };
    }
    chains = upsertProgress(chains, progress);
  }

  out = { ...out, narrativeChains: chains };
  return { state: out, events, pendingChoice };
}

/**
 * Resolve a player's choice for the given chain+stage. Called from the
 * space-tycoon page's EventChoiceModal onChoose handler when
 * state.pendingChoice.chainId is set.
 */
export function resolveChainChoice(
  state: GameState,
  chainId: string,
  choiceIndex: number,
  monthIndex: number,
): GameState {
  const def = CHAIN_MAP.get(chainId);
  if (!def) return state;
  let progress = getProgress(state, chainId);
  if (!progress) return state;
  // Authoritative stage comes from progress, not caller input — the stage
  // cannot have advanced since the modal was presented (awaitingChoice
  // blocks further scheduling), so this is always the stage that was shown.
  const stage = def.stages[progress.stageIndex];
  if (!stage || stage.kind !== 'choice') return state;
  const choice = stage.choices?.[choiceIndex];
  if (!choice) return state;

  const consequence = choice.resolve ? choice.resolve({ state, progress, monthIndex }) : (choice.consequence || { label: choice.label });
  let out = applyChainConsequence(state, consequence, monthIndex);

  const nextFlags = { ...(progress.flags || {}), ...(consequence.setFlags || {}) };
  const nextStageIndex = progress.stageIndex + 1;
  progress = nextStageIndex >= def.stages.length
    ? { ...progress, flags: nextFlags, status: 'completed', completedAtMonth: monthIndex, lastAdvancedMonth: monthIndex, awaitingChoice: false }
    : { ...progress, flags: nextFlags, stageIndex: nextStageIndex, lastAdvancedMonth: monthIndex, awaitingChoice: false };

  const chains = upsertProgress([...(out.narrativeChains || [])], progress);
  out = {
    ...out,
    narrativeChains: chains,
    eventLog: [{
      id: generateId(), date: out.gameDate, type: 'random_event' as const,
      title: `${stage.icon} ${stage.name}: ${choice.label}`,
      description: consequence.label,
    }, ...(out.eventLog || [])].slice(0, 50),
  };
  return out;
}
