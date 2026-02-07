'use client';

import { useRef, useEffect, useState } from 'react';

export interface ChartTooltipProps {
  x: number;
  y: number;
  content: React.ReactNode;
  visible: boolean;
}

export default function ChartTooltip({ x, y, content, visible }: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!visible || !tooltipRef.current) {
      setAdjustedPos({ x, y });
      return;
    }

    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjX = x;
    let adjY = y;

    // Prevent overflow on the right
    if (rect.right > viewportWidth - 8) {
      adjX = x - (rect.right - viewportWidth) - 8;
    }
    // Prevent overflow on the left
    if (rect.left < 8) {
      adjX = x + (8 - rect.left);
    }
    // Prevent overflow on top
    if (rect.top < 8) {
      adjY = y + (8 - rect.top);
    }
    // Prevent overflow on bottom
    if (rect.bottom > viewportHeight - 8) {
      adjY = y - (rect.bottom - viewportHeight) - 8;
    }

    setAdjustedPos({ x: adjX, y: adjY });
  }, [x, y, visible]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute pointer-events-none z-20 px-3 py-2 rounded-lg text-sm"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        transform: 'translateX(-50%)',
        backgroundColor: 'rgb(30, 41, 59)',
        border: '1px solid rgb(71, 85, 105)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s ease-in-out',
      }}
    >
      {content}
    </div>
  );
}
