'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate } from '@/lib/game/formulas';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { getWorkforceBonuses, getMonthlyPayroll } from '@/lib/game/workforce';
import { getResearchBonuses } from '@/lib/game/research-tree';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import { getActiveMultipliers } from '@/lib/game/random-events';
import { SHIP_MAP } from '@/lib/game/ships';
import { toggleMute, isMuted, initAudio, toggleAmbient, isAmbientPlaying } from '@/lib/game/sound-engine';
import { toggleMusic, isMusicPlaying, setMusicVolume, getMusicVolume, initMusicAutoResume } from '@/lib/game/music-engine';
import { isHapticsEnabled, toggleHaptics, vibrate } from '@/lib/game/haptics';
import { toggleGameDensity, type GameDensity } from '@/lib/game/density';
import { getTierDef, getTierBonuses } from '@/lib/game/corporation-tiers';
// Wave E4 (Finite Demand Pools): projection reads THE tick's multiplier source.
import { getServiceDemandMultiplier } from '@/lib/game/service-pricing';
import { gameDateToMonthIndex } from '@/lib/game/demand-pools';
import { getLegacyBonuses, DEFAULT_LEGACY } from '@/lib/game/legacy-system';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

interface ResourceBarProps {
  state: GameState;
  /** Wave V8 — current density mode, lifted to the page shell so it can also
   *  drive the `data-density` attribute on the game root. Optional so
   *  existing tests/usages that don't care about density still compile;
   *  defaults to comfortable. */
  density?: GameDensity;
  onDensityChange?: (density: GameDensity) => void;
}

/** Animated number that rolls toward a target value via RAF easing. Also emits
 *  a one-shot `.delta-flash-up/down` class on its wrapper when the value jumps
 *  by more than `flashThreshold`, so the caller can layer the flash reaction. */
function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (Math.abs(diff) < 100) {
      setDisplay(value);
      ref.current = value;
      return;
    }

    const duration = 300;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    }
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{formatMoney(display)}</span>;
}

/** 30-point sparkline of recent money readings. Renders at ~64×18 so it fits
 *  snugly to the right of the cash figure without crowding on mobile. */
function MoneySparkline({ history, positive }: { history: number[]; positive: boolean }) {
  if (history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = Math.max(1, max - min);
  const w = 64;
  const h = 18;
  const step = w / (history.length - 1);
  const points = history.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${points.join(' L ')}`;
  const stroke = positive ? '#4ade80' : '#f87171';
  return (
    <svg className="sparkline" width={w} height={h} style={{ color: stroke }} aria-hidden="true">
      <path d={d} stroke={stroke} />
    </svg>
  );
}

const SPARKLINE_MAX_POINTS = 30;

export default function ResourceBar({ state, density = 'comfortable', onDensityChange }: ResourceBarProps) {
  const [muted, setMuted] = useState(true);
  const [ambient, setAmbient] = useState(false);
  const [music, setMusic] = useState(false);
  const [musicVol, setMusicVol] = useState(0.45);
  // Wave V7 — haptics toggle. Only rendered when the device actually exposes
  // navigator.vibrate (desktop mice never do) so the control isn't clutter
  // on hardware it can't affect.
  const [hapticsSupported, setHapticsSupported] = useState(false);
  const [haptics, setHaptics] = useState(false);

  useEffect(() => {
    setMuted(isMuted());
    setAmbient(isAmbientPlaying());
    setMusic(isMusicPlaying());
    setMusicVol(getMusicVolume());
    setHapticsSupported(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
    setHaptics(isHapticsEnabled());
    // W12: if the player had music on last session, resume it on their first
    // gesture (autoplay-policy safe — the gesture unlocks the AudioContext).
    initMusicAutoResume(() => setMusic(true));
  }, []);

  // ─── P&L computation — must match game engine exactly ────────────────────
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const wfBonuses = getWorkforceBonuses(workforce);
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
  const legacyBonuses = getLegacyBonuses(state.legacy || DEFAULT_LEGACY);
  const tierBonuses = getTierBonuses(state.corporationTier || 1);
  const multipliers = getActiveMultipliers(state);

  const corpTier = state.corporationTier || 1;
  const tierDef = getTierDef(corpTier);

  let revenue = 0, costs = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    const supplyMult = getServiceDemandMultiplier(state, svc.definitionId, svc.locationId, gameDateToMonthIndex(state.gameDate));
    revenue += def.revenuePerMonth * svc.revenueMultiplier * multipliers.revenueMultiplier * upgradeBoost
      * (1 + wfBonuses.serviceRevenue) * (1 + resBonuses.serviceRevenueBonus) * legacyBonuses.revenueMultiplier * (1 + tierBonuses.revenueBonus) * supplyMult;
    costs += def.operatingCostPerMonth * multipliers.costMultiplier * legacyBonuses.costMultiplier * (1 - tierBonuses.maintenanceReduction);
  }
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    costs += def.maintenanceCostPerMonth * multipliers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction) * legacyBonuses.costMultiplier * (1 - tierBonuses.maintenanceReduction);
  }
  costs += getMonthlyPayroll(workforce);
  for (const ship of (state.ships || [])) {
    if (!ship.isBuilt) continue;
    const shipDef = SHIP_MAP.get(ship.definitionId);
    if (shipDef?.maintenancePerMonth) costs += shipDef.maintenancePerMonth;
  }
  const net = Math.round(revenue - costs);

  // ─── Client-side money history (sparkline) + delta-flash driver ──────────
  const historyRef = useRef<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const prevMoneyRef = useRef<number>(state.money);
  const [flashKey, setFlashKey] = useState(0);
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevMoneyRef.current;
    if (state.money !== prev) {
      // Keep the last SPARKLINE_MAX_POINTS readings. We sample on every state
      // update so the line reflects genuine economic motion, not wall-clock time.
      const next = [...historyRef.current, state.money].slice(-SPARKLINE_MAX_POINTS);
      historyRef.current = next;
      setHistory(next);
      // Only flash on meaningful deltas — small rounding ticks shouldn't strobe.
      const delta = state.money - prev;
      if (Math.abs(delta) >= 100_000) {
        setFlashDir(delta > 0 ? 'up' : 'down');
        setFlashKey(k => k + 1);
      }
      prevMoneyRef.current = state.money;
    }
  }, [state.money]);

  // Sparkline color follows last-5-point trend, not just instantaneous net.
  const sparkTrendUp = useMemo(() => {
    if (history.length < 2) return net >= 0;
    const tail = history.slice(-5);
    return tail[tail.length - 1] >= tail[0];
  }, [history, net]);

  const handleToggleMute = () => {
    initAudio();
    setMuted(toggleMute());
  };
  const handleToggleAmbient = () => {
    initAudio();
    toggleAmbient();
    setAmbient(isAmbientPlaying());
  };
  const handleToggleMusic = () => {
    initAudio();
    toggleMusic();
    setMusic(isMusicPlaying());
  };
  const handleMusicVolume = (v: number) => {
    setMusicVol(v);
    setMusicVolume(v);
  };
  const handleToggleHaptics = () => {
    const next = toggleHaptics();
    setHaptics(next);
    if (next) vibrate(10); // confirm the toggle itself with a tap, once enabled
  };
  // Wave V8 — density mode toggle. Persists via density.ts, then notifies
  // the page shell (onDensityChange) so it can re-set the `data-density`
  // attribute on the game root — GameStyles.tsx's CSS custom properties do
  // the rest, no per-panel re-render required.
  const handleToggleDensity = () => {
    const next = toggleGameDensity();
    onDensityChange?.(next);
  };

  return (
    <div className="hud-frame relative bg-black/90 border-b border-cyan-500/10 px-3 sm:px-4 py-2 z-20">
      {/* Bottom corner brackets (top brackets are painted by ::before/::after) */}
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />

      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap max-w-5xl mx-auto">
        {/* Money + sparkline + net income chip */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            // Re-mounting the span via key={flashKey} re-triggers the one-shot
            // delta-flash animation defined in GameStyles.
            key={flashKey}
            className={`flex items-center gap-2 px-1.5 py-0.5 ${flashDir === 'up' ? 'delta-flash-up' : flashDir === 'down' ? 'delta-flash-down' : ''}`}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            <AnimatedMoney
              value={state.money}
              className="text-white font-bold text-sm sm:text-base font-mono tracking-tight"
            />
            <span className="hidden sm:block">
              <MoneySparkline history={history} positive={sparkTrendUp} />
            </span>
          </div>

          <HoloTip
            as="div"
            underline={false}
            content={{
              title: 'Net Income',
              icon: 'money',
              iconGlow: net >= 0 ? 'green' : 'red',
              body: <>Everything you earn minus everything you spend, per in-game month. <span className="text-slate-400">See</span> <Concept id="net-income" /> for the full breakdown.</>,
              rows: [
                { label: 'Revenue', value: `+${formatMoney(Math.round(revenue))}/mo` },
                { label: 'Costs', value: `-${formatMoney(Math.round(costs))}/mo` },
              ],
              source: 'ResourceBar.tsx — recomputed live from services, buildings, workforce, ships',
            }}
          >
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-medium transition-colors ${
                net >= 0
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {net >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(net))}/mo
            </div>
          </HoloTip>

          {/* Corporation Tier Badge */}
          <HoloTip
            as="div"
            underline={false}
            content={{
              title: `Tier ${corpTier}: ${tierDef.name}`,
              icon: 'alliance',
              body: <Concept id="corporation-tier" />,
              rows: [
                { label: 'Revenue bonus', value: `+${Math.round(tierBonuses.revenueBonus * 100)}%` },
                { label: 'Maintenance reduction', value: `-${Math.round(tierBonuses.maintenanceReduction * 100)}%` },
              ],
            }}
          >
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border transition-colors"
              style={{ borderColor: `${tierDef.color}40`, background: `${tierDef.color}15`, color: tierDef.color }}
            >
              <span>{tierDef.icon}</span>
              <span className="hidden sm:inline">{tierDef.name}</span>
            </div>
          </HoloTip>
        </div>

        {/* Date + Live indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-slate-300 font-mono text-xs sm:text-sm">{formatGameDate(state.gameDate)}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-[10px] text-cyan-400 font-medium tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMusic}
            aria-label={music ? 'Turn off music' : 'Turn on music'}
            aria-pressed={music}
            className={`min-h-[44px] min-w-[44px] px-1.5 py-1 text-xs transition-colors rounded ${music ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
            title={music ? 'Music: On' : 'Music: Off'}
          >
            <GameIcon name="music" size={14} />
          </button>
          {music && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVol}
              onChange={(e) => handleMusicVolume(parseFloat(e.target.value))}
              aria-label="Music volume"
              className="hidden sm:block w-16 accent-cyan-400"
              title={`Music volume: ${Math.round(musicVol * 100)}%`}
            />
          )}
          <button
            onClick={handleToggleAmbient}
            aria-label={ambient ? 'Turn off ambient music' : 'Turn on ambient music'}
            aria-pressed={ambient}
            className={`min-h-[44px] min-w-[44px] px-1.5 py-1 text-xs transition-colors rounded ${ambient ? 'text-purple-400' : 'text-slate-600 hover:text-slate-400'}`}
            title={ambient ? 'Ambient: On' : 'Ambient: Off'}
          >
            <GameIcon name="ambient" size={14} />
          </button>
          <button
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            aria-pressed={muted}
            className="min-h-[44px] min-w-[44px] px-1.5 py-1 text-xs text-slate-500 hover:text-white transition-colors"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            <GameIcon name={muted ? 'mute' : 'unmute'} size={14} />
          </button>
          {hapticsSupported && (
            <button
              onClick={handleToggleHaptics}
              aria-label={haptics ? 'Turn off haptic feedback' : 'Turn on haptic feedback'}
              aria-pressed={haptics}
              className={`min-h-[44px] min-w-[44px] px-1.5 py-1 text-xs transition-colors rounded ${haptics ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
              title={haptics ? 'Haptics: On' : 'Haptics: Off'}
            >
              <GameIcon name={haptics ? 'haptics' : 'haptics-off'} size={14} />
            </button>
          )}
          {/* Wave V8 — density toggle. Hidden under 640px: compact mode is
              forced back to comfortable on phones (44px touch-target floor
              takes priority over information density there), so the control
              itself is hidden rather than offering a choice that silently
              does nothing. `hidden sm:flex` matches Tailwind's 640px `sm`
              breakpoint, the same threshold GameStyles.tsx's compact-mode
              media guards use. */}
          <button
            onClick={handleToggleDensity}
            aria-label={density === 'compact' ? 'Switch to comfortable density' : 'Switch to compact density'}
            aria-pressed={density === 'compact'}
            className={`hidden sm:flex min-h-[44px] min-w-[44px] px-1.5 py-1 text-xs transition-colors rounded ${density === 'compact' ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
            title={density === 'compact' ? 'Density: Compact' : 'Density: Comfortable'}
          >
            <GameIcon name={density === 'compact' ? 'density-compact' : 'density-comfortable'} size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
