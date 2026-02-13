'use client';

import Link from 'next/link';

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

function formatFunding(amount: number | null): string {
  if (!amount) return '';
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount}`;
}

function getTierLabel(tier: number): { label: string; color: string } {
  switch (tier) {
    case 1: return { label: 'Tier 1', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 2: return { label: 'Tier 2', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    case 3: return { label: 'Tier 3', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    default: return { label: `Tier ${tier}`, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  }
}

export default function CompanyIntelCard({ item }: { item: CompanyIntelResult }) {
  const tierInfo = getTierLabel(item.tier);
  const counts = item._count;
  const hasModuleData = counts.newsArticles > 0 || counts.contracts > 0 || counts.serviceListings > 0 ||
    counts.satelliteAssets > 0 || counts.fundingRounds > 0 || counts.products > 0;

  return (
    <Link
      href={`/company-profiles/${item.slug}`}
      className="card p-5 block hover:border-cyan-400/60 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Company icon / logo */}
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {item.logoUrl ? (
            <img src={item.logoUrl} alt={`${item.name} logo`} className="w-5 h-5 object-contain" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-slate-100 font-medium group-hover:text-cyan-300 transition-colors">
              {item.name}
            </h3>
            {item.isPublic && item.ticker && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {item.ticker}
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tierInfo.color}`}>
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
                <span className="text-cyan-400">{formatFunding(item.totalFunding)} raised</span>
              </>
            )}
          </div>

          {/* Cross-module intelligence pills */}
          {hasModuleData && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {counts.newsArticles > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {counts.newsArticles} News
                </span>
              )}
              {counts.contracts > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {counts.contracts} Contracts
                </span>
              )}
              {counts.serviceListings > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {counts.serviceListings} Listings
                </span>
              )}
              {counts.satelliteAssets > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {counts.satelliteAssets} Satellites
                </span>
              )}
              {counts.fundingRounds > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {counts.fundingRounds} Rounds
                </span>
              )}
              {counts.products > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {counts.products} Products
                </span>
              )}
            </div>
          )}

          {/* Data completeness bar */}
          {item.dataCompleteness > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
                  style={{ width: `${Math.min(item.dataCompleteness, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-star-400">{item.dataCompleteness}% complete</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
