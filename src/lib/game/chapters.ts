// ─── Space Tycoon: Story Chapters (Live-Service Wave LS8) ───────────────────
// docs/LIVE_SERVICE_2026-08.md §LS8: "calendar-dated episodic narrative arcs
// with finales." Built on the W4 chain engine (narrative-events.ts) — the
// NEW part is CALENDAR-DATED, WORLD-SYNCHRONIZED staging instead of
// per-player month-index triggering, so the whole server experiences
// Chapter N during the identical real-world window and talks about it
// together (forums/GameChat synergy per the spec).
//
// ─── Calendar model ─────────────────────────────────────────────────────
// A pure function of wall-clock time — no new scheduling state, no drift
// risk, same discipline as world-calendar.ts / appointment-events.ts. Every
// player, the server, and every test computes the identical chapter/act/
// finale state from the same `nowMs`.
//
//   week index  = floor(nowMs / WEEK_MS)               (epoch-anchored;
//                                                        matches appointment-
//                                                        events.ts's own
//                                                        getAppointmentWeekIndex
//                                                        convention)
//   cycle index = floor(weekIndex / CHAPTER_CYCLE_WEEKS)
//   chapter     = CHAPTER_DEFINITIONS[cycleIndex % CHAPTER_DEFINITIONS.length]
//                 (cycles through the authored catalog — 3 chapters today,
//                 so a full cycle repeats every 3 cycle-indices / 18 weeks;
//                 more authored chapters are the natural follow-up before a
//                 repeat becomes noticeable)
//
// A 6-week cycle: Act 1 reveals at week 0 of the cycle, Act 2 at week 1,
// Act 3 at week 2, Act 4 at week 3 — each reveal instant is the START of
// that week (00:00 UTC on the Thursday every epoch-week boundary lands on,
// since Jan 1 1970 00:00 UTC was a Thursday and WEEK_MS-aligned boundaries
// preserve that weekday forever). The FINALE is a fixed real-world weekend
// window inside week 4 (Saturday 18:00 UTC -> Sunday 23:00 UTC) — the LS3
// appointment-event pattern (fixed-UTC window, published ahead of time via
// world-calendar.ts). Week 5 is the epilogue window (the finale's outcome
// bonus/malus is "live" world lore for a week) before the next chapter's
// Act 1 opens at week 6 (= week 0 of the next cycle).
//
// ─── Per-player progress vs. world-shared staging ──────────────────────
// Act reveal TIMING is world-shared (everyone's Act 2 opens at the same
// instant), but resolving an act — including any choice inside it — stays
// personal, exactly like every other narrative-events.ts chain: "per-player
// choices within each act stay personal (no PvP interference)" (spec). A
// player who logs in after several acts have already opened gets a
// COMPRESSED CATCH-UP RECAP (one summary event, choice-stages resolved via
// their authored `recapConsequence` — always the cautious/neutral option,
// never silently picking a side FOR the player) instead of replaying each
// beat one at a time out of sync with the calendar — this is the identical
// mechanic for a brand-new player joining mid-chapter and a returning/
// lapsed veteran catching up mid-chapter (the spec's "late joiners" covers
// both). See advanceStoryChapters's `dueCount > 1` branch.
//
// ─── Aggregate participation ─────────────────────────────────────────────
// The finale's economic choice is "answer the call" (pay a modest personal
// cost, contribute to the world's tally) vs. "sit this one out" (free, no
// contribution) — applied client-side through the SAME applyChainConsequence
// path every other chain choice already uses (no new escrow surface; LS5's
// server ledger stays reserved for actual money-moving stakes). The
// PARTICIPATION COUNT that weights the finale's success roll is a real
// server counter (GameProfile-backed ChapterContribution rows, one per
// (cycleIndex, profileId) — see prisma/schema.prisma and
// /api/space-tycoon/chapters/route.ts), read by every client once the
// finale window closes so the "world-shared resolution roll weighted by
// aggregate participation" (spec) produces the identical outcome for
// everyone who queries it — see computeFinaleOutcome, a pure function of
// (chapterId, cycleIndex, participationCount).

import type {
  GameState, GameEvent, ChapterProgressState, CompletedChapterRecord, StoryChaptersState,
} from './types';
import { generateId, mulberry32, hashStringToSeed } from './formulas';
import type { ChainConsequence } from './narrative-events';
import { applyChainConsequence, consequencePreview } from './narrative-events';
import { PLANET_ASSETS, BG_ASSETS } from './assets';

// ─── Calendar constants ──────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** One full chapter cycle: 4 weekly act reveals + a finale weekend + a
 *  1-week epilogue, then the next chapter's Act 1 opens. ~2-3 chapter
 *  cycles complete every real-world quarter (13 weeks / 6 = ~2.2), matching
 *  the spec's "2-3 times per quarter" cadence. */
export const CHAPTER_CYCLE_WEEKS = 6;
/** Week-in-cycle each act reveals at (index-aligned with ChapterDefinition.acts). */
export const CHAPTER_ACT_WEEK_OFFSETS = [0, 1, 2, 3] as const;
export const CHAPTER_FINALE_WEEK_OFFSET = 4;
export const CHAPTER_EPILOGUE_WEEK_OFFSET = 5;

// ─── Schema ───────────────────────────────────────────────────────────────

export type ChapterActKind = 'info' | 'choice';

export interface ChapterActChoice {
  label: string;
  description: string;
  consequence: ChainConsequence;
}

export interface ChapterActResolveContext {
  state: GameState;
  /** This save's chapter-progress flags at the moment this act resolves —
   *  lets a later act's outcome vary on an earlier act's choice, same
   *  pattern as narrative-events.ts's EUROPA_BIOSIGNATURE_ARC. */
  flags: Record<string, boolean>;
  cycleIndex: number;
}

export interface ChapterAct {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: ChapterActKind;
  /** Static consequence for 'info' acts. */
  consequence?: ChainConsequence;
  /** Dynamic consequence for 'info' acts (flag-branched outcomes). */
  resolve?: (ctx: ChapterActResolveContext) => ChainConsequence;
  choices?: ChapterActChoice[];
  /** Applied instead of a real choice when this act is caught up in a
   *  compressed catch-up recap (see file header) — the deliberately
   *  cautious/neutral outcome, authored explicitly so recap resolutions are
   *  honest rather than silently picking a side for the player. Required
   *  whenever kind === 'choice'. */
  recapConsequence?: ChainConsequence;
  /** W5-precedent presentation hint — chain-head-equivalent stages (each
   *  chapter's Act 1) are flagged so the page's cinematic-queue watcher
   *  opens a full-screen CinematicOverlay moment instead of a toast. */
  presentationHint?: 'cinematic';
}

export interface ChapterFinale {
  id: string;
  name: string;
  icon: string;
  description: string;
  participateLabel: string;
  participateDescription: string;
  /** Personal cost applied immediately when the player answers the call —
   *  the meaningful economic decision (CLAUDE.md: never cosmetic-only). */
  participateCost: ChainConsequence;
  passDescription: string;
  /** World-shared epilogue consequence, applied once for every player once
   *  the outcome resolves (regardless of whether THIS player personally
   *  participated) — the community-scale stakes the spec calls for. */
  epilogueSuccess: ChainConsequence;
  epilogueFailure: ChainConsequence;
  successHeadline: string;
  failureHeadline: string;
}

export interface ChapterDefinition {
  id: string;
  name: string;
  icon: string;
  /** Flavor only — which LORE.md faction drives this arc. */
  factionId?: string;
  tagline: string;
  synopsis: string;
  acts: ChapterAct[];
  finale: ChapterFinale;
}

// ─── Content: 3 chapters, faction-driven, lore-consistent ──────────────────
// docs/LORE.md grounding cited inline per chapter. Each chapter: 4 acts (3
// 'info' scene-setters — one flag-branched by an earlier choice — and 1
// 'choice' act with a real economic trade-off) + a finale with a
// personal-cost participation choice and a world-shared,
// participation-weighted epilogue.

const THE_SECOND_SILENCE: ChapterDefinition = {
  id: 'the_second_silence',
  name: 'The Second Silence',
  icon: '🐝',
  factionId: 'hive-collective',
  tagline: 'Every Hive Collective interface station just went dark. Again.',
  synopsis: 'In 2103 every Hive Collective interface station went dormant for 11 months, then resumed as if nothing happened — no explanation was ever given (LORE.md, The Great Silence). Forty-seven years later, it just happened again, and this time the Accord wants a first-contact protocol ready before the stations wake up.',
  acts: [
    {
      id: 'silence_dormant_stations', name: 'Dormant Stations', icon: '🐝', kind: 'info',
      presentationHint: 'cinematic',
      description: 'Every Hive Collective interface station across the Kuiper Belt goes dormant within the same eleven-minute window — the exact signature of 2103\'s Great Silence, compressed into a fraction of the time. Xenogenic-biomatter markets freeze instantly; nobody knows if this is an eleven-month repeat or something new.',
      consequence: { label: 'Xenogenic Markets Freeze', costMultiplier: 1.03, effectDurationMonths: 2, reputationPoints: 100 },
    },
    {
      id: 'silence_theory', name: 'Two Theories', icon: '🗣️', kind: 'choice',
      description: 'Echo Remnants scholars at the Triton Archive claim the dormancy pattern matches precursor mathematics they\'ve been decoding for years. The Dominion dismisses it as biological hibernation and wants everyone to stand down and wait it out. Your corporation has to pick a side to fund.',
      choices: [
        {
          label: 'Fund the Echo Remnants survey', description: 'Back Archivist Starforge\'s listening-post survey — expensive, speculative, and it puts you in the precautionary camp.',
          consequence: { label: 'Echo Remnants Survey Funded', moneyCost: 70_000_000, factionRep: { 'echo-remnants': 12 }, setFlags: { echoTheoryFunded: true } },
        },
        {
          label: "Back the Dominion's dismissal", description: 'Side with Kepler Station\'s "it\'s just hibernation" line — cheaper, keeps trade lanes open, and the Dominion notices who stood with them.',
          consequence: { label: 'Dominion Dismissal Backed', revenueMultiplier: 1.03, effectDurationMonths: 2, factionRep: { 'the-dominion': 10 }, setFlags: { dominionDismissalBacked: true } },
        },
      ],
      recapConsequence: { label: 'The Debate Passed You By', setFlags: { missedSilenceTheory: true } },
    },
    {
      id: 'silence_listening_campaign', name: 'The Listening Campaign', icon: '📡', kind: 'info',
      description: 'A joint industry listening campaign forms around the dormant stations, pooling deep-space antenna time across dozens of corporations regardless of which theory they backed.',
      resolve: ({ flags }) => {
        if (flags.echoTheoryFunded) {
          return { label: 'Precursor-Pattern Analysis', researchSpeedMultiplier: 1.05, effectDurationMonths: 2, reputationPoints: 200 };
        }
        if (flags.dominionDismissalBacked) {
          return { label: 'Standard Monitoring Protocol', revenueMultiplier: 1.02, effectDurationMonths: 2 };
        }
        return { label: 'Listening Campaign Joined', reputationPoints: 80 };
      },
    },
    {
      id: 'silence_signal_return', name: 'Signal Return', icon: '📶', kind: 'info',
      description: 'Stations begin flickering back online — not simultaneously like 2103, but in a rippling pattern nobody predicted. The Accord convenes an emergency session: should humanity attempt a direct-contact broadcast into the reactivation window?',
      consequence: { label: 'Reactivation Ripple', hazardMitigationBonus: { amount: 0.03, durationMonths: 2 }, reputationPoints: 150 },
    },
  ],
  finale: {
    id: 'silence_first_contact', name: 'First Contact Protocol', icon: '👽',
    description: 'The Accord has a broadcast window and needs corporate listening-array capacity to pull it off. Every corporation that commits an array adds real signal strength to the joint transmission — the more who answer, the better the odds the Collective responds to something coherent instead of noise.',
    participateLabel: 'Commit your listening array', participateDescription: 'Dedicate array time and crew to the joint broadcast — a real cost, and your name goes on the transmission log either way.',
    participateCost: { label: 'Array Committed to First Contact', moneyCost: 90_000_000 },
    passDescription: 'Keep your arrays on commercial contracts. No cost, no seat at the table if this works.',
    epilogueSuccess: { label: 'Hive Collective Responds', reputationPoints: 3000, factionRep: { 'hive-collective': 20 }, unlockRareTechId: 'hive_resonance_protocol', miningBonus: { locationId: 'outer_system', resourceId: 'helium3', bonusPct: 10, durationMonths: 4 } },
    epilogueFailure: { label: 'Signal Lost in Noise', reputationPoints: 300, costMultiplier: 1.02, effectDurationMonths: 1 },
    successHeadline: 'The Hive Collective answered — a genuinely new trade pattern opened at the reactivated stations.',
    failureHeadline: 'The broadcast window closed with no response. The stations resumed their old silence.',
  },
};

const THE_PALLAS_LEDGER: ChapterDefinition = {
  id: 'the_pallas_ledger',
  name: 'The Pallas Ledger',
  icon: '⚖️',
  factionId: 'the-syndicate',
  tagline: 'Someone has been running the belt markets from Pallas-4. The evidence just surfaced.',
  synopsis: 'Pallas-4 Free Port is the Syndicate\'s nominal capital, run by a decentralized network answering to no single boss (LORE.md). A coordinated price-manipulation ring routed through shell manifests at Pallas-4 just got exposed — and every corporation with belt exposure has to decide whether to profit from it, report it, or stay out of it entirely.',
  acts: [
    {
      id: 'pallas_anomalous_spreads', name: 'Anomalous Spreads', icon: '📊', kind: 'info',
      presentationHint: 'cinematic',
      description: 'Market analysts flag statistically impossible bid-ask spreads across titanium and helium-3 exchanges, all tracing back to shell entities registered through Pallas-4 Free Port. This isn\'t noise — it\'s a pattern, and it\'s been running for months.',
      consequence: { label: 'Manipulation Pattern Identified', reputationPoints: 100, researchSpeedMultiplier: 1.03, effectDurationMonths: 1 },
    },
    {
      id: 'pallas_play_or_report', name: 'Play It or Report It', icon: '📁', kind: 'choice',
      description: 'Your trading desk has fully decoded the manipulation pattern. You could quietly trade alongside it for real profit, or hand the evidence to the Spacefaring Commerce Court and risk Syndicate attention.',
      choices: [
        {
          label: 'Ride the wave', description: 'Trade alongside the manipulation while it lasts — real money, and Pallas-4 notices you played along.',
          consequence: { label: 'Rode the Manipulation Wave', moneyReward: 130_000_000, factionRep: { 'the-syndicate': 10 }, reputationPoints: -150, setFlags: { rodeWave: true } },
        },
        {
          label: 'Report to the SCC', description: 'Hand the evidence to the Spacefaring Commerce Court — legal prep costs money, the Dominion backs you, and the Syndicate will remember.',
          consequence: { label: 'Reported to the SCC', moneyCost: 60_000_000, factionRep: { 'the-dominion': 10, 'the-syndicate': -14 }, reputationPoints: 400, setFlags: { reportedToSCC: true } },
        },
      ],
      recapConsequence: { label: 'Your Desk Stayed Neutral', setFlags: { missedPlayOrReport: true } },
    },
    {
      id: 'pallas_warning_or_thanks', name: "Pallas-4 Takes Notice", icon: '📨', kind: 'info',
      description: 'Word comes back through the usual channels — Pallas-4 has clocked your corporation\'s move.',
      resolve: ({ flags }) => {
        if (flags.reportedToSCC) {
          return { label: "Zahn Eclipse's Warning", costMultiplier: 1.02, effectDurationMonths: 2, reputationPoints: 100 };
        }
        if (flags.rodeWave) {
          return { label: "Magnate Zara's Thanks", revenueMultiplier: 1.03, effectDurationMonths: 2 };
        }
        return { label: 'No Word From Pallas-4', reputationPoints: 30 };
      },
    },
    {
      id: 'pallas_subpoena', name: 'The SCC Subpoena', icon: '📜', kind: 'info',
      description: 'Regardless of who reported what, the Spacefaring Commerce Court formally subpoenas Pallas-4\'s trading records — an industry-wide compliance moment as every belt-exposed corporation braces for the audit.',
      consequence: { label: 'Industry-Wide Subpoena', costMultiplier: 1.02, effectDurationMonths: 2, reputationPoints: 150 },
    },
  ],
  finale: {
    id: 'pallas_raid', name: 'The Pallas Raid', icon: '🚨',
    description: 'Dominion patrols plan a coordinated civil-enforcement action against Pallas-4\'s ledger servers to seize the evidence for good — framed as an escort/logistics operation to stay inside the Accord\'s no-weapons-beyond-cislunar rule. They need corporate fuel, escort contracts, and financial backing to pull it off.',
    participateLabel: 'Commit logistics support', participateDescription: 'Fund fuel, escort contracts, and financial backing for the raid — real money, and your name is on the manifest.',
    participateCost: { label: 'Logistics Support Committed', moneyCost: 100_000_000 },
    passDescription: 'Stay out of it entirely. No cost, no stake in the outcome.',
    epilogueSuccess: { label: 'Manipulation Ring Broken', reputationPoints: 2500, factionRep: { 'the-dominion': 15, 'the-syndicate': -10 }, unlockRareTechId: 'market_forensics_ai', costMultiplier: 0.98, effectDurationMonths: 3 },
    epilogueFailure: { label: 'The Ring Entrenches', reputationPoints: 200, costMultiplier: 1.02, effectDurationMonths: 2, factionRep: { 'the-syndicate': 6 } },
    successHeadline: 'The raid succeeded — Pallas-4\'s manipulation ring is broken and belt markets are measurably cleaner.',
    failureHeadline: 'The raid failed to secure the servers. The Syndicate\'s grip on Pallas-4 tightens.',
  },
};

const TRITON_ARCHIVE_SECOND_BREACH: ChapterDefinition = {
  id: 'triton_archive_second_breach',
  name: 'Triton Archive: Second Breach',
  icon: '🏛️',
  factionId: 'echo-remnants',
  tagline: "Someone just tried the Archive's defenses a second time.",
  synopsis: 'The 2149 Triton Archive Breach — an unknown party briefly accessing Echo Remnant precursor archives before being repelled — was never solved (LORE.md). A near-identical intrusion signature just hit the Archive again, and Archivist Valeria Starforge is asking corporations to help trace it.',
  acts: [
    {
      id: 'triton_alarms', name: 'Alarms at the Archive', icon: '🚨', kind: 'info',
      presentationHint: 'cinematic',
      description: "Echo Remnants' fortified Archive complex on Triton reports a second intrusion attempt — the signature is eerily close to 2149's unsolved breach. The Order of the First Silence has sealed the outer vaults and is asking every allied corporation for support.",
      consequence: { label: 'Second Breach Confirmed', reputationPoints: 100, factionRep: { 'echo-remnants': 8 } },
    },
    {
      id: 'triton_investigate_or_stand', name: 'Investigate or Stand Aside', icon: '🔍', kind: 'choice',
      description: "Archivist Starforge personally requests corporate assistance tracing the intruders' financial trail — a real commitment of analysts and legal cover.",
      choices: [
        {
          label: 'Assist the investigation', description: 'Commit analysts and legal cover to trace the intrusion — expensive, and the Remnants remember who showed up.',
          consequence: { label: 'Investigation Assisted', moneyCost: 55_000_000, factionRep: { 'echo-remnants': 15 }, setFlags: { assistedInvestigation: true } },
        },
        {
          label: 'Stay neutral', description: 'Keep your analysts on paying contracts — no cost, but the Remnants notice who didn\'t come when asked.',
          consequence: { label: 'Stayed Neutral', revenueMultiplier: 1.02, effectDurationMonths: 2, factionRep: { 'echo-remnants': -8 }, setFlags: { stayedNeutral: true } },
        },
      ],
      recapConsequence: { label: 'The Request Went Unanswered', setFlags: { missedInvestigateOrStand: true } },
    },
    {
      id: 'triton_trail', name: 'The Trail Leads to Pallas', icon: '🧭', kind: 'info',
      description: 'The financial trail, such as it is, gets traced as far as anyone can take it this cycle.',
      resolve: ({ flags }) => {
        if (flags.assistedInvestigation) {
          return { label: 'Trail Traced to Shell Accounts', reputationPoints: 350, researchSpeedMultiplier: 1.04, effectDurationMonths: 2, factionRep: { 'echo-remnants': 8 } };
        }
        if (flags.stayedNeutral) {
          return { label: 'Trail Goes Cold', reputationPoints: 60 };
        }
        return { label: 'Investigation Ongoing', reputationPoints: 80 };
      },
    },
    {
      id: 'triton_fragment', name: 'Precursor Fragment Recovered', icon: '🪨', kind: 'info',
      description: 'A damaged precursor artifact fragment turns up at the intrusion site — too unstable to analyze without a dedicated, well-funded research effort. The Archive proposes opening a rare cross-corporation consortium to study it properly.',
      consequence: { label: 'Fragment Recovered', hazardMitigationBonus: { amount: 0.02, durationMonths: 2 }, reputationPoints: 150 },
    },
  ],
  finale: {
    id: 'triton_consortium', name: 'The Archive Consortium', icon: '🔬',
    description: "Echo Remnants open a one-time consortium to fund a full precursor-fragment analysis under Archive supervision. Every corporation that joins adds real funding — and a real seat at the table if the fragment yields something.",
    participateLabel: 'Fund the consortium', participateDescription: 'Commit funding to the Archive Consortium — a real cost, with a seat at the table if it pays off.',
    participateCost: { label: 'Consortium Funding Committed', moneyCost: 85_000_000 },
    passDescription: 'Let the Archive fund it alone. No cost, no seat at the table.',
    epilogueSuccess: { label: 'Precursor Resonance Theory Confirmed', reputationPoints: 3500, factionRep: { 'echo-remnants': 22 }, unlockRareTechId: 'precursor_resonance_theory', researchSpeedMultiplier: 1.08, effectDurationMonths: 3 },
    epilogueFailure: { label: 'Fragment Destabilizes', reputationPoints: 250, factionRep: { 'echo-remnants': 6 } },
    successHeadline: 'The consortium succeeded — the fragment yielded a genuine precursor-technology breakthrough.',
    failureHeadline: 'The fragment destabilized before analysis completed. The Archive thanks everyone who tried.',
  },
};

export const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  THE_SECOND_SILENCE,
  THE_PALLAS_LEDGER,
  TRITON_ARCHIVE_SECOND_BREACH,
];

export const CHAPTER_MAP = new Map(CHAPTER_DEFINITIONS.map(c => [c.id, c]));

// ─── Calendar derivation (pure) ─────────────────────────────────────────────

/** Epoch-anchored week index — identical convention to appointment-events.ts's
 *  getAppointmentWeekIndex (same formula, kept as a separate export here so
 *  this module has no import-order dependency on that file). */
export function getChapterWeekIndex(nowMs: number): number {
  return Math.floor(nowMs / WEEK_MS);
}

export function getChapterCycleIndex(weekIndex: number): number {
  return Math.floor(weekIndex / CHAPTER_CYCLE_WEEKS);
}

export function getWeekInChapterCycle(weekIndex: number): number {
  return ((weekIndex % CHAPTER_CYCLE_WEEKS) + CHAPTER_CYCLE_WEEKS) % CHAPTER_CYCLE_WEEKS;
}

export function getChapterForCycle(cycleIndex: number): ChapterDefinition {
  const n = CHAPTER_DEFINITIONS.length;
  return CHAPTER_DEFINITIONS[((cycleIndex % n) + n) % n];
}

export function getChapterCycleStartMs(cycleIndex: number): number {
  return cycleIndex * CHAPTER_CYCLE_WEEKS * WEEK_MS;
}

export function getActRevealMs(cycleIndex: number, actIndex: number): number {
  const offset = CHAPTER_ACT_WEEK_OFFSETS[actIndex] ?? actIndex;
  return getChapterCycleStartMs(cycleIndex) + offset * WEEK_MS;
}

export interface FinaleWindow {
  startMs: number;
  endMs: number;
}

/** Fixed real-world weekend inside the finale week — Saturday 18:00 UTC
 *  through Sunday 23:00 UTC. Epoch-week boundaries always land on a
 *  Thursday 00:00 UTC (Jan 1 1970 was a Thursday), so +2 days/+18h reaches
 *  Saturday evening and +3 days/+23h reaches Sunday night, for every cycle,
 *  forever — the LS3 "fixed-UTC-window, published ahead of time" pattern. */
export function getFinaleWindow(cycleIndex: number): FinaleWindow {
  const finaleWeekStartMs = getChapterCycleStartMs(cycleIndex) + CHAPTER_FINALE_WEEK_OFFSET * WEEK_MS;
  const startMs = finaleWeekStartMs + 2 * DAY_MS + 18 * HOUR_MS;
  const endMs = finaleWeekStartMs + 3 * DAY_MS + 23 * HOUR_MS;
  return { startMs, endMs };
}

/** End of the epilogue window (also the instant the NEXT cycle's Act 1
 *  reveals) — the epilogue bonus/malus is "live" world lore until then. */
export function getEpilogueEndMs(cycleIndex: number): number {
  return getChapterCycleStartMs(cycleIndex) + (CHAPTER_EPILOGUE_WEEK_OFFSET + 1) * WEEK_MS;
}

export interface ChapterInstance {
  cycleIndex: number;
  weekInCycle: number;
  def: ChapterDefinition;
  /** How many acts have reached their reveal instant as of `nowMs`, capped
   *  at def.acts.length. */
  revealedActCount: number;
  finaleWindow: FinaleWindow;
  finaleOpen: boolean;
  finaleClosed: boolean;
  epilogueEndMs: number;
  epilogueActive: boolean;
}

/** The world's current chapter state at `nowMs` — pure, deterministic,
 *  identical for every caller (client, server, test) given the same
 *  timestamp. This is the single source of truth every other function in
 *  this module and world-calendar.ts's chapterEntries deriver reads from. */
export function getCurrentChapterInstance(nowMs: number = Date.now()): ChapterInstance {
  const weekIndex = getChapterWeekIndex(nowMs);
  const cycleIndex = getChapterCycleIndex(weekIndex);
  const weekInCycle = getWeekInChapterCycle(weekIndex);
  const def = getChapterForCycle(cycleIndex);

  let revealedActCount = 0;
  for (let i = 0; i < def.acts.length; i++) {
    if (getActRevealMs(cycleIndex, i) <= nowMs) revealedActCount++;
  }

  const finaleWindow = getFinaleWindow(cycleIndex);
  const finaleOpen = nowMs >= finaleWindow.startMs && nowMs < finaleWindow.endMs;
  const finaleClosed = nowMs >= finaleWindow.endMs;
  const epilogueEndMs = getEpilogueEndMs(cycleIndex);
  const epilogueActive = finaleClosed && nowMs < epilogueEndMs;

  return { cycleIndex, weekInCycle, def, revealedActCount, finaleWindow, finaleOpen, finaleClosed, epilogueEndMs, epilogueActive };
}

// ─── Pending-choice shape ────────────────────────────────────────────────
// Structural alias onto GameState['pendingChoice'] — guarantees this
// module's chapter-sourced choices assign cleanly into the same slot
// narrative-events.ts's PendingChainChoiceUI already uses, without
// duplicating the shape or importing across the two content modules.
export type PendingChapterChoiceUI = NonNullable<GameState['pendingChoice']>;

function buildActChoicePrompt(def: ChapterDefinition, act: ChapterAct, actIndex: number): PendingChapterChoiceUI {
  return {
    eventId: `chapter:${def.id}:${act.id}`,
    eventName: act.name,
    eventIcon: act.icon,
    eventDescription: act.description,
    choices: (act.choices || []).map(c => ({
      label: c.label, description: c.description, consequencePreview: consequencePreview(c.consequence),
    })),
    chapterId: def.id,
    chapterName: def.name,
    stageIndex: actIndex,
    totalStages: def.acts.length + 1, // + the finale slot
  };
}

function buildFinalePrompt(def: ChapterDefinition): PendingChapterChoiceUI {
  return {
    eventId: `chapter:${def.id}:finale`,
    eventName: def.finale.name,
    eventIcon: def.finale.icon,
    eventDescription: def.finale.description,
    choices: [
      { label: def.finale.participateLabel, description: def.finale.participateDescription, consequencePreview: consequencePreview(def.finale.participateCost) },
      { label: 'Sit this one out', description: def.finale.passDescription },
    ],
    chapterId: def.id,
    chapterName: def.name,
    stageIndex: def.acts.length,
    totalStages: def.acts.length + 1,
  };
}

// ─── Advancement (called every tick — cheap pure check, not gated on
// game-month like narrative-events.ts's chains, since chapter staging is
// wall-clock-driven, not per-player-clock-driven) ───────────────────────

export interface AdvanceStoryChaptersResult {
  state: GameState;
  events: GameEvent[];
  pendingChoice: PendingChapterChoiceUI | null;
}

/** Advance this save's chapter progress to match the world's current
 *  calendar state. Deterministic given (state, nowMs) — the only
 *  non-determinism is which single-slot pendingChoice narrative-events.ts's
 *  chains vs. this module's acts/finale claim first in a given tick, which
 *  is exactly why `allowNewChoice` exists (same contention discipline as
 *  advanceNarrativeChains). */
export function advanceStoryChapters(
  state: GameState,
  nowMs: number,
  allowNewChoice: boolean,
): AdvanceStoryChaptersResult {
  const events: GameEvent[] = [];
  let pendingChoice: PendingChapterChoiceUI | null = null;
  const inst = getCurrentChapterInstance(nowMs);
  let history = state.storyChapters?.history ?? [];
  let cur = state.storyChapters?.current ?? null;
  let out = state;

  // ── Stale progress: the world moved to a new cycle before this save's
  // finale ever resolved (offline through the whole window, or the
  // participation-count fetch never landed to run resolveChapterEpilogue).
  // File it as missed — no consequence applied either way, matching LS5's
  // "missing a week only forfeits the stipend, no penalty" fairness rule —
  // and start fresh progress for the world's current cycle. ────────────
  if (cur && cur.cycleIndex < inst.cycleIndex && cur.status !== 'completed') {
    const missedDef = CHAPTER_MAP.get(cur.chapterId) || getChapterForCycle(cur.cycleIndex);
    history = [...history, {
      cycleIndex: cur.cycleIndex, chapterId: missedDef.id, chapterName: missedDef.name,
      finaleSuccess: false, completedAtMs: nowMs,
      headline: "The chapter's real-world window closed before your corporation weighed in on the finale — no effect applied, but it's now part of galactic history.",
    }].slice(-20);
    events.push({
      id: generateId(), date: out.gameDate, type: 'random_event',
      title: `${missedDef.icon} ${missedDef.name}: Chapter Closed`,
      description: 'This chapter\'s window has passed. Check the Chronicle for how it resolved.',
    });
    cur = null;
  }

  if (!cur) {
    cur = { cycleIndex: inst.cycleIndex, chapterId: inst.def.id, actIndex: 0, status: 'active', joinedAtWeek: inst.weekInCycle, flags: {} };
  }

  // ── Acts due ─────────────────────────────────────────────────────────
  const dueCount = inst.revealedActCount - cur.actIndex;
  if (dueCount > 0 && !cur.awaitingChoice) {
    if (dueCount > 1) {
      // Compressed catch-up recap — more than one act became due since this
      // save last checked in (a brand-new player joining mid-chapter, or a
      // lapsed player returning after more than a week away). Resolve every
      // due act at once; choice-kind acts take their authored
      // recapConsequence rather than presenting a stale modal.
      const resolvedNames: string[] = [];
      let flags = { ...(cur.flags || {}) };
      let actIndex = cur.actIndex;
      while (actIndex < inst.revealedActCount) {
        const act = inst.def.acts[actIndex];
        const consequence = act.kind === 'choice'
          ? (act.recapConsequence || { label: `${act.name} (missed)` })
          : (act.resolve ? act.resolve({ state: out, flags, cycleIndex: inst.cycleIndex }) : (act.consequence || { label: act.name }));
        out = applyChainConsequence(out, consequence, 0);
        flags = { ...flags, ...(consequence.setFlags || {}) };
        resolvedNames.push(act.name);
        actIndex++;
      }
      cur = { ...cur, actIndex, flags };
      events.push({
        id: generateId(), date: out.gameDate, type: 'random_event',
        title: `${inst.def.icon} ${inst.def.name}: Recap`,
        description: `While your corporation was elsewhere, the chapter moved on: ${resolvedNames.join(' -> ')}. Full details in the Chronicle.`,
      });
    } else {
      // Live single-act presentation — this act became due THIS week, in
      // real time, exactly like everyone else currently playing.
      const act = inst.def.acts[cur.actIndex];
      if (act.kind === 'choice') {
        if (allowNewChoice) {
          pendingChoice = buildActChoicePrompt(inst.def, act, cur.actIndex);
          cur = { ...cur, awaitingChoice: true };
        }
        // else: slot taken this tick — retry on the next one.
      } else {
        const consequence = act.resolve ? act.resolve({ state: out, flags: cur.flags || {}, cycleIndex: inst.cycleIndex }) : (act.consequence || { label: act.name });
        out = applyChainConsequence(out, consequence, 0);
        events.push({
          id: generateId(), date: out.gameDate, type: 'random_event',
          title: `${act.icon} ${act.name}`,
          description: act.description,
        });
        cur = { ...cur, actIndex: cur.actIndex + 1, flags: { ...(cur.flags || {}), ...(consequence.setFlags || {}) } };
      }
    }
  }

  // ── Finale ───────────────────────────────────────────────────────────
  if (cur.actIndex >= inst.def.acts.length && cur.status === 'active') {
    if (inst.finaleOpen && !cur.awaitingChoice && !cur.flags?.finaleAnswered) {
      if (allowNewChoice && !pendingChoice) {
        pendingChoice = buildFinalePrompt(inst.def);
        cur = { ...cur, awaitingChoice: true };
      }
    } else if (inst.finaleClosed && !cur.flags?.finaleAnswered) {
      // The window closed and this save never answered — mark it (fairness
      // rule again: no penalty beyond forfeiting the chance to contribute).
      cur = { ...cur, flags: { ...(cur.flags || {}), finaleAnswered: true, finaleParticipated: false } };
    }
  }

  out = { ...out, storyChapters: { current: cur, history } };
  return { state: out, events, pendingChoice };
}

/** Resolve a player's choice for the currently-pending chapter act or
 *  finale (routed the same way resolveChainChoice is — the page checks
 *  `pendingChoice.chapterId` first). Authoritative stage comes from `cur`,
 *  not caller input — the act/finale cannot have advanced since the modal
 *  was presented (awaitingChoice blocks further scheduling). */
export function resolveChapterChoice(
  state: GameState,
  chapterId: string,
  choiceIndex: number,
): GameState {
  const cur = state.storyChapters?.current;
  if (!cur || cur.chapterId !== chapterId || !cur.awaitingChoice) return state;
  const def = CHAPTER_MAP.get(chapterId);
  if (!def) return state;

  // ── Finale participate/pass ─────────────────────────────────────────
  if (cur.actIndex >= def.acts.length) {
    const participate = choiceIndex === 0;
    const consequence: ChainConsequence = participate
      ? { ...def.finale.participateCost, setFlags: { ...(def.finale.participateCost.setFlags || {}), finaleAnswered: true, finaleParticipated: true } }
      : { label: 'Sat out the finale', setFlags: { finaleAnswered: true, finaleParticipated: false } };
    let out = applyChainConsequence(state, consequence, 0);
    const nextFlags = { ...(cur.flags || {}), ...(consequence.setFlags || {}) };
    out = {
      ...out,
      storyChapters: { current: { ...cur, awaitingChoice: false, flags: nextFlags }, history: state.storyChapters?.history || [] },
      eventLog: [{
        id: generateId(), date: out.gameDate, type: 'random_event' as const,
        title: `${def.finale.icon} ${def.finale.name}: ${participate ? def.finale.participateLabel : 'Sat This One Out'}`,
        description: consequence.label,
      }, ...out.eventLog].slice(0, 50),
    };
    return out;
  }

  // ── Act choice ───────────────────────────────────────────────────────
  const act = def.acts[cur.actIndex];
  if (act.kind !== 'choice') return state;
  const choice = act.choices?.[choiceIndex];
  if (!choice) return state;
  let out = applyChainConsequence(state, choice.consequence, 0);
  const nextFlags = { ...(cur.flags || {}), ...(choice.consequence.setFlags || {}) };
  out = {
    ...out,
    storyChapters: { current: { ...cur, actIndex: cur.actIndex + 1, awaitingChoice: false, flags: nextFlags }, history: state.storyChapters?.history || [] },
    eventLog: [{
      id: generateId(), date: out.gameDate, type: 'random_event' as const,
      title: `${act.icon} ${act.name}: ${choice.label}`,
      description: choice.consequence.label,
    }, ...out.eventLog].slice(0, 50),
  };
  return out;
}

// ─── Finale outcome (participation-weighted, world-shared) ────────────────

export interface FinaleOutcome {
  success: boolean;
  roll: number;
  threshold: number;
}

/** Pure function of (chapterId, cycleIndex, participationCount) — every
 *  client that queries the participation count AFTER the finale window
 *  closes (when the count is final; the contribute route only accepts
 *  writes inside the window) computes the identical outcome. Base 35%
 *  success, +1% per contributing corporation up to +50%, capped at 90% —
 *  participation genuinely moves the odds without guaranteeing the
 *  outcome. */
export function computeFinaleOutcome(def: ChapterDefinition, cycleIndex: number, participationCount: number): FinaleOutcome {
  const rng = mulberry32(hashStringToSeed(`chapter-finale:${def.id}:${cycleIndex}`));
  const roll = rng();
  const participationBonus = Math.min(0.5, Math.max(0, participationCount) * 0.01);
  const threshold = Math.min(0.9, 0.35 + participationBonus);
  return { success: roll < threshold, roll, threshold };
}

/** Apply the finale's world-shared epilogue once the window has closed and
 *  this save's progress has reached (and not yet resolved) the finale.
 *  No-op (same state reference) if there's nothing to resolve — safe to
 *  call on every render/tick once a participationCount is available. */
export function resolveChapterEpilogue(
  state: GameState,
  participationCount: number,
  nowMs: number = Date.now(),
): GameState {
  const cur = state.storyChapters?.current;
  if (!cur || cur.status !== 'active') return state;
  const inst = getCurrentChapterInstance(nowMs);
  if (cur.cycleIndex !== inst.cycleIndex) return state; // stale — advanceStoryChapters files it as missed
  if (cur.actIndex < inst.def.acts.length) return state; // acts not finished yet
  if (!inst.finaleClosed) return state; // window still open or not reached
  if (cur.flags?.epilogueResolved) return state; // already resolved

  const def = inst.def;
  const outcome = computeFinaleOutcome(def, cur.cycleIndex, participationCount);
  const consequence = outcome.success ? def.finale.epilogueSuccess : def.finale.epilogueFailure;
  let out = applyChainConsequence(state, consequence, 0);

  const record: CompletedChapterRecord = {
    cycleIndex: cur.cycleIndex, chapterId: def.id, chapterName: def.name,
    finaleSuccess: outcome.success, completedAtMs: nowMs,
    headline: outcome.success ? def.finale.successHeadline : def.finale.failureHeadline,
  };

  const history: CompletedChapterRecord[] = [...(state.storyChapters?.history || []), record].slice(-20);
  out = {
    ...out,
    storyChapters: {
      current: { ...cur, status: 'completed', flags: { ...(cur.flags || {}), epilogueResolved: true } },
      history,
    },
    eventLog: [{
      id: generateId(), date: out.gameDate, type: 'milestone' as const,
      title: `${def.icon} ${def.name}: ${outcome.success ? 'Resolved' : 'Setback'}`,
      description: `${record.headline} (${participationCount} corporation${participationCount === 1 ? '' : 's'} answered the call — the roll needed under ${(outcome.threshold * 100).toFixed(0)}%.)`,
    }, ...out.eventLog].slice(0, 50),
  };
  return out;
}

// ─── Cinematic detection (W5 precedent, extended for chapters) ────────────

const CHAPTER_ART: Record<string, string> = {
  the_second_silence: PLANET_ASSETS.ancient_ruins,
  the_pallas_ledger: BG_ASSETS.starfield,
  triton_archive_second_breach: PLANET_ASSETS.ancient_ruins,
};

export function pickChapterArt(chapterId: string): string | undefined {
  return CHAPTER_ART[chapterId] ?? PLANET_ASSETS.anomaly;
}

/** Chapter-open beats — Act 1 of each chapter, matching narrative-events.ts's
 *  CINEMATIC_INFO_STAGE_TITLES lookup-by-logged-title convention exactly
 *  (keyed by the identical `${icon} ${name}` string advanceStoryChapters
 *  logs). Only 'info'-kind cinematic acts are included; a 'choice'-kind
 *  Act 1 would surface via a pendingChoice watcher instead — none of the
 *  three authored chapters currently open on a choice, so that path is
 *  unused today but the shape below stays ready for it. */
export const CINEMATIC_CHAPTER_ACT_TITLES: Map<string, { chapterId: string; chapterName: string; icon: string; name: string; description: string }> = (() => {
  const map = new Map<string, { chapterId: string; chapterName: string; icon: string; name: string; description: string }>();
  for (const def of CHAPTER_DEFINITIONS) {
    def.acts.forEach((act) => {
      if (act.presentationHint !== 'cinematic' || act.kind !== 'info') return;
      map.set(`${act.icon} ${act.name}`, { chapterId: def.id, chapterName: def.name, icon: act.icon, name: act.name, description: act.description });
    });
  }
  return map;
})();

/** Does this chapter's act (by index) carry the cinematic presentation
 *  hint? Mirrors narrative-events.ts's isCinematicChainStage exactly — used
 *  by the page's pendingChoice watcher for the (currently unused, since no
 *  authored chapter opens on a choice-kind act) case of a cinematic-flagged
 *  choice act. */
export function isCinematicChapterActStage(chapterId: string, actIndex: number): boolean {
  const def = CHAPTER_MAP.get(chapterId);
  return def?.acts[actIndex]?.presentationHint === 'cinematic';
}

/** Chapter-close beats — the finale resolution event resolveChapterEpilogue
 *  logs, keyed by its exact `${icon} ${name}: Resolved|Setback` title. */
export const CHAPTER_FINALE_RESOLUTION_TITLES: Map<string, { chapterId: string; chapterName: string; icon: string; success: boolean }> = (() => {
  const map = new Map<string, { chapterId: string; chapterName: string; icon: string; success: boolean }>();
  for (const def of CHAPTER_DEFINITIONS) {
    map.set(`${def.icon} ${def.name}: Resolved`, { chapterId: def.id, chapterName: def.name, icon: def.icon, success: true });
    map.set(`${def.icon} ${def.name}: Setback`, { chapterId: def.id, chapterName: def.name, icon: def.icon, success: false });
  }
  return map;
})();
