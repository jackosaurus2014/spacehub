'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

const COMPARISON_TOOLS = [
  {
    title: 'Launch Vehicle Comparison',
    description: 'Compare 15+ rockets side-by-side: payload capacity, cost per kg, dimensions, reusability, and success rates.',
    href: '/compare/launch-vehicles',
    icon: '🚀',
    stats: '15 vehicles',
  },
  {
    title: 'Satellite Constellation Comparison',
    description: 'Compare major constellations: Starlink, OneWeb, Kuiper, GPS, Galileo, and more. Orbit types, coverage, and capacity.',
    href: '/compare/satellites',
    icon: '🛰️',
    stats: '12+ constellations',
  },
  {
    title: 'Company Comparison',
    description: 'Compare space companies head-to-head: revenue, funding, employees, market cap, and capabilities.',
    href: '/compare/companies',
    icon: '🏢',
    stats: '100+ companies',
  },
  {
    title: 'Satellite Bus Comparison',
    description: 'Compare satellite platforms by mass, power, pointing accuracy, lifespan, and payload accommodation across 22 buses.',
    href: '/compare/satellite-buses',
    icon: '📡',
    stats: '22 buses',
  },
];

const COMPETITOR_COMPARISONS = [
  {
    title: 'SpaceNexus vs Bloomberg Terminal',
    description: 'Purpose-built space intelligence vs. general finance terminal. $0-99/mo vs $25,000/yr.',
    href: '/compare/bloomberg-terminal',
    icon: '⚖️',
  },
  {
    title: 'SpaceNexus vs Quilty Space Analytics',
    description: 'Self-service platform vs. premium research reports. $0-99/mo vs $5K-50K/yr.',
    href: '/compare/quilty-analytics',
    icon: '⚖️',
  },
  {
    title: 'SpaceNexus vs Payload Space',
    description: 'Interactive intelligence platform vs. curated newsletter. Both have free tiers.',
    href: '/compare/payload-space',
    icon: '⚖️',
  },
];

export default function ComparisonHubPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <AnimatedPageHeader
          title="Comparison Tools"
          subtitle="Side-by-side analysis of launch vehicles, satellite constellations, and companies across the space industry."
          accentColor="cyan"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {COMPARISON_TOOLS.map((tool, index) => (
            <ScrollReveal key={tool.href} delay={0.1 + index * 0.1}>
              <Link
                href={tool.href}
                className="group block card p-6 hover:border-cyan-400/40 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{tool.icon}</div>
                <h2 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors mb-2">
                  {tool.title}
                </h2>
                <p className="text-sm text-slate-400 mb-4 line-clamp-3">
                  {tool.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">
                    {tool.stats}
                  </span>
                  <span className="text-sm text-slate-400 group-hover:text-cyan-300 transition-colors">
                    Compare &rarr;
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {/* Competitor Comparisons */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Platform Comparisons
          </h2>
          <p className="text-slate-400 mb-8 max-w-3xl">
            See how SpaceNexus compares to other space industry tools and platforms used by aerospace professionals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMPETITOR_COMPARISONS.map((comp, index) => (
              <ScrollReveal key={comp.href} delay={0.2 + index * 0.1}>
                <Link
                  href={comp.href}
                  className="group block card p-5 hover:border-cyan-400/30 hover:bg-slate-800/70"
                >
                  <div className="text-2xl mb-3">{comp.icon}</div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                    {comp.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {comp.description}
                  </p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
