'use client';

/**
 * The interactive half of /marketplace — the former page.tsx, moved wholesale.
 *
 * The <h1>, hero, JSON-LD schemas and the server-rendered "Recent Listings"
 * section now live in the SERVER component (./page.tsx). The server hands the
 * marketplace stats down as `initialStats` (not refetched on hydration — see
 * `skipFirstFetch`) and the crawlable listings section as `children`. When the
 * server could not reach the database, neither is passed and this island
 * fetches both exactly as the old client page did.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CategoryGrid from '@/components/marketplace/CategoryGrid';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import { clientLogger } from '@/lib/client-logger';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';
import { toast } from '@/lib/toast';
import AdSlot from '@/components/ads/AdSlot';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';

export interface MarketplaceStats {
  totalListings?: number;
  activeListings: number;
  openRFQs?: number;
  activeProviders: number;
  totalProposals?: number;
  totalReviews?: number;
  categories: { category: string; count: number }[];
}

export interface MarketplaceClientProps {
  /** Stats read on the server by page.tsx; absent when the DB read failed. */
  initialStats?: MarketplaceStats | null;
  /**
   * The server-rendered "Recent Listings" section — crawlable HTML from
   * page.tsx. When absent (server DB read failed) this island falls back to
   * fetching a few listings itself, exactly as the old client page did.
   */
  children?: React.ReactNode;
}

export default function MarketplaceClient({ initialStats, children }: MarketplaceClientProps) {
  // Seeded === the server handed us the stats. The first effect pass must NOT
  // refetch them (pattern: news/NewsPageClient.tsx, CompanyProfilesClient.tsx).
  const seeded = Boolean(initialStats);
  const hasServerListings = Boolean(children);

  const [stats, setStats] = useState<MarketplaceStats | null>(initialStats ?? null);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState<string | null>(null);
  const skipFirstFetch = useRef(seeded);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The listings section is server-rendered when the server could read the
      // DB — only fetch a client-side fallback set when it could not.
      const [statsRes, listingsRes] = await Promise.all([
        fetch('/api/marketplace/stats'),
        hasServerListings ? Promise.resolve(null) : fetch('/api/marketplace/listings?limit=4&sort=newest'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (listingsRes?.ok) {
        const data = await listingsRes.json();
        setFeaturedListings(data.listings || []);
      }
      if (!statsRes.ok && listingsRes && !listingsRes.ok) {
        setError('Failed to load marketplace data. Please try again.');
      }
    } catch (err) {
      clientLogger.error('Failed to load marketplace data', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load marketplace data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasServerListings]);

  useEffect(() => {
    // The server already rendered this data — do not repeat the fetch on
    // hydration. Pull-to-refresh and retries still call loadData directly.
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    loadData();
  }, [loadData]);

  const categoryCounts: Record<string, number> = {};
  stats?.categories?.forEach((c: any) => {
    categoryCounts[c.category] = c.count ?? c._count?._all ?? 0;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await loadData(); }}>
      <div className="space-y-12">
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 gap-4">
              {[
                { label: 'Active Providers', value: stats.activeProviders, color: 'text-slate-300' },
                { label: 'Service Listings', value: stats.activeListings, color: 'text-emerald-400' },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="card p-4 text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </ScrollReveal>
        )}

        {/* Category Grid */}
        <ScrollReveal>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Browse by Category</h2>
              <Link href="/marketplace/search" className="text-xs text-slate-300 hover:text-white">
                View All →
              </Link>
            </div>
            <CategoryGrid categoryCounts={categoryCounts} />
          </div>
        </ScrollReveal>

        {/* Recent Listings — server-rendered when the DB was reachable at
            request time; otherwise the client-fetched fallback set below. */}
        {children ?? (featuredListings.length > 0 && (
          <ScrollReveal>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Listings</h2>
                <Link href="/marketplace/search" className="text-xs text-slate-300 hover:text-white">
                  View All →
                </Link>
              </div>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredListings.map((listing, i) => (
                  <StaggerItem key={listing.id}>
                    <MarketplaceCard listing={listing} index={i} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScrollReveal>
        ))}

        <div>
          <AdSlot position="in_feed" module="marketplace" adsenseSlot="in_feed_mktplace" adsenseFormat="rectangle" />
        </div>

        {/* RFQ feed removed 2026-08-26: RFQ workflow mothballed (src/lib/mothballed-routes.ts) */}

        {/* How It Works */}
        <ScrollReveal>
          <div className="card p-8">
            <h2 className="text-lg font-semibold text-white text-center mb-6">How It Works</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '1',
                  title: 'Browse the Directory',
                  desc: 'Filter verified providers by category, certification, and price range.',
                  icon: '🔍',
                },
                {
                  step: '2',
                  title: 'Contact Providers',
                  desc: 'Reach providers directly from their listing with your requirements, budget, and timeline.',
                  icon: '📬',
                },
                {
                  step: '3',
                  title: 'Award & Procure',
                  desc: 'Compare quotes and shortlist candidates. Contract awarding with integrated payments is staged for a later release.',
                  icon: '🏆',
                  comingSoon: true,
                },
                {
                  step: '4',
                  title: 'Secure Payments',
                  desc: 'Escrow-based milestone payments, invoicing, and contract management.',
                  icon: '🔒',
                  comingSoon: true,
                },
              ].map((item) => (
                <StaggerItem key={item.step} className="text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="text-sm font-semibold text-white mb-1 flex items-center justify-center gap-2">
                    {item.title}
                    {(item as any).comingSoon && <ComingSoonBadge />}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Coming Soon Features */}
        <ScrollReveal>
          <div>
            <h2 className="text-lg font-semibold text-white text-center mb-6 flex items-center justify-center gap-3">
              On the Roadmap <ComingSoonBadge size="md" />
            </h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'Escrow & Milestone Payments',
                  desc: 'Fund contracts with milestone-based escrow. Release payments as deliverables are confirmed.',
                  icon: '💰',
                },
                {
                  title: 'Contract Management',
                  desc: 'Templates, change orders, SLA tracking, and automated invoicing for space service agreements.',
                  icon: '📄',
                },
                {
                  title: 'AI Proposal Analysis',
                  desc: 'AI-powered proposal comparison, gap analysis, and bid recommendations to help you choose faster.',
                  icon: '🧠',
                },
              ].map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="card p-5 border-blue-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="text-2xl mb-3">{feature.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">{feature.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{feature.desc}</p>
                    <button
                      onClick={() => toast.info(`We'll notify you when ${feature.title} launches!`, 'Interest Registered')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors py-2 min-h-[44px]"
                    >
                      Notify Me →
                    </button>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Footer Ad */}
        <div>
          <AdSlot position="footer" module="marketplace" adsenseSlot="footer_mktplace" adsenseFormat="horizontal" />
        </div>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center card p-8 bg-gradient-to-r from-white/[0.04] to-blue-900/30 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-2">Are you a space service provider?</h2>
            <p className="text-sm text-slate-400 mb-4">
              Claim your company profile and list your services so buyers worldwide can find and contact you.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/company-profiles">
                <button className="px-5 py-2.5 min-h-[44px] bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors">
                  Claim Your Profile
                </button>
              </Link>
              <Link href="/provider-dashboard">
                <button className="px-5 py-2.5 min-h-[44px] bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm font-medium transition-colors">
                  Provider Dashboard
                </button>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <RelatedModules
            modules={[
              { name: 'Company Profiles', description: 'Detailed profiles of 100+ space companies', href: '/company-profiles', icon: '🏢' },
              { name: 'Funding Tracker', description: 'Track investment rounds and VC activity', href: '/funding-tracker', icon: '💰' },
              { name: 'Business Opportunities', description: 'Contracts, RFPs, and procurement', href: '/procurement', icon: '📋' },
              { name: 'Space Talent Hub', description: 'Hire or find jobs in the space industry', href: '/space-talent', icon: '👥' },
            ]}
          />
        </ScrollReveal>
      </div>
    </PullToRefresh>
  );
}
