'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const DESTINATIONS = [
  {
    title: '250+ Blog Articles',
    description: 'Original analysis on launches, markets, policy, and technology.',
    href: '/blog',
    stat: '250+',
    badge: null,
    heroImage: '/art/hero-news-media.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: '200+ Company Profiles',
    description: 'Detailed intelligence on every major space company.',
    href: '/company-profiles',
    stat: '200+',
    badge: 'PRO',
    heroImage: '/art/hero-market-intel.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    title: 'Industry Scorecard',
    description: 'Quarterly grades across 6 dimensions of the space sector.',
    href: '/industry-scorecard',
    stat: 'Q1',
    badge: null,
    heroImage: '/art/hero-business-ops.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0l-4.725 2.885a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Space Calendar',
    description: 'Key launches, conferences, and milestones for 2026.',
    href: '/space-calendar',
    stat: 'LIVE',
    badge: null,
    heroImage: '/art/hero-launch-vehicles.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Startup Directory',
    description: 'Curated profiles of 35+ emerging space startups.',
    href: '/startup-directory',
    stat: '35+',
    badge: null,
    heroImage: '/art/hero-space-capital.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    title: 'Industry Map',
    description: 'Interactive visualization of sector relationships.',
    href: '/space-map',
    stat: 'NEW',
    badge: 'PRO',
    heroImage: '/art/hero-space-operations.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: 'Space Stats',
    description: 'Live metrics and growth tracking for the industry.',
    href: '/space-stats',
    stat: 'LIVE',
    badge: null,
    heroImage: '/art/hero-mission-control.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Ignition Tracker',
    description: "Track NASA's $20B Moon base program live.",
    href: '/ignition',
    stat: 'NEW',
    badge: null,
    heroImage: '/art/hero-mission-planning.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.75 6.75 0 009 18.75a6.75 6.75 0 006.362-13.536z" />
      </svg>
    ),
  },
  {
    title: 'Learning Path',
    description: 'Structured education from beginner to advanced.',
    href: '/learn/space-industry',
    stat: null,
    badge: null,
    heroImage: '/art/hero-solar-expansion.png',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
];

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function ExplorePlatform() {
  return (
    <section className="section-spacer-sm relative z-10">
      <div className="container mx-auto px-4">
        {/* Terminal-style header */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                Explore the Platform
              </h2>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-medium">
              9 destinations
            </span>
          </div>
          <p className="text-sm text-slate-500 ml-4">
            Dive into the space industry — all free, all original.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {DESTINATIONS.map((dest) => (
            <motion.div key={dest.href} variants={cardVariants}>
              <Link
                href={dest.href}
                className="group flex flex-col gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 h-full relative overflow-hidden"
              >
                {/* Background hero image */}
                <Image
                  src={dest.heroImage}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover opacity-[0.08] group-hover:opacity-15 transition-opacity duration-300"
                />

                {/* Status badge */}
                {dest.badge && (
                  <span className="absolute top-2.5 right-2.5 pro-badge z-10">{dest.badge}</span>
                )}
                {!dest.badge && dest.stat === 'LIVE' && (
                  <span className="absolute top-2.5 right-2.5 live-badge text-[7px] z-10">LIVE</span>
                )}
                {!dest.badge && dest.stat === 'NEW' && (
                  <span className="absolute top-2.5 right-2.5 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 z-10">NEW</span>
                )}

                <div className="relative z-10 flex items-center gap-2">
                  <span className="text-slate-400 group-hover:text-white transition-colors">
                    {dest.icon}
                  </span>
                  <h3 className="text-xs md:text-sm font-semibold text-white/90 group-hover:text-white transition-colors leading-tight">
                    {dest.title}
                  </h3>
                </div>
                <p className="relative z-10 text-[11px] md:text-xs text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed">
                  {dest.description}
                </p>

                {/* Explore arrow */}
                <div className="relative z-10 flex items-center gap-1 text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors mt-auto pt-1">
                  Explore
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
