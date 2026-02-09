'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
import { useHaptics } from '@/hooks/useHaptics';

export default function SwipeModuleNavigation() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const haptics = useHaptics();
  const { currentModule, prevModule, nextModule, isModulePage, navigateTo } = useModuleNavigation();

  const leftIndicatorRef = useRef<HTMLDivElement>(null);
  const rightIndicatorRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);

  // Check if touch is inside a horizontally-scrollable container
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
      if (el.dataset.swipeIgnore !== undefined) return true;
      el = el.parentElement;
    }
    return false;
  }, []);

  // Track touch start target
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

  // Update visual indicators during swipe
  useEffect(() => {
    if (!isMobile) return;

    const isScrollable = isInsideScrollable(touchTargetRef.current);

    // Right swipe indicator (left edge) — shows prev module or back arrow
    if (leftIndicatorRef.current) {
      if (swiping && deltaX > 0 && !isScrollable) {
        const progress = Math.min(deltaX / 100, 1);
        leftIndicatorRef.current.style.opacity = String(progress * 0.9);
        leftIndicatorRef.current.style.transform = `translateX(${Math.min(deltaX * 0.15, 24)}px)`;
      } else {
        leftIndicatorRef.current.style.opacity = '0';
        leftIndicatorRef.current.style.transform = 'translateX(0)';
      }
    }

    // Left swipe indicator (right edge) — shows next module
    if (rightIndicatorRef.current) {
      if (swiping && deltaX < 0 && !isScrollable && isModulePage && nextModule) {
        const progress = Math.min(Math.abs(deltaX) / 100, 1);
        rightIndicatorRef.current.style.opacity = String(progress * 0.9);
        rightIndicatorRef.current.style.transform = `translateX(${Math.max(deltaX * 0.15, -24)}px)`;
      } else {
        rightIndicatorRef.current.style.opacity = '0';
        rightIndicatorRef.current.style.transform = 'translateX(0)';
      }
    }
  }, [swiping, deltaX, isMobile, isInsideScrollable, isModulePage, nextModule]);

  // Handle completed swipe
  useEffect(() => {
    if (!direction || !isMobile || hasNavigated.current) return;
    if (isInsideScrollable(touchTargetRef.current)) return;

    if (direction === 'right') {
      // Swipe right: prev module or router.back()
      if (isModulePage && prevModule && currentModule) {
        hasNavigated.current = true;
        haptics.trigger('light');
        navigateTo(prevModule.moduleId);
      } else {
        hasNavigated.current = true;
        haptics.trigger('light');
        router.back();
      }
    } else if (direction === 'left') {
      // Swipe left: next module (only on module pages)
      if (isModulePage && nextModule && currentModule) {
        hasNavigated.current = true;
        haptics.trigger('light');
        navigateTo(nextModule.moduleId);
      }
    }

    // Reset navigation lock
    setTimeout(() => {
      hasNavigated.current = false;
    }, 500);
  }, [direction, isMobile, router, isInsideScrollable, isModulePage, prevModule, nextModule, currentModule, navigateTo, haptics]);

  if (!isMobile) return null;

  return (
    <>
      {/* Left edge indicator (swipe right — prev module or back) */}
      <div
        ref={leftIndicatorRef}
        aria-hidden="true"
        className="fixed left-0 top-0 bottom-0 w-12 z-[100] pointer-events-none flex items-center"
        style={{
          opacity: 0,
          transform: 'translateX(0)',
          transition: swiping ? 'none' : 'opacity 0.25s ease-out, transform 0.25s ease-out',
          background: 'linear-gradient(to right, rgba(6, 182, 212, 0.15), transparent)',
        }}
      >
        <div className="ml-1 flex flex-col items-center gap-1">
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            className="text-cyan-400/70"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {isModulePage && prevModule && (
            <span className="text-[9px] text-cyan-400/70 font-medium whitespace-nowrap max-w-[60px] truncate writing-mode-vertical">
              {prevModule.icon}
            </span>
          )}
        </div>
      </div>

      {/* Right edge indicator (swipe left — next module) */}
      <div
        ref={rightIndicatorRef}
        aria-hidden="true"
        className="fixed right-0 top-0 bottom-0 w-12 z-[100] pointer-events-none flex items-center justify-end"
        style={{
          opacity: 0,
          transform: 'translateX(0)',
          transition: swiping ? 'none' : 'opacity 0.25s ease-out, transform 0.25s ease-out',
          background: 'linear-gradient(to left, rgba(6, 182, 212, 0.15), transparent)',
        }}
      >
        <div className="mr-1 flex flex-col items-center gap-1">
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            className="text-cyan-400/70"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          {nextModule && (
            <span className="text-[9px] text-cyan-400/70 font-medium">
              {nextModule.icon}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
