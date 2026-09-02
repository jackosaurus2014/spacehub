'use client';

// ─── Overlay manager (GAME_DESIGN_REVIEW_2026-09 §3 "Overlay stacking") ─────
// Mounts AT MOST ONE of the shell's overlay surfaces at a time, by the fixed
// priority in lib/game/overlay-manager.ts. The shell declares every surface
// as a slot — `wants` (does its backing state say "show me?") plus a render
// thunk — and this component renders only the winner. Losers are not mounted
// at all, so exactly one useModalA11y trap can ever be installed; each
// overlay keeps its own trap unchanged.
//
// Queueing is implicit: every `wants` is derived from state that persists
// (queue heads, pendingChoice, flags), so a surface that lost arbitration
// mounts the moment the winner clears. Nothing here drops anything.

import { useMemo, type ReactNode } from 'react';
import { arbitrateOverlays, type OverlayArbitration, type OverlayId } from '@/lib/game/overlay-manager';

export interface OverlaySlot {
  id: OverlayId;
  wants: boolean;
  render: () => ReactNode;
}

/** The arbitration for a set of slots — exported so the shell (or a test)
 *  can read `queued` for telemetry without rendering. */
export function useOverlayArbitration(slots: OverlaySlot[]): OverlayArbitration {
  const key = slots.map(s => `${s.id}=${s.wants ? 1 : 0}`).join('|');
  return useMemo(() => {
    const wants: Partial<Record<OverlayId, boolean>> = {};
    for (const s of slots) wants[s.id] = s.wants;
    return arbitrateOverlays(wants);
    // `key` is the dependency: it changes exactly when a slot's want flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export default function OverlayManager({ slots }: { slots: OverlaySlot[] }) {
  const { active } = useOverlayArbitration(slots);
  if (!active) return null;
  const slot = slots.find(s => s.id === active);
  if (!slot) return null;
  // data-overlay lets a11y audits and tests see which surface won.
  return <div data-overlay={active} className="contents">{slot.render()}</div>;
}
