// ─── Space Tycoon: Heritage Corporations (site→game integration) ───────────
// Real space-industry unicorns tracked on SpaceNexus (CompanyProfile,
// valuation >= $1B, private) spawn lore-safe "Heritage Corporation" NPC
// flavor entries. These are DISPLAY-FIRST: a "Heritage Registry" the player
// can browse (see HeritageRegistryPanel.tsx), not new participants in the
// tick-driven NPC economic backdrop (src/lib/game/npc-engine.ts).
//
// Determinism contract: every function here is a pure function of its
// inputs. No Date.now(), no Math.random() — outcomes are derived with the
// same mulberry32(hashStringToSeed(...)) convention used elsewhere in the
// engine (formulas.ts, exploration.ts, hazards.ts, narrative-events.ts), so
// the SAME CompanyProfile row always produces the SAME Heritage Corporation
// for every player, every session.
//
// Lore safety (docs/LORE.md "Corporate Naming Conventions" + "What this
// document is not"): NPC names are invented 22nd-century charters, never the
// real trademark. The real company is credited transparently in the
// dossier's `realCompanyName` / `realCompanyHref` / `charterAncestorLine` —
// which is the ONLY place real facts appear, and only facts pulled straight
// from the DB row passed in (never fabricated).

import { mulberry32, hashStringToSeed } from './formulas';

// ─── Public types ────────────────────────────────────────────────────────

/** Plain-data input for one real, private, $1B+ CompanyProfile row. Callers
 *  (the API route) are responsible for the Prisma query; this module never
 *  touches the database, which keeps it trivially unit-testable. */
export interface HeritageCompanyInput {
  slug: string;
  name: string;
  /** Raw USD (CompanyProfile.valuation units — see company-roster.ts). */
  valuationUsd: number;
  /** Legacy snake_case focus areas, e.g. via company-roster.ts#deriveFocusAreas. */
  focusAreas: string[];
  foundedYear: number | null;
  /** Aggregate total funding in raw USD (CompanyProfile.totalFunding). */
  totalFundingUsd: number | null;
  /** Most recent round's series label, e.g. "Series D". */
  lastFundingRound: string | null;
  /** Most recent round's date. */
  lastFundingDate: Date | string | null;
  /** Most recent round's amount in raw USD (FundingRound.amount). */
  lastFundingAmountUsd: number | null;
}

export interface HeritageDossier {
  /** The real company as tracked on SpaceNexus — the only place a real
   *  trademark appears. */
  realCompanyName: string;
  /** Link back to the real company's profile page. */
  realCompanyHref: string;
  /** Lore-safe "descended from" flavor text. Never a real name. */
  blurb: string;
  /** One honest, DB-sourced fact line. Never fabricated. */
  charterAncestorLine: string;
}

export interface HeritageNPC {
  id: string;
  name: string;
  tierLabel: string;
  /** 1 (smallest tracked unicorn) .. 5 (largest). Mirrors the scale used by
   *  npc-companies.ts#getNPCTitle without reusing its tier field, since
   *  Heritage Corporations are not NPCCompanyState / not tick-driven. */
  tier: number;
  valuationBillions: number;
  sectorTraits: string[];
  dossier: HeritageDossier;
}

// ─── Name generation (lore-consistent parts, docs/LORE.md naming table) ────
// Deliberately mixes "Independent/unaligned" (founder-name/aspirational),
// "Dominion-aligned" (imperial suffixes), and "Syndicate-aligned" (mercantile)
// conventions — Heritage Corporations are unaligned Accord-signatory
// descendants, not faction-owned, so a blended palette reads as "generic
// 22nd-century commerce" rather than any one faction's house style.

const NAME_PREFIXES = [
  'Halcyon', 'Meridian', 'Corvant', 'Ashgrave', 'Wyndrift', 'Solvane',
  'Ironvale', 'Aetherun', 'Kestrel', 'Vantage', 'Duskmere', 'Starforge',
  'Novaquist', 'Emberlyn', 'Frostholt', 'Gravemark', 'Highspire', 'Ravenholt',
  'Thornfield', 'Voidmere', 'Zenithra', 'Lumavere', 'Cindergate', 'Farrow',
  'Obsidian', 'Aurelia', 'Brackwell', 'Cascadia', 'Driftlock', 'Everline',
] as const;

const NAME_SUFFIXES = [
  'Dynamics', 'Industries', 'Systems', 'Holdings', 'Ventures', 'Prospecting',
  'Capital', 'Logistics', 'Mercantile', 'Concern', 'Consortium', 'Aerospace',
  'Orbital Works', 'Charter Group', 'Interstellar', 'Collective',
] as const;

/** Deterministic 22nd-century corporate name, seeded from a stable key
 *  (the company slug). Same slug -> same name, forever. */
export function generateHeritageName(seedKey: string): string {
  const rng = mulberry32(hashStringToSeed(`heritage-name:${seedKey}`));
  const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(rng() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

// ─── Sector traits (legacy focusAreas -> human-readable dossier tags) ──────

const FOCUS_AREA_LABELS: Record<string, string> = {
  launch_provider: 'Launch Services',
  satellites: 'Satellite Manufacturing',
  space_stations: 'Orbital Habitats',
  lunar: 'Lunar Operations',
  mars: 'Mars Operations',
  defense: 'Defense & Security',
  earth_observation: 'Earth Observation',
  communications: 'Communications',
  in_space_services: 'In-Space Servicing',
  manufacturing: 'Orbital Manufacturing',
  propulsion: 'Propulsion R&D',
  space_tourism: 'Tourism & Hospitality',
  asteroid_mining: 'Asteroid Prospecting',
  space_infrastructure: 'Infrastructure',
};

function titleCaseFallback(focusArea: string): string {
  return focusArea
    .split('_')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Map legacy focusAreas to display-ready dossier tags. Capped at 4 so cards
 *  stay compact; order preserved from input (which itself is deterministic —
 *  see company-roster.ts#deriveFocusAreas). */
export function mapFocusAreasToTraits(focusAreas: string[]): string[] {
  const traits = focusAreas.map((fa) => FOCUS_AREA_LABELS[fa] ?? titleCaseFallback(fa));
  return traits.length > 0 ? traits.slice(0, 4) : ['Commercial Space'];
}

// ─── Tier scaling from valuation ────────────────────────────────────────────

const TIER_THRESHOLDS_BILLIONS = [20, 10, 5, 2] as const; // -> tiers 5,4,3,2; else 1

export function tierForValuation(valuationUsd: number): number {
  const billions = valuationUsd / 1_000_000_000;
  if (billions >= TIER_THRESHOLDS_BILLIONS[0]) return 5;
  if (billions >= TIER_THRESHOLDS_BILLIONS[1]) return 4;
  if (billions >= TIER_THRESHOLDS_BILLIONS[2]) return 3;
  if (billions >= TIER_THRESHOLDS_BILLIONS[3]) return 2;
  return 1;
}

const TIER_LABELS: Record<number, string> = {
  5: 'Heritage Titan',
  4: 'Heritage Major',
  3: 'Heritage Established',
  2: 'Heritage Rising',
  1: 'Heritage Charter',
};

export function getHeritageTierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? TIER_LABELS[1];
}

// ─── Blurb (lore-safe "descended from" flavor — never a real name) ─────────

const BLURB_TEMPLATES: ((trait: string) => string)[] = [
  (trait) =>
    `Traces its charter to a 21st-century ${trait} pioneer that never made it past the Fracture — its intellectual property and call sign were re-chartered under Accord law.`,
  (trait) =>
    `A ${trait} concern whose founding papers cite a 21st-century commercial launch-era predecessor, long since folded into the modern charter economy.`,
  (trait) =>
    `Descended from a 21st-century ${trait} startup; the name changed twice during the Consolidation but the charter lineage is unbroken.`,
  (trait) =>
    `Registered as heir to a 21st-century ${trait} venture — one of thousands of Commercial Era firms whose charters outlived their founders.`,
  (trait) =>
    `Holds Accord recognition as successor-in-charter to a 21st-century ${trait} outfit, its original headquarters now a heritage site on Earth.`,
  (trait) =>
    `A ${trait} house built on the charter of a 21st-century predecessor; old logos are rumored to still hang in the archive vaults.`,
];

/** Deterministic blurb, seeded from the same stable key as the name. */
export function generateHeritageBlurb(seedKey: string, primaryTrait: string): string {
  const rng = mulberry32(hashStringToSeed(`heritage-blurb:${seedKey}`));
  const idx = Math.floor(rng() * BLURB_TEMPLATES.length);
  return BLURB_TEMPLATES[idx](primaryTrait.toLowerCase());
}

// ─── Honest real-data line (DB facts only, never fabricated) ───────────────

function formatUsdShort(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${Math.round(usd / 1_000_000)}M`;
  return `$${Math.round(usd)}`;
}

export function buildCharterAncestorLine(input: HeritageCompanyInput): string {
  const year = input.lastFundingDate ? new Date(input.lastFundingDate).getUTCFullYear() : null;
  if (input.lastFundingAmountUsd && input.lastFundingRound && year && !Number.isNaN(year)) {
    return `Charter ancestor: ${input.name} — raised ${formatUsdShort(input.lastFundingAmountUsd)} in a ${year} ${input.lastFundingRound} round.`;
  }
  if (input.totalFundingUsd) {
    return `Charter ancestor: ${input.name} — ${formatUsdShort(input.totalFundingUsd)} raised to date.`;
  }
  return `Charter ancestor: ${input.name} — private, valued at ${formatUsdShort(input.valuationUsd)}.`;
}

// ─── Derivation ──────────────────────────────────────────────────────────

/** Derive one Heritage Corporation from one real CompanyProfile row. Pure —
 *  same input always yields the same output. */
export function deriveHeritageNPC(input: HeritageCompanyInput): HeritageNPC {
  const name = generateHeritageName(input.slug);
  const tier = tierForValuation(input.valuationUsd);
  const sectorTraits = mapFocusAreasToTraits(input.focusAreas);
  const blurb = generateHeritageBlurb(input.slug, sectorTraits[0]);

  return {
    id: `heritage-${input.slug}`,
    name,
    tier,
    tierLabel: getHeritageTierLabel(tier),
    valuationBillions: input.valuationUsd / 1_000_000_000,
    sectorTraits,
    dossier: {
      realCompanyName: input.name,
      realCompanyHref: `/company-profiles/${input.slug}`,
      blurb,
      charterAncestorLine: buildCharterAncestorLine(input),
    },
  };
}

/** Derive the full Heritage Registry: top-N by valuation (ties broken by
 *  slug for total determinism), capped at `cap` entries. */
export function deriveHeritageNPCs(inputs: HeritageCompanyInput[], cap = 20): HeritageNPC[] {
  return [...inputs]
    .sort((a, b) => b.valuationUsd - a.valuationUsd || a.slug.localeCompare(b.slug))
    .slice(0, cap)
    .map(deriveHeritageNPC);
}
