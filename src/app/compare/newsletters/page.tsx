import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const newsletters = [
  {
    name: 'SpaceNexus Weekly Brief',
    frequency: 'Weekly',
    contentFocus: 'Data-driven analysis, market intelligence, launch tracking, satellite data, company profiles, and original long-form articles.',
    price: 'Free',
    audience: 'Space professionals, investors, engineers, analysts, defense contractors, and enthusiasts who want actionable intelligence — not just headlines.',
    strengths: [
      'Backed by a full intelligence platform with 10+ interactive modules',
      '133+ original articles covering technology, markets, policy, and careers',
      'Integrated satellite tracker, launch manifest, and market data tools',
      'Every issue includes links to platform tools, not just news summaries',
      'Free forever — no paywall on core content',
    ],
    highlight: true,
    url: '/newsletter',
  },
  {
    name: 'Payload Space',
    frequency: 'Daily (weekdays)',
    contentFocus: 'Curated space industry news with concise summaries. Covers launches, funding rounds, policy, and business developments in a scannable format.',
    price: 'Free (sponsored)',
    audience: 'Space industry professionals, executives, and investors who want a quick daily briefing on what happened in the space economy.',
    strengths: [
      'Excellent daily cadence — reliable morning briefing',
      'Clean, well-written summaries',
      'Good coverage of funding rounds and business news',
      'Strong brand presence in the space media ecosystem',
    ],
    highlight: false,
    url: null,
  },
  {
    name: 'Orbital Index',
    frequency: 'Weekly (ceased publication in 2024)',
    contentFocus: 'Technical deep dives, curated links, and commentary on space missions, science, and engineering. Known for its thoughtful, engineer-friendly perspective.',
    price: 'Free (was donation-supported)',
    audience: 'Engineers, scientists, and technically-minded space enthusiasts who appreciated depth over breadth.',
    strengths: [
      'Highly technical content with real engineering insight',
      'Excellent curation of obscure but important stories',
      'Community-driven and independent',
      'Archived issues remain a valuable reference',
    ],
    highlight: false,
    url: null,
    note: 'Ceased publication in 2024. Archives remain available.',
  },
  {
    name: 'T-Minus Daily Space',
    frequency: 'Daily (weekdays)',
    contentFocus: 'Daily space news briefing combining audio (podcast) and written formats. Covers launches, missions, policy, and commercial space with a broad lens.',
    price: 'Free',
    audience: 'General space enthusiasts and professionals who prefer audio-first content with written supplements.',
    strengths: [
      'Dual-format delivery — podcast and newsletter',
      'Consistent daily coverage',
      'Accessible to non-technical audiences',
      'Part of the N2K media network with cybersecurity crossover',
    ],
    highlight: false,
    url: null,
  },
  {
    name: 'Space Explored',
    frequency: '2-3 times per week',
    contentFocus: 'Space news with an emphasis on NASA, SpaceX, and consumer-facing space topics. Strong visual content and launch coverage.',
    price: 'Free',
    audience: 'Space enthusiasts, educators, and consumers interested in spaceflight news, particularly NASA and SpaceX missions.',
    strengths: [
      'Excellent launch photography and visual coverage',
      'Strong SpaceX and NASA reporting',
      'Accessible writing style for broad audiences',
      'Active social media presence amplifies newsletter content',
    ],
    highlight: false,
    url: null,
  },
];

const comparisonRows = [
  { label: 'Frequency', key: 'frequency' },
  { label: 'Price', key: 'price' },
  { label: 'Audience', key: 'audienceShort' },
  { label: 'Platform Tools', key: 'platformTools' },
  { label: 'Original Articles', key: 'originalArticles' },
  { label: 'Market Data', key: 'marketData' },
  { label: 'Satellite Tracking', key: 'satelliteTracking' },
];

const comparisonData: Record<string, Record<string, string>> = {
  'SpaceNexus Weekly Brief': {
    frequency: 'Weekly',
    price: 'Free',
    audienceShort: 'Professionals & investors',
    platformTools: '10+ interactive modules',
    originalArticles: '133+ and growing',
    marketData: 'Stocks, ETFs, funding tracker',
    satelliteTracking: 'Real-time tracker included',
  },
  'Payload Space': {
    frequency: 'Daily (weekdays)',
    price: 'Free (sponsored)',
    audienceShort: 'Executives & investors',
    platformTools: 'None',
    originalArticles: 'News summaries only',
    marketData: 'Funding coverage in newsletter',
    satelliteTracking: 'No',
  },
  'Orbital Index': {
    frequency: 'Weekly (ceased)',
    price: 'Was free',
    audienceShort: 'Engineers & scientists',
    platformTools: 'None',
    originalArticles: 'Curated links + commentary',
    marketData: 'Minimal',
    satelliteTracking: 'No',
  },
  'T-Minus Daily Space': {
    frequency: 'Daily (weekdays)',
    price: 'Free',
    audienceShort: 'General space audience',
    platformTools: 'Podcast platform',
    originalArticles: 'Audio-first briefings',
    marketData: 'Occasional',
    satelliteTracking: 'No',
  },
  'Space Explored': {
    frequency: '2-3x per week',
    price: 'Free',
    audienceShort: 'Enthusiasts & educators',
    platformTools: 'None',
    originalArticles: 'News articles',
    marketData: 'Minimal',
    satelliteTracking: 'No',
  },
};

export default function NewsletterComparisonPage() {
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="pt-8 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-slate-400 mb-5">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Newsletter Comparison
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Space Industry Newsletters Compared
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            The space industry has several excellent newsletters. Here is how they stack up on frequency, content depth, pricing, and the tools they offer beyond the inbox.
          </p>
        </div>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Side-by-Side Comparison
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium w-40">Feature</th>
                  {Object.keys(comparisonData).map((name) => (
                    <th
                      key={name}
                      className={`text-left py-3 px-4 font-semibold ${
                        name === 'SpaceNexus Weekly Brief' ? 'text-cyan-300' : 'text-white/80'
                      }`}
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.key} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium">{row.label}</td>
                    {Object.entries(comparisonData).map(([name, data]) => (
                      <td
                        key={name}
                        className={`py-3 px-4 ${
                          name === 'SpaceNexus Weekly Brief'
                            ? 'text-white/90 bg-cyan-500/[0.04]'
                            : 'text-slate-400'
                        }`}
                      >
                        {data[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Newsletter Cards */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Detailed Profiles
          </h2>
          <div className="space-y-6">
            {newsletters.map((nl) => (
              <div
                key={nl.name}
                className={`rounded-xl border p-6 ${
                  nl.highlight
                    ? 'bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.04] border-cyan-500/20'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-bold ${nl.highlight ? 'text-cyan-300' : 'text-white'}`}>
                        {nl.name}
                      </h3>
                      {nl.highlight && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                          Our Pick
                        </span>
                      )}
                      {nl.note && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15">
                          {nl.note}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      <span>{nl.frequency}</span>
                      <span>{nl.price}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Content Focus
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {nl.contentFocus}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Target Audience
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {nl.audience}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Key Strengths
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {nl.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${nl.highlight ? 'text-cyan-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>

        <RelatedModules modules={PAGE_RELATIONS['compare/newsletters']} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why SpaceNexus Stands Out */}
        <section className="mb-16">
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.06] to-transparent p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Why SpaceNexus Stands Out
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6 max-w-3xl">
              Most space newsletters deliver news. SpaceNexus delivers intelligence. The difference is that every issue connects to a platform with real data, interactive tools, and original analysis you cannot find anywhere else.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-300 mb-1">133+</div>
                <div className="text-xs text-slate-400">Original articles covering every corner of the space economy</div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-300 mb-1">10+</div>
                <div className="text-xs text-slate-400">Interactive modules: satellite tracker, market data, launch manifest, and more</div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-300 mb-1">100%</div>
                <div className="text-xs text-slate-400">Free core content — no paywall on articles or newsletter</div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Data + Analysis + Tools</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Other newsletters link to third-party sources. SpaceNexus links to its own satellite tracker, market dashboards, company profiles, and launch data — all built in-house.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Deep Content Library</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    With 133+ original long-form articles across 6 categories — technology, guides, analysis, market, policy, and building-in-public — SpaceNexus has the deepest free content library in space media.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Not Just News — Intelligence</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    SpaceNexus is not a media company. It is a space intelligence platform that publishes a newsletter. The difference matters: every piece of content is designed to help you make better decisions, not just stay informed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-10 border-t border-white/[0.06]">
          <h2 className="text-xl font-bold text-white mb-3">
            Get the SpaceNexus Weekly Brief
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-xl mx-auto">
            Join thousands of space professionals who start their week with data-driven intelligence. Free forever.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-slate-900 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Subscribe Free
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] border border-white/[0.08] text-white rounded-lg text-sm font-medium hover:bg-white/[0.1] transition-colors"
            >
              Back to Comparisons
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
