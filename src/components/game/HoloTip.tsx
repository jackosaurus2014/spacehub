'use client';

// ─── HoloTip: Unified Tooltip + Nested Concept Layer (Wave V2) ──────────────
// docs/VISUAL_DEPTH_2026-08.md §V2. Replaces the old `.game-tooltip`
// attr(data-tooltip) CSS one-liner (GameStyles.tsx) with a real portal-
// rendered panel that can hold rich content — title, icon, body, stat rows,
// a source/formula caption — and nested "concept" terms that expand in
// place (the Stellaris "learn the game through tooltips" loop).
//
// Two exports:
//   <HoloTip content={{ title, icon, body, rows, source }}>{trigger}</HoloTip>
//   <Concept id="delta-v">Δv</Concept>  — a term backed by concepts.ts
//
// Interaction model:
//   - Hover (300ms open delay, small close-delay so the pointer can travel
//     into the panel), keyboard focus (opens immediately), and click/tap
//     (toggles open — this IS the mobile "tap-to-open" story: touch devices
//     fire a click on tap with no long-press choreography required).
//   - Escape closes and returns focus to the trigger. Clicking/tapping
//     outside the open panel closes it ("tap-outside-close").
//   - Not a modal: focus is never trapped. Content is exposed to screen
//     readers via aria-describedby on the trigger (role="tooltip" on the
//     panel). Nested concept terms (<Concept> rendered inside an open
//     HoloTip's body) are real, keyboard-focusable <button> elements — no
//     separate disclosure affordance is needed since Tab + Enter/Space
//     reaches and activates them exactly like the outer trigger does.
//   - <640px viewport: renders as a bottom sheet (matches MapContextPanel's
//     existing mobile bottom-sheet pattern) instead of an anchored popover,
//     with a 44px close target and swipe-down-equivalent (tap backdrop) to
//     dismiss.
//   - Reduced motion: the pop-in animation is defined in GameStyles.tsx
//     under `.holotip-panel` and is disabled by the existing
//     prefers-reduced-motion guard block there — no JS branching needed.
//   - Positioning clamps to the viewport with an 8px margin and flips above
//     the trigger when there isn't room below.

import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect,
  useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import GameIcon, { type GameIconGlow } from './GameIcon';
import type { IconName } from '@/lib/game/icons';
import { CONCEPTS } from '@/lib/game/concepts';

// ─── Content shape ───────────────────────────────────────────────────────

export interface HoloTipRow {
  label: string;
  value: ReactNode;
}

export interface HoloTipContent {
  title: string;
  icon?: IconName;
  iconGlow?: GameIconGlow;
  body?: ReactNode;
  rows?: HoloTipRow[];
  /** Formula/data-source caption, rendered small + muted + monospace. */
  source?: string;
}

// ─── Nested-concept navigation context ──────────────────────────────────
// Provided while a HoloTip's panel content is rendered. `depth` starts at 0
// for the tooltip's own base content; pushing a concept increments it.
// Concept terms stop being interactive once depth reaches MAX_DEPTH,
// bounding the breadcrumb chain per the spec ("max depth 2").

const MAX_DEPTH = 2;

interface StackCtx {
  depth: number;
  push: (conceptId: string) => void;
}

const HoloTipStackContext = createContext<StackCtx | null>(null);

function conceptContent(id: string): HoloTipContent | null {
  const concept = CONCEPTS[id];
  if (!concept) return null;
  return {
    title: concept.name,
    icon: concept.icon,
    body: (
      <>
        <p>{concept.body}</p>
        {concept.related && concept.related.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/[0.08] pt-2">
            <span className="w-full text-[9px] uppercase tracking-wider text-slate-500">Related</span>
            {concept.related.map(relId => (
              <Concept key={relId} id={relId} />
            ))}
          </div>
        )}
      </>
    ),
  };
}

// ─── Viewport helper ─────────────────────────────────────────────────────

function useIsMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    // Defensive: jsdom's default test environment doesn't implement
    // matchMedia — degrade to the desktop anchored-popover layout rather
    // than throwing, exactly like production would on an environment
    // without matchMedia support.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 639px)');
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

// ─── HoloTip ─────────────────────────────────────────────────────────────

export interface HoloTipProps {
  content: HoloTipContent;
  children: ReactNode;
  /** Element used for the trigger wrapper. Default 'span' so HoloTip can
   *  wrap inline text without breaking flow; pass 'div' for block triggers. */
  as?: 'span' | 'div';
  /** Adds a dotted underline + cyan tint signaling "this is interactive".
   *  Default true — set false when the trigger already looks interactive
   *  (e.g. it's already a styled chip/button). */
  underline?: boolean;
  className?: string;
}

export default function HoloTip({ content, children, as: Tag = 'span', underline = true, className = '' }: HoloTipProps) {
  const [open, setOpen] = useState(false);
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  // Set right before we programmatically .focus() the trigger on Escape —
  // without this, the trigger's own onFocus={doOpen} handler would
  // immediately reopen the panel we just closed.
  const suppressFocusOpen = useRef(false);
  const tipId = useId();
  const isMobile = useIsMobileViewport();

  const clearTimers = () => {
    if (hoverTimer.current) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const doOpen = useCallback(() => {
    if (suppressFocusOpen.current) { suppressFocusOpen.current = false; return; }
    clearTimers();
    setOpen(true);
  }, []);

  const doClose = useCallback(() => {
    clearTimers();
    setOpen(false);
    setCrumbs([]);
  }, []);

  const scheduleOpen = () => {
    clearTimers();
    hoverTimer.current = window.setTimeout(doOpen, 300);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(doClose, 150);
  };

  // ─── Positioning (desktop anchored popover) ─────────────────────────────
  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    function compute() {
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelW = panel?.offsetWidth || 280;
      const panelH = panel?.offsetHeight || 120;
      const margin = 8;
      let left = rect.left + rect.width / 2 - panelW / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin));

      const roomBelow = window.innerHeight - rect.bottom;
      const placement: 'above' | 'below' = roomBelow < panelH + margin && rect.top > panelH + margin ? 'above' : 'below';
      const top = placement === 'below' ? rect.bottom + margin : rect.top - panelH - margin;

      setPos({ top: Math.max(margin, top), left, placement });
    }

    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile, crumbs.length]);

  // Close on outside click/tap and Escape.
  useEffect(() => {
    if (!open) return;
    // mousedown + touchstart (not pointerdown) — broader jsdom/browser
    // support and covers both mouse "tap-out" and touch "tap-outside-close".
    function onOutside(e: Event) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      doClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        doClose();
        suppressFocusOpen.current = true;
        (triggerRef.current as HTMLElement | null)?.focus();
      }
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, doClose]);

  useEffect(() => () => clearTimers(), []);

  const push = useCallback((conceptId: string) => {
    setCrumbs(prev => (prev.length >= MAX_DEPTH ? prev : [...prev, conceptId]));
  }, []);

  const pop = useCallback(() => {
    setCrumbs(prev => prev.slice(0, -1));
  }, []);

  const activeContent = crumbs.length === 0 ? content : (conceptContent(crumbs[crumbs.length - 1]) ?? content);
  const depth = crumbs.length;

  const panel = open ? (
    <HoloTipStackContext.Provider value={{ depth, push }}>
      <div
        ref={panelRef}
        id={tipId}
        role="tooltip"
        className={
          isMobile
            ? 'holotip-panel fixed inset-x-0 bottom-0 z-[120] max-h-[70vh] overflow-y-auto game-scroll hud-frame rounded-t-2xl border-t border-cyan-500/25 bg-[#050510]/98 backdrop-blur-md px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3'
            : 'holotip-panel fixed z-[120] w-[min(88vw,300px)] hud-frame rounded-xl border border-cyan-500/25 bg-[#050510]/98 backdrop-blur-md p-3 shadow-lg'
        }
        style={isMobile ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
        onMouseEnter={clearTimers}
        onMouseLeave={scheduleClose}
        // React bubbles portal content through the REACT tree, not the DOM
        // tree — without this, a click on anything inside the panel (Back,
        // Close, a nested Concept chip) would keep bubbling to the
        // trigger's own onClick below and immediately toggle-close it.
        onClick={(e: ReactMouseEvent) => e.stopPropagation()}
      >
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />

        {isMobile && (
          <div className="flex justify-center pb-2">
            <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden="true" />
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {depth > 0 && (
              <button
                type="button"
                onClick={pop}
                aria-label="Back"
                className="min-w-[28px] min-h-[28px] -ml-1 flex items-center justify-center rounded text-slate-400 hover:text-cyan-300"
              >
                ‹
              </button>
            )}
            {activeContent.icon && <GameIcon name={activeContent.icon} size={16} glow={activeContent.iconGlow ?? 'cyan'} />}
            <span className="game-label text-cyan-300 truncate">{activeContent.title}</span>
          </div>
          <button
            type="button"
            onClick={doClose}
            aria-label="Close"
            className="min-w-[28px] min-h-[28px] shrink-0 flex items-center justify-center rounded text-slate-500 hover:text-white"
          >
            <GameIcon name="close" size={14} label="Close" />
          </button>
        </div>

        {activeContent.body && (
          <div className="text-[11px] leading-relaxed text-slate-300 space-y-1.5">{activeContent.body}</div>
        )}

        {activeContent.rows && activeContent.rows.length > 0 && (
          <dl className="mt-2 space-y-1 border-t border-white/[0.08] pt-2">
            {activeContent.rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-[10px]">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="game-number text-slate-200">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {activeContent.source && (
          <p className="mt-2 border-t border-white/[0.08] pt-1.5 text-[9px] font-mono text-slate-500">{activeContent.source}</p>
        )}
      </div>
    </HoloTipStackContext.Provider>
  ) : null;

  return (
    <Tag
      ref={(el: HTMLElement | null) => { triggerRef.current = el; }}
      tabIndex={0}
      role="button"
      aria-describedby={open ? tipId : undefined}
      aria-expanded={open}
      className={`holotip-trigger ${underline ? 'holo-concept-term' : ''} ${className}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={doOpen}
      onBlur={scheduleClose}
      onClick={(e: ReactMouseEvent) => { e.stopPropagation(); if (open) { doClose(); } else { doOpen(); } }}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (open) { doClose(); } else { doOpen(); } }
      }}
    >
      {children}
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </Tag>
  );
}

// ─── Concept — a term backed by concepts.ts ─────────────────────────────
// Two modes:
//  - Nested (inside an already-open HoloTip's body): renders as a chip/
//    button that pushes onto the SAME tooltip's breadcrumb stack, bounded
//    to MAX_DEPTH.
//  - Standalone (used directly in page content, e.g. ResourceBar prose):
//    renders itself as a fresh HoloTip trigger.

export function Concept({ id, children }: { id: string; children?: ReactNode }) {
  const ctx = useContext(HoloTipStackContext);
  const concept = CONCEPTS[id];

  if (!concept) {
    // Unknown id degrades to plain text rather than a dead/broken control —
    // matches GameIcon's "never throw in render" contract.
    return <>{children}</>;
  }

  if (ctx) {
    if (ctx.depth >= MAX_DEPTH) {
      // Bounded depth reached — render as inert text, still legible.
      return <span className="text-slate-400">{children ?? concept.name}</span>;
    }
    return (
      <button
        type="button"
        onClick={() => ctx.push(id)}
        className="holo-concept-term inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/[0.06] px-1.5 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-500/15"
      >
        {children ?? concept.name}
      </button>
    );
  }

  const fresh = conceptContent(id);
  if (!fresh) return <>{children}</>;
  return (
    <HoloTip content={fresh}>
      {children ?? concept.name}
    </HoloTip>
  );
}
