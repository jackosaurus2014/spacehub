'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const RECENT_UPDATES = [
  {
    date: 'Mar 2026',
    title: 'Modern Mobile-First Redesign',
    description:
      'Glassmorphism design system, content-shaped skeleton loaders, pill-style navigation, stagger animations, and trust signals across every page.',
    href: '/features',
    badge: 'New',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: '\u2728',
  },
  {
    date: 'Feb 2026',
    title: 'AI-Powered Marketplace Copilot',
    description:
      'Ask natural-language questions to find providers, compare proposals, and generate RFQs instantly with our Claude-powered copilot.',
    href: '/marketplace/copilot',
    badge: 'New',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: '\uD83E\uDD16',
  },
  {
    date: 'Feb 2026',
    title: '101 Company Intelligence Profiles',
    description:
      'Deep-dive profiles covering financials, satellite assets, facility locations, and competitive scoring for top space companies.',
    href: '/company-profiles',
    badge: 'Expanded',
    badgeColor: 'bg-white/10 text-slate-300 border-white/10',
    icon: '\uD83C\uDFE2',
  },
  {
    date: 'Jan 2026',
    title: 'Space Marketplace with 80+ Listings',
    description:
      'Browse verified service providers, submit RFQs, and discover teaming opportunities across the space supply chain.',
    href: '/marketplace',
    badge: 'New',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: '\uD83D\uDED2',
  },
];

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export default function RecentUpdates() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-display text-3xl md:text-4xl text-white mb-3">
            What&apos;s New on SpaceNexus
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Recent platform updates and feature launches
          </p>
        </div>

        {/* Updates timeline */}
        <div className="max-w-3xl mx-auto space-y-4">
          {RECENT_UPDATES.map((update, i) => (
            <motion.div
              key={update.title}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover={{ x: 4, transition: { duration: 0.15 } }}
              viewport={{ once: true, amount: 0.3 }}
              custom={i}
            >
              <Link
                href={update.href}
                className="group card p-5 rounded-2xl border border-slate-700/50 hover:border-white/15 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 flex items-start gap-4"
              >
                {/* Icon */}
                <span className="text-3xl flex-shrink-0 mt-0.5" role="img" aria-hidden="true">
                  {update.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${update.badgeColor}`}>
                      {update.badge}
                    </span>
                    <span className="text-xs text-slate-500">{update.date}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors mb-1">
                    {update.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {update.description}
                  </p>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
