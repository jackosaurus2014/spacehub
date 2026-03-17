'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '@/components/SubscriptionProvider';
import { trackGA4Event } from '@/lib/analytics';

const CONFETTI_PARTICLES = 40;

function ConfettiParticle({ index }: { index: number }) {
  const colors = [
    'bg-purple-400', 'bg-blue-400', 'bg-emerald-400',
    'bg-amber-400', 'bg-pink-400', 'bg-cyan-400',
  ];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const duration = 2 + Math.random() * 2;
  const size = 4 + Math.random() * 6;

  return (
    <div
      className={`absolute rounded-full ${color} opacity-80 pointer-events-none`}
      style={{
        left: `${left}%`,
        top: '-10px',
        width: `${size}px`,
        height: `${size}px`,
        animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
      }}
    />
  );
}

const QUICK_START_STEPS = [
  {
    title: 'Explore Your Dashboard',
    description: 'Your personalized command center with 30+ modules of space intelligence.',
    href: '/dashboard',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: 'Set Up Alerts',
    description: 'Get notified about launches, contract awards, executive moves, and market shifts.',
    href: '/alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    title: 'Browse Company Profiles',
    description: 'Deep-dive into 200+ space companies with financials, Space Scores, and competitive intel.',
    href: '/company-profiles',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
];

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { refreshSubscription } = useSubscription();
  const [showConfetti, setShowConfetti] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Refresh subscription state to pick up the new plan
    refreshSubscription();

    // Track successful conversion
    trackGA4Event('purchase_complete', {
      session_id: sessionId || 'unknown',
      location: 'checkout_success',
    });

    // Stop confetti after a few seconds
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [sessionId, refreshSubscription]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: CONFETTI_PARTICLES }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Welcome to SpaceNexus Pro!
            </h1>
            <p className="text-lg text-slate-300 mb-2">
              Your subscription is active. The full power of space intelligence is now at your fingertips.
            </p>
            <p className="text-sm text-slate-400">
              A confirmation email has been sent to your inbox.
            </p>
          </div>

          {/* Quick start section */}
          <div className="mt-12 mb-10">
            <h2 className="text-xl font-semibold text-white mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              Here&apos;s what to do first:
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              Three steps to get the most out of your subscription
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {QUICK_START_STEPS.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="group p-5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.08] text-slate-300 group-hover:text-white transition-colors text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-slate-400 group-hover:text-white transition-colors">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-white">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {step.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/dashboard"
              className="btn-primary px-8 py-3 text-base font-semibold"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/pricing"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              View plan details
            </Link>
          </div>

          {/* Support note */}
          <div className="mt-12 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-slate-400 text-sm">
              Need help getting started?{' '}
              <Link href="/contact" className="text-white/90 hover:text-white underline underline-offset-2 transition-colors">
                Contact our support team
              </Link>{' '}
              or check out the{' '}
              <Link href="/getting-started" className="text-white/90 hover:text-white underline underline-offset-2 transition-colors">
                Getting Started guide
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Confetti keyframe animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
