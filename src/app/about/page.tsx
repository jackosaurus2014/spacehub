'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

const whatWeDoCards = [
  {
    icon: (
      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Market Intelligence',
    description: 'Real-time tracking of space industry trends, company financials, funding rounds, and market analysis across the global space economy.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1h14.25M4.5 19.5h15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Business Tools',
    description: 'Mission cost calculators, link budget tools, power budget analysis, launch window planners, and procurement intelligence for informed decision-making.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Community Hub',
    description: 'Connect with space industry professionals, share insights in topic-specific forums, and collaborate on opportunities across the space sector.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Technical Resources',
    description: 'Comprehensive glossary, satellite tracking, orbital mechanics tools, space environment monitoring, and regulatory compliance databases.',
  },
];

const stats = [
  { value: '200+', label: 'Companies Profiled' },
  { value: '50+', label: 'Data Sources' },
  { value: '30+', label: 'Intelligence Modules' },
  { value: '19,000+', label: 'Satellites Tracked' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero Section */}
        <AnimatedPageHeader
          title="About SpaceNexus"
          subtitle="The Space Industry Intelligence Platform"
          accentColor="cyan"
        />

        {/* Our Mission Section */}
        <ScrollReveal className="mt-16">
          <div className="card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                Our Mission
              </h2>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
              Democratize space industry intelligence. SpaceNexus provides the data, tools,
              and community that space entrepreneurs, investors, and professionals need to make informed decisions
              &mdash; all in one platform, updated in real time.
            </p>
          </div>
        </ScrollReveal>

        {/* What We Do Section */}
        <ScrollReveal className="mt-16">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-8 text-center">
            What We Do
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={0.12}>
          {whatWeDoCards.map((card) => (
            <StaggerItem key={card.title}>
              <div className="card p-6 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* By The Numbers Section */}
        <ScrollReveal className="mt-16">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-8 text-center">
            By The Numbers
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6" staggerDelay={0.1}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="card p-6 text-center">
                <div>
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                </div>
                <p className="text-sm text-slate-400 mt-2 font-medium">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Our Story Section */}
        <ScrollReveal className="mt-16">
          <div className="card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                Our Story
              </h2>
            </div>
            <div className="space-y-4 max-w-4xl">
              <p className="text-lg text-slate-300 leading-relaxed">
                SpaceNexus was built by space industry professionals who were tired of fragmented data.
                Launch schedules on one site, satellite tracking on another, market data buried in spreadsheets,
                government contracts scattered across a dozen portals &mdash; the information existed, but no
                single platform brought it together.
              </p>
              <p className="text-lg text-slate-300 leading-relaxed">
                While large defense contractors have access to expensive data terminals and consulting firms,
                the vast majority of space startups, investors, and professionals lack the same intelligence
                infrastructure. SpaceNexus was created to level that playing field &mdash; giving every
                participant in the space economy the tools they need to compete.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* The Team Section */}
        <ScrollReveal className="mt-16">
          <div className="card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                The Team
              </h2>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
              SpaceNexus is built by a team of engineers, analysts, and space enthusiasts based in Houston, TX.
              We combine deep aerospace domain expertise with modern software engineering to deliver intelligence
              tools that actually move the needle for space industry professionals.
            </p>
          </div>
        </ScrollReveal>

        {/* Register CTA Section */}
        <ScrollReveal className="mt-16">
          <div className="card p-8 md:p-12 text-center bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Ready to explore the space economy?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join space industry professionals using SpaceNexus for real-time intelligence,
              market data, and collaboration tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl shadow-lg shadow-black/15 hover:shadow-black/20 transition-all duration-300"
              >
                Get Started Free
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Get In Touch
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <div className="mb-16" />
      </div>
    </div>
  );
}
