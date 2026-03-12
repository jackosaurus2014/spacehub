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
  { value: 200, suffix: '+', label: 'Pages & Tools', icon: '\uD83D\uDCCA' },
  { value: 100, suffix: '+', label: 'Companies Profiled', icon: '\uD83C\uDFE2' },
  { value: 50, suffix: '+', label: 'Interactive Tools', icon: '\u2699\uFE0F' },
  { value: 1500, suffix: '+', label: 'Automated Tests', icon: '\u2705' },
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
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          poster="/SpaceNexus%20background.jpg"
        >
          <source src="/Space_Station_Docking_and_Solar_Array.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay on video */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a15]/80 via-[#050a15]/60 to-[#050a15]/95" />
      </div>

      {/* Decorative atmospheric glow orbs */}
      <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] bg-nebula-500/20 rounded-full blur-[160px] pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 -right-48 w-[400px] h-[400px] bg-plasma-500/15 rounded-full blur-[160px] pointer-events-none z-[1]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[200px] pointer-events-none z-[1]" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Headline with animated gradient */}
          <HeroReveal delay={0.3} className="mb-6">
            <h1 className="text-fluid-display font-display font-bold leading-tight">
              <span
                className="text-transparent bg-clip-text bg-[length:200%_auto] animate-[gradient-shift_6s_ease_infinite]"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #67e8f9, #c4b5fd, #f9a8d4, #67e8f9)',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
                }}
              >
                The Space Industry&apos;s Comprehensive Intelligence Platform.
              </span>
            </h1>
          </HeroReveal>

          {/* Subtitle -- condensed value proposition */}
          <HeroReveal delay={0.5} className="mb-10">
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              Real-time data, interactive tools, regulatory intelligence, and market
              analytics &mdash; all in one affordable platform for space industry
              professionals.
            </p>
          </HeroReveal>

          {/* CTA Buttons */}
          <HeroReveal delay={0.7} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/mission-control?utm_source=homepage&utm_medium=hero&utm_campaign=explore"
                className="btn-primary text-base py-4 px-10 shadow-lg shadow-nebula-500/30 inline-flex items-center justify-center"
              >
                Explore the Platform
              </Link>
              <Link
                href="/pricing?utm_source=homepage&utm_medium=hero&utm_campaign=freetrial"
                className="border-2 border-cyan-400 text-base py-4 px-10 rounded-full font-bold uppercase tracking-wide transition-all duration-300 hover:-translate-y-0.5 active:scale-95 bg-[#0a1628] text-[#e0f7ff] hover:bg-cyan-500 hover:text-white hover:border-cyan-500"
                style={{ textShadow: '0 0 8px rgba(34,211,238,0.4)' }}
              >
                Start Free Trial
              </Link>
            </div>
          </HeroReveal>

          {/* Secondary links */}
          <HeroReveal delay={0.9} className="mb-14">
            <div className="flex gap-6 justify-center">
              <Link
                href="/register?utm_source=homepage&utm_medium=hero&utm_campaign=signup"
                className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              >
                Create Free Account
              </Link>
              <span className="text-cyan-400/50">|</span>
              <Link
                href="/news?utm_source=homepage&utm_medium=hero&utm_campaign=news"
                className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
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
        <div className="w-6 h-10 border-2 border-cyan-400/50 rounded-full flex items-start justify-center p-1.5 shadow-lg shadow-cyan-500/20">
          <div className="w-1.5 h-2.5 bg-cyan-400/70 rounded-full animate-pulse" />
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
      className="group/stat relative rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-md px-4 py-5 text-center hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
    >
      <span className="text-2xl mb-1 block group-hover/stat:scale-110 transition-transform duration-200" aria-hidden="true">{stat.icon}</span>
      <span
        ref={ref}
        className="text-3xl md:text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500"
      >
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className="block text-xs md:text-sm text-slate-300 mt-1 font-medium tracking-wide">
        {stat.label}
      </span>
    </div>
  );
}
