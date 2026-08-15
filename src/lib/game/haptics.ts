// ─── Haptics (Wave V7 — order acknowledgment & world feedback) ─────────────
// docs/VISUAL_DEPTH_2026-08.md §V7. navigator.vibrate() is a mobile-only,
// coarse-pointer-only channel — there's no Web Audio-style AudioContext to
// gate on, so this mirrors sound-engine.ts's mute-preference pattern (a
// localStorage-persisted toggle) rather than reusing it directly.
//
// Defaults: ON for coarse-pointer (touch) devices, OFF for mice/trackpads
// (spec: "default ON only for coarse pointers"). Hard-off under
// prefers-reduced-motion regardless of the toggle — haptic buzz is motion
// feedback, and CLAUDE.md's reduced-motion invariant covers it.

const STORAGE_KEY = 'spacetycoon_haptics';

let _enabled: boolean | null = null; // null = not yet resolved from storage/default

function prefersCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function resolveEnabled(): boolean {
  if (_enabled !== null) return _enabled;
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved !== null) {
      _enabled = saved === '1';
      return _enabled;
    }
  } catch { /* storage unavailable — fall through to default */ }
  _enabled = prefersCoarsePointer();
  return _enabled;
}

export function isHapticsEnabled(): boolean {
  return resolveEnabled();
}

export function toggleHaptics(): boolean {
  _enabled = !resolveEnabled();
  try { localStorage.setItem(STORAGE_KEY, _enabled ? '1' : '0'); } catch { /* ignore */ }
  return _enabled;
}

/** Fire a vibration pattern. Silently no-ops when: the API doesn't exist
 *  (desktop browsers, iOS Safari — navigator.vibrate is undefined there),
 *  the player has haptics off, or prefers-reduced-motion is set. Never
 *  throws — some browsers reject vibrate() calls outside a user gesture. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (prefersReducedMotion()) return;
  if (!resolveEnabled()) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

/** Order-ack tap — short, single pulse. */
export function hapticAck(): void { vibrate(10); }

/** Completion / hazard buzz — short-long-short, per spec. */
export function hapticCompletion(): void { vibrate([10, 40, 10]); }
