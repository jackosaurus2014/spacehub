'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';

const DATA_SOURCES = [
  { name: 'NASA', description: 'Launch data, planetary science, mission updates' },
  { name: 'ESA', description: 'European Space Agency mission and research data' },
  { name: 'NOAA', description: 'Space weather, solar activity, geomagnetic data' },
  { name: 'SpaceX', description: 'Launch manifests, Starlink, and mission data' },
  { name: 'SAM.gov', description: 'Government procurement opportunities' },
  { name: 'SEC EDGAR', description: 'Space company financial filings and disclosures' },
  { name: 'FCC', description: 'Spectrum filings and satellite licensing' },
  { name: 'FAA', description: 'Launch licensing and commercial space data' },
  { name: 'CelesTrak', description: 'Two-line element sets for satellite tracking' },
];

const PLATFORM_STATS = [
  { value: '200+', label: 'Space Companies Profiled' },
  { value: '50+', label: 'Curated News Sources' },
  { value: '19,000+', label: 'Satellites Tracked' },
  { value: '26+', label: 'API Data Integrations' },
];

export default function TrustSignals() {
  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-display text-3xl md:text-4xl text-white mb-3">
              Powered by Real Data
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              SpaceNexus aggregates real-time data from government agencies, industry feeds, and curated sources
            </p>
          </div>
        </ScrollReveal>

        {/* Primary Data Provenance Badges */}
        <ScrollReveal delay={0.05}>
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] py-5 px-6">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {[
                  { name: 'NASA', accent: 'text-blue-400' },
                  { name: 'ESA', accent: 'text-sky-400' },
                  { name: 'NOAA', accent: 'text-cyan-400' },
                  { name: 'SpaceX', accent: 'text-slate-200' },
                  { name: 'SAM.gov', accent: 'text-amber-400' },
                  { name: 'SEC EDGAR', accent: 'text-emerald-400' },
                  { name: 'FCC', accent: 'text-violet-400' },
                ].map((src, i, arr) => (
                  <div key={src.name} className="flex items-center gap-4">
                    <span className={`${src.accent} font-bold text-sm sm:text-base tracking-wide`}>{src.name}</span>
                    {i < arr.length - 1 && (
                      <span className="hidden sm:inline-block w-px h-4 bg-white/[0.08]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Detailed Data Source Badges with tooltips */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-3xl mx-auto">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.name}
                className="group relative px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:border-white/10 hover:bg-slate-100/10 transition-all duration-200"
              >
                <span className="text-white/90 font-semibold text-sm">{source.name}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white/[0.06] text-white/90 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                  {source.description}
                </div>
              </div>
            ))}
            <div className="px-4 py-2 rounded-full border border-slate-500/20 bg-slate-500/5">
              <span className="text-slate-400 text-sm">+ 40 more feeds</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Platform Metrics */}
        <ScrollReveal delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="card-glass p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-xs font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Platform availability badges */}
        <ScrollReveal delay={0.3}>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <span className="px-3 py-1.5 rounded-lg border border-green-400/20 bg-green-400/5 text-green-300 text-xs font-medium">
              Web App (PWA)
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-green-400/20 bg-green-400/5 text-green-300 text-xs font-medium">
              Android (Google Play)
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-green-400/20 bg-green-400/5 text-green-300 text-xs font-medium">
              iOS (App Store)
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-slate-400/20 bg-slate-400/5 text-white/70 text-xs font-medium">
              Offline Support
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-slate-400/20 bg-slate-400/5 text-white/70 text-xs font-medium">
              REST API
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
