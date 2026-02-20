'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import {
  assessRisk,
  RISK_FACTORS,
  SECTORS,
  ACTIVITY_FLAGS,
  CATEGORY_CONFIG,
  LICENSE_TIMELINES,
  type RiskAssessment,
  type CompanyRiskProfile,
} from '@/lib/regulatory/risk-scoring';

// ============================================================================
// TYPES
// ============================================================================

type ViewSection = 'form' | 'results' | 'reference';

// ============================================================================
// CONSTANTS
// ============================================================================

const RISK_LEVEL_CONFIG = {
  low: { label: 'LOW', color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { label: 'MEDIUM', color: '#f59e0b', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

// ============================================================================
// GAUGE COMPONENT
// ============================================================================

function RiskGauge({ score, riskLevel }: { score: number; riskLevel: RiskAssessment['riskLevel'] }) {
  const config = RISK_LEVEL_CONFIG[riskLevel];
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference * 0.75; // 270 degree arc

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="16"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={config.color}
            strokeWidth="16"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-slate-100">{score}</span>
          <span className="text-sm text-slate-400 mt-1">/ 100</span>
        </div>
      </div>
      <div className={`mt-2 px-4 py-1.5 rounded-full ${config.bg} ${config.border} border`}>
        <span className={`text-sm font-bold ${config.text} tracking-wider`}>{config.label} RISK</span>
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY SCORE CARD
// ============================================================================

function CategoryScoreCard({ category, score, factors }: {
  category: string;
  score: number;
  factors: { factorId: string; name: string; score: number; notes: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[category] || { label: category, color: '#94a3b8', icon: '?' };
  const barWidth = Math.min(score, 100);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h4 className="text-slate-100 font-semibold">{config.label}</h4>
            <p className="text-sm text-slate-400">{factors.length} factor{factors.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${barWidth}%`, backgroundColor: config.color }}
            />
          </div>
          <span className="text-lg font-bold text-slate-200 w-10 text-right">{score}</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-4">
          {factors.map(f => (
            <div key={f.factorId} className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200">{f.name}</span>
                <span className="text-sm font-bold" style={{ color: f.score >= 80 ? '#ef4444' : f.score >= 60 ? '#f97316' : f.score >= 40 ? '#f59e0b' : '#10b981' }}>
                  {f.score}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{f.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TIMELINE BAR CHART
// ============================================================================

function TimelineChart({ applicableFactors }: { applicableFactors: string[] }) {
  const items = applicableFactors
    .filter(id => LICENSE_TIMELINES[id])
    .map(id => {
      const factor = RISK_FACTORS.find(f => f.id === id);
      const timeline = LICENSE_TIMELINES[id];
      return {
        id,
        name: factor?.name || id,
        min: timeline.min,
        max: timeline.max,
        unit: timeline.unit,
      };
    })
    .sort((a, b) => b.max - a.max);

  if (items.length === 0) return null;

  const maxVal = Math.max(...items.map(i => i.max));

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Licensing Timeline Estimates</h3>
      <p className="text-sm text-slate-400 mb-6">Parallel processing assumed. Longest process determines critical path.</p>
      <div className="space-y-4">
        {items.map((item, i) => {
          const leftPct = (item.min / maxVal) * 100;
          const widthPct = ((item.max - item.min) / maxVal) * 100;

          return (
            <div key={item.id} className="flex items-center gap-4">
              <div className="w-48 shrink-0 text-right">
                <span className="text-xs text-slate-300 leading-tight">{item.name}</span>
              </div>
              <div className="flex-1 relative h-6">
                <div className="absolute inset-0 bg-slate-700/30 rounded" />
                <div
                  className="absolute top-0 h-full rounded transition-all duration-700"
                  style={{
                    left: `${(item.min / maxVal) * 100}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    backgroundColor: `hsl(${200 - i * 15}, 70%, 55%)`,
                    opacity: 0.8,
                  }}
                />
                {/* Min marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-slate-400"
                  style={{ left: `${leftPct}%` }}
                />
              </div>
              <div className="w-24 shrink-0">
                <span className="text-xs text-slate-400">{item.min}-{item.max} {item.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// RISK FACTOR REFERENCE ACCORDION
// ============================================================================

function RiskFactorReference() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = Array.from(new Set(RISK_FACTORS.map(f => f.category)));

  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const config = CATEGORY_CONFIG[cat] || { label: cat, color: '#94a3b8', icon: '?' };
        const factors = RISK_FACTORS.filter(f => f.category === cat);

        return (
          <div key={cat} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
              <span>{config.icon}</span>
              <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{config.label}</h4>
            </div>
            <div className="divide-y divide-slate-700/30">
              {factors.map(f => (
                <div key={f.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-200">{f.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                        Weight: {f.weight}/10
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedId === f.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedId === f.id && (
                    <div className="px-5 pb-4 space-y-2">
                      <p className="text-sm text-slate-300">{f.description}</p>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-xs text-cyan-400 font-medium mb-1">Assessment Question:</p>
                        <p className="text-xs text-slate-400">{f.assessmentQuestion}</p>
                      </div>
                      {LICENSE_TIMELINES[f.id] && (
                        <p className="text-xs text-slate-500">
                          Estimated timeline: {LICENSE_TIMELINES[f.id].min}-{LICENSE_TIMELINES[f.id].max} {LICENSE_TIMELINES[f.id].unit}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RegulatoryRiskPage() {
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [activeSection, setActiveSection] = useState<ViewSection>('form');
  const resultsRef = useRef<HTMLDivElement>(null);

  const toggleActivity = useCallback((actId: string) => {
    setSelectedActivities(prev =>
      prev.includes(actId) ? prev.filter(a => a !== actId) : [...prev, actId]
    );
  }, []);

  const runAssessment = useCallback(() => {
    if (!selectedSector) return;

    setIsAssessing(true);

    // Simulate brief processing time for UX feedback
    setTimeout(() => {
      const profile: CompanyRiskProfile = {
        sector: selectedSector,
        activitiesFlags: selectedActivities,
      };

      const result = assessRisk(profile);
      setAssessment(result);
      setIsAssessing(false);
      setActiveSection('results');

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 500);
  }, [selectedSector, selectedActivities]);

  const resetForm = useCallback(() => {
    setSelectedSector('');
    setSelectedActivities([]);
    setAssessment(null);
    setActiveSection('form');
  }, []);

  // Collect applicable risk factor IDs for timeline
  const applicableFactorIds = assessment
    ? assessment.categoryScores.flatMap(cs => cs.factors.map(f => f.factorId))
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AnimatedPageHeader
          title="Regulatory Risk Assessment"
          subtitle="Evaluate regulatory complexity and licensing requirements for space industry operations. Identify risks, estimate timelines, and get actionable compliance recommendations."
          breadcrumb="Regulatory & Compliance"
          accentColor="amber"
        />

        <InlineDisclaimer />

        {/* Navigation Pills */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveSection('form')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'form'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200'
            }`}
          >
            Profile Builder
          </button>
          <button
            onClick={() => assessment && setActiveSection('results')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'results'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : assessment
                  ? 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200'
                  : 'bg-slate-800/30 text-slate-600 border border-slate-700/30 cursor-not-allowed'
            }`}
            disabled={!assessment}
          >
            Risk Dashboard
          </button>
          <button
            onClick={() => setActiveSection('reference')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'reference'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200'
            }`}
          >
            Risk Factor Reference
          </button>
        </div>

        {/* ── PROFILE BUILDER SECTION ────────────────────────────────── */}
        {activeSection === 'form' && (
          <ScrollReveal>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-100 mb-6">Company Risk Profile Builder</h2>

              {/* Sector Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Primary Sector <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SECTORS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSector(s.id)}
                      className={`px-4 py-3 rounded-xl text-left text-sm font-medium transition-all border ${
                        selectedSector === s.id
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Flags */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Company Activities
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Select all activities that apply. These refine the risk assessment beyond the base sector profile.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACTIVITY_FLAGS.map(a => (
                    <label
                      key={a.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                        selectedActivities.includes(a.id)
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedActivities.includes(a.id)}
                        onChange={() => toggleActivity(a.id)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                      <span className="text-sm">{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4">
                <button
                  onClick={runAssessment}
                  disabled={!selectedSector || isAssessing}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                    selectedSector && !isAssessing
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isAssessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Assessing...
                    </span>
                  ) : (
                    'Run Risk Assessment'
                  )}
                </button>
                {assessment && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Quick preview of selected profile */}
              {selectedSector && (
                <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Selected Profile</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                      {SECTORS.find(s => s.id === selectedSector)?.label}
                    </span>
                    {selectedActivities.map(a => (
                      <span key={a} className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                        {ACTIVITY_FLAGS.find(af => af.id === a)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ── RESULTS DASHBOARD SECTION ──────────────────────────────── */}
        {activeSection === 'results' && assessment && (
          <div ref={resultsRef}>
            <StaggerContainer className="space-y-6">
              {/* Score Overview Row */}
              <StaggerItem>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Gauge */}
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center">
                    <RiskGauge score={assessment.overallScore} riskLevel={assessment.riskLevel} />
                  </div>

                  {/* Key Stats */}
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimated Licensing Timeline</p>
                      <p className="text-2xl font-bold text-slate-100">{assessment.estimatedTimeline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Risk Categories</p>
                      <p className="text-2xl font-bold text-slate-100">{assessment.categoryScores.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Risk Factors</p>
                      <p className="text-2xl font-bold text-slate-100">
                        {assessment.categoryScores.reduce((sum, c) => sum + c.factors.length, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Required Licenses */}
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                      Required Licenses & Authorizations
                    </h3>
                    {assessment.requiredLicenses.length > 0 ? (
                      <ul className="space-y-2">
                        {assessment.requiredLicenses.map((lic, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-slate-300">{lic}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">No specific licenses identified for this profile.</p>
                    )}
                  </div>
                </div>
              </StaggerItem>

              {/* Category Breakdown */}
              <StaggerItem>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Risk Category Breakdown</h3>
                <div className="space-y-3">
                  {assessment.categoryScores.map(cs => (
                    <CategoryScoreCard
                      key={cs.category}
                      category={cs.category}
                      score={cs.score}
                      factors={cs.factors}
                    />
                  ))}
                </div>
              </StaggerItem>

              {/* Timeline Visualization */}
              <StaggerItem>
                <TimelineChart applicableFactors={applicableFactorIds} />
              </StaggerItem>

              {/* Recommendations */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Recommendations</h3>
                  {assessment.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {assessment.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No specific recommendations for this profile.</p>
                  )}
                </div>
              </StaggerItem>

              {/* Actions */}
              <StaggerItem>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveSection('form')}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
                  >
                    Modify Profile
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
                  >
                    New Assessment
                  </button>
                  <Link
                    href="/compliance"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                  >
                    View Full Compliance Hub
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        )}

        {/* ── RISK FACTOR REFERENCE SECTION ──────────────────────────── */}
        {activeSection === 'reference' && (
          <ScrollReveal>
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-2">Risk Factor Reference</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Complete reference of all {RISK_FACTORS.length} regulatory risk factors assessed by the engine.
                  Each factor has a weight (1-10) reflecting its regulatory impact severity.
                </p>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const count = RISK_FACTORS.filter(f => f.category === key).length;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="bg-slate-900/50 rounded-lg p-3 text-center">
                        <span className="text-2xl">{config.icon}</span>
                        <p className="text-xs text-slate-400 mt-1">{config.label}</p>
                        <p className="text-lg font-bold text-slate-200">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <RiskFactorReference />
            </div>
          </ScrollReveal>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Need help navigating space regulations?{' '}
            <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Explore the Compliance Hub
            </Link>{' '}
            for detailed regulatory tracking, or{' '}
            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              contact us
            </Link>{' '}
            for expert referrals.
          </p>
        </div>
      </div>
    </main>
  );
}
