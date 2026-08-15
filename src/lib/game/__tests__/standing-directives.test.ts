/**
 * @jest-environment node
 *
 * Live-Service Wave LS1 "Night Shift" — standing directives.
 * Covers: CRUD + limits, superlinear ops-fee math, and monthly evaluation
 * (auto-sell / auto-restock / auto-renew-contract / maintenance-reserve),
 * including the "automation is never free" invariant (ops fee always fires
 * while any directive is active, even if that directive does nothing this
 * month) and determinism (no randomness anywhere in this module).
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  getActiveDirectives,
  addDirective,
  removeDirective,
  setDirectiveActive,
  getDirectiveOpsFee,
  processDirectivesForMonth,
  getDirectiveTypeLabel,
  MAX_STANDING_DIRECTIVES,
} from '../standing-directives';
import { RESOURCE_MAP } from '../resources';

const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 1_000_000_000,
    lastTickAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

describe('getDirectiveOpsFee — superlinear sink', () => {
  it('is zero with no active directives', () => {
    expect(getDirectiveOpsFee(0)).toBe(0);
  });

  it('follows 250K x n^1.3 and grows faster than linear', () => {
    const fee1 = getDirectiveOpsFee(1);
    const fee2 = getDirectiveOpsFee(2);
    const fee4 = getDirectiveOpsFee(4);
    expect(fee1).toBe(250_000);
    // Doubling the count more than doubles the fee (superlinear).
    expect(fee2).toBeGreaterThan(fee1 * 2 * 0.99); // small rounding slack
    expect(fee4 / fee2).toBeGreaterThan(fee2 / fee1);
  });
});

describe('directive CRUD', () => {
  it('adds a valid auto_sell directive as active', () => {
    const s = baseState();
    const result = addDirective(s, { type: 'auto_sell', label: 'Sell iron', resourceId: 'iron', minPrice: 1000 });
    expect(result.ok).toBe(true);
    expect(getActiveDirectives(result.state)).toHaveLength(1);
  });

  it('rejects auto_sell/auto_restock without a resourceId', () => {
    const s = baseState();
    const result = addDirective(s, { type: 'auto_sell', label: 'bad' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid');
  });

  it('rejects maintenance_reserve with no positive reserveAmount', () => {
    const s = baseState();
    const result = addDirective(s, { type: 'maintenance_reserve', label: 'bad', reserveAmount: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid');
  });

  it('enforces MAX_STANDING_DIRECTIVES', () => {
    let s = baseState();
    for (let i = 0; i < MAX_STANDING_DIRECTIVES; i++) {
      s = addDirective(s, { type: 'maintenance_reserve', label: `r${i}`, reserveAmount: 1 }).state;
    }
    const result = addDirective(s, { type: 'maintenance_reserve', label: 'overflow', reserveAmount: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('limit_reached');
  });

  it('removes and pauses/resumes directives', () => {
    let s = baseState();
    s = addDirective(s, { type: 'maintenance_reserve', label: 'r', reserveAmount: 1 }).state;
    const id = s.standingDirectives![0].id;
    s = setDirectiveActive(s, id, false);
    expect(getActiveDirectives(s)).toHaveLength(0);
    s = setDirectiveActive(s, id, true);
    expect(getActiveDirectives(s)).toHaveLength(1);
    s = removeDirective(s, id);
    expect(s.standingDirectives).toHaveLength(0);
  });

  it('labels every directive type', () => {
    expect(getDirectiveTypeLabel('auto_sell')).toBeTruthy();
    expect(getDirectiveTypeLabel('auto_restock')).toBeTruthy();
    expect(getDirectiveTypeLabel('auto_renew_contract')).toBeTruthy();
    expect(getDirectiveTypeLabel('maintenance_reserve')).toBeTruthy();
  });
});

describe('processDirectivesForMonth', () => {
  it('is a no-op (zero fee, unchanged state) with no active directives', () => {
    const s = baseState();
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.feeCharged).toBe(0);
    expect(result.state).toBe(s);
  });

  it('charges the ops fee even when a directive has nothing to do', () => {
    let s = baseState({ resources: {} });
    s = addDirective(s, { type: 'auto_sell', label: 'Sell iron', resourceId: 'iron', minPrice: 0 }).state;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.feeCharged).toBe(getDirectiveOpsFee(1));
    expect(result.state.money).toBe(s.money - result.feeCharged);
  });

  it('auto_sell sells down to the cap at/above minPrice and credits money', () => {
    let s = baseState({ resources: { iron: 500 } });
    s = addDirective(s, { type: 'auto_sell', label: 'Sell iron', resourceId: 'iron', minPrice: 1, maxUnitsPerMonth: 100 }).state;
    const price = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.resources.iron).toBe(400); // 500 - 100 cap
    expect(result.state.money).toBe(s.money - result.feeCharged + 100 * price);
    expect(result.actions.some(a => a.includes('Auto-sell'))).toBe(true);
  });

  it('auto_sell does nothing when spot price is below minPrice', () => {
    let s = baseState({ resources: { iron: 500 } });
    s = addDirective(s, { type: 'auto_sell', label: 'Sell iron', resourceId: 'iron', minPrice: 999_999_999 }).state;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.resources.iron).toBe(500);
  });

  it('auto_restock buys up toward targetStock at/below maxPrice', () => {
    let s = baseState({ resources: { iron: 0 }, money: 1_000_000_000 });
    s = addDirective(s, { type: 'auto_restock', label: 'Stock iron', resourceId: 'iron', targetStock: 50, maxPrice: 999_999_999 }).state;
    const price = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.resources.iron).toBe(50);
    expect(result.state.money).toBe(s.money - result.feeCharged - 50 * price);
  });

  it('auto_restock never spends money below an active maintenance_reserve floor', () => {
    const price = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const reserve = 900_000_000;
    let s = baseState({ resources: { iron: 0 }, money: 1_000_000_000 });
    s = addDirective(s, { type: 'auto_restock', label: 'Stock iron', resourceId: 'iron', targetStock: 100_000, maxPrice: 999_999_999 }).state;
    s = addDirective(s, { type: 'maintenance_reserve', label: 'Reserve', reserveAmount: reserve }).state;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.money).toBeGreaterThanOrEqual(reserve - 1); // never dips meaningfully below the floor
    const spentOnIron = result.state.resources.iron * price;
    expect(spentOnIron).toBeLessThanOrEqual(s.money - reserve + 1);
  });

  it('auto_renew_contract fulfills matching open contracts it can afford', () => {
    let s = baseState({
      resources: { iron: 1000 },
      availableDeliveries: [{
        id: 'c1', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Test', resourceId: 'iron',
        quantity: 100, paymentMoney: 5_000_000, deadlineAtMs: NOW + 999_999_999, reputationOnComplete: 5,
        reputationOnDefault: -5, status: 'open', offeredAtMs: NOW,
      }],
    });
    s = addDirective(s, { type: 'auto_renew_contract', label: 'Auto-renew' }).state;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.resources.iron).toBe(900);
    expect(result.state.completedDeliveries?.some(c => c.id === 'c1' && c.status === 'completed')).toBe(true);
    expect(result.actions.some(a => a.includes('Auto-renew'))).toBe(true);
  });

  it('auto_renew_contract skips contracts outside the resource whitelist', () => {
    let s = baseState({
      resources: { iron: 1000 },
      availableDeliveries: [{
        id: 'c1', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Test', resourceId: 'iron',
        quantity: 100, paymentMoney: 5_000_000, deadlineAtMs: NOW + 999_999_999, reputationOnComplete: 5,
        reputationOnDefault: -5, status: 'open', offeredAtMs: NOW,
      }],
    });
    s = addDirective(s, { type: 'auto_renew_contract', label: 'Auto-renew', resourceWhitelist: ['gold'] }).state;
    const result = processDirectivesForMonth(s, 1, NOW);
    expect(result.state.resources.iron).toBe(1000);
  });

  it('is deterministic — same state + month produce identical results', () => {
    let s = baseState({ resources: { iron: 500 }, money: 1_000_000_000 });
    s = addDirective(s, { type: 'auto_sell', label: 'Sell iron', resourceId: 'iron', minPrice: 1 }).state;
    const a = processDirectivesForMonth(s, 7, NOW);
    const b = processDirectivesForMonth(s, 7, NOW);
    expect(a.state.money).toBe(b.state.money);
    expect(a.feeCharged).toBe(b.feeCharged);
    expect(a.state.resources).toEqual(b.state.resources);
  });
});
