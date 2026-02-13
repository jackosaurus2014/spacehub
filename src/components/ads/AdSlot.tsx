'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSubscription } from '@/components/SubscriptionProvider';
import NativeAd from './NativeAd';
import AdBanner from './AdBanner';

interface ServedAd {
  placementId: string;
  campaignId: string;
  position: string;
  format: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string;
  ctaText: string | null;
  advertiserName: string;
  advertiserLogo: string | null;
}

interface AdSlotProps {
  /** Ad position: "top_banner", "sidebar", "in_feed", "footer", "interstitial" */
  position: string;
  /** Current module ID for targeting */
  module?: string;
  /** Additional CSS classes */
  className?: string;
  /** AdSense slot ID for fallback when no custom ad is available */
  adsenseSlot?: string;
  /** AdSense format for fallback. Defaults to 'responsive'. */
  adsenseFormat?: 'horizontal' | 'rectangle' | 'responsive';
}

/**
 * Universal ad slot component with hybrid waterfall:
 *
 * 1. Check ad-free tier (Pro/Enterprise) → render nothing
 * 2. Try custom ad from /api/ads/serve → render if found
 * 3. Fall back to Google AdSense (if configured) → render AdBanner
 * 4. Neither available → render nothing (no empty containers)
 */
export default function AdSlot({ position, module, className = '', adsenseSlot, adsenseFormat = 'responsive' }: AdSlotProps) {
  const { canUseFeature, isLoading: subLoading } = useSubscription();
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check ad-free status
  const isAdFree = canUseFeature('adFree');

  // Fetch ad from serve endpoint
  const fetchAd = useCallback(async () => {
    if (isAdFree) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ position });
      if (module) params.set('module', module);

      const res = await fetch(`/api/ads/serve?${params.toString()}`);

      if (res.status === 204) {
        // No ad available
        setAd(null);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setAd(data.data);
        }
      }
    } catch {
      // Silently fail -- ads should never break the page
    } finally {
      setLoading(false);
    }
  }, [position, module, isAdFree]);

  useEffect(() => {
    if (!subLoading) {
      fetchAd();
    }
  }, [fetchAd, subLoading]);

  // Track impression when ad becomes visible
  useEffect(() => {
    if (!ad || impressionTracked || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked) {
            setImpressionTracked(true);
            // Fire impression tracking
            fetch('/api/ads/impression', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                placementId: ad.placementId,
                campaignId: ad.campaignId,
                type: 'impression',
                module,
              }),
            }).catch(() => {
              // Silently fail
            });
          }
        });
      },
      { threshold: 0.5 } // At least 50% visible
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [ad, impressionTracked, module]);

  // Track click
  const handleClick = useCallback(() => {
    if (!ad) return;

    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placementId: ad.placementId,
        campaignId: ad.campaignId,
        type: 'click',
        module,
      }),
    }).catch(() => {
      // Silently fail
    });
  }, [ad, module]);

  // Ad-free users see nothing
  if (isAdFree) {
    return null;
  }

  // While loading subscription or custom ad, show nothing (no layout shift)
  if (loading || subLoading) {
    return null;
  }

  // No custom ad available — try AdSense fallback
  if (!ad) {
    if (adsenseSlot) {
      return (
        <AdBanner
          slot={adsenseSlot}
          format={adsenseFormat}
          className={className}
        />
      );
    }
    return null;
  }

  // Render native card format
  if (ad.format === 'native_card') {
    return (
      <div ref={containerRef} className={className} onClick={handleClick}>
        <NativeAd
          title={ad.title || 'Sponsored Content'}
          description={ad.description || ''}
          image={ad.imageUrl || undefined}
          link={ad.linkUrl}
          sponsor={ad.advertiserName}
        />
      </div>
    );
  }

  // Render banner format (custom ad from database)
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Ad label */}
      <div className="absolute top-1 right-1 z-10">
        <span className="bg-slate-900/80 backdrop-blur-sm text-slate-400 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider">
          Ad
        </span>
      </div>

      <a
        href={ad.linkUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={handleClick}
        className="block overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-200 group"
      >
        {ad.imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt={ad.title || 'Advertisement'}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              style={{
                maxHeight: ad.format === 'banner_300x250' ? '250px' : '90px',
              }}
            />
            {ad.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-3">
                <p className="text-slate-200 text-sm font-medium">{ad.title}</p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center p-4"
            style={{
              minHeight: ad.format === 'banner_300x250' ? '250px' : '90px',
            }}
          >
            {ad.title && (
              <p className="text-slate-200 text-sm font-medium text-center mb-1">
                {ad.title}
              </p>
            )}
            {ad.description && (
              <p className="text-slate-400 text-xs text-center line-clamp-2 mb-2">
                {ad.description}
              </p>
            )}
            {ad.ctaText && (
              <span className="text-cyan-400 text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                {ad.ctaText}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </div>
        )}

        {/* Sponsor attribution */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700/50 bg-slate-900/80">
          <div className="flex items-center gap-2">
            {ad.advertiserLogo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.advertiserLogo}
                alt={ad.advertiserName}
                className="w-4 h-4 rounded object-contain"
              />
            )}
            <span className="text-slate-400 text-[10px]">
              Sponsored by <span className="text-slate-300 font-medium">{ad.advertiserName}</span>
            </span>
          </div>
          {ad.ctaText && (
            <span className="text-cyan-400 text-[10px] font-medium">
              {ad.ctaText}
            </span>
          )}
        </div>
      </a>
    </div>
  );
}
