import Link from 'next/link';
import { getGuideNavigation } from '@/lib/guide-navigation';

interface GuideNavigationProps {
  currentSlug: string;
}

export default function GuideNavigation({ currentSlug }: GuideNavigationProps) {
  const { prev, next, currentIndex, total } = getGuideNavigation(currentSlug);

  if (!prev && !next) return null;

  return (
    <nav aria-label="Guide navigation" className="mt-12 pt-8 border-t border-slate-700/50">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-xs text-slate-500">
          Guide {currentIndex + 1} of {total}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-colors ${
                i === currentIndex
                  ? 'w-4 bg-slate-400'
                  : i < currentIndex
                    ? 'w-2 bg-white/40'
                    : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Prev / Next cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prev ? (
          <Link
            href={`/guide/${prev.slug}`}
            className="group flex flex-col bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-white/15 hover:bg-slate-800/70 transition-all"
          >
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              &larr; Previous Guide
            </span>
            <span className="text-sm font-semibold text-white group-hover:text-slate-300 transition-colors line-clamp-2">
              {prev.shortTitle}
            </span>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link
            href={`/guide/${next.slug}`}
            className="group flex flex-col items-end text-right bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-white/15 hover:bg-slate-800/70 transition-all"
          >
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              Next Guide &rarr;
            </span>
            <span className="text-sm font-semibold text-white group-hover:text-slate-300 transition-colors line-clamp-2">
              {next.shortTitle}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* All guides link */}
      <div className="mt-4 text-center">
        <Link
          href="/getting-started"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          View all guides
        </Link>
      </div>
    </nav>
  );
}
