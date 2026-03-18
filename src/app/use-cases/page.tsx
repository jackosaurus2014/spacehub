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
    role: 'Space VC Partner',
    companyType: 'Venture Capital',
    avatarColor: 'from-white to-blue-500',
    badgeClass: 'bg-white/5 text-white/90 border-white/10',
    problem:
      'Space-focused VCs evaluate 50+ startups per quarter. Teams often drown in fragmented data across pitch decks, SEC filings, and industry reports. Initial screening can take two analysts a full week per deal.',
    modules: [
      { name: 'Company Profiles', href: '/companies', desc: 'Instant access to 200+ space company dossiers with financials, leadership, and competitive positioning.' },
      { name: 'SpaceNexus Score', href: '/companies', desc: 'Proprietary scoring algorithm to rank startups across technology readiness, market fit, and financial health.' },
      { name: 'Funding Tracker', href: '/market-intel', desc: 'Real-time tracking of every funding round, acquisition, and IPO in the space industry.' },
      { name: 'Deal Flow Pipeline', href: '/market-intel', desc: 'Curated pipeline of emerging opportunities with stage, sector, and geography filters.' },
    ],
    result: 'Reduce initial screening time by up to 70% and identify high-potential portfolio companies faster with unified data.',
  },
  {
    role: 'Defense Intelligence Analyst',
    companyType: 'Government / Defense',
    avatarColor: 'from-purple-500 to-indigo-500',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    problem:
      'Defense analysts compile weekly space threat briefings for senior leadership, manually aggregating launch data, satellite positions, regulatory changes, and adversary activity from a dozen different classified and unclassified sources.',
    modules: [
      { name: 'Satellite Tracker', href: '/satellites', desc: 'Live orbital tracking of 10,000+ objects with operator attribution and orbit classification.' },
      { name: 'Launch Manifest', href: '/launch-manifest', desc: 'Comprehensive database of global launches with vehicle, payload, and outcome data.' },
      { name: 'Space Defense Module', href: '/space-defense', desc: 'Dedicated tracking of military space programs, ASAT tests, and space domain awareness.' },
      { name: 'Regulatory Hub', href: '/compliance', desc: 'Treaties, export controls, ITAR compliance, and international space policy tracking.' },
    ],
    result: 'Cut weekly briefing preparation time significantly with real-time satellite position data and automated anomaly detection.',
  },
  {
    role: 'Principal Systems Engineer',
    companyType: 'Aerospace / Engineering',
    avatarColor: 'from-emerald-500 to-teal-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    problem:
      'Engineering teams designing LEO constellations often rely on expensive STK licenses and disconnected spreadsheets for orbit design, link budgets, and debris avoidance analysis.',
    modules: [
      { name: 'Constellation Designer', href: '/constellation-designer', desc: 'Design and optimize Walker constellations with coverage analysis and inter-satellite link planning.' },
      { name: 'Orbital Calculator', href: '/orbital-calculator', desc: 'Delta-v budgets, transfer orbits, and station-keeping calculations for mission design.' },
      { name: 'Satellite Tracker', href: '/satellites', desc: 'Real-time conjunction screening and proximity analysis against the active catalog.' },
      { name: 'Debris Catalog', href: '/debris-catalog', desc: 'Tracked debris objects with historical collision probability data and avoidance maneuver alerts.' },
    ],
    result: 'Complete preliminary constellation design in weeks instead of months, saving significantly on first-year tooling costs.',
  },
  {
    role: 'Space Startup Founder',
    companyType: 'Space Startup',
    avatarColor: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    problem:
      'Early-stage space startup founders need market intelligence to refine business models, set pricing, prepare investor materials, and identify government contract opportunities -- often without the budget for analyst subscriptions or consultants.',
    modules: [
      { name: 'Market Intelligence', href: '/market-intel', desc: 'Daily curated industry news, trend analysis, and competitive landscape tracking.' },
      { name: 'Market Sizing', href: '/market-sizing', desc: 'Bottom-up TAM/SAM/SOM analysis for every major space market segment.' },
      { name: 'Contract Awards', href: '/contract-awards', desc: 'Government and commercial contract database with value, competitors, and timeline data.' },
      { name: 'Pricing & Plans', href: '/pricing', desc: 'Subscription plans and feature comparison across tiers.' },
    ],
    result: 'Build data-backed pitch decks with real market sizing and discover government SBIR opportunities through the contract awards module.',
  },
];

function RoleIcon({ role, gradient }: { role: string; gradient: string }) {
  const initials = role.split(' ').map((n) => n[0]).join('').slice(0, 2);
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
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/5 text-white/90 border border-white/10 mb-6">
                Use Cases
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                How Space Professionals Use{' '}
                <span className="bg-gradient-to-r from-slate-300 to-purple-400 bg-clip-text text-transparent">
                  SpaceNexus
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
                From venture capitalists to satellite engineers, see how space professionals can leverage SpaceNexus to gain a competitive edge.
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
              <ScrollReveal key={uc.role} delay={index * 0.08}>
                <article className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-white/[0.06]">
                    <div className="flex items-start gap-4">
                      <RoleIcon role={uc.role} gradient={uc.avatarColor} />
                      <div>
                        <h2 className="text-xl font-bold text-white">{uc.role}</h2>
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
                            className="block rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 hover:border-white/10 transition-colors group"
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
                      <p className="text-white/90 text-sm leading-relaxed">{uc.result}</p>
                    </div>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-slate-400 text-lg mb-8">
                SpaceNexus brings together intelligence, engineering tools, and strategic data for space professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-white to-blue-600 text-white font-semibold hover:from-slate-300 hover:to-blue-500 transition-all shadow-lg shadow-black/15 hover:shadow-black/20"
                >
                  Start Free Today
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/solutions/investors"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.04] transition-colors"
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
