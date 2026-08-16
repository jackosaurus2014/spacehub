/**
 * @jest-environment jsdom
 *
 * Wave M5 — the "you are under economic attack at X" Situation Log lens
 * (situation-log.ts over state.offense). Victims see campaigns on resources
 * they touch, incoming poach offers as critical items, cornering squeezes
 * on inputs their buildings consume, and tolls on zones they operate in.
 */
import { getNewGameState } from '../save-load';
import { deriveSituationLog } from '../situation-log';
import { LOCATION_TO_ZONE } from '../zone-influence';
import type { GameState } from '../types';
import type { OffenseSnapshot } from '../offense';

const NOW = Date.now();

function snapshot(over: Partial<OffenseSnapshot>): OffenseSnapshot {
  return { campaigns: [], poachIncoming: [], poachOutcomes: [], laneTolls: [], corneringAlerts: [], asOf: NOW, ...over };
}

function baseState(offense: OffenseSnapshot): GameState {
  return { ...getNewGameState(), offense };
}

function completeBuilding(definitionId: string, locationId: string) {
  return {
    instanceId: 'b1',
    definitionId,
    locationId,
    buildStartDate: { year: 2100, month: 1 },
    completionDate: { year: 2100, month: 2 },
    isComplete: true,
    startedAtMs: NOW - 1000,
    realDurationSeconds: 1,
  };
}

describe('M5 — offense items in the Situation Log', () => {
  it('an incoming poach offer is a CRITICAL item deep-linking to Workforce', () => {
    const state = baseState(snapshot({
      poachIncoming: [{
        id: 'o1', crewType: 'engineer', count: 2, retentionCost: 9_000_000,
        respondByMs: NOW + 24 * 3600_000, attackerName: null, freeRetentionAvailable: false,
      }],
    }));
    const items = deriveSituationLog(state, { nowMs: NOW });
    const item = items.find(i => i.category === 'poach_offer')!;
    expect(item).toBeDefined();
    expect(item.severity).toBe('critical');
    expect(item.tab).toBe('workforce');
    expect(item.detail).toContain('75%');
  });

  it('an expired poach window surfaces nothing (the decision is over)', () => {
    const state = baseState(snapshot({
      poachIncoming: [{
        id: 'o1', crewType: 'engineer', count: 2, retentionCost: 9_000_000,
        respondByMs: NOW - 1, attackerName: null, freeRetentionAvailable: false,
      }],
    }));
    expect(deriveSituationLog(state, { nowMs: NOW }).some(i => i.category === 'poach_offer')).toBe(false);
  });

  it('a price campaign warns holders of the resource, with counterplay in the detail', () => {
    const state = {
      ...baseState(snapshot({
        campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Dumper Inc', declaredAtMs: NOW, endsAtMs: NOW + 3600_000 }],
      })),
      resources: { iron: 50 },
    };
    const items = deriveSituationLog(state, { nowMs: NOW });
    const item = items.find(i => i.id === 'sit-campaign-iron')!;
    expect(item).toBeDefined();
    expect(item.severity).toBe('warning');
    expect(item.label).toContain('Price war');
    expect(item.detail.toLowerCase()).toContain('mothball');
  });

  it('a campaign on a resource this player neither mines nor holds stays quiet', () => {
    const state = baseState(snapshot({
      campaigns: [{ resourceSlug: 'helium3', byCompanyName: 'Dumper Inc', declaredAtMs: NOW, endsAtMs: NOW + 3600_000 }],
    }));
    expect(deriveSituationLog(state, { nowMs: NOW }).some(i => i.id === 'sit-campaign-helium3')).toBe(false);
  });

  it('your own campaign shows as an informational status item', () => {
    const state = baseState(snapshot({
      campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Me Corp', declaredAtMs: NOW, endsAtMs: NOW + 3600_000, own: true }],
    }));
    const item = deriveSituationLog(state, { nowMs: NOW }).find(i => i.id === 'sit-campaign-own-iron')!;
    expect(item).toBeDefined();
    expect(item.severity).toBe('info');
  });

  it('a cornering alert warns only players whose buildings consume the input', () => {
    const consuming = {
      ...baseState(snapshot({
        corneringAlerts: [{ resourceSlug: 'rocket_fuel', topBuyerShare: 0.6, topBuyerOpenQty: 100, volume7d: 160 }],
      })),
      buildings: [completeBuilding('launch_pad_small', 'earth_surface')],
    } as GameState;
    const item = deriveSituationLog(consuming, { nowMs: NOW }).find(i => i.id === 'sit-corner-rocket_fuel')!;
    expect(item).toBeDefined();
    expect(item.severity).toBe('warning');
    expect(item.detail.toLowerCase()).toContain('local production');

    const notConsuming = baseState(snapshot({
      corneringAlerts: [{ resourceSlug: 'rocket_fuel', topBuyerShare: 0.6, topBuyerOpenQty: 100, volume7d: 160 }],
    }));
    expect(deriveSituationLog(notConsuming, { nowMs: NOW }).some(i => i.id === 'sit-corner-rocket_fuel')).toBe(false);
  });

  it('a freight toll surfaces for zones the player operates in, with counterplay', () => {
    const zone = LOCATION_TO_ZONE.get('earth_surface')!;
    const state = {
      ...baseState(snapshot({
        laneTolls: [{ zoneSlug: zone, tollPct: 0.02, governorName: 'Gov Corp' }],
      })),
      buildings: [completeBuilding('launch_pad_small', 'earth_surface')],
    } as GameState;
    const item = deriveSituationLog(state, { nowMs: NOW }).find(i => i.id === `sit-toll-${zone}`)!;
    expect(item).toBeDefined();
    expect(item.category).toBe('lane_toll');
    expect(item.detail.toLowerCase()).toContain('treaty');
  });

  it('a stale offense snapshot surfaces nothing at all', () => {
    const state = baseState(snapshot({
      poachIncoming: [{
        id: 'o1', crewType: 'engineer', count: 2, retentionCost: 9_000_000,
        respondByMs: NOW + 3600_000, attackerName: null, freeRetentionAvailable: false,
      }],
      asOf: NOW - 8 * 24 * 3600_000,
    }));
    expect(deriveSituationLog(state, { nowMs: NOW }).some(i => i.category === 'poach_offer')).toBe(false);
  });
});
