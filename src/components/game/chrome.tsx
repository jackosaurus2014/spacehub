'use client';

// ─── Panel Chrome (Wave V5, docs/VISUAL_DEPTH_2026-08.md §V5) ───────────────
// Codifies the AAA "hud-frame + holo" materiality standard into reusable
// wrapper components so new surfaces compose instead of re-deriving Tailwind
// stacks by hand (the drift the V5 audit found: 6 hub panels with ZERO
// hud-frame chrome, LS panels reading as "chip stacks"). Extends
// GameStyles.tsx rather than duplicating its rules — see the
// `.hub-section-header` / `.console-art-keyline` additions there.
//
// Three primitives:
//  - <ConsolePanel>  hud-frame + corner brackets + header band (icon + title
//    + optional subtitle/right-slot) + optional art keyline. The top-level
//    wrapper for a hub/section.
//  - <HoloCard>      game-panel + hover lift. A lighter-weight card for
//    repeated items inside a ConsolePanel (building cards, roster rows, etc)
//    that don't need their own header band.
//  - <DataChip>       small pill for inline stat/status readouts, replacing
//    the ad-hoc `<span className="text-[9px] px-1.5...">` stacks scattered
//    through hub panels.

import type { ReactNode } from 'react';
import GameIcon, { type GameIconGlow } from './GameIcon';
import type { IconName } from '@/lib/game/icons';

export type ConsoleAccent = 'cyan' | 'amber' | 'purple' | 'red';

const ACCENT_FRAME: Record<ConsoleAccent, string> = {
  cyan: '',
  amber: 'hud-frame-amber',
  purple: 'hud-frame-purple',
  red: 'hud-frame-red',
};

const ACCENT_ICON_GLOW: Record<ConsoleAccent, GameIconGlow> = {
  cyan: 'cyan',
  amber: 'amber',
  purple: 'purple',
  red: 'red',
};

export interface ConsolePanelProps {
  /** Header title — always visible text (never icon-only). */
  title: string;
  /** Optional registry icon shown left of the title. */
  icon?: IconName;
  /** One-line description under the title. */
  subtitle?: string;
  /** Accent tint for the corner brackets + icon glow. Default cyan. */
  accent?: ConsoleAccent;
  /** Optional art keyline — a faint full-bleed background image behind the
   *  whole panel (region banner, system vista, etc). Decorative only
   *  (alt=""); content keeps its own contrast via the panel's dark wash. */
  art?: string;
  /** Slot rendered on the header's right side — tab strips, badges, totals. */
  right?: ReactNode;
  /** Compact header — single-line, smaller padding. Use for dense sub-panels
   *  nested inside another ConsolePanel. */
  compact?: boolean;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  /** Forwarded to the header <h2>/<h3> — defaults to false (h2). */
  asH3?: boolean;
}

/** Top-level "console" wrapper — hud-frame chrome + header band. Compose
 *  hub/section surfaces from this instead of a bare `<div className="card">`. */
export function ConsolePanel({
  title, icon, subtitle, accent = 'cyan', art, right, compact, children, className = '', bodyClassName = '', id, asH3,
}: ConsolePanelProps) {
  const Heading = asH3 ? 'h3' : 'h2';
  return (
    <div id={id} className={`hud-frame ${ACCENT_FRAME[accent]} relative game-panel overflow-hidden ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      {art && (
        <div className="console-art-keyline" aria-hidden="true">
          <img src={art} alt="" loading="lazy" />
        </div>
      )}
      <div className="relative">
        <div className={`hub-section-header ${compact ? 'hub-section-header-compact' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span className="hub-section-icon" aria-hidden="true">
                <GameIcon name={icon} size={compact ? 16 : 18} glow={ACCENT_ICON_GLOW[accent]} />
              </span>
            )}
            <div className="min-w-0">
              <Heading className={`font-hud text-white font-bold truncate ${compact ? 'text-[13px]' : 'text-base'}`}>
                {title}
              </Heading>
              {subtitle && !compact && (
                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{subtitle}</p>
              )}
            </div>
          </div>
          {right && <div className="hub-section-header-right">{right}</div>}
        </div>
        {children && <div className={bodyClassName}>{children}</div>}
      </div>
    </div>
  );
}

export interface HoloCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  accent?: ConsoleAccent;
  onClick?: () => void;
  as?: 'div' | 'button';
  disabled?: boolean;
  ariaLabel?: string;
}

/** Lighter-weight card for repeated items nested inside a ConsolePanel
 *  (roster rows, building/module cards, queue entries). game-panel surface
 *  treatment + optional hover lift, no header band of its own. */
export function HoloCard({ children, className = '', interactive, accent = 'cyan', onClick, as = 'div', disabled, ariaLabel }: HoloCardProps) {
  const borderTint: Record<ConsoleAccent, string> = {
    cyan: 'border-cyan-500/15 hover:border-cyan-500/35',
    amber: 'border-amber-500/15 hover:border-amber-500/35',
    purple: 'border-purple-500/15 hover:border-purple-500/35',
    red: 'border-red-500/15 hover:border-red-500/35',
  };
  const base = `holo-card relative rounded-xl border bg-white/[0.02] transition-colors ${interactive ? `game-card cursor-pointer ${borderTint[accent]}` : 'border-white/[0.06]'} ${className}`;
  if (as === 'button') {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={`${base} text-left w-full disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
      </button>
    );
  }
  return (
    <div className={base} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>
      {children}
    </div>
  );
}

export interface DataChipProps {
  children: ReactNode;
  icon?: IconName;
  tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info';
  className?: string;
  title?: string;
}

const CHIP_TONE: Record<NonNullable<DataChipProps['tone']>, string> = {
  neutral: 'text-slate-400 border-white/[0.08] bg-white/[0.02]',
  good: 'text-green-400 border-green-500/25 bg-green-500/8',
  bad: 'text-red-400 border-red-500/25 bg-red-500/8',
  warn: 'text-amber-400 border-amber-500/25 bg-amber-500/8',
  info: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/8',
};

/** Small inline pill for a labeled stat/status readout — replaces ad-hoc
 *  `<span className="text-[9px] px-1.5...">` chip stacks. Text floor: 10px
 *  minimum (V8 canon) since these are frequently load-bearing (affordability,
 *  damage state, tier). */
export function DataChip({ children, icon, tone = 'neutral', className = '', title }: DataChipProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${CHIP_TONE[tone]} ${className}`}
    >
      {icon && <GameIcon name={icon} size={11} />}
      {children}
    </span>
  );
}
