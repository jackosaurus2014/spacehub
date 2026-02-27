// ────────────────────────────────────────
// Static Data for Workforce Analytics page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

// ────────────────────────────────────────
// Workforce Overview Stats
// ────────────────────────────────────────

export interface OverviewStat {
  label: string;
  value: string;
  detail: string;
  color: string;
}

export const OVERVIEW_STATS: OverviewStat[] = [
  { label: 'US Space Workforce', value: '360,000+', detail: 'Government, commercial, and defense sectors combined', color: 'text-cyan-400' },
  { label: 'Global Space Workforce', value: '1.1M+', detail: 'Across 80+ nations with active space programs', color: 'text-blue-400' },
  { label: 'Annual Job Growth', value: '8%', detail: 'Year-over-year growth driven by commercial expansion', color: 'text-emerald-400' },
  { label: 'Average Salary', value: '$112,000', detail: 'Median base compensation for full-time US positions', color: 'text-green-400' },
];

// ────────────────────────────────────────
// Employment by Sector
// ────────────────────────────────────────

export interface SectorData {
  sector: string;
  employees: number;
  color: string;
  description: string;
}

export const SECTOR_DATA: SectorData[] = [
  { sector: 'Defense / Intelligence', employees: 140000, color: 'bg-red-500', description: 'Military space, NRO, Space Force, and cleared contractor workforce' },
  { sector: 'Commercial Satellite', employees: 60000, color: 'bg-cyan-500', description: 'Satellite manufacturing, operations, and communications services' },
  { sector: 'NASA / Government Civil', employees: 45000, color: 'bg-blue-500', description: 'NASA centers, civil servants, and on-site support contractors' },
  { sector: 'NewSpace Startups', employees: 35000, color: 'bg-purple-500', description: 'Venture-backed companies founded since 2010' },
  { sector: 'Launch Providers', employees: 25000, color: 'bg-orange-500', description: 'Rocket manufacturing, launch operations, and ground support' },
  { sector: 'Space Manufacturing', employees: 25000, color: 'bg-yellow-500', description: 'Component fabrication, 3D printing, and assembly' },
  { sector: 'Earth Observation', employees: 15000, color: 'bg-green-500', description: 'Remote sensing, geospatial analytics, and imagery services' },
  { sector: 'Academic / Research', employees: 15000, color: 'bg-indigo-500', description: 'University labs, research institutes, and national labs' },
];

// ────────────────────────────────────────
// Top Employers
// ────────────────────────────────────────

export type EmployerTier = 'prime' | 'major' | 'growth';

export interface TopEmployer {
  rank: number;
  company: string;
  spaceWorkforce: string;
  headcount: number;
  tier: EmployerTier;
  hq: string;
  segment: string;
  growthTrend: 'up' | 'stable' | 'down';
}

export const TOP_EMPLOYERS: TopEmployer[] = [
  { rank: 1, company: 'Lockheed Martin Space', spaceWorkforce: '30,000+', headcount: 30000, tier: 'prime', hq: 'Denver, CO', segment: 'Defense & Civil Space', growthTrend: 'up' },
  { rank: 2, company: 'Northrop Grumman Space', spaceWorkforce: '28,000+', headcount: 28000, tier: 'prime', hq: 'Falls Church, VA', segment: 'Defense & Science', growthTrend: 'up' },
  { rank: 3, company: 'Boeing Defense & Space', spaceWorkforce: '25,000+', headcount: 25000, tier: 'prime', hq: 'Arlington, VA', segment: 'Launch & Crew Systems', growthTrend: 'down' },
  { rank: 4, company: 'SpaceX', spaceWorkforce: '13,000+', headcount: 13000, tier: 'major', hq: 'Hawthorne, CA', segment: 'Launch & Satellites', growthTrend: 'up' },
  { rank: 5, company: 'L3Harris Space', spaceWorkforce: '12,000+', headcount: 12000, tier: 'prime', hq: 'Melbourne, FL', segment: 'Sensors & Payloads', growthTrend: 'up' },
  { rank: 6, company: 'Blue Origin', spaceWorkforce: '10,000+', headcount: 10000, tier: 'major', hq: 'Kent, WA', segment: 'Launch & Lunar', growthTrend: 'up' },
  { rank: 7, company: 'Raytheon Technologies', spaceWorkforce: '10,000+', headcount: 10000, tier: 'prime', hq: 'Arlington, VA', segment: 'Space & Sensors', growthTrend: 'stable' },
  { rank: 8, company: 'Ball Aerospace', spaceWorkforce: '6,000+', headcount: 6000, tier: 'major', hq: 'Boulder, CO', segment: 'Instruments & Spacecraft', growthTrend: 'up' },
  { rank: 9, company: 'Maxar', spaceWorkforce: '4,000+', headcount: 4000, tier: 'major', hq: 'Westminster, CO', segment: 'Earth Intelligence', growthTrend: 'stable' },
  { rank: 10, company: 'United Launch Alliance', spaceWorkforce: '3,500', headcount: 3500, tier: 'major', hq: 'Centennial, CO', segment: 'Launch Services', growthTrend: 'stable' },
  { rank: 11, company: 'Rocket Lab', spaceWorkforce: '2,000+', headcount: 2000, tier: 'growth', hq: 'Long Beach, CA', segment: 'Launch & Spacecraft', growthTrend: 'up' },
  { rank: 12, company: 'Sierra Space', spaceWorkforce: '1,500+', headcount: 1500, tier: 'growth', hq: 'Louisville, CO', segment: 'Space Stations & Cargo', growthTrend: 'up' },
  { rank: 13, company: 'Relativity Space', spaceWorkforce: '1,000+', headcount: 1000, tier: 'growth', hq: 'Long Beach, CA', segment: '3D-Printed Rockets', growthTrend: 'up' },
  { rank: 14, company: 'Planet Labs', spaceWorkforce: '800+', headcount: 800, tier: 'growth', hq: 'San Francisco, CA', segment: 'Earth Observation', growthTrend: 'stable' },
  { rank: 15, company: 'Virgin Galactic', spaceWorkforce: '800+', headcount: 800, tier: 'growth', hq: 'Tuscon, AZ', segment: 'Suborbital Tourism', growthTrend: 'down' },
  { rank: 16, company: 'Firefly Aerospace', spaceWorkforce: '600+', headcount: 600, tier: 'growth', hq: 'Cedar Park, TX', segment: 'Small Launch', growthTrend: 'up' },
  { rank: 17, company: 'Spire Global', spaceWorkforce: '500+', headcount: 500, tier: 'growth', hq: 'Vienna, VA', segment: 'Data & Analytics', growthTrend: 'stable' },
  { rank: 18, company: 'Axiom Space', spaceWorkforce: '400+', headcount: 400, tier: 'growth', hq: 'Houston, TX', segment: 'Commercial Space Station', growthTrend: 'up' },
  { rank: 19, company: 'Astra', spaceWorkforce: '400+', headcount: 400, tier: 'growth', hq: 'Alameda, CA', segment: 'Small Launch', growthTrend: 'down' },
  { rank: 20, company: 'BlackSky', spaceWorkforce: '300+', headcount: 300, tier: 'growth', hq: 'Herndon, VA', segment: 'Geospatial Intelligence', growthTrend: 'stable' },
];

// ────────────────────────────────────────
// Skills Gap Analysis
// ────────────────────────────────────────

export type SkillCategory = 'most_in_demand' | 'hardest_to_fill' | 'emerging';

export interface SkillGapItem {
  skill: string;
  category: SkillCategory;
  openPositions: number;
  avgSalary: number;
  timeToFill: string;
  notes: string;
}

export const SKILLS_GAP_DATA: SkillGapItem[] = [
  // Most In-Demand
  { skill: 'RF Engineering', category: 'most_in_demand', openPositions: 2840, avgSalary: 145000, timeToFill: '90 days', notes: 'Critical for satellite communications and radar systems' },
  { skill: 'Systems Engineering', category: 'most_in_demand', openPositions: 4200, avgSalary: 155000, timeToFill: '75 days', notes: 'End-to-end spacecraft and mission design' },
  { skill: 'Orbital Mechanics', category: 'most_in_demand', openPositions: 1450, avgSalary: 148000, timeToFill: '85 days', notes: 'Trajectory design, constellation management, rendezvous ops' },
  { skill: 'Software Engineering (Flight)', category: 'most_in_demand', openPositions: 3100, avgSalary: 162000, timeToFill: '70 days', notes: 'C/C++, Python, MATLAB for real-time systems' },
  { skill: 'Propulsion Engineering', category: 'most_in_demand', openPositions: 1890, avgSalary: 152000, timeToFill: '95 days', notes: 'Liquid, solid, and electric propulsion expertise' },

  // Hardest to Fill
  { skill: 'Security-Cleared Engineers', category: 'hardest_to_fill', openPositions: 8500, avgSalary: 165000, timeToFill: '180+ days', notes: 'TS/SCI clearance backlog compounds hiring delays' },
  { skill: 'Flight Software Engineers', category: 'hardest_to_fill', openPositions: 1200, avgSalary: 175000, timeToFill: '150 days', notes: 'DO-178C, safety-critical real-time systems experience' },
  { skill: 'Radiation-Hardened Design', category: 'hardest_to_fill', openPositions: 620, avgSalary: 168000, timeToFill: '200+ days', notes: 'Rad-hard ASIC/FPGA design for space-grade electronics' },
  { skill: 'GNC Specialists', category: 'hardest_to_fill', openPositions: 980, avgSalary: 158000, timeToFill: '120 days', notes: 'Guidance, navigation, and control for autonomous systems' },
  { skill: 'Thermal/Structural Analysis', category: 'hardest_to_fill', openPositions: 1680, avgSalary: 142000, timeToFill: '110 days', notes: 'FEA expertise for extreme space environments' },

  // Emerging Needs
  { skill: 'AI/ML for Space Data', category: 'emerging', openPositions: 2980, avgSalary: 172000, timeToFill: '60 days', notes: 'Computer vision, anomaly detection, autonomous operations' },
  { skill: 'Space Cybersecurity', category: 'emerging', openPositions: 2650, avgSalary: 168000, timeToFill: '80 days', notes: 'Satellite link encryption, anti-jamming, space system hardening' },
  { skill: 'Space Law & Policy', category: 'emerging', openPositions: 580, avgSalary: 145000, timeToFill: '65 days', notes: 'ITU filing, spectrum rights, liability, Artemis Accords compliance' },
  { skill: 'Additive Manufacturing', category: 'emerging', openPositions: 890, avgSalary: 128000, timeToFill: '55 days', notes: 'Metal 3D printing for rocket engines and satellite structures' },
  { skill: 'Quantum Communications', category: 'emerging', openPositions: 180, avgSalary: 185000, timeToFill: '120 days', notes: 'QKD, entanglement-based secure links for space networks' },
];

// ────────────────────────────────────────
// Geographic Distribution
// ────────────────────────────────────────

export interface GeoHub {
  location: string;
  state: string;
  employees: number;
  topEmployers: string[];
  specializations: string[];
}

export const GEO_HUBS: GeoHub[] = [
  { location: 'Los Angeles / El Segundo', state: 'CA', employees: 45000, topEmployers: ['SpaceX', 'Northrop Grumman', 'Aerospace Corp', 'Rocket Lab'], specializations: ['Launch vehicles', 'National security space', 'Satellite manufacturing'] },
  { location: 'Washington DC / Northern Virginia', state: 'VA/DC', employees: 35000, topEmployers: ['Northrop Grumman', 'Raytheon', 'Spire Global', 'BlackSky'], specializations: ['Defense programs', 'Space policy', 'Intelligence community'] },
  { location: 'Denver / Colorado Springs', state: 'CO', employees: 30000, topEmployers: ['Lockheed Martin', 'ULA', 'Ball Aerospace', 'Sierra Space'], specializations: ['GPS', 'Missile warning', 'Space Command HQ'] },
  { location: 'Houston', state: 'TX', employees: 25000, topEmployers: ['NASA JSC', 'Boeing', 'Axiom Space', 'Intuitive Machines'], specializations: ['Human spaceflight', 'Mission control', 'Crew systems'] },
  { location: 'Huntsville', state: 'AL', employees: 20000, topEmployers: ['NASA MSFC', 'Blue Origin', 'Dynetics', 'Aerojet Rocketdyne'], specializations: ['Propulsion', 'SLS program', 'Missile defense'] },
  { location: 'Cape Canaveral / Melbourne', state: 'FL', employees: 18000, topEmployers: ['SpaceX', 'Blue Origin', 'L3Harris', 'ULA'], specializations: ['Launch operations', 'Range safety', 'Sensors'] },
  { location: 'Seattle', state: 'WA', employees: 12000, topEmployers: ['Blue Origin', 'SpaceX', 'Aerojet Rocketdyne', 'Amazon Kuiper'], specializations: ['Rocket engines', 'Satellite constellations', 'Space logistics'] },
  { location: 'Tucson', state: 'AZ', employees: 8000, topEmployers: ['Raytheon', 'University of Arizona', 'Paragon SDC', 'Honeywell'], specializations: ['Missile systems', 'Optics', 'Planetary science'] },
];

// ────────────────────────────────────────
// Diversity Metrics
// ────────────────────────────────────────

export interface DiversityMetric {
  category: string;
  percentage: number;
  trend: 'up' | 'flat' | 'down';
  detail: string;
  color: string;
}

export const DIVERSITY_METRICS: DiversityMetric[] = [
  { category: 'Women Overall', percentage: 24.0, trend: 'up', detail: 'Up from 20% in 2020; industry target is 30% by 2030', color: 'text-purple-400' },
  { category: 'Women in Engineering', percentage: 18.2, trend: 'up', detail: 'Growing fastest in software and data science roles', color: 'text-pink-400' },
  { category: 'Women in Leadership', percentage: 21.5, trend: 'up', detail: '+3.4% since 2022; VP+ level representation improving', color: 'text-fuchsia-400' },
  { category: 'Underrepresented Minorities', percentage: 28.3, trend: 'up', detail: '+1.8% since 2022; strongest in NewSpace companies', color: 'text-orange-400' },
  { category: 'Veterans', percentage: 22.1, trend: 'flat', detail: 'Concentrated in defense primes and government roles', color: 'text-emerald-400' },
  { category: 'Workers Under 35', percentage: 31.4, trend: 'up', detail: 'NewSpace companies skew younger; median age 34', color: 'text-cyan-400' },
];

export interface PipelineStat {
  field: string;
  annualGraduates: number;
  enteringSpace: number;
  demandGap: number;
  trend: 'up' | 'flat' | 'down';
}

export const STEM_PIPELINE: PipelineStat[] = [
  { field: 'Aerospace Engineering', annualGraduates: 6800, enteringSpace: 4200, demandGap: 1800, trend: 'up' },
  { field: 'Electrical / RF Engineering', annualGraduates: 42000, enteringSpace: 3100, demandGap: 2400, trend: 'up' },
  { field: 'Computer Science / Software', annualGraduates: 98000, enteringSpace: 5800, demandGap: 3200, trend: 'up' },
  { field: 'Data Science / AI-ML', annualGraduates: 28000, enteringSpace: 2400, demandGap: 1900, trend: 'up' },
  { field: 'Cybersecurity', annualGraduates: 18000, enteringSpace: 1200, demandGap: 2100, trend: 'up' },
  { field: 'Physics / Astrophysics', annualGraduates: 9200, enteringSpace: 2100, demandGap: 650, trend: 'flat' },
  { field: 'Materials Science', annualGraduates: 5400, enteringSpace: 680, demandGap: 420, trend: 'flat' },
  { field: 'Mechanical Engineering', annualGraduates: 35000, enteringSpace: 2900, demandGap: 1100, trend: 'flat' },
];

// ────────────────────────────────────────
// Filter Options
// ────────────────────────────────────────

export const SECTOR_FILTER_OPTIONS = [
  { value: '', label: 'All Sectors' },
  { value: 'Defense / Intelligence', label: 'Defense / Intelligence' },
  { value: 'Commercial Satellite', label: 'Commercial Satellite' },
  { value: 'NASA / Government Civil', label: 'NASA / Government Civil' },
  { value: 'NewSpace Startups', label: 'NewSpace Startups' },
  { value: 'Launch Providers', label: 'Launch Providers' },
  { value: 'Space Manufacturing', label: 'Space Manufacturing' },
  { value: 'Earth Observation', label: 'Earth Observation' },
  { value: 'Academic / Research', label: 'Academic / Research' },
];

export const LOCATION_FILTER_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'CA', label: 'California' },
  { value: 'VA/DC', label: 'Washington DC / Virginia' },
  { value: 'CO', label: 'Colorado' },
  { value: 'TX', label: 'Texas' },
  { value: 'AL', label: 'Alabama' },
  { value: 'FL', label: 'Florida' },
  { value: 'WA', label: 'Washington' },
  { value: 'AZ', label: 'Arizona' },
];

export const SIZE_FILTER_OPTIONS = [
  { value: '', label: 'All Sizes' },
  { value: 'large', label: '10,000+ employees' },
  { value: 'medium', label: '1,000-9,999 employees' },
  { value: 'small', label: 'Under 1,000 employees' },
];

export const SORT_OPTIONS = [
  { value: 'headcount_desc', label: 'Workforce Size (High to Low)' },
  { value: 'headcount_asc', label: 'Workforce Size (Low to High)' },
  { value: 'company_asc', label: 'Company Name (A-Z)' },
  { value: 'company_desc', label: 'Company Name (Z-A)' },
];
