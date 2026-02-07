'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface ChartTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface ChartInteractionHandlers {
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export interface UseChartInteractionResult {
  transform: ChartTransform;
  handlers: ChartInteractionHandlers;
  isZoomed: boolean;
  resetZoom: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;

export function useChartInteraction(): UseChartInteractionResult {
  const [transform, setTransform] = useState<ChartTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTranslate = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isZoomed = transform.scale > 1;

  const clampTranslation = useCallback(
    (tx: number, ty: number, scale: number) => {
      // Limit pan distance proportionally to zoom level: at 2x zoom the
      // content extends 50% beyond the viewport in each direction, so
      // maxTranslate scales from 0% (no zoom) to ~50% (max zoom)
      const maxTranslate = ((scale - 1) / scale) * 50;
      const clampedX = Math.max(-maxTranslate, Math.min(maxTranslate, tx));
      const clampedY = Math.max(-maxTranslate, Math.min(maxTranslate, ty));
      return { x: clampedX, y: clampedY };
    },
    []
  );

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    lastTranslate.current = { x: 0, y: 0 };
    lastPinchDist.current = null;
  }, []);

  // Wheel zoom (ctrl+scroll or regular scroll)
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      // Only zoom on ctrl+scroll or pinch gesture (which shows as ctrlKey on trackpads)
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      setTransform((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.scale + delta));

        if (newScale === 1) {
          lastTranslate.current = { x: 0, y: 0 };
          return { scale: 1, translateX: 0, translateY: 0 };
        }

        const clamped = clampTranslation(prev.translateX, prev.translateY, newScale);
        lastTranslate.current = { x: clamped.x, y: clamped.y };
        return { scale: newScale, translateX: clamped.x, translateY: clamped.y };
      });
    },
    [clampTranslation]
  );

  // Mouse panning
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      lastTranslate.current = {
        x: transform.translateX,
        y: transform.translateY,
      };
      e.preventDefault();
    },
    [isZoomed, transform.translateX, transform.translateY]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;

      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;

      // Divide by scale so dragging feels consistent regardless of zoom level:
      // at higher zoom, each pixel of mouse movement maps to less content shift
      const sensitivity = 0.5 / transform.scale;
      const newTx = lastTranslate.current.x + dx * sensitivity;
      const newTy = lastTranslate.current.y + dy * sensitivity;

      const clamped = clampTranslation(newTx, newTy, transform.scale);
      setTransform((prev) => ({
        ...prev,
        translateX: clamped.x,
        translateY: clamped.y,
      }));
    },
    [transform.scale, clampTranslation]
  );

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      setTransform((prev) => {
        lastTranslate.current = { x: prev.translateX, y: prev.translateY };
        return prev;
      });
    }
  }, []);

  // Double-click to reset
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resetZoom();
    },
    [resetZoom]
  );

  // Touch: pinch-to-zoom and pan
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        lastPinchDist.current = getTouchDistance(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // Double-tap detection: if a timer from a previous tap is still active
        // (< 300ms ago), treat this as a double-tap and reset zoom
        if (doubleTapTimer.current) {
          clearTimeout(doubleTapTimer.current);
          doubleTapTimer.current = null;
          resetZoom();
          e.preventDefault();
          return;
        }
        doubleTapTimer.current = setTimeout(() => {
          doubleTapTimer.current = null;
        }, 300);

        // Pan start (only when zoomed)
        if (isZoomed) {
          isPanning.current = true;
          panStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
          lastTranslate.current = {
            x: transform.translateX,
            y: transform.translateY,
          };
        }
      }
    },
    [isZoomed, resetZoom, transform.translateX, transform.translateY]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // Pinch zoom
        e.preventDefault();
        const dist = getTouchDistance(e.touches);
        // Convert pixel-distance change to a small zoom delta (0.01 factor
        // prevents the zoom from jumping wildly on each touch move event)
        const delta = (dist - lastPinchDist.current) * 0.01;
        lastPinchDist.current = dist;

        setTransform((prev) => {
          const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.scale + delta));
          if (newScale === 1) {
            lastTranslate.current = { x: 0, y: 0 };
            return { scale: 1, translateX: 0, translateY: 0 };
          }
          const clamped = clampTranslation(prev.translateX, prev.translateY, newScale);
          lastTranslate.current = { x: clamped.x, y: clamped.y };
          return { scale: newScale, translateX: clamped.x, translateY: clamped.y };
        });
      } else if (e.touches.length === 1 && isPanning.current) {
        // Pan
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;

        const sensitivity = 0.5 / transform.scale;
        const newTx = lastTranslate.current.x + dx * sensitivity;
        const newTy = lastTranslate.current.y + dy * sensitivity;

        const clamped = clampTranslation(newTx, newTy, transform.scale);
        setTransform((prev) => ({
          ...prev,
          translateX: clamped.x,
          translateY: clamped.y,
        }));
      }
    },
    [transform.scale, clampTranslation]
  );

  const onTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    if (isPanning.current) {
      isPanning.current = false;
      setTransform((prev) => {
        lastTranslate.current = { x: prev.translateX, y: prev.translateY };
        return prev;
      });
    }
  }, []);

  // Clean up double-tap timer
  useEffect(() => {
    return () => {
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
      }
    };
  }, []);

  return {
    transform,
    handlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onDoubleClick,
    },
    isZoomed,
    resetZoom,
  };
}
