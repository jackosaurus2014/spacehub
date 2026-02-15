'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';

const DATA_SOURCES = [
  { name: 'NASA', description: 'Launch data, planetary science, mission updates' },
  { name: 'NOAA', description: 'Space weather, solar activity, geomagnetic data' },
  { name: 'SAM.gov', description: 'Government procurement opportunities' },
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
            <h2 className="text-display-sm font-display font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Powered by Authoritative Data
            </h2>
            <p className="text-slate-300 text-sm max-w-xl mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              SpaceNexus aggregates real-time data from government agencies, industry feeds, and curated sources
            </p>
            <div className="gradient-line max-w-xs mx-auto mt-4" />
          </div>
        </ScrollReveal>

        {/* Data Source Badges */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-3xl mx-auto">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.name}
                className="group relative px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-400/40 hover:bg-cyan-400/10 transition-all duration-200"
              >
                <span className="text-cyan-300 font-semibold text-sm">{source.name}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
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
              <div key={stat.label} className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300">
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
            <span className="px-3 py-1.5 rounded-lg border border-slate-400/20 bg-slate-400/5 text-slate-300 text-xs font-medium">
              Offline Support
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-slate-400/20 bg-slate-400/5 text-slate-300 text-xs font-medium">
              REST API
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
