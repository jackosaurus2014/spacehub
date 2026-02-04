'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface NewsletterSignupProps {
  variant?: 'cta' | 'footer';
  source?: string;
}

export default function NewsletterSignup({
  variant = 'cta',
  source = 'website',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  // Check for newsletter status in URL (from verification/unsubscribe redirects)
  useEffect(() => {
    const newsletterStatus = searchParams.get('newsletter');
    if (newsletterStatus) {
      switch (newsletterStatus) {
        case 'verified':
          setStatus('success');
          setMessage('Email verified! You\'re now subscribed to our newsletter.');
          break;
        case 'already_verified':
          setStatus('success');
          setMessage('Your email is already verified.');
          break;
        case 'unsubscribed':
          setMessage('You\'ve been unsubscribed from our newsletter.');
          break;
        case 'already_unsubscribed':
          setMessage('You\'re already unsubscribed.');
          break;
        case 'error':
          setStatus('error');
          const reason = searchParams.get('reason');
          setMessage(reason === 'invalid_token' ? 'Invalid or expired link.' : 'Something went wrong. Please try again.');
          break;
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Check your email to confirm your subscription!');
        setEmail('');
        setName('');
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

  if (variant === 'footer') {
    return (
      <div>
        <h4 className="text-star-200 font-semibold text-sm uppercase tracking-wider mb-4">
          Newsletter
        </h4>
        <p className="text-star-400 text-sm mb-4">
          Get daily space industry insights delivered to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="w-full px-3 py-2 text-sm bg-space-900/50 border border-white/10 rounded-lg text-white placeholder:text-star-500 focus:outline-none focus:border-nebula-500/50 transition-colors"
            required
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="w-full px-3 py-2 text-sm font-medium bg-nebula-600 hover:bg-nebula-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        {message && (
          <p
            className={`mt-3 text-xs ${
              status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-star-400'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  // CTA variant (main page)
  return (
    <div className="relative card p-10 md:p-16 text-center rounded-3xl glow-border overflow-hidden">
      {/* Decorative glow orb */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-nebula-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative">
        <h2 className="text-3xl md:text-display-md font-display font-bold text-white mb-4">
          Stay Ahead of the Curve
        </h2>
        <p className="text-lg text-star-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Subscribe to our daily digest and get curated space industry news, AI-powered analysis,
          and expert insights delivered to your inbox every morning.
        </p>

        {status === 'success' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 max-w-md mx-auto">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="flex-1 px-4 py-3 bg-space-900/50 border border-white/10 rounded-xl text-white placeholder:text-star-500 focus:outline-none focus:border-nebula-500/50 transition-colors"
                disabled={status === 'loading'}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 px-4 py-3 bg-space-900/50 border border-white/10 rounded-xl text-white placeholder:text-star-500 focus:outline-none focus:border-nebula-500/50 transition-colors"
                required
                disabled={status === 'loading'}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="btn-primary text-base py-4 px-10 w-full sm:w-auto"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Subscribing...
                </span>
              ) : (
                'Subscribe to Newsletter'
              )}
            </button>
            {status === 'error' && (
              <p className="mt-4 text-red-400 text-sm">{message}</p>
            )}
          </form>
        )}

        <p className="mt-6 text-star-500 text-sm">
          Join 10,000+ space enthusiasts. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
