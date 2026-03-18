import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

// Case studies will be added as real users share their stories.
// Submit your story at /contact ("Share Your SpaceNexus Story" section).

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
                We&apos;re building case studies with real SpaceNexus users. Want to be featured? Share your story below.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Coming Soon / Share Your Story */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <ScrollReveal>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-8 md:p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Case Studies Coming Soon
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                  We&apos;re collecting real success stories from space professionals using SpaceNexus. Are you using SpaceNexus for your work? We&apos;d love to feature your experience.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg"
                  >
                    Share Your Story
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.04] transition-colors"
                  >
                    Try SpaceNexus Free
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* What We're Looking For */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold text-white mb-6 text-center">
                We&apos;re looking for stories from:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { role: 'Investors & VCs', desc: 'Using market intel for space deals' },
                  { role: 'Aerospace Engineers', desc: 'Using tools and calculators' },
                  { role: 'Defense Contractors', desc: 'Tracking compliance & contracts' },
                  { role: 'Startup Founders', desc: 'Competitive intelligence' },
                  { role: 'Policy Analysts', desc: 'Regulatory monitoring' },
                  { role: 'Space Enthusiasts', desc: 'Tracking launches & satellites' },
                ].map((item) => (
                  <div
                    key={item.role}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                  >
                    <p className="text-sm font-semibold text-white mb-1">{item.role}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                ))}
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
