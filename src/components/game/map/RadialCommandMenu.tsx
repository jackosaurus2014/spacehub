'use client';

// ─── Radial Command Menu (Wave A2, item 1) ──────────────────────────────────
// Sins of a Solar Empire's signature interaction, ported to the solar map:
// select a body and its verbs appear in an arc AT the body, not in a panel
// on the far side of the screen.
//
// Contract:
//   • Actions come from map-radial.deriveRadialActions() — real engine
//     handlers / real tabs only. Unavailable actions render DISABLED WITH
//     THEIR REASON (the orbital-slot gate's copy passes straight through),
//     never hidden.
//   • Geometry comes from map-radial.computeRadialLayout() — a full circle
//     that slides inward near container edges so every 52px target stays on
//     screen at 375px, with a tether back to the true click point.
//   • Keyboard: role="menu" / role="menuitem", roving focus, arrows cycle
//     (wrapping), Home/End jump, Enter/Space activate, Escape closes and
//     restores focus. Disabled items stay focusable so screen readers hear
//     the reason (aria-disabled, not `disabled`).
//   • Reduced motion: the open/close scale-in collapses to an instant state
//     change (scoped @media block below — no GameStyles.tsx edits, this wave
//     does not own that file).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import {
  deriveRadialActions,
  computeRadialLayout,
  cycleRadialIndex,
  RADIAL_DEFAULT_ITEM_RADIUS,
  type RadialAction,
  type RadialActionId,
} from '@/lib/game/map-radial';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from '../GameIcon';

// Scoped styles — class-prefixed so they cannot collide with the global
// design system (owned by a different wave). Reduced-motion guard included.
const RADIAL_CSS = `
.stc-radial-ring { animation: stc-radial-in 160ms cubic-bezier(0.2, 0.8, 0.3, 1); }
.stc-radial-item { transition: transform 120ms ease, background-color 120ms ease, border-color 120ms ease; }
.stc-radial-item:hover:not([aria-disabled="true"]) { transform: scale(1.06); }
.stc-radial-item:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; }
@keyframes stc-radial-in {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .stc-radial-ring { animation: none; }
  .stc-radial-item { transition: none; }
  .stc-radial-item:hover:not([aria-disabled="true"]) { transform: none; }
}
`;

export interface RadialCommandMenuProps {
  state: GameState;
  locationId: string;
  /** Click point relative to the map container. */
  anchor: { x: number; y: number };
  /** Map container size (the menu is absolutely positioned inside it). */
  viewport: { w: number; h: number };
  onAction: (id: RadialActionId) => void;
  onClose: () => void;
}

export default function RadialCommandMenu({
  state, locationId, anchor, viewport, onAction, onClose,
}: RadialCommandMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  const name = LOCATION_MAP.get(locationId)?.name || locationId;

  // Derived once per open (and on state ticks) — the ring never reshuffles
  // because ACTION_ORDER is stable in map-radial.ts.
  const actions = useMemo(
    () => deriveRadialActions(state, locationId, Date.now()),
    [state, locationId],
  );

  const layout = useMemo(
    () => computeRadialLayout({
      count: actions.length,
      anchorX: anchor.x,
      anchorY: anchor.y,
      viewportW: viewport.w,
      viewportH: viewport.h,
      // Tighter ring on phones so the arc + the readout chip both fit.
      radius: viewport.w < 420 ? 84 : 100,
    }),
    [actions.length, anchor.x, anchor.y, viewport.w, viewport.h],
  );

  // Focus the first item on open; restore focus to the opener on close.
  useEffect(() => {
    restoreFocusRef.current = (document.activeElement as HTMLElement) || null;
    const first = itemRefs.current[0];
    first?.focus();
    return () => {
      const el = restoreFocusRef.current;
      if (el && document.contains(el)) el.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const focusIndex = useCallback((i: number) => {
    setActive(i);
    itemRefs.current[i]?.focus();
  }, []);

  const activate = useCallback((action: RadialAction) => {
    if (!action.enabled) {
      playSound('error');
      return;
    }
    playSound('click');
    onAction(action.id);
  }, [onAction]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusIndex(cycleRadialIndex(active, 1, actions.length));
        return;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusIndex(cycleRadialIndex(active, -1, actions.length));
        return;
      case 'Home':
        e.preventDefault();
        focusIndex(0);
        return;
      case 'End':
        e.preventDefault();
        focusIndex(Math.max(0, actions.length - 1));
        return;
      case 'Tab': {
        // Keep focus inside the menu — it is a menu, not a dialog margin.
        e.preventDefault();
        focusIndex(cycleRadialIndex(active, e.shiftKey ? -1 : 1, actions.length));
        return;
      }
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        e.preventDefault();
        const a = actions[active];
        if (a) activate(a);
        return;
      }
      default:
        return;
    }
  }, [active, actions, activate, focusIndex, onClose]);

  const focused = actions[active];
  const itemR = RADIAL_DEFAULT_ITEM_RADIUS;

  // Readout chip: below the ring unless that would fall off the bottom.
  const readoutBelow = layout.centerY + layout.radius + itemR + 54 < viewport.h;
  const readoutTop = readoutBelow
    ? layout.centerY + layout.radius + itemR + 8
    : Math.max(4, layout.centerY - layout.radius - itemR - 54);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-40"
      onKeyDown={onKeyDown}
    >
      <style>{RADIAL_CSS}</style>

      {/* Click-out catcher. Not a modal scrim — the map stays visible. */}
      <button
        type="button"
        aria-label="Close command menu"
        className="absolute inset-0 w-full h-full cursor-default bg-black/25 backdrop-blur-[1px] focus:outline-none"
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose(); }}
      />

      {/* Tether from the true click point to the (possibly displaced) ring. */}
      {layout.displaced && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <line
            x1={layout.anchorX} y1={layout.anchorY}
            x2={layout.centerX} y2={layout.centerY}
            stroke="rgba(34,211,238,0.45)" strokeWidth="1" strokeDasharray="4 4"
          />
          <circle cx={layout.anchorX} cy={layout.anchorY} r="3.5" fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="1.5" />
        </svg>
      )}

      <div
        className="stc-radial-ring absolute"
        style={{ left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
      >
        {/* Centre puck — names the target so the ring is self-describing. */}
        <div
          className="hud-frame absolute rounded-full border border-cyan-400/40 bg-[#050510]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center px-2"
          style={{
            left: layout.centerX - 44,
            top: layout.centerY - 44,
            width: 88,
            height: 88,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <span className="text-[10px] leading-tight font-hud font-bold text-cyan-200 line-clamp-2">{name}</span>
          <span className="text-[9px] text-slate-500 mt-0.5">Esc</span>
        </div>

        <div
          role="menu"
          aria-label={`Command actions for ${name}`}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          {actions.map((a, i) => {
            const pt = layout.items[i];
            const isActive = i === active;
            return (
              <button
                key={a.id}
                ref={el => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                aria-disabled={!a.enabled}
                tabIndex={isActive ? 0 : -1}
                onClick={() => { setActive(i); activate(a); }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`stc-radial-item absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border backdrop-blur-sm ${
                  !a.enabled
                    ? 'border-white/[0.08] bg-[#0a0a16]/90 text-slate-600 cursor-not-allowed'
                    : isActive
                      ? 'border-cyan-400/70 bg-cyan-500/25 text-cyan-100'
                      : 'border-white/15 bg-[#050510]/92 text-slate-200 hover:bg-white/[0.1]'
                }`}
                style={{
                  left: pt.x - itemR,
                  top: pt.y - itemR,
                  width: itemR * 2,
                  height: itemR * 2,
                  pointerEvents: 'auto',
                }}
              >
                <GameIcon name={a.icon} size={16} />
                <span className="text-[10px] font-semibold leading-none">{a.label}</span>
                <span className="sr-only">
                  {a.description}
                  {a.detail ? `, ${a.detail}` : ''}
                  {a.enabled ? '' : `, unavailable: ${a.reason || 'not available here'}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Focused-item readout — label, live value, and the disabled reason
            in TEXT (the ring is never the only carrier of that information). */}
        {focused && (
          <div
            className="hud-frame absolute rounded-lg border border-white/[0.1] bg-[#050510]/95 backdrop-blur-sm px-2.5 py-1.5 text-center"
            style={{
              left: Math.max(4, Math.min(viewport.w - 244, layout.centerX - 120)),
              top: readoutTop,
              width: 240,
              pointerEvents: 'none',
            }}
            role="status"
            aria-live="polite"
          >
            <div className="text-[11px] font-semibold text-white">
              {focused.label}
              {focused.detail && <span className="text-cyan-300 font-normal"> · {focused.detail}</span>}
            </div>
            <div className={`text-[10px] leading-snug ${focused.enabled ? 'text-slate-400' : 'text-amber-300'}`}>
              {focused.enabled ? focused.description : focused.reason || 'Unavailable here'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
