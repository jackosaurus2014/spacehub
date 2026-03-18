import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SocialShare from '@/components/ui/SocialShare';

const COMPARISON_FEATURES = [
  {
    feature: 'Real-time data feeds',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: 'Partial',
    spacenexusNote: '50+ live data sources',
    quiltyNote: 'Periodic reports only',
    spacenewsNote: 'News articles only',
    freeToolsNote: 'Scattered across sites',
  },
  {
    feature: 'Company profiles',
    spacenexus: true,
    quilty: 'Partial',
    spacenews: false,
    freeTools: false,
    spacenexusNote: '200+ interactive profiles',
    quiltyNote: 'Select companies in reports',
    spacenewsNote: 'News coverage only',
    freeToolsNote: 'Not available',
  },
  {
    feature: 'Satellite tracking',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: 'Partial',
    spacenexusNote: '19,000+ objects, 3D globe',
    quiltyNote: 'Not available',
    spacenewsNote: 'Not available',
    freeToolsNote: 'N2YO, Heavens-Above (basic)',
  },
  {
    feature: 'Market intelligence',
    spacenexus: true,
    quilty: true,
    spacenews: false,
    freeTools: false,
    spacenexusNote: 'Live dashboards & stock tracking',
    quiltyNote: 'Deep analyst reports',
    spacenewsNote: 'Limited coverage',
    freeToolsNote: 'Not available',
  },
  {
    feature: 'Regulatory compliance',
    spacenexus: true,
    quilty: 'Partial',
    spacenews: 'Partial',
    freeTools: false,
    spacenexusNote: 'FCC, ITU, FAA, spectrum tracking',
    quiltyNote: 'Policy analysis in reports',
    spacenewsNote: 'News coverage of regulations',
    freeToolsNote: 'Manual FCC/FAA searches',
  },
  {
    feature: 'API access',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: 'Partial',
    spacenexusNote: 'RESTful API (Enterprise)',
    quiltyNote: 'Not available',
    spacenewsNote: 'Not available',
    freeToolsNote: 'Some APIs exist (limited)',
  },
  {
    feature: 'Custom alerts',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: false,
    spacenexusNote: 'Launch, weather, market alerts',
    quiltyNote: 'Not available',
    spacenewsNote: 'Email newsletter only',
    freeToolsNote: 'Not available',
  },
  {
    feature: 'Launch monitoring',
    spacenexus: true,
    quilty: false,
    spacenews: 'Partial',
    freeTools: 'Partial',
    spacenexusNote: 'Live dashboard with countdowns',
    quiltyNote: 'Launch market forecasts',
    spacenewsNote: 'News coverage of launches',
    freeToolsNote: 'NextSpaceflight, RocketLaunch.Live',
  },
  {
    feature: 'Space weather',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: true,
    spacenexusNote: 'Integrated NOAA data',
    quiltyNote: 'Not available',
    spacenewsNote: 'Not available',
    freeToolsNote: 'SpaceWeatherLive (standalone)',
  },
  {
    feature: 'Procurement intel',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: 'Partial',
    spacenexusNote: 'SAM.gov, SBIR/STTR tracking',
    quiltyNote: 'Not available',
    spacenewsNote: 'Not available',
    freeToolsNote: 'Manual SAM.gov search',
  },
  {
    feature: 'AI-powered analysis',
    spacenexus: true,
    quilty: false,
    spacenews: false,
    freeTools: false,
    spacenexusNote: 'AI copilot for questions',
    quiltyNote: 'Human analyst insights',
    spacenewsNote: 'Not available',
    freeToolsNote: 'Not available',
  },
  {
    feature: 'Weekly intel brief',
    spacenexus: true,
    quilty: false,
    spacenews: true,
    freeTools: false,
    spacenexusNote: '8-section AI-curated brief',
    quiltyNote: 'Periodic reports',
    spacenewsNote: 'Daily newsletter',
    freeToolsNote: 'Not available',
  },
];

function FeatureCell({ value, note }: { value: boolean | string; note: string }) {
  if (value === true) {
    return (
      <td className="py-3 px-3 text-sm">
        <div className="flex items-start gap-1.5">
          <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5">&#10003;</span>
          <span className="text-slate-400 text-xs">{note}</span>
        </div>
      </td>
    );
  }
  if (value === 'Partial') {
    return (
      <td className="py-3 px-3 text-sm">
        <div className="flex items-start gap-1.5">
          <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">~</span>
          <span className="text-slate-500 text-xs">{note}</span>
        </div>
      </td>
    );
  }
  return (
    <td className="py-3 px-3 text-sm">
      <div className="flex items-start gap-1.5">
        <span className="text-slate-600 font-bold flex-shrink-0 mt-0.5">&#10007;</span>
        <span className="text-slate-600 text-xs">{note}</span>
      </div>
    </td>
  );
}

export default function WhySpaceNexusPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}
        <nav className="pt-2 mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-slate-400">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li>/</li>
            <li className="text-white/70">Why SpaceNexus</li>
          </ol>
        </nav>

        <AnimatedPageHeader
          title="Why SpaceNexus?"
          subtitle="The space industry is fragmented across dozens of tools, expensive reports, and niche newsletters. SpaceNexus brings it all together in one platform."
          accentColor="cyan"
        />

        {/* The Problem */}
        <ScrollReveal delay={0.1}>
          <section className="mb-12 mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              The Problem With Today&rsquo;s Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Option 1</div>
                <h3 className="text-lg font-bold text-white mb-2">SpaceNews Subscription</h3>
                <div className="text-2xl font-bold text-white mb-3">
                  $250<span className="text-sm text-slate-400 font-normal">/yr</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>Quality space industry journalism</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>Daily newsletter delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>No data, dashboards, or tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>No satellite tracking or market data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Just news &mdash; no actionable intelligence</span>
                  </li>
                </ul>
              </div>

              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Option 2</div>
                <h3 className="text-lg font-bold text-white mb-2">Quilty Space Analytics</h3>
                <div className="text-2xl font-bold text-white mb-3">
                  $5K&ndash;50K<span className="text-sm text-slate-400 font-normal">/yr</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>Deep analyst-written reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>Boardroom-ready research</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Reports are periodic, not real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>No interactive platform or API</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Cost prohibitive for most teams</span>
                  </li>
                </ul>
              </div>

              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Option 3</div>
                <h3 className="text-lg font-bold text-white mb-2">5+ Free Tools</h3>
                <div className="text-2xl font-bold text-white mb-3">
                  $0<span className="text-sm text-slate-400 font-normal"> (your time)</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>No subscription cost</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Data scattered across 5+ websites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>No unified view or cross-referencing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Hours wasted tab-switching daily</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                    <span>Missing critical connections between data</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* The Solution */}
        <ScrollReveal delay={0.15}>
          <section className="mb-12">
            <div className="card p-8 ring-2 ring-cyan-500/15">
              <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">The Solution</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                SpaceNexus: Everything in One Platform
              </h2>
              <div className="text-2xl font-bold text-cyan-400 mb-4">
                $19.99<span className="text-sm text-slate-400 font-normal">/mo</span>
                <span className="text-sm text-slate-500 font-normal ml-2">(Free tier available)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: '10+ Integrated Modules', desc: 'Launches, satellites, companies, market intel, compliance, and more in one platform.' },
                  { title: 'Real-Time Data', desc: '50+ live feeds from NASA, NOAA, SAM.gov, FCC, and commercial sources. Updated continuously.' },
                  { title: '200+ Company Profiles', desc: 'Interactive profiles with financials, satellite assets, competitive positioning, and news.' },
                  { title: '19,000+ Tracked Objects', desc: '3D satellite globe with orbital data, conjunction warnings, and constellation tracking.' },
                  { title: 'AI Copilot', desc: 'Ask questions in natural language. Get instant analysis from your space industry data.' },
                  { title: 'Weekly Intelligence Brief', desc: '8-section curated brief delivered to your inbox every Monday. Trusted by 2,000+ pros.' },
                ].map((item) => (
                  <div key={item.title} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Comparison Table */}
        <ScrollReveal delay={0.2}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Feature-by-Feature Comparison
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="py-4 px-3 text-left text-white/70 font-semibold min-w-[140px]">Feature</th>
                    <th className="py-4 px-3 text-left font-semibold min-w-[160px]">
                      <div className="text-cyan-400">SpaceNexus</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">$19.99/mo</div>
                    </th>
                    <th className="py-4 px-3 text-left text-white/70 font-semibold min-w-[160px]">
                      <div>Quilty Space</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">$10K+/yr</div>
                    </th>
                    <th className="py-4 px-3 text-left text-white/70 font-semibold min-w-[160px]">
                      <div>SpaceNews</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">$250/yr</div>
                    </th>
                    <th className="py-4 px-3 text-left text-white/70 font-semibold min-w-[160px]">
                      <div>Free Tools</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">$0</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row) => (
                    <tr key={row.feature} className="border-b border-white/[0.04]">
                      <td className="py-3 px-3 text-white/70 font-medium text-sm">{row.feature}</td>
                      <FeatureCell value={row.spacenexus} note={row.spacenexusNote} />
                      <FeatureCell value={row.quilty} note={row.quiltyNote} />
                      <FeatureCell value={row.spacenews} note={row.spacenewsNote} />
                      <FeatureCell value={row.freeTools} note={row.freeToolsNote} />
                    </tr>
                  ))}
                  {/* Price row */}
                  <tr className="border-t-2 border-white/[0.08]">
                    <td className="py-4 px-3 text-white font-bold">Annual Cost</td>
                    <td className="py-4 px-3">
                      <span className="text-lg font-bold text-cyan-400">$240</span>
                      <span className="text-xs text-slate-500 ml-1">/yr</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-lg font-bold text-white">$10,000+</span>
                      <span className="text-xs text-slate-500 ml-1">/yr</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-lg font-bold text-white">$250</span>
                      <span className="text-xs text-slate-500 ml-1">/yr</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-lg font-bold text-white">$0</span>
                      <span className="text-xs text-slate-500 ml-1">+ your time</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </ScrollReveal>

        {/* Who It's For */}
        <ScrollReveal delay={0.25}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Built for Space Professionals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  role: 'Executives & Strategists',
                  desc: 'Market intelligence, competitive landscape, and weekly briefs for strategic decision-making.',
                },
                {
                  role: 'Engineers & Operators',
                  desc: 'Satellite tracking, launch schedules, space weather, and orbital data for day-to-day operations.',
                },
                {
                  role: 'Investors & Analysts',
                  desc: 'Company profiles, funding data, stock tracking, and M&A intelligence for due diligence.',
                },
                {
                  role: 'BD & Government Teams',
                  desc: 'SAM.gov procurement tracking, SBIR/STTR opportunities, and regulatory compliance monitoring.',
                },
              ].map((persona) => (
                <div key={persona.role} className="card p-5">
                  <h3 className="text-sm font-bold text-white mb-2">{persona.role}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{persona.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ROI Calculator Section */}
        <ScrollReveal delay={0.3}>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              The Math is Simple
            </h2>
            <div className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-red-400 mb-2">5+ hours/week</div>
                  <p className="text-sm text-slate-400">
                    Time spent switching between free tools, searching SAM.gov, checking launch schedules, and reading multiple newsletters
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-400 mb-2">30 min/week</div>
                  <p className="text-sm text-slate-400">
                    Check your SpaceNexus dashboard, read the intelligence brief, review alerts. Everything in one place.
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
                <p className="text-sm text-slate-400">
                  At an average aerospace professional rate of $75/hr, consolidating 5+ tools into SpaceNexus saves
                  <span className="text-white font-bold"> $1,500+/month</span> in time &mdash;
                  for a platform that costs <span className="text-cyan-400 font-bold">$19.99/month</span>.
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal delay={0.35}>
          <section className="mb-10">
            <div className="card p-10 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Ready to consolidate your space intelligence?
              </h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm">
                Join 10,000+ space professionals who use SpaceNexus for launches, satellites, companies,
                market data, procurement, and more &mdash; all in one platform.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/register" className="btn-primary text-sm py-3 px-6">
                  Start Free Today
                </Link>
                <Link href="/pricing" className="btn-secondary text-sm py-3 px-6">
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Share This Page */}
        <ScrollReveal delay={0.4}>
          <div className="flex justify-center mb-8">
            <div className="card px-6 py-3 inline-flex items-center gap-3">
              <span className="text-sm text-slate-400">Found this helpful?</span>
              <SocialShare
                title="Why SpaceNexus? — Compare Space Industry Intelligence Platforms"
                url="https://spacenexus.us/why-spacenexus"
                description="Compare SpaceNexus vs Quilty Space vs SpaceNews vs free tools for space industry intelligence."
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Back Links */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <Link href="/compare" className="text-white/70 hover:text-white transition-colors">
            Detailed comparisons &rarr;
          </Link>
          <Link href="/features" className="text-white/70 hover:text-white transition-colors">
            All features &rarr;
          </Link>
          <Link href="/pricing" className="text-white/70 hover:text-white transition-colors">
            Pricing &rarr;
          </Link>
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Why SpaceNexus?',
            description:
              'Compare SpaceNexus vs Quilty Space vs SpaceNews vs free tools for space industry intelligence.',
            url: 'https://spacenexus.us/why-spacenexus',
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
