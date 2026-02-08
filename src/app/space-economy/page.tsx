'use client';

import { useState } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'market' | 'investment' | 'government' | 'public-markets' | 'workforce';

interface MarketSegment {
  name: string;
  revenue: number; // in billions USD
  share: number; // percentage
  growth: number; // YoY growth percentage
  description: string;
}

interface MarketProjection {
  year: number;
  size: number; // in billions USD
  source: string;
}

interface VCDeal {
  quarter: string;
  year: number;
  totalInvested: number; // in billions USD
  dealCount: number;
  topSector: string;
}

interface AnnualInvestment {
  year: number;
  vcInvestment: number; // billions
  debtFinancing: number; // billions
  publicOfferings: number; // billions
  totalPrivate: number; // billions
}

interface TopInvestor {
  name: string;
  type: string;
  notableDeals: string[];
  estimatedDeployed: string;
}

interface GovernmentBudget {
  agency: string;
  country: string;
  flag: string;
  budget2024: number; // billions USD
  budget2025: number; // billions USD
  change: number; // percentage
  currency: string;
  focusAreas: string[];
  notes: string;
}

interface SpaceCompanyStock {
  name: string;
  ticker: string;
  exchange: string;
  marketCap: number; // billions
  price: number;
  ytdChange: number; // percentage
  sector: string;
  revenue2024: number; // billions
}

interface SpaceETF {
  name: string;
  ticker: string;
  aum: number; // billions
  expenseRatio: number; // percentage
  ytdReturn: number; // percentage
  topHoldings: string[];
}

interface WorkforceStat {
  category: string;
  value: string;
  detail: string;
  source: string;
}

interface LaunchCostDataPoint {
  vehicle: string;
  operator: string;
  year: number;
  costPerKgLEO: number; // USD
  payload: number; // kg to LEO
  reusable: boolean;
}

interface SalaryBenchmark {
  role: string;
  minSalary: number;
  maxSalary: number;
  median: number;
  growth: number; // YoY percentage
}

// ────────────────────────────────────────
// Constants & Tab Config
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'market', label: 'Market Overview', icon: '📊' },
  { id: 'investment', label: 'Investment', icon: '💰' },
  { id: 'government', label: 'Government Budgets', icon: '🏛️' },
  { id: 'public-markets', label: 'Public Markets', icon: '📈' },
  { id: 'workforce', label: 'Workforce & Trends', icon: '👷' },
];

// ────────────────────────────────────────
// Seed Data — Market Overview
// ────────────────────────────────────────

const MARKET_SIZE_2024 = 570; // Space Foundation Q4 2024 Space Report
const MARKET_SIZE_2025_EST = 600; // estimated ~5% growth
const MARKET_GROWTH_RATE = 5.3; // CAGR %

const MARKET_SEGMENTS: MarketSegment[] = [
  {
    name: 'Satellite Services',
    revenue: 184,
    share: 32.3,
    growth: 3.8,
    description: 'Direct-to-home TV, satellite radio, broadband, managed services, remote sensing data',
  },
  {
    name: 'Ground Equipment',
    revenue: 145,
    share: 25.4,
    growth: 4.5,
    description: 'GNSS devices, satellite terminals, network equipment, VSAT systems',
  },
  {
    name: 'Government Space Budgets',
    revenue: 117,
    share: 20.5,
    growth: 8.2,
    description: 'Civil space agencies, military/intelligence space programs, R&D',
  },
  {
    name: 'Satellite Manufacturing',
    revenue: 15.8,
    share: 2.8,
    growth: 12.1,
    description: 'Commercial and government satellite production, smallsat manufacturing',
  },
  {
    name: 'Launch Industry',
    revenue: 8.4,
    share: 1.5,
    growth: 15.7,
    description: 'Commercial launch services, rideshare, dedicated small-launch',
  },
  {
    name: 'Non-Satellite Industry',
    revenue: 99.8,
    share: 17.5,
    growth: 6.8,
    description: 'Human spaceflight, space stations, deep space exploration, suborbital, in-space services',
  },
];

const MARKET_PROJECTIONS: MarketProjection[] = [
  { year: 2020, size: 447, source: 'Space Foundation' },
  { year: 2021, size: 469, source: 'Space Foundation' },
  { year: 2022, size: 503, source: 'Space Foundation' },
  { year: 2023, size: 546, source: 'Space Foundation' },
  { year: 2024, size: 570, source: 'Space Foundation' },
  { year: 2025, size: 600, source: 'Estimate' },
  { year: 2026, size: 632, source: 'Forecast' },
  { year: 2027, size: 668, source: 'Forecast' },
  { year: 2028, size: 710, source: 'Forecast' },
  { year: 2029, size: 756, source: 'Forecast' },
  { year: 2030, size: 805, source: 'Morgan Stanley' },
  { year: 2035, size: 1100, source: 'Morgan Stanley / Goldman Sachs' },
  { year: 2040, size: 1800, source: 'Morgan Stanley' },
];

// ────────────────────────────────────────
// Seed Data — Investment
// ────────────────────────────────────────

const QUARTERLY_VC: VCDeal[] = [
  { quarter: 'Q1', year: 2024, totalInvested: 2.1, dealCount: 62, topSector: 'Earth Observation' },
  { quarter: 'Q2', year: 2024, totalInvested: 1.8, dealCount: 55, topSector: 'Launch' },
  { quarter: 'Q3', year: 2024, totalInvested: 3.2, dealCount: 71, topSector: 'Communications' },
  { quarter: 'Q4', year: 2024, totalInvested: 2.4, dealCount: 58, topSector: 'In-Space Services' },
  { quarter: 'Q1', year: 2025, totalInvested: 2.7, dealCount: 64, topSector: 'National Security' },
  { quarter: 'Q2', year: 2025, totalInvested: 2.3, dealCount: 59, topSector: 'Earth Observation' },
];

const ANNUAL_INVESTMENT: AnnualInvestment[] = [
  { year: 2019, vcInvestment: 5.8, debtFinancing: 3.2, publicOfferings: 0.6, totalPrivate: 9.6 },
  { year: 2020, vcInvestment: 7.6, debtFinancing: 4.1, publicOfferings: 3.2, totalPrivate: 14.9 },
  { year: 2021, vcInvestment: 15.4, debtFinancing: 7.8, publicOfferings: 13.3, totalPrivate: 36.5 },
  { year: 2022, vcInvestment: 8.0, debtFinancing: 5.9, publicOfferings: 1.1, totalPrivate: 15.0 },
  { year: 2023, vcInvestment: 6.1, debtFinancing: 4.5, publicOfferings: 0.8, totalPrivate: 11.4 },
  { year: 2024, vcInvestment: 9.5, debtFinancing: 5.2, publicOfferings: 1.4, totalPrivate: 16.1 },
];

const TOP_INVESTORS: TopInvestor[] = [
  { name: 'Andreessen Horowitz (a16z)', type: 'VC', notableDeals: ['Relativity Space', 'Hadrian', 'Anduril'], estimatedDeployed: '$2B+' },
  { name: 'Space Capital', type: 'VC (Space-focused)', notableDeals: ['Ursa Major', 'Umbra', 'Muon Space'], estimatedDeployed: '$300M+' },
  { name: 'Founders Fund', type: 'VC', notableDeals: ['SpaceX', 'Planet Labs', 'Relativity'], estimatedDeployed: '$1.5B+' },
  { name: 'In-Q-Tel', type: 'Strategic (IC)', notableDeals: ['BlackSky', 'Capella Space', 'HawkEye 360'], estimatedDeployed: 'Classified' },
  { name: 'Bessemer Venture Partners', type: 'VC', notableDeals: ['Rocket Lab', 'Spire', 'Astranis'], estimatedDeployed: '$800M+' },
  { name: 'Tiger Global Management', type: 'Crossover', notableDeals: ['SpaceX', 'Relativity Space'], estimatedDeployed: '$1B+' },
  { name: 'Google Ventures (GV)', type: 'Corporate VC', notableDeals: ['SpaceX', 'Planet Labs'], estimatedDeployed: '$500M+' },
  { name: 'Lockheed Martin Ventures', type: 'Corporate VC', notableDeals: ['Terran Orbital', 'Rocket Lab', 'ABL Space'], estimatedDeployed: '$200M+' },
];

// ────────────────────────────────────────
// Seed Data — Government Budgets
// ────────────────────────────────────────

const GOVERNMENT_BUDGETS: GovernmentBudget[] = [
  {
    agency: 'NASA',
    country: 'United States',
    flag: '🇺🇸',
    budget2024: 25.4,
    budget2025: 25.2,
    change: -0.8,
    currency: 'USD',
    focusAreas: ['Artemis / Lunar', 'Mars Sample Return', 'ISS Transition', 'Earth Science', 'Space Technology'],
    notes: 'FY2025 enacted. Includes Artemis program, commercial crew/cargo, and science missions.',
  },
  {
    agency: 'DoD Space Programs',
    country: 'United States',
    flag: '🇺🇸',
    budget2024: 33.3,
    budget2025: 33.7,
    change: 1.2,
    currency: 'USD',
    focusAreas: ['Space Force', 'Missile Warning', 'Space Domain Awareness', 'SATCOM', 'PNT Resilience'],
    notes: 'Includes USSF, MDA space programs, NRO (est.), and classified programs.',
  },
  {
    agency: 'ESA',
    country: 'Europe',
    flag: '🇪🇺',
    budget2024: 7.79,
    budget2025: 7.94,
    change: 1.9,
    currency: 'EUR (converted)',
    focusAreas: ['Ariane 6', 'Copernicus', 'ExoMars', 'IRIS2', 'Space Safety'],
    notes: 'Ministerial-level budget for 2023-2027 cycle. Includes member state contributions.',
  },
  {
    agency: 'CNSA',
    country: 'China',
    flag: '🇨🇳',
    budget2024: 14.0,
    budget2025: 16.0,
    change: 14.3,
    currency: 'USD (estimated)',
    focusAreas: ['Tiangong Station', 'Chang\'e Lunar', 'Tianwen Mars', 'BeiDou', 'Reusable Launch'],
    notes: 'Estimated. China does not publish official figures. Includes CASC and CASIC activities.',
  },
  {
    agency: 'ISRO',
    country: 'India',
    flag: '🇮🇳',
    budget2024: 1.93,
    budget2025: 2.15,
    change: 11.4,
    currency: 'USD (converted)',
    focusAreas: ['Gaganyaan (Crewed)', 'Chandrayaan-4', 'SSLV', 'NISAR', 'NavIC Expansion'],
    notes: 'INR 176B allocated for FY2025-26. Strong increase for Gaganyaan human spaceflight program.',
  },
  {
    agency: 'JAXA',
    country: 'Japan',
    flag: '🇯🇵',
    budget2024: 3.6,
    budget2025: 4.1,
    change: 13.9,
    currency: 'USD (converted)',
    focusAreas: ['H3 Launch Vehicle', 'Artemis / Gateway', 'MMX Mars Moons', 'SLIM Follow-on', 'QPS-SAR'],
    notes: 'Budget increase reflects expanded national security space and Artemis contributions.',
  },
  {
    agency: 'KARI / KASA',
    country: 'South Korea',
    flag: '🇰🇷',
    budget2024: 0.72,
    budget2025: 0.87,
    change: 20.8,
    currency: 'USD (converted)',
    focusAreas: ['KSLV-II Nuri', 'Danuri Follow-on', 'SAR Constellation', 'Lunar Lander'],
    notes: 'Korea Aerospace Administration (KASA) established 2024. Significant budget increase.',
  },
  {
    agency: 'ASI',
    country: 'Italy',
    flag: '🇮🇹',
    budget2024: 2.3,
    budget2025: 2.4,
    change: 4.3,
    currency: 'USD (converted)',
    focusAreas: ['Vega-C', 'COSMO-SkyMed', 'Artemis I-HAB', 'Space Rider', 'Galileo'],
    notes: 'Includes national and ESA contributions. Italy is 3rd largest ESA contributor.',
  },
  {
    agency: 'CNES',
    country: 'France',
    flag: '🇫🇷',
    budget2024: 3.2,
    budget2025: 3.3,
    change: 3.1,
    currency: 'USD (converted)',
    focusAreas: ['Ariane 6', 'Copernicus', 'IRIS2', 'CSO Defense', 'Telecommunications'],
    notes: 'Includes national military space. France is ESA\'s largest contributor.',
  },
  {
    agency: 'DLR',
    country: 'Germany',
    flag: '🇩🇪',
    budget2024: 2.7,
    budget2025: 2.8,
    change: 3.7,
    currency: 'USD (converted)',
    focusAreas: ['Ariane 6', 'Columbus / ISS', 'Copernicus', 'Heinrich Hertz', 'Lunar Exploration'],
    notes: 'Germany is ESA\'s 2nd largest contributor. Includes national programs.',
  },
  {
    agency: 'CSA',
    country: 'Canada',
    flag: '🇨🇦',
    budget2024: 0.42,
    budget2025: 0.46,
    change: 9.5,
    currency: 'USD (converted)',
    focusAreas: ['Canadarm3 / Gateway', 'RADARSAT', 'Lunar Rover', 'Astronaut Program'],
    notes: 'Building Canadarm3 for Lunar Gateway. Budget growth for lunar contributions.',
  },
  {
    agency: 'Roscosmos',
    country: 'Russia',
    flag: '🇷🇺',
    budget2024: 3.9,
    budget2025: 3.6,
    change: -7.7,
    currency: 'USD (estimated)',
    focusAreas: ['ROSS (New Station)', 'Luna-26/27', 'Angara', 'GLONASS', 'Soyuz/Progress'],
    notes: 'Estimated from published federal budget. Declining in USD terms due to exchange rate.',
  },
];

// ────────────────────────────────────────
// Seed Data — Public Markets
// ────────────────────────────────────────

const SPACE_STOCKS: SpaceCompanyStock[] = [
  { name: 'SpaceX', ticker: 'Private', exchange: 'N/A', marketCap: 350, price: 0, ytdChange: 0, sector: 'Launch / Broadband', revenue2024: 13.6 },
  { name: 'Lockheed Martin', ticker: 'LMT', exchange: 'NYSE', marketCap: 135, price: 565, ytdChange: 8.2, sector: 'Defense / Space Systems', revenue2024: 71.0 },
  { name: 'Northrop Grumman', ticker: 'NOC', exchange: 'NYSE', marketCap: 78, price: 525, ytdChange: 12.4, sector: 'Defense / Space Systems', revenue2024: 39.3 },
  { name: 'RTX (Raytheon)', ticker: 'RTX', exchange: 'NYSE', marketCap: 164, price: 124, ytdChange: 5.1, sector: 'Defense / Satellites', revenue2024: 73.6 },
  { name: 'Boeing (Space)', ticker: 'BA', exchange: 'NYSE', marketCap: 130, price: 178, ytdChange: -14.2, sector: 'Launch / Space Systems', revenue2024: 66.5 },
  { name: 'L3Harris Technologies', ticker: 'LHX', exchange: 'NYSE', marketCap: 46, price: 240, ytdChange: 7.8, sector: 'Defense / Payloads', revenue2024: 21.1 },
  { name: 'Rocket Lab', ticker: 'RKLB', exchange: 'NASDAQ', marketCap: 12.5, price: 26.4, ytdChange: 42.3, sector: 'Launch / Spacecraft', revenue2024: 0.43 },
  { name: 'Planet Labs', ticker: 'PL', exchange: 'NYSE', marketCap: 1.6, price: 5.5, ytdChange: 18.7, sector: 'Earth Observation', revenue2024: 0.24 },
  { name: 'BlackSky Technology', ticker: 'BKSY', exchange: 'NYSE', marketCap: 0.56, price: 3.8, ytdChange: 22.1, sector: 'Geospatial Intelligence', revenue2024: 0.11 },
  { name: 'Spire Global', ticker: 'SPIR', exchange: 'NYSE', marketCap: 0.42, price: 15.2, ytdChange: 31.5, sector: 'Data / Weather', revenue2024: 0.10 },
  { name: 'Iridium Communications', ticker: 'IRDM', exchange: 'NASDAQ', marketCap: 7.1, price: 57.8, ytdChange: 6.3, sector: 'Satellite Communications', revenue2024: 2.05 },
  { name: 'Viasat', ticker: 'VSAT', exchange: 'NASDAQ', marketCap: 3.8, price: 14.6, ytdChange: -8.5, sector: 'Satellite Broadband', revenue2024: 4.4 },
  { name: 'SES', ticker: 'SESG', exchange: 'Euronext', marketCap: 5.2, price: 6.1, ytdChange: 3.9, sector: 'Satellite Communications', revenue2024: 2.0 },
  { name: 'Eutelsat', ticker: 'ETL', exchange: 'Euronext', marketCap: 3.6, price: 4.2, ytdChange: -5.4, sector: 'Satellite Communications', revenue2024: 1.2 },
  { name: 'Maxar (now Advent)', ticker: 'Acquired', exchange: 'N/A', marketCap: 0, price: 0, ytdChange: 0, sector: 'Earth Observation / Geo', revenue2024: 1.8 },
  { name: 'Aerojet Rocketdyne', ticker: 'Acquired', exchange: 'N/A', marketCap: 0, price: 0, ytdChange: 0, sector: 'Propulsion', revenue2024: 2.4 },
  { name: 'Virgin Galactic', ticker: 'SPCE', exchange: 'NYSE', marketCap: 0.35, price: 4.2, ytdChange: -28.6, sector: 'Space Tourism', revenue2024: 0.012 },
  { name: 'AST SpaceMobile', ticker: 'ASTS', exchange: 'NASDAQ', marketCap: 7.8, price: 24.5, ytdChange: 85.3, sector: 'Direct-to-Cell', revenue2024: 0.001 },
  { name: 'Intuitive Machines', ticker: 'LUNR', exchange: 'NASDAQ', marketCap: 3.2, price: 19.8, ytdChange: 67.4, sector: 'Lunar Services', revenue2024: 0.23 },
  { name: 'Redwire Corporation', ticker: 'RDW', exchange: 'NYSE', marketCap: 1.3, price: 17.5, ytdChange: 48.9, sector: 'In-Space Manufacturing', revenue2024: 0.31 },
];

const SPACE_ETFS: SpaceETF[] = [
  {
    name: 'ARK Space Exploration & Innovation ETF',
    ticker: 'ARKX',
    aum: 0.28,
    expenseRatio: 0.75,
    ytdReturn: 14.2,
    topHoldings: ['Rocket Lab', 'Kratos Defense', 'Iridium', 'Trimble', 'L3Harris'],
  },
  {
    name: 'Procure Space ETF',
    ticker: 'UFO',
    aum: 0.04,
    expenseRatio: 0.75,
    ytdReturn: 8.7,
    topHoldings: ['SES', 'Eutelsat', 'Iridium', 'Viasat', 'Maxar Technologies'],
  },
  {
    name: 'SPDR S&P Kensho Final Frontiers ETF',
    ticker: 'ROKT',
    aum: 0.02,
    expenseRatio: 0.45,
    ytdReturn: 11.3,
    topHoldings: ['L3Harris', 'Northrop Grumman', 'Lockheed Martin', 'Rocket Lab', 'Virgin Galactic'],
  },
  {
    name: 'iShares U.S. Aerospace & Defense ETF',
    ticker: 'ITA',
    aum: 6.2,
    expenseRatio: 0.40,
    ytdReturn: 9.8,
    topHoldings: ['RTX', 'Boeing', 'Lockheed Martin', 'Northrop Grumman', 'L3Harris'],
  },
];

// ────────────────────────────────────────
// Seed Data — Workforce & Trends
// ────────────────────────────────────────

const WORKFORCE_STATS: WorkforceStat[] = [
  { category: 'Total U.S. Space Workforce', value: '360,000+', detail: 'Direct space industry employment including commercial, civil, and national security', source: 'Space Foundation 2024' },
  { category: 'Global Space Workforce', value: '1,200,000+', detail: 'Estimated total across all space-faring nations', source: 'OECD Space Economy 2024' },
  { category: 'U.S. Space Workforce Growth', value: '+4.8%', detail: 'Year-over-year growth (2023 to 2024)', source: 'BLS / Space Foundation' },
  { category: 'Commercial Space Employment', value: '235,000+', detail: 'Private sector space jobs (non-government)', source: 'Space Foundation 2024' },
  { category: 'Average Space Engineer Salary (U.S.)', value: '$128,000', detail: 'Aerospace engineers median, top 10% earn $170K+', source: 'BLS OES 2024' },
  { category: 'Aerospace Engineering Degrees (U.S.)', value: '7,400/year', detail: 'Bachelor\'s degrees awarded annually (growing)', source: 'NCES 2024' },
  { category: 'STEM Gap in Space', value: '45,000+', detail: 'Estimated unfilled positions in U.S. space industry', source: 'Space Workforce 2030 Report' },
  { category: 'New Space Companies Founded (2024)', value: '180+', detail: 'Space-focused startups incorporated globally', source: 'Space Capital Q4 2024' },
];

const LAUNCH_COST_TRENDS: LaunchCostDataPoint[] = [
  { vehicle: 'Space Shuttle', operator: 'NASA', year: 2011, costPerKgLEO: 54500, payload: 27500, reusable: true },
  { vehicle: 'Delta IV Heavy', operator: 'ULA', year: 2020, costPerKgLEO: 14300, payload: 28790, reusable: false },
  { vehicle: 'Atlas V 551', operator: 'ULA', year: 2023, costPerKgLEO: 8800, payload: 18850, reusable: false },
  { vehicle: 'Ariane 5', operator: 'Arianespace', year: 2023, costPerKgLEO: 9200, payload: 21000, reusable: false },
  { vehicle: 'Ariane 6 (A64)', operator: 'Arianespace', year: 2025, costPerKgLEO: 7100, payload: 21650, reusable: false },
  { vehicle: 'H3-24', operator: 'JAXA/MHI', year: 2025, costPerKgLEO: 5500, payload: 6500, reusable: false },
  { vehicle: 'GSLV Mk III', operator: 'ISRO', year: 2024, costPerKgLEO: 4700, payload: 10000, reusable: false },
  { vehicle: 'Long March 5', operator: 'CASC', year: 2024, costPerKgLEO: 4300, payload: 25000, reusable: false },
  { vehicle: 'Falcon 9 (reused)', operator: 'SpaceX', year: 2025, costPerKgLEO: 2720, payload: 22800, reusable: true },
  { vehicle: 'Falcon Heavy (reused)', operator: 'SpaceX', year: 2025, costPerKgLEO: 1500, payload: 63800, reusable: true },
  { vehicle: 'Electron', operator: 'Rocket Lab', year: 2025, costPerKgLEO: 26500, payload: 300, reusable: false },
  { vehicle: 'New Glenn', operator: 'Blue Origin', year: 2025, costPerKgLEO: 3200, payload: 45000, reusable: true },
  { vehicle: 'Vulcan Centaur', operator: 'ULA', year: 2025, costPerKgLEO: 5700, payload: 27200, reusable: false },
  { vehicle: 'Starship (projected)', operator: 'SpaceX', year: 2026, costPerKgLEO: 100, payload: 150000, reusable: true },
];

const SALARY_BENCHMARKS: SalaryBenchmark[] = [
  { role: 'Aerospace Engineer', minSalary: 85000, maxSalary: 170000, median: 128000, growth: 4.2 },
  { role: 'Systems Engineer (Space)', minSalary: 95000, maxSalary: 185000, median: 142000, growth: 5.1 },
  { role: 'Satellite Communications Eng.', minSalary: 90000, maxSalary: 175000, median: 135000, growth: 4.8 },
  { role: 'GNC Engineer', minSalary: 100000, maxSalary: 195000, median: 148000, growth: 5.5 },
  { role: 'Space Software Engineer', minSalary: 110000, maxSalary: 220000, median: 165000, growth: 7.2 },
  { role: 'Propulsion Engineer', minSalary: 92000, maxSalary: 180000, median: 138000, growth: 4.6 },
  { role: 'RF / Payload Engineer', minSalary: 88000, maxSalary: 172000, median: 132000, growth: 4.3 },
  { role: 'Mission Analyst', minSalary: 82000, maxSalary: 155000, median: 118000, growth: 3.9 },
  { role: 'Space Policy Analyst', minSalary: 72000, maxSalary: 140000, median: 105000, growth: 6.1 },
  { role: 'Launch Operations Tech', minSalary: 65000, maxSalary: 120000, median: 88000, growth: 3.5 },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatBillions(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number, showPlus = true): string {
  const prefix = showPlus && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

// ────────────────────────────────────────
// Tab 1: Market Overview
// ────────────────────────────────────────

function MarketOverviewTab() {
  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              ${MARKET_SIZE_2024}B
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2024 Market Size</div>
            <div className="text-slate-500 text-xs mt-1">Space Foundation</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ~${MARKET_SIZE_2025_EST}B
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2025 Estimate</div>
            <div className="text-slate-500 text-xs mt-1">Projected</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400">
              {MARKET_GROWTH_RATE}%
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Annual CAGR</div>
            <div className="text-slate-500 text-xs mt-1">2020-2024</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              $1.8T
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2040 Forecast</div>
            <div className="text-slate-500 text-xs mt-1">Morgan Stanley</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Segment Breakdown */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-lg">📊</span>
          Market Segment Breakdown (2024)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Segment</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Revenue</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Share</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YoY Growth</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {MARKET_SEGMENTS.map((segment) => (
                <tr key={segment.name} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{segment.name}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(segment.revenue)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${segment.share}%` }}
                        />
                      </div>
                      {segment.share.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={segment.growth >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatPercent(segment.growth)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-sm hidden lg:table-cell">{segment.description}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-600">
                <td className="py-3 px-4 text-white font-bold">Total</td>
                <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold">
                  {formatBillions(MARKET_SEGMENTS.reduce((sum, s) => sum + s.revenue, 0))}
                </td>
                <td className="py-3 px-4 text-right text-slate-300 font-bold">100%</td>
                <td className="py-3 px-4 text-right text-green-400 font-bold">{formatPercent(MARKET_GROWTH_RATE)}</td>
                <td className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Projections */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">📈</span>
          Market Size Projections (2020-2040)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {MARKET_PROJECTIONS.map((proj) => (
            <div
              key={proj.year}
              className={`rounded-lg p-3 text-center border ${
                proj.year <= 2024
                  ? 'bg-cyan-900/20 border-cyan-500/30'
                  : proj.year <= 2026
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-purple-900/20 border-purple-500/30'
              }`}
            >
              <div className="text-slate-400 text-xs">{proj.year}</div>
              <div className={`text-xl font-bold ${
                proj.year <= 2024 ? 'text-cyan-400' : proj.year <= 2026 ? 'text-green-400' : 'text-purple-400'
              }`}>
                {formatBillions(proj.size)}
              </div>
              <div className="text-slate-500 text-xs">{proj.source}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Historical
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Near-term Forecast
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Long-range Forecast
          </div>
        </div>
      </div>

      {/* Key Trends */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaggerItem>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Growth Drivers</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Mega-constellation broadband deployment (Starlink, Kuiper)</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> National security space spending surge globally</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Falling launch costs enabling new applications</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Direct-to-device satellite connectivity market</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Space-based climate monitoring and carbon tracking</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Commercial space station development (Axiom, Vast, Orbital Reef)</li>
          </ul>
        </div>
        </StaggerItem>
        <StaggerItem>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Market Risks</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Orbital debris growth threatening sustainability</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Spectrum congestion and regulatory bottlenecks</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Geopolitical tensions fragmenting supply chains</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> SPAC-era space companies facing profitability pressure</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Satellite broadband over-capacity risk</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Workforce shortage constraining industry growth</li>
          </ul>
        </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Investment
// ────────────────────────────────────────

function InvestmentTab() {
  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">$9.5B</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2024 VC Investment</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">246</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2024 Deal Count</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">$16.1B</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2024 Total Private</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">$77B+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Cumulative Since 2013</div>
        </div>
      </div>

      {/* Quarterly VC */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-lg">💰</span>
          Quarterly VC Investment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Quarter</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Total Invested</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Deal Count</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Top Sector</th>
              </tr>
            </thead>
            <tbody>
              {QUARTERLY_VC.map((q) => (
                <tr key={`${q.quarter}-${q.year}`} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{q.quarter} {q.year}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(q.totalInvested)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{q.dealCount}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">{q.topSector}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Investment Trends */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📈</span>
          Annual Investment Trends
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Year</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">VC/PE</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Debt</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Public Offerings</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {ANNUAL_INVESTMENT.map((yr) => (
                <tr key={yr.year} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{yr.year}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(yr.vcInvestment)}</td>
                  <td className="py-3 px-4 text-right text-slate-300 font-mono">{formatBillions(yr.debtFinancing)}</td>
                  <td className="py-3 px-4 text-right text-purple-400 font-mono">{formatBillions(yr.publicOfferings)}</td>
                  <td className="py-3 px-4 text-right text-green-400 font-mono font-bold">{formatBillions(yr.totalPrivate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Bar visualization */}
        <div className="mt-6">
          <div className="flex items-end gap-2 h-32">
            {ANNUAL_INVESTMENT.map((yr) => {
              const maxTotal = Math.max(...ANNUAL_INVESTMENT.map((y) => y.totalPrivate));
              const heightPct = (yr.totalPrivate / maxTotal) * 100;
              return (
                <div key={yr.year} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-slate-400">{formatBillions(yr.totalPrivate)}</div>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-xs text-slate-500">{yr.year}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Investors */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">🏦</span>
          Top Space Industry Investors
        </h3>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOP_INVESTORS.map((investor) => (
            <StaggerItem key={investor.name}>
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold">{investor.name}</div>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">{investor.type}</span>
                </div>
                <div className="text-cyan-400 text-sm mb-2">Estimated deployed: {investor.estimatedDeployed}</div>
                <div className="flex flex-wrap gap-1">
                  {investor.notableDeals.map((deal) => (
                    <span key={deal} className="text-xs bg-cyan-900/30 text-cyan-300 px-2 py-0.5 rounded">
                      {deal}
                    </span>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* SPAC Activity Note */}
      <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-6">
        <h4 className="text-amber-400 font-semibold mb-2">SPAC Activity Update</h4>
        <p className="text-slate-300 text-sm">
          The space SPAC wave of 2020-2022 brought 15+ space companies public including Planet Labs (PL), Rocket Lab (RKLB),
          BlackSky (BKSY), Spire Global (SPIR), Virgin Orbit (bankrupt 2023), Momentus (delisted 2024), and others.
          Post-SPAC performance has been mixed: Rocket Lab is the standout winner, growing from ~$5 to $25+ per share,
          while several others have struggled with profitability timelines. The SPAC window has effectively closed as of 2024,
          with new IPOs now following the traditional route. Companies like SpaceX, Relativity Space, and Firefly remain private.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: Government Budgets
// ────────────────────────────────────────

function GovernmentBudgetsTab() {
  const [sortBy, setSortBy] = useState<'budget' | 'change'>('budget');

  const sortedBudgets = [...GOVERNMENT_BUDGETS].sort((a, b) => {
    if (sortBy === 'budget') return b.budget2025 - a.budget2025;
    return b.change - a.change;
  });

  const totalBudget2024 = GOVERNMENT_BUDGETS.reduce((sum, b) => sum + b.budget2024, 0);
  const totalBudget2025 = GOVERNMENT_BUDGETS.reduce((sum, b) => sum + b.budget2025, 0);

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">{formatBillions(totalBudget2025)}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Gov&apos;t Space 2025</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">
            {formatPercent(((totalBudget2025 - totalBudget2024) / totalBudget2024) * 100)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">YoY Growth</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">{GOVERNMENT_BUDGETS.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Agencies Tracked</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">$58.9B</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">U.S. Space (Total)</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 items-center">
        <span className="text-slate-400 text-sm">Sort by:</span>
        <button
          onClick={() => setSortBy('budget')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'budget'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          Budget Size
        </button>
        <button
          onClick={() => setSortBy('change')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'change'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          Growth Rate
        </button>
      </div>

      {/* Budget Cards */}
      <div className="space-y-4">
        {sortedBudgets.map((budget) => (
          <div key={budget.agency} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Agency Info */}
              <div className="flex items-center gap-3 md:w-64 shrink-0">
                <span className="text-3xl">{budget.flag}</span>
                <div>
                  <div className="text-white font-semibold">{budget.agency}</div>
                  <div className="text-slate-400 text-sm">{budget.country}</div>
                </div>
              </div>

              {/* Budget Numbers */}
              <div className="flex gap-6 items-center">
                <div>
                  <div className="text-slate-500 text-xs">FY2024</div>
                  <div className="text-slate-300 font-mono">{formatBillions(budget.budget2024)}</div>
                </div>
                <div className="text-slate-600">&#8594;</div>
                <div>
                  <div className="text-slate-500 text-xs">FY2025</div>
                  <div className="text-cyan-400 font-mono font-bold">{formatBillions(budget.budget2025)}</div>
                </div>
                <div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                    budget.change >= 0
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}>
                    {formatPercent(budget.change)}
                  </span>
                </div>
              </div>

              {/* Budget Bar */}
              <div className="flex-1 hidden lg:block">
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${(budget.budget2025 / Math.max(...GOVERNMENT_BUDGETS.map((b) => b.budget2025))) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Focus Areas & Notes */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {budget.focusAreas.map((area) => (
                <span key={area} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                  {area}
                </span>
              ))}
            </div>
            <div className="mt-2 text-slate-500 text-xs">{budget.notes}</div>
          </div>
        ))}
      </div>

      {/* Context Note */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4 text-center">
        <p className="text-slate-500 text-xs">
          Budget figures are approximated in USD using 2024-2025 average exchange rates where applicable.
          Chinese spending is estimated as official figures are not published. U.S. figures include both NASA civil and DoD/IC classified programs.
          Sources: NASA, ESA, JAXA, ISRO official budgets; Euroconsult; OECD Space Economy reports.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Public Markets
// ────────────────────────────────────────

function PublicMarketsTab() {
  const [sectorFilter, setSectorFilter] = useState<string>('');

  const publicStocks = SPACE_STOCKS.filter((s) => s.ticker !== 'Private' && s.ticker !== 'Acquired');
  const sectors = Array.from(new Set(publicStocks.map((s) => s.sector))).sort();

  const filteredStocks = sectorFilter
    ? publicStocks.filter((s) => s.sector === sectorFilter)
    : publicStocks;

  const totalMarketCap = publicStocks.reduce((sum, s) => sum + s.marketCap, 0);

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">{publicStocks.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Tracked Stocks</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">{formatBillions(totalMarketCap)}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Combined Market Cap</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">
            {formatPercent(publicStocks.reduce((sum, s) => sum + s.ytdChange, 0) / publicStocks.length)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Avg YTD Change</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">{SPACE_ETFS.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Space ETFs</div>
        </div>
      </div>

      {/* Sector Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-slate-400 text-sm">Filter:</span>
        <button
          onClick={() => setSectorFilter('')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !sectorFilter
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          All
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => setSectorFilter(sector)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sectorFilter === sector
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Ticker</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Price</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Market Cap</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YTD</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Revenue (2024)</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden lg:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks
                .sort((a, b) => b.marketCap - a.marketCap)
                .map((stock) => (
                  <tr key={stock.ticker} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{stock.name}</td>
                    <td className="py-3 px-4 text-cyan-400 font-mono text-sm">
                      {stock.exchange}:{stock.ticker}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      {formatBillions(stock.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                        stock.ytdChange >= 0
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {formatPercent(stock.ytdChange)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono hidden md:table-cell">
                      {stock.revenue2024 >= 1 ? formatBillions(stock.revenue2024) : `$${(stock.revenue2024 * 1000).toFixed(0)}M`}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">{stock.sector}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notable Private Companies */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">🔒</span>
          Notable Private Companies
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPACE_STOCKS.filter((s) => s.ticker === 'Private').map((company) => (
            <div key={company.name} className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
              <div className="text-white font-semibold">{company.name}</div>
              <div className="text-purple-400 text-lg font-bold">{formatBillions(company.marketCap)} valuation</div>
              <div className="text-slate-400 text-sm">{company.sector}</div>
              <div className="text-slate-500 text-xs mt-1">2024 Revenue: {formatBillions(company.revenue2024)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Space ETFs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📊</span>
          Space-Related ETFs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPACE_ETFS.map((etf) => (
            <div key={etf.ticker} className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-white font-semibold text-sm">{etf.name}</div>
                  <div className="text-cyan-400 font-mono text-sm">{etf.ticker}</div>
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  etf.ytdReturn >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {formatPercent(etf.ytdReturn)}
                </span>
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <span className="text-slate-500">AUM: </span>
                  <span className="text-slate-300">{formatBillions(etf.aum)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Expense: </span>
                  <span className="text-slate-300">{etf.expenseRatio}%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {etf.topHoldings.map((holding) => (
                  <span key={holding} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
                    {holding}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4 text-center">
        <p className="text-slate-500 text-xs">
          Stock prices and market data are approximate and may not reflect real-time values.
          For publicly traded companies, data is based on recent filings and market reports.
          This is not investment advice. Always conduct your own research.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 5: Workforce & Trends
// ────────────────────────────────────────

function WorkforceTrendsTab() {
  return (
    <div className="space-y-8">
      {/* Workforce Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WORKFORCE_STATS.slice(0, 4).map((stat) => (
          <div key={stat.category} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="text-2xl font-bold text-cyan-400 mb-1">{stat.value}</div>
            <div className="text-white text-sm font-medium mb-1">{stat.category}</div>
            <div className="text-slate-500 text-xs">{stat.detail}</div>
            <div className="text-slate-600 text-xs mt-1">Source: {stat.source}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WORKFORCE_STATS.slice(4).map((stat) => (
          <div key={stat.category} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="text-2xl font-bold text-green-400 mb-1">{stat.value}</div>
            <div className="text-white text-sm font-medium mb-1">{stat.category}</div>
            <div className="text-slate-500 text-xs">{stat.detail}</div>
            <div className="text-slate-600 text-xs mt-1">Source: {stat.source}</div>
          </div>
        ))}
      </div>

      {/* Salary Benchmarks */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">💵</span>
          Space Industry Salary Benchmarks (U.S., 2025)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Role</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Min</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Median</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Max</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YoY Growth</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Range</th>
              </tr>
            </thead>
            <tbody>
              {SALARY_BENCHMARKS.sort((a, b) => b.median - a.median).map((role) => {
                const rangeMin = role.minSalary;
                const rangeMax = role.maxSalary;
                const maxPossible = 220000;
                const leftPct = (rangeMin / maxPossible) * 100;
                const widthPct = ((rangeMax - rangeMin) / maxPossible) * 100;
                const medianPct = ((role.median - rangeMin) / (rangeMax - rangeMin)) * 100;
                return (
                  <tr key={role.role} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 text-white font-medium text-sm">{role.role}</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm">{formatCurrency(role.minSalary)}</td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold text-sm">{formatCurrency(role.median)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm">{formatCurrency(role.maxSalary)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-green-400 text-sm">{formatPercent(role.growth)}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="w-full h-3 bg-slate-700 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-gradient-to-r from-cyan-600/60 to-cyan-400/60 rounded-full"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                        <div
                          className="absolute h-full w-0.5 bg-white rounded-full"
                          style={{ left: `${leftPct + (widthPct * medianPct) / 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Cost Trends */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">🚀</span>
          Launch Cost Comparison ($/kg to LEO)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Vehicle</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Operator</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">$/kg (LEO)</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm hidden sm:table-cell">Payload (LEO)</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Reusable</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Cost Bar</th>
              </tr>
            </thead>
            <tbody>
              {LAUNCH_COST_TRENDS
                .sort((a, b) => a.costPerKgLEO - b.costPerKgLEO)
                .map((launch) => {
                  const maxCost = Math.max(...LAUNCH_COST_TRENDS.map((l) => l.costPerKgLEO));
                  const logMax = Math.log10(maxCost);
                  const logVal = Math.log10(launch.costPerKgLEO);
                  const barWidth = (logVal / logMax) * 100;
                  return (
                    <tr key={launch.vehicle} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4 text-white font-medium text-sm">{launch.vehicle}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{launch.operator}</td>
                      <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold text-sm">
                        ${launch.costPerKgLEO.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm hidden sm:table-cell">
                        {launch.payload.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-center">
                        {launch.reusable ? (
                          <span className="text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded">Yes</span>
                        ) : (
                          <span className="text-slate-500 text-xs bg-slate-700/30 px-2 py-0.5 rounded">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              launch.costPerKgLEO <= 1000
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : launch.costPerKgLEO <= 5000
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                : launch.costPerKgLEO <= 10000
                                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                : 'bg-gradient-to-r from-red-500 to-rose-400'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Under $1,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> $1,000 - $5,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> $5,000 - $10,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Over $10,000/kg
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Launch Cost Revolution</h4>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              Launch costs have dropped by over 95% since the Space Shuttle era.
              SpaceX&apos;s Falcon 9 reduced costs to ~$2,720/kg through booster reuse (20+ flights per booster).
            </p>
            <p>
              Starship, if operational at projected rates, could reduce costs to ~$100/kg --
              a 500x reduction from the Shuttle and enabling entirely new categories of space activity.
            </p>
            <p>
              Small launch vehicles like Electron are more expensive per kg ($26,500) but offer
              dedicated orbits and schedules for small satellites, commanding a premium.
            </p>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Workforce Outlook</h4>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              The space industry faces an estimated 45,000+ unfilled positions in the U.S. alone,
              primarily in software engineering, systems engineering, and RF/satellite communications.
            </p>
            <p>
              Space software engineers command the highest salaries (median $165K), reflecting
              the growing importance of software-defined satellites and AI/ML in space applications.
            </p>
            <p>
              GNC (Guidance, Navigation & Control) engineers are seeing 5.5% annual salary growth,
              driven by demand from autonomous spacecraft operations and lunar/Mars missions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceEconomyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('market');

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Economy Dashboard"
          subtitle="Comprehensive intelligence on the global space economy -- market size, investment trends, government budgets, public markets, and workforce data"
          icon="💰"
          accentColor="emerald"
        />

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'market' && <MarketOverviewTab />}
        {activeTab === 'investment' && <InvestmentTab />}
        {activeTab === 'government' && <GovernmentBudgetsTab />}
        {activeTab === 'public-markets' && <PublicMarketsTab />}
        {activeTab === 'workforce' && <WorkforceTrendsTab />}

        {/* Data Sources Footer */}
        <ScrollReveal>
        <div className="mt-12 bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
          <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
            <div>Space Foundation -- The Space Report (2024)</div>
            <div>Satellite Industry Association (SIA) -- SOTSI 2024</div>
            <div>Space Capital -- Quarterly Investment Reports</div>
            <div>Morgan Stanley -- Space Economy Forecast</div>
            <div>Goldman Sachs -- Space: The Next Frontier</div>
            <div>Euroconsult -- Government Space Programs</div>
            <div>Bureau of Labor Statistics (BLS) -- OES Data</div>
            <div>NASA, ESA, JAXA, ISRO -- Official Budgets</div>
            <div>OECD -- The Space Economy at a Glance</div>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Data is compiled from publicly available industry reports and may include estimates where official figures are unavailable.
            Market data is approximate and not intended as investment advice. Last updated: Q2 2025.
          </p>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
