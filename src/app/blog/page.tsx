// Server component: imports the multi-MB blog-content module on the server
// only, and passes lightweight post metadata to the client listing.
// Do NOT add 'use client' here — it would pull all article HTML into the
// client bundle (this alone was ~850 kB of first-load JS).
import { BLOG_POSTS } from '@/lib/blog-content';
import { toBlogPostMeta } from '@/lib/blog-metadata';
import BlogListingClient from './BlogListingClient';

function BlogItemListSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [...BLOG_POSTS]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://spacenexus.us/blog/${post.slug}`,
      })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}

export default function BlogPage() {
  const posts = [...BLOG_POSTS]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(toBlogPostMeta);

  return (
    <>
      <BlogItemListSchema />
      <BlogListingClient posts={posts} />
    </>
  );
}
