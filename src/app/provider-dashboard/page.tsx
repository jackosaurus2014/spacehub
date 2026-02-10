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


function DashboardContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [company, setCompany] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rfqMatches, setRfqMatches] = useState<any[]>([]);
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
            const [listRes, reviewRes] = await Promise.all([
              fetch(`/api/marketplace/listings?companyId=${myCompany.id}`),
              fetch(`/api/marketplace/reviews?companyId=${myCompany.id}`),
            ]);

            if (listRes.ok) {
              const d = await listRes.json();
              setListings(d.listings || []);
            }
            if (reviewRes.ok) {
              const d = await reviewRes.json();
              setReviews(d.reviews || []);
            }
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
          <Link href="/auth/signin" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
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
    { key: 'proposals', label: 'Proposals' },
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
            { label: 'Reviews', value: reviews.length, color: 'text-purple-400' },
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
              <Link href="/marketplace/rfq/new" className="card p-5 hover:ring-1 hover:ring-cyan-500 transition-all">
                <div className="text-2xl mb-2">📝</div>
                <div className="text-sm font-semibold text-white">Create Service Listing</div>
                <div className="text-xs text-slate-400 mt-1">List a new service on the marketplace</div>
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
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm text-slate-400 mb-4">You haven't created any listings yet.</p>
                <button className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Create Your First Listing
                </button>
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
                <p className="text-sm text-slate-400">No reviews yet. Complete transactions to build your reputation.</p>
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
