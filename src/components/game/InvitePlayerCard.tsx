'use client';

import { useState } from 'react';

// Corp-page invite: copy a referral link. Players who join through it start
// as this corporation's mentee (src/lib/game/referrals.ts), so the reward
// is the existing mentor bonus — earned only while the recruit plays.
export default function InvitePlayerCard({ inviteUrl, companyName, recruited }: { inviteUrl: string; companyName: string; recruited: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your invite link', inviteUrl);
    }
  };
  const share = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: `Join ${companyName} in Space Tycoon`, text: `Found your corporation and compete with mine — free, no pay-to-win.`, url: inviteUrl }); return; } catch { /* cancelled */ }
    }
    copy();
  };
  return (
    <div className="hud-frame game-panel p-4 sm:p-5">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="game-label">Recruit a rival</p>
          <p className="text-sm text-slate-300 mt-1">
            Players who join through this link start as your mentee: they get a head-start boost, you earn up to +5% revenue while they grow.
          </p>
          {recruited > 0 && <p className="text-xs text-cyan-300 mt-1">{recruited} player{recruited === 1 ? '' : 's'} recruited so far</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={copy} className="px-3 py-2 text-xs font-semibold rounded border border-white/15 text-white hover:bg-white/[0.06] transition-colors">
            {copied ? 'Copied ✓' : 'Copy invite link'}
          </button>
          <button type="button" onClick={share} className="px-3 py-2 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
