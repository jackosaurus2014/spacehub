'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ExportPDFButton from '@/components/ui/ExportPDFButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
type Outlook = 'bullish' | 'neutral' | 'bearish';
type Sector = 'Launch' | 'Defense & Prime' | 'Satellite & EO' | 'Communications' | 'Space Station' | 'Tourism';
type GradeRange = '' | 'A' | 'B' | 'C' | 'D' | 'F';
type SortKey = 'grade' | 'revenue' | 'company';

interface CompanyReportCard {
  company: string;
  ticker: string;
  grade: Grade;
  sector: Sector;
  quarterAssessed: string;
  metrics: {
    revenue: string;
    backlog: string;
    launches: string;
    employees: string;
  };
  strengths: string[];
  weaknesses: string[];
  outlook: Outlook;
  summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_NUMERIC: Record<Grade, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9, 'B-': 8,
  'C+': 7, 'C': 6, 'C-': 5,
  'D+': 4, 'D': 3, 'D-': 2,
  'F': 1,
};

function getGradeColor(grade: Grade): string {
  const letter = grade.charAt(0);
  switch (letter) {
    case 'A': return 'text-emerald-400';
    case 'B': return 'text-cyan-400';
    case 'C': return 'text-amber-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function getGradeBg(grade: Grade): string {
  const letter = grade.charAt(0);
  switch (letter) {
    case 'A': return 'bg-emerald-500/20 border-emerald-500/40';
    case 'B': return 'bg-cyan-500/20 border-cyan-500/40';
    case 'C': return 'bg-amber-500/20 border-amber-500/40';
    case 'D': return 'bg-orange-500/20 border-orange-500/40';
    case 'F': return 'bg-red-500/20 border-red-500/40';
    default: return 'bg-slate-500/20 border-slate-500/40';
  }
}

function getGradeRingColor(grade: Grade): string {
  const letter = grade.charAt(0);
  switch (letter) {
    case 'A': return 'ring-emerald-500/50';
    case 'B': return 'ring-cyan-500/50';
    case 'C': return 'ring-amber-500/50';
    case 'D': return 'ring-orange-500/50';
    case 'F': return 'ring-red-500/50';
    default: return 'ring-slate-500/50';
  }
}

function getOutlookIcon(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return '▲';
    case 'neutral': return '◆';
    case 'bearish': return '▼';
  }
}

function getOutlookColor(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return 'text-emerald-400';
    case 'neutral': return 'text-amber-400';
    case 'bearish': return 'text-red-400';
  }
}

function getOutlookBg(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return 'bg-emerald-500/15';
    case 'neutral': return 'bg-amber-500/15';
    case 'bearish': return 'bg-red-500/15';
  }
}

function getSectorIcon(sector: Sector): string {
  switch (sector) {
    case 'Launch': return '🚀';
    case 'Defense & Prime': return '🛡️';
    case 'Satellite & EO': return '🛰️';
    case 'Communications': return '📡';
    case 'Space Station': return '🏗️';
    case 'Tourism': return '🎢';
  }
}

function parseRevenue(rev: string): number {
  const cleaned = rev.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (rev.includes('B')) return num * 1000;
  return num;
}

function gradeLetterMatch(grade: Grade, range: GradeRange): boolean {
  if (!range) return true;
  return grade.charAt(0) === range;
}

// ─── Report Card Data ─────────────────────────────────────────────────────────

const REPORT_CARDS: CompanyReportCard[] = [
  {
    company: 'SpaceX',
    ticker: 'Private',
    grade: 'A+',
    sector: 'Launch',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$13.6B',
      backlog: '$30B+',
      launches: '134',
      employees: '13,000+',
    },
    strengths: [
      'Record 134 orbital launches in 2025 with 100% mission success',
      'Starlink constellation exceeded 7,200 active satellites and 5M subscribers',
      'Starship completed multiple full-stack flights, advancing lunar program readiness',
      'Dominant launch market share (~65% of global orbital launches)',
    ],
    weaknesses: [
      'Continued reliance on private funding rounds with no IPO timeline',
      'Regulatory scrutiny around Starlink spectrum and debris concerns',
      'Starship upper stage reuse milestones still pending',
    ],
    outlook: 'bullish',
    summary: 'SpaceX continues to redefine what is possible in spaceflight. With record launch cadence, explosive Starlink growth, and Starship making tangible progress, the company is the undisputed leader in commercial space. The moat widens every quarter.',
  },
  {
    company: 'Rocket Lab',
    ticker: 'RKLB',
    grade: 'A',
    sector: 'Launch',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$436M',
      backlog: '$1.07B',
      launches: '16',
      employees: '2,100+',
    },
    strengths: [
      'Electron launch cadence reached 16 missions in 2025, best year yet',
      'Neutron medium-lift vehicle on track for first flight mid-2026',
      'Space Systems division growing rapidly with satellite buses and components',
      'Strong government and commercial backlog diversification',
    ],
    weaknesses: [
      'Still not consistently profitable on a GAAP basis',
      'Neutron development costs weighing on near-term margins',
      'Smaller scale limits bargaining power vs. SpaceX on large constellation deals',
    ],
    outlook: 'bullish',
    summary: 'Rocket Lab is the clear number-two in Western launch. The vertical integration strategy is paying off, and Neutron represents a credible medium-lift challenger. If Neutron delivers on schedule and cost targets, Rocket Lab could see a dramatic re-rating.',
  },
  {
    company: 'L3Harris Technologies',
    ticker: 'LHX',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$21.1B',
      backlog: '$34B',
      launches: 'N/A',
      employees: '50,000+',
    },
    strengths: [
      'Space & Airborne Systems segment growing 8% YoY driven by SDA contracts',
      'Major wins on Space Development Agency Tranche 2 tracking layer',
      'Strong missile warning and space domain awareness portfolio',
      'Aerojet Rocketdyne integration unlocking propulsion synergies',
    ],
    weaknesses: [
      'Integration complexity from Aerojet acquisition still being worked through',
      'Margin pressure from fixed-price development contracts',
      'Slower commercial space exposure compared to peers',
    ],
    outlook: 'bullish',
    summary: 'L3Harris has solidified its position as a top-tier space defense prime. The Aerojet Rocketdyne acquisition adds propulsion capabilities that complete the portfolio. SDA proliferated constellation wins provide multi-year revenue visibility.',
  },
  {
    company: 'Northrop Grumman',
    ticker: 'NOC',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$40.8B',
      backlog: '$87B',
      launches: 'N/A',
      employees: '100,000+',
    },
    strengths: [
      'Space Systems segment revenue up 7% driven by GBSD and national security programs',
      'Cygnus cargo resupply missions continuing reliably to ISS',
      'Deep involvement in classified and missile defense space programs',
      'Mission Extension Vehicle servicing contracts expanding',
    ],
    weaknesses: [
      'OmegA launch vehicle cancelled, ceding launch market to competitors',
      'High dependency on US government spending and budget cycles',
      'Lower commercial space revenue mix vs. diversified competitors',
    ],
    outlook: 'neutral',
    summary: 'Northrop Grumman remains a pillar of national security space with unmatched classified program depth. The massive backlog provides stability, but the company lacks commercial space growth vectors that excite investors.',
  },
  {
    company: 'Boeing Space',
    ticker: 'BA',
    grade: 'C+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$5.3B',
      backlog: '$22B',
      launches: '2',
      employees: '14,000+',
    },
    strengths: [
      'SLS remains NASA\'s only super heavy-lift vehicle for Artemis',
      'WGS-11+ and next-gen satellite programs in production',
      'Strong legacy relationships with DoD and intelligence community',
    ],
    weaknesses: [
      'Starliner crewed flight experienced helium leaks, crew returned on Crew Dragon',
      'SLS cost overruns and schedule delays eroding Congressional confidence',
      'Space segment profitability consistently below peers',
      'Reputational damage from quality and safety issues across Boeing broadly',
    ],
    outlook: 'bearish',
    summary: 'Boeing Space continues to struggle with execution. The Starliner issues were a significant blow, and SLS faces mounting cost pressure. While the backlog is large, margin quality is poor and competitive positioning is weakening against more agile players.',
  },
  {
    company: 'Blue Origin',
    ticker: 'Private',
    grade: 'B',
    sector: 'Launch',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$1.6B',
      backlog: '$11B+',
      launches: '6',
      employees: '11,000+',
    },
    strengths: [
      'New Glenn successfully reached orbit on its second attempt in 2025',
      'BE-4 engine production scaling for both New Glenn and ULA Vulcan',
      'Artemis Human Landing System contract provides multi-billion dollar anchor',
      'Project Kuiper launch agreements diversify revenue pipeline',
    ],
    weaknesses: [
      'Years behind original New Glenn timeline, credibility still rebuilding',
      'Revenue generation is nascent relative to the enormous capital invested',
      'New Shepard suborbital tourism demand uncertain in current market',
    ],
    outlook: 'bullish',
    summary: 'Blue Origin turned a major corner with New Glenn reaching orbit. The company finally has a product in the orbital market and a credible path to being a top-three launch provider. The Bezos-funded balance sheet provides an enviable runway.',
  },
  {
    company: 'Planet Labs',
    ticker: 'PL',
    grade: 'B',
    sector: 'Satellite & EO',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$244M',
      backlog: '$220M',
      launches: 'N/A',
      employees: '900+',
    },
    strengths: [
      'Largest commercial Earth observation constellation (200+ satellites)',
      'Daily global coverage at 3-5m resolution is a unique differentiator',
      'Government contracts growing, especially with defense and intelligence',
      'Pelican next-gen satellites improving resolution and revisit rates',
    ],
    weaknesses: [
      'Path to sustained profitability still being navigated',
      'High satellite replacement costs as fleet ages',
      'Competition from Airbus, Maxar, and emerging hyperspectral players',
    ],
    outlook: 'neutral',
    summary: 'Planet Labs offers a genuinely unique data product with daily global imaging. The challenge remains converting that differentiation into consistent profitability. Pelican upgrades and growing defense demand could be catalysts.',
  },
  {
    company: 'Maxar Technologies',
    ticker: 'MAXR (acq.)',
    grade: 'B+',
    sector: 'Satellite & EO',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$2.1B',
      backlog: '$3.8B',
      launches: 'N/A',
      employees: '5,400+',
    },
    strengths: [
      'WorldView Legion constellation delivering sub-30cm commercial imagery',
      'Robotics heritage underpins NASA Lunar Gateway and OSAM-1 programs',
      'Advent International acquisition provides stability and investment capacity',
      'Strong dual-use positioning across intelligence and commercial markets',
    ],
    weaknesses: [
      'Taken private, limiting investor access and transparency',
      'Legacy geostationary satellite bus market in structural decline',
      'Integration of Earth Intelligence and Space Infrastructure segments ongoing',
    ],
    outlook: 'bullish',
    summary: 'Under Advent ownership, Maxar is investing aggressively in WorldView Legion and next-gen capabilities. The combination of best-in-class imagery resolution with space robotics creates a differentiated portfolio. Private ownership removes quarterly earnings pressure.',
  },
  {
    company: 'Relativity Space',
    ticker: 'Private',
    grade: 'B-',
    sector: 'Launch',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '<$50M',
      backlog: '$1.8B',
      launches: '0',
      employees: '1,200+',
    },
    strengths: [
      'Terran R medium-lift vehicle targeting 2026 first flight with reusable design',
      'Revolutionary 3D-printing manufacturing approach could transform production economics',
      'Strong customer commitments including OneWeb and Impulse Space',
      'Well-funded with over $1.3B raised to date',
    ],
    weaknesses: [
      'Terran 1 first flight did not reach orbit; program subsequently retired',
      'No revenue-generating orbital launch service yet',
      'Manufacturing approach is unproven at scale for flight-qualified hardware',
      'Cash burn rate is high with no near-term revenue to offset',
    ],
    outlook: 'neutral',
    summary: 'Relativity Space is a bold bet on manufacturing innovation applied to rocketry. The pivot from Terran 1 to Terran R was strategically sound but resets the execution clock. If they deliver, the 3D-printing edge could be transformative. The risk remains binary.',
  },
  {
    company: 'Astra Space',
    ticker: 'ASTR',
    grade: 'D',
    sector: 'Launch',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$5.2M',
      backlog: '$30M',
      launches: '0',
      employees: '250',
    },
    strengths: [
      'Pivoted to spacecraft propulsion with the Astra Spacecraft Engine',
      'Electric propulsion systems have some early customer traction',
      'Lean cost structure after major workforce reductions',
    ],
    weaknesses: [
      'Abandoned launch vehicle program after multiple failures',
      'Revenue is minimal and declining year over year',
      'Market cap has collapsed over 95% from SPAC debut highs',
      'Survival risk if propulsion pivot does not gain commercial traction quickly',
    ],
    outlook: 'bearish',
    summary: 'Astra represents a cautionary tale in commercial space. The launch vehicle program failed to achieve reliability, and the propulsion pivot is an entirely new business with unproven market fit. Survival depends on execution in a crowded subsystems market.',
  },
  {
    company: 'Virgin Galactic',
    ticker: 'SPCE',
    grade: 'C-',
    sector: 'Tourism',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$8.7M',
      backlog: '$120M',
      launches: '3',
      employees: '700',
    },
    strengths: [
      'Successfully flew multiple commercial suborbital missions in 2025',
      'Next-gen Delta-class vehicles in development for higher flight cadence',
      'First-mover brand recognition in space tourism market',
    ],
    weaknesses: [
      'Revenue generation far below what is needed for self-sustaining operations',
      'Fleet grounded periodically for maintenance, limiting flight rate',
      'Delta-class vehicles require significant capital with uncertain timeline',
      'Mounting cash burn raises dilution risk for shareholders',
    ],
    outlook: 'bearish',
    summary: 'Virgin Galactic has proven suborbital tourism is technically feasible but has not yet proven it is commercially viable at scale. The Delta-class program is make-or-break: without a step change in flight rate and unit economics, the business model is unsustainable.',
  },
  {
    company: 'Iridium Communications',
    ticker: 'IRDM',
    grade: 'A-',
    sector: 'Communications',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$810M',
      backlog: '$2.4B',
      launches: 'N/A',
      employees: '950',
    },
    strengths: [
      'Only truly global satellite communications network with pole-to-pole coverage',
      'Iridium NEXT constellation is fully deployed and performing well',
      'Recurring government contracts (EMSS) provide revenue floor',
      'IoT subscriber growth accelerating with 25% YoY device additions',
      'Strong free cash flow generation enabling buybacks and dividends',
    ],
    weaknesses: [
      'Limited bandwidth compared to LEO broadband constellations',
      'Single-constellation risk with no near-term replacement plan',
      'Premium pricing under pressure from Starlink Direct to Cell offerings',
    ],
    outlook: 'neutral',
    summary: 'Iridium is the quiet achiever of the satellite industry. Global coverage, strong cash flows, and a sticky government customer base make it a reliable business. The challenge ahead is defending its moat as Starlink and others bring Direct to Cell capabilities to market.',
  },
  {
    company: 'SES',
    ticker: 'SES (EPA)',
    grade: 'B+',
    sector: 'Communications',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$2.08B',
      backlog: '$7.4B',
      launches: 'N/A',
      employees: '2,200+',
    },
    strengths: [
      'O3b mPOWER MEO constellation operational, delivering high-throughput services',
      'Multi-orbit strategy (GEO + MEO) is unique among satellite operators',
      'Strong video distribution business provides cash flow stability',
      'C-band spectrum clearing proceeds bolster balance sheet',
    ],
    weaknesses: [
      'Legacy GEO video revenues in structural decline as streaming grows',
      'Integration of Intelsat acquisition creates execution complexity',
      'High capital intensity for constellation refresh cycles',
    ],
    outlook: 'neutral',
    summary: 'SES stands out with its multi-orbit approach and the O3b mPOWER constellation. The Intelsat merger creates scale but also integration risk. The shift from video to data and mobility services is the key strategic transition to watch.',
  },
  {
    company: 'Telesat',
    ticker: 'TSAT',
    grade: 'C+',
    sector: 'Communications',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$620M',
      backlog: '$3.2B',
      launches: 'N/A',
      employees: '550',
    },
    strengths: [
      'Lightspeed LEO constellation targeting enterprise and government verticals',
      'Canadian government backing with significant subsidy commitments',
      'Strong existing GEO fleet generating steady cash flow',
    ],
    weaknesses: [
      'Lightspeed program has faced repeated delays and cost escalation',
      'Smaller scale than SES/Intelsat limits competitive positioning',
      'High leverage and Lightspeed capex create meaningful financial risk',
      'MDA as sole satellite manufacturer introduces supply chain concentration',
    ],
    outlook: 'neutral',
    summary: 'Telesat is betting the company on Lightspeed. The LEO constellation could position Telesat as a premium enterprise connectivity provider, but the financing complexity and repeated schedule shifts raise valid execution concerns. The Canadian government support is a stabilizing factor.',
  },
  {
    company: 'Axiom Space',
    ticker: 'Private',
    grade: 'B',
    sector: 'Space Station',
    quarterAssessed: 'Q4 2025',
    metrics: {
      revenue: '$350M',
      backlog: '$3.5B+',
      launches: '1',
      employees: '1,600+',
    },
    strengths: [
      'Completed Axiom-3 and preparing Axiom-4 private astronaut missions to ISS',
      'NASA Commercial LEO Destinations contract provides development anchor',
      'Axiom Station modules will attach to ISS before becoming free-flying',
      'Exclusive provider of NASA spacesuit (AxEMU) for Artemis moonwalks',
    ],
    weaknesses: [
      'Revenue is currently dependent on a small number of high-value missions',
      'Station module development requires massive capital with long payback period',
      'No proven recurring revenue model for commercial station operations yet',
      'Spacesuit program timeline tied to broader Artemis schedule uncertainties',
    ],
    outlook: 'bullish',
    summary: 'Axiom Space is best-positioned to become the first commercial space station operator. The ISS-attached module strategy de-risks the transition, and the NASA spacesuit contract adds credibility and revenue. Execution risk is real but so is the first-mover advantage.',
  },
];

// ─── Sector Options ───────────────────────────────────────────────────────────

const SECTORS: Sector[] = ['Launch', 'Defense & Prime', 'Satellite & EO', 'Communications', 'Space Station', 'Tourism'];

const GRADE_RANGES: { value: GradeRange; label: string }[] = [
  { value: '', label: 'All Grades' },
  { value: 'A', label: 'A Range' },
  { value: 'B', label: 'B Range' },
  { value: 'C', label: 'C Range' },
  { value: 'D', label: 'D Range' },
  { value: 'F', label: 'F' },
];

const OUTLOOK_OPTIONS: { value: Outlook | ''; label: string }[] = [
  { value: '', label: 'All Outlooks' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'bearish', label: 'Bearish' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'grade', label: 'Sort by Grade' },
  { value: 'revenue', label: 'Sort by Revenue' },
  { value: 'company', label: 'Sort by Company' },
];

// ─── Summary Stats Computation ────────────────────────────────────────────────

function computeSummaryStats(cards: CompanyReportCard[]) {
  const avgNumeric = cards.reduce((sum, c) => sum + GRADE_NUMERIC[c.grade], 0) / cards.length;
  const gradeEntries = Object.entries(GRADE_NUMERIC) as [Grade, number][];
  const closest = gradeEntries.reduce((best, [g, v]) =>
    Math.abs(v - avgNumeric) < Math.abs(GRADE_NUMERIC[best] - avgNumeric) ? g : best,
    'C' as Grade
  );

  // Sector leaders: highest grade per sector
  const sectorLeaders: { sector: Sector; company: string; grade: Grade }[] = [];
  const sectorMap = new Map<Sector, CompanyReportCard>();
  for (const card of cards) {
    const existing = sectorMap.get(card.sector);
    if (!existing || GRADE_NUMERIC[card.grade] > GRADE_NUMERIC[existing.grade]) {
      sectorMap.set(card.sector, card);
    }
  }
  sectorMap.forEach((card, sector) => {
    sectorLeaders.push({ sector, company: card.company, grade: card.grade });
  });
  sectorLeaders.sort((a, b) => GRADE_NUMERIC[b.grade] - GRADE_NUMERIC[a.grade]);

  // Grade distribution
  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const card of cards) {
    distribution[card.grade.charAt(0)]++;
  }

  // Outlook breakdown
  const outlookCounts = { bullish: 0, neutral: 0, bearish: 0 };
  for (const card of cards) {
    outlookCounts[card.outlook]++;
  }

  return { averageGrade: closest, sectorLeaders, distribution, outlookCounts };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ReportCardsPage() {
  const [gradeFilter, setGradeFilter] = useState<GradeRange>('');
  const [sectorFilter, setSectorFilter] = useState<Sector | ''>('');
  const [outlookFilter, setOutlookFilter] = useState<Outlook | ''>('');
  const [sortBy, setSortBy] = useState<SortKey>('grade');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    let result = [...REPORT_CARDS];

    if (gradeFilter) {
      result = result.filter(c => gradeLetterMatch(c.grade, gradeFilter));
    }
    if (sectorFilter) {
      result = result.filter(c => c.sector === sectorFilter);
    }
    if (outlookFilter) {
      result = result.filter(c => c.outlook === outlookFilter);
    }

    switch (sortBy) {
      case 'grade':
        result.sort((a, b) => GRADE_NUMERIC[b.grade] - GRADE_NUMERIC[a.grade]);
        break;
      case 'revenue':
        result.sort((a, b) => parseRevenue(b.metrics.revenue) - parseRevenue(a.metrics.revenue));
        break;
      case 'company':
        result.sort((a, b) => a.company.localeCompare(b.company));
        break;
    }

    return result;
  }, [gradeFilter, sectorFilter, outlookFilter, sortBy]);

  const stats = useMemo(() => computeSummaryStats(REPORT_CARDS), []);

  const toggleCard = (company: string) => {
    setExpandedCard(prev => prev === company ? null : company);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AnimatedPageHeader
              title="Industry Report Cards"
              subtitle="Quarterly analyst-style assessments of major space companies. Grades reflect execution, financial health, competitive positioning, and strategic outlook."
              icon={<span>📊</span>}
              accentColor="cyan"
            />
          </div>
          <ExportPDFButton className="mt-2 flex-shrink-0" />
        </div>

        {/* ── Summary Stats ────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Average Grade</div>
              <div className={`text-3xl font-bold ${getGradeColor(stats.averageGrade)}`}>
                {stats.averageGrade}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across {REPORT_CARDS.length} companies</div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Grade Distribution</div>
              <div className="flex items-end gap-1 h-10 mt-1">
                {Object.entries(stats.distribution).map(([letter, count]) => (
                  <div key={letter} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-sm ${
                        letter === 'A' ? 'bg-emerald-500' :
                        letter === 'B' ? 'bg-cyan-500' :
                        letter === 'C' ? 'bg-amber-500' :
                        letter === 'D' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ height: `${Math.max((count / REPORT_CARDS.length) * 40, 4)}px` }}
                    />
                    <span className="text-[10px] text-slate-500 mt-1">{letter}:{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Outlook Sentiment</div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 text-sm">▲</span>
                  <span className="text-sm font-semibold text-slate-200">{stats.outlookCounts.bullish}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 text-sm">◆</span>
                  <span className="text-sm font-semibold text-slate-200">{stats.outlookCounts.neutral}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-sm">▼</span>
                  <span className="text-sm font-semibold text-slate-200">{stats.outlookCounts.bearish}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1">Bullish / Neutral / Bearish</div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sector Leader</div>
              {stats.sectorLeaders[0] && (
                <>
                  <div className="text-lg font-bold text-white">{stats.sectorLeaders[0].company}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${getGradeColor(stats.sectorLeaders[0].grade)}`}>
                      {stats.sectorLeaders[0].grade}
                    </span>
                    <span className="text-xs text-slate-500">{stats.sectorLeaders[0].sector}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Sector Leaders Strip ──────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <div className="card p-4 mb-8">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Sector Leaders</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {stats.sectorLeaders.map(leader => (
                <div key={leader.sector} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                  <span className="text-lg">{getSectorIcon(leader.sector)}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 truncate">{leader.sector}</div>
                    <div className="text-sm font-semibold text-white truncate">{leader.company}</div>
                    <span className={`text-xs font-bold ${getGradeColor(leader.grade)}`}>{leader.grade}</span>

        <RelatedModules modules={PAGE_RELATIONS['report-cards']} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Filters & Sort ───────────────────────────────────────────── */}
        <ScrollReveal delay={0.15}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value as GradeRange)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {GRADE_RANGES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value as Sector | '')}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All Sectors</option>
              {SECTORS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={outlookFilter}
              onChange={e => setOutlookFilter(e.target.value as Outlook | '')}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {OUTLOOK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <span className="text-sm text-slate-400 ml-auto">
              {filteredAndSorted.length} of {REPORT_CARDS.length} companies
            </span>
          </div>
        </ScrollReveal>

        {/* ── Report Cards Grid ────────────────────────────────────────── */}
        <div className="space-y-4">
          {filteredAndSorted.map((card, idx) => {
            const isExpanded = expandedCard === card.company;

            return (
              <ScrollReveal key={card.company} delay={Math.min(idx * 0.05, 0.4)}>
                <div className={`card overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'ring-2 ' + getGradeRingColor(card.grade) : ''
                }`}>
                  {/* ── Collapsed Header Row ──────────────────────────────── */}
                  <button
                    onClick={() => toggleCard(card.company)}
                    className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`card-${card.company.replace(/\s+/g, '-')}`}
                  >
                    {/* Grade Badge */}
                    <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center ${getGradeBg(card.grade)}`}>
                      <span className={`text-2xl sm:text-3xl font-black ${getGradeColor(card.grade)}`}>
                        {card.grade}
                      </span>
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate">{card.company}</h3>
                        <span className="text-xs text-slate-500 font-mono">{card.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          {getSectorIcon(card.sector)} {card.sector}
                        </span>
                        <span className="text-xs text-slate-500">{card.quarterAssessed}</span>
                        <span className={`text-xs font-semibold flex items-center gap-1 ${getOutlookColor(card.outlook)}`}>
                          {getOutlookIcon(card.outlook)} {card.outlook.charAt(0).toUpperCase() + card.outlook.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Metrics (hidden on small screens) */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Revenue</div>
                        <div className="text-sm font-semibold text-slate-200">{card.metrics.revenue}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Backlog</div>
                        <div className="text-sm font-semibold text-slate-200">{card.metrics.backlog}</div>
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <div className="flex-shrink-0 text-slate-500">
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* ── Expanded Details ────────────────────────────────────── */}
                  {isExpanded && (
                    <div
                      id={`card-${card.company.replace(/\s+/g, '-')}`}
                      className="border-t border-slate-700/50 p-4 sm:p-5 space-y-5"
                    >
                      {/* Metrics Grid */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Key Metrics</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Annual Revenue</div>
                            <div className="text-lg font-bold text-white">{card.metrics.revenue}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Order Backlog</div>
                            <div className="text-lg font-bold text-white">{card.metrics.backlog}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Launches (2025)</div>
                            <div className="text-lg font-bold text-white">{card.metrics.launches}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Employees</div>
                            <div className="text-lg font-bold text-white">{card.metrics.employees}</div>
                          </div>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="text-emerald-400">+</span> Strengths
                          </h4>
                          <ul className="space-y-2">
                            {card.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="text-red-400">-</span> Weaknesses
                          </h4>
                          <ul className="space-y-2">
                            {card.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Outlook Badge */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Outlook</h4>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getOutlookColor(card.outlook)} ${getOutlookBg(card.outlook)}`}>
                          {getOutlookIcon(card.outlook)} {card.outlook.charAt(0).toUpperCase() + card.outlook.slice(1)} Outlook
                        </span>
                      </div>

                      {/* Analyst Summary */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Analyst Summary</h4>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 rounded-lg p-4 border-l-4 border-cyan-500/40">
                          {card.summary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}

          {filteredAndSorted.length === 0 && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-lg text-slate-300">No companies match the selected filters.</div>
              <button
                onClick={() => { setGradeFilter(''); setSectorFilter(''); setOutlookFilter(''); }}
                className="mt-4 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* ── Methodology Note ─────────────────────────────────────────── */}
        <ScrollReveal delay={0.2}>
          <div className="card p-5 mt-8">
            <h3 className="text-lg font-bold text-white mb-3">Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
              <div>
                <h4 className="text-slate-300 font-semibold mb-1">Grading Criteria</h4>
                <ul className="space-y-1">
                  <li><span className="text-emerald-400 font-bold">A Range</span> &mdash; Industry leaders with strong execution, growth, and market position</li>
                  <li><span className="text-cyan-400 font-bold">B Range</span> &mdash; Solid performers with clear competitive advantages and growth trajectory</li>
                  <li><span className="text-amber-400 font-bold">C Range</span> &mdash; Mixed results with notable challenges alongside some strengths</li>
                  <li><span className="text-orange-400 font-bold">D Range</span> &mdash; Significant concerns around execution, viability, or market fit</li>
                  <li><span className="text-red-400 font-bold">F</span> &mdash; Fundamental business model or survival risk</li>
                </ul>
              </div>
              <div>
                <h4 className="text-slate-300 font-semibold mb-1">Assessment Factors</h4>
                <ul className="space-y-1">
                  <li>Financial performance (revenue growth, margins, cash flow)</li>
                  <li>Technical execution (mission success, development milestones)</li>
                  <li>Competitive positioning and market share</li>
                  <li>Strategic clarity and management quality</li>
                  <li>Order backlog and revenue visibility</li>
                  <li>Risk factors (regulatory, financial, technical)</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  Assessments are updated quarterly and reflect publicly available information.
                  Grades are editorial opinions and should not be construed as investment advice.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Related Links ────────────────────────────────────────────── */}
        <ScrollReveal delay={0.25}>
          <div className="mt-8 mb-4">
            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Related Pages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/company-profiles"
                className="card p-4 hover:border-cyan-400/60 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Company Profiles</div>
                <div className="text-xs text-slate-500">Detailed company intelligence</div>
              </Link>

              <Link
                href="/space-score"
                className="card p-4 hover:border-cyan-400/60 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Space Score</div>
                <div className="text-xs text-slate-500">Quantitative scoring system</div>
              </Link>

              <Link
                href="/market-intel"
                className="card p-4 hover:border-cyan-400/60 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">📈</div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Market Intel</div>
                <div className="text-xs text-slate-500">Space market intelligence</div>
              </Link>

              <Link
                href="/investment-tracker"
                className="card p-4 hover:border-cyan-400/60 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">💰</div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Investment Tracker</div>
                <div className="text-xs text-slate-500">Funding rounds and deals</div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </main>
  );
}
