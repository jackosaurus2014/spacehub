import Link from 'next/link';

const categories = [
  {
    name: 'Technology',
    slug: 'technology',
    count: 30,
    description:
      'Deep dives into rockets, satellites, propulsion systems, space stations, and the hardware powering the next era of spaceflight.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 2.58m0 0a14.926 14.926 0 01-5.84-2.58m5.84 2.58v4.8" />
      </svg>
    ),
    gradient: 'from-blue-500/10 to-cyan-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/15 text-blue-300',
  },
  {
    name: 'Guides',
    slug: 'guide',
    count: 28,
    description:
      'Step-by-step guides for space professionals. Satellite tracking, career paths, procurement, ITAR compliance, and platform walkthroughs.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    gradient: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300',
  },
  {
    name: 'Analysis',
    slug: 'analysis',
    count: 22,
    description:
      'Original analysis of industry trends, company strategies, mission outcomes, and the forces shaping the space economy.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-indigo-500/10 to-violet-500/5',
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
    accent: 'text-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300',
  },
  {
    name: 'Market',
    slug: 'market',
    count: 14,
    description:
      'Market intelligence on space stocks, ETFs, funding rounds, IPO analysis, and investment opportunities across the space economy.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    gradient: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300',
  },
  {
    name: 'Policy',
    slug: 'policy',
    count: 4,
    description:
      'Space law, export controls, regulatory frameworks, and the policy decisions shaping commercial and government space programs.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    gradient: 'from-purple-500/10 to-pink-500/5',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    accent: 'text-purple-400',
    badge: 'bg-purple-500/15 text-purple-300',
  },
];

const popularTopics = [
  {
    name: 'SpaceX',
    description: 'Starship, Falcon 9, Starlink, reusability milestones, and Elon Musk\'s vision for Mars.',
    keywords: ['SpaceX', 'Starship', 'Falcon 9', 'Starlink'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 2.58m0 0a14.926 14.926 0 01-5.84-2.58m5.84 2.58v4.8" />
      </svg>
    ),
    searchQuery: 'spacex',
  },
  {
    name: 'Satellites',
    description: 'Tracking, constellations, CubeSats, Earth observation, and satellite internet.',
    keywords: ['Satellite tracking', 'Constellations', 'CubeSats'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
    searchQuery: 'satellite',
  },
  {
    name: 'Investment',
    description: 'Space stocks, ETFs, funding rounds, IPOs, and the business of building the space economy.',
    keywords: ['Stocks', 'ETFs', 'Funding', 'Space economy'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    searchQuery: 'investment',
  },
  {
    name: 'Careers',
    description: 'Breaking into the space industry, astronaut selection, hiring trends, and salary guides.',
    keywords: ['Jobs', 'Astronauts', 'Hiring', 'Careers'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    searchQuery: 'career',
  },
  {
    name: 'Defense',
    description: 'Space Force, Golden Dome, ITAR regulations, national security space, and military satellites.',
    keywords: ['Space Force', 'Golden Dome', 'ITAR', 'National security'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    searchQuery: 'defense',
  },
];

export default function TopicsPage() {
  const totalArticles = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="pt-8 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-slate-400 mb-5">
            <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            {totalArticles}+ Original Articles
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Explore Topics
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Browse our library of original space industry articles by category. From CubeSats to nuclear propulsion, space law to cybersecurity &mdash; all free to read.
          </p>
        </div>

        {/* Category Cards */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog?category=${cat.slug}`}
                className={`group block bg-gradient-to-br ${cat.gradient} border ${cat.border} rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/20`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${cat.accent}`}>
                    {cat.icon}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.badge}`}>
                    {cat.count} articles
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white/80 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  {cat.description}
                </p>
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cat.accent} group-hover:gap-2.5 transition-all`}>
                  Browse
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Topics */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Popular Topics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTopics.map((topic) => (
              <Link
                key={topic.name}
                href={`/search?q=${encodeURIComponent(topic.searchQuery)}`}
                className="group flex items-start gap-4 bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-white/15 transition-colors">
                  {topic.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-white/80 transition-colors">
                    {topic.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    {topic.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-slate-500"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-10 border-t border-white/[0.06]">
          <p className="text-slate-400 text-sm mb-4">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Browse All Articles
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] border border-white/[0.08] text-white rounded-lg text-sm font-medium hover:bg-white/[0.1] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
