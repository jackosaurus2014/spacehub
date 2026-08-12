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
    case 'B': return 'text-white/70';
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
    case 'B': return 'bg-white/10 border-white/15';
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
    case 'B': return 'ring-white/15';
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
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$15.5B',
      backlog: '$30B+',
      launches: '165',
      employees: '13,000+',
    },
    strengths: [
      'Record 165 orbital launches in 2025 (~85% of all US missions); 93 Falcon flights already by mid-August 2026',
      'Starlink deployment at industrial cadence — 50 launches from Vandenberg alone in 2026 by early August',
      'Wall Street beginning to underwrite the AI thesis: Argus upgraded SpaceX-linked shares to Buy with a $160 target',
      'Starship targeting first orbital Starlink V3 deployment in late August 2026',
    ],
    weaknesses: [
      'Musk\'s projection of $500B annual revenue within roughly two years sets a public benchmark every quarter will now be measured against',
      'No IPO timeline; investor access limited to secondaries and vehicle funds',
      'Starship has yet to demonstrate the operational cadence and payload delivery its economics depend on',
    ],
    outlook: 'bullish',
    summary: 'SpaceX is being re-rated in real time — from launch provider to compute-and-connectivity platform. The 2025 launch record and relentless 2026 Starlink cadence keep the moat widening, and for the first time sell-side analysts are putting the AI narrative into models rather than keynotes. The $500B revenue target is now the yardstick.',
  },
  {
    company: 'Rocket Lab',
    ticker: 'RKLB',
    grade: 'A',
    sector: 'Launch',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$234M/qtr',
      backlog: '$2.36B',
      launches: '16',
      employees: '2,100+',
    },
    strengths: [
      'Record Q2 2026 revenue of $234M, up 62% YoY, with gross margins above guidance',
      'Definitive agreement to acquire Iridium for ~$8B — vertical integration into global satcom services and spectrum',
      'Launch backlog at a record $2.36B with more than 90 missions contracted',
      'Neutron on track for pad delivery in Q4 2026; 400+ Archimedes engine hot fires completed',
    ],
    weaknesses: [
      'Shares fell on Q3 margin guidance — Neutron first-flight spending is pressuring near-term profitability',
      'Neutron timeline has slipped from mid-2026; first flight now expected no earlier than late 2026',
      'Iridium acquisition (expected to close mid-2027) adds integration and financing risk',
    ],
    outlook: 'bullish',
    summary: 'Rocket Lab had a transformational quarter: record revenue, a record backlog, and an $8B agreement to acquire Iridium that would bolt a recurring-revenue global communications business onto the launch and space-systems stack. The market is asking harder questions about margins while Neutron spending peaks — but if Neutron flies and the Iridium deal closes, this is a fundamentally different company.',
  },
  {
    company: 'L3Harris Technologies',
    ticker: 'LHX',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$21B+',
      backlog: '$34B',
      launches: 'N/A',
      employees: '50,000+',
    },
    strengths: [
      '$843M SDA Tranche 3 Tracking Layer award (December 2025) for 18 missile-tracking satellites',
      '$955M accelerated Golden Dome award (July 2026) for 18 HBTSS-variant missile-defense satellites, launch-ready 2028',
      'Strong missile warning and space domain awareness portfolio',
      'Aerojet Rocketdyne propulsion demand rising as the US expands missile production capacity',
    ],
    weaknesses: [
      'Margin pressure from fixed-price development contracts',
      'Golden Dome exposure cuts both ways: program leadership warns the effort stops without new Congressional funding in FY27',
      'Slower commercial space exposure compared to peers',
    ],
    outlook: 'bullish',
    summary: 'L3Harris is the standout winner of the Golden Dome build-out so far, stacking nearly $1.8B of SDA tracking-layer awards across December 2025 and July 2026. The propulsion portfolio is riding the missile-production expansion. The watch item is appropriations: the missile-defense ramp is real, but it is funded one budget cycle at a time.',
  },
  {
    company: 'Northrop Grumman',
    ticker: 'NOC',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$41B',
      backlog: '$87B',
      launches: 'N/A',
      employees: '100,000+',
    },
    strengths: [
      '$764M SDA Tranche 3 award (December 2025) for 18 missile warning/tracking satellites',
      'Expanding missile production capacity across propulsion and structures as US arsenal demand grows',
      'Cygnus cargo resupply missions continuing reliably to ISS',
      'Deep involvement in classified and missile defense space programs',
    ],
    weaknesses: [
      'High dependency on US government spending and budget cycles — including Golden Dome appropriations uncertainty',
      'Lower commercial space revenue mix vs. diversified competitors',
      'Passed over for the accelerated Golden Dome tracking awards, which went to L3Harris and Sierra Space in July 2026',
    ],
    outlook: 'neutral',
    summary: 'Northrop Grumman remains a pillar of national security space with unmatched classified program depth, and the Tranche 3 tracking-layer win keeps it inside the proliferated-constellation architecture. The massive backlog provides stability, but the company still lacks the commercial growth vectors — and lately the marquee Golden Dome wins — that excite investors.',
  },
  {
    company: 'Boeing Space',
    ticker: 'BA',
    grade: 'C+',
    sector: 'Defense & Prime',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$5.3B',
      backlog: '$22B',
      launches: '1',
      employees: '14,000+',
    },
    strengths: [
      'SLS flew Artemis II flawlessly: April 1-10, 2026 crewed lunar flyby, the first humans beyond LEO since Apollo',
      'Artemis III hardware in flow, with booster processing running months ahead of the Artemis II pace',
      'WGS-11+ and next-gen satellite programs in production',
      'Strong legacy relationships with DoD and intelligence community',
    ],
    weaknesses: [
      'Starliner remains uncertified for crew; next flight is expected to be an uncrewed cargo run in 2026',
      'White House budget proposals would end SLS after Artemis III, capping the program\'s long-term revenue',
      'Space segment profitability consistently below peers',
      'Reputational damage from quality and safety issues across Boeing broadly',
    ],
    outlook: 'neutral',
    summary: 'Boeing Space finally got its win: Artemis II flew and flew well, restoring some credibility to the SLS program. But the strategic picture is unchanged — Starliner is still not carrying crew, and SLS faces a proposed sunset after Artemis III. A successful mission buys goodwill; it does not fix the margin structure or the competitive position.',
  },
  {
    company: 'Blue Origin',
    ticker: 'Private',
    grade: 'B-',
    sector: 'Launch',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$1.6B',
      backlog: '$11B+',
      launches: '2 orbital',
      employees: '11,000+',
    },
    strengths: [
      'New Glenn delivered NASA\'s ESCAPADE Mars mission in November 2025 and landed its booster on the second-ever attempt',
      'First booster reuse achieved on NG-3 in April 2026 — real progress toward reusable heavy lift',
      'Artemis Human Landing System contract and Blue Moon MK1 lander provide a lunar anchor',
      'BE-4 engine production scaling for both New Glenn and ULA Vulcan',
    ],
    weaknesses: [
      'NG-3\'s upper stage suffered a thrust anomaly that left AST SpaceMobile\'s BlueBird-7 in a wrong orbit',
      'May 28, 2026 static-fire explosion destroyed a booster and fueled second stage and heavily damaged LC-36, its only New Glenn pad',
      'The ~24-mission Kuiper manifest and Blue Moon MK1 are frozen until the pad is rebuilt; return to flight targeted before end of 2026',
      'Revenue generation is nascent relative to the enormous capital invested',
    ],
    outlook: 'neutral',
    summary: 'A whiplash two quarters: Blue Origin proved booster recovery and reuse faster than SpaceX did at the same stage, then lost a vehicle and its only orbital pad in a ground test explosion. The engineering trajectory is genuinely encouraging, but 2026 is now a rebuilding year — and every month LC-36 stays down, the Kuiper and lunar manifests slip with it.',
  },
  {
    company: 'Planet Labs',
    ticker: 'PL',
    grade: 'B+',
    sector: 'Satellite & EO',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$308M',
      backlog: '$900M+',
      launches: 'N/A',
      employees: '900+',
    },
    strengths: [
      'First full fiscal year of adjusted-EBITDA and free-cash-flow profitability (FY2026, revenue up 26% to $307.7M)',
      'Backlog surged 79% to over $900M, anchored by a $240M Germany agreement and a nine-figure Sweden deal',
      'Defense & intelligence revenue grew more than 50% year over year',
      '$640M in cash and FY2027 revenue guidance of $415-440M imply accelerating growth',
    ],
    weaknesses: [
      'GAAP profitability still pending; adjusted metrics lead the story',
      'Growing dependence on large government contracts introduces revenue lumpiness',
      'Competition from Airbus, Vantor, and emerging hyperspectral players',
    ],
    outlook: 'bullish',
    summary: 'Planet Labs crossed the line skeptics doubted it ever would: a full year of positive free cash flow, with backlog growing far faster than revenue. European defense demand has turned daily global imaging from a differentiated dataset into a procurement priority. Upgraded on delivered results, not promises.',
  },
  {
    company: 'Vantor (fmr. Maxar)',
    ticker: 'Private (Advent)',
    grade: 'B+',
    sector: 'Satellite & EO',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$2.1B',
      backlog: '$3.8B',
      launches: 'N/A',
      employees: '5,400+',
    },
    strengths: [
      'All six WorldView Legion satellites now on orbit and performing, enabling up to 15 revisits per day of key locations',
      'October 2025 split into Vantor (intelligence) and Lanteris (space systems) gives each business a sharper focus',
      'Best-in-class sub-30cm commercial imagery with deep intelligence-community relationships',
      'Advent ownership provides investment capacity without quarterly earnings pressure',
    ],
    weaknesses: [
      'Private ownership limits investor access and financial transparency',
      'Retiring the Maxar brand carries franchise risk in government and commercial channels',
      'Legacy geostationary satellite bus market (now under Lanteris) remains in structural decline',
    ],
    outlook: 'bullish',
    summary: 'The company formerly known as Maxar completed both its constellation and its reinvention: WorldView Legion is fully deployed, and the October 2025 rebrand into Vantor and Lanteris formalizes the split between Earth intelligence and space infrastructure. With Legion\'s capacity online just as defense imagery demand surges, the timing is favorable.',
  },
  {
    company: 'Relativity Space',
    ticker: 'Private',
    grade: 'B-',
    sector: 'Launch',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '<$50M',
      backlog: '$1.8B',
      launches: '0',
      employees: '1,200+',
    },
    strengths: [
      'Terran R first-stage qualification article complete and handed off to factory test; second stage shipped to Stennis for cryo validation',
      'Multi-engine integration under way, with an engine-integration milestone reached in August 2026',
      'Eric Schmidt\'s takeover as CEO and lead backer in 2025 stabilized the funding picture',
      'Strong customer backlog (~$1.8B) built ahead of first flight',
    ],
    weaknesses: [
      'Terran R debut has slipped from mid-2026 to late 2026, with no firm launch date announced',
      'Deferred its NSSL Phase 3 bid to stay focused on the debut — pushing out government revenue',
      'No revenue-generating orbital launch service yet; cash burn remains high',
      'Manufacturing approach still unproven at flight scale',
    ],
    outlook: 'neutral',
    summary: 'Relativity is in the grind-it-out phase: qualification hardware is real, stages are on test stands, and the program is visibly converging — but the debut has drifted to late 2026 and the company wisely stopped promising dates it could not hold. The Schmidt era has traded hype for discipline. The binary risk remains until Terran R flies.',
  },
  {
    company: 'Astra Space',
    ticker: 'Private',
    grade: 'D+',
    sector: 'Launch',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '~$50M',
      backlog: '$30M',
      launches: '0',
      employees: '125',
    },
    strengths: [
      'Spacecraft engine (electric propulsion) business now expected to generate roughly $50M in annual revenue',
      'Rocket 4 first test flight planned from Cape Canaveral in summer 2026, with a DoD Space Test Program mission to follow in the fall',
      'Lean 125-person cost structure after going private under co-founders Kemp and London',
    ],
    weaknesses: [
      'No orbital launch since the Rocket 3 program was abandoned; Rocket 4 is unproven',
      'Development funded hand-to-mouth via military contracts and thruster sales',
      'Public-market exit wiped out SPAC-era shareholders; access to capital remains constrained',
      'Quarterly Rocket 4 cadence is not planned until 2027 even if the test flights succeed',
    ],
    outlook: 'neutral',
    summary: 'Astra is quietly executing the least glamorous turnaround in launch: private, small, and funded by a propulsion business that actually sells. Rocket 4\'s planned summer 2026 test flight is the first real checkpoint. The grade improves modestly because the company found a revenue engine — but the launch business must still prove it can reach orbit at all.',
  },
  {
    company: 'Virgin Galactic',
    ticker: 'SPCE',
    grade: 'C-',
    sector: 'Tourism',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '<$10M',
      backlog: '$120M',
      launches: '0',
      employees: '700',
    },
    strengths: [
      'First Delta-class spaceplane in final assembly, with test flights targeted for Q3 2026',
      'Delta ships designed for up to two flights per week with six passengers each — a step change in unit economics if achieved',
      'Ticket sales reopening in 2026 at higher prices under a staged "waves" intake model',
    ],
    weaknesses: [
      'No revenue spaceflights since VSS Unity was retired in mid-2024 — effectively pre-revenue until Delta flies',
      'Commercial research flights slipped from summer to fall 2026 on composite fuselage skin production issues',
      'Cash burn through the flight gap raises continued dilution risk',
      'Business model remains unproven at scale even with Delta economics',
    ],
    outlook: 'bearish',
    summary: 'Virgin Galactic is two years into a bet-the-company pause, and the Delta program has now slipped within 2026 — from summer to fall — on manufacturing issues. The vehicles in assembly are real, but every quarter of delay consumes the balance sheet that has to fund the ramp. Delta\'s first flights late this year are make-or-break.',
  },
  {
    company: 'Iridium Communications',
    ticker: 'IRDM',
    grade: 'A-',
    sector: 'Communications',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$880M',
      backlog: '$2.4B',
      launches: 'N/A',
      employees: '950',
    },
    strengths: [
      'Agreed in June 2026 to be acquired by Rocket Lab for $54/share (~$8B enterprise value) — validation of the network\'s strategic worth',
      'Q2 2026 revenue of $225M with accelerating subscriber growth',
      'Iridium NTN Direct standards-based direct-to-device service launching later in 2026',
      'New tri-mode Iridium 9604 module (June 2026) combines satellite, LTE-M, and GNSS for low-cost IoT',
      'Recurring government contracts (EMSS) provide a durable revenue floor',
    ],
    weaknesses: [
      'Merger costs ($14.3M in Q2) compressed earnings to $0.09/share',
      'Deal is not expected to close until mid-2027 — regulatory and shareholder approvals still pending',
      'Starlink direct-to-cell and other LEO broadband offerings continue to pressure legacy premium pricing',
    ],
    outlook: 'neutral',
    summary: 'The quiet achiever got a loud exit: Rocket Lab\'s $8B cash-and-stock offer prices Iridium\'s pole-to-pole network and spectrum as strategic infrastructure. The operating business keeps compounding — subscriber growth is accelerating and standards-based D2D arrives this year — but the stock is now a merger-arb story until the mid-2027 close.',
  },
  {
    company: 'SES',
    ticker: 'SES (EPA)',
    grade: 'B+',
    sector: 'Communications',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$3.7B',
      backlog: '$7.4B',
      launches: 'N/A',
      employees: '2,200+',
    },
    strengths: [
      'Intelsat acquisition closed July 2025; Q1 2026 revenue of €847M, up 80% YoY as reported',
      'Early synergy delivery: employee costs down 20% and like-for-like operating costs down 9%',
      'Multi-orbit GEO + MEO (O3b mPOWER) strategy is unique among established operators',
      'Aviation connectivity expansion, including a Boeing factory-installation deal',
    ],
    weaknesses: [
      'Swung to a €16M quarterly net loss on heavier depreciation and financing costs from the deal',
      'Management calls 2026 a "build" year — real growth is promised for 2027 and beyond',
      'Legacy GEO video revenues remain in structural decline',
    ],
    outlook: 'neutral',
    summary: 'The combined SES-Intelsat is now the scale player in multi-orbit connectivity, and the cost synergies are showing up on schedule. The bottom line will look worse before it looks better — deal amortization and interest are doing the damage — so the thesis rests on management converting integration discipline into growth from 2027.',
  },
  {
    company: 'Telesat',
    ticker: 'TSAT',
    grade: 'C',
    sector: 'Communications',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '<$600M',
      backlog: '$3.2B',
      launches: 'N/A',
      employees: '550',
    },
    strengths: [
      'First Lightspeed pathfinder satellites targeted for launch around December 2026',
      'Canadian government backing with significant subsidy commitments',
      'Multi-year terrestrial infrastructure and services contract signed with Vocus for Lightspeed',
    ],
    weaknesses: [
      'Lightspeed service entry has slipped again — now around Q1 2028, driven by a supplier ASIC delay',
      'Debtholder discussions under way, underscoring balance-sheet strain from Lightspeed capex',
      'Legacy GEO revenues declining while the LEO replacement is still two years from service',
      'Every year of delay hands Starlink, OneWeb, and Kuiper more of the enterprise market Lightspeed targets',
    ],
    outlook: 'neutral',
    summary: 'Telesat\'s bet-the-company constellation keeps receding: service entry has moved to early 2028 on a supplier chip delay, and the company is in talks with debtholders while GEO cash flows erode. The December 2026 pathfinder launch is now the credibility event. Downgraded a notch — the strategy is coherent, but the schedule risk is compounding.',
  },
  {
    company: 'Axiom Space',
    ticker: 'Private',
    grade: 'B',
    sector: 'Space Station',
    quarterAssessed: 'Q2 2026',
    metrics: {
      revenue: '$350M',
      backlog: '$3.5B+',
      launches: '1',
      employees: '1,600+',
    },
    strengths: [
      'Ax-4 private astronaut mission completed an 18-day ISS stay in 2025, extending an unmatched flight record',
      'Revised assembly sequence — Payload Power Thermal Module to ISS around 2027, with an earlier path to free flight',
      'NASA Commercial LEO Destinations contract provides a development anchor',
      'AxEMU spacesuit is on the critical path for Artemis III moonwalks — now closer after Artemis II\'s successful April 2026 flight',
    ],
    weaknesses: [
      'Revenue remains dependent on a small number of high-value missions',
      'Station module development requires massive capital with a long payback period',
      'No proven recurring revenue model for commercial station operations yet',
      'ISS retirement timing and Artemis schedules create dependencies outside Axiom\'s control',
    ],
    outlook: 'bullish',
    summary: 'Axiom keeps banking the things only it has done — four private ISS missions flown — while pragmatically resequencing its station plan around power and thermal hardware first. With Artemis II flown, the AxEMU suit contract moves from optionality to near-term deliverable. Execution risk is real, but so is the first-mover position as ISS retirement approaches.',
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
                        letter === 'B' ? 'bg-white' :
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
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.bullish}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 text-sm">◆</span>
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.neutral}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-sm">▼</span>
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.bearish}</span>
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
                <div key={leader.sector} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.04]">
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
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {GRADE_RANGES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value as Sector | '')}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="">All Sectors</option>
              {SECTORS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={outlookFilter}
              onChange={e => setOutlookFilter(e.target.value as Outlook | '')}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {OUTLOOK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                    className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
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
                        <div className="text-sm font-semibold text-white/90">{card.metrics.revenue}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Backlog</div>
                        <div className="text-sm font-semibold text-white/90">{card.metrics.backlog}</div>
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
                      className="border-t border-white/[0.06] p-4 sm:p-5 space-y-5"
                    >
                      {/* Metrics Grid */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Key Metrics</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Revenue</div>
                            <div className="text-lg font-bold text-white">{card.metrics.revenue}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Order Backlog</div>
                            <div className="text-lg font-bold text-white">{card.metrics.backlog}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Launches (2025)</div>
                            <div className="text-lg font-bold text-white">{card.metrics.launches}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
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
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
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
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
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
                        <p className="text-sm text-white/70 leading-relaxed bg-white/[0.03] rounded-lg p-4 border-l-4 border-white/15">
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
              <div className="text-lg text-white/70">No companies match the selected filters.</div>
              <button
                onClick={() => { setGradeFilter(''); setSectorFilter(''); setOutlookFilter(''); }}
                className="mt-4 px-4 py-2 text-sm bg-white hover:bg-slate-100 text-slate-900 rounded-lg transition-colors"
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
                <h4 className="text-white/70 font-semibold mb-1">Grading Criteria</h4>
                <ul className="space-y-1">
                  <li><span className="text-emerald-400 font-bold">A Range</span> &mdash; Industry leaders with strong execution, growth, and market position</li>
                  <li><span className="text-white/70 font-bold">B Range</span> &mdash; Solid performers with clear competitive advantages and growth trajectory</li>
                  <li><span className="text-amber-400 font-bold">C Range</span> &mdash; Mixed results with notable challenges alongside some strengths</li>
                  <li><span className="text-orange-400 font-bold">D Range</span> &mdash; Significant concerns around execution, viability, or market fit</li>
                  <li><span className="text-red-400 font-bold">F</span> &mdash; Fundamental business model or survival risk</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/70 font-semibold mb-1">Assessment Factors</h4>
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
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Company Profiles</div>
                <div className="text-xs text-slate-500">Detailed company intelligence</div>
              </Link>

              <Link
                href="/space-score"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Space Score</div>
                <div className="text-xs text-slate-500">Quantitative scoring system</div>
              </Link>

              <Link
                href="/market-intel"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">📈</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Market Intel</div>
                <div className="text-xs text-slate-500">Space market intelligence</div>
              </Link>

              <Link
                href="/investment-tracker"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">💰</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Investment Tracker</div>
                <div className="text-xs text-slate-500">Funding rounds and deals</div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </main>
  );
}
