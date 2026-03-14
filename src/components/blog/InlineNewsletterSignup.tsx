'use client';

import { useState } from 'react';
import { trackGA4Event } from '@/lib/analytics';

export default function InlineNewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    trackGA4Event('newsletter_subscribe', { source: 'blog_inline' });
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'blog_inline' }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Check your email to confirm your subscription!');
        setEmail('');
      } else {
        setStatus('error');
        if (data.code === 'ALREADY_SUBSCRIBED') {
          setMessage('This email is already subscribed.');
        } else {
          setMessage(data.error || 'Failed to subscribe. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="mt-12 p-6 md:p-8 bg-white/[0.04] border border-white/[0.08] rounded-xl">
      {status === 'success' ? (
        <div className="text-center py-2">
          <div className="w-10 h-10 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-medium text-sm">{message}</p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-1">
                Get space intelligence delivered weekly
              </h3>
              <p className="text-sm text-slate-400">
                Join 500+ space professionals who get our free weekly intelligence brief.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="send"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              aria-label="Email address"
              className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 transition-colors"
              required
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {status === 'error' && message && (
            <p className="mt-3 text-red-400 text-xs">{message}</p>
          )}
        </>
      )}
    </div>
  );
}
