// ─── Space Tycoon: NPC Procurement Drives ───────────────────────────────────
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §2.3 "NPC procurement drives"):
// NPC_BACKDROP.md's "visible and forecastable" requirement finally gets a
// real mechanism. Each active NPC company (npc-companies.ts NPC_SEEDS)
// occasionally publishes a public reverse auction: "Titan Mining Collective
// buys 500 iron in 3 days, paying spot+8%" (§2.3's own example — Titan
// Mining Collective is npc_titan_mining, faction hive-collective, matching
// this module's flavor below). Players underbid each other to fill the
// demand; resolution/fulfillment reuse the EXACT same generic
// evaluateBids/checkContractFulfillment machinery every other
// BiddingContract uses (contract-bidding.ts, bidding/resolve+fulfill
// routes) — this module only GENERATES the contract row.
//
// [NPC] invariant (§E7 "drive prices capped spot+10%"): maxBid never exceeds
// spot × NPC_DRIVE_PRICE_CAP_MULTIPLIER × quantity.

import { NPC_SEEDS, type NPCSeedData } from './npc-companies';
import { FACTION_MAP, type FactionId } from './factions';
import { FACTION_FLAVOR } from './delivery-contracts';
import { FACTION_TERRITORY } from './zone-influence';
import type { GeneratedContract, ContractRequirements } from './contract-bidding';
import type { ResourceId } from './resources';

/** [NPC] price cap (§E7): NPC drives never offer more than spot+10%. */
export const NPC_DRIVE_PRICE_CAP_MULTIPLIER = 1.10;
/** Floor of the bid range — leaves real margin for underbidding competition. */
const NPC_DRIVE_PRICE_FLOOR_MULTIPLIER = 0.70;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Faction-voiced templates (docs/LORE.md motivations). {qty}/{res}/{days}
// substituted below. Kept short — the drive card renders title + a one-line
// description; full faction color comes from the description.
interface DriveFlavor {
  titleTemplate: string;
  descriptionTemplate: string;
}

const DRIVE_FLAVOR: Record<FactionId, DriveFlavor> = {
  'the-dominion': {
    titleTemplate: 'Strategic Reserve Directive: {qty} {res}',
    descriptionTemplate: '{npc} (Kepler Station) opens a sealed-bid procurement for {qty} units of {res}, official Dominion contract terms. Lowest qualified bid wins — deliver within {days} days of award.',
  },
  'the-syndicate': {
    titleTemplate: 'Pallas-4 Discreet Acquisition: {qty} {res}',
    descriptionTemplate: '{npc} is quietly moving {qty} units of {res} through Pallas-4. No questions asked, best price wins. Deliver within {days} days.',
  },
  'void-corsairs': {
    titleTemplate: 'Clan Tribute Call: {qty} {res}',
    descriptionTemplate: '{npc} calls for {qty} units of {res} as tribute for safe passage through Corsair-claimed lanes. Best offer wins the clan\'s favor. {days} days to deliver.',
  },
  'hive-collective': {
    titleTemplate: 'Pattern Exchange Bid: {qty} {res}',
    descriptionTemplate: '{npc} signals a pattern-trade for {qty} units of {res} — the Collective\'s interfaces will settle with the lowest resonant offer. {days} days.',
  },
  'nebula-reavers': {
    titleTemplate: 'Convocation Requisition: {qty} {res}',
    descriptionTemplate: '{npc} puts out a call across the drift for {qty} units of {res} ahead of the next Convocation. Best bid wins passage rights. {days} days to deliver.',
  },
  'echo-remnants': {
    titleTemplate: 'Archive Acquisition Bid: {qty} {res}',
    descriptionTemplate: '{npc} (The Archive, Triton) requests {qty} units of {res} for preservation-order fabrication. Scholarly patience, but the lowest qualified bid still wins. {days} days.',
  },
};

export interface NpcDriveGenerationInput {
  /** NPC_SEEDS id (e.g. 'npc_titan_mining'). */
  npcId: string;
  now?: number;
  /** Current market spot (or baseMarketPrice fallback) for the resource this
   *  drive will demand — supplied by the caller (server has the live
   *  MarketResource row; this module stays DB-free). */
  spotPriceLookup: (resourceId: ResourceId) => number;
}

/** Generate one NPC procurement drive for the given NPC, or null if the NPC
 *  has no faction-preferred resources to draw from (should never happen —
 *  every NPC_SEEDS entry has a faction with preferredResources). */
export function generateNpcProcurementDrive(input: NpcDriveGenerationInput): (GeneratedContract & { issuerNpcId: string; zoneSlug?: string }) | null {
  const seed = NPC_SEEDS.find(s => s.id === input.npcId);
  if (!seed) return null;
  const faction = FACTION_MAP.get(seed.factionId);
  const flavorSource = FACTION_FLAVOR[seed.factionId];
  const driveFlavor = DRIVE_FLAVOR[seed.factionId];
  if (!faction || !flavorSource || !driveFlavor || flavorSource.preferredResources.length === 0) return null;

  const now = input.now ?? Date.now();
  const resourceId = randomElement(flavorSource.preferredResources);
  const spot = Math.max(1, input.spotPriceLookup(resourceId));

  // Quantity: faction's typical request size, scaled by a base 100-600 range
  // (deliberately smaller than player-vs-player resource_delivery contracts
  // — drives are meant to be filled by a single mid-tier player, not a
  // corporation-scale operation, per §2.3's "500 iron" example).
  const baseQty = randomInt(100, 600);
  const quantity = Math.max(20, Math.round(baseQty * flavorSource.quantityMultiplier));

  // [NPC] price cap: max spot+10%. Floor leaves real underbidding room.
  const maxBid = Math.round(spot * NPC_DRIVE_PRICE_CAP_MULTIPLIER * quantity);
  const minBid = Math.round(spot * NPC_DRIVE_PRICE_FLOOR_MULTIPLIER * quantity);
  const baseReward = Math.round((minBid + maxBid) / 2);

  // Short, forecastable bidding window — "buys 500 iron in 3 days" (§2.3).
  const biddingWindowDays = randomInt(2, 5);
  const biddingEndsAt = new Date(now + biddingWindowDays * 24 * 3600 * 1000);

  const territory = FACTION_TERRITORY[seed.factionId];
  const zoneSlug = territory && territory.length > 0 ? randomElement(territory) : undefined;

  const resourceLabel = resourceId.replace(/_/g, ' ');
  const title = driveFlavor.titleTemplate
    .replace('{qty}', quantity.toLocaleString())
    .replace('{res}', resourceLabel);
  const description = driveFlavor.descriptionTemplate
    .replace('{npc}', seed.name)
    .replace(/\{qty\}/g, quantity.toLocaleString())
    .replace(/\{res\}/g, resourceLabel)
    .replace(/\{days\}/g, String(biddingWindowDays));

  const requirements: ContractRequirements = {
    type: 'resources_delivered',
    target: quantity,
    resourceId,
    label: `Deliver ${quantity} ${resourceLabel}`,
  };

  return {
    contractType: 'npc_procurement_drive',
    tier: 1,
    title,
    description,
    requirements,
    baseReward,
    minBid,
    maxBid,
    collateralPct: 0.08,
    biddingEndsAt,
    deliveryMonths: 1,
    status: 'open',
    issuerNpcId: seed.id,
    zoneSlug,
  };
}

/** Pick which NPCs should publish a new drive this cycle. Weighted toward
 *  faction diversity (one NPC per faction preferred over stacking) — caller
 *  supplies how many are already open per NPC so repeats are avoided until
 *  the pool is genuinely thin. */
export function selectNpcsForNewDrives(
  openDriveCountByNpc: Record<string, number>,
  maxNewDrives: number,
): NPCSeedData[] {
  const eligible = NPC_SEEDS.filter(s => (openDriveCountByNpc[s.id] || 0) === 0);
  if (eligible.length === 0) return [];
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(0, maxNewDrives));
}

/** All faction ids that currently have at least one NPC seed — used by the
 *  intelligence surfaces to preview "who might publish next." */
export const ACTIVE_DRIVE_FACTIONS: FactionId[] = Array.from(new Set(NPC_SEEDS.map(s => s.factionId)));
