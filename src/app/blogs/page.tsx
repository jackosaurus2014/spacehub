'use client';

import { useState, useEffect } from 'react';
import { BlogPost, BLOG_TOPICS, AUTHOR_TYPES, BlogTopic, BlogAuthorType } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
      weekday: 'short',
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
      className="card p-5 hover:border-nebula-500/50 transition-all group block"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-space-700 flex items-center justify-center text-2xl flex-shrink-0">
          {authorIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {topic && (
              <span className={`${topicColor} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
                {topic.icon} {topic.label}
              </span>
            )}
            <span className="text-star-300/70 text-xs">
              {post.source.name}
            </span>
          </div>
          <h3 className="font-semibold text-white text-lg group-hover:text-nebula-300 transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-star-300 text-sm mt-2 line-clamp-3">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-star-300">
            {post.authorName && (
              <>
                <span className="font-medium">{post.authorName}</span>
                <span>•</span>
              </>
            )}
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);
  const [selectedAuthorType, setSelectedAuthorType] = useState<BlogAuthorType | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => {
    fetchPosts();
  }, [selectedTopic, selectedAuthorType, offset]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTopic) params.set('topic', selectedTopic);
      if (selectedAuthorType) params.set('authorType', selectedAuthorType);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/blogs?${params}`);
      const data = await res.json();

      if (offset === 0) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNewPosts = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/blogs/fetch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Refresh the posts list
        setOffset(0);
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to fetch new posts:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleTopicChange = (topic: BlogTopic | null) => {
    setSelectedTopic(topic);
    setOffset(0);
    setPosts([]);
  };

  const handleAuthorTypeChange = (authorType: BlogAuthorType | null) => {
    setSelectedAuthorType(authorType);
    setOffset(0);
    setPosts([]);
  };

  const loadMore = () => {
    setOffset(prev => prev + limit);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">✍️</span>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                  Blogs & Articles
                </h1>
              </div>
              <p className="text-star-300">
                Expert insights from consultants, lawyers, and space industry professionals
              </p>
            </div>
            <button
              onClick={handleFetchNewPosts}
              disabled={fetching}
              className="btn-primary flex items-center gap-2"
            >
              {fetching ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Fetch New Articles</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-8">
          <div className="space-y-4">
            {/* Topic Filter */}
            <div>
              <p className="text-star-300 text-sm mb-2">Filter by topic:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTopicChange(null)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                    selectedTopic === null
                      ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                      : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
                  }`}
                >
                  All Topics
                </button>
                {BLOG_TOPICS.map((topic) => (
                  <button
                    key={topic.value}
                    onClick={() => handleTopicChange(topic.value)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                      selectedTopic === topic.value
                        ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                        : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
                    }`}
                  >
                    <span>{topic.icon}</span>
                    <span>{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Author Type Filter */}
            <div>
              <p className="text-star-300 text-sm mb-2">Filter by author:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAuthorTypeChange(null)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                    selectedAuthorType === null
                      ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                      : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
                  }`}
                >
                  All Authors
                </button>
                {AUTHOR_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleAuthorTypeChange(type.value)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                      selectedAuthorType === type.value
                        ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                        : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-white">{total}</div>
            <div className="text-star-300 text-sm">Total Articles</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-nebula-300">{BLOG_TOPICS.length}</div>
            <div className="text-star-300 text-sm">Topics</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-rocket-400">{AUTHOR_TYPES.length}</div>
            <div className="text-star-300 text-sm">Author Types</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-green-400">7</div>
            <div className="text-star-300 text-sm">Sources</div>
          </div>
        </div>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">📚</span>
            <h2 className="text-2xl font-semibold text-white mb-2">No Articles Found</h2>
            <p className="text-star-300 mb-6">
              {selectedTopic || selectedAuthorType
                ? 'Try adjusting your filters or fetch new articles.'
                : 'Click "Fetch New Articles" to load content from space industry blogs.'}
            </p>
            <button
              onClick={handleFetchNewPosts}
              disabled={fetching}
              className="btn-primary"
            >
              {fetching ? 'Fetching...' : 'Fetch Articles'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Load More */}
            {posts.length < total && (
              <div className="text-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary py-3 px-8"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Loading...</span>
                    </span>
                  ) : (
                    `Load More (${posts.length} of ${total})`
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        <div className="card p-6 mt-12 border-dashed">
          <div className="text-center">
            <span className="text-4xl block mb-3">💡</span>
            <h3 className="text-lg font-semibold text-white mb-2">About This Section</h3>
            <p className="text-star-300 text-sm max-w-2xl mx-auto">
              We aggregate articles and blog posts from space industry professionals including
              consultants, lawyers, entrepreneurs, investors, and engineers. Sources include
              The Space Review, Space Policy Online, Parabolic Arc, SpaceNews Opinion, NASA Blogs,
              The Planetary Society, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
