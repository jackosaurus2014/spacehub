// ─── Density Modes (Wave V8 — type scale & density) ─────────────────────────
// docs/VISUAL_DEPTH_2026-08.md §V8. A player setting, independent of the
// site-wide persona/density system (src/lib/user-preferences.ts, three
// states on documentElement) — this is a Space-Tycoon-scoped, two-state
// toggle applied to the game root only, so it never bleeds into non-game
// pages. Mirrors haptics.ts's localStorage-persisted-module-singleton
// pattern (src/lib/game/haptics.ts) rather than the site's preferences
// object, since it's a single boolean-ish choice with no other game-save
// coupling — same reasoning that kept mute/haptics out of GameState.
//
// Comfortable is the default (new-player default per CLAUDE.md's
// "information density scaling novice→veteran" canon) and the phone-forced
// value — compact is unavailable under 640px regardless of the stored
// preference (see the `[data-density="compact"]` mobile override in
// GameStyles.tsx), because tightened padding risks the 44px touch-target
// floor on small screens.

export type GameDensity = 'comfortable' | 'compact';

const STORAGE_KEY = 'spacetycoon_density';
const DEFAULT_DENSITY: GameDensity = 'comfortable';

let _density: GameDensity | null = null; // null = not yet resolved from storage

function isValidDensity(v: unknown): v is GameDensity {
  return v === 'comfortable' || v === 'compact';
}

/** Current density, resolved from localStorage on first call (falls back to
 *  the comfortable default when storage is unavailable or unset — never
 *  throws). Pass an explicit override to derive from a value other than
 *  localStorage (used by tests). */
export function getGameDensity(): GameDensity {
  if (_density !== null) return _density;
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (isValidDensity(saved)) {
      _density = saved;
      return _density;
    }
  } catch { /* storage unavailable — fall through to default */ }
  _density = DEFAULT_DENSITY;
  return _density;
}

export function setGameDensity(density: GameDensity): void {
  _density = density;
  try { localStorage.setItem(STORAGE_KEY, density); } catch { /* ignore */ }
}

export function toggleGameDensity(): GameDensity {
  const next = getGameDensity() === 'compact' ? 'comfortable' : 'compact';
  setGameDensity(next);
  return next;
}

/** Test-only escape hatch — clears the resolved-in-memory cache so a test
 *  can re-resolve from a freshly mocked localStorage. Not used by app code. */
export function __resetGameDensityCacheForTests(): void {
  _density = null;
}
