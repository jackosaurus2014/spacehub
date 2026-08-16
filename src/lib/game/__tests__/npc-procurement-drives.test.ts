/**
 * @jest-environment node
 */
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §2.3 "NPC procurement
// drives"): generation math — [NPC] price cap (spot+10%), faction-biased
// resource selection, zone tagging, and forecastable short bidding windows.

import { NPC_SEEDS } from '../npc-companies';
import { FACTION_FLAVOR } from '../delivery-contracts';
import {
  generateNpcProcurementDrive,
  selectNpcsForNewDrives,
  NPC_DRIVE_PRICE_CAP_MULTIPLIER,
  ACTIVE_DRIVE_FACTIONS,
} from '../npc-procurement-drives';

const FIXED_SPOT = 1000;
const spotLookup = () => FIXED_SPOT;

describe('generateNpcProcurementDrive', () => {
  it('generates a valid drive for every NPC seed', () => {
    for (const seed of NPC_SEEDS) {
      const drive = generateNpcProcurementDrive({ npcId: seed.id, now: 1_700_000_000_000, spotPriceLookup: spotLookup });
      expect(drive).not.toBeNull();
      expect(drive!.issuerNpcId).toBe(seed.id);
      expect(drive!.contractType).toBe('npc_procurement_drive');
      expect(drive!.requirements.type).toBe('resources_delivered');
      expect(drive!.requirements.target).toBeGreaterThan(0);
    }
  });

  it('[NPC] price cap: maxBid never exceeds spot+10% of quantity', () => {
    for (const seed of NPC_SEEDS) {
      const drive = generateNpcProcurementDrive({ npcId: seed.id, now: 1_700_000_000_000, spotPriceLookup: spotLookup });
      expect(drive).not.toBeNull();
      const cap = Math.round(FIXED_SPOT * NPC_DRIVE_PRICE_CAP_MULTIPLIER * drive!.requirements.target);
      expect(drive!.maxBid).toBeLessThanOrEqual(cap);
      expect(drive!.maxBid).toBe(cap); // exact — generator uses the cap directly
    }
  });

  it('minBid is strictly less than maxBid, leaving real underbidding room', () => {
    for (const seed of NPC_SEEDS) {
      const drive = generateNpcProcurementDrive({ npcId: seed.id, now: 1_700_000_000_000, spotPriceLookup: spotLookup });
      expect(drive!.minBid).toBeLessThan(drive!.maxBid);
      expect(drive!.minBid).toBeGreaterThan(0);
    }
  });

  it('resource drawn is always one of the NPC faction\'s preferred resources', () => {
    for (const seed of NPC_SEEDS) {
      for (let i = 0; i < 10; i++) {
        const drive = generateNpcProcurementDrive({ npcId: seed.id, now: 1_700_000_000_000 + i, spotPriceLookup: spotLookup });
        const preferred = FACTION_FLAVOR[seed.factionId].preferredResources;
        expect(preferred).toContain(drive!.requirements.resourceId);
      }
    }
  });

  it('bidding window is short and forecastable (2-5 days, matching §2.3\'s example)', () => {
    const now = 1_700_000_000_000;
    for (const seed of NPC_SEEDS) {
      const drive = generateNpcProcurementDrive({ npcId: seed.id, now, spotPriceLookup: spotLookup });
      const windowMs = drive!.biddingEndsAt.getTime() - now;
      const windowDays = windowMs / (24 * 3600 * 1000);
      expect(windowDays).toBeGreaterThanOrEqual(2);
      expect(windowDays).toBeLessThanOrEqual(5);
    }
  });

  it('returns null for an unknown npcId', () => {
    const drive = generateNpcProcurementDrive({ npcId: 'npc_does_not_exist', now: 1_700_000_000_000, spotPriceLookup: spotLookup });
    expect(drive).toBeNull();
  });

  it('title and description are faction-voiced (not the generic default)', () => {
    const drive = generateNpcProcurementDrive({ npcId: 'npc_titan_mining', now: 1_700_000_000_000, spotPriceLookup: spotLookup });
    // npc_titan_mining is hive-collective per npc-companies.ts NPC_SEEDS.
    expect(drive!.title).toMatch(/Pattern Exchange/);
    expect(drive!.description).toContain('Titan Mining Collective');
  });
});

describe('selectNpcsForNewDrives', () => {
  it('never selects an NPC that already has an open drive', () => {
    const openCounts: Record<string, number> = { npc_titan_mining: 1 };
    const selected = selectNpcsForNewDrives(openCounts, 10);
    expect(selected.find(s => s.id === 'npc_titan_mining')).toBeUndefined();
  });

  it('respects the maxNewDrives cap', () => {
    const selected = selectNpcsForNewDrives({}, 2);
    expect(selected.length).toBeLessThanOrEqual(2);
  });

  it('returns nothing when every NPC already has an open drive', () => {
    const allOpen: Record<string, number> = {};
    for (const s of NPC_SEEDS) allOpen[s.id] = 1;
    expect(selectNpcsForNewDrives(allOpen, 5)).toEqual([]);
  });
});

describe('ACTIVE_DRIVE_FACTIONS', () => {
  it('covers every faction with at least one NPC seed', () => {
    const seedFactions = new Set(NPC_SEEDS.map(s => s.factionId));
    expect(new Set(ACTIVE_DRIVE_FACTIONS)).toEqual(seedFactions);
  });
});
