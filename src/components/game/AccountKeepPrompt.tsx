'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISSED_KEY = 'spacetycoon_account_prompt_dismissed';

/**
 * One-time nudge for anonymous players (2026-09-09): shown once the
 * first-hour guide is complete, because that is the moment a corporation
 * becomes worth keeping. Signing in stores the save on the account (cloud
 * save) so it survives a new device or cleared storage. Dismiss is remembered
 * in localStorage; the status-bar chip stays as the quiet reminder.
 */
export default function AccountKeepPrompt({ show, companyName }: { show: boolean; companyName: string }) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISSED_KEY) === '1'); } catch { setDismissed(false); }
  }, []);
  if (!show || dismissed) return null;
  const dismiss = () => { try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ } setDismissed(true); };
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[55] w-[95vw] max-w-md pointer-events-auto" role="dialog" aria-label="Keep this corporation">
      <div className="rounded-xl border border-cyan-500/30 bg-[rgba(8,10,18,0.97)] shadow-2xl shadow-black/60 p-4">
        <p className="text-white font-semibold text-sm">Keep {companyName}</p>
        <p className="text-slate-300 text-xs leading-relaxed mt-1">
          This corporation is saved only in this browser. A free account saves it to the cloud, so you can continue on any device or after clearing storage — and you keep the corporation you already have.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Link href="/register?callbackUrl=%2Fspace-tycoon" className="inline-flex items-center justify-center rounded-lg bg-cyan-500 text-black text-xs font-semibold px-3 py-2 hover:bg-cyan-400">Create a free account</Link>
          <Link href="/login?callbackUrl=%2Fspace-tycoon" className="text-xs text-cyan-300 hover:text-cyan-200 px-2 py-2">Sign in</Link>
          <button type="button" onClick={dismiss} className="ml-auto text-xs text-slate-400 hover:text-white px-2 py-2" aria-label="Not now">Not now</button>
        </div>
      </div>
    </div>
  );
}
