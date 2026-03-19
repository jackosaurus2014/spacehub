import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';
import PersonalizedWelcome from '@/components/onboarding/PersonalizedWelcome';

const QUICK_START_STEPS = [
  {
    step: 1,
    title: 'Create Your Free Account',
    description:
      'Sign up in 30 seconds — no credit card required. Get instant access to news, company profiles, and basic satellite tracking.',
    cta: 'Create Free Account',
    href: '/register',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Explore Your Dashboard',
    description:
      'Your Mission Control dashboard shows upcoming launches, breaking news, and market activity. Pin your favorite modules for quick access.',
    cta: 'View Mission Control',
    href: '/mission-control',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Dive Into Intelligence',
    description:
      'Browse 100+ company profiles, track funding rounds, monitor regulatory changes, or run an orbital simulation. Every module is one click away.',
    cta: 'Browse All Features',
    href: '/features',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

const USE_CASES = [
  {
    title: 'Track Launches & Satellites',
    description: 'Real-time orbital tracking, launch schedules, constellation mapping',
    href: '/satellite-tracker',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    gradient: 'from-white/5 to-blue-500/20',
    borderColor: 'border-white/10',
    iconColor: 'text-slate-300',
  },
  {
    title: 'Research Companies',
    description: '100+ space company profiles with SpaceNexus Score',
    href: '/company-profiles',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m4.5-18v18m4.5-18v18m4.5-18v18m4.5-18v18M6 6.75h.75m-.75 3h.75m-.75 3h.75m3-6.75h.75m-.75 3h.75m-.75 3h.75m3-6.75h.75m-.75 3h.75m-.75 3h.75" />
      </svg>
    ),
    gradient: 'from-purple-500/20 to-indigo-500/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    title: 'Monitor Markets',
    description: 'Funding rounds, M&A deals, investment trends',
    href: '/market-intel',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Plan Missions',
    description: 'Cost simulators, launch windows, thermal and radiation calculators',
    href: '/mission-cost',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    gradient: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    title: 'Stay Compliant',
    description: 'ITAR export controls, regulatory calendar, spectrum management',
    href: '/compliance',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    gradient: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  {
    title: 'Find Opportunities',
    description: 'Government contracts, procurement alerts, business matching',
    href: '/business-opportunities',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    gradient: 'from-sky-500/20 to-indigo-500/20',
    borderColor: 'border-sky-500/30',
    iconColor: 'text-sky-400',
  },
];

const PERSONAS = [
  {
    title: 'Investors',
    description: 'Track deal flow, funding rounds, and portfolio companies',
    href: '/solutions/investors',
    gradient: 'from-emerald-500/20 to-white/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    title: 'Analysts',
    description: 'Market sizing, trends analysis, competitive intelligence',
    href: '/solutions/analysts',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Engineers',
    description: 'Orbital mechanics, link budgets, constellation design',
    href: '/solutions/engineers',
    gradient: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.66-5.66a7.002 7.002 0 019.9-9.9l5.66 5.66a7.002 7.002 0 01-9.9 9.9zM8.75 4.75L4.75 8.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L16.5 20.25" />
      </svg>
    ),
  },
  {
    title: 'Executives',
    description: 'Market intelligence, executive moves, strategic briefings',
    href: '/solutions/executives',
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen pb-16">

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/5 text-white/90 border border-white/10 mb-6">
                Quick Start Guide
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Get Started with{' '}
                <span className="bg-gradient-to-r from-slate-300 to-purple-400 bg-clip-text text-transparent">
                  SpaceNexus
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
                From signup to insights in under 5 minutes. Your space industry intelligence platform is ready when you are.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Personalized role-based recommendations (client component, reads localStorage) */}
      <PersonalizedWelcome />

      {/* 3-Step Quick Start */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Three Steps to Launch</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Get up and running in minutes, not days.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-4xl mx-auto space-y-8">
            {QUICK_START_STEPS.map((step, index) => (
              <ScrollReveal key={step.step} delay={index * 0.1}>
                <div className="relative flex items-start gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 md:p-8">
                  {/* Step number */}
                  <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-white to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-black/15">
                    {step.step}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-slate-300">{step.icon}</span>
                      <h3 className="text-xl md:text-2xl font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                      {step.description}
                    </p>
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold transition-colors"
                    >
                      {step.cta}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tour - 5 Steps to Key Features */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                Quick Tour
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Explore Key Features
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Five essential modules to start with. Each one gives you an edge in the space economy.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                step: 1,
                title: 'Browse Company Profiles',
                description:
                  'Explore 200+ space company profiles with SpaceNexus Scores, funding history, key personnel, competitive positioning, and real-time news. Filter by sector, funding stage, or technology focus to find exactly what you need.',
                href: '/company-profiles',
                gradient: 'from-purple-500/20 to-indigo-500/20',
                borderColor: 'border-purple-500/20',
                badgeColor: 'bg-purple-500 text-white',
              },
              {
                step: 2,
                title: 'Track Satellites',
                description:
                  'Monitor the ISS, Starlink constellation, weather satellites, and more with real-time orbital tracking. View TLE data, pass predictions, and constellation status across multiple orbit types including LEO, MEO, and GEO.',
                href: '/satellites',
                gradient: 'from-blue-500/20 to-cyan-500/20',
                borderColor: 'border-blue-500/20',
                badgeColor: 'bg-blue-500 text-white',
              },
              {
                step: 3,
                title: 'Monitor Space News',
                description:
                  'Stay current with aggregated news from 53+ RSS feeds, categorized by topic: launches, policy, defense, commercial, science, and more. Save articles to your reading list and get AI-powered summaries.',
                href: '/news',
                gradient: 'from-emerald-500/20 to-teal-500/20',
                borderColor: 'border-emerald-500/20',
                badgeColor: 'bg-emerald-500 text-white',
              },
              {
                step: 4,
                title: 'Explore Market Intel',
                description:
                  'Access market intelligence dashboards covering space stocks, deal flow, funding rounds, M&A activity, and executive moves. Track the financial pulse of the space economy in real time.',
                href: '/market-intel',
                gradient: 'from-amber-500/20 to-orange-500/20',
                borderColor: 'border-amber-500/20',
                badgeColor: 'bg-amber-500 text-white',
              },
              {
                step: 5,
                title: 'Use Mission Tools',
                description:
                  'Run orbital simulations, calculate launch costs, design satellite constellations, estimate link budgets, and plan missions with our engineering toolkit. Built for engineers and mission planners.',
                href: '/tools',
                gradient: 'from-rose-500/20 to-pink-500/20',
                borderColor: 'border-rose-500/20',
                badgeColor: 'bg-rose-500 text-white',
              },
            ].map((item, index) => (
              <ScrollReveal key={item.step} delay={index * 0.1}>
                <div
                  className={`relative flex items-start gap-5 md:gap-6 rounded-2xl border ${item.borderColor} bg-gradient-to-br ${item.gradient} backdrop-blur-sm p-5 md:p-7 hover:scale-[1.01] transition-transform`}
                >
                  {/* Step number badge */}
                  <div
                    className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full ${item.badgeColor} flex items-center justify-center font-bold text-lg md:text-xl shadow-lg`}
                  >
                    {item.step}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                      {item.description}
                    </p>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-colors"
                    >
                      Try it
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* What Can You Do With SpaceNexus? */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                What Can You Do With SpaceNexus?
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Six capabilities, one platform. Everything you need to navigate the space economy.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto content-auto">
            {USE_CASES.map((uc) => (
              <StaggerItem key={uc.title}>
                <Link
                  href={uc.href}
                  className={`block h-full rounded-2xl border ${uc.borderColor} bg-gradient-to-br ${uc.gradient} p-6 hover:scale-[1.02] transition-transform group`}
                >
                  <div className={`${uc.iconColor} mb-4`}>{uc.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {uc.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{uc.description}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-300 group-hover:gap-2 transition-all">
                    Explore
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose Your Path</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                SpaceNexus adapts to your role. Pick your starting point and dive in.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto content-auto">
            {PERSONAS.map((persona) => (
              <StaggerItem key={persona.title}>
                <Link
                  href={persona.href}
                  className={`block h-full rounded-2xl border ${persona.borderColor} bg-gradient-to-br ${persona.gradient} p-6 text-center hover:scale-[1.03] transition-transform group`}
                >
                  <div className={`${persona.iconColor} flex justify-center mb-4`}>{persona.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {persona.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{persona.description}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-300 group-hover:gap-2 transition-all">
                    Get Started
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Explore More */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                Explore More
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                More Ways to Stay Informed
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Discover additional tools and resources for space professionals.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto content-auto">
            <StaggerItem>
              <Link
                href="/daily-digest"
                className="block h-full rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 hover:scale-[1.02] transition-transform group"
              >
                <div className="text-amber-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                  Daily Digest
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Get a curated daily briefing of the most important space industry news, launches, and market moves.
                </p>
                <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-300 group-hover:gap-2 transition-all">
                  View Digest
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link
                href="/space-stats"
                className="block h-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 hover:scale-[1.02] transition-transform group"
              >
                <div className="text-cyan-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                  Space Stats
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Key metrics and statistics about the space industry — launches, satellites, funding, and market data at a glance.
                </p>
                <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-300 group-hover:gap-2 transition-all">
                  View Stats
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link
                href="/alternatives"
                className="block h-full rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-6 hover:scale-[1.02] transition-transform group"
              >
                <div className="text-violet-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                  Alternatives &amp; Comparisons
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  See how SpaceNexus compares to other space industry tools and platforms. Find the right fit for your needs.
                </p>
                <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-slate-300 group-hover:gap-2 transition-all">
                  Compare
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Launch?</h2>
              <p className="text-slate-400 text-lg mb-8">
                Join thousands of space professionals who rely on SpaceNexus for intelligence, engineering, and strategic decision-making.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-white to-blue-600 text-white font-semibold hover:from-slate-300 hover:to-blue-500 transition-all shadow-lg shadow-black/15 hover:shadow-black/20"
                >
                  Create Free Account
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.04] transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mobile App CTA */}
      <section className="container mx-auto px-4 pb-12">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto card p-6 border border-cyan-500/20 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Take SpaceNexus On the Go</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
              Get the full SpaceNexus experience on your Android device. Track launches, monitor markets, and receive real-time alerts.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.453 1.42a1 1 0 010 1.546l-2.453 1.42-2.537-2.386 2.537-2zm-3.906-2.093L5.157 1.58l10.937 6.333-2.302 2.301z" />
              </svg>
              Get it on Google Play
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Related Modules */}
      <section className="container mx-auto px-4 pb-16">
        <RelatedModules modules={getRelatedModules('getting-started')} />
      </section>
    </div>
  );
}
