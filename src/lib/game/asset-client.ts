// ─── Space Tycoon: client side of the server-authoritative asset routes ─────
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings" and "Phase 3
// slices 2-5". The building handlers, handleStartResearch, onBuildShip,
// handleScrapShip and handleUnlockLocation in page.tsx call the matching
// /api/space-tycoon/assets/* route FIRST and mutate local state only on a
// 2xx ("server-first"). This
// module is the one fetch wrapper they share, and it classifies the outcome:
//
//   ok     — 2xx; `data` is the route's JSON (instanceId, completesAt, cost…)
//   local  — 401 (not signed in) or 404 no_profile (never synced): the
//            player has no server profile, so there is nothing to protect —
//            the handler proceeds exactly as before (local-only play).
//   fail   — anything else (network failure, 4xx with a reason, 429, 5xx):
//            the handler does NOT mutate and surfaces `message`.
//
// A request that takes longer than PENDING_HINT_MS surfaces a small
// "confirming" toast so the order still feels acknowledged.

import { toast } from '@/lib/toast';

export type AssetOpResult<T = Record<string, unknown>> =
  | { kind: 'ok'; data: T }
  | { kind: 'local' }
  | { kind: 'fail'; message: string; code?: string; status?: number };

export const PENDING_HINT_MS = 800;

export async function requestAssetOp<T = Record<string, unknown>>(
  path: 'build' | 'refit' | 'sell' | 'mothball' | 'reactivate' | 'repair' | 'research' | 'ship' | 'scrap' | 'unlock',
  body: Record<string, unknown>,
  label: string,
): Promise<AssetOpResult<T>> {
  let hinted = false;
  const hint = setTimeout(() => {
    hinted = true;
    try { toast.info(`Confirming ${label} with the corporate registry…`, 'Registry'); } catch { /* toast is best-effort */ }
  }, PENDING_HINT_MS);
  try {
    const res = await fetch(`/api/space-tycoon/assets/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) return { kind: 'local' };
    const data = await res.json().catch(() => null) as (Record<string, unknown> & { error?: string; code?: string }) | null;
    if (res.status === 404 && data?.code === 'no_profile') return { kind: 'local' };
    if (res.ok && data) return { kind: 'ok', data: data as unknown as T };
    if (res.status === 429) {
      return { kind: 'fail', status: 429, code: 'rate_limited', message: 'Too many registry orders — wait a moment and try again.' };
    }
    return {
      kind: 'fail',
      status: res.status,
      code: typeof data?.code === 'string' ? data.code : undefined,
      message: typeof data?.error === 'string' ? data.error : `The registry refused the ${label} (HTTP ${res.status}).`,
    };
  } catch {
    return { kind: 'fail', message: `Couldn't reach the corporate registry — the ${label} was not placed. Check your connection and try again.` };
  } finally {
    clearTimeout(hint);
    void hinted;
  }
}

/** Standard failure surface: error sound + warning toast. */
export function reportAssetFailure(result: { message: string }, title: string, playError: () => void): void {
  playError();
  try { toast.warning(result.message, title); } catch { /* best-effort */ }
}
