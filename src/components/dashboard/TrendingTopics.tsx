'use client';

import Link from 'next/link';

const TRENDING_ITEMS = [
  { title: 'Artemis II Launch Prep', href: '/blog/artemis-ii-moon-mission-everything-you-need-to-know' },
  { title: 'SpaceX IPO Watch', href: '/blog/spacex-ipo-what-it-means-for-space-investors' },
  { title: 'SATELLITE 2026 Conference', href: '/satellite-2026' },
  { title: 'Space Station Funding Boom', href: '/blog/sierra-space-vast-billion-dollar-raises-2026' },
  { title: '$626B Space Economy', href: '/space-economy' },
];

export default function TrendingTopics() {
  return (
    <div className="mb-8">
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          Trending in Space This Week
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.08] border border-white/[0.1] text-[10px] text-slate-400 cursor-help shrink-0"
            title="These are the hottest topics in the space industry right now, updated weekly based on news volume and community interest."
          >
            ?
          </span>
        </h2>
        <div className="space-y-2">
          {TRENDING_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex-1 truncate">
                {item.title}
              </span>
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
