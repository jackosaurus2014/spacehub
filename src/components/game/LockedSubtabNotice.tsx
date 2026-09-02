'use client';

// ─── Locked Subtab Notice ────────────────────────────────────────────────────
// Shared by the Wave F hub tabs (Contracts/Standings/Markets) to preserve the
// original per-feature corporation-tier gate that a merged-away tab used to
// enforce at the tab level (CLAUDE.md "Staged tab unlocks"). See
// corporation-tiers.ts FOLDED_FEATURE_TIERS.
//
// Six-hub consolidation (2026-09): the shell now renders this in place of ANY
// locked hub sub-view, so it takes a registry icon (`iconName`) as well as
// the legacy emoji string (`icon`) the Wave-F call sites still pass.

import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

interface LockedSubtabNoticeProps {
  /** Legacy decorative glyph (emoji). Prefer `iconName`. */
  icon?: string;
  iconName?: IconName;
  label: string;
  tier: number;
}

export default function LockedSubtabNotice({ icon, iconName, label, tier }: LockedSubtabNoticeProps) {
  return (
    <div className="hud-frame relative text-center py-12 rounded-xl border border-white/[0.06] bg-white/[0.02]" role="status">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="mb-2 flex justify-center text-[var(--ink-3)]"><GameIcon name="lock" size={28} /></div>
      <h3 className="font-hud text-sm font-semibold text-white mb-1 inline-flex items-center gap-1.5">
        {iconName ? <GameIcon name={iconName} size={14} /> : icon ? <span aria-hidden="true">{icon}</span> : null}
        {label} — Locked
      </h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        Unlocks at Corporation Tier {tier}. Keep growing your corporation to reach it.
      </p>
    </div>
  );
}
