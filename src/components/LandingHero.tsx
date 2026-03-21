'use client';

import Link from 'next/link';

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

/** Platform stat constants — exported so pricing/register pages can reuse them */
export const PLATFORM_STATS = [
  { value: '264+', label: 'Pages & Tools' },
  { value: '200+', label: 'Original Articles' },
  { value: '50+', label: 'Data Sources' },
  { value: '600+', label: 'Routes' },
];

interface HeroContentCard {
  type: 'blog' | 'news';
  title: string;
  snippet: string;
  href: string;
  source?: string;
}

interface LandingHeroProps {
  /** Top blog article to feature */
  featuredArticle?: HeroContentCard | null;
  /** Trending news item */
  trendingNews?: HeroContentCard | null;
}

export default function LandingHero({ featuredArticle, trendingNews }: LandingHeroProps) {
  return (
    <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Gradient Mesh Background — replaces video for faster load and modern aesthetic */}
      <div className="absolute inset-0 z-0 hero-gradient-mesh hero-noise" />

      {/* Grid pattern overlay for depth */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Subtle atmospheric accent orbs */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[150px] pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[120px] pointer-events-none z-[1]" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <HeroReveal delay={0.2} className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">Live data from 50+ sources</span>
            </div>
          </HeroReveal>

          {/* Headline — clean Inter, tight tracking, display style */}
          <HeroReveal delay={0.35} className="mb-6">
            <h1 className="text-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white">
              Space Industry<br />Intelligence Platform
            </h1>
          </HeroReveal>

          {/* Subtitle — condensed value proposition */}
          <HeroReveal delay={0.5} className="mb-10">
            <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Real-time data, interactive tools, regulatory intelligence, and market
              analytics — all in one platform for space industry professionals.
            </p>
          </HeroReveal>

          {/* CTA Buttons — clean, minimal */}
          <HeroReveal delay={0.65} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/mission-control?utm_source=homepage&utm_medium=hero&utm_campaign=explore"
                className="bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 ease-smooth hover:bg-slate-100 hover:shadow-lg hover:shadow-white/[0.05] active:scale-[0.98] inline-flex items-center justify-center ring-glow"
              >
                Get Started
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link
                href="/pricing?utm_source=homepage&utm_medium=hero&utm_campaign=freetrial"
                className="border border-white/20 text-white font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 ease-smooth hover:bg-white/10 hover:border-white/30 active:scale-[0.98] inline-flex items-center justify-center ring-glow"
              >
                View Pricing
              </Link>
            </div>
          </HeroReveal>

          {/* Trust micro-copy */}
          <HeroReveal delay={0.75} className="mb-10">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              No credit card required &middot; 14-day free trial &middot; Cancel anytime
            </p>
          </HeroReveal>

          {/* Featured Content Cards — replaces stat counters */}
          <HeroReveal delay={0.9} className="mb-6">
            {(featuredArticle || trendingNews) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {featuredArticle && (
                  <Link
                    href={featuredArticle.href}
                    className="group card-glass p-4 text-left hover:border-white/[0.12] transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Trending Article</span>
                    </div>
                    <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-white/90 transition-colors leading-snug">
                      {featuredArticle.title}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{featuredArticle.snippet}</p>
                  </Link>
                )}
                {trendingNews && (
                  <Link
                    href={trendingNews.href}
                    className="group card-glass p-4 text-left hover:border-white/[0.12] transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Breaking News</span>
                    </div>
                    <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-white/90 transition-colors leading-snug">
                      {trendingNews.title}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1.5 line-clamp-1">
                      {trendingNews.source && <span>{trendingNews.source} &middot; </span>}
                      {trendingNews.snippet}
                    </p>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex gap-6 justify-center">
                <Link
                  href="/register?utm_source=homepage&utm_medium=hero&utm_campaign=signup"
                  className="text-slate-500 hover:text-white text-sm transition-colors duration-200"
                >
                  Create Free Account
                </Link>
                <span className="text-slate-700">&middot;</span>
                <Link
                  href="/news?utm_source=homepage&utm_medium=hero&utm_campaign=news"
                  className="text-slate-500 hover:text-white text-sm transition-colors duration-200"
                >
                  Browse News
                </Link>
              </div>
            )}
          </HeroReveal>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float animate-reveal-up"
        style={{ animationDelay: '1.4s', animationFillMode: 'both' }}
      >
        <div className="w-6 h-10 border border-white/10 rounded-full flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-white/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bottom gradient divider */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-[2]" />

      {/* Live Stats Ticker Bar — above the fold, below hero content */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-white/[0.03] backdrop-blur-sm border-t border-white/[0.06]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center divide-x divide-white/[0.08] py-3">
              {[
                { value: '30+', label: 'Modules' },
                { value: '200+', label: 'Companies' },
                { value: '10,000+', label: 'Data Points' },
                { value: '', label: 'Updated Every 5 Minutes', pulse: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-4 sm:px-6 md:px-8">
                  {item.pulse && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                  )}
                  {item.value && (
                    <span className="text-white font-semibold text-xs sm:text-sm">{item.value}</span>
                  )}
                  <span className="text-slate-400 text-[10px] sm:text-xs tracking-wide">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
