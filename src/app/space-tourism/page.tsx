'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TourismCard from '@/components/tourism/TourismCard';
import ComparisonModal from '@/components/tourism/ComparisonModal';
import {
  SpaceTourismOffering,
  EXPERIENCE_TYPES,
  TOURISM_PROVIDERS,
  TOURISM_STATUS_LABELS,
  ExperienceType,
} from '@/lib/space-tourism-data';

// Price range options
const PRICE_RANGES = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under $500K', min: 0, max: 500000 },
  { label: '$500K - $10M', min: 500000, max: 10000000 },
  { label: '$10M - $60M', min: 10000000, max: 60000000 },
  { label: 'Over $50M', min: 50000000, max: undefined },
];

// Detail Modal Component
function DetailModal({
  isOpen,
  onClose,
  offering,
}: {
  isOpen: boolean;
  onClose: () => void;
  offering: SpaceTourismOffering | null;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !offering) return null;

  const statusInfo = TOURISM_STATUS_LABELS[offering.status];
  const experienceInfo = EXPERIENCE_TYPES.find((e) => e.value === offering.experienceType);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)'
        }}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl font-bold text-cyan-400 border border-slate-600/50">
                {offering.logoIcon}
              </div>
              <div>
                <p className="text-cyan-400 text-sm font-medium">{offering.provider}</p>
                <h2 className="text-2xl font-display font-bold text-white">{offering.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-medium">
                    <span>{experienceInfo?.icon}</span>
                    {experienceInfo?.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price & Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Price</p>
              <p className="text-cyan-400 font-bold text-xl">{offering.priceDisplay}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Duration</p>
              <p className="text-white font-semibold">{offering.duration}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Altitude</p>
              <p className="text-white font-semibold">{offering.altitudeDisplay}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Passengers</p>
              <p className="text-white font-semibold">{offering.maxPassengers}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-white font-semibold mb-2">About This Experience</h3>
            <p className="text-slate-300 leading-relaxed">{offering.description}</p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-white font-semibold mb-3">What's Included</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {offering.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-white font-semibold mb-3">Requirements</h3>
            <div className="space-y-2">
              {offering.requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-slate-400">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Details */}
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Mission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Vehicle:</span>
                <span className="text-white ml-2">{offering.vehicleName}</span>
              </div>
              <div>
                <span className="text-slate-400">Launch Site:</span>
                <span className="text-white ml-2">{offering.launchSite}</span>
              </div>
              <div>
                <span className="text-slate-400">Training:</span>
                <span className="text-white ml-2">{offering.trainingDuration}</span>
              </div>
              <div>
                <span className="text-slate-400">First Flight:</span>
                <span className="text-white ml-2">{offering.firstFlight || 'TBD'}</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <a
            href={offering.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-center hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25"
          >
            Visit {offering.provider} Website
          </a>
        </div>
      </div>
    </div>
  );
}

// Main Content Component
function SpaceTourismContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [offerings, setOfferings] = useState<SpaceTourismOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [detailOffering, setDetailOffering] = useState<SpaceTourismOffering | null>(null);

  // Filters from URL
  const providerFilter = searchParams.get('provider') || '';
  const experienceFilter = (searchParams.get('experience') || '') as ExperienceType | '';
  const priceRangeIndex = parseInt(searchParams.get('priceRange') || '0');

  // URL update helper
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (!value || value === '0') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Filter handlers
  const handleProviderChange = (provider: string) => {
    updateUrl({ provider });
  };

  const handleExperienceChange = (experience: string) => {
    updateUrl({ experience });
  };

  const handlePriceRangeChange = (index: string) => {
    updateUrl({ priceRange: index });
  };

  // Comparison handlers
  const handleToggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleRemoveFromCompare = (id: string) => {
    setSelectedForCompare((prev) => prev.filter((i) => i !== id));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (providerFilter) params.set('provider', providerFilter);
        if (experienceFilter) params.set('experienceType', experienceFilter);

        const priceRange = PRICE_RANGES[priceRangeIndex];
        if (priceRange.min !== undefined) params.set('minPrice', priceRange.min.toString());
        if (priceRange.max !== undefined) params.set('maxPrice', priceRange.max.toString());

        const res = await fetch(`/api/space-tourism?${params.toString()}`);
        const data = await res.json();

        if (!data.error) {
          setOfferings(data.offerings || []);
        }
      } catch (error) {
        console.error('Failed to fetch space tourism data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerFilter, experienceFilter, priceRangeIndex]);

  // Get selected offerings for comparison
  const comparisonOfferings = offerings.filter((o) => selectedForCompare.includes(o.id));

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Tourism Marketplace"
          subtitle="Compare and explore commercial space travel experiences from leading providers"
          icon="🎫"
          accentColor="purple"
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div
              className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 mb-8"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)'
              }}
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Provider Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-slate-400 text-xs mb-1.5">Provider</label>
                  <select
                    value={providerFilter}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">All Providers</option>
                    {TOURISM_PROVIDERS.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Type Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-slate-400 text-xs mb-1.5">Experience Type</label>
                  <select
                    value={experienceFilter}
                    onChange={(e) => handleExperienceChange(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">All Types</option>
                    {EXPERIENCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-slate-400 text-xs mb-1.5">Price Range</label>
                  <select
                    value={priceRangeIndex}
                    onChange={(e) => handlePriceRangeChange(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    {PRICE_RANGES.map((range, i) => (
                      <option key={i} value={i}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compare Button */}
                <div className="flex items-end">
                  <button
                    onClick={() => setShowComparison(true)}
                    disabled={selectedForCompare.length < 2}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedForCompare.length >= 2
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Compare ({selectedForCompare.length})
                  </button>
                </div>
              </div>

              {/* Selected for comparison indicator */}
              {selectedForCompare.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 text-sm">Selected:</span>
                    {selectedForCompare.map((id) => {
                      const offering = offerings.find((o) => o.id === id);
                      if (!offering) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/30"
                        >
                          {offering.name}
                          <button
                            onClick={() => handleToggleCompare(id)}
                            className="hover:text-white transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                    <button
                      onClick={() => setSelectedForCompare([])}
                      className="text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div
                className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
              >
                <div className="text-2xl font-display font-bold text-cyan-400">
                  {offerings.length}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Experiences
                </div>
              </div>
              <div
                className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
              >
                <div className="text-2xl font-display font-bold text-green-400">
                  {offerings.filter((o) => o.status === 'active').length}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Active Programs
                </div>
              </div>
              <div
                className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
              >
                <div className="text-2xl font-display font-bold text-white">
                  $125K
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Starting From
                </div>
              </div>
              <div
                className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
              >
                <div className="text-2xl font-display font-bold text-purple-400">
                  5
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Providers
                </div>
              </div>
            </div>

            {/* Offerings Grid */}
            {offerings.length === 0 ? (
              <div
                className="backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
              >
                <span className="text-6xl block mb-4">🚀</span>
                <h3 className="text-xl font-semibold text-white mb-2">No Experiences Found</h3>
                <p className="text-slate-400">
                  Try adjusting your filters to see more space tourism options.
                </p>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offerings.map((offering) => (
                  <StaggerItem key={offering.id}>
                    <TourismCard
                      offering={offering}
                      isSelected={selectedForCompare.includes(offering.id)}
                      onToggleCompare={handleToggleCompare}
                      onLearnMore={setDetailOffering}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {/* Experience Type Guide */}
            <ScrollReveal><div
              className="mt-12 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
              style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)' }}
            >
              <h3 className="text-lg font-display font-bold text-white mb-4">
                Understanding Space Tourism Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {EXPERIENCE_TYPES.map((type) => (
                  <div key={type.value} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <h4 className="text-white font-semibold text-sm mb-1">{type.label}</h4>
                    <p className="text-slate-400 text-xs">{type.description}</p>
                  </div>
                ))}
              </div>
            </div></ScrollReveal>

            {/* Disclaimer */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm">
                Prices and availability are subject to change. All information is provided for educational purposes.
                Please visit official provider websites for the most current details.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        offerings={comparisonOfferings}
        onRemove={handleRemoveFromCompare}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!detailOffering}
        onClose={() => setDetailOffering(null)}
        offering={detailOffering}
      />
    </div>
  );
}

// Main Page with Suspense
export default function SpaceTourismPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Space Tourism Marketplace"
              subtitle="Compare and explore commercial space travel experiences from leading providers"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Tourism' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <SpaceTourismContent />
    </Suspense>
  );
}
