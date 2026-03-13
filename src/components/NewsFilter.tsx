'use client';

import Image from 'next/image';
import { NEWS_CATEGORIES } from '@/types';

interface NewsFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const categoryIcons: Record<string, string> = {
  launches: '🚀',
  missions: '🛸',
  companies: '🏢',
  satellites: '📡',
  defense: '🛡️',
  earnings: '💰',
  mergers: '🤝',
  development: '🔧',
  policy: '📜',
  debris: '💥',
};

const CATEGORY_LOGOS: Record<string, string> = {
  'launches': '/logos/logo-news-launches.png',
  'missions': '/logos/logo-news-missions.png',
  'companies': '/logos/logo-news-companies.png',
  'satellites': '/logos/logo-news-satellites.png',
  'defense': '/logos/logo-news-defense.png',
  'earnings': '/logos/logo-news-earnings.png',
  'mergers': '/logos/logo-news-mergers.png',
  'development': '/logos/logo-news-development.png',
  'policy': '/logos/logo-news-policy.png',
  'debris': '/logos/logo-news-debris.png',
};

export default function NewsFilter({
  selectedCategory,
  onCategoryChange,
}: NewsFilterProps) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto flex-nowrap sm:flex-wrap pb-1 scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={`flex-shrink-0 px-4 py-2 min-h-[44px] rounded-full font-medium text-sm transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-white/10 text-slate-200 border border-white/15/40 shadow-lg shadow-black/5'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50'
          }`}
        >
          All
        </button>
        {NEWS_CATEGORIES.map((category) => (
          <button
            key={category.slug}
            onClick={() => onCategoryChange(category.slug)}
            className={`flex-shrink-0 px-4 py-2 min-h-[44px] rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              selectedCategory === category.slug
                ? 'bg-white/10 text-slate-200 border border-white/15/40 shadow-lg shadow-black/5'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            {CATEGORY_LOGOS[category.slug] ? (
              <Image
                src={CATEGORY_LOGOS[category.slug]}
                alt={category.name + ' category'}
                width={20}
                height={20}
                className="rounded-sm flex-shrink-0"
              />
            ) : (
              <span>{categoryIcons[category.slug]}</span>
            )}
            <span>{category.name}</span>
          </button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}
