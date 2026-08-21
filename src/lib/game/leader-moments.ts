// ─── Leader moments (Wave A2.3, docs/VISUAL_AAA_2026-08.md §A2.3) ──────────
//
// Master of Orion 2's personality came from leaders APPEARING: a large framed
// portrait in ornate housing delivering a decision, not a line in a log. We
// have 80 commander portraits and 6 faction-leader portraits on disk, and
// named NPCs in docs/LORE.md — but leaders never appear at scale.
//
// This module is the PURE half of that feature: it decides *who is speaking*
// at decision moments the game already produces, and builds the moment
// objects. It renders nothing and owns no React.
//
// ── Hard rule: no invented events, no invented attributions ────────────────
// Every moment here is derived from a decision the engine ALREADY makes, and
// every speaker is derived from data the content ALREADY declares:
//
//   appointment  — the player hired a commander (commanders.hireCommander).
//                  Speaker: that commander. Today: silent, a card click.
//   retirement   — commanders.processLeaderRetirements' eventLog entry.
//                  Speaker: that commander. Today: one line in the log.
//   standing     — the player's reputation with a faction crossed a
//                  getStanding() tier boundary. Speaker: that faction's
//                  LORE.md leader. Today: nothing surfaces this at all.
//   choice       — an existing `pendingChoice` (narrative chain stage or
//                  Story Chapter act/finale). Speaker resolved from the
//                  content's OWN declared data — see resolveChoiceSpeaker.
//
// Nothing here changes game state, costs, odds, or effects. It is a lens.

import type { GameEvent, GameState } from './types';
import {
  COMMANDER_MAP,
  getPortraitUrl,
  hasPortraitArt,
  RARITY_LABEL,
  type CommanderDefinition,
} from './commanders';
import {
  FACTION_MAP,
  getStanding,
  STANDING_LABEL,
  type FactionId,
  type FactionStanding,
} from './factions';
import { getFactionLeaderArt } from './assets';
import { CHAIN_DEFINITIONS } from './narrative-events';
import { CHAPTER_MAP } from './chapters';

// ─── Speaker ───────────────────────────────────────────────────────────────

/** Which art cohort the portrait comes from. Purely informational — the
 *  frame normalizes both identically (see GameStyles §A2.3); this exists so
 *  a caller can audit coverage without re-deriving the URL shape. */
export type PortraitCohort = 'commander' | 'faction-leader' | 'none';

export interface LeaderSpeaker {
  /** Stable key — commander definition id, or faction id. */
  id: string;
  name: string;
  /** Role/rank. Always rendered as text; never implied by the portrait. */
  title: string;
  /** Organisation the speaker answers to. Empty string when independent. */
  affiliation: string;
  /** Portrait art path, or null when the roster has no art for this speaker
   *  (the frame then renders a monogram plate — never a broken image). */
  portraitUrl: string | null;
  cohort: PortraitCohort;
  /** Hex accent for the frame's keyline. ALWAYS redundant with the
   *  affiliation text below it — colour never carries identity. */
  accentHex: string;
}

/** LORE.md §"The Six Factions" — "Named leaders" line, transcribed verbatim.
 *  The Hive Collective canonically has NO singular leader ("The Collective's
 *  interfaces rotate"), and its portrait art depicts the rotating spokesbody
 *  interface rather than an individual, so its entry names the interface —
 *  inventing a Hive leader would break canon. */
export const FACTION_LEADERS: Record<FactionId, { name: string; title: string }> = {
  'the-dominion': { name: 'Magnus Varna', title: 'Grand Director' },
  'the-syndicate': { name: 'Zahn Eclipse', title: 'Ghost Director' },
  'void-corsairs': { name: 'Kraal', title: 'Warchief, First Among Equals' },
  'hive-collective': { name: 'Rotating Spokesbody', title: 'Interface to the Collective' },
  'nebula-reavers': { name: 'The Nomad', title: 'Elder-Navigator' },
  'echo-remnants': { name: 'Valeria Starforge', title: 'Archivist, Grand Master' },
};

/** Frame keyline per faction. Mirrors each faction's existing Tailwind theme
 *  accent in factions.ts (red / purple / amber / emerald / sky / indigo) as a
 *  hex value, because a keyline glow cannot be expressed as a text-colour
 *  utility class. */
export const FACTION_ACCENT_HEX: Record<FactionId, string> = {
  'the-dominion': '#f87171',
  'the-syndicate': '#c084fc',
  'void-corsairs': '#fbbf24',
  'hive-collective': '#34d399',
  'nebula-reavers': '#38bdf8',
  'echo-remnants': '#818cf8',
};

const COMMANDER_ACCENT_HEX = '#22d3ee';

/** Speaker for a hired/hireable commander. Returns null for an unknown id
 *  rather than fabricating a placeholder person. */
export function resolveCommanderSpeaker(defId: string): LeaderSpeaker | null {
  const def: CommanderDefinition | undefined = COMMANDER_MAP.get(defId);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    title: def.title,
    affiliation: `${RARITY_LABEL[def.rarity]} · ${def.class.charAt(0).toUpperCase()}${def.class.slice(1)}`,
    portraitUrl: hasPortraitArt(def) ? getPortraitUrl(def) : null,
    cohort: hasPortraitArt(def) ? 'commander' : 'none',
    accentHex: COMMANDER_ACCENT_HEX,
  };
}

/** Speaker for a faction — its LORE.md named leader, wearing the faction's
 *  own leader portrait (FACTION_LEADER_ASSETS). */
export function resolveFactionSpeaker(factionId: string): LeaderSpeaker | null {
  const def = FACTION_MAP.get(factionId as FactionId);
  if (!def) return null;
  const leader = FACTION_LEADERS[def.id];
  const art = getFactionLeaderArt(def.id);
  return {
    id: def.id,
    name: leader.name,
    title: leader.title,
    affiliation: def.name,
    portraitUrl: art,
    cohort: art ? 'faction-leader' : 'none',
    accentHex: FACTION_ACCENT_HEX[def.id],
  };
}

// ─── Speaker attribution for an existing pendingChoice ─────────────────────

/** The subset of GameState['pendingChoice'] this module reads. Declared
 *  structurally so the resolver can be unit-tested without building a whole
 *  GameState. */
export interface ChoiceSpeakerInput {
  chainId?: string;
  chapterId?: string;
  stageIndex?: number;
}

/**
 * The faction that is unambiguously *at the table* for a chain stage.
 *
 * A narrative chain stage carries no speaker field, and adding one for all 13
 * chains would mean authoring 40-odd attributions by hand — inventing content
 * this wave is explicitly not allowed to invent. So the counterparty is
 * DERIVED from the stage's own declared consequences instead:
 *
 *   the speaker is the faction whose reputation moves on EVERY branch,
 *   and only when exactly one faction satisfies that.
 *
 * The intersection is doing real work in both directions:
 *  - "Strict vs permissive categories" moves only Echo Remnants on both
 *    branches → the Remnants are the party making the demand. Portrait.
 *  - "Support vs oppose licensing" moves the Dominion on both branches and
 *    the Syndicate on one → the Dominion is the proposer. Portrait.
 *  - "Fund the Remnants survey vs back the Dominion's dismissal" moves both
 *    factions on both branches → nobody is *speaking*, the player is picking
 *    a side. No portrait; the plain modal is the honest presentation.
 *
 * Stages whose branches use a dynamic `resolve()` instead of a static
 * `consequence` contribute no faction and therefore never resolve a speaker,
 * which is the correct conservative outcome.
 */
export function resolveChainStageFaction(chainId: string, stageIndex: number): FactionId | null {
  const chain = CHAIN_DEFINITIONS.find(c => c.id === chainId);
  const stage = chain?.stages[stageIndex];
  if (!stage?.choices || stage.choices.length === 0) return null;

  let intersection: string[] | null = null;
  for (const choice of stage.choices) {
    const factions = Object.keys(choice.consequence?.factionRep ?? {});
    if (factions.length === 0) return null; // a branch nobody owns ⇒ no speaker
    intersection = intersection === null
      ? factions
      : intersection.filter(f => factions.includes(f));
    if (intersection.length === 0) return null;
  }
  if (!intersection || intersection.length !== 1) return null;
  const only = intersection[0];
  return FACTION_MAP.has(only as FactionId) ? (only as FactionId) : null;
}

/**
 * Who, if anyone, is delivering this pending decision.
 *
 * Story Chapters declare `factionId` on the chapter itself ("Flavor only —
 * which LORE.md faction drives this arc", chapters.ts), so a chapter act is
 * always spoken by that faction's leader. Narrative chains fall back to the
 * intersection rule above. Everything else — one-shot RANDOM_EVENTS — has no
 * speaker and keeps its existing presentation.
 */
export function resolveChoiceSpeaker(pending: ChoiceSpeakerInput | null | undefined): LeaderSpeaker | null {
  if (!pending) return null;
  if (pending.chapterId) {
    const chapter = CHAPTER_MAP.get(pending.chapterId);
    return chapter?.factionId ? resolveFactionSpeaker(chapter.factionId) : null;
  }
  if (pending.chainId && typeof pending.stageIndex === 'number') {
    const factionId = resolveChainStageFaction(pending.chainId, pending.stageIndex);
    return factionId ? resolveFactionSpeaker(factionId) : null;
  }
  return null;
}

// ─── Acknowledge-only moments (queue) ──────────────────────────────────────

export type LeaderMomentKind = 'appointment' | 'retirement' | 'standing';

export interface LeaderMoment {
  /** Stable dedupe key — the queue is idempotent on this. */
  id: string;
  kind: LeaderMomentKind;
  speaker: LeaderSpeaker;
  /** Short line above the name plate, e.g. "Appointment". */
  eyebrow: string;
  /** The spoken message. */
  message: string;
  /** A status word rendered as literal text on the plate, so the moment's
   *  meaning survives greyscale and screen readers (never colour alone). */
  statusLabel: string;
}

/** Mirrors cinematic-moments.ts' cap — a returning player who accrued a dozen
 *  months of change should not have to click through all of them. */
export const MAX_LEADER_QUEUE = 4;

export function enqueueLeaderMoments(queue: LeaderMoment[], incoming: LeaderMoment[]): LeaderMoment[] {
  const seen = new Set(queue.map(m => m.id));
  const next = [...queue];
  for (const moment of incoming) {
    if (seen.has(moment.id)) continue;
    seen.add(moment.id);
    next.push(moment);
  }
  return next.slice(0, MAX_LEADER_QUEUE);
}

export function dequeueLeaderMoment(queue: LeaderMoment[]): LeaderMoment[] {
  return queue.slice(1);
}

// ─── Builders ──────────────────────────────────────────────────────────────

/** A commander the player just hired reports for duty. Triggered from the
 *  existing hire handler — no new game event. */
export function buildAppointmentMoment(defId: string, nowMs: number): LeaderMoment | null {
  const speaker = resolveCommanderSpeaker(defId);
  if (!speaker) return null;
  return {
    id: `leader_hire_${defId}_${nowMs}`,
    kind: 'appointment',
    speaker,
    eyebrow: 'Appointment',
    statusLabel: 'Reporting for duty',
    message: `${speaker.name} accepts the commission and reports aboard as ${speaker.title}. Assign a post to start accruing experience — an unassigned officer draws pay and earns nothing.`,
  };
}

/** commanders.ts' processLeaderRetirements writes an eventLog entry whose id
 *  is `evt_retire_<definitionId>_<timestamp>`. This reads that id back rather
 *  than parsing the human-readable title, so the hook survives any copy edit
 *  to the log line. */
const RETIRE_EVENT_PREFIX = 'evt_retire_';

export function commanderIdFromRetirementEvent(eventId: string): string | null {
  if (!eventId.startsWith(RETIRE_EVENT_PREFIX)) return null;
  const rest = eventId.slice(RETIRE_EVENT_PREFIX.length);
  const lastUnderscore = rest.lastIndexOf('_');
  if (lastUnderscore <= 0) return null;
  return rest.slice(0, lastUnderscore);
}

export function detectLeaderMomentsFromEvents(events: GameEvent[]): LeaderMoment[] {
  const out: LeaderMoment[] = [];
  for (const event of events) {
    const defId = commanderIdFromRetirementEvent(event.id);
    if (!defId) continue;
    const speaker = resolveCommanderSpeaker(defId);
    if (!speaker) continue;
    out.push({
      id: `leader_${event.id}`,
      kind: 'retirement',
      speaker,
      eyebrow: 'Retirement',
      statusLabel: 'Stepping down',
      message: `After a full term of distinguished service, ${speaker.name} stands down as ${speaker.title}. The post is yours to fill again — and their mentorship discounts the next officer of the same discipline.`,
    });
  }
  return out;
}

/** Standing-tier crossings between two reputation snapshots. Derived purely
 *  from getStanding()'s existing thresholds — no new state, no new event. */
export function detectStandingMoments(
  before: Partial<Record<FactionId, number>> | undefined,
  after: Partial<Record<FactionId, number>> | undefined,
  stamp: string | number,
): LeaderMoment[] {
  if (!after) return [];
  const out: LeaderMoment[] = [];
  for (const factionId of Object.keys(after) as FactionId[]) {
    if (!FACTION_MAP.has(factionId)) continue;
    const prevRep = before?.[factionId] ?? 0;
    const nextRep = after[factionId] ?? 0;
    const prevTier: FactionStanding = getStanding(prevRep);
    const nextTier: FactionStanding = getStanding(nextRep);
    if (prevTier === nextTier) continue;
    const speaker = resolveFactionSpeaker(factionId);
    if (!speaker) continue;
    const improved = nextRep > prevRep;
    out.push({
      id: `leader_standing_${factionId}_${nextTier}_${stamp}`,
      kind: 'standing',
      speaker,
      eyebrow: 'Diplomatic Standing',
      // Direction is carried as a WORD, not an arrow colour, and the tier is
      // named outright — greyscale-safe by construction.
      statusLabel: `${improved ? 'Improved to' : 'Fallen to'} ${STANDING_LABEL[nextTier]}`,
      message: improved
        ? `${speaker.affiliation} now regards your corporation as ${STANDING_LABEL[nextTier].toLowerCase()}. ${speaker.name} confirms the revised terms — broker fees and contract access move with standing.`
        : `${speaker.affiliation} has downgraded your corporation to ${STANDING_LABEL[nextTier].toLowerCase()}. ${speaker.name} advises that terms tighten accordingly until the relationship is repaired.`,
    });
  }
  return out;
}

/** Initials for the no-portrait fallback plate. Pure, so it lives here with
 *  the rest of the speaker logic rather than in the frame component. */
export function speakerMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Convenience lens for the page: pull the reputation map off a state. */
export function readFactionReputation(state: GameState): Partial<Record<FactionId, number>> {
  return state.factionReputation ?? {};
}
