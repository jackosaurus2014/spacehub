/**
 * Shared, server-safe data and helpers for /report-cards.
 *
 * No 'use client', no JSX: imported by the server page (page.tsx — h1,
 * provenance, summary line, the ?view=score switch) and by the client island
 * (ReportCardsClient.tsx — filters, sorting, expandable cards). REPORT_CARDS
 * is the single quarterly dataset; refresh it together with
 * REPORT_CARDS_QUARTER_ASSESSED in src/lib/report-cards-data.ts (the
 * content-accuracy sentinel watches that stamp for staleness).
 */

import { REPORT_CARDS_QUARTER_ASSESSED } from '@/lib/report-cards-data';

export { REPORT_CARDS_QUARTER_ASSESSED };
// ─── Types ────────────────────────────────────────────────────────────────────

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
export type Outlook = 'bullish' | 'neutral' | 'bearish';
export type Sector = 'Launch' | 'Defense & Prime' | 'Satellite & EO' | 'Communications' | 'Space Station' | 'Tourism';
export type GradeRange = '' | 'A' | 'B' | 'C' | 'D' | 'F';
export type SortKey = 'grade' | 'revenue' | 'company';

export interface CompanyReportCard {
  company: string;
  /** Slug on /company-profiles/{slug} — omit when no verified profile exists. */
  profileSlug?: string;
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

export const GRADE_NUMERIC: Record<Grade, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9, 'B-': 8,
  'C+': 7, 'C': 6, 'C-': 5,
  'D+': 4, 'D': 3, 'D-': 2,
  'F': 1,
};

export function getGradeColor(grade: Grade): string {
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

export function getGradeBg(grade: Grade): string {
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

export function getGradeRingColor(grade: Grade): string {
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

export function getOutlookIcon(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return '▲';
    case 'neutral': return '◆';
    case 'bearish': return '▼';
  }
}

export function getOutlookColor(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return 'text-emerald-400';
    case 'neutral': return 'text-amber-400';
    case 'bearish': return 'text-red-400';
  }
}

export function getOutlookBg(outlook: Outlook): string {
  switch (outlook) {
    case 'bullish': return 'bg-emerald-500/15';
    case 'neutral': return 'bg-amber-500/15';
    case 'bearish': return 'bg-red-500/15';
  }
}

export function getSectorIcon(sector: Sector): string {
  switch (sector) {
    case 'Launch': return '🚀';
    case 'Defense & Prime': return '🛡️';
    case 'Satellite & EO': return '🛰️';
    case 'Communications': return '📡';
    case 'Space Station': return '🏗️';
    case 'Tourism': return '🎢';
  }
}

export function parseRevenue(rev: string): number {
  const cleaned = rev.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (rev.includes('B')) return num * 1000;
  return num;
}

export function gradeLetterMatch(grade: Grade, range: GradeRange): boolean {
  if (!range) return true;
  return grade.charAt(0) === range;
}

// ─── Report Card Data ─────────────────────────────────────────────────────────

export const REPORT_CARDS: CompanyReportCard[] = [
  {
    company: 'SpaceX',
    profileSlug: 'spacex',
    ticker: 'SPCX',
    grade: 'A+',
    sector: 'Launch',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'rocket-lab',
    ticker: 'RKLB',
    grade: 'A',
    sector: 'Launch',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'l3harris-technologies',
    ticker: 'LHX',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'northrop-grumman',
    ticker: 'NOC',
    grade: 'B+',
    sector: 'Defense & Prime',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'boeing',
    ticker: 'BA',
    grade: 'C+',
    sector: 'Defense & Prime',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'blue-origin',
    ticker: 'Private',
    grade: 'B-',
    sector: 'Launch',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'planet-labs',
    ticker: 'PL',
    grade: 'B+',
    sector: 'Satellite & EO',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'maxar-technologies',
    ticker: 'Private (Advent)',
    grade: 'B+',
    sector: 'Satellite & EO',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'relativity-space',
    ticker: 'Private',
    grade: 'B-',
    sector: 'Launch',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'astra-space',
    ticker: 'Private',
    grade: 'D+',
    sector: 'Launch',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'virgin-galactic',
    ticker: 'SPCE',
    grade: 'C-',
    sector: 'Tourism',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'iridium-communications',
    ticker: 'IRDM',
    grade: 'A-',
    sector: 'Communications',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'ses',
    ticker: 'SES (EPA)',
    grade: 'B+',
    sector: 'Communications',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'telesat',
    ticker: 'TSAT',
    grade: 'C',
    sector: 'Communications',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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
    profileSlug: 'axiom-space',
    ticker: 'Private',
    grade: 'B',
    sector: 'Space Station',
    quarterAssessed: REPORT_CARDS_QUARTER_ASSESSED,
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

export const SECTORS: Sector[] = ['Launch', 'Defense & Prime', 'Satellite & EO', 'Communications', 'Space Station', 'Tourism'];

export const GRADE_RANGES: { value: GradeRange; label: string }[] = [
  { value: '', label: 'All Grades' },
  { value: 'A', label: 'A Range' },
  { value: 'B', label: 'B Range' },
  { value: 'C', label: 'C Range' },
  { value: 'D', label: 'D Range' },
  { value: 'F', label: 'F' },
];

export const OUTLOOK_OPTIONS: { value: Outlook | ''; label: string }[] = [
  { value: '', label: 'All Outlooks' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'bearish', label: 'Bearish' },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'grade', label: 'Sort by Grade' },
  { value: 'revenue', label: 'Sort by Revenue' },
  { value: 'company', label: 'Sort by Company' },
];

// ─── Summary Stats Computation ────────────────────────────────────────────────

export function computeSummaryStats(cards: CompanyReportCard[]) {
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
