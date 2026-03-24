'use client';

import { useState, useEffect, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

type ResearchCategory = 'logistics' | 'mining' | 'commerce' | 'military' | 'science' | 'infrastructure';

interface ResearchItem {
  researchId: string;
  category: ResearchCategory;
  tier: number;
  name: string;
  description: string;
  bonusType: string;
  bonusValue: number;
  xpCost: number;
  treasuryCost: number;
  prerequisite: string | null;
  status: 'locked' | 'available' | 'researching' | 'completed';
  progressPct: number;
  startedAt: number | null;
  completedAt: number | null;
  durationDays: number;
}

interface AggregateBonuses {
  logistics: number;
  mining: number;
  commerce: number;
  military: number;
  science: number;
  infrastructure: number;
}

interface AllianceResearchData {
  tree: ResearchItem[];
  allianceLevel: number;
  allianceXP: number;
  treasury: number;
  currentlyResearching: string | null;
  researchProgress: number | null;
}

const CATEGORY_CONFIG: { id: ResearchCategory; label: string; icon: string; color: string }[] = [
  { id: 'logistics', label: 'Logistics', icon: '📦', color: 'cyan' },
  { id: 'mining', label: 'Mining', icon: '⛏️', color: 'amber' },
  { id: 'commerce', label: 'Commerce', icon: '💹', color: 'green' },
  { id: 'military', label: 'Military', icon: '🛡️', color: 'red' },
  { id: 'science', label: 'Science', icon: '🔬', color: 'purple' },
  { id: 'infrastructure', label: 'Infra', icon: '🏗️', color: 'blue' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', accent: 'bg-cyan-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', accent: 'bg-amber-500' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', accent: 'bg-green-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', accent: 'bg-red-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', accent: 'bg-purple-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', accent: 'bg-blue-500' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceResearchPanel() {
  const [data, setData] = useState<AllianceResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ResearchCategory>('logistics');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliance-research');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(err.error || 'Failed to load alliance research');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load research');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartResearch = useCallback(async (itemId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchId: itemId }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('research_start');
        await fetchData();
      } else {
        setError(result.error || 'Failed to start research');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading alliance research...</p>
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

  const { tree: items, allianceLevel, treasury } = data;

  // Compute aggregate bonuses from completed research
  const aggregateBonuses: AggregateBonuses = {
    logistics: 0, mining: 0, commerce: 0, military: 0, science: 0, infrastructure: 0,
  };
  for (const item of items) {
    if (item.status === 'completed') {
      const cat = item.category as keyof AggregateBonuses;
      if (cat in aggregateBonuses) {
        aggregateBonuses[cat] += item.bonusValue * 100;
      }
    }
  }

  const categoryItems = items.filter(i => i.category === activeCategory);
  const tiers = [1, 2, 3, 4, 5];
  const activeCatConfig = CATEGORY_CONFIG.find(c => c.id === activeCategory)!;
  const colors = COLOR_MAP[activeCatConfig.color];

  return (
    <div className="space-y-4">
      {/* Aggregate Bonuses Summary Bar */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>📊</span> Research Bonuses
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORY_CONFIG.map(cat => {
            const bonusVal = aggregateBonuses[cat.id];
            const catColors = COLOR_MAP[cat.color];
            return (
              <div
                key={cat.id}
                className={`p-2 rounded-lg ${catColors.bg} border ${catColors.border} text-center`}
              >
                <span className="text-sm block">{cat.icon}</span>
                <p className={`${catColors.text} text-xs font-bold font-mono`}>
                  {bonusVal > 0 ? `+${bonusVal}%` : '0%'}
                </p>
                <p className="text-slate-500 text-[9px]">{cat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
        {CATEGORY_CONFIG.map(cat => {
          const catColors = COLOR_MAP[cat.color];
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-1 py-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                activeCategory === cat.id
                  ? `${catColors.bg} ${catColors.text} border ${catColors.border}`
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <span className="mr-0.5">{cat.icon}</span> {cat.label}
            </button>
          );
        })}
      </div>

      {/* Tier Progression */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${colors.text}`}>
            <span>{activeCatConfig.icon}</span> {activeCatConfig.label} Research
          </h3>
          <div className="text-right text-[10px] text-slate-500">
            <span>Alliance Lv.{allianceLevel}</span>
            <span className="mx-1.5">|</span>
            <span className="text-amber-300 font-mono">${treasury.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-0">
          {tiers.map((tier, tierIdx) => {
            const item = categoryItems.find(i => i.tier === tier);
            if (!item) {
              return (
                <TierSlot
                  key={tier}
                  tier={tier}
                  item={null}
                  colors={colors}
                  isLast={tierIdx === tiers.length - 1}
                  allianceLevel={allianceLevel}
                  actionLoading={actionLoading}
                  onStart={() => {}}
                />
              );
            }
            return (
              <TierSlot
                key={tier}
                tier={tier}
                item={item}
                colors={colors}
                isLast={tierIdx === tiers.length - 1}
                allianceLevel={allianceLevel}
                actionLoading={actionLoading}
                onStart={() => handleStartResearch(item.researchId)}
              />
            );
          })}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-center">
          <p className="text-red-400 text-[10px]">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function TierSlot({
  tier,
  item,
  colors,
  isLast,
  allianceLevel,
  actionLoading,
  onStart,
}: {
  tier: number;
  item: ResearchItem | null;
  colors: { bg: string; border: string; text: string; accent: string };
  isLast: boolean;
  allianceLevel: number;
  actionLoading: boolean;
  onStart: () => void;
}) {
  const isLocked = item ? item.status === 'locked' : true;
  const isResearching = item?.status === 'researching';
  const isCompleted = item?.status === 'completed';
  const isAvailable = item?.status === 'available';
  const TIER_REQUIRED_LEVELS: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 25, 5: 25 };
  const requiredLevel = TIER_REQUIRED_LEVELS[tier] ?? tier * 5;
  const meetsLevel = allianceLevel >= requiredLevel;

  return (
    <div className="flex items-stretch">
      {/* Vertical connector line + tier circle */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
            isCompleted
              ? 'bg-green-500/20 border-green-500 text-green-300'
              : isResearching
                ? `${colors.bg} ${colors.border} ${colors.text} animate-pulse`
                : isAvailable
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-600'
          }`}
        >
          {isCompleted ? '✓' : tier}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[16px] ${
              isCompleted ? 'bg-green-500/40' : 'bg-white/[0.06]'
            }`}
          />
        )}
      </div>

      {/* Item content */}
      <div
        className={`flex-1 ml-2 mb-3 p-3 rounded-lg border transition-colors ${
          isCompleted
            ? 'bg-green-500/5 border-green-500/20'
            : isResearching
              ? `${colors.bg} ${colors.border}`
              : isAvailable
                ? `bg-white/[0.03] border-white/[0.08] hover:${colors.bg} hover:${colors.border}`
                : 'bg-white/[0.02] border-white/[0.04] opacity-50'
        }`}
      >
        {item ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <h4 className={`text-xs font-semibold ${isCompleted ? 'text-green-300' : isLocked ? 'text-slate-500' : 'text-white'}`}>
                {item.name}
              </h4>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                isCompleted
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : isResearching
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'bg-white/[0.04] text-slate-500'
              }`}>
                Tier {tier}
              </span>
            </div>

            <p className={`text-[10px] mb-2 ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
              {item.description}
            </p>

            {/* Completed */}
            {isCompleted && (
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 text-sm">✅</span>
                <span className="text-green-300 text-[10px] font-mono font-bold">+{Math.round(item.bonusValue * 100)}% {item.bonusType}</span>
              </div>
            )}

            {/* Researching */}
            {isResearching && (() => {
              const durationMs = item.durationDays * 24 * 60 * 60 * 1000;
              const endsAt = item.startedAt ? item.startedAt + durationMs : 0;
              const timeRemainingMs = Math.max(0, endsAt - Date.now());
              return (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] ${colors.text}`}>Researching...</span>
                    <span className="text-slate-400 text-[10px] font-mono">{formatTimeRemaining(timeRemainingMs)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.accent}`}
                      style={{ width: `${item.progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Available */}
            {isAvailable && meetsLevel && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-amber-300 font-mono">{item.xpCost} XP</span>
                  <span className="text-slate-600">+</span>
                  <span className="text-amber-300 font-mono">${item.treasuryCost.toLocaleString()}</span>
                </div>
                <button
                  onClick={onStart}
                  disabled={actionLoading}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition-colors ${colors.text} ${colors.bg} border ${colors.border} hover:brightness-125 disabled:opacity-50`}
                >
                  {actionLoading ? 'Starting...' : 'Start Research'}
                </button>
              </div>
            )}

            {/* Locked */}
            {isLocked && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 text-sm">🔒</span>
                <span className="text-slate-600 text-[10px]">
                  Requires Alliance Level {requiredLevel}
                </span>
              </div>
            )}

            {/* Available but below level */}
            {isAvailable && !meetsLevel && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500/60 text-sm">🔒</span>
                <span className="text-amber-500/60 text-[10px]">
                  Requires Alliance Level {requiredLevel}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 text-sm">🔒</span>
            <span className="text-slate-600 text-[10px]">Tier {tier} — Locked</span>
          </div>
        )}
      </div>
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
