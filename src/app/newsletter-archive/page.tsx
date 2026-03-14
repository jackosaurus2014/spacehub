import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

const BRIEF_SECTIONS = [
  { title: 'Executive Summary', description: 'Top-line bullet points on the week\'s most significant developments', free: true },
  { title: 'Top Stories', description: '5 most important stories with context and analysis', free: true },
  { title: 'Contract Awards', description: 'Government and commercial contract wins, partnerships', free: false },
  { title: 'Launch Activity', description: 'Completed launches, mission milestones, and upcoming launches', free: true },
  { title: 'Funding & M&A', description: 'Investment rounds, acquisitions, IPO activity, SPAC news', free: false },
  { title: 'Regulatory Updates', description: 'FCC, FAA, ITU decisions, spectrum, licensing changes', free: false },
  { title: 'Market Movers', description: 'Earnings, strategy shifts, executive moves, stock movements', free: false },
  { title: 'Week Ahead', description: 'Key upcoming events, deadlines, launches, and hearings', free: true },
];

const PAST_BRIEFS = [
  {
    id: 'feb-17-2026',
    weekOf: 'February 17, 2026',
    dateRange: 'Feb 17 - Feb 23',
    topStory: 'Starship Achieves Rapid Reusability Milestone',
    highlights: ['SpaceX 48-hour booster turnaround', 'Impulse Space $175M Series C', 'FCC Ka-Band allocation'],
  },
  {
    id: 'feb-10-2026',
    weekOf: 'February 10, 2026',
    dateRange: 'Feb 10 - Feb 16',
    topStory: 'Artemis II Crew Completes Final Training Milestone',
    highlights: ['Relativity Space $200M round', 'Ariane 6 commercial debut', 'EU Space Traffic Management proposal'],
  },
  {
    id: 'feb-03-2026',
    weekOf: 'February 3, 2026',
    dateRange: 'Feb 3 - Feb 9',
    topStory: 'Amazon Launches First Kuiper Production Satellites',
    highlights: ['60 Kuiper satellites deployed', 'ClearSpace $30M for debris removal', 'ITAR reform bill introduced'],
  },
];

export default function NewsletterArchivePage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AnimatedPageHeader
          title="Weekly Intelligence Brief Archive"
          subtitle="Every edition of the SpaceNexus Weekly Intelligence Brief. Curated space industry analysis delivered to 2,000+ professionals every Monday."
          accentColor="purple"
        />

        {/* Subscribe CTA */}
        <ScrollReveal delay={0.1}>
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/10 rounded-xl p-6 mb-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Get the brief in your inbox every Monday</h2>
                <p className="text-sm text-slate-400">
                  Join 2,000+ space industry executives, investors, and engineers. Free weekly delivery with Pro sections for subscribers.
                </p>
              </div>
              <Link
                href="/news"
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Subscribe Free
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* What You Get */}
        <ScrollReveal delay={0.15}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              What Every Brief Covers
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-3xl">
              Each weekly brief is generated using AI analysis of 50+ news feeds, company events, and market data
              from the SpaceNexus platform. It is reviewed and refined to deliver actionable intelligence
              across 8 sections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRIEF_SECTIONS.map((section) => (
                <div
                  key={section.title}
                  className="card p-4 flex items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white">{section.title}</h3>
                      {!section.free && (
                        <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Latest Brief Link */}
        <ScrollReveal delay={0.2}>
          <section className="mb-12">
            <div className="card p-6 border-l-4 border-cyan-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Latest Edition</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Read the most recent intelligence brief with full section breakdowns, expandable details, and key takeaways.
              </p>
              <Link
                href="/intelligence-brief"
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-cyan-400 transition-colors"
              >
                Read the latest brief
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </section>
        </ScrollReveal>

        {/* Past Briefs */}
        <ScrollReveal delay={0.25}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Past Editions
            </h2>
            <div className="space-y-4">
              {PAST_BRIEFS.map((brief, index) => (
                <Link
                  key={brief.id}
                  href="/intelligence-brief"
                  className="group block card p-5 hover:border-white/10 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-white/90 transition-colors">
                          Week of {brief.weekOf}
                        </h3>
                        <span className="text-xs text-slate-500">{brief.dateRange}</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        Top Story: {brief.topStory}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {brief.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="text-[10px] text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors whitespace-nowrap">
                      Read &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Free vs Pro */}
        <ScrollReveal delay={0.3}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Free vs. Pro Briefs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Free Tier</div>
                <h3 className="text-lg font-bold text-white mb-3">4 Sections Every Week</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  {['Executive Summary', 'Top Stories', 'Launch Activity', 'Week Ahead'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <div className="text-2xl font-bold text-emerald-400">Free</div>
                  <p className="text-xs text-slate-500 mt-1">No credit card required</p>
                </div>
              </div>
              <div className="card p-6 ring-2 ring-purple-500/20">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">Pro Tier</div>
                <h3 className="text-lg font-bold text-white mb-3">All 8 Sections + Deep Dives</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  {[
                    'Everything in Free',
                    'Contract Awards intelligence',
                    'Funding & M&A tracking',
                    'Regulatory Updates',
                    'Market Movers analysis',
                    'Priority delivery',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <div className="text-2xl font-bold text-purple-400">
                    $19.99<span className="text-sm text-slate-400 font-normal">/mo</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Included with SpaceNexus Pro</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Bottom CTA */}
        <ScrollReveal delay={0.35}>
          <section className="mb-10">
            <div className="card p-10 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Stay ahead of the space industry every week
              </h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm">
                The SpaceNexus Weekly Intelligence Brief is trusted by 2,000+ space professionals.
                Subscribe free and never miss a critical development.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/news" className="btn-primary text-sm py-3 px-6">
                  Subscribe Free
                </Link>
                <Link href="/intelligence-brief" className="btn-secondary text-sm py-3 px-6">
                  Read Latest Brief
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
