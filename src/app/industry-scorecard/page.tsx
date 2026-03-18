'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
type Trend = 'up' | 'down' | 'stable';

interface Dimension {
  id: string;
  title: string;
  grade: Grade;
  icon: string;
  trend: Trend;
  trendLabel: string;
  headline: string;
  keyStats: { label: string; value: string }[];
  details: string[];
  outlook: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const QUARTER = 'Q1 2026';
const OVERALL_GRADE: Grade = 'A-';
const OVERALL_SUMMARY =
  'The space industry is firing on nearly all cylinders. Record launch cadence, surging private investment, expanding government budgets, and breakthrough reusability technology paint a picture of an industry accelerating into its commercial era. Regulatory uncertainty around debris rules and spectrum allocation keeps the grade just shy of a straight A.';

const DIMENSIONS: Dimension[] = [
  {
    id: 'launch',
    title: 'Launch Activity',
    grade: 'A',
    icon: '🚀',
    trend: 'up',
    trendLabel: '+12% YoY',
    headline: '230+ orbital launches in 2025, on pace for 250+ in 2026',
    keyStats: [
      { label: 'Orbital Launches (2025)', value: '234' },
      { label: '2026 Pace (annualized)', value: '~258' },
      { label: 'Active Launch Providers', value: '12+' },
      { label: 'Reusable Booster Landings', value: '95%+ (F9)' },
    ],
    details: [
      'SpaceX continues to dominate cadence with 100+ Falcon 9 missions projected for 2026, while Starship V3 enters its rapid iteration phase.',
      'Rocket Lab Neutron targeting first orbital flight Q2 2026, adding meaningful medium-lift competition.',
      'China\'s Long March family and commercial providers (Landspace, iSpace) contributed 60+ launches in 2025.',
      'ULA Vulcan Centaur certified for national security payloads; Blue Origin New Glenn completed maiden flight.',
      'Arianespace Ariane 6 ramping to 8-10 flights per year, restoring European autonomous access.',
    ],
    outlook: 'Launch cadence is structurally higher. Reusability economics and constellation deployment demand ensure 250+ annual launches through the decade.',
  },
  {
    id: 'investment',
    title: 'Investment',
    grade: 'A-',
    icon: '💰',
    trend: 'up',
    trendLabel: '+18% YoY',
    headline: '$10B+ in VC, SpaceX IPO pending',
    keyStats: [
      { label: 'Total VC Investment (2025)', value: '$10.4B' },
      { label: 'SpaceX Valuation', value: '~$350B' },
      { label: 'Mega-Rounds ($100M+)', value: '14' },
      { label: 'IPO Pipeline', value: '3-5 candidates' },
    ],
    details: [
      'SpaceX IPO expected mid-2026, potentially the largest tech IPO in years with a valuation north of $350 billion.',
      'Anduril, Relativity Space, and Rocket Lab secondary offerings signal strong public market appetite.',
      'Defense-tech crossover drives outsized investment into dual-use space startups (Impulse Space, True Anomaly, Apex Space).',
      'Sovereign wealth funds (Saudi PIF, Singapore GIC) increasing direct space allocations.',
      'SPAC hangover largely cleared; remaining public space companies showing improving unit economics.',
    ],
    outlook: 'Capital availability is excellent. The SpaceX IPO will be a watershed event for the entire sector, likely triggering a follow-on wave of public listings.',
  },
  {
    id: 'government',
    title: 'Government Spending',
    grade: 'A-',
    icon: '🏛️',
    trend: 'up',
    trendLabel: '+8% YoY',
    headline: '$95B+ globally, US & allies leading',
    keyStats: [
      { label: 'Global Space Budgets', value: '$95B+' },
      { label: 'NASA Budget (FY2026)', value: '$27.2B' },
      { label: 'US Space Force', value: '$30.3B' },
      { label: 'ESA Ministerial Commit.', value: '\u20AC18.8B' },
    ],
    details: [
      'Artemis program remains the flagship civil space investment; Artemis II crewed lunar flyby scheduled for April 2026.',
      'US Space Force budget exceeds $30B for the first time, reflecting space as a warfighting domain.',
      'Japan, India, and South Korea all increased national space budgets by 10-20% in FY2026.',
      'Commercial space procurement growing faster than traditional cost-plus contracts across all major agencies.',
      'International Lunar Gateway construction accelerating with ESA, JAXA, and CSA contributions.',
    ],
    outlook: 'Government spending is durable and growing. National security imperatives and commercial procurement trends ensure sustained budget expansion.',
  },
  {
    id: 'workforce',
    title: 'Workforce',
    grade: 'B+',
    icon: '👥',
    trend: 'up',
    trendLabel: '+5% YoY',
    headline: '360,000+ in US aerospace, talent gaps remain',
    keyStats: [
      { label: 'US Space Workforce', value: '360,000+' },
      { label: 'Open Space Jobs (US)', value: '~18,000' },
      { label: 'Avg. Engineer Salary', value: '$142K' },
      { label: 'Universities w/ Space Programs', value: '200+' },
    ],
    details: [
      'Workforce growing steadily but not fast enough to meet demand; talent competition with AI/tech sector intensifies.',
      'STEM pipeline improving with expanded university space programs and apprenticeship initiatives.',
      'Security clearance bottleneck persists: median wait time for TS/SCI still 12-18 months.',
      'Remote work and commercial-first culture attracting talent from adjacent tech industries.',
      'Diversity improving slowly; women represent ~24% of space workforce, up from 21% in 2020.',
    ],
    outlook: 'Demand outpaces supply in key areas (RF, propulsion, guidance). Companies investing in training pipelines to close the gap over 3-5 years.',
  },
  {
    id: 'regulatory',
    title: 'Regulatory Environment',
    grade: 'B',
    icon: '⚖️',
    trend: 'stable',
    trendLabel: 'Mixed signals',
    headline: 'Active evolution: ITAR, spectrum, debris rules in flux',
    keyStats: [
      { label: 'FCC Debris Rule', value: '5-year deorbit' },
      { label: 'ITAR Reform Status', value: 'Incremental' },
      { label: 'WRC-27 Prep', value: 'Underway' },
      { label: 'FAA Launch Licenses (2025)', value: '78' },
    ],
    details: [
      'FCC 5-year deorbit rule now in effect for new US-licensed LEO satellites; industry adapting designs accordingly.',
      'ITAR reform remains incremental, frustrating allied space cooperation. Export control modernization bill stalled in Congress.',
      'ITU WRC-27 preparations underway; spectrum allocation for direct-to-device (D2D) and mega-constellations a key battleground.',
      'FAA launch licensing backlog improving but not resolved; 78 licenses issued in 2025, up from 62 in 2024.',
      'International debris mitigation standards evolving (ESA Zero Debris Charter) but enforcement mechanisms still voluntary.',
    ],
    outlook: 'Regulatory frameworks are evolving but lagging the pace of commercial innovation. D2D spectrum decisions at WRC-27 will be industry-defining.',
  },
  {
    id: 'technology',
    title: 'Technology',
    grade: 'A',
    icon: '🔬',
    trend: 'up',
    trendLabel: 'Breakthrough pace',
    headline: 'Reusability, mega-constellations, D2D in full swing',
    keyStats: [
      { label: 'Starship V3 Status', value: 'Flight testing' },
      { label: 'Starlink Sats On-Orbit', value: '7,000+' },
      { label: 'D2D Spectrum Deals', value: '5 carriers' },
      { label: 'On-Orbit Servicing Missions', value: '3 planned' },
    ],
    details: [
      'SpaceX Starship V3 enters rapid flight testing; full reusability demonstrated with booster catches becoming routine.',
      'Mega-constellation deployments accelerating: Starlink 7,000+, Kuiper first operational tranche, OneWeb Gen2 launching.',
      'Direct-to-device (D2D) satellite connectivity maturing: T-Mobile/SpaceX, AST SpaceMobile, Lynk Global all operational or in beta.',
      'On-orbit servicing and manufacturing reaching commercial viability; Astroscale ADRAS-J paving the way for debris removal.',
      'Electric propulsion and solar electric power systems enabling smaller, cheaper, and more capable satellites.',
      'AI/ML integration into satellite operations (autonomous collision avoidance, anomaly detection) becoming standard.',
    ],
    outlook: 'Technology is the strongest pillar. Reusability is transforming launch economics, and D2D will be the defining connectivity breakthrough of the decade.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGradeColor(grade: Grade): string {
  if (grade.startsWith('A')) return 'text-emerald-400';
  if (grade.startsWith('B')) return 'text-cyan-400';
  if (grade.startsWith('C')) return 'text-amber-400';
  return 'text-red-400';
}

function getGradeBg(grade: Grade): string {
  if (grade.startsWith('A')) return 'bg-emerald-500/15 border-emerald-500/30';
  if (grade.startsWith('B')) return 'bg-cyan-500/15 border-cyan-500/30';
  if (grade.startsWith('C')) return 'bg-amber-500/15 border-amber-500/30';
  return 'bg-red-500/15 border-red-500/30';
}

function getGradeAccent(grade: Grade): string {
  if (grade.startsWith('A')) return 'border-l-emerald-500';
  if (grade.startsWith('B')) return 'border-l-cyan-500';
  if (grade.startsWith('C')) return 'border-l-amber-500';
  return 'border-l-red-500';
}

function getTrendIcon(trend: Trend): string {
  switch (trend) {
    case 'up': return '\u2191';
    case 'down': return '\u2193';
    case 'stable': return '\u2192';
  }
}

function getTrendColor(trend: Trend): string {
  switch (trend) {
    case 'up': return 'text-emerald-400';
    case 'down': return 'text-red-400';
    case 'stable': return 'text-slate-400';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverallGradeCard() {
  return (
    <div className="card p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-semibold text-slate-100">Overall Industry Grade</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.06]">
              {QUARTER}
            </span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            {OVERALL_SUMMARY}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
              {'\u2191'} Upgraded from B+ (Q3 2025)
            </span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-slate-400 text-xs">Published March 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className={`px-6 py-4 rounded-xl border-2 ${getGradeBg(OVERALL_GRADE)} text-center`}>
            <div className={`text-5xl font-bold ${getGradeColor(OVERALL_GRADE)}`}>{OVERALL_GRADE}</div>
            <div className="text-xs text-slate-400 mt-1">Overall</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradeDistribution() {
  const gradeCounts: Record<string, number> = {};
  DIMENSIONS.forEach((d) => {
    const letter = d.grade[0];
    gradeCounts[letter] = (gradeCounts[letter] || 0) + 1;
  });

  return (
    <div className="card p-5 mb-8">
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Grade Distribution</h3>
      <div className="flex items-end gap-3 justify-center h-24">
        {['A', 'B', 'C', 'D', 'F'].map((letter) => {
          const count = gradeCounts[letter] || 0;
          const height = count > 0 ? Math.max(20, (count / DIMENSIONS.length) * 100) : 4;
          const color = letter === 'A' ? 'bg-emerald-500' : letter === 'B' ? 'bg-cyan-500' : letter === 'C' ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={letter} className="flex flex-col items-center gap-1">
              <span className="text-xs text-white/70 font-medium">{count > 0 ? count : ''}</span>
              <div
                className={`w-10 rounded-t ${count > 0 ? color : 'bg-white/[0.04]'} transition-all duration-500`}
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-slate-400">{letter}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DimensionCard({ dimension }: { dimension: Dimension }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card p-5 border-l-4 ${getGradeAccent(dimension.grade)}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{dimension.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{dimension.title}</h3>
            <span className={`text-xs font-medium flex items-center gap-1 ${getTrendColor(dimension.trend)}`}>
              {getTrendIcon(dimension.trend)} {dimension.trendLabel}
            </span>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border font-bold text-lg ${getGradeBg(dimension.grade)} ${getGradeColor(dimension.grade)}`}>
          {dimension.grade}
        </div>
      </div>

      {/* Headline */}
      <p className="text-sm text-white/80 font-medium mb-3">{dimension.headline}</p>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {dimension.keyStats.map((stat) => (
          <div key={stat.label} className="bg-white/[0.03] rounded-lg p-2.5">
            <div className="text-xs text-slate-500 mb-0.5">{stat.label}</div>
            <div className="text-sm font-semibold text-white/90">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${dimension.title}`}
      >
        {expanded ? 'Hide Details' : 'Show Details & Outlook'}
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
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Key Developments</h4>
              <ul className="space-y-2 mb-4">
                {dimension.details.map((detail, i) => (
                  <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                    <span className="text-white/30 mt-0.5 shrink-0">{'\u2022'}</span>
                    {detail}
                  </li>
                ))}
              </ul>

              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Outlook</h4>
              <p className="text-xs text-white/70 leading-relaxed">{dimension.outlook}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function IndustryScorecardPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        <AnimatedPageHeader
          title="Space Industry Scorecard"
          subtitle={`${QUARTER} comprehensive assessment of the global space industry across launch activity, investment, government spending, workforce, regulatory environment, and technology innovation.`}
          icon={<span>📊</span>}
          accentColor="cyan"
        />

        <div className="flex justify-end mb-4">
          <ShareButton
            title="Space Industry Scorecard Q1 2026 - SpaceNexus"
            description="Comprehensive quarterly scorecard grading the space industry across 6 dimensions. Overall grade: A-."
          />
        </div>

        {/* Overall Grade */}
        <ScrollReveal>
          <OverallGradeCard />
        </ScrollReveal>

        {/* Grade Distribution */}
        <ScrollReveal delay={0.05}>
          <GradeDistribution />
        </ScrollReveal>

        {/* Dimension Cards */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Dimension Grades</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" staggerDelay={0.06}>
              {DIMENSIONS.map((dimension) => (
                <StaggerItem key={dimension.id}>
                  <DimensionCard dimension={dimension} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Historical Context */}
        <ScrollReveal delay={0.15}>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Grade History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-3 pr-4">Dimension</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider pb-3 px-3">Q1 2025</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider pb-3 px-3">Q2 2025</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider pb-3 px-3">Q3 2025</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider pb-3 px-3">Q4 2025</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider pb-3 pl-3 font-bold">Q1 2026</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Launch Activity', grades: ['A-', 'A-', 'A', 'A', 'A'] },
                    { name: 'Investment', grades: ['B+', 'B+', 'A-', 'A-', 'A-'] },
                    { name: 'Government Spending', grades: ['B+', 'A-', 'A-', 'A-', 'A-'] },
                    { name: 'Workforce', grades: ['B', 'B', 'B+', 'B+', 'B+'] },
                    { name: 'Regulatory', grades: ['B', 'B', 'B', 'B', 'B'] },
                    { name: 'Technology', grades: ['A-', 'A-', 'A-', 'A', 'A'] },
                    { name: 'OVERALL', grades: ['B+', 'B+', 'B+', 'A-', 'A-'] },
                  ].map((row) => (
                    <tr key={row.name} className={`border-b border-white/[0.04] ${row.name === 'OVERALL' ? 'font-bold' : ''}`}>
                      <td className="py-3 pr-4 text-white/80">{row.name}</td>
                      {row.grades.map((g, i) => (
                        <td key={i} className={`py-3 px-3 text-center ${i === 4 ? 'font-bold' : ''} ${getGradeColor(g as Grade)}`}>
                          {g}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* Key Themes */}
        <ScrollReveal delay={0.2}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Key Themes for 2026</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'SpaceX IPO & Market Catalyst',
                  description: 'A SpaceX public listing (expected mid-2026) would be the single largest event for the space investment ecosystem, setting valuation benchmarks and unlocking follow-on IPOs.',
                  tag: 'Investment',
                  tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                },
                {
                  title: 'Artemis II: Humans Back to the Moon',
                  description: 'NASA\'s Artemis II crewed lunar flyby (targeting April 2026) represents the first crewed deep-space mission since Apollo 17 in 1972, with massive public and political implications.',
                  tag: 'Government',
                  tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                },
                {
                  title: 'Direct-to-Device Goes Mainstream',
                  description: 'With T-Mobile/SpaceX, AST SpaceMobile, and Lynk Global all advancing D2D satellite connectivity, 2026 is the year this technology moves from demo to commercial scale.',
                  tag: 'Technology',
                  tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                },
                {
                  title: 'WRC-27 Spectrum Battles Begin',
                  description: 'Preparatory work for the 2027 World Radiocommunication Conference will define spectrum access for the next decade. LEO vs. GEO, satellite vs. terrestrial battles will intensify.',
                  tag: 'Regulatory',
                  tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                },
              ].map((theme) => (
                <div key={theme.title} className="card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${theme.tagColor}`}>
                      {theme.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-2">{theme.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{theme.description}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Methodology */}
        <ScrollReveal delay={0.25}>
          <div className="card p-6 mb-4">
            <h2 className="text-sm font-semibold text-white/90 mb-2">Methodology</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Space Industry Scorecard is published quarterly by the SpaceNexus editorial team. Each of the six dimensions
              is graded on a standard A-F scale based on quantitative data (launch counts, funding totals, budget allocations,
              workforce surveys) and qualitative expert assessment (regulatory trajectory, technology maturity, industry sentiment).
              The overall grade is a weighted composite, with Launch Activity and Technology receiving slightly higher weight
              given their outsized impact on industry momentum. Data sources include FAA/AST, Bryce Tech, Space Capital, Euroconsult,
              the Satellite Industry Association, and public filings. This scorecard is for informational purposes and represents
              the editorial opinion of SpaceNexus.
            </p>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <ScrollReveal delay={0.3}>
          <div className="mb-8">
            <RelatedModules modules={PAGE_RELATIONS['industry-scorecard']} />
          </div>
        </ScrollReveal>

        {/* Explore More */}
        <ScrollReveal delay={0.35}>
          <section className="mt-16 border-t border-white/[0.06] pt-8">
            <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/industry-trends" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Industry Trends</h3>
                <p className="text-slate-400 text-sm mt-1">Data-driven trend analysis across the space sector.</p>
              </a>
              <a href="/space-economy" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Space Economy</h3>
                <p className="text-slate-400 text-sm mt-1">Economic indicators, market size, and budget tracking.</p>
              </a>
              <a href="/sustainability-scorecard" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Sustainability Scorecard</h3>
                <p className="text-slate-400 text-sm mt-1">Operator sustainability ratings and debris compliance.</p>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
