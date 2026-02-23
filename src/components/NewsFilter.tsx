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
    <div className="flex gap-2 overflow-x-auto flex-nowrap sm:flex-wrap">
      <button
        onClick={() => onCategoryChange(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          selectedCategory === null
            ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
            : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
        }`}
      >
        All
      </button>
      {NEWS_CATEGORIES.map((category) => (
        <button
          key={category.slug}
          onClick={() => onCategoryChange(category.slug)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            selectedCategory === category.slug
              ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
              : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
          }`}
        >
          {CATEGORY_LOGOS[category.slug] ? (
            <Image
              src={CATEGORY_LOGOS[category.slug]}
              alt=""
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
  );
}
