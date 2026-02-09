'use client';

import Link from 'next/link';

// Types matching the API
export type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'Polar';
export type SatelliteStatus = 'active' | 'inactive' | 'deorbited';

export interface Satellite {
  id: string;
  name: string;
  noradId: string;
  orbitType: OrbitType;
  altitude: number;
  velocity: number;
  operator: string;
  country: string;
  launchDate: string;
  status: SatelliteStatus;
  purpose: string;
  mass: number | null;
  period: number | null;
  inclination: number | null;
  apogee: number | null;
  perigee: number | null;
  description: string | null;
}

// Status styling
const STATUS_STYLES: Record<SatelliteStatus, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/50', label: 'Active' },
  inactive: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/50', label: 'Inactive' },
  deorbited: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/50', label: 'Deorbited' },
};

// Orbit type icons and colors
const ORBIT_INFO: Record<OrbitType, { icon: string; color: string; label: string }> = {
  LEO: { icon: '🛰️', color: 'text-blue-400', label: 'Low Earth Orbit' },
  MEO: { icon: '📡', color: 'text-purple-400', label: 'Medium Earth Orbit' },
  GEO: { icon: '🌐', color: 'text-amber-400', label: 'Geostationary' },
  HEO: { icon: '🔭', color: 'text-pink-400', label: 'Highly Elliptical' },
  SSO: { icon: '☀️', color: 'text-orange-400', label: 'Sun-Synchronous' },
  Polar: { icon: '🧭', color: 'text-cyan-400', label: 'Polar' },
};

// Purpose icons
const PURPOSE_ICONS: Record<string, string> = {
  'Space Station': '🏠',
  'Communications': '📶',
  'Navigation': '🧭',
  'Weather': '🌤️',
  'Earth Observation': '🌍',
  'Research': '🔬',
  'Reconnaissance': '🛡️',
};

interface SatelliteCardProps {
  satellite: Satellite;
  compact?: boolean;
}

export default function SatelliteCard({ satellite, compact = false }: SatelliteCardProps) {
  const statusStyle = STATUS_STYLES[satellite.status];
  const orbitInfo = ORBIT_INFO[satellite.orbitType];
  const purposeIcon = PURPOSE_ICONS[satellite.purpose] || '🛰️';

  // Format altitude
  const formatAltitude = (alt: number) => {
    if (alt >= 10000) {
      return `${(alt / 1000).toFixed(0)}k km`;
    }
    return `${alt.toLocaleString()} km`;
  };

  // Format velocity
  const formatVelocity = (vel: number) => {
    return `${vel.toFixed(2)} km/s`;
  };

  // External tracking links
  const n2yoUrl = `https://www.n2yo.com/satellite/?s=${satellite.noradId}`;
  const celestrakUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${satellite.noradId}`;

  if (compact) {
    return (
      <div className={`card p-4 border ${statusStyle.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">{purposeIcon}</span>
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 text-sm truncate">{satellite.name}</h4>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{satellite.operator}</span>
                <span className="text-slate-300">|</span>
                <span className={orbitInfo.color}>{satellite.orbitType}</span>
              </div>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span>Alt: <span className="text-slate-200 font-medium">{formatAltitude(satellite.altitude)}</span></span>
          <span>Vel: <span className="text-slate-200 font-medium">{formatVelocity(satellite.velocity)}</span></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-5 border ${statusStyle.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl border border-slate-200">
            {purposeIcon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{satellite.name}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">{satellite.operator}</span>
              <span className="text-slate-300">|</span>
              <span className={`text-xs ${orbitInfo.color}`}>{orbitInfo.label}</span>
            </div>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Description */}
      {satellite.description && (
        <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">
          {satellite.description}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold">{formatAltitude(satellite.altitude)}</div>
          <div className="text-slate-400 text-xs">Altitude</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold">{formatVelocity(satellite.velocity)}</div>
          <div className="text-slate-400 text-xs">Velocity</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold">{satellite.noradId}</div>
          <div className="text-slate-400 text-xs">NORAD ID</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold">{satellite.purpose}</div>
          <div className="text-slate-400 text-xs">Purpose</div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 mb-4">
        {satellite.mass && (
          <div>
            <span className="text-slate-400">Mass: </span>
            <span className="text-slate-400">{satellite.mass.toLocaleString()} kg</span>
          </div>
        )}
        {satellite.period && (
          <div>
            <span className="text-slate-400">Period: </span>
            <span className="text-slate-400">{satellite.period.toFixed(1)} min</span>
          </div>
        )}
        {satellite.inclination !== null && (
          <div>
            <span className="text-slate-400">Incl: </span>
            <span className="text-slate-400">{satellite.inclination.toFixed(1)}</span>
          </div>
        )}
        <div>
          <span className="text-slate-400">Launched: </span>
          <span className="text-slate-400">
            {new Date(satellite.launchDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* External Links */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
        <span className="text-slate-400 text-xs">Track on:</span>
        <a
          href={n2yoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors"
        >
          N2YO
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href={celestrakUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors"
        >
          CelesTrak
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        {satellite.status === 'active' && (
          <Link
            href={`/orbital-slots?tab=operators&search=${encodeURIComponent(satellite.operator)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-nebula-50 text-nebula-600 hover:bg-nebula-100 transition-colors ml-auto"
          >
            View Operator
          </Link>
        )}
      </div>
    </div>
  );
}
