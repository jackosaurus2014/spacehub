// ─── Space Tycoon: Commander System ─────────────────────────────────────────
// Hired commanders grant passive global bonuses. MVP scope: no assignment,
// no leveling — just hire → stack bonuses → apply in game-engine.

import type { GameState } from './types';

export type CommanderRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CommanderClass =
  | 'diplomat'     // +service revenue
  | 'engineer'     // +construction speed
  | 'scientist'    // +research speed
  | 'logistician'  // +mining yield
  | 'magnate'      // +market sell prices
  | 'commander';   // +global revenue (catchall)

export interface CommanderDefinition {
  id: string;
  name: string;
  title: string;
  class: CommanderClass;
  rarity: CommanderRarity;
  hasFullbody: boolean;
}

export interface HiredCommander {
  definitionId: string;
  hiredAtMs: number;
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

// ─── Commander Roster (60 entries) ───────────────────────────────────────────
// Matches portrait files at /public/game/commander-{id}.webp.
// Legendary rarity = has a fullbody hero render at commander-fullbody-{id}.webp.

export const COMMANDER_DEFS: CommanderDefinition[] = [
  // ── COMMON (15) ─────────────────────────────────────────────────────
  { id: 'rookie-alpha',       name: 'Rookie Alpha',       title: 'Fresh Recruit',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'rookie-beta',        name: 'Rookie Beta',        title: 'Fresh Recruit',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'cadet-delta',        name: 'Cadet Delta',        title: 'Academy Graduate',     class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'cadet-gamma',        name: 'Cadet Gamma',        title: 'Academy Graduate',     class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'grunt',              name: 'Grunt',              title: 'Frontline Operator',   class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'sparks',             name: 'Sparks',             title: 'Apprentice Engineer',  class: 'engineer',    rarity: 'common',   hasFullbody: false },
  { id: 'ember',              name: 'Ember',              title: 'Systems Tech',         class: 'engineer',    rarity: 'common',   hasFullbody: false },
  { id: 'digger',             name: 'Digger',             title: 'Junior Miner',         class: 'logistician', rarity: 'common',   hasFullbody: false },
  { id: 'ore-hound',          name: 'Ore Hound',          title: 'Prospector Scout',     class: 'logistician', rarity: 'common',   hasFullbody: false },
  { id: 'reyes',              name: 'Reyes',              title: 'Pit Trader',           class: 'magnate',     rarity: 'common',   hasFullbody: false },
  { id: 'hawk',               name: 'Hawk',               title: 'Security Lead',        class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'viper',              name: 'Viper',              title: 'Field Operative',      class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'sentry',             name: 'Sentry',             title: 'Watch Commander',      class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'gunner-holt',        name: 'Gunner Holt',        title: 'Weapons Specialist',   class: 'commander',   rarity: 'common',   hasFullbody: false },
  { id: 'supply-chief-ross',  name: 'Supply Chief Ross',  title: 'Quartermaster',        class: 'logistician', rarity: 'common',   hasFullbody: false },

  // ── UNCOMMON (15) ───────────────────────────────────────────────────
  { id: 'ratchet',            name: 'Ratchet',            title: 'Field Mechanic',       class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'medic-kai',          name: 'Medic Kai',          title: 'Combat Medic',         class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'striker',            name: 'Striker',            title: 'Strike Team Lead',     class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'siege-volkov',       name: 'Siege Volkov',       title: 'Heavy Ordnance',       class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'gladiator-rex',      name: 'Gladiator Rex',      title: 'Arena Champion',       class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'iron-mara',          name: 'Iron Mara',          title: 'Heavy Armor',          class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'prospector-jin',     name: 'Prospector Jin',     title: 'Deep-Belt Miner',      class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'surveyor',           name: 'Surveyor',           title: 'Orbital Cartographer', class: 'scientist',   rarity: 'uncommon', hasFullbody: false },
  { id: 'kira-deepvein',      name: 'Kira Deepvein',      title: 'Vein Specialist',      class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'tech-nova',          name: 'Tech Nova',          title: 'R&D Engineer',         class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'foreman-brick',      name: 'Foreman Brick',      title: 'Site Supervisor',      class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'elena-ward',         name: 'Elena Ward',         title: 'Structural Engineer',  class: 'engineer',    rarity: 'uncommon', hasFullbody: false },
  { id: 'beastmaster-luna',   name: 'Beastmaster Luna',   title: 'Fleet Handler',        class: 'logistician', rarity: 'uncommon', hasFullbody: false },
  { id: 'shadow-weaver',      name: 'Shadow Weaver',      title: 'Infiltration Lead',    class: 'commander',   rarity: 'uncommon', hasFullbody: false },
  { id: 'phantom-wraith',     name: 'Phantom Wraith',     title: 'Stealth Operative',    class: 'commander',   rarity: 'uncommon', hasFullbody: false },

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
  { id: 'warlord-titan',      name: 'Warlord Titan',      title: 'Warlord',              class: 'commander',   rarity: 'epic',     hasFullbody: false },
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
];

export const COMMANDER_MAP = new Map(COMMANDER_DEFS.map(c => [c.id, c]));

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

/** Compute combined bonuses from all hired commanders. Returns multipliers (1.0 = no bonus). */
export function computeCommanderBonuses(hired: HiredCommander[] | undefined): CommanderBonuses {
  const result: CommanderBonuses = {
    revenueMultiplier: 1.0,
    buildSpeedMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    miningMultiplier: 1.0,
    marketPriceMultiplier: 1.0,
  };

  // Group by class and apply diminishing-returns stacking per class.
  const byClass = new Map<CommanderClass, CommanderDefinition[]>();
  for (const h of hired || []) {
    const def = COMMANDER_MAP.get(h.definitionId);
    if (!def) continue;
    byClass.set(def.class, [...(byClass.get(def.class) || []), def]);
  }

  byClass.forEach((defs, cls) => {
    // Sort by rarity descending — the most powerful commander of each class
    // gets the full bonus, lesser commanders get progressively diminished
    // contributions. Prevents rarity-inversion from wasting legendaries.
    const rarityRank: Record<CommanderRarity, number> = {
      legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
    };
    const sorted = [...defs].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);

    for (let i = 0; i < sorted.length; i++) {
      const def = sorted[i];
      const bonus = RARITY_MAGNITUDE[def.rarity] * stackingContribution(i);
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

  return result;
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
    hiredCommanders: [...(state.hiredCommanders || []), { definitionId: defId, hiredAtMs: now }],
  };
}

/** Dismiss (fire) a hired commander. Returns updated state. */
export function dismissCommander(state: GameState, defId: string): GameState {
  return {
    ...state,
    hiredCommanders: (state.hiredCommanders || []).filter(h => h.definitionId !== defId),
  };
}
