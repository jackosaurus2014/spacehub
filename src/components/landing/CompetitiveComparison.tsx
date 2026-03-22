'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

const FEATURES = [
  { feature: 'Real-Time Satellite Tracking', consulting: '$10K+ project', bloomberg: false, spacenexus: true, tier: 'free' },
  { feature: 'Launch Cost Calculator', consulting: '$5K+ analysis', bloomberg: false, spacenexus: true, tier: 'free' },
  { feature: 'AI Market Analysis', consulting: '$15K-50K/project', bloomberg: 'Limited', spacenexus: true, tier: 'pro' },
  { feature: 'Space Treaty & Regulatory DB', consulting: '$500/hr attorney', bloomberg: false, spacenexus: true, tier: 'free' },
  { feature: 'Company Intelligence (200+)', consulting: 'Custom research', bloomberg: 'Partial', spacenexus: true, tier: 'pro' },
  { feature: 'Supply Chain Mapping', consulting: 'Expensive consultants', bloomberg: 'Limited', spacenexus: true, tier: 'pro' },
  { feature: 'Constellation Designer', consulting: 'Not offered', bloomberg: false, spacenexus: true, tier: 'free' },
  { feature: 'Multiplayer Space Tycoon Game', consulting: 'N/A', bloomberg: false, spacenexus: true, tier: 'free' },
];

function CellValue({ value, tier }: { value: boolean | string; tier?: string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {tier === 'pro' && <span className="pro-badge text-[7px]">PRO</span>}
      </span>
    );
  }
  if (value === false) {
    return (
      <svg className="w-4 h-4 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="text-amber-400/70 text-xs">{value}</span>;
}

export default function CompetitiveComparison() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Terminal-style header */}
        <ScrollReveal>
          <div className="max-w-5xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />
                <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                  Competitive Analysis
                </h2>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-medium">
                vs. alternatives
              </span>
            </div>
            <p className="text-sm text-slate-500 ml-4">
              Enterprise-grade intelligence at a fraction of the cost
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop table */}
        <ScrollReveal delay={0.1} className="hidden md:block max-w-5xl mx-auto">
          <div className="card-glass overflow-hidden">
            {/* Terminal chrome */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-mono">competitive-analysis</span>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold p-4 w-[34%]">Capability</th>
                  <th className="text-center text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold p-4 w-[22%]">Consulting</th>
                  <th className="text-center text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold p-4 w-[22%]">Bloomberg</th>
                  <th className="text-center p-4 w-[22%] bg-emerald-500/[0.03] border-x border-emerald-500/10">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-emerald-400 font-bold">SpaceNexus</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors">
                    <td className="p-3.5 text-white/80 text-xs font-medium">{row.feature}</td>
                    <td className="p-3.5 text-center text-slate-500 text-xs">{row.consulting}</td>
                    <td className="p-3.5 text-center"><CellValue value={row.bloomberg} /></td>
                    <td className="p-3.5 text-center bg-emerald-500/[0.03] border-x border-emerald-500/10">
                      <CellValue value={row.spacenexus} tier={row.tier} />
                    </td>
                  </tr>
                ))}
                {/* Price row */}
                <tr className="bg-white/[0.02] border-t border-white/[0.06]">
                  <td className="p-4 text-white font-semibold text-xs uppercase tracking-wider">Starting Price</td>
                  <td className="p-4 text-center">
                    <span className="text-red-400/70 font-mono text-sm">$5,000+</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-red-400/70 font-mono text-sm">$2,000/mo</span>
                  </td>
                  <td className="p-4 text-center bg-emerald-500/[0.03] border-x border-emerald-500/10">
                    <span className="text-2xl font-bold text-emerald-400 font-mono">$0</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollReveal>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 max-w-lg mx-auto">
          {FEATURES.map((row, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="card-glass p-4">
                <h3 className="text-white font-semibold text-sm mb-2">{row.feature}</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Consulting</span>
                    <span className="text-slate-500">{row.consulting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bloomberg</span>
                    <CellValue value={row.bloomberg} />
                  </div>
                  <div className="flex justify-between border-t border-white/[0.06] pt-1.5 mt-1.5">
                    <span className="text-emerald-400 font-medium">SpaceNexus</span>
                    <CellValue value={row.spacenexus} tier={row.tier} />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={FEATURES.length * 0.05}>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <p className="text-slate-500 text-xs mb-1">Others start at $2,000–$5,000+</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">SpaceNexus: $0</p>
            </div>
          </ScrollReveal>
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.25}>
          <div className="text-center mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 hover:bg-slate-100 hover:shadow-lg hover:shadow-white/[0.05] active:scale-[0.98]"
            >
              Start Free Today
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
