'use client';

import { useEffect } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * Hook for swiping between tabs on merged pages.
 * On left swipe: go to next tab.
 * On right swipe: go to previous tab.
 *
 * Only active on mobile devices.
 */
export function useSwipeTabs(
  tabs: string[],
  currentTab: string,
  onTabChange: (tab: string) => void
) {
  const isMobile = useIsMobile();
  const { direction } = useSwipeGesture({
    enabled: isMobile,
    minDistance: 80,
    maxVerticalDeviation: 100,
    minVelocity: 0.25,
  });

  useEffect(() => {
    if (!direction || tabs.length < 2) return;

    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  }, [direction, tabs, currentTab, onTabChange]);
}
