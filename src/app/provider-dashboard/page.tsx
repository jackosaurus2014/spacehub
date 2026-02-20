'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import ProposalCard from '@/components/marketplace/ProposalCard';
import ReviewCard from '@/components/marketplace/ReviewCard';
import VerificationBadge from '@/components/marketplace/VerificationBadge';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';


function DashboardContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [company, setCompany] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rfqMatches, setRfqMatches] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Check if user has a claimed company
        const profileRes = await fetch('/api/auth/session');
        if (!profileRes.ok) {
          setNotAuthed(true);
          return;
        }
        const session = await profileRes.json();
        if (!session?.user) {
          setNotAuthed(true);
          return;
        }

        // Try loading company data
        const companyRes = await fetch(`/api/company-profiles?claimedByMe=true`);
        if (companyRes.ok) {
          const data = await companyRes.json();
          const myCompany = data.companies?.[0];
          if (myCompany) {
            setCompany(myCompany);

            // Load all data in parallel
            const [listRes, reviewRes, proposalRes] = await Promise.all([
              fetch(`/api/marketplace/listings?companyId=${myCompany.id}`),
              fetch(`/api/marketplace/reviews?companyId=${myCompany.id}`),
              fetch(`/api/marketplace/proposals?companyId=${myCompany.id}`),
            ]);

            if (listRes.ok) {
              const d = await listRes.json();
              setListings(d.listings || []);
            }
            if (reviewRes.ok) {
              const d = await reviewRes.json();
              setReviews(d.reviews || []);
            }
            if (proposalRes.ok) {
              const d = await proposalRes.json();
              setProposals(d.proposals || []);
            }

            // Load verification status
            try {
              const verifyRes = await fetch('/api/marketplace/verify');
              if (verifyRes.ok) {
                setVerification(await verifyRes.json());
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (notAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold text-white">Sign in Required</h2>
          <p className="text-sm text-slate-400">Please sign in to access the provider dashboard.</p>
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold text-white">Claim Your Company Profile</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            To use the provider dashboard, you need to claim a company profile first.
            Search for your company in our directory and claim it to start listing services and responding to RFQs.
          </p>
          <Link href="/company-profiles">
            <button className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors">
              Browse Company Profiles
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: `Listings (${listings.length})` },
    { key: 'proposals', label: `Proposals (${proposals.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <AnimatedPageHeader
              title="Provider Dashboard"
              subtitle={`Managing ${company.name}`}
            />
          </div>
          <Link href={`/company-profiles/${company.slug}`}>
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
              View Public Profile
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Listings', value: listings.filter((l) => l.status === 'active').length, color: 'text-cyan-400' },
            { label: 'Total Views', value: listings.reduce((s, l) => s + (l.viewCount || 0), 0), color: 'text-emerald-400' },
            { label: 'Avg Rating', value: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1) : 'N/A', color: 'text-yellow-400' },
            { label: 'Proposals', value: proposals.length, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card p-4 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/marketplace/search" className="card p-5 hover:ring-1 hover:ring-cyan-500 transition-all">
                <div className="text-2xl mb-2">🏪</div>
                <div className="text-sm font-semibold text-white">Browse Marketplace</div>
                <div className="text-xs text-slate-400 mt-1">Explore services and find opportunities</div>
              </Link>
              <Link href="/marketplace/search?tab=rfqs" className="card p-5 hover:ring-1 hover:ring-cyan-500 transition-all">
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm font-semibold text-white">Browse Open RFQs</div>
                <div className="text-xs text-slate-400 mt-1">Find and respond to buyer requests</div>
              </Link>
              <Link href={`/company-profiles/${company.slug}`} className="card p-5 hover:ring-1 hover:ring-cyan-500 transition-all">
                <div className="text-2xl mb-2">🏢</div>
                <div className="text-sm font-semibold text-white">Edit Company Profile</div>
                <div className="text-xs text-slate-400 mt-1">Update your company information</div>
              </Link>
            </div>

            {/* Verification Status */}
            {verification && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Verification Status</h3>
                  <VerificationBadge level={verification.currentLevel} size="md" />
                </div>
                {verification.criteria && (
                  <div className="space-y-2">
                    {[
                      { key: 'claimed', label: 'Company profile claimed', level: 'Identity' },
                      { key: 'hasThreeListingsWithCerts', label: '3+ certified service listings', level: 'Capability' },
                      { key: 'hasSamRegistration', label: 'SAM.gov / CAGE code registered', level: 'Capability' },
                      { key: 'hasGovContract', label: 'Government contract on record', level: 'Capability' },
                      { key: 'fivePlusReviews', label: '5+ published reviews', level: 'Performance' },
                      { key: 'avgRatingAboveFour', label: 'Average rating >= 4.0', level: 'Performance' },
                      { key: 'hasAwardedRfq', label: 'At least 1 awarded RFQ', level: 'Performance' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        <span className={verification.criteria[item.key] ? 'text-green-400' : 'text-slate-600'}>
                          {verification.criteria[item.key] ? '✓' : '○'}
                        </span>
                        <span className={verification.criteria[item.key] ? 'text-slate-300' : 'text-slate-500'}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto">{item.level}</span>
                      </div>
                    ))}
                  </div>
                )}
                {verification.canUpgrade && (
                  <div className="mt-3 text-xs text-cyan-400 bg-cyan-500/10 rounded p-2 text-center">
                    You qualify for a verification upgrade! It will be applied automatically.
                  </div>
                )}
              </div>
            )}

            {/* Recent Listings */}
            {listings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Your Listings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.slice(0, 3).map((listing, i) => (
                    <MarketplaceCard key={listing.id} listing={listing} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Recent Reviews</h3>
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            )}

            {/* Coming Soon Features */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                Coming Soon <ComingSoonBadge />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '💰', title: 'Revenue Tracking', desc: 'Track platform-facilitated transactions, invoices, and payouts' },
                  { icon: '📊', title: 'Proposal Analytics', desc: 'Win/loss rates, competitive benchmarking, and market demand trends' },
                  { icon: '📄', title: 'Contract Manager', desc: 'Milestone tracking, change orders, and SLA monitoring' },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="card p-4 opacity-60 border-dashed border-slate-700"
                  >
                    <div className="text-xl mb-2">{feature.icon}</div>
                    <div className="text-xs font-semibold text-slate-300">{feature.title}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'listings' && (
          <div>
            {listings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing, i) => (
                  <MarketplaceCard key={listing.id} listing={listing} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No listings yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  List your space products and services to reach qualified buyers in the space industry marketplace.
                  Showcase your capabilities and start receiving inquiries.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/marketplace">
                    <button className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors">
                      Go to Marketplace
                    </button>
                  </Link>
                  <Link href="/marketplace/search?tab=rfqs">
                    <button className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                      Browse Open RFQs
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'proposals' && (
          <div>
            {proposals.length > 0 ? (
              <div className="space-y-3">
                {proposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📬</div>
                <p className="text-sm text-slate-400 mb-4">No proposals yet. Browse open RFQs to submit your first proposal.</p>
                <Link href="/marketplace/search?tab=rfqs">
                  <button className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Browse Open RFQs
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">⭐</div>
                <p className="text-sm text-slate-400">No reviews yet. Get reviews from your clients to build your reputation.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
