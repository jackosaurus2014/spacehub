import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Solutions for Every Space Professional | SpaceNexus',
  description:
    'Discover SpaceNexus solutions tailored for space investors, analysts, engineers, and executives. Data-driven intelligence tools for every role in the space industry.',
  keywords: [
    'space industry solutions',
    'space investor tools',
    'space analyst platform',
    'aerospace engineer tools',
    'space executive intelligence',
    'space industry platform',
  ],
  openGraph: {
    title: 'Solutions for Every Space Professional | SpaceNexus',
    description:
      'Discover SpaceNexus solutions tailored for space investors, analysts, engineers, and executives.',
    url: 'https://spacenexus.us/solutions',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions' },
};

const PERSONAS = [
  {
    slug: 'investors',
    title: 'For Investors',
    description:
      'Make smarter space investments with proprietary SpaceNexus Scores, funding trackers, deal flow tools, and comprehensive due-diligence data across 200+ companies.',
    featureCount: 12,
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-cyan-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    slug: 'analysts',
    title: 'For Analysts',
    description:
      'Access curated market intelligence, industry trend reports, competitive analysis, and exportable data sets that power research for leading space organizations.',
    featureCount: 15,
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    slug: 'engineers',
    title: 'For Engineers',
    description:
      'Mission simulators, orbital calculators, constellation designers, and technical reference tools built by engineers for engineers working on real space missions.',
    featureCount: 18,
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.66-5.66a7.002 7.002 0 019.9-9.9l5.66 5.66a7.002 7.002 0 01-9.9 9.9zM8.75 4.75L4.75 8.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L16.5 20.25" />
      </svg>
    ),
    gradient: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    slug: 'executives',
    title: 'For Executives',
    description:
      'Strategic dashboards, competitive landscapes, market sizing, and executive briefings that give C-suite leaders the intelligence edge in the rapidly evolving space sector.',
    featureCount: 10,
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
];

export default function SolutionsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Solutions' },
        ]}
      />

      <div className="min-h-screen">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <ScrollReveal>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 font-[family-name:var(--font-orbitron)]">
              Solutions for Every Space Professional
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Whether you&apos;re investing, researching, building, or leading &mdash; SpaceNexus
              delivers the intelligence tools your role demands.
            </p>
          </ScrollReveal>
        </section>

        {/* Persona Cards */}
        <section className="container mx-auto px-4 pb-16">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {PERSONAS.map((persona) => (
              <StaggerItem key={persona.slug}>
                <Link
                  href={`/solutions/${persona.slug}`}
                  className={`group block rounded-2xl border ${persona.borderColor} bg-gradient-to-br ${persona.gradient} p-6 sm:p-8 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30`}
                >
                  <div className={`${persona.iconColor} mb-4`}>{persona.icon}</div>
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {persona.title}
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    {persona.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full">
                      {persona.featureCount} features
                    </span>
                    <span className="text-sm text-cyan-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Learn More
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 pb-20">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 sm:p-12">
              <h2 className="text-2xl font-bold text-white mb-3">
                Not sure which plan is right for you?
              </h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Compare features across all plans or contact our team for a personalized
                recommendation based on your organization&apos;s needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
                >
                  View Pricing
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Related Modules */}
        <section className="container mx-auto px-4 pb-16">
          <RelatedModules modules={getRelatedModules('solutions')} title="Explore SpaceNexus Modules" />
        </section>
      </div>
    </>
  );
}
