'use client';

import Image from 'next/image';
import Link from 'next/link';

interface NativeAdProps {
  title: string;
  description: string;
  image?: string;
  link: string;
  sponsor: string;
  className?: string;
}

export default function NativeAd({
  title,
  description,
  image,
  link,
  sponsor,
  className = '',
}: NativeAdProps) {
  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`card-interactive group block overflow-hidden rounded-2xl ${className}`}
    >
      {/* Image section - matches NewsCard styling */}
      <div className="relative h-48">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-nebula-900 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-nebula-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-nebula-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Sponsored label */}
        <div className="absolute top-3 left-3">
          <span className="bg-slate-900/80 backdrop-blur-sm text-slate-300 text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide border border-slate-700/50">
            Sponsored
          </span>
        </div>
      </div>

      {/* Content section - matches NewsCard styling */}
      <div className="p-4 bg-slate-900/50">
        <h3 className="font-semibold text-slate-200 line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {title}
        </h3>
        <p className="text-slate-400 text-sm mt-2 line-clamp-2">
          {description}
        </p>

        {/* Sponsor attribution */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Sponsored by</span>
            <span className="text-slate-300 text-xs font-medium">{sponsor}</span>
          </div>

          {/* CTA indicator */}
          <span className="text-cyan-400 text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Learn more
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
