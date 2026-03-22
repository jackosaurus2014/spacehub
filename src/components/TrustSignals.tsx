'use client';

import ScrollReveal from '@/components/ui/ScrollReveal';

const DATA_SOURCES = [
  { name: 'NASA', description: 'Launch data, planetary science, mission updates', freq: 'Real-time' },
  { name: 'ESA', description: 'European Space Agency mission and research data', freq: 'Hourly' },
  { name: 'NOAA SWPC', description: 'Space weather, solar activity, geomagnetic data', freq: 'Real-time' },
  { name: 'SpaceX', description: 'Launch manifests, Starlink, and mission data', freq: 'Daily' },
  { name: 'SAM.gov', description: 'Government procurement opportunities', freq: 'Daily' },
  { name: 'SEC EDGAR', description: 'Space company financial filings and disclosures', freq: 'Daily' },
  { name: 'FCC ULS', description: 'Spectrum filings and satellite licensing', freq: 'Daily' },
  { name: 'FAA AST', description: 'Launch licensing and commercial space data', freq: 'Weekly' },
  { name: 'CelesTrak', description: 'Two-line element sets for satellite tracking', freq: 'Real-time' },
];

const PLATFORM_STATS = [
  { value: '200+', label: 'Space Companies', icon: '🏢' },
  { value: '50+', label: 'Data Sources', icon: '📡' },
  { value: '10,000+', label: 'Satellites Tracked', icon: '🛰️' },
  { value: '26+', label: 'API Integrations', icon: '🔗' },
];

export default function TrustSignals() {
  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4">
        {/* Terminal-style header */}
        <ScrollReveal>
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                  Data Sources & Provenance
                </h2>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-medium">
                50+ feeds
              </span>
            </div>
            <p className="text-sm text-slate-500 ml-4">
              Real-time data from government agencies, industry feeds, and curated sources
            </p>
          </div>
        </ScrollReveal>

        {/* Data source grid with refresh frequency */}
        <ScrollReveal delay={0.05}>
          <div className="max-w-4xl mx-auto mb-10">
            <div className="card-glass overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-mono">data-sources</span>
                </div>
                <span className="live-badge text-[7px]">CONNECTED</span>
              </div>
              {/* Source table */}
              <div className="divide-y divide-white/[0.03]">
                {DATA_SOURCES.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-white text-sm font-semibold">{source.name}</span>
                      <span className="text-slate-500 text-xs hidden sm:inline">{source.description}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      source.freq === 'Real-time'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : source.freq === 'Hourly'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : source.freq === 'Daily'
                        ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/15'
                    }`}>
                      {source.freq}
                    </span>
                  </div>
                ))}
                <div className="px-4 py-2.5 text-center">
                  <span className="text-slate-600 text-xs">+ 40 more feeds integrated</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Platform Metrics */}
        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="card-glass p-4 text-center">
                <span className="text-lg block mb-1">{stat.icon}</span>
                <div className="text-xl font-bold text-white font-mono tabular-nums">
                  {stat.value}
                </div>
                <div className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Platform availability */}
        <ScrollReveal delay={0.25}>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {[
              { label: 'Web App (PWA)', active: true },
              { label: 'Android', active: true },
              { label: 'iOS', active: true },
              { label: 'Offline Mode', active: false },
              { label: 'REST API', active: false },
            ].map((p) => (
              <span key={p.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                p.active
                  ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300'
                  : 'border-slate-500/15 bg-slate-500/5 text-slate-400'
              }`}>
                {p.active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />}
                {p.label}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
