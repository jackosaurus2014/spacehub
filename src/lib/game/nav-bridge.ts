/**
 * Navigation bridge (2026-09-13). The game's only way to change tabs is
 * page.tsx's `navigateToTab(token)` (a React callback that resolves hub
 * tokens such as 'reports:mail' through lib/game/hubs.ts). Code that runs
 * outside React — a toast action from useGameSync's money correction, an
 * engine-side notice — has no handle on it. Same posture as sync-bridge.ts:
 * page.tsx registers the callback on mount, callers fire and forget, and
 * nothing is lost when no game is mounted (the call is a no-op).
 */

type NavigateFn = (token: string) => void;

let navigate: NavigateFn | null = null;

export function registerNavigate(fn: NavigateFn | null): void {
  navigate = fn;
}

/** Ask the mounted game shell to open `token` (a tab id or hub token such
 *  as 'reports:mail'). Returns false when no shell is registered. */
export function navigateTo(token: string): boolean {
  if (!navigate || !token) return false;
  try {
    navigate(token);
    return true;
  } catch {
    return false;
  }
}

/** Test helper. */
export function __resetNavBridge(): void {
  navigate = null;
}
