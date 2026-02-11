'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import RFQCard from '@/components/marketplace/RFQCard';
import { MARKETPLACE_CATEGORIES, CERTIFICATION_OPTIONS, VERIFICATION_LEVELS } from '@/lib/marketplace-types';
import SaveSearchButton from '@/components/watchlist/SaveSearchButton';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get('tab') || 'listings');
  const [listings, setListings] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [certFilter, setCertFilter] = useState<string[]>([]);
  const [verFilter, setVerFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (priceMin) params.set('priceMin', priceMin);
      if (priceMax) params.set('priceMax', priceMax);
      if (certFilter.length > 0) params.set('certifications', certFilter.join(','));
      if (verFilter) params.set('verification', verFilter);
      params.set('sort', sort);
      params.set('limit', '20');
      params.set('offset', String((page - 1) * 20));

      const res = await fetch(`/api/marketplace/listings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      setLoading(false);
    }
  }, [category, priceMin, priceMax, certFilter, verFilter, sort, page]);

  const fetchRFQs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('status', 'open');
      params.set('limit', '20');
      params.set('offset', String((page - 1) * 20));

      const res = await fetch(`/api/marketplace/rfq?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRfqs(data.rfqs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch RFQs', err);
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    if (tab === 'listings') fetchListings();
    else fetchRFQs();
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [tab, fetchListings, fetchRFQs]);

  const toggleCert = (cert: string) => {
    setCertFilter((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Marketplace Search"
          subtitle="Find space services, components, and providers"
        />

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 w-fit mb-6">
          {[
            { key: 'listings', label: 'Service Listings' },
            { key: 'rfqs', label: 'Open RFQs' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className={`w-56 flex-shrink-0 space-y-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            {/* Category */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</h4>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">All Categories</option>
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>

            {tab === 'listings' && (
              <>
                {/* Price Range */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Price Range</h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Verification */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Verification</h4>
                  <select
                    value={verFilter}
                    onChange={(e) => { setVerFilter(e.target.value); setPage(1); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Any Level</option>
                    {Object.entries(VERIFICATION_LEVELS).filter(([k]) => k !== 'none').map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                </div>

                {/* Certifications */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Certifications</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {CERTIFICATION_OPTIONS.map((cert) => (
                      <label key={cert.value} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={certFilter.includes(cert.value)}
                          onChange={() => toggleCert(cert.value)}
                          className="rounded bg-slate-700 border-slate-600 text-cyan-500"
                        />
                        {cert.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Results */}
          <div ref={resultsRef} className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-400">
                {total} result{total !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <SaveSearchButton
                  searchType={tab === 'rfqs' ? 'marketplace_rfqs' : 'marketplace_listings'}
                  filters={{ category, priceMin, priceMax, certifications: certFilter.join(','), verification: verFilter, sort }}
                />
                {tab === 'listings' && (
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                )}
                <div className="flex bg-slate-800 rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1.5 text-xs ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1.5 text-xs ${viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : tab === 'listings' ? (
              listings.length > 0 ? (
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'space-y-3'
                }>
                  {listings.map((listing, i) => (
                    <MarketplaceCard key={listing.id} listing={listing} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-4xl mb-3">📦</div>
                  <div className="text-slate-400 text-sm">No listings found matching your filters.</div>
                </div>
              )
            ) : rfqs.length > 0 ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'space-y-3'
              }>
                {rfqs.map((rfq, i) => (
                  <RFQCard key={rfq.id} rfq={rfq} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">📋</div>
                <div className="text-slate-400 text-sm">No open RFQs found.</div>
              </div>
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-400">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <SearchContent />
    </Suspense>
  );
}
