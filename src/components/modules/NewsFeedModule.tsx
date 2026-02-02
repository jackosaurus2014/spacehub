'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import { NewsArticle } from '@/types';

export default function NewsFeedModule() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news?limit=6');
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📰</span>
            Latest News
          </h2>
        </div>
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        </div>
      </div>
    );
  }

  const featuredArticle = articles[0];
  const recentArticles = articles.slice(1, 6);

  return (
    <div className="space-y-6">
      {featuredArticle && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-white flex items-center">
              <span className="text-3xl mr-3">✨</span>
              Featured Story
            </h2>
          </div>
          <NewsCard article={featuredArticle} featured />
        </div>
      )}

      {recentArticles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-white flex items-center">
              <span className="text-3xl mr-3">📰</span>
              Recent News
            </h2>
            <Link
              href="/news"
              className="text-nebula-300 hover:text-nebula-200 transition-colors"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      {articles.length === 0 && (
        <div className="card p-8 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <h3 className="text-xl font-semibold text-white mb-2">No News Available</h3>
          <p className="text-star-300">Check back soon for the latest space industry updates.</p>
        </div>
      )}
    </div>
  );
}
