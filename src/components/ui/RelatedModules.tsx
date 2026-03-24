'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface RelatedModule {
  name: string;
  description: string;
  href: string;
  icon: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const RelatedModules = memo(function RelatedModules({ modules, title = 'Related Intelligence' }: { modules: RelatedModule[]; title?: string }) {
  return (
    <div className="mt-12 pt-8 border-t border-white/[0.06]">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.href}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            whileHover={{ x: 3, transition: { duration: 0.15 } }}
            viewport={{ once: true, amount: 0.3 }}
            custom={i}
          >
            <Link
              href={mod.href}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.06] transition-all duration-200 group h-full"
            >
              <span className="text-xl shrink-0 group-hover:scale-110 transition-transform duration-200">{mod.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white group-hover:text-white/70 transition-colors">{mod.name}</div>
                <div className="text-xs text-slate-400 truncate">{mod.description}</div>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-white/70 transition-colors shrink-0 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

export default RelatedModules;
