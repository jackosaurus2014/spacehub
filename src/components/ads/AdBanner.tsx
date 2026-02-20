'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'horizontal' | 'rectangle' | 'responsive';
  className?: string;
}

// Derive from env var — no hardcoded IDs
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';
const ADSENSE_ENABLED = !!ADSENSE_CLIENT_ID;

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
      // Silently fail — ads should never break the page
    }
  }, []);

  // When AdSense is not configured, render nothing
  if (!ADSENSE_ENABLED || !slot) {
    return null;
  }

  const adStyle = getAdStyle();

  // Real AdSense ad unit
  return (
    <div ref={adRef} className={`ad-container ${className}`} style={adStyle}>
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
