// ─── D3 guard: subscriber perks can never grant money, resources, or speed ──
// docs/GAME_DESIGN_REVIEW_2026-09.md D3 / docs/POLICY.md "no pay-to-win".
// The perks module once carried startingMoney / buildSpeedMultiplier /
// researchSpeedMultiplier / offlineIncomeHours / surveyProbeDiscount. They
// were deleted on 2026-09-02; this test makes sure nothing of the kind comes
// back under any name.

import { ALL_PERK_TABLES, getSubscriberPerks } from '../subscriber-perks';

/** Key-name fragments that would indicate an economic or progression edge. */
const DENYLIST = [
  'money', 'cash', 'credit', 'income', 'revenue', 'earning', 'profit',
  'resource', 'ore', 'fuel', 'mining',
  'speed', 'multiplier', 'boost', 'accelerat', 'faster',
  'discount', 'price', 'cost', 'fee', 'cheaper',
  'offline', 'away', 'idle',
  'research', 'build', 'construction',
];

const FORBIDDEN_EXACT = new Set([
  'startingMoney', 'buildSpeedMultiplier', 'researchSpeedMultiplier',
  'offlineIncomeHours', 'surveyProbeDiscount',
]);

describe('subscriber-perks — no pay-to-win guard', () => {
  it('exports no field whose name suggests money, resources, speed or discounts', () => {
    for (const table of ALL_PERK_TABLES) {
      for (const key of Object.keys(table)) {
        const lower = key.toLowerCase();
        expect(FORBIDDEN_EXACT.has(key)).toBe(false);
        for (const frag of DENYLIST) {
          expect({ key, frag, hit: lower.includes(frag) }).toEqual({ key, frag, hit: false });
        }
      }
    }
  });

  it('free and pro tables carry exactly the same keys (no tier-exclusive field)', () => {
    const [free, pro] = ALL_PERK_TABLES;
    expect(Object.keys(free).sort()).toEqual(Object.keys(pro).sort());
  });

  it('falls back to free perks for unknown tiers and maps enterprise to pro', () => {
    expect(getSubscriberPerks('nonsense').tier).toBe('free');
    expect(getSubscriberPerks('enterprise').tier).toBe('pro');
  });

  it('no numeric perk is a multiplier around 1.0 (the shape a speed/revenue edge takes)', () => {
    for (const table of ALL_PERK_TABLES) {
      for (const [key, value] of Object.entries(table)) {
        if (typeof value !== 'number') continue;
        // Counts and day-windows are integers; a 1.15-style multiplier is not.
        expect({ key, isInteger: Number.isInteger(value) }).toEqual({ key, isInteger: true });
      }
    }
  });
});
