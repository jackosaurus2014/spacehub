import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Investment Intelligence for Investors | SpaceNexus',
  description:
    'Make smarter space investments with data-driven intelligence. Company profiles, proprietary SpaceNexus Scores, funding trackers, and deal flow tools built for space investors and VCs.',
  keywords: [
    'space investment intelligence',
    'space industry data for investors',
    'space VC analytics',
    'space startup due diligence',
    'space funding tracker',
    'space deal flow',
  ],
  openGraph: {
    title: 'Space Investment Intelligence for Investors | SpaceNexus',
    description:
      'Make smarter space investments with data-driven intelligence. Company profiles, SpaceNexus Scores, funding trackers, and deal flow tools.',
    url: 'https://spacenexus.us/solutions/investors',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions/investors' },
};

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Fragmented Data Sources',
    description:
      'Space industry intelligence is scattered across SEC filings, press releases, government databases, and paywalled reports. You waste hours stitching together a single picture.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'No Proprietary Scoring',
    description:
      'Without a standardized framework to evaluate space companies, every deal requires expensive, manual due diligence from scratch.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Manual Due Diligence',
    description:
      'Building investment memos takes weeks of manual research. By the time you finish, the deal window has often closed.',
  },
];

const FEATURES = [
  { name: 'Company Profiles', desc: '200+ detailed space company profiles with financials, leadership, and competitive positioning.', href: '/companies' },
  { name: 'SpaceNexus Score', desc: 'Proprietary scoring system rating companies across technology readiness, market position, and financial health.', href: '/companies' },
  { name: 'Funding Tracker', desc: 'Real-time tracking of every space industry funding round, acquisition, and IPO.', href: '/market-intel' },
  { name: 'Deal Flow Pipeline', desc: 'Curated pipeline of emerging space startups and investment opportunities.', href: '/market-intel' },
  { name: 'Portfolio Tracker', desc: 'Monitor your space portfolio holdings with market data and performance analytics.', href: '/dashboard' },
  { name: 'SEC Filings Monitor', desc: 'Automated alerts for space-related SEC filings, insider transactions, and material disclosures.', href: '/market-intel' },
  { name: 'Market Sizing Data', desc: 'Bottom-up TAM/SAM/SOM analysis for every major space market segment.', href: '/market-sizing' },
];

const FAQ_ITEMS = [
  { question: 'What data sources does SpaceNexus use for investor intelligence?', answer: 'SpaceNexus aggregates data from SEC filings, government contract databases, company press releases, patent filings, satellite tracking data, and proprietary research to deliver comprehensive space investment intelligence.' },
  { question: 'How is the SpaceNexus Score calculated?', answer: 'The SpaceNexus Score evaluates companies across technology readiness, market position, financial health, team strength, and competitive moat using a proprietary weighted algorithm updated quarterly.' },
  { question: 'Can I track my space investment portfolio on SpaceNexus?', answer: 'Yes. The portfolio tracker lets you monitor holdings, set alerts for company events, and benchmark performance against space industry indices.' },
  { question: 'Is SpaceNexus suitable for institutional investors?', answer: 'Absolutely. SpaceNexus serves venture capitalists, private equity firms, family offices, and institutional investors with enterprise-grade data exports, API access, and team collaboration features.' },
];

export default function InvestorsSolutionPage() {
  return (
    <div className="min-h-screen pb-16">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Solutions', href: '/solutions/investors' }, { name: 'For Investors' }]} />
      <FAQSchema items={FAQ_ITEMS} />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-6">
                For Investors &amp; VCs
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Make Smarter{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Space Investments
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                The space economy is projected to exceed $1.8 trillion by 2035. SpaceNexus gives you the data-driven intelligence to identify winners early and make confident investment decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                >
                  Start Free &mdash; No Credit Card Required
                </Link>
                <Link
                  href="/companies"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  Explore Company Profiles
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Challenge for Space Investors</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Traditional financial tools weren&apos;t built for the space economy. Here&apos;s what you&apos;re up against.
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Investment Intelligence Toolkit</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Everything you need to source, evaluate, and monitor space investments in one platform.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" staggerDelay={0.08}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.name}>
                <Link href={feature.href} className="block rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 h-full hover:border-cyan-500/30 transition-colors group">
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">{feature.name}</h3>
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
                <svg className="w-10 h-10 text-cyan-500/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z" />
                </svg>
                <blockquote className="text-lg md:text-xl text-slate-200 italic mb-6 leading-relaxed">
                  SpaceNexus replaced three analyst subscriptions and a Bloomberg terminal for our space practice. The SpaceNexus Score alone has saved us weeks of initial screening on every deal.
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Rachel Torres</p>
                  <p className="text-slate-400 text-sm">Partner, Orbital Ventures Capital</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Invest with Confidence?</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join hundreds of space investors who rely on SpaceNexus for sourcing, screening, and monitoring deals.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
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
        <RelatedModules modules={getRelatedModules('solutions/investors')} />
      </section>
    </div>
  );
}
