'use client';

import Link from 'next/link';

interface SponsorBannerProps {
  companyName: string;
  companySlug: string;
  bannerUrl?: string | null;
  tagline?: string | null;
  website?: string | null;
}

export default function SponsorBanner({ companyName, companySlug, bannerUrl, tagline, website }: SponsorBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-slate-800/50 to-amber-500/5 mb-6">
      {bannerUrl && (
        <div className="absolute inset-0 opacity-20">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        </div>
      )}
      <div className="relative px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-sm font-semibold text-amber-400">Premium Sponsor</span>
        </div>
        <div className="flex-1">
          {tagline && (
            <p className="text-slate-300 text-sm">{tagline}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              Visit Website
            </a>
          )}
          <Link
            href={`/company-profiles/${companySlug}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
