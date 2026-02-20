'use client';

import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const VALUE_PILLARS = [
  {
    icon: '\u{1F4E1}',
    title: 'Real-Time Data',
    description:
      'Continuously updated from government APIs and curated sources \u2014 not annual reports published months after collection.',
  },
  {
    icon: '\u{1F6E0}\uFE0F',
    title: 'Interactive Tools',
    description:
      'Satellite trackers, mission cost calculators, market sizing analysis, AI investment thesis generators, and deal rooms \u2014 not just articles to read.',
  },
  {
    icon: '\u{1F4B0}',
    title: 'Affordable Access',
    description:
      'Designed for individual professionals and startups \u2014 not $3,000\u2013$10,000 consulting reports locked behind enterprise paywalls.',
  },
];

const AUDIENCES = [
  {
    icon: '\u{1F680}',
    title: 'Entrepreneurs & Founders',
    description:
      'Find grants and SBIR funding, build business models, discover customers, and track regulatory risks.',
  },
  {
    icon: '\u{1F4B8}',
    title: 'Investors & VCs',
    description:
      'AI-powered investment theses, market sizing analysis, live funding tracker, and secure deal rooms.',
  },
  {
    icon: '\u{1F4CA}',
    title: 'CEOs & Executives',
    description:
      'Single-screen view of the space economy with real-time market data and competitive intelligence.',
  },
  {
    icon: '\u{1F9ED}',
    title: 'Mission Planners',
    description:
      'Compare launch vehicles, calculate mission costs, track launch windows and orbital parameters.',
  },
  {
    icon: '\u{1F517}',
    title: 'Supply Chain Professionals',
    description:
      'Map the space supply chain, identify suppliers, and track resource exchange markets.',
  },
  {
    icon: '\u{2696}\uFE0F',
    title: 'Lawyers & Compliance',
    description:
      'Track space treaties, monitor FCC/FAA/ITU filings, navigate ITAR/EAR export controls.',
  },
];

const STATS = [
  { value: 30, suffix: '+', label: 'Integrated Modules' },
  { value: 100, suffix: '+', label: 'Data Sources' },
  { value: 24, suffix: '/7', label: 'Real-Time Updates' },
  { value: 0, suffix: '', label: 'Starting Price', prefix: '$' },
];

export default function LandingValueProp() {
  return (
    <div className="relative z-10">
      {/* What SpaceNexus Offers */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-display-md font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                What Nobody Else Offers
              </h2>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                SpaceNexus fills the gap between news outlets, expensive consultants,
                government tools, and engineering software.
              </p>
              <div className="gradient-line max-w-xs mx-auto mt-6" />
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {VALUE_PILLARS.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div className="glass-panel p-8 text-center h-full hover:border-cyan-400/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="text-4xl mb-4">{pillar.icon}</div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* By the Numbers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STATS.map((stat) => (
              <ScrollReveal key={stat.label} delay={0.1}>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 mb-2">
                    {stat.prefix}
                    <AnimatedCounter target={stat.value} />
                    {stat.suffix}
                  </div>
                  <div className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="gradient-line max-w-lg mx-auto mt-16" />
        </div>
      </section>

      {/* Who SpaceNexus Serves */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-display-md font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Built for Space Industry Professionals
              </h2>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                Whether you&apos;re launching a satellite, evaluating a startup for
                investment, or advising a client on ITAR compliance.
              </p>
              <div className="gradient-line max-w-xs mx-auto mt-6" />
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto" staggerDelay={0.08}>
            {AUDIENCES.map((audience) => (
              <StaggerItem key={audience.title}>
                <div className="glass-panel p-6 h-full hover:border-cyan-400/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0 mt-1">{audience.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1.5">
                        {audience.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {audience.description}
                      </p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Bottom divider */}
      <div className="gradient-line max-w-lg mx-auto" />
    </div>
  );
}
