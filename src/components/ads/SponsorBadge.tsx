'use client';

import Image from 'next/image';
import Link from 'next/link';

interface SponsorBadgeProps {
  sponsorName: string;
  sponsorLogo?: string;
  link: string;
  className?: string;
}

export default function SponsorBadge({
  sponsorName,
  sponsorLogo,
  link,
  className = ''
}: SponsorBadgeProps) {
  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-slate-800/50 border border-slate-700/50
                  hover:bg-slate-700/50 hover:border-slate-600/50
                  transition-all duration-200 group ${className}`}
    >
      <span className="text-slate-400 text-xs font-medium">Powered by</span>

      {sponsorLogo ? (
        <div className="relative w-4 h-4 overflow-hidden rounded">
          <Image
            src={sponsorLogo}
            alt={sponsorName}
            fill
            className="object-contain"
          />
        </div>
      ) : null}

      <span className="text-slate-300 text-xs font-semibold group-hover:text-cyan-400 transition-colors">
        {sponsorName}
      </span>

      {/* External link indicator */}
      <svg
        className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </Link>
  );
}
