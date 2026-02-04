'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BlogPost, BLOG_TOPICS, AUTHOR_TYPES, BlogTopic, BlogAuthorType } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';

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

/** Topics that relate to compliance / legal content */
const COMPLIANCE_TOPICS: BlogTopic[] = ['space_law', 'policy'];

const BLOG_EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'authorName', label: 'Author' },
  { key: 'topic', label: 'Topic' },
  { key: 'source.authorType', label: 'Author Type' },
  { key: 'publishedAt', label: 'Published At' },
  { key: 'url', label: 'URL' },
  { key: 'source.name', label: 'Source' },
];

function BlogPostCard({ post }: { post: BlogPost }) {
  const topic = BLOG_TOPICS.find(t => t.value === post.topic);
  const authorIcon = authorTypeIcons[post.source.authorType] || '👤';
  const topicColor = topicColors[post.topic || 'exploration'] || 'bg-nebula-500';
  const isComplianceRelated = post.topic && COMPLIANCE_TOPICS.includes(post.topic);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all group block">
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
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
      {/* Cross-module links */}
      {isComplianceRelated && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
          <span className="text-[10px] text-star-400">Related:</span>
          <Link
            href="/compliance"
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-colors"
          >
            Compliance
          </Link>
        </div>
      )}
    </div>
  );
}

function BlogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTopic = (searchParams.get('topic') as BlogTopic | null) || null;
  const initialAuthorType = (searchParams.get('authorType') as BlogAuthorType | null) || null;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(initialTopic);
  const [selectedAuthorType, setSelectedAuthorType] = useState<BlogAuthorType | null>(initialAuthorType);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  // ── URL sync helper ──
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  useEffect(() => {
    fetchPosts();
  }, [selectedTopic, selectedAuthorType, offset]); // eslint-disable-line react-hooks/exhaustive-deps

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
    updateUrl({ topic });
  };

  const handleAuthorTypeChange = (authorType: BlogAuthorType | null) => {
    setSelectedAuthorType(authorType);
    setOffset(0);
    setPosts([]);
    updateUrl({ authorType });
  };

  const loadMore = () => {
    setOffset(prev => prev + limit);
  };

  return (
    <>
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
                    ? 'bg-white/[0.1] text-white border-white/[0.15] shadow-glow-sm'
                    : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
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
                      ? 'bg-white/[0.1] text-white border-white/[0.15] shadow-glow-sm'
                      : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
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
                    ? 'bg-white/[0.1] text-white border-white/[0.15] shadow-glow-sm'
                    : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
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
                      ? 'bg-white/[0.1] text-white border-white/[0.15] shadow-glow-sm'
                      : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
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
        <div className="card-elevated p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="text-4xl font-bold font-display tracking-tight text-white">{total}</div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Total Articles</div>
            <ExportButton
              data={posts}
              filename="spacehub-blog-posts"
              columns={BLOG_EXPORT_COLUMNS}
              label="Export"
            />
          </div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{BLOG_TOPICS.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Topics</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-rocket-400">{AUTHOR_TYPES.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Author Types</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">23</div>
          <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Sources</div>
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
            We aggregate articles and blog posts from 23 space industry sources including law firm
            blogs (StarLaw, Space Legal Issues, Sheppard Mullin), policy analysis (CSIS, Space Policy Online),
            technical coverage (NASASpaceflight, Everyday Astronaut, Ars Technica), and industry news
            (SpaceNews, Payload Space, SpaceWatch.Global). Content is refreshed daily.
          </p>
        </div>
      </div>
    </>
  );
}

export default function BlogsPage() {
  const [fetching, setFetching] = useState(false);

  const handleFetchNewPosts = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/blogs/fetch', { method: 'POST' });
      await res.json();
    } catch (error) {
      console.error('Failed to fetch new posts:', error);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader title="Blogs & Articles" subtitle="Expert insights from consultants, lawyers, and space industry professionals" breadcrumbs={[{label: 'Home', href: '/'}, {label: 'Blogs'}]}>
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
                <span>Fetch New Articles</span>
              </>
            )}
          </button>
        </PageHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <BlogsContent />
        </Suspense>
      </div>
    </div>
  );
}
