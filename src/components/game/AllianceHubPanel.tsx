'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import AlliancePanel from '@/components/game/AlliancePanel';
import AllianceEventsPanel from '@/components/game/AllianceEventsPanel';
import AllianceProjectsPanel from '@/components/game/AllianceProjectsPanel';
import AllianceResearchPanel from '@/components/game/AllianceResearchPanel';
import AllianceTreasuryPanel from '@/components/game/AllianceTreasuryPanel';
import AllianceDiplomacyPanel from '@/components/game/AllianceDiplomacyPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

type HubTab = 'overview' | 'events' | 'projects' | 'research' | 'treasury' | 'diplomacy';

interface AllianceInfo {
  id: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  tier: number;
  memberCount: number;
}

interface AllianceHubPanelProps {
  state: GameState;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Bronze', color: 'text-amber-600' },
  2: { label: 'Silver', color: 'text-slate-300' },
  3: { label: 'Gold', color: 'text-amber-300' },
  4: { label: 'Platinum', color: 'text-cyan-300' },
  5: { label: 'Diamond', color: 'text-purple-300' },
};

const HUB_TABS: { id: HubTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'events', label: 'Events', icon: '🏁' },
  { id: 'projects', label: 'Projects', icon: '🏗️' },
  { id: 'research', label: 'Research', icon: '🧬' },
  { id: 'treasury', label: 'Treasury', icon: '🏦' },
  { id: 'diplomacy', label: 'Diplomacy', icon: '🕊️' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceHubPanel({ state }: AllianceHubPanelProps) {
  const [allianceInfo, setAllianceInfo] = useState<AllianceInfo | null>(null);
  const [hasAlliance, setHasAlliance] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>('overview');

  const fetchAllianceInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/alliances');
      if (!res.ok) {
        setHasAlliance(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.myAlliance) {
        setAllianceInfo({
          id: data.myAlliance.id,
          name: data.myAlliance.name,
          tag: data.myAlliance.tag,
          level: data.myAlliance.level ?? 1,
          xp: data.myAlliance.xp ?? 0,
          xpToNextLevel: data.myAlliance.xpToNextLevel ?? 100,
          tier: data.myAlliance.tier ?? 1,
          memberCount: data.myAlliance.memberCount ?? 0,
        });
        setHasAlliance(true);
      } else {
        setHasAlliance(false);
      }
    } catch {
      setHasAlliance(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllianceInfo();
    const interval = setInterval(fetchAllianceInfo, 60_000);
    return () => clearInterval(interval);
  }, [fetchAllianceInfo]);

  // Loading
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading corporation...</p>
      </div>
    );
  }

  // No alliance — show create/join panel
  if (!hasAlliance) {
    return <AlliancePanel state={state} />;
  }

  const tierInfo = allianceInfo ? TIER_LABELS[allianceInfo.tier] || TIER_LABELS[1] : TIER_LABELS[1];
  const xpPct = allianceInfo && allianceInfo.xpToNextLevel > 0
    ? Math.min(100, Math.round((allianceInfo.xp / allianceInfo.xpToNextLevel) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Corporation Header */}
      {allianceInfo && (
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-cyan-500/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-sm font-bold">{allianceInfo.name}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                    [{allianceInfo.tag}]
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-slate-500 text-[10px]">{allianceInfo.memberCount} members</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 font-mono">
                  Tier {allianceInfo.tier}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                Lv.{allianceInfo.level}
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-slate-500 text-[9px]">Corporation XP</span>
              <span className="text-purple-300 text-[9px] font-mono">
                {allianceInfo.xp.toLocaleString()} / {allianceInfo.xpToNextLevel.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
        {HUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
              activeTab === t.id
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          >
            <span className="mr-0.5">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <AlliancePanel state={state} />}
      {activeTab === 'events' && <AllianceEventsPanel />}
      {activeTab === 'projects' && <AllianceProjectsPanel state={state} />}
      {activeTab === 'research' && <AllianceResearchPanel />}
      {activeTab === 'treasury' && <AllianceTreasuryPanel />}
      {activeTab === 'diplomacy' && <AllianceDiplomacyPanel />}
    </div>
  );
}
