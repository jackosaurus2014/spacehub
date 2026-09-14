'use client';

// ─── Build & Fleet ▸ Mining ─────────────────────────────────────────────────
//
// Interactive asteroid mining Phase A (docs/SPACE_MINING_DESIGN_2026-09-12.md
// §3-4, founder rulings 2026-09-12) + Phase B (2026-09-13: claims, shared-rock
// pressure, rock events, escorts). Consoles:
//   1. Prospecting — probes in stock, field picker, the field's rocks with
//      survey state / grade / reserve / risk / claim / live event and a
//      per-rock Survey button.
//   2. Claim — the selected rock's claim state: stake (fee quote, cap),
//      release, expiry countdown; the public claim feed names other holders.
//   3. Mining fleet — every mining-capable hull and every escort, its live
//      order (phase, %, ETA), held ore, and a Return action.
//   4. Mining Order — ship, rock, mode, fill-to, then-action, escort, with
//      the SAME pure quote the server will make (planMiningOrder): fuel,
//      transit, extraction, pressure share, shakedown odds, expected units.
//   5. Refining & Depots (Phase C) — the corporation's propellant depots per
//      field, their slots, stock and restocking (cash or locally refined
//      volatiles), and the public slot register.
//   6. Survey Reports (Phase C) — the corporation's own surveys with their
//      listing state, and the open market of other corporations' reports.
//   7. Refit Yard (Phase D, FittingConsole.tsx) — the server-registered ship
//      fittings that decide what a hull can actually do. Same self-reading
//      console pattern: a fit is a ShipFitting row, not client condition.
// Mining ORDERS (including 'refine') go through page.tsx (server-first).
// The Phase C consoles below own their own reads and writes against
// /api/space-tycoon/assets/mining — the same best-effort pattern the public
// claim feed already uses — because a depot slot, a tank level and a report
// listing are server state with no client-side mirror to keep in step: the
// panel shows what the server says and re-reads after every write.

import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  ASTEROID_CLASS_LABEL,
  ASTEROID_FIELDS,
  ASTEROID_FIELD_MAP,
  CLAIM_EXPIRY_GAME_MONTHS,
  SURVEY_PROBE_COST,
  UNSURVEYED_YIELD_MULT,
  getAsteroid,
  getFieldsForShipTier,
  getRocksInField,
  oreForRock,
  rockEventMults,
  type AsteroidField,
  type AsteroidRock,
} from '@/lib/game/asteroids';
import {
  MINING_PLAN_ERROR_TEXT,
  canEscort,
  canTakeMiningOrder,
  describeMiningOrder,
  escortCandidates,
  hasStationedEscort,
  isMiningCapable,
  planMiningOrder,
  type MiningOrderRequest,
} from '@/lib/game/mining-orders';
import {
  STAKE_CLAIM_ERROR_TEXT,
  checkStakeClaim,
  claimCapForTier,
  isClaimExpiringSoon,
  type PublicClaimView,
} from '@/lib/game/asteroid-claims';
import { ESCORT_ASSIGNED_ODDS_MULT, ESCORT_STATIONED_ODDS_MULT, SHAKEDOWN_TAKE_SHARE } from '@/lib/game/npc-shakedown';
// Mining Phase C (2026-09-13): refining, depots, sellable survey reports.
import { MOBILE_REFINERY_RECOVERY, REFINE_MAX_BATCH_HOURS, getRefineryRecipe, refineOutputs, refinedUnitTotal } from '@/lib/game/ore-refining';
import {
  DEPOT_COVER_SHARE,
  DEPOT_FEEDSTOCK_YIELD,
  DEPOT_FUEL_VALUE_PER_UNIT,
  depotRestockPricePerUnit,
  depotSlotsForFieldId,
  type DepotRecord,
  type PublicDepotView,
} from '@/lib/game/propellant-depots';
import {
  REPORT_BROKER_FEE,
  reportPriceBounds,
  reportSellerProceeds,
  type OwnedSurveyReport,
  type SurveyReportListing,
} from '@/lib/game/survey-reports';
import { checkCorporationTier } from '@/lib/game/corporation-tiers';
import { isInFrontier } from '@/lib/game/frontier';
import { SHIP_MAP, type MiningOrderMode, type MiningThenAction } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { getFuelEfficiencyMultiplier, getShipCargoCapacity, isHomeLocation } from '@/lib/game/cargo-logistics';
// Mining Phase D (2026-09-14): the server-registered fit the quote must use.
import {
  NEUTRAL_FITTING_PROFILE, activeFittingProfile, effectiveShipDefinition, readFittingRecord,
} from '@/lib/game/ship-fittings';
import { hqMiningLogisticsForState } from '@/lib/game/headquarters';
import { formatCountdown, formatMoney } from '@/lib/game/formulas';
import { ConsolePanel, StatReadout } from './chrome';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import GameIcon from './GameIcon';
import HoloTip from './HoloTip';
// Mining Phase D (2026-09-14): the Refit Yard.
import FittingConsole from './FittingConsole';

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
  /** Phase B: claims (server-first in page.tsx). */
  onStakeClaim?: (asteroidId: string) => void;
  onReleaseClaim?: (asteroidId: string) => void;
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
  claim: string;
  event: string;
  action: string;
}

interface ClaimFeed {
  claims: PublicClaimView[];
  activity: Record<string, number>;
}

/** Phase C server view (GET /api/space-tycoon/assets/mining). */
interface PhaseCView {
  depots: DepotRecord[];
  publicDepots: PublicDepotView[];
  reports: OwnedSurveyReport[];
  reportMarket: SurveyReportListing[];
}

const EMPTY_PHASE_C: PhaseCView = { depots: [], publicDepots: [], reports: [], reportMarket: [] };

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

export default function MiningPanel({ state, onPlaceOrder, onSurveyProbe, onBuyProbes, onStakeClaim, onReleaseClaim, onNavigate }: MiningPanelProps) {
  const intel = state.asteroidIntel || {};
  const probes = state.surveyProbes || 0;
  const myClaims = state.asteroidClaims || {};
  const standOff = state.miningStandOff || {};
  const nowMs = Date.now();
  const miningShips = useMemo(() => (state.ships || []).filter(s => s.isBuilt && isMiningCapable(SHIP_MAP.get(s.definitionId))), [state.ships]);
  const escortShips = useMemo(() => (state.ships || []).filter(s => s.isBuilt && !!SHIP_MAP.get(s.definitionId)?.security), [state.ships]);
  const activeOrders = miningShips.filter(s => s.miningOrder).length;
  const surveyedCount = Object.keys(intel).length;
  const tier = checkCorporationTier(state);
  const claimCap = claimCapForTier(tier);
  const frontier = isInFrontier(state, nowMs);

  const [fieldId, setFieldId] = useState<string>(ASTEROID_FIELDS[0].id);
  const [shipId, setShipId] = useState<string>('');
  const [rockId, setRockId] = useState<string>('');
  const [mode, setMode] = useState<MiningOrderMode>('mine');
  const [fillInput, setFillInput] = useState<string>('');
  const [thenAction, setThenAction] = useState<MiningThenAction>('return_store');
  const [returnDest, setReturnDest] = useState<string>('earth_surface');
  const [escortId, setEscortId] = useState<string>('');
  const [feed, setFeed] = useState<ClaimFeed>({ claims: [], activity: {} });
  // Phase C server view + the one-line result of the last console action.
  const [phaseC, setPhaseC] = useState<PhaseCView>(EMPTY_PHASE_C);
  const [phaseCBusy, setPhaseCBusy] = useState(false);
  const [phaseCNote, setPhaseCNote] = useState<string>('');
  const [depotFieldId, setDepotFieldId] = useState<string>(ASTEROID_FIELDS[0].id);
  const [depotShipId, setDepotShipId] = useState<string>('');
  const [restockUnits, setRestockUnits] = useState<string>('500');
  const [feedstockSlug, setFeedstockSlug] = useState<string>('lunar_water');
  const [reportPrices, setReportPrices] = useState<Record<string, string>>({});

  // The public claim feed (best-effort; a local-only game has no server to ask).
  useEffect(() => {
    if (!state.lastSyncAt) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/space-tycoon/claims', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then((data: ClaimFeed | null) => {
          if (cancelled || !data || !Array.isArray(data.claims)) return;
          setFeed({ claims: data.claims, activity: data.activity && typeof data.activity === 'object' ? data.activity : {} });
        })
        .catch(() => { /* feed is a convenience; the server refuses claimed rocks regardless */ });
    };
    load();
    const t = setInterval(load, 90_000);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state.lastSyncAt, Object.keys(myClaims).length]);

  // The Phase C view: depots, reports and the report market. Re-read after
  // every write so the console always shows server truth, never a guess.
  const refreshPhaseC = useMemo(() => async () => {
    try {
      const res = await fetch('/api/space-tycoon/assets/mining', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as Partial<PhaseCView>;
      setPhaseC({
        depots: Array.isArray(data.depots) ? data.depots : [],
        publicDepots: Array.isArray(data.publicDepots) ? data.publicDepots : [],
        reports: Array.isArray(data.reports) ? data.reports : [],
        reportMarket: Array.isArray(data.reportMarket) ? data.reportMarket : [],
      });
    } catch { /* the consoles degrade to empty; the server still refuses bad ops */ }
  }, []);

  useEffect(() => {
    if (!state.lastSyncAt) return;
    void refreshPhaseC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state.lastSyncAt]);

  const phaseCOp = async (body: Record<string, unknown>, what: string) => {
    setPhaseCBusy(true);
    setPhaseCNote('');
    try {
      const res = await fetch('/api/space-tycoon/assets/mining', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setPhaseCNote(res.ok ? `${what} — done.` : (data?.error || `${what} — refused.`));
      await refreshPhaseC();
    } catch {
      setPhaseCNote(`${what} — the registry did not answer.`);
    } finally {
      setPhaseCBusy(false);
    }
  };

  const field: AsteroidField = ASTEROID_FIELD_MAP.get(fieldId) || ASTEROID_FIELDS[0];
  const rocks = useMemo(() => getRocksInField(field.id), [field.id]);
  const parentUnlocked = field.frontier || (state.unlockedLocations || []).includes(field.parentLocationId);
  const feedByRock = useMemo(() => new Map(feed.claims.map(c => [c.asteroidId, c])), [feed.claims]);

  const selectedShip = miningShips.find(s => s.instanceId === shipId) || null;
  const selectedDef = selectedShip ? SHIP_MAP.get(selectedShip.definitionId) : undefined;
  const reachable = selectedDef ? getFieldsForShipTier(selectedDef.tier) : [];
  const selectedRock = rockId ? getAsteroid(rockId) ?? null : null;
  // Phase D: the hold the QUOTE assumes is the bare hull's, scaled by the
  // hull's SERVER-REGISTERED fit — never getShipCargoCapacity, which folds in
  // client-owned modules.ts bays the mining registry has never honoured.
  const selectedFit = selectedShip
    ? activeFittingProfile(readFittingRecord(state.shipFittings, selectedShip.instanceId), nowMs, { rockClass: selectedRock?.class ?? null })
    : NEUTRAL_FITTING_PROFILE;
  const capacity = selectedShip && selectedDef ? Math.floor(selectedDef.cargoCapacity * selectedFit.cargoMult) : 0;
  const rockIntel = selectedRock ? intel[selectedRock.id] ?? null : null;
  const fillMax = Math.max(1, Math.min(capacity || 1, rockIntel ? Math.floor(rockIntel.reserve) : Number.MAX_SAFE_INTEGER));
  const fillUnits = fillInput === '' ? fillMax : Math.max(1, Math.min(fillMax, Math.floor(Number(fillInput) || 1)));

  // Phase B inputs for the quote: my claim, another holder, activity, escort.
  const rockClaimMine = !!(selectedRock && myClaims[selectedRock.id]);
  const rockFeedClaim = selectedRock ? feedByRock.get(selectedRock.id) : undefined;
  const rockClaimedByOther = !!rockFeedClaim && !rockClaimMine;
  const myPendingOnRock = !!selectedRock && miningShips.some(s => s.miningOrder?.mode === 'mine' && s.miningOrder.asteroidId === selectedRock.id);
  const othersOnRock = selectedRock ? Math.max(0, (feed.activity[selectedRock.id] ?? 0) - (myPendingOnRock ? 1 : 0)) : 0;
  const sharedMiners = 1 + othersOnRock;
  const parentForEscort = selectedShip ? (selectedRock ? field.parentLocationId : (selectedShip.heldOre ? ASTEROID_FIELD_MAP.get(selectedShip.heldOre.fieldId)?.parentLocationId || selectedShip.currentLocation : selectedShip.currentLocation)) : '';
  const escorts = selectedShip ? escortCandidates(state, selectedShip.currentLocation, parentForEscort) : [];
  const escortValid = !!escortId && escorts.some(e => e.instanceId === escortId);
  const stationed = !!selectedShip && !escortValid && hasStationedEscort(state, parentForEscort);
  const escortCover = escortValid ? 'assigned' : stationed ? 'stationed' : 'none';

  const myDepotAtField = phaseC.depots.find(d => d.fieldId === field.id) || null;
  const plan = useMemo(() => {
    if (!selectedShip || !selectedDef) return null;
    return planMiningOrder({
      // Phase D: the BARE hull plus the registered fit — the planner scales
      // the hold and the plant itself, exactly as the server does.
      def: selectedDef, cargoCapacity: selectedDef.cargoCapacity, fitting: selectedFit,
      mode, rock: selectedRock, intel: rockIntel,
      depotStockUnits: myDepotAtField?.stockUnits ?? 0,
      fillUnits, thenAction, originId: selectedShip.currentLocation,
      heldOre: selectedShip.heldOre ?? null, hullDamagePct: selectedShip.hullDamagePct,
      fuelEfficiencyMult: getFuelEfficiencyMultiplier(state),
      hqLogistics: hqMiningLogisticsForState(state), // CC-2: Lunar HQ logistics terms
      claimed: rockClaimMine, claimedByOther: rockClaimedByOther, sharedMiners,
      standOffUntilMs: selectedRock ? standOff[selectedRock.id] : undefined,
      escortCover, escortInstanceId: escortValid ? escortId : null, frontier,
      nowMs: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShip, selectedDef, capacity, selectedFit, mode, selectedRock, rockIntel, fillUnits, thenAction, state.completedResearch, state.headquarters?.stage, rockClaimMine, rockClaimedByOther, sharedMiners, escortCover, escortId, frontier, myDepotAtField?.stockUnits]);

  const canPlace = !!plan?.ok && !!selectedShip && canTakeMiningOrder(selectedShip) && (mode !== 'mine' || parentUnlocked) && (plan.ok ? state.money >= plan.order.fuelCost : false);

  // Claim console for the selected rock.
  const claimCheck = selectedRock ? checkStakeClaim({
    rock: selectedRock, intel: rockIntel, claimedByOther: rockClaimedByOther, mine: rockClaimMine,
    tier, myClaimCount: Object.keys(myClaims).length, money: state.money,
  }) : null;
  const myClaimOnRock = selectedRock ? myClaims[selectedRock.id] : undefined;

  const rockRows: RockRow[] = rocks.map(rock => {
    const known = intel[rock.id];
    const mine = myClaims[rock.id];
    const other = feedByRock.get(rock.id);
    const ev = rockEventMults(known, nowMs);
    const exhausted = !!known && (known.exhausted || known.reserve <= 0);
    return {
      id: rock.id, rock, name: rock.name, cls: rock.class,
      deltaV: rock.deltaVExtra,
      survey: exhausted ? 'exhausted' : known ? 'surveyed' : 'unknown',
      grade: known ? known.grade : '—',
      reserve: known ? known.reserve : '—',
      risk: known ? Math.round(known.risk * 100) : '—',
      claim: mine ? 'yours' : other ? other.holderName : (feed.activity[rock.id] ? `open · ${feed.activity[rock.id]} mining` : 'open'),
      event: ev.rubble ? 'rubble' : ev.spinUp ? 'spin-up' : (standOff[rock.id] && standOff[rock.id] > nowMs ? 'stand-off' : ''),
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
    { key: 'survey', header: 'Survey', sortable: true, render: r => <StatusPip state={(r.survey === 'surveyed' ? 'go' : r.survey === 'exhausted' ? 'scrub' : 'hold') as PipState} label={r.survey === 'surveyed' ? 'Surveyed' : r.survey === 'exhausted' ? 'Exhausted' : 'Unknown'} /> },
    { key: 'grade', header: 'Grade', align: 'right', numeric: true, sortable: true },
    { key: 'reserve', header: 'Reserve', align: 'right', numeric: true, sortable: true, render: r => <span>{typeof r.reserve === 'number' ? r.reserve.toLocaleString() : r.reserve}</span> },
    { key: 'risk', header: 'Risk', align: 'right', numeric: true, sortable: true, render: r => <span>{typeof r.risk === 'number' ? `${r.risk}%` : r.risk}</span> },
    { key: 'claim', header: 'Claim', sortable: true, render: r => r.claim === 'yours'
      ? <StatusPip state="go" label={`Yours · ${formatCountdown(Math.max(0, ((myClaims[r.rock.id]?.expiresAtMs ?? nowMs) - nowMs) / 1000))}`} />
      : r.claim.startsWith('open') ? <span className="text-[var(--ink-3)]">{r.claim}</span> : <StatusPip state="tminus" label={r.claim} /> },
    { key: 'event', header: 'Event', sortable: true, render: r => r.event ? <StatusPip state={r.event === 'rubble' ? 'hold' : r.event === 'spin-up' ? 'tminus' : 'scrub'} label={r.event === 'rubble' ? 'Rubble ×1.25 · hull wear' : r.event === 'spin-up' ? 'Spin-up ×0.6' : 'Standing off'} /> : null },
    { key: 'action', header: '', render: r => r.survey !== 'unknown' ? null : (
      <button type="button" className={BTN} disabled={probes < 1} onClick={() => onSurveyProbe(r.rock.id)} aria-label={`Survey ${r.name} with a probe`}>
        Survey (probe)
      </button>
    ) },
  ];

  const oddsPct = (o: number) => `${Math.round(o * 1000) / 10}%`;

  return (
    <div className="space-y-4">
      <ConsolePanel title="Asteroid Mining" icon="mining" subtitle="Discrete, finite rocks. Survey them, claim the good ones, send a hull, bring the ore home — escorted where the Corsairs work.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="holo-card rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <StatReadout label="Survey probes" icon="ship-survey" iconGlow="cyan" value={`${probes}`} size="lg" valueClassName="text-cyan-400" sub={`${formatMoney(SURVEY_PROBE_COST)} each · one rock per probe`} />
          </div>
          <div className="holo-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <StatReadout label="Orders under way" icon="mining" iconGlow="amber" value={`${activeOrders}`} size="lg" valueClassName="text-amber-400" sub={`${miningShips.length} mining-capable hull${miningShips.length === 1 ? '' : 's'} · ${escortShips.length} escort${escortShips.length === 1 ? '' : 's'}`} />
          </div>
          <div className="holo-card rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <StatReadout label="Rocks surveyed" icon="discoveries" iconGlow="green" value={`${surveyedCount}`} size="lg" valueClassName="text-green-400" sub={`unsurveyed rocks mine at ${Math.round(UNSURVEYED_YIELD_MULT * 100)}%`} />
          </div>
          <div className="holo-card rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
            <StatReadout label="Claims held" icon="contracts" iconGlow="purple" value={`${Object.keys(myClaims).length}/${claimCap}`} size="lg" valueClassName="text-purple-300" sub={`tier ${tier} cap · lapse after ${CLAIM_EXPIRY_GAME_MONTHS} game-months unworked`} />
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
          {ASTEROID_FIELDS.map(f => (
            <button key={f.id} type="button" aria-pressed={f.id === field.id} onClick={() => { setFieldId(f.id); setRockId(''); }}
              className={`${BTN} ${f.id === field.id ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
              {f.name}{f.frontier ? ' · Frontier' : ''}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <DataTable<RockRow> columns={rockColumns} rows={rockRows} caption={`Rocks in ${field.name}`} initialSort={{ key: 'deltaV', dir: 'asc' }} emptyLabel="No rocks catalogued." />
        </div>
      </ConsolePanel>

      <ConsolePanel title="Claim" icon="contracts" subtitle="Exclusive extraction rights on a surveyed rock. Others can still survey it; nobody else can mine it. Lost only by lapse, unpaid upkeep, exhaustion, or release — never by another corporation." accent="cyan">
        {!selectedRock ? (
          <p className="text-[12px] text-[var(--ink-3)]">Select a rock in the table to see its claim.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--ink-2)]">
            <span className="text-[13px] text-[var(--ink)] font-semibold">{selectedRock.name}</span>
            {myClaimOnRock ? (
              <>
                <StatusPip state={isClaimExpiringSoon(myClaimOnRock, nowMs) ? 'hold' : 'go'} label={`Yours · lapses in ${formatCountdown(Math.max(0, (myClaimOnRock.expiresAtMs - nowMs) / 1000))}`} />
                <span>Upkeep {formatMoney(myClaimOnRock.upkeepPerMonth)}/month · staked for {formatMoney(myClaimOnRock.fee)}</span>
                <button type="button" className={`${BTN} ml-auto`} onClick={() => onReleaseClaim?.(selectedRock.id)}>Release claim (no refund)</button>
              </>
            ) : rockFeedClaim ? (
              <>
                <StatusPip state="tminus" label={`Claimed by ${rockFeedClaim.holderName}`} />
                <span>Lapses {formatCountdown(Math.max(0, (rockFeedClaim.expiresAtMs - nowMs) / 1000))} unless worked · staked {new Date(rockFeedClaim.stakedAtMs).toLocaleDateString()}</span>
              </>
            ) : (
              <>
                <StatusPip state="hold" label="Open" />
                {claimCheck?.ok ? (
                  <>
                    <span>Stake fee {formatMoney(claimCheck.fee)} · upkeep {formatMoney(claimCheck.upkeepPerMonth)}/month · {Object.keys(myClaims).length}/{claimCheck.cap} claims used</span>
                    <button type="button" className={`${BTN_PRIMARY} ml-auto`} onClick={() => onStakeClaim?.(selectedRock.id)}>Stake claim</button>
                  </>
                ) : claimCheck ? (
                  <span className="text-[var(--caution)]">{STAKE_CLAIM_ERROR_TEXT[claimCheck.error]}</span>
                ) : null}
              </>
            )}
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel title="Mining Fleet" icon="ship-mining" subtitle="Hulls with extraction gear or a survey sensor, and your escorts. Select one to write its order.">
        {miningShips.length === 0 && escortShips.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-3)]">Build a Prospector Barge (Fleet) — it mines and surveys — or any mining hull.</p>
        ) : (
          <ul className="space-y-2">
            {miningShips.map(s => {
              const def = SHIP_MAP.get(s.definitionId)!;
              const prog = s.miningOrder ? describeMiningOrder(s.miningOrder, Date.now()) : null;
              const rockName = s.miningOrder?.asteroidId ? getAsteroid(s.miningOrder.asteroidId)?.name : null;
              const pip: PipState = s.miningOrder ? 'live' : s.heldOre ? 'hold' : canTakeMiningOrder(s) ? 'go' : 'tminus';
              const escortName = s.miningOrder?.escortInstanceId ? (state.ships || []).find(e => e.instanceId === s.miningOrder!.escortInstanceId)?.name : null;
              return (
                <li key={s.instanceId} className={`rounded-lg border p-3 ${shipId === s.instanceId ? 'border-[var(--ember)] bg-[var(--elev)]' : 'border-[var(--line-2)]'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <GameIcon name={def.survey && !def.oreExtractionPerHour ? 'ship-survey' : 'ship-mining'} size={16} />
                    <button type="button" onClick={() => setShipId(s.instanceId)} aria-pressed={shipId === s.instanceId} className="text-[13px] text-[var(--ink)] font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)]">
                      {s.name}
                    </button>
                    {(() => {
                      // Phase D: the row shows the hull AS FITTED — the same
                      // effective definition the quote and the server use.
                      const rowFit = activeFittingProfile(readFittingRecord(state.shipFittings, s.instanceId), nowMs);
                      const eff = effectiveShipDefinition(def, rowFit);
                      const fitCount = rowFit.ids.length;
                      return (
                        <span className="text-[11px] text-[var(--ink-3)]">{def.name} · {LOCATION_MAP.get(s.currentLocation)?.name || s.currentLocation} · hold {eff.cargoCapacity}{eff.oreExtractionPerHour ? ` · ${eff.oreExtractionPerHour} ore/h` : ''}{eff.survey ? ` · sensor${(eff.surveySweep ?? 1) > 1 ? ` ×${eff.surveySweep}` : ''}` : ''}{fitCount > 0 ? ` · ${fitCount} fitted` : ''}{s.hullDamagePct ? ` · hull −${Math.round(s.hullDamagePct * 100)}%` : ''}</span>
                      );
                    })()}
                    <StatusPip state={pip} label={s.miningOrder ? 'On order' : s.heldOre ? 'Holding ore' : canTakeMiningOrder(s) ? 'Ready' : s.status} className="ml-auto" />
                  </div>
                  {prog && s.miningOrder && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-[var(--ink-2)]">
                        <span>{prog.label}{rockName ? ` · ${rockName}` : ''}{escortName ? ` · escorted by ${escortName}` : ''}{typeof s.miningOrder.pressureShare === 'number' && s.miningOrder.pressureShare < 1 ? ` · shared rock ${Math.round(s.miningOrder.pressureShare * 100)}%` : ''}</span>
                        <span>{formatCountdown(prog.etaSeconds)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-[var(--line-2)]" role="progressbar" aria-valuenow={Math.round(prog.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} order progress`}>
                        <div className="h-1.5 rounded bg-[var(--ember)]" style={{ width: `${prog.pct}%` }} />
                      </div>
                    </div>
                  )}
                  {s.heldOre && !s.miningOrder && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-2)]">
                      <span>{s.heldOre.refined
                        ? `Holding refined product: ${Object.entries(refineOutputs(s.heldOre.oreId, s.heldOre.units, MOBILE_REFINERY_RECOVERY)).map(([slug, qty]) => `${qty.toLocaleString()} ${RESOURCE_MAP.get(slug as ResourceId)?.name || slug}`).join(', ')}`
                        : `Holding ${s.heldOre.units.toLocaleString()} ${RESOURCE_MAP.get(s.heldOre.oreId as ResourceId)?.name || s.heldOre.oreId}`}</span>
                      <label className="flex items-center gap-1">
                        <span className="sr-only">Return destination</span>
                        <select className={INPUT} value={returnDest} onChange={e => setReturnDest(e.target.value)} aria-label="Return destination">
                          {(state.unlockedLocations || []).filter(id => isHomeLocation(id) || id !== s.currentLocation).map(id => (
                            <option key={id} value={id}>{LOCATION_MAP.get(id)?.name || id}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className={BTN} onClick={() => onPlaceOrder({ shipInstanceId: s.instanceId, mode: 'return', asteroidId: null, thenAction: 'return_store', destinationId: returnDest, escortInstanceId: shipId === s.instanceId && escortValid ? escortId : null })}>Return & store</button>
                      <button type="button" className={BTN} onClick={() => onPlaceOrder({ shipInstanceId: s.instanceId, mode: 'return', asteroidId: null, thenAction: 'return_sell', destinationId: returnDest, escortInstanceId: shipId === s.instanceId && escortValid ? escortId : null })}>Return & sell</button>
                      {!!def.refineOrePerHour && !s.heldOre.refined && (
                        <button type="button" className={BTN} onClick={() => onPlaceOrder({ shipInstanceId: s.instanceId, mode: 'refine', asteroidId: null, thenAction: 'hold' })}
                          title={`Run the hold through the plant at the field: ${def.refineOrePerHour} ore/h, ${Math.round(MOBILE_REFINERY_RECOVERY * 100)}% recovery, max ${REFINE_MAX_BATCH_HOURS}h a batch.`}>
                          Refine here
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {escortShips.map(s => {
              const def = SHIP_MAP.get(s.definitionId)!;
              const escorting = s.escortingOrderId ? (state.ships || []).find(m => m.miningOrder?.id === s.escortingOrderId) : null;
              return (
                <li key={s.instanceId} className="rounded-lg border border-[var(--line-2)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <GameIcon name="ship-survey" size={16} />
                    <span className="text-[13px] text-[var(--ink)] font-semibold">{s.name}</span>
                    <span className="text-[11px] text-[var(--ink-3)]">{def.name} · {LOCATION_MAP.get(s.currentLocation)?.name || s.currentLocation} · security · odds ×{ESCORT_ASSIGNED_ODDS_MULT} assigned, ×{ESCORT_STATIONED_ODDS_MULT} stationed</span>
                    <StatusPip state={escorting ? 'live' : canEscort(s) ? 'go' : 'tminus'} label={escorting ? `Escorting ${escorting.name}` : canEscort(s) ? 'On station' : s.status} className="ml-auto" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ConsolePanel>

      <ConsolePanel title="Mining Order" icon="mining" subtitle="Target, mode, fill, then-action, escort. The quote below is the one the registry will honour." accent="amber">
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
              {rocks.map(r => <option key={r.id} value={r.id}>{r.name} · {r.class}-type{intel[r.id] ? ` · grade ${intel[r.id].grade}` : ' · unsurveyed'}{myClaims[r.id] ? ' · your claim' : feedByRock.has(r.id) ? ` · claimed by ${feedByRock.get(r.id)!.holderName}` : ''}</option>)}
            </select>
            {selectedDef && !reachable.some(f => f.id === field.id) && <span className="text-[11px] text-[var(--crit)]">{MINING_PLAN_ERROR_TEXT.field_out_of_reach}</span>}
          </label>
          <fieldset>
            <legend className={FIELD_LABEL}>Mode</legend>
            <div className="flex gap-2" role="radiogroup">
              {(['mine', 'refine', 'survey'] as MiningOrderMode[]).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  disabled={(m === 'survey' && !!selectedDef && !selectedDef.survey) || (m === 'refine' && !!selectedDef && !selectedDef.refineOrePerHour)}
                  className={`${BTN} ${mode === m ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
                  {m === 'mine' ? 'Mine' : m === 'refine' ? 'Mine & refine' : 'Survey'}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span className={FIELD_LABEL}>Fill to (units, hold {capacity || '—'}{rockIntel ? `, reserve ${rockIntel.reserve.toLocaleString()}` : ''})</span>
            <input className={INPUT} type="number" inputMode="numeric" min={1} max={fillMax} value={fillInput === '' ? fillMax : fillInput} onChange={e => setFillInput(e.target.value)} disabled={(mode !== 'mine' && mode !== 'refine') || !selectedShip} />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className={FIELD_LABEL}>Then</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {(Object.keys(THEN_LABEL) as MiningThenAction[]).map(t => (
                <button key={t} type="button" role="radio" aria-checked={thenAction === t} onClick={() => setThenAction(t)} disabled={mode !== 'mine' && mode !== 'refine'}
                  className={`${BTN} ${thenAction === t ? 'border-[var(--ember)] text-[var(--ink)]' : ''}`}>
                  {THEN_LABEL[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="sm:col-span-2">
            <span className={FIELD_LABEL}>Escort (security hull idle at the departure point or the field){stationed ? ' · a cutter is stationed at the field (odds ×0.5)' : ''}{frontier ? ' · Protected Frontier: no shakedowns' : ''}</span>
            <select className={INPUT} value={escortValid ? escortId : ''} onChange={e => setEscortId(e.target.value)} disabled={!selectedShip || (mode !== 'mine' && mode !== 'refine') || thenAction === 'hold' || escorts.length === 0}>
              <option value="">{escorts.length === 0 ? 'No escort available here' : 'No escort'}</option>
              {escorts.map(e => <option key={e.instanceId} value={e.instanceId}>{e.name} — {SHIP_MAP.get(e.definitionId)?.name} at {LOCATION_MAP.get(e.currentLocation)?.name || e.currentLocation} (odds ×{ESCORT_ASSIGNED_ODDS_MULT})</option>)}
            </select>
          </label>
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
              {(plan.order.mode === 'mine' || plan.order.mode === 'refine') && <div><dt className={OVERLINE}>Extraction</dt><dd className="text-[var(--ink)]">{fmtHours(plan.extractionSeconds)} @ {plan.order.ratePerHour}/h{plan.order.surveyed ? '' : ` (unsurveyed ×${UNSURVEYED_YIELD_MULT})`}{plan.rockEvents.rubble ? ' · rubble ×1.25' : ''}{plan.rockEvents.spinUp ? ' · spin-up ×0.6' : ''}</dd></div>}
              {plan.transitBackSeconds > 0 && <div><dt className={OVERLINE}>Return</dt><dd className="text-[var(--ink)]">{fmtHours(plan.transitBackSeconds)}</dd></div>}
              <div><dt className={OVERLINE}>Complete in</dt><dd className="text-[var(--ink)]">{formatCountdown((plan.order.completesAtMs - Date.now()) / 1000)}</dd></div>
              {plan.refiningSeconds > 0 && <div><dt className={OVERLINE}>Refining</dt><dd className="text-[var(--ink)]">{fmtHours(plan.refiningSeconds)} @ {selectedDef ? effectiveShipDefinition(selectedDef, selectedFit).refineOrePerHour : 0}/h · recovery {Math.round(selectedFit.refineRecovery * 100)}% · opex {formatMoney(plan.refineOpex)}</dd></div>}
              {plan.depotCovered > 0 && <div><dt className={OVERLINE}>Depot</dt><dd className="text-[var(--ink)]">−{formatMoney(plan.depotCovered)} fuel · {plan.depotUnitsDrawn.toFixed(1)} units drawn</dd></div>}
              {(plan.order.mode === 'mine' || plan.order.mode === 'refine') && <div><dt className={OVERLINE}>Rock share</dt><dd className="text-[var(--ink)]">{plan.order.claimed ? 'Exclusive (your claim)' : sharedMiners > 1 ? `${Math.round(plan.pressureShare * 100)}% · ${sharedMiners} corporations on it` : 'Open · you alone'}</dd></div>}
              {plan.order.mode !== 'survey' && plan.order.thenAction !== 'hold' && <div><dt className={OVERLINE}>Shakedown odds</dt><dd className="text-[var(--ink)]">{plan.shakedownOdds > 0 ? `${oddsPct(plan.shakedownOdds)} · −${Math.round(SHAKEDOWN_TAKE_SHARE * 100)}% of the hold on a hit` : 'None on this lane'}{escortCover === 'assigned' ? ' · escorted' : escortCover === 'stationed' ? ' · field patrolled' : ''}</dd></div>}
              {plan.order.mode !== 'survey' && <div className="col-span-2"><dt className={OVERLINE}>Expected to land</dt><dd className="text-[var(--ink)]">{plan.order.refined
                ? `${Object.entries(plan.outputs).map(([slug, qty]) => `${qty.toLocaleString()} ${RESOURCE_MAP.get(slug as ResourceId)?.name || slug}`).join(', ') || 'nothing'} from ${plan.order.fillUnits.toLocaleString()} ${RESOURCE_MAP.get(plan.order.oreId as ResourceId)?.name} · ${formatMoney(plan.expectedValue)} base`
                : `${plan.expectedUnits.toLocaleString()} of ${plan.order.fillUnits} ${RESOURCE_MAP.get(plan.order.oreId as ResourceId)?.name} · ${formatMoney(plan.expectedValue)} base`}</dd></div>}
            </dl>
          )}
          {mode === 'mine' && !parentUnlocked && <p className="mt-2 text-[var(--caution)]">{LOCATION_MAP.get(field.parentLocationId)?.name} is not unlocked yet — unlock it on the map first.</p>}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className={BTN_PRIMARY} disabled={!canPlace}
            onClick={() => selectedShip && onPlaceOrder({ shipInstanceId: selectedShip.instanceId, mode, asteroidId: selectedRock?.id ?? null, fillUnits, thenAction, escortInstanceId: mode === 'mine' && thenAction !== 'hold' && escortValid ? escortId : null })}>
            {mode === 'survey' ? 'Send survey' : mode === 'refine' ? 'Place refining order' : 'Place mining order'}
          </button>
        </div>
      </ConsolePanel>

      {/* ── Phase C: refining reference + propellant depots ─────────────── */}
      <ConsolePanel title="Refining &amp; Depots" icon="mining" accent="amber"
        subtitle={`A Refinery Barge processes ore at the field, so the hold carries the concentrate instead of the rock — ${Math.round(MOBILE_REFINERY_RECOVERY * 100)}% recovery, ${REFINE_MAX_BATCH_HOURS}h a batch. A depot pays ${Math.round(DEPOT_COVER_SHARE * 100)}% of the propellant bill of every run out of its field.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] text-[var(--ink-2)]">
            <caption className="sr-only">Refinery recipes by ore class</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className={OVERLINE}>Ore</th>
                <th scope="col" className={OVERLINE}>Process</th>
                <th scope="col" className={OVERLINE}>Per 100 units of ore (at {Math.round(MOBILE_REFINERY_RECOVERY * 100)}% recovery)</th>
              </tr>
            </thead>
            <tbody>
              {(['ore_carbonaceous', 'ore_silicate', 'ore_metallic', 'ore_exotic'] as const).map(oreId => {
                const recipe = getRefineryRecipe(oreId);
                const out = refineOutputs(oreId, 100, MOBILE_REFINERY_RECOVERY);
                return (
                  <tr key={oreId} className="border-t border-[var(--line-2)]">
                    <td className="py-1 pr-3 text-[var(--ink)]">{RESOURCE_MAP.get(oreId as ResourceId)?.name}</td>
                    <td className="py-1 pr-3">{recipe?.name}</td>
                    <td className="py-1">{Object.entries(out).map(([slug, qty]) => `${qty} ${RESOURCE_MAP.get(slug as ResourceId)?.name || slug}`).join(', ')} <span className="text-[var(--ink-3)]">({refinedUnitTotal(out)} units of hold)</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={FIELD_LABEL}>Field</span>
            <select className={INPUT} value={depotFieldId} onChange={e => setDepotFieldId(e.target.value)} aria-label="Depot field">
              {ASTEROID_FIELDS.map(f => {
                const taken = phaseC.publicDepots.filter(d => d.fieldId === f.id).length;
                return <option key={f.id} value={f.id}>{f.name} — {taken}/{depotSlotsForFieldId(f.id)} slots taken</option>;
              })}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Depot hull to deploy (must be on station at the field)</span>
            <select className={INPUT} value={depotShipId} onChange={e => setDepotShipId(e.target.value)} aria-label="Depot ship">
              <option value="">Select a depot ship…</option>
              {(state.ships || []).filter(sh => sh.isBuilt && !!SHIP_MAP.get(sh.definitionId)?.depotCapacity).map(sh => (
                <option key={sh.instanceId} value={sh.instanceId}>{sh.name} — {LOCATION_MAP.get(sh.currentLocation)?.name || sh.currentLocation}</option>
              ))}
            </select>
          </label>
        </div>

        {(() => {
          const f = ASTEROID_FIELD_MAP.get(depotFieldId) || ASTEROID_FIELDS[0];
          const mine = phaseC.depots.find(d => d.fieldId === f.id) || null;
          const others = phaseC.publicDepots.filter(d => d.fieldId === f.id);
          const perUnit = depotRestockPricePerUnit(f.id);
          const units = Math.max(1, Math.floor(Number(restockUnits) || 0));
          const margin = DEPOT_FUEL_VALUE_PER_UNIT - perUnit;
          return (
            <div className="mt-3 rounded-lg border border-[var(--line-2)] p-3 text-[12px] text-[var(--ink-2)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] text-[var(--ink)] font-semibold">{f.name}</span>
                <span>{others.length}/{depotSlotsForFieldId(f.id)} slots held{others.length > 0 ? ` · ${others.map(d => d.holderName).join(', ')}` : ''}</span>
                <span className={margin >= 0 ? 'text-[var(--ink-2)]' : 'text-[var(--caution)]'}>
                  Delivered propellant {formatMoney(perUnit)}/unit vs {formatMoney(DEPOT_FUEL_VALUE_PER_UNIT)} of burn displaced{margin < 0 ? ' — cash restocking loses money here; crack local volatiles instead' : ''}
                </span>
              </div>
              {mine ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPip state="go" label={`Your depot · slot ${mine.slotIndex + 1}`} />
                    <span>{Math.round(mine.stockUnits).toLocaleString()} / {mine.capacity.toLocaleString()} units</span>
                    <div className="h-1.5 w-32 rounded bg-[var(--line-2)]" role="progressbar" aria-valuenow={Math.round((mine.stockUnits / Math.max(1, mine.capacity)) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Depot tank">
                      <div className="h-1.5 rounded bg-[var(--ember)]" style={{ width: `${Math.min(100, (mine.stockUnits / Math.max(1, mine.capacity)) * 100)}%` }} />
                    </div>
                    <button type="button" className={`${BTN} ml-auto`} disabled={phaseCBusy}
                      onClick={() => void phaseCOp({ op: 'recall_depot', fieldId: f.id }, `Recall the depot at ${f.name}`)}>
                      Recall (the tank is lost)
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="w-28">
                      <span className={FIELD_LABEL}>Units</span>
                      <input className={INPUT} type="number" inputMode="numeric" min={1} max={5000} value={restockUnits} onChange={e => setRestockUnits(e.target.value)} aria-label="Propellant units to load" />
                    </label>
                    <button type="button" className={BTN} disabled={phaseCBusy || state.money < perUnit * units}
                      onClick={() => void phaseCOp({ op: 'stock_depot', fieldId: f.id, units, source: 'cash' }, `Deliver ${units} units to ${f.name}`)}>
                      Buy &amp; deliver — {formatMoney(perUnit * units)}
                    </button>
                    <label className="w-44">
                      <span className={FIELD_LABEL}>Feedstock from inventory</span>
                      <select className={INPUT} value={feedstockSlug} onChange={e => setFeedstockSlug(e.target.value)} aria-label="Feedstock">
                        {Object.keys(DEPOT_FEEDSTOCK_YIELD).map(slug => (
                          <option key={slug} value={slug}>{RESOURCE_MAP.get(slug as ResourceId)?.name || slug} — {DEPOT_FEEDSTOCK_YIELD[slug]} units/unit</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className={BTN} disabled={phaseCBusy}
                      onClick={() => void phaseCOp({ op: 'stock_depot', fieldId: f.id, units, source: 'feedstock', resourceSlug: feedstockSlug }, `Crack ${feedstockSlug} into the ${f.name} depot`)}>
                      Crack local volatiles
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPip state="hold" label="No depot of yours here" />
                  <button type="button" className={BTN_PRIMARY} disabled={phaseCBusy || !depotShipId}
                    onClick={() => void phaseCOp({ op: 'deploy_depot', fieldId: f.id, shipInstanceId: depotShipId }, `Deploy a depot at ${f.name}`)}>
                    Take a slot
                  </button>
                  <span className="text-[var(--ink-3)]">Slots are finite and held until recalled.</span>
                </div>
              )}
            </div>
          );
        })()}
        {phaseCNote && <p className="mt-2 text-[11px] text-[var(--ink-2)]" role="status">{phaseCNote}</p>}
      </ConsolePanel>

      {/* ── Phase C: survey reports as sellable intelligence ────────────── */}
      <ConsolePanel title="Survey Reports" icon="discoveries" accent="cyan"
        subtitle={`Publish a survey you have flown and other corporations can buy the same intel. Listing reveals nothing but the rock's catalogue entry and your price; the broker takes ${Math.round(REPORT_BROKER_FEE * 100)}%.`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className={OVERLINE}>Your surveys</h4>
            {phaseC.reports.length === 0 ? (
              <p className="mt-1 text-[12px] text-[var(--ink-3)]">No surveys on the registry yet — survey a rock with a probe or a sensor hull.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {phaseC.reports.slice(0, 12).map(r => {
                  const rock = getAsteroid(r.asteroidId);
                  const known = intel[r.asteroidId];
                  const bounds = rock && known ? reportPriceBounds(rock, known) : null;
                  const draft = reportPrices[r.asteroidId] ?? String(r.price ?? bounds?.suggested ?? '');
                  const price = Math.floor(Number(draft) || 0);
                  return (
                    <li key={r.id} className="rounded-lg border border-[var(--line-2)] p-2 text-[12px] text-[var(--ink-2)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[var(--ink)]">{r.rockName}</span>
                        <span className="text-[var(--ink-3)]">{ASTEROID_FIELD_MAP.get(r.fieldId)?.name || r.fieldId}</span>
                        {r.price != null
                          ? <StatusPip state="live" label={`Listed ${formatMoney(r.price)}${r.soldCount > 0 ? ` · sold ${r.soldCount}x` : ''}`} />
                          : <StatusPip state="hold" label="Private" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-end gap-2">
                        <label className="w-36">
                          <span className="sr-only">Asking price for {r.rockName}</span>
                          <input className={INPUT} type="number" inputMode="numeric" value={draft}
                            min={bounds?.min} max={bounds?.max}
                            onChange={e => setReportPrices(prev => ({ ...prev, [r.asteroidId]: e.target.value }))}
                            aria-label={`Asking price for ${r.rockName}`} />
                        </label>
                        <button type="button" className={BTN} disabled={phaseCBusy || !price}
                          onClick={() => void phaseCOp({ op: 'list_report', asteroidId: r.asteroidId, price }, `List ${r.rockName}`)}>
                          {r.price != null ? 'Re-price' : 'List for sale'}
                        </button>
                        {r.price != null && (
                          <button type="button" className={BTN} disabled={phaseCBusy}
                            onClick={() => void phaseCOp({ op: 'unlist_report', asteroidId: r.asteroidId }, `Withdraw ${r.rockName}`)}>
                            Withdraw
                          </button>
                        )}
                        {bounds && <span className="text-[var(--ink-3)]">band {formatMoney(bounds.min)}–{formatMoney(bounds.max)} · you keep {formatMoney(reportSellerProceeds(price))}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h4 className={OVERLINE}>On the market</h4>
            {phaseC.reportMarket.filter(l => !l.mine).length === 0 ? (
              <p className="mt-1 text-[12px] text-[var(--ink-3)]">Nobody is selling survey data right now.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {phaseC.reportMarket.filter(l => !l.mine).slice(0, 12).map(l => (
                  <li key={l.id} className="rounded-lg border border-[var(--line-2)] p-2 text-[12px] text-[var(--ink-2)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--ink)]">{l.rockName}</span>
                      <span className="text-[var(--ink-3)]">{l.rockClass}-type · {ASTEROID_FIELD_MAP.get(l.fieldId)?.name || l.fieldId} · +{l.deltaVExtra.toLocaleString()} m/s</span>
                      <span>from {l.sellerName}</span>
                      <span className="text-[var(--ink-3)]">surveyed {new Date(l.surveyedAtMs).toLocaleDateString()}</span>
                      <button type="button" className={`${BTN} ml-auto`} disabled={phaseCBusy || state.money < l.price || !!intel[l.asteroidId]}
                        onClick={() => void phaseCOp({ op: 'buy_report', reportId: l.id }, `Buy the survey of ${l.rockName}`)}>
                        {intel[l.asteroidId] ? 'Already surveyed' : `Buy — ${formatMoney(l.price)}`}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ConsolePanel>

      {/* ── Phase D: the Refit Yard ─────────────────────────────────────── */}
      <FittingConsole state={state} />
    </div>
  );
}
