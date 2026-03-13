import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';

const ROICalculator = dynamic(() => import('@/components/billing/ROICalculator'), {
  ssr: false,
  loading: () => <div className="animate-pulse h-96 bg-slate-800/50 rounded-2xl" />,
});

export const metadata: Metadata = {
  title: 'Enterprise Space Intelligence | SpaceNexus',
  description:
    'Unified space intelligence platform for large organizations. Team collaboration, API integrations, AI-powered reports, compliance suite, and procurement intelligence for enterprise teams.',
  keywords: [
    'enterprise space intelligence',
    'space industry enterprise platform',
    'team space analytics',
    'space API integration',
    'ITAR compliance platform',
    'government procurement intelligence',
    'enterprise space data',
  ],
  openGraph: {
    title: 'Enterprise Space Intelligence | SpaceNexus',
    description:
      'Unified space intelligence platform for large organizations. Team collaboration, AI reports, compliance, and procurement intelligence.',
    url: 'https://spacenexus.us/enterprise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enterprise Space Intelligence | SpaceNexus',
    description:
      'Unified space intelligence platform for large organizations.',
  },
  alternates: { canonical: 'https://spacenexus.us/enterprise' },
};

const ENTERPRISE_FEATURES = [
  {
    title: 'Team Collaboration',
    description:
      'Shared dashboards, role-based access controls, and team workspaces that keep your entire organization aligned on space market intelligence.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    gradient: 'from-white/5 to-blue-500/20',
    borderColor: 'border-white/10',
    iconColor: 'text-slate-300',
  },
  {
    title: 'API & Integrations',
    description:
      'Full REST API access, webhook events for real-time alerts, and custom data feeds that plug directly into your existing tools and workflows.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    title: 'AI Intelligence Reports',
    description:
      'Automated market briefs, competitive analysis summaries, and AI-powered opportunity scoring delivered to your team on a customizable schedule.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Compliance Suite',
    description:
      'Regulatory tracking across jurisdictions, ITAR compliance monitoring, and export control alerts to keep your organization ahead of policy changes.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Procurement Intelligence',
    description:
      'SAM.gov integration, SBIR/STTR opportunity tracking, and contract award alerts so your BD team never misses a relevant government opportunity.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    title: 'Dedicated Support',
    description:
      'Named account manager, guaranteed SLA response times, custom onboarding assistance, and priority feature requests for your team.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    gradient: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
];

const DIFFERENTIATORS = [
  {
    title: 'Unlimited Seats',
    description: 'Add your entire team with volume pricing that scales.',
  },
  {
    title: 'Custom Data Feeds',
    description: 'Tailored intelligence feeds matching your exact coverage areas.',
  },
  {
    title: 'SSO & Security',
    description: 'SAML SSO, audit logs, and SOC 2 compliance readiness.',
  },
  {
    title: 'Priority Roadmap',
    description: 'Direct influence on product roadmap and early feature access.',
  },
];

const CUSTOMER_CATEGORIES = [
  {
    label: 'Defense',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: 'Venture Capital',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    label: 'Aerospace',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    label: 'Government',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
];

const FAQ_ITEMS = [
  {
    question: 'What enterprise features are included beyond the Pro plan?',
    answer:
      'Enterprise includes everything in Pro plus: team workspaces with role-based access, full REST API with webhook events, custom data feeds, AI-powered intelligence reports, ITAR compliance monitoring, SAM.gov procurement integration, SAML SSO, audit logs, a dedicated account manager, and SLA guarantees.',
  },
  {
    question: 'How does SpaceNexus handle data security and compliance?',
    answer:
      'SpaceNexus Enterprise is built with security-first architecture. We offer SAML SSO integration, comprehensive audit logging, SOC 2 readiness, data encryption at rest and in transit, role-based access controls, and configurable data retention policies. For ITAR-sensitive workflows, we provide isolated environments with restricted access.',
  },
  {
    question: 'What does the implementation and onboarding process look like?',
    answer:
      'Enterprise onboarding typically takes 2-4 weeks. Your dedicated account manager will guide your team through setup, configure SSO and API integrations, customize dashboards to your workflow, and conduct training sessions. We also provide a sandbox environment for testing before full deployment.',
  },
  {
    question: 'What are the contract terms and minimum commitments?',
    answer:
      'Enterprise plans are available as annual contracts with flexible seat counts. We offer volume discounts for teams of 10 or more. Custom terms, multi-year discounts, and pilot programs are available. Contact our sales team to discuss a plan tailored to your organization.',
  },
];

export default function EnterprisePage() {
  return (
    <>
      <FAQSchema items={FAQ_ITEMS} />

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Enterprise-Grade Intelligence
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Space Intelligence for Your
              <span className="block bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                Entire Organization
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              A unified platform that empowers every team &mdash; from business development to
              engineering &mdash; with real-time space industry data, AI-powered insights, and
              collaborative intelligence tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact?utm_source=enterprise&utm_medium=hero&utm_campaign=demo"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-white to-blue-600 hover:from-slate-300 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-black/20/25 hover:shadow-black/20/40"
              >
                Schedule a Demo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* Enterprise Features Grid */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
              Built for Teams That Move Markets
            </h2>
            <p className="text-slate-400 text-center max-w-xl mx-auto mb-10">
              Every tool your organization needs to stay ahead in the rapidly evolving space economy.
            </p>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {ENTERPRISE_FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <div
                  className={`rounded-2xl border ${feature.borderColor} bg-gradient-to-br ${feature.gradient} p-6 h-full transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
                >
                  <div className={`${feature.iconColor} mb-4`}>{feature.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Comparison Strip */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <div className="max-w-5xl mx-auto bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Why Enterprise over Professional?
              </h2>
              <p className="text-slate-400 text-center mb-8 text-sm">
                Enterprise unlocks collaboration, automation, and compliance capabilities that
                scale with your organization.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {DIFFERENTIATORS.map((diff) => (
                  <div
                    key={diff.title}
                    className="text-center p-4 rounded-xl bg-slate-800/40 border border-slate-700/30"
                  >
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{diff.title}</h3>
                    <p className="text-xs text-slate-400">{diff.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Customer Logos Placeholder */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-white mb-2">
                Trusted by Teams at Leading Space Organizations
              </h2>
              <p className="text-sm text-slate-400">
                Enterprise customers across defense, venture capital, aerospace, and government rely
                on SpaceNexus for mission-critical intelligence.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {CUSTOMER_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl bg-slate-900/50 border border-slate-700/50"
                >
                  <div className="text-slate-400">{cat.icon}</div>
                  <span className="text-sm font-medium text-slate-300">{cat.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Pricing Callout */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-white/5 to-blue-600/10 border border-white/10 rounded-2xl p-8 sm:p-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Starting at{' '}
                <span className="bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                  $49.99/month
                </span>{' '}
                per seat
              </h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Custom pricing available for teams of 10+. Volume discounts, annual billing
                options, and pilot programs to fit your budget.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contact?utm_source=enterprise&utm_medium=pricing&utm_campaign=demo"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-white to-blue-600 hover:from-slate-300 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-black/20/25"
                >
                  Get Custom Pricing
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
                >
                  Compare Plans
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Schedule a Demo CTA */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 sm:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3">Schedule a Demo</h2>
                  <p className="text-slate-400 mb-4">
                    See how SpaceNexus Enterprise can transform your team&apos;s space intelligence
                    workflow. Our team will walk you through features tailored to your
                    organization&apos;s needs.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      30-minute personalized walkthrough
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Custom workspace setup for your team
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      14-day free enterprise trial included
                    </li>
                  </ul>
                </div>
                <div className="shrink-0">
                  <Link
                    href="/contact?utm_source=enterprise&utm_medium=cta&utm_campaign=demo"
                    className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-white to-blue-600 hover:from-slate-300 hover:to-blue-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-black/20/25 hover:shadow-black/20/40"
                  >
                    Book Your Demo
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ROI Calculator */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Calculate Your Return on Investment</h2>
                <p className="text-slate-400 max-w-2xl mx-auto">See how much your organization could save by consolidating space intelligence on SpaceNexus.</p>
              </div>
            </ScrollReveal>
            <ROICalculator />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Frequently Asked Questions
            </h2>
          </ScrollReveal>
          <StaggerContainer className="max-w-3xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item) => (
              <StaggerItem key={item.question}>
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-white mb-2">{item.question}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.answer}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Related Modules */}
        <section className="container mx-auto px-4 pb-16">
          <RelatedModules
            modules={getRelatedModules('enterprise')}
            title="Explore Enterprise Intelligence Modules"
          />
        </section>
      </div>

      <StickyMobileCTA
        label="Schedule a Demo"
        href="/book-demo"
        variant="enterprise"
      />
    </>
  );
}
