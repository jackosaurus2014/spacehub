'use client';

/**
 * Job-alert signup island for the /jobs hub.
 *
 * Lifted from SpaceTalentClient's "Save Search + Email Me" flow: the same
 * POST /api/saved-searches payload (searchType 'space_jobs', alertEnabled),
 * minus the filter state — this saves an "all space jobs" alert. Filtered
 * alerts still live on the board itself. Signed-out visitors get a real link
 * to /login (with a return path back here) rather than a dead button.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import { clientLogger } from '@/lib/client-logger';

export default function JobAlertSignup() {
  const { status } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Job alert: All space jobs',
          searchType: 'space_jobs',
          filters: {},
          query: null,
          alertEnabled: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(extractApiError(json, 'Failed to save job alert'));
        return;
      }
      setSaved(true);
      toast.success("Alert saved — we'll email you when new space jobs post.");
    } catch (err) {
      clientLogger.error('Failed to save job alert from /jobs', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to save job alert');
    } finally {
      setSaving(false);
    }
  };

  const buttonClass =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg text-sm font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500/25 hover:text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60';

  if (status === 'authenticated') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving || saved} className={buttonClass}>
          <span aria-hidden="true">🔔</span>
          {saved ? 'Alert saved' : saving ? 'Saving…' : 'Email me new space jobs'}
        </button>
        <Link href="/space-talent?tab=jobs" className="text-sm text-slate-400 hover:text-white underline underline-offset-2 min-h-[44px] inline-flex items-center">
          Want a filtered alert? Set it on the board
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/login?returnTo=${encodeURIComponent('/jobs')}`} className={buttonClass}>
        <span aria-hidden="true">🔔</span>
        Sign in to get job alerts by email
      </Link>
      <span className="text-sm text-slate-400">Free account · alerts go out each morning as new roles land.</span>
    </div>
  );
}
