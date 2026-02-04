'use client';

import Link from 'next/link';
import { NEWS_CATEGORIES } from '@/types';

const categoryIcons: Record<string, string> = {
  launches: '🚀',
  missions: '🛸',
  companies: '🏢',
  earnings: '💰',
  development: '🔧',
  policy: '📜',
};

export default function CategoriesModule() {
  return (
    <div>
      <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center">
        <span className="text-3xl mr-3">📂</span>
        Browse News by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {NEWS_CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/news?category=${category.slug}`}
            className="card px-4 py-3 text-center group hover:border-nebula-500/50 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl flex-shrink-0">
              {categoryIcons[category.slug]}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm group-hover:text-nebula-300 transition-colors truncate">
                {category.name}
              </h3>
              <p className="text-star-300 text-xs truncate">{category.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
