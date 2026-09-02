'use client';

// ─── Space Tycoon: Flow Map tab (Markets → Analytics) ────────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 3. Renders GET
// /api/space-tycoon/market/flows: production by location, the busiest
// lanes with their zone tolls, exporter/importer tables, chokepoint
// callouts with an "Aim a lever" row (price campaign → order book console,
// poach → Workforce), and NPC share. Ranked bars are plain SVG-free divs —
// no new chart dependency. Every bar carries its number as text; every
// callout names its rule in words (never colour alone). 44px targets;
// no motion beyond hover colour.

import { useEffect, useMemo, useState } from 'react';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { requestSubView } from '@/lib/game/sub-view';
import type { GameTab } from '@/lib/game/types';
import type {
  FlowMapReport, ProductionRow, LaneFlowRow, ResourceTraderTable, RankedTraderRow,
} from '@/lib/game/flow-map';
import GameIcon from './GameIcon';

const ALL = '__all__';
const WINDOWS = [7, 30, 90] as const;

interface FlowMapPanelProps {
  /** The order book's selected resource (mirrored by the Markets hub). */
  selectedResource?: string | null;
  onOpenOrderBook?: (slug: string) => void;
  /** Open the order book's price-campaign console for a resource. */
  onDeclareCampaign?: (slug: string) => void;
  /** Top-level navigation for the poach lever (Workforce → poach inbox). */
  onNavigateTab?: (tab: GameTab) => void;
}

function Bar({ value, max, label, text }: { value: number; max: number; label: string; text: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px] py-0.5">
      <span className="w-40 sm:w-52 truncate text-slate-300" title={label}>{label}</span>
      <div className="flex-1 h-3 rounded bg-white/[0.05] overflow-hidden" aria-hidden="true">
        <div className="h-full bg-cyan-400/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 text-right font-mono text-slate-200 shrink-0">{text}</span>
    </div>
  );
}

function TraderTable({ table, side, onOpenOrderBook }: { table: ResourceTraderTable; side: 'Sold' | 'Bought'; onOpenOrderBook?: (slug: string) => void }) {
  const rowText = (r: RankedTraderRow) => (r.units !== null ? r.units.toLocaleString() : `${r.unitsRange} (range)`);
  const valueText = (r: RankedTraderRow) => (r.value !== null ? formatMoney(r.value) : `~${r.valueRange}`);
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-bold text-white">
          {onOpenOrderBook ? (
            <button
              type="button"
              onClick={() => onOpenOrderBook(table.resourceSlug)}
              className="min-h-[44px] underline decoration-dotted underline-offset-2 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              aria-label={`Open the order book for ${table.resourceName}`}
            >
              {table.resourceName}
            </button>
          ) : table.resourceName}
        </span>
        <span className="text-[10px] text-slate-500">{table.totalUnits.toLocaleString()} units {side.toLowerCase()}</span>
      </div>
      <table className="w-full text-[11px]" role="table" aria-label={`${table.resourceName} — top corporations by units ${side.toLowerCase()}`}>
        <thead>
          <tr className="text-slate-500 text-left">
            <th scope="col" className="px-1 py-0.5 font-medium">#</th>
            <th scope="col" className="px-1 py-0.5 font-medium">Corporation</th>
            <th scope="col" className="px-1 py-0.5 font-medium text-right">{side}</th>
            <th scope="col" className="px-1 py-0.5 font-medium text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(r => (
            <tr key={r.profileId} className="border-t border-white/[0.05]">
              <td className="px-1 py-1 font-mono text-slate-400">{r.rank}</td>
              <td className="px-1 py-1 text-slate-200">
                {r.companyName}
                {r.isNpc && <span className="ml-1 text-[9px] uppercase tracking-wider text-slate-500">npc</span>}
              </td>
              <td className="px-1 py-1 text-right font-mono text-slate-200">{rowText(r)}</td>
              <td className="px-1 py-1 text-right font-mono text-slate-300">{valueText(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-600 mt-1">Exact figures for the top 3; ranges below the podium.</p>
    </div>
  );
}

export default function FlowMapPanel({ selectedResource, onOpenOrderBook, onDeclareCampaign, onNavigateTab }: FlowMapPanelProps) {
  const [report, setReport] = useState<FlowMapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<string>(selectedResource || ALL);
  const [days, setDays] = useState<number>(7);

  useEffect(() => { if (selectedResource) setResource(selectedResource); }, [selectedResource]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ days: String(days) });
    if (resource !== ALL) qs.set('resource', resource);
    fetch(`/api/space-tycoon/market/flows?${qs.toString()}`)
      .then(async r => {
        if (r.status === 401) throw new Error('Sign in to view the flow map.');
        if (r.status === 429) throw new Error('Too many requests — the map refreshes every 10 minutes; try again shortly.');
        if (!r.ok) throw new Error('The flow map is unavailable right now.');
        return r.json() as Promise<FlowMapReport>;
      })
      .then(d => { if (!cancelled) setReport(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource, days]);

  const production = useMemo<ProductionRow[]>(() => (report?.production || []).slice(0, 12), [report]);
  const lanes = useMemo<LaneFlowRow[]>(() => (report?.lanes || []).slice(0, 10), [report]);
  const tollByZone = useMemo(() => new Map((report?.tollsByZone || []).map(z => [z.zoneSlug, z])), [report]);
  const maxProd = production[0]?.units || 0;
  const maxLane = lanes[0]?.dispatches || 0;
  const resourceName = resource === ALL ? null : (RESOURCE_MAP.get(resource as ResourceId)?.name || resource);
  const leverSlug = resource !== ALL ? resource : (report?.exporters[0]?.resourceSlug || 'iron');

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="text-white text-sm font-bold flex items-center gap-1.5">
            <GameIcon name="map" size={14} /> Commodity flow map
          </div>
          {report && (
            <span className="text-[10px] text-slate-500">
              As of {new Date(report.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · refreshes every 10 min
            </span>
          )}
        </div>
        <p className="text-slate-500 text-[11px]">
          Where goods are mined, which lanes carry the traffic, who exports and imports on the shared book, and
          where the traffic concentrates. Every figure is read from server rows; anything the server does not yet
          record is shown as &ldquo;not attested&rdquo;, never estimated.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="flow-map-resource">Resource</label>
          <select
            id="flow-map-resource"
            value={resource}
            onChange={e => setResource(e.target.value)}
            className="min-h-[44px] bg-slate-900 border border-white/[0.1] rounded-md px-2 text-xs text-slate-200"
          >
            <option value={ALL}>All resources</option>
            {RESOURCES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div role="radiogroup" aria-label="Window" className="flex rounded-md border border-white/[0.1] overflow-hidden">
            {WINDOWS.map(w => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={days === w}
                onClick={() => setDays(w)}
                className={`min-h-[44px] px-3 text-[11px] font-semibold ${days === w ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-white'}`}
              >
                {w}d
              </button>
            ))}
          </div>
          {resource !== ALL && onOpenOrderBook && (
            <button
              type="button"
              onClick={() => onOpenOrderBook(resource)}
              className="min-h-[44px] px-2.5 rounded-md text-[10px] font-bold border border-white/15 text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Open order book →
            </button>
          )}
        </div>
      </div>

      {loading && <div className="card p-8 text-center text-slate-500 text-sm">Charting flows…</div>}
      {!loading && error && <div className="card p-8 text-center text-slate-400 text-sm" role="alert">{error}</div>}

      {!loading && report && (
        <>
          {/* Production by location */}
          <div className="card p-3">
            <div className="text-white text-xs font-bold flex items-center gap-1.5 mb-1">
              <GameIcon name="resource-metal" size={13} /> Production by location{resourceName ? ` — ${resourceName}` : ''}
            </div>
            <p className="text-[10px] text-slate-500 mb-2">{report.productionNote}</p>
            {production.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No deposits were worked in the last {report.windowDays} days{resourceName ? ` for ${resourceName}` : ''}.</p>
            ) : production.map(p => (
              <Bar
                key={`${p.locationId}:${p.resourceSlug}`}
                value={p.units}
                max={maxProd}
                label={resourceName ? p.locationName : `${p.locationName} · ${p.resourceName}`}
                text={`${p.units.toLocaleString()} u`}
              />
            ))}
          </div>

          {/* Lanes */}
          <div className="card p-3">
            <div className="text-white text-xs font-bold flex items-center gap-1.5 mb-1">
              <GameIcon name="ship-transport" size={13} /> Busiest lanes — last {report.windowDays} days
            </div>
            <p className="text-[10px] text-slate-500 mb-2">{report.lanesNote}</p>
            {lanes.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No freight dispatches were recorded in this window.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[11px]" role="table" aria-label="Busiest shipping lanes">
                  <thead>
                    <tr className="text-slate-500 text-left">
                      <th scope="col" className="px-1 py-1 font-medium">Lane</th>
                      <th scope="col" className="px-1 py-1 font-medium">Dispatches</th>
                      <th scope="col" className="px-1 py-1 font-medium text-right">Cargo</th>
                      <th scope="col" className="px-1 py-1 font-medium text-right">Zone tolls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lanes.map(l => {
                      const tolls = l.zoneSlugs.map(z => tollByZone.get(z)).filter(Boolean);
                      const tollTotal = tolls.reduce((s, z) => s + (z?.tollPaid || 0), 0);
                      return (
                        <tr key={l.laneKey} className="border-t border-white/[0.05]">
                          <td className="px-1 py-1.5 text-slate-200 whitespace-nowrap">{l.fromName} ↔ {l.toName}</td>
                          <td className="px-1 py-1.5">
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <div className="flex-1 h-2.5 rounded bg-white/[0.05] overflow-hidden" aria-hidden="true">
                                <div className="h-full bg-amber-400/60" style={{ width: `${maxLane > 0 ? Math.max(2, Math.round((l.dispatches / maxLane) * 100)) : 0}%` }} />
                              </div>
                              <span className="font-mono text-slate-200">{l.dispatches.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-1 py-1.5 text-right text-slate-500 italic" title={l.cargoReason}>not attested</td>
                          <td className="px-1 py-1.5 text-right font-mono text-slate-300" title={tolls.length ? `Per zone: ${tolls.map(z => `${z?.zoneName} ${formatMoney(z?.tollPaid || 0)}`).join(', ')}` : l.tollReason}>
                            {tolls.length ? formatMoney(tollTotal) : <span className="text-slate-500 italic">none</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {report.tollsByZone.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-2">
                Tolls collected by zone governors this window:{' '}
                {report.tollsByZone.map(z => `${z.zoneName} ${formatMoney(z.tollPaid)} (${z.payers} payer${z.payers === 1 ? '' : 's'})`).join(' · ')}
              </p>
            )}
          </div>

          {/* Chokepoints + levers */}
          <div className="card p-3 border border-amber-500/20">
            <div className="text-white text-xs font-bold flex items-center gap-1.5 mb-1">
              <GameIcon name="territory" size={13} /> Chokepoints
            </div>
            <p className="text-[10px] text-slate-500 mb-2">{report.chokepointNote}</p>
            {report.chokepoints.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No lane clears the volume rule yet — traffic is spread thin or absent.</p>
            ) : (
              <ul className="space-y-1.5">
                {report.chokepoints.map(c => (
                  <li key={`${c.laneKey}:${c.rule}`} className="text-[11px] text-slate-200 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-200">
                      {c.rule === 'volume_p80' ? 'Volume' : 'Concentration'}
                    </span>
                    <span className="font-semibold">{c.fromName} ↔ {c.toName}</span>
                    <span className="text-slate-400">{c.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Aim a lever</span>
              {onDeclareCampaign && (
                <button
                  type="button"
                  onClick={() => onDeclareCampaign(leverSlug)}
                  className="min-h-[44px] px-2.5 rounded-md text-[10px] font-bold border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  Price campaign on {RESOURCE_MAP.get(leverSlug as ResourceId)?.name || leverSlug} →
                </button>
              )}
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => { requestSubView('workforce:poach'); onNavigateTab('workforce'); }}
                  className="min-h-[44px] px-2.5 rounded-md text-[10px] font-bold border border-purple-500/40 text-purple-200 hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  Poach a rival&apos;s crew →
                </button>
              )}
              {!onDeclareCampaign && !onNavigateTab && (
                <span className="text-[10px] text-slate-500">Open Markets → Spot &amp; Orders for the campaign console; Workforce for poaching.</span>
              )}
            </div>
          </div>

          {/* Exporters / importers */}
          {(report.exporters.length > 0 || report.importers.length > 0) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="card p-3 space-y-2">
                <div className="text-white text-xs font-bold flex items-center gap-1.5">
                  <GameIcon name="trending-up" size={13} /> Top exporters (units sold)
                </div>
                {report.exporters.slice(0, resource === ALL ? 4 : 1).map(t => <TraderTable key={t.resourceSlug} table={t} side="Sold" onOpenOrderBook={onOpenOrderBook} />)}
              </div>
              <div className="card p-3 space-y-2">
                <div className="text-white text-xs font-bold flex items-center gap-1.5">
                  <GameIcon name="trending-down" size={13} /> Top importers (units bought)
                </div>
                {report.importers.slice(0, resource === ALL ? 4 : 1).map(t => <TraderTable key={t.resourceSlug} table={t} side="Bought" onOpenOrderBook={onOpenOrderBook} />)}
              </div>
            </div>
          ) : (
            <div className="card p-3 text-xs text-slate-500">No order-book fills in the last {report.windowDays} days{resourceName ? ` for ${resourceName}` : ''} — no exporter or importer rankings yet.</div>
          )}

          {/* NPC share + consumption */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="card p-3">
              <div className="text-white text-xs font-bold flex items-center gap-1.5 mb-1">
                <GameIcon name="npc" size={13} /> NPC share of traded units
              </div>
              {report.npcShare.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No fills to measure.</p>
              ) : report.npcShare.slice(0, 10).map(n => (
                <Bar key={n.resourceSlug} value={n.npcSharePct} max={100} label={n.resourceName} text={`${n.npcSharePct}% NPC`} />
              ))}
            </div>
            <div className="card p-3">
              <div className="text-white text-xs font-bold flex items-center gap-1.5 mb-1">
                <GameIcon name="build" size={13} /> Consumption
              </div>
              <p className="text-[10px] text-slate-500 mb-2">Per location: <span className="italic">not attested</span> — {report.consumption.reason}</p>
              <p className="text-[10px] text-slate-500 mb-2">{report.consumption.note}</p>
              {report.consumption.world.slice(0, 8).map(w => (
                <Bar key={w.resourceSlug} value={w.cumulativeDemand} max={report.consumption.world[0]?.cumulativeDemand || 0} label={w.resourceName} text={`${w.cumulativeDemand.toLocaleString()} u`} />
              ))}
            </div>
          </div>

          <details className="card p-3 text-[10px] text-slate-500">
            <summary className="cursor-pointer min-h-[44px] flex items-center text-slate-400">Not yet attested to the server ({report.missing.length})</summary>
            <ul className="mt-1 space-y-1 list-disc pl-4">
              {report.missing.map(m => <li key={m.flow}><span className="font-mono text-slate-400">{m.flow}</span> — {m.reason}</li>)}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
