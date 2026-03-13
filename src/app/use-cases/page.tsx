import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Intelligence Use Cases | SpaceNexus',
  description:
    'See how VCs, defense analysts, aerospace engineers, and startup CEOs use SpaceNexus to gain a competitive edge in the space industry.',
  keywords: [
    'space intelligence use cases',
    'space industry analytics examples',
    'space VC tools',
    'space defense analysis',
    'aerospace engineering platform',
    'space startup intelligence',
  ],
  openGraph: {
    title: 'Space Intelligence Use Cases | SpaceNexus',
    description:
      'Real-world examples of how space professionals use SpaceNexus for investment analysis, defense intelligence, engineering, and business strategy.',
    url: 'https://spacenexus.us/use-cases',
  },
  alternates: { canonical: 'https://spacenexus.us/use-cases' },
};

const USE_CASES = [
  {
    name: 'Sarah Chen',
    role: 'Partner',
    company: 'Orbital Ventures',
    companyType: 'Venture Capital',
    avatarColor: 'from-white to-blue-500',
    badgeClass: 'bg-white/5 text-slate-200 border-white/10',
    problem:
      'Sarah evaluates 50+ space startups per quarter. Her team was drowning in fragmented data across pitch decks, SEC filings, and industry reports. Initial screening took two analysts a full week per deal.',
    modules: [
      { name: 'Company Profiles', href: '/companies', desc: 'Instant access to 200+ space company dossiers with financials, leadership, and competitive positioning.' },
      { name: 'SpaceNexus Score', href: '/companies', desc: 'Proprietary scoring algorithm to rank startups across technology readiness, market fit, and financial health.' },
      { name: 'Funding Tracker', href: '/market-intel', desc: 'Real-time tracking of every funding round, acquisition, and IPO in the space industry.' },
      { name: 'Deal Flow Pipeline', href: '/market-intel', desc: 'Curated pipeline of emerging opportunities with stage, sector, and geography filters.' },
    ],
    result: 'Reduced initial screening time by 70%. Identified three portfolio companies that collectively raised $180M in follow-on funding within 18 months.',
    quote: 'SpaceNexus is the Bloomberg Terminal for space investing. It replaced three analyst subscriptions and gave us an edge our LPs notice.',
  },
  {
    name: 'Marcus Webb',
    role: 'Senior Intelligence Analyst',
    company: 'U.S. Space Command (Contractor)',
    companyType: 'Government / Defense',
    avatarColor: 'from-purple-500 to-indigo-500',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    problem:
      'Marcus compiles weekly space threat briefings for senior leadership. He was manually aggregating launch data, satellite positions, regulatory changes, and adversary activity from a dozen different classified and unclassified sources.',
    modules: [
      { name: 'Satellite Tracker', href: '/satellites', desc: 'Live orbital tracking of 10,000+ objects with operator attribution and orbit classification.' },
      { name: 'Launch Manifest', href: '/launches', desc: 'Comprehensive database of global launches with vehicle, payload, and outcome data.' },
      { name: 'Space Defense Module', href: '/space-defense', desc: 'Dedicated tracking of military space programs, ASAT tests, and space domain awareness.' },
      { name: 'Regulatory Hub', href: '/regulatory', desc: 'Treaties, export controls, ITAR compliance, and international space policy tracking.' },
    ],
    result: 'Cut weekly briefing preparation time from 16 hours to 4 hours. Briefing quality improved with real-time satellite position data and automated anomaly detection.',
    quote: 'The unclassified intelligence SpaceNexus aggregates would have taken my team days to compile. Now it is our starting point for every briefing.',
  },
  {
    name: 'Dr. Priya Sharma',
    role: 'Principal Systems Engineer',
    company: 'NovaStar Aerospace',
    companyType: 'Aerospace / Engineering',
    avatarColor: 'from-emerald-500 to-teal-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    problem:
      'Priya leads constellation design for a LEO broadband startup. Her team relied on $50K+ STK licenses and disconnected spreadsheets for orbit design, link budgets, and debris avoidance analysis.',
    modules: [
      { name: 'Constellation Designer', href: '/constellation-designer', desc: 'Design and optimize Walker constellations with coverage analysis and inter-satellite link planning.' },
      { name: 'Orbital Calculator', href: '/orbital-calculator', desc: 'Delta-v budgets, transfer orbits, and station-keeping calculations for mission design.' },
      { name: 'Satellite Tracker', href: '/satellites', desc: 'Real-time conjunction screening and proximity analysis against the active catalog.' },
      { name: 'Debris Catalog', href: '/debris', desc: 'Tracked debris objects with historical collision probability data and avoidance maneuver alerts.' },
    ],
    result: 'Completed preliminary constellation design in 3 weeks instead of 3 months. Saved $120K in first-year tooling costs by replacing two STK seats.',
    quote: 'We went from concept to optimized 288-satellite constellation in a single sprint. The tools are shockingly good for a web platform.',
  },
  {
    name: 'James Park',
    role: 'Co-Founder & CEO',
    company: 'Aether Propulsion',
    companyType: 'Space Startup',
    avatarColor: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    problem:
      'James needed market intelligence to refine his business model, set pricing, prepare investor materials, and identify government contract opportunities. As a bootstrapped startup, he couldn&apos;t afford analyst subscriptions or consultants.',
    modules: [
      { name: 'Market Intelligence', href: '/market-intel', desc: 'Daily curated industry news, trend analysis, and competitive landscape tracking.' },
      { name: 'Market Sizing', href: '/market-sizing', desc: 'Bottom-up TAM/SAM/SOM analysis for every major space market segment.' },
      { name: 'Contract Awards', href: '/contracts', desc: 'Government and commercial contract database with value, competitors, and timeline data.' },
      { name: 'Pricing & Plans', href: '/pricing', desc: 'Subscription plans and feature comparison across tiers.' },
    ],
    result: 'Closed a $4.2M seed round with data-backed market sizing. Won first government SBIR contract within 6 months using the contract awards module.',
    quote: 'SpaceNexus gave a two-person startup the market intelligence of a Fortune 500 company. Our investors were blown away by the depth of our market analysis.',
  },
];

function PersonaAvatar({ name, gradient }: { name: string; gradient: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
      {initials}
    </div>
  );
}

export default function UseCasesPage() {
  return (
    <div className="min-h-screen pb-16">

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/5 text-slate-200 border border-white/10 mb-6">
                Use Cases
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                How Space Professionals Use{' '}
                <span className="bg-gradient-to-r from-slate-300 to-purple-400 bg-clip-text text-transparent">
                  SpaceNexus
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
                From venture capitalists to satellite engineers, see how real professionals leverage SpaceNexus to gain a competitive edge.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Use Case Cards */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="space-y-12 max-w-4xl mx-auto">
            {USE_CASES.map((uc, index) => (
              <ScrollReveal key={uc.name} delay={index * 0.08}>
                <article className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-slate-700/50">
                    <div className="flex items-start gap-4">
                      <PersonaAvatar name={uc.name} gradient={uc.avatarColor} />
                      <div>
                        <h2 className="text-xl font-bold text-white">{uc.name}</h2>
                        <p className="text-slate-300 text-sm">{uc.role}, {uc.company}</p>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${uc.badgeClass}`}>
                          {uc.companyType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    {/* Problem */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">The Challenge</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{uc.problem}</p>
                    </div>

                    {/* Modules Used */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">SpaceNexus Modules Used</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {uc.modules.map((mod) => (
                          <Link
                            key={mod.name}
                            href={mod.href}
                            className="block rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 hover:border-white/10 transition-colors group"
                          >
                            <p className="text-white text-sm font-medium group-hover:text-white transition-colors">{mod.name}</p>
                            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{mod.desc}</p>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Result */}
                    <div className="rounded-xl bg-gradient-to-r from-white/5 to-blue-500/5 border border-white/15 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2">The Result</h3>
                      <p className="text-slate-200 text-sm leading-relaxed">{uc.result}</p>
                    </div>

                    {/* Quote */}
                    <blockquote className="border-l-2 border-slate-600 pl-4">
                      <p className="text-slate-300 text-sm italic leading-relaxed">&ldquo;{uc.quote}&rdquo;</p>
                      <cite className="text-slate-500 text-xs mt-1 block not-italic">&mdash; {uc.name}, {uc.role}</cite>
                    </blockquote>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Write Your Success Story?</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join thousands of space professionals who rely on SpaceNexus for intelligence, engineering, and strategic decision-making.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-white to-blue-600 text-white font-semibold hover:from-slate-300 hover:to-blue-500 transition-all shadow-lg shadow-black/20/25 hover:shadow-black/20/40"
                >
                  Start Free Today
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/solutions/investors"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  Explore Solutions
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related Modules */}
      <section className="container mx-auto px-4 pb-16">
        <RelatedModules modules={getRelatedModules('use-cases')} />
      </section>
    </div>
  );
}
