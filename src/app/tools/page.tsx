import type { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Engineering Tools — Interactive Calculators & Analysis | SpaceNexus',
  description:
    'Interactive space engineering calculators: launch cost estimation, orbital mechanics, constellation design, power budgets, link budgets, insurance, regulatory risk, and market sizing.',
  keywords: [
    'space engineering calculator',
    'launch cost calculator',
    'orbital mechanics calculator',
    'satellite constellation designer',
    'power budget calculator',
    'link budget calculator',
    'space insurance estimator',
    'space mission planning tools',
    'space unit economics calculator',
  ],
  openGraph: {
    title: 'Space Engineering Tools — Interactive Calculators & Analysis',
    description:
      'Interactive calculators and analysis tools for space mission planning. Estimate launch costs, design constellations, calculate orbits, and more.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://spacenexus.us/tools',
  },
};

const TOOLS = [
  {
    href: '/launch-cost-calculator',
    title: 'Launch Cost Calculator',
    description: 'Calculate and compare launch costs across 50+ vehicles',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 2.58m0 0a14.926 14.926 0 01-5.395-2.567M4.228 12.37a6 6 0 017.401-7.15" />
      </svg>
    ),
    color: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    hoverRing: 'hover:ring-orange-500/50',
  },
  {
    href: '/orbital-calculator',
    title: 'Orbital Mechanics Calculator',
    description: 'Delta-V, orbital periods, escape velocity, and decay analysis',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    color: 'from-blue-500/20 to-white/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    hoverRing: 'hover:ring-blue-500/50',
  },
  {
    href: '/constellation-designer',
    title: 'Constellation Designer',
    description: 'Design satellite constellations with coverage and cost analysis',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="6" cy="8" r="1" fill="currentColor" />
        <circle cx="18" cy="8" r="1" fill="currentColor" />
        <circle cx="8" cy="17" r="1" fill="currentColor" />
        <circle cx="16" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
    color: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    hoverRing: 'hover:ring-violet-500/50',
  },
  {
    href: '/power-budget-calculator',
    title: 'Power Budget Calculator',
    description: 'Solar panel sizing, battery analysis, and power margin calculation',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    hoverRing: 'hover:ring-yellow-500/50',
  },
  {
    href: '/link-budget-calculator',
    title: 'Link Budget Calculator',
    description: 'Communications link analysis for satellite-ground data links',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    color: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    hoverRing: 'hover:ring-emerald-500/50',
  },
  {
    href: '/space-insurance',
    title: 'Space Insurance Estimator',
    description: 'Estimate insurance premiums for space missions',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    color: 'from-sky-500/20 to-indigo-500/20',
    borderColor: 'border-sky-500/30',
    iconColor: 'text-sky-400',
    hoverRing: 'hover:ring-sky-500/50',
  },
  {
    href: '/regulatory-risk',
    title: 'Regulatory Risk Assessment',
    description: 'Assess regulatory compliance risk and licensing timelines',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97z" />
      </svg>
    ),
    color: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    hoverRing: 'hover:ring-rose-500/50',
  },
  {
    href: '/market-sizing',
    title: 'Market Sizing (TAM/SAM/SOM)',
    description: 'Total addressable market analysis for space industry segments',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: 'from-white/5 to-blue-500/20',
    borderColor: 'border-white/10',
    iconColor: 'text-white/70',
    hoverRing: 'hover:ring-white/15',
  },
  {
    href: '/unit-economics',
    title: 'Unit Economics Calculator',
    description: 'Model space business economics — revenue, costs, margins, and break-even',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-emerald-500/20 to-green-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    hoverRing: 'hover:ring-emerald-500/50',
  },
];

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Engineering Tools' }]} />
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space Engineering Tools"
          subtitle="Interactive calculators and analysis tools for space mission planning"
          icon="&#9881;"
          accentColor="cyan"
        />

        <div className="max-w-5xl mx-auto">
          {/* Intro */}
          <ScrollReveal>
            <div className="card p-8 mb-10">
              <p className="text-slate-400 leading-relaxed">
                Plan your space mission with professional-grade engineering tools. From launch cost
                estimation and orbital mechanics to constellation design and regulatory compliance,
                these interactive calculators help aerospace engineers, mission planners, and business
                strategists make data-driven decisions.
              </p>
            </div>
          </ScrollReveal>

          {/* Tool Cards Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {TOOLS.map((tool) => (
              <StaggerItem key={tool.href}>
              <Link
                href={tool.href}
                className={`card p-6 hover:ring-2 ${tool.hoverRing} transition-all group relative overflow-hidden`}
              >
                {/* Background gradient accent */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 p-3 rounded-xl bg-white/[0.06] border ${tool.borderColor} ${tool.iconColor} group-hover:scale-110 transition-transform duration-300`}
                  >
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h2 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                        {tool.title}
                      </h2>
                      <span className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Mission Cost Simulator CTA */}
          <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Full Mission Simulator
            </h2>
            <Link
              href="/mission-cost"
              className="card p-8 hover:ring-2 hover:ring-white/15 transition-all group block"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0 p-4 rounded-xl bg-gradient-to-br from-white/5 to-blue-500/20 border border-white/10">
                  <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zM15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9h8.25m-8.25 0l3 3m-3-3l3-3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-white transition-colors mb-2">
                    Mission Cost Simulator
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Comprehensive mission cost analysis combining launch services, insurance premiums,
                    and regulatory fees. Compare 15+ launch providers across 7 orbit types with
                    real-world pricing data.
                  </p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <span className="text-white/70 group-hover:translate-x-1 transition-transform inline-block text-2xl">
                    &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </section>
          </ScrollReveal>

          {/* Additional Resources */}
          <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Related Resources
            </h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StaggerItem>
              <Link
                href="/launch-vehicles"
                className="card p-5 hover:ring-2 hover:ring-white/15 transition-all group"
              >
                <h3 className="text-sm font-bold text-white group-hover:text-white transition-colors mb-1">
                  Launch Vehicle Database
                </h3>
                <p className="text-slate-400 text-xs">
                  Compare specifications, payload capacity, and pricing across 50+ rockets.
                </p>
              </Link>
              </StaggerItem>
              <StaggerItem>
              <Link
                href="/compare/launch-vehicles"
                className="card p-5 hover:ring-2 hover:ring-white/15 transition-all group"
              >
                <h3 className="text-sm font-bold text-white group-hover:text-white transition-colors mb-1">
                  Side-by-Side Comparison
                </h3>
                <p className="text-slate-400 text-xs">
                  Compare up to 4 launch vehicles across payload, cost, dimensions, and reliability.
                </p>
              </Link>
              </StaggerItem>
              <StaggerItem>
              <Link
                href="/blueprints"
                className="card p-5 hover:ring-2 hover:ring-white/15 transition-all group"
              >
                <h3 className="text-sm font-bold text-white group-hover:text-white transition-colors mb-1">
                  Blueprint Series
                </h3>
                <p className="text-slate-400 text-xs">
                  Technical hardware breakdowns and engineering specifications for space systems.
                </p>
              </Link>
              </StaggerItem>
            </StaggerContainer>
          </section>
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal>
          <section className="text-center">
            <div className="card p-10">
              <h2 className="text-2xl font-bold text-white mb-3">Need Custom Analysis?</h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                Our engineering tools are free for basic use. Upgrade to Pro for advanced features,
                export capabilities, and higher usage limits on all calculators.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/register" className="btn-primary text-sm py-3 px-6">
                  Get Started Free
                </Link>
                <Link href="/pricing" className="btn-secondary text-sm py-3 px-6">
                  View Pro Plans
                </Link>
              </div>
            </div>
          </section>
          </ScrollReveal>
        </div>
      </div>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Space Engineering Tools',
            description:
              'Interactive calculators and analysis tools for space mission planning — launch costs, orbital mechanics, constellation design, and more.',
            url: 'https://spacenexus.us/tools',
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
            },
            hasPart: TOOLS.map((tool) => ({
              '@type': 'WebApplication',
              name: tool.title,
              description: tool.description,
              url: `https://spacenexus.us${tool.href}`,
              applicationCategory: 'EngineeringApplication',
              operatingSystem: 'Web',
            })),
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['tools']} />
      </div>
  );
}
