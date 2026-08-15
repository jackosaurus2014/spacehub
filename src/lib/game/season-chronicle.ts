// ─── Space Tycoon: Season Chronicle — Prestige Archive (LS7) ────────────────
// docs/LIVE_SERVICE_2026-08.md §LS7. "A permanent Season Chronicle archive —
// final bracket placements, alliance charter results (LS5), event winners —
// displayed as titles/banners on profiles, corp pages, and the public
// leaderboard forever. A month-4 veteran wears month-2's title; a returning
// player sees three seasons of world history they can read."
//
// This module is the PURE assembly/derivation half — no prisma import, no
// I/O, fully unit-testable with plain object fixtures (same split as
// corporate-eras.ts: state math here, persistence in the route). The caller
// (seasons cron route) queries SeasonParticipation + AllianceCharter, hands
// the raw rows to assembleSeasonChronicle(), and writes the returned record
// verbatim into SeasonalEvent.results — a SEALED JSON blob, written once per
// season and never overwritten (server truth, permanent history, exactly
// the "archive is server truth" instruction in the spec).
//
// Titles are COSMETIC ONLY (CLAUDE.md "no pay-to-win", "titles cosmetic +
// tiny legacy-power grants (prestige without power creep)"): this module
// intentionally stops at deriving the title list. Wiring a legacy-power
// grant belongs to legacy-system.ts's own milestone family and is left as a
// follow-up so this wave doesn't reach into a module another wave owns.

import { getSuperCycleForSeason, getThemeHeadlines, type SuperCycleTheme } from './economic-seasons';
import type { ResourceId } from './resources';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChroniclePlacement {
  profileId: string;
  companyName: string;
  title: string | null;
  totalScore: number;
  bracket: number;
  rank: number;
}

export interface AllianceCharterOutcome {
  allianceName: string;
  allianceTag: string | null;
  charterType: string;
  grade: string | null; // 'gold' | 'silver' | 'bronze' | 'incomplete' | null
}

export interface SeasonChronicleRecord {
  seasonNumber: number;
  seasonType: string;
  title: string;
  startsAt: number;
  endsAt: number;
  themeId: string;
  themeName: string;
  themeIcon: string;
  /** Formatted "Water demand +20%" style lines — the season's headline
   *  commodity moves, for the archive page and history tab. */
  themeHeadlines: string[];
  participantCount: number;
  /** Ranks 1-3 only — the permanent public record. Full standings remain
   *  queryable live via the leaderboard route; the chronicle is a highlight
   *  reel, not a duplicate of the raw table. */
  topPlacements: ChroniclePlacement[];
  allianceOutcomes: AllianceCharterOutcome[];
  notableEvents: string[];
  sealedAtMs: number;
}

export interface AssembleChronicleInput {
  seasonNumber: number;
  seasonType: string;
  title: string;
  startsAt: number;
  endsAt: number;
  participantCount: number;
  /** All placements worth recording, ANY order — assembleSeasonChronicle
   *  sorts by totalScore desc and keeps the top 3 itself, so callers can
   *  pass a top-10 (or full) query result without pre-sorting. */
  placements: Omit<ChroniclePlacement, 'rank'>[];
  allianceOutcomes?: AllianceCharterOutcome[];
  /** Extra notable-event lines (e.g. a record price move, a milestone
   *  first). Appended after the auto-generated theme headline notes. */
  notableEvents?: string[];
  nowMs?: number;
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

/** Pure: build the sealed chronicle record for a just-completed season.
 *  Deterministic given the same inputs (theme is re-derived from
 *  seasonNumber via economic-seasons.ts, never passed in, so the archive can
 *  never drift from the live super-cycle math). Safe to call once at
 *  TALLYING and never again — callers should only write the result when the
 *  season doesn't already have one sealed. */
export function assembleSeasonChronicle(input: AssembleChronicleInput): SeasonChronicleRecord {
  const theme = getSuperCycleForSeason(input.seasonNumber);
  const headlines = getThemeHeadlines(theme).map(h => h.label);

  const ranked = [...input.placements]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const notableEvents = [
    `${theme.name}: ${theme.description}`,
    ...(input.notableEvents || []),
  ];

  return {
    seasonNumber: input.seasonNumber,
    seasonType: input.seasonType,
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    themeId: theme.id,
    themeName: theme.name,
    themeIcon: theme.icon,
    themeHeadlines: headlines,
    participantCount: input.participantCount,
    topPlacements: ranked,
    allianceOutcomes: input.allianceOutcomes || [],
    notableEvents,
    sealedAtMs: input.nowMs ?? Date.now(),
  };
}

// ─── Prestige titles ──────────────────────────────────────────────────────────

export interface PrestigeTitle {
  id: string;
  label: string;
  icon: string;
  seasonNumber: number;
  seasonTitle: string;
  rank: number;
}

const RANK_ICON: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };
const RANK_LABEL: Record<number, string> = { 1: 'Champion', 2: 'Podium Finisher', 3: 'Podium Finisher' };

/** Cosmetic titles a company has earned across the sealed chronicle history
 *  it's found in. Pure — no DB, no mutation, safe to recompute on every
 *  render. companyName match is exact (SeasonParticipation rows don't carry
 *  a stable cross-season profileId join in the archive's minimal top-3
 *  shape, and company names are the same identity the public leaderboard
 *  already keys on). Newest season first. */
export function derivePrestigeTitles(
  records: SeasonChronicleRecord[],
  companyName: string,
): PrestigeTitle[] {
  const titles: PrestigeTitle[] = [];
  for (const record of records) {
    const placement = record.topPlacements.find(p => p.companyName === companyName);
    if (!placement) continue;
    titles.push({
      id: `season_${record.seasonNumber}_rank${placement.rank}`,
      label: `S${record.seasonNumber} ${RANK_LABEL[placement.rank] || 'Finisher'}`,
      icon: RANK_ICON[placement.rank] || '⭐',
      seasonNumber: record.seasonNumber,
      seasonTitle: record.title,
      rank: placement.rank,
    });
  }
  return titles.sort((a, b) => b.seasonNumber - a.seasonNumber);
}

/** True once a company has ANY sealed-chronicle podium finish — the cheap
 *  boolean check profile/corp pages want without rendering the full list. */
export function hasAnyPrestigeTitle(records: SeasonChronicleRecord[], companyName: string): boolean {
  return derivePrestigeTitles(records, companyName).length > 0;
}

// Re-exported for convenience so UI/route code that already imports from
// this module doesn't need a second import for the theme type.
export type { SuperCycleTheme, ResourceId };
