'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const category of NEWS_CATEGORIES) {
        try {
          const res = await fetch(`/api/news?category=${category.slug}&limit=1`);
          const data = await res.json();
          counts[category.slug] = data.total;
        } catch {
          counts[category.slug] = 0;
        }
      }
      setArticleCounts(counts);
    };

    if (status === 'authenticated') {
      fetchCounts();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Welcome Header */}
        <div className="card p-8 mb-8 glow-border">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-nebula-500 to-rocket-500 flex items-center justify-center text-white text-xl font-bold">
              {session.user?.name?.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Welcome back, {session.user?.name || 'Explorer'}!
              </h1>
              <p className="text-star-300">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">📊</span>
              <div>
                <p className="text-star-300 text-sm">Total Articles</p>
                <p className="text-2xl font-bold text-white">
                  {Object.values(articleCounts).reduce((a, b) => a + b, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">📂</span>
              <div>
                <p className="text-star-300 text-sm">Categories</p>
                <p className="text-2xl font-bold text-white">
                  {NEWS_CATEGORIES.length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🌟</span>
              <div>
                <p className="text-star-300 text-sm">Member Since</p>
                <p className="text-2xl font-bold text-white">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Overview */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center">
            <span className="text-2xl mr-3">📈</span>
            Articles by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {NEWS_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/news?category=${category.slug}`}
                className="bg-space-700/50 border border-space-600 rounded-lg p-4 text-center hover:border-nebula-500/50 transition-all"
              >
                <span className="text-3xl block mb-2">
                  {categoryIcons[category.slug]}
                </span>
                <p className="text-white font-semibold">{category.name}</p>
                <p className="text-nebula-300 text-lg font-bold">
                  {articleCounts[category.slug] || 0}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center">
            <span className="text-2xl mr-3">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/news"
              className="bg-space-700/50 border border-space-600 rounded-lg p-6 hover:border-nebula-500/50 transition-all group"
            >
              <span className="text-4xl block mb-3">📰</span>
              <h3 className="text-white font-semibold group-hover:text-nebula-300 transition-colors">
                Browse All News
              </h3>
              <p className="text-star-300 text-sm mt-1">
                Explore the latest space industry updates
              </p>
            </Link>
            <Link
              href="/news?category=launches"
              className="bg-space-700/50 border border-space-600 rounded-lg p-6 hover:border-nebula-500/50 transition-all group"
            >
              <span className="text-4xl block mb-3">🚀</span>
              <h3 className="text-white font-semibold group-hover:text-nebula-300 transition-colors">
                Upcoming Launches
              </h3>
              <p className="text-star-300 text-sm mt-1">
                Stay updated on rocket launches
              </p>
            </Link>
            <Link
              href="/news?category=companies"
              className="bg-space-700/50 border border-space-600 rounded-lg p-6 hover:border-nebula-500/50 transition-all group"
            >
              <span className="text-4xl block mb-3">🏢</span>
              <h3 className="text-white font-semibold group-hover:text-nebula-300 transition-colors">
                Company News
              </h3>
              <p className="text-star-300 text-sm mt-1">
                Follow major space companies
              </p>
            </Link>
          </div>
        </div>

        {/* Future Features Teaser */}
        <div className="card p-6 mt-8 border-dashed">
          <div className="text-center">
            <span className="text-5xl block mb-4">🔮</span>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              Coming Soon
            </h2>
            <p className="text-star-300 max-w-2xl mx-auto">
              Save articles, customize your news feed, receive notifications for
              launches, and more. Stay tuned for exciting new features!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
