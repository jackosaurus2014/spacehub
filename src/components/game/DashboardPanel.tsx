'use client';

import { useMemo, useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, formatCountdown } from '@/lib/game/formulas';
import { BUILDING_MAP, getPowerByLocation } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { SHIP_MAP } from '@/lib/game/ships';
import { RESEARCH, getResearchBonuses, getResearchMechanicalEffect, isRareTechVisible } from '@/lib/game/research-tree';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getWorkforceBonuses, getMonthlyPayroll } from '@/lib/game/workforce';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { LOCATIONS } from '@/lib/game/solar-system';
import { getFrontierSummary, FRONTIER_GRADUATION_NET_WORTH } from '@/lib/game/frontier';
// Wave E4 (Finite Demand Pools): dashboard P&L reads THE tick's multiplier
// source — never a stale copy of the retired log-decay map.
import { getServiceDemandMultiplier } from '@/lib/game/service-pricing';
import { gameDateToMonthIndex } from '@/lib/game/demand-pools';
import {
  computeInsuredAssetValue,
  countInsuranceRiskLocations,
  getMonthlyInsurancePremium,
} from '@/lib/game/economic-sinks';
import IncomeChart from '@/components/game/IncomeChart';
import DashboardVizBlock from '@/components/game/DashboardVizBlock';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';
import MiniActivitiesWidget from '@/components/game/MiniActivitiesWidget';
import type { MiniActivityReward } from '@/lib/game/mini-activities';
import WorldStatusCard from '@/components/game/WorldStatusCard';
import WorldEventsBanner from '@/components/game/WorldEventsBanner';
import StoryChapterBanner from '@/components/game/StoryChapterBanner';
import ReturningCommanderWidget from '@/components/game/ReturningCommanderWidget';
import MissionCalendarPanel from '@/components/game/MissionCalendarPanel';
import HistoricalArchiveTicker from '@/components/game/HistoricalArchiveTicker';
import { useActivityFeed, formatRelativeTime, usePrefersReducedMotion } from '@/hooks/useWorldState';
import { ConsolePanel, HoloCard, DataChip } from '@/components/game/chrome';
import GameIcon, { type GameIconGlow } from '@/components/game/GameIcon';
import type { IconName } from '@/lib/game/icons';

/** state.recentHazards[].type → icon (mirrors HazardAlertLayer.tsx's HAZARD_META mapping). */
const HAZARD_ICON: Record<string, IconName> = {
  solar_storm: 'hazard-solar-storm',
  micrometeorite: 'hazard-micrometeorite',
  pirate_raid: 'hazard-pirate-raid',
  equipment_failure: 'hazard-equipment-failure',
};

/** Live countdown timer for research (purple) */
function ResearchCountdown({ startedAtMs, durationSeconds }: { startedAtMs: number; durationSeconds: number }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - startedAtMs) / 1000;
    return Math.max(0, durationSeconds - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAtMs) / 1000;
      setRemaining(Math.max(0, durationSeconds - elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAtMs, durationSeconds]);

  const pct = Math.min(100, ((durationSeconds - remaining) / durationSeconds) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-purple-500/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 relative"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] motion-reduce:animate-none" />
        </div>
      </div>
      <span className="text-purple-400 font-mono text-xs shrink-0 tabular-nums w-14 text-right">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** Live countdown timer that ticks every second */
function Countdown({ startedAtMs, durationSeconds }: { startedAtMs: number; durationSeconds: number }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - startedAtMs) / 1000;
    return Math.max(0, durationSeconds - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAtMs) / 1000;
      const rem = Math.max(0, durationSeconds - elapsed);
      setRemaining(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAtMs, durationSeconds]);

  const pct = Math.min(100, ((durationSeconds - remaining) / durationSeconds) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-amber-400 font-mono text-[10px] shrink-0 tabular-nums w-12 text-right">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** Mini sparkline using CSS */
function MiniSparkline({ positive }: { positive: boolean }) {
  return (
    <div className="flex items-end gap-px h-4 mt-1">
      {[3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 12].map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-t-sm transition-all ${positive ? 'bg-green-400/40' : 'bg-red-400/40'}`}
          style={{ height: `${h * (positive ? 1 : 0.7)}px`, animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

/** Empire Overview — visual summary of the player's space empire */
function EmpireOverview({ state, onUpdateCompanyName }: { state: GameState; onUpdateCompanyName?: (name: string) => void }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.companyName || '');
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const locations = state.unlockedLocations.length;
  const research = state.completedResearch.length;
  const ships = (state.ships || []).filter(s => s.isBuilt).length;
  const services = state.activeServices.length;
  const resources = Object.values(state.resources || {}).reduce((a, b) => a + b, 0);
  const workers = state.workforce ? state.workforce.engineers + state.workforce.scientists + state.workforce.miners + state.workforce.operators : 0;

  // Determine empire tier based on progress
  const tier = completedBuildings >= 30 ? 'Megacorp' :
    completedBuildings >= 15 ? 'Corporation' :
    completedBuildings >= 8 ? 'Enterprise' :
    completedBuildings >= 3 ? 'Startup' : 'Founded';

  const tierColors: Record<string, string> = {
    Founded: '#71717a',
    Startup: '#2DCCFF',
    Enterprise: '#56F000',
    Corporation: '#FFB302',
    Megacorp: '#FF3838',
  };

  const metrics: { icon: IconName; value: number; label: string }[] = [
    { icon: 'build', value: completedBuildings, label: 'Buildings' },
    { icon: 'map', value: locations, label: 'Locations' },
    { icon: 'research', value: research, label: 'Research' },
    { icon: 'services', value: services, label: 'Services' },
    { icon: 'fleet', value: ships, label: 'Ships' },
    { icon: 'workforce', value: workers, label: 'Crew' },
  ];

  return (
    <ConsolePanel
      title="Empire Overview"
      icon="globe"
      subtitle="Tier standing, reach, and infrastructure power status."
      right={<span className="text-[10px] font-mono text-slate-500">{formatGameDate(state.gameDate)}</span>}
    >
      <div className="space-y-3">
      {/* Tier + company name */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold" style={{ color: tierColors[tier] || '#71717a' }}>{tier}</span>
          {editingName && onUpdateCompanyName ? (
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const trimmed = nameInput.trim(); if (trimmed) { onUpdateCompanyName(trimmed); } setEditingName(false); }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
                onBlur={() => { const trimmed = nameInput.trim(); if (trimmed && onUpdateCompanyName) { onUpdateCompanyName(trimmed); } setEditingName(false); }}
                className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-mono bg-white/[0.08] border border-cyan-500/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30 w-32"
              />
            </form>
          ) : (
            <button
              onClick={() => { if (onUpdateCompanyName) { setNameInput(state.companyName || ''); setEditingName(true); } }}
              className="text-[10px] uppercase tracking-wider font-mono hover:text-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[44px] px-1"
              style={{ color: 'var(--text-muted)' }}
              title="Click to rename"
              aria-label={`Rename company (currently ${state.companyName || 'Your Company'})`}
            >
              {state.companyName || 'Your Company'} <GameIcon name="edit" size={11} />
            </button>
          )}
      </div>

      {/* Visual metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-2 sm:gap-0 sm:divide-x rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-void)' }}>
        {metrics.map(m => (
          <div key={m.label} className="flex flex-col items-center py-2.5 px-1">
            <span className="mb-0.5 text-slate-400"><GameIcon name={m.icon} size={15} /></span>
            <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{m.value}</span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Location progress bar — visual of how far across the solar system */}
      <div>
        <div className="flex items-center gap-1">
          {['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system'].map(loc => {
            const unlocked = state.unlockedLocations.includes(loc);
            return (
              <div
                key={loc}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{ background: unlocked ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                title={loc.replace(/_/g, ' ')}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Earth</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Outer System</span>
        </div>
      </div>

      {/* Power status per location */}
      {(() => {
        const power = getPowerByLocation(state.buildings);
        const entries = Object.entries(power).filter(([loc]) => state.unlockedLocations.includes(loc));
        if (entries.length === 0) return null;
        const hasDeficit = entries.some(([, data]) => data.ratio < 1);
        return (
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Power Grid</span>
              {hasDeficit && <span className="text-[10px] text-red-400 font-semibold ml-1">DEFICIT</span>}
            </div>
            <div className="space-y-1">
              {entries.map(([loc, data]) => {
                const color = data.ratio >= 1
                  ? 'text-green-400'
                  : data.ratio >= 0.6
                    ? 'text-amber-400'
                    : 'text-red-400';
                const bgColor = data.ratio >= 1
                  ? 'bg-green-500/10'
                  : data.ratio >= 0.6
                    ? 'bg-amber-500/10'
                    : 'bg-red-500/10';
                const barColor = data.ratio >= 1
                  ? 'bg-green-400'
                  : data.ratio >= 0.6
                    ? 'bg-amber-400'
                    : 'bg-red-400';
                const statusIcon: IconName = data.ratio >= 1 ? 'check' : data.ratio >= 0.6 ? 'warning' : 'close';
                const locName = loc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const shortName = locName.replace('Surface', 'Sfc').replace('System', 'Sys').replace('Orbit', 'Orb').trim();
                const revenuePenalty = data.ratio < 1 ? Math.round((1 - data.ratio) * 100) : 0;
                return (
                  <div
                    key={loc}
                    className={`px-2 py-1 rounded ${bgColor}`}
                    title={`${locName}: ${data.generated} MW generated / ${data.required} MW required (${Math.round(data.ratio * 100)}% efficiency)`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{shortName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono ${color} inline-flex items-center gap-1`}>
                          <GameIcon name="power" size={11} />
                          <GameIcon name={statusIcon} size={11} />
                          {data.generated}/{data.required} MW
                        </span>
                        {revenuePenalty > 0 && (
                          <span className="text-[10px] font-mono text-red-400 bg-red-500/20 px-1 rounded">
                            -{revenuePenalty}% rev
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, data.ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {hasDeficit && (
              <p className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                Underpowered facilities operate at reduced efficiency. Revenue is proportionally reduced. Build solar farms or nuclear reactors to restore full output.
              </p>
            )}
          </div>
        );
      })()}
      </div>
    </ConsolePanel>
  );
}

/** Real-time HUD clock — ticks every second. Purely decorative "mission time" readout. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  return (
    <span className="timer-hud timer-hud-live game-number text-cyan-300 text-xs sm:text-sm">
      {hh}:{mm}:{ss}
    </span>
  );
}

/** Command Center header band — corporation identity, mission clock, region readout.
 *  Per CLAUDE.md: "Earth command center is the main hub" — this is the operations-room anchor. */
/** Compact activity ticker for the Command Center header (audit Change #3 /
 *  D1). The `activity` route already has 6 writers and, before this wave,
 *  zero readers anywhere in the client — this is the cheapest possible
 *  "other people exist" signal. Reduced motion: renders a static list of the
 *  latest 3 items instead of auto-advancing — no marquee, ever, under
 *  reduced motion. */
function ActivityTicker() {
  const { activities } = useActivityFeed(10);
  const reducedMotion = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reducedMotion || activities.length <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % activities.length), 6000);
    return () => clearInterval(timer);
  }, [reducedMotion, activities.length]);

  if (activities.length === 0) return null;

  if (reducedMotion) {
    return (
      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1" aria-live="polite">
        <p className="game-label !text-cyan-400/70 mb-1">Galactic Activity</p>
        {activities.slice(0, 3).map(a => (
          <p key={a.id} className="text-[10px] text-slate-400 truncate">
            {a.title} <span className="text-slate-600">· {formatRelativeTime(a.createdAt)}</span>
          </p>
        ))}
      </div>
    );
  }

  const current = activities[idx % activities.length];
  return (
    <div className="mt-2 pt-2 border-t border-white/[0.06]" aria-live="polite" role="status">
      <p className="game-label !text-cyan-400/70 mb-1">Galactic Activity</p>
      <p key={current.id} className="text-[10px] text-slate-300 truncate animate-reveal-up">
        <GameIcon name="activity" size={11} /> {current.title}
        <span className="text-slate-600"> · {formatRelativeTime(current.createdAt)}</span>
      </p>
    </div>
  );
}

function CommandCenterHeader({ state }: { state: GameState }) {
  const corpTier = state.corporationTier || 1;
  const tierDef = getTierDef(corpTier);
  const frontier = [...LOCATIONS].reverse().find(l => state.unlockedLocations.includes(l.id));
  const showFrontier = frontier && frontier.id !== 'earth_surface';

  // Protected Frontier graduation progress — small, unobtrusive meter.
  // Per CLAUDE.md: "Graduation to the open economy happens at a set
  // net-worth threshold." Full detail lives in FrontierBadge; this is just
  // an always-visible glance at progress while a new corp is still shielded.
  const frontierSummary = getFrontierSummary(state);
  const showFrontierMeter = frontierSummary.status === 'active' && frontierSummary.inFrontier;

  return (
    <div className="hud-frame hud-frame-amber relative rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] via-white/[0.02] to-cyan-500/[0.06] px-3 sm:px-4 py-3 mb-1">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="game-label !text-amber-400/80">Command Center</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-hud text-white text-base sm:text-xl font-bold tracking-wide truncate">
              {state.companyName || 'Your Company'}
            </h1>
            <span
              className="text-[10px] font-hud font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0"
              style={{ color: tierDef.color, borderColor: `${tierDef.color}40`, background: `${tierDef.color}14` }}
            >
              {tierDef.icon} {tierDef.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="game-label">Mission Time</p>
            <LiveClock />
          </div>
          <div className="text-right">
            <p className="game-label">Region</p>
            <p className="font-hud text-[11px] sm:text-xs text-cyan-300 whitespace-nowrap inline-flex items-center gap-1">
              <GameIcon name="globe" size={12} /> Earth HQ{showFrontier ? ` · Frontier: ${frontier!.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      {showFrontierMeter && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] mb-1 gap-2">
            <span className="text-emerald-300/80 font-hud font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <GameIcon name="shield" size={11} /> Frontier Graduation
            </span>
            <span className="text-slate-400 font-mono truncate">
              {formatMoney(frontierSummary.netWorth)} / {formatMoney(FRONTIER_GRADUATION_NET_WORTH)}
            </span>
          </div>
          <div
            className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Progress toward Protected Frontier graduation net worth threshold"
            aria-valuenow={Math.round(frontierSummary.netWorthProgressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${Math.round(frontierSummary.netWorthProgressPct)}% of the way to graduation`}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${frontierSummary.netWorthProgressPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <ActivityTicker />
    </div>
  );
}

/** Quick-nav holo tile grid — one-tap access to the panels players touch most,
 *  each showing a live stat, plus a current-alerts strip. Calls onNavigate with
 *  a GameTab id to switch tabs via the existing tab-switch mechanism in page.tsx. */
function QuickNavGrid({
  state,
  hasPowerDeficit,
  onNavigate,
}: {
  state: GameState;
  hasPowerDeficit: boolean;
  onNavigate?: (tab: string) => void;
}) {
  const corpTier = state.corporationTier || 1;
  const tierDef = getTierDef(corpTier);
  const builtShips = (state.ships || []).filter(s => s.isBuilt).length;
  const inProgressCount = state.buildings.filter(b => !b.isComplete).length;
  const resourceUnits = Object.values(state.resources || {}).reduce((a, b) => a + b, 0);
  const activeContracts = (state.activeContracts || []).length;
  const researchDone = state.completedResearch.length;
  // W10: rare techs the corp hasn't discovered yet don't count toward the
  // visible denominator (matches ResearchPanel's own progress bar).
  const visibleResearchCount = RESEARCH.filter(r => isRareTechVisible(r, state.unlockedRareTechIds)).length;

  const tiles: { id: string; label: string; icon: IconName; stat: string }[] = [
    { id: 'market', label: 'Market', icon: 'market', stat: `${resourceUnits.toLocaleString()} units held` },
    { id: 'fleet', label: 'Fleet', icon: 'fleet', stat: `${builtShips} ship${builtShips !== 1 ? 's' : ''} active` },
    { id: 'build', label: 'Build', icon: 'build', stat: `${inProgressCount} under construction` },
    { id: 'alliance', label: 'Corporation', icon: 'alliance', stat: `${tierDef.icon} ${tierDef.name}` },
    { id: 'contracts', label: 'Contracts', icon: 'contracts', stat: `${activeContracts} active` },
    { id: 'research', label: 'Research', icon: 'research', stat: `${researchDone}/${visibleResearchCount} complete` },
  ];

  const alerts: { icon: IconName; label: string; tone: 'red' | 'amber' | 'cyan' }[] = [];
  if (hasPowerDeficit) alerts.push({ icon: 'power', label: 'Power deficit active', tone: 'red' });
  const unreadReports = (state.reports || []).filter(r => !r.read).length;
  if (unreadReports > 0) alerts.push({ icon: 'reports', label: `${unreadReports} unread report${unreadReports !== 1 ? 's' : ''}`, tone: 'cyan' });
  const recentHazard = (state.recentHazards || []).find(h => Date.now() - h.occurredAtMs < 10 * 60 * 1000);
  if (recentHazard) alerts.push({ icon: HAZARD_ICON[recentHazard.type] || 'hazard-generic', label: `Recent hazard: ${recentHazard.type.replace(/_/g, ' ')}`, tone: 'amber' });
  // Wave F UI surfacing (b): forecast warnings for next game-month, distinct
  // from recentHazard above (which is a hazard that already struck).
  const hazardWarningCount = (state.hazardWarnings || []).length;
  const severeHazardWarning = (state.hazardWarnings || []).some(w => w.severity === 'severe');
  if (hazardWarningCount > 0) {
    alerts.push({
      icon: 'warning',
      label: `${hazardWarningCount} hazard warning${hazardWarningCount !== 1 ? 's' : ''} forecast next month`,
      tone: severeHazardWarning ? 'red' : 'amber',
    });
  }

  return (
    <ConsolePanel title="Quick Access" icon="dashboard" subtitle="One-tap access to the systems you touch most.">
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tiles.map(t => (
            <HoloCard
              key={t.id}
              as="button"
              interactive
              onClick={() => onNavigate?.(t.id)}
              className="p-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <GameIcon name={t.icon} size={16} />
                <span className="game-label">{t.label}</span>
              </div>
              <p className="game-number text-white text-[11px]">{t.stat}</p>
            </HoloCard>
          ))}
        </div>
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="status" aria-live="polite">
            {alerts.map((a, i) => (
              <DataChip key={i} icon={a.icon} tone={a.tone === 'red' ? 'bad' : a.tone === 'amber' ? 'warn' : 'info'}>
                {a.label}
              </DataChip>
            ))}
          </div>
        )}
      </div>
    </ConsolePanel>
  );
}

export default function DashboardPanel({ state, onUpdateCompanyName, onNavigate, onSetInsuranceActive, onResolveChapterEpilogue }: { state: GameState; onUpdateCompanyName?: (name: string) => void; onNavigate?: (tab: string) => void; onSetInsuranceActive?: (active: boolean) => void; onResolveChapterEpilogue?: (participationCount: number) => void }) {
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const inProgress = state.buildings.filter(b => !b.isComplete);
  // W10: rare techs the corp hasn't discovered yet don't count toward the
  // visible denominator (matches ResearchPanel's own progress bar).
  const visibleResearchCount = RESEARCH.filter(r => isRareTechVisible(r, state.unlockedRareTechIds)).length;

  // Power balance per location (for revenue penalty display)
  const powerData = useMemo(() => getPowerByLocation(state.buildings), [state.buildings]);

  // Calculate financials — matches game engine logic exactly
  const financials = useMemo(() => {
    const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    const wfBonuses = getWorkforceBonuses(workforce);
    const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
    const payroll = getMonthlyPayroll(workforce);

    const demandMonthIndex = gameDateToMonthIndex(state.gameDate);
    const collectedDemandMults: number[] = [];
    let revenue = 0, opCosts = 0, maintenance = 0;
    let hasPowerDeficit = false;
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (!def) continue;
      const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
      const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
      const supplyMult = getServiceDemandMultiplier(state, svc.definitionId, svc.locationId, demandMonthIndex);
      collectedDemandMults.push(supplyMult);
      // Power factor: underpowered locations reduce revenue
      const locPower = powerData[svc.locationId];
      const powerRatio = locPower ? locPower.ratio : 1;
      if (powerRatio < 1) hasPowerDeficit = true;
      revenue += Math.round(
        def.revenuePerMonth
        * svc.revenueMultiplier
        * upgradeBoost
        * (1 + wfBonuses.serviceRevenue)
        * (1 + resBonuses.serviceRevenueBonus)
        * supplyMult
        * powerRatio
      );
      opCosts += def.operatingCostPerMonth;
    }
    for (const bld of state.buildings) {
      if (!bld.isComplete) continue;
      const def = BUILDING_MAP.get(bld.definitionId);
      if (!def) continue;
      const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
      maintenance += Math.round(def.maintenanceCostPerMonth * maintMult * (1 - resBonuses.maintenanceReduction));
    }
    // Check if any services are demand-pool-impacted (Wave E4)
    const hasSupplyPenalty = collectedDemandMults.some(m => m < 0.99);
    const avgSupplyMult = collectedDemandMults.length > 0
      ? collectedDemandMults.reduce((a, b) => a + b, 0) / collectedDemandMults.length
      : 1.0;

    const costs = opCosts + maintenance + payroll;
    return { revenue, costs, opCosts, maintenance, payroll, net: revenue - costs, wfBonuses, resBonuses, hasSupplyPenalty, avgSupplyMult, hasPowerDeficit };
  }, [state, powerData]);

  return (
    <div className="space-y-4">
      {/* Command Center header — corporation identity, mission clock, region readout */}
      <CommandCenterHeader state={state} />
      {/* Sol Events — real-world space weather / launch / milestone feed, mirrored into the game as archive entries. Renders nothing when no event is active. */}
      <WorldEventsBanner />
      {/* Story Chapters (LS8) — calendar-dated, world-synchronized narrative arc banner: act progress, finale countdown, server-backed participation tally. Renders nothing before the first tick has started chapter tracking. */}
      <StoryChapterBanner state={state} onResolveEpilogue={onResolveChapterEpilogue} />
      {/* Returning Commander (LS2) — 7-day re-entry objectives + decaying earnings boost after a >=14-day lapse. Renders nothing when no track is active. */}
      <ReturningCommanderWidget state={state} />
      {/* Mission Calendar (LS3) — unified forward view: league lock, senate docket close, season transitions, alliance event windows, NPC co-fund windows, expedition returns, queue completions, appointment world events, real launch windows. Renders nothing when the 14-day horizon is empty. */}
      <MissionCalendarPanel state={state} />
      {/* Quick-nav holo tiles — one-tap access to the panels players touch most, + live alerts strip */}
      <QuickNavGrid state={state} hasPowerDeficit={financials.hasPowerDeficit} onNavigate={onNavigate} />
      {/* The live world — colony races, milestone claims, competitive contracts (audit Change #3) */}
      <WorldStatusCard companyName={state.companyName} />
      {/* Empire Overview — visual summary at the top */}
      <EmpireOverview state={state} onUpdateCompanyName={onUpdateCompanyName} />
      {/* HUD-styled at-a-glance viz — revenue breakdown, fleet status, infrastructure mix */}
      <DashboardVizBlock state={state} />

      {/* Hero Stats */}
      <ConsolePanel title="Key Metrics" icon="dashboard" subtitle="Monthly financial and infrastructure snapshot.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          {
            label: 'Revenue/mo',
            value: formatMoney(financials.revenue),
            color: 'text-green-400',
            bgGlow: 'bg-green-500/5',
            borderColor: 'border-green-500/20',
            icon: 'trending-up',
            glow: 'green',
          },
          {
            label: 'Costs/mo',
            value: formatMoney(financials.costs),
            color: 'text-red-400',
            bgGlow: 'bg-red-500/5',
            borderColor: 'border-red-500/20',
            icon: 'trending-down',
            glow: 'red',
          },
          {
            label: 'Buildings',
            value: `${completedBuildings.length}`,
            color: 'text-cyan-400',
            bgGlow: 'bg-cyan-500/5',
            borderColor: 'border-cyan-500/20',
            icon: 'build',
            glow: 'cyan',
          },
          {
            label: 'Research',
            value: `${state.completedResearch.length}/${visibleResearchCount}`,
            color: 'text-purple-400',
            bgGlow: 'bg-purple-500/5',
            borderColor: 'border-purple-500/20',
            icon: 'research',
            glow: 'purple',
          },
        ] as { label: string; value: string; color: string; bgGlow: string; borderColor: string; icon: IconName; glow: GameIconGlow }[]).map(s => (
          <div key={s.label} className={`relative overflow-hidden rounded-xl border ${s.borderColor} ${s.bgGlow} p-3`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-lg font-bold ${s.color} font-mono`}>{s.value}</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
              <span className={`${s.color} opacity-50`}><GameIcon name={s.icon} size={20} glow={s.glow} /></span>
            </div>
          </div>
        ))}
      </div>
      </ConsolePanel>

      {/* Active Research with real-time countdown — promoted to top for visibility */}
      {state.activeResearch && (() => {
        const def = RESEARCH.find(r => r.id === state.activeResearch!.definitionId);
        const hasRealTime = state.activeResearch!.startedAtMs && state.activeResearch!.realDurationSeconds;
        const hasQ2 = state.completedResearch.includes('parallel_research');
        return (
          <ConsolePanel accent="purple" compact icon="research" title={def?.name || 'Research'} right={hasQ2 ? <DataChip tone="info">Q1</DataChip> : undefined}>
            {hasRealTime ? (
              <ResearchCountdown startedAtMs={state.activeResearch!.startedAtMs!} durationSeconds={state.activeResearch!.realDurationSeconds!} />
            ) : (
              <div className="h-1.5 bg-purple-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
          </ConsolePanel>
        );
      })()}
      {state.activeResearch2 && state.completedResearch.includes('parallel_research') && (() => {
        const def2 = RESEARCH.find(r => r.id === state.activeResearch2!.definitionId);
        const hasRealTime2 = state.activeResearch2!.startedAtMs && state.activeResearch2!.realDurationSeconds;
        return (
          <ConsolePanel accent="cyan" compact icon="research" title={def2?.name || 'Research'} right={<DataChip tone="info">Q2</DataChip>}>
            {hasRealTime2 ? (
              <ResearchCountdown startedAtMs={state.activeResearch2!.startedAtMs!} durationSeconds={state.activeResearch2!.realDurationSeconds!} />
            ) : (
              <div className="h-1.5 bg-cyan-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
          </ConsolePanel>
        );
      })()}

      {/* Under Construction — promoted to top for visibility */}
      {inProgress.length > 0 && (
        <ConsolePanel
          accent="amber"
          compact
          icon="build"
          title={`Building (${inProgress.length})`}
          right={<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />}
        >
          <div className="space-y-2">
            {inProgress.slice(0, 3).map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              const loc = LOCATION_MAP.get(bld.locationId);
              return (
                <div key={bld.instanceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white">{def?.name}</span>
                    <span className="text-slate-600 text-[10px]">{loc?.name}</span>
                  </div>
                  {bld.startedAtMs && bld.realDurationSeconds ? (
                    <Countdown startedAtMs={bld.startedAtMs} durationSeconds={bld.realDurationSeconds} />
                  ) : (
                    <span className="text-amber-400/70 font-mono text-[10px]">{formatGameDate(bld.completionDate)}</span>
                  )}
                </div>
              );
            })}
            {inProgress.length > 3 && <p className="text-slate-600 text-[10px]">+{inProgress.length - 3} more</p>}
          </div>
        </ConsolePanel>
      )}

      {/* Net Income Banner */}
      <ConsolePanel
        compact
        accent={financials.net >= 0 ? 'cyan' : 'red'}
        icon={financials.net >= 0 ? 'trending-up' : 'trending-down'}
        title="Net Income"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              financials.net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <GameIcon name={financials.net >= 0 ? 'trending-up' : 'trending-down'} size={16} className={financials.net >= 0 ? 'text-green-400' : 'text-red-400'} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">
                <span className={financials.net >= 0 ? 'text-green-400' : 'text-red-400'}>{formatMoney(financials.net)}/mo</span>
              </p>
              <p className="text-slate-500 text-[10px]">
                {state.activeServices.length} active service{state.activeServices.length !== 1 ? 's' : ''} · {state.unlockedLocations.length} location{state.unlockedLocations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <MiniSparkline positive={financials.net >= 0} />
        </div>
      </ConsolePanel>

      {/* Cost Breakdown — so players see workforce, research bonuses, and all line items */}
      {(financials.payroll > 0 || financials.wfBonuses.serviceRevenue > 0 || financials.resBonuses.serviceRevenueBonus > 0) && (
        <ConsolePanel icon="money" title="Income Breakdown">
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Base service revenue</span>
              <span className="text-slate-300 font-mono">
                {formatMoney(state.activeServices.reduce((sum, s) => {
                  const def = SERVICE_MAP.get(s.definitionId);
                  return sum + (def ? Math.round(def.revenuePerMonth * s.revenueMultiplier) : 0);
                }, 0))}
              </span>
            </div>
            {financials.wfBonuses.serviceRevenue > 0 && (
              <div className="flex justify-between">
                <span className="text-cyan-400/80">+ Workforce bonus</span>
                <span className="text-cyan-400 font-mono">+{Math.round(financials.wfBonuses.serviceRevenue * 100)}%</span>
              </div>
            )}
            {financials.resBonuses.serviceRevenueBonus > 0 && (
              <div className="flex justify-between">
                <span className="text-purple-400/80">+ Research bonus</span>
                <span className="text-purple-400 font-mono">+{Math.round(financials.resBonuses.serviceRevenueBonus * 100)}%</span>
              </div>
            )}
            {financials.hasSupplyPenalty && (
              <div className="flex justify-between">
                <span className="text-amber-400/80">- Market supply pressure</span>
                <span className="text-amber-400 font-mono">{Math.round((financials.avgSupplyMult - 1) * 100)}%</span>
              </div>
            )}
            {financials.hasPowerDeficit && (
              <div className="flex justify-between">
                <span className="text-red-400/80 inline-flex items-center gap-1"><GameIcon name="power" size={10} /> Power deficit penalty</span>
                <span className="text-red-400 font-mono text-[10px]">Build solar/nuclear!</span>
              </div>
            )}
            <div className="border-t border-white/[0.04] my-1" />
            <div className="flex justify-between">
              <span className="text-slate-400">Operating costs</span>
              <span className="text-red-400/70 font-mono">-{formatMoney(financials.opCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Maintenance{financials.resBonuses.maintenanceReduction > 0 ? ` (-${Math.round(financials.resBonuses.maintenanceReduction * 100)}% research)` : ''}</span>
              <span className="text-red-400/70 font-mono">-{formatMoney(financials.maintenance)}</span>
            </div>
            {financials.payroll > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Crew payroll</span>
                <span className="text-red-400/70 font-mono">-{formatMoney(financials.payroll)}</span>
              </div>
            )}
          </div>
        </ConsolePanel>
      )}

      {/* Income History Chart */}
      {state.incomeHistory && state.incomeHistory.length >= 2 && (
        <IncomeChart data={state.incomeHistory} />
      )}

      {/* Mini-Activities — quick money-earning actions */}
      <MiniActivitiesWidget
        state={state}
        onExecute={(activityId: string, reward: MiniActivityReward) => {
          window.dispatchEvent(new CustomEvent('mini-activity-execute', {
            detail: { activityId, reward },
          }));
        }}
      />

      {/* Weekly Challenge */}
      <WeeklyChallengeWidget />

      {/* Speed Boosts — available and active */}
      {((state.availableBoosts && state.availableBoosts.length > 0) || (state.activeBoosts && state.activeBoosts.length > 0)) && (
        <ConsolePanel compact accent="amber" icon="power" title="Speed Boosts">
          {/* Active boosts with countdown */}
          {state.activeBoosts && state.activeBoosts.filter(b => b.expiresAtMs > Date.now()).map(b => (
            <div key={b.boostId} className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-green-400">{b.label}</span>
              <span className="text-green-400/70 font-mono">
                {Math.max(0, Math.round((b.expiresAtMs - Date.now()) / 60000))}m left
              </span>
            </div>
          ))}
          {/* Available boosts to activate */}
          {state.availableBoosts && state.availableBoosts.length > 0 && (
            <div className="space-y-1 mt-1">
              {state.availableBoosts.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{b.label}</span>
                  <button
                    onClick={() => {
                      // Move from available to active
                      const now = Date.now();
                      const activeBoost = {
                        boostId: b.id,
                        type: b.type,
                        multiplier: b.multiplier,
                        activatedAtMs: now,
                        expiresAtMs: now + b.durationSeconds * 1000,
                        label: b.label,
                      };
                      // This requires a setState callback from the parent — use window event
                      window.dispatchEvent(new CustomEvent('activate-boost', { detail: { boostId: b.id, activeBoost } }));
                    }}
                    className="min-h-[44px] inline-flex items-center justify-center px-3 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/30 transition-colors"
                  >
                    Activate
                  </button>
                </div>
              ))}
              {state.availableBoosts.length > 5 && (
                <p className="text-slate-600 text-[10px]">+{state.availableBoosts.length - 5} more</p>
              )}
            </div>
          )}
        </ConsolePanel>
      )}

      {/* Active Effects (from random events) */}
      {state.activeEffects && state.activeEffects.length > 0 && (
        <ConsolePanel compact icon="sparkle" title="Active Effects">
          <div className="flex flex-wrap gap-2">
            {state.activeEffects.map((eff, i) => (
              <DataChip
                key={i}
                tone={
                  eff.revenueMultiplier > 1 ? 'good' :
                  eff.costMultiplier > 1 ? 'bad' :
                  eff.revenueMultiplier < 1 ? 'warn' :
                  'neutral'
                }
              >
                {eff.label}
                {eff.revenueMultiplier !== 1 && ` (${eff.revenueMultiplier > 1 ? '+' : ''}${Math.round((eff.revenueMultiplier - 1) * 100)}% rev)`}
                {eff.costMultiplier !== 1 && ` (${eff.costMultiplier > 1 ? '+' : ''}${Math.round((eff.costMultiplier - 1) * 100)}% cost)`}
              </DataChip>
            ))}
          </div>
        </ConsolePanel>
      )}

      {/* Active Research with real-time countdown */}
      {state.activeResearch && (() => {
        const def = RESEARCH.find(r => r.id === state.activeResearch!.definitionId);
        const hasRealTime = state.activeResearch!.startedAtMs && state.activeResearch!.realDurationSeconds;
        const hasQ2 = state.completedResearch.includes('parallel_research');
        return (
          <ConsolePanel accent="purple" icon="research" title={`Researching${hasQ2 ? ' (Q1)' : ''}: ${def?.name || ''}`}>
            {hasRealTime ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch!.startedAtMs!}
                durationSeconds={state.activeResearch!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 bg-purple-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-slate-500 text-[10px] mt-1">{def?.effect}</p>
            {def && <p className="text-cyan-300/80 text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def)}</p>}
          </ConsolePanel>
        );
      })()}
      {/* Second Research Queue on Dashboard */}
      {state.activeResearch2 && state.completedResearch.includes('parallel_research') && (() => {
        const def2 = RESEARCH.find(r => r.id === state.activeResearch2!.definitionId);
        const hasRealTime2 = state.activeResearch2!.startedAtMs && state.activeResearch2!.realDurationSeconds;
        return (
          <ConsolePanel accent="cyan" icon="research" title={`Researching (Q2): ${def2?.name || ''}`}>
            {hasRealTime2 ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch2!.startedAtMs!}
                durationSeconds={state.activeResearch2!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 bg-cyan-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-slate-500 text-[10px] mt-1">{def2?.effect}</p>
            {def2 && <p className="text-cyan-300/80 text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def2)}</p>}
          </ConsolePanel>
        );
      })()}

      {/* Under Construction */}
      {inProgress.length > 0 && (
        <ConsolePanel
          accent="amber"
          icon="build"
          title={`Under Construction (${inProgress.length})`}
          right={<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />}
        >
          <div className="space-y-2">
            {inProgress.slice(0, 5).map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              const loc = LOCATION_MAP.get(bld.locationId);
              return (
                <div key={bld.instanceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white">{def?.name}</span>
                      <span className="text-slate-600 ml-1.5">@ {loc?.name}</span>
                    </div>
                  </div>
                  {bld.startedAtMs && bld.realDurationSeconds ? (
                    <Countdown startedAtMs={bld.startedAtMs} durationSeconds={bld.realDurationSeconds} />
                  ) : (
                    <span className="text-amber-400/70 font-mono text-[10px]">{formatGameDate(bld.completionDate)}</span>
                  )}
                </div>
              );
            })}
            {inProgress.length > 5 && <p className="text-slate-600 text-[10px]">+{inProgress.length - 5} more</p>}
          </div>
        </ConsolePanel>
      )}

      {/* Active Services */}
      <ConsolePanel
        icon="services"
        title={`Active Services (${new Set(state.activeServices.map(s => s.definitionId)).size} types, ${state.activeServices.length} total)`}
      >
        {state.activeServices.length === 0 ? (
          <p className="text-slate-500 text-xs">Build infrastructure to enable revenue-generating services.</p>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              // Pre-compute station bonus per location (space_station buildings boost revenue)
              const stationBonusByLoc: Record<string, number> = {};
              for (const bld of state.buildings) {
                if (!bld.isComplete) continue;
                const bDef = BUILDING_MAP.get(bld.definitionId);
                if (!bDef || bDef.category !== 'space_station') continue;
                stationBonusByLoc[bld.locationId] = Math.min(
                  (stationBonusByLoc[bld.locationId] || 0) + 0.15,
                  0.50
                );
              }
              // Pre-compute freighter/tanker logistics bonus per location
              const freighterBonusByLoc: Record<string, number> = {};
              for (const ship of (state.ships || [])) {
                if (!ship.isBuilt || ship.status !== 'idle') continue;
                const sDef = SHIP_MAP.get(ship.definitionId);
                if (sDef?.role === 'transport' || sDef?.role === 'tanker') {
                  freighterBonusByLoc[ship.currentLocation] = Math.min(
                    (freighterBonusByLoc[ship.currentLocation] || 0) + 0.10,
                    0.50
                  );
                }
              }
              // Group services by definitionId (consolidate same type into one line)
              const groups = new Map<string, { def: ReturnType<typeof SERVICE_MAP.get>; count: number; totalRev: number; isPowerReduced: boolean; minPowerRatio: number; maxStationBonus: number; maxFreighterBonus: number }>();
              for (const svc of state.activeServices) {
                const def = SERVICE_MAP.get(svc.definitionId);
                if (!def) continue;
                const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
                const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
                const supplyMult = getServiceDemandMultiplier(state, svc.definitionId, svc.locationId, gameDateToMonthIndex(state.gameDate));
                const locPower = powerData[svc.locationId];
                const powerRatio = locPower ? locPower.ratio : 1;
                const stnBonus = stationBonusByLoc[svc.locationId] || 0;
                const frtBonus = freighterBonusByLoc[svc.locationId] || 0;
                const rev = Math.round(
                  def.revenuePerMonth * svc.revenueMultiplier * upgradeBoost
                  * (1 + financials.wfBonuses.serviceRevenue)
                  * (1 + financials.resBonuses.serviceRevenueBonus)
                  * supplyMult
                  * powerRatio
                  * (1 + stnBonus)
                );
                const existing = groups.get(svc.definitionId);
                if (existing) {
                  existing.count++;
                  existing.totalRev += rev;
                  if (powerRatio < existing.minPowerRatio) existing.minPowerRatio = powerRatio;
                  if (powerRatio < 1) existing.isPowerReduced = true;
                  if (stnBonus > existing.maxStationBonus) existing.maxStationBonus = stnBonus;
                  if (frtBonus > existing.maxFreighterBonus) existing.maxFreighterBonus = frtBonus;
                } else {
                  groups.set(svc.definitionId, { def, count: 1, totalRev: rev, isPowerReduced: powerRatio < 1, minPowerRatio: powerRatio, maxStationBonus: stnBonus, maxFreighterBonus: frtBonus });
                }
              }
              return Array.from(groups.entries()).map(([id, g]) => (
                <div key={id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className="text-slate-300">
                    {g.def!.name}
                    {g.count > 1 && <span className="text-cyan-400 ml-1 text-[10px] font-mono">x{g.count}</span>}
                    {g.isPowerReduced && (
                      <span className="text-red-400/70 ml-1 text-[10px] inline-flex items-center gap-0.5" title={`Power deficit reduces revenue`}>
                        <GameIcon name="power" size={9} />{Math.round(g.minPowerRatio * 100)}%
                      </span>
                    )}
                    {g.maxStationBonus > 0 && (
                      <span className="text-green-400/70 ml-1 text-[10px] inline-flex items-center gap-0.5" title={`Station presence boosts revenue by +${Math.round(g.maxStationBonus * 100)}%`}>
                        <GameIcon name="bld-space-station" size={9} />+{Math.round(g.maxStationBonus * 100)}%
                      </span>
                    )}
                    {g.maxFreighterBonus > 0 && (
                      <span className="text-blue-400/70 ml-1 text-[10px] inline-flex items-center gap-0.5" title={`Freighter logistics bonus: +${Math.round(g.maxFreighterBonus * 100)}% mining output`}>
                        <GameIcon name="ship-transport" size={9} />+{Math.round(g.maxFreighterBonus * 100)}%
                      </span>
                    )}
                  </span>
                  <span className={`font-mono ${g.isPowerReduced ? 'text-amber-400' : 'text-green-400'}`}>+{formatMoney(g.totalRev)}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </ConsolePanel>

      {/* Risk & Reserves — Wave F UI surfacing (b/d): insurance toggle
          (economic-sinks.ts), hazard warnings (state.hazardWarnings), and
          the T5+ cash-reserve meter (state.reserveStatus). CLAUDE.md "no
          combat — but real risk": these are the risk-management decisions
          hazards/insurance were designed to create. */}
      <ConsolePanel icon="shield" title="Risk & Reserves" bodyClassName="space-y-3">

        {/* Insurance */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <div>
            <div className="flex items-center gap-1.5">
              <GameIcon name="shield" size={13} />
              <span className="text-xs font-semibold text-white">Hazard Insurance</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${state.insuranceActive !== false ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                {state.insuranceActive !== false ? 'Active' : 'Uninsured'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatMoney(computeInsuredAssetValue(state))} insured · {countInsuranceRiskLocations(state)} high-risk location{countInsuranceRiskLocations(state) === 1 ? '' : 's'} · {formatMoney(getMonthlyInsurancePremium(state))}/mo premium
            </p>
          </div>
          {onSetInsuranceActive && (
            <button
              type="button"
              onClick={() => onSetInsuranceActive(!(state.insuranceActive !== false))}
              aria-pressed={state.insuranceActive !== false}
              className={`shrink-0 min-h-[36px] px-3 rounded-lg text-[10px] font-bold transition-colors ${
                state.insuranceActive !== false
                  ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
            >
              {state.insuranceActive !== false ? 'Cancel Policy' : 'Buy Coverage'}
            </button>
          )}
        </div>

        {/* Reserve meter — T5+ corporations only (economic-sinks §7) */}
        {(state.corporationTier || 1) >= 5 && state.reserveStatus && (
          <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
            state.reserveStatus.status === 'critical' ? 'bg-red-500/10 border-red-500/25'
              : state.reserveStatus.status === 'warning' ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-white/[0.02] border-white/[0.05]'
          }`}>
            <div>
              <div className="flex items-center gap-1.5">
                <GameIcon name="money" size={13} />
                <span className="text-xs font-semibold text-white">Cash Reserve</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  state.reserveStatus.status === 'critical' ? 'bg-red-500/20 text-red-300'
                    : state.reserveStatus.status === 'warning' ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {state.reserveStatus.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                3-month runway target: {formatMoney(state.reserveStatus.requiredReserve)}
                {state.reserveStatus.efficiencyMultiplier < 1 && (
                  <span className="text-amber-400"> · service revenue at {Math.round(state.reserveStatus.efficiencyMultiplier * 100)}% until restored</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Hazard warnings — forecast for next game-month */}
        {(state.hazardWarnings || []).length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Hazard Forecast</p>
            {(state.hazardWarnings || []).slice(0, 4).map(w => (
              <div
                key={w.id}
                className={`flex items-center gap-2 text-[10px] px-2 py-1.5 rounded-lg border ${
                  w.severity === 'severe' ? 'bg-red-500/10 border-red-500/20 text-red-300'
                    : w.severity === 'major' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-400'
                }`}
              >
                <GameIcon name="warning" size={11} />
                <span>{w.summary}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-500">{LOCATION_MAP.get(w.locationId)?.name || w.locationId}</span>
              </div>
            ))}
          </div>
        )}
      </ConsolePanel>

      {/* Event Log */}
      <ConsolePanel icon="reports" title="Event Log">
        <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {state.eventLog
            .filter(evt => !(evt.type === 'npc_activity' && evt.title?.includes('market activity')))
            .slice(0, 20)
            .map((evt, i) => {
            const isNPC = evt.type === 'npc_activity';
            return (
              <div
                key={evt.id}
                className={`flex gap-2 text-[11px] py-1 border-b border-white/[0.03] last:border-0 ${isNPC ? 'opacity-70' : ''}`}
                style={{ animation: i === 0 ? 'reveal-up 0.3s ease-out' : 'none' }}
              >
                <span className="text-slate-600 font-mono shrink-0 w-16">{formatGameDate(evt.date)}</span>
                <div>
                  {isNPC && <GameIcon name="npc" size={11} className="text-red-400/60 mr-1" />}
                  <span className={isNPC ? 'text-slate-500' : 'text-slate-300'}>{evt.title}</span>
                  {evt.description && <span className="text-slate-600 ml-1">— {evt.description}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </ConsolePanel>

      {/* Game Stats Footer */}
      <ConsolePanel compact icon="money" title="Corporate Ledger">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Earned', value: formatMoney(state.totalEarned), color: 'text-green-400/70' },
          { label: 'Total Spent', value: formatMoney(state.totalSpent), color: 'text-red-400/70' },
          { label: 'Net Worth', value: formatMoney(state.money), color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg bg-white/[0.02]">
            <p className={`text-xs font-mono ${s.color}`}>{s.value}</p>
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
      </ConsolePanel>

      {/* Sol Historical Archive — real site headlines reframed as in-universe
          history (docs/LORE.md narrative year). Renders nothing on empty/error. */}
      <HistoricalArchiveTicker />
    </div>
  );
}
