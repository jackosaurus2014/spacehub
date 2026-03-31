'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/* Staggered entrance */
function Reveal({ children, delay, className = '' }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <div
      className={`animate-reveal-up ${className}`}
      style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

/** Platform stat constants — exported so pricing/register pages can reuse them */
export const PLATFORM_STATS = [
  { value: '264+', label: 'Modules & Tools' },
  { value: '258+', label: 'Original Articles' },
  { value: '50+', label: 'Live Data Sources' },
  { value: '10K+', label: 'Tracked Objects' },
];

interface HeroContentCard {
  type: 'blog' | 'news';
  title: string;
  snippet: string;
  href: string;
  source?: string;
}

interface LandingHeroProps {
  featuredArticle?: HeroContentCard | null;
  trendingNews?: HeroContentCard | null;
}

/** Mini live data card for the right panel */
function DataCard({ label, value, sub, live, delay }: { label: string; value: string; sub?: string; live?: boolean; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-default)] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium">{label}</span>
          {live && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#56F000] animate-pulse" />
              <span className="text-[8px] text-[#56F000] font-semibold tracking-wider">LIVE</span>
            </span>
          )}
        </div>
        <p className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{sub}</p>}
      </div>
    </Reveal>
  );
}

export default function LandingHero({ featuredArticle, trendingNews }: LandingHeroProps) {
  // Fetch live metrics for the data preview via the /api/pulse endpoint
  const [nextLaunch, setNextLaunch] = useState<string>('—');
  const [launchName, setLaunchName] = useState<string>('');
  const [activeSats, setActiveSats] = useState<string>('10,200+');
  const [satsSub, setSatsSub] = useState<string>('tracked in database');
  const [weatherSummary, setWeatherSummary] = useState<string>('$546B');
  const [weatherSub, setWeatherSub] = useState<string>('Space Economy');
  const [fundingValue, setFundingValue] = useState<string>('—');
  const [fundingSub, setFundingSub] = useState<string>('loading...');
  const [pulseLive, setPulseLive] = useState(false);

  useEffect(() => {
    // Fetch pulse data for satellite count, weather, and next launch
    fetch('/api/pulse')
      .then(r => r.json())
      .then(res => {
        if (!res.success || !res.data) return;
        const data = res.data;
        setPulseLive(true);

        // Next launch
        if (data.nextLaunch) {
          const diff = new Date(data.nextLaunch.date).getTime() - Date.now();
          if (diff > 0) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            setNextLaunch(d > 0 ? `T-${d}d ${h}h` : `T-${h}h`);
          } else {
            setNextLaunch('Launched');
          }
          setLaunchName(data.nextLaunch.name?.slice(0, 30) || '');
        }

        // Active satellites from DB
        if (data.activeSatellites && data.activeSatellites > 0) {
          setActiveSats(data.activeSatellites.toLocaleString());
          setSatsSub('active in database');
        }

        // Space weather
        if (data.spaceWeather) {
          const sw = data.spaceWeather;
          const severityMap: Record<string, string> = {
            quiet: 'Quiet',
            minor: 'Minor activity',
            moderate: 'Moderate',
            severe: 'Severe',
          };
          setWeatherSummary(severityMap[sw.severity] || 'Quiet');
          setWeatherSub(sw.summary || 'Space weather nominal');
        }
      })
      .catch(() => {
        // Fall back to events API for launch countdown
        fetch('/api/events?limit=1')
          .then(r => r.json())
          .then(data => {
            if (data.events?.[0]) {
              const evt = data.events[0];
              const diff = new Date(evt.launchDate).getTime() - Date.now();
              if (diff > 0) {
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                setNextLaunch(d > 0 ? `T-${d}d ${h}h` : `T-${h}h`);
              } else {
                setNextLaunch('Launched');
              }
              setLaunchName(evt.name?.slice(0, 30) || '');
            }
          })
          .catch(() => {});
      });

    // Fetch funding stats for the VC Funding card
    fetch('/api/funding-tracker/stats')
      .then(r => r.json())
      .then(data => {
        if (data.summary) {
          const total = data.summary.last12MonthsTotal;
          if (total > 0) {
            // Format as $X.XB or $XXXM
            if (total >= 1_000_000_000) {
              setFundingValue(`$${(total / 1_000_000_000).toFixed(1)}B`);
            } else if (total >= 1_000_000) {
              setFundingValue(`$${Math.round(total / 1_000_000)}M`);
            } else {
              setFundingValue(`$${total.toLocaleString()}`);
            }
            setFundingSub(`${data.summary.last12MonthsDealCount} deals (12 mo)`);
          } else {
            // No funding data in DB yet — show static placeholder
            setFundingValue('$2.1B');
            setFundingSub('VC Funding (est.)');
          }
        }
      })
      .catch(() => {
        // Static fallback
        setFundingValue('$2.1B');
        setFundingSub('VC Funding Q1 (est.)');
      });
  }, []);

  return (
    <section className="relative min-h-[80vh] md:min-h-[88vh] flex items-center overflow-hidden">
      {/* Hero background illustration */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/art/hero-landing.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-15"
          priority
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/70 to-[#09090b]" />
      </div>

      {/* Single accent glow — one intentional light source at 8% opacity */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: '20%',
          left: '35%',
          width: '800px',
          height: '600px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08), transparent 70%)',
        }}
      />

      {/* Content — asymmetric 60/40 layout */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left column — 7/12 on desktop */}
          <div className="lg:col-span-7">
            {/* Status badge */}
            <Reveal delay={0.15} className="mb-8">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#56F000] animate-pulse" />
                <span className="text-[11px] text-[var(--text-secondary)] font-medium tracking-wide">50+ live data sources connected</span>
              </div>
            </Reveal>

            {/* Headline — Satoshi Black, left-aligned, intentional line breaks */}
            <Reveal delay={0.3} className="mb-6">
              <h1 className="text-display text-[clamp(2.5rem,5vw+1rem,4.5rem)] text-[var(--text-primary)]">
                The terminal<br className="hidden sm:block" />
                for space<br className="hidden sm:block" />
                business.
              </h1>
            </Reveal>

            {/* Value prop */}
            <Reveal delay={0.45} className="mb-10">
              <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-lg leading-relaxed">
                Track launches, monitor satellites, analyze funding rounds, and research 200+ companies. Real-time intelligence for the space industry.
              </p>
            </Reveal>

            {/* Single primary CTA — indigo, not white */}
            <Reveal delay={0.55} className="mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/mission-control"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded text-sm font-semibold text-white transition-all duration-150"
                  style={{
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-bright)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(99, 102, 241, 0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 0 rgba(99, 102, 241, 0)'; }}
                >
                  Get Started — Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors font-medium py-3.5"
                >
                  View pricing →
                </Link>
              </div>
            </Reveal>

            {/* Trust line */}
            <Reveal delay={0.65}>
              <p className="text-xs text-[var(--text-muted)]">
                Instant access. No credit card. 14-day full trial.
              </p>
            </Reveal>
          </div>

          {/* Right column — 5/12 on desktop: live data preview */}
          <div className="lg:col-span-5 hidden lg:block">
            <Reveal delay={0.5}>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
                {/* Terminal chrome */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-void)]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A]/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#30D158]/40" />
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider uppercase">spacenexus:~/dashboard</span>
                  </div>
                  <span className="live-badge text-[7px]">SPACE DATA</span>
                </div>

                {/* Data cards grid — values fetched from /api/pulse and /api/funding-tracker/stats */}
                <div className="p-3 grid grid-cols-2 gap-2.5">
                  <DataCard label="Next Launch" value={nextLaunch} sub={launchName} live delay={0.65} />
                  <DataCard label="Active Sats" value={activeSats} sub={satsSub} live={pulseLive} delay={0.7} />
                  <DataCard label="Space Weather" value={weatherSummary} sub={weatherSub} live={pulseLive} delay={0.75} />
                  <DataCard label="VC Funding" value={fundingValue} sub={fundingSub} live={fundingValue !== '—'} delay={0.8} />
                </div>

                {/* Bottom strip */}
                <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] font-mono">264 modules · 258 articles · 50+ sources</span>
                  <Link href="/mission-control" className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-primary-bright)] font-medium transition-colors">
                    Open Dashboard →
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Featured content below the terminal */}
            {(featuredArticle || trendingNews) && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {trendingNews && (
                  <Reveal delay={0.9}>
                    <Link
                      href={trendingNews.href}
                      className="group flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)] transition-colors"
                    >
                      <span className="flex-shrink-0 mt-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">Breaking</span>
                        <p className="text-xs text-[var(--text-primary)] font-medium line-clamp-1 mt-0.5">{trendingNews.title}</p>
                      </div>
                    </Link>
                  </Reveal>
                )}
                {featuredArticle && (
                  <Reveal delay={0.95}>
                    <Link
                      href={featuredArticle.href}
                      className="group flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">Trending</span>
                        <p className="text-xs text-[var(--text-primary)] font-medium line-clamp-1 mt-0.5">{featuredArticle.title}</p>
                      </div>
                    </Link>
                  </Reveal>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade to page bg */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-void)] to-transparent z-[2]" />
    </section>
  );
}
