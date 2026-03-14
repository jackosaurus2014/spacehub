'use client';

import { useState, useEffect } from 'react';
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
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { clientLogger } from '@/lib/client-logger';

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
            <div className="bg-white/[0.04] rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Primary</span>
              <span className="text-white/90 font-medium">{event.primaryObject}</span>
            </div>
            <span className="text-slate-400 font-bold">vs</span>
            <div className="bg-white/[0.04] rounded px-3 py-1.5">
              <span className="text-slate-400 text-xs block">Secondary</span>
              <span className="text-white/90 font-medium">{event.secondaryObject}</span>
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

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] text-xs">
        <span className="text-slate-400">
          Miss Distance: <span className="text-white/70 font-bold">{event.missDistance.toFixed(1)} m</span>
        </span>
        <span className="text-slate-400">
          Collision Prob: <span className={`font-bold ${
            (event.collisionProb || 0) > 0.0001 ? 'text-red-400' : 'text-white/70'
          }`}>
            {formatProbability(event.collisionProb)}
          </span>
        </span>
        {event.relativeVelocity && (
          <span className="text-slate-400">
            Rel. Velocity: <span className="text-white/70 font-medium">{event.relativeVelocity.toFixed(1)} m/s</span>
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
          <h3 className="text-lg font-semibold text-white">{scorecard.operatorName}</h3>
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
          <div key={item.label} className="bg-white/[0.04] rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">{item.label}</span>
              <span className={`text-sm font-bold ${
                item.score >= 80 ? 'text-green-400' :
                item.score >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>{item.score}</span>
            </div>
            <div className="h-1.5 bg-white/[0.08]rounded-full overflow-hidden">
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
        <div className="bg-white/[0.03] rounded p-3 mb-3">
          <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-1">Deorbit Plan</h4>
          <p className="text-white/70 text-sm line-clamp-3">{scorecard.deorbitPlan}</p>
        </div>
      )}

      {scorecard.notes && (
        <p className="text-slate-400 text-xs line-clamp-2">{scorecard.notes}</p>
      )}

      <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-slate-400">
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
      'border-white/[0.08]'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded ${severityInfo.bgColor} ${severityInfo.color}`}>
            {severityInfo.label.toUpperCase()}
          </span>
          <span className="text-xs bg-white/[0.08] text-white/70 px-2 py-0.5 rounded capitalize">
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
        <div className="bg-white/10 text-white/90 px-3 py-1 rounded text-sm font-medium">
          {alert.frequencyBand}
        </div>
        {alert.affectedService && (
          <span className="text-slate-400 text-sm">{alert.affectedService}</span>
        )}
      </div>

      <p className="text-white/70 text-sm mb-3">{alert.description}</p>

      {alert.location && (
        <div className="text-slate-400 text-xs">
          Location: <span className="text-slate-400">{alert.location}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// OPERATIONS TAB CONTENT
// ════════════════════════════════════════════════════════════════

export default function OperationsTab() {
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
  const [error, setError] = useState<string | null>(null);

  const handleSubTabChange = (tab: OpsSubTab) => {
    setActiveSubTab(tab);
    setAlertLevelFilter('');
    setGradeFilter('');
    setSeverityFilter('');
  };

  const fetchData = async () => {
    setError(null);
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
      clientLogger.error('Failed to fetch operational awareness data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
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
      clientLogger.error('Failed to initialize data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
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
        <h2 className="text-2xl font-semibold text-white mb-2">
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
      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium mb-3">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

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
                <div className="text-2xl font-bold text-white">{overview.conjunctions.total}</div>
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
                <div className="text-2xl font-bold text-white">{overview.spectrum.totalAlerts}</div>
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
                <div className="text-2xl font-bold text-white">{overview.sustainability.averageScore}</div>
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
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSubTab === tab.id ? 'bg-white/20 text-slate-900' : 'bg-white/[0.08] text-slate-400'
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
                <h2 className="text-xl font-semibold text-white">Critical Conjunction Events</h2>
                <button
                  onClick={() => handleSubTabChange('conjunctions')}
                  className="text-white/90 hover:text-white text-sm"
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
                <h2 className="text-xl font-semibold text-white">Top Sustainability Performers</h2>
                <button
                  onClick={() => handleSubTabChange('scorecards')}
                  className="text-white/90 hover:text-white text-sm"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-4">
                {overview.sustainability.topPerformers.slice(0, 3).map((scorecard) => (
                  <div key={scorecard.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white/90">{scorecard.operatorName}</h3>
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
              <h2 className="text-xl font-semibold text-white mb-4">Critical Spectrum Alerts</h2>
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
                        <span className="text-white/90 font-medium">{alert.frequencyBand}</span>
                      </div>
                      <p className="text-white/70 text-sm line-clamp-2">{alert.description}</p>
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
          <ScrollReveal>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sustainability Grade Distribution</h2>
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
          </ScrollReveal>
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
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
                        : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
                        : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
              <h3 className="text-xl font-semibold text-white/70 mb-2">No Scorecards Found</h3>
              <p className="text-slate-400">
                {gradeFilter
                  ? `No operators with grade ${gradeFilter}.`
                  : 'No sustainability scorecards available.'}
              </p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredScorecards
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((scorecard) => (
                  <StaggerItem key={scorecard.id}>
                    <ScorecardCard scorecard={scorecard} />
                  </StaggerItem>
                ))}
            </StaggerContainer>
          )}

          {/* Scoring Methodology */}
          <div className="card p-6 mt-8 border-dashed">
            <h3 className="text-lg font-semibold text-white mb-4">Scoring Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-white/70 font-medium mb-2">Score Components</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><span className="text-white/90">Deorbit Score:</span> Compliance with deorbit guidelines, active propulsion capability, target deorbit timeline</li>
                  <li><span className="text-white/90">Maneuver Score:</span> Collision avoidance responsiveness, autonomous maneuvering capability</li>
                  <li><span className="text-white/90">Debris Score:</span> Historical debris creation, design for demise compliance</li>
                  <li><span className="text-white/90">Transparency Score:</span> Data sharing with Space-Track, public reporting</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/70 font-medium mb-2">Grade Thresholds</h4>
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
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
                        : 'bg-white/[0.08] text-slate-400 hover:bg-white/[0.1]'
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
            <h3 className="text-lg font-semibold text-white mb-4">Frequency Band Reference</h3>
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
                <div key={band.band} className="bg-white/[0.04] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/90 font-medium">{band.band}</span>
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
                      <span key={service} className="text-xs bg-white/[0.08] text-slate-400 px-2 py-0.5 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SCS Coordination Note */}
          <div className="card p-6 mt-6 border-l-4 border-white/15">
            <h3 className="text-lg font-semibold text-white mb-2">SCS Coordination Status</h3>
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
