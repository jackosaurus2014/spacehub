import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle, NewsArticleCompanyTag } from '@/types';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
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
          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${tierColors[company.tier] || tierColors[3]}`}
        >
          {company.logoUrl && (
            <Image src={company.logoUrl} alt={`${company.name} logo`} width={12} height={12} className="rounded-sm" />
          )}
          {company.name}
        </span>
      ))}
      {companies.length > 3 && (
        <span className="text-[10px] text-slate-400 self-center">+{companies.length - 3}</span>
      )}
    </div>
  );
}

const categoryColors: Record<string, string> = {
  launches: 'bg-rocket-500',
  missions: 'bg-nebula-500',
  companies: 'bg-blue-500',
  satellites: 'bg-cyan-500',
  defense: 'bg-slate-500',
  earnings: 'bg-green-500',
  mergers: 'bg-purple-500',
  development: 'bg-yellow-500',
  policy: 'bg-red-500',
  debris: 'bg-orange-500',
};

export default function NewsCard({ article, featured = false }: NewsCardProps) {
  const categoryColor = categoryColors[article.category] || 'bg-nebula-500';

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (featured) {
    return (
      <Link
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-interactive group block overflow-hidden rounded-2xl"
      >
        <div className="relative h-64 md:h-80">
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-nebula-200 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-nebula-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span
              className={`${categoryColor} text-white text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide`}
            >
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
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors cursor-pointer"
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
    );
  }

  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-interactive group flex flex-col overflow-hidden rounded-2xl h-[340px]"
    >
      <div className="relative h-36 flex-shrink-0">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-space-800 to-space-700 flex items-center justify-center">
            <span className="text-4xl opacity-30">
              {article.category === 'launches' ? '🚀' :
               article.category === 'missions' ? '🛸' :
               article.category === 'companies' ? '🏢' :
               article.category === 'satellites' ? '📡' :
               article.category === 'defense' ? '🛡️' :
               article.category === 'earnings' ? '💰' :
               article.category === 'policy' ? '📜' :
               article.category === 'debris' ? '💥' : '🌌'}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`${categoryColor} text-white text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide`}
          >
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
        <div className="mt-auto pt-2">
          {article.companyTags && article.companyTags.length > 0 && (
            <CompanyBadges companies={article.companyTags} />
          )}
          <div className="flex items-center mt-2 text-slate-500 text-xs">
            <span>{article.source}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
