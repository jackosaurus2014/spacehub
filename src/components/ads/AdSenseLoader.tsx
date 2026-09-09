'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useSubscription } from '@/components/SubscriptionProvider';

/**
 * Loads the AdSense script only where ads belong.
 *
 * The script used to sit unconditionally in the root layout, so Google's
 * page-level ads (anchor bars, vignettes) could appear for every visitor on
 * every route — including Pro and trial members who are promised an ad-free
 * site on /pricing, and inside the Space Tycoon command deck, where an
 * anchor bar was found sitting over the outliner (2026-09-09 audit).
 *
 * Rules: never on an ad-free tier (Pro, and an active trial resolves to Pro),
 * never while the tier is still unknown, never on the routes below.
 */
export const AD_FREE_ROUTE_PREFIXES = [
  '/space-tycoon',
  '/embed',
  '/widgets',
  '/admin',
  '/checkout',
  '/account',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unsubscribe',
];

export function adsAllowedOnRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return !AD_FREE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function AdSenseLoader() {
  const pathname = usePathname();
  const { tier, isLoading } = useSubscription();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId || isLoading || tier !== 'free' || !adsAllowedOnRoute(pathname)) return null;
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
