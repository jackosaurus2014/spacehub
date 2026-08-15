'use client';

// ─── Corporate Outliner (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ────────
// "A persistent, collapsible right-rail 'Corporate Outliner' on desktop —
// your empire as a living tree... visible on every tab, one click from
// anything to its home surface." Mounted OUTSIDE the tab branch in
// page.tsx so it survives tab switches. Pure lens over GameState — every
// section is a memoized derivation from lib/game/{outliner,order-queue,
// world-calendar}.ts; this component owns zero gameplay state, only UI
// state (collapsed/open, which section is expanded).
//
// Responsive contract (spec):
//   >=1280px  — docked right rail, collapsible to a 44px glyph rail,
//               collapse state persisted in localStorage.
//   1024-1279 — the same 44px glyph rail is always docked; tapping it opens
//               an overlay drawer with the full tree.
//   <1024px   — no persistent rail (screen budget). A 28px bottom status
//               strip shows the Attention count + next ETA; tapping it
//               opens a full-screen sheet (variant='sheet' via the same
//               body renderer).
//
// Accessibility: <nav aria-label="Corporate outliner">; every row is a real
// <button>; arrow-key roving traversal within a section; collapse state
// exposed via aria-expanded.
//
// Row DOM convention (for the V7 juice pass — "money-flash the outliner row"
// on build/order completion): every row rendered by <Row> carries a stable
// `id="outliner-row-<entityKind>-<entityId>"` (entityKind = the section:
// attention/operations/holdings/calendar; entityId = that row's own stable
// id — SituationItem.id, OrderQueueItem.id, location id, or CalendarEntry.id)
// plus a shared `outliner-row` class. A consumer outside this file can
// `document.getElementById(...)` or `document.querySelectorAll('.outliner-row')`
// to target a specific row for a transient visual effect without this
// component needing to expose any new prop/callback surface.

import { useCallback, useEffect, useMemo, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { deriveAttentionItems, deriveHoldingsGroups, type SituationItem } from '@/lib/game/outliner';
import { buildOrderQueue, type OrderQueueTarget, type OrderQueueItem } from '@/lib/game/order-queue';
import { getMissionCalendarEntries } from '@/lib/game/world-calendar';
import { formatCountdown } from '@/lib/game/formulas';
import { REGION_LABELS } from './SolarSystemCanvas';
import GameIcon from './GameIcon';
import HoloTip from './HoloTip';
import { calendarCategoryIcon, type IconName } from '@/lib/game/icons';
import { useModalA11y } from './useModalA11y';

const COLLAPSE_KEY = 'tycoon-outliner-collapsed';
const TICK_MS = 15 * 1000;

const SEVERITY_DOT: Record<SituationItem['severity'], string> = {
  critical: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-cyan-400',
};

function topSeverity(items: SituationItem[]): SituationItem['severity'] | null {
  if (items.some(i => i.severity === 'critical')) return 'critical';
  if (items.some(i => i.severity === 'warning')) return 'warning';
  if (items.length > 0) return 'info';
  return null;
}

/** Roving arrow-key focus within a section's row list (spec: "full keyboard
 *  traversal — arrow keys within sections"). Attach to the row container. */
function handleRovingArrowKeys(e: ReactKeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
  const currentIndex = focusables.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex === -1) return;
  e.preventDefault();
  const nextIndex = e.key === 'ArrowDown' ? Math.min(focusables.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
  focusables[nextIndex]?.focus();
}

// ─── Section shell ───────────────────────────────────────────────────────

function Section({
  id, title, icon, count, severity, defaultOpen = true, children,
}: {
  id: string; title: string; icon: IconName; count: number;
  severity?: SituationItem['severity'] | null; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="border-t border-white/[0.06] first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`outliner-section-${id}`}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left min-h-[44px] hover:bg-white/[0.03] transition-colors"
      >
        <GameIcon name={icon} size={14} />
        <span className="game-label text-[11px] text-slate-300 flex-1">{title}</span>
        {severity && <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[severity]}`} aria-hidden="true" />}
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/[0.06] text-slate-300">{count}</span>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={`outliner-section-${id}`} className="pb-2 px-2 space-y-1" onKeyDown={handleRovingArrowKeys}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ id, icon, label, sub, badge, severity, onClick }: {
  /** Stable row id — see the file-header "Row DOM convention" comment. */
  id: string;
  icon: IconName; label: string; sub?: string;
  badge?: string; severity?: SituationItem['severity']; onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="outliner-row w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
      style={{ minHeight: 40 }}
    >
      <span className="shrink-0 relative">
        <GameIcon name={icon} size={15} />
        {severity && severity !== 'info' && (
          <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[severity]}`} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-white truncate">{label}</span>
        {sub && <span className="block text-[9px] text-slate-500 truncate">{sub}</span>}
      </span>
      {badge && <span className="shrink-0 text-[9px] font-hud text-cyan-300/80">{badge}</span>}
    </button>
  );
}

// ─── Body (shared across rail / drawer / sheet variants) ────────────────

interface OutlinerBodyProps {
  state: GameState;
  now: number;
  onNavigateTab: (tab: GameTab) => void;
  onFocusMap: (target: OrderQueueTarget) => void;
}

function OutlinerBody({ state, now, onNavigateTab, onFocusMap }: OutlinerBodyProps) {
  const attention = useMemo(
    () => deriveAttentionItems(state, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.buildings, state.ships, state.commandQueue, state.activeResearch, state.activeResearch2,
      state.completedResearch, state.money, state.hazardWarnings, state.recentHazards,
      state.activeDeliveries, state.accordDocket, state.reports, now],
  );

  const operations = useMemo(
    () => buildOrderQueue(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.buildings, state.ships, state.expeditions, now],
  );

  const holdings = useMemo(
    () => deriveHoldingsGroups(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.unlockedLocations, state.buildings, state.ships],
  );

  const calendar = useMemo(
    () => getMissionCalendarEntries(state, { nowMs: now, horizonDays: 14 }).slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.accordDocket, state.expeditions, state.corporateEras, now],
  );

  const activateAttention = useCallback((item: SituationItem) => {
    if (!item.tab) return;
    if (item.tab === 'map' && item.target) onFocusMap(item.target);
    else onNavigateTab(item.tab);
  }, [onNavigateTab, onFocusMap]);

  const activateOperation = useCallback((item: OrderQueueItem) => onFocusMap(item.target), [onFocusMap]);

  const activateHolding = useCallback((locationId: string) => onFocusMap({ kind: 'location', id: locationId }), [onFocusMap]);

  // Calendar entries don't carry a single owning tab — the Situation Log
  // (Reports tab) is the correct home for "what's coming and what it means"
  // (same deep-link precedent as Attention -> Situation Log).
  const activateCalendar = useCallback(() => onNavigateTab('reports'), [onNavigateTab]);

  return (
    <div>
      <Section id="attention" title="Attention" icon="warning" count={attention.length} severity={topSeverity(attention)}>
        {attention.slice(0, 12).map(item => (
          <Row
            key={item.id}
            id={`outliner-row-attention-${item.id}`}
            icon={item.icon}
            label={item.label}
            sub={item.detail}
            severity={item.severity}
            onClick={() => activateAttention(item)}
          />
        ))}
        {attention.length > 12 && (
          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="w-full text-center text-[10px] text-cyan-400 hover:text-cyan-300 py-1.5 min-h-[36px]"
          >
            +{attention.length - 12} more in the Situation Log
          </button>
        )}
      </Section>

      <Section id="operations" title="Operations" icon="activity" count={operations.length}>
        {operations.slice(0, 12).map(item => (
          <Row
            key={item.id}
            id={`outliner-row-operations-${item.id}`}
            icon={item.icon}
            label={item.label}
            sub={item.etaSeconds !== null ? `${item.sub} · ${formatCountdown(item.etaSeconds)}` : item.sub}
            onClick={() => activateOperation(item)}
          />
        ))}
      </Section>

      <Section id="holdings" title="Holdings" icon="city" count={holdings.reduce((n, g) => n + g.locations.length, 0)}>
        {holdings.map(group => (
          <div key={group.type} className="mb-1.5 last:mb-0">
            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>{REGION_LABELS[group.type]}</span>
              <span>{group.buildingCount} bld · {group.shipCount} sh</span>
            </div>
            {group.locations.map(loc => (
              <div key={loc.id} className="flex items-center gap-1">
                <Row
                  id={`outliner-row-holdings-${loc.id}`}
                  icon="map"
                  label={loc.name}
                  sub={`${loc.completeBuildingCount}/${loc.buildingCount} built · ${loc.shipCount} ship${loc.shipCount === 1 ? '' : 's'}`}
                  onClick={() => activateHolding(loc.id)}
                />
                {loc.powerRatio !== null && (
                  <HoloTip
                    as="span"
                    underline={false}
                    content={{
                      title: `${loc.name} — Power`,
                      icon: 'power',
                      body: `Generating ${Math.round(loc.powerRatio * 100)}% of required load.${loc.hasPowerDeficit ? ' Underpowered locations run services at reduced revenue.' : ''}`,
                    }}
                  >
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full mr-1 ${loc.hasPowerDeficit ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      aria-label={loc.hasPowerDeficit ? 'Power deficit' : 'Power nominal'}
                    />
                  </HoloTip>
                )}
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section id="calendar" title="Calendar" icon="calendar" count={calendar.length}>
        {calendar.map(entry => (
          <Row
            key={entry.id}
            id={`outliner-row-calendar-${entry.id}`}
            icon={calendarCategoryIcon(entry.category)}
            label={entry.title}
            sub={formatCountdown(Math.max(0, (entry.atMs - now) / 1000))}
            onClick={activateCalendar}
          />
        ))}
      </Section>
    </div>
  );
}

// ─── Outer shell (rail / drawer / sheet) ─────────────────────────────────

export interface OutlinerProps {
  state: GameState;
  /** Which tab is currently active — used only to avoid a layout collision
   *  with MapCommandCenter's MapContextPanel on the map tab (see the
   *  bottom-strip note below); not required for any derivation. */
  activeTab: GameTab;
  onNavigateTab: (tab: GameTab) => void;
  onFocusMap: (target: OrderQueueTarget) => void;
}

export default function Outliner({ state, activeTab, onNavigateTab, onFocusMap }: OutlinerProps) {
  const [now, setNow] = useState(() => Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true'); } catch { /* default expanded */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* non-critical */ }
      return next;
    });
  }, []);

  const attentionForBadge = useMemo(() => deriveAttentionItems(state, now), [state, now]);
  const attentionCount = attentionForBadge.length;
  const attentionSeverity = topSeverity(attentionForBadge);
  const nextCalendar = useMemo(
    () => getMissionCalendarEntries(state, { nowMs: now, horizonDays: 14 })[0] || null,
    [state, now],
  );

  const drawerRef = useModalA11y<HTMLDivElement>(() => setDrawerOpen(false), drawerOpen);
  const sheetRef = useModalA11y<HTMLDivElement>(() => setSheetOpen(false), sheetOpen);

  const wrappedNavigate = useCallback((tab: GameTab) => {
    onNavigateTab(tab);
    setDrawerOpen(false);
    setSheetOpen(false);
  }, [onNavigateTab]);

  const wrappedFocusMap = useCallback((target: OrderQueueTarget) => {
    onFocusMap(target);
    setDrawerOpen(false);
    setSheetOpen(false);
  }, [onFocusMap]);

  return (
    <>
      {/* Desktop >=1280px — docked rail, collapsible to a glyph rail. */}
      <nav
        aria-label="Corporate outliner"
        className={`hidden xl:flex flex-col shrink-0 border-l border-white/[0.06] bg-[#050510]/95 backdrop-blur-sm overflow-y-auto game-scroll transition-[width] duration-200 ${collapsed ? 'w-11' : 'w-[300px]'}`}
        style={{ maxHeight: 'calc(100vh - 0px)' }}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand outliner' : 'Collapse outliner'}
          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 border-b border-white/[0.06] text-slate-400 hover:text-white transition-colors"
        >
          <GameIcon name={collapsed ? 'chevron-down' : 'chevron-up'} size={14} className={collapsed ? '-rotate-90' : 'rotate-90'} />
          {!collapsed && <span className="game-label text-[10px]">Outliner</span>}
        </button>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 py-3">
            {attentionSeverity && (
              <span className="relative">
                <GameIcon name="warning" size={16} />
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${SEVERITY_DOT[attentionSeverity]}`} aria-hidden="true" />
              </span>
            )}
          </div>
        ) : (
          <OutlinerBody state={state} now={now} onNavigateTab={onNavigateTab} onFocusMap={onFocusMap} />
        )}
      </nav>

      {/* Mid viewport 1024-1279px — a slim always-docked glyph rail that
          opens an overlay drawer with the full tree. Docked to the LEFT
          edge (not right): at this breakpoint MapCommandCenter isn't
          narrowed by a docked rail (that only happens >=1280px, where the
          rail is a real flex sibling), so MapContextPanel's own `sm:right-0
          sm:top-0 sm:bottom-0` side panel claims the full right edge on the
          map tab — a right-docked trigger here would fight it for the same
          pixels. The drawer content itself still slides in from the right
          (it's conceptually the "right rail"); only the always-visible
          summon tab moves to avoid the collision. */}
      <div className="hidden lg:flex xl:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={`Open corporate outliner${attentionCount > 0 ? ` — ${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention` : ''}`}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 w-11 min-h-[44px] py-3 flex flex-col items-center gap-1 rounded-r-xl border border-l-0 border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm hover:bg-white/[0.06] transition-colors"
        >
          <GameIcon name="map" size={16} />
          {attentionSeverity && <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[attentionSeverity]}`} aria-hidden="true" />}
        </button>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Corporate outliner"
              tabIndex={-1}
              className="relative w-[320px] max-w-[85vw] h-full bg-[#050510] border-l border-white/[0.08] overflow-y-auto game-scroll animate-reveal-up"
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
                <span className="game-label text-cyan-300 text-[11px]">Corporate Outliner</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close outliner"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <GameIcon name="close" size={16} />
                </button>
              </div>
              <OutlinerBody state={state} now={now} onNavigateTab={wrappedNavigate} onFocusMap={wrappedFocusMap} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile <1024px — bottom status strip, tap opens a full-screen sheet.
          Suppressed on the map tab: below the sm (640px) breakpoint,
          MapContextPanel renders as ITS OWN bottom sheet
          (`inset-x-0 bottom-0`, MapContextPanel.tsx) — a second fixed-bottom
          bar here would fight it for the same edge whenever a location is
          selected. The map tab already carries strong navigation via
          OrderQueueHUD + MapContextPanel, so losing the summon strip there
          specifically is a deliberate, narrow exception, not a parity gap —
          the rail/drawer variants above are unaffected (>=1024px is never
          in MapContextPanel's bottom-sheet mode; it side-docks instead). */}
      <div className={activeTab === 'map' ? 'hidden' : 'lg:hidden'}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Open corporate outliner${attentionCount > 0 ? ` — ${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention` : ''}`}
          className="fixed bottom-0 left-0 right-0 z-30 min-h-[44px] flex items-center justify-center gap-2 border-t border-white/[0.08] bg-[#050510]/95 backdrop-blur-sm text-[10px] text-slate-300"
        >
          {attentionSeverity ? (
            <>
              <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[attentionSeverity]}`} aria-hidden="true" />
              <span>{attentionCount} need{attentionCount === 1 ? 's' : ''} attention</span>
            </>
          ) : (
            <span>All systems nominal</span>
          )}
          {nextCalendar && (
            <span className="text-slate-500">· next: {nextCalendar.title} in {formatCountdown(Math.max(0, (nextCalendar.atMs - now) / 1000))}</span>
          )}
          <GameIcon name="chevron-up" size={12} />
        </button>
        {sheetOpen && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSheetOpen(false)} aria-hidden="true" />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Corporate outliner"
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 top-12 rounded-t-2xl border-t border-white/[0.08] bg-[#050510] overflow-y-auto game-scroll animate-reveal-up"
            >
              <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                <span className="game-label text-cyan-300 text-[11px]">Corporate Outliner</span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close outliner"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <GameIcon name="close" size={16} />
                </button>
              </div>
              <OutlinerBody state={state} now={now} onNavigateTab={wrappedNavigate} onFocusMap={wrappedFocusMap} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
