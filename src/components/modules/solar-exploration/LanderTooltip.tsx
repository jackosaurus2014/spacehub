'use client';

import { useRef, useLayoutEffect, useState } from 'react';
import { SurfaceLander, LANDER_STATUS_INFO, SPACE_AGENCIES } from '@/types';

interface LanderTooltipProps {
  lander: SurfaceLander;
  position: { x: number; y: number };
}

export default function LanderTooltip({ lander, position }: LanderTooltipProps) {
  const statusInfo = LANDER_STATUS_INFO[lander.status];
  const agencyInfo = lander.agency ? SPACE_AGENCIES[lander.agency] : null;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
    left: 0,
    top: 0,
  });

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate optimal position to keep tooltip within viewport
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const padding = 12;
    const cursorOffset = 15;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Start with tooltip to the right and above cursor
    let x = position.x + cursorOffset;
    let y = position.y - cursorOffset - rect.height;

    // Check right edge - flip to left of cursor if needed
    if (x + rect.width > viewportWidth - padding) {
      x = position.x - rect.width - cursorOffset;
    }

    // Ensure doesn't go off left side
    if (x < padding) {
      x = padding;
    }

    // Check top edge - flip below cursor if needed
    if (y < padding) {
      y = position.y + cursorOffset;
    }

    // Check bottom edge
    if (y + rect.height > viewportHeight - padding) {
      y = viewportHeight - rect.height - padding;
    }

    // Final bounds check for very tall tooltips
    if (y < padding) {
      y = padding;
    }

    setTooltipStyle({
      visibility: 'visible',
      left: x,
      top: y,
    });
    setIsPositioned(true);
  }, [position, lander]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none transition-opacity duration-100"
      style={{
        ...tooltipStyle,
        opacity: isPositioned ? 1 : 0,
      }}
    >
      <div className="bg-space-800/95 backdrop-blur-md border border-space-600 rounded-lg p-3 shadow-xl w-[280px] max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-semibold text-base leading-tight">{lander.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {agencyInfo && (
                <span className="text-xs text-star-300">
                  {agencyInfo.flag} {agencyInfo.name}
                </span>
              )}
              {!agencyInfo && lander.agency && (
                <span className="text-star-300 text-xs">{lander.agency}</span>
              )}
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusInfo.color}`}
            style={{ backgroundColor: `${statusInfo.bgColor}20` }}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Details Grid */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-star-400 shrink-0">Type:</span>
            <span className="text-star-200 capitalize text-right">{lander.missionType.replace('_', ' ')}</span>
          </div>

          {lander.landingSite && (
            <div className="flex justify-between gap-2">
              <span className="text-star-400 shrink-0">Site:</span>
              <span className="text-star-200 text-right truncate" title={lander.landingSite}>
                {lander.landingSite}
              </span>
            </div>
          )}

          <div className="flex justify-between gap-2">
            <span className="text-star-400 shrink-0">Coords:</span>
            <span className="text-star-200 text-right">
              {lander.latitude.toFixed(2)}°{lander.latitude >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(lander.longitude).toFixed(2)}°{lander.longitude >= 0 ? 'E' : 'W'}
            </span>
          </div>

          {lander.landingDate && (
            <div className="flex justify-between gap-2">
              <span className="text-star-400 shrink-0">Landed:</span>
              <span className="text-star-200 text-right">{formatDate(lander.landingDate)}</span>
            </div>
          )}

          {lander.endDate && (
            <div className="flex justify-between gap-2">
              <span className="text-star-400 shrink-0">Ended:</span>
              <span className="text-star-200 text-right">{formatDate(lander.endDate)}</span>
            </div>
          )}

          {lander.mass && (
            <div className="flex justify-between gap-2">
              <span className="text-star-400 shrink-0">Mass:</span>
              <span className="text-star-200 text-right">{lander.mass.toLocaleString()} kg</span>
            </div>
          )}

          {lander.powerSource && (
            <div className="flex justify-between gap-2">
              <span className="text-star-400 shrink-0">Power:</span>
              <span className="text-star-200 capitalize text-right">{lander.powerSource}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {lander.description && (
          <p className="mt-2 text-star-300 text-xs leading-relaxed border-t border-space-600 pt-2 line-clamp-4">
            {lander.description}
          </p>
        )}

        {/* Objectives */}
        {lander.objectives && lander.objectives.length > 0 && (
          <div className="mt-2 border-t border-space-600 pt-2">
            <span className="text-star-400 text-xs font-medium">Objectives:</span>
            <ul className="mt-1 space-y-0.5">
              {lander.objectives.slice(0, 3).map((obj, i) => (
                <li key={i} className="text-star-200 text-xs flex items-start gap-1">
                  <span className="text-nebula-400 shrink-0">•</span>
                  <span className="line-clamp-2">{obj}</span>
                </li>
              ))}
              {lander.objectives.length > 3 && (
                <li className="text-star-400 text-xs italic">
                  +{lander.objectives.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
