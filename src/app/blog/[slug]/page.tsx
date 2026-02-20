import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, BLOG_POSTS, BLOG_CATEGORIES } from '@/lib/blog-content';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 3600;

const BLOG_CTA_MAP: Record<string, { tool: string; path: string }> = {
  'why-space-industry-needs-bloomberg-terminal': { tool: 'Mission Control', path: '/mission-control' },
  'space-economy-2026-where-money-is-going': { tool: 'Market Intelligence', path: '/market-intel' },
  'how-to-win-government-space-contracts': { tool: 'Procurement Intelligence', path: '/procurement' },
  'space-startup-funding-trends-2026': { tool: 'Space Capital Tracker', path: '/space-capital' },
  'satellite-tracking-explained-beginners-guide': { tool: 'Satellite Tracker', path: '/satellites' },
  'space-weather-monitoring-business-impact': { tool: 'Space Environment Monitor', path: '/space-environment' },
  '5-space-industry-trends-reshaping-market-2026': { tool: 'Market Intelligence', path: '/market-intel' },
  'rise-of-mega-constellations-business-impact': { tool: 'Constellation Tracker', path: '/constellations' },
  'space-insurance-billion-dollar-market': { tool: 'Space Insurance', path: '/space-insurance' },
  'building-spacenexus-idea-to-launch-90-days': { tool: 'Mission Control', path: '/mission-control' },
  'itar-ear-compliance-space-startups': { tool: 'Compliance Hub', path: '/compliance' },
  'sam-gov-to-space-government-contracts-guide': { tool: 'Procurement Intelligence', path: '/procurement' },
};

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | SpaceNexus Blog`,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      url: `https://spacenexus.us/blog/${post.slug}`,
      images: [{
        url: `https://spacenexus.us/blog/${post.slug}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: post.title,
      }],
    },
    alternates: {
      canonical: `https://spacenexus.us/blog/${post.slug}`,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const categoryLabel = BLOG_CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  // Get related posts (same category, different slug)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 3);

  // Article structured data
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: {
        '@type': 'ImageObject',
        url: 'https://spacenexus.us/spacenexus-logo.png',
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    image: {
      '@type': 'ImageObject',
      url: 'https://spacenexus.us/og-image.png',
      width: 1200,
      height: 630,
    },
    mainEntityOfPage: `https://spacenexus.us/blog/${post.slug}`,
    wordCount: post.content.split(/\s+/).length,
    articleSection: categoryLabel,
    keywords: post.keywords.join(', '),
  };

  return (
    <div className="min-h-screen pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }}
      />

      <article className="container mx-auto px-4 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-300 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{post.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
              {categoryLabel}
            </span>
            <span className="text-slate-500 text-sm">{post.readingTime} min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-6">{post.excerpt}</p>
          <div className="flex items-center gap-4 text-sm text-slate-500 pb-6 border-b border-slate-700/50">
            <span>By {post.author}</span>
            <span>{formatDate(post.publishedAt)}</span>
            {post.updatedAt && (
              <span className="text-slate-600">Updated {formatDate(post.updatedAt)}</span>
            )}
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-slate max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-li:text-slate-300
            prose-strong:text-white
            prose-a:text-nebula-400 prose-a:no-underline hover:prose-a:underline
            prose-ul:space-y-1 prose-ol:space-y-1"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Topic-Aware CTA */}
        {BLOG_CTA_MAP[post.slug] && (
          <div className="mt-12 p-5 bg-nebula-500/10 border border-nebula-500/30 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm text-slate-300">
              Explore this topic with our <span className="text-white font-medium">{BLOG_CTA_MAP[post.slug].tool}</span>
            </p>
            <Link
              href={BLOG_CTA_MAP[post.slug].path}
              className="text-sm font-medium text-nebula-400 hover:text-nebula-300 transition-colors whitespace-nowrap"
            >
              Try {BLOG_CTA_MAP[post.slug].tool} &rarr;
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl text-center">
          <h3 className="text-lg font-bold text-white mb-2">
            Get space industry intelligence delivered
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Join SpaceNexus for real-time data, market intelligence, and expert insights.
          </p>
          <Link
            href="/register"
            className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-white mb-6">Related Posts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="group block bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-nebula-500/50 transition-all"
                >
                  <h4 className="text-sm font-semibold text-white group-hover:text-nebula-400 transition-colors line-clamp-2 mb-2">
                    {rp.title}
                  </h4>
                  <span className="text-slate-500 text-xs">{rp.readingTime} min read</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <Link
            href="/blog"
            className="text-sm text-slate-400 hover:text-nebula-400 transition-colors"
          >
            &larr; Back to all posts
          </Link>
        </div>
      </article>
    </div>
  );
}
