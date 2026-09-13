/**
 * @jest-environment node
 *
 * CC-1 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md §4): game state → Bridge
 * window actor triggers, with cooldowns so the window never strobes.
 */
import {
  detectBridgeTriggers, isWeatherActive, applyBridgeCooldowns, isLaunchContractId,
  BRIDGE_TRIGGER_COOLDOWN_MS, WEATHER_ACTIVE_MS,
} from '../bridge-events';
import { getNewGameState } from '../save-load';
import type { GameState, BuildingInstance } from '../types';

function building(id: string, isComplete: boolean): BuildingInstance {
  return {
    instanceId: id, definitionId: 'launch_pad_small', locationId: 'earth_surface',
    buildStartDate: { year: 2025, month: 1 }, completionDate: { year: 2025, month: 2 },
    isComplete, startedAtMs: 0, realDurationSeconds: 10,
  };
}

function withLaunchService(s: GameState): GameState {
  return { ...s, activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: 2025, month: 1 }, revenueMultiplier: 1 }] };
}

describe('detectBridgeTriggers', () => {
  const base = getNewGameState();

  it('never fires on the first observation or an identical state', () => {
    expect(detectBridgeTriggers(null, base)).toEqual([]);
    expect(detectBridgeTriggers(base, base)).toEqual([]);
  });

  it('build_complete when a building flips from in-progress to complete', () => {
    const prev = { ...base, buildings: [building('b1', false)] };
    const next = { ...base, buildings: [building('b1', true)] };
    expect(detectBridgeTriggers(prev, next)).toEqual(['build_complete']);
    // a building that was already complete (or is new and complete) does not fire
    expect(detectBridgeTriggers(next, { ...next, buildings: [building('b1', true), building('b2', true)] })).toEqual([]);
  });

  it('launch when the month rolls with a launch service active — not without one', () => {
    const prev = withLaunchService({ ...base, gameDate: { year: 2025, month: 3 } });
    const next = withLaunchService({ ...base, gameDate: { year: 2025, month: 4 } });
    expect(detectBridgeTriggers(prev, next)).toEqual(['launch']);
    const quiet = { ...base, gameDate: { year: 2025, month: 4 } };
    expect(detectBridgeTriggers({ ...base, gameDate: { year: 2025, month: 3 } }, quiet)).toEqual([]);
  });

  it('launch when a launch contract completes', () => {
    const prev = { ...base, completedContracts: [] };
    const next = { ...base, completedContracts: ['c_first_launch'] };
    expect(detectBridgeTriggers(prev, next)).toEqual(['launch']);
    expect(detectBridgeTriggers(prev, { ...base, completedContracts: ['c_mining_survey'] })).toEqual([]);
    expect(isLaunchContractId('c_first_launch')).toBe(true);
    expect(isLaunchContractId('c_mining_survey')).toBe(false);
  });

  it('launch when a launch service comes online', () => {
    expect(detectBridgeTriggers(base, withLaunchService(base))).toEqual(['launch']);
  });

  it('reports both triggers at once, each once', () => {
    const prev = withLaunchService({ ...base, gameDate: { year: 2025, month: 3 }, buildings: [building('b1', false), building('b2', false)] });
    const next = withLaunchService({ ...base, gameDate: { year: 2025, month: 4 }, buildings: [building('b1', true), building('b2', true)] });
    expect(detectBridgeTriggers(prev, next).sort()).toEqual(['build_complete', 'launch']);
  });
});

describe('isWeatherActive', () => {
  const base = getNewGameState();
  const now = 1_000_000_000;

  it('on for a recent solar storm or micrometeorite strike, off once it ages out', () => {
    const strike = { id: 'h1', type: 'solar_storm' as const, locationId: 'earth_surface', occurredAtMs: now - 1000, damagePct: 0.1, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: '' };
    expect(isWeatherActive({ ...base, recentHazards: [strike] }, now)).toBe(true);
    expect(isWeatherActive({ ...base, recentHazards: [{ ...strike, type: 'micrometeorite' }] }, now)).toBe(true);
    expect(isWeatherActive({ ...base, recentHazards: [strike] }, now + WEATHER_ACTIVE_MS + 1)).toBe(false);
  });

  it('pirate raids and equipment failures are not weather', () => {
    const raid = { id: 'h2', type: 'pirate_raid' as const, locationId: 'leo', occurredAtMs: now, damagePct: 0.1, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: '' };
    expect(isWeatherActive({ ...base, recentHazards: [raid] }, now)).toBe(false);
  });

  it('a severe solar-storm forecast counts; minor ones do not', () => {
    const warn = { id: 'w', type: 'solar_storm' as const, severity: 'severe' as const, locationId: 'earth_surface', forecastMonthIndex: 10, issuedAtMs: now, summary: '' };
    expect(isWeatherActive({ ...base, hazardWarnings: [warn] }, now)).toBe(true);
    expect(isWeatherActive({ ...base, hazardWarnings: [{ ...warn, severity: 'minor' }] }, now)).toBe(false);
  });
});

describe('applyBridgeCooldowns', () => {
  it('fires a fresh trigger and records the time', () => {
    const r = applyBridgeCooldowns(['launch'], {}, 1000);
    expect(r.fire).toEqual(['launch']);
    expect(r.lastFiredAt).toEqual({ launch: 1000 });
  });

  it('suppresses a repeat inside the cooldown and returns the same map object', () => {
    const last = { launch: 1000 };
    const r = applyBridgeCooldowns(['launch'], last, 1000 + BRIDGE_TRIGGER_COOLDOWN_MS.launch - 1);
    expect(r.fire).toEqual([]);
    expect(r.lastFiredAt).toBe(last);
  });

  it('fires again once the cooldown has elapsed; triggers cool down independently', () => {
    const last = { launch: 1000 };
    const r = applyBridgeCooldowns(['launch', 'build_complete'], last, 1000 + BRIDGE_TRIGGER_COOLDOWN_MS.launch);
    expect(r.fire.sort()).toEqual(['build_complete', 'launch']);
    expect(r.lastFiredAt.launch).toBe(1000 + BRIDGE_TRIGGER_COOLDOWN_MS.launch);
    expect(r.lastFiredAt.build_complete).toBe(1000 + BRIDGE_TRIGGER_COOLDOWN_MS.launch);
    // build_complete now cools while launch (older) would still be blocked
    const r2 = applyBridgeCooldowns(['build_complete'], r.lastFiredAt, r.lastFiredAt.build_complete! + 1);
    expect(r2.fire).toEqual([]);
  });
});
