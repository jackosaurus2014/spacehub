'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OperatorType = 'government' | 'commercial' | 'constellation';
type ScoreGrade = 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
type ScoreRange = 'all' | 'A' | 'B' | 'C' | 'D+below';

interface CriteriaScore {
  debrisMitigation: number;
  postMissionDisposal: number;
  collisionAvoidance: number;
  transparencyDataSharing: number;
  environmentalImpact: number;
}

interface Operator {
  name: string;
  grade: ScoreGrade;
  score: number;
  type: OperatorType;
  summary: string;
  criteria: CriteriaScore;
  highlights: string[];
  challenges: string[];
  trend: 'up' | 'down' | 'stable';
  trendDelta: number;
}

interface BestPractice {
  title: string;
  description: string;
  status: 'active' | 'proposed' | 'recommended';
  icon: string;
}

interface RegulatoryFramework {
  name: string;
  body: string;
  year: string;
  description: string;
  scope: string;
  status: 'enacted' | 'guideline' | 'standard';
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const INDUSTRY_CRITERIA: { key: keyof CriteriaScore; label: string; score: number; maxScore: number; description: string }[] = [
  { key: 'debrisMitigation', label: 'Debris Mitigation Compliance', score: 15, maxScore: 20, description: 'Adherence to international debris mitigation standards and guidelines' },
  { key: 'postMissionDisposal', label: 'Post-Mission Disposal Plans', score: 14, maxScore: 20, description: 'Quality and reliability of end-of-life spacecraft disposal planning' },
  { key: 'collisionAvoidance', label: 'Collision Avoidance Capability', score: 16, maxScore: 20, description: 'Active maneuvering and conjunction assessment participation' },
  { key: 'transparencyDataSharing', label: 'Transparency & Data Sharing', score: 12, maxScore: 20, description: 'Sharing of orbital data, ephemeris, and operational status with the community' },
  { key: 'environmentalImpact', label: 'Environmental Impact (Ground Ops)', score: 15, maxScore: 20, description: 'Environmental footprint of launch and ground operations' },
];

const OPERATORS: Operator[] = [
  {
    name: 'ESA',
    grade: 'A',
    score: 88,
    type: 'government',
    summary: 'Gold standard for debris guidelines',
    criteria: { debrisMitigation: 19, postMissionDisposal: 18, collisionAvoidance: 18, transparencyDataSharing: 17, environmentalImpact: 16 },
    highlights: ['Clean Space initiative with dedicated ADR missions', 'Zero Debris Charter leadership', 'Open data policy for all missions'],
    challenges: ['Limited launch cadence reduces direct risk exposure', 'Dependent on member state compliance'],
    trend: 'up',
    trendDelta: 3,
  },
  {
    name: 'JAXA',
    grade: 'A-',
    score: 85,
    type: 'government',
    summary: 'Active debris removal investment',
    criteria: { debrisMitigation: 18, postMissionDisposal: 17, collisionAvoidance: 17, transparencyDataSharing: 16, environmentalImpact: 17 },
    highlights: ['CRD2 active debris removal technology demonstration', 'Astroscale partnership for ADR', 'Strong international cooperation'],
    challenges: ['Limited independent tracking infrastructure', 'Small constellation footprint'],
    trend: 'up',
    trendDelta: 4,
  },
  {
    name: 'NASA',
    grade: 'A-',
    score: 83,
    type: 'government',
    summary: 'Strong compliance, CDA standards',
    criteria: { debrisMitigation: 18, postMissionDisposal: 17, collisionAvoidance: 17, transparencyDataSharing: 16, environmentalImpact: 15 },
    highlights: ['NASA-STD-8719.14 debris mitigation standard', 'Conjunction Data Assessment (CDA) leadership', 'Extensive tracking via 18th SDS'],
    challenges: ['Legacy debris from historical missions', 'SLS solid rocket booster emissions'],
    trend: 'stable',
    trendDelta: 1,
  },
  {
    name: 'Planet Labs',
    grade: 'B+',
    score: 78,
    type: 'commercial',
    summary: 'Rapid deorbit compliance',
    criteria: { debrisMitigation: 16, postMissionDisposal: 16, collisionAvoidance: 16, transparencyDataSharing: 15, environmentalImpact: 15 },
    highlights: ['Low-altitude constellation ensures natural deorbit within 5 years', 'Consistent satellite refresh cycle', 'Small form factor minimizes collision cross-section'],
    challenges: ['High volume of objects in orbit', 'Limited individual satellite maneuvering capability'],
    trend: 'up',
    trendDelta: 2,
  },
  {
    name: 'SpaceX',
    grade: 'B',
    score: 74,
    type: 'constellation',
    summary: 'High volume but lower altitude, auto-deorbit',
    criteria: { debrisMitigation: 15, postMissionDisposal: 15, collisionAvoidance: 16, transparencyDataSharing: 13, environmentalImpact: 15 },
    highlights: ['Starlink autonomous collision avoidance system', 'Very low altitude (~550 km) ensures rapid deorbit', 'Reusable boosters reduce launch debris'],
    challenges: ['6,000+ objects represent largest single constellation', 'Astronomy interference concerns', 'Limited data sharing with other operators'],
    trend: 'up',
    trendDelta: 2,
  },
  {
    name: 'OneWeb',
    grade: 'B',
    score: 72,
    type: 'constellation',
    summary: 'Improved since Gen2 constellation',
    criteria: { debrisMitigation: 15, postMissionDisposal: 14, collisionAvoidance: 15, transparencyDataSharing: 14, environmentalImpact: 14 },
    highlights: ['Responsible Space initiative', 'Gen2 satellites with improved deorbit capability', 'Active data sharing with Space-Track'],
    challenges: ['Higher orbit altitude (1,200 km) means slower natural deorbit', 'Gen1 satellites lack active deorbit propulsion'],
    trend: 'up',
    trendDelta: 5,
  },
  {
    name: 'Rocket Lab',
    grade: 'B',
    score: 71,
    type: 'commercial',
    summary: 'Small payload, low debris risk',
    criteria: { debrisMitigation: 15, postMissionDisposal: 14, collisionAvoidance: 14, transparencyDataSharing: 14, environmentalImpact: 14 },
    highlights: ['Electron kick stage for precise orbital delivery', 'Neutron designed with reusability', 'Small payload class reduces collision risk per launch'],
    challenges: ['Upper stage disposal track record mixed', 'Growing launch cadence increases cumulative risk'],
    trend: 'stable',
    trendDelta: 1,
  },
  {
    name: 'Telesat',
    grade: 'B-',
    score: 68,
    type: 'constellation',
    summary: 'Lightspeed designed for sustainability',
    criteria: { debrisMitigation: 14, postMissionDisposal: 14, collisionAvoidance: 14, transparencyDataSharing: 13, environmentalImpact: 13 },
    highlights: ['Lightspeed LEO constellation designed with sustainability in mind', 'Built-in deorbit capability for all satellites', 'Relatively small constellation (298 satellites)'],
    challenges: ['Not yet fully operational', 'Limited operational track record for sustainability claims'],
    trend: 'stable',
    trendDelta: 0,
  },
  {
    name: 'Amazon Kuiper',
    grade: 'B-',
    score: 67,
    type: 'constellation',
    summary: 'Plans in place, not yet operational',
    criteria: { debrisMitigation: 14, postMissionDisposal: 13, collisionAvoidance: 14, transparencyDataSharing: 13, environmentalImpact: 13 },
    highlights: ['FCC commitment to deorbit within 355 days of end-of-life', 'Designed with collision avoidance from the start', 'Transparency commitments to Space Safety Coalition'],
    challenges: ['Unproven at scale — limited satellites deployed', 'Large planned constellation (3,236 satellites)', 'No operational history to evaluate'],
    trend: 'stable',
    trendDelta: 0,
  },
  {
    name: 'Iridium',
    grade: 'C+',
    score: 63,
    type: 'constellation',
    summary: 'Legacy debris from 2009 collision',
    criteria: { debrisMitigation: 13, postMissionDisposal: 13, collisionAvoidance: 13, transparencyDataSharing: 12, environmentalImpact: 12 },
    highlights: ['Iridium NEXT replaced aging Gen1 constellation', 'Active participation in conjunction assessments', 'Planned controlled deorbit of old satellites'],
    challenges: ['Iridium 33 / Cosmos 2251 collision legacy debris', 'Some Gen1 satellites still in orbit uncontrolled', '780 km altitude means slow natural deorbit'],
    trend: 'up',
    trendDelta: 3,
  },
  {
    name: 'India (ISRO)',
    grade: 'C+',
    score: 62,
    type: 'government',
    summary: 'Improving, ASAT test debris',
    criteria: { debrisMitigation: 13, postMissionDisposal: 12, collisionAvoidance: 13, transparencyDataSharing: 12, environmentalImpact: 12 },
    highlights: ['IS 4005 debris mitigation guidelines adopted', 'Project NETRA for space situational awareness', 'Growing investment in tracking infrastructure'],
    challenges: ['Mission Shakti ASAT test created trackable debris', 'Limited data sharing on military programs', 'Growing launch cadence with developing compliance framework'],
    trend: 'up',
    trendDelta: 4,
  },
  {
    name: 'China (Various)',
    grade: 'C',
    score: 55,
    type: 'government',
    summary: 'ASAT debris, improving practices',
    criteria: { debrisMitigation: 12, postMissionDisposal: 11, collisionAvoidance: 12, transparencyDataSharing: 9, environmentalImpact: 11 },
    highlights: ['Long March 5B now attempts controlled ocean reentry', 'Growing SSA capability', 'Debris mitigation guidelines adopted domestically'],
    challenges: ['2007 ASAT test remains largest single debris-creating event', 'Uncontrolled Long March 5B reentries', 'Limited international data sharing and transparency'],
    trend: 'up',
    trendDelta: 3,
  },
  {
    name: 'Russia (Roscosmos)',
    grade: 'C-',
    score: 48,
    type: 'government',
    summary: 'ASAT debris, limited compliance',
    criteria: { debrisMitigation: 10, postMissionDisposal: 10, collisionAvoidance: 10, transparencyDataSharing: 8, environmentalImpact: 10 },
    highlights: ['Historical SSA contributions and tracking capability', 'Soyuz reliability reduces per-launch risk', 'Some passivation procedures for upper stages'],
    challenges: ['2021 Cosmos 1408 ASAT test created 1,500+ debris fragments', 'Reduced international cooperation post-2022', 'Limited compliance with international guidelines'],
    trend: 'down',
    trendDelta: -5,
  },
];

const BEST_PRACTICES: BestPractice[] = [
  {
    title: '25-Year Deorbit Rule (Proposed 5-Year)',
    description: 'Historically, operators had 25 years to deorbit LEO spacecraft post-mission. The FCC now requires 5 years for new US-licensed satellites, and international bodies are considering similar reductions. This dramatically reduces long-term orbital congestion.',
    status: 'proposed',
    icon: '⏱️',
  },
  {
    title: 'Passivation Requirements',
    description: 'All stored energy sources (batteries, fuel tanks, pressure vessels, reaction wheels) must be depleted at end of life to prevent accidental explosions that generate debris. This is one of the most cost-effective debris mitigation measures.',
    status: 'active',
    icon: '🔋',
  },
  {
    title: 'Trackability Standards',
    description: 'Satellites should be designed to be trackable by ground-based SSA systems. This includes minimum radar cross-section requirements, retroreflectors for laser ranging, and active transponders for cooperative tracking.',
    status: 'recommended',
    icon: '📡',
  },
  {
    title: 'Conjunction Assessment Participation',
    description: 'Operators should participate in conjunction assessment programs (e.g., 18th SDS, EU SST) by sharing high-accuracy ephemeris data and responding to collision avoidance warnings in a timely manner.',
    status: 'active',
    icon: '🛡️',
  },
  {
    title: 'End-of-Life Disposal Planning',
    description: 'Every mission must include a credible disposal plan — either controlled reentry, graveyard orbit transfer, or natural deorbit within the required timeframe. Plans must account for propulsion failures with passive backup strategies.',
    status: 'active',
    icon: '📋',
  },
];

const REGULATORY_FRAMEWORKS: RegulatoryFramework[] = [
  {
    name: 'FCC 5-Year Rule',
    body: 'Federal Communications Commission (FCC)',
    year: '2024',
    description: 'Requires all new US-licensed LEO satellites to deorbit within 5 years of mission end, down from the previous 25-year guideline. First binding regulatory requirement of its kind.',
    scope: 'US-licensed satellites',
    status: 'enacted',
  },
  {
    name: 'UN COPUOS Guidelines',
    body: 'United Nations COPUOS',
    year: '2007 (updated 2019)',
    description: 'Long-term Sustainability Guidelines for Outer Space Activities. Non-binding but influential framework covering debris mitigation, SSA data sharing, and sustainable space operations.',
    scope: 'All UN member states',
    status: 'guideline',
  },
  {
    name: 'ISO 24113',
    body: 'International Organization for Standardization',
    year: '2011 (revised 2024)',
    description: 'International standard for space debris mitigation requirements. Covers mission planning, design, manufacturing, launch, operations, and disposal phases.',
    scope: 'Global voluntary standard',
    status: 'standard',
  },
  {
    name: 'ESA Space Debris Mitigation Guidelines',
    body: 'European Space Agency',
    year: '2014 (updated 2023)',
    description: 'Comprehensive debris mitigation requirements for all ESA missions. Includes Zero Debris Charter target of zero new debris by 2030. More stringent than IADC guidelines.',
    scope: 'ESA and member state missions',
    status: 'guideline',
  },
  {
    name: 'IADC Space Debris Mitigation Guidelines',
    body: 'Inter-Agency Space Debris Coordination Committee',
    year: '2002 (revised 2021)',
    description: 'Foundational guidelines developed by 13 space agencies. Covers limiting debris during normal operations, minimizing breakup potential, post-mission disposal, and collision avoidance.',
    scope: 'IADC member agencies (13 agencies)',
    status: 'guideline',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGradeColor(grade: ScoreGrade): string {
  if (grade.startsWith('A')) return 'text-emerald-400';
  if (grade.startsWith('B')) return 'text-cyan-400';
  if (grade.startsWith('C')) return 'text-amber-400';
  return 'text-red-400';
}

function getGradeBg(grade: ScoreGrade): string {
  if (grade.startsWith('A')) return 'bg-emerald-500/20 border-emerald-500/40';
  if (grade.startsWith('B')) return 'bg-cyan-500/20 border-cyan-500/40';
  if (grade.startsWith('C')) return 'bg-amber-500/20 border-amber-500/40';
  return 'bg-red-500/20 border-red-500/40';
}

function getScoreBarColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.85) return 'bg-emerald-500';
  if (pct >= 0.7) return 'bg-cyan-500';
  if (pct >= 0.55) return 'bg-amber-500';
  return 'bg-red-500';
}

function getOperatorTypeLabel(type: OperatorType): string {
  switch (type) {
    case 'government': return 'Government';
    case 'commercial': return 'Commercial';
    case 'constellation': return 'Constellation';
  }
}

function getOperatorTypeBadge(type: OperatorType): string {
  switch (type) {
    case 'government': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'commercial': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'constellation': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
  }
}

function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'text-emerald-400';
    case 'down': return 'text-red-400';
    case 'stable': return 'text-slate-400';
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'active':
    case 'enacted': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'proposed': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'recommended':
    case 'guideline': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'standard': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function matchesScoreRange(score: number, range: ScoreRange): boolean {
  if (range === 'all') return true;
  if (range === 'A') return score >= 80;
  if (range === 'B') return score >= 65 && score < 80;
  if (range === 'C') return score >= 50 && score < 65;
  if (range === 'D+below') return score < 50;
  return true;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverallScoreCard() {
  const totalScore = INDUSTRY_CRITERIA.reduce((sum, c) => sum + c.score, 0);

  return (
    <div className="card p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">Overall Industry Sustainability Score</h2>
          <p className="text-slate-400 text-sm mb-4">
            Aggregate score across all tracked operators and criteria. Weighted equally across 5 categories, each scored 0-20.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
              ↑ +3 pts from 2024
            </span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-slate-400 text-xs">Updated Q1 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(totalScore / 100) * 327} 327`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-100">{totalScore}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getGradeColor('B+')}`}>B+</div>
            <div className="text-xs text-slate-400 mt-1">Grade</div>
          </div>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['sustainability-scorecard']} />
      </div>
    </div>
  );
}

function CriteriaBreakdown() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Scoring Criteria Breakdown</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {INDUSTRY_CRITERIA.map((criteria) => (
          <div key={criteria.key} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-slate-100">{criteria.score}</span>
              <span className="text-xs text-slate-500">/ {criteria.maxScore}</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getScoreBarColor(criteria.score, criteria.maxScore)}`}
                style={{ width: `${(criteria.score / criteria.maxScore) * 100}%` }}
              />
            </div>
            <h3 className="text-sm font-medium text-slate-200 mb-1">{criteria.label}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{criteria.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperatorCard({ operator, rank }: { operator: Operator; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const criteriaLabels: Record<keyof CriteriaScore, string> = {
    debrisMitigation: 'Debris Mitigation',
    postMissionDisposal: 'Post-Mission Disposal',
    collisionAvoidance: 'Collision Avoidance',
    transparencyDataSharing: 'Transparency',
    environmentalImpact: 'Environmental Impact',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono w-5">#{rank}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{operator.name}</h3>
            <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${getOperatorTypeBadge(operator.type)}`}>
              {getOperatorTypeLabel(operator.type)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium flex items-center gap-0.5 ${getTrendColor(operator.trend)}`}>
            {getTrendIcon(operator.trend)} {operator.trendDelta > 0 ? '+' : ''}{operator.trendDelta}
          </span>
          <div className={`px-3 py-1.5 rounded-lg border font-bold text-lg ${getGradeBg(operator.grade)} ${getGradeColor(operator.grade)}`}>
            {operator.grade}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-3">{operator.summary}</p>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-slate-700/50 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${getScoreBarColor(operator.score, 100)}`}
            style={{ width: `${operator.score}%` }}
          />
        </div>
        <span className="text-sm font-bold text-slate-200 w-14 text-right">{operator.score}/100</span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${operator.name}`}
      >
        {expanded ? 'Hide Details' : 'Show Details'}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              {/* Category breakdown */}
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Category Scores</h4>
              <div className="space-y-2 mb-4">
                {(Object.keys(operator.criteria) as (keyof CriteriaScore)[]).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-32 shrink-0">{criteriaLabels[key]}</span>
                    <div className="flex-1 bg-slate-700/40 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getScoreBarColor(operator.criteria[key], 20)}`}
                        style={{ width: `${(operator.criteria[key] / 20) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 font-mono w-8 text-right">{operator.criteria[key]}/20</span>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h4>
              <ul className="space-y-1 mb-4">
                {operator.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                    {h}
                  </li>
                ))}
              </ul>

              {/* Challenges */}
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Challenges</h4>
              <ul className="space-y-1">
                {operator.challenges.map((c, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">-</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BestPracticesSection() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Best Practices</h2>
      <div className="space-y-4">
        {BEST_PRACTICES.map((practice) => (
          <ScrollReveal key={practice.title}>
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0">{practice.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-100">{practice.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${getStatusBadge(practice.status)}`}>
                      {practice.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{practice.description}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}

function RegulatoryFrameworkSection() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Regulatory Framework</h2>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.08}>
        {REGULATORY_FRAMEWORKS.map((framework) => (
          <StaggerItem key={framework.name}>
            <div className="card p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-100 leading-tight">{framework.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0 ${getStatusBadge(framework.status)}`}>
                  {framework.status}
                </span>
              </div>
              <p className="text-xs text-cyan-400 mb-2">{framework.body}</p>
              <p className="text-xs text-slate-400 leading-relaxed flex-1">{framework.description}</p>
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Scope: {framework.scope}</span>
                <span className="text-[10px] text-slate-500">{framework.year}</span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SustainabilityScorecardPage() {
  const [scoreRange, setScoreRange] = useState<ScoreRange>('all');
  const [operatorType, setOperatorType] = useState<OperatorType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOperators = useMemo(() => {
    return OPERATORS.filter((op) => {
      if (!matchesScoreRange(op.score, scoreRange)) return false;
      if (operatorType !== 'all' && op.type !== operatorType) return false;
      if (searchQuery && !op.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [scoreRange, operatorType, searchQuery]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Intelligence', href: '/market-intel' },
          { name: 'Sustainability' },
        ]} />
        <Breadcrumbs items={[
          { label: 'Intelligence', href: '/market-intel' },
          { label: 'Sustainability' },
        ]} />

        <AnimatedPageHeader
          title="Space Sustainability Scorecard"
          subtitle="Comprehensive sustainability ratings for space operators. Tracking debris mitigation, disposal compliance, collision avoidance, data transparency, and environmental impact across the global space industry."
          icon={<span>♻️</span>}
          accentColor="emerald"
        />

        <div className="flex justify-end mb-4">
          <ShareButton
            title="Space Sustainability Scorecard - SpaceNexus"
            description="Comprehensive sustainability ratings for space operators, tracking debris mitigation, disposal compliance, and environmental impact."
          />
        </div>

        {/* Overall Industry Score */}
        <ScrollReveal>
          <OverallScoreCard />
        </ScrollReveal>

        {/* Criteria Breakdown */}
        <ScrollReveal delay={0.1}>
          <CriteriaBreakdown />
        </ScrollReveal>

        {/* Operator Rankings */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Operator Rankings</h2>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search operators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  aria-label="Search operators"
                />
              </div>

              {/* Score range filter */}
              <select
                value={scoreRange}
                onChange={(e) => setScoreRange(e.target.value as ScoreRange)}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                aria-label="Filter by score range"
              >
                <option value="all">All Scores</option>
                <option value="A">A Range (80+)</option>
                <option value="B">B Range (65-79)</option>
                <option value="C">C Range (50-64)</option>
                <option value="D+below">Below 50</option>
              </select>

              {/* Operator type filter */}
              <select
                value={operatorType}
                onChange={(e) => setOperatorType(e.target.value as OperatorType | 'all')}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                aria-label="Filter by operator type"
              >
                <option value="all">All Types</option>
                <option value="government">Government</option>
                <option value="commercial">Commercial</option>
                <option value="constellation">Constellation</option>
              </select>
            </div>

            {/* Results count */}
            <p className="text-xs text-slate-500 mb-4">
              Showing {filteredOperators.length} of {OPERATORS.length} operators
            </p>

            {/* Operator grid */}
            {filteredOperators.length > 0 ? (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" staggerDelay={0.06}>
                {filteredOperators.map((operator, i) => {
                  const globalRank = OPERATORS.indexOf(operator) + 1;
                  return (
                    <StaggerItem key={operator.name}>
                      <OperatorCard operator={operator} rank={globalRank} />
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-slate-400 text-sm">No operators match the current filters.</p>
                <button
                  onClick={() => { setScoreRange('all'); setOperatorType('all'); setSearchQuery(''); }}
                  className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Bottom sections: Best Practices & Regulatory Framework */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ScrollReveal delay={0.1}>
            <BestPracticesSection />
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <RegulatoryFrameworkSection />
          </ScrollReveal>
        </div>

        {/* Methodology note */}
        <ScrollReveal delay={0.2}>
          <div className="card p-6 mt-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Methodology</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scores are derived from publicly available data including regulatory filings, UN COPUOS reports, published debris mitigation plans,
              conjunction assessment participation records, and third-party analyses from organizations including the Secure World Foundation,
              European Space Agency, and the Space Safety Coalition. Each operator is scored across five equally weighted categories (0-20 points each)
              for a maximum total of 100 points. Scores are updated quarterly and reflect both current practices and historical track records.
              This scorecard is for informational purposes and does not constitute an official regulatory assessment.
            </p>
          </div>
        </ScrollReveal>

        {/* Explore More */}
        <ScrollReveal delay={0.25}>
          <section className="mt-16 border-t border-slate-800 pt-8">
            <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/debris-catalog" className="card p-4 hover:border-cyan-500/50 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">Debris Catalog</h3>
                <p className="text-slate-400 text-sm mt-1">Tracked orbital debris objects, fragmentation events, and catalog statistics.</p>
              </a>
              <a href="/space-environment" className="card p-4 hover:border-cyan-500/50 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">Space Environment</h3>
                <p className="text-slate-400 text-sm mt-1">Solar weather, debris tracking, and space operations awareness in real time.</p>
              </a>
              <a href="/regulatory-tracker" className="card p-4 hover:border-cyan-500/50 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">Regulatory Tracker</h3>
                <p className="text-slate-400 text-sm mt-1">Track space regulations, licensing requirements, and compliance frameworks.</p>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
