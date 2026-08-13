'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle, NewsArticleCompanyTag } from '@/types';
import WhyThisMatters from '@/components/news/WhyThisMatters';
import BookmarkButton from '@/components/ui/BookmarkButton';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  priority?: boolean;
}

function CompanyBadges({ companies }: { companies: NewsArticleCompanyTag[] }) {
  if (!companies || companies.length === 0) return null;

  // Dark-appropriate badge colors (cards have dark backgrounds)
  const tierColors: Record<number, string> = {
    1: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
    3: 'bg-slate-500/20 text-white/70 border-slate-500/30 hover:bg-slate-500/30',
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {companies.slice(0, 3).map(company => (
        <span
          key={company.id}
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.location.href = `/company-profiles/${company.slug}`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              window.location.href = `/company-profiles/${company.slug}`;
            }
          }}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 min-h-[32px] rounded border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-1 focus:ring-offset-slate-900 ${tierColors[company.tier] || tierColors[3]}`}
        >
          {company.logoUrl && (
            <Image src={company.logoUrl} alt={`${company.name} logo`} width={12} height={12} className="rounded-sm" />
          )}
          {company.name}
        </span>
      ))}
      {companies.length > 3 && (
        <span className="text-xs text-slate-400 self-center">+{companies.length - 3}</span>
      )}
    </div>
  );
}

const categoryColors: Record<string, string> = {
  launches: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  missions: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  companies: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  satellites: 'bg-white/10 text-white/90 border border-white/10',
  defense: 'bg-slate-500/20 text-white/70 border border-slate-500/30',
  earnings: 'bg-green-500/20 text-green-300 border border-green-500/30',
  mergers: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  development: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  policy: 'bg-red-500/20 text-red-300 border border-red-500/30',
  debris: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
};

// Small category icons shown inside the category chip. NOT used as an
// image-thumbnail fallback — when an article has no qualifying image, the
// whole thumbnail area is omitted entirely (no placeholder box, no icon).
const CATEGORY_LOGOS: Record<string, string> = {
  'launches': '/logos/logo-news-launches.png',
  'missions': '/logos/logo-news-missions.png',
  'companies': '/logos/logo-news-companies.png',
  'satellites': '/logos/logo-news-satellites.png',
  'defense': '/logos/logo-news-defense.png',
  'earnings': '/logos/logo-news-earnings.png',
  'mergers': '/logos/logo-news-mergers.png',
  'development': '/logos/logo-news-development.png',
  'policy': '/logos/logo-news-policy.png',
  'debris': '/logos/logo-news-debris.png',
};

function estimateReadingTime(article: NewsArticle): number {
  const text = [article.title, article.summary, article.content].filter(Boolean).join(' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

export default function NewsCard({ article, featured = false, priority = false }: NewsCardProps) {
  // Track image load failures locally so a dead URL removes the whole
  // image block (and its reserved space) instead of leaving a browser
  // broken-image icon with overflowing alt text.
  const [imgError, setImgError] = useState(false);
  // News images come from ~50 arbitrary RSS hosts that can't all be
  // allowlisted in next.config.js remotePatterns, so the article thumbnail
  // uses a plain <img> (lazy-loaded) rather than next/image.
  const imageUrl = imgError ? null : (article.imageUrl || null);

  const categoryColor = categoryColors[article.category] || 'bg-white';
  const readingTime = estimateReadingTime(article);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const categoryChip = (iconSize: number) => (
    <span
      className={`${categoryColor} text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1.5`}
    >
      {CATEGORY_LOGOS[article.category] && (
        <Image src={CATEGORY_LOGOS[article.category]} alt="" width={iconSize} height={iconSize} className="inline-block" />
      )}
      {article.category}
    </span>
  );

  const companyChips = (companies: NewsArticleCompanyTag[], light: boolean) => (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {companies.slice(0, 3).map(company => (
        <span
          key={company.id}
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.location.href = `/company-profiles/${company.slug}`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              window.location.href = `/company-profiles/${company.slug}`;
            }
          }}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 ${
            light
              ? 'bg-white/20 text-slate-900 border-white/30 hover:bg-white/30'
              : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
          }`}
        >
          {company.name}
        </span>
      ))}
    </div>
  );

  if (featured) {
    if (!imageUrl) {
      // Clean text-only featured card — no reserved image area, no
      // placeholder box. Category chip + title start at the top.
      return (
        <div className="card-interactive group relative flex flex-col">
          <div className="flex items-start justify-between gap-3 p-6 pb-0">
            {categoryChip(16)}
            <BookmarkButton
              itemId={article.id}
              itemTitle={article.title}
              itemUrl={article.url}
              className="shrink-0 bg-white/[0.06] hover:bg-white/10 rounded-lg"
            />
          </div>
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 pt-3 flex-1"
          >
            <h3 className="text-xl md:text-2xl font-bold text-white line-clamp-2 group-hover:text-white transition-colors">
              {article.title}
            </h3>
            {article.summary && (
              <p className="text-slate-400 text-sm mt-2 line-clamp-3 leading-relaxed">{article.summary}</p>
            )}
            {article.companyTags && article.companyTags.length > 0 && companyChips(article.companyTags, false)}
            <div className="flex items-center space-x-4 mt-4 text-slate-400 text-sm">
              <span>{article.source}</span>
              <span className="text-slate-600">·</span>
              <span>{formatDate(article.publishedAt)}</span>
              <span className="text-slate-600">·</span>
              <span>{readingTime} min read</span>
            </div>
          </Link>
        </div>
      );
    }

    return (
      <div className="card-interactive group block overflow-hidden relative">
        <BookmarkButton
          itemId={article.id}
          itemTitle={article.title}
          itemUrl={article.url}
          className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-lg"
        />
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="relative h-64 md:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={article.title}
              loading={priority ? 'eager' : 'lazy'}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {categoryChip(16)}
              <h3 className="text-xl md:text-2xl font-bold text-white mt-3 line-clamp-2 group-hover:text-white transition-colors">
                {article.title}
              </h3>
              {article.companyTags && article.companyTags.length > 0 && companyChips(article.companyTags, true)}
              <div className="flex items-center space-x-4 mt-3 text-white/70 text-sm">
                <span>{article.source}</span>
                <span className="text-slate-400/50">·</span>
                <span>{formatDate(article.publishedAt)}</span>
                <span className="text-slate-400/50">·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  if (!imageUrl) {
    // Clean text-only grid card — no reserved image box, no rocket/emoji
    // placeholder. Bookmark button sits in the card header instead of
    // floating over an (absent) image.
    return (
      <div className="card-interactive group flex flex-col relative hover:shadow-lg hover:shadow-black/20 transition-shadow duration-300">
        <div className="flex items-center justify-between gap-2 p-3 pb-0">
          <div className="flex items-center gap-2">
            {categoryChip(12)}
            <span className="text-slate-500 text-xs">{formatDate(article.publishedAt)}</span>
          </div>
          <BookmarkButton
            itemId={article.id}
            itemTitle={article.title}
            itemUrl={article.url}
            className="shrink-0 bg-white/[0.06] hover:bg-white/10 rounded-lg"
          />
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 pt-2 flex flex-col flex-1 min-h-0"
        >
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-slate-400 text-sm mt-1.5 line-clamp-3 leading-relaxed">{article.summary}</p>
          )}
          <div className="mt-auto pt-2">
            {article.companyTags && article.companyTags.length > 0 && (
              <CompanyBadges companies={article.companyTags} />
            )}
            <div className="flex items-center gap-2 mt-2 text-slate-500 text-xs">
              <span>{article.source}</span>
              <span className="text-slate-600">·</span>
              <span>{readingTime} min read</span>
            </div>
            <WhyThisMatters
              articleTitle={article.title}
              articleCategory={article.category}
              articleSummary={article.summary || undefined}
            />
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className="card-interactive group flex flex-col overflow-hidden relative hover:shadow-lg hover:shadow-black/20 transition-shadow duration-300">
      <BookmarkButton
        itemId={article.id}
        itemTitle={article.title}
        itemUrl={article.url}
        className="absolute top-2 right-2 z-10 bg-black/40 backdrop-blur-sm rounded-lg"
      />
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative h-36 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={article.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
      </a>
      <div className="p-3 flex flex-col flex-1 min-h-0">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex items-center gap-2 mb-1.5">
            {categoryChip(12)}
            <span className="text-slate-500 text-xs">{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-slate-400 text-sm mt-1.5 line-clamp-2 leading-relaxed">{article.summary}</p>
          )}
        </a>
        <div className="mt-auto pt-2">
          {article.companyTags && article.companyTags.length > 0 && (
            <CompanyBadges companies={article.companyTags} />
          )}
          <div className="flex items-center gap-2 mt-2 text-slate-500 text-xs">
            <span>{article.source}</span>
            <span className="text-slate-600">·</span>
            <span>{readingTime} min read</span>
          </div>
          <WhyThisMatters
            articleTitle={article.title}
            articleCategory={article.category}
            articleSummary={article.summary || undefined}
          />
        </div>
      </div>
    </div>
  );
}
