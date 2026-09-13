'use client';

// ─── Markets ▸ Sourcing ─────────────────────────────────────────────────────
//
// Founder request (2026-09-12): input sourcing was buried on the owned-
// building card at the foot of the Build panel. This console lists EVERY
// owned building that consumes inputs, grouped by location, with the same
// two-button policy group (Supply locally / Standing market order), stock on
// hand in the pool the consumption engine draws from, months of cover, and a
// status pip — plus two bulk buttons. The row model is pure
// (src/lib/game/sourcing.ts, unit-tested); this file only renders it.
//
// Policy changes go through the SAME handler the Build panel uses
// (page.tsx handleSetSupplyPolicy → setBuildingSupplyPolicy), so the server
// sync keeps carrying `supplyPolicy` unchanged.

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { buildSourcingRows, groupSourcingRowsByLocation, type SourcingRow, type SupplyPolicy } from '@/lib/game/sourcing';
import { resourceCategoryIcon } from '@/lib/game/icons';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';

const STATUS_PIP: Record<SourcingRow['status'], { state: PipState; label: string }> = {
  covered: { state: 'go', label: 'Covered' },
  short: { state: 'scrub', label: 'Short' },
  market: { state: 'live', label: 'On market' },
  inactive: { state: 'hold', label: 'Paused' },
};

const INACTIVE_TEXT: Record<NonNullable<SourcingRow['inactiveReason']>, string> = {
  building: 'not consuming yet',
  mothballed: 'paused',
  reactivating: 'spinning up',
  decommissioning: 'decommissioning',
};

function fmtQty(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString();
  return n < 1 ? n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : (Math.round(n * 10) / 10).toString();
}

/** The same HoloTip copy as the Build panel's Sourcing toggle. */
function SourcingTip({ children }: { children: React.ReactNode }) {
  return (
    <HoloTip
      content={{
        title: 'Input Sourcing',
        icon: 'market',
        body: (
          <p>
            <strong>Supply locally</strong>: draw only your own stock — zero cash cost, full
            logistics burden, runs degraded when short. <strong>Standing market order</strong>:
            shortfalls become real buy orders on the shared book at live spot (+2% fee) —{' '}
            <Concept id="standing-order">visible demand</Concept> rivals can supply or front-run.
          </p>
        ),
      }}
    >
      {children}
    </HoloTip>
  );
}

/** The same two-button group as the Build panel's owned-building card. */
function PolicyToggle({ row, onSetSupplyPolicy }: { row: SourcingRow; onSetSupplyPolicy: (instanceId: string, policy: SupplyPolicy) => void }) {
  const btn = (policy: SupplyPolicy, label: string) => (
    <button
      type="button"
      onClick={() => row.policy !== policy && onSetSupplyPolicy(row.instanceId, policy)}
      aria-pressed={row.policy === policy}
      className={`min-h-[36px] px-2 py-0.5 text-[10px] whitespace-nowrap motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)] ${
        row.policy === policy ? 'bg-[var(--ember)] text-[#0A0A0B] font-semibold' : 'bg-[var(--elev)] text-[var(--ink-2)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      className="inline-flex rounded-[var(--radius-control)] overflow-hidden border border-[var(--line-2)]"
      role="group"
      aria-label={`${row.buildingName} at ${row.locationName} input sourcing`}
    >
      {btn('local', 'Supply locally')}
      {btn('market', 'Standing market order')}
    </div>
  );
}

interface TableRow {
  id: string;
  row: SourcingRow;
  building: string;
  inputs: string;
  stock: string;
  cover: number | string;
  policy: string;
  status: string;
}

interface SourcingPanelProps {
  state: GameState;
  /** The Build panel's handler — page.tsx handleSetSupplyPolicy. */
  onSetSupplyPolicy: (instanceId: string, policy: SupplyPolicy) => void;
  /** Tab navigation (the empty state points at Build & Fleet). */
  onNavigate?: (tab: string) => void;
}

export default function SourcingPanel({ state, onSetSupplyPolicy, onNavigate }: SourcingPanelProps) {
  const rows = useMemo(() => buildSourcingRows(state), [state]);
  const groups = useMemo(() => groupSourcingRowsByLocation(rows), [rows]);

  const shortCount = rows.filter(r => r.status === 'short').length;
  const marketCount = rows.filter(r => r.policy === 'market').length;
  const localCount = rows.length - marketCount;

  const setAll = (policy: SupplyPolicy) => {
    for (const r of rows) if (r.policy !== policy) onSetSupplyPolicy(r.instanceId, policy);
  };

  const dim = (row: SourcingRow, node: React.ReactNode) => (
    <span className={row.operational ? '' : 'opacity-60'}>{node}</span>
  );

  const columns: DataTableColumn<TableRow>[] = [
    {
      key: 'building', header: 'Building',
      render: ({ row }) => dim(row, (
        <span className="inline-flex flex-col">
          <span className="text-[var(--ink)]">{row.buildingName}</span>
          {row.inactiveReason && (
            <span className="text-[10px] text-[var(--ink-3)]">{INACTIVE_TEXT[row.inactiveReason]}</span>
          )}
        </span>
      )),
    },
    {
      key: 'inputs', header: 'Inputs / month', sortable: false,
      render: ({ row }) => dim(row, (
        <span className="inline-flex flex-col gap-0.5">
          {row.inputs.map(i => {
            const def = RESOURCE_MAP.get(i.resourceId as ResourceId);
            return (
              <span key={i.resourceId} className="inline-flex items-center gap-1 whitespace-nowrap">
                <GameIcon name={resourceCategoryIcon(def?.category || 'generic')} size={10} />
                <span className="font-mono tabular-nums text-[var(--ink)]">{fmtQty(i.perMonth)}</span> {i.name} / month
              </span>
            );
          })}
        </span>
      )),
    },
    {
      key: 'stock', header: 'On hand', numeric: true, sortable: false,
      render: ({ row }) => dim(row, (
        <span className="inline-flex flex-col gap-0.5 items-end">
          {row.inputs.map(i => (
            <span key={i.resourceId} className={`font-mono tabular-nums whitespace-nowrap ${row.policy === 'local' && row.operational && i.coverMonths !== null && i.coverMonths < 1 ? 'text-[var(--crit)]' : ''}`}>
              {fmtQty(i.stock)}
            </span>
          ))}
        </span>
      )),
    },
    {
      key: 'cover', header: 'Months of cover', numeric: true,
      render: ({ row }) => dim(row, (
        row.monthsOfCover === null
          ? <span aria-label="not applicable">—</span>
          : <span className="font-mono tabular-nums">{row.monthsOfCover >= 100 ? '99+' : row.monthsOfCover.toFixed(1)}</span>
      )),
    },
    {
      key: 'policy', header: 'Sourcing', sortable: false,
      render: ({ row }) => <PolicyToggle row={row} onSetSupplyPolicy={onSetSupplyPolicy} />,
    },
    {
      key: 'status', header: 'Status',
      render: ({ row }) => {
        const pip = STATUS_PIP[row.status];
        const label = row.status === 'inactive' && row.inactiveReason === 'building' ? 'Not consuming yet' : pip.label;
        return <StatusPip state={pip.state} label={label} />;
      },
    },
  ];

  const toTableRow = (row: SourcingRow): TableRow => ({
    id: row.instanceId,
    row,
    building: row.buildingName,
    inputs: row.inputs.map(i => `${fmtQty(i.perMonth)} ${i.name} / month`).join(', '),
    stock: row.inputs.map(i => fmtQty(i.stock)).join(', '),
    cover: row.monthsOfCover === null ? '—' : row.monthsOfCover,
    policy: row.policy === 'market' ? 'Standing market order' : 'Supply locally',
    status: STATUS_PIP[row.status].label,
  });

  return (
    <div className="space-y-4">
      <Console
        title={<span className="inline-flex items-center gap-1.5"><GameIcon name="sourcing" size={14} /> Input Sourcing</span>}
        actions={rows.length > 0 ? (
          <span className="inline-flex items-center gap-2 text-[11px]">
            <StatusPip state={shortCount > 0 ? 'scrub' : 'go'} label={`${shortCount} short`} />
            <span className="text-[var(--ink-3)]">{localCount} local · {marketCount} on market</span>
          </span>
        ) : undefined}
      >
        <p className="text-[12px] text-[var(--ink-2)] leading-relaxed">
          Every building here draws inputs from its location&apos;s stockpile each game month — launch pads burn
          propellant, stations consume life-support packs, reactors need fusion fuel. Running short lowers{' '}
          <Concept id="supply-efficiency">supply efficiency</Concept> toward the 50% floor. Each building can{' '}
          <SourcingTip><span className={OVERLINE}>source</span></SourcingTip> its inputs one of two ways:
          supply it yourself (free, but you carry the logistics), or place a{' '}
          <Concept id="standing-order">standing market order</Concept> so shortfalls are bought on the shared book
          at live spot plus a 2% fee — real demand rivals can see and supply.
        </p>
        {rows.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAll('market')}
              disabled={marketCount === rows.length}
              className="btn-secondary !min-h-[40px] !py-1 text-[11px]"
            >
              <GameIcon name="market" size={11} /> Set all to standing market order
            </button>
            <button
              type="button"
              onClick={() => setAll('local')}
              disabled={localCount === rows.length}
              className="btn-secondary !min-h-[40px] !py-1 text-[11px]"
            >
              <GameIcon name="package" size={11} /> Set all to supply locally
            </button>
          </div>
        )}
      </Console>

      {rows.length === 0 ? (
        <Console title="No consuming buildings yet">
          <p className="text-[12px] text-[var(--ink-2)] leading-relaxed">
            None of your buildings consume inputs yet. Launch pads, space stations and reactors all have a monthly
            recipe — once you build one it appears here with its sourcing policy.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('build')}
              className="btn-secondary mt-3 !min-h-[40px] !py-1 text-[11px]"
            >
              <GameIcon name="build" size={11} /> Open Build &amp; Fleet
            </button>
          )}
        </Console>
      ) : (
        groups.map(g => (
          <Console
            key={g.locationId}
            title={<span className="inline-flex items-center gap-1.5"><GameIcon name="map" size={12} /> {g.locationName}</span>}
            actions={<span className="text-[11px] text-[var(--ink-3)]">{g.rows.length} building{g.rows.length !== 1 ? 's' : ''}</span>}
            padded={false}
          >
            <div className="overflow-x-auto">
              <DataTable<TableRow>
                columns={columns}
                rows={g.rows.map(toTableRow)}
                caption={`Input sourcing for buildings at ${g.locationName}`}
                className="px-1 py-1 sm:px-0 sm:py-0"
              />
            </div>
          </Console>
        ))
      )}
    </div>
  );
}
