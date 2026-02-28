import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Business Intelligence for Executives | SpaceNexus',
  description:
    'The intelligence platform for space industry leaders. Executive dashboards, intelligence briefs, market maps, contract tracking, and KPI monitoring for C-suite decision makers.',
  keywords: [
    'space business intelligence executive',
    'space industry dashboard',
    'space executive intelligence',
    'space market overview',
    'space contract awards',
    'space industry KPIs',
  ],
  openGraph: {
    title: 'Space Business Intelligence for Executives | SpaceNexus',
    description:
      'Executive dashboards, intelligence briefs, market maps, and KPI monitoring for space industry leaders.',
    url: 'https://spacenexus.us/solutions/executives',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions/executives' },
};

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    title: 'Information Overload',
    description:
      'Hundreds of news sources, analyst reports, and data feeds compete for your attention. Distilling signal from noise takes hours you don&apos;t have.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'No Single Source of Truth',
    description:
      'Your team uses different tools, different data sources, and different methodologies. Alignment on market reality is almost impossible.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Team Collaboration Gaps',
    description:
      'Strategy, BD, and engineering teams all need market intelligence but have no shared platform. Decisions are made on incomplete information.',
  },
];

const FEATURES = [
  { name: 'Executive Dashboard', desc: 'Customizable dashboard with KPIs, market trends, portfolio performance, and team activity at a glance.', href: '/dashboard' },
  { name: 'Intelligence Brief', desc: 'Daily curated briefings on the most important space industry developments, delivered to your inbox.', href: '/market-intel' },
  { name: 'Executive Moves', desc: 'Track C-suite appointments, board changes, and leadership transitions across the space industry.', href: '/market-intel' },
  { name: 'Market Map', desc: 'Interactive visualization of the entire space value chain with company positioning and competitive dynamics.', href: '/market-map' },
  { name: 'Contract Awards', desc: 'Real-time tracking of government and commercial contract awards with value, duration, and competitive intelligence.', href: '/contracts' },
  { name: 'Industry KPIs', desc: 'Benchmark your company against industry metrics for revenue growth, launch cadence, funding efficiency, and more.', href: '/trends' },
];

const FAQ_ITEMS = [
  { question: 'How does SpaceNexus help with board presentations?', answer: 'SpaceNexus provides export-ready charts, market maps, and competitive landscapes that executives use directly in board decks and investor presentations. Data is always current and sourced.' },
  { question: 'Can my whole leadership team access SpaceNexus?', answer: 'Yes. Enterprise plans include team seats with role-based access, shared dashboards, and collaborative workspaces so your entire leadership team works from the same data.' },
  { question: 'What makes SpaceNexus different from general business intelligence tools?', answer: 'SpaceNexus is purpose-built for the space industry with domain-specific data models, proprietary scoring, and space-specific modules that general BI tools like Tableau or Power BI cannot replicate.' },
  { question: 'How often is market data updated?', answer: 'Market news and satellite data update in real time. Company profiles, financial data, and market sizing are refreshed quarterly or upon material events. Contract awards update within 24 hours of publication.' },
];

export default function ExecutivesSolutionPage() {
  return (
    <div className="min-h-screen pb-16">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Solutions', href: '/solutions/executives' }, { name: 'For Executives' }]} />
      <FAQSchema items={FAQ_ITEMS} />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-blue-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-6">
                For Executives &amp; Leaders
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                The Intelligence Platform for{' '}
                <span className="bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent">
                  Space Industry Leaders
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Make faster, better-informed strategic decisions with a single platform that unifies market intelligence, competitive analysis, and industry KPIs for space.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-blue-600 text-white font-semibold hover:from-amber-400 hover:to-blue-500 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                >
                  Start Free &mdash; No Credit Card Required
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  See the Dashboard
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Executive Intelligence Gap</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Space industry leaders face unique challenges that generic business tools weren&apos;t designed to solve.
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Strategic Command Center</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Everything a space industry executive needs to lead with confidence, in one platform.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" staggerDelay={0.08}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.name}>
                <Link href={feature.href} className="block rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 h-full hover:border-amber-500/30 transition-colors group">
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-amber-300 transition-colors">{feature.name}</h3>
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
                <svg className="w-10 h-10 text-amber-500/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z" />
                </svg>
                <blockquote className="text-lg md:text-xl text-slate-200 italic mb-6 leading-relaxed">
                  I start every Monday with the SpaceNexus intelligence brief. It replaced three newsletters and a consultant. My board is impressed with how current our market positioning data is.
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Alex Thornton</p>
                  <p className="text-slate-400 text-sm">CEO, Meridian Space Systems</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Lead with Intelligence</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join CEOs, CTOs, and VPs at the world&apos;s leading space companies who rely on SpaceNexus for strategic decision-making.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-blue-600 text-white font-semibold hover:from-amber-400 hover:to-blue-500 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
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
        <RelatedModules modules={getRelatedModules('solutions/executives')} />
      </section>
    </div>
  );
}
