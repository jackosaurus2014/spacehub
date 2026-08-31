'use client';

import { useState } from 'react';

// "Email me about this company" — no account. Weekly brief, double opt-in
// by email; this form only ever says "check your inbox". Clone of
// src/components/launches/LaunchWatchForm.tsx for the company-brief backend.
export default function CompanyWatchForm({ companyProfileId, companyName, source = 'company-page', compact = false }: { companyProfileId: string; companyName: string; source?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/company-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, companyProfileId, source, website: '' }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setState('sent');
        setMessage(j.status === 'already-verified' ? 'You already get these — nothing more to do.' : 'Check your inbox and confirm. Then: one email every Monday, only when something happened.');
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
    <form onSubmit={submit} className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? 'p-3' : 'p-4'}`} aria-label={`Get a weekly email brief about ${companyName}`}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Email me about {companyName}</div>
          <div className="text-xs text-slate-400 mt-0.5 mb-2">The week&apos;s jobs, contracts, funding, filings and news — Mondays, only when something happened. No account. Unsubscribe in one click.</div>
          <label className="sr-only" htmlFor={`cw-${companyProfileId}`}>Email address</label>
          <input
            id={`cw-${companyProfileId}`}
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" defaultValue="" />
        </div>
        <button type="submit" disabled={state === 'sending'} className="btn-primary text-sm py-2 px-4 flex-shrink-0 disabled:opacity-60">
          {state === 'sending' ? 'Sending…' : 'Brief me'}
        </button>
      </div>
      {state === 'error' && <p className="text-xs text-red-300 mt-2" role="alert">{message}</p>}
    </form>
  );
}
