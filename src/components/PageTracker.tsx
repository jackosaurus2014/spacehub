'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

/**
 * Maps pathname to a user-friendly page title.
 * Uses the navigation items from the app for known routes,
 * and falls back to generating a title from the path itself.
 */
const PATH_TITLES: Record<string, string> = {
  '/': 'Home',
  '/mission-control': 'Mission Control',
  '/live': 'Live Launch Hub',
  '/solar-exploration': 'Solar Exploration',
  '/news': 'News',
  '/market-intel': 'Market Intel',
  '/blogs': 'Blogs',
  '/business-opportunities': 'Business Opportunities',
  '/space-tourism': 'Space Tourism',
  '/space-jobs': 'Space Talent & Experts',
  '/workforce': 'Space Workforce',
  '/supply-chain': 'Global Supply Chain',
  '/spectrum': 'Spectrum Tracker',
  '/space-insurance': 'Space Insurance',
  '/operational-awareness': 'Operational Awareness',
  '/mission-cost': 'Mission Cost Simulator',
  '/blueprints': 'Blueprint Series',
  '/resource-exchange': 'Resource Exchange',
  '/space-mining': 'Space Mining',
  '/compliance': 'Compliance',
  '/solar-flares': 'Solar Flares',
  '/debris-monitor': 'Debris Monitor',
  '/orbital-slots': 'Orbital Slots',
  '/launch-windows': 'Launch Windows',
  '/dashboard': 'Dashboard',
  '/pricing': 'Pricing',
  '/admin': 'Admin',
  '/login': 'Sign In',
  '/register': 'Register',
  '/satellites': 'Satellite Tracker',
  '/orbital-services': 'Orbital Services',
  '/contact': 'Contact',
  '/about': 'About',
};

function getTitleForPath(pathname: string): string | null {
  // Exact match
  if (PATH_TITLES[pathname]) return PATH_TITLES[pathname];

  // Skip auth-related and API routes from tracking
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) return null;

  // For dynamic routes, try to match the base path
  const basePath = '/' + pathname.split('/').filter(Boolean)[0];
  if (PATH_TITLES[basePath]) return PATH_TITLES[basePath];

  // Generate a readable title from the path as fallback
  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return null;
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Invisible component that tracks page views into localStorage.
 * Drop this into layout.tsx to enable automatic tracking.
 */
export default function PageTracker() {
  const pathname = usePathname();
  const { addPage } = useRecentlyViewed();

  useEffect(() => {
    if (!pathname) return;
    const title = getTitleForPath(pathname);
    if (title) {
      addPage(pathname, title);
    }
  }, [pathname, addPage]);

  return null;
}
