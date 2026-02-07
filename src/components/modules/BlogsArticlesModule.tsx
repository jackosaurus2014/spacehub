'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BlogPost, BLOG_TOPICS, AUTHOR_TYPES } from '@/types';

const topicColors: Record<string, string> = {
  space_law: 'bg-purple-500',
  investment: 'bg-green-500',
  policy: 'bg-blue-500',
  technology: 'bg-cyan-500',
  business: 'bg-yellow-500',
  exploration: 'bg-rocket-500',
};

const authorTypeIcons: Record<string, string> = {
  consultant: '👔',
  lawyer: '⚖️',
  entrepreneur: '💡',
  investor: '📈',
  engineer: '🔬',
  journalist: '📝',
};

function BlogPostCard({ post }: { post: BlogPost }) {
  const topic = BLOG_TOPICS.find(t => t.value === post.topic);
  const authorIcon = authorTypeIcons[post.source.authorType] || '👤';
  const topicColor = topicColors[post.topic || 'exploration'] || 'bg-nebula-500';

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-4 hover:border-nebula-500/50 transition-all group block"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{authorIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {topic && (
              <span className={`${topicColor} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
                {topic.icon} {topic.label}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 group-hover:text-nebula-200 transition-colors">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>{post.source.name}</span>
            <span>•</span>
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function BlogsArticlesModule() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/blogs?limit=6');
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <Link href="/blogs" className="block">
        <div className="card p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
              <span>✍️</span> Blogs & Articles
            </h2>
          </div>
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/blogs" className="block">
      <div className="card p-6 glow-border hover:border-nebula-400/50 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <span>✍️</span> Blogs & Articles
          </h2>
          <span className="text-slate-400 text-sm group-hover:text-nebula-200 transition-colors flex items-center gap-1">
            View All <span>→</span>
          </span>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Expert insights from consultants, lawyers, and industry professionals
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-5xl block mb-3">📚</span>
            <p className="text-slate-400">No articles yet</p>
            <p className="text-slate-400 text-sm mt-1">Click to explore and fetch articles</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {posts.slice(0, 4).map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Author Type Quick Filters */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-slate-400 text-xs mb-2">Browse by author type:</p>
              <div className="flex flex-wrap gap-2">
                {AUTHOR_TYPES.slice(0, 4).map((type) => (
                  <span
                    key={type.value}
                    className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded flex items-center gap-1"
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
          <span className="text-nebula-300 text-sm group-hover:text-nebula-200 transition-colors">
            Click to explore all expert insights →
          </span>
        </div>
      </div>
    </Link>
  );
}
