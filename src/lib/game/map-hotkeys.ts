// ─── Space Tycoon: Map Jump Hotkeys ─────────────────────────────────────────
// Number-key selection for map bodies, the way an RTS binds control groups.
// `1`–`9` and `0` select the ten slots of the ACTIVE BANK; `` ` `` pages to
// the next bank (Shift+`` ` `` pages back). Ten slots per bank, unbounded
// bank count — which is why this is banks rather than Shift+digit for 11-20:
// the solar layer already holds 23 bodies and CLAUDE.md's design invariants
// require every feature to extend to the interstellar era rather than cap
// out at some fixed key count.
//
// Slot assignment is by CANONICAL order (ALL_LOCATIONS / INTERSTELLAR_SYSTEMS),
// NOT by what the player has unlocked. Muscle memory is the entire point of a
// hotkey: `4` must be Lunar Orbit in hour 1 and in year 3. Locked bodies keep
// their slot and jumping to one opens its unlock panel — the same thing the
// keyboard Location List does when you activate a locked row.
//
// Accessibility: this module is the single derivation behind both the key
// handler and the visible HUD legend, so the binding a player reads is
// provably the binding that fires. Every slot is also a real button, so the
// feature is fully usable without ever pressing a key.

import { ALL_LOCATIONS } from './solar-system';
import { INTERSTELLAR_SYSTEMS } from './interstellar';

export const HOTKEY_BANK_SIZE = 10;

/** Digit labels in slot order. `0` is the tenth slot, as on a keyboard row. */
export const HOTKEY_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

/** The key that pages between banks, in the two forms a UI needs to say it. */
export const BANK_CYCLE_KEY = '`';
export const BANK_CYCLE_KEY_LABEL = 'Backquote';

export interface HotkeyEntry {
  id: string;
  name: string;
  /** 0-based position in the canonical list. */
  index: number;
  /** 0-based bank. */
  bank: number;
  /** 0-based position within the bank (0-9). */
  slot: number;
  /** The digit the player presses: '1'-'9' then '0'. */
  digit: string;
}

/** Assign canonical slots. Pure — the caller supplies the ordered list. */
export function buildHotkeyEntries(items: { id: string; name: string }[]): HotkeyEntry[] {
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    index,
    bank: Math.floor(index / HOTKEY_BANK_SIZE),
    slot: index % HOTKEY_BANK_SIZE,
    digit: HOTKEY_DIGITS[index % HOTKEY_BANK_SIZE],
  }));
}

/** How many banks a list of this size needs. Always at least 1, so a HUD
 *  built from this never has to special-case an empty layer. */
export function bankCount(total: number): number {
  return Math.max(1, Math.ceil(total / HOTKEY_BANK_SIZE));
}

/** The (up to ten) entries a bank holds, in slot order. */
export function entriesForBank(entries: HotkeyEntry[], bank: number): HotkeyEntry[] {
  return entries.filter(e => e.bank === bank);
}

/** Page banks, wrapping in both directions. `total` is the item count, not
 *  the bank count, so callers never compute the ceiling themselves. */
export function cycleBank(bank: number, total: number, dir: 1 | -1 = 1): number {
  const banks = bankCount(total);
  return ((bank + dir) % banks + banks) % banks;
}

/** Keep a bank index in range after the underlying list shrinks or the
 *  player switches layers. */
export function clampBank(bank: number, total: number): number {
  const banks = bankCount(total);
  if (!Number.isFinite(bank) || bank < 0) return 0;
  return Math.min(Math.floor(bank), banks - 1);
}

type KeyLike = {
  key?: string;
  code?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

/** True when the event carries a modifier that means the browser, the OS or
 *  a screen reader owns the chord — Ctrl+1..9 switches browser tabs, Alt+
 *  digit is a menu accelerator, and Shift+digit is punctuation. */
function hasBlockingModifier(e: KeyLike): boolean {
  return !!(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey);
}

/** Which slot (0-9) a keydown asks for, or null if it isn't a jump key.
 *
 *  `code` is preferred over `key` so the binding follows the PHYSICAL number
 *  row: on AZERTY the top-row keys type `&é"` unshifted, and a player there
 *  still expects the leftmost key to be slot 1. `key` is the fallback for
 *  environments that don't populate `code`. */
export function slotFromKeyEvent(e: KeyLike): number | null {
  if (hasBlockingModifier(e)) return null;
  const code = e.code;
  if (code) {
    const m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (m) return m[1] === '0' ? 9 : Number(m[1]) - 1;
    // A `code` we recognise as "not a digit" is authoritative — don't fall
    // through to `key` and re-interpret a shifted/IME character as a digit.
    if (/^(?:Digit|Numpad|Key)/.test(code)) return null;
  }
  const key = e.key;
  if (key && /^[0-9]$/.test(key)) return key === '0' ? 9 : Number(key) - 1;
  return null;
}

/** True when this keydown is the bank-paging key. Shift is ALLOWED here (and
 *  means "page backwards"), unlike the digit keys. */
export function isBankCycleEvent(e: KeyLike): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.code === 'Backquote') return true;
  return e.key === '`' || e.key === '~';
}

/** The entry a (bank, slot) pair names, or null when that slot is empty —
 *  the last bank is usually partial. */
export function resolveSlot(entries: HotkeyEntry[], bank: number, slot: number): HotkeyEntry | null {
  return entries.find(e => e.bank === bank && e.slot === slot) ?? null;
}

/** Human-readable binding for tooltips, `aria-keyshortcuts` and the HUD.
 *  Bank 1 needs no preamble, which is why a player with ten or fewer bodies
 *  never has to learn that banks exist. */
export function describeBinding(entry: HotkeyEntry): string {
  return entry.bank === 0 ? entry.digit : `${BANK_CYCLE_KEY} ×${entry.bank} then ${entry.digit}`;
}

// ── Canonical per-layer tables ──────────────────────────────────────────────
// Built once at module load; both are static for the life of a world.

/** 23 solar bodies: the 11 core locations then the 12 colony bodies, so a
 *  new player's entire early game sits in bank 1 and the colony expansion
 *  arrives as bank 2 without renumbering anything they already learned. */
export const SOLAR_HOTKEY_ENTRIES: HotkeyEntry[] = buildHotkeyEntries(
  ALL_LOCATIONS.map(l => ({ id: l.id, name: l.name })),
);

export const GALACTIC_HOTKEY_ENTRIES: HotkeyEntry[] = buildHotkeyEntries(
  INTERSTELLAR_SYSTEMS.map(s => ({ id: s.id, name: s.name })),
);
