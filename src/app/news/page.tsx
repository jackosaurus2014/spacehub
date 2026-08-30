// Server component: keeps the multi-MB blog-content module out of the client
// bundle. Only the top-3 featured post metadata is serialized to the client.
// Do NOT add 'use client' here.
import { BLOG_POSTS } from '@/lib/blog-content';
import { toBlogPostMeta } from '@/lib/blog-metadata';
import type { NewsArticle } from '@/types';
import NewsPageClient from './NewsPageClient';
import { getNewsArticles } from '@/lib/news-fetcher';
import { logger } from '@/lib/logger';

// The first page of headlines is rendered on the server (SYNTHESIS.md item
// 23). DB read at request time → force-dynamic (the build container has no DB).
export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  let initialArticles: NewsArticle[] | undefined;
  let initialTotal: number | undefined;
  try {
    const first = await getNewsArticles({ limit: 12, offset: 0 });
    initialArticles = JSON.parse(JSON.stringify(first.articles));
    initialTotal = first.total;
  } catch (error) {
    logger.warn('news: server-side first page failed; client will fetch', { error: error instanceof Error ? error.message : String(error) });
  }

  const featuredBlogPosts = BLOG_POSTS
    .filter((p) => p.featured)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
    .map(toBlogPostMeta);

  return <NewsPageClient featuredBlogPosts={featuredBlogPosts} initialArticles={initialArticles} initialTotal={initialTotal} />;
}
