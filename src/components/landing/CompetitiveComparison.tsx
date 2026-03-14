'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

const FEATURES = [
  { feature: 'Real-Time Satellite Tracking', consulting: '$10K+ custom project', bloomberg: false, spacenexus: true },
  { feature: 'Launch Cost Calculator', consulting: '$5K+ per analysis', bloomberg: false, spacenexus: true },
  { feature: 'AI Market Analysis', consulting: '$15K-50K/project', bloomberg: 'Limited', spacenexus: true },
  { feature: 'Space Treaty & Regulatory Database', consulting: '$500/hr attorney', bloomberg: false, spacenexus: true },
  { feature: 'Company Intelligence (200+ profiles)', consulting: 'Custom research', bloomberg: 'Partial', spacenexus: true },
  { feature: 'Supply Chain Mapping', consulting: 'Expensive consultants', bloomberg: 'Limited', spacenexus: true },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-white/70 font-semibold">Included</span>;
  if (value === false) return <span className="text-slate-500">Not available</span>;
  return <span className="text-slate-400">{value}</span>;
}

export default function CompetitiveComparison() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-display text-3xl md:text-4xl text-white mb-3">
              Why Space Professionals Choose SpaceNexus
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Enterprise-grade intelligence at a fraction of the cost
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop table */}
        <ScrollReveal delay={0.15} className="hidden md:block max-w-5xl mx-auto">
          <div className="card-glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-slate-400 font-medium p-4 w-[34%]">Feature</th>
                  <th className="text-center text-slate-400 font-medium p-4 w-[22%]">Traditional Consulting</th>
                  <th className="text-center text-slate-400 font-medium p-4 w-[22%]">Bloomberg Terminal</th>
                  <th className="text-center p-4 w-[22%] bg-white/5 border-x border-white/10 text-white/90 font-semibold">
                    SpaceNexus
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="p-4 text-white/70 font-medium">{row.feature}</td>
                    <td className="p-4 text-center text-slate-400">{row.consulting}</td>
                    <td className="p-4 text-center"><CellValue value={row.bloomberg} /></td>
                    <td className="p-4 text-center bg-white/5 border-x border-white/10">
                      <CellValue value={row.spacenexus} />
                    </td>
                  </tr>
                ))}
                {/* Price row */}
                <tr className="bg-white/[0.03]">
                  <td className="p-4 text-white font-semibold">Starting Price</td>
                  <td className="p-4 text-center text-white/70 font-medium">$5,000/project</td>
                  <td className="p-4 text-center text-white/70 font-medium">$2,000+/month</td>
                  <td className="p-4 text-center bg-white/5 border-x border-white/10">
                    <span className="text-2xl font-bold bg-gradient-to-r from-white/70 to-blue-400 bg-clip-text text-transparent">
                      Free
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollReveal>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4 max-w-lg mx-auto">
          {FEATURES.map((row, i) => (
            <ScrollReveal key={i} delay={i * 0.07}>
              <div className="card p-4">
                <h3 className="text-white font-semibold mb-3">{row.feature}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consulting</span>
                    <span className="text-slate-400">{row.consulting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bloomberg</span>
                    <CellValue value={row.bloomberg} />
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-white/90 font-medium">SpaceNexus</span>
                    <CellValue value={row.spacenexus} />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
          {/* Mobile price card */}
          <ScrollReveal delay={FEATURES.length * 0.07}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-slate-400 text-sm mb-1">Others start at $2,000-$5,000+</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-white/70 to-blue-400 bg-clip-text text-transparent">
                SpaceNexus is Free
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.3}>
          <div className="text-center mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 ease-smooth hover:bg-slate-100 hover:shadow-lg hover:shadow-white/[0.05] active:scale-[0.98]"
            >
              Start Free Today
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
