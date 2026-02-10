'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PriceDisplay from '@/components/marketplace/PriceDisplay';
import VerificationBadge from '@/components/marketplace/VerificationBadge';
import ReviewCard from '@/components/marketplace/ReviewCard';
import ReviewForm from '@/components/marketplace/ReviewForm';
import RatingDistribution from '@/components/marketplace/RatingDistribution';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';
import { getCategoryIcon, getCategoryLabel, getSubcategoryLabel } from '@/lib/marketplace-types';

export default function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/marketplace/listings/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load listing');
        }
        setData(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-slate-400">{error || 'Listing not found'}</div>
          <Link href="/marketplace/search" className="text-cyan-400 text-sm hover:underline mt-2 block">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const listing = data.listing;
  const reviews = data.reviews || [];
  const avgRating = data.avgRating;
  const similar = data.similarListings || [];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back */}
        <Link href="/marketplace/search" className="text-xs text-cyan-400 hover:text-cyan-300">
          ← Back to Search
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>{getCategoryIcon(listing.category)}</span>
                <span className="text-xs text-slate-400">{getCategoryLabel(listing.category)}</span>
                {listing.subcategory && (
                  <>
                    <span className="text-slate-600 text-xs">/</span>
                    <span className="text-xs text-slate-400">{getSubcategoryLabel(listing.category, listing.subcategory)}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{listing.name}</h1>
              <div className="flex items-center gap-3">
                <PriceDisplay
                  pricingType={listing.pricingType}
                  priceMin={listing.priceMin}
                  priceMax={listing.priceMax}
                  priceUnit={listing.priceUnit}
                />
                {avgRating && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-500">({reviews.length})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Editorial Banner */}
            {listing.isEditorial && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 flex items-start gap-3">
                <span className="text-lg">📋</span>
                <div>
                  <div className="text-sm font-medium text-purple-300">Editorial Listing</div>
                  <p className="text-xs text-slate-400 mt-1">
                    This listing was curated by SpaceNexus from public data. Are you the provider?{' '}
                    <Link href={`/company-profiles/${listing.company.slug}`} className="text-cyan-400 hover:underline">
                      Claim this profile
                    </Link>{' '}
                    to manage and verify this listing.
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {listing.description || 'No description provided.'}
              </p>
            </div>

            {/* Specifications */}
            {listing.specifications && Object.keys(listing.specifications).length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Specifications</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(listing.specifications).map(([key, val]) => (
                    <div key={key} className="bg-slate-800/50 rounded p-2">
                      <div className="text-[10px] text-slate-500 uppercase">{key}</div>
                      <div className="text-xs text-slate-300">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {listing.certifications?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.certifications.map((cert: string) => (
                    <span key={cert} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </h3>
                {!showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {/* Rating Distribution */}
              {reviews.length > 0 && (
                <div className="mb-4">
                  <RatingDistribution reviews={reviews} avgRating={avgRating} />
                </div>
              )}

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-4">
                  <ReviewForm
                    companyId={listing.companyId}
                    onSuccess={() => {
                      setShowReviewForm(false);
                      // Reload data
                      fetch(`/api/marketplace/listings/${encodeURIComponent(slug)}`).then(r => r.json()).then(setData);
                    }}
                  />
                </div>
              )}

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review: any) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="card p-4 text-center text-sm text-slate-500">
                  No reviews yet. Be the first to review this provider.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Provider Card */}
            <div className="card p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Provider</h3>
              <Link href={`/company-profiles/${listing.company.slug}`} className="block group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                    {listing.company.logoUrl ? (
                      <img src={listing.company.logoUrl} alt={`${listing.company.name} logo`} className="w-10 h-10 rounded-lg object-contain" />
                    ) : (
                      listing.company.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      {listing.company.name}
                    </div>
                    <VerificationBadge level={listing.company.verificationLevel} />
                  </div>
                </div>
              </Link>

              {listing.company.contactEmail && (
                <a
                  href={`mailto:${listing.company.contactEmail}`}
                  className="block w-full text-center py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors mb-2"
                >
                  Contact Provider
                </a>
              )}

              <Link href={`/marketplace/rfq/new?category=${listing.category}`}>
                <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors">
                  Request a Quote
                </button>
              </Link>

              <button
                disabled
                title="Direct hiring with secure payments coming soon"
                className="w-full py-2 bg-slate-800/50 text-slate-500 text-sm rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                Hire Directly <ComingSoonBadge />
              </button>
            </div>

            {/* Quick Details */}
            <div className="card p-5 space-y-3">
              <h3 className="text-xs text-slate-500 uppercase tracking-wider">Details</h3>
              {listing.leadTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lead Time</span>
                  <span className="text-white">{listing.leadTime}</span>
                </div>
              )}
              {listing.capacity && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Capacity</span>
                  <span className="text-white">{listing.capacity}</span>
                </div>
              )}
              {listing.coverageArea && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Coverage</span>
                  <span className="text-white">{listing.coverageArea}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Views</span>
                <span className="text-white">{listing.viewCount}</span>
              </div>
            </div>

            {/* Similar Listings */}
            {similar.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Similar Services</h3>
                <div className="space-y-3">
                  {similar.slice(0, 3).map((s: any, i: number) => (
                    <MarketplaceCard key={s.id} listing={s} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
