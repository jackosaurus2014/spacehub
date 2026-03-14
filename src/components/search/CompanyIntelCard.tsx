'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatFunding, getTierInfo } from '@/lib/format-number';

interface CompanyIntelResult {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  headquarters: string | null;
  isPublic: boolean;
  ticker: string | null;
  sector: string | null;
  tier: number;
  totalFunding: number | null;
  logoUrl: string | null;
  dataCompleteness: number;
  _count: {
    newsArticles: number;
    contracts: number;
    serviceListings: number;
    satelliteAssets: number;
    fundingRounds: number;
    products: number;
  };
}

export default function CompanyIntelCard({ item }: { item: CompanyIntelResult }) {
  const tierInfo = getTierInfo(item.tier);
  const counts = item._count;
  const hasModuleData = counts.newsArticles > 0 || counts.contracts > 0 || counts.serviceListings > 0 ||
    counts.satelliteAssets > 0 || counts.fundingRounds > 0 || counts.products > 0;

  return (
    <Link
      href={`/company-profiles/${item.slug}`}
      className="card p-5 block hover:border-white/10 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Company icon / logo */}
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {item.logoUrl ? (
            <Image src={item.logoUrl} alt={`${item.name} logo`} width={20} height={20} className="w-5 h-5 object-contain" unoptimized />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-slate-100 font-medium group-hover:text-white transition-colors">
              {item.name}
            </h3>
            {item.isPublic && item.ticker && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {item.ticker}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${tierInfo.color}`}>
              {tierInfo.label}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-star-300 text-sm mt-1 line-clamp-2">{item.description}</p>
          )}

          {/* Meta row: sector, HQ, funding */}
          <div className="flex items-center gap-3 mt-2 text-xs text-star-300 flex-wrap">
            {item.sector && (
              <span className="text-emerald-400 capitalize">{item.sector.replace(/_/g, ' ')}</span>
            )}
            {item.headquarters && (
              <>
                {item.sector && <span className="text-star-300/40">|</span>}
                <span>{item.headquarters}</span>
              </>
            )}
            {item.totalFunding && (
              <>
                <span className="text-star-300/40">|</span>
                <span className="text-slate-300">{formatFunding(item.totalFunding)} raised</span>
              </>
            )}
          </div>

          {/* Cross-module intelligence pills */}
          {hasModuleData && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {counts.newsArticles > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {counts.newsArticles} News
                </span>
              )}
              {counts.contracts > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {counts.contracts} Contracts
                </span>
              )}
              {counts.serviceListings > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {counts.serviceListings} Listings
                </span>
              )}
              {counts.satelliteAssets > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {counts.satelliteAssets} Satellites
                </span>
              )}
              {counts.fundingRounds > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {counts.fundingRounds} Rounds
                </span>
              )}
              {counts.products > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {counts.products} Products
                </span>
              )}
            </div>
          )}

          {/* Data completeness bar */}
          {item.dataCompleteness > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-emerald-500 transition-all"
                  style={{ width: `${Math.min(item.dataCompleteness, 100)}%` }}
                />
              </div>
              <span className="text-xs text-star-400">{item.dataCompleteness}% complete</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
