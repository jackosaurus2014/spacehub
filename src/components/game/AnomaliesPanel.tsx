'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { stakeClaim, formatAnomalyRewards, rollAnomalyDiscovery, recordDiscovery, type AnomalyKind } from '@/lib/game/exploration';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatMoney } from '@/lib/game/formulas';
import { PLANET_ASSETS, EFFECT_ASSETS } from '@/lib/game/assets';

const KIND_ART: Record<AnomalyKind, string> = {
  rich_deposit: PLANET_ASSETS.asteroid_field,
  ancient_artifact: PLANET_ASSETS.ancient_ruins,
  derelict_ship: PLANET_ASSETS.nebula,
  uncharted_asteroid: PLANET_ASSETS.asteroid_field,
  hazard_zone: PLANET_ASSETS.lava,
  alien_signal: PLANET_ASSETS.anomaly,
  gravitational_lens: PLANET_ASSETS.black_hole,
};

interface Props {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
}

const KIND_ICON: Record<AnomalyKind, string> = {
  rich_deposit: '⛏️',
  ancient_artifact: '🗿',
  derelict_ship: '🚀',
  uncharted_asteroid: '☄️',
  hazard_zone: '⚠️',
  alien_signal: '📡',
  gravitational_lens: '🔭',
};

const KIND_ACCENT: Record<AnomalyKind, string> = {
  rich_deposit: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
  ancient_artifact: 'border-purple-500/40 bg-purple-500/5 text-purple-300',
  derelict_ship: 'border-slate-500/40 bg-slate-500/5 text-slate-300',
  uncharted_asteroid: 'border-stone-500/40 bg-stone-500/5 text-stone-300',
  hazard_zone: 'border-red-500/40 bg-red-500/5 text-red-300',
  alien_signal: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
  gravitational_lens: 'border-sky-500/40 bg-sky-500/5 text-sky-300',
};

type AnomalyTab = 'known' | 'claimed' | 'manual';

export default function AnomaliesPanel({ state, setState }: Props) {
  const [tab, setTab] = useState<AnomalyTab>('known');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(iv);
  }, []);

  const known = useMemo(() => (state.knownAnomalies || []).filter(a => !a.claimed && a.fadesAtMs > now), [state.knownAnomalies, now]);
  const claimed = useMemo(() => (state.knownAnomalies || []).filter(a => a.claimed), [state.knownAnomalies]);

  return (
    <div className="space-y-4">
      <div className="hud-frame relative card p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
              <span className="text-sky-400">🔭</span> Discoveries & Claims
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Survey ships discover anomalies at their destinations. Stake a claim within 30 days to lock in rewards
              — rich deposits, derelicts, ancient artifacts, or hazard warnings. Unclaimed discoveries fade and are
              rediscoverable by anyone.
            </p>
          </div>
        </div>

        <div className="game-tab-bar flex gap-1 flex-wrap overflow-x-auto">
          <TabButton active={tab === 'known'} onClick={() => setTab('known')}>🔍 Unclaimed ({known.length})</TabButton>
          <TabButton active={tab === 'claimed'} onClick={() => setTab('claimed')}>📌 Claimed ({claimed.length})</TabButton>
          <TabButton active={tab === 'manual'} onClick={() => setTab('manual')}>🎲 Dev tools</TabButton>
        </div>
      </div>

      {tab === 'known' && <KnownTab state={state} setState={setState} anomalies={known} now={now} />}
      {tab === 'claimed' && <ClaimedTab anomalies={claimed} />}
      {tab === 'manual' && <ManualTab state={state} setState={setState} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 whitespace-nowrap ${
        active ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function KnownTab({ state, setState, anomalies, now }: { state: GameState; setState: Props['setState']; anomalies: NonNullable<GameState['knownAnomalies']>; now: number }) {
  if (anomalies.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-500 text-sm">No unclaimed anomalies in your database.</div>
        <div className="text-slate-600 text-xs mt-1">
          Send a Survey Probe on an expedition to discover new anomalies, or use the Dev tools tab to simulate one.
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {anomalies.map(a => {
        const kind = a.kind as AnomalyKind;
        const fadeRemaining = a.fadesAtMs - now;
        const fadeDays = Math.max(0, Math.floor(fadeRemaining / (24 * 60 * 60 * 1000)));
        const locName = LOCATION_MAP.get(a.locationId)?.name || a.locationId;
        const art = KIND_ART[kind];
        return (
          <div key={a.id} className={`game-card relative rounded-xl border-2 overflow-hidden ${KIND_ACCENT[kind]} p-3`} style={{ background: '#0a0a1a' }}>
            {art && (
              <div className="absolute inset-0 pointer-events-none opacity-[0.1]" aria-hidden="true">
                <Image src={art} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="relative flex items-start gap-2 mb-2">
              <div className="sprite-frame holo-sprite w-12 h-12 flex-shrink-0 flex items-center justify-center">
                {art ? (
                  <Image src={art} alt="" width={48} height={48} className="w-11 h-11 object-cover rounded" />
                ) : (
                  <span className="text-3xl" aria-hidden="true">{KIND_ICON[kind]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[9px] uppercase tracking-wider font-bold ${KIND_ACCENT[kind].split(' ').find(c => c.startsWith('text-'))}`}>
                  <span aria-hidden="true">{KIND_ICON[kind]}</span> {kind.replace(/_/g, ' ')}
                </div>
                <h3 className="text-white text-sm font-bold leading-tight">{a.title}</h3>
                <p className="text-slate-500 text-[10px]">{locName}</p>
              </div>
            </div>

            <p className="relative text-slate-400 text-[11px] leading-relaxed mb-2">{a.summary}</p>

            <div className="relative rounded bg-black/30 p-2 mb-2">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Rewards on claim</div>
              <div className="text-[11px] text-slate-200">{formatAnomalyRewards(a as any)}</div>
            </div>

            <div className="relative flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Fades in <span className={fadeDays < 3 ? 'text-amber-300 font-bold' : 'text-slate-300'}>{fadeDays} days</span>
              </span>
              <button
                onClick={() => setState(prev => prev ? stakeClaim(prev, a.id) : prev)}
                className="game-btn relative min-h-[44px] px-3 py-1.5 rounded text-[11px] font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 overflow-hidden"
              >
                <span className="vfx-sprite absolute -right-1 -top-1 w-6 h-6 opacity-25" aria-hidden="true">
                  <Image src={EFFECT_ASSETS.warpJump} alt="" fill className="object-contain" />
                </span>
                <span className="relative">Stake claim</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClaimedTab({ anomalies }: { anomalies: NonNullable<GameState['knownAnomalies']> }) {
  if (anomalies.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500 text-sm">
        No claims yet. Stake a claim from the Unclaimed tab to lock in rewards.
      </div>
    );
  }
  return (
    <div className="card p-3">
      <div className="divide-y divide-white/[0.04]">
        {anomalies.map(a => {
          const kind = a.kind as AnomalyKind;
          const locName = LOCATION_MAP.get(a.locationId)?.name || a.locationId;
          const art = KIND_ART[kind];
          return (
            <div key={a.id} className="holo-row py-2 px-1 flex items-center gap-3 rounded-lg">
              <div className="sprite-frame w-9 h-9 flex-shrink-0 flex items-center justify-center">
                {art ? (
                  <Image src={art} alt="" width={36} height={36} className="w-9 h-9 object-cover rounded" />
                ) : (
                  <span className="text-2xl" aria-hidden="true">{KIND_ICON[kind]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-bold truncate">{a.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${KIND_ACCENT[kind]}`}>{kind.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-[10px] text-slate-500">{locName} · claimed</div>
              </div>
              <div className="text-[10px] text-emerald-300 shrink-0">{formatAnomalyRewards(a as any)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManualTab({ state, setState }: { state: GameState; setState: Props['setState'] }) {
  const unlocked = state.unlockedLocations;
  return (
    <div className="card p-4 space-y-3">
      <p className="text-slate-400 text-xs leading-relaxed">
        Simulate a survey discovery at one of your unlocked locations. Useful for testing until survey-probe
        expeditions are wired to this system automatically.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {unlocked.map(locId => (
          <button
            key={locId}
            onClick={() => {
              setState(prev => {
                if (!prev) return prev;
                const a = rollAnomalyDiscovery(locId, 'dev-tool');
                if (!a) return prev;
                return recordDiscovery(prev, a);
              });
            }}
            className="min-h-[36px] px-2 py-1 rounded text-[10px] font-medium bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Roll at {LOCATION_MAP.get(locId)?.name || locId}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 italic">
        30% chance per click yields an anomaly. Re-roll until something appears.
      </p>
    </div>
  );
}
