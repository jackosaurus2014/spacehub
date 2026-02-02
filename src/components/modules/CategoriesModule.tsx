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
        Browse by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {NEWS_CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/news?category=${category.slug}`}
            className="card p-6 text-center group hover:border-nebula-500/50 transition-all"
          >
            <span className="text-4xl block mb-3">
              {categoryIcons[category.slug]}
            </span>
            <h3 className="font-semibold text-white group-hover:text-nebula-300 transition-colors">
              {category.name}
            </h3>
            <p className="text-star-300 text-sm mt-1">{category.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
