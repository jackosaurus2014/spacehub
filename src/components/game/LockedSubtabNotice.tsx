'use client';

// ─── Locked Subtab Notice ────────────────────────────────────────────────────
// Shared by the Wave F hub tabs (Contracts/Standings/Markets) to preserve the
// original per-feature corporation-tier gate that a merged-away tab used to
// enforce at the tab level (CLAUDE.md "Staged tab unlocks"). See
// corporation-tiers.ts FOLDED_FEATURE_TIERS.

interface LockedSubtabNoticeProps {
  icon: string;
  label: string;
  tier: number;
}

export default function LockedSubtabNotice({ icon, label, tier }: LockedSubtabNoticeProps) {
  return (
    <div className="hud-frame relative text-center py-12 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="text-3xl mb-2" aria-hidden="true">🔒</div>
      <h3 className="font-hud text-sm font-semibold text-white mb-1">{icon} {label} — Locked</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        Unlocks at Corporation Tier {tier}. Keep growing your corporation to reach it.
      </p>
    </div>
  );
}
