import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

const CASE_STUDIES = [
  {
    slug: 'orbital-ventures-deal-flow',
    company: 'Orbital Ventures',
    companyType: 'Venture Capital Fund',
    title: 'Venture Capital Fund Accelerates Deal Flow',
    challenge:
      'Spending 40+ hours per week manually tracking space industry deals across fragmented data sources, pitch decks, and industry reports.',
    solution:
      'Used SpaceNexus funding tracker, company profiles, and deal alerts to create a unified view of the space investment landscape.',
    results: [
      { metric: '60%', label: 'Reduction in research time' },
      { metric: '3x', label: 'Increase in deal pipeline' },
      { metric: '$2M', label: 'In identified opportunities' },
    ],
    quote:
      'SpaceNexus replaced four different tools and gave us a unified view of the space market.',
    author: 'Sarah Chen',
    authorTitle: 'Managing Partner',
    gradient: 'from-white to-blue-500',
    accentClass: 'text-slate-300',
    badgeClass: 'bg-white/5 text-white/90 border-white/10',
  },
  {
    slug: 'astral-defense-compliance',
    company: 'Astral Defense Systems',
    companyType: 'Defense Contractor',
    title: 'Defense Contractor Streamlines Compliance',
    challenge:
      'Managing ITAR compliance across 200+ supplier relationships with manual processes that were slow, error-prone, and resource-intensive.',
    solution:
      'Used SpaceNexus compliance suite, regulatory calendar, and procurement intelligence to automate compliance workflows.',
    results: [
      { metric: '45%', label: 'Faster compliance reviews' },
      { metric: 'Zero', label: 'Violations in 18 months' },
      { metric: '$500K', label: 'Saved on compliance staffing' },
    ],
    quote:
      'The regulatory intelligence alone pays for SpaceNexus ten times over.',
    author: 'Col. James Rivera (Ret.)',
    authorTitle: 'VP Compliance',
    gradient: 'from-purple-500 to-indigo-500',
    accentClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  {
    slug: 'nova-propulsion-government-contracts',
    company: 'Nova Propulsion',
    companyType: 'Aerospace Startup',
    title: 'Aerospace Startup Wins Government Contracts',
    challenge:
      'Small team that couldn&apos;t track SAM.gov opportunities fast enough to compete with larger, better-resourced competitors.',
    solution:
      'Used SpaceNexus contract awards, procurement intelligence, and market sizing to identify and pursue the right government opportunities.',
    results: [
      { metric: '3 SBIRs', label: 'Contracts worth $1.2M' },
      { metric: '80%', label: 'Faster proposal research' },
      { metric: '15', label: 'Prime contractors identified' },
    ],
    quote:
      'We\'re competing with companies 100x our size and winning, thanks to SpaceNexus intelligence.',
    author: 'Dr. Maria Santos',
    authorTitle: 'CEO',
    gradient: 'from-emerald-500 to-teal-500',
    accentClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
];

const HERO_STATS = [
  { value: '60%', label: 'Average Research Time Saved' },
  { value: '$3.7M', label: 'Value Identified' },
  { value: 'Zero', label: 'Compliance Violations' },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen pb-16">

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-emerald-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/5 text-white/90 border border-white/10 mb-6">
                Case Studies
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Success Stories from the{' '}
                <span className="bg-gradient-to-r from-slate-300 to-emerald-400 bg-clip-text text-transparent">
                  Space Industry
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
                Real results from organizations using SpaceNexus to accelerate research, improve deal flow, and gain competitive intelligence.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 text-center"
                >
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-emerald-400 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Case Study Cards */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <StaggerContainer className="space-y-12 max-w-4xl mx-auto">
            {CASE_STUDIES.map((cs) => (
              <StaggerItem key={cs.slug}>
                <article className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm overflow-hidden content-auto">
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-white/[0.06]">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${cs.gradient} flex items-center justify-center text-white font-bold text-lg shrink-0`}
                      >
                        {cs.company
                          .split(' ')
                          .map((w) => w[0])
                          .join('')}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{cs.title}</h2>
                        <p className="text-slate-300 text-sm">{cs.company}</p>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cs.badgeClass}`}
                        >
                          {cs.companyType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    {/* Challenge */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        The Challenge
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{cs.challenge}</p>
                    </div>

                    {/* Solution */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        The Solution
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{cs.solution}</p>
                    </div>

                    {/* Results */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Key Results
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {cs.results.map((r) => (
                          <div
                            key={r.label}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 text-center"
                          >
                            <p className={`text-2xl font-bold ${cs.accentClass}`}>{r.metric}</p>
                            <p className="text-slate-400 text-xs mt-1">{r.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quote */}
                    <blockquote className="rounded-xl bg-gradient-to-r from-white/5 to-blue-500/5 border border-white/15 p-4">
                      <p className="text-white/90 text-sm italic leading-relaxed">
                        &ldquo;{cs.quote}&rdquo;
                      </p>
                      <cite className="text-slate-500 text-xs mt-2 block not-italic">
                        &mdash; {cs.author}, {cs.authorTitle} at {cs.company}
                      </cite>
                    </blockquote>

                    {/* CTA */}
                    <div className="pt-2">
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        Read Full Case Study
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 content-auto">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Join organizations across the space industry that rely on SpaceNexus for intelligence, compliance, and strategic decision-making.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-white to-blue-600 text-white font-semibold hover:from-slate-300 hover:to-blue-500 transition-all shadow-lg shadow-black/15 hover:shadow-black/20"
                >
                  View Pricing
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/book-demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.04] transition-colors"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Related Modules */}
      <section className="container mx-auto px-4 pb-16">
        <RelatedModules modules={getRelatedModules('case-studies')} />
      </section>
    </div>
  );
}
