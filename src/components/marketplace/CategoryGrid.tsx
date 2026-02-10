'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace-types';

interface CategoryGridProps {
  categoryCounts?: Record<string, number>;
  onSelect?: (category: string) => void;
  selectedCategory?: string;
}

export default function CategoryGrid({ categoryCounts, onSelect, selectedCategory }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {MARKETPLACE_CATEGORIES.map((cat, i) => {
        const count = categoryCounts?.[cat.value] ?? 0;
        const isSelected = selectedCategory === cat.value;

        const content = (
          <motion.div
            key={cat.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect?.(cat.value)}
            className={`card p-4 cursor-pointer text-center group transition-all ${
              isSelected
                ? 'ring-2 ring-cyan-500 bg-cyan-500/10'
                : 'hover:ring-1 hover:ring-slate-500'
            }`}
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1">
              {cat.label}
            </div>
            <div className="text-[10px] text-slate-500">
              {count} {count === 1 ? 'listing' : 'listings'}
            </div>
          </motion.div>
        );

        if (onSelect) return content;

        return (
          <Link key={cat.value} href={`/marketplace/search?category=${cat.value}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
