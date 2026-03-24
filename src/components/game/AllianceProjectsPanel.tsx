'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import type { GameState } from '@/lib/game/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectContribution {
  profileId: string;
  companyName: string;
  moneyContributed: number;
  resourcesContributed: Record<string, number>;
  contributionShare: number;
  isYou: boolean;
}

interface ProjectData {
  id: string;
  projectType: string;
  name: string;
  status: string;
  icon: string;
  description: string;
  tier: number;
  moneyCost: number;
  moneyFunded: number;
  resourceCosts: Record<string, number>;
  resourceFunded: Record<string, number>;
  fundingProgressPct: number;
  buildStartAt: string | null;
  buildEndAt: string | null;
  buildTimeRemainingMs: number | null;
  completedAt: string | null;
  bonuses: Record<string, number>;
  contributions: ProjectContribution[];
  myContribution: {
    moneyContributed: number;
    resourcesContributed: Record<string, number>;
    contributionShare: number;
  } | null;
}

interface AvailableProject {
  type: string;
  name: string;
  icon: string;
  description: string;
  moneyCost: number;
  resourceCosts: Record<string, number>;
  buildDurationDays: number;
  minMembers: number;
  bonuses: Record<string, number>;
  tier: number;
  xpReward: number;
}

interface ProjectsPanelData {
  activeProjects: ProjectData[];
  completedProjects: ProjectData[];
  availableProjects: AvailableProject[];
  canPropose: boolean;
  proposeBlockReason: string | null;
  myRole: string;
}

interface AllianceProjectsPanelProps {
  state: GameState;
}

// ─── Resource Display Names ──────────────────────────────────────────────────

const RESOURCE_NAMES: Record<string, string> = {
  iron: 'Iron',
  aluminum: 'Aluminum',
  titanium: 'Titanium',
  platinum_group: 'Platinum',
  gold: 'Gold',
  rare_earth: 'Rare Earth',
  helium3: 'Helium-3',
  exotic_materials: 'Exotic Materials',
  lunar_water: 'Lunar Water',
  mars_water: 'Mars Water',
  methane: 'Methane',
  ethane: 'Ethane',
};

const RESOURCE_ICONS: Record<string, string> = {
  iron: '🔩',
  aluminum: '🪶',
  titanium: '⚙️',
  platinum_group: '💎',
  gold: '🥇',
  rare_earth: '🔬',
  helium3: '⚛️',
  exotic_materials: '✨',
  lunar_water: '💧',
  mars_water: '🧊',
  methane: '⛽',
  ethane: '🛢️',
};

const BONUS_LABELS: Record<string, string> = {
  revenueBonus: 'Revenue',
  miningBonus: 'Mining',
  researchBonus: 'Research',
  buildSpeedBonus: 'Build Speed',
  defenseBonus: 'Defense',
  launchCostReduction: 'Launch Cost',
  monthlyRevenue: 'Monthly Income',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceProjectsPanel({ state }: AllianceProjectsPanelProps) {
  const [data, setData] = useState<ProjectsPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'completed'>('active');

  // Contribution form state
  const [contributeProjectId, setContributeProjectId] = useState<string | null>(null);
  const [contributeMoneyPct, setContributeMoneyPct] = useState(10); // % of player money
  const [contributeResources, setContributeResources] = useState<Record<string, number>>({});
  const [contributing, setContributing] = useState(false);
  const [contributeError, setContributeError] = useState<string | null>(null);

  // Propose state
  const [proposing, setProposing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliance-projects');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(err.error || 'Failed to load alliance projects');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePropose = useCallback(async (projectType: string) => {
    if (proposing) return;
    setProposing(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('milestone');
        await fetchData();
        setActiveTab('active');
      } else {
        setError(result.error || 'Failed to propose project');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setProposing(false);
  }, [proposing, fetchData]);

  const handleContribute = useCallback(async () => {
    if (contributing || !contributeProjectId) return;
    setContributeError(null);
    setContributing(true);

    const money = Math.round(state.money * (contributeMoneyPct / 100));

    // Filter out zero-value resources
    const resources: Record<string, number> = {};
    for (const [k, v] of Object.entries(contributeResources)) {
      if (v > 0) resources[k] = v;
    }

    if (money <= 0 && Object.keys(resources).length === 0) {
      setContributeError('Must contribute money or resources');
      setContributing(false);
      return;
    }

    try {
      const res = await fetch('/api/space-tycoon/alliance-projects/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: contributeProjectId,
          money,
          resources,
        }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('build_complete');
        setContributeProjectId(null);
        setContributeMoneyPct(10);
        setContributeResources({});
        await fetchData();
      } else {
        setContributeError(result.error || 'Contribution failed');
        playSound('error');
      }
    } catch {
      setContributeError('Network error');
      playSound('error');
    }
    setContributing(false);
  }, [contributing, contributeProjectId, contributeMoneyPct, contributeResources, state.money, fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading alliance projects...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-xs mb-2">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { activeProjects, completedProjects, availableProjects, canPropose, proposeBlockReason, myRole } = data;
  const isLeaderOrOfficer = myRole === 'leader' || myRole === 'officer';

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
        {(['active', 'available', 'completed'] as const).map(tab => {
          const count = tab === 'active' ? activeProjects.length : tab === 'completed' ? completedProjects.length : availableProjects.length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              {tab === 'active' ? `Active (${count})` : tab === 'available' ? `New (${count})` : `Done (${count})`}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-center">
          <p className="text-red-400 text-[10px]">{error}</p>
        </div>
      )}

      {/* ─── Active Projects Tab ────────────────────────────────────── */}
      {activeTab === 'active' && (
        <>
          {activeProjects.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <span className="text-2xl block mb-2">🏗️</span>
              <p className="text-slate-400 text-xs">No active projects.</p>
              <p className="text-slate-600 text-[10px] mt-1">
                {isLeaderOrOfficer ? 'Propose a new project from the "New" tab!' : 'Ask a leader or officer to propose a project.'}
              </p>
            </div>
          ) : (
            activeProjects.map(project => (
              <div key={project.id}>
                <ActiveProjectCard
                  project={project}
                  onContribute={() => {
                    setContributeProjectId(project.id);
                    setContributeMoneyPct(10);
                    setContributeResources({});
                    setContributeError(null);
                  }}
                />

                {/* Contribution Form */}
                {contributeProjectId === project.id && project.status === 'funding' && (
                  <ContributionForm
                    project={project}
                    state={state}
                    moneyPct={contributeMoneyPct}
                    setMoneyPct={setContributeMoneyPct}
                    resources={contributeResources}
                    setResources={setContributeResources}
                    error={contributeError}
                    contributing={contributing}
                    onContribute={handleContribute}
                    onCancel={() => setContributeProjectId(null)}
                  />
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* ─── Available Projects Tab ─────────────────────────────────── */}
      {activeTab === 'available' && (
        <>
          {!canPropose && proposeBlockReason && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-amber-400 text-xs">{proposeBlockReason}</p>
            </div>
          )}
          {availableProjects.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <p className="text-slate-400 text-xs">No new projects available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableProjects.map(ap => (
                <AvailableProjectCard
                  key={ap.type}
                  project={ap}
                  canPropose={canPropose && isLeaderOrOfficer}
                  proposing={proposing}
                  onPropose={() => handlePropose(ap.type)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Completed Projects Tab ─────────────────────────────────── */}
      {activeTab === 'completed' && (
        <>
          {completedProjects.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <span className="text-2xl block mb-2">🏆</span>
              <p className="text-slate-400 text-xs">No completed projects yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedProjects.map(project => (
                <CompletedProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ActiveProjectCard({
  project,
  onContribute,
}: {
  project: ProjectData;
  onContribute: () => void;
}) {
  const isBuilding = project.status === 'building';
  const buildTimeStr = project.buildTimeRemainingMs != null
    ? formatTimeRemaining(project.buildTimeRemainingMs)
    : null;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <div>
            <h3 className="text-white text-sm font-semibold">{project.name}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
              isBuilding
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {isBuilding ? 'Building' : 'Funding'}
            </span>
          </div>
        </div>
        {isBuilding && buildTimeStr && (
          <div className="text-right">
            <p className="text-amber-300 text-xs font-mono font-bold">{buildTimeStr}</p>
            <p className="text-slate-500 text-[10px]">until complete</p>
          </div>
        )}
      </div>

      <p className="text-slate-400 text-[10px] mb-3">{project.description}</p>

      {/* Overall progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-[10px]">Overall Progress</span>
          <span className="text-white text-xs font-bold font-mono">{project.fundingProgressPct}%</span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBuilding ? 'bg-amber-500' : 'bg-purple-500'
            }`}
            style={{ width: `${project.fundingProgressPct}%` }}
          />
        </div>
      </div>

      {/* Resource progress bars */}
      {!isBuilding && (
        <div className="space-y-2 mb-3">
          {/* Money */}
          <ResourceProgressBar
            label="Money"
            icon="💰"
            current={project.moneyFunded}
            target={project.moneyCost}
            formatValue={formatMoney}
          />
          {/* Resources */}
          {Object.entries(project.resourceCosts).map(([resourceId, required]) => {
            const funded = project.resourceFunded[resourceId] ?? 0;
            return (
              <ResourceProgressBar
                key={resourceId}
                label={RESOURCE_NAMES[resourceId] ?? resourceId}
                icon={RESOURCE_ICONS[resourceId] ?? '?'}
                current={funded}
                target={required}
                formatValue={(v) => v.toLocaleString()}
              />
            );
          })}
        </div>
      )}

      {/* Your contribution */}
      {project.myContribution && (
        <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 mb-3">
          <p className="text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-1">Your Contribution</p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-white">
              {formatMoney(project.myContribution.moneyContributed)}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300 font-mono">
              {(project.myContribution.contributionShare * 100).toFixed(1)}% share
            </span>
          </div>
        </div>
      )}

      {/* Top contributors */}
      {project.contributions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-white text-[10px] font-bold uppercase tracking-wider mb-1.5">Top Contributors</h4>
          <div className="space-y-1">
            {project.contributions.slice(0, 5).map((c, idx) => (
              <div
                key={c.profileId}
                className={`flex items-center justify-between py-1 px-2 rounded text-[10px] ${
                  c.isYou ? 'bg-cyan-500/5' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-mono">{idx + 1}.</span>
                  <span className={c.isYou ? 'text-cyan-300' : 'text-slate-300'}>{c.companyName}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {(c.contributionShare * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribute button */}
      {project.status === 'funding' && (
        <button
          onClick={onContribute}
          className="w-full py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          Contribute
        </button>
      )}
    </div>
  );
}

function ResourceProgressBar({
  label,
  icon,
  current,
  target,
  formatValue,
}: {
  label: string;
  icon: string;
  current: number;
  target: number;
  formatValue: (v: number) => string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-slate-400 text-[10px] flex items-center gap-1">
          <span>{icon}</span> {label}
        </span>
        <span className="text-slate-300 text-[10px] font-mono">
          {formatValue(current)} / {formatValue(target)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            pct >= 100 ? 'bg-green-500' : 'bg-purple-500/70'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ContributionForm({
  project,
  state,
  moneyPct,
  setMoneyPct,
  resources,
  setResources,
  error,
  contributing,
  onContribute,
  onCancel,
}: {
  project: ProjectData;
  state: GameState;
  moneyPct: number;
  setMoneyPct: (v: number) => void;
  resources: Record<string, number>;
  setResources: (v: Record<string, number>) => void;
  error: string | null;
  contributing: boolean;
  onContribute: () => void;
  onCancel: () => void;
}) {
  const moneyAmount = Math.round(state.money * (moneyPct / 100));
  const moneyRemaining = Math.max(0, project.moneyCost - project.moneyFunded);
  const actualMoney = Math.min(moneyAmount, moneyRemaining);

  // Only show resources that the project still needs
  const neededResources = Object.entries(project.resourceCosts)
    .filter(([resourceId, required]) => {
      const funded = project.resourceFunded[resourceId] ?? 0;
      return funded < required;
    })
    .map(([resourceId, required]) => {
      const funded = project.resourceFunded[resourceId] ?? 0;
      const remaining = required - funded;
      const playerHas = (state.resources?.[resourceId] ?? 0);
      return { resourceId, remaining, playerHas };
    });

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mt-2">
      <h4 className="text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3">Contribute to {project.name}</h4>

      {/* Money slider */}
      {moneyRemaining > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">
              Money ({moneyPct}%)
            </label>
            <span className="text-white text-xs font-mono">{formatMoney(actualMoney)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={moneyPct}
            onChange={(e) => setMoneyPct(Number(e.target.value))}
            className="w-full h-1.5 bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
            <span>0%</span>
            <span>Available: {formatMoney(state.money)}</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Resource inputs */}
      {neededResources.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Resources</p>
          {neededResources.map(({ resourceId, remaining, playerHas }) => (
            <div key={resourceId} className="flex items-center gap-2">
              <span className="text-sm w-5">{RESOURCE_ICONS[resourceId] ?? '?'}</span>
              <span className="text-slate-300 text-[10px] w-20 truncate">{RESOURCE_NAMES[resourceId] ?? resourceId}</span>
              <input
                type="number"
                min={0}
                max={Math.min(remaining, playerHas)}
                value={resources[resourceId] ?? 0}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(Math.min(remaining, playerHas), Number(e.target.value) || 0));
                  setResources({ ...resources, [resourceId]: val });
                }}
                className="flex-1 h-7 px-2 rounded bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-cyan-500/30 font-mono"
              />
              <span className="text-slate-500 text-[9px] w-24 text-right">
                need {remaining.toLocaleString()} / have {playerHas.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-[10px] mb-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onContribute}
          disabled={contributing}
          className="flex-1 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {contributing ? 'Contributing...' : 'Confirm Contribution'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AvailableProjectCard({
  project,
  canPropose,
  proposing,
  onPropose,
}: {
  project: AvailableProject;
  canPropose: boolean;
  proposing: boolean;
  onPropose: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <div>
            <h3 className="text-white text-xs font-semibold">{project.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.04]">
                Tier {project.tier}
              </span>
              <span className="text-[9px] text-slate-500">
                {project.minMembers}+ members
              </span>
            </div>
          </div>
        </div>
        <span className="text-green-400 text-[10px] font-mono">+{project.xpReward} XP</span>
      </div>

      <p className="text-slate-400 text-[10px] mb-2">{project.description}</p>

      {/* Costs */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 font-mono">
          💰 {formatMoney(project.moneyCost)}
        </span>
        {Object.entries(project.resourceCosts).map(([resourceId, qty]) => (
          <span key={resourceId} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 font-mono">
            {RESOURCE_ICONS[resourceId] ?? '?'} {qty.toLocaleString()} {RESOURCE_NAMES[resourceId] ?? resourceId}
          </span>
        ))}
      </div>

      {/* Bonuses */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(project.bonuses).map(([key, value]) => {
          if (!value) return null;
          const label = BONUS_LABELS[key] ?? key;
          const display = key === 'monthlyRevenue'
            ? formatMoney(value as number) + '/mo'
            : key === 'launchCostReduction'
              ? `-${((value as number) * 100).toFixed(0)}%`
              : `+${((value as number) * 100).toFixed(0)}%`;
          return (
            <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              {label}: {display}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-[10px]">Build time: {project.buildDurationDays} days</span>
        {canPropose ? (
          <button
            onClick={onPropose}
            disabled={proposing}
            className="px-4 py-1.5 text-[10px] font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {proposing ? 'Proposing...' : 'Propose Project'}
          </button>
        ) : (
          <span className="text-slate-600 text-[10px]">Leader/Officer only</span>
        )}
      </div>
    </div>
  );
}

function CompletedProjectCard({ project }: { project: ProjectData }) {
  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <div>
            <h3 className="text-white text-xs font-semibold">{project.name}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-bold uppercase">
              Completed
            </span>
          </div>
        </div>
        {project.completedAt && (
          <span className="text-slate-500 text-[10px]">
            {new Date(project.completedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Active bonuses */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(project.bonuses as Record<string, number>).map(([key, value]) => {
          if (!value) return null;
          const label = BONUS_LABELS[key] ?? key;
          const display = key === 'monthlyRevenue'
            ? formatMoney(value) + '/mo'
            : key === 'launchCostReduction'
              ? `-${(value * 100).toFixed(0)}%`
              : `+${(value * 100).toFixed(0)}%`;
          return (
            <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold">
              {label}: {display}
            </span>
          );
        })}
      </div>

      {/* Top contributors */}
      {project.contributions.length > 0 && (
        <div>
          <h4 className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">Contributors</h4>
          <div className="flex flex-wrap gap-1.5">
            {project.contributions.slice(0, 5).map(c => (
              <span
                key={c.profileId}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  c.isYou ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-white/[0.04] text-slate-400'
                }`}
              >
                {c.companyName} ({(c.contributionShare * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Done!';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
