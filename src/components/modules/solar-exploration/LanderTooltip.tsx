'use client';

import { SurfaceLander, LANDER_STATUS_INFO, SPACE_AGENCIES } from '@/types';

interface LanderTooltipProps {
  lander: SurfaceLander;
  position: { x: number; y: number };
}

export default function LanderTooltip({ lander, position }: LanderTooltipProps) {
  const statusInfo = LANDER_STATUS_INFO[lander.status];
  const agencyInfo = lander.agency ? SPACE_AGENCIES[lander.agency] : null;

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="bg-space-800/95 backdrop-blur-md border border-space-600 rounded-lg p-4 shadow-xl min-w-[280px] max-w-[320px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold text-lg">{lander.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {agencyInfo && (
                <span className="text-sm">
                  {agencyInfo.flag} {agencyInfo.name}
                </span>
              )}
              {!agencyInfo && lander.agency && (
                <span className="text-star-300 text-sm">{lander.agency}</span>
              )}
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color} bg-opacity-20`}
                style={{ backgroundColor: `${statusInfo.bgColor}20` }}>
            {statusInfo.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-star-400">Type:</span>
            <span className="text-star-200 capitalize">{lander.missionType.replace('_', ' ')}</span>
          </div>

          {lander.landingSite && (
            <div className="flex justify-between">
              <span className="text-star-400">Landing Site:</span>
              <span className="text-star-200">{lander.landingSite}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-star-400">Coordinates:</span>
            <span className="text-star-200">
              {lander.latitude.toFixed(2)}°{lander.latitude >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(lander.longitude).toFixed(2)}°{lander.longitude >= 0 ? 'E' : 'W'}
            </span>
          </div>

          {lander.landingDate && (
            <div className="flex justify-between">
              <span className="text-star-400">Landing:</span>
              <span className="text-star-200">{formatDate(lander.landingDate)}</span>
            </div>
          )}

          {lander.endDate && (
            <div className="flex justify-between">
              <span className="text-star-400">End:</span>
              <span className="text-star-200">{formatDate(lander.endDate)}</span>
            </div>
          )}

          {lander.mass && (
            <div className="flex justify-between">
              <span className="text-star-400">Mass:</span>
              <span className="text-star-200">{lander.mass.toLocaleString()} kg</span>
            </div>
          )}

          {lander.powerSource && (
            <div className="flex justify-between">
              <span className="text-star-400">Power:</span>
              <span className="text-star-200 capitalize">{lander.powerSource}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {lander.description && (
          <p className="mt-3 text-star-300 text-xs leading-relaxed border-t border-space-600 pt-3">
            {lander.description}
          </p>
        )}

        {/* Objectives */}
        {lander.objectives && lander.objectives.length > 0 && (
          <div className="mt-3 border-t border-space-600 pt-3">
            <span className="text-star-400 text-xs">Objectives:</span>
            <ul className="mt-1 space-y-1">
              {lander.objectives.slice(0, 3).map((obj, i) => (
                <li key={i} className="text-star-200 text-xs flex items-start gap-1">
                  <span className="text-nebula-400">•</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
