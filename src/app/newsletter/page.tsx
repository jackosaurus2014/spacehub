'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'newsletter-page' }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  const relatedModules = PAGE_RELATIONS['newsletter'] || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Free Weekly Newsletter
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              The SpaceNexus Weekly<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Intelligence Brief</span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Free weekly insights delivered to your inbox. The space industry moves fast &mdash; we make sure you never miss what matters.
            </p>

            {/* Signup Form */}
            <div className="max-w-xl mx-auto">
              {status === 'success' ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white mb-2">You&apos;re subscribed!</h3>
                  <p className="text-slate-300 text-sm">
                    Check your inbox for a confirmation email. Your first brief arrives this week.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your work email"
                      required
                      className="w-full px-5 py-4 bg-white/[0.08] border border-white/[0.12] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base whitespace-nowrap"
                  >
                    {status === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Subscribing...
                      </span>
                    ) : (
                      'Subscribe Free'
                    )}
                  </button>
                </form>
              )}

              {status === 'error' && (
                <p className="text-red-400 text-sm mt-3">{errorMessage}</p>
              )}

              <p className="text-slate-500 text-xs mt-4">
                No spam. Unsubscribe anytime. We respect your inbox.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-slate-300 text-sm font-medium">
                Join space professionals who stay informed
              </p>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/10" />
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">Weekly</p>
                <p className="text-slate-500 text-xs">Delivery</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">5 min</p>
                <p className="text-slate-500 text-xs">Read time</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">Free</p>
                <p className="text-slate-500 text-xs">Always</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What subscribers get every week
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Curated by SpaceNexus analysts from 50+ sources, distilled into the insights that matter.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                  </svg>
                ),
                title: 'Top Stories',
                description: 'The 5-7 most important space industry stories of the week, with context and analysis you won\'t find in headlines alone.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Market Movers',
                description: 'Key funding rounds, M&A activity, stock movements, and contract awards. Know where the money is flowing.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Launch Schedule',
                description: 'Upcoming launches for the next 7-14 days with mission details, providers, and payload information.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Regulatory Updates',
                description: 'FCC filings, FAA licensing, export control changes, and policy developments that affect operations.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 hover:border-white/[0.15] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Issue Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">SpaceNexus Intelligence Brief</p>
                  <p className="text-slate-500 text-xs">Sample Issue Preview</p>
                </div>
              </div>
              <span className="text-xs text-slate-500 bg-white/[0.06] px-2.5 py-1 rounded-full">Preview</span>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Top Stories This Week
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-400 ml-4">
                  <li>SpaceX achieves 30th booster flight, setting new reuse record</li>
                  <li>ESA awards Ariane 6 follow-on production contract worth $2.1B</li>
                  <li>India&apos;s Gaganyaan crew capsule completes critical abort test</li>
                </ul>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Market Movers
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-400 ml-4">
                  <li>Rocket Lab (RKLB) up 12% on Neutron development milestone</li>
                  <li>True Anomaly raises $150M Series B for space domain awareness</li>
                  <li>AST SpaceMobile secures $500M debt facility for constellation</li>
                </ul>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  Launches This Week
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-400 ml-4">
                  <li>Falcon 9 | Starlink Group 12-8 | Mar 19 | Cape Canaveral</li>
                  <li>Electron | Synspective StriX-3 | Mar 21 | Mahia Peninsula</li>
                  <li>Ariane 6 | Galileo L14 | Mar 22 | Kourou</li>
                </ul>
              </div>

              <div className="border-t border-white/[0.06] pt-4 text-center">
                <Link
                  href="/intelligence-brief"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  Read full sample brief &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Stay ahead of the space industry
          </h2>
          <p className="text-slate-400 mb-8">
            Every week, we distill the noise into signal. Join professionals at NASA, SpaceX, ESA, and hundreds of space companies who start their week with SpaceNexus.
          </p>

          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300 text-sm">
              You&apos;re already subscribed! Check your inbox for confirmation.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="flex-1 px-5 py-3 bg-white/[0.08] border border-white/[0.12] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Related Modules */}
      {relatedModules.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-white mb-6 text-center">Explore Related Modules</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {relatedModules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group flex flex-col items-center gap-2 p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:border-white/[0.15] hover:bg-white/[0.06] transition-all text-center"
                >
                  <span className="text-2xl">{mod.icon}</span>
                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{mod.name}</span>
                  <span className="text-xs text-slate-500">{mod.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
