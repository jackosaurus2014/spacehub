'use client';

import { useState, useMemo, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  getDeliveryPool,
  getActiveDeliveries,
  getCompletedDeliveries,
  canDeliver,
  formatDeadline,
  getDeliveryCapStatus,
  getActiveDeliveryCount,
  getActiveDeliveryLimit,
  type DeliveryContract,
  type DeliveryCapStatus,
} from '@/lib/game/delivery-contracts';
import { FACTION_MAP, getFactionArtUrl, type FactionId } from '@/lib/game/factions';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import { formatMoney } from '@/lib/game/formulas';
import { Concept } from './HoloTip';
import Image from 'next/image';

interface Props {
  state: GameState;
  onAccept: (contractId: string) => void;
  onDeliver: (contractId: string) => void;
}

type DiplomacyTab = 'market' | 'active' | 'history';

export default function DiplomacyPanel({ state, onAccept, onDeliver }: Props) {
  const [tab, setTab] = useState<DiplomacyTab>('market');
  const [now, setNow] = useState(() => Date.now());

  // Tick clock every 10s so deadlines update live without heavy re-renders.
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(iv);
  }, []);

  const pool       = getDeliveryPool(state);
  const active     = getActiveDeliveries(state);
  const completed  = getCompletedDeliveries(state);
  const capStatus  = getDeliveryCapStatus(state, now);

  return (
    <div className="space-y-4">
      <div className="hud-frame relative card p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-white text-base font-bold flex items-center gap-2">
              <span className="text-amber-400">⚐</span> Diplomacy &amp; Contracts
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Binding resource-delivery contracts from the six factions. Accept to commit; fulfill to earn
              money and reputation. Default on a deadline and your standing suffers.
            </p>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap items-center">
          <TabButton active={tab === 'market'} onClick={() => setTab('market')}>
            📄 Open Market ({pool.length})
          </TabButton>
          <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
            🔶 Active ({active.length})
          </TabButton>
          <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
            📚 History ({completed.length})
          </TabButton>
          <DeliveryCapBadge capStatus={capStatus} now={now} />
        </div>
      </div>

      {tab === 'market' && (
        <MarketTab state={state} pool={pool} now={now} onAccept={onAccept} />
      )}
      {tab === 'active' && (
        <ActiveTab state={state} active={active} now={now} onDeliver={onDeliver} capStatus={capStatus} />
      )}
      {tab === 'history' && <HistoryTab completed={completed} />}
    </div>
  );
}

// ─── Daily completion cap badge ────────────────────────────────────────────

function DeliveryCapBadge({ capStatus, now }: { capStatus: DeliveryCapStatus; now: number }) {
  const { completed, cap, atCap, resetInMs } = capStatus;
  return (
    <div
      className={`ml-auto min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border ${
        atCap
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
      }`}
    >
      {atCap && <span aria-hidden="true">⚠</span>}
      <Concept id="delivery-cap">
        Contracts completed: <span className="font-mono">{completed}/{cap}</span>
        {atCap && <> — resets in {formatDeadline(now + resetInMs, now)}</>}
      </Concept>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
        active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Market Tab ───────────────────────────────────────────────────────────────

function MarketTab({ state, pool, now, onAccept }: { state: GameState; pool: DeliveryContract[]; now: number; onAccept: (id: string) => void }) {
  const [factionFilter, setFactionFilter] = useState<FactionId | 'all'>('all');

  const visible = pool.filter(c => factionFilter === 'all' || c.issuerFactionId === factionFilter);
  const activeCount = getActiveDeliveryCount(state);
  const activeLimit = getActiveDeliveryLimit(state);
  const atActiveLimit = activeCount >= activeLimit;

  return (
    <>
      {atActiveLimit && (
        <div className="card p-3 border border-amber-500/25 bg-amber-500/[0.06] text-amber-300 text-xs flex items-center gap-2">
          <span aria-hidden="true">⛔</span>
          Active contract slots full ({activeCount}/{activeLimit}) — deliver or let one expire before
          accepting more. Slots match your daily completion budget, so you can hold at most one
          day&apos;s worth of committed work.
        </div>
      )}
      {/* Faction filter chips */}
      <div className="card p-2 flex flex-wrap gap-1 items-center text-[10px]">
        <span className="text-slate-500 px-1">Issuer:</span>
        <FactionChip active={factionFilter === 'all'} onClick={() => setFactionFilter('all')} label="All" />
        {Array.from(FACTION_MAP.entries()).map(([id, f]) => (
          <FactionChip
            key={id}
            active={factionFilter === id}
            onClick={() => setFactionFilter(id)}
            label={f.name}
            accent={f.theme.accent}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          No open contracts match your filter. Pool refreshes every 4 hours.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              state={state}
              now={now}
              action={
                atActiveLimit
                  ? { label: `Slots full (${activeCount}/${activeLimit})`, tone: 'disabled' as const }
                  : { label: 'Accept Contract', onClick: () => onAccept(c.id), tone: 'primary' }
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function FactionChip({ active, onClick, label, accent }: { active: boolean; onClick: () => void; label: string; accent?: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[38px] px-2 py-1 rounded font-medium transition-colors ${
        active
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          : `bg-white/[0.04] border border-white/[0.06] hover:text-white ${accent || 'text-slate-400'}`
      }`}
    >
      {label}
    </button>
  );
}

// ─── Active Tab ───────────────────────────────────────────────────────────────

function ActiveTab({
  state, active, now, onDeliver, capStatus,
}: {
  state: GameState; active: DeliveryContract[]; now: number; onDeliver: (id: string) => void; capStatus: DeliveryCapStatus;
}) {
  if (active.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-500 text-sm">No active contracts.</div>
        <div className="text-slate-600 text-xs mt-1">Accept offers in the Open Market tab to commit.</div>
      </div>
    );
  }

  // Sort: overdue first, then by closest deadline
  const sorted = [...active].sort((a, b) => a.deadlineAtMs - b.deadlineAtMs);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map(c => {
        const haveEnough = canDeliver(state, c.id);
        // At cap: even a fully-stocked contract can't be completed right now
        // — deliverContract() itself refuses (see delivery-contracts.ts), so
        // the button reflects that instead of offering a dead action.
        const deliverable = haveEnough && !capStatus.atCap;
        const have = state.resources[c.resourceId as ResourceId] || 0;
        const overdue = c.deadlineAtMs <= now;
        const capBlocked = haveEnough && capStatus.atCap && !overdue;
        return (
          <ContractCard
            key={c.id}
            contract={c}
            state={state}
            now={now}
            overdue={overdue}
            footer={
              <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
                <span>
                  You hold: <span className={have >= c.quantity ? 'text-emerald-300 font-mono font-bold' : 'text-amber-300 font-mono'}>
                    {have.toLocaleString()} / {c.quantity.toLocaleString()}
                  </span>
                </span>
              </div>
            }
            action={{
              label: capBlocked
                ? `⚠ Daily cap reached (${capStatus.completed}/${capStatus.cap}) — next slot in ${formatDeadline(now + capStatus.resetInMs, now)}`
                : deliverable ? 'Deliver & Collect' : overdue ? 'Overdue — will default' : `Need ${(c.quantity - have).toLocaleString()} more`,
              onClick: deliverable ? () => onDeliver(c.id) : undefined,
              tone: deliverable ? 'primary' : overdue ? 'danger' : 'disabled',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ completed }: { completed: DeliveryContract[] }) {
  if (completed.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500 text-sm">
        No contract history yet. Completed and defaulted contracts will appear here.
      </div>
    );
  }
  return (
    <div className="hud-frame relative card p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="divide-y divide-white/[0.04]">
        {completed.map(c => {
          const faction = c.issuerFactionId ? FACTION_MAP.get(c.issuerFactionId as FactionId) : null;
          const resource = RESOURCE_MAP.get(c.resourceId as ResourceId);
          const won = c.status === 'completed';
          return (
            <div key={c.id} className="py-2.5 px-2 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${won ? 'bg-emerald-400' : 'bg-red-400'}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-sm font-bold truncate">{c.title}</span>
                  {faction && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${faction.theme.border} ${faction.theme.accent}`}>{faction.name}</span>}
                </div>
                <div className="text-[10px] text-slate-500">
                  {won ? 'Completed' : 'Defaulted'} · {resource?.name} × {c.quantity.toLocaleString()}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`game-number font-mono text-sm font-bold ${won ? 'text-emerald-300' : 'text-red-300'}`}>
                  {won ? `+${formatMoney(c.paymentMoney)}` : 'Default'}
                </div>
                <div className={`game-number text-[10px] ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                  {won ? `+${c.reputationOnComplete} rep` : `${c.reputationOnDefault} rep`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contract Card (shared) ───────────────────────────────────────────────────

function ContractCard({
  contract, state, now, action, footer, overdue,
}: {
  contract: DeliveryContract;
  state: GameState;
  now: number;
  action?: { label: string; onClick?: () => void; tone: 'primary' | 'danger' | 'disabled' };
  footer?: React.ReactNode;
  overdue?: boolean;
}) {
  const faction = contract.issuerFactionId ? FACTION_MAP.get(contract.issuerFactionId as FactionId) : null;
  const resource = RESOURCE_MAP.get(contract.resourceId as ResourceId);

  const toneClasses =
    action?.tone === 'primary'
      ? 'bg-cyan-500 text-black hover:bg-cyan-400'
      : action?.tone === 'danger'
      ? 'bg-red-500/15 text-red-300 border border-red-500/30'
      : 'bg-white/[0.04] text-slate-500 cursor-not-allowed border border-white/[0.05]';

  return (
    <div className={`hud-frame relative rounded-xl overflow-hidden border ${overdue ? 'border-red-500/40 bg-red-500/5' : faction ? faction.theme.border : 'border-white/[0.1]'}`} style={{ background: '#0a0a1a' }}>
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      {/* Faction banner */}
      {faction && (
        <div className="relative h-12 overflow-hidden">
          <Image src={getFactionArtUrl(contract.issuerFactionId as FactionId)} alt="" fill className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${faction.theme.accent}`}>{faction.name}</div>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="sprite-frame relative w-10 h-10 shrink-0">
            {resource && <Image src={RESOURCE_ASSETS[contract.resourceId] || RESOURCE_ASSETS.iron} alt="" fill className="object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold leading-tight">{contract.title}</div>
            <div className="text-slate-500 text-[10px] mt-0.5">
              Deliver <span className="text-white font-mono">{contract.quantity.toLocaleString()} {resource?.name || contract.resourceId}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-2">
          {/* Wave E2 (§2.3): no arbitrage haircut. paymentMoney is a base-price
              preview while the contract is open, then locks to LIVE SPOT the
              moment it's accepted (spotUnitAtAcceptance) — a genuine forward.
              Either way this is exactly what deliverContract() pays out. */}
          <MicroStat label={contract.spotUnitAtAcceptance ? 'Payment (spot-locked)' : 'Payment (est.)'} value={formatMoney(contract.paymentMoney)} accent="cyan" />
          <MicroStat label="Deadline" value={formatDeadline(contract.deadlineAtMs, now)} accent={overdue ? 'red' : contract.deadlineAtMs - now < 6 * 3600 * 1000 ? 'amber' : 'slate'} />
          <MicroStat label="Rep" value={`+${contract.reputationOnComplete} / ${contract.reputationOnDefault}`} accent="purple" />
        </div>

        {footer}

        {action && (
          action.onClick ? (
            <button
              onClick={action.onClick}
              className={`w-full min-h-[44px] mt-2 px-2 py-1.5 rounded text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${toneClasses}`}
            >
              {action.label}
            </button>
          ) : (
            <div className={`w-full mt-2 px-2 py-1.5 rounded text-[11px] font-medium text-center ${toneClasses}`}>
              {action.label}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function MicroStat({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'red' | 'amber' | 'slate' | 'purple' }) {
  const color = {
    cyan: 'text-cyan-300', red: 'text-red-300', amber: 'text-amber-300', slate: 'text-slate-300', purple: 'text-purple-300',
  }[accent];
  return (
    <div className="rounded bg-white/[0.03] p-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`game-number font-mono text-[11px] font-bold ${color} truncate`}>{value}</div>
    </div>
  );
}
