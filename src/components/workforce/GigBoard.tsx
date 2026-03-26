'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type GigSubTab = 'find-gigs' | 'find-talent' | 'my-profile';

type GigCategory = 'engineering' | 'operations' | 'data-science' | 'consulting' | 'design' | 'research';
type GigWorkType = 'freelance' | 'contract' | 'part_time' | 'consulting' | 'side_project';
type BudgetType = 'hourly' | 'fixed' | 'monthly';
type Availability = 'available' | 'part_time' | 'contract_only' | 'unavailable';
type ClearanceLevel = 'none' | 'confidential' | 'secret' | 'top_secret';

interface Gig {
  id: string;
  title: string;
  companyName: string;
  description: string;
  category: GigCategory;
  workType: GigWorkType;
  budgetMin: number;
  budgetMax: number;
  budgetType: BudgetType;
  duration: string;
  hoursPerWeek: number;
  skills: string[];
  location: string;
  remoteOk: boolean;
  clearanceRequired: boolean;
  contactEmail?: string;
  contactUrl?: string;
  postedAt: string;
  applicantCount: number;
}

interface WorkerProfile {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  availability: Availability;
  workTypes: GigWorkType[];
  linkedInUrl?: string;
  portfolioUrl?: string;
  location: string;
  remoteOk: boolean;
  clearanceLevel: ClearanceLevel;
}

interface EmployerProfile {
  id: string;
  companyName: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const GIG_CATEGORIES: { value: GigCategory; label: string }[] = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'design', label: 'Design' },
  { value: 'research', label: 'Research' },
];

const WORK_TYPES: { value: GigWorkType; label: string }[] = [
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'side_project', label: 'Side Project' },
];

const AVAILABILITY_OPTIONS: { value: Availability; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  { value: 'part_time', label: 'Part-Time', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  { value: 'contract_only', label: 'Contract Only', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'unavailable', label: 'Unavailable', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
];

const CLEARANCE_OPTIONS: { value: ClearanceLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'secret', label: 'Secret' },
  { value: 'top_secret', label: 'Top Secret' },
];

const CATEGORY_BADGE_COLORS: Record<GigCategory, string> = {
  engineering: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  operations: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'data-science': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  consulting: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  design: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  research: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
};

const WORK_TYPE_BADGE_COLORS: Record<GigWorkType, string> = {
  freelance: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  contract: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  part_time: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  consulting: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  side_project: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
};

const COMMON_SKILLS = [
  'Python', 'MATLAB', 'C++', 'Rust', 'Systems Engineering', 'Orbital Mechanics',
  'GNC', 'RF Engineering', 'Data Analysis', 'Machine Learning', 'Project Management',
  'Propulsion', 'Thermal Analysis', 'Structures', 'Avionics', 'Mission Planning',
  'Satellite Operations', 'Ground Systems', 'Space Policy', 'Technical Writing',
];

// ────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────

function formatBudget(min: number, max: number, type: BudgetType): string {
  const formatNum = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return `$${n}`;
  };
  const suffix = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : ' fixed';
  if (min === max) return `${formatNum(min)}${suffix}`;
  return `${formatNum(min)} - ${formatNum(max)}${suffix}`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

function getCategoryLabel(cat: GigCategory): string {
  return GIG_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function getWorkTypeLabel(wt: GigWorkType): string {
  return WORK_TYPES.find(w => w.value === wt)?.label ?? wt;
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

/* ─── Empty State ─── */
function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="card bg-white/[0.04] border border-white/[0.06] p-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto">{message}</p>
    </div>
  );
}

/* ─── Gig Card ─── */
function GigCard({ gig }: { gig: Gig }) {
  const contactHref = gig.contactUrl || (gig.contactEmail ? `mailto:${gig.contactEmail}` : '#');

  return (
    <div className="card bg-white/[0.04] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{gig.title}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{gig.companyName}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-emerald-400 font-semibold text-sm">
            {formatBudget(gig.budgetMin, gig.budgetMax, gig.budgetType)}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${CATEGORY_BADGE_COLORS[gig.category]}`}>
          {getCategoryLabel(gig.category)}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${WORK_TYPE_BADGE_COLORS[gig.workType]}`}>
          {getWorkTypeLabel(gig.workType)}
        </span>
        {gig.remoteOk && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border text-teal-400 bg-teal-400/10 border-teal-400/20">
            Remote
          </span>
        )}
        {gig.clearanceRequired && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border text-red-400 bg-red-400/10 border-red-400/20">
            Clearance Required
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
        {gig.duration && <span>Duration: {gig.duration}</span>}
        {gig.hoursPerWeek > 0 && <span>{gig.hoursPerWeek} hrs/week</span>}
        {gig.location && <span>{gig.location}</span>}
      </div>

      {/* Skills */}
      {gig.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {gig.skills.slice(0, 6).map(skill => (
            <span key={skill} className="px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-300 border border-white/[0.04]">
              {skill}
            </span>
          ))}
          {gig.skills.length > 6 && (
            <span className="px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-500">
              +{gig.skills.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{timeAgo(gig.postedAt)}</span>
          <span>{gig.applicantCount} applicant{gig.applicantCount !== 1 ? 's' : ''}</span>
        </div>
        <a
          href={contactHref}
          target={gig.contactUrl ? '_blank' : undefined}
          rel={gig.contactUrl ? 'noopener noreferrer' : undefined}
          className="px-4 py-1.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors min-h-[32px] inline-flex items-center"
        >
          Apply / Express Interest
        </a>
      </div>
    </div>
  );
}

/* ─── Worker Profile Card ─── */
function WorkerProfileCard({ profile }: { profile: WorkerProfile }) {
  const availOpt = AVAILABILITY_OPTIONS.find(a => a.value === profile.availability) ?? AVAILABILITY_OPTIONS[3];

  return (
    <div className="card bg-white/[0.04] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{profile.displayName}</h3>
          <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">{profile.headline}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${availOpt.color}`}>
          {availOpt.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
        {profile.location && <span>{profile.location}</span>}
        {profile.experienceYears > 0 && <span>{profile.experienceYears} yr{profile.experienceYears !== 1 ? 's' : ''} exp</span>}
        {profile.hourlyRate > 0 && <span className="text-emerald-400 font-medium">${profile.hourlyRate}/hr</span>}
        {profile.remoteOk && <span className="text-teal-400">Remote OK</span>}
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.skills.slice(0, 6).map(skill => (
            <span key={skill} className="px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-300 border border-white/[0.04]">
              {skill}
            </span>
          ))}
          {profile.skills.length > 6 && (
            <span className="px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-500">
              +{profile.skills.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          {profile.linkedInUrl && (
            <a
              href={profile.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              LinkedIn
            </a>
          )}
          {profile.portfolioUrl && (
            <a
              href={profile.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Portfolio
            </a>
          )}
        </div>
        <a
          href={profile.linkedInUrl || profile.portfolioUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors min-h-[32px] inline-flex items-center"
        >
          Contact
        </a>
      </div>
    </div>
  );
}

/* ─── Form Input ─── */
function FormInput({
  label, name, value, onChange, type = 'text', placeholder, required = false,
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1] transition-colors"
      />
    </div>
  );
}

/* ─── Form Textarea ─── */
function FormTextarea({
  label, name, value, onChange, placeholder, rows = 3, required = false,
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1] transition-colors resize-y"
      />
    </div>
  );
}

/* ─── Form Select ─── */
function FormSelect({
  label, name, value, onChange, options, required = false, includeEmpty = true, emptyLabel = 'Select...',
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[]; required?: boolean; includeEmpty?: boolean; emptyLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1] transition-colors"
      >
        {includeEmpty && <option value="">{emptyLabel}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function GigBoard() {
  const [subTab, setSubTab] = useState<GigSubTab>('find-gigs');

  // ── Find Gigs state ──
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [gigsLoading, setGigsLoading] = useState(false);
  const [gigCategory, setGigCategory] = useState('');
  const [gigWorkType, setGigWorkType] = useState('');
  const [gigRemoteOnly, setGigRemoteOnly] = useState(false);
  const [gigSearch, setGigSearch] = useState('');
  const [gigSearchInput, setGigSearchInput] = useState('');

  // ── Find Talent state ──
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [talentSkillFilter, setTalentSkillFilter] = useState('');
  const [talentAvailability, setTalentAvailability] = useState('');
  const [talentWorkType, setTalentWorkType] = useState('');
  const [talentRemoteOnly, setTalentRemoteOnly] = useState(false);
  const [talentSearch, setTalentSearch] = useState('');
  const [talentSearchInput, setTalentSearchInput] = useState('');

  // ── My Profile state ──
  const [hasWorkerProfile, setHasWorkerProfile] = useState(false);
  const [isEmployer, setIsEmployer] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [employerSaving, setEmployerSaving] = useState(false);
  const [employerMessage, setEmployerMessage] = useState('');
  const [gigPosting, setGigPosting] = useState(false);
  const [gigPostMessage, setGigPostMessage] = useState('');
  const [myGigs, setMyGigs] = useState<Gig[]>([]);

  // Worker profile form
  const [workerForm, setWorkerForm] = useState({
    displayName: '',
    headline: '',
    bio: '',
    skills: [] as string[],
    experienceYears: '',
    hourlyRate: '',
    availability: 'available' as Availability,
    workTypes: [] as GigWorkType[],
    linkedInUrl: '',
    portfolioUrl: '',
    location: '',
    remoteOk: false,
    clearanceLevel: 'none' as ClearanceLevel,
  });
  const [skillInput, setSkillInput] = useState('');

  // Employer form
  const [employerForm, setEmployerForm] = useState({
    companyName: '',
    description: '',
    website: '',
    industry: '',
    size: '',
    location: '',
  });

  // Post Gig form
  const [gigForm, setGigForm] = useState({
    title: '',
    description: '',
    category: '' as GigCategory | '',
    skills: [] as string[],
    workType: '' as GigWorkType | '',
    duration: '',
    hoursPerWeek: '',
    budgetMin: '',
    budgetMax: '',
    budgetType: 'hourly' as BudgetType,
    location: '',
    remoteOk: false,
    clearanceRequired: false,
  });
  const [gigSkillInput, setGigSkillInput] = useState('');

  // ────────────────────────────────────────
  // Fetch Functions
  // ────────────────────────────────────────

  const fetchGigs = useCallback(async () => {
    setGigsLoading(true);
    try {
      const params = new URLSearchParams();
      if (gigCategory) params.set('category', gigCategory);
      if (gigWorkType) params.set('workType', gigWorkType);
      if (gigRemoteOnly) params.set('remoteOnly', 'true');
      if (gigSearch) params.set('search', gigSearch);
      const res = await fetch(`/api/workforce/gigs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch gigs');
      const data = await res.json();
      setGigs(Array.isArray(data) ? data : data.gigs ?? []);
    } catch (err) {
      clientLogger.error('Error fetching gigs', { error: err instanceof Error ? err.message : String(err) });
      setGigs([]);
    } finally {
      setGigsLoading(false);
    }
  }, [gigCategory, gigWorkType, gigRemoteOnly, gigSearch]);

  const fetchWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const params = new URLSearchParams();
      if (talentSkillFilter) params.set('skills', talentSkillFilter);
      if (talentAvailability) params.set('availability', talentAvailability);
      if (talentWorkType) params.set('workType', talentWorkType);
      if (talentRemoteOnly) params.set('remoteOnly', 'true');
      if (talentSearch) params.set('search', talentSearch);
      const res = await fetch(`/api/workforce/worker-profiles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch worker profiles');
      const data = await res.json();
      setWorkers(Array.isArray(data) ? data : data.profiles ?? []);
    } catch (err) {
      clientLogger.error('Error fetching workers', { error: err instanceof Error ? err.message : String(err) });
      setWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  }, [talentSkillFilter, talentAvailability, talentWorkType, talentRemoteOnly, talentSearch]);

  const fetchMyProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/workforce/worker-profiles/me');
      if (res.ok) {
        const data = await res.json();
        if (data.workerProfile) {
          setHasWorkerProfile(true);
          const p = data.workerProfile;
          setWorkerForm({
            displayName: p.displayName ?? '',
            headline: p.headline ?? '',
            bio: p.bio ?? '',
            skills: p.skills ?? [],
            experienceYears: p.experienceYears?.toString() ?? '',
            hourlyRate: p.hourlyRate?.toString() ?? '',
            availability: p.availability ?? 'available',
            workTypes: p.workTypes ?? [],
            linkedInUrl: p.linkedInUrl ?? '',
            portfolioUrl: p.portfolioUrl ?? '',
            location: p.location ?? '',
            remoteOk: p.remoteOk ?? false,
            clearanceLevel: p.clearanceLevel ?? 'none',
          });
        }
        if (data.employerProfile) {
          setIsEmployer(true);
          const e = data.employerProfile;
          setEmployerForm({
            companyName: e.companyName ?? '',
            description: e.description ?? '',
            website: e.website ?? '',
            industry: e.industry ?? '',
            size: e.size ?? '',
            location: e.location ?? '',
          });
        }
        if (data.myGigs) {
          setMyGigs(data.myGigs);
        }
      }
    } catch (err) {
      clientLogger.error('Error fetching profile', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Effects ──

  useEffect(() => {
    if (subTab === 'find-gigs') fetchGigs();
  }, [subTab, fetchGigs]);

  useEffect(() => {
    if (subTab === 'find-talent') fetchWorkers();
  }, [subTab, fetchWorkers]);

  useEffect(() => {
    if (subTab === 'my-profile') fetchMyProfile();
  }, [subTab, fetchMyProfile]);

  // ────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────

  const handleGigSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setGigSearch(gigSearchInput);
  };

  const handleTalentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTalentSearch(talentSearchInput);
  };

  const clearGigFilters = () => {
    setGigCategory('');
    setGigWorkType('');
    setGigRemoteOnly(false);
    setGigSearchInput('');
    setGigSearch('');
  };

  const clearTalentFilters = () => {
    setTalentSkillFilter('');
    setTalentAvailability('');
    setTalentWorkType('');
    setTalentRemoteOnly(false);
    setTalentSearchInput('');
    setTalentSearch('');
  };

  // ── Worker Profile Save ──
  const handleSaveWorkerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const res = await fetch('/api/workforce/worker-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workerForm,
          experienceYears: workerForm.experienceYears ? parseInt(workerForm.experienceYears, 10) : 0,
          hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save profile');
      }
      setHasWorkerProfile(true);
      setProfileMessage('Profile saved successfully!');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Employer Profile Save ──
  const handleSaveEmployerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployerSaving(true);
    setEmployerMessage('');
    try {
      const res = await fetch('/api/workforce/employer-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employerForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save employer profile');
      }
      setIsEmployer(true);
      setEmployerMessage('Employer profile saved successfully!');
    } catch (err) {
      setEmployerMessage(err instanceof Error ? err.message : 'Failed to save employer profile');
    } finally {
      setEmployerSaving(false);
    }
  };

  // ── Post Gig ──
  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGigPosting(true);
    setGigPostMessage('');
    try {
      const res = await fetch('/api/workforce/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gigForm,
          hoursPerWeek: gigForm.hoursPerWeek ? parseInt(gigForm.hoursPerWeek, 10) : 0,
          budgetMin: gigForm.budgetMin ? parseFloat(gigForm.budgetMin) : 0,
          budgetMax: gigForm.budgetMax ? parseFloat(gigForm.budgetMax) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to post gig');
      }
      const newGig = await res.json();
      setMyGigs(prev => [newGig, ...prev]);
      setGigForm({
        title: '', description: '', category: '', skills: [], workType: '',
        duration: '', hoursPerWeek: '', budgetMin: '', budgetMax: '',
        budgetType: 'hourly', location: '', remoteOk: false, clearanceRequired: false,
      });
      setGigPostMessage('Gig posted successfully!');
    } catch (err) {
      setGigPostMessage(err instanceof Error ? err.message : 'Failed to post gig');
    } finally {
      setGigPosting(false);
    }
  };

  // ── Skill tag helpers ──
  const addSkillToProfile = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !workerForm.skills.includes(trimmed)) {
      setWorkerForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  };

  const removeSkillFromProfile = (skill: string) => {
    setWorkerForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addSkillToGig = () => {
    const trimmed = gigSkillInput.trim();
    if (trimmed && !gigForm.skills.includes(trimmed)) {
      setGigForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setGigSkillInput('');
  };

  const removeSkillFromGig = (skill: string) => {
    setGigForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const toggleWorkType = (wt: GigWorkType) => {
    setWorkerForm(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(wt) ? prev.workTypes.filter(w => w !== wt) : [...prev.workTypes, wt],
    }));
  };

  const hasGigFilters = gigCategory || gigWorkType || gigRemoteOnly || gigSearch;
  const hasTalentFilters = talentSkillFilter || talentAvailability || talentWorkType || talentRemoteOnly || talentSearch;

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────

  return (
    <div>
      {/* Sub-tab navigation */}
      <div role="tablist" className="flex border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
        {([
          { id: 'find-gigs' as const, label: 'Find Gigs', icon: '📋' },
          { id: 'find-talent' as const, label: 'Find Talent', icon: '🔍' },
          { id: 'my-profile' as const, label: 'My Profile', icon: '👤' },
        ]).map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
              subTab === tab.id
                ? 'border-white/15 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{tab.icon}</span>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* FIND GIGS TAB                          */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'find-gigs' && (
        <div>
          {/* Filters */}
          <div className="card bg-white/[0.04] border border-white/[0.06] p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <form onSubmit={handleGigSearch} className="flex-1 min-w-[200px]">
                <label htmlFor="gig-search" className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                <div className="flex gap-2">
                  <input
                    id="gig-search"
                    type="text"
                    value={gigSearchInput}
                    onChange={e => setGigSearchInput(e.target.value)}
                    placeholder="Search gigs..."
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-white/[0.08] border border-white/[0.08] rounded text-white text-sm hover:bg-white/[0.12] transition-colors min-h-[36px]"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Category */}
              <div className="min-w-[150px]">
                <label htmlFor="gig-category" className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  id="gig-category"
                  value={gigCategory}
                  onChange={e => setGigCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
                >
                  <option value="">All Categories</option>
                  {GIG_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Work Type */}
              <div className="min-w-[140px]">
                <label htmlFor="gig-worktype" className="block text-xs font-medium text-slate-400 mb-1">Work Type</label>
                <select
                  id="gig-worktype"
                  value={gigWorkType}
                  onChange={e => setGigWorkType(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
                >
                  <option value="">All Types</option>
                  {WORK_TYPES.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              {/* Remote Only */}
              <div className="flex items-center gap-2 pb-0.5">
                <input
                  id="gig-remote"
                  type="checkbox"
                  checked={gigRemoteOnly}
                  onChange={() => setGigRemoteOnly(!gigRemoteOnly)}
                  className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08]"
                />
                <label htmlFor="gig-remote" className="text-sm text-slate-300 cursor-pointer">Remote Only</label>
              </div>

              {/* Clear */}
              {hasGigFilters && (
                <button
                  onClick={clearGigFilters}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors min-h-[36px]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {gigsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/[0.2] border-t-white rounded-full animate-spin" />
            </div>
          ) : gigs.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No Gigs Found"
              message={hasGigFilters ? 'Try adjusting your filters to see more results.' : 'No gig opportunities are available right now. Check back soon!'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gigs.map(gig => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* FIND TALENT TAB                        */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'find-talent' && (
        <div>
          {/* Filters */}
          <div className="card bg-white/[0.04] border border-white/[0.06] p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <form onSubmit={handleTalentSearch} className="flex-1 min-w-[200px]">
                <label htmlFor="talent-search" className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                <div className="flex gap-2">
                  <input
                    id="talent-search"
                    type="text"
                    value={talentSearchInput}
                    onChange={e => setTalentSearchInput(e.target.value)}
                    placeholder="Search talent..."
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-white/[0.08] border border-white/[0.08] rounded text-white text-sm hover:bg-white/[0.12] transition-colors min-h-[36px]"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Skills */}
              <div className="min-w-[150px]">
                <label htmlFor="talent-skill" className="block text-xs font-medium text-slate-400 mb-1">Skill</label>
                <select
                  id="talent-skill"
                  value={talentSkillFilter}
                  onChange={e => setTalentSkillFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
                >
                  <option value="">All Skills</option>
                  {COMMON_SKILLS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div className="min-w-[140px]">
                <label htmlFor="talent-avail" className="block text-xs font-medium text-slate-400 mb-1">Availability</label>
                <select
                  id="talent-avail"
                  value={talentAvailability}
                  onChange={e => setTalentAvailability(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
                >
                  <option value="">Any</option>
                  {AVAILABILITY_OPTIONS.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Work Type */}
              <div className="min-w-[140px]">
                <label htmlFor="talent-worktype" className="block text-xs font-medium text-slate-400 mb-1">Work Type</label>
                <select
                  id="talent-worktype"
                  value={talentWorkType}
                  onChange={e => setTalentWorkType(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
                >
                  <option value="">All Types</option>
                  {WORK_TYPES.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              {/* Remote Only */}
              <div className="flex items-center gap-2 pb-0.5">
                <input
                  id="talent-remote"
                  type="checkbox"
                  checked={talentRemoteOnly}
                  onChange={() => setTalentRemoteOnly(!talentRemoteOnly)}
                  className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08]"
                />
                <label htmlFor="talent-remote" className="text-sm text-slate-300 cursor-pointer">Remote Only</label>
              </div>

              {/* Clear */}
              {hasTalentFilters && (
                <button
                  onClick={clearTalentFilters}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors min-h-[36px]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {workersLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/[0.2] border-t-white rounded-full animate-spin" />
            </div>
          ) : workers.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Talent Found"
              message={hasTalentFilters ? 'Try adjusting your filters to see more results.' : 'No worker profiles available yet. Be the first to create one!'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workers.map(profile => (
                <WorkerProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MY PROFILE TAB                         */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'my-profile' && (
        <div>
          {profileLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/[0.2] border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* ── Worker Profile Form ── */}
              <div className="card bg-white/[0.04] border border-white/[0.06] p-6">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {hasWorkerProfile ? 'Edit Your Profile' : 'Create Your Profile'}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {hasWorkerProfile
                    ? 'Update your profile details below.'
                    : 'Create a profile so employers can find you for gig opportunities.'}
                </p>

                <form onSubmit={handleSaveWorkerProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Display Name" name="wp-displayName" required
                      value={workerForm.displayName}
                      onChange={e => setWorkerForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Jane Doe"
                    />
                    <FormInput
                      label="Headline" name="wp-headline" required
                      value={workerForm.headline}
                      onChange={e => setWorkerForm(prev => ({ ...prev, headline: e.target.value }))}
                      placeholder="Senior Orbital Mechanics Engineer"
                    />
                  </div>

                  <FormTextarea
                    label="Bio" name="wp-bio" rows={4}
                    value={workerForm.bio}
                    onChange={e => setWorkerForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Describe your experience, interests, and what kind of work you're looking for..."
                  />

                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Skills</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToProfile(); } }}
                        placeholder="Type a skill and press Enter..."
                        className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] transition-colors"
                        list="common-skills-list"
                      />
                      <button
                        type="button"
                        onClick={addSkillToProfile}
                        className="px-3 py-2 bg-white/[0.08] border border-white/[0.08] rounded text-white text-sm hover:bg-white/[0.12] transition-colors"
                      >
                        Add
                      </button>
                      <datalist id="common-skills-list">
                        {COMMON_SKILLS.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    {workerForm.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {workerForm.skills.map(skill => (
                          <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-300 border border-white/[0.04]">
                            {skill}
                            <button type="button" onClick={() => removeSkillFromProfile(skill)} className="text-slate-500 hover:text-white ml-0.5">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Experience (years)" name="wp-experience" type="number"
                      value={workerForm.experienceYears}
                      onChange={e => setWorkerForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                      placeholder="5"
                    />
                    <FormInput
                      label="Hourly Rate ($)" name="wp-rate" type="number"
                      value={workerForm.hourlyRate}
                      onChange={e => setWorkerForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="150"
                    />
                    <FormSelect
                      label="Availability" name="wp-availability"
                      value={workerForm.availability}
                      onChange={e => setWorkerForm(prev => ({ ...prev, availability: e.target.value as Availability }))}
                      options={AVAILABILITY_OPTIONS.map(a => ({ value: a.value, label: a.label }))}
                      includeEmpty={false}
                    />
                  </div>

                  {/* Work Types */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Work Types</label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_TYPES.map(wt => (
                        <button
                          key={wt.value}
                          type="button"
                          onClick={() => toggleWorkType(wt.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                            workerForm.workTypes.includes(wt.value)
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                          }`}
                        >
                          {wt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="LinkedIn URL" name="wp-linkedin"
                      value={workerForm.linkedInUrl}
                      onChange={e => setWorkerForm(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                    />
                    <FormInput
                      label="Portfolio URL" name="wp-portfolio"
                      value={workerForm.portfolioUrl}
                      onChange={e => setWorkerForm(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                      placeholder="https://myportfolio.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Location" name="wp-location"
                      value={workerForm.location}
                      onChange={e => setWorkerForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Washington, DC"
                    />
                    <FormSelect
                      label="Clearance Level" name="wp-clearance"
                      value={workerForm.clearanceLevel}
                      onChange={e => setWorkerForm(prev => ({ ...prev, clearanceLevel: e.target.value as ClearanceLevel }))}
                      options={CLEARANCE_OPTIONS}
                      includeEmpty={false}
                    />
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={workerForm.remoteOk}
                          onChange={() => setWorkerForm(prev => ({ ...prev, remoteOk: !prev.remoteOk }))}
                          className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08]"
                        />
                        <span className="text-sm text-slate-300">Open to remote work</span>
                      </label>
                    </div>
                  </div>

                  {profileMessage && (
                    <div className={`text-sm font-medium ${profileMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                      {profileMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors min-h-[44px]"
                  >
                    {profileSaving ? 'Saving...' : hasWorkerProfile ? 'Update Profile' : 'Create Profile'}
                  </button>
                </form>
              </div>

              {/* ── Employer Registration ── */}
              {!isEmployer && (
                <div className="card bg-white/[0.04] border border-white/[0.06] p-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Register as Employer</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Register your company to post gig opportunities and find talent.
                  </p>

                  <form onSubmit={handleSaveEmployerProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Company Name" name="emp-name" required
                        value={employerForm.companyName}
                        onChange={e => setEmployerForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Rocket Labs Inc."
                      />
                      <FormInput
                        label="Website" name="emp-website"
                        value={employerForm.website}
                        onChange={e => setEmployerForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://rocketlabs.com"
                      />
                    </div>

                    <FormTextarea
                      label="Description" name="emp-desc" rows={3}
                      value={employerForm.description}
                      onChange={e => setEmployerForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your company..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Industry" name="emp-industry"
                        value={employerForm.industry}
                        onChange={e => setEmployerForm(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="Launch Services"
                      />
                      <FormSelect
                        label="Company Size" name="emp-size"
                        value={employerForm.size}
                        onChange={e => setEmployerForm(prev => ({ ...prev, size: e.target.value }))}
                        options={[
                          { value: '1-10', label: '1-10' },
                          { value: '11-50', label: '11-50' },
                          { value: '51-200', label: '51-200' },
                          { value: '201-500', label: '201-500' },
                          { value: '501-1000', label: '501-1000' },
                          { value: '1000+', label: '1000+' },
                        ]}
                      />
                      <FormInput
                        label="Location" name="emp-location"
                        value={employerForm.location}
                        onChange={e => setEmployerForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Hawthorne, CA"
                      />
                    </div>

                    {employerMessage && (
                      <div className={`text-sm font-medium ${employerMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                        {employerMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={employerSaving}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors min-h-[44px]"
                    >
                      {employerSaving ? 'Saving...' : 'Register as Employer'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Employer Profile (if registered) ── */}
              {isEmployer && (
                <div className="card bg-white/[0.04] border border-white/[0.06] p-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Your Employer Profile</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {employerForm.companyName || 'Your company'} &mdash; registered employer
                  </p>

                  <form onSubmit={handleSaveEmployerProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Company Name" name="emp-name" required
                        value={employerForm.companyName}
                        onChange={e => setEmployerForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Rocket Labs Inc."
                      />
                      <FormInput
                        label="Website" name="emp-website"
                        value={employerForm.website}
                        onChange={e => setEmployerForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://rocketlabs.com"
                      />
                    </div>

                    <FormTextarea
                      label="Description" name="emp-desc" rows={3}
                      value={employerForm.description}
                      onChange={e => setEmployerForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your company..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Industry" name="emp-industry"
                        value={employerForm.industry}
                        onChange={e => setEmployerForm(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="Launch Services"
                      />
                      <FormSelect
                        label="Company Size" name="emp-size"
                        value={employerForm.size}
                        onChange={e => setEmployerForm(prev => ({ ...prev, size: e.target.value }))}
                        options={[
                          { value: '1-10', label: '1-10' },
                          { value: '11-50', label: '11-50' },
                          { value: '51-200', label: '51-200' },
                          { value: '201-500', label: '201-500' },
                          { value: '501-1000', label: '501-1000' },
                          { value: '1000+', label: '1000+' },
                        ]}
                      />
                      <FormInput
                        label="Location" name="emp-location"
                        value={employerForm.location}
                        onChange={e => setEmployerForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Hawthorne, CA"
                      />
                    </div>

                    {employerMessage && (
                      <div className={`text-sm font-medium ${employerMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                        {employerMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={employerSaving}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors min-h-[44px]"
                    >
                      {employerSaving ? 'Saving...' : 'Update Employer Profile'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Post a Gig (employers only) ── */}
              {isEmployer && (
                <div className="card bg-white/[0.04] border border-white/[0.06] p-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Post a Gig</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Create a new gig opportunity for the space workforce.
                  </p>

                  <form onSubmit={handlePostGig} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Gig Title" name="gig-title" required
                        value={gigForm.title}
                        onChange={e => setGigForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Orbital Mechanics Consultant"
                      />
                      <FormSelect
                        label="Category" name="gig-category" required
                        value={gigForm.category}
                        onChange={e => setGigForm(prev => ({ ...prev, category: e.target.value as GigCategory }))}
                        options={GIG_CATEGORIES}
                      />
                    </div>

                    <FormTextarea
                      label="Description" name="gig-desc" rows={4} required
                      value={gigForm.description}
                      onChange={e => setGigForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the gig, requirements, and deliverables..."
                    />

                    {/* Skills */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Required Skills</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={gigSkillInput}
                          onChange={e => setGigSkillInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToGig(); } }}
                          placeholder="Type a skill and press Enter..."
                          className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/[0.2] transition-colors"
                          list="gig-skills-list"
                        />
                        <button
                          type="button"
                          onClick={addSkillToGig}
                          className="px-3 py-2 bg-white/[0.08] border border-white/[0.08] rounded text-white text-sm hover:bg-white/[0.12] transition-colors"
                        >
                          Add
                        </button>
                        <datalist id="gig-skills-list">
                          {COMMON_SKILLS.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </div>
                      {gigForm.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {gigForm.skills.map(skill => (
                            <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-white/[0.06] text-slate-300 border border-white/[0.04]">
                              {skill}
                              <button type="button" onClick={() => removeSkillFromGig(skill)} className="text-slate-500 hover:text-white ml-0.5">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormSelect
                        label="Work Type" name="gig-worktype" required
                        value={gigForm.workType}
                        onChange={e => setGigForm(prev => ({ ...prev, workType: e.target.value as GigWorkType }))}
                        options={WORK_TYPES}
                      />
                      <FormInput
                        label="Duration" name="gig-duration"
                        value={gigForm.duration}
                        onChange={e => setGigForm(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="3 months"
                      />
                      <FormInput
                        label="Hours/Week" name="gig-hours" type="number"
                        value={gigForm.hoursPerWeek}
                        onChange={e => setGigForm(prev => ({ ...prev, hoursPerWeek: e.target.value }))}
                        placeholder="20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Budget Min ($)" name="gig-budgetmin" type="number"
                        value={gigForm.budgetMin}
                        onChange={e => setGigForm(prev => ({ ...prev, budgetMin: e.target.value }))}
                        placeholder="100"
                      />
                      <FormInput
                        label="Budget Max ($)" name="gig-budgetmax" type="number"
                        value={gigForm.budgetMax}
                        onChange={e => setGigForm(prev => ({ ...prev, budgetMax: e.target.value }))}
                        placeholder="200"
                      />
                      <FormSelect
                        label="Budget Type" name="gig-budgettype"
                        value={gigForm.budgetType}
                        onChange={e => setGigForm(prev => ({ ...prev, budgetType: e.target.value as BudgetType }))}
                        options={[
                          { value: 'hourly', label: 'Hourly' },
                          { value: 'fixed', label: 'Fixed Price' },
                          { value: 'monthly', label: 'Monthly' },
                        ]}
                        includeEmpty={false}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Location" name="gig-location"
                        value={gigForm.location}
                        onChange={e => setGigForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Remote / Hawthorne, CA"
                      />
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gigForm.remoteOk}
                            onChange={() => setGigForm(prev => ({ ...prev, remoteOk: !prev.remoteOk }))}
                            className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08]"
                          />
                          <span className="text-sm text-slate-300">Remote OK</span>
                        </label>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gigForm.clearanceRequired}
                            onChange={() => setGigForm(prev => ({ ...prev, clearanceRequired: !prev.clearanceRequired }))}
                            className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08]"
                          />
                          <span className="text-sm text-slate-300">Clearance Required</span>
                        </label>
                      </div>
                    </div>

                    {gigPostMessage && (
                      <div className={`text-sm font-medium ${gigPostMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                        {gigPostMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={gigPosting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors min-h-[44px]"
                    >
                      {gigPosting ? 'Posting...' : 'Post Gig'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── My Posted Gigs ── */}
              {isEmployer && myGigs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Your Posted Gigs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myGigs.map(gig => (
                      <GigCard key={gig.id} gig={gig} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
