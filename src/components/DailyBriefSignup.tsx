'use client';

// Small, mount-anywhere signup form for the opt-in Daily Brief (G7): a
// compact auto-compiled morning email at ~07:00 UTC. Reuses the existing
// newsletter subscribe API (double opt-in) with the dailyBrief flag set —
// entirely separate from the M/Th Digest opt-in.
import { useState } from 'react';

interface DailyBriefSignupProps {
  source?: string;
  /** Compact heading shown above the form. */
  title?: string;
}

export default function DailyBriefSignup({
  source = 'daily-brief-form',
  title = 'The Daily Brief',
}: DailyBriefSignupProps) {
  const [email, setEmail] = useState('');
  const [dailyBrief, setDailyBrief] = useState(true);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || state === 'sending') return;

    // Honeypot: bots fill the hidden "website" field; the API rejects any
    // non-empty value, so forward whatever the field holds.
    const honeypot = (new FormData(e.currentTarget).get('website') as string) || '';

    setState('sending');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, dailyBrief, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState('done');
        setMessage(data.message || 'Check your inbox to confirm.');
        setEmail('');
      } else {
        setState('error');
        setMessage(
          data.code === 'ALREADY_SUBSCRIBED'
            ? 'This email is already subscribed (the Daily Brief is already on for it).'
            : data.error || 'Something went wrong. Please try again.'
        );
      }
    } catch {
      setState('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (state === 'done') {
    return (
      <div className="bg-white/[0.04] border border-white/[0.1] rounded-xl p-4">
        <p className="text-sm text-green-300 font-medium">You&apos;re nearly set.</p>
        <p className="text-xs text-slate-400 mt-1">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/[0.04] border border-white/[0.1] rounded-xl p-4">
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-xs text-slate-400 mb-3">
        One compact email every morning at 7am UTC — the next 24h of launches, top stories,
        contracts, funding, and yesterday&apos;s outcomes. Auto-compiled from our trackers.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
        {/* honeypot */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" defaultValue="" />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="btn-primary text-sm py-2 px-4 flex-shrink-0 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Sign up free'}
        </button>
      </div>
      <label className="flex items-center gap-2 mt-3 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={dailyBrief}
          onChange={(e) => setDailyBrief(e.target.checked)}
          className="rounded border-white/[0.2] bg-white/[0.06] text-cyan-500 focus:ring-cyan-500/40"
        />
        Daily Brief (7am UTC)
      </label>
      <p className="text-[11px] text-slate-500 mt-2">
        Double opt-in. Unsubscribe any time — the Daily Brief has its own one-click opt-out.
      </p>
      {state === 'error' && (
        <p className="text-xs text-red-300 mt-2" role="alert">{message}</p>
      )}
    </form>
  );
}
