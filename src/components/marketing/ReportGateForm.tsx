'use client';

import { useState } from 'react';

export default function ReportGateForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatus('error');
      setMessage('Please enter your name.');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          source: 'report-state-of-space-2026',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Check your email to access the full report!');
      } else {
        if (data.code === 'ALREADY_SUBSCRIBED') {
          setStatus('success');
          setMessage('You already have access! Check your inbox for the report link.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Something went wrong. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="relative bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-8 md:p-12 text-center">
        <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">You&apos;re In!</h3>
        <p className="text-emerald-300 text-lg mb-2">{message}</p>
        <p className="text-slate-400 text-sm">
          The full report will be delivered to your inbox shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 rounded-2xl p-8 md:p-12">
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-900/40 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Full Report
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Get the Complete Analysis
          </h3>
          <p className="text-slate-400 max-w-lg mx-auto">
            Enter your details below to receive the full 45-page State of the Space Industry 2026 report,
            including all 8 chapters, data tables, and forecasts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          <div>
            <label htmlFor="report-name" className="block text-sm font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="report-name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              disabled={status === 'loading'}
              required
            />
          </div>
          <div>
            <label htmlFor="report-email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Work Email
            </label>
            <input
              id="report-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="send"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              disabled={status === 'loading'}
              required
            />
          </div>

          {status === 'error' && message && (
            <p className="text-red-400 text-sm text-center">{message}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Download Free Report'
            )}
          </button>
        </form>

        {/* Trust signals */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-6 text-slate-500 text-xs">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Join 10,000+ professionals
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No spam, ever
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unsubscribe anytime
            </span>
          </div>

          {/* Data source logos / badges */}
          <div className="flex items-center gap-4 mt-2">
            <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-[10px] uppercase tracking-wider text-slate-500 font-medium">NASA Data</span>
            <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-[10px] uppercase tracking-wider text-slate-500 font-medium">NOAA</span>
            <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-[10px] uppercase tracking-wider text-slate-500 font-medium">SEC Filings</span>
            <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-[10px] uppercase tracking-wider text-slate-500 font-medium">CelesTrak</span>
            <span className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-[10px] uppercase tracking-wider text-slate-500 font-medium">SAM.gov</span>
          </div>
        </div>
      </div>
    </div>
  );
}
