import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Engineering Tools & Satellite Tracking | SpaceNexus',
  description:
    'Free space engineering tools for professionals. Satellite tracker, constellation designer, orbital calculator, link budget, thermal analysis, and mission planning in one platform.',
  keywords: [
    'space engineering tools',
    'satellite tracking tool free',
    'orbital calculator',
    'constellation designer',
    'link budget calculator',
    'space mission planner',
  ],
  openGraph: {
    title: 'Space Engineering Tools & Satellite Tracking | SpaceNexus',
    description:
      'Free satellite tracker, constellation designer, orbital calculator, link budget tools, and mission planning for space engineers.',
    url: 'https://spacenexus.us/solutions/engineers',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions/engineers' },
};

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Expensive Legacy Tools',
    description:
      'STK licenses cost $10K+ per seat. MATLAB add-ons, proprietary orbit propagators, and specialized RF tools add up quickly for small teams and startups.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'No Integrated Platform',
    description:
      'Engineers juggle between orbit propagators, link budget spreadsheets, thermal tools, and mission planning documents with no shared data layer.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: 'Outdated Calculators',
    description:
      'Many available online calculators use simplified models and haven&apos;t been updated in years. You need tools you can trust for real mission design.',
  },
];

const FEATURES = [
  { name: 'Satellite Tracker', desc: 'Live 3D tracking of 10,000+ satellites with TLE data, orbit visualization, and pass predictions.', href: '/satellites' },
  { name: 'Constellation Designer', desc: 'Design and optimize satellite constellations with coverage analysis, inter-satellite links, and ground station placement.', href: '/constellation-designer' },
  { name: 'Orbital Calculator', desc: 'Delta-v budgets, transfer orbit calculations, Hohmann transfers, and bi-elliptic maneuver planning.', href: '/orbital-calculator' },
  { name: 'Link Budget Tool', desc: 'Complete RF link budget analysis with atmospheric losses, antenna gain patterns, and margin calculations.', href: '/link-budget' },
  { name: 'Thermal Calculator', desc: 'Spacecraft thermal analysis for orbit-averaged temperatures, eclipse durations, and radiator sizing.', href: '/thermal-calculator' },
  { name: 'Mission Planner', desc: 'End-to-end mission planning from launch vehicle selection to concept-of-operations timeline generation.', href: '/mission-planner' },
];

const FAQ_ITEMS = [
  { question: 'Are the engineering tools free to use?', answer: 'Yes. Core engineering tools including the satellite tracker, orbital calculator, and link budget tool are available on the free plan. Advanced features like constellation optimization and mission planning are available on paid plans.' },
  { question: 'How accurate are the orbital calculations?', answer: 'SpaceNexus uses SGP4/SDP4 propagation models for satellite tracking and validated Keplerian mechanics for orbital calculations. Results are suitable for preliminary mission design and trade studies.' },
  { question: 'Can I export results for use in other tools?', answer: 'Yes. All calculators support CSV and JSON export. Constellation designs can be exported in standard formats compatible with STK, GMAT, and other analysis tools.' },
  { question: 'Does SpaceNexus replace STK or GMAT?', answer: 'SpaceNexus complements rather than replaces high-fidelity tools. Use SpaceNexus for rapid trade studies, preliminary design, and real-time monitoring, then move to STK or GMAT for detailed mission analysis.' },
];

export default function EngineersSolutionPage() {
  return (
    <div className="min-h-screen pb-16">
      <FAQSchema items={FAQ_ITEMS} />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-6">
                For Engineers &amp; Mission Designers
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Engineering Tools Built for{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Space Professionals
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Satellite tracking, orbital mechanics, link budgets, and mission planning &mdash; all in one browser-based platform. No licenses, no installs, no barriers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-semibold hover:from-emerald-400 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  Start Free &mdash; No Credit Card Required
                </Link>
                <Link
                  href="/satellites"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  Open Satellite Tracker
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Space Engineers Need Better Tools</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Legacy engineering software is expensive, siloed, and stuck in the desktop era.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto" staggerDelay={0.12}>
            {PAIN_POINTS.map((point) => (
              <StaggerItem key={point.title}>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 h-full">
                  <div className="mb-4">{point.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{point.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{point.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-slate-800/20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Space Engineering Workbench</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Professional-grade tools accessible from any browser, on any device.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" staggerDelay={0.08}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.name}>
                <Link href={feature.href} className="block rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 h-full hover:border-emerald-500/30 transition-colors group">
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">{feature.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-8 md:p-12">
                <svg className="w-10 h-10 text-emerald-500/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z" />
                </svg>
                <blockquote className="text-lg md:text-xl text-slate-200 italic mb-6 leading-relaxed">
                  The constellation designer saved our team three months of preliminary design work. We went from concept to optimized Walker constellation in a single afternoon. Honestly can&apos;t believe it&apos;s free.
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Dr. Elena Vasquez</p>
                  <p className="text-slate-400 text-sm">Senior Satellite Systems Engineer, NovaStar Aerospace</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-slate-800/20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" staggerDelay={0.1}>
            {FAQ_ITEMS.map((item) => (
              <StaggerItem key={item.question}>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6">
                  <h3 className="font-semibold text-white mb-2">{item.question}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Building Your Next Mission</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join thousands of space engineers who use SpaceNexus for satellite tracking, orbit design, and mission planning.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-semibold hover:from-emerald-400 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
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

      {/* Related Modules */}
      <section className="container mx-auto px-4 pb-16">
        <RelatedModules modules={getRelatedModules('solutions/engineers')} />
      </section>
    </div>
  );
}
