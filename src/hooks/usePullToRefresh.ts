'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface PullToRefreshOptions {
  /** The callback to invoke when the user pulls far enough (default threshold: 80px) */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance in px for visual feedback (default: 150) */
  maxPull?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface PullToRefreshState {
  /** Whether the user is actively pulling down */
  isPulling: boolean;
  /** Current pull distance in px (clamped to maxPull) */
  pullDistance: number;
  /** Whether the refresh callback is currently executing */
  isRefreshing: boolean;
}

/**
 * Detects pull-down gesture at the top of the page.
 * Only activates when scrollTop === 0 to avoid interfering with normal scrolling.
 */
export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshState {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 150,
    enabled = true,
  } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  const touchStartY = useRef<number | null>(null);
  const isAtTop = useRef(false);
  const refreshingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || refreshingRef.current) return;

      // Only activate when at the very top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop <= 0) {
        isAtTop.current = true;
        touchStartY.current = e.touches[0].clientY;
      } else {
        isAtTop.current = false;
        touchStartY.current = null;
      }
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isAtTop.current || touchStartY.current === null || refreshingRef.current) {
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;

      // Only respond to downward pulls
      if (deltaY <= 0) {
        setState((prev) => {
          if (prev.isPulling) {
            return { ...prev, isPulling: false, pullDistance: 0 };
          }
          return prev;
        });
        return;
      }

      // Apply resistance: the further you pull, the harder it gets
      const resistedDistance = Math.min(deltaY * 0.5, maxPull);

      setState((prev) => ({
        ...prev,
        isPulling: true,
        pullDistance: resistedDistance,
      }));
    },
    [enabled, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || touchStartY.current === null) return;

    touchStartY.current = null;
    isAtTop.current = false;

    setState((prev) => {
      if (prev.pullDistance >= threshold && !refreshingRef.current) {
        // Trigger refresh
        refreshingRef.current = true;
        return { isPulling: false, pullDistance: threshold, isRefreshing: true };
      }
      return { ...prev, isPulling: false, pullDistance: 0 };
    });

    // Execute refresh if threshold was reached
    // We need to check via a microtask to get the latest state
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    if (refreshingRef.current) {
      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
        setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
    }
  }, [enabled, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
