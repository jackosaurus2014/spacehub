'use client';

// ─── Dashboard (Command hub landing) ─────────────────────────────────────────
// Design-system migration (GAME_DESIGN_REVIEW_2026-09 §3 "The design system is
// absent from the game"): the first of the three busiest panels moved onto
// the shared kit — Console for every card, DataTable for the tabular lists
// (income breakdown, active services), Telemetry for stat rows, StatusPip /
// StatusBadge wherever a colour used to carry state (the colourblind
// commitment: shapes + words, never colour alone), and the five documented
// tokens (--ember/--signal/--go/--caution/--crit) instead of cyan/amber/red
// utilities and hex literals. Behaviour, handlers and every computed number
// are unchanged from the pre-migration panel; this is chrome.

import { useMemo, useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, formatCountdown } from '@/lib/game/formulas';
import { BUILDING_MAP, getPowerByLocation } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { SHIP_MAP } from '@/lib/game/ships';
import { RESEARCH, getResearchBonuses, getResearchMechanicalEffect, isRareTechVisible } from '@/lib/game/research-tree';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getWorkforceBonuses } from '@/lib/game/workforce';
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §2.6/§E5): "matches game engine logic
// exactly" (comment below) — the engine now charges wage-index-adjusted
// payroll, so this dashboard estimate must too.
import { getMonthlyPayrollForState } from '@/lib/game/labor-market';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import { getMarkRevenueMultiplier, getMarkMaintenanceMultiplier } from '@/lib/game/mark-upgrades'; // D4
import { getEffectiveMaintenancePerMonth } from '@/lib/game/flagship-economics'; // D5
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
// FTUE v2 (simulated-newcomer audit 8/16): newcomer HUD mode — while the
// first-hour guide is active on a Tier-1 corp, the Dashboard hides advanced
// live-service surfaces (story chapters, mission calendar, world races,
// mini-activities, weekly challenge, archive ticker) so minute one shows only
// the core loop. CLAUDE.md: "information density that scales with the
// player's expertise." Skipping the guide opts out immediately.
import { isNewcomerHud } from '@/lib/game/onboarding';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Telemetry from '@/components/ui/Telemetry';
import GameIcon from '@/components/game/GameIcon';
import type { IconName } from '@/lib/game/icons';

/** state.recentHazards[].type → icon (mirrors HazardAlertLayer.tsx's HAZARD_META mapping). */
const HAZARD_ICON: Record<string, IconName> = {
  solar_storm: 'hazard-solar-storm',
  micrometeorite: 'hazard-micrometeorite',
  pirate_raid: 'hazard-pirate-raid',
  equipment_failure: 'hazard-equipment-failure',
};

/** Shared: an overline label in the kit's voice. */
const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';

/** Live countdown timer for research */
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
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--elev)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Research progress">
        <div
          className="h-full rounded-full bg-[var(--violet)] motion-safe:transition-all motion-safe:duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs shrink-0 tabular-nums w-14 text-right text-[var(--violet)]">
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
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--elev)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Construction progress">
        <div
          className="h-full rounded-full bg-[var(--caution)] motion-safe:transition-all motion-safe:duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] shrink-0 tabular-nums w-12 text-right text-[var(--caution)]">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** Mini sparkline using CSS — decorative; direction is also carried by the
 *  StatusPip next to the figure, never by this colour alone. */
function MiniSparkline({ positive }: { positive: boolean }) {
  return (
    <div className="flex items-end gap-px h-4 mt-1" aria-hidden="true">
      {[3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 12].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm opacity-40"
          style={{ height: `${h * (positive ? 1 : 0.7)}px`, background: positive ? 'var(--go)' : 'var(--crit)' }}
        />
      ))}
    </div>
  );
}

/** Power-grid state as a word + glyph (StatusPip), never colour alone. */
function powerPip(ratio: number): { state: PipState; label: string } {
  if (ratio >= 1) return { state: 'go', label: 'OK' };
  if (ratio >= 0.6) return { state: 'hold', label: 'LOW' };
  return { state: 'scrub', label: 'DEFICIT' };
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
  const workers = state.workforce ? state.workforce.engineers + state.workforce.scientists + state.workforce.miners + state.workforce.operators : 0;

  // Determine empire tier based on progress
  const tier = completedBuildings >= 30 ? 'Megacorp' :
    completedBuildings >= 15 ? 'Corporation' :
    completedBuildings >= 8 ? 'Enterprise' :
    completedBuildings >= 3 ? 'Startup' : 'Founded';

  const tierColors: Record<string, string> = {
    Founded: 'var(--ink-3)',
    Startup: 'var(--signal)',
    Enterprise: 'var(--go)',
    Corporation: 'var(--caution)',
    Megacorp: 'var(--crit)',
  };

  const metrics: { icon: IconName; value: number; label: string }[] = [
    { icon: 'build', value: completedBuildings, label: 'Buildings' },
    { icon: 'map', value: locations, label: 'Locations' },
    { icon: 'research', value: research, label: 'Research' },
    { icon: 'services', value: services, label: 'Services' },
    { icon: 'fleet', value: ships, label: 'Ships' },
    { icon: 'workforce', value: workers, label: 'Crew' },
  ];

  const power = getPowerByLocation(state.buildings);
  const powerEntries = Object.entries(power).filter(([loc]) => state.unlockedLocations.includes(loc));
  const hasDeficit = powerEntries.some(([, data]) => data.ratio < 1);

  return (
    <Console
      title="Empire Overview"
      actions={<span className="font-mono text-[11px] text-[var(--ink-3)]">{formatGameDate(state.gameDate)}</span>}
    >
      <div className="space-y-3">
      {/* Tier + company name */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold" style={{ color: tierColors[tier] || 'var(--ink-3)' }}>{tier}</span>
          {editingName && onUpdateCompanyName ? (
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const trimmed = nameInput.trim(); if (trimmed) { onUpdateCompanyName(trimmed); } setEditingName(false); }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
                onBlur={() => { const trimmed = nameInput.trim(); if (trimmed && onUpdateCompanyName) { onUpdateCompanyName(trimmed); } setEditingName(false); }}
                className="h-7 px-1.5 text-[10px] uppercase tracking-wider font-mono rounded-[var(--radius-badge)] border border-[var(--line-2)] bg-[var(--elev)] text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)] w-32"
              />
            </form>
          ) : (
            <button
              onClick={() => { if (onUpdateCompanyName) { setNameInput(state.companyName || ''); setEditingName(true); } }}
              className="text-[10px] uppercase tracking-wider font-mono text-[var(--ink-3)] hover:text-[var(--ember)] motion-safe:transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[44px] px-1"
              title="Click to rename"
              aria-label={`Rename company (currently ${state.companyName || 'Your Company'})`}
            >
              {state.companyName || 'Your Company'} <GameIcon name="edit" size={11} />
            </button>
          )}
      </div>

      {/* Visual metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--void)] p-3">
        {metrics.map(m => (
          <div key={m.label} className="flex flex-col items-center text-center">
            <span className="mb-1 text-[var(--ink-2)]"><GameIcon name={m.icon} size={15} /></span>
            <span className="font-mono text-lg font-bold tabular-nums text-[var(--ink)]">{m.value}</span>
            <span className={OVERLINE}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Location progress bar — visual of how far across the solar system */}
      <div>
        <div className="flex items-center gap-1" role="img" aria-label={`${locations} of 11 solar-system locations unlocked`}>
          {['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system'].map(loc => {
            const unlocked = state.unlockedLocations.includes(loc);
            return (
              <div
                key={loc}
                className="flex-1 h-1.5 rounded-full motion-safe:transition-colors"
                style={{ background: unlocked ? 'var(--signal)' : 'var(--line)' }}
                title={loc.replace(/_/g, ' ')}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--ink-3)]">Earth</span>
          <span className="text-[10px] text-[var(--ink-3)]">Outer System</span>
        </div>
      </div>

      {/* Power status per location */}
      {powerEntries.length > 0 && (
        <div className="pt-2 border-t border-[var(--line)]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={OVERLINE}>Power Grid</span>
            {hasDeficit && <StatusPip state="scrub" label="DEFICIT" />}
          </div>
          <div className="space-y-1">
            {powerEntries.map(([loc, data]) => {
              const pip = powerPip(data.ratio);
              const locName = loc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const shortName = locName.replace('Surface', 'Sfc').replace('System', 'Sys').replace('Orbit', 'Orb').trim();
              const revenuePenalty = data.ratio < 1 ? Math.round((1 - data.ratio) * 100) : 0;
              return (
                <div
                  key={loc}
                  className="px-2 py-1 rounded-[var(--radius-badge)] bg-[var(--elev)]"
                  title={`${locName}: ${data.generated} MW generated / ${data.required} MW required (${Math.round(data.ratio * 100)}% efficiency)`}
                >
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <span className="text-[10px] font-medium text-[var(--ink-2)]">{shortName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tabular-nums text-[var(--ink-2)] inline-flex items-center gap-1">
                        <GameIcon name="power" size={11} />
                        {data.generated}/{data.required} MW
                      </span>
                      <StatusPip state={pip.state} label={pip.label} />
                      {revenuePenalty > 0 && (
                        <span className="text-[10px] font-mono text-[var(--crit)]">−{revenuePenalty}% rev</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden bg-[var(--line)]">
                    <div
                      className="h-full rounded-full motion-safe:transition-all"
                      style={{ width: `${Math.min(100, data.ratio * 100)}%`, background: data.ratio >= 1 ? 'var(--go)' : data.ratio >= 0.6 ? 'var(--caution)' : 'var(--crit)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {hasDeficit && (
            <p className="text-[10px] mt-1.5 leading-tight text-[var(--ink-3)]">
              Underpowered facilities operate at reduced efficiency. Revenue is proportionally reduced. Build solar farms or nuclear reactors to restore full output.
            </p>
          )}
        </div>
      )}
      </div>
    </Console>
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
    <span className="font-mono text-xs sm:text-sm tabular-nums text-[var(--signal)]">
      {hh}:{mm}:{ss}
    </span>
  );
}

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
      <div className="mt-2 pt-2 border-t border-[var(--line)] space-y-1" aria-live="polite">
        <p className={`${OVERLINE} mb-1`}>Galactic Activity</p>
        {activities.slice(0, 3).map(a => (
          <p key={a.id} className="text-[10px] text-[var(--ink-2)] truncate">
            {a.title} <span className="text-[var(--ink-3)]">· {formatRelativeTime(a.createdAt)}</span>
          </p>
        ))}
      </div>
    );
  }

  const current = activities[idx % activities.length];
  return (
    <div className="mt-2 pt-2 border-t border-[var(--line)]" aria-live="polite" role="status">
      <p className={`${OVERLINE} mb-1`}>Galactic Activity</p>
      <p key={current.id} className="text-[10px] text-[var(--ink-2)] truncate motion-safe:animate-reveal-up">
        <GameIcon name="activity" size={11} /> {current.title}
        <span className="text-[var(--ink-3)]"> · {formatRelativeTime(current.createdAt)}</span>
      </p>
    </div>
  );
}

/** Command Center header band — corporation identity, mission clock, region readout.
 *  Per CLAUDE.md: "Earth command center is the main hub" — this is the operations-room anchor. */
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
    <Console
      title="Command Center"
      status="live"
      actions={
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={OVERLINE}>Mission Time</p>
            <LiveClock />
          </div>
          <div className="text-right">
            <p className={OVERLINE}>Region</p>
            <p className="font-mono text-[11px] text-[var(--signal)] whitespace-nowrap inline-flex items-center gap-1">
              <GameIcon name="globe" size={12} /> Earth HQ{showFrontier ? ` · Frontier: ${frontier!.name}` : ''}
            </p>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-hud text-[var(--ink)] text-base sm:text-xl font-bold tracking-wide truncate">
          {state.companyName || 'Your Company'}
        </h1>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-hud font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-badge)] border border-[var(--line-2)] shrink-0"
          style={{ color: tierDef.color }}
        >
          <GameIcon name="medal" size={11} /> Tier {tierDef.tier} · {tierDef.name}
        </span>
      </div>

      {showFrontierMeter && (
        <div className="mt-2 pt-2 border-t border-[var(--line)]">
          <div className="flex items-center justify-between text-[10px] mb-1 gap-2">
            <span className="inline-flex items-center gap-1.5">
              <StatusPip state="go" label="FRONTIER" />
              <span className={OVERLINE}>Graduation</span>
            </span>
            <span className="font-mono tabular-nums text-[var(--ink-2)] truncate">
              {formatMoney(frontierSummary.netWorth)} / {formatMoney(FRONTIER_GRADUATION_NET_WORTH)}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden bg-[var(--elev)]"
            role="progressbar"
            aria-label="Progress toward Protected Frontier graduation net worth threshold"
            aria-valuenow={Math.round(frontierSummary.netWorthProgressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${Math.round(frontierSummary.netWorthProgressPct)}% of the way to graduation`}
          >
            <div
              className="h-full rounded-full bg-[var(--go)] motion-safe:transition-all motion-safe:duration-500"
              style={{ width: `${frontierSummary.netWorthProgressPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <ActivityTicker />
    </Console>
  );
}

/** Quick-nav tile grid — one-tap access to the panels players touch most,
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
    { id: 'alliance', label: 'Corporation', icon: 'alliance', stat: `Tier ${tierDef.tier} · ${tierDef.name}` },
    { id: 'contracts', label: 'Contracts', icon: 'contracts', stat: `${activeContracts} active` },
    { id: 'research', label: 'Research', icon: 'research', stat: `${researchDone}/${visibleResearchCount} complete` },
  ];

  const alerts: { icon: IconName; label: string; pip: PipState }[] = [];
  if (hasPowerDeficit) alerts.push({ icon: 'power', label: 'Power deficit active', pip: 'scrub' });
  const unreadReports = (state.reports || []).filter(r => !r.read).length;
  if (unreadReports > 0) alerts.push({ icon: 'reports', label: `${unreadReports} unread report${unreadReports !== 1 ? 's' : ''}`, pip: 'live' });
  const recentHazard = (state.recentHazards || []).find(h => Date.now() - h.occurredAtMs < 10 * 60 * 1000);
  if (recentHazard) alerts.push({ icon: HAZARD_ICON[recentHazard.type] || 'hazard-generic', label: `Recent hazard: ${recentHazard.type.replace(/_/g, ' ')}`, pip: 'hold' });
  // Wave F UI surfacing (b): forecast warnings for next game-month, distinct
  // from recentHazard above (which is a hazard that already struck).
  const hazardWarningCount = (state.hazardWarnings || []).length;
  const severeHazardWarning = (state.hazardWarnings || []).some(w => w.severity === 'severe');
  if (hazardWarningCount > 0) {
    alerts.push({
      icon: 'warning',
      label: `${hazardWarningCount} hazard warning${hazardWarningCount !== 1 ? 's' : ''} forecast next month`,
      pip: severeHazardWarning ? 'scrub' : 'hold',
    });
  }

  return (
    <Console title="Quick Access">
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tiles.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onNavigate?.(t.id)}
              className="text-left p-3 min-h-[44px] rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)] hover:bg-[var(--hover)] hover:border-[var(--line-hot)] motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <GameIcon name={t.icon} size={16} />
                <span className={OVERLINE}>{t.label}</span>
              </div>
              <p className="font-mono text-[11px] tabular-nums text-[var(--ink)]">{t.stat}</p>
            </button>
          ))}
        </div>
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5" role="status" aria-live="polite">
            {alerts.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-2)]">
                <GameIcon name={a.icon} size={12} />
                <StatusPip state={a.pip} label={a.label} />
              </span>
            ))}
          </div>
        )}
      </div>
    </Console>
  );
}

interface IncomeRow { id: string; item: string; amount: string; tone: 'go' | 'crit' | 'caution' | 'signal' | 'violet' | 'ink' }
interface ServiceRow { id: string; service: string; units: number; modifiers: { icon: IconName; text: string; title: string }[]; revenue: number; powerReduced: boolean }

const TONE_VAR: Record<IncomeRow['tone'], string> = {
  go: 'var(--go)', crit: 'var(--crit)', caution: 'var(--caution)', signal: 'var(--signal)', violet: 'var(--violet)', ink: 'var(--ink)',
};

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
    const payroll = getMonthlyPayrollForState(workforce, state); // Pass 9: Frontier-shielded

    const demandMonthIndex = gameDateToMonthIndex(state.gameDate);
    const collectedDemandMults: number[] = [];
    let revenue = 0, opCosts = 0, maintenance = 0;
    let hasPowerDeficit = false;
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (!def) continue;
      const linkedBld = (svc.linkedBuildingIds?.length ? state.buildings.find(b => svc.linkedBuildingIds.includes(b.instanceId)) : undefined) ?? state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId)); // D4: own building first
      const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0) * getMarkRevenueMultiplier(linkedBld); // D4
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
      const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0) * getMarkMaintenanceMultiplier(bld); // D4
      maintenance += Math.round(getEffectiveMaintenancePerMonth(def) * maintMult * (1 - resBonuses.maintenanceReduction)); // D5 floor
    }
    // Check if any services are demand-pool-impacted (Wave E4)
    const hasSupplyPenalty = collectedDemandMults.some(m => m < 0.99);
    const avgSupplyMult = collectedDemandMults.length > 0
      ? collectedDemandMults.reduce((a, b) => a + b, 0) / collectedDemandMults.length
      : 1.0;

    const costs = opCosts + maintenance + payroll;
    return { revenue, costs, opCosts, maintenance, payroll, net: revenue - costs, wfBonuses, resBonuses, hasSupplyPenalty, avgSupplyMult, hasPowerDeficit };
  }, [state, powerData]);

  // FTUE v2 — newcomer HUD: advanced surfaces below are gated on this.
  const newcomer = isNewcomerHud(state);

  // Income breakdown rows (DataTable). Same line items, same maths as before.
  const incomeRows: IncomeRow[] = useMemo(() => {
    const rows: IncomeRow[] = [];
    rows.push({
      id: 'base',
      item: 'Base service revenue',
      amount: formatMoney(state.activeServices.reduce((sum, s) => {
        const def = SERVICE_MAP.get(s.definitionId);
        return sum + (def ? Math.round(def.revenuePerMonth * s.revenueMultiplier) : 0);
      }, 0)),
      tone: 'ink',
    });
    if (financials.wfBonuses.serviceRevenue > 0) rows.push({ id: 'wf', item: '+ Workforce bonus', amount: `+${Math.round(financials.wfBonuses.serviceRevenue * 100)}%`, tone: 'signal' });
    if (financials.resBonuses.serviceRevenueBonus > 0) rows.push({ id: 'res', item: '+ Research bonus', amount: `+${Math.round(financials.resBonuses.serviceRevenueBonus * 100)}%`, tone: 'violet' });
    if (financials.hasSupplyPenalty) rows.push({ id: 'supply', item: '− Market supply pressure', amount: `${Math.round((financials.avgSupplyMult - 1) * 100)}%`, tone: 'caution' });
    if (financials.hasPowerDeficit) rows.push({ id: 'power', item: 'Power deficit penalty', amount: 'Build solar/nuclear', tone: 'crit' });
    rows.push({ id: 'op', item: 'Operating costs', amount: `−${formatMoney(financials.opCosts)}`, tone: 'crit' });
    rows.push({ id: 'maint', item: `Maintenance${financials.resBonuses.maintenanceReduction > 0 ? ` (−${Math.round(financials.resBonuses.maintenanceReduction * 100)}% research)` : ''}`, amount: `−${formatMoney(financials.maintenance)}`, tone: 'crit' });
    if (financials.payroll > 0) rows.push({ id: 'payroll', item: 'Crew payroll', amount: `−${formatMoney(financials.payroll)}`, tone: 'crit' });
    return rows;
  }, [state.activeServices, financials]);

  const incomeColumns: DataTableColumn<IncomeRow>[] = [
    { key: 'item', header: 'Line item', sortable: false },
    {
      key: 'amount', header: 'Amount', numeric: true, sortable: false,
      render: r => <span style={{ color: TONE_VAR[r.tone] }}>{r.amount}</span>,
    },
  ];

  // Active services rows (DataTable) — grouped by definitionId exactly as
  // before; station/freighter/power modifiers become icon + word chips.
  const serviceRows: ServiceRow[] = useMemo(() => {
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
      const linkedBld = (svc.linkedBuildingIds?.length ? state.buildings.find(b => svc.linkedBuildingIds.includes(b.instanceId)) : undefined) ?? state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId)); // D4: own building first
      const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0) * getMarkRevenueMultiplier(linkedBld); // D4
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
    return Array.from(groups.entries()).map(([id, g]) => {
      const modifiers: ServiceRow['modifiers'] = [];
      if (g.isPowerReduced) modifiers.push({ icon: 'power', text: `power ${Math.round(g.minPowerRatio * 100)}%`, title: 'Power deficit reduces revenue' });
      if (g.maxStationBonus > 0) modifiers.push({ icon: 'bld-space-station', text: `station +${Math.round(g.maxStationBonus * 100)}%`, title: `Station presence boosts revenue by +${Math.round(g.maxStationBonus * 100)}%` });
      if (g.maxFreighterBonus > 0) modifiers.push({ icon: 'ship-transport', text: `freight +${Math.round(g.maxFreighterBonus * 100)}%`, title: `Freighter logistics bonus: +${Math.round(g.maxFreighterBonus * 100)}% mining output` });
      return { id, service: g.def!.name, units: g.count, modifiers, revenue: g.totalRev, powerReduced: g.isPowerReduced };
    });
  }, [state, powerData, financials.wfBonuses.serviceRevenue, financials.resBonuses.serviceRevenueBonus]);

  const serviceColumns: DataTableColumn<ServiceRow>[] = [
    { key: 'service', header: 'Service' },
    { key: 'units', header: 'Units', numeric: true },
    {
      key: 'modifiers', header: 'Modifiers', sortable: false,
      render: r => r.modifiers.length === 0 ? <span className="text-[var(--ink-3)]">—</span> : (
        <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--ink-2)]">
          {r.modifiers.map(m => (
            <span key={m.text} className="inline-flex items-center gap-1" title={m.title}>
              <GameIcon name={m.icon} size={11} />{m.text}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: 'revenue', header: 'Revenue /mo', numeric: true,
      render: r => (
        <span className="inline-flex items-center gap-1.5" style={{ color: r.powerReduced ? 'var(--caution)' : 'var(--go)' }}>
          +{formatMoney(r.revenue)}
          {r.powerReduced && <StatusPip state="hold" label="LOW PWR" />}
        </span>
      ),
    },
  ];

  const marginPct = financials.revenue > 0 ? Math.round((financials.net / financials.revenue) * 100) : 0;
  const serviceTypeCount = new Set(state.activeServices.map(s => s.definitionId)).size;

  return (
    <div className="space-y-4">
      {/* Command Center header — corporation identity, mission clock, region readout */}
      <CommandCenterHeader state={state} />
      {/* Sol Events — real-world space weather / launch / milestone feed, mirrored into the game as archive entries. Renders nothing when no event is active. Newcomer-gated (FTUE v2). */}
      {!newcomer && <WorldEventsBanner />}
      {/* Story Chapters (LS8) — calendar-dated, world-synchronized narrative arc banner: act progress, finale countdown, server-backed participation tally. Renders nothing before the first tick has started chapter tracking. Newcomer-gated (FTUE v2). */}
      {!newcomer && <StoryChapterBanner state={state} onResolveEpilogue={onResolveChapterEpilogue} />}
      {/* Returning Commander (LS2) — 7-day re-entry objectives + decaying earnings boost after a >=14-day lapse. Renders nothing when no track is active. (Never newcomer-gated: a lapsed veteran is by definition not a newcomer.) */}
      <ReturningCommanderWidget state={state} />
      {/* Mission Calendar (LS3) — unified forward view: league lock, senate docket close, season transitions, alliance event windows, NPC co-fund windows, expedition returns, queue completions, appointment world events, real launch windows. Renders nothing when the 14-day horizon is empty. Newcomer-gated (FTUE v2). */}
      {!newcomer && <MissionCalendarPanel state={state} />}
      {/* Quick-nav tiles — one-tap access to the panels players touch most, + live alerts strip */}
      <QuickNavGrid state={state} hasPowerDeficit={financials.hasPowerDeficit} onNavigate={onNavigate} />
      {/* The live world — colony races, milestone claims, competitive contracts (audit Change #3). Newcomer-gated (FTUE v2). */}
      {!newcomer && <WorldStatusCard companyName={state.companyName} />}
      {/* Empire Overview — visual summary at the top */}
      <EmpireOverview state={state} onUpdateCompanyName={onUpdateCompanyName} />
      {/* HUD-styled at-a-glance viz — revenue breakdown, fleet status, infrastructure mix */}
      <DashboardVizBlock state={state} />

      {/* Hero Stats — Telemetry readouts: LABEL first, mono figure, unit split
          off, direction (margin) carried by a glyph as well as colour. */}
      <Console title="Key Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Telemetry label="Revenue" value={formatMoney(financials.revenue)} unit="/mo" tone="signal" delta={{ value: marginPct, suffix: '% margin' }} />
          <Telemetry label="Costs" value={formatMoney(financials.costs)} unit="/mo" tone="ink" sub={`${formatMoney(financials.payroll)} payroll`} />
          <Telemetry label="Buildings" value={completedBuildings.length} unit="built" tone="ink" sub={`${state.buildings.length - completedBuildings.length} under construction`} />
          <Telemetry label="Research" value={state.completedResearch.length} unit={`/${visibleResearchCount}`} tone="ink" sub="technologies unlocked" />
        </div>
      </Console>

      {/* Active Research with real-time countdown — promoted to top for visibility */}
      {state.activeResearch && (() => {
        const def = RESEARCH.find(r => r.id === state.activeResearch!.definitionId);
        const hasRealTime = state.activeResearch!.startedAtMs && state.activeResearch!.realDurationSeconds;
        const hasQ2 = state.completedResearch.includes('parallel_research');
        return (
          <Console title={<span className="inline-flex items-center gap-2"><GameIcon name="research" size={13} /> {def?.name || 'Research'}</span>} status="live" actions={hasQ2 ? <StatusPip state="tminus" label="Q1" /> : undefined}>
            {hasRealTime ? (
              <ResearchCountdown startedAtMs={state.activeResearch!.startedAtMs!} durationSeconds={state.activeResearch!.realDurationSeconds!} />
            ) : (
              <div className="h-1.5 rounded-full overflow-hidden bg-[var(--elev)]">
                <div className="h-full rounded-full bg-[var(--violet)]" style={{ width: '50%' }} />
              </div>
            )}
          </Console>
        );
      })()}
      {state.activeResearch2 && state.completedResearch.includes('parallel_research') && (() => {
        const def2 = RESEARCH.find(r => r.id === state.activeResearch2!.definitionId);
        const hasRealTime2 = state.activeResearch2!.startedAtMs && state.activeResearch2!.realDurationSeconds;
        return (
          <Console title={<span className="inline-flex items-center gap-2"><GameIcon name="research" size={13} /> {def2?.name || 'Research'}</span>} status="live" actions={<StatusPip state="tminus" label="Q2" />}>
            {hasRealTime2 ? (
              <ResearchCountdown startedAtMs={state.activeResearch2!.startedAtMs!} durationSeconds={state.activeResearch2!.realDurationSeconds!} />
            ) : (
              <div className="h-1.5 rounded-full overflow-hidden bg-[var(--elev)]">
                <div className="h-full rounded-full bg-[var(--signal)]" style={{ width: '50%' }} />
              </div>
            )}
          </Console>
        );
      })()}

      {/* Under Construction — promoted to top for visibility */}
      {inProgress.length > 0 && (
        <Console title={`Building (${inProgress.length})`} status="live">
          <div className="space-y-2">
            {inProgress.slice(0, 3).map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              const loc = LOCATION_MAP.get(bld.locationId);
              return (
                <div key={bld.instanceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink)]">{def?.name}</span>
                    <span className="text-[var(--ink-3)] text-[10px]">{loc?.name}</span>
                  </div>
                  {bld.startedAtMs && bld.realDurationSeconds ? (
                    <Countdown startedAtMs={bld.startedAtMs} durationSeconds={bld.realDurationSeconds} />
                  ) : (
                    <span className="font-mono text-[10px] text-[var(--caution)]">{formatGameDate(bld.completionDate)}</span>
                  )}
                </div>
              );
            })}
            {inProgress.length > 3 && <p className="text-[var(--ink-3)] text-[10px]">+{inProgress.length - 3} more</p>}
          </div>
        </Console>
      )}

      {/* Net Income Banner — the sign is carried by the PROFIT/LOSS pip and
          the ▲/▼ glyph, not by colour alone. */}
      <Console title="Net Income" actions={<StatusPip state={financials.net >= 0 ? 'go' : 'scrub'} label={financials.net >= 0 ? 'PROFIT' : 'LOSS'} />}>
        <div className="flex items-center justify-between gap-3">
          <Telemetry
            label="Monthly net"
            value={formatMoney(financials.net)}
            unit="/mo"
            tone={financials.net >= 0 ? 'signal' : 'ink'}
            sub={`${state.activeServices.length} active service${state.activeServices.length !== 1 ? 's' : ''} · ${state.unlockedLocations.length} location${state.unlockedLocations.length !== 1 ? 's' : ''}`}
          />
          <MiniSparkline positive={financials.net >= 0} />
        </div>
      </Console>

      {/* Cost Breakdown — so players see workforce, research bonuses, and all line items */}
      {(financials.payroll > 0 || financials.wfBonuses.serviceRevenue > 0 || financials.resBonuses.serviceRevenueBonus > 0) && (
        <Console title="Income Breakdown" padded={false}>
          <DataTable<IncomeRow> caption="Income breakdown" columns={incomeColumns} rows={incomeRows} />
        </Console>
      )}

      {/* Income History Chart */}
      {state.incomeHistory && state.incomeHistory.length >= 2 && (
        <IncomeChart data={state.incomeHistory} />
      )}

      {/* Mini-Activities — quick money-earning actions. Newcomer-gated (FTUE v2): random side-income buttons on minute one teach the wrong loop. */}
      {!newcomer && <MiniActivitiesWidget
        state={state}
        onExecute={(activityId: string, reward: MiniActivityReward) => {
          window.dispatchEvent(new CustomEvent('mini-activity-execute', {
            detail: { activityId, reward },
          }));
        }}
      />}

      {/* Weekly Challenge — newcomer-gated (FTUE v2, weekly-loop content) */}
      {!newcomer && <WeeklyChallengeWidget />}

      {/* Speed Boosts — available and active */}
      {((state.availableBoosts && state.availableBoosts.length > 0) || (state.activeBoosts && state.activeBoosts.length > 0)) && (
        <Console title="Speed Boosts">
          {/* Active boosts with countdown */}
          {state.activeBoosts && state.activeBoosts.filter(b => b.expiresAtMs > Date.now()).map(b => (
            <div key={b.boostId} className="flex items-center justify-between gap-2 text-[11px] mb-1">
              <span className="inline-flex items-center gap-2 text-[var(--ink)]"><StatusPip state="live" label="ACTIVE" /> {b.label}</span>
              <span className="font-mono tabular-nums text-[var(--ink-2)]">
                {Math.max(0, Math.round((b.expiresAtMs - Date.now()) / 60000))}m left
              </span>
            </div>
          ))}
          {/* Available boosts to activate */}
          {state.availableBoosts && state.availableBoosts.length > 0 && (
            <div className="space-y-1 mt-1">
              {state.availableBoosts.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--ink-2)]">{b.label}</span>
                  <button
                    type="button"
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
                    className="btn-secondary !min-h-[36px] !py-1 !px-3 text-[12px]"
                  >
                    Activate
                  </button>
                </div>
              ))}
              {state.availableBoosts.length > 5 && (
                <p className="text-[var(--ink-3)] text-[10px]">+{state.availableBoosts.length - 5} more</p>
              )}
            </div>
          )}
        </Console>
      )}

      {/* Active Effects (from random events) */}
      {state.activeEffects && state.activeEffects.length > 0 && (
        <Console title="Active Effects">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {state.activeEffects.map((eff, i) => {
              const pip: PipState =
                eff.revenueMultiplier > 1 ? 'go' :
                eff.costMultiplier > 1 ? 'scrub' :
                eff.revenueMultiplier < 1 ? 'hold' :
                'flew';
              const detail = [
                eff.revenueMultiplier !== 1 ? `${eff.revenueMultiplier > 1 ? '+' : ''}${Math.round((eff.revenueMultiplier - 1) * 100)}% rev` : null,
                eff.costMultiplier !== 1 ? `${eff.costMultiplier > 1 ? '+' : ''}${Math.round((eff.costMultiplier - 1) * 100)}% cost` : null,
              ].filter(Boolean).join(' · ');
              return (
                <span key={i} className="inline-flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                  <StatusPip state={pip} label={eff.label} />
                  {detail && <span className="font-mono tabular-nums">{detail}</span>}
                </span>
              );
            })}
          </div>
        </Console>
      )}

      {/* Active Research with real-time countdown */}
      {state.activeResearch && (() => {
        const def = RESEARCH.find(r => r.id === state.activeResearch!.definitionId);
        const hasRealTime = state.activeResearch!.startedAtMs && state.activeResearch!.realDurationSeconds;
        const hasQ2 = state.completedResearch.includes('parallel_research');
        return (
          <Console title={`Researching${hasQ2 ? ' (Q1)' : ''}: ${def?.name || ''}`} status="live">
            {hasRealTime ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch!.startedAtMs!}
                durationSeconds={state.activeResearch!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 rounded-full overflow-hidden bg-[var(--elev)]">
                <div className="h-full rounded-full bg-[var(--violet)]" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-[var(--ink-3)] text-[10px] mt-1">{def?.effect}</p>
            {def && <p className="text-[var(--signal)] text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def)}</p>}
          </Console>
        );
      })()}
      {/* Second Research Queue on Dashboard */}
      {state.activeResearch2 && state.completedResearch.includes('parallel_research') && (() => {
        const def2 = RESEARCH.find(r => r.id === state.activeResearch2!.definitionId);
        const hasRealTime2 = state.activeResearch2!.startedAtMs && state.activeResearch2!.realDurationSeconds;
        return (
          <Console title={`Researching (Q2): ${def2?.name || ''}`} status="live">
            {hasRealTime2 ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch2!.startedAtMs!}
                durationSeconds={state.activeResearch2!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 rounded-full overflow-hidden bg-[var(--elev)]">
                <div className="h-full rounded-full bg-[var(--signal)]" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-[var(--ink-3)] text-[10px] mt-1">{def2?.effect}</p>
            {def2 && <p className="text-[var(--signal)] text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def2)}</p>}
          </Console>
        );
      })()}

      {/* Under Construction */}
      {inProgress.length > 0 && (
        <Console title={`Under Construction (${inProgress.length})`} status="live">
          <div className="space-y-2">
            {inProgress.slice(0, 5).map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              const loc = LOCATION_MAP.get(bld.locationId);
              return (
                <div key={bld.instanceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[var(--ink)]">{def?.name}</span>
                      <span className="text-[var(--ink-3)] ml-1.5">@ {loc?.name}</span>
                    </div>
                  </div>
                  {bld.startedAtMs && bld.realDurationSeconds ? (
                    <Countdown startedAtMs={bld.startedAtMs} durationSeconds={bld.realDurationSeconds} />
                  ) : (
                    <span className="font-mono text-[10px] text-[var(--caution)]">{formatGameDate(bld.completionDate)}</span>
                  )}
                </div>
              );
            })}
            {inProgress.length > 5 && <p className="text-[var(--ink-3)] text-[10px]">+{inProgress.length - 5} more</p>}
          </div>
        </Console>
      )}

      {/* Active Services */}
      <Console
        title={`Active Services (${serviceTypeCount} types, ${state.activeServices.length} total)`}
        padded={state.activeServices.length === 0}
      >
        {state.activeServices.length === 0 ? (
          <p className="text-[var(--ink-3)] text-xs">Build infrastructure to enable revenue-generating services.</p>
        ) : (
          <DataTable<ServiceRow>
            caption="Active services"
            columns={serviceColumns}
            rows={serviceRows}
            initialSort={{ key: 'revenue', dir: 'desc' }}
          />
        )}
      </Console>

      {/* Risk & Reserves — Wave F UI surfacing (b/d): insurance toggle
          (economic-sinks.ts), hazard warnings (state.hazardWarnings), and
          the T5+ cash-reserve meter (state.reserveStatus). CLAUDE.md "no
          combat — but real risk": these are the risk-management decisions
          hazards/insurance were designed to create. */}
      <Console title="Risk & Reserves">
        <div className="space-y-3">

        {/* Insurance */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <GameIcon name="shield" size={13} />
              <span className="text-xs font-semibold text-[var(--ink)]">Hazard Insurance</span>
              <StatusPip state={state.insuranceActive !== false ? 'live' : 'hold'} label={state.insuranceActive !== false ? 'ACTIVE' : 'UNINSURED'} />
            </div>
            <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
              {formatMoney(computeInsuredAssetValue(state))} insured · {countInsuranceRiskLocations(state)} high-risk location{countInsuranceRiskLocations(state) === 1 ? '' : 's'} · {formatMoney(getMonthlyInsurancePremium(state))}/mo premium
            </p>
          </div>
          {onSetInsuranceActive && (
            <button
              type="button"
              onClick={() => onSetInsuranceActive(!(state.insuranceActive !== false))}
              aria-pressed={state.insuranceActive !== false}
              className={`shrink-0 !min-h-[36px] !py-1 !px-3 text-[12px] ${state.insuranceActive !== false ? 'btn-secondary' : 'btn-primary'}`}
            >
              {state.insuranceActive !== false ? 'Cancel Policy' : 'Buy Coverage'}
            </button>
          )}
        </div>

        {/* Reserve meter — T5+ corporations only (economic-sinks §7) */}
        {(state.corporationTier || 1) >= 5 && state.reserveStatus && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <GameIcon name="money" size={13} />
                <span className="text-xs font-semibold text-[var(--ink)]">Cash Reserve</span>
                <StatusPip
                  state={state.reserveStatus.status === 'critical' ? 'scrub' : state.reserveStatus.status === 'warning' ? 'hold' : 'go'}
                  label={state.reserveStatus.status.toUpperCase()}
                />
              </div>
              <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
                3-month runway target: {formatMoney(state.reserveStatus.requiredReserve)}
                {state.reserveStatus.efficiencyMultiplier < 1 && (
                  <span className="text-[var(--caution)]"> · service revenue at {Math.round(state.reserveStatus.efficiencyMultiplier * 100)}% until restored</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Hazard warnings — forecast for next game-month */}
        {(state.hazardWarnings || []).length > 0 && (
          <div className="space-y-1">
            <p className={OVERLINE}>Hazard Forecast</p>
            {(state.hazardWarnings || []).slice(0, 4).map(w => (
              <div
                key={w.id}
                className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)] text-[var(--ink-2)]"
              >
                <StatusPip state={w.severity === 'severe' ? 'scrub' : w.severity === 'major' ? 'hold' : 'go'} label={w.severity.toUpperCase()} />
                <span>{w.summary}</span>
                <span className="ml-auto font-mono text-[10px] text-[var(--ink-3)]">{LOCATION_MAP.get(w.locationId)?.name || w.locationId}</span>
              </div>
            ))}
          </div>
        )}
        </div>
      </Console>

      {/* Event Log */}
      <Console title="Event Log">
        <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {state.eventLog
            .filter(evt => !(evt.type === 'npc_activity' && evt.title?.includes('market activity')))
            .slice(0, 20)
            .map((evt, i) => {
            const isNPC = evt.type === 'npc_activity';
            return (
              <div
                key={evt.id}
                className={`flex gap-2 text-[11px] py-1 border-b border-[var(--line)] last:border-0 ${isNPC ? 'opacity-70' : ''} ${i === 0 ? 'motion-safe:animate-reveal-up' : ''}`}
              >
                <span className="font-mono tabular-nums text-[var(--ink-3)] shrink-0 w-16">{formatGameDate(evt.date)}</span>
                <div>
                  {isNPC && <GameIcon name="npc" size={11} className="text-[var(--ink-3)] mr-1" />}
                  <span className={isNPC ? 'text-[var(--ink-3)]' : 'text-[var(--ink-2)]'}>{evt.title}</span>
                  {evt.description && <span className="text-[var(--ink-3)] ml-1">— {evt.description}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Console>

      {/* Game Stats Footer */}
      <Console title="Corporate Ledger">
        <div className="grid grid-cols-3 gap-4">
          <Telemetry label="Total Earned" value={formatMoney(state.totalEarned)} tone="signal" />
          <Telemetry label="Total Spent" value={formatMoney(state.totalSpent)} tone="ink" />
          <Telemetry label="Net Worth" value={formatMoney(state.money)} tone="ember" />
        </div>
      </Console>

      {/* Sol Historical Archive — real site headlines reframed as in-universe
          history (docs/LORE.md narrative year). Renders nothing on empty/error.
          Newcomer-gated (FTUE v2). */}
      {!newcomer && <HistoricalArchiveTicker />}
    </div>
  );
}
