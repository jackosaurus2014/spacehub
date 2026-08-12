// Server component: keeps the multi-MB blog-content module out of the client
// bundle. Only the top-3 featured post metadata is serialized to the client.
// Do NOT add 'use client' here.
import { BLOG_POSTS } from '@/lib/blog-content';
import { toBlogPostMeta } from '@/lib/blog-metadata';
import NewsPageClient from './NewsPageClient';

export default function NewsPage() {
  const featuredBlogPosts = BLOG_POSTS
    .filter((p) => p.featured)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
    .map(toBlogPostMeta);

  return <NewsPageClient featuredBlogPosts={featuredBlogPosts} />;
}
