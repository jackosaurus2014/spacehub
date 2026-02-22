'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import WatchButton from '@/components/watchlist/WatchButton';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import OrganizationProfileSchema from '@/components/seo/OrganizationProfileSchema';
import { toast } from '@/lib/toast';
import SponsorBadge from '@/components/company/SponsorBadge';
import SponsorBanner from '@/components/company/SponsorBanner';
import LeadCaptureForm from '@/components/company/LeadCaptureForm';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FundingRound {
  id: string; date: string; amount: number | null; seriesLabel: string | null;
  roundType: string | null; leadInvestor: string | null; investors: string[];
  postValuation: number | null; source: string | null;
}
interface RevenueEstimate {
  id: string; year: number; quarter: number | null; revenue: number | null;
  revenueRange: string | null; source: string | null; confidenceLevel: string;
}
interface Product {
  id: string; name: string; category: string | null; description: string | null;
  status: string; specs: Record<string, unknown> | null;
}
interface Person {
  id: string; name: string; title: string; role: string | null;
  linkedinUrl: string | null; bio: string | null; previousCompanies: string[];
}
interface Contract {
  id: string; agency: string; title: string; description: string | null;
  awardDate: string | null; value: number | null; ceiling: number | null;
  type: string | null;
}
interface CompanyEvent {
  id: string; date: string; type: string; title: string;
  description: string | null; importance: number;
}
interface Satellite {
  id: string; satelliteName: string; orbitType: string | null; status: string;
  missionType: string | null; launchDate: string | null; constellation: string | null;
}
interface Facility {
  id: string; name: string; type: string; city: string | null;
  country: string; description: string | null;
}
interface Acquisition {
  id: string; targetName: string; date: string | null; price: number | null;
  dealType: string | null; status: string;
}
interface Partnership {
  id: string; partnerName: string; type: string | null;
  description: string | null; announcedDate: string | null;
}
interface Score {
  id: string; scoreType: string; score: number; breakdown: Record<string, unknown> | null;
}
interface Competitor {
  id: string; slug: string; name: string; logoUrl: string | null; sector: string | null;
}

interface CompanyDetail {
  id: string; slug: string; name: string; legalName: string | null;
  ticker: string | null; exchange: string | null; headquarters: string | null;
  country: string | null; foundedYear: number | null; employeeCount: number | null;
  employeeRange: string | null; website: string | null; description: string | null;
  longDescription: string | null; logoUrl: string | null; ceo: string | null;
  cto: string | null; linkedinUrl: string | null; twitterUrl: string | null;
  isPublic: boolean; marketCap: number | null; stockPrice: number | null;
  status: string; sector: string | null; subsector: string | null;
  tags: string[]; tier: number; totalFunding: number | null;
  lastFundingRound: string | null; valuation: number | null;
  revenueEstimate: number | null; ownershipType: string | null;
  parentCompany: string | null; dataCompleteness: number;
  sponsorTier: string | null;
  sponsorTagline: string | null;
  sponsorBanner: string | null;
  fundingRounds: FundingRound[]; revenueEstimates: RevenueEstimate[];
  products: Product[]; keyPersonnel: Person[];
  acquisitions: Acquisition[]; partnerships: Partnership[];
  contracts: Contract[]; events: CompanyEvent[];
  satelliteAssets: Satellite[]; facilities: Facility[];
  scores: Score[];
  summary: {
    totalContractValue: number; activeSatellites: number;
    totalSatellites: number; totalFundingRounds: number;
    totalProducts: number; totalPersonnel: number;
    totalFacilities: number; totalEvents: number;
    competitors: Competitor[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number | null, opts?: { compact?: boolean }): string {
  if (!value) return '—';
  if (opts?.compact !== false) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getSectorIcon(s: string | null): string {
  const m: Record<string, string> = {
    launch: '🚀', satellite: '🛰️', defense: '🛡️', infrastructure: '🏗️',
    'ground-segment': '📡', manufacturing: '⚙️', analytics: '📊',
    agency: '🏛️', exploration: '🔭',
  };
  return m[s || ''] || '🏢';
}

function getEventIcon(type: string): string {
  const m: Record<string, string> = {
    founding: '🏁', first_launch: '🚀', ipo: '📈', acquisition: '🤝',
    contract_win: '📜', milestone: '⭐', product_launch: '🎯',
    funding: '💰', partnership: '🔗', regulatory: '⚖️',
  };
  return m[type] || '📌';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-cyan-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-cyan-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

// ─── Marketplace Actions ─────────────────────────────────────────────────────

function MarketplaceActions({ companySlug, companyId, companyName, verificationLevel, contactEmail: initialContactEmail }: { companySlug: string; companyId: string; companyName: string; verificationLevel?: string | null; contactEmail?: string | null }) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(!!verificationLevel);
  const [claimEmail, setClaimEmail] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [verLevel, setVerLevel] = useState<string | null>(verificationLevel || null);
  const [contactEmail, setContactEmail] = useState<string | null>(initialContactEmail || null);

  const handleClaim = async () => {
    if (!claimEmail) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/company-profiles/${companySlug}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactEmail: claimEmail }),
      });
      if (res.ok) {
        setClaimed(true);
        setVerLevel('identity');
        setShowClaimForm(false);
        toast.success('Profile claimed successfully! Verification pending.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to claim profile');
      }
    } catch {
      toast.error('Failed to claim profile. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/30 flex flex-wrap items-center gap-3">
      {claimed && verLevel && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          verLevel === 'performance' ? 'bg-yellow-500/20 text-yellow-400' :
          verLevel === 'capability' ? 'bg-green-500/20 text-green-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {verLevel === 'performance' ? '★ Performance Verified' :
           verLevel === 'capability' ? '✓✓ Capability Verified' :
           '✓ Identity Verified'}
        </span>
      )}
      {claimed && contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
        >
          Contact Provider
        </a>
      )}
      <Link href={`/marketplace/search?category=&companyId=${companyId}`} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
        View Service Listings
      </Link>
      <Link href={`/space-talent?tab=jobs&search=${encodeURIComponent(companyName)}`} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
        Jobs at {companyName}
      </Link>
      <WatchButton companyProfileId={companyId} companyName={companyName} size="md" />
      <Link
        href={`/compare/companies?companies=${companySlug}`}
        className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Compare
      </Link>
      {!claimed && !showClaimForm && (
        <button
          onClick={() => setShowClaimForm(true)}
          className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all"
        >
          Claim This Profile
        </button>
      )}
      {showClaimForm && !claimed && (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={claimEmail}
            onChange={(e) => setClaimEmail(e.target.value)}
            placeholder="Your business email"
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white w-48"
          />
          <button
            onClick={handleClaim}
            disabled={claiming || !claimEmail}
            className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            {claiming ? 'Claiming...' : 'Confirm'}
          </button>
          <button
            onClick={() => setShowClaimForm(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'financials', label: 'Financials', icon: '💰' },
  { id: 'products', label: 'Products', icon: '🎯' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'contracts', label: 'Contracts', icon: '📜' },
  { id: 'space-assets', label: 'Space Assets', icon: '🛰️' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'digest', label: 'Weekly Digest', icon: '📊' },
  { id: 'relationships', label: 'Relationships', icon: '🔗' },
  { id: 'contact', label: 'Contact', icon: '✉️' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Sub-Components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, color = 'text-white' }: {
  label: string; value: string; icon: string; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4"
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </motion.div>
  );
}

function ScoreRing({ score, label, size = 64 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgb(30 41 59 / 0.5)" strokeWidth="4" />
          <motion.circle
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
      </div>
      <span className="text-[10px] text-slate-500 capitalize">{label}</span>
    </div>
  );
}

function SectionCard({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Tab Content Components ──────────────────────────────────────────────────

function OverviewTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <SectionCard title="About">
        <p className="text-slate-300 leading-relaxed whitespace-pre-line">
          {company.longDescription || company.description || 'No description available.'}
        </p>
      </SectionCard>

      {/* Scores */}
      {company.scores.length > 0 && (
        <SectionCard title="SpaceNexus Intelligence Scores">
          <div className="flex flex-wrap gap-6 justify-center py-2">
            {company.scores.map(s => (
              <ScoreRing key={s.id} score={s.score} label={s.scoreType.replace('_', ' ')} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Quick Facts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Company Info">
          <div className="space-y-2 text-sm">
            {[
              ['Founded', company.foundedYear?.toString()],
              ['Headquarters', company.headquarters],
              ['Country', company.country],
              ['Employees', company.employeeRange || company.employeeCount?.toLocaleString()],
              ['Status', company.status],
              ['Ownership', company.ownershipType],
              ['Parent', company.parentCompany],
              ['Sector', company.sector],
              ['Subsector', company.subsector],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Financial Snapshot">
          <div className="space-y-2 text-sm">
            {([
              ['Total Funding', fmt(company.totalFunding)],
              ['Last Round', company.lastFundingRound],
              ['Valuation', fmt(company.valuation)],
              ['Revenue (Est.)', fmt(company.revenueEstimate)],
              company.isPublic ? ['Market Cap', fmt(company.marketCap)] : null,
              company.isPublic && company.ticker ? ['Ticker', `${company.ticker} (${company.exchange || 'N/A'})`] : null,
              company.isPublic ? ['Stock Price', company.stockPrice ? `$${company.stockPrice.toFixed(2)}` : null] : null,
            ] as (string[] | null)[]).filter((row): row is string[] => row !== null && row[1] != null && row[1] !== '—').map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Products Preview */}
      {company.products.length > 0 && (
        <SectionCard title="Key Products" count={company.products.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {company.products.slice(0, 4).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    p.status === 'development' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-600/20 text-slate-400'
                  }`}>{p.status}</span>
                  <span className="text-xs text-slate-500">{p.category}</span>
                </div>
                <h4 className="font-medium text-white text-sm">{p.name}</h4>
                {p.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                )}
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Facilities */}
      {company.facilities.length > 0 && (
        <SectionCard title="Facilities" count={company.facilities.length}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {company.facilities.map(f => (
              <div key={f.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                <div className="text-xs text-cyan-400 mb-1 capitalize">{f.type.replace(/_/g, ' ')}</div>
                <div className="text-sm font-medium text-white">{f.name}</div>
                <div className="text-xs text-slate-400">{[f.city, f.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function FinancialsTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      {/* Funding Rounds */}
      <SectionCard title="Funding History" count={company.fundingRounds.length}>
        {company.fundingRounds.length === 0 ? (
          <p className="text-slate-500 text-sm">No funding rounds recorded.</p>
        ) : (
          <div className="space-y-3">
            {/* Cumulative funding bar */}
            <div className="flex gap-1 h-8 mb-4">
              {company.fundingRounds.slice().reverse().map((r, i) => {
                const total = company.totalFunding || 1;
                const pct = ((r.amount || 0) / total) * 100;
                const colors = ['bg-cyan-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-blue-500', 'bg-pink-500', 'bg-indigo-500'];
                return (
                  <motion.div
                    key={r.id}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, 3)}%` }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className={`${colors[i % colors.length]} rounded-sm relative group cursor-pointer`}
                    title={`${r.seriesLabel || r.roundType}: ${fmt(r.amount)}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                      {r.seriesLabel || r.roundType}: {fmt(r.amount)}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Rounds table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Round</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Lead Investor</th>
                    <th className="pb-2 font-medium text-right">Post-Val</th>
                  </tr>
                </thead>
                <tbody>
                  {company.fundingRounds.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-slate-800/50"
                    >
                      <td className="py-2.5 text-slate-400">{fmtDate(r.date)}</td>
                      <td className="py-2.5">
                        <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-xs">
                          {r.seriesLabel || r.roundType || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-400">{fmt(r.amount)}</td>
                      <td className="py-2.5 text-slate-300">{r.leadInvestor || '—'}</td>
                      <td className="py-2.5 text-right text-purple-400">{fmt(r.postValuation)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Revenue Estimates */}
      {company.revenueEstimates.length > 0 && (
        <SectionCard title="Revenue Estimates" count={company.revenueEstimates.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {company.revenueEstimates.map(r => (
                  <tr key={r.id} className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-300">{r.year}{r.quarter ? ` Q${r.quarter}` : ''}</td>
                    <td className="py-2.5 text-right font-semibold text-blue-400">
                      {r.revenue ? fmt(r.revenue) : r.revenueRange || '—'}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.confidenceLevel === 'reported' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.confidenceLevel === 'estimate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{r.confidenceLevel}</span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{r.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

const SPEC_LABELS: Record<string, string> = {
  payload_leo_kg: 'Payload (LEO)',
  payload_gto_kg: 'Payload (GTO)',
  payload_sso_kg: 'Payload (SSO)',
  payload_tli_kg: 'Payload (TLI)',
  height_m: 'Height',
  diameter_m: 'Diameter',
  mass_kg: 'Mass',
  stages: 'Stages',
  reusable: 'Reusable',
  satellites_deployed: 'Satellites',
  orbit_km: 'Orbit',
  users_millions: 'Users',
  cost_millions: 'Cost',
  cost_per_kg_leo: 'Cost/kg (LEO)',
};

function formatSpecLabel(key: string): string {
  return SPEC_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSpecValue(key: string, val: unknown): string {
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (key.includes('_kg')) return `${num.toLocaleString()} kg`;
  if (key.includes('_m') && !key.includes('_millions')) return `${num.toLocaleString()} m`;
  if (key.includes('_km')) return `${num.toLocaleString()} km`;
  if (key.includes('millions') || key.includes('cost')) return `$${num.toLocaleString()}M`;
  if (key.includes('per_kg')) return `$${num.toLocaleString()}/kg`;
  return num.toLocaleString();
}

function ProductsTab({ company }: { company: CompanyDetail }) {
  return (
    <SectionCard title="Products & Services" count={company.products.length}>
      {company.products.length === 0 ? (
        <p className="text-slate-500 text-sm">No products recorded.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {company.products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-5 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white text-lg">{p.name}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                  p.status === 'development' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-600/20 text-slate-400'
                }`}>{p.status.toUpperCase()}</span>
              </div>
              {p.category && (
                <div className="text-xs text-cyan-400 mb-3 capitalize">{p.category.replace(/_/g, ' ')}</div>
              )}
              {p.description && (
                <p className="text-sm text-slate-400 leading-relaxed mb-3">{p.description}</p>
              )}
              {p.specs && Object.keys(p.specs).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    {Object.entries(p.specs).map(([key, val]) => (
                      <div key={key}>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{formatSpecLabel(key)}</div>
                        <div className="text-sm font-semibold text-white">{formatSpecValue(key, val)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {p.category === 'launch_vehicle' && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <Link
                    href="/launch-vehicles"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>View full specs in Launch Vehicles</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function PeopleTab({ company }: { company: CompanyDetail }) {
  return (
    <SectionCard title="Key Personnel" count={company.keyPersonnel.length}>
      {company.keyPersonnel.length === 0 ? (
        <p className="text-slate-500 text-sm">No personnel recorded.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {company.keyPersonnel.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-white text-sm">{p.name}</h4>
                  <div className="text-xs text-cyan-400">{p.title}</div>
                  {p.role && <div className="text-[10px] text-slate-500 capitalize mt-0.5">{p.role}</div>}
                </div>
              </div>
              {p.bio && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed">{p.bio}</p>
              )}
              {p.previousCompanies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.previousCompanies.slice(0, 3).map(c => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">{c}</span>
                  ))}
                </div>
              )}
              {p.linkedinUrl && (
                <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                  LinkedIn →
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ContractsTab({ company }: { company: CompanyDetail }) {
  return (
    <SectionCard title="Government Contracts" count={company.contracts.length}>
      {company.contracts.length === 0 ? (
        <p className="text-slate-500 text-sm">No government contracts recorded.</p>
      ) : (
        <div className="space-y-3">
          {company.contracts.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 mr-2">
                    {c.agency}
                  </span>
                  <span className="text-xs text-slate-500">{fmtDate(c.awardDate)}</span>
                </div>
                <div className="text-right">
                  {c.value && <div className="font-semibold text-emerald-400">{fmt(c.value)}</div>}
                  {c.ceiling && c.ceiling !== c.value && (
                    <div className="text-xs text-slate-500">Ceiling: {fmt(c.ceiling)}</div>
                  )}
                </div>
              </div>
              <h4 className="font-medium text-white text-sm mt-2">{c.title}</h4>
              {c.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SpaceAssetsTab({ company }: { company: CompanyDetail }) {
  const active = company.satelliteAssets.filter(s => s.status === 'active');
  const byOrbit = active.reduce((acc, s) => {
    const o = s.orbitType || 'Unknown';
    acc[o] = (acc[o] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Orbit Summary */}
      {Object.keys(byOrbit).length > 0 && (
        <SectionCard title="Orbital Assets Summary">
          <div className="flex flex-wrap gap-4">
            {Object.entries(byOrbit).map(([orbit, count]) => (
              <div key={orbit} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-cyan-400">{count}</div>
                <div className="text-xs text-slate-500">{orbit}</div>
              </div>
            ))}
            <div className="bg-slate-800/30 border border-cyan-500/30 rounded-lg p-3 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-white">{company.summary.totalSatellites}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Satellite Fleet" count={company.satelliteAssets.length}>
        {company.satelliteAssets.length === 0 ? (
          <p className="text-slate-500 text-sm">No satellite assets recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
                  <th className="pb-2 font-medium">Satellite</th>
                  <th className="pb-2 font-medium">Orbit</th>
                  <th className="pb-2 font-medium">Mission</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Constellation</th>
                  <th className="pb-2 font-medium">Launch</th>
                </tr>
              </thead>
              <tbody>
                {company.satelliteAssets.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-slate-800/50">
                    <td className="py-2 text-white">{s.satelliteName}</td>
                    <td className="py-2 text-cyan-400 text-xs">{s.orbitType || '—'}</td>
                    <td className="py-2 text-slate-400 text-xs capitalize">{s.missionType?.replace(/-/g, ' ') || '—'}</td>
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        s.status === 'planned' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-600/20 text-slate-400'
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-2 text-slate-400 text-xs">{s.constellation || '—'}</td>
                    <td className="py-2 text-slate-500 text-xs">{fmtDate(s.launchDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {company.satelliteAssets.length > 50 && (
              <p className="text-xs text-slate-500 mt-2">Showing 50 of {company.satelliteAssets.length} satellites</p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TimelineTab({ company }: { company: CompanyDetail }) {
  return (
    <SectionCard title="Company Timeline" count={company.events.length}>
      {company.events.length === 0 ? (
        <p className="text-slate-500 text-sm">No timeline events recorded.</p>
      ) : (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-slate-700" />

          {company.events.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative mb-4 last:mb-0"
            >
              {/* Dot */}
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-cyan-500 z-10" />

              <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 hover:border-cyan-500/20 transition-colors ml-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{getEventIcon(e.type)}</span>
                  <span className="text-xs text-slate-500">{fmtDate(e.date)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 capitalize">
                    {e.type.replace(/_/g, ' ')}
                  </span>
                  {e.importance >= 8 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">HIGH IMPACT</span>
                  )}
                </div>
                <h4 className="font-medium text-white text-sm">{e.title}</h4>
                {e.description && (
                  <p className="text-xs text-slate-400 mt-1">{e.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface NewsItem {
  id: string; title: string; summary: string | null; source: string;
  category: string; url: string; publishedAt: string; imageUrl: string | null;
}

function NewsTab({ companySlug, companyName }: { companySlug: string; companyName: string }) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch(`/api/news?company=${companySlug}&limit=20`);
        const data = await res.json();
        setArticles(data.articles || []);
        setTotal(data.total || 0);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [companySlug]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  if (articles.length === 0) {
    return (
      <SectionCard title="Related News">
        <p className="text-slate-400 text-center py-8">No news articles linked to {companyName} yet. Articles are automatically tagged when news is fetched.</p>
      </SectionCard>
    );
  }

  const categoryColors: Record<string, string> = {
    launches: 'bg-orange-500/20 text-orange-300', missions: 'bg-purple-500/20 text-purple-300',
    companies: 'bg-blue-500/20 text-blue-300', satellites: 'bg-cyan-500/20 text-cyan-300',
    defense: 'bg-slate-500/20 text-slate-300', earnings: 'bg-green-500/20 text-green-300',
    mergers: 'bg-fuchsia-500/20 text-fuchsia-300', development: 'bg-yellow-500/20 text-yellow-300',
    policy: 'bg-red-500/20 text-red-300', debris: 'bg-amber-500/20 text-amber-300',
  };

  return (
    <>
      <SectionCard title={`Related News (${total})`}>
        <div className="space-y-3">
          {articles.map((article, i) => (
            <motion.a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            >
              {article.imageUrl && (
                <img src={article.imageUrl} alt={article.title} width={64} height={48} className="w-16 h-12 rounded object-cover flex-shrink-0" loading="lazy" decoding="async" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                  {article.title}
                </h4>
                {article.summary && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{article.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColors[article.category] || 'bg-slate-500/20 text-slate-300'}`}>
                    {article.category}
                  </span>
                  <span className="text-[10px] text-slate-500">{article.source}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </motion.a>
          ))}
        </div>
      </SectionCard>
      <div className="mt-4 text-center">
        <Link href="/news" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
          See all space news on SpaceNexus &rarr;
        </Link>
      </div>
    </>
  );
}

function DigestTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [digests, setDigests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDigests() {
      try {
        const res = await fetch(`/api/company-digests?companyProfileId=${companyId}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setDigests(data.digests || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDigests();
  }, [companyId]);

  if (loading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>;

  if (digests.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-slate-400 text-sm">No weekly digests available for {companyName} yet.</p>
        <p className="text-slate-500 text-xs mt-2">Digests are generated weekly for companies with recent news activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {digests.map((digest: any) => {
        let highlights: string[] = [];
        try { highlights = Array.isArray(digest.highlights) ? digest.highlights : JSON.parse(digest.highlights || '[]'); } catch {}

        return (
          <div key={digest.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">{digest.title}</h3>
              <span className="text-xs text-slate-500">
                {new Date(digest.periodStart).toLocaleDateString()} – {new Date(digest.periodEnd).toLocaleDateString()}
              </span>
            </div>
            <p className="text-slate-300 text-sm mb-4">{digest.summary}</p>

            {highlights.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Key Highlights</h4>
                <ul className="space-y-1">
                  {highlights.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">
              {digest.content}
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-700/50">
              <span>{digest.newsCount} articles analyzed</span>
              <span>Generated {new Date(digest.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RelationshipsTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      {/* Competitors */}
      {company.summary.competitors.length > 0 && (
        <SectionCard title="Competitors" count={company.summary.competitors.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {company.summary.competitors.map(c => (
              <Link key={c.id} href={`/company-profiles/${c.slug}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">
                    {c.logoUrl ? <img src={c.logoUrl} alt={`${c.name} logo`} width={20} height={20} className="w-5 h-5 rounded" loading="lazy" decoding="async" /> : getSectorIcon(c.sector)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{c.sector}</div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Acquisitions */}
      {company.acquisitions.length > 0 && (
        <SectionCard title="Acquisitions Made" count={company.acquisitions.length}>
          <div className="space-y-2">
            {company.acquisitions.map(a => (
              <div key={a.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{a.targetName}</div>
                  <div className="text-xs text-slate-500">{fmtDate(a.date)} · {a.dealType}</div>
                </div>
                {a.price && <div className="font-semibold text-emerald-400">{fmt(a.price)}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Partnerships */}
      {company.partnerships.length > 0 && (
        <SectionCard title="Partnerships" count={company.partnerships.length}>
          <div className="space-y-2">
            {company.partnerships.map(p => (
              <div key={p.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{p.partnerName}</span>
                  {p.type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 capitalize">
                      {p.type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CompanyProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch(`/api/company-profiles/${params.slug}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          // Handle both { error: "string" } and { error: { code, message } } formats
          const errMsg = typeof errData.error === 'string'
            ? errData.error
            : errData.error?.message || errData.message || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }
        const data = await res.json();
        setCompany(data);
        // Track view for sponsored profiles
        if (data.sponsorTier) {
          fetch(`/api/company-profiles/${params.slug}/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'view' }),
          }).catch(() => {}); // fire and forget
        }
      } catch (err) {
        console.error('Company profile load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load company profile');
      } finally {
        setLoading(false);
      }
    }
    if (params.slug) load();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to load data</h2>
          <p className="text-sm text-slate-400 mb-2">
            Could not load this company profile.
          </p>
          {error && (
            <p className="text-xs text-red-400/80 mb-6 font-mono bg-red-500/10 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setLoading(true); setError(null); setCompany(null); window.location.reload(); }}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/company-profiles"
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Company Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Company Profiles', href: '/company-profiles' },
        { name: company.name },
      ]} />
      <OrganizationProfileSchema
        name={company.name}
        description={company.description || `${company.name} - Space industry company profile`}
        url={`/company-profiles/${company.slug}`}
        logo={company.logoUrl || undefined}
        foundingDate={company.foundedYear ? String(company.foundedYear) : undefined}
        location={company.headquarters || undefined}
        employeeCount={company.employeeRange || (company.employeeCount ? String(company.employeeCount) : undefined)}
        industry={company.sector || undefined}
        parentOrganization={company.parentCompany || undefined}
      />
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/company-profiles" className="hover:text-slate-300 transition-colors">Company Profiles</Link>
        <span>/</span>
        <span className="text-slate-400 truncate">{company.name}</span>
      </nav>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-6 relative overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5" />

        <div className="relative z-10">
          {company.sponsorTier === 'premium' && company.sponsorBanner && (
            <div className="-mx-6 -mt-6 mb-6">
              <SponsorBanner
                companyName={company.name}
                companySlug={company.slug}
                tagline={company.sponsorTagline || undefined}
                bannerUrl={company.sponsorBanner}
              />
            </div>
          )}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Logo + Name */}
            <div className="flex items-start gap-4 flex-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl flex-shrink-0 border border-slate-600/50"
              >
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={`${company.name} logo`} width={48} height={48} className="w-12 h-12 rounded-xl object-contain" loading="lazy" decoding="async" />
                ) : (
                  getSectorIcon(company.sector)
                )}
              </motion.div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">{company.name}</h1>
                  {company.ticker && (
                    <span className="font-mono text-cyan-400 text-lg">{company.ticker}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    company.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    company.status === 'acquired' ? 'bg-amber-500/20 text-amber-400' :
                    company.status === 'pre-revenue' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-600/20 text-slate-400'
                  }`}>{company.status.toUpperCase()}</span>
                  {company.sponsorTier && (
                    <SponsorBadge tier={company.sponsorTier as 'verified' | 'premium'} />
                  )}
                </div>
                <p className="text-slate-400 mt-1 max-w-2xl line-clamp-2">{company.description}</p>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {company.headquarters && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">📍 {company.headquarters}</span>
                  )}
                  {company.foundedYear && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">📅 Founded {company.foundedYear}</span>
                  )}
                  {company.employeeRange && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">👥 {company.employeeRange} employees</span>
                  )}
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      🌐 Website →
                    </a>
                  )}
                  {company.linkedinUrl && (
                    <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">LinkedIn</a>
                  )}
                  {company.twitterUrl && (
                    <a href={company.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-300">X/Twitter</a>
                  )}
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {company.sector && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {getSectorIcon(company.sector)} {company.sector}
                    </span>
                  )}
                  {company.tags?.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:w-80">
              {company.totalFunding && (
                <MetricCard label="Total Funding" value={fmt(company.totalFunding)} icon="💰" color="text-emerald-400" />
              )}
              {company.isPublic && company.marketCap ? (
                <MetricCard label="Market Cap" value={fmt(company.marketCap)} icon="📈" color="text-blue-400" />
              ) : company.valuation ? (
                <MetricCard label="Valuation" value={fmt(company.valuation)} icon="📊" color="text-purple-400" />
              ) : null}
              {company.revenueEstimate && (
                <MetricCard label="Est. Revenue" value={fmt(company.revenueEstimate)} icon="💵" color="text-cyan-400" />
              )}
              {company.summary.activeSatellites > 0 && (
                <MetricCard label="Active Satellites" value={company.summary.activeSatellites.toString()} icon="🛰️" color="text-amber-400" />
              )}
              {company.summary.totalContractValue > 0 && (
                <MetricCard label="Contract Value" value={fmt(company.summary.totalContractValue)} icon="📜" color="text-blue-400" />
              )}
            </div>
          </div>

          {/* Data Completeness Bar */}
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Profile Completeness</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${company.dataCompleteness}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    company.dataCompleteness >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                    company.dataCompleteness >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                />
              </div>
              <span className={`text-xs font-semibold ${
                company.dataCompleteness >= 75 ? 'text-emerald-400' :
                company.dataCompleteness >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>{company.dataCompleteness}%</span>
            </div>
          </div>

          {/* Marketplace Actions */}
          <MarketplaceActions companySlug={params.slug as string} companyId={company.id} companyName={company.name} verificationLevel={(company as any).verificationLevel} contactEmail={(company as any).contactEmail} />
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator-company"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab company={company} />}
          {activeTab === 'financials' && <FinancialsTab company={company} />}
          {activeTab === 'products' && <ProductsTab company={company} />}
          {activeTab === 'people' && <PeopleTab company={company} />}
          {activeTab === 'contracts' && <ContractsTab company={company} />}
          {activeTab === 'space-assets' && <SpaceAssetsTab company={company} />}
          {activeTab === 'timeline' && <TimelineTab company={company} />}
          {activeTab === 'news' && <NewsTab companySlug={company.slug} companyName={company.name} />}
          {activeTab === 'digest' && <DigestTab companyId={company.id} companyName={company.name} />}
          {activeTab === 'relationships' && <RelationshipsTab company={company} />}
          {activeTab === 'contact' && company.sponsorTier && (
            <SectionCard title={`Contact ${company.name}`}>
              <LeadCaptureForm companySlug={company.slug} companyName={company.name} />
            </SectionCard>
          )}
          {activeTab === 'contact' && !company.sponsorTier && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-slate-400 text-sm">Direct contact is available for verified and premium sponsors.</p>
              <Link href="/company-profiles/sponsor" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block">
                Learn about sponsorship →
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
