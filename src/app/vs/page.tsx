import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Alternatives — Space Industry Platform Comparison',
  description: 'Compare SpaceNexus with Bloomberg Terminal, Quilty Analytics, Payload Space, and free tools. See why SpaceNexus is the most comprehensive free space intelligence platform.',
  alternates: { canonical: 'https://spacenexus.us/vs' },
};

export const revalidate = 86400;

const comparisons = [
  {
    competitor: 'Bloomberg Terminal',
    price: '$24,000/year',
    spaceNexusPrice: 'Free (Pro from $19.99/mo)',
    strengths: 'Unmatched financial data depth, real-time market data across all industries',
    weaknesses: 'Not space-specific, no satellite tracking, no launch data, no engineering tools',
    verdict: 'Bloomberg is the gold standard for financial terminals but has zero space-specific features. SpaceNexus fills the gap with space industry data at a fraction of the cost.',
    href: '/compare/bloomberg-terminal',
  },
  {
    competitor: 'Quilty Space',
    price: '$5,000-$50,000/year',
    spaceNexusPrice: 'Free (Pro from $19.99/mo)',
    strengths: 'Deep analyst reports, institutional-grade research',
    weaknesses: 'Expensive, limited platform tools, no real-time data, no engineering calculators',
    verdict: 'Quilty excels at analyst reports for institutional clients. SpaceNexus offers broader coverage with real-time data, tools, and content at accessible pricing.',
    href: '/compare/quilty-analytics',
  },
  {
    competitor: 'Payload Space',
    price: 'Free newsletter + paid tiers',
    spaceNexusPrice: 'Free (Pro from $19.99/mo)',
    strengths: 'Well-written newsletter, good industry coverage',
    weaknesses: 'Content-only — no interactive tools, no satellite tracking, no engineering calculators, no market data dashboards',
    verdict: 'Payload delivers excellent newsletters. SpaceNexus combines content with interactive tools, live data, and 200+ original articles.',
    href: '/compare/payload-space',
  },
  {
    competitor: 'Free Tools (CelesTrak, Space-Track, SWPC)',
    price: 'Free',
    spaceNexusPrice: 'Free',
    strengths: 'Authoritative source data, government-backed',
    weaknesses: 'Fragmented across 10+ websites, no unified dashboard, raw data with no analysis, no market/business data',
    verdict: 'Government tools provide the raw data that SpaceNexus integrates. We aggregate 50+ sources into one dashboard with analysis, tools, and content.',
    href: '/alternatives',
  },
];

const featureMatrix = [
  { feature: 'Satellite Tracking', sn: true, bloomberg: false, quilty: false, payload: false, free: true },
  { feature: 'Launch Schedule', sn: true, bloomberg: false, quilty: false, payload: true, free: true },
  { feature: 'Space Weather', sn: true, bloomberg: false, quilty: false, payload: false, free: true },
  { feature: 'Market Intelligence', sn: true, bloomberg: true, quilty: true, payload: true, free: false },
  { feature: 'Company Profiles', sn: true, bloomberg: true, quilty: true, payload: false, free: false },
  { feature: 'Engineering Calculators', sn: true, bloomberg: false, quilty: false, payload: false, free: false },
  { feature: 'Compliance Tools', sn: true, bloomberg: false, quilty: false, payload: false, free: false },
  { feature: 'Community Forums', sn: true, bloomberg: false, quilty: false, payload: false, free: false },
  { feature: 'Public API', sn: true, bloomberg: true, quilty: false, payload: false, free: true },
  { feature: 'Original Content', sn: true, bloomberg: true, quilty: true, payload: true, free: false },
  { feature: 'Free Tier', sn: true, bloomberg: false, quilty: false, payload: true, free: true },
  { feature: 'Android App', sn: true, bloomberg: true, quilty: false, payload: false, free: false },
];

export default function VsPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="SpaceNexus vs Alternatives"
          subtitle="How we compare to other space industry tools"
          icon="⚖️"
          accentColor="cyan"
        >
          <Link href="/pricing" className="btn-secondary text-sm py-2 px-4">
            View Pricing
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Feature Matrix */}
          <ScrollReveal>
            <div className="card p-6 overflow-x-auto">
              <h2 className="text-lg font-semibold text-white mb-4">Feature Comparison</h2>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-slate-400 font-medium py-2 pr-4">Feature</th>
                    <th className="text-center text-cyan-400 font-medium py-2 px-3">SpaceNexus</th>
                    <th className="text-center text-slate-400 font-medium py-2 px-3">Bloomberg</th>
                    <th className="text-center text-slate-400 font-medium py-2 px-3">Quilty</th>
                    <th className="text-center text-slate-400 font-medium py-2 px-3">Payload</th>
                    <th className="text-center text-slate-400 font-medium py-2 px-3">Free Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((row) => (
                    <tr key={row.feature} className="border-b border-white/[0.03]">
                      <td className="text-white py-2 pr-4">{row.feature}</td>
                      {[row.sn, row.bloomberg, row.quilty, row.payload, row.free].map((val, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          {val ? (
                            <span className={i === 0 ? 'text-cyan-400' : 'text-green-400'}>&#10003;</span>
                          ) : (
                            <span className="text-slate-600">&mdash;</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>

          {/* Detailed Comparisons */}
          {comparisons.map((comp) => (
            <ScrollReveal key={comp.competitor}>
              <div className="card p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-white">SpaceNexus vs {comp.competitor}</h3>
                  <div className="text-right shrink-0">
                    <p className="text-slate-500 text-xs">Their price</p>
                    <p className="text-white text-sm font-medium">{comp.price}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Their Strengths</p>
                    <p className="text-slate-300 text-sm">{comp.strengths}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Their Gaps</p>
                    <p className="text-slate-300 text-sm">{comp.weaknesses}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm italic border-t border-white/[0.06] pt-3">{comp.verdict}</p>
                {comp.href && (
                  <Link href={comp.href} className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
                    Detailed comparison &rarr;
                  </Link>
                )}
              </div>
            </ScrollReveal>
          ))}

          {/* CTA */}
          <ScrollReveal>
            <div className="text-center">
              <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                Try SpaceNexus Free
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
