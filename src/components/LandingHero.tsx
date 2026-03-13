'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Animated counter hook — counts from 0 to `end` when visible       */
/* ------------------------------------------------------------------ */
function useCountUp(end: number, duration = 2000, startDelay = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now() + startDelay;
          const step = (now: number) => {
            const elapsed = Math.max(0, now - startTime);
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, startDelay]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Platform stat definitions                                          */
/* ------------------------------------------------------------------ */
const PLATFORM_STATS = [
  { value: 236, suffix: '+', label: 'Pages & Tools', icon: '\uD83D\uDCCA' },
  { value: 101, suffix: '+', label: 'Companies Profiled', icon: '\uD83C\uDFE2' },
  { value: 50, suffix: '+', label: 'Data Sources', icon: '\uD83D\uDE80' },
  { value: 1589, suffix: '+', label: 'Automated Tests', icon: '\u2705' },
];

/* Staggered entrance: each child gets an increasing delay */
function HeroReveal({ children, delay, className = '' }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <div
      className={`animate-reveal-up ${className}`}
      style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          poster="/SpaceNexus%20background.jpg"
        >
          <source src="/Space_Station_Docking_and_Solar_Array.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay on video */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a15]/80 via-[#050a15]/60 to-[#050a15]/95" />
      </div>

      {/* Subtle atmospheric accent — single, restrained */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-400/5 rounded-full blur-[200px] pointer-events-none z-[1]" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Headline — clean Inter, tight tracking */}
          <HeroReveal delay={0.3} className="mb-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-white">
              Space Industry<br />Intelligence Platform
            </h1>
          </HeroReveal>

          {/* Subtitle -- condensed value proposition */}
          <HeroReveal delay={0.5} className="mb-10">
            <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Real-time data, interactive tools, regulatory intelligence, and market
              analytics — all in one platform for space industry professionals.
            </p>
          </HeroReveal>

          {/* CTA Buttons — clean, minimal */}
          <HeroReveal delay={0.7} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/mission-control?utm_source=homepage&utm_medium=hero&utm_campaign=explore"
                className="bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] inline-flex items-center justify-center"
              >
                Get Started
              </Link>
              <Link
                href="/pricing?utm_source=homepage&utm_medium=hero&utm_campaign=freetrial"
                className="border border-white/20 text-white font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-[0.98] inline-flex items-center justify-center"
              >
                View Pricing
              </Link>
            </div>
          </HeroReveal>

          {/* Trust micro-copy */}
          <HeroReveal delay={0.85} className="mb-4">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              No credit card required &middot; 14-day free trial &middot; Cancel anytime
            </p>
          </HeroReveal>

          {/* Secondary links */}
          <HeroReveal delay={0.9} className="mb-14">
            <div className="flex gap-6 justify-center">
              <Link
                href="/register?utm_source=homepage&utm_medium=hero&utm_campaign=signup"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Create Free Account
              </Link>
              <span className="text-slate-600">·</span>
              <Link
                href="/news?utm_source=homepage&utm_medium=hero&utm_campaign=news"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Browse News
              </Link>
            </div>
          </HeroReveal>

          {/* Animated Platform Stats */}
          <HeroReveal delay={1.1}>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto"
              role="list"
              aria-label="Platform statistics"
            >
              {PLATFORM_STATS.map((stat, i) => (
                <StatCounter key={stat.label} stat={stat} index={i} />
              ))}
            </div>
          </HeroReveal>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float animate-reveal-up"
        style={{ animationDelay: '1.6s', animationFillMode: 'both' }}
      >
        <div className="w-6 h-10 border-2 border-white/15 rounded-full flex items-start justify-center p-1.5 shadow-lg shadow-black/10">
          <div className="w-1.5 h-2.5 bg-white/70 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bottom gradient divider */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050a15] to-transparent z-[2]" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual stat counter tile                                       */
/* ------------------------------------------------------------------ */
function StatCounter({
  stat,
  index,
}: {
  stat: (typeof PLATFORM_STATS)[number];
  index: number;
}) {
  const { count, ref } = useCountUp(stat.value, 2200, index * 150);

  return (
    <div
      role="listitem"
      className="relative rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-5 text-center hover:border-white/[0.12] transition-all duration-200"
    >
      <span className="text-xl mb-1 block" aria-hidden="true">{stat.icon}</span>
      <span
        ref={ref}
        className="text-2xl md:text-3xl font-semibold font-mono text-white tracking-tight"
      >
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className="block text-xs text-slate-500 mt-1">
        {stat.label}
      </span>
    </div>
  );
}
