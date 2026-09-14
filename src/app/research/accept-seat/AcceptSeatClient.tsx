'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AcceptSeatClient({ token }: { token: string }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <p className="text-slate-300" role="alert">
        This link is missing its invite token. Ask the account owner to send the
        invitation again.
      </p>
    );
  }

  if (status === 'loading') {
    return <p className="text-slate-400">Checking your session…</p>;
  }

  if (!session?.user) {
    return (
      <div className="space-y-3">
        <p className="text-slate-300">
          Sign in with the email address the invitation was sent to, then come
          back to this link. A seat is bound to the address it was issued to.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/research/accept-seat?token=${token}`)}`}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const accept = async () => {
    setState('busy');
    setMessage(null);
    try {
      const res = await fetch('/api/research/seats/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.message || data.error || 'Could not accept that invite.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setMessage('Something went wrong. Please try again.');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className="space-y-3">
        <p className="text-emerald-300" role="status">
          Your seat is active.
        </p>
        <Link
          href="/research/workspace"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Open the Research workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-300">
        You are signed in as <strong className="text-white">{session.user.email}</strong>.
        Accepting gives this account the Research workspace: exports, portfolio
        exposure, screens, Space Score history and the quarterly report.
      </p>
      {message && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={accept}
        disabled={state === 'busy'}
        className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
      >
        {state === 'busy' ? 'Accepting…' : 'Accept seat'}
      </button>
    </div>
  );
}
