'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | null;

interface SwipeGestureOptions {
  /** Minimum horizontal distance in px to qualify as a swipe (default: 100) */
  minDistance?: number;
  /** Maximum vertical deviation in px to distinguish from scrolling (default: 80) */
  maxVerticalDeviation?: number;
  /** Minimum swipe velocity in px/ms to qualify as intentional (default: 0.3) */
  minVelocity?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface SwipeState {
  /** The detected swipe direction, resets to null after each swipe */
  direction: SwipeDirection;
  /** Current horizontal distance while swiping (0 when idle) */
  swiping: boolean;
  /** Horizontal offset during an active swipe */
  deltaX: number;
}

/**
 * Detects horizontal swipe gestures using touch events.
 * Returns the direction of the swipe and active swipe state.
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}): SwipeState {
  const {
    minDistance = 100,
    maxVerticalDeviation = 80,
    minVelocity = 0.3,
    enabled = true,
  } = options;

  const [state, setState] = useState<SwipeState>({
    direction: null,
    swiping: false,
    deltaX: 0,
  });

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setState((prev) => ({ ...prev, swiping: false, deltaX: 0 }));
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStart.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);

      // If vertical movement exceeds threshold, this is a scroll, not a swipe
      if (deltaY > maxVerticalDeviation) {
        touchStart.current = null;
        setState((prev) => ({ ...prev, swiping: false, deltaX: 0 }));
        return;
      }

      if (Math.abs(deltaX) > 10) {
        setState((prev) => ({ ...prev, swiping: true, deltaX }));
      }
    },
    [enabled, maxVerticalDeviation]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStart.current) {
        setState((prev) => ({ ...prev, swiping: false, deltaX: 0 }));
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);
      const elapsed = Date.now() - touchStart.current.time;
      const velocity = Math.abs(deltaX) / Math.max(elapsed, 1);

      touchStart.current = null;

      // Check that the swipe meets all criteria
      if (
        Math.abs(deltaX) >= minDistance &&
        deltaY <= maxVerticalDeviation &&
        velocity >= minVelocity
      ) {
        const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';
        setState({ direction, swiping: false, deltaX: 0 });

        // Reset direction after a short delay so consumers can react
        if (directionResetTimer.current) {
          clearTimeout(directionResetTimer.current);
        }
        directionResetTimer.current = setTimeout(() => {
          setState((prev) => ({ ...prev, direction: null }));
        }, 300);
      } else {
        setState((prev) => ({ ...prev, swiping: false, deltaX: 0 }));
      }
    },
    [enabled, minDistance, maxVerticalDeviation, minVelocity]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (directionResetTimer.current) {
        clearTimeout(directionResetTimer.current);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
