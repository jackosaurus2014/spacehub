import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Market Analytics Platform for Analysts | SpaceNexus',
  description:
    'Space market intelligence at your fingertips. Real-time industry tracking, export-ready datasets, satellite monitoring, and launch data for defense and market analysts.',
  keywords: [
    'space market analytics platform',
    'space industry analysis tools',
    'space defense intelligence',
    'satellite tracking analytics',
    'space market research',
    'launch manifest data',
  ],
  openGraph: {
    title: 'Space Market Analytics Platform for Analysts | SpaceNexus',
    description:
      'Real-time space industry tracking, export-ready datasets, satellite monitoring, and launch data for defense and market analysts.',
    url: 'https://spacenexus.us/solutions/analysts',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions/analysts' },
};

const PAIN_POINTS = [
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: 'Scattered Data Sources',
    description:
      'Space industry data lives in dozens of siloed databases, government registries, and proprietary feeds. Consolidating it for a single report can take days.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'No Real-Time Tracking',
    description:
      'By the time traditional research reports are published, market dynamics have already shifted. You need live data, not last quarter&apos;s summary.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Manual Report Building',
    description:
      'Assembling charts, tables, and narratives from raw data is tedious. Export tools are either nonexistent or require expensive enterprise licenses.',
  },
];

const FEATURES = [
  { name: 'Market Intelligence', desc: 'Industry news, trend analysis, and competitive landscape tracking updated in real time.', href: '/market-intel' },
  { name: 'Industry Trends', desc: 'Data-driven trend reports covering launch cadence, funding flows, spectrum allocations, and market shifts.', href: '/trends' },
  { name: 'Export & Reporting', desc: 'One-click CSV, PDF, and chart exports for seamless integration into your deliverables.', href: '/dashboard' },
  { name: 'Satellite Tracker', desc: 'Live orbital tracking for 10,000+ active satellites with filtering by operator, orbit, and mission type.', href: '/satellites' },
  { name: 'Launch Manifest', desc: 'Comprehensive database of past, present, and upcoming launches with payload and vehicle details.', href: '/launches' },
  { name: 'Spectrum Analysis', desc: 'ITU filing tracker and spectrum allocation database across S, C, Ku, Ka, and V bands.', href: '/spectrum' },
];

const FAQ_ITEMS = [
  { question: 'What types of analysts use SpaceNexus?', answer: 'SpaceNexus is used by defense intelligence analysts, equity research teams, management consultants, policy researchers, and market research firms focused on the space and aerospace sector.' },
  { question: 'Can I export data for my reports?', answer: 'Yes. SpaceNexus supports CSV, PDF, and chart image exports across all modules, so you can seamlessly integrate data into presentations, whitepapers, and internal briefings.' },
  { question: 'How current is the data on SpaceNexus?', answer: 'Most data feeds update in real time or within hours. Launch manifests, satellite positions, and market news are continuously refreshed. Company financials update quarterly following public disclosures.' },
  { question: 'Does SpaceNexus cover defense and national security space?', answer: 'Yes. SpaceNexus includes dedicated modules for space defense programs, military satellite tracking, ITAR-relevant regulatory tracking, and government contract awards.' },
];

export default function AnalystsSolutionPage() {
  return (
    <div className="min-h-screen pb-16">
      <FAQSchema items={FAQ_ITEMS} />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-6">
                For Analysts &amp; Researchers
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Space Market Intelligence{' '}
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  at Your Fingertips
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Stop wasting time hunting for data. SpaceNexus aggregates, structures, and visualizes the entire space industry so you can focus on analysis, not data collection.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-semibold hover:from-purple-400 hover:to-cyan-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  Start Free &mdash; No Credit Card Required
                </Link>
                <Link
                  href="/market-intel"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  Explore Market Intel
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Problem with Space Research Today</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                The space industry moves fast, but research tools haven&apos;t kept up. Here&apos;s what analysts face every day.
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Research Command Center</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                From raw data to finished analysis, SpaceNexus has every tool an analyst needs.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" staggerDelay={0.08}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.name}>
                <Link href={feature.href} className="block rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 h-full hover:border-purple-500/30 transition-colors group">
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">{feature.name}</h3>
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
                <svg className="w-10 h-10 text-purple-500/40 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z" />
                </svg>
                <blockquote className="text-lg md:text-xl text-slate-200 italic mb-6 leading-relaxed">
                  Before SpaceNexus, my weekly space threat briefing took two full days to compile. Now I pull everything I need in under an hour. The satellite tracker and launch manifest alone are worth the subscription.
                </blockquote>
                <div>
                  <p className="text-white font-semibold">Lt. Col. David Kim (Ret.)</p>
                  <p className="text-slate-400 text-sm">Senior Defense Intelligence Analyst</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Accelerate Your Space Research</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join analysts at leading consultancies, defense agencies, and research institutions who rely on SpaceNexus daily.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-semibold hover:from-purple-400 hover:to-cyan-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
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
        <RelatedModules modules={getRelatedModules('solutions/analysts')} />
      </section>
    </div>
  );
}
