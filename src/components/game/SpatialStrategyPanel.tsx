'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import {
  LANES,
  computeChokepoints,
  computeLaneTraffic,
  computeOrbitalSlotReport,
  locationName,
  CATEGORY_LABEL,
  CATEGORY_ACCENT,
  type LaneTraffic,
  type Chokepoint,
} from '@/lib/game/spatial-strategy';
import { formatMoney } from '@/lib/game/formulas';
import { EFFECT_ASSETS } from '@/lib/game/assets';

interface Props {
  state: GameState;
}

type SpatialTab = 'lanes' | 'chokepoints' | 'slots';

export default function SpatialStrategyPanel({ state }: Props) {
  const [tab, setTab] = useState<SpatialTab>('lanes');

  const traffic    = useMemo(() => computeLaneTraffic(state), [state]);
  const chokepoints = useMemo(() => computeChokepoints(),    []);
  const slotReport  = useMemo(() => computeOrbitalSlotReport(state), [state]);

  return (
    <div className="space-y-4">
      <div className="hud-frame relative card p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
              <span className="text-purple-400">✦</span> Spatial Strategy
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Physical geography is strategy: delta-v costs, shipping-lane traffic, and finite orbital slots.
              Route efficiency and slot dominance compound over time.
            </p>
          </div>
        </div>

        <div className="game-tab-bar flex gap-1 overflow-x-auto" role="tablist" aria-label="Spatial strategy view">
          <TabButton active={tab === 'lanes'} onClick={() => setTab('lanes')}>
            🛰️ Shipping Lanes ({traffic.filter(t => t.bothLocationsUnlocked).length})
          </TabButton>
          <TabButton active={tab === 'chokepoints'} onClick={() => setTab('chokepoints')}>
            ⚠ Chokepoints
          </TabButton>
          <TabButton active={tab === 'slots'} onClick={() => setTab('slots')}>
            🛰 Orbital Slots
          </TabButton>
        </div>
      </div>

      {tab === 'lanes'       && <LanesTab traffic={traffic} />}
      {tab === 'chokepoints' && <ChokepointsTab chokepoints={chokepoints} />}
      {tab === 'slots'       && <SlotsTab report={slotReport} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 whitespace-nowrap ${
        active ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Shipping Lanes Tab ───────────────────────────────────────────────────────

function LanesTab({ traffic }: { traffic: LaneTraffic[] }) {
  const unlocked = traffic.filter(t => t.bothLocationsUnlocked);
  const locked   = traffic.filter(t => !t.bothLocationsUnlocked);

  const byCat = new Map<string, LaneTraffic[]>();
  for (const t of unlocked) {
    const cat = t.lane.category;
    byCat.set(cat, [...(byCat.get(cat) || []), t]);
  }
  const categoryOrder: LaneTraffic['lane']['category'][] = ['orbital', 'cislunar', 'interplanetary', 'outer', 'deep'];

  return (
    <div className="space-y-3">
      {unlocked.length === 0 && (
        <div className="card p-6 text-center text-slate-500 text-sm">
          No lanes are open — unlock at least two connected locations to see shipping lane traffic.
        </div>
      )}

      {categoryOrder.map(cat => {
        const lanes = byCat.get(cat) || [];
        if (lanes.length === 0) return null;
        const accent = CATEGORY_ACCENT[cat];
        return (
          <div key={cat} className={`rounded-lg border ${accent.border} ${accent.bg} p-3`}>
            <div className={`text-xs font-bold uppercase tracking-wider ${accent.text} mb-2`}>{CATEGORY_LABEL[cat]}</div>
            <div className="space-y-2">
              {lanes.map(t => <LaneRow key={t.laneId} traffic={t} accent={accent} />)}
            </div>
          </div>
        );
      })}

      {locked.length > 0 && (
        <details className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
            {locked.length} locked lanes (one or both endpoints not yet unlocked)
          </summary>
          <div className="mt-2 space-y-1">
            {locked.map(t => (
              <div key={t.laneId} className="text-[11px] text-slate-600 flex justify-between gap-2">
                <span className="truncate">{locationName(t.lane.from)} ↔ {locationName(t.lane.to)}</span>
                <span className="text-slate-700 shrink-0">Δv {t.lane.deltaV.toLocaleString()} m/s</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function LaneRow({ traffic, accent }: { traffic: LaneTraffic; accent: { text: string; border: string; bg: string } }) {
  const { lane, playerShips, inTransit } = traffic;
  const fmtDays = (d: number) => d < 1 ? '<1 day' : d < 30 ? `${Math.round(d)} days` : d < 365 ? `${Math.round(d / 30)} mo` : `${(d / 365).toFixed(1)} yr`;
  return (
    <div className="route-card rounded bg-black/30 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-medium text-white text-sm truncate">
          {locationName(lane.from)} <span className="text-slate-500">↔</span> {locationName(lane.to)}
        </div>
        <div className="flex gap-3 text-[10px] shrink-0">
          <span className={`game-number ${accent.text}`}>Δv {lane.deltaV.toLocaleString()}</span>
          <span className="text-slate-500">{fmtDays(lane.travelDays)}</span>
        </div>
      </div>

      {/* Route line — decorative engine-trail VFX marks active traffic on the lane */}
      <div className="relative my-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" aria-hidden="true" />
        <div className="route-line flex-1" />
        {inTransit > 0 && (
          <div className="vfx-sprite vfx-pulse relative w-6 h-3 shrink-0" aria-hidden="true">
            <Image src={EFFECT_ASSETS.engineTrail} alt="" fill className="object-contain" />
          </div>
        )}
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" aria-hidden="true" />
      </div>

      {lane.narrative && (
        <p className="text-slate-500 text-[10px] italic mt-1 leading-relaxed">{lane.narrative}</p>
      )}
      <div className="flex gap-2 mt-2 text-[10px]">
        <TrafficBadge label="Your presence" value={playerShips} tone="muted" />
        <TrafficBadge label="In transit" value={inTransit} tone={inTransit > 0 ? 'active' : 'muted'} />
      </div>
    </div>
  );
}

function TrafficBadge({ label, value, tone }: { label: string; value: number; tone: 'active' | 'muted' }) {
  const color = tone === 'active' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-white/[0.03] border-white/[0.05]';
  return (
    <span className={`px-1.5 py-0.5 rounded border ${color} game-number`}>
      {label}: <span className="font-bold">{value}</span>
    </span>
  );
}

// ─── Chokepoints Tab ──────────────────────────────────────────────────────────

function ChokepointsTab({ chokepoints }: { chokepoints: Chokepoint[] }) {
  const critical = chokepoints.filter(c => c.severity === 'critical');
  const major    = chokepoints.filter(c => c.severity === 'major');
  const minor    = chokepoints.filter(c => c.severity === 'minor');

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="text-xs text-slate-400 mb-2 leading-relaxed">
          <p className="mb-1">
            <span className="text-white font-bold">Chokepoints</span> are locations that many shipping lanes must transit or terminate at.
            Controlling a chokepoint — through station infrastructure, alliance presence, and faction alignment — amplifies strategic reach.
          </p>
          <p>
            <span className="text-amber-300">Low Earth Orbit</span> is the ultimate chokepoint: essentially every route
            up from Earth passes through it. The Asteroid Belt and the outer-system gateways (Jupiter, Saturn) are
            the next tier.
          </p>
        </div>
      </div>

      <ChokepointSection title="Critical chokepoints" severity="critical" list={critical} accent="text-red-300 border-red-500/30 bg-red-500/10" />
      <ChokepointSection title="Major chokepoints"    severity="major"    list={major}    accent="text-amber-300 border-amber-500/30 bg-amber-500/10" />
      <ChokepointSection title="Minor nodes"          severity="minor"    list={minor}    accent="text-slate-300 border-slate-500/30 bg-slate-500/10" />
    </div>
  );
}

function ChokepointSection({ title, severity, list, accent }: { title: string; severity: string; list: Chokepoint[]; accent: string }) {
  if (list.length === 0) return null;
  const hudColor = severity === 'critical' ? 'hud-frame-red' : severity === 'major' ? 'hud-frame-amber' : '';
  return (
    <div className={`hud-frame ${hudColor} relative rounded-lg border ${accent} p-3`}>
      {severity !== 'minor' && (
        <>
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
        </>
      )}
      <div className="font-hud text-xs font-bold uppercase tracking-wider mb-2">{title} <span className="text-slate-500 font-normal normal-case">({list.length})</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map(c => (
          <div key={c.locationId} className="chokepoint-card rounded bg-black/30 p-2 hover:bg-black/40">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-white text-sm font-bold truncate">{locationName(c.locationId)}</span>
              <span className="game-number text-[10px] text-slate-400 shrink-0">{c.laneCount} lanes</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {c.laneCount >= 6 ? 'Every transit route touches here.' : c.laneCount >= 3 ? 'Regional hub.' : 'Terminal.'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orbital Slots Tab ────────────────────────────────────────────────────────

function SlotsTab({ report }: { report: ReturnType<typeof computeOrbitalSlotReport> }) {
  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="text-xs text-slate-400 leading-relaxed">
          <p>
            <span className="text-white font-bold">Finite orbital slots</span> are one of the genuinely scarce resources
            in the solar-system economy. Once all the viable GEO or Lagrange slots are claimed, new entrants must either
            buy slots from current holders at market-clearing prices or redirect to less-premium orbits.
          </p>
          <p className="mt-2 text-slate-500">
            Your occupancy below is the count of your completed buildings at each slot pool. A server-aggregated
            global occupancy view will land when the slot-market system goes live.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {report.map(r => (
          <div key={r.pool.locationId} className="hud-frame relative card p-3">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <h3 className="font-hud text-white font-bold text-sm">{r.pool.label}</h3>
                <div className="text-slate-500 text-[10px]">{locationName(r.pool.locationId)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="game-number text-cyan-300 text-sm font-bold">{r.playerOccupied} / {r.pool.totalSlots}</div>
                <div className="text-[10px] text-slate-500">your slots</div>
              </div>
            </div>

            <div
              className="h-2 bg-white/[0.06] rounded-full overflow-hidden my-2"
              role="progressbar"
              aria-label={`Your ${r.pool.label} occupancy`}
              aria-valuenow={r.playerOccupied}
              aria-valuemin={0}
              aria-valuemax={r.pool.totalSlots}
              aria-valuetext={`${r.playerOccupied} of ${r.pool.totalSlots} slots occupied by your corporation`}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                style={{ width: `${r.playerOccupancyPct}%` }}
                aria-hidden="true"
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">{r.pool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
