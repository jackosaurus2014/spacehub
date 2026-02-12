'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type Tab = 'opportunities' | 'sbir' | 'budget' | 'congressional' | 'saved';

interface ProcurementOpportunity {
  id: string;
  samNoticeId: string | null;
  title: string;
  description: string | null;
  agency: string;
  subAgency: string | null;
  office: string | null;
  type: string;
  naicsCode: string | null;
  naicsDescription: string | null;
  setAside: string | null;
  classificationCode: string | null;
  estimatedValue: number | null;
  awardAmount: number | null;
  postedDate: string | null;
  responseDeadline: string | null;
  awardDate: string | null;
  placeOfPerformance: string | null;
  pointOfContact: string | null;
  contactEmail: string | null;
  solicitationNumber: string | null;
  awardee: string | null;
  samUrl: string | null;
  isActive: boolean;
  tags: string[];
}

interface SBIRSolicitation {
  id: string;
  program: string;
  agency: string;
  topicNumber: string | null;
  topicTitle: string;
  description: string | null;
  phase: string | null;
  awardAmount: number | null;
  openDate: string | null;
  closeDate: string | null;
  url: string | null;
  keywords: string[];
  isActive: boolean;
}

interface BudgetItem {
  id: string;
  agency: string;
  fiscalYear: number;
  category: string;
  subcategory: string | null;
  program: string | null;
  requestAmount: number | null;
  enactedAmount: number | null;
  previousYear: number | null;
  changePercent: number | null;
  notes: string | null;
  source: string | null;
}

interface CongressionalActivity {
  id: string;
  type: string;
  committee: string;
  subcommittee: string | null;
  title: string;
  description: string | null;
  date: string | null;
  status: string | null;
  billNumber: string | null;
  witnesses: string[];
  relevance: string | null;
  sourceUrl: string | null;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  alertEnabled: boolean;
  lastCheckedAt: string | null;
  newMatchCount: number;
  createdAt: string;
}

interface ProcurementStats {
  overview: {
    totalOpportunities: number;
    activeOpportunities: number;
    upcomingDeadlines: number;
    avgEstimatedValue: number | null;
    avgAwardAmount: number | null;
    totalAwardValue: number | null;
  };
  sbir: { total: number; active: number };
  budget: { totalItems: number };
  congressional: { totalActivities: number };
  byAgency: Array<{ agency: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  recentOpportunities: ProcurementOpportunity[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const AGENCIES = ['NASA', 'Space Force', 'NOAA', 'NRO', 'DARPA', 'Missile Defense Agency'];
const OPP_TYPES = [
  { value: 'solicitation', label: 'Solicitation', color: 'bg-green-500/20 text-green-400' },
  { value: 'presolicitation', label: 'Pre-Solicitation', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'award', label: 'Award', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'sources_sought', label: 'Sources Sought', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'special_notice', label: 'Special Notice', color: 'bg-cyan-500/20 text-cyan-400' },
];
const SET_ASIDES = [
  'Total Small Business',
  '8(a)',
  'HUBZone',
  'WOSB',
  'SDVOSB',
  'None',
];
const CONGRESSIONAL_TYPES = [
  { value: 'hearing', label: 'Hearing', icon: '🎙️' },
  { value: 'markup', label: 'Markup', icon: '📝' },
  { value: 'authorization', label: 'Authorization', icon: '📜' },
  { value: 'appropriation', label: 'Appropriation', icon: '💰' },
  { value: 'report', label: 'Report', icon: '📊' },
];
const COMMITTEES = ['Senate Commerce', 'House Science', 'SASC', 'HASC', 'Senate Appropriations'];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value == null) return 'TBD';
  if (compact) {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTypeInfo(type: string) {
  return OPP_TYPES.find(t => t.value === type) || { value: type, label: type, color: 'bg-gray-500/20 text-gray-400' };
}

function getCongressionalTypeInfo(type: string) {
  return CONGRESSIONAL_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📋' };
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function StatsOverview({ stats }: { stats: ProcurementStats | null }) {
  if (!stats) return null;
  const cards = [
    { label: 'Active Opportunities', value: stats.overview.activeOpportunities, icon: '📋' },
    { label: 'Upcoming Deadlines (30d)', value: stats.overview.upcomingDeadlines, icon: '⏰' },
    { label: 'SBIR/STTR Open', value: stats.sbir.active, icon: '🔬' },
    { label: 'Total Award Value', value: formatCurrency(stats.overview.totalAwardValue, true), icon: '💰' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="card p-4 text-center">
          <div className="text-2xl mb-1">{card.icon}</div>
          <div className="text-2xl font-bold text-cyan-400">{card.value}</div>
          <div className="text-xs text-slate-400 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function OpportunityCard({ opp }: { opp: ProcurementOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getTypeInfo(opp.type);
  const days = daysUntil(opp.responseDeadline);
  const isUrgent = days !== null && days >= 0 && days <= 14;
  const isPast = days !== null && days < 0;

  return (
    <div className="card p-4 mb-3 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {opp.agency}
            </span>
            {opp.setAside && opp.setAside !== 'None' && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                {opp.setAside}
              </span>
            )}
            {isUrgent && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">
                {days}d left
              </span>
            )}
          </div>

          <h3
            className="font-semibold text-white text-sm md:text-base mb-1 cursor-pointer hover:text-cyan-400 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {opp.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-2">
            {(opp.estimatedValue || opp.awardAmount) && (
              <span className="text-green-400 font-semibold">
                {formatCurrency(opp.awardAmount || opp.estimatedValue, true)}
              </span>
            )}
            {opp.responseDeadline && !isPast && (
              <span>Due: {formatDate(opp.responseDeadline)}</span>
            )}
            {opp.awardDate && opp.type === 'award' && (
              <span>Awarded: {formatDate(opp.awardDate)}</span>
            )}
            {opp.awardee && (
              <span className="text-purple-400">To: {opp.awardee}</span>
            )}
            {opp.naicsCode && (
              <span>NAICS: {opp.naicsCode}</span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-slate-300 border-t border-slate-700 pt-3">
              {opp.description && (
                <p className="text-slate-400 text-xs leading-relaxed">{opp.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {opp.solicitationNumber && <div><span className="text-slate-500">Sol #:</span> {opp.solicitationNumber}</div>}
                {opp.office && <div><span className="text-slate-500">Office:</span> {opp.office}</div>}
                {opp.placeOfPerformance && <div><span className="text-slate-500">Location:</span> {opp.placeOfPerformance}</div>}
                {opp.pointOfContact && <div><span className="text-slate-500">Contact:</span> {opp.pointOfContact}</div>}
                {opp.contactEmail && <div><span className="text-slate-500">Email:</span> <a href={`mailto:${opp.contactEmail}`} className="text-cyan-400 hover:underline">{opp.contactEmail}</a></div>}
                {opp.naicsDescription && <div><span className="text-slate-500">NAICS:</span> {opp.naicsCode} - {opp.naicsDescription}</div>}
                {opp.postedDate && <div><span className="text-slate-500">Posted:</span> {formatDate(opp.postedDate)}</div>}
              </div>
              {opp.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {opp.tags.map(tag => (
                    <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {opp.samUrl && (
                <a href={opp.samUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-xs inline-block mt-2">
                  View on SAM.gov
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SBIRCard({ solicitation }: { solicitation: SBIRSolicitation }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysUntil(solicitation.closeDate);
  const isOpen = days !== null && days >= 0;

  return (
    <div className="card p-4 mb-3 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${solicitation.program === 'SBIR' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {solicitation.program}
            </span>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {solicitation.agency}
            </span>
            {solicitation.phase && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                {solicitation.phase}
              </span>
            )}
            {isOpen ? (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                Open - {days}d remaining
              </span>
            ) : solicitation.isActive ? (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Active</span>
            ) : (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Closed</span>
            )}
          </div>

          <h3
            className="font-semibold text-white text-sm md:text-base mb-1 cursor-pointer hover:text-cyan-400 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {solicitation.topicNumber && <span className="text-cyan-400 mr-2">{solicitation.topicNumber}</span>}
            {solicitation.topicTitle}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {solicitation.awardAmount && (
              <span className="text-green-400 font-semibold">
                Up to {formatCurrency(solicitation.awardAmount)}
              </span>
            )}
            {solicitation.closeDate && (
              <span>Closes: {formatDate(solicitation.closeDate)}</span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm border-t border-slate-700 pt-3">
              {solicitation.description && (
                <p className="text-slate-400 text-xs leading-relaxed">{solicitation.description}</p>
              )}
              {solicitation.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {solicitation.keywords.map(kw => (
                    <span key={kw} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{kw}</span>
                  ))}
                </div>
              )}
              {solicitation.url && (
                <a href={solicitation.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-xs inline-block mt-2">
                  View Full Solicitation
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetTable({ items, agency }: { items: BudgetItem[]; agency: string }) {
  const filtered = items.filter(i => i.agency === agency);
  if (filtered.length === 0) return null;

  // Group by fiscal year
  const years = Array.from(new Set(filtered.map(i => i.fiscalYear))).sort((a, b) => b - a);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-white mb-3">{agency} Budget ($ Millions)</h3>
      {years.map(year => {
        const yearItems = filtered.filter(i => i.fiscalYear === year);
        const totalRequest = yearItems.reduce((sum, i) => sum + (i.requestAmount || 0), 0);
        const totalEnacted = yearItems.reduce((sum, i) => sum + (i.enactedAmount || 0), 0);

        return (
          <div key={year} className="card mb-3 overflow-hidden">
            <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-cyan-400">FY{year}</span>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Request: <span className="text-white font-semibold">${totalRequest.toLocaleString()}M</span></span>
                {totalEnacted > 0 && (
                  <span>Enacted: <span className="text-green-400 font-semibold">${totalEnacted.toLocaleString()}M</span></span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400">
                    <th className="text-left p-2 pl-3">Category / Program</th>
                    <th className="text-right p-2">Request</th>
                    <th className="text-right p-2">Enacted</th>
                    <th className="text-right p-2">Prior Year</th>
                    <th className="text-right p-2 pr-3">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {yearItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="p-2 pl-3">
                        <div className="text-white text-xs">{item.program || item.category}</div>
                        {item.program && <div className="text-slate-500 text-xs">{item.category}</div>}
                      </td>
                      <td className="text-right p-2 text-white text-xs">${item.requestAmount?.toLocaleString() || '-'}</td>
                      <td className="text-right p-2 text-xs">{item.enactedAmount ? <span className="text-green-400">${item.enactedAmount.toLocaleString()}</span> : <span className="text-slate-500">-</span>}</td>
                      <td className="text-right p-2 text-slate-400 text-xs">${item.previousYear?.toLocaleString() || '-'}</td>
                      <td className="text-right p-2 pr-3 text-xs">
                        {item.changePercent != null ? (
                          <span className={item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {yearItems[0]?.source && (
              <div className="p-2 px-3 text-xs text-slate-500 border-t border-slate-800">
                Source: {yearItems[0].source}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CongressionalCard({ activity }: { activity: CongressionalActivity }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getCongressionalTypeInfo(activity.type);
  const days = daysUntil(activity.date);
  const isPast = days !== null && days < 0;

  return (
    <div className="card p-4 mb-3 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{typeInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{typeInfo.label}</span>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">{activity.committee}</span>
            {activity.status && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                activity.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {activity.status}
              </span>
            )}
            {days !== null && !isPast && (
              <span className="text-xs text-slate-400">In {days} days</span>
            )}
          </div>

          <h3
            className="font-semibold text-white text-sm md:text-base mb-1 cursor-pointer hover:text-cyan-400 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {activity.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {activity.date && <span>{formatDate(activity.date)}</span>}
            {activity.billNumber && <span className="text-cyan-400">{activity.billNumber}</span>}
            {activity.subcommittee && <span>{activity.subcommittee}</span>}
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm border-t border-slate-700 pt-3">
              {activity.description && (
                <p className="text-slate-400 text-xs leading-relaxed">{activity.description}</p>
              )}
              {activity.witnesses.length > 0 && (
                <div>
                  <span className="text-slate-500 text-xs">Witnesses: </span>
                  <span className="text-xs text-slate-300">{activity.witnesses.join(', ')}</span>
                </div>
              )}
              {activity.relevance && (
                <div className="bg-slate-800/50 p-2 rounded text-xs">
                  <span className="text-cyan-400 font-semibold">Industry Impact: </span>
                  <span className="text-slate-300">{activity.relevance}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Content
// ────────────────────────────────────────

function ProcurementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentTab = (searchParams.get('tab') as Tab) || 'opportunities';

  // State
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [opportunities, setOpportunities] = useState<ProcurementOpportunity[]>([]);
  const [oppTotal, setOppTotal] = useState(0);
  const [oppLoading, setOppLoading] = useState(false);
  const [sbirSolicitations, setSBIRSolicitations] = useState<SBIRSolicitation[]>([]);
  const [sbirTotal, setSBIRTotal] = useState(0);
  const [sbirLoading, setSBIRLoading] = useState(false);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [congressional, setCongressional] = useState<CongressionalActivity[]>([]);
  const [congressionalTotal, setCongressionalTotal] = useState(0);
  const [congressionalLoading, setCongressionalLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Filters
  const [agencyFilter, setAgencyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [setAsideFilter, setSetAsideFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sbirAgencyFilter, setSBIRAgencyFilter] = useState('');
  const [sbirProgramFilter, setSBIRProgramFilter] = useState('');
  const [budgetAgencyFilter, setBudgetAgencyFilter] = useState('NASA');
  const [budgetYearFilter, setBudgetYearFilter] = useState('');
  const [congressionalTypeFilter, setCongressionalTypeFilter] = useState('');
  const [congressionalCommitteeFilter, setCongressionalCommitteeFilter] = useState('');
  const [oppOffset, setOppOffset] = useState(0);

  const setTab = useCallback((tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Fetch stats
  useEffect(() => {
    fetch('/api/procurement/stats')
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data.data); })
      .catch(() => {});
  }, []);

  // Fetch opportunities
  const fetchOpportunities = useCallback(() => {
    setOppLoading(true);
    const params = new URLSearchParams();
    if (agencyFilter) params.set('agency', agencyFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (setAsideFilter) params.set('setAside', setAsideFilter);
    if (searchQuery) params.set('search', searchQuery);
    params.set('limit', '25');
    params.set('offset', String(oppOffset));

    fetch(`/api/procurement/opportunities?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOpportunities(data.data.opportunities);
          setOppTotal(data.data.total);
        }
      })
      .catch(() => {})
      .finally(() => setOppLoading(false));
  }, [agencyFilter, typeFilter, setAsideFilter, searchQuery, oppOffset]);

  useEffect(() => {
    if (currentTab === 'opportunities') fetchOpportunities();
  }, [currentTab, fetchOpportunities]);

  // Fetch SBIR
  const fetchSBIR = useCallback(() => {
    setSBIRLoading(true);
    const params = new URLSearchParams();
    if (sbirAgencyFilter) params.set('agency', sbirAgencyFilter);
    if (sbirProgramFilter) params.set('program', sbirProgramFilter);
    params.set('limit', '50');

    fetch(`/api/procurement/sbir?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSBIRSolicitations(data.data.solicitations);
          setSBIRTotal(data.data.total);
        }
      })
      .catch(() => {})
      .finally(() => setSBIRLoading(false));
  }, [sbirAgencyFilter, sbirProgramFilter]);

  useEffect(() => {
    if (currentTab === 'sbir') fetchSBIR();
  }, [currentTab, fetchSBIR]);

  // Fetch budget
  const fetchBudget = useCallback(() => {
    setBudgetLoading(true);
    const params = new URLSearchParams();
    if (budgetAgencyFilter) params.set('agency', budgetAgencyFilter);
    if (budgetYearFilter) params.set('fiscalYear', budgetYearFilter);

    fetch(`/api/procurement/budget?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setBudgetItems(data.data.budgetItems);
      })
      .catch(() => {})
      .finally(() => setBudgetLoading(false));
  }, [budgetAgencyFilter, budgetYearFilter]);

  useEffect(() => {
    if (currentTab === 'budget') fetchBudget();
  }, [currentTab, fetchBudget]);

  // Fetch congressional
  const fetchCongressional = useCallback(() => {
    setCongressionalLoading(true);
    const params = new URLSearchParams();
    if (congressionalTypeFilter) params.set('type', congressionalTypeFilter);
    if (congressionalCommitteeFilter) params.set('committee', congressionalCommitteeFilter);
    params.set('limit', '50');

    fetch(`/api/procurement/congressional?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCongressional(data.data.activities);
          setCongressionalTotal(data.data.total);
        }
      })
      .catch(() => {})
      .finally(() => setCongressionalLoading(false));
  }, [congressionalTypeFilter, congressionalCommitteeFilter]);

  useEffect(() => {
    if (currentTab === 'congressional') fetchCongressional();
  }, [currentTab, fetchCongressional]);

  // Fetch saved searches
  const fetchSaved = useCallback(() => {
    if (!session?.user) return;
    setSavedLoading(true);
    fetch('/api/procurement/saved-searches')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSavedSearches(data.data.savedSearches);
      })
      .catch(() => {})
      .finally(() => setSavedLoading(false));
  }, [session]);

  useEffect(() => {
    if (currentTab === 'saved') fetchSaved();
  }, [currentTab, fetchSaved]);

  // Tab buttons
  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'opportunities', label: 'Contract Opportunities', icon: '📋', count: stats?.overview.activeOpportunities },
    { id: 'sbir', label: 'SBIR/STTR', icon: '🔬', count: stats?.sbir.active },
    { id: 'budget', label: 'Budget Tracker', icon: '💰' },
    { id: 'congressional', label: 'Congressional', icon: '🏛️', count: stats?.congressional.totalActivities },
    { id: 'saved', label: 'Saved Searches', icon: '🔖' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatedPageHeader
          title="Procurement Intelligence"
          subtitle="Track government space contracts, SBIR/STTR opportunities, agency budgets, and congressional activity"
          icon="📋"
        />

        <StatsOverview stats={stats} />

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-slate-900 p-1 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {currentTab === 'opportunities' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  aria-label="Search opportunities"
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setOppOffset(0); }}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <select
                  aria-label="Filter by agency"
                  value={agencyFilter}
                  onChange={e => { setAgencyFilter(e.target.value); setOppOffset(0); }}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Agencies</option>
                  {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select
                  aria-label="Filter by type"
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setOppOffset(0); }}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Types</option>
                  {OPP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  aria-label="Filter by set-aside"
                  value={setAsideFilter}
                  onChange={e => { setSetAsideFilter(e.target.value); setOppOffset(0); }}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Set-Asides</option>
                  {SET_ASIDES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Results */}
            {oppLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : opportunities.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Opportunities Found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">
                    Showing {oppOffset + 1}-{Math.min(oppOffset + 25, oppTotal)} of {oppTotal} opportunities
                  </span>
                  <ExportButton
                    data={opportunities}
                    filename="procurement-opportunities"
                    label="Export"
                  />
                </div>
                <StaggerContainer>
                  {opportunities.map(opp => (
                    <StaggerItem key={opp.id}>
                      <OpportunityCard opp={opp} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                {/* Pagination */}
                {oppTotal > 25 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setOppOffset(Math.max(0, oppOffset - 25))}
                      disabled={oppOffset === 0}
                      className="px-4 py-2 bg-slate-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-sm"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-slate-400 text-sm">
                      Page {Math.floor(oppOffset / 25) + 1} of {Math.ceil(oppTotal / 25)}
                    </span>
                    <button
                      onClick={() => setOppOffset(oppOffset + 25)}
                      disabled={oppOffset + 25 >= oppTotal}
                      className="px-4 py-2 bg-slate-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentTab === 'sbir' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  aria-label="Filter SBIR by agency"
                  value={sbirAgencyFilter}
                  onChange={e => setSBIRAgencyFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Agencies</option>
                  <option value="NASA">NASA</option>
                  <option value="SpaceWERX">SpaceWERX</option>
                  <option value="NOAA">NOAA</option>
                </select>
                <select
                  aria-label="Filter by program"
                  value={sbirProgramFilter}
                  onChange={e => setSBIRProgramFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Programs</option>
                  <option value="SBIR">SBIR</option>
                  <option value="STTR">STTR</option>
                </select>
                <div className="text-right text-sm text-slate-400 self-center">
                  {sbirTotal} solicitations found
                </div>
              </div>
            </div>

            {sbirLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : sbirSolicitations.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🔬</div>
                <h3 className="text-lg font-semibold text-white mb-2">No SBIR/STTR Solicitations Found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <StaggerContainer>
                {sbirSolicitations.map(s => (
                  <StaggerItem key={s.id}>
                    <SBIRCard solicitation={s} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        )}

        {currentTab === 'budget' && (
          <div>
            {/* Agency filter */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  aria-label="Filter budget by agency"
                  value={budgetAgencyFilter}
                  onChange={e => setBudgetAgencyFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Agencies</option>
                  <option value="NASA">NASA</option>
                  <option value="Space Force">Space Force</option>
                  <option value="NOAA">NOAA</option>
                </select>
                <select
                  aria-label="Filter by fiscal year"
                  value={budgetYearFilter}
                  onChange={e => setBudgetYearFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Years</option>
                  <option value="2026">FY2026</option>
                  <option value="2025">FY2025</option>
                  <option value="2024">FY2024</option>
                </select>
                <div className="text-right text-sm text-slate-400 self-center">
                  {budgetItems.length} budget line items
                </div>
              </div>
            </div>

            {budgetLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : budgetItems.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Budget Data Found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                {budgetAgencyFilter ? (
                  <BudgetTable items={budgetItems} agency={budgetAgencyFilter} />
                ) : (
                  <>
                    <BudgetTable items={budgetItems} agency="NASA" />
                    <BudgetTable items={budgetItems} agency="Space Force" />
                    <BudgetTable items={budgetItems} agency="NOAA" />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {currentTab === 'congressional' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  aria-label="Filter congressional activity by type"
                  value={congressionalTypeFilter}
                  onChange={e => setCongressionalTypeFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Types</option>
                  {CONGRESSIONAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <select
                  aria-label="Filter by committee"
                  value={congressionalCommitteeFilter}
                  onChange={e => setCongressionalCommitteeFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Committees</option>
                  {COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="text-right text-sm text-slate-400 self-center">
                  {congressionalTotal} activities found
                </div>
              </div>
            </div>

            {congressionalLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : congressional.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🏛️</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Congressional Activity Found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <StaggerContainer>
                {congressional.map(activity => (
                  <StaggerItem key={activity.id}>
                    <CongressionalCard activity={activity} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        )}

        {currentTab === 'saved' && (
          <div>
            {!session?.user ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-slate-400 text-sm mb-4">Sign in with a Pro or Enterprise account to create saved searches and receive alerts.</p>
                <Link href="/login" className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 text-sm font-medium">
                  Sign In
                </Link>
              </div>
            ) : savedLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : savedSearches.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🔖</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Saved Searches</h3>
                <p className="text-slate-400 text-sm">Save your filter combinations on the Contract Opportunities tab to track matching opportunities.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSearches.map(search => (
                  <div key={search.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{search.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Created {formatDate(search.createdAt)}
                          {search.lastCheckedAt && ` | Last checked ${formatDate(search.lastCheckedAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {search.newMatchCount > 0 && (
                          <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full font-semibold">
                            {search.newMatchCount} new
                          </span>
                        )}
                        <span className={`text-xs ${search.alertEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                          {search.alertEnabled ? 'Alerts On' : 'Alerts Off'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attribution */}
        <div className="mt-8 text-center text-xs text-slate-600">
          Data sourced from SAM.gov, SBIR.gov, and public government budget documents. Updated periodically.
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Exported Page (with Suspense boundary)
// ────────────────────────────────────────

export default function ProcurementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><LoadingSpinner /></div>}>
      <ProcurementContent />
    </Suspense>
  );
}
