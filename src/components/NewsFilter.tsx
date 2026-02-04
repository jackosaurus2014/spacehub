'use client';

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

export default function NewsFilter({
  selectedCategory,
  onCategoryChange,
}: NewsFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onCategoryChange(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
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
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
            selectedCategory === category.slug
              ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
              : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
          }`}
        >
          <span>{categoryIcons[category.slug]}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
