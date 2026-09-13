'use client';

// ─── Build & Fleet ▸ Mining ─────────────────────────────────────────────────
//
// Interactive asteroid mining Phase A (docs/SPACE_MINING_DESIGN_2026-09-12.md
// §3-4, founder rulings 2026-09-12). Four consoles:
//   1. Prospecting — probes in stock, field picker, the field's rocks with
//      survey state / grade / reserve / risk and a per-rock Survey button.
//   2. Mining fleet — every mining-capable hull, its live order (phase, %,
//      ETA), held ore, and a Return action.
//   3. Mining Order — ship, rock, mode, fill-to, then-action, with the SAME
//      pure quote the server will make (mining-orders.ts planMiningOrder):
//      fuel, transit, extraction time, expected ore value.
// Every action goes through page.tsx (handleMiningOrder / handleSurveyProbe /
// handleBuyProbes — server-first). This file renders; it never mutates.

import { useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  ASTEROID_CLASS_LABEL,
  ASTEROID_FIELDS,
  ASTEROID_FIELD_MAP,
  SURVEY_PROBE_COST,
  UNSURVEYED_YIELD_MULT,
  getAsteroid,
  getFieldsForShipTier,
  getRocksInField,
  oreForRock,
  type AsteroidField,
  type AsteroidRock,
} from '@/lib/game/asteroids';
import {
  MINING_PLAN_ERROR_TEXT,
  canTakeMiningOrder,
  describeMiningOrder,
  isMiningCapable,
  planMiningOrder,
  type MiningOrderRequest,
} from '@/lib/game/mining-orders';
import { SHIP_MAP, type MiningOrderMode, type MiningThenAction } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { getFuelEfficiencyMultiplier, getShipCargoCapacity, isHomeLocation } from '@/lib/game/cargo-logistics';
import { formatCountdown, formatMoney } from '@/lib/game/formulas';
import { ConsolePanel, StatReadout } from './chrome';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import GameIcon from './GameIcon';
import HoloTip from './HoloTip';

const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';
const BTN = 'min-h-[36px] px-3 py-1 rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--elev)] text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)]';
const BTN_PRIMARY = 'min-h-[40px] px-4 py-1.5 rounded-[var(--radius-control)] bg-[var(--ember)] text-[#0A0A0B] text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]';
const FIELD_LABEL = 'block text-[11px] text-[var(--ink-3)] mb-1';
const INPUT = 'w-full min-h-[36px] rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--elev)] px-2 text-[12px] text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)]';

interface MiningPanelProps {
  state: GameState;
  onPlaceOrder: (req: MiningOrderRequest) => void;
  onSurveyProbe: (asteroidId: string) => void;
  onBuyProbes: (count: number) => void;
  onNavigate?: (tab: string) => void;
}

interface RockRow {
  id: string;
  rock: AsteroidRock;
  name: string;
  cls: string;
  deltaV: number;
  survey: string;
  grade: number | string;
  reserve: number | string;
  risk: number | string;
  action: string;
}

function fmtHours(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

const THEN_LABEL: Record<MiningThenAction, string> = {
  return_store: 'Return & store',
  return_sell: 'Return & sell',
  hold: 'Hold at the field',
};

export default function MiningPanel({ state, onPlaceOrder, onSurveyProbe, onBuyProbes, onNavigate }: MiningPanelProps) {
  const intel = state.asteroidIntel || {};
  const probes = state.surveyProbes || 0;
  const miningShips = useMemo(() => (state.ships || []).filter(s => s.isBuilt && isMiningCapable(SHIP_MAP.get(s.definitionId))), [state.ships]);
  const activeOrders = miningShips.filter(s => s.miningOrder).length;
  const surveyedCount = Object.keys(intel).length;

  const [fieldId, setFieldId] = useState<string>(ASTEROID_FIELDS[0].id);
  const [shipId, setShipId] = useState<string>('');
  const [rockId, setRockId] = useState<string>('');
  const [mode, setMode] = useState<MiningOrderMode>('mine');
  const [fillInput, setFillInput] = useState<string>('');
  const [thenAction, setThenAction] = useState<MiningThenAction>('return_store');
  const [returnDest, setReturnDest] = useState<string>('earth_surface');

  const field: AsteroidField = ASTEROID_FIELD_MAP.get(fieldId) || ASTEROID_FIELDS[0];
  const rocks = useMemo(() => getRocksInField(field.id), [field.id]);
  const parentUnlocked = field.frontier || (state.unlockedLocations || []).includes(field.parentLocationId);

  const selectedShip = miningShips.find(s => s.instanceId === shipId) || null;
  const selectedDef = selectedShip ? SHIP_MAP.get(selectedShip.definitionId) : undefined;
  const reachable = selectedDef ? getFieldsForShipTier(selectedDef.tier) : [];
  const selectedRock = rockId ? getAsteroid(rockId) ?? null : null;
  const capacity = selectedShip ? getShipCargoCapacity(state, selectedShip.instanceId) : 0;
  const rockIntel = selectedRock ? intel[selectedRock.id] ?? null : null;
  const fillMax = Math.max(1, Math.min(capacity || 1, rockIntel ? Math.floor(rockIntel.reserve) : Number.MAX_SAFE_INTEGER));
  const fillUnits = fillInput === '' ? fillMax : Math.max(1, Math.min(fillMax, Math.floor(Number(fillInput) || 1)));

  const plan = useMemo(() => {
    if (!selectedShip || !selectedDef) return null;
    return planMiningOrder({
      def: selectedDef, cargoCapacity: capacity, mode, rock: selectedRock, intel: rockIntel,
      fillUnits, thenAction, originId: selectedShip.currentLocation,
      heldOre: selectedShip.heldOre ?? null, hullDamagePct: selectedShip.hullDamagePct,
      fuelEfficiencyMult: getFuelEfficiencyMultiplier(state), nowMs: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShip, selectedDef, capacity, mode, selectedRock, rockIntel, fillUnits, thenAction, state.completedResearch]);

  const canPlace = !!plan?.ok && !!selectedShip && canTakeMiningOrder(selectedShip) && (mode !== 'mine' || parentUnlocked) && (plan.ok ? state.money >= plan.order.fuelCost : false);

  const rockRows: RockRow[] = rocks.map(rock => {
    const known = intel[rock.id];
    return {
      id: rock.id, rock, name: rock.name, cls: rock.class,
      deltaV: rock.deltaVExtra,
      survey: known ? 'surveyed' : 'unknown',
      grade: known ? known.grade : '—',
      reserve: known ? known.reserve : '—',
      risk: known ? Math.round(known.risk * 100) : '—',
      action: '',
    };
  });

  const rockColumns: DataTableColumn<RockRow>[] = [
    { key: 'name', header: 'Rock', sortable: true, render: r => (
      <button type="button" onClick={() => setRockId(r.rock.id)} aria-pressed={rockId === r.rock.id}
        className={`text-left underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)] ${rockId === r.rock.id ? 'text-[var(--ember)] font-semibold' : 'text-[var(--ink)]'}`}>
        {r.name}
      </button>
    ) },
    { key: 'cls', header: 'Class', sortable: true, render: r => (
      <HoloTip content={{ title: ASTEROID_CLASS_LABEL[r.rock.class], icon: 'mining', body: <p>Yields <strong>{RESOURCE_MAP.get(oreForRock(r.rock))?.name}</strong> at {formatMoney(RESOURCE_MAP.get(oreForRock(r.rock))?.baseMarketPrice || 0)}/unit base.</p> }}>
        <span>{r.cls}-type</span>
      </HoloTip>
    ) },
    { key: 'deltaV', header: 'Δv +', align: 'right', numeric: true, sortable: true, render: r => <span>{r.deltaV.toLocaleString()} m/s</span> },
    { key: 'survey', header: 'Survey', sortable: true, render: r => <StatusPip state={(r.survey === 'surveyed' ? 'go' : 'hold') as PipState} label={r.survey === 'surveyed' ? 'Surveyed' : 'Unknown'} /> },
    { key: 'grade', header: 'Grade', align: 'right', numeric: true, sortable: true },
    { key: 'reserve', header: 'Reserve', align: 'right', numeric: true, sortable: true, render: r => <span>{typeof r.reserve === 'number' ? r.reserve.toLocaleString() : r.reserve}</span> },
    { key: 'risk', header: 'Risk', align: 'right', numeric: true, sortable: true, render: r => <span>{typeof r.risk === 'number' ? `${r.risk}%` : r.risk}</span> },
    { key: 'action', header: '', render: r => r.survey === 'surveyed' ? null : (
      <button type="button" className={BTN} disabled={probes < 1} onClick={() => onSurveyProbe(r.rock.id)} aria-label={`Survey ${r.name} with a probe`}>
        Survey (probe)
      </button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <ConsolePanel title="Asteroid Mining" icon="mining" subtitle="Discrete, finite rocks. Survey them, send a hull, bring the ore home — or hold it at the field for a hauler.">
        <div className="grid grid-cols-3 gap-3">
          <div className="holo-card rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <StatReadout label="Survey probes" icon="ship-survey" iconGlow="cyan" value={`${probes}`} size="lg" valueClassName="text-cyan-400" sub={`${formatMoney(SURVEY_PROBE_COST)} each · one rock per probe`} />
          </div>
          <div className="holo-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <StatReadout label="Orders under way" icon="mining" iconGlow="amber" value={`${activeOrders}`} size="lg" valueClassName="text-amber-400" sub={`${miningShips.length} mining-capable hull${miningShips.length === 1 ? '' : 's'}`} />
          </div>
          <div className="holo-card rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <StatReadout label="Rocks surveyed" icon="discoveries" iconGlow="green" value={`${surveyedCount}`} size="lg" valueClassName="text-green-400" sub={`unsurveyed rocks mine at ${Math.round(UNSURVEYED_YIELD_MULT * 100)}%`} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={OVERLINE}>Buy probes</span>
          {[1, 3, 5].map(n => (
            <button key={n} type="button" className={BTN} disabled={state.money < n * SURVEY_PROBE_COST} onClick={() => onBuyProbes(n)}>
              {n} for {formatMoney(n * SURVEY_PROBE_COST)}
            </button>
          ))}
          {miningShips.length === 0 && (
            <button type="button" className={`${BTN} ml-auto`} onClick={() => onNavigate?.('build:fleet')}>
              No mining hulls yet — open Fleet
            </button>
          )}
        </div>
      </ConsolePanel>

      <ConsolePanel title="Prospecting" icon="discoveries" subtitle={`${field.description}`} right={
        <span className="text-[11px] text-[var(--ink-3)]">{LOCATION_MAP.get(field.parentLocationId)?.name || field.parentLocationId}{parentUnlocked ? '' : ' · locked'}</span>
      }>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Asteroid field">
          {ASTEROID_FIELDS.map(f => {
            const unlocked = f.frontier || (state.unlockedLocations || []).includes(f.parentLocationId);
            return (
              <button key={f.id} type="button" aria-pressed={f.id === field.id} onClick={() => { setFieldId(f.id); setRockId(''); }}
                className={`${BTN} ${f.id === field.id ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
                {f.name}{f.frontier ? ' · Frontier' : ''}{unlocked ? '' : ' 🔒'}
              </button>
            );
          })}
        </div>
        <div className="overflow-x-auto">
          <DataTable<RockRow> columns={rockColumns} rows={rockRows} caption={`Rocks in ${field.name}`} initialSort={{ key: 'deltaV', dir: 'asc' }} emptyLabel="No rocks catalogued." />
        </div>
      </ConsolePanel>

      <ConsolePanel title="Mining Fleet" icon="ship-mining" subtitle="Hulls with extraction gear or a survey sensor. Select one to write its order.">
        {miningShips.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-3)]">Build a Prospector Barge (Fleet) — it mines and surveys — or any mining hull.</p>
        ) : (
          <ul className="space-y-2">
            {miningShips.map(s => {
              const def = SHIP_MAP.get(s.definitionId)!;
              const prog = s.miningOrder ? describeMiningOrder(s.miningOrder, Date.now()) : null;
              const rockName = s.miningOrder?.asteroidId ? getAsteroid(s.miningOrder.asteroidId)?.name : null;
              const pip: PipState = s.miningOrder ? 'live' : s.heldOre ? 'hold' : canTakeMiningOrder(s) ? 'go' : 'tminus';
              return (
                <li key={s.instanceId} className={`rounded-lg border p-3 ${shipId === s.instanceId ? 'border-[var(--ember)] bg-[var(--elev)]' : 'border-[var(--line-2)]'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <GameIcon name={def.survey && !def.oreExtractionPerHour ? 'ship-survey' : 'ship-mining'} size={16} />
                    <button type="button" onClick={() => setShipId(s.instanceId)} aria-pressed={shipId === s.instanceId} className="text-[13px] text-[var(--ink)] font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)]">
                      {s.name}
                    </button>
                    <span className="text-[11px] text-[var(--ink-3)]">{def.name} · {LOCATION_MAP.get(s.currentLocation)?.name || s.currentLocation} · hold {getShipCargoCapacity(state, s.instanceId)}{def.oreExtractionPerHour ? ` · ${def.oreExtractionPerHour} ore/h` : ''}{def.survey ? ' · sensor' : ''}</span>
                    <StatusPip state={pip} label={s.miningOrder ? 'On order' : s.heldOre ? 'Holding ore' : canTakeMiningOrder(s) ? 'Ready' : s.status} className="ml-auto" />
                  </div>
                  {prog && s.miningOrder && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-[var(--ink-2)]">
                        <span>{prog.label}{rockName ? ` · ${rockName}` : ''}</span>
                        <span>{formatCountdown(prog.etaSeconds)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-[var(--line-2)]" role="progressbar" aria-valuenow={Math.round(prog.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} order progress`}>
                        <div className="h-1.5 rounded bg-[var(--ember)]" style={{ width: `${prog.pct}%` }} />
                      </div>
                    </div>
                  )}
                  {s.heldOre && !s.miningOrder && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-2)]">
                      <span>Holding {s.heldOre.units.toLocaleString()} {RESOURCE_MAP.get(s.heldOre.oreId as ResourceId)?.name || s.heldOre.oreId}</span>
                      <label className="flex items-center gap-1">
                        <span className="sr-only">Return destination</span>
                        <select className={INPUT} value={returnDest} onChange={e => setReturnDest(e.target.value)} aria-label="Return destination">
                          {(state.unlockedLocations || []).filter(id => isHomeLocation(id) || id !== s.currentLocation).map(id => (
                            <option key={id} value={id}>{LOCATION_MAP.get(id)?.name || id}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className={BTN} onClick={() => onPlaceOrder({ shipInstanceId: s.instanceId, mode: 'return', asteroidId: null, thenAction: 'return_store', destinationId: returnDest })}>Return & store</button>
                      <button type="button" className={BTN} onClick={() => onPlaceOrder({ shipInstanceId: s.instanceId, mode: 'return', asteroidId: null, thenAction: 'return_sell', destinationId: returnDest })}>Return & sell</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ConsolePanel>

      <ConsolePanel title="Mining Order" icon="mining" subtitle="Target, mode, fill, then-action. The quote below is the one the registry will honour." accent="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={FIELD_LABEL}>Ship</span>
            <select className={INPUT} value={shipId} onChange={e => setShipId(e.target.value)}>
              <option value="">Select a hull…</option>
              {miningShips.map(s => <option key={s.instanceId} value={s.instanceId} disabled={!canTakeMiningOrder(s)}>{s.name} — {SHIP_MAP.get(s.definitionId)?.name}{canTakeMiningOrder(s) ? '' : ' (busy)'}</option>)}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Rock ({field.name})</span>
            <select className={INPUT} value={rockId} onChange={e => setRockId(e.target.value)} disabled={!!selectedDef && !reachable.some(f => f.id === field.id)}>
              <option value="">Select a rock…</option>
              {rocks.map(r => <option key={r.id} value={r.id}>{r.name} · {r.class}-type{intel[r.id] ? ` · grade ${intel[r.id].grade}` : ' · unsurveyed'}</option>)}
            </select>
            {selectedDef && !reachable.some(f => f.id === field.id) && <span className="text-[11px] text-[var(--crit)]">{MINING_PLAN_ERROR_TEXT.field_out_of_reach}</span>}
          </label>
          <fieldset>
            <legend className={FIELD_LABEL}>Mode</legend>
            <div className="flex gap-2" role="radiogroup">
              {(['mine', 'survey'] as MiningOrderMode[]).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} disabled={m === 'survey' && !!selectedDef && !selectedDef.survey}
                  className={`${BTN} ${mode === m ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
                  {m === 'mine' ? 'Mine' : 'Survey'}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span className={FIELD_LABEL}>Fill to (units, hold {capacity || '—'}{rockIntel ? `, reserve ${rockIntel.reserve.toLocaleString()}` : ''})</span>
            <input className={INPUT} type="number" inputMode="numeric" min={1} max={fillMax} value={fillInput === '' ? fillMax : fillInput} onChange={e => setFillInput(e.target.value)} disabled={mode !== 'mine' || !selectedShip} />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className={FIELD_LABEL}>Then</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {(Object.keys(THEN_LABEL) as MiningThenAction[]).map(t => (
                <button key={t} type="button" role="radio" aria-checked={thenAction === t} onClick={() => setThenAction(t)} disabled={mode !== 'mine'}
                  className={`${BTN} ${thenAction === t ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
                  {THEN_LABEL[t]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-3 rounded-lg border border-[var(--line-2)] p-3 text-[12px] text-[var(--ink-2)]">
          {!selectedShip ? (
            <p>Select a hull to see a quote.</p>
          ) : !plan ? null : !plan.ok ? (
            <p className="text-[var(--crit)]">{MINING_PLAN_ERROR_TEXT[plan.error]}</p>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><dt className={OVERLINE}>Fuel</dt><dd className="text-[var(--ink)]">{formatMoney(plan.order.fuelCost)}</dd></div>
              <div><dt className={OVERLINE}>Outbound</dt><dd className="text-[var(--ink)]">{fmtHours(plan.transitOutSeconds)} · {plan.deltaVOut.toLocaleString()} m/s</dd></div>
              {plan.order.mode === 'mine' && <div><dt className={OVERLINE}>Extraction</dt><dd className="text-[var(--ink)]">{fmtHours(plan.extractionSeconds)} @ {plan.order.ratePerHour}/h{plan.order.surveyed ? '' : ` (unsurveyed ×${UNSURVEYED_YIELD_MULT})`}</dd></div>}
              {plan.transitBackSeconds > 0 && <div><dt className={OVERLINE}>Return</dt><dd className="text-[var(--ink)]">{fmtHours(plan.transitBackSeconds)}</dd></div>}
              <div><dt className={OVERLINE}>Complete in</dt><dd className="text-[var(--ink)]">{formatCountdown((plan.order.completesAtMs - Date.now()) / 1000)}</dd></div>
              {plan.expectedValue > 0 && <div><dt className={OVERLINE}>Ore value (base)</dt><dd className="text-[var(--ink)]">{formatMoney(plan.expectedValue)} · {plan.order.fillUnits} {RESOURCE_MAP.get(plan.order.oreId as ResourceId)?.name}</dd></div>}
            </dl>
          )}
          {mode === 'mine' && !parentUnlocked && <p className="mt-2 text-[var(--caution)]">{LOCATION_MAP.get(field.parentLocationId)?.name} is not unlocked yet — unlock it on the map first.</p>}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className={BTN_PRIMARY} disabled={!canPlace}
            onClick={() => selectedShip && onPlaceOrder({ shipInstanceId: selectedShip.instanceId, mode, asteroidId: selectedRock?.id ?? null, fillUnits, thenAction })}>
            {mode === 'survey' ? 'Send survey' : 'Place mining order'}
          </button>
        </div>
      </ConsolePanel>
    </div>
  );
}
