// ─── Space Tycoon: First-Hour Onboarding Chain (FTUE v2) ────────────────────
// Simulated-newcomer audit (2026-08-16): the original 5-step TutorialOverlay
// predated the archetype system (every archetype starts with 2-3 completed
// buildings and running services, so "build your first launch pad" auto-
// completed instantly on mount) and the 40-system depth waves (contracts,
// markets, consumption, the shared daily contract cap — none taught). This
// module replaces the overlay's inline step list with a pure, state-detected
// objective chain, following the returning-commander.ts house pattern:
// every exported function is a pure function of GameState (+ optional `now`),
// objectives are LIVE-EVALUATED from state (never stored as mutable
// checklists), and rewards are granted exactly once at the moment the chain
// advances past a detected step.
//
// Design contract (CLAUDE.md "New-player on-ramp" + founder directive):
//   build → income (power/supply taught in the same beat) → research →
//   contract (teaching the shared daily cap) → market trade → next orbit →
//   the road to Luna.
// Each step carries what + why + where; rewards are small, honest, one-time
// grants (docs/BALANCE.md: transparent, never rivaling earned income — the
// whole chain pays less than the single $60M starter contract).
//
// Persistence: reuses the existing GameState.tutorialStep field (V9). The
// old sentinel "6 = done" becomes chain-length-aware via ONBOARDING_DONE_STEP;
// save-load.ts's V41 migration bumps any pre-chain save with tutorialStep >= 6
// to the new done sentinel and stamps onboardingChainVersion = 2 so the bump
// can never re-run against a save legitimately mid-chain.

import type { GameState, GameTab } from './types';
import { generateId } from './formulas';

// ─── Chain version ──────────────────────────────────────────────────────────

/** Stamped on GameState.onboardingChainVersion. Saves without this stamp get
 *  the V41 sentinel migration in save-load.ts exactly once. */
export const ONBOARDING_CHAIN_VERSION = 2;

// ─── Step definitions ───────────────────────────────────────────────────────

export interface OnboardingStepDef {
  /** 1-based position — persisted directly in GameState.tutorialStep. */
  step: number;
  id: string;
  title: string;
  /** WHAT to do — one imperative sentence. */
  what: string;
  /** WHY it matters economically — one honest sentence. */
  why: string;
  /** WHERE to do it — plain-language pointer matching targetTab. */
  where: string;
  targetTab: GameTab;
  icon: string;
  /** One-time grant credited when the step completes via detection. 0 = the
   *  step is its own reward (e.g. the contract itself pays). */
  rewardMoney: number;
  /** Steps with no meaningful state detection (orientation / horizon) allow
   *  the Next button; detection-backed steps advance only when the state
   *  actually shows the action happened. */
  manualAdvance?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    step: 1,
    id: 'command_deck',
    title: 'Welcome to the Command Deck',
    what: 'Look over your Dashboard: cash on hand, net income per month, and your starting facilities.',
    why: 'Your archetype already runs revenue services — you start as a working company, not an empty lot. Net income is the number that decides everything.',
    where: 'Dashboard tab (you are here). The top bar always shows cash and net income.',
    targetTab: 'dashboard',
    icon: '\u{1F6F0}️',
    rewardMoney: 0,
    manualAdvance: true,
  },
  {
    step: 2,
    id: 'first_build',
    title: 'Break Ground on Your First Build',
    what: 'Order a new facility of your own. The Ground Station ($30M, ~3 min) is the cheapest; LEO Telecom Satellites ($15M) have the best margin per dollar.',
    why: 'Every completed facility adds a monthly revenue service. You have 2 construction slots — keeping both busy is the core early loop.',
    where: 'Build tab → pick a building on Earth Surface or LEO → Build.',
    targetTab: 'build',
    icon: '\u{1F3D7}️',
    rewardMoney: 8_000_000,
  },
  {
    step: 3,
    id: 'first_income',
    title: 'Bring the Revenue Online',
    what: 'Wait for your build to finish (watch the countdown) — its service activates automatically and starts paying monthly.',
    why: 'Services are your income backbone. On Earth, power is free from the grid; off-world sites later need solar or reactors, and after your Protected Frontier ends, facilities also consume real monthly inputs (fuel, spares).',
    where: 'Dashboard shows the countdown; the Services tab lists every income stream.',
    targetTab: 'services',
    icon: '\u{1F4B0}',
    rewardMoney: 0,
  },
  {
    step: 4,
    id: 'first_research',
    title: 'Start Your First Research',
    what: 'Start any research you can afford — the Suggested Research tiles at the top are picked for your current cash and progress.',
    why: 'Research unlocks new buildings, locations, and permanent bonuses. Something should be researching at all times — idle research is lost compounding.',
    where: 'Research tab → Suggested Research → pick a READY tile.',
    targetTab: 'research',
    icon: '\u{1F52C}',
    rewardMoney: 6_000_000,
  },
  {
    step: 5,
    id: 'first_contract',
    title: 'Accept a Contract',
    what: 'Accept a contract whose requirements you are close to meeting — progress bars show exactly how close you are.',
    why: 'Contracts pay large lump sums (the starter certification pays $60M). Note: contract payouts share one daily budget — 4 completions per rolling 24h to start — so they supplement services, never replace them.',
    where: 'Contracts tab → Standard Contracts → Accept.',
    targetTab: 'contracts',
    icon: '\u{1F4DC}',
    rewardMoney: 0,
  },
  {
    step: 6,
    id: 'first_trade',
    title: 'Make Your First Market Trade',
    what: 'Buy or sell any resource on the market — even a small lot of iron or aluminum.',
    why: 'Prices are shared with every player and move with real supply and demand. Buildings need resource inputs and mines produce sellable output — the market is where both sides meet (a 2% broker fee applies).',
    where: 'Markets tab → Spot & Orders → Buy or Sell.',
    targetTab: 'market',
    icon: '\u{1F4C8}',
    rewardMoney: 4_000_000,
  },
  {
    step: 7,
    id: 'next_orbit',
    title: 'Claim Your Next Orbit',
    what: 'Unlock GEO orbit ($50M, no research needed) from the Map, then consider a GEO Telecom Satellite ($150M, $5.5M/mo net).',
    why: 'Expansion is how income scales — each location has unique buildings and finite premium slots. GEO is the first affordable step off your starting turf.',
    where: 'Map tab → select GEO → Unlock.',
    targetTab: 'map',
    icon: '\u{1F30D}',
    rewardMoney: 12_000_000,
  },
  {
    step: 8,
    id: 'road_to_luna',
    title: 'The Road to Luna',
    what: 'Long-term goal: bank toward Lunar Orbit ($1B) — research like Reusable Boosters cuts the path. This step completes whenever you get there; play on freely.',
    why: 'The Moon opens mining, manufacturing, and a second economy. Your Protected Frontier shields you from rivals and piracy while you build toward it.',
    where: 'Map tab shows every location and its unlock cost. Good hunting, Commander.',
    targetTab: 'map',
    icon: '\u{1F680}',
    rewardMoney: 20_000_000,
    manualAdvance: true,
  },
];

export const ONBOARDING_STEP_MAP = new Map(ONBOARDING_STEPS.map(s => [s.step, s]));

/** tutorialStep value meaning "chain finished" (guide dismissed/complete). */
export const ONBOARDING_DONE_STEP = ONBOARDING_STEPS.length + 1;

// ─── Detection (pure, live-evaluated — returning-commander.ts pattern) ──────

/** Archetype-granted starting buildings are stamped with an `arch-` instanceId
 *  prefix (archetypes.ts applyArchetype) — the chain only counts what the
 *  PLAYER ordered, so pre-seeded infrastructure can never auto-complete the
 *  build/income steps the way it broke the old 5-step overlay. */
export function hasPlayerBuiltBuilding(state: GameState): boolean {
  return (state.buildings || []).some(b => !b.instanceId.startsWith('arch-'));
}

export function hasPlayerBuiltCompleteBuilding(state: GameState): boolean {
  return (state.buildings || []).some(b => b.isComplete && !b.instanceId.startsWith('arch-'));
}

/** Is this step's objective satisfied by the current state? */
export function isOnboardingStepComplete(state: GameState, step: number): boolean {
  switch (ONBOARDING_STEP_MAP.get(step)?.id) {
    case 'command_deck':
      return false; // orientation — manual Next only
    case 'first_build':
      return hasPlayerBuiltBuilding(state);
    case 'first_income':
      return hasPlayerBuiltCompleteBuilding(state);
    case 'first_research':
      return state.activeResearch !== null || (state.completedResearch || []).length > 0;
    case 'first_contract':
      return (state.activeContracts || []).length > 0 || (state.completedContracts || []).length > 0;
    case 'first_trade':
      return state.hasTradedOnMarket === true;
    case 'next_orbit':
      return (state.unlockedLocations || []).includes('geo');
    case 'road_to_luna':
      return (state.unlockedLocations || []).includes('lunar_orbit')
        || (state.unlockedLocations || []).includes('lunar_surface');
    default:
      return false;
  }
}

// ─── Chain state readers ────────────────────────────────────────────────────

export function isOnboardingActive(state: GameState): boolean {
  const step = state.tutorialStep ?? ONBOARDING_DONE_STEP;
  return !state.tutorialDismissed && step >= 1 && step < ONBOARDING_DONE_STEP;
}

export function isOnboardingComplete(state: GameState): boolean {
  return (state.tutorialStep ?? ONBOARDING_DONE_STEP) >= ONBOARDING_DONE_STEP;
}

export function getCurrentOnboardingStep(state: GameState): OnboardingStepDef | null {
  if (!isOnboardingActive(state)) return null;
  return ONBOARDING_STEP_MAP.get(state.tutorialStep ?? 0) ?? null;
}

/** The very first minutes (orientation → first income). Used to hold back
 *  interruptions like the daily-bonus modal until the player has context. */
export function isEarlyOnboarding(state: GameState): boolean {
  return isOnboardingActive(state) && (state.tutorialStep ?? 0) <= 3;
}

/** Newcomer HUD mode (CLAUDE.md: "information density that scales with the
 *  player's expertise"): while the chain is active and the corporation is
 *  still Tier-1, the Dashboard hides advanced live-service surfaces (story
 *  chapters, mission calendar, world races, mini-activities, archive ticker)
 *  so minute one shows only the core loop. Skipping the tutorial opts out —
 *  a player who dismisses the guide gets the full console immediately. */
export function isNewcomerHud(state: GameState): boolean {
  return isOnboardingActive(state) && (state.corporationTier || 1) <= 1;
}

// ─── Advancement (pure mutators — page.tsx handlers call these) ─────────────

export interface AdvanceOptions {
  /** True when the player clicked Next/Finish; only steps flagged
   *  manualAdvance may advance without detection, and manual advancement
   *  never grants the step reward unless detection also passed. */
  manual?: boolean;
}

/** Advance one step if allowed. Grants the step's one-time reward exactly at
 *  this boundary (detection-backed only), logs it, and moves tutorialStep
 *  forward. Returns the state unchanged when advancement isn't allowed. */
export function advanceOnboarding(state: GameState, opts: AdvanceOptions = {}): GameState {
  const def = getCurrentOnboardingStep(state);
  if (!def) return state;

  const detected = isOnboardingStepComplete(state, def.step);
  if (!detected && !(def.manualAdvance && opts.manual)) return state;

  const reward = detected ? def.rewardMoney : 0;
  const next: GameState = {
    ...state,
    tutorialStep: def.step + 1,
  };
  if (reward > 0) {
    next.money = state.money + reward;
    next.totalEarned = state.totalEarned + reward;
    next.eventLog = [{
      id: generateId(),
      date: state.gameDate,
      type: 'milestone' as const,
      title: `Commissioning grant: +$${(reward / 1_000_000).toFixed(0)}M`,
      description: `"${def.title}" complete. One-time program grant from the founding board.`,
    }, ...(state.eventLog || [])].slice(0, 50);
  }
  return next;
}

/** Skip the rest of the chain (explicit opt-out — forfeits remaining grants). */
export function skipOnboarding(state: GameState): GameState {
  return { ...state, tutorialStep: ONBOARDING_DONE_STEP, tutorialDismissed: true };
}

/** Mark the chain finished (manual Finish on the horizon step). */
export function completeOnboarding(state: GameState): GameState {
  return { ...state, tutorialStep: ONBOARDING_DONE_STEP };
}

/** Restart the guide from step 1 (the "? Tutorial" button). */
export function restartOnboarding(state: GameState): GameState {
  return { ...state, tutorialStep: 1, tutorialDismissed: false };
}
