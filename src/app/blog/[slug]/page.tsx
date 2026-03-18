import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import { getBlogPost, BLOG_POSTS, BLOG_CATEGORIES } from '@/lib/blog-content';
import FAQSchema from '@/components/seo/FAQSchema';
import SocialShare from '@/components/ui/SocialShare';
import ShareButton from '@/components/ui/ShareButton';
import BlogViewTracker from '@/components/blog/BlogViewTracker';
import InlineNewsletterSignup from '@/components/blog/InlineNewsletterSignup';

const SAFE_HTML_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'span': ['class'],
    'div': ['class'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

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
  'spacex-ipo-what-it-means-for-space-investors': { tool: 'Space Capital Tracker', path: '/space-capital' },
  'artemis-ii-moon-mission-everything-you-need-to-know': { tool: 'Launch Manifest', path: '/launch-manifest' },
  'ai-in-orbit-space-based-data-centers-revolution': { tool: 'Space Edge Computing', path: '/space-edge-computing' },
  'golden-dome-space-missile-defense-program': { tool: 'Space Defense', path: '/space-defense' },
  'direct-to-device-satellites-replace-cell-towers': { tool: 'Satellite Tracker', path: '/satellites' },
  'commercial-space-stations-race-to-replace-iss': { tool: 'Space Stations', path: '/space-stations' },
  'china-commercial-space-surge-2026': { tool: 'Market Intelligence', path: '/market-intel' },
  'space-industry-investment-guide-2026': { tool: 'Space Capital Tracker', path: '/space-capital' },
  'sierra-space-vast-billion-dollar-raises-2026': { tool: 'Space Capital Tracker', path: '/space-capital' },
  'satellite-2026-conference-preview': { tool: 'Space Events', path: '/space-events' },
  'how-to-track-satellites-real-time-2026-guide': { tool: 'Satellite Tracker', path: '/satellites' },
  'space-stocks-to-watch-2026-investors-guide': { tool: 'Market Intelligence', path: '/market-intel' },
  'space-launch-schedule-2026-complete-guide': { tool: 'Mission Control', path: '/mission-control' },
  'space-industry-careers-guide-2026': { tool: 'Space Talent Hub', path: '/space-talent' },
  'space-debris-growing-threat-orbital-environment': { tool: 'Space Environment Monitor', path: '/space-environment' },
  'spacenexus-platform-guide-first-week': { tool: 'Getting Started', path: '/getting-started' },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
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
    timeZone: 'UTC',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const categoryLabel = BLOG_CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  // Get related posts: prefer same category, fall back to keyword overlap
  const sameCategoryPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  );
  let relatedPosts = sameCategoryPosts.slice(0, 3);

  // If fewer than 3 same-category posts, fill with keyword-matched posts
  if (relatedPosts.length < 3) {
    const postKeywords = new Set(post.keywords.map((k) => k.toLowerCase()));
    const remaining = BLOG_POSTS.filter(
      (p) => p.slug !== post.slug && !relatedPosts.some((rp) => rp.slug === p.slug)
    )
      .map((p) => ({
        post: p,
        overlap: p.keywords.filter((k) => postKeywords.has(k.toLowerCase())).length,
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3 - relatedPosts.length)
      .map((r) => r.post);
    relatedPosts = [...relatedPosts, ...remaining];
  }

  // Build "Recommended Reading" — 3 additional posts from the same category
  // that are NOT already in relatedPosts, supplemented by keyword-ranked picks
  const relatedSlugs = new Set([post.slug, ...relatedPosts.map((rp) => rp.slug)]);
  let recommendedPosts = sameCategoryPosts
    .filter((p) => !relatedSlugs.has(p.slug))
    .slice(0, 3);

  if (recommendedPosts.length < 3) {
    const postKeywords = new Set(post.keywords.map((k) => k.toLowerCase()));
    const excludeSlugs = new Set(Array.from(relatedSlugs).concat(recommendedPosts.map((rp) => rp.slug)));
    const extras = BLOG_POSTS.filter((p) => !excludeSlugs.has(p.slug))
      .map((p) => ({
        post: p,
        overlap: p.keywords.filter((k) => postKeywords.has(k.toLowerCase())).length,
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3 - recommendedPosts.length)
      .map((r) => r.post);
    recommendedPosts = [...recommendedPosts, ...extras];
  }

  // Article structured data
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: post.author,
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
      <BlogViewTracker slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }}
      />

      <article className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10">
              {categoryLabel}
            </span>
            <span className="text-slate-500 text-sm">{post.readingTime} min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-6">{post.excerpt}</p>
          <div className="flex items-center justify-between gap-4 text-sm text-slate-500 pb-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-4">
              <span>By {post.author}</span>
              <span>{formatDate(post.publishedAt)}</span>
              {post.updatedAt && (
                <span className="text-slate-600">Updated {formatDate(post.updatedAt)}</span>
              )}
            </div>
            <ShareButton
              title={post.title}
              url={`https://spacenexus.us/blog/${post.slug}`}
              description={post.excerpt}
            />
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-slate max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-white/70 prose-p:leading-relaxed
            prose-li:text-white/70
            prose-strong:text-white
            prose-a:text-white/70 prose-a:no-underline hover:prose-a:underline
            prose-ul:space-y-1 prose-ol:space-y-1"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content, SAFE_HTML_CONFIG) }}
        />

        {/* Share This Article */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-white/70">Share this article</p>
            <SocialShare
              title={post.title}
              url={`https://spacenexus.us/blog/${post.slug}`}
              description={post.excerpt}
            />
          </div>
        </div>

        {/* Inline Newsletter Signup */}
        <InlineNewsletterSignup />

        {/* Topic-Aware CTA */}
        {BLOG_CTA_MAP[post.slug] && (
          <div className="mt-12 p-5 bg-white/10 border border-white/10 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm text-white/70">
              Explore this topic with our <span className="text-white font-medium">{BLOG_CTA_MAP[post.slug].tool}</span>
            </p>
            <Link
              href={BLOG_CTA_MAP[post.slug].path}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap"
            >
              Try {BLOG_CTA_MAP[post.slug].tool} &rarr;
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 p-6 bg-white/[0.05] border border-white/[0.06] rounded-xl text-center">
          <h2 className="text-lg font-bold text-white mb-2">
            Get space industry intelligence delivered
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Join SpaceNexus for real-time data, market intelligence, and expert insights.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-slate-700/50" />
              <h2 className="text-lg font-bold text-white whitespace-nowrap">Related Articles</h2>
              <div className="h-px flex-1 bg-slate-700/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="group flex flex-col bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:border-white/15 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/15">
                      {BLOG_CATEGORIES.find((c) => c.value === rp.category)?.label || rp.category}
                    </span>
                    <span className="text-xs text-slate-500">{rp.readingTime} min</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-white/70 transition-colors line-clamp-2 mb-2">
                    {rp.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 flex-1">
                    {rp.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/[0.04]">
                    <span>{formatDate(rp.publishedAt)}</span>
                    <span className="text-white/70 group-hover:text-white/90 transition-colors font-medium">
                      Read more &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Reading */}
        {recommendedPosts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
              <h2 className="text-lg font-bold text-white whitespace-nowrap flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Recommended Reading
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="group flex flex-col bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-amber-500/20 hover:from-white/[0.06] hover:to-amber-500/[0.02] transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/15">
                      {BLOG_CATEGORIES.find((c) => c.value === rp.category)?.label || rp.category}
                    </span>
                    <span className="text-xs text-slate-500">{rp.readingTime} min</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-amber-100 transition-colors line-clamp-2 mb-2">
                    {rp.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 flex-1">
                    {rp.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/[0.04]">
                    <span>{formatDate(rp.publishedAt)}</span>
                    <span className="text-amber-400/70 group-hover:text-amber-300 transition-colors font-medium">
                      Read more &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-8 pt-8 border-t border-white/[0.06]">
          <Link
            href="/blog"
            className="text-sm text-slate-400 hover:text-white/70 transition-colors"
          >
            &larr; Back to all posts
          </Link>
        </div>
      </article>
    </div>
  );
}
