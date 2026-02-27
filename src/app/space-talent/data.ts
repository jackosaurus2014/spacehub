// ────────────────────────────────────────
// Static Data for Space Talent page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

import { JobCategory, SeniorityLevel } from '@/types';

// ────────────────────────────────────────
// Constants (Workforce)
// ────────────────────────────────────────

export const CATEGORY_COLORS: Record<JobCategory, { text: string; bg: string }> = {
  engineering: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  operations: { text: 'text-green-400', bg: 'bg-green-500/20' },
  business: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  research: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  legal: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
  manufacturing: { text: 'text-red-400', bg: 'bg-red-500/20' },
};

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};

export const JOB_EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'category', label: 'Category' },
  { key: 'seniorityLevel', label: 'Seniority Level' },
  { key: 'salaryMin', label: 'Salary Min' },
  { key: 'salaryMax', label: 'Salary Max' },
  { key: 'remoteOk', label: 'Remote OK' },
  { key: 'clearanceRequired', label: 'Clearance Required' },
  { key: 'postedDate', label: 'Posted Date' },
  { key: 'sourceUrl', label: 'Source URL' },
];

export const TREND_EXPORT_COLUMNS = [
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'totalOpenings', label: 'Total Openings' },
  { key: 'totalHires', label: 'Total Hires' },
  { key: 'avgSalary', label: 'Avg Salary' },
  { key: 'medianSalary', label: 'Median Salary' },
  { key: 'yoyGrowth', label: 'YoY Growth' },
  { key: 'engineeringOpenings', label: 'Engineering Openings' },
  { key: 'operationsOpenings', label: 'Operations Openings' },
  { key: 'businessOpenings', label: 'Business Openings' },
  { key: 'researchOpenings', label: 'Research Openings' },
];

// ────────────────────────────────────────
// Workforce Intelligence Data
// ────────────────────────────────────────

export interface SectorEmployment {
  sector: string;
  employees: number;
  growthRate: number;
  color: string;
}

export const SECTOR_EMPLOYMENT_DATA: SectorEmployment[] = [
  { sector: 'Launch Services', employees: 38500, growthRate: 12.4, color: 'bg-blue-500' },
  { sector: 'Satellite Manufacturing', employees: 52200, growthRate: 8.7, color: 'bg-cyan-500' },
  { sector: 'Ground Systems & Operations', employees: 44100, growthRate: 6.2, color: 'bg-green-500' },
  { sector: 'Space Science & Exploration', employees: 28900, growthRate: 9.1, color: 'bg-purple-500' },
  { sector: 'National Security Space', employees: 67800, growthRate: 11.3, color: 'bg-red-500' },
  { sector: 'Commercial Space Stations', employees: 8400, growthRate: 34.2, color: 'bg-orange-500' },
  { sector: 'Space Data & Analytics', employees: 31600, growthRate: 18.5, color: 'bg-yellow-500' },
  { sector: 'In-Space Transportation', employees: 12300, growthRate: 22.8, color: 'bg-pink-500' },
  { sector: 'Satellite Communications', employees: 61400, growthRate: 7.9, color: 'bg-indigo-500' },
  { sector: 'Earth Observation & Remote Sensing', employees: 29800, growthRate: 14.6, color: 'bg-teal-500' },
];

export interface SkillDemand {
  skill: string;
  demandLevel: 'critical' | 'high' | 'growing' | 'steady';
  openRoles: number;
  avgSalary: number;
  yoyChange: number;
  category: string;
}

export const SKILLS_DEMAND_DATA: SkillDemand[] = [
  { skill: 'Systems Engineering', demandLevel: 'critical', openRoles: 4200, avgSalary: 155000, yoyChange: 11.2, category: 'Engineering' },
  { skill: 'RF Engineering', demandLevel: 'critical', openRoles: 2840, avgSalary: 145000, yoyChange: 24.3, category: 'Engineering' },
  { skill: 'Propulsion Engineering', demandLevel: 'critical', openRoles: 1890, avgSalary: 152000, yoyChange: 16.5, category: 'Engineering' },
  { skill: 'Software Development (C++, Python, MATLAB)', demandLevel: 'critical', openRoles: 3100, avgSalary: 162000, yoyChange: 22.1, category: 'Engineering' },
  { skill: 'GNC (Guidance, Navigation, Control)', demandLevel: 'critical', openRoles: 2120, avgSalary: 158000, yoyChange: 19.7, category: 'Engineering' },
  { skill: 'Satellite Operations', demandLevel: 'high', openRoles: 1850, avgSalary: 132000, yoyChange: 9.3, category: 'Operations' },
  { skill: 'Ground Systems', demandLevel: 'high', openRoles: 1620, avgSalary: 138000, yoyChange: 12.8, category: 'Operations' },
  { skill: 'MBSE (Model-Based Systems Engineering)', demandLevel: 'high', openRoles: 1740, avgSalary: 151000, yoyChange: 27.6, category: 'Engineering' },
  { skill: 'Thermal Analysis', demandLevel: 'high', openRoles: 1680, avgSalary: 138000, yoyChange: 13.4, category: 'Engineering' },
  { skill: 'Structural Analysis', demandLevel: 'high', openRoles: 1320, avgSalary: 142000, yoyChange: 10.6, category: 'Engineering' },
  { skill: 'Space Policy & Regulatory Affairs', demandLevel: 'growing', openRoles: 580, avgSalary: 145000, yoyChange: 17.8, category: 'Regulatory' },
  { skill: 'Data Science & Machine Learning', demandLevel: 'critical', openRoles: 2980, avgSalary: 172000, yoyChange: 38.5, category: 'IT/Security' },
  { skill: 'Cybersecurity (Space Systems)', demandLevel: 'critical', openRoles: 2650, avgSalary: 168000, yoyChange: 31.2, category: 'IT/Security' },
  { skill: 'Supply Chain Management', demandLevel: 'growing', openRoles: 1150, avgSalary: 126000, yoyChange: 18.4, category: 'Business' },
  { skill: 'Project Management (Aerospace)', demandLevel: 'high', openRoles: 2340, avgSalary: 144000, yoyChange: 9.8, category: 'Business' },
  { skill: 'Additive Manufacturing', demandLevel: 'growing', openRoles: 890, avgSalary: 128000, yoyChange: 25.3, category: 'Manufacturing' },
  { skill: 'Cloud Infrastructure (AWS/Azure GovCloud)', demandLevel: 'high', openRoles: 3400, avgSalary: 156000, yoyChange: 15.7, category: 'IT/Security' },
  { skill: 'Space Situational Awareness', demandLevel: 'growing', openRoles: 980, avgSalary: 140000, yoyChange: 28.9, category: 'Operations' },
  { skill: 'Orbital Mechanics', demandLevel: 'high', openRoles: 1450, avgSalary: 148000, yoyChange: 14.8, category: 'Engineering' },
  { skill: 'Space Business Development', demandLevel: 'high', openRoles: 2100, avgSalary: 148000, yoyChange: 12.6, category: 'Business' },
  { skill: 'Power Systems (Solar/Battery)', demandLevel: 'high', openRoles: 1560, avgSalary: 141000, yoyChange: 14.1, category: 'Engineering' },
  { skill: 'Spectrum Management', demandLevel: 'growing', openRoles: 720, avgSalary: 135000, yoyChange: 21.4, category: 'Regulatory' },
];

export interface GeoDistribution {
  location: string;
  type: 'state' | 'country';
  jobs: number;
  companies: number;
  avgSalary: number;
  topEmployers: string[];
}

export const GEO_DISTRIBUTION_US: GeoDistribution[] = [
  { location: 'Colorado', type: 'state', jobs: 14200, companies: 285, avgSalary: 142000, topEmployers: ['Lockheed Martin', 'United Launch Alliance', 'Ball Aerospace'] },
  { location: 'California', type: 'state', jobs: 18500, companies: 410, avgSalary: 165000, topEmployers: ['SpaceX', 'JPL/NASA', 'Northrop Grumman'] },
  { location: 'Texas', type: 'state', jobs: 11800, companies: 195, avgSalary: 138000, topEmployers: ['SpaceX', 'Intuitive Machines', 'L3Harris'] },
  { location: 'Florida', type: 'state', jobs: 13400, companies: 220, avgSalary: 135000, topEmployers: ['SpaceX', 'Blue Origin', 'Boeing'] },
  { location: 'Virginia', type: 'state', jobs: 9800, companies: 175, avgSalary: 152000, topEmployers: ['Northrop Grumman', 'Rocket Lab', 'HawkEye 360'] },
  { location: 'Alabama', type: 'state', jobs: 7200, companies: 95, avgSalary: 128000, topEmployers: ['NASA MSFC', 'Blue Origin', 'Dynetics'] },
  { location: 'Maryland', type: 'state', jobs: 8100, companies: 140, avgSalary: 155000, topEmployers: ['NASA GSFC', 'Johns Hopkins APL', 'Parsons'] },
  { location: 'Washington', type: 'state', jobs: 6900, companies: 120, avgSalary: 160000, topEmployers: ['Blue Origin', 'SpaceX', 'Aerojet Rocketdyne'] },
  { location: 'Arizona', type: 'state', jobs: 4500, companies: 85, avgSalary: 136000, topEmployers: ['Raytheon', 'Honeywell', 'General Dynamics'] },
  { location: 'New Mexico', type: 'state', jobs: 3200, companies: 48, avgSalary: 132000, topEmployers: ['Sandia Labs', 'Virgin Galactic', 'SpinLaunch'] },
];

export const GEO_DISTRIBUTION_INTL: GeoDistribution[] = [
  { location: 'United Kingdom', type: 'country', jobs: 8200, companies: 145, avgSalary: 95000, topEmployers: ['Airbus Defence', 'Surrey Satellite', 'OneWeb'] },
  { location: 'Germany', type: 'country', jobs: 6400, companies: 110, avgSalary: 92000, topEmployers: ['OHB', 'Airbus Defence', 'Isar Aerospace'] },
  { location: 'France', type: 'country', jobs: 7100, companies: 95, avgSalary: 88000, topEmployers: ['Arianespace', 'Thales Alenia', 'ArianeGroup'] },
  { location: 'Japan', type: 'country', jobs: 5800, companies: 78, avgSalary: 82000, topEmployers: ['JAXA', 'Mitsubishi Heavy', 'ispace'] },
  { location: 'India', type: 'country', jobs: 9500, companies: 130, avgSalary: 45000, topEmployers: ['ISRO', 'Skyroot', 'Pixxel'] },
  { location: 'Canada', type: 'country', jobs: 4100, companies: 85, avgSalary: 98000, topEmployers: ['MDA', 'Telesat', 'Kepler Communications'] },
  { location: 'Australia', type: 'country', jobs: 2800, companies: 62, avgSalary: 90000, topEmployers: ['Fleet Space', 'Gilmour Space', 'Electro Optic Systems'] },
  { location: 'Israel', type: 'country', jobs: 3400, companies: 55, avgSalary: 105000, topEmployers: ['IAI', 'Elbit Systems', 'NSLComm'] },
];

export interface RoleSalaryRange {
  role: string;
  category: string;
  entryMin: number;
  entryMax: number;
  midMin: number;
  midMax: number;
  seniorMin: number;
  seniorMax: number;
  leadMin: number;
  leadMax: number;
}

export const ROLE_SALARY_DATA: RoleSalaryRange[] = [
  { role: 'Propulsion Engineer', category: 'Engineering', entryMin: 85000, entryMax: 105000, midMin: 110000, midMax: 140000, seniorMin: 145000, seniorMax: 185000, leadMin: 180000, leadMax: 230000 },
  { role: 'GN&C Engineer', category: 'Engineering', entryMin: 88000, entryMax: 108000, midMin: 115000, midMax: 148000, seniorMin: 150000, seniorMax: 195000, leadMin: 190000, leadMax: 245000 },
  { role: 'RF / Antenna Engineer', category: 'Engineering', entryMin: 82000, entryMax: 100000, midMin: 105000, midMax: 138000, seniorMin: 140000, seniorMax: 180000, leadMin: 175000, leadMax: 225000 },
  { role: 'Systems Engineer', category: 'Engineering', entryMin: 80000, entryMax: 100000, midMin: 108000, midMax: 140000, seniorMin: 142000, seniorMax: 185000, leadMin: 180000, leadMax: 240000 },
  { role: 'Flight Software Engineer', category: 'Engineering', entryMin: 90000, entryMax: 115000, midMin: 120000, midMax: 155000, seniorMin: 155000, seniorMax: 200000, leadMin: 195000, leadMax: 255000 },
  { role: 'Thermal Engineer', category: 'Engineering', entryMin: 78000, entryMax: 95000, midMin: 100000, midMax: 130000, seniorMin: 135000, seniorMax: 170000, leadMin: 168000, leadMax: 215000 },
  { role: 'Mission Operations Analyst', category: 'Operations', entryMin: 72000, entryMax: 90000, midMin: 95000, midMax: 125000, seniorMin: 128000, seniorMax: 165000, leadMin: 160000, leadMax: 205000 },
  { role: 'Satellite Ground Systems Engineer', category: 'Operations', entryMin: 80000, entryMax: 100000, midMin: 105000, midMax: 135000, seniorMin: 138000, seniorMax: 175000, leadMin: 172000, leadMax: 220000 },
  { role: 'Space Data Scientist', category: 'Research', entryMin: 85000, entryMax: 110000, midMin: 115000, midMax: 150000, seniorMin: 152000, seniorMax: 195000, leadMin: 190000, leadMax: 250000 },
  { role: 'Space Cybersecurity Analyst', category: 'IT/Security', entryMin: 88000, entryMax: 112000, midMin: 118000, midMax: 155000, seniorMin: 158000, seniorMax: 205000, leadMin: 200000, leadMax: 265000 },
  { role: 'Space Policy / Regulatory Analyst', category: 'Legal/Policy', entryMin: 70000, entryMax: 88000, midMin: 92000, midMax: 125000, seniorMin: 130000, seniorMax: 170000, leadMin: 168000, leadMax: 220000 },
  { role: 'Business Development Manager', category: 'Business', entryMin: 75000, entryMax: 95000, midMin: 100000, midMax: 140000, seniorMin: 142000, seniorMax: 185000, leadMin: 180000, leadMax: 250000 },
];

export interface EducationPipelineStat {
  field: string;
  annualGraduates: number;
  enteringSpace: number;
  enteringSpacePct: number;
  demandGap: number;
  trend: 'up' | 'flat' | 'down';
}

export const EDUCATION_PIPELINE_DATA: EducationPipelineStat[] = [
  { field: 'Aerospace Engineering', annualGraduates: 6800, enteringSpace: 4200, enteringSpacePct: 61.8, demandGap: 1800, trend: 'up' },
  { field: 'Electrical / RF Engineering', annualGraduates: 42000, enteringSpace: 3100, enteringSpacePct: 7.4, demandGap: 2400, trend: 'up' },
  { field: 'Computer Science / Software Engineering', annualGraduates: 98000, enteringSpace: 5800, enteringSpacePct: 5.9, demandGap: 3200, trend: 'up' },
  { field: 'Mechanical Engineering', annualGraduates: 35000, enteringSpace: 2900, enteringSpacePct: 8.3, demandGap: 1100, trend: 'flat' },
  { field: 'Physics / Astrophysics', annualGraduates: 9200, enteringSpace: 2100, enteringSpacePct: 22.8, demandGap: 650, trend: 'up' },
  { field: 'Data Science / AI-ML', annualGraduates: 28000, enteringSpace: 2400, enteringSpacePct: 8.6, demandGap: 1900, trend: 'up' },
  { field: 'Cybersecurity', annualGraduates: 18000, enteringSpace: 1200, enteringSpacePct: 6.7, demandGap: 2100, trend: 'up' },
  { field: 'Materials Science', annualGraduates: 5400, enteringSpace: 680, enteringSpacePct: 12.6, demandGap: 420, trend: 'flat' },
];

// ────────────────────────────────────────
// Top Employers Data
// ────────────────────────────────────────

export interface TopEmployer {
  company: string;
  headcount: number;
  segment: string;
  hqLocation: string;
  recentGrowth: number;
  keyPrograms: string[];
  tier: 'prime' | 'major' | 'growth';
}

export const TOP_EMPLOYERS_DATA: TopEmployer[] = [
  { company: 'Lockheed Martin', headcount: 116000, segment: 'Space & Defense', hqLocation: 'Bethesda, MD', recentGrowth: 3.2, keyPrograms: ['Orion', 'GPS III', 'SBIRS', 'Lunar Gateway'], tier: 'prime' },
  { company: 'Northrop Grumman', headcount: 36000, segment: 'Space Segment', hqLocation: 'Falls Church, VA', recentGrowth: 5.8, keyPrograms: ['James Webb', 'Cygnus', 'GBSD', 'HALO'], tier: 'prime' },
  { company: 'Boeing', headcount: 14000, segment: 'Space & Launch', hqLocation: 'Arlington, VA', recentGrowth: -2.1, keyPrograms: ['Starliner', 'SLS', 'WGS', 'ISS Support'], tier: 'prime' },
  { company: 'SpaceX', headcount: 13000, segment: 'Launch & Satellites', hqLocation: 'Hawthorne, CA', recentGrowth: 18.5, keyPrograms: ['Starship', 'Falcon 9', 'Starlink', 'Dragon'], tier: 'major' },
  { company: 'Blue Origin', headcount: 11000, segment: 'Launch & Lunar', hqLocation: 'Kent, WA', recentGrowth: 22.4, keyPrograms: ['New Glenn', 'Blue Moon', 'Orbital Reef', 'New Shepard'], tier: 'major' },
  { company: 'Raytheon / RTX', headcount: 8000, segment: 'Space & Sensors', hqLocation: 'Arlington, VA', recentGrowth: 4.1, keyPrograms: ['OPIR', 'GPS OCX', 'Space Fence', 'Missile Warning'], tier: 'prime' },
  { company: 'L3Harris', headcount: 8000, segment: 'Space & Airborne', hqLocation: 'Melbourne, FL', recentGrowth: 6.7, keyPrograms: ['Weather Satellites', 'Missile Defense', 'Responsive Space', 'EO/IR'], tier: 'prime' },
  { company: 'Ball Aerospace', headcount: 5600, segment: 'Spacecraft & Instruments', hqLocation: 'Boulder, CO', recentGrowth: 8.3, keyPrograms: ['JWST Mirrors', 'IXPE', 'WorldView', 'Green Propellant'], tier: 'major' },
  { company: 'Rocket Lab', headcount: 1800, segment: 'Launch & Spacecraft', hqLocation: 'Long Beach, CA', recentGrowth: 32.1, keyPrograms: ['Electron', 'Neutron', 'Photon', 'HASTE'], tier: 'growth' },
  { company: 'Planet Labs', headcount: 800, segment: 'Earth Observation', hqLocation: 'San Francisco, CA', recentGrowth: 12.6, keyPrograms: ['PlanetScope', 'SkySat', 'Pelican', 'Hyperspectral'], tier: 'growth' },
];

// ────────────────────────────────────────
// Workforce Overview Stats
// ────────────────────────────────────────

export interface WorkforceOverviewStat {
  label: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
}

export const WORKFORCE_OVERVIEW_STATS: WorkforceOverviewStat[] = [
  { label: 'Total US Space Workforce', value: '~360,000', detail: 'Across government, commercial, and defense sectors', icon: 'users', color: 'text-cyan-400' },
  { label: 'Average Salary', value: '$108,000', detail: 'Median base compensation for full-time positions', icon: 'dollar', color: 'text-green-400' },
  { label: 'Gender Diversity', value: '~24% Women', detail: 'Improving year-over-year, up from 20% in 2020', icon: 'diversity', color: 'text-purple-400' },
  { label: 'Average Age', value: '42 Years', detail: 'With 31% of workforce nearing retirement within 10 years', icon: 'age', color: 'text-orange-400' },
  { label: 'Projected Growth', value: '6% / Year', detail: 'Through 2030, driven by commercial space expansion', icon: 'growth', color: 'text-emerald-400' },
];

export interface DiversityBreakdown {
  category: string;
  percentage: number;
  trend: 'up' | 'flat' | 'down';
  note: string;
}

export const DIVERSITY_DATA: DiversityBreakdown[] = [
  { category: 'Women in Engineering Roles', percentage: 18.2, trend: 'up', note: '+2.1% since 2022' },
  { category: 'Women in Leadership', percentage: 21.5, trend: 'up', note: '+3.4% since 2022' },
  { category: 'Women Overall', percentage: 24.0, trend: 'up', note: 'Up from 20% in 2020' },
  { category: 'Underrepresented Minorities', percentage: 28.3, trend: 'up', note: '+1.8% since 2022' },
  { category: 'Veterans', percentage: 22.1, trend: 'flat', note: 'Stable across defense primes' },
  { category: 'Workers Under 35', percentage: 31.4, trend: 'up', note: 'New Space companies skew younger' },
  { category: 'Workers Over 55', percentage: 19.8, trend: 'down', note: 'Retirement wave accelerating' },
];

export interface AgeDistribution {
  range: string;
  percentage: number;
  color: string;
}

export const AGE_DISTRIBUTION_DATA: AgeDistribution[] = [
  { range: 'Under 25', percentage: 8.2, color: 'bg-cyan-500' },
  { range: '25-34', percentage: 23.2, color: 'bg-blue-500' },
  { range: '35-44', percentage: 28.8, color: 'bg-indigo-500' },
  { range: '45-54', percentage: 20.0, color: 'bg-purple-500' },
  { range: '55-64', percentage: 15.3, color: 'bg-orange-500' },
  { range: '65+', percentage: 4.5, color: 'bg-red-500' },
];

