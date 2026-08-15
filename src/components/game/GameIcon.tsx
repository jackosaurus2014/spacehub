'use client';

// ─── GameIcon (Wave V1, docs/VISUAL_DEPTH_2026-08.md §V1) ───────────────────
// Single render surface for the icons.tsx registry. Renders a tiny inline
// <svg> per instance (no mounted DOM sprite — see icons.tsx header for why),
// 24x24 grid, stroke-based, currentColor so it inherits the surrounding
// text/accent color and themes automatically with GameStyles.tsx.
//
// Accessibility contract (CLAUDE.md a11y canon):
//   - Decorative icon (default): wrapper is aria-hidden, nothing announced.
//   - Meaningful icon: pass `label` — renders a visually-hidden text node
//     so screen readers get real words, never an icon-only signal.
// Colorblind safety: every glyph in the registry is shape-first; `glow`
// only adds a CSS drop-shadow tint, it never carries meaning on its own.

import { ICONS, type IconName } from '@/lib/game/icons';

export type GameIconGlow = 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'none';

export interface GameIconProps {
  name: IconName;
  /** Pixel size (square). Default 16 — inline with body/label text. */
  size?: number;
  className?: string;
  glow?: GameIconGlow;
  /** Stroke weight override. Default 1.5 (matches hud-frame bracket weight). */
  strokeWidth?: number;
  /** When set, the icon is treated as MEANINGFUL: a visually-hidden text
   *  node with this string is rendered for screen readers, and the icon is
   *  no longer aria-hidden. Omit for purely decorative icons (the default —
   *  matches the overwhelming majority of call sites, which sit next to
   *  their own visible text label already). */
  label?: string;
  title?: string;
}

const GLOW_FILTER: Record<Exclude<GameIconGlow, 'none'>, string> = {
  cyan: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.65))',
  purple: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.65))',
  green: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.65))',
  amber: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.65))',
  red: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.65))',
};

export default function GameIcon({ name, size = 16, className = '', glow = 'none', strokeWidth = 1.5, label, title }: GameIconProps) {
  const def = ICONS[name];
  // Never throw in render — an unknown/renamed icon id degrades to nothing
  // rather than crashing the panel around it.
  if (!def) return null;

  const decorative = !label;

  return (
    <span
      className={`game-icon inline-flex shrink-0 items-center justify-center leading-none align-middle ${className}`}
      style={{ width: size, height: size, filter: glow !== 'none' ? GLOW_FILTER[glow] : undefined }}
      aria-hidden={decorative ? true : undefined}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {def.els.map((el, i) => {
          switch (el.e) {
            case 'path':
              return <path key={i} d={el.d} fill={el.fill === 'currentColor' ? 'currentColor' : 'none'} stroke={el.fill === 'currentColor' ? 'none' : undefined} />;
            case 'circle':
              return <circle key={i} cx={el.cx} cy={el.cy} r={el.r} fill={el.fill === 'currentColor' ? 'currentColor' : 'none'} stroke={el.fill === 'currentColor' ? 'none' : undefined} />;
            case 'rect':
              return <rect key={i} x={el.x} y={el.y} width={el.w} height={el.h} rx={el.rx ?? 0} fill={el.fill === 'currentColor' ? 'currentColor' : 'none'} stroke={el.fill === 'currentColor' ? 'none' : undefined} />;
            case 'line':
              return <line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} />;
            case 'polyline':
              return <polyline key={i} points={el.points} fill="none" />;
            case 'polygon':
              return <polygon key={i} points={el.points} fill={el.fill === 'currentColor' ? 'currentColor' : 'none'} stroke={el.fill === 'currentColor' ? 'none' : undefined} />;
            default:
              return null;
          }
        })}
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
    </span>
  );
}
