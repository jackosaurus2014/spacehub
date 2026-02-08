'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SolarFlare,
  SolarForecast,
  SolarActivity,
  FLARE_CLASSIFICATIONS,
  RISK_LEVEL_INFO,
  IMPACT_LEVEL_INFO,
  DebrisStats,
  ConjunctionEvent,
  DebrisObject,
  ConjunctionRisk,
  DebrisObjectType,
  DEBRIS_OBJECT_TYPES,
} from '@/types';
import {
  OperationalConjunction,
  SustainabilityScorecard,
  SpectrumAlert,
  AlertLevel,
  ScorecardGrade,
  SpectrumSeverity,
  ALERT_LEVEL_INFO,
  GRADE_INFO,
  SEVERITY_INFO,
} from '@/lib/operational-awareness-data';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SkeletonPage } from '@/components/ui/Skeleton';

// ════════════════════════════════════════
// Top-Level Tab Type
// ════════════════════════════════════════

type MainTab = 'weather' | 'debris' | 'operations';

// ════════════════════════════════════════
// Solar Flares Types & Constants
// ════════════════════════════════════════

const FLARE_EXPORT_COLUMNS = [
  { key: 'classification', label: 'Classification' },
  { key: 'intensity', label: 'Intensity' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'peakTime', label: 'Peak Time' },
  { key: 'activeRegion', label: 'Active Region' },
  { key: 'radioBlackout', label: 'Radio Blackout' },
  { key: 'geomagneticStorm', label: 'Geomagnetic Storm' },
  { key: 'linkedCME', label: 'CME Associated' },
  { key: 'description', label: 'Description' },
];

interface SolarFlareData {
  flares: SolarFlare[];
  forecasts: SolarForecast[];
  activity: SolarActivity | null;
  stats: {
    totalFlares: number;
    last30Days: { xClass: number; mClass: number };
    largestRecent: { classification: string; intensity: number; date: Date } | null;
    upcomingDangerDays: number;
  };
}

// ════════════════════════════════════════
// Debris Monitor Types & Constants
// ════════════════════════════════════════

interface DebrisMonitorData {
  overview: {
    stats: DebrisStats | null;
    recentConjunctions: ConjunctionEvent[];
    criticalCount: number;
    debrisByOrbit: { leo: number; meo: number; geo: number };
    debrisByType: { payloads: number; rocketBodies: number; debris: number; unknown: number };
    complianceRate: number | null;
  } | null;
  conjunctions: ConjunctionEvent[];
  notableDebris: DebrisObject[];
}

const RISK_COLORS: Record<ConjunctionRisk, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500', label: 'Critical' },
  high: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500', label: 'High' },
  moderate: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Moderate' },
  low: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500', label: 'Low' },
};

const OBJECT_TYPE_COLORS: Record<string, string> = {
  payload: 'text-green-400',
  rocket_body: 'text-orange-400',
  debris: 'text-red-400',
  unknown: 'text-gray-400',
};

const KNOWN_OPERATORS = [
  'Starlink', 'OneWeb', 'Iridium', 'SES', 'Intelsat', 'Eutelsat',
  'Telesat', 'SpaceX', 'Amazon', 'Planet Labs', 'Spire', 'Globalstar',
  'O3b', 'ViaSat', 'Hughes', 'ORBCOMM', 'BlackSky',
];

function matchesKnownOperator(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_OPERATORS.some((op) => lower.includes(op.toLowerCase()));
}

function getKesslerColor(index: number): string {
  if (index > 6) return 'text-red-400';
  if (index >= 3) return 'text-yellow-400';
  return 'text-green-400';
}

function getKesslerLabel(index: number): string {
  if (index > 6) return 'High Risk';
  if (index >= 3) return 'Elevated';
  return 'Stable';
}

function formatMass(mass: number | null): string {
  if (mass === null) return 'Unknown';
  if (mass >= 1000) return `${(mass / 1000).toFixed(1)} t`;
  return `${mass.toFixed(1)} kg`;
}

const DEBRIS_CONJUNCTION_EXPORT_COLUMNS = [
  { key: 'primaryObject', label: 'Primary Object' },
  { key: 'primaryType', label: 'Primary Type' },
  { key: 'secondaryObject', label: 'Secondary Object' },
  { key: 'secondaryType', label: 'Secondary Type' },
  { key: 'riskLevel', label: 'Risk Level' },
  { key: 'probability', label: 'Probability' },
  { key: 'missDistance', label: 'Miss Distance (m)' },
  { key: 'altitude', label: 'Altitude (km)' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'eventTime', label: 'Event Time' },
  { key: 'maneuverRequired', label: 'Maneuver Required' },
  { key: 'maneuverExecuted', label: 'Maneuver Executed' },
];

const DEBRIS_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'noradId', label: 'NORAD ID' },
  { key: 'objectType', label: 'Object Type' },
  { key: 'altitude', label: 'Altitude (km)' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'mass', label: 'Mass (kg)' },
  { key: 'size', label: 'Size' },
  { key: 'originCountry', label: 'Origin Country' },
  { key: 'originYear', label: 'Origin Year' },
  { key: 'originMission', label: 'Origin Mission' },
  { key: 'isActive', label: 'Active' },
  { key: 'inclination', label: 'Inclination' },
  { key: 'eccentricity', label: 'Eccentricity' },
];

// ════════════════════════════════════════
// Operations Types & Constants
// ════════════════════════════════════════

type OpsSubTab = 'overview' | 'conjunctions' | 'scorecards' | 'spectrum';

interface OpsOverviewData {
  conjunctions: {
    total: number;
    byLevel: Record<AlertLevel, number>;
    critical: OperationalConjunction[];
    upcoming: OperationalConjunction[];
  };
  sustainability: {
    totalOperators: number;
    averageScore: number;
    gradeDistribution: Record<ScorecardGrade, number>;
    topPerformers: SustainabilityScorecard[];
    needsImprovement: SustainabilityScorecard[];
  };
  spectrum: {
    totalAlerts: number;
    bySeverity: Record<SpectrumSeverity, number>;
    critical: SpectrumAlert[];
    recentAlerts: SpectrumAlert[];
  };
  overallStatus: {
    conjunctionThreat: string;
    spectrumHealth: string;
    sustainabilityTrend: string;
  };
}

const OPS_CONJUNCTION_EXPORT_COLUMNS = [
  { key: 'eventId', label: 'Event ID' },
  { key: 'primaryObject', label: 'Primary Object' },
  { key: 'secondaryObject', label: 'Secondary Object' },
  { key: 'tca', label: 'Time of Closest Approach' },
  { key: 'missDistance', label: 'Miss Distance (m)' },
  { key: 'collisionProb', label: 'Collision Probability' },
  { key: 'relativeVelocity', label: 'Relative Velocity (m/s)' },
  { key: 'alertLevel', label: 'Alert Level' },
  { key: 'status', label: 'Status' },
];

const SCORECARD_EXPORT_COLUMNS = [
  { key: 'operatorName', label: 'Operator' },
  { key: 'totalSatellites', label: 'Total Satellites' },
  { key: 'overallScore', label: 'Overall Score' },
  { key: 'grade', label: 'Grade' },
  { key: 'deorbitScore', label: 'Deorbit Score' },
  { key: 'maneuverScore', label: 'Maneuver Score' },
  { key: 'debrisScore', label: 'Debris Score' },
  { key: 'transparencyScore', label: 'Transparency Score' },
  { key: 'deorbitPlan', label: 'Deorbit Plan' },
];

const SPECTRUM_EXPORT_COLUMNS = [
  { key: 'alertType', label: 'Alert Type' },
  { key: 'frequencyBand', label: 'Frequency Band' },
  { key: 'affectedService', label: 'Affected Service' },
  { key: 'location', label: 'Location' },
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
  { key: 'reportedAt', label: 'Reported At' },
];

// ════════════════════════════════════════
// Operations Helper Functions
// ════════════════════════════════════════

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Past';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h`;
  }

  if (diffHours > 0) {
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}m`;
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins}m`;
}

function formatProbability(prob: number | null): string {
  if (prob === null) return 'N/A';
  if (prob < 0.0001) return prob.toExponential(2);
  return (prob * 100).toFixed(4) + '%';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'elevated':
    case 'degraded':
    case 'concerning':
      return 'text-orange-400';
    case 'normal':
    case 'healthy':
    case 'positive':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    default:
      return 'text-slate-400';
  }
}

// ════════════════════════════════════════
// Debris Conjunction Card Component
// ════════════════════════════════════════

function DebrisConjunctionCard({ event }: { event: ConjunctionEvent }) {
  const riskStyle = RISK_COLORS[event.riskLevel as ConjunctionRisk] || RISK_COLORS.low;
  const eventDate = new Date(event.eventTime);
  const isPast = eventDate < new Date();

  const primaryIsOperator = matchesKnownOperator(event.primaryObject);
  const secondaryIsOperator = matchesKnownOperator(event.secondaryObject);

  return (
    <div className={`card p-5 border ${riskStyle.border} ${riskStyle.bg}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
              {riskStyle.label}
            </span>
            <span className="text-slate-400 text-xs">
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isPast && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Past</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm mt-2">
            <div className="bg-slate-100/50 rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Primary</span>
              <span className="text-slate-900 font-medium">{event.primaryObject}</span>
              <span className="text-slate-400 text-xs ml-1">({event.primaryType})</span>
            </div>
            <span className="text-slate-400 font-bold">vs</span>
            <div className="bg-slate-100/50 rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Secondary</span>
              <span className="text-slate-900 font-medium">{event.secondaryObject}</span>
              <span className="text-slate-400 text-xs ml-1">({event.secondaryType})</span>
            </div>
          </div>

          {(primaryIsOperator || secondaryIsOperator) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {primaryIsOperator && (
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
                >
                  View {event.primaryObject} operator &rarr;
                </Link>
              )}
              {secondaryIsOperator && (
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
                >
                  View {event.secondaryObject} operator &rarr;
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-slate-400 text-sm">
            Miss Distance: <span className="text-slate-900 font-bold">{event.missDistance.toFixed(1)} m</span>
          </div>
          <div className="text-slate-400 text-sm">
            Probability:{' '}
            <span className={`font-bold ${
              event.probability > 0.01 ? 'text-red-400' :
              event.probability > 0.001 ? 'text-orange-400' :
              event.probability > 0.0001 ? 'text-yellow-400' :
              'text-slate-400'
            }`}>
              {event.probability < 0.0001
                ? event.probability.toExponential(2)
                : (event.probability * 100).toFixed(3) + '%'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-400">
          Altitude: <span className="text-slate-400 font-medium">{event.altitude.toFixed(0)} km</span>
        </span>
        <span className="text-slate-400">
          Orbit: <span className="text-slate-400 font-medium">{event.orbitType}</span>
        </span>
        <span className="text-slate-400">
          Maneuver:{' '}
          {event.maneuverRequired ? (
            event.maneuverExecuted ? (
              <span className="text-green-400 font-medium">Executed</span>
            ) : (
              <span className="text-red-400 font-medium animate-pulse">Required</span>
            )
          ) : (
            <span className="text-slate-400">Not Required</span>
          )}
        </span>
      </div>

      {event.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{event.description}</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// Debris Object Card Component
// ════════════════════════════════════════

function DebrisObjectCard({ obj }: { obj: DebrisObject }) {
  const typeInfo = DEBRIS_OBJECT_TYPES.find((t) => t.value === obj.objectType);
  const typeColor = OBJECT_TYPE_COLORS[obj.objectType] || 'text-slate-400';
  const isActivePayload = obj.objectType === 'payload' && obj.isActive;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeInfo?.icon || '?'}</span>
            <h4 className="font-semibold text-slate-900 text-sm truncate">{obj.name}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded bg-slate-100 ${typeColor}`}>
              {typeInfo?.label || obj.objectType}
            </span>
            {obj.noradId && (
              <span className="text-slate-400">NORAD: {obj.noradId}</span>
            )}
            {obj.isActive && (
              <span className="text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Active</span>
            )}
          </div>
          {isActivePayload && (
            <Link
              href="/orbital-slots?tab=operators"
              className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
            >
              View in Operator Registry &rarr;
            </Link>
          )}
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-slate-900 font-bold text-sm">{obj.altitude.toFixed(0)} km</div>
          <div className="text-slate-400 text-xs">{obj.orbitType}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-400 block">Mass</span>
          <span className="text-slate-900 font-medium">{formatMass(obj.mass)}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Size</span>
          <span className="text-slate-900 font-medium capitalize">{obj.size || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Origin</span>
          <span className="text-slate-900 font-medium">{obj.originCountry || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Year</span>
          <span className="text-slate-900 font-medium">{obj.originYear || 'Unknown'}</span>
        </div>
      </div>

      {obj.originMission && (
        <p className="text-slate-400 text-xs mt-2 truncate">Mission: {obj.originMission}</p>
      )}

      {obj.deorbitDate && (
        <div className="mt-2 text-xs">
          <span className="text-slate-400">Est. Deorbit: </span>
          <span className="text-nebula-300 font-medium">
            {new Date(obj.deorbitDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {obj.inclination !== null && obj.eccentricity !== null && (
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>Inc: {obj.inclination.toFixed(1)}&deg;</span>
          <span>Ecc: {obj.eccentricity.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// Ops Conjunction Card Component
// ════════════════════════════════════════

function OpsConjunctionCard({ event }: { event: OperationalConjunction }) {
  const alertInfo = ALERT_LEVEL_INFO[event.alertLevel];
  const tcaDate = new Date(event.tca);
  const timeUntil = formatTimeUntil(tcaDate);
  const isPast = new Date(event.tca) < new Date();

  return (
    <div className={`card p-5 border ${alertInfo.borderColor} ${alertInfo.bgColor}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${alertInfo.bgColor} ${alertInfo.color} border ${alertInfo.borderColor}`}>
              {alertInfo.label.toUpperCase()}
            </span>
            <span className="text-slate-400 text-xs font-mono">{event.eventId}</span>
            {event.status === 'confirmed' && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">
                Confirmed
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm mt-2">
            <div className="bg-slate-800/50 rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Primary</span>
              <span className="text-slate-200 font-medium">{event.primaryObject}</span>
            </div>
            <span className="text-slate-400 font-bold">vs</span>
            <div className="bg-slate-800/50 rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Secondary</span>
              <span className="text-slate-200 font-medium">{event.secondaryObject}</span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0 space-y-1">
          <div className={`text-xl font-bold ${isPast ? 'text-slate-400' : alertInfo.color}`}>
            {timeUntil}
          </div>
          <div className="text-slate-400 text-xs">
            TCA: {tcaDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-700/50 text-xs">
        <span className="text-slate-400">
          Miss Distance: <span className="text-slate-300 font-bold">{event.missDistance.toFixed(1)} m</span>
        </span>
        <span className="text-slate-400">
          Collision Prob: <span className={`font-bold ${
            (event.collisionProb || 0) > 0.0001 ? 'text-red-400' : 'text-slate-300'
          }`}>
            {formatProbability(event.collisionProb)}
          </span>
        </span>
        {event.relativeVelocity && (
          <span className="text-slate-400">
            Rel. Velocity: <span className="text-slate-300 font-medium">{event.relativeVelocity.toFixed(1)} m/s</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Scorecard Card Component
// ════════════════════════════════════════

function ScorecardCard({ scorecard }: { scorecard: SustainabilityScorecard }) {
  const gradeInfo = GRADE_INFO[scorecard.grade];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{scorecard.operatorName}</h3>
          <p className="text-slate-400 text-sm">{scorecard.totalSatellites.toLocaleString()} satellites</p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${gradeInfo.color}`}>{scorecard.grade}</div>
          <div className="text-slate-400 text-xs">{scorecard.overallScore}/100</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Deorbit', score: scorecard.deorbitScore },
          { label: 'Maneuver', score: scorecard.maneuverScore },
          { label: 'Debris', score: scorecard.debrisScore },
          { label: 'Transparency', score: scorecard.transparencyScore },
        ].map((item) => (
          <div key={item.label} className="bg-slate-800/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">{item.label}</span>
              <span className={`text-sm font-bold ${
                item.score >= 80 ? 'text-green-400' :
                item.score >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>{item.score}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  item.score >= 80 ? 'bg-green-500' :
                  item.score >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {scorecard.deorbitPlan && (
        <div className="bg-slate-800/30 rounded p-3 mb-3">
          <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-1">Deorbit Plan</h4>
          <p className="text-slate-300 text-sm line-clamp-3">{scorecard.deorbitPlan}</p>
        </div>
      )}

      {scorecard.notes && (
        <p className="text-slate-400 text-xs line-clamp-2">{scorecard.notes}</p>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
        Last updated: {new Date(scorecard.lastUpdated).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Spectrum Alert Card Component
// ════════════════════════════════════════

function SpectrumAlertCard({ alert }: { alert: SpectrumAlert }) {
  const severityInfo = SEVERITY_INFO[alert.severity];

  return (
    <div className={`card p-5 border ${
      alert.severity === 'critical' ? 'border-red-500' :
      alert.severity === 'high' ? 'border-orange-500' :
      alert.severity === 'medium' ? 'border-yellow-500' :
      'border-slate-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded ${severityInfo.bgColor} ${severityInfo.color}`}>
            {severityInfo.label.toUpperCase()}
          </span>
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded capitalize">
            {alert.alertType}
          </span>
          {alert.status === 'resolved' && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
              Resolved
            </span>
          )}
        </div>
        <span className="text-slate-400 text-xs">
          {new Date(alert.reportedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="bg-nebula-500/20 text-nebula-300 px-3 py-1 rounded text-sm font-medium">
          {alert.frequencyBand}
        </div>
        {alert.affectedService && (
          <span className="text-slate-400 text-sm">{alert.affectedService}</span>
        )}
      </div>

      <p className="text-slate-300 text-sm mb-3">{alert.description}</p>

      {alert.location && (
        <div className="text-slate-400 text-xs">
          Location: <span className="text-slate-400">{alert.location}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SPACE WEATHER TAB CONTENT
// ════════════════════════════════════════════════════════════════

function SpaceWeatherTab() {
  const [data, setData] = useState<SolarFlareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubTab, setSelectedSubTab] = useState<'overview' | 'forecast' | 'history'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetch('/api/solar-flares/init', { method: 'POST' });
        const res = await fetch('/api/solar-flares');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch solar flare data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <SkeletonPage statCards={5} statGridCols="grid-cols-2 md:grid-cols-5" contentCards={2} />;
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">&#9888;&#65039;</span>
        <p className="text-slate-400">Failed to load solar activity data</p>
      </div>
    );
  }

  const dangerForecasts = data.forecasts.filter(
    f => ['high', 'severe', 'extreme'].includes(f.riskLevel)
  );

  const todayForecast = data.forecasts[0];
  const currentRisk = todayForecast ? RISK_LEVEL_INFO[todayForecast.riskLevel] : RISK_LEVEL_INFO.low;

  return (
    <div className="space-y-8">
      {/* Current Status Banner */}
      {todayForecast && (
        <div className={`rounded-xl p-6 border-2 ${
          todayForecast.riskLevel === 'extreme' ? 'bg-red-900/40 border-red-500' :
          todayForecast.riskLevel === 'severe' ? 'bg-red-800/30 border-red-400' :
          todayForecast.riskLevel === 'high' ? 'bg-orange-900/30 border-orange-500' :
          todayForecast.riskLevel === 'moderate' ? 'bg-yellow-900/30 border-yellow-500' :
          'bg-green-900/30 border-green-500'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{currentRisk.icon}</span>
              <div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${currentRisk.color}`}>
                    {currentRisk.label} Risk Level
                  </span>
                  {todayForecast.alertActive && (
                    <span className="px-3 py-1 bg-red-500/30 text-red-300 text-sm rounded-full animate-pulse font-medium">
                      ALERT ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-slate-400 mt-1">
                  Current geomagnetic conditions: {todayForecast.geomagneticLevel || 'Quiet'}
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-slate-400 text-sm">C-Class</div>
                <div className="text-2xl font-bold text-slate-900">{todayForecast.probC}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">M-Class</div>
                <div className="text-2xl font-bold text-orange-400">{todayForecast.probM}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-sm">X-Class</div>
                <div className="text-2xl font-bold text-red-400">{todayForecast.probX}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" role="region" aria-label="Solar activity statistics">
        <span className="sr-only">
          {`Solar activity overview: ${data.stats.last30Days.xClass} X-class flares in the last 30 days, ${data.stats.last30Days.mClass} M-class flares in the last 30 days, ${data.stats.upcomingDangerDays} danger days forecasted in the next 90 days, solar wind speed ${data.activity ? Math.round(data.activity.solarWindSpeed || 0) + ' km/s' : 'unavailable'}, sunspot number ${data.activity ? (data.activity.sunspotNumber || 0) : 'unavailable'}`}
        </span>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{data.stats.last30Days.xClass}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">X-Class (30d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{data.stats.last30Days.mClass}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">M-Class (30d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className={`text-4xl font-bold font-display tracking-tight ${
            data.stats.upcomingDangerDays >= 10 ? 'text-red-400' : 'text-orange-400'
          }`}>
            {data.stats.upcomingDangerDays}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Danger Days (90d)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          {data.activity ? (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{Math.round(data.activity.solarWindSpeed || 0)}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Solar Wind (km/s)</div>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-400">-</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Solar Wind</div>
            </>
          )}
        </div>
        <div className="card-elevated p-6 text-center">
          {data.activity ? (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{data.activity.sunspotNumber || 0}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Sunspot Number</div>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold font-display tracking-tight text-slate-400">-</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Sunspots</div>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2">
        {(['overview', 'forecast', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedSubTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
              selectedSubTab === tab
                ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      {selectedSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 90-Day Danger Timeline */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span>&#9888;&#65039;</span> 90-Day Danger Periods
              </h3>
              {dangerForecasts.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">&#10003;</span>
                  <p className="text-green-400 text-lg">No significant danger periods forecasted</p>
                  <p className="text-slate-400 mt-2">Solar activity expected to remain at normal levels</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {dangerForecasts.map((forecast, idx) => {
                    const riskInfo = RISK_LEVEL_INFO[forecast.riskLevel];
                    const date = new Date(forecast.forecastDate);
                    const daysFromNow = Math.ceil(
                      (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        forecast.riskLevel === 'extreme' ? 'bg-red-900/30 border-red-500' :
                        forecast.riskLevel === 'severe' ? 'bg-red-800/20 border-red-400' :
                        'bg-orange-900/20 border-orange-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{riskInfo.icon}</span>
                              <span className={`font-semibold ${riskInfo.color}`}>
                                {riskInfo.label} Risk
                              </span>
                            </div>
                            <div className="text-slate-400 text-sm mt-1">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              <span className="text-slate-400 ml-2">
                                ({daysFromNow === 0 ? 'Today' : daysFromNow === 1 ? 'Tomorrow' : `${daysFromNow} days`})
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-slate-400">X: {forecast.probX}%</div>
                            <div className="text-slate-400">M: {forecast.probM}%</div>
                          </div>
                        </div>
                        {forecast.notes && (
                          <p className="text-slate-400 text-sm mt-2 border-t border-slate-200 pt-2">
                            {forecast.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Flares */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span>&#128293;</span> Recent Solar Flares
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.flares.map((flare) => {
                  const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);

                  return (
                    <div key={flare.id} className="p-4 bg-slate-100/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg ${classInfo?.color || 'bg-gray-500'}`}>
                          {flare.classification}{flare.intensity}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-900">
                              {flare.activeRegion || 'Unknown Region'}
                            </div>
                            {flare.linkedCME && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                CME Associated
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {new Date(flare.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {flare.description && (
                            <p className="text-slate-400 text-sm mt-2">{flare.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs">
                            {flare.radioBlackout && flare.radioBlackout !== 'none' && (
                              <span className={IMPACT_LEVEL_INFO[flare.radioBlackout].color}>
                                Radio: {IMPACT_LEVEL_INFO[flare.radioBlackout].label}
                              </span>
                            )}
                            {flare.geomagneticStorm && flare.geomagneticStorm !== 'none' && (
                              <span className={IMPACT_LEVEL_INFO[flare.geomagneticStorm].color}>
                                Geomag: {IMPACT_LEVEL_INFO[flare.geomagneticStorm].label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Related Modules */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span>&#128279;</span> Related Modules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">&#128752; Debris Monitor</div>
                <p className="text-xs text-slate-400 mt-1">Solar storms can alter debris orbits</p>
              </Link>
              <Link href="/orbital-slots" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">&#128225; Orbital Slots</div>
                <p className="text-xs text-slate-400 mt-1">Check satellite exposure to solar events</p>
              </Link>
              <Link href="/space-insurance" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">&#128737;&#65039; Space Insurance</div>
                <p className="text-xs text-slate-400 mt-1">Solar activity affects insurance risk</p>
              </Link>
              <Link href="/mission-control" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">&#127919; Mission Control</div>
                <p className="text-xs text-slate-400 mt-1">Solar weather impacts launch windows</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {selectedSubTab === 'forecast' && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">90-Day Forecast Timeline</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max pb-4">
              {data.forecasts.map((forecast, idx) => {
                const riskInfo = RISK_LEVEL_INFO[forecast.riskLevel];
                const date = new Date(forecast.forecastDate);
                const isWeekStart = date.getDay() === 0;

                return (
                  <div
                    key={idx}
                    className="group relative"
                    title={`${date.toLocaleDateString()} - ${riskInfo.label}`}
                  >
                    <div
                      className={`w-3 h-16 rounded-sm cursor-pointer transition-all group-hover:scale-110 ${riskInfo.bgColor}`}
                      style={{ opacity: 0.3 + (forecast.probX / 100) * 0.7 }}
                    />
                    {isWeekStart && (
                      <div className="absolute -bottom-5 left-0 text-xs text-slate-400 whitespace-nowrap">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm whitespace-nowrap shadow-xl">
                        <div className="font-medium text-slate-900">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className={riskInfo.color}>{riskInfo.label} Risk</div>
                        <div className="text-slate-400 text-xs mt-1">
                          C: {forecast.probC}% | M: {forecast.probM}% | X: {forecast.probX}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-slate-200">
            {Object.entries(RISK_LEVEL_INFO).map(([level, info]) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${info.bgColor}`} />
                <span className="text-slate-400 text-sm">{info.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSubTab === 'history' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Solar Flare History</h3>
            <ExportButton data={data.flares} filename="solar-flare-history" columns={FLARE_EXPORT_COLUMNS} label="Export" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-200">
                  <th className="pb-3 pr-4">Class</th>
                  <th className="pb-3 pr-4">Date/Time</th>
                  <th className="pb-3 pr-4">Region</th>
                  <th className="pb-3 pr-4">Radio</th>
                  <th className="pb-3 pr-4">Geomag</th>
                  <th className="pb-3">CME</th>
                </tr>
              </thead>
              <tbody>
                {data.flares.map((flare) => {
                  const classInfo = FLARE_CLASSIFICATIONS.find(c => c.value === flare.classification);

                  return (
                    <tr key={flare.id} className="border-b border-slate-200">
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-slate-900 font-bold ${classInfo?.color}`}>
                          {flare.classification}{flare.intensity}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {new Date(flare.startTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{flare.activeRegion || '-'}</td>
                      <td className="py-3 pr-4">
                        {flare.radioBlackout && flare.radioBlackout !== 'none' ? (
                          <span className={IMPACT_LEVEL_INFO[flare.radioBlackout].color}>
                            {flare.radioBlackout}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {flare.geomagneticStorm && flare.geomagneticStorm !== 'none' ? (
                          <span className={IMPACT_LEVEL_INFO[flare.geomagneticStorm].color}>
                            {flare.geomagneticStorm}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        {flare.linkedCME ? (
                          <span className="text-purple-400">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flare Classification Legend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Solar Flare Classifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {FLARE_CLASSIFICATIONS.map((cls) => (
            <div key={cls.value} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center text-slate-900 font-bold ${cls.color}`}>
                {cls.value}
              </div>
              <div>
                <div className="text-slate-900 font-medium">{cls.label}</div>
                <div className="text-slate-400 text-xs">{cls.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DEBRIS TRACKING TAB CONTENT
// ════════════════════════════════════════════════════════════════

function DebrisTrackingTab() {
  const [data, setData] = useState<DebrisMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'conjunctions' | 'objects'>('overview');
  const [riskFilter, setRiskFilter] = useState<ConjunctionRisk | ''>('');
  const [objectTypeFilter, setObjectTypeFilter] = useState<DebrisObjectType | ''>('');

  const handleSubTabChange = (tab: 'overview' | 'conjunctions' | 'objects') => {
    setActiveSubTab(tab);
    setRiskFilter('');
    setObjectTypeFilter('');
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (riskFilter) params.set('riskLevel', riskFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/debris-monitor?${params}`);
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch debris monitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/debris-monitor/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize debris data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [riskFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const overview = data?.overview;
  const stats = overview?.stats;
  const conjunctions = data?.conjunctions || [];
  const notableDebris = data?.notableDebris || [];
  const needsInit = !loading && (!stats && conjunctions.length === 0 && notableDebris.length === 0);

  const filteredObjects = objectTypeFilter
    ? notableDebris.filter((o) => o.objectType === objectTypeFilter)
    : notableDebris;

  const filteredConjunctions = riskFilter
    ? conjunctions.filter((c) => c.riskLevel === riskFilter)
    : conjunctions;

  const sortedConjunctions = [...filteredConjunctions].sort((a, b) => {
    const riskOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const riskDiff = (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4);
    if (riskDiff !== 0) return riskDiff;
    return new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime();
  });

  const totalTracked = stats?.totalTracked || 0;
  const criticalCount = overview?.criticalCount || 0;

  if (loading) {
    return <SkeletonPage statCards={4} contentCards={2} />;
  }

  if (needsInit) {
    return (
      <div className="card p-12 text-center">
        <span className="text-6xl block mb-4">&#128752;</span>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          No Debris Tracking Data Available
        </h2>
        <p className="text-slate-400 mb-6 max-w-lg mx-auto">
          Load orbital debris data including tracked objects, conjunction events,
          and collision risk statistics.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary py-3 px-8"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Loading Data...
            </span>
          ) : (
            'Load Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats Banner */}
      <ScrollReveal>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-slate-900">
            {totalTracked.toLocaleString()}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            Tracked Objects
          </div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className={`text-2xl font-bold font-display ${getKesslerColor(stats?.kesslerRiskIndex || 0)}`}>
            {(stats?.kesslerRiskIndex || 0).toFixed(1)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            Kessler Index
          </div>
          <div className={`text-[10px] mt-0.5 ${getKesslerColor(stats?.kesslerRiskIndex || 0)}`}>
            {getKesslerLabel(stats?.kesslerRiskIndex || 0)}
          </div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-slate-900">
            {(stats?.conjunctionsPerDay || 0).toFixed(1)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            Conj./Day
          </div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className={`text-2xl font-bold font-display ${criticalCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {criticalCount}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            Critical Events
          </div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-slate-900">
            {conjunctions.length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            Active Conj.
          </div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className={`text-2xl font-bold font-display ${
            (overview?.complianceRate ?? 0) >= 0.8 ? 'text-green-400' :
            (overview?.complianceRate ?? 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {((overview?.complianceRate ?? 0) * 100).toFixed(1)}%
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            25-Yr Compliance
          </div>
        </div>
      </div>
      </ScrollReveal>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'conjunctions' as const, label: 'Conjunction Events', count: conjunctions.length },
          { id: 'objects' as const, label: 'Tracked Objects', count: notableDebris.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSubTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW SUB-TAB */}
      {activeSubTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orbit Distribution */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution by Orbit</h3>
              <div className="space-y-4">
                {[
                  { label: 'LEO (Low Earth Orbit)', count: stats.leoCount, color: 'from-blue-500 to-blue-400', desc: '< 2,000 km' },
                  { label: 'MEO (Medium Earth Orbit)', count: stats.meoCount, color: 'from-purple-500 to-purple-400', desc: '2,000 - 35,786 km' },
                  { label: 'GEO (Geostationary Orbit)', count: stats.geoCount, color: 'from-amber-500 to-amber-400', desc: '~35,786 km' },
                ].map((orbit) => {
                  const pct = totalTracked > 0 ? (orbit.count / totalTracked) * 100 : 0;
                  return (
                    <div key={orbit.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-slate-400 text-sm">{orbit.label}</span>
                          <span className="text-slate-400 text-xs ml-2">{orbit.desc}</span>
                        </div>
                        <span className="text-slate-400 text-sm font-medium">
                          {orbit.count.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${orbit.color} rounded-full transition-all`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type Distribution */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution by Type</h3>
              <div className="space-y-4">
                {[
                  { label: 'Payloads (Active & Inactive)', count: stats.totalPayloads, color: 'from-green-500 to-green-400' },
                  { label: 'Rocket Bodies', count: stats.totalRocketBodies, color: 'from-orange-500 to-orange-400' },
                  { label: 'Debris Fragments', count: stats.totalDebris, color: 'from-red-500 to-red-400' },
                  { label: 'Unidentified Objects', count: stats.totalUnknown, color: 'from-gray-500 to-gray-400' },
                ].map((type) => {
                  const pct = totalTracked > 0 ? (type.count / totalTracked) * 100 : 0;
                  return (
                    <div key={type.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-sm">{type.label}</span>
                        <span className="text-slate-400 text-sm font-medium">
                          {type.count.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${type.color} rounded-full transition-all`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 25-Year Compliance */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">25-Year Deorbit Compliance</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {(stats.compliant25Year || 0).toLocaleString()} compliant /{' '}
                  {((stats.compliant25Year || 0) + (stats.nonCompliant || 0)).toLocaleString()} total objects
                </p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${
                  (overview?.complianceRate ?? 0) >= 0.8 ? 'text-green-400' :
                  (overview?.complianceRate ?? 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {((overview?.complianceRate ?? 0) * 100).toFixed(1)}%
                </div>
                <div className="text-slate-400 text-xs">Compliance Rate</div>
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (overview?.complianceRate ?? 0) >= 0.8 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                  (overview?.complianceRate ?? 0) >= 0.5 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                  'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${Math.min((overview?.complianceRate ?? 0) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Recent Critical/High Conjunctions Preview */}
          {sortedConjunctions.filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high').length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Critical & High-Risk Events</h3>
                <button
                  onClick={() => handleSubTabChange('conjunctions')}
                  className="text-nebula-300 hover:text-nebula-200 text-sm transition-colors"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-4">
                {sortedConjunctions
                  .filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high')
                  .slice(0, 4)
                  .map((event) => (
                    <DebrisConjunctionCard key={event.id} event={event} />
                  ))}
              </div>
            </div>
          )}

          {/* Data Sources */}
          <div className="card p-5 border-dashed">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Data Sources & Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
              <div>
                <h4 className="text-slate-900 font-medium mb-2">Tracking Data</h4>
                <ul className="space-y-1">
                  <li>US Space Surveillance Network (18th SDS)</li>
                  <li>CelesTrak public TLE catalog</li>
                  <li>ESA DISCOS database</li>
                  <li>UNOOSA Index of Objects in Outer Space</li>
                </ul>
              </div>
              <div>
                <h4 className="text-slate-900 font-medium mb-2">Conjunction Assessment</h4>
                <ul className="space-y-1">
                  <li>Space-Track.org CDM data</li>
                  <li>SOCRATES (Satellite Orbital Conjunction Reports)</li>
                  <li>ESA Collision Avoidance Service</li>
                  <li>NASA Conjunction Assessment Reports</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-slate-400 text-xs flex-1">
                Statistics are aggregated from publicly available sources. Conjunction data reflects representative
                scenarios based on real-world debris events and orbital mechanics. Object counts align with
                ESA Space Environment Report and USSPACECOM public catalog data.
              </p>
              <Link
                href="/orbital-slots"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30 whitespace-nowrap"
              >
                See tracked operators &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CONJUNCTION EVENTS SUB-TAB */}
      {activeSubTab === 'conjunctions' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Filter by risk:</span>
              <button
                onClick={() => setRiskFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  riskFilter === ''
                    ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                    : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                }`}
              >
                All ({conjunctions.length})
              </button>
              {(['critical', 'high', 'moderate', 'low'] as ConjunctionRisk[]).map((level) => {
                const count = conjunctions.filter((c) => c.riskLevel === level).length;
                const info = RISK_COLORS[level];
                return (
                  <button
                    key={level}
                    onClick={() => setRiskFilter(level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      riskFilter === level
                        ? `${info.bg} ${info.text} border ${info.border}`
                        : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {info.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <ExportButton
                  data={sortedConjunctions}
                  filename="conjunction-events"
                  columns={DEBRIS_CONJUNCTION_EXPORT_COLUMNS}
                  label="Export"
                />
              </div>
            </div>
          </div>

          {sortedConjunctions.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">&#10003;</span>
              <h3 className="text-xl font-semibold text-green-400 mb-2">No Events Found</h3>
              <p className="text-slate-400">
                {riskFilter
                  ? `No ${riskFilter} risk conjunction events at this time.`
                  : 'No active conjunction events.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedConjunctions.map((event) => (
                <DebrisConjunctionCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRACKED OBJECTS SUB-TAB */}
      {activeSubTab === 'objects' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Filter by type:</span>
              <button
                onClick={() => setObjectTypeFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  objectTypeFilter === ''
                    ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                    : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                }`}
              >
                All ({notableDebris.length})
              </button>
              {DEBRIS_OBJECT_TYPES.map((type) => {
                const count = notableDebris.filter((o) => o.objectType === type.value).length;
                return (
                  <button
                    key={type.value}
                    onClick={() => setObjectTypeFilter(type.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                      objectTypeFilter === type.value
                        ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                        : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{type.icon}</span>
                    {type.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <ExportButton
                  data={filteredObjects}
                  filename="debris-objects"
                  columns={DEBRIS_EXPORT_COLUMNS}
                  label="Export"
                />
              </div>
            </div>
          </div>

          {filteredObjects.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Objects Found</h3>
              <p className="text-slate-400">
                {objectTypeFilter
                  ? `No ${objectTypeFilter.replace('_', ' ')} objects in the database.`
                  : 'No tracked objects available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredObjects.map((obj) => (
                <DebrisObjectCard key={obj.id} obj={obj} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// OPERATIONS TAB CONTENT
// ════════════════════════════════════════════════════════════════

function OperationsTab() {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [overview, setOverview] = useState<OpsOverviewData | null>(null);
  const [conjunctions, setConjunctions] = useState<OperationalConjunction[]>([]);
  const [scorecards, setScorecards] = useState<SustainabilityScorecard[]>([]);
  const [spectrumAlerts, setSpectrumAlerts] = useState<SpectrumAlert[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<OpsSubTab>('overview');
  const [alertLevelFilter, setAlertLevelFilter] = useState<AlertLevel | ''>('');
  const [gradeFilter, setGradeFilter] = useState<ScorecardGrade | ''>('');
  const [severityFilter, setSeverityFilter] = useState<SpectrumSeverity | ''>('');

  const handleSubTabChange = (tab: OpsSubTab) => {
    setActiveSubTab(tab);
    setAlertLevelFilter('');
    setGradeFilter('');
    setSeverityFilter('');
  };

  const fetchData = async () => {
    try {
      const overviewRes = await fetch('/api/operational-awareness');
      const overviewData = await overviewRes.json();

      if (!overviewData.error) {
        setOverview(overviewData);
      }

      const [conjRes, scoreRes, specRes] = await Promise.all([
        fetch('/api/operational-awareness/conjunctions?includeCounts=true'),
        fetch('/api/operational-awareness/scorecards'),
        fetch('/api/operational-awareness/spectrum-alerts?includeCounts=true'),
      ]);

      const [conjData, scoreData, specData] = await Promise.all([
        conjRes.json(),
        scoreRes.json(),
        specRes.json(),
      ]);

      if (!conjData.error) setConjunctions(conjData.events || []);
      if (!scoreData.error) setScorecards(scoreData.scorecards || []);
      if (!specData.error) setSpectrumAlerts(specData.alerts || []);

    } catch (error) {
      console.error('Failed to fetch operational awareness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/operational-awareness/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const needsInit = !loading && (!overview || (conjunctions.length === 0 && scorecards.length === 0 && spectrumAlerts.length === 0));

  const filteredConjunctions = alertLevelFilter
    ? conjunctions.filter(c => c.alertLevel === alertLevelFilter)
    : conjunctions;

  const filteredScorecards = gradeFilter
    ? scorecards.filter(s => s.grade === gradeFilter)
    : scorecards;

  const filteredSpectrumAlerts = severityFilter
    ? spectrumAlerts.filter(a => a.severity === severityFilter)
    : spectrumAlerts;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (needsInit) {
    return (
      <div className="card p-12 text-center">
        <span className="text-6xl block mb-4">&#128640;</span>
        <h2 className="text-2xl font-semibold text-slate-100 mb-2">
          No Operational Data Available
        </h2>
        <p className="text-slate-400 mb-6 max-w-lg mx-auto">
          Initialize the operational awareness module with conjunction events, sustainability scorecards, and spectrum alerts.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary py-3 px-8"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Loading Data...
            </span>
          ) : (
            'Load Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Conjunction Threat</div>
                <div className={`text-xl font-bold capitalize ${getStatusColor(overview.overallStatus.conjunctionThreat)}`}>
                  {overview.overallStatus.conjunctionThreat}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-100">{overview.conjunctions.total}</div>
                <div className="text-slate-400 text-xs">Active Events</div>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Spectrum Health</div>
                <div className={`text-xl font-bold capitalize ${getStatusColor(overview.overallStatus.spectrumHealth)}`}>
                  {overview.overallStatus.spectrumHealth}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-100">{overview.spectrum.totalAlerts}</div>
                <div className="text-slate-400 text-xs">Active Alerts</div>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Sustainability Trend</div>
                <div className={`text-xl font-bold capitalize ${getStatusColor(overview.overallStatus.sustainabilityTrend)}`}>
                  {overview.overallStatus.sustainabilityTrend}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-100">{overview.sustainability.averageScore}</div>
                <div className="text-slate-400 text-xs">Avg. Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'conjunctions' as const, label: 'Conjunction Dashboard', count: conjunctions.length },
          { id: 'scorecards' as const, label: 'Sustainability Scorecards', count: scorecards.length },
          { id: 'spectrum' as const, label: 'Spectrum Alerts', count: spectrumAlerts.filter(a => a.status === 'active').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSubTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW SUB-TAB */}
      {activeSubTab === 'overview' && overview && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {(['red', 'orange', 'yellow', 'green'] as AlertLevel[]).map((level) => {
              const info = ALERT_LEVEL_INFO[level];
              const count = overview.conjunctions.byLevel[level] || 0;
              return (
                <div key={level} className={`card p-4 text-center ${info.bgColor} border ${info.borderColor}`}>
                  <div className={`text-2xl font-bold ${info.color}`}>{count}</div>
                  <div className="text-slate-400 text-xs uppercase">{info.label}</div>
                </div>
              );
            })}
            {(['critical', 'high', 'medium', 'low'] as SpectrumSeverity[]).map((sev) => {
              const info = SEVERITY_INFO[sev];
              const count = overview.spectrum.bySeverity[sev] || 0;
              return (
                <div key={sev} className={`card p-4 text-center ${info.bgColor}`}>
                  <div className={`text-2xl font-bold ${info.color}`}>{count}</div>
                  <div className="text-slate-400 text-xs uppercase">{sev} Spectrum</div>
                </div>
              );
            })}
          </div>

          {/* Critical Conjunctions */}
          {overview.conjunctions.critical.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Critical Conjunction Events</h2>
                <button
                  onClick={() => handleSubTabChange('conjunctions')}
                  className="text-nebula-300 hover:text-nebula-200 text-sm"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-4">
                {overview.conjunctions.critical.slice(0, 3).map((event) => (
                  <OpsConjunctionCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Top Performers & Critical Spectrum */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Top Sustainability Performers</h2>
                <button
                  onClick={() => handleSubTabChange('scorecards')}
                  className="text-nebula-300 hover:text-nebula-200 text-sm"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-4">
                {overview.sustainability.topPerformers.slice(0, 3).map((scorecard) => (
                  <div key={scorecard.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-200">{scorecard.operatorName}</h3>
                      <p className="text-slate-400 text-sm">{scorecard.totalSatellites.toLocaleString()} satellites</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${GRADE_INFO[scorecard.grade].color}`}>
                        {scorecard.grade}
                      </div>
                      <div className="text-slate-400 text-xs">{scorecard.overallScore}/100</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Critical Spectrum Alerts</h2>
              {overview.spectrum.critical.length > 0 ? (
                <div className="space-y-4">
                  {overview.spectrum.critical.slice(0, 3).map((alert) => (
                    <div key={alert.id} className={`card p-4 border ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-900/20' : 'border-orange-500 bg-orange-900/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${SEVERITY_INFO[alert.severity].bgColor} ${SEVERITY_INFO[alert.severity].color}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-nebula-300 font-medium">{alert.frequencyBand}</span>
                      </div>
                      <p className="text-slate-300 text-sm line-clamp-2">{alert.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center bg-green-900/20 border border-green-500/30">
                  <span className="text-4xl block mb-2">&#10003;</span>
                  <p className="text-green-400">No critical spectrum alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Sustainability Grade Distribution</h2>
            <div className="flex items-end gap-4 h-40">
              {(['A', 'B', 'C', 'D', 'F'] as ScorecardGrade[]).map((grade) => {
                const count = overview.sustainability.gradeDistribution[grade] || 0;
                const maxCount = Math.max(...Object.values(overview.sustainability.gradeDistribution));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const gradeInfo = GRADE_INFO[grade];

                return (
                  <div key={grade} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-32">
                      <div className="text-slate-400 text-sm mb-1">{count}</div>
                      <div
                        className={`w-full rounded-t ${gradeInfo.bgColor} border-t-2 ${
                          grade === 'A' ? 'border-green-500' :
                          grade === 'B' ? 'border-blue-500' :
                          grade === 'C' ? 'border-yellow-500' :
                          grade === 'D' ? 'border-orange-500' :
                          'border-red-500'
                        }`}
                        style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <div className={`text-lg font-bold mt-2 ${gradeInfo.color}`}>{grade}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONJUNCTIONS SUB-TAB */}
      {activeSubTab === 'conjunctions' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Filter by alert level:</span>
              <button
                onClick={() => setAlertLevelFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  alertLevelFilter === ''
                    ? 'bg-nebula-500 text-slate-900'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                All ({conjunctions.length})
              </button>
              {(['red', 'orange', 'yellow', 'green'] as AlertLevel[]).map((level) => {
                const count = conjunctions.filter(c => c.alertLevel === level).length;
                const info = ALERT_LEVEL_INFO[level];
                return (
                  <button
                    key={level}
                    onClick={() => setAlertLevelFilter(level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      alertLevelFilter === level
                        ? `${info.bgColor} ${info.color} border ${info.borderColor}`
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {info.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <ExportButton
                  data={filteredConjunctions}
                  filename="conjunction-events"
                  columns={OPS_CONJUNCTION_EXPORT_COLUMNS}
                  label="Export"
                />
              </div>
            </div>
          </div>

          {filteredConjunctions.length === 0 ? (
            <div className="card p-12 text-center">
              <span className="text-5xl block mb-3">&#10003;</span>
              <h3 className="text-xl font-semibold text-green-400 mb-2">No Events Found</h3>
              <p className="text-slate-400">
                {alertLevelFilter
                  ? `No ${ALERT_LEVEL_INFO[alertLevelFilter].label.toLowerCase()} alert conjunction events.`
                  : 'No active conjunction events.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConjunctions
                .sort((a, b) => {
                  const order: Record<AlertLevel, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
                  const levelDiff = order[a.alertLevel] - order[b.alertLevel];
                  if (levelDiff !== 0) return levelDiff;
                  return new Date(a.tca).getTime() - new Date(b.tca).getTime();
                })
                .map((event) => (
                  <OpsConjunctionCard key={event.id} event={event} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* SCORECARDS SUB-TAB */}
      {activeSubTab === 'scorecards' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Filter by grade:</span>
              <button
                onClick={() => setGradeFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  gradeFilter === ''
                    ? 'bg-nebula-500 text-slate-900'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                All ({scorecards.length})
              </button>
              {(['A', 'B', 'C', 'D', 'F'] as ScorecardGrade[]).map((grade) => {
                const count = scorecards.filter(s => s.grade === grade).length;
                const info = GRADE_INFO[grade];
                return (
                  <button
                    key={grade}
                    onClick={() => setGradeFilter(grade)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      gradeFilter === grade
                        ? `${info.bgColor} ${info.color}`
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {grade} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <ExportButton
                  data={filteredScorecards}
                  filename="sustainability-scorecards"
                  columns={SCORECARD_EXPORT_COLUMNS}
                  label="Export"
                />
              </div>
            </div>
          </div>

          {filteredScorecards.length === 0 ? (
            <div className="card p-12 text-center">
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Scorecards Found</h3>
              <p className="text-slate-400">
                {gradeFilter
                  ? `No operators with grade ${gradeFilter}.`
                  : 'No sustainability scorecards available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredScorecards
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((scorecard) => (
                  <ScorecardCard key={scorecard.id} scorecard={scorecard} />
                ))}
            </div>
          )}

          {/* Scoring Methodology */}
          <div className="card p-6 mt-8 border-dashed">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Scoring Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-slate-300 font-medium mb-2">Score Components</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><span className="text-nebula-300">Deorbit Score:</span> Compliance with deorbit guidelines, active propulsion capability, target deorbit timeline</li>
                  <li><span className="text-nebula-300">Maneuver Score:</span> Collision avoidance responsiveness, autonomous maneuvering capability</li>
                  <li><span className="text-nebula-300">Debris Score:</span> Historical debris creation, design for demise compliance</li>
                  <li><span className="text-nebula-300">Transparency Score:</span> Data sharing with Space-Track, public reporting</li>
                </ul>
              </div>
              <div>
                <h4 className="text-slate-300 font-medium mb-2">Grade Thresholds</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><span className="text-green-400 font-medium">A (90-100):</span> Industry leader, exceeds all requirements</li>
                  <li><span className="text-blue-400 font-medium">B (80-89):</span> Above average, meets most best practices</li>
                  <li><span className="text-yellow-400 font-medium">C (70-79):</span> Adequate, meets minimum requirements</li>
                  <li><span className="text-orange-400 font-medium">D (60-69):</span> Below average, improvement needed</li>
                  <li><span className="text-red-400 font-medium">F (&lt;60):</span> Failing, significant concerns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPECTRUM SUB-TAB */}
      {activeSubTab === 'spectrum' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm mr-2">Filter by severity:</span>
              <button
                onClick={() => setSeverityFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  severityFilter === ''
                    ? 'bg-nebula-500 text-slate-900'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                All ({spectrumAlerts.length})
              </button>
              {(['critical', 'high', 'medium', 'low'] as SpectrumSeverity[]).map((sev) => {
                const count = spectrumAlerts.filter(a => a.severity === sev).length;
                const info = SEVERITY_INFO[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      severityFilter === sev
                        ? `${info.bgColor} ${info.color}`
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {info.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <ExportButton
                  data={filteredSpectrumAlerts}
                  filename="spectrum-alerts"
                  columns={SPECTRUM_EXPORT_COLUMNS}
                  label="Export"
                />
              </div>
            </div>
          </div>

          {filteredSpectrumAlerts.length === 0 ? (
            <div className="card p-12 text-center bg-green-900/20 border border-green-500/30">
              <span className="text-5xl block mb-3">&#10003;</span>
              <h3 className="text-xl font-semibold text-green-400 mb-2">No Alerts Found</h3>
              <p className="text-slate-400">
                {severityFilter
                  ? `No ${severityFilter} severity spectrum alerts.`
                  : 'No active spectrum alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSpectrumAlerts
                .sort((a, b) => {
                  const order: Record<SpectrumSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                  const sevDiff = order[a.severity] - order[b.severity];
                  if (sevDiff !== 0) return sevDiff;
                  return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
                })
                .map((alert) => (
                  <SpectrumAlertCard key={alert.id} alert={alert} />
                ))}
            </div>
          )}

          {/* Frequency Band Reference */}
          <div className="card p-6 mt-8">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Frequency Band Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { band: 'L-band', range: '1-2 GHz', services: ['MSS', 'GPS/GNSS', 'D2D'], level: 'high' },
                { band: 'S-band', range: '2-4 GHz', services: ['Weather Radar', 'MSS', 'ISS Comms'], level: 'medium' },
                { band: 'C-band', range: '4-8 GHz', services: ['FSS', 'Broadcast Distribution'], level: 'medium' },
                { band: 'X-band', range: '8-12 GHz', services: ['Military', 'Earth Observation'], level: 'low' },
                { band: 'Ku-band', range: '12-18 GHz', services: ['DTH TV', 'VSAT', 'Broadband'], level: 'high' },
                { band: 'Ka-band', range: '26.5-40 GHz', services: ['HTS', 'LEO Broadband', 'Gateways'], level: 'very_high' },
                { band: 'V-band', range: '40-75 GHz', services: ['Next-Gen Broadband', 'Feeder Links'], level: 'emerging' },
              ].map((band) => (
                <div key={band.band} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-nebula-300 font-medium">{band.band}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      band.level === 'very_high' ? 'bg-red-500/20 text-red-400' :
                      band.level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      band.level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      band.level === 'emerging' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {band.level === 'very_high' ? 'Very High' :
                       band.level === 'emerging' ? 'Emerging' :
                       band.level.charAt(0).toUpperCase() + band.level.slice(1)} Congestion
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm mb-2">{band.range}</div>
                  <div className="flex flex-wrap gap-1">
                    {band.services.map((service) => (
                      <span key={service} className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SCS Coordination Note */}
          <div className="card p-6 mt-6 border-l-4 border-nebula-500">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">SCS Coordination Status</h3>
            <p className="text-slate-400 text-sm mb-4">
              Supplemental Coverage from Space (SCS) enables direct-to-device (D2D) satellite connectivity for smartphones.
              The FCC has authorized several operators for SCS services, requiring careful coordination with terrestrial networks.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">AST SpaceMobile - Authorized</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">SpaceX/T-Mobile - Authorized</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">Lynk Global - Pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE CONTENT (with useSearchParams)
// ════════════════════════════════════════════════════════════════

const MAIN_TABS: { id: MainTab; label: string; description: string }[] = [
  { id: 'weather', label: 'Space Weather', description: 'Solar activity monitoring & forecasts' },
  { id: 'debris', label: 'Debris Tracking', description: 'Orbital debris & collision risk' },
  { id: 'operations', label: 'Operations', description: 'Conjunction monitoring & sustainability' },
];

function SpaceEnvironmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialTab: MainTab = (tabParam && ['weather', 'debris', 'operations'].includes(tabParam))
    ? tabParam
    : 'weather';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'weather') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Environment Monitor"
          subtitle="Unified dashboard for space weather, orbital debris tracking, and operational awareness"
          icon="☀️"
          accentColor="red"
        />

        {/* Main Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 bg-slate-800/50 rounded-xl w-fit">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <div className="text-sm font-semibold">{tab.label}</div>
              <div className={`text-xs mt-0.5 ${activeTab === tab.id ? 'text-white/70' : 'text-slate-500'}`}>
                {tab.description}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'weather' && <SpaceWeatherTab />}
        {activeTab === 'debris' && <DebrisTrackingTab />}
        {activeTab === 'operations' && <OperationsTab />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DEFAULT EXPORT (Suspense boundary for useSearchParams)
// ════════════════════════════════════════════════════════════════

export default function SpaceEnvironmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <SpaceEnvironmentContent />
    </Suspense>
  );
}
