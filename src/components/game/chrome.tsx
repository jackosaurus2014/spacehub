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

// ─── Frame variants (Wave A1, docs/VISUAL_AAA_2026-08.md §A1.1) ─────────────
// Master of Orion 2's panels are not uniform: a main console, a recessed data
// well, and a caution readout are visibly different pieces of hardware. These
// four variants carry that distinction. They are MEANING, not decoration —
// pick by what the panel IS, never by what looks nice:
//
//   primary   — a top-level command surface. The default; unchanged from V5,
//               so every existing call site keeps its exact appearance.
//   secondary — a data well recessed INTO a primary console. Use for nested
//               sub-panels, read-only readouts, reference tables.
//   alert     — needs a decision or is in a degraded state (shortfall,
//               expiring contract, damaged asset). NON-COMBAT canon: this is
//               a caution rail, never damage/impact/weapon language.
//   inert     — locked, mothballed, unavailable or empty. Reads as "no power".
//
// Colour is never the only carrier: `alert`/`inert` change the bevel geometry
// and (at the call site) the header text, so the variant survives greyscale.

export type FrameVariant = 'primary' | 'secondary' | 'alert' | 'inert';

const VARIANT_CLASS: Record<FrameVariant, string> = {
  primary: '',
  secondary: 'mat-secondary',
  alert: 'mat-alert',
  inert: 'mat-inert',
};

/** HoloCard's CSS baseline is the recessed well, not the raised housing — so
 *  its variant→class map is the mirror of VARIANT_CLASS above. */
const HOLO_CARD_VARIANT_CLASS: Record<FrameVariant, string> = {
  primary: 'mat-primary',
  secondary: '',
  alert: 'mat-alert',
  inert: 'mat-inert',
};

/** Accent implied by a variant when the call site doesn't name one. `alert`
 *  is amber by definition; the rest stay on the house cyan (the `inert`
 *  variant desaturates its own bracket colour in CSS). */
const VARIANT_DEFAULT_ACCENT: Record<FrameVariant, ConsoleAccent> = {
  primary: 'cyan',
  secondary: 'cyan',
  alert: 'amber',
  inert: 'cyan',
};

export interface ResolvedFrame {
  /** Space-separated class list for the frame element. */
  className: string;
  /** Accent actually in force, after variant defaulting. */
  accent: ConsoleAccent;
  /** Whether the decorative edge-hardware layer should be painted. */
  hardware: boolean;
}

/**
 * Pure variant resolution — kept separate from the components so it is
 * unit-testable and so non-chrome surfaces (raw `.hud-frame` consumers) can
 * opt into the same vocabulary without importing React components.
 *
 * Rules:
 *  - An explicit `accent` always wins over the variant's implied accent.
 *  - Hardware detailing (screw dots, edge tick rulers) is painted on raised
 *    housings only. A recessed well or an unpowered panel showing machined
 *    hardware reads as a mistake, so `secondary`/`inert` default to off.
 *  - An explicit `hardware` flag overrides that default in either direction.
 */
export function resolveFrame(
  variant: FrameVariant = 'primary',
  accent?: ConsoleAccent,
  hardware?: boolean,
): ResolvedFrame {
  const resolvedAccent = accent ?? VARIANT_DEFAULT_ACCENT[variant];
  const resolvedHardware = hardware ?? (variant === 'primary' || variant === 'alert');
  const className = ['hud-frame', ACCENT_FRAME[resolvedAccent], VARIANT_CLASS[variant]]
    .filter(Boolean)
    .join(' ');
  return { className, accent: resolvedAccent, hardware: resolvedHardware };
}

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
  /** Wave A1 — frame materiality variant. Defaults to 'primary', which is
   *  byte-identical to the pre-A1 appearance, so existing call sites are
   *  unaffected. See `resolveFrame` for what each variant MEANS. */
  variant?: FrameVariant;
  /** Force the decorative edge-hardware layer on/off. Defaults per variant. */
  hardware?: boolean;
}

/** Top-level "console" wrapper — hud-frame chrome + header band. Compose
 *  hub/section surfaces from this instead of a bare `<div className="card">`. */
export function ConsolePanel({
  title, icon, subtitle, accent, art, right, compact, children, className = '', bodyClassName = '', id, asH3,
  variant = 'primary', hardware,
}: ConsolePanelProps) {
  const Heading = asH3 ? 'h3' : 'h2';
  const frame = resolveFrame(variant, accent, hardware);
  return (
    <div id={id} className={`${frame.className} relative game-panel overflow-hidden ${compact ? 'console-panel-pad-compact' : 'console-panel-pad'} ${className}`}>
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      {/* Decorative machined detailing. Carries zero information by contract
          (CSS drops it entirely on phones and in high-contrast mode), so it
          is unconditionally aria-hidden. */}
      {frame.hardware && <span className="mat-hardware" aria-hidden="true" />}
      {art && (
        <div className="console-art-keyline" aria-hidden="true">
          <img src={art} alt="" loading="lazy" />
        </div>
      )}
      <div className="relative">
        <div className={`hub-section-header mat-rail ${compact ? 'hub-section-header-compact' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span className="hub-section-icon" aria-hidden="true">
                <GameIcon name={icon} size={compact ? 16 : 18} glow={ACCENT_ICON_GLOW[frame.accent]} />
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
  /** Wave A1 — materiality variant. Default 'secondary': a repeated item
   *  inside a console reads as a shallow well stamped into its face. Use
   *  'primary' for cards that are actionable console buttons (build options,
   *  selectable modules), 'alert' for degraded/attention rows, 'inert' for
   *  locked or unaffordable ones. */
  variant?: FrameVariant;
}

/** Lighter-weight card for repeated items nested inside a ConsolePanel
 *  (roster rows, building/module cards, queue entries). game-panel surface
 *  treatment + optional hover lift, no header band of its own. */
export function HoloCard({ children, className = '', interactive, accent = 'cyan', onClick, as = 'div', disabled, ariaLabel, variant = 'secondary' }: HoloCardProps) {
  const borderTint: Record<ConsoleAccent, string> = {
    cyan: 'border-cyan-500/15 hover:border-cyan-500/35',
    amber: 'border-amber-500/15 hover:border-amber-500/35',
    purple: 'border-purple-500/15 hover:border-purple-500/35',
    red: 'border-red-500/15 hover:border-red-500/35',
  };
  // HoloCard's baseline is the RECESSED well (a list row stamped into the
  // console face), the inverse of ConsolePanel's raised housing — so the
  // variant→class map is different here: `secondary` adds nothing (it is the
  // CSS default for `.holo-card`, keeping existing call sites byte-identical)
  // and `primary` has to opt IN to the raised treatment.
  const variantClass = HOLO_CARD_VARIANT_CLASS[variant];
  const base = `holo-card ${variantClass} relative rounded-xl border bg-white/[0.02] transition-colors ${interactive ? `game-card cursor-pointer ${borderTint[accent]}` : 'border-white/[0.06]'} ${className}`;
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

// ─── Numeric readouts (Wave A1, docs/VISUAL_AAA_2026-08.md §A1.2) ───────────
// Master of Orion 2 is legible at a glance because its figures are chunky,
// tabular, and sit next to an icon rather than a word. Three primitives so
// every dense surface composes the same way instead of hand-rolling
// `<span className="font-mono text-sm text-white">`:
//
//   <Figure>       one number, tabular, with an optional smaller unit suffix
//   <StatReadout>  a label + icon + Figure + optional sub-line / trend
//   <FlowValue>    a signed rate, direction carried by BOTH an arrow glyph
//                  and an explicit +/− sign so it survives greyscale
//
// Type floor (V8 canon) holds throughout: labels 10px, figures 11px+.

export interface FigureProps {
  /** The numeral itself, already formatted by the caller's domain formatter
   *  (formatMoney, formatFlow, …) — this primitive never invents formatting. */
  value: ReactNode;
  /** Small trailing unit ("/mo", "u", "%", "MW"). Rendered at 0.72em. */
  unit?: string;
  className?: string;
}

/** A tabular figure. Always `tabular-nums`, so a column of these lines up.
 *  The bright default is applied ONLY when the caller passes no colour of its
 *  own — a base class plus an override class would be a coin-flip, since both
 *  are single-class Tailwind utilities and the cascade would decide. */
export function Figure({ value, unit, className = '' }: FigureProps) {
  // Matches colour utilities (`text-green-400`, `text-white`) but NOT size
  // utilities (`text-lg`, `text-[13px]`), which callers pass routinely.
  const hasTint = /(^|\s)text-(white|black|[a-z]+-\d{2,3})(\s|$)/.test(className);
  return (
    <span className={`mat-figure ${hasTint ? '' : 'text-slate-100'} ${className}`}>
      {value}
      {unit && <span className="mat-unit">{unit}</span>}
    </span>
  );
}

export interface FlowValueProps {
  /** Pre-formatted signed figure — MUST already carry its +/− sign. */
  text: string;
  direction: 'up' | 'down' | 'flat';
  unit?: string;
  /** Screen-reader wording for the direction, e.g. "rising", "falling". */
  srDirection?: string;
  className?: string;
}

const DIRECTION_GLYPH: Record<FlowValueProps['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '■',
};
const DIRECTION_WORD: Record<FlowValueProps['direction'], string> = {
  up: 'rising',
  down: 'falling',
  flat: 'steady',
};

/** A signed rate. Three redundant carriers of direction — the arrow glyph,
 *  the explicit sign inside `text`, and a visually-hidden word — so the
 *  meaning survives colourblindness, greyscale printing, and screen readers
 *  alike (CLAUDE.md: never colour alone). */
export function FlowValue({ text, direction, unit, srDirection, className = '' }: FlowValueProps) {
  return (
    <span className={`mat-trend mat-trend-${direction} ${className}`}>
      <span aria-hidden="true">{DIRECTION_GLYPH[direction]}</span>
      <span>{text}{unit && <span className="mat-unit">{unit}</span>}</span>
      <span className="sr-only">{srDirection ?? DIRECTION_WORD[direction]}</span>
    </span>
  );
}

export interface StatReadoutProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Registry icon rendered inline with the VALUE (not the label) — the
   *  MoO2 "icon belongs to the number" composition. */
  icon?: IconName;
  iconGlow?: GameIconGlow;
  /** Secondary line under the value (context, denominator, timestamp). */
  sub?: ReactNode;
  /** Optional trend token rendered to the right of the value. */
  trend?: FlowValueProps;
  /** Figure size. 'lg' for headline tiles, 'md' (default) for rows. */
  size?: 'md' | 'lg';
  className?: string;
  /** Tint for the figure itself (e.g. `text-green-400` on a revenue tile).
   *  Always redundant with the label — colour never carries the meaning. */
  valueClassName?: string;
}

/** Label-over-value instrument readout. The label is always real text — an
 *  icon never stands in for it. */
export function StatReadout({
  label, value, unit, icon, iconGlow = 'cyan', sub, trend, size = 'md', className = '', valueClassName = '',
}: StatReadoutProps) {
  return (
    <div className={`mat-stat ${className}`}>
      <span className="mat-stat-label">{label}</span>
      <span className="mat-stat-value">
        {icon && <GameIcon name={icon} size={size === 'lg' ? 16 : 13} glow={iconGlow} />}
        <Figure
          value={value}
          unit={unit}
          className={`${size === 'lg' ? 'text-lg sm:text-xl' : 'text-[13px] sm:text-sm'} ${valueClassName}`}
        />
        {trend && <FlowValue {...trend} />}
      </span>
      {sub && <span className="mat-stat-sub">{sub}</span>}
    </div>
  );
}
