import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle } from '@/types';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
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
            <div className="w-full h-full bg-gradient-to-br from-space-700 to-nebula-500/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-space-600/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-nebula-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-space-950 via-space-950/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span
              className={`${categoryColor} text-white text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide`}
            >
              {article.category}
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-3 line-clamp-2 group-hover:text-nebula-300 transition-colors">
              {article.title}
            </h3>
            <div className="flex items-center space-x-4 mt-3 text-star-300 text-sm">
              <span>{article.source}</span>
              <span className="text-star-400/50">·</span>
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
      className="card-interactive group block overflow-hidden rounded-2xl"
    >
      <div className="relative h-48">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-space-700 to-nebula-500/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-space-600/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-nebula-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span
            className={`${categoryColor} text-white text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide`}
          >
            {article.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-2 group-hover:text-nebula-300 transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-star-300 text-sm mt-2 line-clamp-2">{article.summary}</p>
        )}
        <div className="flex items-center space-x-3 mt-3 text-star-400 text-xs">
          <span>{article.source}</span>
          <span className="text-star-400/50">·</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
