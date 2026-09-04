/**
 * @jest-environment node
 *
 * Map jump hotkeys (2026-09-04). Slot assignment is muscle memory, so the
 * load-bearing property tested here is STABILITY: a body's digit is a
 * function of the canonical list alone and never of the player's unlock
 * state, session, or layer history.
 */
import {
  HOTKEY_BANK_SIZE,
  HOTKEY_DIGITS,
  SOLAR_HOTKEY_ENTRIES,
  GALACTIC_HOTKEY_ENTRIES,
  buildHotkeyEntries,
  bankCount,
  entriesForBank,
  cycleBank,
  clampBank,
  slotFromKeyEvent,
  isBankCycleEvent,
  resolveSlot,
  describeBinding,
} from '../map-hotkeys';
import { ALL_LOCATIONS } from '../solar-system';
import { INTERSTELLAR_SYSTEMS } from '../interstellar';

const named = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `x${i}`, name: `X ${i}` }));

describe('slot assignment', () => {
  it('numbers the first ten slots 1-9 then 0', () => {
    const e = buildHotkeyEntries(named(10));
    expect(e.map(x => x.digit)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    expect(e.every(x => x.bank === 0)).toBe(true);
  });

  it('rolls the eleventh item into bank 2 slot 1, not a Shift chord', () => {
    const e = buildHotkeyEntries(named(11));
    expect(e[10]).toMatchObject({ bank: 1, slot: 0, digit: '1' });
  });

  it('keeps digits stable when the list grows', () => {
    const small = buildHotkeyEntries(named(5));
    const big = buildHotkeyEntries(named(40));
    for (const s of small) {
      const same = big.find(b => b.id === s.id)!;
      expect(same.digit).toBe(s.digit);
      expect(same.bank).toBe(s.bank);
    }
  });

  it('exposes every canonical body exactly once, in order', () => {
    expect(SOLAR_HOTKEY_ENTRIES).toHaveLength(ALL_LOCATIONS.length);
    expect(SOLAR_HOTKEY_ENTRIES.map(e => e.id)).toEqual(ALL_LOCATIONS.map(l => l.id));
    expect(new Set(SOLAR_HOTKEY_ENTRIES.map(e => e.id)).size).toBe(ALL_LOCATIONS.length);
    expect(GALACTIC_HOTKEY_ENTRIES.map(e => e.id)).toEqual(INTERSTELLAR_SYSTEMS.map(s => s.id));
  });

  it('puts the whole early game in bank 1: Earth is 1, LEO is 2', () => {
    expect(resolveSlot(SOLAR_HOTKEY_ENTRIES, 0, 0)!.id).toBe('earth_surface');
    expect(resolveSlot(SOLAR_HOTKEY_ENTRIES, 0, 1)!.id).toBe('leo');
  });

  it('fits every interstellar system in a single bank today', () => {
    expect(bankCount(GALACTIC_HOTKEY_ENTRIES.length)).toBe(1);
  });
});

describe('banks', () => {
  it('always reports at least one bank, even for an empty layer', () => {
    expect(bankCount(0)).toBe(1);
    expect(bankCount(1)).toBe(1);
    expect(bankCount(HOTKEY_BANK_SIZE)).toBe(1);
    expect(bankCount(HOTKEY_BANK_SIZE + 1)).toBe(2);
  });

  it('wraps in both directions', () => {
    const total = 23; // three banks
    expect(cycleBank(0, total, 1)).toBe(1);
    expect(cycleBank(2, total, 1)).toBe(0);
    expect(cycleBank(0, total, -1)).toBe(2);
  });

  it('is a no-op when there is only one bank', () => {
    expect(cycleBank(0, 7, 1)).toBe(0);
    expect(cycleBank(0, 7, -1)).toBe(0);
  });

  it('clamps a stale bank index back into range', () => {
    expect(clampBank(5, 23)).toBe(2);
    expect(clampBank(-3, 23)).toBe(0);
    expect(clampBank(NaN, 23)).toBe(0);
  });

  it('returns a partial last bank rather than padding it', () => {
    const e = buildHotkeyEntries(named(23));
    expect(entriesForBank(e, 0)).toHaveLength(10);
    expect(entriesForBank(e, 2)).toHaveLength(3);
    expect(resolveSlot(e, 2, 5)).toBeNull();
  });
});

describe('key matching', () => {
  it('maps the physical number row to slots, 0 last', () => {
    expect(slotFromKeyEvent({ code: 'Digit1', key: '1' })).toBe(0);
    expect(slotFromKeyEvent({ code: 'Digit9', key: '9' })).toBe(8);
    expect(slotFromKeyEvent({ code: 'Digit0', key: '0' })).toBe(9);
    expect(slotFromKeyEvent({ code: 'Numpad0', key: '0' })).toBe(9);
  });

  it('follows the physical key on layouts where the row is not digits', () => {
    // AZERTY: the leftmost number-row key types '&' unshifted.
    expect(slotFromKeyEvent({ code: 'Digit1', key: '&' })).toBe(0);
  });

  it('never fires under a modifier the browser or OS owns', () => {
    expect(slotFromKeyEvent({ code: 'Digit1', key: '1', ctrlKey: true })).toBeNull();
    expect(slotFromKeyEvent({ code: 'Digit1', key: '1', metaKey: true })).toBeNull();
    expect(slotFromKeyEvent({ code: 'Digit1', key: '1', altKey: true })).toBeNull();
    expect(slotFromKeyEvent({ code: 'Digit1', key: '!', shiftKey: true })).toBeNull();
  });

  it('ignores non-digit keys', () => {
    expect(slotFromKeyEvent({ code: 'KeyM', key: 'm' })).toBeNull();
    expect(slotFromKeyEvent({ code: 'Escape', key: 'Escape' })).toBeNull();
    expect(slotFromKeyEvent({ key: 'Enter' })).toBeNull();
  });

  it('recognises the bank key, with Shift meaning backwards', () => {
    expect(isBankCycleEvent({ code: 'Backquote', key: '`' })).toBe(true);
    expect(isBankCycleEvent({ code: 'Backquote', key: '~', shiftKey: true })).toBe(true);
    expect(isBankCycleEvent({ code: 'Backquote', key: '`', ctrlKey: true })).toBe(false);
    expect(isBankCycleEvent({ code: 'Digit1', key: '1' })).toBe(false);
  });
});

describe('binding labels', () => {
  it('spells bank 1 as a bare digit so new players never meet banks', () => {
    expect(describeBinding(SOLAR_HOTKEY_ENTRIES[0])).toBe('1');
  });

  it('names the paging key for later banks', () => {
    const e = buildHotkeyEntries(named(23));
    expect(describeBinding(e[10])).toBe('` ×1 then 1');
    expect(describeBinding(e[20])).toBe('` ×2 then 1');
  });

  it('agrees with the digit table', () => {
    expect(HOTKEY_DIGITS).toHaveLength(HOTKEY_BANK_SIZE);
  });
});
