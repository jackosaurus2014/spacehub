'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const FEATURED_TOOLS = [
  {
    title: 'Mission Simulator',
    href: '/mission-simulator',
    icon: '\uD83D\uDE80',
    description: 'Plan and simulate orbital missions with real physics models.',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    title: 'Orbital Calculator',
    href: '/orbital-calculator',
    icon: '\uD83C\uDF0D',
    description: 'Compute transfer orbits, delta-v budgets, and launch windows.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderHover: 'hover:border-blue-500/50',
  },
  {
    title: 'Launch Cost Calculator',
    href: '/launch-economics',
    icon: '\uD83D\uDCB0',
    description: 'Compare launch vehicle costs per kilogram to any orbit.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderHover: 'hover:border-emerald-500/50',
  },
  {
    title: 'Constellation Designer',
    href: '/constellation-designer',
    icon: '\uD83D\uDCE1',
    description: 'Design satellite constellations with coverage analysis tools.',
    gradient: 'from-purple-500/20 to-violet-500/20',
    borderHover: 'hover:border-purple-500/50',
  },
  {
    title: 'Thermal Calculator',
    href: '/thermal-calculator',
    icon: '\uD83C\uDF21\uFE0F',
    description: 'Model spacecraft thermal loads across mission profiles.',
    gradient: 'from-orange-500/20 to-amber-500/20',
    borderHover: 'hover:border-orange-500/50',
  },
  {
    title: 'Link Budget Calculator',
    href: '/link-budget-calculator',
    icon: '\uD83D\uDCF6',
    description: 'Calculate RF link budgets for satellite communications.',
    gradient: 'from-pink-500/20 to-rose-500/20',
    borderHover: 'hover:border-pink-500/50',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export default function FeaturedTools() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-display-sm font-display font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Popular Engineering Tools
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Free interactive calculators and simulators used by space professionals worldwide
          </p>
          <div className="gradient-line max-w-xs mx-auto mt-4" />
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURED_TOOLS.map((tool, i) => (
            <motion.div
              key={tool.title}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              custom={i}
            >
              <Link
                href={tool.href}
                className={`group relative card p-5 rounded-2xl border border-slate-700/50 ${tool.borderHover} transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 block h-full`}
              >
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl" role="img" aria-hidden="true">{tool.icon}</span>
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium uppercase tracking-wider">
                    Launch Tool
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* See all tools link */}
        <div className="text-center mt-8">
          <Link
            href="/mission-cost"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Browse All Tools &amp; Calculators
          </Link>
        </div>
      </div>
    </section>
  );
}
