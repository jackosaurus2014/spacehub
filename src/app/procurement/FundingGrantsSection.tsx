'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatMoney } from '@/lib/format-number';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types (mirrors the retired /funding-opportunities page)
// ────────────────────────────────────────

interface FundingOpportunity {
  id: string;
  title: string;
  description: string | null;
  agency: string;
  program: string | null;
  fundingType: string;
  amountMin: number | null;
  amountMax: number | null;
  deadline: string | null;
  status: string;
  eligibility: string[];
  setAside: string | null;
  categories: string[];
  applicationUrl: string | null;
  source: string;
  stateIncentive: boolean;
  state: string | null;
  recurring: boolean;
  solicitationNumber: string | null;
}

interface FundingStats {
  total: number;
  open: number;
  byAgency: { agency: string; count: number }[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'rolling', label: 'Rolling' },
  { value: 'all', label: 'All Statuses' },
];

const AGENCY_OPTIONS = [
  { value: '', label: 'All Agencies' },
  { value: 'NASA', label: 'NASA' },
  { value: 'DARPA', label: 'DARPA' },
  { value: 'NSF', label: 'NSF' },
  { value: 'Space Force', label: 'US Space Force' },
  { value: 'ESA', label: 'ESA' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  propulsion: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  earth_observation: { bg: 'bg-green-500/20', text: 'text-green-400' },
  communications: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  launch: { bg: 'bg-red-500/20', text: 'text-red-400' },
  in_space: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  defense: { bg: 'bg-slate-500/20', text: 'text-white/70' },
  lunar: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  debris: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  exploration: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  navigation: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  earth_science: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  general: { bg: 'bg-white/10', text: 'text-white/70' },
};

const AGENCY_ICONS: Record<string, string> = {
  NASA: '🚀',
  DARPA: '🛡️',
  NSF: '🔬',
  DOE: '⚡',
  'US Space Force': '⭐',
  ESA: '🇪🇺',
  'Space Florida': '🌴',
};

// ────────────────────────────────────────
// Helpers (ported from the retired /funding-opportunities page, unchanged
// so the days-remaining/closed badge behavior is preserved)
// ────────────────────────────────────────

function formatAmountRange(min: number | null, max: number | null): string {
  if (min && max) return `${formatMoney(min)} - ${formatMoney(max)}`;
  if (max) return `Up to ${formatMoney(max)}`;
  if (min) return `From ${formatMoney(min)}`;
  return 'Varies';
}

function getDeadlineInfo(deadline: string | null, status: string): { text: string; urgency: 'critical' | 'warning' | 'normal' | 'none' } {
  if (status === 'rolling') return { text: 'Rolling Deadline', urgency: 'none' };
  if (!deadline) return { text: 'No deadline listed', urgency: 'none' };

  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Closed', urgency: 'none' };
  if (diffDays === 0) return { text: 'Closes today!', urgency: 'critical' };
  if (diffDays === 1) return { text: 'Closes tomorrow!', urgency: 'critical' };
  if (diffDays <= 7) return { text: `${diffDays} days left`, urgency: 'critical' };
  if (diffDays <= 30) return { text: `${diffDays} days left`, urgency: 'warning' };
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), urgency: 'normal' };
}

// Credibility guard: a row whose deadline has passed reads as "Closed"
// regardless of the raw status column (rolling/no-deadline rows unaffected).
function getEffectiveStatus(status: string, deadline: string | null): string {
  if (status === 'rolling' || status === 'closed' || !deadline) return status;
  return new Date(deadline) < new Date() ? 'closed' : status;
}

function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'OPEN' },
    upcoming: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'UPCOMING' },
    rolling: { bg: 'bg-white/10', text: 'text-white/70', label: 'ROLLING' },
    closed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'CLOSED' },
  };
  const style = styles[status] || styles.closed;
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>{style.label}</span>
  );
}

function getCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    grant: 'Grant',
    contract: 'Contract',
    cooperative_agreement: 'Cooperative Agreement',
    sbir: 'SBIR',
    sttr: 'STTR',
    prize: 'Prize Competition',
  };
  return map[type] || type;
}

function getAgencyIcon(agency: string): string {
  for (const [key, icon] of Object.entries(AGENCY_ICONS)) {
    if (agency.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '🏛️';
}

// ────────────────────────────────────────
// Card
// ────────────────────────────────────────

function FundingCard({ opp }: { opp: FundingOpportunity }) {
  const effectiveStatus = getEffectiveStatus(opp.status, opp.deadline);
  const deadlineInfo = getDeadlineInfo(opp.deadline, effectiveStatus);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4 mb-3 relative overflow-hidden">
      {deadlineInfo.urgency === 'critical' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
      )}
      {deadlineInfo.urgency === 'warning' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-yellow-400" />
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">{getAgencyIcon(opp.agency)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm leading-tight">{opp.title}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-medium text-white/70">{opp.agency}</span>
              {opp.program && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="truncate">{opp.program}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">{getStatusBadge(effectiveStatus)}</div>
      </div>

      {opp.description && (
        <p className={`text-xs text-slate-400 mb-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {opp.description}
        </p>
      )}
      {opp.description && opp.description.length > 150 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-white/70 hover:text-white mb-2">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white/[0.04] rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Award Range</div>
          <div className="text-sm font-semibold text-emerald-400">{formatAmountRange(opp.amountMin, opp.amountMax)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Deadline</div>
          <div
            className={`text-sm font-semibold ${
              deadlineInfo.urgency === 'critical' ? 'text-red-400' : deadlineInfo.urgency === 'warning' ? 'text-yellow-400' : 'text-white/70'
            }`}
          >
            {deadlineInfo.text}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {opp.categories.slice(0, 4).map((cat) => {
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
          return (
            <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border border-white/[0.06]`}>
              {getCategoryLabel(cat)}
            </span>
          );
        })}
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
          {getTypeLabel(opp.fundingType)}
        </span>
        {opp.stateIncentive && opp.state && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {opp.state} State
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Source: {opp.source}</span>
          {opp.recurring && <span className="text-white/70 font-medium">Recurring</span>}
        </div>
        {opp.applicationUrl && (
          <a
            href={opp.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/[0.15] transition-colors border border-white/10"
          >
            Apply →
          </a>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Section
// ────────────────────────────────────────

export default function FundingGrantsSection() {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [stats, setStats] = useState<FundingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');
  const [agency, setAgency] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const fetchOpportunities = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (agency) params.set('agency', agency);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    fetch(`/api/funding-opportunities?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setOpportunities(data.opportunities || []);
        setTotal(data.pagination?.total || 0);
      })
      .catch(() => setOpportunities([]))
      .finally(() => setLoading(false));
  }, [status, agency, offset]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetch('/api/funding-opportunities/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [status, agency]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>💰</span> Grants & Funding Opportunities
        </h2>
        {stats && (
          <span className="text-xs text-slate-400">
            {stats.open} open of {stats.total} tracked · Grants.gov, SAM.gov, SBIR.gov, NASA NSPIRES, state incentives
          </span>
        )}
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            aria-label="Filter grants by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            aria-label="Filter grants by agency"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          >
            {AGENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : opportunities.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Grants Found</h3>
          <p className="text-slate-400 text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunities.map((opp) => (
              <StaggerItem key={opp.id}>
                <FundingCard opp={opp} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-sm border border-white/[0.06] hover:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-400 text-sm">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-sm border border-white/[0.06] hover:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
