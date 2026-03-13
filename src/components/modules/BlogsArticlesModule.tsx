'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogPost, BLOG_TOPICS, AUTHOR_TYPES } from '@/types';
import { clientLogger } from '@/lib/client-logger';

const TOPIC_LOGOS: Record<string, string> = {
  'space-law': '/logos/logo-blog-space-law.png',
  'legal': '/logos/logo-blog-space-law.png',
  'investment': '/logos/logo-blog-investment.png',
  'funding': '/logos/logo-blog-investment.png',
  'policy': '/logos/logo-blog-policy.png',
  'regulatory': '/logos/logo-blog-policy.png',
  'technology': '/logos/logo-blog-technology.png',
  'tech': '/logos/logo-blog-technology.png',
  'business': '/logos/logo-blog-business.png',
  'industry': '/logos/logo-blog-business.png',
  'exploration': '/logos/logo-blog-exploration.png',
  'science': '/logos/logo-blog-exploration.png',
};

function getBlogTopicLogo(topic: string | null | undefined): string | null {
  if (!topic) return null;
  // Try direct match first (topic values use underscores like 'space_law')
  const normalized = topic.replace(/_/g, '-').toLowerCase();
  if (TOPIC_LOGOS[normalized]) return TOPIC_LOGOS[normalized];
  // Try keyword match
  for (const [keyword, logo] of Object.entries(TOPIC_LOGOS)) {
    if (normalized.includes(keyword)) return logo;
  }
  return null;
}

const topicColors: Record<string, string> = {
  space_law: 'bg-purple-500',
  investment: 'bg-green-500',
  policy: 'bg-blue-500',
  technology: 'bg-white',
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
  const topicColor = topicColors[post.topic || 'exploration'] || 'bg-white';
  const topicLogo = getBlogTopicLogo(post.topic);

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
      className="card p-4 hover:border-white/15 transition-all group block"
    >
      <div className="flex items-start gap-3">
        {topicLogo ? (
          <Image src={topicLogo} alt={post.topic || 'blog'} width={32} height={32} className="rounded-md flex-shrink-0 mt-0.5" />
        ) : (
          <div className="text-2xl">{authorIcon}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {topic && (
              <span className={`${topicColor} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
                {topic.icon} {topic.label}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-200 text-sm line-clamp-2 group-hover:text-white transition-colors">
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
        clientLogger.error('Failed to fetch blog posts', { error: error instanceof Error ? error.message : String(error) });
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
            <h2 className="text-xl font-display font-bold text-slate-200 flex items-center gap-2">
              <span>✍️</span> Blogs & Articles
            </h2>
          </div>
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-white/15 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/blogs" className="block">
      <div className="card p-6 glow-border hover:border-white/10 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-200 flex items-center gap-2">
            <span>✍️</span> Blogs & Articles
          </h2>
          <span className="text-slate-400 text-sm group-hover:text-white transition-colors flex items-center gap-1">
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
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-slate-400 text-xs mb-2">Browse by author type:</p>
              <div className="flex flex-wrap gap-2">
                {AUTHOR_TYPES.slice(0, 4).map((type) => (
                  <span
                    key={type.value}
                    className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded flex items-center gap-1"
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
          <span className="text-slate-200 text-sm group-hover:text-white transition-colors">
            Click to explore all expert insights →
          </span>
        </div>
      </div>
    </Link>
  );
}
