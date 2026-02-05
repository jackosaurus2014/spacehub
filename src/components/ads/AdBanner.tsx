'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'horizontal' | 'rectangle' | 'responsive';
  className?: string;
}

// AdSense configuration - set to true once AdSense is approved and configured
const ADSENSE_ENABLED = false;
const ADSENSE_CLIENT_ID = 'ca-pub-XXXXXXXXXXXXXXXXX'; // Replace with your AdSense publisher ID

export default function AdBanner({ slot, format = 'responsive', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Determine ad dimensions based on format
  const getAdStyle = () => {
    switch (format) {
      case 'horizontal':
        return { minHeight: '90px', maxHeight: '90px' };
      case 'rectangle':
        return { minHeight: '250px', maxHeight: '250px' };
      case 'responsive':
      default:
        return { minHeight: '100px' };
    }
  };

  const getAdFormat = () => {
    switch (format) {
      case 'horizontal':
        return 'horizontal';
      case 'rectangle':
        return 'rectangle';
      case 'responsive':
      default:
        return 'auto';
    }
  };

  useEffect(() => {
    if (!ADSENSE_ENABLED || initialized.current) return;

    try {
      // Push ad to AdSense
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
        initialized.current = true;
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  const adStyle = getAdStyle();

  // Placeholder shown when AdSense is not configured
  if (!ADSENSE_ENABLED) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm ${className}`}
        style={adStyle}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Subtle grid pattern background */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center px-4">
            <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">
              Advertisement
            </p>
            <p className="text-slate-600 text-[10px] mt-1">
              Ad space available
            </p>
          </div>

          {/* Decorative corner accents */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-slate-600/30" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-slate-600/30" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-slate-600/30" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-slate-600/30" />
        </div>
      </div>
    );
  }

  // Real AdSense ad unit
  return (
    <div ref={adRef} className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...adStyle }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={getAdFormat()}
        data-full-width-responsive={format === 'responsive' ? 'true' : 'false'}
      />
    </div>
  );
}
