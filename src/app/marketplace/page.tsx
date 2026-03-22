'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CategoryGrid from '@/components/marketplace/CategoryGrid';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import RFQCard from '@/components/marketplace/RFQCard';
import { clientLogger } from '@/lib/client-logger';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';
import { toast } from '@/lib/toast';
import AdSlot from '@/components/ads/AdSlot';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ItemListSchema from '@/components/seo/ItemListSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';

interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  openRFQs: number;
  activeProviders: number;
  totalProposals: number;
  categories: { category: string; count: number }[];
}

export default function MarketplacePage() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [recentRFQs, setRecentRFQs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listingsRes, rfqRes] = await Promise.all([
        fetch('/api/marketplace/stats'),
        fetch('/api/marketplace/listings?limit=4&sort=newest'),
        fetch('/api/marketplace/rfq?limit=4&status=open'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setFeaturedListings(data.listings || []);
      }
      if (rfqRes.ok) {
        const data = await rfqRes.json();
        setRecentRFQs(data.rfqs || []);
      }

      if (!statsRes.ok && !listingsRes.ok && !rfqRes.ok) {
        setError('Failed to load marketplace data. Please try again.');
      }
    } catch (err) {
      clientLogger.error('Failed to load marketplace data', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load marketplace data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryCounts: Record<string, number> = {};
  stats?.categories?.forEach((c: any) => {
    categoryCounts[c.category] = c.count ?? c._count?._all ?? 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await loadData(); }}>
    <div className="min-h-screen">
      <ItemListSchema
        name="Space Industry Marketplace"
        description="B2B marketplace for space industry products and services including launch slots, satellite components, ground stations, and engineering services."
        url="/marketplace"
        items={[
          { name: 'Launch Services', url: '/marketplace/search?category=launch-services', description: 'Rideshare slots, dedicated launches, and launch vehicle services' },
          { name: 'Satellite Components', url: '/marketplace/search?category=satellite-components', description: 'Satellite subsystems, sensors, and hardware' },
          { name: 'Ground Stations', url: '/marketplace/search?category=ground-stations', description: 'Ground station time, antenna networks, and TT&C services' },
          { name: 'Engineering Services', url: '/marketplace/search?category=engineering', description: 'Aerospace engineering, consulting, and integration services' },
          { name: 'Data & Analytics', url: '/marketplace/search?category=data-analytics', description: 'Earth observation, space weather, and orbital data services' },
          { name: 'Insurance', url: '/marketplace/search?category=insurance', description: 'Launch insurance, in-orbit insurance, and liability coverage' },
        ]}
      />
      <FAQSchema items={[
        { question: 'How do I list services on the SpaceNexus marketplace?', answer: 'Service providers can create listings through the Provider Dashboard. Listings include company details, service descriptions, pricing, certifications, and verification badges. Basic listings are free.' },
        { question: 'What types of space services are listed?', answer: 'The marketplace covers 10 categories including Launch Services, Satellite Manufacturing, Ground Station Services, Space Insurance, Mission Operations, Testing and Qualification, Consulting, Data and Analytics, Components and Materials, and Workforce and Recruitment.' },
        { question: 'How does the RFQ process work?', answer: 'Submit a Request for Quote describing your needs, budget range, and timeline. Our AI-powered matching system identifies qualified providers based on capabilities, certifications, and past performance. Providers can submit proposals with pricing and technical details.' },
      ]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
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

        {/* Hero */}
        <div className="text-center space-y-4">
          <AnimatedPageHeader
            title="Space Industry Marketplace"
            subtitle="Connect with verified providers, submit RFQs, and procure space services"
          />
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link href="/marketplace/search">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-slate-200 to-blue-600 hover:from-white hover:to-blue-500 text-white rounded-lg font-semibold transition-all"
              >
                Browse Services
              </motion.button>
            </Link>
            <Link href="/marketplace/rfq/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 min-h-[44px] bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg font-semibold transition-all"
              >
                Post an RFQ
              </motion.button>
            </Link>
            <Link href="/marketplace/copilot">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-purple-500/20 to-white/10 border border-purple-500/30 text-purple-300 hover:border-purple-400/50 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <span>🤖</span> AI Copilot
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Providers', value: stats.activeProviders, color: 'text-slate-300' },
                { label: 'Service Listings', value: stats.activeListings, color: 'text-emerald-400' },
                { label: 'Open RFQs', value: stats.openRFQs, color: 'text-yellow-400' },
                { label: 'Proposals Submitted', value: stats.totalProposals, color: 'text-white/70' },
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

        {/* Featured Listings */}
        {featuredListings.length > 0 && (
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
        )}

        {/* Ad between listings and RFQs */}
        <div>
          <AdSlot position="in_feed" module="marketplace" adsenseSlot="in_feed_mktplace" adsenseFormat="rectangle" />
        </div>

        {/* Recent RFQs */}
        {recentRFQs.length > 0 && (
          <ScrollReveal>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Open RFQs</h2>
                <Link href="/marketplace/search?tab=rfqs" className="text-xs text-slate-300 hover:text-white">
                  View All →
                </Link>
              </div>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentRFQs.map((rfq, i) => (
                  <StaggerItem key={rfq.id}>
                    <RFQCard rfq={rfq} index={i} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScrollReveal>
        )}

        {/* How It Works */}
        <ScrollReveal>
          <div className="card p-8">
            <h2 className="text-lg font-semibold text-white text-center mb-6">How It Works</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '1',
                  title: 'Post Your Requirements',
                  desc: 'Submit an RFQ describing what you need. Our algorithm matches you with qualified providers.',
                  icon: '📝',
                },
                {
                  step: '2',
                  title: 'Receive Proposals',
                  desc: 'Matched providers submit proposals with pricing, timelines, and technical approaches.',
                  icon: '📬',
                },
                {
                  step: '3',
                  title: 'Award & Procure',
                  desc: 'Compare proposals and shortlist candidates. Secure contract awarding with integrated payments coming soon.',
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
            Claim your company profile, list your services, and start receiving RFQs from buyers worldwide.
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
              { name: 'Business Opportunities', description: 'Contracts, RFPs, and procurement', href: '/business-opportunities', icon: '📋' },
              { name: 'Space Talent Hub', description: 'Hire or find jobs in the space industry', href: '/space-talent', icon: '👥' },
                ]}
              />
            </ScrollReveal>

      </div>
    </div>
    </PullToRefresh>
  );
}
