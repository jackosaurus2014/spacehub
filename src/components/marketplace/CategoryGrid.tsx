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

        if (onSelect) {
          return (
            <motion.button
              key={cat.value}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(cat.value)}
              aria-label={`${cat.label}${count > 0 ? `, ${count} ${count === 1 ? 'listing' : 'listings'}` : ''}`}
              aria-pressed={isSelected}
              className={`card p-4 cursor-pointer text-center group transition-all w-full ${
                isSelected
                  ? 'ring-2 ring-white/15 bg-white/5'
                  : 'hover:ring-1 hover:ring-slate-500'
              }`}
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className="text-xs font-semibold text-white group-hover:text-white transition-colors mb-1">
                {cat.label}
              </div>
              <div className="text-xs text-slate-500">
                {count} {count === 1 ? 'listing' : 'listings'}
              </div>
            </motion.button>
          );
        }

        const content = (
          <motion.div
            key={cat.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="card p-4 cursor-pointer text-center group transition-all hover:ring-1 hover:ring-slate-500"
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <div className="text-xs font-semibold text-white group-hover:text-white transition-colors mb-1">
              {cat.label}
            </div>
            <div className="text-xs text-slate-500">
              {count} {count === 1 ? 'listing' : 'listings'}
            </div>
          </motion.div>
        );

        return (
          <Link key={cat.value} href={`/marketplace/search?category=${cat.value}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
