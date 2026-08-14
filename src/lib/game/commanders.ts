// ─── Space Tycoon: Commander System ─────────────────────────────────────────
// Hired commanders grant passive global bonuses (class + rarity + level).
//
// W8 — Leaders 2.0 (4X_BASELINE_2026-08.md Part 2d): extends the Wave-5 MVP
// with levels/XP earned from assignment posts, deterministic specialty +
// quirk traits, an assignment system (research directorate / science
// program / expedition / zone / fleet ops / market desk), and 20 new
// scientist/engineer leaders. The hire pool, rarity economics, and 0.88^n
// same-class stacking from Wave 5 are unchanged — this is additive.

import type { GameState } from './types';
import { RESEARCH_MAP } from './research-tree';
import { hashStringToSeed } from './formulas';

export type CommanderRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CommanderClass =
  | 'diplomat'     // +service revenue
  | 'engineer'     // +construction speed
  | 'scientist'    // +research speed
  | 'logistician'  // +mining yield
  | 'magnate'      // +market sell prices
  | 'commander';   // +global revenue (catchall)

/** Roster filter bucket for the CommanderPanel UI (W8). Scientist/engineer
 *  classed leaders (the "science posts" roster) get their own buckets;
 *  diplomat/logistician/magnate/commander classes fall under 'commander'. */
export type RosterBucket = 'commander' | 'scientist' | 'engineer';

export function getRosterBucket(def: CommanderDefinition): RosterBucket {
  if (def.class === 'scientist') return 'scientist';
  if (def.class === 'engineer') return 'engineer';
  return 'commander';
}

export interface CommanderDefinition {
  id: string;
  name: string;
  title: string;
  class: CommanderClass;
  rarity: CommanderRarity;
  hasFullbody: boolean;
  /** W8: false for the 20 new scientist/engineer leaders — no unique
   *  portrait art exists for them yet (art-pipeline gap, see Part 3 of the
   *  4X baseline doc). Omitted/true = the original 60, which do have
   *  /public/game/commander-{id}.webp portraits. UI must render a
   *  text-avatar fallback (initials) when this is false rather than
   *  requesting a 404. */
  hasPortrait?: boolean;
}

/** W8 — Leaders 2.0 assignment posts. A hired commander can hold one post;
 *  assigned commanders earn XP from real monthly outputs (deterministic,
 *  no RNG — see isAssignmentProductive). Unassigned commanders keep any
 *  level already earned (passive) but accrue no further XP. */
export type AssignmentPostType =
  | 'research'          // a research category (scientist/engineer only) — targetId = ResearchCategory
  | 'science_program'   // a flagship science program (scientist/engineer only) — targetId = ScienceProgramDef id
  | 'expedition'         // an active interstellar expedition — targetId = ExpeditionState id
  | 'zone'                // governor of an unlocked location/zone — targetId = location id
  | 'fleet_ops'           // fleet operations desk — no targetId
  | 'market_desk';        // market desk (magnate-flavored) — no targetId

export interface CommanderAssignment {
  postType: AssignmentPostType;
  targetId?: string;
}

export const ASSIGNMENT_POST_LABEL: Record<AssignmentPostType, string> = {
  research: 'Research Directorate',
  science_program: 'Science Program',
  expedition: 'Expedition',
  zone: 'Zone Governor',
  fleet_ops: 'Fleet Operations',
  market_desk: 'Market Desk',
};

/** Only scientist/engineer classed leaders can staff the two science posts
 *  (research directorate, science program) — this is the roster's "meaningful
 *  decision": generalist commanders/diplomats/logisticians/magnates staff
 *  zone/fleet/market posts instead. */
export function canAssignToPost(def: CommanderDefinition, postType: AssignmentPostType): boolean {
  if (postType === 'research' || postType === 'science_program') {
    return def.class === 'scientist' || def.class === 'engineer';
  }
  return true;
}

export interface HiredCommander {
  definitionId: string;
  hiredAtMs: number;
  /** W8 — accrued from productive assignment posts, once per game-month. */
  xp?: number;
  /** W8 — derived from xp via getLevelFromXp; cached here and rewritten by
   *  processCommanderMonthTick immediately after xp changes so it never
   *  drifts. Reader code should still treat xp as the source of truth
   *  (getCommanderXpProgress recomputes defensively). */
  level?: number;
  /** W8 — current post, or null/undefined if unassigned. */
  assignment?: CommanderAssignment | null;
}

export interface CommanderPool {
  definitionIds: string[];
  refreshedAtMs: number;
}

export interface CommanderBonuses {
  revenueMultiplier: number;
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
  marketPriceMultiplier: number;
  // W8 — Leaders 2.0 trait bonuses. Same fields/consumption sites as
  // ResearchBonuses in research-tree.ts (travelSpeedBonus, insuranceDiscountBonus,
  // hazardResistanceBonus, crewMoraleBonus) — added at the SAME already-wired
  // game-engine.ts call sites as a small additive commander contribution.
  // Additive point values (not multipliers); default 0.
  travelSpeedBonus: number;
  insuranceDiscountBonus: number;
  hazardResistanceBonus: number;
  crewMoraleBonus: number;
}

export const POOL_SIZE = 5;
export const POOL_REFRESH_MS = 8 * 60 * 60 * 1000;

export const RARITY_MAGNITUDE: Record<CommanderRarity, number> = {
  common: 0.02,
  uncommon: 0.04,
  rare: 0.07,
  epic: 0.12,
  legendary: 0.20,
};

export const RARITY_HIRE_COST: Record<CommanderRarity, number> = {
  common: 10_000_000,
  uncommon: 50_000_000,
  rare: 250_000_000,
  epic: 1_500_000_000,
  legendary: 10_000_000_000,
};

const RARITY_WEIGHT: Record<CommanderRarity, number> = {
  common: 50, uncommon: 28, rare: 14, epic: 6, legendary: 2,
};

// ─── W8 — Leaders 2.0: levels & XP ──────────────────────────────────────────
// Levels 1-5, XP earned once per game-month from a productive assignment
// (see isAssignmentProductive/processCommanderMonthTick below). Level 1 is
// the baseline every commander starts at (hired or migrated) and grants NO
// extra magnitude — so an unleveled roster is numerically identical to the
// pre-W8 formula (backward-compatible with every existing save/test). Each
// level ABOVE 1 adds +1 percentage point of magnitude, capped at level 5
// (+4pp — e.g. a level-5 legendary commander effectively runs at 24%
// instead of 20%). This stays inside BALANCE.md's stacking-cap design: the
// 0.88^n diminishing-returns curve still applies on top, so the theoretical
// roster ceiling grows modestly (+4pp per commander, not per class) rather
// than breaking the documented "+120% ceiling" cap.
export const MAX_LEVEL = 5;
/** Cumulative XP required to BE at level (index+1). */
export const LEVEL_XP_THRESHOLDS: number[] = [0, 3, 8, 16, 28];
export const LEVEL_MAGNITUDE_BONUS_PER_LEVEL = 0.01;
/** Flat XP awarded once per game-month to an assigned commander whose post
 *  is producing real output this month (see isAssignmentProductive). */
export const XP_PER_MONTH_ASSIGNED = 1;

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return Math.min(MAX_LEVEL, level);
}

/** XP total required to reach the NEXT level, or null if already at max. */
export function getXpForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= MAX_LEVEL) return null;
  return LEVEL_XP_THRESHOLDS[currentLevel];
}

export interface CommanderXpProgress {
  level: number;
  xp: number;
  xpForNextLevel: number | null;
  pctToNextLevel: number; // 0-1, 1 at max level
}

export function getCommanderXpProgress(h: HiredCommander): CommanderXpProgress {
  const xp = h.xp || 0;
  const level = Math.min(MAX_LEVEL, Math.max(1, h.level ?? getLevelFromXp(xp)));
  if (level >= MAX_LEVEL) {
    return { level, xp, xpForNextLevel: null, pctToNextLevel: 1 };
  }
  const floor = LEVEL_XP_THRESHOLDS[level - 1];
  const ceiling = LEVEL_XP_THRESHOLDS[level];
  const pct = ceiling > floor ? Math.max(0, Math.min(1, (xp - floor) / (ceiling - floor))) : 1;
  return { level, xp, xpForNextLevel: ceiling, pctToNextLevel: pct };
}

/** Effective per-commander bonus magnitude: rarity base + level scaling. */
function effectiveMagnitude(def: CommanderDefinition, h: HiredCommander): number {
  const level = Math.min(MAX_LEVEL, Math.max(1, h.level ?? getLevelFromXp(h.xp || 0)));
  return RARITY_MAGNITUDE[def.rarity] + (level - 1) * LEVEL_MAGNITUDE_BONUS_PER_LEVEL;
}

export const RARITY_LABEL: Record<CommanderRarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

export const RARITY_ACCENT: Record<CommanderRarity, { border: string; text: string; glow: string }> = {
  common:    { border: 'border-slate-500/30',  text: 'text-slate-300',  glow: 'shadow-slate-500/20' },
  uncommon:  { border: 'border-emerald-500/40', text: 'text-emerald-300', glow: 'shadow-emerald-500/30' },
  rare:      { border: 'border-sky-500/40',     text: 'text-sky-300',    glow: 'shadow-sky-500/30' },
  epic:      { border: 'border-purple-500/50',  text: 'text-purple-300', glow: 'shadow-purple-500/40' },
  legendary: { border: 'border-amber-500/60',   text: 'text-amber-300',  glow: 'shadow-amber-500/50' },
};

export const CLASS_LABEL: Record<CommanderClass, string> = {
  diplomat: 'Diplomat',
  engineer: 'Engineer',
  scientist: 'Scientist',
  logistician: 'Logistician',
  magnate: 'Magnate',
  commander: 'Commander',
};

export function getClassBonusText(cls: CommanderClass, rarity: CommanderRarity): string {
  const pct = Math.round(RARITY_MAGNITUDE[rarity] * 100);
  switch (cls) {
    case 'diplomat':    return `+${pct}% service revenue`;
    case 'engineer':    return `+${pct}% construction speed`;
    case 'scientist':   return `+${pct}% research speed`;
    case 'logistician': return `+${pct}% mining yield`;
    case 'magnate':     return `+${pct}% trade & service revenue`;
    case 'commander':   return `+${pct}% global revenue`;
  }
}

// ─── W8 — Leaders 2.0: specialty & quirk traits ─────────────────────────────
// Two traits per leader, assigned DETERMINISTICALLY from the commander's id
// (no stored state — recomputed identically every time from definitionId,
// stable across saves and reloads). Every bonus field here is one of the
// REAL, already-consumed hooks: the 5 CommanderBonuses fields wired in
// game-engine.ts since Wave 5, plus the 4 W1 research-effect fields
// (travelSpeedBonus/insuranceDiscountBonus/hazardResistanceBonus/
// crewMoraleBonus) that are already consumed at their own game-engine.ts
// call sites — no new engine plumbing, only a sibling additive term at
// each existing site. Trait bonuses are LIVE only while the commander is
// assigned to a currently-productive post (isAssignmentProductive) — an
// unassigned roster (every pre-W8 save/test) contributes exactly zero
// trait bonus, so nothing here changes existing numbers retroactively.

export type TraitBonusField =
  | 'revenueMultiplier' | 'buildSpeedMultiplier' | 'researchSpeedMultiplier'
  | 'miningMultiplier' | 'marketPriceMultiplier'
  | 'travelSpeedBonus' | 'insuranceDiscountBonus' | 'hazardResistanceBonus' | 'crewMoraleBonus';

export interface TraitDef {
  id: string;
  name: string;
  description: string;
  bonuses: Partial<Record<TraitBonusField, number>>;
}

/** Specialty traits — a small themed bonus in one real hook. */
export const SPECIALTY_TRAITS: TraitDef[] = [
  { id: 'astrobiologist', name: 'Astrobiologist', description: 'Trained in agnostic life-detection chemistry — ocean-world and sample-return science moves faster under their review.', bonuses: { researchSpeedMultiplier: 0.03 } },
  { id: 'propulsion_specialist', name: 'Propulsion Specialist', description: 'Knows every delta-v budget by heart; shaves real time off every transit while posted.', bonuses: { travelSpeedBonus: 0.03 } },
  { id: 'risk_officer', name: 'Risk Officer', description: 'Runs the contingency plan nobody else thinks to run — hazards do less damage on their watch.', bonuses: { hazardResistanceBonus: 0.03 } },
  { id: 'planetary_geologist', name: 'Planetary Geologist', description: 'Reads a core sample like a book — extraction yields improve wherever they are posted.', bonuses: { miningMultiplier: 0.03 } },
  { id: 'flight_director', name: 'Flight Director', description: 'Calm on the console during a launch-abort call — hazard exposure drops under their oversight.', bonuses: { hazardResistanceBonus: 0.03 } },
  { id: 'radiation_physiologist', name: 'Radiation Physiologist', description: 'Keeps dose limits honest and crews healthy on long-duration posts.', bonuses: { crewMoraleBonus: 0.03 } },
  { id: 'underwriting_analyst', name: 'Underwriting Analyst', description: 'Prices risk better than the actuaries — premiums shrink under their desk.', bonuses: { insuranceDiscountBonus: 0.03 } },
  { id: 'structural_engineer', name: 'Structural Engineer', description: 'Tight tolerances, faster builds, no rework.', bonuses: { buildSpeedMultiplier: 0.03 } },
  { id: 'market_analyst', name: 'Market Analyst', description: 'Reads order books like weather fronts — better prices follow them.', bonuses: { marketPriceMultiplier: 0.03 } },
  { id: 'fleet_logistics_officer', name: 'Fleet Logistics Officer', description: 'Keeps haulers loaded and moving — less idle capacity, more revenue.', bonuses: { revenueMultiplier: 0.03 } },
  { id: 'mission_designer', name: 'Mission Designer', description: 'Trims fat from every program plan — contracts and services run leaner.', bonuses: { researchSpeedMultiplier: 0.02 } },
  { id: 'cryogenics_engineer', name: 'Cryogenics Engineer', description: 'Long-duration hardware that just works — transit margins improve.', bonuses: { travelSpeedBonus: 0.02 } },
  { id: 'guidance_navigation_engineer', name: 'Guidance & Navigation Engineer', description: 'Tighter trajectories, fewer correction burns.', bonuses: { travelSpeedBonus: 0.02 } },
];

/** Quirk traits — flavor plus a REAL tradeoff (one field up, one down).
 *  Visible at hire (not revealed on level-up, unlike Stellaris) so the
 *  choice to hire/assign stays an informed economic decision. */
export const QUIRK_TRAITS: TraitDef[] = [
  { id: 'publicity_hound', name: 'Publicity Hound', description: 'Loves the spotlight — great for the top line, but rivals read the same press releases.', bonuses: { revenueMultiplier: 0.02, marketPriceMultiplier: -0.01 } },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Nothing ships until it is right — research quality is high, construction schedules slip.', bonuses: { researchSpeedMultiplier: 0.02, buildSpeedMultiplier: -0.02 } },
  { id: 'union_favorite', name: 'Union Favorite', description: 'The crew trusts them completely — morale runs high, payroll efficiency is not their concern.', bonuses: { crewMoraleBonus: 0.02, revenueMultiplier: -0.01 } },
  { id: 'workaholic', name: 'Workaholic', description: 'First in, last out — builds move fast, but the burnout shows in crew morale.', bonuses: { buildSpeedMultiplier: 0.03, crewMoraleBonus: -0.02 } },
  { id: 'risk_taker', name: 'Risk Taker', description: 'Pushes every launch window to the edge — fast, but more exposed to hazards.', bonuses: { travelSpeedBonus: 0.03, hazardResistanceBonus: -0.02 } },
  { id: 'cautious_planner', name: 'Cautious Planner', description: 'Triple-checks everything — safer, but slower off the pad.', bonuses: { hazardResistanceBonus: 0.02, travelSpeedBonus: -0.02 } },
  { id: 'penny_pincher', name: 'Penny Pincher', description: 'Squeezes every policy for a better rate — but haggles away goodwill on the trade desk.', bonuses: { insuranceDiscountBonus: 0.03, marketPriceMultiplier: -0.01 } },
  { id: 'networker', name: 'Networker', description: 'Knows a buyer for everything — but spreads focus thin on the research bench.', bonuses: { marketPriceMultiplier: 0.02, researchSpeedMultiplier: -0.01 } },
];

/** Deterministic per-commander trait pair, seeded from definitionId. Pure —
 *  no state, no persistence; identical result every call, every save. */
export function getCommanderTraits(definitionId: string): { specialty: TraitDef; quirk: TraitDef } {
  const seed = hashStringToSeed(definitionId);
  const rng = mulberry32(seed);
  const specialty = SPECIALTY_TRAITS[Math.floor(rng() * SPECIALTY_TRAITS.length) % SPECIALTY_TRAITS.length];
  const quirk = QUIRK_TRAITS[Math.floor(rng() * QUIRK_TRAITS.length) % QUIRK_TRAITS.length];
  return { specialty, quirk };
}

// ─── Commander Roster (80 entries: 60 original + 20 W8 science/eng leaders) ─
// Matches portrait files at /public/game/commander-{id}.webp for entries
// with hasPortrait !== false. Legendary rarity = has a fullbody hero render
// at commander-fullbody-{id}.webp.
//
// W8 no-combat tone pass: renamed ~12 combat-flavored names/titles to
// economic/exploration tone per CLAUDE.md's no-PvP-combat invariant and
// docs/4X_BASELINE_2026-08.md Part 2d. IDs are UNCHANGED (portrait
// filenames and save-file references key on id) — only display name/title
// changed. Lore-named entries (Siege Volkov, Iron Mara — both in
// docs/LORE.md) keep their names for lore consistency; only their titles
// were softened.

export const COMMANDER_DEFS: CommanderDefinition[] = [
  // ── COMMON (15) ─────────────────────────────────────────────────────
  { id: 'rookie-alpha',       name: 'Rookie Alpha',       title: 'Fresh Recruit',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'rookie-beta',        name: 'Rookie Beta',        title: 'Fresh Recruit',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'cadet-delta',        name: 'Cadet Delta',        title: 'Academy Graduate',     class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'cadet-gamma',        name: 'Cadet Gamma',        title: 'Academy Graduate',     class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'grunt',              name: 'Grunt',              title: 'Deployment Hand',      class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'sparks',             name: 'Sparks',             title: 'Apprentice Engineer',  class: 'engineer',    rarity: 'common',   hasFullbody: false },
  { id: 'ember',              name: 'Ember',              title: 'Systems Tech',         class: 'engineer',    rarity: 'common',   hasFullbody: false },
  { id: 'digger',             name: 'Digger',             title: 'Junior Miner',         class: 'logistician', rarity: 'common',   hasFullbody: false },
  { id: 'ore-hound',          name: 'Ore Hound',          title: 'Prospector Scout',     class: 'logistician', rarity: 'common',   hasFullbody: false },
  { id: 'reyes',              name: 'Reyes',              title: 'Pit Trader',           class: 'magnate',     rarity: 'common',   hasFullbody: false },
  { id: 'hawk',               name: 'Hawk',               title: 'Security Lead',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'viper',              name: 'Viper',              title: 'Field Coordinator',    class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'sentry',             name: 'Sentry',             title: 'Facility Sentry',      class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'gunner-holt',        name: 'Foreman Holt',       title: 'Fabrication Specialist', class: 'commander', rarity: 'common',   hasFullbody: false },
  { id: 'supply-chief-ross',  name: 'Supply Chief Ross',  title: 'Quartermaster',        class: 'logistician', rarity: 'common',   hasFullbody: false },

  // ── UNCOMMON (15) ───────────────────────────────────────────────────
  { id: 'ratchet',            name: 'Ratchet',            title: 'Field Mechanic',       class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'medic-kai',          name: 'Medic Kai',          title: 'Crew Medic',           class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'striker',            name: 'Striker',            title: 'Rapid Response Lead',  class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'siege-volkov',       name: 'Siege Volkov',       title: 'Logistics Contractor', class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'gladiator-rex',      name: 'Champion Rex',       title: 'Production Champion',  class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'iron-mara',          name: 'Iron Mara',          title: 'Guild Speaker',        class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'prospector-jin',     name: 'Prospector Jin',     title: 'Deep-Belt Miner',      class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'surveyor',           name: 'Surveyor',           title: 'Orbital Cartographer', class: 'scientist',   rarity: 'uncommon', hasFullbody: false },
  { id: 'kira-deepvein',      name: 'Kira Deepvein',      title: 'Vein Specialist',      class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'tech-nova',          name: 'Tech Nova',          title: 'R&D Engineer',         class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'foreman-brick',      name: 'Foreman Brick',      title: 'Site Supervisor',      class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'elena-ward',         name: 'Elena Ward',         title: 'Structural Engineer',  class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'beastmaster-luna',   name: 'Beastmaster Luna',   title: 'Fleet Handler',        class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'shadow-weaver',      name: 'Shadow Weaver',      title: 'Corporate Intelligence Lead', class: 'commander', rarity: 'uncommon', hasFullbody: false },
  { id: 'phantom-wraith',     name: 'Phantom Wraith',     title: 'Reconnaissance Specialist',   class: 'commander', rarity: 'uncommon', hasFullbody: false },

  // ── RARE (12) ───────────────────────────────────────────────────────
  { id: 'warden-cole',        name: 'Warden Cole',        title: 'Corridor Warden',      class: 'commander',   rarity: 'rare',     hasFullbody: false },
  { id: 'pilot-jax',          name: 'Pilot Jax',          title: 'Ace Pilot',            class: 'logistician', rarity: 'rare',     hasFullbody: false },
  { id: 'ambassador-thane',   name: 'Ambassador Thane',   title: 'Senior Envoy',         class: 'diplomat',    rarity: 'rare',     hasFullbody: false },
  { id: 'ambassador-vale',    name: 'Ambassador Vale',    title: 'Colonial Envoy',       class: 'diplomat',    rarity: 'rare',     hasFullbody: false },
  { id: 'chief-patel',        name: 'Chief Patel',        title: 'Chief of Operations',  class: 'diplomat',    rarity: 'rare',     hasFullbody: false },
  { id: 'lt-frost',           name: 'Lt. Frost',          title: 'Executive Officer',    class: 'diplomat',    rarity: 'rare',     hasFullbody: false },
  { id: 'marcus-stellaris',   name: 'Marcus Stellaris',   title: 'Guild Negotiator',     class: 'diplomat',    rarity: 'rare',     hasFullbody: false },
  { id: 'hauler-grim',        name: 'Hauler Grim',        title: 'Long-Haul Captain',    class: 'logistician', rarity: 'rare',     hasFullbody: false },
  { id: 'navigator-sol',      name: 'Navigator Sol',      title: 'Master Navigator',     class: 'logistician', rarity: 'rare',     hasFullbody: false },
  { id: 'magnate-zara',       name: 'Magnate Zara',       title: 'Market Maker',         class: 'magnate',     rarity: 'rare',     hasFullbody: false },
  { id: 'merchant-prince',    name: 'Merchant Prince',    title: 'Trade Royalty',        class: 'magnate',     rarity: 'rare',     hasFullbody: false },
  { id: 'blackjack',          name: 'Blackjack',          title: 'Black Market Fixer',   class: 'magnate',     rarity: 'rare',     hasFullbody: false },

  // ── EPIC (8) ────────────────────────────────────────────────────────
  { id: 'marshal-kai',        name: 'Marshal Kai',        title: 'Sector Marshal',       class: 'diplomat',    rarity: 'epic',     hasFullbody: false },
  { id: 'baroness-storm',     name: 'Baroness Storm',     title: 'House Baroness',       class: 'diplomat',    rarity: 'epic',     hasFullbody: false },
  { id: 'professor-quark',    name: 'Professor Quark',    title: 'Theoretician',         class: 'scientist',   rarity: 'epic',     hasFullbody: false },
  { id: 'sage',               name: 'Sage',               title: 'Research Director',    class: 'scientist',   rarity: 'epic',     hasFullbody: false },
  { id: 'overseer-magna',     name: 'Overseer Magna',     title: 'Industrial Overseer',  class: 'magnate',     rarity: 'epic',     hasFullbody: false },
  { id: 'warlord-titan',      name: 'Dockmaster Titan',   title: 'Dockmaster',           class: 'commander',   rarity: 'epic',     hasFullbody: false },
  { id: 'dr-vale',            name: 'Dr. Vale',           title: 'Principal Researcher', class: 'scientist',   rarity: 'epic',     hasFullbody: false },
  { id: 'alchemist-nora',     name: 'Alchemist Nora',     title: 'Materials Alchemist',  class: 'scientist',   rarity: 'epic',     hasFullbody: false },

  // ── LEGENDARY (10, fullbody art) ────────────────────────────────────
  { id: 'aria-solaris',       name: 'Aria Solaris',       title: 'Solar Magnate',        class: 'magnate',     rarity: 'legendary', hasFullbody: true },
  { id: 'lyra-chen',          name: 'Lyra Chen',          title: 'Fleet Admiral',        class: 'commander',   rarity: 'legendary', hasFullbody: true },
  { id: 'nova-blitz',         name: 'Nova Blitz',         title: 'Shock Commander',      class: 'commander',   rarity: 'legendary', hasFullbody: true },
  { id: 'orion-vex',          name: 'Orion Vex',          title: 'Grand Strategist',     class: 'commander',   rarity: 'legendary', hasFullbody: true },
  { id: 'rex-ironhide',       name: 'Rex Ironhide',       title: 'Iron Warlord',         class: 'commander',   rarity: 'legendary', hasFullbody: true },
  { id: 'the-nomad',          name: 'The Nomad',          title: 'Wanderer Captain',     class: 'logistician', rarity: 'legendary', hasFullbody: true },
  { id: 'valeria-starforge',  name: 'Valeria Starforge',  title: 'Master Architect',     class: 'engineer',    rarity: 'legendary', hasFullbody: true },
  { id: 'warchief-kraal',     name: 'Warchief Kraal',     title: 'Legion Warchief',      class: 'commander',   rarity: 'legendary', hasFullbody: true },
  { id: 'zahn-eclipse',       name: 'Zahn Eclipse',       title: 'Grand Theorist',       class: 'scientist',   rarity: 'legendary', hasFullbody: true },
  { id: 'zero',               name: 'Zero',               title: 'The Unknown',          class: 'commander',   rarity: 'legendary', hasFullbody: true },

  // ── W8 — SCIENTIST/ENGINEER LEADERS (20, no unique portrait art yet — ──
  // text-avatar fallback; see hasPortraitArt()/CommanderPanel and the
  // Part 3 asset-gap note below). Fills the two science posts (research
  // directorate, science program) alongside the existing scientist/engineer
  // classed commanders (Surveyor, Tech Nova, Professor Quark, Dr. Vale...).
  // COMMON (8)
  { id: 'dr-solene-marchetti', name: 'Dr. Solene Marchetti', title: 'Astrobiologist',                 class: 'scientist', rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'amara-reyes-voss',    name: 'Amara Reyes-Voss',     title: 'Radiation Physiologist',          class: 'scientist', rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'mikael-fenn',         name: 'Mikael Fenn',          title: 'Seismologist',                    class: 'scientist', rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'sofia-baptiste',      name: 'Sofia Baptiste',       title: 'Data Scientist',                  class: 'scientist', rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'beatrix-solheim',     name: 'Beatrix Solheim',      title: 'Structural Engineer',             class: 'engineer',  rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'desmond-ochieng',     name: 'Desmond Ochieng',      title: 'Avionics Engineer',               class: 'engineer',  rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'fenwick-atara',       name: 'Fenwick Atara',        title: 'Robotics Engineer',               class: 'engineer',  rarity: 'common',   hasFullbody: false, hasPortrait: false },
  { id: 'callum-ridgeway',     name: 'Callum Ridgeway',      title: 'Thermal Systems Engineer',        class: 'engineer',  rarity: 'common',   hasFullbody: false, hasPortrait: false },
  // UNCOMMON (7)
  { id: 'dr-kenji-osei',       name: 'Dr. Kenji Osei',       title: 'Heliophysicist',                  class: 'scientist', rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'dr-priya-nandakumar', name: 'Dr. Priya Nandakumar', title: 'Planetary Geologist',             class: 'scientist', rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'dr-inez-castellan',   name: 'Dr. Inez Castellan',   title: 'Mission Designer',                class: 'scientist', rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'tomas-vireo',         name: 'Tomas Vireo',          title: 'Cryobot Engineer',                class: 'engineer',  rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'omar-delacroix',      name: 'Omar Delacroix',       title: 'Flight Director',                 class: 'engineer',  rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'dr-lena-brandt',      name: 'Dr. Lena Brandt',      title: 'Guidance & Navigation Engineer',  class: 'engineer',  rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  { id: 'dr-satomi-kwon',      name: 'Dr. Satomi Kwon',      title: 'Systems Integration Engineer',    class: 'engineer',  rarity: 'uncommon', hasFullbody: false, hasPortrait: false },
  // RARE (5)
  { id: 'dr-elias-thorne',     name: 'Dr. Elias Thorne',     title: 'Spectroscopist',                  class: 'scientist', rarity: 'rare',     hasFullbody: false, hasPortrait: false },
  { id: 'dr-yuki-tanaka',      name: 'Dr. Yuki Tanaka',      title: 'Xenochemist',                     class: 'scientist', rarity: 'rare',     hasFullbody: false, hasPortrait: false },
  { id: 'dr-rowan-achterberg', name: 'Dr. Rowan Achterberg', title: 'Planetary Protection Officer',    class: 'scientist', rarity: 'rare',     hasFullbody: false, hasPortrait: false },
  { id: 'dr-hana-lindqvist',   name: 'Dr. Hana Lindqvist',   title: 'Propulsion Engineer',             class: 'engineer',  rarity: 'rare',     hasFullbody: false, hasPortrait: false },
  { id: 'dr-noor-abbasi',      name: 'Dr. Noor Abbasi',      title: 'Life-Support Engineer',           class: 'engineer',  rarity: 'rare',     hasFullbody: false, hasPortrait: false },
];

export const COMMANDER_MAP = new Map(COMMANDER_DEFS.map(c => [c.id, c]));

/** W8 asset-gap note (Part 3 of the 4X baseline doc): the 20 leaders above
 *  have no unique portrait art — /public/game/commander-{id}.webp does not
 *  exist for them. hasPortraitArt() is the UI contract: false means render
 *  a text-avatar (initials) fallback instead of requesting the (404ing)
 *  portrait. Flagged for the Part 3 asset-generation wave (~20 "Scientist/
 *  engineer leader portraits" is already an itemized gap in that plan). */
export function hasPortraitArt(def: CommanderDefinition): boolean {
  return def.hasPortrait !== false;
}

export function getPortraitUrl(def: CommanderDefinition): string {
  return `/game/commander-${def.id}.webp`;
}

export function getFullbodyUrl(def: CommanderDefinition): string | null {
  return def.hasFullbody ? `/game/commander-fullbody-${def.id}.webp` : null;
}

/** Hire cap scales with corporation tier: base 3 at tier 1, up to 9 at tier 7. */
export function getHireCap(state: GameState): number {
  return 2 + (state.corporationTier || 1);
}

/**
 * Per-class diminishing-returns multiplier on commander bonus stacking.
 * Each additional commander in the same class contributes at 88% of the
 * previous one. Prevents a 9-legendary all-commander roster from reaching
 * +180% global revenue.
 *
 *  1st commander of class: 100%
 *  2nd: 88%
 *  3rd: 77%
 *  5th: 60%
 *  9th: 36%
 *
 * Rationale: one expert diplomat negotiates better than you; a second helps
 * somewhat; a ninth is just overhead arguing amongst themselves.
 */
function stackingContribution(positionInClass: number): number {
  return Math.pow(0.88, Math.max(0, positionInClass));
}

/** W8 — is this commander's current assignment producing real output right
 *  now? Deterministic: reads existing state fields only, never RNG. Used
 *  both to gate monthly XP accrual and to gate whether trait bonuses are
 *  currently live (an assigned-but-idle post — e.g. governor of a zone
 *  that's still fine, or a research post with no matching active research —
 *  earns no XP and grants no trait bonus that tick). */
export function isAssignmentProductive(state: GameState, assignment: CommanderAssignment): boolean {
  switch (assignment.postType) {
    case 'research': {
      const cat1 = state.activeResearch ? RESEARCH_MAP.get(state.activeResearch.definitionId)?.category : undefined;
      const cat2 = state.activeResearch2 ? RESEARCH_MAP.get(state.activeResearch2.definitionId)?.category : undefined;
      return !!assignment.targetId && (cat1 === assignment.targetId || cat2 === assignment.targetId);
    }
    case 'science_program': {
      const inactivePhases = new Set(['completed', 'failed']);
      return (state.scienceMissions || []).some(m => m.programId === assignment.targetId && !inactivePhases.has(m.phase));
    }
    case 'expedition': {
      const inactivePhases = new Set(['completed', 'lost']);
      return (state.expeditions || []).some(e => e.id === assignment.targetId && !inactivePhases.has(e.phase));
    }
    case 'zone':
      return !!assignment.targetId && (state.unlockedLocations || []).includes(assignment.targetId);
    case 'fleet_ops':
      return (state.ships || []).some(s => s.isBuilt);
    case 'market_desk':
      return (state.activeServices || []).length > 0;
    default:
      return false;
  }
}

/** Per-field cap on the AGGREGATE trait-sourced contribution across the
 *  whole roster (separate, smaller pool than the class-bonus stacking cap
 *  in BALANCE.md — traits are flavor-scale, not a second progression axis). */
const TRAIT_BONUS_CAP = 0.15;

/** Compute combined bonuses from all hired commanders. Returns multipliers
 *  (1.0 = no bonus) for the 5 class-based fields, and additive point values
 *  (0 = no bonus) for the 4 W8 trait fields. `state`, if provided, unlocks
 *  level scaling display consistency and trait-bonus evaluation (traits
 *  require a currently-productive assignment, which needs full GameState to
 *  check against research/science/expedition/zone/fleet/market signals). If
 *  `state` is omitted (e.g. the server-side broker-fee path, which only has
 *  commander IDs, not full state), trait bonuses are skipped — class-based
 *  bonuses (including level scaling read off the HiredCommander records
 *  themselves) are unaffected. */
export function computeCommanderBonuses(hired: HiredCommander[] | undefined, state?: GameState): CommanderBonuses {
  const result: CommanderBonuses = {
    revenueMultiplier: 1.0,
    buildSpeedMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    miningMultiplier: 1.0,
    marketPriceMultiplier: 1.0,
    travelSpeedBonus: 0,
    insuranceDiscountBonus: 0,
    hazardResistanceBonus: 0,
    crewMoraleBonus: 0,
  };

  // Group by class and apply diminishing-returns stacking per class.
  const byClass = new Map<CommanderClass, { def: CommanderDefinition; hired: HiredCommander }[]>();
  for (const h of hired || []) {
    const def = COMMANDER_MAP.get(h.definitionId);
    if (!def) continue;
    byClass.set(def.class, [...(byClass.get(def.class) || []), { def, hired: h }]);
  }

  byClass.forEach((entries, cls) => {
    // Sort by rarity descending — the most powerful commander of each class
    // gets the full bonus, lesser commanders get progressively diminished
    // contributions. Prevents rarity-inversion from wasting legendaries.
    const rarityRank: Record<CommanderRarity, number> = {
      legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
    };
    const sorted = [...entries].sort((a, b) => rarityRank[b.def.rarity] - rarityRank[a.def.rarity]);

    for (let i = 0; i < sorted.length; i++) {
      const { def, hired: h } = sorted[i];
      // W8: level scaling. Level 1 (the default/migrated baseline) adds
      // nothing — see effectiveMagnitude — so an unleveled roster reproduces
      // the pre-W8 numbers exactly.
      const bonus = effectiveMagnitude(def, h) * stackingContribution(i);
      switch (cls) {
        case 'diplomat':    result.revenueMultiplier += bonus; break;
        case 'engineer':    result.buildSpeedMultiplier += bonus; break;
        case 'scientist':   result.researchSpeedMultiplier += bonus; break;
        case 'logistician': result.miningMultiplier += bonus; break;
        case 'magnate':     result.revenueMultiplier += bonus; result.marketPriceMultiplier += bonus; break;
        case 'commander':   result.revenueMultiplier += bonus; break;
      }
    }
  });

  // W8 — trait bonuses. Only counted for commanders currently assigned to a
  // productive post (see isAssignmentProductive); requires `state`. An
  // unassigned roster, or a call site that omits `state`, contributes
  // exactly zero here — numerically identical to the pre-W8 function.
  if (state) {
    const traitTotals: Partial<Record<TraitBonusField, number>> = {};
    for (const h of hired || []) {
      if (!h.assignment) continue;
      if (!isAssignmentProductive(state, h.assignment)) continue;
      const def = COMMANDER_MAP.get(h.definitionId);
      if (!def) continue;
      const { specialty, quirk } = getCommanderTraits(def.id);
      for (const [field, delta] of Object.entries(specialty.bonuses)) {
        traitTotals[field as TraitBonusField] = (traitTotals[field as TraitBonusField] || 0) + (delta as number);
      }
      for (const [field, delta] of Object.entries(quirk.bonuses)) {
        traitTotals[field as TraitBonusField] = (traitTotals[field as TraitBonusField] || 0) + (delta as number);
      }
    }
    const clamp = (v: number) => Math.max(-TRAIT_BONUS_CAP, Math.min(TRAIT_BONUS_CAP, v));
    result.revenueMultiplier += clamp(traitTotals.revenueMultiplier || 0);
    result.buildSpeedMultiplier += clamp(traitTotals.buildSpeedMultiplier || 0);
    result.researchSpeedMultiplier += clamp(traitTotals.researchSpeedMultiplier || 0);
    result.miningMultiplier += clamp(traitTotals.miningMultiplier || 0);
    result.marketPriceMultiplier += clamp(traitTotals.marketPriceMultiplier || 0);
    result.travelSpeedBonus += clamp(traitTotals.travelSpeedBonus || 0);
    result.insuranceDiscountBonus += clamp(traitTotals.insuranceDiscountBonus || 0);
    result.hazardResistanceBonus += clamp(traitTotals.hazardResistanceBonus || 0);
    result.crewMoraleBonus += clamp(traitTotals.crewMoraleBonus || 0);
  }

  return result;
}

/** W8 — monthly XP accrual for assigned commanders. Call once per
 *  game-month boundary from processFullTick (after ships/expeditions/
 *  science-missions have been ticked, so assignment targets reflect the
 *  month's real state). Deterministic: XP is a flat award gated on a real
 *  state signal, never RNG. Level is recomputed and cached alongside xp. */
export function processCommanderMonthTick(state: GameState): GameState {
  const hired = state.hiredCommanders || [];
  if (hired.length === 0) return state;
  let changed = false;
  const updated = hired.map(h => {
    if (!h.assignment) return h;
    if (!isAssignmentProductive(state, h.assignment)) return h;
    const xp = (h.xp || 0) + XP_PER_MONTH_ASSIGNED;
    const level = getLevelFromXp(xp);
    changed = true;
    return { ...h, xp, level };
  });
  if (!changed) return state;
  return { ...state, hiredCommanders: updated };
}

/** W8 — assign a hired commander to a post. No-op (returns state unchanged)
 *  if the commander isn't hired, the class can't hold that post, or a
 *  targeted post type is missing its target. */
export function assignCommander(
  state: GameState,
  defId: string,
  postType: AssignmentPostType,
  targetId?: string,
): GameState {
  const def = COMMANDER_MAP.get(defId);
  if (!def) return state;
  if (!canAssignToPost(def, postType)) return state;
  const needsTarget = postType === 'research' || postType === 'science_program' || postType === 'expedition' || postType === 'zone';
  if (needsTarget && !targetId) return state;

  const hired = state.hiredCommanders || [];
  const idx = hired.findIndex(h => h.definitionId === defId);
  if (idx === -1) return state;

  const updated = [...hired];
  updated[idx] = { ...updated[idx], assignment: { postType, targetId } };
  return { ...state, hiredCommanders: updated };
}

/** W8 — clear a hired commander's assignment. Any level already earned is
 *  kept (passive); only future XP accrual stops. */
export function unassignCommander(state: GameState, defId: string): GameState {
  const hired = state.hiredCommanders || [];
  const idx = hired.findIndex(h => h.definitionId === defId);
  if (idx === -1) return state;
  const updated = [...hired];
  updated[idx] = { ...updated[idx], assignment: null };
  return { ...state, hiredCommanders: updated };
}

// ─── Recruitment Pool ────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRarity(r: number): CommanderRarity {
  const total = Object.values(RARITY_WEIGHT).reduce((a, b) => a + b, 0);
  const target = r * total;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHT)) {
    cumulative += weight;
    if (target <= cumulative) return rarity as CommanderRarity;
  }
  return 'common';
}

/** Roll a deterministic recruitment pool of POOL_SIZE commanders from seed. */
export function rollRecruitmentPool(seed: number): string[] {
  const rng = mulberry32(seed);
  const pool: string[] = [];
  let safety = 0;
  while (pool.length < POOL_SIZE && safety++ < 100) {
    const rarity = pickRarity(rng());
    const candidates = COMMANDER_DEFS.filter(c => c.rarity === rarity && !pool.includes(c.id));
    if (candidates.length === 0) continue;
    pool.push(candidates[Math.floor(rng() * candidates.length)].id);
  }
  return pool;
}

/** Ensure pool exists and refresh if stale. Seed is bucketed per 8hr window so all clients converge. */
export function ensureFreshPool(state: GameState, now: number = Date.now()): CommanderPool {
  const existing = state.commanderPool;
  if (existing && now - existing.refreshedAtMs < POOL_REFRESH_MS) {
    return existing;
  }
  const bucket = Math.floor(now / POOL_REFRESH_MS);
  return {
    definitionIds: rollRecruitmentPool(bucket),
    refreshedAtMs: now,
  };
}

/** Check eligibility to hire. Returns { ok, reason? }. */
export function canHire(state: GameState, defId: string): { ok: boolean; reason?: string } {
  const def = COMMANDER_MAP.get(defId);
  if (!def) return { ok: false, reason: 'Unknown commander' };

  const hired = state.hiredCommanders || [];
  if (hired.some(h => h.definitionId === defId)) return { ok: false, reason: 'Already hired' };

  const cap = getHireCap(state);
  if (hired.length >= cap) return { ok: false, reason: `Hire cap reached (${cap})` };

  if (state.money < RARITY_HIRE_COST[def.rarity]) return { ok: false, reason: 'Not enough funds' };

  const unlocked = state.unlockedLocations.length;
  if (def.rarity === 'rare' && unlocked < 2) return { ok: false, reason: 'Unlock 2+ locations first' };
  if (def.rarity === 'epic' && unlocked < 4) return { ok: false, reason: 'Unlock 4+ locations first' };
  if (def.rarity === 'legendary') {
    const netWorth = state.money + state.totalEarned - state.totalSpent;
    if (netWorth < 10_000_000_000 || unlocked < 5) {
      return { ok: false, reason: 'Requires $10B net worth and 5+ locations' };
    }
  }
  return { ok: true };
}

/** Hire a commander if eligible. Returns updated state (unchanged if ineligible). */
export function hireCommander(state: GameState, defId: string, now: number = Date.now()): GameState {
  const def = COMMANDER_MAP.get(defId);
  if (!def) return state;
  const check = canHire(state, defId);
  if (!check.ok) return state;
  const cost = RARITY_HIRE_COST[def.rarity];
  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    hiredCommanders: [...(state.hiredCommanders || []), { definitionId: defId, hiredAtMs: now, xp: 0, level: 1, assignment: null }],
  };
}

/** Dismiss (fire) a hired commander. Returns updated state. */
export function dismissCommander(state: GameState, defId: string): GameState {
  return {
    ...state,
    hiredCommanders: (state.hiredCommanders || []).filter(h => h.definitionId !== defId),
  };
}
