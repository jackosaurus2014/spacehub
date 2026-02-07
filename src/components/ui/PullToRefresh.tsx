'use client';

import { useCallback, type ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  /** Async callback invoked when the user pulls down past the threshold */
  onRefresh: () => Promise<void>;
  /** Content to wrap with pull-to-refresh behavior */
  children: ReactNode;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

/**
 * A wrapper component that adds pull-to-refresh behavior to its children.
 * Shows a spinner/arrow indicator that animates as the user pulls down.
 * Only activates when the page is scrolled to the top.
 */
export default function PullToRefresh({ onRefresh, children, enabled = true }: PullToRefreshProps) {
  const stableOnRefresh = useCallback(() => onRefresh(), [onRefresh]);

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: stableOnRefresh,
    threshold: 80,
    maxPull: 150,
    enabled,
  });

  const isVisible = isPulling || isRefreshing || pullDistance > 0;
  // Progress from 0 to 1 based on threshold
  const progress = Math.min(pullDistance / 80, 1);
  // Rotation of the arrow indicator based on pull progress
  const rotation = progress * 180;

  return (
    <div className="relative">
      {/* Pull indicator - positioned above the content */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden z-30 pointer-events-none"
        style={{
          top: 0,
          height: isVisible ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : '0px',
          transition: isPulling ? 'none' : 'height 0.3s ease-out',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            opacity: isVisible ? Math.max(progress, isRefreshing ? 1 : 0) : 0,
            transition: isPulling ? 'none' : 'opacity 0.3s ease-out',
          }}
        >
          {isRefreshing ? (
            /* Spinning indicator during refresh */
            <div className="relative w-8 h-8">
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{
                  border: '3px solid rgba(148, 163, 184, 0.2)',
                  borderTopColor: '#94a3b8',
                }}
              />
            </div>
          ) : (
            /* Arrow indicator during pull */
            <div
              className="flex flex-col items-center gap-1"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isPulling ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-slate-400"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
            </div>
          )}
          {/* Label text */}
          {!isRefreshing && progress >= 1 && (
            <span className="ml-2 text-xs text-slate-400 font-medium">Release to refresh</span>
          )}
          {isRefreshing && (
            <span className="ml-2 text-xs text-slate-400 font-medium">Refreshing...</span>
          )}
        </div>
      </div>

      {/* Content - shifted down when pulling */}
      <div
        style={{
          transform: isVisible ? `translateY(${isRefreshing ? 48 : pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
