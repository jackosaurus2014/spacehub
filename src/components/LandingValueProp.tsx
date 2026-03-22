'use client';

import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const VALUE_PILLARS = [
  {
    icon: '📡',
    title: 'Real-Time Data Feeds',
    description:
      'Continuously updated from 50+ government APIs and curated sources — not annual reports published months after collection.',
    badge: 'LIVE',
    badgeColor: 'emerald',
  },
  {
    icon: '🛠️',
    title: '264+ Interactive Tools',
    description:
      'Satellite trackers, mission calculators, market analysis, AI investment thesis generators, deal rooms, and constellation designers.',
    badge: null,
    badgeColor: null,
  },
  {
    icon: '💰',
    title: 'Starts at $0/month',
    description:
      'Full platform access for individual professionals and startups — not $3,000–$10,000 consulting reports locked behind enterprise paywalls.',
    badge: 'FREE',
    badgeColor: 'blue',
  },
];

const AUDIENCES = [
  {
    icon: '🚀',
    title: 'Entrepreneurs & Founders',
    description:
      'Find grants and SBIR funding, build business models, discover customers, and track regulatory risks.',
    tier: null,
  },
  {
    icon: '💸',
    title: 'Investors & VCs',
    description:
      'AI-powered investment theses, market sizing analysis, live funding tracker, and secure deal rooms.',
    tier: 'PRO',
  },
  {
    icon: '📊',
    title: 'CEOs & Executives',
    description:
      'Single-screen view of the space economy with real-time market data and competitive intelligence.',
    tier: 'PRO',
  },
  {
    icon: '🧭',
    title: 'Mission Planners',
    description:
      'Compare launch vehicles, calculate mission costs, track launch windows and orbital parameters.',
    tier: null,
  },
  {
    icon: '🔗',
    title: 'Supply Chain Professionals',
    description:
      'Map the space supply chain, identify suppliers, and track resource exchange markets.',
    tier: 'PRO',
  },
  {
    icon: '⚖️',
    title: 'Lawyers & Compliance',
    description:
      'Track space treaties, monitor FCC/FAA/ITU filings, navigate ITAR/EAR export controls.',
    tier: null,
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
              <h2 className="text-display text-3xl md:text-4xl text-white mb-4">
                What Nobody Else Offers
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                SpaceNexus fills the gap between news outlets, expensive consultants,
                government tools, and engineering software.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {VALUE_PILLARS.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div className="card-glass p-6 md:p-8 text-center h-full relative overflow-hidden group hover:border-white/[0.12] transition-all">
                  {pillar.badge && (
                    <span className={`absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      pillar.badgeColor === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                      pillar.badgeColor === 'blue' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                      'bg-white/[0.06] text-slate-400 border border-white/[0.08]'
                    }`}>
                      {pillar.badge}
                    </span>
                  )}
                  <div className="text-3xl mb-3">{pillar.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
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
                  <div className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 mb-2">
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
        </div>
      </section>

      {/* Who SpaceNexus Serves */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-display text-3xl md:text-4xl text-white mb-4">
                Built for Space Industry Professionals
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Whether you&apos;re launching a satellite, evaluating a startup for
                investment, or advising a client on ITAR compliance.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto" staggerDelay={0.08}>
            {AUDIENCES.map((audience) => (
              <StaggerItem key={audience.title}>
                <div className="card-glass p-5 h-full relative overflow-hidden hover:border-white/[0.12] transition-all">
                  {audience.tier && (
                    <span className="absolute top-3 right-3 pro-badge">{audience.tier}</span>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{audience.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1 text-sm">
                        {audience.title}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
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

    </div>
  );
}
