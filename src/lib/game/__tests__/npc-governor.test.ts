/**
 * GAME_DESIGN_REVIEW_2026-09 §2 row 11 — NPC density governor: the clamp
 * tables, deterministic tail dormancy, the per-save tick honouring it, and
 * the server-effects clamp that re-derives counts from the population.
 */
import {
  NPC_GOVERNOR,
  NPC_SEEDS,
  activeNpcCorpCount,
  activeNpcIndustryCount,
  isNpcDormant,
  buildNpcGovernorSnapshot,
  createAllNPCs,
} from '../npc-companies';
import { processNPCTick } from '../npc-engine';
import { clampNpcGovernorSnapshot } from '../server-effects';
import type { GameDate } from '../types';

describe('governor clamp', () => {
  it('market backdrop: clamp(round(10 − 0.15 × players), 3, 10)', () => {
    expect(activeNpcCorpCount(0)).toBe(10);
    expect(activeNpcCorpCount(3)).toBe(10);
    expect(activeNpcCorpCount(13)).toBe(8);
    expect(activeNpcCorpCount(33)).toBe(5);
    expect(activeNpcCorpCount(47)).toBe(3);
    expect(activeNpcCorpCount(10_000)).toBe(3);
    expect(activeNpcCorpCount(Number.NaN)).toBe(10);
    expect(activeNpcCorpCount(-5)).toBe(10);
  });

  it('industrial backdrop: clamp(round(5 − 0.075 × players), 2, 5)', () => {
    expect(activeNpcIndustryCount(0)).toBe(5);
    expect(activeNpcIndustryCount(6)).toBe(5);
    expect(activeNpcIndustryCount(13)).toBe(4);
    expect(activeNpcIndustryCount(27)).toBe(3);
    expect(activeNpcIndustryCount(40)).toBe(2);
    expect(activeNpcIndustryCount(10_000)).toBe(2);
  });

  it('floors are the documented 3 / 2', () => {
    expect(NPC_GOVERNOR.MARKET_FLOOR).toBe(3);
    expect(NPC_GOVERNOR.INDUSTRY_FLOOR).toBe(2);
    expect(NPC_GOVERNOR.MARKET_MAX).toBe(NPC_SEEDS.length);
  });

  it('dormancy is the deterministic tail of the seed order', () => {
    expect(isNpcDormant(NPC_SEEDS[0].id, 3)).toBe(false);
    expect(isNpcDormant(NPC_SEEDS[2].id, 3)).toBe(false);
    expect(isNpcDormant(NPC_SEEDS[3].id, 3)).toBe(true);
    expect(isNpcDormant(NPC_SEEDS[9].id, 10)).toBe(false);
    expect(isNpcDormant('unknown_npc', 0)).toBe(false);
  });

  it('snapshot builder and clamp agree, and the clamp re-derives counts from the population', () => {
    const snap = buildNpcGovernorSnapshot(60, 123);
    expect(snap).toEqual({ activePlayers30d: 60, activeNpcCorps: 3, activeIndustryCorps: 2, asOf: 123 });
    // A hostile/bugged snapshot claiming 0 active corps at 4 players is re-derived.
    const clamped = clampNpcGovernorSnapshot({ activePlayers30d: 4, activeNpcCorps: 0, activeIndustryCorps: 0, asOf: 5 });
    expect(clamped).toEqual({ activePlayers30d: 4, activeNpcCorps: 9, activeIndustryCorps: 5, asOf: 5 });
    expect(clampNpcGovernorSnapshot(null)).toBeNull();
  });
});

describe('processNPCTick under the governor', () => {
  const date: GameDate = { year: 2130, month: 1, totalMonths: 1 } as GameDate;

  it('dormant corps are returned untouched and rest no market actions', () => {
    const npcs = createAllNPCs().map(n => ({ ...n, monthsPlayed: 4, resources: { iron: 10_000 }, sellThreshold: 10 }));
    const { npcs: out, marketActions } = processNPCTick(npcs, date, {}, {}, 3);
    for (let i = 0; i < out.length; i++) {
      if (i < 3) {
        expect(out[i].monthsPlayed).toBe(5);
      } else {
        expect(out[i]).toBe(npcs[i]); // same reference: frozen
      }
    }
    const dormantIds = new Set(npcs.slice(3).map(n => n.id));
    expect(marketActions.every(a => !dormantIds.has(a.npcId))).toBe(true);
  });

  it('omitting the count ticks every corp (pre-governor behaviour)', () => {
    const npcs = createAllNPCs();
    const { npcs: out } = processNPCTick(npcs, date);
    expect(out.every(n => n.monthsPlayed === 1)).toBe(true);
  });
});
