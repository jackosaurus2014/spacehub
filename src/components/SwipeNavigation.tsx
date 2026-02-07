'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

/**
 * Detects swipe-right gestures on mobile to navigate back in history.
 * Shows a subtle visual edge indicator during the swipe.
 * Only active on mobile viewports and avoids interfering with
 * horizontal scrolling inside carousels, charts, and similar elements.
 */
export default function SwipeNavigation() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);

  // Check if the touch originated inside a horizontally-scrollable container
  // to avoid interfering with carousels, charts, tables, etc.
  const isInsideScrollable = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    let el: HTMLElement | null = target;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth
      ) {
        return true;
      }
      // Also check for explicit opt-out data attribute
      if (el.dataset.swipeIgnore !== undefined) return true;
      el = el.parentElement;
    }
    return false;
  }, []);

  // Track touch start target to check scrollable containers
  const touchTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isMobile) return;
    const handler = (e: TouchEvent) => {
      touchTargetRef.current = e.target;
    };
    document.addEventListener('touchstart', handler, { passive: true });
    return () => document.removeEventListener('touchstart', handler);
  }, [isMobile]);

  const { direction, swiping, deltaX } = useSwipeGesture({
    enabled: isMobile,
    minDistance: 80,
    maxVerticalDeviation: 60,
    minVelocity: 0.25,
  });

  // Show visual indicator during active right swipe
  useEffect(() => {
    if (!indicatorRef.current || !isMobile) return;

    if (swiping && deltaX > 0) {
      // Check if inside scrollable — suppress indicator
      if (isInsideScrollable(touchTargetRef.current)) {
        indicatorRef.current.style.opacity = '0';
        return;
      }

      const progress = Math.min(deltaX / 100, 1);
      indicatorRef.current.style.opacity = String(progress * 0.8);
      indicatorRef.current.style.transform = `translateX(${Math.min(deltaX * 0.15, 20)}px)`;
    } else {
      indicatorRef.current.style.opacity = '0';
      indicatorRef.current.style.transform = 'translateX(0)';
    }
  }, [swiping, deltaX, isMobile, isInsideScrollable]);

  // Handle completed swipe
  useEffect(() => {
    if (direction === 'right' && isMobile && !hasNavigated.current) {
      // Check if we were inside a scrollable container
      if (isInsideScrollable(touchTargetRef.current)) return;

      hasNavigated.current = true;
      router.back();
      // Reset after navigation
      setTimeout(() => {
        hasNavigated.current = false;
      }, 500);
    }
  }, [direction, isMobile, router, isInsideScrollable]);

  if (!isMobile) return null;

  return (
    /* Left-edge swipe indicator */
    <div
      ref={indicatorRef}
      aria-hidden="true"
      className="fixed left-0 top-0 bottom-0 w-8 z-[100] pointer-events-none"
      style={{
        opacity: 0,
        transform: 'translateX(0)',
        transition: swiping ? 'none' : 'opacity 0.25s ease-out, transform 0.25s ease-out',
        background: 'linear-gradient(to right, rgba(6, 182, 212, 0.15), transparent)',
      }}
    >
      {/* Chevron arrow */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="text-cyan-400/60"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
    </div>
  );
}
