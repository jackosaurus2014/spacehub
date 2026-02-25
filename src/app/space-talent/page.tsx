'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SpaceTalent,
  Webinar,
  TALENT_EXPERTISE_AREAS,
  TALENT_AVAILABILITY_INFO,
  WEBINAR_TOPICS,
  TalentExpertiseArea,
  TalentAvailability,
  SpaceJobPosting,
  WorkforceTrend,
  JobCategory,
  SeniorityLevel,
  JOB_CATEGORIES,
  SENIORITY_LEVELS,
} from '@/types';
import TalentCard from '@/components/talent/TalentCard';
import WebinarCard from '@/components/webinars/WebinarCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import AdSlot from '@/components/ads/AdSlot';
import PullToRefresh from '@/components/ui/PullToRefresh';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { clientLogger } from '@/lib/client-logger';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TopLevelTab = 'talent' | 'workforce';

interface ServiceProviderFormData {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  pricing: string;
}

const INITIAL_FORM_DATA: ServiceProviderFormData = {
  businessName: '',
  contactName: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  pricing: '',
};

interface TalentStats {
  totalExperts: number;
  featuredCount: number;
  availableCount: number;
  avgConsultingRate: number;
}

interface WebinarStats {
  totalWebinars: number;
  liveCount: number;
  upcomingCount: number;
  pastCount: number;
  recordingsAvailable: number;
}

interface SalaryBenchmarkEntry {
  category?: JobCategory;
  seniorityLevel?: SeniorityLevel;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
}

interface WorkforceStats {
  totalOpenings: number;
  avgSalary: number;
  topCategory: string;
  topCompany: string;
  totalCompanies: number;
  growthRate: number;
}

// ────────────────────────────────────────
// Constants (Workforce)
// ────────────────────────────────────────

const CATEGORY_COLORS: Record<JobCategory, { text: string; bg: string }> = {
  engineering: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  operations: { text: 'text-green-400', bg: 'bg-green-500/20' },
  business: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  research: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  legal: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
  manufacturing: { text: 'text-red-400', bg: 'bg-red-500/20' },
};

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};

const JOB_EXPORT_COLUMNS = [
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

const TREND_EXPORT_COLUMNS = [
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

interface SectorEmployment {
  sector: string;
  employees: number;
  growthRate: number;
  color: string;
}

const SECTOR_EMPLOYMENT_DATA: SectorEmployment[] = [
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

interface SkillDemand {
  skill: string;
  demandLevel: 'critical' | 'high' | 'growing' | 'steady';
  openRoles: number;
  avgSalary: number;
  yoyChange: number;
  category: string;
}

const SKILLS_DEMAND_DATA: SkillDemand[] = [
  { skill: 'RF Engineering', demandLevel: 'critical', openRoles: 2840, avgSalary: 145000, yoyChange: 24.3, category: 'Engineering' },
  { skill: 'GN&C (Guidance, Navigation & Control)', demandLevel: 'critical', openRoles: 2120, avgSalary: 158000, yoyChange: 19.7, category: 'Engineering' },
  { skill: 'Propulsion Systems', demandLevel: 'critical', openRoles: 1890, avgSalary: 152000, yoyChange: 16.5, category: 'Engineering' },
  { skill: 'Embedded Systems / Flight Software', demandLevel: 'critical', openRoles: 3100, avgSalary: 162000, yoyChange: 22.1, category: 'Engineering' },
  { skill: 'Orbital Mechanics', demandLevel: 'high', openRoles: 1450, avgSalary: 148000, yoyChange: 14.8, category: 'Engineering' },
  { skill: 'Systems Engineering', demandLevel: 'high', openRoles: 4200, avgSalary: 155000, yoyChange: 11.2, category: 'Engineering' },
  { skill: 'Thermal Analysis & Design', demandLevel: 'high', openRoles: 1680, avgSalary: 138000, yoyChange: 13.4, category: 'Engineering' },
  { skill: 'Spacecraft Structures', demandLevel: 'high', openRoles: 1320, avgSalary: 142000, yoyChange: 10.6, category: 'Engineering' },
  { skill: 'Space Cybersecurity', demandLevel: 'critical', openRoles: 2650, avgSalary: 168000, yoyChange: 31.2, category: 'IT/Security' },
  { skill: 'AI/ML for Space Applications', demandLevel: 'critical', openRoles: 2980, avgSalary: 172000, yoyChange: 38.5, category: 'IT/Security' },
  { skill: 'Cloud Infrastructure (AWS/Azure GovCloud)', demandLevel: 'high', openRoles: 3400, avgSalary: 156000, yoyChange: 15.7, category: 'IT/Security' },
  { skill: 'Space Situational Awareness', demandLevel: 'growing', openRoles: 980, avgSalary: 140000, yoyChange: 28.9, category: 'Operations' },
  { skill: 'Mission Operations', demandLevel: 'high', openRoles: 1850, avgSalary: 132000, yoyChange: 9.3, category: 'Operations' },
  { skill: 'Spectrum Management', demandLevel: 'growing', openRoles: 720, avgSalary: 135000, yoyChange: 21.4, category: 'Regulatory' },
  { skill: 'Space Law & Policy', demandLevel: 'growing', openRoles: 580, avgSalary: 145000, yoyChange: 17.8, category: 'Regulatory' },
  { skill: 'Space Business Development', demandLevel: 'high', openRoles: 2100, avgSalary: 148000, yoyChange: 12.6, category: 'Business' },
  { skill: 'Additive Manufacturing', demandLevel: 'growing', openRoles: 890, avgSalary: 128000, yoyChange: 25.3, category: 'Manufacturing' },
  { skill: 'Power Systems (Solar/Battery)', demandLevel: 'high', openRoles: 1560, avgSalary: 141000, yoyChange: 14.1, category: 'Engineering' },
];

interface GeoDistribution {
  location: string;
  type: 'state' | 'country';
  jobs: number;
  companies: number;
  avgSalary: number;
  topEmployers: string[];
}

const GEO_DISTRIBUTION_US: GeoDistribution[] = [
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

const GEO_DISTRIBUTION_INTL: GeoDistribution[] = [
  { location: 'United Kingdom', type: 'country', jobs: 8200, companies: 145, avgSalary: 95000, topEmployers: ['Airbus Defence', 'Surrey Satellite', 'OneWeb'] },
  { location: 'Germany', type: 'country', jobs: 6400, companies: 110, avgSalary: 92000, topEmployers: ['OHB', 'Airbus Defence', 'Isar Aerospace'] },
  { location: 'France', type: 'country', jobs: 7100, companies: 95, avgSalary: 88000, topEmployers: ['Arianespace', 'Thales Alenia', 'ArianeGroup'] },
  { location: 'Japan', type: 'country', jobs: 5800, companies: 78, avgSalary: 82000, topEmployers: ['JAXA', 'Mitsubishi Heavy', 'ispace'] },
  { location: 'India', type: 'country', jobs: 9500, companies: 130, avgSalary: 45000, topEmployers: ['ISRO', 'Skyroot', 'Pixxel'] },
  { location: 'Canada', type: 'country', jobs: 4100, companies: 85, avgSalary: 98000, topEmployers: ['MDA', 'Telesat', 'Kepler Communications'] },
  { location: 'Australia', type: 'country', jobs: 2800, companies: 62, avgSalary: 90000, topEmployers: ['Fleet Space', 'Gilmour Space', 'Electro Optic Systems'] },
  { location: 'Israel', type: 'country', jobs: 3400, companies: 55, avgSalary: 105000, topEmployers: ['IAI', 'Elbit Systems', 'NSLComm'] },
];

interface RoleSalaryRange {
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

const ROLE_SALARY_DATA: RoleSalaryRange[] = [
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

interface EducationPipelineStat {
  field: string;
  annualGraduates: number;
  enteringSpace: number;
  enteringSpacePct: number;
  demandGap: number;
  trend: 'up' | 'flat' | 'down';
}

const EDUCATION_PIPELINE_DATA: EducationPipelineStat[] = [
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
// Utility Functions
// ────────────────────────────────────────

function formatSalary(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}K`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysAgo(date: Date): string {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

// ────────────────────────────────────────
// Job Posting Card
// ────────────────────────────────────────

function JobCard({ job }: { job: SpaceJobPosting }) {
  const cat = CATEGORY_COLORS[job.category as JobCategory];
  const catLabel = JOB_CATEGORIES.find((c) => c.value === job.category);
  const senLabel = SENIORITY_LABELS[job.seniorityLevel as SeniorityLevel] || job.seniorityLevel;

  const inner = (
    <div className="card p-5 hover:border-nebula-500/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base group-hover:text-nebula-200 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-400 text-sm">{job.company}</p>
            <Link
              href={`/market-intel?search=${encodeURIComponent(job.company)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              Market Intel
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {job.remoteOk && (
            <span className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-0.5 rounded">
              Remote
            </span>
          )}
          {job.clearanceRequired && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
              Clearance
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <span className="text-slate-400">{job.location}</span>
        <span className="text-slate-300">|</span>
        <span className={`px-2 py-0.5 rounded ${cat?.bg || 'bg-slate-700/50'} ${cat?.text || 'text-slate-500'}`}>
          {catLabel?.icon} {catLabel?.label || job.category}
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-400">{senLabel}</span>
        {job.degreeRequired && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 capitalize">{job.degreeRequired}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-nebula-300">
            {formatSalary(job.salaryMin ?? 0)} - {formatSalary(job.salaryMax ?? 0)}
          </span>
          {job.yearsExperience !== null && job.yearsExperience !== undefined && (
            <span className="text-xs text-slate-400">
              {job.yearsExperience === 0 ? 'No exp required' : `${job.yearsExperience}+ years`}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{daysAgo(job.postedDate)}</span>
      </div>
    </div>
  );

  if (job.sourceUrl) {
    return (
      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

// ────────────────────────────────────────
// Trend Card
// ────────────────────────────────────────

function TrendCard({ trend }: { trend: WorkforceTrend }) {
  const yoyGrowth = trend.yoyGrowth ?? 0;
  const isPositive = yoyGrowth >= 0;
  const topSkills: string[] = (() => {
    try {
      const raw = trend.topSkills;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  })();
  const topCompanies: string[] = (() => {
    try {
      const raw = trend.topCompanies;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-base">
          Q{trend.quarter} {trend.year}
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded ${
            isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isPositive ? '+' : ''}{yoyGrowth.toFixed(1)}% YoY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-1">Total Openings</span>
          <div className="text-white font-bold text-lg">{trend.totalOpenings.toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Total Hires</span>
          <div className="text-white font-bold text-lg">{(trend.totalHires ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Avg Salary</span>
          <div className="text-green-400 font-bold text-lg">{formatSalary(trend.avgSalary ?? 0)}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Median Salary</span>
          <div className="text-nebula-300 font-bold text-lg">{formatSalary(trend.medianSalary ?? 0)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="border-t border-slate-700/50 pt-3 mb-3">
        <span className="text-slate-400 text-xs block mb-2">Openings by Category</span>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-sm text-blue-400 font-bold">{trend.engineeringOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Eng</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-green-400 font-bold">{trend.operationsOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Ops</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-yellow-400 font-bold">{trend.businessOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Biz</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-purple-400 font-bold">{trend.researchOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">R&D</div>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3 mb-3">
          <span className="text-slate-400 text-xs block mb-2">Top Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span key={skill} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-500">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Companies */}
      {topCompanies.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3">
          <span className="text-slate-400 text-xs block mb-2">Top Hiring</span>
          <div className="flex flex-wrap gap-1.5">
            {topCompanies.map((company) => (
              <span key={company} className="text-xs px-2 py-0.5 rounded bg-nebula-500/10 text-nebula-300">
                {company}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Salary Benchmark Bar
// ────────────────────────────────────────

function BenchmarkBar({
  label,
  color,
  avgMin,
  avgMax,
  avgMedian,
  count,
  maxRange,
}: {
  label: string;
  color: string;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
  maxRange: number;
}) {
  const minPct = (avgMin / maxRange) * 100;
  const medianPct = (avgMedian / maxRange) * 100;
  const maxPct = (avgMax / maxRange) * 100;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-xs text-slate-400">{count} roles</span>
      </div>

      <div className="relative h-4 bg-slate-800/50 rounded-full overflow-hidden mb-2">
        <div
          className="absolute h-full bg-slate-700/50 rounded-full"
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        <div
          className="absolute h-full w-1 bg-nebula-400 rounded-full"
          style={{ left: `${medianPct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>{formatSalary(avgMin)}</span>
        <span className="text-nebula-300 font-medium">Median: {formatSalary(avgMedian)}</span>
        <span>{formatSalary(avgMax)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Sector Employment Section
// ────────────────────────────────────────

function SectorEmploymentSection() {
  const maxEmployees = Math.max(...SECTOR_EMPLOYMENT_DATA.map((s) => s.employees));
  const totalEmployees = SECTOR_EMPLOYMENT_DATA.reduce((sum, s) => sum + s.employees, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Industry Employment by Sector</h3>
        <span className="text-xs text-slate-400">{totalEmployees.toLocaleString()} total estimated workforce</span>
      </div>
      <div className="space-y-3">
        {SECTOR_EMPLOYMENT_DATA
          .sort((a, b) => b.employees - a.employees)
          .map((sector) => {
            const pct = (sector.employees / maxEmployees) * 100;
            return (
              <div key={sector.sector}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{sector.sector}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">{sector.employees.toLocaleString()}</span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        sector.growthRate >= 20
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : sector.growthRate >= 10
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      +{sector.growthRate}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sector.color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Estimated from Bureau of Labor Statistics, SIA, and Bryce Tech Space Workforce reports. Growth rates YoY.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Skills Demand Section
// ────────────────────────────────────────

function SkillsDemandSection() {
  const demandColors = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical Shortage' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High Demand' },
    growing: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Rapidly Growing' },
    steady: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Steady' },
  };

  const categories = Array.from(new Set(SKILLS_DEMAND_DATA.map((s) => s.category)));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Skills Demand Analysis</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Most in-demand skills across the space workforce, ranked by urgency and open role count.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(demandColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${val.bg} border ${val.border}`} />
            <span className="text-xs text-slate-400">{val.label}</span>
          </div>
        ))}
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-5 last:mb-0">
          <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">{cat}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILLS_DEMAND_DATA.filter((s) => s.category === cat)
              .sort((a, b) => b.openRoles - a.openRoles)
              .map((skill) => {
                const dc = demandColors[skill.demandLevel];
                return (
                  <div
                    key={skill.skill}
                    className={`p-3 rounded-lg border ${dc.border} ${dc.bg}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">{skill.skill}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dc.bg} ${dc.text} border ${dc.border}`}>
                        {dc.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Open Roles</span>
                        <span className="text-white font-bold">{skill.openRoles.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Avg Salary</span>
                        <span className="text-green-400 font-bold">{formatSalary(skill.avgSalary)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">YoY Growth</span>
                        <span className="text-emerald-400 font-bold">+{skill.yoyChange}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// Geographic Distribution Section
// ────────────────────────────────────────

function GeographicDistributionSection() {
  const [geoView, setGeoView] = useState<'us' | 'intl'>('us');
  const data = geoView === 'us' ? GEO_DISTRIBUTION_US : GEO_DISTRIBUTION_INTL;
  const maxJobs = Math.max(...data.map((d) => d.jobs));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Geographic Distribution of Space Jobs</h3>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setGeoView('us')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              geoView === 'us'
                ? 'bg-nebula-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            US States
          </button>
          <button
            onClick={() => setGeoView('intl')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              geoView === 'intl'
                ? 'bg-nebula-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            International
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pr-4">
                {geoView === 'us' ? 'State' : 'Country'}
              </th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Jobs</th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Companies</th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Avg Salary</th>
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pl-4 hidden lg:table-cell">Top Employers</th>
            </tr>
          </thead>
          <tbody>
            {data
              .sort((a, b) => b.jobs - a.jobs)
              .map((loc) => {
                const barPct = (loc.jobs / maxJobs) * 100;
                return (
                  <tr key={loc.location} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{loc.location}</span>
                      </div>
                      <div className="mt-1 h-1 bg-slate-800/50 rounded-full overflow-hidden w-24">
                        <div className="h-full bg-nebula-500 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                    <td className="text-right py-3 px-3 text-white font-medium">{loc.jobs.toLocaleString()}</td>
                    <td className="text-right py-3 px-3 text-slate-300">{loc.companies}</td>
                    <td className="text-right py-3 px-3 text-green-400 font-medium">{formatSalary(loc.avgSalary)}</td>
                    <td className="py-3 pl-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {loc.topEmployers.map((emp) => (
                          <span key={emp} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                            {emp}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Salary data in USD. International salaries converted at current exchange rates.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Salary by Role Category Section
// ────────────────────────────────────────

function SalaryByRoleSection() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Salary Ranges by Role</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Detailed compensation ranges across seniority levels for key space industry positions.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pr-4">Role</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Entry Level</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Mid Level</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Senior</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Lead / Principal</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_SALARY_DATA.map((role) => (
              <tr key={role.role} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 pr-4">
                  <div className="text-white font-medium">{role.role}</div>
                  <div className="text-xs text-slate-500">{role.category}</div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-slate-300 text-xs">
                    {formatSalary(role.entryMin)} - {formatSalary(role.entryMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-slate-200 text-xs">
                    {formatSalary(role.midMin)} - {formatSalary(role.midMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-green-400 text-xs font-medium">
                    {formatSalary(role.seniorMin)} - {formatSalary(role.seniorMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-emerald-400 text-xs font-medium">
                    {formatSalary(role.leadMin)} - {formatSalary(role.leadMax)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Ranges represent base compensation in USD. Total compensation with equity/bonuses may be 10-30% higher at senior+ levels.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Education Pipeline Section
// ────────────────────────────────────────

function EducationPipelineSection() {
  const totalGrads = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.annualGraduates, 0);
  const totalEntering = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.enteringSpace, 0);
  const totalGap = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.demandGap, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">STEM Education Pipeline</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Annual STEM graduates and the portion entering the space industry, along with estimated demand gaps.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{(totalGrads / 1000).toFixed(0)}K</div>
          <div className="text-xs text-slate-400">Relevant STEM Grads/yr</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-cyan-400">{(totalEntering / 1000).toFixed(1)}K</div>
          <div className="text-xs text-slate-400">Entering Space Sector</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{(totalGap / 1000).toFixed(1)}K</div>
          <div className="text-xs text-slate-400">Estimated Talent Gap</div>
        </div>
      </div>

      <div className="space-y-3">
        {EDUCATION_PIPELINE_DATA
          .sort((a, b) => b.demandGap - a.demandGap)
          .map((edu) => {
            const maxGrads = Math.max(...EDUCATION_PIPELINE_DATA.map((e) => e.annualGraduates));
            const gradBarPct = (edu.annualGraduates / maxGrads) * 100;
            const enterPct = (edu.enteringSpace / edu.annualGraduates) * 100;

            return (
              <div key={edu.field} className="bg-slate-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{edu.field}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        edu.trend === 'up' ? 'text-green-400' : edu.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {edu.trend === 'up' ? 'Trending Up' : edu.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                  <div>
                    <span className="text-slate-400 block">Annual Grads</span>
                    <span className="text-white font-bold">{edu.annualGraduates.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Entering Space</span>
                    <span className="text-cyan-400 font-bold">{edu.enteringSpace.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Conversion</span>
                    <span className="text-white font-bold">{edu.enteringSpacePct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Demand Gap</span>
                    <span className="text-red-400 font-bold">-{edu.demandGap.toLocaleString()}</span>
                  </div>
                </div>

                {/* Stacked bar showing graduates vs entering space */}
                <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden" style={{ width: `${gradBarPct}%` }}>
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${enterPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                  <span>{edu.enteringSpacePct}% of grads enter space</span>
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Estimated from NSF STEM data, AIAA workforce surveys, and industry hiring reports. &quot;Demand Gap&quot; reflects unfilled positions relative to pipeline.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Space Talent Hub Content (with URL state)
// ────────────────────────────────────────

function SpaceTalentHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read top-level tab from URL (?tab=talent or ?tab=workforce)
  const initialTopTab = (searchParams.get('tab') as TopLevelTab) || 'talent';
  const validTopTab: TopLevelTab = initialTopTab === 'workforce' ? 'workforce' : 'talent';
  const [topTab, setTopTab] = useState<TopLevelTab>(validTopTab);

  // ── URL sync helper ──
  const updateUrl = useCallback(
    (updates: Record<string, string | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          value === null ||
          value === '' ||
          value === false ||
          (key === 'tab' && value === 'talent')
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ════════════════════════════════════════
  // TALENT & EXPERTS STATE (from space-jobs)
  // ════════════════════════════════════════

  type TalentSubTab = 'experts' | 'webinars';
  const [talentSubTab, setTalentSubTab] = useState<TalentSubTab>('experts');

  // Service provider modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [spFormData, setSpFormData] = useState<ServiceProviderFormData>(INITIAL_FORM_DATA);
  const [spFormErrors, setSpFormErrors] = useState<Record<string, string>>({});
  const [spSubmitting, setSpSubmitting] = useState(false);
  const [spSubmitSuccess, setSpSubmitSuccess] = useState(false);

  // Talent state
  const [talent, setTalent] = useState<SpaceTalent[]>([]);
  const [talentStats, setTalentStats] = useState<TalentStats | null>(null);
  const [talentLoading, setTalentLoading] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState<TalentExpertiseArea | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<TalentAvailability | ''>('');
  const [talentSearch, setTalentSearch] = useState('');

  // Webinar state
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [webinarStats, setWebinarStats] = useState<WebinarStats | null>(null);
  const [webinarLoading, setWebinarLoading] = useState(false);
  const [webinarFilter, setWebinarFilter] = useState<'all' | 'live' | 'upcoming' | 'past'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('');

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════
  // WORKFORCE ANALYTICS STATE (from workforce)
  // ════════════════════════════════════════

  // Read initial workforce sub-values from URL
  const initialWfSubTab = (searchParams.get('wfTab') as 'jobs' | 'trends' | 'salaries' | 'insights') || 'jobs';
  const initialCategory = (searchParams.get('category') as JobCategory | '') || '';
  const initialSeniority = (searchParams.get('seniority') as SeniorityLevel | '') || '';
  const initialRemote = searchParams.get('remote') === 'true';
  const initialSearch = searchParams.get('search') || '';
  const initialSalaryView = (searchParams.get('salaryView') as 'category' | 'seniority') || 'category';

  const [wfSubTab, setWfSubTab] = useState<'jobs' | 'trends' | 'salaries' | 'insights'>(initialWfSubTab);

  // Jobs state
  const [jobs, setJobs] = useState<SpaceJobPosting[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsOffset, setJobsOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<JobCategory | ''>(initialCategory);
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityLevel | ''>(initialSeniority);
  const [remoteOnly, setRemoteOnly] = useState(initialRemote);

  // Trends state
  const [trends, setTrends] = useState<WorkforceTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  // Salary benchmarks state
  const [benchmarksByCategory, setBenchmarksByCategory] = useState<SalaryBenchmarkEntry[]>([]);
  const [benchmarksBySeniority, setBenchmarksBySeniority] = useState<SalaryBenchmarkEntry[]>([]);
  const [salaryView, setSalaryView] = useState<'category' | 'seniority'>(initialSalaryView);
  const [salariesLoading, setSalariesLoading] = useState(true);

  // Stats
  const [wfStats, setWfStats] = useState<WorkforceStats | null>(null);

  const JOBS_PER_PAGE = 15;

  // ════════════════════════════════════════
  // TALENT DATA FETCHING
  // ════════════════════════════════════════

  const fetchTalent = async () => {
    setTalentLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (expertiseFilter) params.set('expertise', expertiseFilter);
      if (availabilityFilter) params.set('availability', availabilityFilter);
      if (talentSearch) params.set('search', talentSearch);

      const res = await fetch(`/api/space-jobs/talent?${params.toString()}`);
      const data = await res.json();

      if (data.talent) setTalent(data.talent);
      if (data.stats) setTalentStats(data.stats);
    } catch (error) {
      clientLogger.error('Failed to fetch talent', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setTalentLoading(false);
    }
  };

  const fetchWebinars = async () => {
    setWebinarLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (topicFilter) params.set('topic', topicFilter);
      if (webinarFilter === 'live') params.set('isLive', 'true');
      if (webinarFilter === 'upcoming') {
        params.set('isPast', 'false');
        params.set('isLive', 'false');
      }
      if (webinarFilter === 'past') params.set('isPast', 'true');

      const res = await fetch(`/api/space-jobs/webinars?${params.toString()}`);
      const data = await res.json();

      if (data.webinars) setWebinars(data.webinars);
      if (data.stats) setWebinarStats(data.stats);
    } catch (error) {
      clientLogger.error('Failed to fetch webinars', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setWebinarLoading(false);
    }
  };

  // Fetch talent data on mount and when filters change
  useEffect(() => {
    if (topTab === 'talent' && talentSubTab === 'experts') {
      fetchTalent();
    }
  }, [topTab, talentSubTab, expertiseFilter, availabilityFilter, talentSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch webinar data when sub-tab changes or filters change
  useEffect(() => {
    if (topTab === 'talent' && talentSubTab === 'webinars') {
      fetchWebinars();
    }
  }, [topTab, talentSubTab, webinarFilter, topicFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════
  // WORKFORCE DATA FETCHING
  // ════════════════════════════════════════

  const fetchJobs = useCallback(async (offset: number, append: boolean = false) => {
    setJobsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (seniorityFilter) params.set('seniorityLevel', seniorityFilter);
      if (remoteOnly) params.set('remoteOnly', 'true');
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', JOBS_PER_PAGE.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/workforce?${params}`);
      const data = await res.json();

      if (append) {
        setJobs((prev) => [...prev, ...(data.jobs || [])]);
      } else {
        setJobs(data.jobs || []);
      }
      setTotalJobs(data.totalJobs || 0);

      if (!wfStats && data.stats) setWfStats(data.stats);
      if (trends.length === 0 && data.trends) setTrends(data.trends);
      if (benchmarksByCategory.length === 0 && data.salaryBenchmarks) {
        setBenchmarksByCategory(data.salaryBenchmarks.byCategory || []);
        setBenchmarksBySeniority(data.salaryBenchmarks.bySeniority || []);
      }

      setTrendsLoading(false);
      setSalariesLoading(false);
    } catch (error) {
      clientLogger.error('Failed to fetch workforce data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setJobsLoading(false);
    }
  }, [categoryFilter, seniorityFilter, remoteOnly, searchQuery, wfStats, trends.length, benchmarksByCategory.length]);

  // Fetch workforce data when switching to that tab or when filters change
  useEffect(() => {
    if (topTab === 'workforce') {
      setJobsOffset(0);
      fetchJobs(0, false);
    }
  }, [topTab, categoryFilter, seniorityFilter, remoteOnly, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════
  // WORKFORCE HANDLERS
  // ════════════════════════════════════════

  const handleLoadMore = () => {
    const newOffset = jobsOffset + JOBS_PER_PAGE;
    setJobsOffset(newOffset);
    fetchJobs(newOffset, true);
  };

  const handleJobSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setJobsOffset(0);
    updateUrl({ search: searchInput || null });
  };

  const handleWfSubTabChange = (tab: 'jobs' | 'trends' | 'salaries' | 'insights') => {
    setWfSubTab(tab);
    updateUrl({ wfTab: tab === 'jobs' ? null : tab });
  };

  const handleCategoryChange = (value: JobCategory | '') => {
    setCategoryFilter(value);
    setJobsOffset(0);
    updateUrl({ category: value || null });
  };

  const handleSeniorityChange = (value: SeniorityLevel | '') => {
    setSeniorityFilter(value);
    setJobsOffset(0);
    updateUrl({ seniority: value || null });
  };

  const handleRemoteToggle = () => {
    const newValue = !remoteOnly;
    setRemoteOnly(newValue);
    setJobsOffset(0);
    updateUrl({ remote: newValue ? 'true' : null });
  };

  const handleSalaryViewChange = (view: 'category' | 'seniority') => {
    setSalaryView(view);
    updateUrl({ salaryView: view === 'category' ? null : view });
  };

  const clearJobFilters = () => {
    setCategoryFilter('');
    setSeniorityFilter('');
    setRemoteOnly(false);
    setSearchInput('');
    setSearchQuery('');
    setJobsOffset(0);
    updateUrl({ category: null, seniority: null, remote: null, search: null });
  };

  const hasJobFilters = categoryFilter || seniorityFilter || remoteOnly || searchQuery;

  // ════════════════════════════════════════
  // TOP-LEVEL TAB CHANGE
  // ════════════════════════════════════════

  const handleTopTabChange = (tab: TopLevelTab) => {
    setTopTab(tab);
    updateUrl({ tab: tab === 'talent' ? null : tab });
  };

  // Swipe between tabs
  useSwipeTabs(['talent', 'workforce'], topTab, (tab) => handleTopTabChange(tab as TopLevelTab));

  // Combined refresh for pull-to-refresh
  const handleRefresh = async () => {
    if (topTab === 'talent') {
      if (talentSubTab === 'experts') await fetchTalent();
      else await fetchWebinars();
    } else {
      await fetchJobs(0, false);
    }
  };

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* JobPosting structured data for Google for Jobs */}
      {jobs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jobs.slice(0, 20).map((job) => ({
              '@context': 'https://schema.org',
              '@type': 'JobPosting',
              title: job.title,
              hiringOrganization: {
                '@type': 'Organization',
                name: job.company,
              },
              jobLocation: {
                '@type': 'Place',
                address: job.location,
              },
              ...(job.remoteOk && { jobLocationType: 'TELECOMMUTE' }),
              datePosted: new Date(job.postedDate).toISOString(),
              validThrough: new Date(Date.now() + 60 * 86400000).toISOString(),
              employmentType: 'FULL_TIME',
              ...(job.salaryMin && job.salaryMax && {
                baseSalary: {
                  '@type': 'MonetaryAmount',
                  currency: 'USD',
                  value: {
                    '@type': 'QuantitativeValue',
                    minValue: job.salaryMin,
                    maxValue: job.salaryMax,
                    unitText: 'YEAR',
                  },
                },
              }),
              ...(job.sourceUrl && { url: job.sourceUrl }),
            }))).replace(/</g, '\\u003c'),
          }}
        />
      )}

      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* ──────────────── TOP-LEVEL TAB NAVIGATION ──────────────── */}
      <div className="flex border-b border-slate-700/50 mb-8 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => handleTopTabChange('talent')}
          className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            topTab === 'talent'
              ? 'border-cyan-500 text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            Talent & Experts
          </span>
        </button>
        <button
          onClick={() => handleTopTabChange('workforce')}
          className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            topTab === 'workforce'
              ? 'border-cyan-500 text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            Workforce Analytics
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TALENT & EXPERTS TAB                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {topTab === 'talent' && (
        <div>
          {/* Sub-tab navigation (Experts / Webinars) */}
          <div className="flex border-b border-slate-700/50 mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setTalentSubTab('experts')}
              className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                talentSubTab === 'experts'
                  ? 'border-cyan-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                Expert Consultants
              </span>
            </button>
            <button
              onClick={() => setTalentSubTab('webinars')}
              className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                talentSubTab === 'webinars'
                  ? 'border-cyan-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                Technical Panels & Webinars
                {webinarStats?.liveCount ? (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded animate-pulse">
                    {webinarStats.liveCount} LIVE
                  </span>
                ) : null}
              </span>
            </button>
          </div>

          {/* ── Expert Consultants Sub-Tab ── */}
          {talentSubTab === 'experts' && (
            <div>
              {/* Description */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-cyan-400">Find the right expert for your project.</strong>{' '}
                  Our network includes space lawyers, regulatory specialists, aerospace engineers,
                  policy advisors, and business consultants with deep industry experience.
                </p>
              </div>

              {/* Service Provider Listing CTA */}
              <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  If you are a service provider in this area and would like to be listed here, please{' '}
                  <button
                    onClick={() => {
                      setSpFormData(INITIAL_FORM_DATA);
                      setSpFormErrors({});
                      setSpSubmitSuccess(false);
                      setIsContactModalOpen(true);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors"
                  >
                    contact us
                  </button>
                  .
                </p>
              </div>

              {/* Stats Cards */}
              {talentStats && (
                <ScrollReveal>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{talentStats.totalExperts}</div>
                    <div className="text-slate-400 text-xs">Total Experts</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{talentStats.featuredCount}</div>
                    <div className="text-slate-400 text-xs">Featured</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{talentStats.availableCount}</div>
                    <div className="text-slate-400 text-xs">Available Now</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">${talentStats.avgConsultingRate}</div>
                    <div className="text-slate-400 text-xs">Avg. Rate/hr</div>
                  </div>
                </div>
                </ScrollReveal>
              )}

              {/* Filters */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      aria-label="Search by name, title, organization, or expertise"
                      placeholder="Search by name, title, organization, or expertise..."
                      value={talentSearch}
                      onChange={(e) => setTalentSearch(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <select
                    aria-label="Filter by expertise area"
                    value={expertiseFilter}
                    onChange={(e) => setExpertiseFilter(e.target.value as TalentExpertiseArea | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  >
                    <option value="">All Expertise Areas</option>
                    {TALENT_EXPERTISE_AREAS.map(exp => (
                      <option key={exp.value} value={exp.value}>
                        {exp.icon} {exp.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by availability"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as TalentAvailability | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  >
                    <option value="">All Availability</option>
                    {Object.entries(TALENT_AVAILABILITY_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-slate-800/50 border border-cyan-400/20 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-300">
                    The information contained in these cards is our best estimate of the services and prices offered by the service provider based on publicly available information. Please contact the service provider directly to confirm any details.
                  </p>
                </div>
              </div>

              {/* Talent Grid */}
              {talentLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : talent.length > 0 ? (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {talent.map((t, index) => (
                    <React.Fragment key={t.id}>
                      <StaggerItem>
                        <TalentCard talent={t} />
                      </StaggerItem>
                      {(index + 1) % 6 === 0 && index + 1 < talent.length && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                          <AdSlot position="in_feed" module="space-talent" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No experts found matching your criteria.</p>
                  <button
                    onClick={() => {
                      setExpertiseFilter('');
                      setAvailabilityFilter('');
                      setTalentSearch('');
                    }}
                    className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* CTA for experts to join */}
              <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
                <h3 className="text-white font-semibold mb-2">Are you a space industry expert?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Join our network to connect with companies and projects seeking your expertise.
                </p>
                <a
                  href="mailto:talent@spacenexus.us?subject=Expert Network Application"
                  className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Apply to Join Network
                </a>
              </div>
            </div>
          )}

          {/* ── Webinars Sub-Tab ── */}
          {talentSubTab === 'webinars' && (
            <div>
              {/* Description */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-purple-400">Learn from industry leaders.</strong>{' '}
                  Join live technical panels, webinars, and discussions on topics like space nuclear payloads,
                  in-orbit manufacturing, regulatory compliance, and emerging space technologies.
                </p>
              </div>

              {/* Stats Cards */}
              {webinarStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{webinarStats.totalWebinars}</div>
                    <div className="text-slate-400 text-xs">Total Events</div>
                  </div>
                  <div className={`bg-slate-800/50 border rounded-lg p-4 text-center ${webinarStats.liveCount > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50'}`}>
                    <div className="text-2xl font-bold text-red-400">{webinarStats.liveCount}</div>
                    <div className="text-slate-400 text-xs">Live Now</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{webinarStats.upcomingCount}</div>
                    <div className="text-slate-400 text-xs">Upcoming</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-slate-400">{webinarStats.pastCount}</div>
                    <div className="text-slate-400 text-xs">Past Events</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{webinarStats.recordingsAvailable}</div>
                    <div className="text-slate-400 text-xs">Recordings</div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'live', label: 'Live', color: 'text-red-400' },
                      { value: 'upcoming', label: 'Upcoming', color: 'text-cyan-400' },
                      { value: 'past', label: 'Past', color: 'text-slate-400' },
                    ].map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setWebinarFilter(filter.value as typeof webinarFilter)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          webinarFilter === filter.value
                            ? 'bg-cyan-500 text-white'
                            : `bg-slate-700/50 hover:bg-slate-600/50 ${filter.color || 'text-slate-300'}`
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Filter by topic"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  >
                    <option value="">All Topics</option>
                    {WEBINAR_TOPICS.map(topic => (
                      <option key={topic.value} value={topic.value}>
                        {topic.icon} {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Webinar Grid */}
              {webinarLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : webinars.length > 0 ? (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {webinars.map(w => (
                    <StaggerItem key={w.id}>
                      <WebinarCard webinar={w} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No webinars found matching your criteria.</p>
                  <button
                    onClick={() => {
                      setWebinarFilter('all');
                      setTopicFilter('');
                    }}
                    className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* CTA for hosting webinars */}
              <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
                <h3 className="text-white font-semibold mb-2">Want to host a technical panel?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Share your expertise with the space industry community. We support webinars,
                  panel discussions, and technical presentations.
                </p>
                <a
                  href="mailto:webinars@spacenexus.us?subject=Webinar Hosting Inquiry"
                  className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Propose a Webinar
                </a>
              </div>
            </div>
          )}

          {/* Related Resources for Talent tab */}
          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/business-opportunities"
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
              >
                Business Opportunities
              </Link>
              <Link
                href="/compliance"
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
              >
                Compliance & Regulations
              </Link>
            </div>
          </div>

          {/* Service Provider Contact Modal */}
          {isContactModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsContactModalOpen(false);
              }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

              {/* Modal */}
              <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md">
                {/* Close button */}
                <button
                  onClick={() => setIsContactModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-1">Get Listed as a Service Provider</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Submit your details and we will review your listing for inclusion.
                  </p>

                  {spSubmitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Submission Received!</h3>
                      <p className="text-slate-400 text-sm mb-6">
                        Thank you for your interest. We will review your submission and get back to you shortly.
                      </p>
                      <button
                        onClick={() => setIsContactModalOpen(false)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSpFormErrors({});

                        // Client-side validation
                        const errors: Record<string, string> = {};
                        if (!spFormData.businessName.trim()) {
                          errors.businessName = 'Business name is required';
                        }
                        if (!spFormData.email.trim()) {
                          errors.email = 'Email is required';
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spFormData.email.trim())) {
                          errors.email = 'Please enter a valid email address';
                        }
                        if (!spFormData.description.trim()) {
                          errors.description = 'Description is required';
                        } else if (spFormData.description.trim().length < 10) {
                          errors.description = 'Please provide at least 10 characters';
                        }
                        if (spFormData.website.trim() && !/^https?:\/\/.+/.test(spFormData.website.trim())) {
                          errors.website = 'Please enter a valid URL (starting with http:// or https://)';
                        }

                        if (Object.keys(errors).length > 0) {
                          setSpFormErrors(errors);
                          return;
                        }

                        setSpSubmitting(true);
                        try {
                          const res = await fetch('/api/service-providers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              businessName: spFormData.businessName.trim(),
                              contactName: spFormData.contactName.trim() || undefined,
                              phone: spFormData.phone.trim() || undefined,
                              email: spFormData.email.trim(),
                              website: spFormData.website.trim() || undefined,
                              description: spFormData.description.trim(),
                              pricing: spFormData.pricing.trim() || undefined,
                            }),
                          });

                          if (res.ok) {
                            setSpSubmitSuccess(true);
                          } else {
                            const data = await res.json();
                            if (data.details) {
                              const serverErrors: Record<string, string> = {};
                              for (const [key, msgs] of Object.entries(data.details)) {
                                if (Array.isArray(msgs) && msgs.length > 0) {
                                  serverErrors[key] = msgs[0] as string;
                                }
                              }
                              setSpFormErrors(serverErrors);
                            } else {
                              setSpFormErrors({ _form: data.error || 'Something went wrong. Please try again.' });
                            }
                          }
                        } catch {
                          setSpFormErrors({ _form: 'Network error. Please try again.' });
                        } finally {
                          setSpSubmitting(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      {spFormErrors._form && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-red-400 text-sm">{spFormErrors._form}</p>
                        </div>
                      )}

                      {/* Business Name */}
                      <div>
                        <label htmlFor="sp-business-name" className="block text-sm font-medium text-slate-300 mb-1">
                          Business / Provider Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="sp-business-name"
                          type="text"
                          value={spFormData.businessName}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, businessName: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 ${
                            spFormErrors.businessName ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="Your business or provider name"
                        />
                        {spFormErrors.businessName && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.businessName}</p>
                        )}
                      </div>

                      {/* Contact Name */}
                      <div>
                        <label htmlFor="sp-contact-name" className="block text-sm font-medium text-slate-300 mb-1">
                          Contact Name
                        </label>
                        <input
                          id="sp-contact-name"
                          type="text"
                          value={spFormData.contactName}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, contactName: e.target.value }))}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                          placeholder="Primary contact person"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="sp-phone" className="block text-sm font-medium text-slate-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          id="sp-phone"
                          type="tel"
                          value={spFormData.phone}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="sp-email" className="block text-sm font-medium text-slate-300 mb-1">
                          Email Address <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="sp-email"
                          type="email"
                          value={spFormData.email}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, email: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 ${
                            spFormErrors.email ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="you@company.com"
                        />
                        {spFormErrors.email && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.email}</p>
                        )}
                      </div>

                      {/* Website */}
                      <div>
                        <label htmlFor="sp-website" className="block text-sm font-medium text-slate-300 mb-1">
                          Website
                        </label>
                        <input
                          id="sp-website"
                          type="url"
                          value={spFormData.website}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, website: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 ${
                            spFormErrors.website ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="https://yourcompany.com"
                        />
                        {spFormErrors.website && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.website}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label htmlFor="sp-description" className="block text-sm font-medium text-slate-300 mb-1">
                          Description of Services <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="sp-description"
                          value={spFormData.description}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-vertical ${
                            spFormErrors.description ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="Describe the services you offer, your areas of expertise, and what makes you stand out..."
                        />
                        {spFormErrors.description && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.description}</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">{spFormData.description.length}/2000 characters</p>
                      </div>

                      {/* Pricing */}
                      <div>
                        <label htmlFor="sp-pricing" className="block text-sm font-medium text-slate-300 mb-1">
                          Pricing Information
                        </label>
                        <textarea
                          id="sp-pricing"
                          value={spFormData.pricing}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, pricing: e.target.value }))}
                          rows={2}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-vertical"
                          placeholder="e.g., Hourly rates, project-based pricing, consultation fees..."
                        />
                      </div>

                      {/* Submit */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={spSubmitting}
                          className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {spSubmitting ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            'Submit Listing Request'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsContactModalOpen(false)}
                          className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* WORKFORCE ANALYTICS TAB                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {topTab === 'workforce' && (
        <div>
          {/* Quick Stats */}
          {wfStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {wfStats.totalOpenings.toLocaleString()}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Openings
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {formatSalary(wfStats.avgSalary)}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Avg Salary
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-300">
                  {JOB_CATEGORIES.find((c) => c.value === wfStats.topCategory)?.label || wfStats.topCategory}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Top Category
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-blue-400 truncate">
                  {wfStats.topCompany}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Top Employer
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-purple-400">
                  {wfStats.totalCompanies}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Companies
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div
                  className={`text-2xl font-bold font-display ${
                    (wfStats.growthRate ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {(wfStats.growthRate ?? 0) >= 0 ? '+' : ''}
                  {(wfStats.growthRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  YoY Growth
                </div>
              </div>
            </div>
          )}

          {/* Workforce Sub-Tab Navigation */}
          <div className="relative">
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: 'jobs' as const, label: 'Job Postings', count: totalJobs },
                { id: 'trends' as const, label: 'Workforce Trends', count: trends.length },
                { id: 'salaries' as const, label: 'Salary Benchmarks', count: benchmarksByCategory.length },
                { id: 'insights' as const, label: 'Industry Insights', count: 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleWfSubTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    wfSubTab === tab.id
                      ? 'bg-nebula-500 text-white shadow-glow-sm'
                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        wfSubTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-700/50 text-slate-500'
                    }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
          </div>

          {/* ──────────────── JOB POSTINGS SUB-TAB ──────────────── */}
          {wfSubTab === 'jobs' && (
            <div>
              {/* Search & Filters */}
              <div className="card p-4 mb-6">
                <form onSubmit={handleJobSearch} className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label="Search jobs by title, company, location, or specialization"
                      placeholder="Search jobs by title, company, location, or specialization..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-star-400 focus:outline-none focus:border-nebula-500/50 transition-colors"
                    />
                    <button type="submit" className="btn-primary px-6">
                      Search
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Category */}
                  <select
                    aria-label="Filter by job category"
                    value={categoryFilter}
                    onChange={(e) => handleCategoryChange(e.target.value as JobCategory | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  >
                    <option value="">All Categories</option>
                    {JOB_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Seniority */}
                  <select
                    aria-label="Filter by seniority level"
                    value={seniorityFilter}
                    onChange={(e) => handleSeniorityChange(e.target.value as SeniorityLevel | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                  >
                    <option value="">All Levels</option>
                    {SENIORITY_LEVELS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {/* Remote Toggle */}
                  <button
                    onClick={handleRemoteToggle}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      remoteOnly
                        ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/30'
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-700/50'
                    }`}
                  >
                    Remote Only
                  </button>

                  {/* Clear Filters */}
                  {hasJobFilters && (
                    <button
                      onClick={clearJobFilters}
                      className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-400">
                      {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} found
                    </span>
                    <ExportButton
                      data={jobs}
                      filename="spacehub-jobs"
                      columns={JOB_EXPORT_COLUMNS}
                      label="Export Jobs"
                    />
                  </div>
                </div>
              </div>

              {/* Job Listings */}
              {jobsLoading && jobs.length === 0 ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
                  <p className="text-slate-400 mb-4">
                    {hasJobFilters
                      ? 'Try adjusting your filters or search terms.'
                      : 'Job postings will appear here once data is loaded.'}
                  </p>
                  {hasJobFilters && (
                    <button onClick={clearJobFilters} className="btn-secondary">
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>

                  {jobs.length < totalJobs && (
                    <div className="text-center mt-8">
                      <button
                        onClick={handleLoadMore}
                        disabled={jobsLoading}
                        className="btn-secondary py-3 px-8"
                      >
                        {jobsLoading ? (
                          <span className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            Loading...
                          </span>
                        ) : (
                          `Load More (${jobs.length} of ${totalJobs})`
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ──────────────── WORKFORCE TRENDS SUB-TAB ──────────────── */}
          {wfSubTab === 'trends' && (
            <div>
              {trendsLoading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : trends.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No trend data available</h3>
                  <p className="text-slate-400">Workforce trends will appear once data is loaded.</p>
                </div>
              ) : (
                <>
                  {/* Summary banner */}
                  <div className="card p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Industry Overview</h3>
                      <ExportButton
                        data={trends}
                        filename="spacehub-workforce-trends"
                        columns={TREND_EXPORT_COLUMNS}
                        label="Export Trends"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Latest Quarter</span>
                        <span className="text-white font-bold">
                          Q{trends[trends.length - 1].quarter} {trends[trends.length - 1].year}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Openings Growth</span>
                        <span className="text-green-400 font-bold">
                          {trends.length >= 2
                            ? `${(((trends[trends.length - 1].totalOpenings - trends[0].totalOpenings) / trends[0].totalOpenings) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Salary Growth</span>
                        <span className="text-green-400 font-bold">
                          {trends.length >= 2
                            ? `${((((trends[trends.length - 1].avgSalary ?? 0) - (trends[0].avgSalary ?? 0)) / (trends[0].avgSalary || 1)) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Hires (Latest)</span>
                        <span className="text-white font-bold">
                          {(trends[trends.length - 1].totalHires ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trends.map((trend) => (
                      <TrendCard key={trend.id} trend={trend} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────── SALARY BENCHMARKS SUB-TAB ──────────────── */}
          {wfSubTab === 'salaries' && (
            <div>
              {salariesLoading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : benchmarksByCategory.length === 0 && benchmarksBySeniority.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No salary data available</h3>
                  <p className="text-slate-400">Salary benchmarks will appear once data is loaded.</p>
                </div>
              ) : (
                <>
                  {/* View Toggle */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => handleSalaryViewChange('category')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salaryView === 'category'
                          ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-700/50'
                      }`}
                    >
                      By Category
                    </button>
                    <button
                      onClick={() => handleSalaryViewChange('seniority')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salaryView === 'seniority'
                          ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-700/50'
                      }`}
                    >
                      By Seniority Level
                    </button>
                  </div>

                  {salaryView === 'category' ? (
                    <div className="space-y-3">
                      {benchmarksByCategory.map((b) => {
                        const cat = b.category as JobCategory;
                        const catInfo = JOB_CATEGORIES.find((c) => c.value === cat);
                        const colors = CATEGORY_COLORS[cat];
                        return (
                          <BenchmarkBar
                            key={cat}
                            label={`${catInfo?.icon || ''} ${catInfo?.label || cat}`}
                            color={colors?.text || 'text-slate-400'}
                            avgMin={b.avgMin}
                            avgMax={b.avgMax}
                            avgMedian={b.avgMedian}
                            count={b.count}
                            maxRange={500000}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {benchmarksBySeniority.map((b) => {
                        const level = b.seniorityLevel as SeniorityLevel;
                        return (
                          <BenchmarkBar
                            key={level}
                            label={SENIORITY_LABELS[level] || level}
                            color="text-nebula-300"
                            avgMin={b.avgMin}
                            avgMax={b.avgMax}
                            avgMedian={b.avgMedian}
                            count={b.count}
                            maxRange={500000}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Salary legend */}
                  <div className="card p-4 mt-6 border-dashed">
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-2 bg-slate-700/50 rounded-full" />
                        <span>Salary Range (Min to Max)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-nebula-400 rounded-full" />
                        <span>Median</span>
                      </div>
                      <span className="ml-auto text-slate-400/70">
                        Based on {jobs.length > 0 ? totalJobs : '...'} active job postings
                      </span>
                    </div>
                  </div>

                  {/* Detailed Role Salary Ranges */}
                  <div className="mt-8">
                    <SalaryByRoleSection />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────── INDUSTRY INSIGHTS SUB-TAB ──────────────── */}
          {wfSubTab === 'insights' && (
            <div>
              {/* Intro banner */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-cyan-400">Deep-dive workforce intelligence.</strong>{' '}
                  Explore employment distribution across sectors, identify the most critical skill shortages,
                  understand geographic hiring patterns, and track the STEM education pipeline feeding the space workforce.
                </p>
              </div>

              <div className="space-y-6">
                {/* Sector Employment */}
                <ScrollReveal>
                  <SectorEmploymentSection />
                </ScrollReveal>

                {/* Skills Demand */}
                <ScrollReveal>
                  <SkillsDemandSection />
                </ScrollReveal>

                {/* Geographic Distribution */}
                <ScrollReveal>
                  <GeographicDistributionSection />
                </ScrollReveal>

                {/* Education Pipeline */}
                <ScrollReveal>
                  <EducationPipelineSection />
                </ScrollReveal>

                {/* Data methodology note */}
                <div className="card p-4 border-dashed">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-slate-500">
                      <p className="mb-1">
                        <strong className="text-slate-400">Data Methodology:</strong> Workforce statistics are compiled from
                        multiple sources including the Bureau of Labor Statistics, Space Foundation workforce reports,
                        Bryce Tech analysis, SIA annual reports, NSF STEM education data, and aggregated job posting data.
                        Figures represent estimates and may not reflect real-time conditions.
                      </p>
                      <p>
                        Salary data represents base compensation for US-based positions unless otherwise noted.
                        International salary comparisons use PPP-adjusted rates where applicable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PullToRefresh>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function SpaceTalentHubPage() {
  return (
    <div className="min-h-screen bg-space-900 py-8">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Space Talent Hub' },
      ]} />
      <ItemListSchema
        name="Space Talent Hub"
        description="Space industry job listings, expert consultants, salary benchmarks, and workforce analytics"
        url="/space-talent"
        items={[
          { name: 'Space Industry Jobs', url: '/space-talent?tab=workforce', description: 'Browse open positions in the space industry' },
          { name: 'Expert Consultants', url: '/space-talent?tab=talent', description: 'Connect with space industry consultants and advisors' },
          { name: 'Salary Benchmarks', url: '/space-talent?tab=workforce&wfTab=salaries', description: 'Space industry salary data by role and seniority' },
          { name: 'Industry Insights', url: '/space-talent?tab=workforce&wfTab=insights', description: 'Space workforce sector employment, skills demand, and education pipeline analytics' },
        ]}
      />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Talent Hub"
          subtitle="Expert consultants, webinars, job listings, salary benchmarks, and workforce analytics"
          icon="👨‍🚀"
          accentColor="emerald"
        />

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <SpaceTalentHubContent />
        </Suspense>

        {/* Footer Ad */}
        <div className="mt-12">
          <AdSlot position="footer" module="space-talent" />
        </div>
      </div>
    </div>
  );
}
