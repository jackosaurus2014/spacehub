import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Space Industry Learning Center | SpaceNexus',
  description:
    'In-depth guides on satellite launch costs, space industry market size, satellite tracking, and the top space companies to watch. Data-driven resources for space professionals.',
  keywords: [
    'space industry guide',
    'satellite launch cost',
    'space market size',
    'satellite tracking',
    'space companies',
    'space industry education',
    'aerospace guide',
  ],
  openGraph: {
    title: 'Space Industry Learning Center | SpaceNexus',
    description:
      'In-depth guides on satellite launch costs, space industry market size, satellite tracking, and the top space companies to watch.',
    type: 'website',
    url: 'https://spacenexus.us/learn',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Learning Center | SpaceNexus',
    description:
      'In-depth guides on satellite launch costs, space industry market size, satellite tracking, and the top space companies.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn',
  },
};

const guides = [
  {
    slug: 'satellite-launch-cost',
    title: 'How Much Does It Cost to Launch a Satellite?',
    description:
      'Complete breakdown of satellite launch costs by provider, orbit type, and payload size. Compare rideshare vs. dedicated pricing from SpaceX, Rocket Lab, ULA, and more.',
    category: 'Cost Analysis',
    readTime: '12 min read',
    cta: 'Explore launch costs',
    icon: (
      <svg className="w-8 h-8 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    slug: 'space-industry-market-size',
    title: 'Space Industry Market Size & Growth',
    description:
      'The global space economy is projected to reach $1.8 trillion by 2035. Explore market segments, growth drivers, and investment trends shaping the industry.',
    category: 'Market Intelligence',
    readTime: '10 min read',
    cta: 'See market data',
    icon: (
      <svg className="w-8 h-8 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    slug: 'how-to-track-satellites',
    title: 'How to Track Satellites in Real Time',
    description:
      'Learn how satellite tracking works, the different orbit types, and how to use SpaceNexus to track the ISS, Starlink, GPS, and 30,000+ objects in real time.',
    category: 'Technical Guide',
    readTime: '11 min read',
    cta: 'Start tracking satellites',
    icon: (
      <svg className="w-8 h-8 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    slug: 'space-companies-to-watch',
    title: 'Top 25 Space Companies to Watch in 2026',
    description:
      'From SpaceX to emerging startups, discover the 25 most important companies driving the space economy across launch, satellites, defense, Earth observation, and space stations.',
    category: 'Industry Analysis',
    readTime: '14 min read',
    cta: 'Explore companies',
    icon: (
      <svg className="w-8 h-8 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
];

export default function LearnPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Space Industry Learning Center',
    description:
      'Comprehensive guides on satellite launch costs, space market sizing, satellite tracking, and leading space companies.',
    url: 'https://spacenexus.us/learn',
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    hasPart: guides.map((guide) => ({
      '@type': 'Article',
      name: guide.title,
      url: `https://spacenexus.us/learn/${guide.slug}`,
    })),
  };

  return (
    <div className="min-h-screen pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-400">Learning Center</span>
        </nav>

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            Space Industry Learning Center
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Data-driven guides for space industry professionals. From satellite launch economics to
            real-time tracking, explore the knowledge base that powers smarter decisions in the space
            economy.
          </p>
        </header>

        {/* Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/learn/${guide.slug}`}
              className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-nebula-500/50 transition-all duration-300 hover:bg-slate-800/70"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="shrink-0 mt-1">{guide.icon}</div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
                      {guide.category}
                    </span>
                    <span className="text-xs text-slate-500">{guide.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white group-hover:text-nebula-400 transition-colors">
                    {guide.title}
                  </h2>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{guide.description}</p>
              <span className="text-nebula-400 text-sm font-medium group-hover:underline">
                {guide.cta} &rarr;
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-8 text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Need live data, not just guides?</h2>
          <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
            SpaceNexus gives you real-time satellite tracking, launch cost calculators, market
            intelligence, and 200+ company profiles — all in one platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/mission-control"
              className="inline-block bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-slate-600/50"
            >
              Explore Mission Control
            </Link>
          </div>
        </div>

        {/* Related sections */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">Explore More SpaceNexus Resources</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/guide/space-industry"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Industry Overview</div>
              <div className="text-slate-500 text-xs">Pillar guide</div>
            </Link>
            <Link
              href="/space-industry/houston"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Hubs</div>
              <div className="text-slate-500 text-xs">City guides</div>
            </Link>
            <Link
              href="/compare"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Comparisons</div>
              <div className="text-slate-500 text-xs">vs. competitors</div>
            </Link>
            <Link
              href="/blog"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Blog</div>
              <div className="text-slate-500 text-xs">News & analysis</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
