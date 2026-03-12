import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle, NewsArticleCompanyTag } from '@/types';
import WhyThisMatters from '@/components/news/WhyThisMatters';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { BLUR_PLACEHOLDER_16_9 } from '@/lib/blur-placeholder';

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
    3: 'bg-slate-500/20 text-slate-300 border-slate-500/30 hover:bg-slate-500/30',
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
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 min-h-[32px] rounded border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-1 focus:ring-offset-slate-900 ${tierColors[company.tier] || tierColors[3]}`}
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
  satellites: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  defense: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  earnings: 'bg-green-500/20 text-green-300 border border-green-500/30',
  mergers: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  development: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  policy: 'bg-red-500/20 text-red-300 border border-red-500/30',
  debris: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
};

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

export default function NewsCard({ article, featured = false, priority = false }: NewsCardProps) {
  const categoryColor = categoryColors[article.category] || 'bg-nebula-500';

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  if (featured) {
    return (
      <div className="card-interactive group block overflow-hidden rounded-2xl relative">
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
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER_16_9}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-space-800 to-nebula-600/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-nebula-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span
              className={`${categoryColor} text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1.5`}
            >
              {CATEGORY_LOGOS[article.category] && (
                <Image src={CATEGORY_LOGOS[article.category]} alt={article.category + ' category'} width={16} height={16} className="inline-block" />
              )}
              {article.category}
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-3 line-clamp-2 group-hover:text-nebula-200 transition-colors">
              {article.title}
            </h3>
            {article.companyTags && article.companyTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {article.companyTags.slice(0, 3).map(company => (
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
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    {company.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center space-x-4 mt-3 text-slate-300 text-sm">
              <span>{article.source}</span>
              <span className="text-slate-400/50">·</span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          </div>
        </div>
      </Link>
      </div>
    );
  }

  return (
    <div className="card-interactive group flex flex-col overflow-hidden rounded-2xl relative hover:shadow-lg hover:shadow-cyan-500/[0.07] transition-shadow duration-300">
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
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER_16_9}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-space-800 to-space-700 flex items-center justify-center">
              {CATEGORY_LOGOS[article.category] ? (
                <Image src={CATEGORY_LOGOS[article.category]} alt={article.category} width={48} height={48} className="opacity-60" />
              ) : (
                <span className="text-4xl opacity-30">🌌</span>
              )}
            </div>
          )}
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
            <span
              className={`${categoryColor} text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1`}
            >
              {CATEGORY_LOGOS[article.category] && (
                <Image src={CATEGORY_LOGOS[article.category]} alt={article.category + ' category'} width={12} height={12} className="inline-block" />
              )}
              {article.category}
            </span>
            <span className="text-slate-500 text-xs">{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
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
          <div className="flex items-center mt-2 text-slate-500 text-xs">
            <span>{article.source}</span>
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
