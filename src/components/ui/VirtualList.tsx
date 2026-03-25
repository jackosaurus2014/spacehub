'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  maxHeight?: number;
}

/**
 * VirtualList — renders only visible items (+ overscan buffer) for long lists.
 *
 * Instead of rendering 100+ DOM nodes, this component calculates which items
 * are in (or near) the viewport and only mounts those, using a spacer div
 * to maintain correct scroll height.
 */
export default function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = '',
  maxHeight = 600,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  // Measure the actual container height on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      setContainerHeight(container.clientHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      {/* Total height spacer to maintain correct scrollbar size */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Offset container for visible items */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            return (
              <div key={actualIndex} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
