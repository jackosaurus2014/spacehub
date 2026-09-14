'use client';

// ─── Space Tycoon: the Refit Yard console (mining Phase D) ──────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §5 "Modules over new hulls", §8 row D.
//
// Reads and writes /api/space-tycoon/assets/fitting directly and re-reads after
// every write — the Phase C console pattern, for the same reason: a registered
// fit is SERVER state. The client's GameState.shipFittings mirror arrives with
// the next sync's mining block, which is always well before the yard finishes
// (a refit is at least FITTING_SECONDS_PER_SLOT per slot point).
//
// Accessibility (CLAUDE.md): every fitting is a real <input type="checkbox">
// inside a <fieldset> whose <legend> names its exclusive group, so the whole
// console is keyboard-reachable and reads correctly in a screen reader. The
// slot meter is a <progressbar> with a text twin. No state is carried by colour
// alone — "Fitted", "Unavailable" and the refusal reason are words, and the
// glyphs beside them are redundant. Layout is a single column under 640px with
// 36-40px touch targets.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  FITTINGS,
  FITTING_GROUP_LABEL,
  FITTING_MAP,
  FITTING_SLOT_FUEL_PENALTY,
  fittingPrice,
  hullSlotBudget,
  quoteRefit,
  validateFit,
  type FittingDefinition,
  type FittingGroup,
  type ShipFittingRecord,
} from '@/lib/game/ship-fittings';
import { SHIP_MAP } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatCountdown, formatMoney } from '@/lib/game/formulas';
import { generateId } from '@/lib/game/formulas';
import { ConsolePanel, StatReadout } from './chrome';

const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';
const BTN = 'min-h-[36px] px-3 py-1 rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--elev)] text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)]';
const BTN_PRIMARY = 'min-h-[40px] px-4 py-1.5 rounded-[var(--radius-control)] bg-[var(--ember)] text-[#0A0A0B] text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]';
const FIELD_LABEL = 'block text-[11px] text-[var(--ink-3)] mb-1';
const INPUT = 'w-full min-h-[36px] rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--elev)] px-2 text-[12px] text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)]';

interface FittingView {
  fittings: ShipFittingRecord[];
  inYard: Array<{ shipInstanceId: string; readyAtMs: number }>;
  yards: string[];
  completedResearch: string[];
}

const EMPTY_VIEW: FittingView = { fittings: [], inYard: [], yards: [], completedResearch: [] };

const GROUP_ORDER: FittingGroup[] = ['extraction', 'hold', 'plant', 'sensor', 'armour', 'drive'];

/** One line of plain English per effect, so nothing is conveyed by a number
 *  the player has to decode (or by a colour). */
function describeEffects(def: FittingDefinition): string {
  const parts: string[] = [];
  const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}%`;
  const e = def.effects;
  if (e.oreRatePct) parts.push(`${pct(e.oreRatePct)} extraction rate`);
  if (e.oreRateByClass) {
    for (const [cls, v] of Object.entries(e.oreRateByClass)) {
      if (typeof v === 'number' && v !== 0) parts.push(`${pct(v)} on ${cls}-type rock`);
    }
  }
  if (e.cargoPct) parts.push(`${pct(e.cargoPct)} hold`);
  if (e.refineRatePct) parts.push(`${pct(e.refineRatePct)} plant throughput`);
  if (e.refineRecoveryAdd) parts.push(`+${Math.round(e.refineRecoveryAdd * 100)} points of refinery recovery`);
  if (e.surveySweepAdd) parts.push(`+${e.surveySweepAdd} rocks per survey pass`);
  if (e.fuelPct) parts.push(`${pct(e.fuelPct)} propellant per leg`);
  if (e.transitPct) parts.push(`${pct(e.transitPct)} transit time`);
  if (e.shakedownOddsPct) parts.push(`${pct(e.shakedownOddsPct)} shakedown odds`);
  if (e.hullWearPct) parts.push(`${pct(e.hullWearPct)} rubble hull wear`);
  return parts.join(' · ');
}

export default function FittingConsole({ state }: { state: GameState }) {
  const [view, setView] = useState<FittingView>(EMPTY_VIEW);
  const [shipId, setShipId] = useState<string>('');
  const [yardId, setYardId] = useState<string>('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>('');
  const nowMs = Date.now();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/assets/fitting', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as Partial<FittingView>;
      setView({
        fittings: Array.isArray(data.fittings) ? data.fittings : [],
        inYard: Array.isArray(data.inYard) ? data.inYard : [],
        yards: Array.isArray(data.yards) ? data.yards : [],
        completedResearch: Array.isArray(data.completedResearch) ? data.completedResearch : [],
      });
    } catch { /* the console degrades to empty; the server still refuses bad refits */ }
  }, []);

  useEffect(() => {
    if (!state.lastSyncAt) return;
    void refresh();
  }, [state.lastSyncAt, refresh]);

  // Every built hull the yard could touch.
  const hulls = useMemo(
    () => (state.ships || []).filter(s => s.isBuilt && SHIP_MAP.has(s.definitionId)),
    [state.ships],
  );
  const ship = hulls.find(s => s.instanceId === shipId) || null;
  const def = ship ? SHIP_MAP.get(ship.definitionId) : undefined;
  const current = useMemo(
    () => view.fittings.find(f => f.shipInstanceId === shipId)?.ids ?? [],
    [view.fittings, shipId],
  );
  const inYardUntil = view.inYard.find(y => y.shipInstanceId === shipId)?.readyAtMs ?? 0;

  // Selecting a hull loads its CURRENT fit as the starting point, so "apply"
  // with nothing touched is a no-op rather than a strip.
  useEffect(() => { setPicked(current); setNote(''); }, [shipId, current]);

  const research = view.completedResearch.length > 0 ? view.completedResearch : (state.completedResearch || []);
  const budget = def ? hullSlotBudget(def) : 0;
  const check = def ? validateFit(def, picked, research) : null;
  const quote = def ? quoteRefit(def, current, picked) : null;
  const yards = useMemo(() => (view.yards.length > 0 ? view.yards : []), [view.yards]);
  const shipAtYard = ship ? yards.includes(ship.currentLocation) : false;

  useEffect(() => {
    if (ship && yards.includes(ship.currentLocation)) setYardId(ship.currentLocation);
    else if (yards.length > 0) setYardId(yards[0]);
  }, [ship, yards]);

  const toggle = (id: string) => {
    setPicked(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const group = FITTING_MAP.get(id)?.group;
      // One per group: picking a second in the same group REPLACES the first,
      // which is the choice the design is trying to force the player to make.
      const without = prev.filter(x => FITTING_MAP.get(x)?.group !== group);
      return [...without, id];
    });
  };

  const submit = async (strip: boolean) => {
    if (!ship || !def) return;
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/space-tycoon/assets/fitting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: strip ? 'strip' : 'refit',
          instanceId: generateId(),
          shipInstanceId: ship.instanceId,
          moduleIds: strip ? [] : picked,
          yardLocationId: yardId,
        }),
      });
      const data = await res.json().catch(() => null) as { error?: string; readyAtMs?: number } | null;
      setNote(res.ok
        ? `${ship.name} is in the yard — ready in ${formatCountdown(Math.max(0, ((data?.readyAtMs ?? 0) - Date.now()) / 1000))}.`
        : (data?.error || 'The yard refused the refit.'));
      await refresh();
    } catch {
      setNote('The registry did not answer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsolePanel
      title="Refit Yard"
      icon="ship-mining"
      accent="cyan"
      subtitle={`What a hull can do is what is bolted to it. A fit is registered with the corporate registry, so the mining registry honours it — and only it. One fitting per group, ${Math.round(FITTING_SLOT_FUEL_PENALTY * 100)}% more propellant per slot point on every leg it ever flies, and upkeep every game-month for as long as it stays on.`}
    >
      {!state.lastSyncAt && (
        <p className="text-[12px] text-[var(--ink-3)]">
          Refitting is registered with the corporate registry, so it needs a signed-in corporation. Local play flies bare hulls.
        </p>
      )}

      {state.lastSyncAt && yards.length === 0 && (
        <p className="text-[12px] text-[var(--ink-2)]">
          You own no refit yard. Any completed fabrication facility — or a Heavy Launch Pad — turns its location into one. Build one where your miners already are and you stop flying them home.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className={FIELD_LABEL}>Hull</span>
          <select className={INPUT} value={shipId} onChange={e => setShipId(e.target.value)} aria-label="Hull to refit">
            <option value="">Select a hull…</option>
            {hulls.map(s => {
              const fitted = view.fittings.find(f => f.shipInstanceId === s.instanceId)?.ids.length ?? 0;
              return (
                <option key={s.instanceId} value={s.instanceId}>
                  {s.name} — {LOCATION_MAP.get(s.currentLocation)?.name || s.currentLocation}{fitted > 0 ? ` · ${fitted} fitted` : ''}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          <span className={FIELD_LABEL}>Yard</span>
          <select className={INPUT} value={yardId} onChange={e => setYardId(e.target.value)} aria-label="Refit yard" disabled={yards.length === 0}>
            {yards.length === 0 && <option value="">No yard owned</option>}
            {yards.map(loc => <option key={loc} value={loc}>{LOCATION_MAP.get(loc)?.name || loc}</option>)}
          </select>
        </label>
      </div>

      {def && ship && (
        <>
          <div className="mt-4 flex flex-wrap gap-4">
            <StatReadout label="Slot budget" value={`${check?.slotsUsed ?? 0} / ${budget}`} />
            <StatReadout label="Refit bill" value={quote && quote.refund > 0 ? `+${formatMoney(quote.refund)}` : formatMoney(quote?.cost ?? 0)} />
            <StatReadout label="Time in yard" value={formatCountdown(quote?.seconds ?? 0)} />
            <StatReadout label="Upkeep" value={`${formatMoney(quote?.upkeepPerMonth ?? 0)}/mo`} />
          </div>
          <div
            className="mt-2 h-1.5 rounded bg-[var(--line-2)]"
            role="progressbar"
            aria-valuenow={check?.slotsUsed ?? 0}
            aria-valuemin={0}
            aria-valuemax={budget}
            aria-label={`Slot points used on ${ship.name}`}
          >
            <div className="h-full rounded bg-[var(--ember)]" style={{ width: `${budget > 0 ? Math.min(100, ((check?.slotsUsed ?? 0) / budget) * 100) : 0}%` }} />
          </div>

          {inYardUntil > nowMs && (
            <p className="mt-2 text-[12px] text-[var(--ink-2)]">
              In the yard — ready in {formatCountdown((inYardUntil - nowMs) / 1000)}. It cannot take a mining order until then.
            </p>
          )}
          {!shipAtYard && yards.length > 0 && (
            <p className="mt-2 text-[12px] text-[var(--ink-2)]">
              {ship.name} is at {LOCATION_MAP.get(ship.currentLocation)?.name || ship.currentLocation}, which is not a yard of yours. Fly it to one first.
            </p>
          )}

          {GROUP_ORDER.map(group => {
            const rows = FITTINGS.filter(f => f.group === group);
            if (rows.length === 0) return null;
            return (
              <fieldset key={group} className="mt-4 border-t border-[var(--line-2)] pt-3">
                <legend className={OVERLINE}>{FITTING_GROUP_LABEL[group]} — one only</legend>
                <ul className="mt-2 space-y-2">
                  {rows.map(f => {
                    const legal = validateFit(def, [...picked.filter(x => FITTING_MAP.get(x)?.group !== group), f.id], research);
                    const isFitted = current.includes(f.id);
                    const isPicked = picked.includes(f.id);
                    const price = fittingPrice(f, def);
                    const blocked = !legal.ok && !isPicked;
                    const reasonId = `fit-why-${f.id}`;
                    return (
                      <li key={f.id} className="flex gap-2">
                        <input
                          type="checkbox"
                          id={`fit-${f.id}`}
                          className="mt-1 h-4 w-4 accent-[var(--ember)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
                          checked={isPicked}
                          disabled={blocked || busy}
                          onChange={() => toggle(f.id)}
                          aria-describedby={reasonId}
                        />
                        <label htmlFor={`fit-${f.id}`} className="flex-1 cursor-pointer">
                          <span className="text-[12px] text-[var(--ink)]">
                            <span aria-hidden="true">{f.icon} </span>{f.name}
                            <span className="text-[var(--ink-3)]"> · {f.slotCost} slot{f.slotCost > 1 ? 's' : ''} · {formatMoney(price)}</span>
                            {isFitted && <span className="text-[var(--ink-2)]"> · Fitted</span>}
                          </span>
                          <span id={reasonId} className="block text-[11px] text-[var(--ink-2)]">
                            {describeEffects(f)}
                            <span className="block text-[var(--ink-3)]">{f.tradeoff}</span>
                            {blocked && <span className="block text-[var(--ink-2)]">Unavailable: {legal.error === 'research_missing' ? 'research not complete' : legal.error === 'no_hardpoint' ? 'this hull has no hardpoint of that class' : legal.error === 'role_incompatible' ? 'wrong class of hull' : legal.error === 'slots_exceeded' ? 'not enough slot points left' : 'not legal on this hull'}.</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            );
          })}

          {check && !check.ok && (
            <p className="mt-3 text-[12px] text-[var(--ink-2)]">That fit is not legal on {ship.name}: {check.error?.replace(/_/g, ' ')}.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={busy || !check?.ok || !shipAtYard || yards.length === 0 || inYardUntil > nowMs || (quote?.added.length === 0 && quote?.removed.length === 0)}
              onClick={() => void submit(false)}
            >
              Apply refit
            </button>
            <button
              type="button"
              className={BTN}
              disabled={busy || current.length === 0 || !shipAtYard || inYardUntil > nowMs}
              onClick={() => void submit(true)}
            >
              Strip everything
            </button>
            <button type="button" className={BTN} disabled={busy} onClick={() => setPicked(current)}>
              Reset selection
            </button>
          </div>
        </>
      )}

      <p className="mt-3 text-[12px] text-[var(--ink-2)] min-h-[1.2em]" role="status" aria-live="polite">{note}</p>
    </ConsolePanel>
  );
}
