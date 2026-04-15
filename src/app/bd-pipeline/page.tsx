'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface BDOpportunity {
  id: string;
  companyId: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  opportunityType: string;
  externalId: string | null;
  agency: string | null;
  naicsCode: string | null;
  category: string | null;
  valueEstimated: number | null;
  itarRequired: boolean;
  clearanceRequired: string | null;
  setAsideEligibility: string[];
  solicitationNumber: string | null;
  samUrl: string | null;
  stage: string;
  probability: number | null;
  expectedCloseDate: string | null;
  proposalDeadline: string | null;
  wonAmount: number | null;
  lostReason: string | null;
  discoveredAt: string;
  pursuitStartedAt: string | null;
  proposalSubmittedAt: string | null;
  awardedAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string; slug: string };
  _count?: { interactions: number };
  interactions?: BDInteraction[];
}

interface BDInteraction {
  id: string;
  opportunityId: string;
  type: string;
  date: string;
  title: string | null;
  notes: string | null;
  contactName: string | null;
  contactOrg: string | null;
  createdAt: string;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'discovery', label: 'Discovery', color: 'bg-slate-500' },
  { key: 'pursuit', label: 'Pursuit', color: 'bg-blue-500' },
  { key: 'capture', label: 'Capture', color: 'bg-cyan-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-amber-500' },
  { key: 'submitted', label: 'Submitted', color: 'bg-purple-500' },
  { key: 'evaluation', label: 'Evaluation', color: 'bg-orange-500' },
];

const ALL_STAGES = [
  ...PIPELINE_STAGES,
  { key: 'award', label: 'Award', color: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', color: 'bg-red-500' },
  { key: 'on_hold', label: 'On Hold', color: 'bg-yellow-500' },
];

const OPPORTUNITY_TYPES = [
  { value: 'procurement', label: 'Procurement' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'funding', label: 'Funding' },
  { value: 'teaming', label: 'Teaming' },
  { value: 'contract_renewal', label: 'Contract Renewal' },
  { value: 'sbir', label: 'SBIR/STTR' },
];

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'proposal_draft', label: 'Proposal Draft' },
  { value: 'proposal_submit', label: 'Proposal Submit' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'teaming', label: 'Teaming' },
  { value: 'note', label: 'Note' },
];

const AGENCIES = [
  'NASA', 'Space Force', 'DARPA', 'NRO', 'NOAA', 'MDA', 'SDA',
  'Air Force', 'Army', 'Navy', 'DOD', 'DOE', 'NSF', 'FAA', 'Other',
];

const SET_ASIDE_OPTIONS = ['8(a)', 'HUBZone', 'WOSB', 'SDVOSB'];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStageInfo(stageKey: string) {
  return ALL_STAGES.find((s) => s.key === stageKey) || { key: stageKey, label: stageKey, color: 'bg-slate-500' };
}

function getInteractionIcon(type: string): string {
  const icons: Record<string, string> = {
    call: '\u{1F4DE}',
    email: '\u{1F4E7}',
    meeting: '\u{1F91D}',
    site_visit: '\u{1F3E2}',
    proposal_draft: '\u{1F4DD}',
    proposal_submit: '\u{1F4E4}',
    negotiation: '\u{2696}\u{FE0F}',
    teaming: '\u{1F465}',
    note: '\u{1F4CB}',
  };
  return icons[type] || '\u{1F4CC}';
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

function BDPipelineContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data state
  const [opportunities, setOpportunities] = useState<BDOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedOpp, setSelectedOpp] = useState<BDOpportunity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');

  // New opportunity form
  const [newOpp, setNewOpp] = useState({
    title: '',
    agency: '',
    opportunityType: 'procurement',
    valueEstimated: '',
    itarRequired: false,
    clearanceRequired: '',
    setAsideEligibility: [] as string[],
    proposalDeadline: '',
    description: '',
    solicitationNumber: '',
  });

  // Interaction form
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interactionSubmitting, setInteractionSubmitting] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'note',
    title: '',
    notes: '',
    contactName: '',
    contactOrg: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Stage change
  const [stageChanging, setStageChanging] = useState<string | null>(null);

  // ── Auth check ──
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/bd-pipeline');
    }
  }, [status, router]);

  // ── Fetch opportunities ──
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const url = stageFilter === 'all'
        ? '/api/bd-pipeline?limit=200'
        : `/api/bd-pipeline?stage=${stageFilter}&limit=200`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?callbackUrl=/bd-pipeline');
          return;
        }
        throw new Error('Failed to fetch pipeline');
      }
      const json = await res.json();
      setOpportunities(json.data?.opportunities || []);
      setError(null);
    } catch (err) {
      clientLogger.error('Failed to fetch BD pipeline', { error: String(err) });
      setError('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, [stageFilter, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOpportunities();
    }
  }, [status, fetchOpportunities]);

  // ── Fetch single opportunity detail ──
  const fetchDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/bd-pipeline/${id}`);
      if (!res.ok) throw new Error('Failed to fetch detail');
      const json = await res.json();
      setSelectedOpp(json.data);
    } catch (err) {
      clientLogger.error('Failed to fetch opportunity detail', { error: String(err) });
      toast.error('Failed to load opportunity details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Create opportunity ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpp.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload: Record<string, unknown> = {
        title: newOpp.title,
        opportunityType: newOpp.opportunityType,
        itarRequired: newOpp.itarRequired,
        setAsideEligibility: newOpp.setAsideEligibility,
      };
      if (newOpp.agency) payload.agency = newOpp.agency;
      if (newOpp.valueEstimated) payload.valueEstimated = parseFloat(newOpp.valueEstimated);
      if (newOpp.clearanceRequired) payload.clearanceRequired = newOpp.clearanceRequired;
      if (newOpp.proposalDeadline) payload.proposalDeadline = new Date(newOpp.proposalDeadline).toISOString();
      if (newOpp.description) payload.description = newOpp.description;
      if (newOpp.solicitationNumber) payload.solicitationNumber = newOpp.solicitationNumber;

      const res = await fetch('/api/bd-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to create opportunity');
      }

      toast.success('Opportunity created');
      setShowNewForm(false);
      setNewOpp({
        title: '', agency: '', opportunityType: 'procurement', valueEstimated: '',
        itarRequired: false, clearanceRequired: '', setAsideEligibility: [],
        proposalDeadline: '', description: '', solicitationNumber: '',
      });
      fetchOpportunities();
    } catch (err) {
      clientLogger.error('Failed to create BD opportunity', { error: String(err) });
      toast.error(err instanceof Error ? err.message : 'Failed to create opportunity');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Change stage ──
  const handleStageChange = async (oppId: string, newStage: string) => {
    try {
      setStageChanging(oppId);
      const res = await fetch(`/api/bd-pipeline/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) throw new Error('Failed to update stage');

      toast.success(`Moved to ${getStageInfo(newStage).label}`);
      fetchOpportunities();
      if (selectedOpp?.id === oppId) {
        fetchDetail(oppId);
      }
    } catch (err) {
      clientLogger.error('Failed to change stage', { error: String(err) });
      toast.error('Failed to update stage');
    } finally {
      setStageChanging(null);
    }
  };

  // ── Add interaction ──
  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;

    try {
      setInteractionSubmitting(true);
      const payload: Record<string, unknown> = {
        type: newInteraction.type,
        date: new Date(newInteraction.date).toISOString(),
      };
      if (newInteraction.title) payload.title = newInteraction.title;
      if (newInteraction.notes) payload.notes = newInteraction.notes;
      if (newInteraction.contactName) payload.contactName = newInteraction.contactName;
      if (newInteraction.contactOrg) payload.contactOrg = newInteraction.contactOrg;

      const res = await fetch(`/api/bd-pipeline/${selectedOpp.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to add interaction');

      toast.success('Interaction logged');
      setShowInteractionForm(false);
      setNewInteraction({
        type: 'note', title: '', notes: '', contactName: '', contactOrg: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchDetail(selectedOpp.id);
    } catch (err) {
      clientLogger.error('Failed to add interaction', { error: String(err) });
      toast.error('Failed to log interaction');
    } finally {
      setInteractionSubmitting(false);
    }
  };

  // ── Archive opportunity ──
  const handleArchive = async (oppId: string) => {
    if (!confirm('Archive this opportunity? It will be hidden from the pipeline.')) return;

    try {
      const res = await fetch(`/api/bd-pipeline/${oppId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive');

      toast.success('Opportunity archived');
      setSelectedOpp(null);
      fetchOpportunities();
    } catch (err) {
      clientLogger.error('Failed to archive opportunity', { error: String(err) });
      toast.error('Failed to archive opportunity');
    }
  };

  // ── Summary stats ──
  const totalPipelineValue = opportunities
    .filter((o) => !['award', 'lost', 'on_hold'].includes(o.stage))
    .reduce((sum, o) => sum + (o.valueEstimated || 0), 0);

  const wonOpps = opportunities.filter((o) => o.stage === 'award');
  const lostOpps = opportunities.filter((o) => o.stage === 'lost');
  const decidedTotal = wonOpps.length + lostOpps.length;
  const winRate = decidedTotal > 0 ? Math.round((wonOpps.length / decidedTotal) * 100) : 0;

  const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = opportunities.filter((o) => o.stage === s.key).length;
    return acc;
  }, {});

  const weightedValue = opportunities
    .filter((o) => !['award', 'lost', 'on_hold'].includes(o.stage))
    .reduce((sum, o) => sum + (o.valueEstimated || 0) * ((o.probability || 0) / 100), 0);

  // ── Group by stage for board view ──
  const groupedByStage = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    opportunities: opportunities.filter((o) => o.stage === stage.key),
  }));

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B1120] px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="BD Pipeline"
        subtitle="Track opportunities from discovery through award. Manage interactions, deadlines, and win probabilities."
        icon={<span>&#x1F3AF;</span>}
        breadcrumb="Business &rarr; BD Pipeline"
        accentColor="cyan"
      >
        <button
          onClick={() => setShowNewForm(true)}
          className="mt-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-sm"
        >
          + New Opportunity
        </button>
      </AnimatedPageHeader>

      {/* ── Summary Stats ── */}
      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-white/[0.06] border border-white/10 rounded-xl">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pipeline Value</div>
            <div className="text-2xl font-semibold text-slate-100">{formatCurrency(totalPipelineValue)}</div>
          </div>
          <div className="p-5 bg-white/[0.06] border border-white/10 rounded-xl">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Weighted Value</div>
            <div className="text-2xl font-semibold text-cyan-400">{formatCurrency(weightedValue)}</div>
          </div>
          <div className="p-5 bg-white/[0.06] border border-white/10 rounded-xl">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
            <div className="text-2xl font-semibold text-emerald-400">{winRate}%</div>
            <div className="text-xs text-slate-500 mt-0.5">{wonOpps.length}W / {lostOpps.length}L</div>
          </div>
          <div className="p-5 bg-white/[0.06] border border-white/10 rounded-xl">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Opps</div>
            <div className="text-2xl font-semibold text-slate-100">
              {opportunities.filter((o) => !['award', 'lost', 'on_hold'].includes(o.stage)).length}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Stage Filter (mobile-friendly) ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
            stageFilter === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-white/[0.06] text-slate-400 hover:text-white'
          }`}
        >
          All ({opportunities.length})
        </button>
        {PIPELINE_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStageFilter(s.key)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              stageFilter === s.key
                ? 'bg-white/20 text-white'
                : 'bg-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            {s.label} ({stageCounts[s.key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchOpportunities} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">
            Retry
          </button>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">&#x1F3AF;</div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">No opportunities yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Start tracking your business development pipeline. Add opportunities from SAM.gov, teaming partners, or your own leads.
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            + Add First Opportunity
          </button>
        </div>
      ) : (
        <>
          {/* ── Pipeline Board ── */}
          <ScrollReveal delay={0.2}>
            <div className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-[1200px]">
                {groupedByStage.map((stageGroup) => (
                  <div key={stageGroup.key} className="flex-1 min-w-[180px]">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${stageGroup.color}`} />
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        {stageGroup.label}
                      </h3>
                      <span className="text-xs text-slate-500 ml-auto">
                        {stageGroup.opportunities.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3">
                      {stageGroup.opportunities.map((opp) => {
                        const deadlineDays = daysUntil(opp.proposalDeadline);
                        const isUrgent = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7;

                        return (
                          <button
                            key={opp.id}
                            onClick={() => fetchDetail(opp.id)}
                            className={`w-full text-left p-4 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 rounded-xl transition-all cursor-pointer group ${
                              selectedOpp?.id === opp.id ? 'ring-1 ring-cyan-500/50 bg-white/[0.10]' : ''
                            }`}
                          >
                            <h4 className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 mb-2">
                              {opp.title}
                            </h4>

                            {opp.agency && (
                              <div className="text-xs text-slate-400 mb-1">{opp.agency}</div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-medium text-cyan-400">
                                {formatCurrency(opp.valueEstimated)}
                              </span>
                              {opp.probability != null && (
                                <span className="text-xs text-slate-500">{opp.probability}%</span>
                              )}
                            </div>

                            {isUrgent && (
                              <div className="mt-2 text-xs text-amber-400 font-medium">
                                &#x26A0; Deadline in {deadlineDays}d
                              </div>
                            )}

                            {opp.itarRequired && (
                              <div className="mt-1.5 inline-block px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-300 rounded font-medium">
                                ITAR
                              </div>
                            )}

                            {opp._count && opp._count.interactions > 0 && (
                              <div className="mt-2 text-[10px] text-slate-500">
                                {opp._count.interactions} interaction{opp._count.interactions !== 1 ? 's' : ''}
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {stageGroup.opportunities.length === 0 && (
                        <div className="p-4 border border-dashed border-white/10 rounded-xl text-center">
                          <div className="text-xs text-slate-500">No opportunities</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </>
      )}

      {/* ── New Opportunity Modal ── */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewForm(false)}>
          <div className="w-full max-w-xl bg-[#111827] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">New Opportunity</h2>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={newOpp.title}
                  onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                  placeholder="e.g., NASA COTS Phase 2 Award"
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  required
                />
              </div>

              {/* Agency + Type row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Agency</label>
                  <select
                    value={newOpp.agency}
                    onChange={(e) => setNewOpp({ ...newOpp, agency: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="">Select agency</option>
                    {AGENCIES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Type</label>
                  <select
                    value={newOpp.opportunityType}
                    onChange={(e) => setNewOpp({ ...newOpp, opportunityType: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    {OPPORTUNITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Value + Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    value={newOpp.valueEstimated}
                    onChange={(e) => setNewOpp({ ...newOpp, valueEstimated: e.target.value })}
                    placeholder="e.g., 5000000"
                    min="0"
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Proposal Deadline</label>
                  <input
                    type="date"
                    value={newOpp.proposalDeadline}
                    onChange={(e) => setNewOpp({ ...newOpp, proposalDeadline: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {/* Solicitation Number */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Solicitation Number</label>
                <input
                  type="text"
                  value={newOpp.solicitationNumber}
                  onChange={(e) => setNewOpp({ ...newOpp, solicitationNumber: e.target.value })}
                  placeholder="e.g., NNH24ZEA001N"
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              {/* ITAR + Clearance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="itarRequired"
                    checked={newOpp.itarRequired}
                    onChange={(e) => setNewOpp({ ...newOpp, itarRequired: e.target.checked })}
                    className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
                  />
                  <label htmlFor="itarRequired" className="text-sm text-slate-300">ITAR Required</label>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Clearance</label>
                  <select
                    value={newOpp.clearanceRequired}
                    onChange={(e) => setNewOpp({ ...newOpp, clearanceRequired: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="">None</option>
                    <option value="secret">Secret</option>
                    <option value="top_secret">Top Secret</option>
                    <option value="ts_sci">TS/SCI</option>
                  </select>
                </div>
              </div>

              {/* Set-Asides */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Set-Aside Eligibility</label>
                <div className="flex flex-wrap gap-2">
                  {SET_ASIDE_OPTIONS.map((sa) => (
                    <label key={sa} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={newOpp.setAsideEligibility.includes(sa)}
                        onChange={(e) => {
                          setNewOpp({
                            ...newOpp,
                            setAsideEligibility: e.target.checked
                              ? [...newOpp.setAsideEligibility, sa]
                              : newOpp.setAsideEligibility.filter((s) => s !== sa),
                          });
                        }}
                        className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
                      />
                      {sa}
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea
                  value={newOpp.description}
                  onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the opportunity..."
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {formSubmitting ? 'Creating...' : 'Create Opportunity'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Opportunity Detail Panel ── */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOpp(null)}>
          <div
            className="w-full max-w-lg h-full bg-[#111827] border-l border-white/10 overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 pr-4">
                    <h2 className="text-lg font-semibold text-slate-100 mb-1">{selectedOpp.title}</h2>
                    {selectedOpp.company && (
                      <div className="text-xs text-slate-400">{selectedOpp.company.name}</div>
                    )}
                  </div>
                  <button onClick={() => setSelectedOpp(null)} className="text-slate-400 hover:text-white text-xl flex-shrink-0">&times;</button>
                </div>

                {/* Stage selector */}
                <div className="mb-6">
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Stage</label>
                  <select
                    value={selectedOpp.stage}
                    onChange={(e) => handleStageChange(selectedOpp.id, e.target.value)}
                    disabled={stageChanging === selectedOpp.id}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50"
                  >
                    {ALL_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Key details grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Type</div>
                    <div className="text-sm text-slate-200 capitalize">{selectedOpp.opportunityType.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Agency</div>
                    <div className="text-sm text-slate-200">{selectedOpp.agency || '--'}</div>
                  </div>
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Est. Value</div>
                    <div className="text-sm text-cyan-400 font-medium">{formatCurrency(selectedOpp.valueEstimated)}</div>
                  </div>
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Probability</div>
                    <div className="text-sm text-slate-200">{selectedOpp.probability != null ? `${selectedOpp.probability}%` : '--'}</div>
                  </div>
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Deadline</div>
                    <div className={`text-sm ${
                      daysUntil(selectedOpp.proposalDeadline) !== null && daysUntil(selectedOpp.proposalDeadline)! <= 7 && daysUntil(selectedOpp.proposalDeadline)! >= 0
                        ? 'text-amber-400'
                        : 'text-slate-200'
                    }`}>
                      {formatDate(selectedOpp.proposalDeadline)}
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.04] rounded-lg">
                    <div className="text-[10px] text-slate-500 uppercase">Expected Close</div>
                    <div className="text-sm text-slate-200">{formatDate(selectedOpp.expectedCloseDate)}</div>
                  </div>
                </div>

                {/* Compliance badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedOpp.itarRequired && (
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded-full font-medium">ITAR</span>
                  )}
                  {selectedOpp.clearanceRequired && selectedOpp.clearanceRequired !== 'none' && (
                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full font-medium capitalize">
                      {selectedOpp.clearanceRequired.replace(/_/g, ' ')}
                    </span>
                  )}
                  {selectedOpp.setAsideEligibility?.map((sa) => (
                    <span key={sa} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full font-medium">{sa}</span>
                  ))}
                  {selectedOpp.solicitationNumber && (
                    <span className="px-2 py-0.5 text-xs bg-white/10 text-slate-300 rounded-full">
                      Sol: {selectedOpp.solicitationNumber}
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedOpp.description && (
                  <div className="mb-6">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Description</div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedOpp.description}</p>
                  </div>
                )}

                {/* SAM.gov link */}
                {selectedOpp.samUrl && (
                  <div className="mb-6">
                    <a
                      href={selectedOpp.samUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                    >
                      View on SAM.gov &rarr;
                    </a>
                  </div>
                )}

                {/* Stage timestamps */}
                <div className="mb-6">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Timeline</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Discovered</span>
                      <span className="text-slate-300">{formatDate(selectedOpp.discoveredAt)}</span>
                    </div>
                    {selectedOpp.pursuitStartedAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Pursuit Started</span>
                        <span className="text-slate-300">{formatDate(selectedOpp.pursuitStartedAt)}</span>
                      </div>
                    )}
                    {selectedOpp.proposalSubmittedAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Proposal Submitted</span>
                        <span className="text-slate-300">{formatDate(selectedOpp.proposalSubmittedAt)}</span>
                      </div>
                    )}
                    {selectedOpp.awardedAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Awarded</span>
                        <span className="text-emerald-400">{formatDate(selectedOpp.awardedAt)}</span>
                      </div>
                    )}
                    {selectedOpp.lostAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Lost</span>
                        <span className="text-red-400">{formatDate(selectedOpp.lostAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Won / Lost details */}
                {selectedOpp.stage === 'award' && selectedOpp.wonAmount && (
                  <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Won Amount</div>
                    <div className="text-lg font-semibold text-emerald-400">{formatCurrency(selectedOpp.wonAmount)}</div>
                  </div>
                )}

                {selectedOpp.stage === 'lost' && selectedOpp.lostReason && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Lost Reason</div>
                    <p className="text-sm text-red-300">{selectedOpp.lostReason}</p>
                  </div>
                )}

                {/* ── Interactions ── */}
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      Interactions ({selectedOpp.interactions?.length || 0})
                    </h3>
                    <button
                      onClick={() => setShowInteractionForm(!showInteractionForm)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {showInteractionForm ? 'Cancel' : '+ Add'}
                    </button>
                  </div>

                  {/* Add interaction form */}
                  {showInteractionForm && (
                    <form onSubmit={handleAddInteraction} className="mb-6 p-4 bg-white/[0.04] rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Type</label>
                          <select
                            value={newInteraction.type}
                            onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          >
                            {INTERACTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Date</label>
                          <input
                            type="date"
                            value={newInteraction.date}
                            onChange={(e) => setNewInteraction({ ...newInteraction, date: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={newInteraction.title}
                          onChange={(e) => setNewInteraction({ ...newInteraction, title: e.target.value })}
                          placeholder="Brief summary..."
                          className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Contact Name</label>
                          <input
                            type="text"
                            value={newInteraction.contactName}
                            onChange={(e) => setNewInteraction({ ...newInteraction, contactName: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Contact Org</label>
                          <input
                            type="text"
                            value={newInteraction.contactOrg}
                            onChange={(e) => setNewInteraction({ ...newInteraction, contactOrg: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Notes</label>
                        <textarea
                          value={newInteraction.notes}
                          onChange={(e) => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                          rows={3}
                          className="w-full px-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={interactionSubmitting}
                        className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {interactionSubmitting ? 'Saving...' : 'Log Interaction'}
                      </button>
                    </form>
                  )}

                  {/* Interaction list */}
                  <div className="space-y-3">
                    {selectedOpp.interactions && selectedOpp.interactions.length > 0 ? (
                      selectedOpp.interactions.map((interaction) => (
                        <div key={interaction.id} className="p-3 bg-white/[0.04] rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getInteractionIcon(interaction.type)}</span>
                            <span className="text-xs font-medium text-slate-300 capitalize">
                              {interaction.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-auto">
                              {formatDate(interaction.date)}
                            </span>
                          </div>
                          {interaction.title && (
                            <div className="text-sm text-slate-200 mb-1">{interaction.title}</div>
                          )}
                          {interaction.notes && (
                            <p className="text-xs text-slate-400 whitespace-pre-wrap">{interaction.notes}</p>
                          )}
                          {(interaction.contactName || interaction.contactOrg) && (
                            <div className="text-[10px] text-slate-500 mt-1.5">
                              {[interaction.contactName, interaction.contactOrg].filter(Boolean).join(' @ ')}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No interactions logged yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Archive button */}
                <div className="border-t border-white/10 pt-6 mt-6">
                  <button
                    onClick={() => handleArchive(selectedOpp.id)}
                    className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Archive Opportunity
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BDPipelinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0B1120]">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <BDPipelineContent />
    </Suspense>
  );
}
