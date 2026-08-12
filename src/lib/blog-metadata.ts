// Lightweight blog metadata — types, categories, and helpers shared with
// client components. KEEP THIS FILE SMALL: it is bundled into client pages.
// The full article bodies live in `src/lib/blog-content.ts` (multi-MB) and
// must only ever be imported from server components / API routes.

export type BlogCategory = 'analysis' | 'guide' | 'market' | 'technology' | 'policy' | 'building-in-public';

export const BLOG_CATEGORIES: { value: BlogCategory; label: string }[] = [
  { value: 'analysis', label: 'Analysis' },
  { value: 'guide', label: 'Guides' },
  { value: 'market', label: 'Market' },
  { value: 'technology', label: 'Technology' },
  { value: 'policy', label: 'Policy' },
  { value: 'building-in-public', label: 'Building in Public' },
];

/** Everything a listing needs about a post — without the HTML body. */
export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  publishedAt: string; // ISO date
  readingTime: number; // minutes
  featured?: boolean;
}

/** Strip a full blog post down to listing metadata (server-side use). */
export function toBlogPostMeta(post: {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  publishedAt: string;
  readingTime: number;
  featured?: boolean;
}): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    ...(post.featured !== undefined ? { featured: post.featured } : {}),
  };
}
