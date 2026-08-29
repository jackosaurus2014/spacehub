'use client';

import { useState } from 'react';

// "Email me about this" — no account. Exactly one scope prop. Double
// opt-in happens by email; this form only ever says "check your inbox".
export default function LaunchWatchForm({ eventId, rocket, site, label, source = 'launch-page', compact = false }: { eventId?: string; rocket?: string; site?: string; label: string; source?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/launch-watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, eventId, rocket, site, source, website: '' }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setState('sent');
        setMessage(j.status === 'already-verified' ? 'You already get these — nothing more to do.' : 'Check your inbox and confirm. Then: a day before, an hour before, and when it flies.');
      } else {
        setState('error');
        setMessage(j.error || 'Something went wrong. Try again in a minute.');
      }
    } catch {
      setState('error');
      setMessage('Network error. Try again in a minute.');
    }
  };

  if (state === 'sent') {
    return (
      <div className={`rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] ${compact ? 'p-3' : 'p-4'}`} role="status">
        <div className="text-sm font-semibold text-emerald-300">Almost done</div>
        <div className="text-xs text-slate-300 mt-0.5">{message}</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? 'p-3' : 'p-4'}`} aria-label={`Get launch alerts for ${label}`}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Email me about {label}</div>
          <div className="text-xs text-slate-400 mt-0.5 mb-2">A day before, an hour before, and when it flies. No account. Unsubscribe in one click.</div>
          <label className="sr-only" htmlFor={`lw-${eventId || rocket || site}`}>Email address</label>
          <input
            id={`lw-${eventId || rocket || site}`}
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" defaultValue="" />
        </div>
        <button type="submit" disabled={state === 'sending'} className="btn-primary text-sm py-2 px-4 flex-shrink-0 disabled:opacity-60">
          {state === 'sending' ? 'Sending…' : 'Alert me'}
        </button>
      </div>
      {state === 'error' && <p className="text-xs text-red-300 mt-2" role="alert">{message}</p>}
    </form>
  );
}
