// ─── Space Tycoon: the asteroid layer (Phase A, docs/SPACE_MINING_DESIGN_2026-09-12.md §3)
//
// Five asteroid FIELDS hang off existing locations as children — a field is
// a container, it never has a yield of its own, and it is never a lane-graph
// node: a ship "at a field" is at the field's parent location, the map and
// the lane graph do not change (§3 "Asteroid fields"). Each field holds
// ROCKS_PER_FIELD discrete, finite, individually surveyable rocks.
//
// What is PUBLIC (this module, deterministic per world epoch, identical on
// the client, the server and the seed script): a rock's id, name, field,
// spectral class (→ ore), its delta-v surcharge from the field's parent and
// a position seed for the map. What is HIDDEN until surveyed (§3
// "Asteroids"): grade, reserve and rubble risk. Those are rolled by
// `rollAsteroidIntel` with a SALT the seed script owns (ASTEROID_SEED_SALT
// on the server; local-only play uses LOCAL_INTEL_SALT), stored in the
// `Asteroid` table and revealed per corporation through the survey route —
// the client catalogue carries no grade, so reading the source reveals
// nothing worth knowing.
//
// Founder rulings 2026-09-12 (design doc §9): ore is a REAL intermediate
// (ORE_RESOURCE_BY_CLASS, resources.ts); unsurveyed rocks mine at
// UNSURVEYED_YIELD_MULT; claims expire after CLAIM_EXPIRY_GAME_MONTHS
// unworked (Phase B); survey probes are a purchasable consumable.
//
// Pure data + pure functions. No React, no DB.

import type { ResourceId } from './resources';
import { WORLD_EPOCH } from './world-reset';

export type AsteroidClass = 'C' | 'S' | 'M' | 'X';

export const ASTEROID_CLASS_LABEL: Readonly<Record<AsteroidClass, string>> = {
  C: 'C-type (carbonaceous)',
  S: 'S-type (silicate)',
  M: 'M-type (metallic)',
  X: 'X-type (exotic)',
};

/** Ore is a real intermediate resource (founder ruling 2026-09-12). The ids
 *  are fixed NOW so Phase C's refinery ratios never migrate a save. */
export type OreResourceId = 'ore_carbonaceous' | 'ore_silicate' | 'ore_metallic' | 'ore_exotic';

export const ORE_RESOURCE_BY_CLASS: Readonly<Record<AsteroidClass, OreResourceId>> = {
  C: 'ore_carbonaceous',
  S: 'ore_silicate',
  M: 'ore_metallic',
  X: 'ore_exotic',
};

export const ORE_RESOURCE_IDS: readonly OreResourceId[] = ['ore_carbonaceous', 'ore_silicate', 'ore_metallic', 'ore_exotic'];

export function isOreResource(id: string): id is OreResourceId {
  return (ORE_RESOURCE_IDS as readonly string[]).includes(id);
}

// ─── Constants (founder rulings + Phase A balance) ───────────────────────────

/** Rocks seeded per field (§3: "~40 per field"). */
export const ROCKS_PER_FIELD = 40;

/** Founder ruling 2026-09-12: an UNSURVEYED rock still mines, at about 15%
 *  of the surveyed rate. Applied on top of the field's public mean grade
 *  (never the rock's true grade — that would leak the survey). */
export const UNSURVEYED_YIELD_MULT = 0.15;

/** Founder ruling 2026-09-12: a claim lapses after three game-months
 *  unworked. Phase B (design doc §8) implements claims through
 *  exploration.ts stakeClaim and reads this constant.
 *  TODO(Phase B): enforce on the server's claim rows. */
export const CLAIM_EXPIRY_GAME_MONTHS = 3;

/** One-time-use survey probe (purchasable consumable, founder ruling). Priced
 *  against a near-Earth rock's monthly ore value (~$4-5M) so surveying is a
 *  real per-rock decision, not a rounding error. */
export const SURVEY_PROBE_COST = 6_000_000;
export const SURVEY_PROBE_MAX_PER_PURCHASE = 10;

/** Rubble/spin risk band (hidden until surveyed). Phase B's event cards
 *  read it; Phase A only reveals it. */
export const RISK_MIN = 0.05;
export const RISK_MAX = 0.65;

/** Ore is loose bulk on slow frames: it counts a fifth of its units against
 *  any hold in the freight fuel formula (cargo-logistics.ts getCargoLoadUnits,
 *  mining-orders.ts quoteLeg) — the tanker's TANKER_LIQUID_WEIGHT precedent,
 *  applied to every hull because the ore, not the hull, is what is bulk.
 *  Tuned 2026-09-12 with scripts/sim-mining.ts. */
export const ORE_LOAD_WEIGHT = 0.2;

/** A corporation's survey of one rock (GameState.asteroidIntel). Server
 *  truth is the AsteroidSurvey row; local-only play rolls its own. */
export interface SurveyRecord extends AsteroidIntel {
  surveyedAtMs: number;
  via: 'probe' | 'ship';
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export interface AsteroidField {
  id: string;
  name: string;
  /** The existing location the field hangs off. Ships travel HERE. */
  parentLocationId: string;
  description: string;
  /** Spectral class weights for the field's rocks (sum ≈ 1). */
  classMix: Record<AsteroidClass, number>;
  /** Mean extra delta-v (m/s) from the parent to a rock in this field; each
   *  rock varies ±40% (§3: "the easy ones go first"). */
  baseDeltaV: number;
  /** Public mean grade — what an unsurveyed rock is priced at. */
  meanGrade: number;
  /** Reserve range in ore units for a fresh rock. */
  reserveRange: [number, number];
  /** Frontier field (§6): guaranteed low-risk rocks and reachable without
   *  unlocking the parent location — the newcomer on-ramp. */
  frontier?: boolean;
  /** Minimum hull tier that can work this field (getFieldsForShipTier). */
  minShipTier: number;
}

export const ASTEROID_FIELDS: readonly AsteroidField[] = [
  {
    id: 'field_near_earth', name: 'Near-Earth Cluster', parentLocationId: 'lunar_orbit',
    description: 'Apollo and Amor group rocks parked in cislunar space. Low-risk, water-rich C-types — where every corporation learns to mine.',
    classMix: { C: 0.6, S: 0.35, M: 0.05, X: 0 },
    baseDeltaV: 1500, meanGrade: 0.8, reserveRange: [2_000, 8_000],
    frontier: true, minShipTier: 1,
  },
  {
    id: 'field_inner_belt', name: 'Inner Belt', parentLocationId: 'asteroid_belt',
    description: 'The 2.2 AU corridor. Silicate rubble piles by the hundred, the odd metallic core — and the Psyche-16 rush traffic.',
    classMix: { C: 0.35, S: 0.45, M: 0.18, X: 0.02 },
    baseDeltaV: 800, meanGrade: 1.0, reserveRange: [8_000, 30_000],
    minShipTier: 2,
  },
  {
    id: 'field_ceres', name: 'Ceres Approaches', parentLocationId: 'ceres_surface',
    description: 'The volatile-rich swarm around the belt\'s logistics capital. Water ice, ammonia, organics — and Ceres storage a short hop away.',
    classMix: { C: 0.6, S: 0.25, M: 0.12, X: 0.03 },
    baseDeltaV: 500, meanGrade: 1.05, reserveRange: [10_000, 40_000],
    minShipTier: 2,
  },
  {
    id: 'field_trojans', name: 'Jupiter Trojans', parentLocationId: 'jupiter_system',
    description: 'The L4/L5 swarms. Dark, primitive, enormous — and shot through with metallic cores nobody has claimed yet.',
    classMix: { C: 0.5, S: 0.2, M: 0.2, X: 0.1 },
    baseDeltaV: 1800, meanGrade: 1.15, reserveRange: [20_000, 80_000],
    minShipTier: 3,
  },
  {
    id: 'field_kuiper', name: 'Kuiper Fringe', parentLocationId: 'outer_system',
    description: 'Beyond Neptune. Exotic-bearing bodies at the edge of the heliosphere; the campaign-loop prize.',
    classMix: { C: 0.55, S: 0.05, M: 0.15, X: 0.25 },
    baseDeltaV: 2500, meanGrade: 1.3, reserveRange: [30_000, 120_000],
    minShipTier: 4,
  },
];

export const ASTEROID_FIELD_MAP: ReadonlyMap<string, AsteroidField> = new Map(ASTEROID_FIELDS.map(f => [f.id, f]));

const FIELDS_BY_PARENT: ReadonlyMap<string, AsteroidField[]> = (() => {
  const m = new Map<string, AsteroidField[]>();
  for (const f of ASTEROID_FIELDS) m.set(f.parentLocationId, [...(m.get(f.parentLocationId) || []), f]);
  return m;
})();

/** The location registry hook: fields are CHILDREN of existing locations. */
export function getFieldsAtLocation(locationId: string): AsteroidField[] {
  return FIELDS_BY_PARENT.get(locationId) || [];
}

/** Which fields a hull of `tier` may work (the existing miners' regional
 *  ladder — drones near Earth, the Deep Space Miner out past Jupiter). */
export function getFieldsForShipTier(tier: number): AsteroidField[] {
  return ASTEROID_FIELDS.filter(f => f.minShipTier <= tier);
}

// ─── Deterministic catalogue ─────────────────────────────────────────────────

/** mulberry32 — the same tiny PRNG exploration.ts uses. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit over a string. */
export function hashString(s: string): number {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface AsteroidRock {
  /** Stable id: `ast_<epoch>_<field short>_<index>` — the seed upserts on it. */
  id: string;
  epoch: number;
  fieldId: string;
  index: number;
  /** Catalogue-style name (`2091 KX-7`). */
  name: string;
  class: AsteroidClass;
  /** Extra delta-v (m/s) from the field's parent location to this rock. */
  deltaVExtra: number;
  /** 0-1: where the map draws it around the parent body. */
  positionSeed: number;
}

/** Hidden per-rock truth (server table / survey reveal). */
export interface AsteroidIntel {
  grade: number;
  reserve: number;
  risk: number;
}

const FIELD_SHORT: Readonly<Record<string, string>> = {
  field_near_earth: 'ne',
  field_inner_belt: 'ib',
  field_ceres: 'ce',
  field_trojans: 'tr',
  field_kuiper: 'ku',
};

const NAME_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function pickClass(mix: Record<AsteroidClass, number>, r: number): AsteroidClass {
  let acc = 0;
  for (const cls of ['C', 'S', 'M', 'X'] as const) {
    acc += mix[cls];
    if (r < acc) return cls;
  }
  return 'C';
}

export function rockIdFor(epoch: number, fieldId: string, index: number): string {
  return `ast_${epoch}_${FIELD_SHORT[fieldId] || fieldId}_${String(index).padStart(2, '0')}`;
}

/** The public catalogue for one field. Deterministic per (epoch, field). */
export function generateFieldRocks(field: AsteroidField, epoch: number = WORLD_EPOCH): AsteroidRock[] {
  const rng = mulberry32(hashString(`asteroids:${epoch}:${field.id}`));
  const out: AsteroidRock[] = [];
  for (let i = 1; i <= ROCKS_PER_FIELD; i++) {
    const cls = pickClass(field.classMix, rng());
    const year = 2088 + Math.floor(rng() * 40);
    const l1 = NAME_LETTERS[Math.floor(rng() * NAME_LETTERS.length)];
    const l2 = NAME_LETTERS[Math.floor(rng() * NAME_LETTERS.length)];
    const num = 1 + Math.floor(rng() * 99);
    const deltaVExtra = Math.round(field.baseDeltaV * (0.6 + rng() * 0.8));
    const positionSeed = rng();
    out.push({
      id: rockIdFor(epoch, field.id, i),
      epoch, fieldId: field.id, index: i,
      name: `${year} ${l1}${l2}-${num}`,
      class: cls,
      deltaVExtra,
      positionSeed,
    });
  }
  return out;
}

/** Every rock in every field for the epoch (5 × ROCKS_PER_FIELD). */
export function generateAsteroidCatalog(epoch: number = WORLD_EPOCH): AsteroidRock[] {
  return ASTEROID_FIELDS.flatMap(f => generateFieldRocks(f, epoch));
}

let catalogCache: { epoch: number; rocks: AsteroidRock[]; byId: Map<string, AsteroidRock> } | null = null;

export function getAsteroidCatalog(epoch: number = WORLD_EPOCH): AsteroidRock[] {
  if (!catalogCache || catalogCache.epoch !== epoch) {
    const rocks = generateAsteroidCatalog(epoch);
    catalogCache = { epoch, rocks, byId: new Map(rocks.map(r => [r.id, r])) };
  }
  return catalogCache.rocks;
}

export function getAsteroid(id: string, epoch: number = WORLD_EPOCH): AsteroidRock | undefined {
  getAsteroidCatalog(epoch);
  return catalogCache?.byId.get(id);
}

export function getRocksInField(fieldId: string, epoch: number = WORLD_EPOCH): AsteroidRock[] {
  return getAsteroidCatalog(epoch).filter(r => r.fieldId === fieldId);
}

/** Salt for local-only play (no server profile). The server's salt is
 *  ASTEROID_SEED_SALT, read only by scripts/seed-asteroids.ts. */
export const LOCAL_INTEL_SALT = 'local';

/**
 * The hidden truth for a rock: grade 0.3–1.5 around the field mean, reserve
 * in the field's range, risk in [RISK_MIN, RISK_MAX] (Frontier fields cap
 * risk at 0.2 — §6 "guaranteed low-risk"). Deterministic in (rock, salt).
 */
export function rollAsteroidIntel(rock: AsteroidRock, salt: string): AsteroidIntel {
  const field = ASTEROID_FIELD_MAP.get(rock.fieldId);
  const rng = mulberry32(hashString(`intel:${salt}:${rock.id}`));
  const meanGrade = field?.meanGrade ?? 1.0;
  // Triangular-ish spread around the mean, clamped to the doc's 0.3–1.5.
  const spread = (rng() + rng() - 1) * 0.6;
  const grade = Math.round(Math.max(0.3, Math.min(1.5, meanGrade + spread)) * 100) / 100;
  const [lo, hi] = field?.reserveRange ?? [5_000, 20_000];
  const reserve = Math.round(lo + rng() * (hi - lo));
  const riskCap = field?.frontier ? 0.2 : RISK_MAX;
  const risk = Math.round(Math.max(RISK_MIN, Math.min(riskCap, RISK_MIN + rng() * (riskCap - RISK_MIN))) * 100) / 100;
  return { grade, reserve, risk };
}

export function oreForRock(rock: Pick<AsteroidRock, 'class'>): ResourceId {
  return ORE_RESOURCE_BY_CLASS[rock.class];
}
