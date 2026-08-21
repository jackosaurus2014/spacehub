'use client';

// ─── Location Detail Console (Wave A2.2) ────────────────────────────────────
// docs/VISUAL_AAA_2026-08.md §A2.2. Sins of a Solar Empire's signature screen:
// the body rendered large, ringed by its orbital structure slots, with the
// numbers that decide things legible at a glance.
//
// Rendering choice — SVG, not a second WebGL context. Mounting a second
// three.js canvas inside a 380px side panel would double the GPU cost of a
// surface that is open most of the session and would break V4's
// "WebGL paused when covered" guarantee (the panel is what covers the map).
// The rendition instead reuses map-bodies.ts's SHARED presentation data —
// BODY_PALETTE for colour/kind/relative size and ATMOSPHERES for the rim —
// so it is the same Mars the 2D and 3D maps draw, one definition site.
//
// Everything numeric comes from map-detail.deriveLocationVitals(), which reads
// the engine's own selectors. Nothing here computes a game figure.
//
// Accessibility contract:
//   • The ring is decorative-by-contract (aria-hidden). The CANONICAL
//     interface is the slot manifest list underneath — real <button>s, real
//     text, keyboard by construction. Clicking an arc and focusing a manifest
//     row drive the same selection state, so the two can never disagree.
//   • Every segment carries colour + line pattern + a glyph + a number + a
//     word. Greyscale-safe.
//   • No animation is introduced (nothing for reduced-motion to disable); the
//     one CSS transition is opacity on hover and is disabled under
//     prefers-reduced-motion by the scoped block below.
//   • 375px: the SVG is width-100% with a fixed viewBox, so it scales; the
//     manifest rows are 44px targets.

import { useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import {
  getBodyPalette,
  getAtmosphere,
  SLOT_SEGMENT_STYLE,
  BODY_KIND_LABEL,
  type SlotRingSegmentKind,
} from '@/lib/game/map-bodies';
import {
  deriveLocationVitals,
  toneGlyph,
  extractionTone,
  demandTone,
  wageTone,
  hazardTone,
  formatPct,
  formatMult,
  type VitalTone,
  type LocationVitals,
} from '@/lib/game/map-detail';
import { LANE_BONUS_CAP } from '@/lib/game/trade-lanes';
import { WAGE_INDEX_NEUTRAL } from '@/lib/game/labor-market';
import { LOCATION_TO_ZONE, ZONE_MAP } from '@/lib/game/zone-influence';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from '../GameIcon';

// Scoped styles — class-prefixed so they cannot collide with the global design
// system (owned by a different wave, do not edit GameStyles.tsx here).
const CONSOLE_CSS = `
.stc-ldc-arc { transition: opacity 120ms ease; cursor: pointer; }
.stc-ldc-arc:hover { opacity: 1 !important; }
.stc-ldc-row:focus-visible { outline: 2px solid #22d3ee; outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) {
  .stc-ldc-arc { transition: none; }
}
`;

// ── SVG geometry ─────────────────────────────────────────────────────────────
// One 200x200 viewBox. Fractions run CLOCKWISE FROM THE TOP, matching
// map-bodies.SlotRingSegment's documented convention exactly.

const VB = 200;
const CX = VB / 2;
const CY = VB / 2;
const RING_R = 74;
const HAZARD_R = 88;

function polar(r: number, frac: number): { x: number; y: number } {
  const a = frac * Math.PI * 2 - Math.PI / 2;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}

/** Stroked arc between two circle fractions. Full circles are handled by the
 *  caller (SVG's A command cannot close a 360° arc in one go). */
export function arcPath(r: number, startFrac: number, endFrac: number): string {
  const a = polar(r, startFrac);
  const b = polar(r, endFrac);
  const large = endFrac - startFrac > 0.5 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** Body radius in viewBox units, from the SHARED palette's relative size cue
 *  (3px pip … 22px Jupiter → 22 … 46). Keeps the map's size ordering. */
export function bodyRadiusFor(baseRadius: number): number {
  const t = Math.max(0, Math.min(1, (baseRadius - 3) / (22 - 3)));
  return 22 + t * 24;
}

const TONE_TEXT: Record<VitalTone, string> = {
  neutral: 'text-slate-300',
  good: 'text-emerald-300',
  caution: 'text-amber-300',
  bad: 'text-red-300',
};

type RingSelection =
  | { kind: 'segment'; segment: SlotRingSegmentKind }
  | { kind: 'occupant'; instanceId: string }
  | null;

export interface LocationDetailConsoleProps {
  state: GameState;
  locationId: string;
  /** Optional deep-link out of the console into the hub tabs that own the
   *  full detail for these figures. */
  onNavigate?: (target: 'market' | 'workforce') => void;
}

export default function LocationDetailConsole({ state, locationId, onNavigate }: LocationDetailConsoleProps) {
  const [selected, setSelected] = useState<RingSelection>(null);

  const vitals: LocationVitals = useMemo(
    () => deriveLocationVitals(state, locationId, Date.now()),
    [state, locationId],
  );

  const loc = LOCATION_MAP.get(locationId);
  const palette = getBodyPalette(locationId);
  const atmo = getAtmosphere(locationId);
  const bodyR = bodyRadiusFor(palette.baseRadius);

  const zoneSlug = LOCATION_TO_ZONE.get(locationId);
  const standing = zoneSlug
    ? (state.zoneStandings || []).find(z => z.zoneSlug === zoneSlug && (z.isGovernor || z.sharePct >= 1))
    : undefined;
  const zoneName = zoneSlug ? ZONE_MAP.get(zoneSlug)?.name || zoneSlug : '';
  // Rim tint by standing — ALWAYS paired with the glyph + wording below, never
  // the only carrier (governor ♛ / stakeholder ◆, matching the map's labels).
  const rimColor = standing ? (standing.isGovernor ? '#f59e0b' : '#22d3ee') : null;

  const slots = vitals.slots;
  const hazardTint = hazardTone(vitals.hazard);
  const hasHazardBand = vitals.hazard.warnings.length > 0;

  const selectedOccupant = selected?.kind === 'occupant'
    ? slots?.occupants.find(o => o.instanceId === selected.instanceId) || null
    : null;
  const selectedSegment = selected?.kind === 'segment' ? selected.segment : null;

  // What the readout under the ring says right now.
  const readout = (() => {
    if (selectedOccupant) {
      return {
        title: selectedOccupant.name,
        body: `Occupies one ${slots?.ring.pool.label} slot at ${vitals.name}. Category: ${selectedOccupant.category.replace(/_/g, ' ')}.`,
      };
    }
    if (selectedSegment && slots) {
      const r = slots.ring;
      if (selectedSegment === 'yours') {
        return {
          title: `Yours — ${r.yours} of ${r.total}`,
          body: r.yours === 0
            ? 'You hold no slots here yet.'
            : `${r.yours} operational construction${r.yours === 1 ? '' : 's'} of yours are station-keeping in this pool. Mothballed and decommissioning builds release their slot.`,
        };
      }
      if (selectedSegment === 'others') {
        return {
          title: `Other corporations — ${r.others} of ${r.total}`,
          body: r.synced
            ? 'The server publishes an occupancy COUNT for this pool, not a roster — who holds these slots is not knowable from here.'
            : 'System-wide occupancy has not synced yet, so rival occupancy is unknown. Only your own footprint is shown.',
        };
      }
      return {
        title: `Free — ${r.free} of ${r.total}`,
        body: r.saturated
          ? 'Pool is saturated: a slot-lease auction is required to build here.'
          : `${r.free} slot${r.free === 1 ? '' : 's'} remain unclaimed across every corporation.`,
      };
    }
    if (slots) return { title: slots.ring.pool.label, body: slots.ring.srText };
    return {
      title: `${loc?.name || locationId} — no finite orbital pool`,
      body: 'This location has no scarce orbital-slot inventory: construction here is not slot-gated.',
    };
  })();

  const pick = (sel: RingSelection) => { playSound('click'); setSelected(sel); };

  return (
    <div className="hud-frame rounded-xl border border-white/[0.08] bg-[#05050f]/85 overflow-hidden">
      <style>{CONSOLE_CSS}</style>

      {/* ── The body + its orbital ring ───────────────────────────────────── */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`${vitals.name} — ${BODY_KIND_LABEL[palette.kind]}${atmo ? `. ${atmo.label}` : '. Airless'}${slots ? `. ${slots.ring.srText}` : ''}`}
        >
          <defs>
            <radialGradient id={`ldc-body-${locationId}`} cx="38%" cy="32%" r="72%">
              <stop offset="0%" stopColor={palette.color} stopOpacity="1" />
              <stop offset="58%" stopColor={palette.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor="#04040c" stopOpacity="0.95" />
            </radialGradient>
            {atmo && (
              <radialGradient id={`ldc-atmo-${locationId}`} cx="50%" cy="50%" r="50%">
                <stop offset="72%" stopColor={atmo.color} stopOpacity="0" />
                <stop offset="92%" stopColor={atmo.color} stopOpacity={atmo.opacity} />
                <stop offset="100%" stopColor={atmo.color} stopOpacity="0" />
              </radialGradient>
            )}
          </defs>

          {/* Hazard exposure band — an OUTER dashed ring, amber, only when the
              engine actually forecasts a hazard here. Text twin below. */}
          {hasHazardBand && (
            <circle
              cx={CX} cy={CY} r={HAZARD_R}
              fill="none"
              stroke={hazardTint === 'bad' ? '#f87171' : '#fbbf24'}
              strokeWidth={1.4}
              strokeDasharray="3 5"
              opacity={0.75}
            />
          )}

          {/* Atmospheric shell (shared ATMOSPHERES table). */}
          {atmo && (
            <circle
              cx={CX} cy={CY} r={bodyR * atmo.shellScale * 1.18}
              fill={`url(#ldc-atmo-${locationId})`}
            />
          )}

          {/* The body. */}
          <circle cx={CX} cy={CY} r={bodyR} fill={`url(#ldc-body-${locationId})`} />
          {/* Standing rim tint (glyph + wording carry the same information). */}
          <circle
            cx={CX} cy={CY} r={bodyR}
            fill="none"
            stroke={rimColor || `${palette.glowColor}`}
            strokeWidth={rimColor ? 2 : 1}
            opacity={rimColor ? 0.9 : 0.45}
          />

          {/* ── Orbital slot ring ─────────────────────────────────────────── */}
          {slots && slots.ring.segments.map(seg => {
            const style = SLOT_SEGMENT_STYLE[seg.kind];
            const full = seg.endFrac - seg.startFrac >= 0.999;
            const isSel = selectedSegment === seg.kind;
            const common = {
              className: 'stc-ldc-arc',
              fill: 'none' as const,
              stroke: style.color,
              strokeWidth: 3 + style.weight * 4 + (isSel ? 2 : 0),
              strokeDasharray: style.dash.length ? style.dash.join(' ') : undefined,
              strokeLinecap: 'butt' as const,
              opacity: isSel ? 1 : 0.7,
              onClick: () => pick({ kind: 'segment', segment: seg.kind }),
            };
            return full
              ? <circle key={seg.kind} cx={CX} cy={CY} r={RING_R} {...common} />
              : <path key={seg.kind} d={arcPath(RING_R, seg.startFrac, seg.endFrac)} {...common} />;
          })}

          {/* Per-building ticks INSIDE the 'yours' arc — each one is a real
              building instance (map-detail.deriveSlotRingDetail). */}
          {slots && slots.occupants.map(o => {
            const mid = (o.startFrac + o.endFrac) / 2;
            const a = polar(RING_R - 8, mid);
            const b = polar(RING_R + 8, mid);
            const isSel = selectedOccupant?.instanceId === o.instanceId;
            return (
              <line
                key={o.instanceId}
                className="stc-ldc-arc"
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isSel ? '#ffffff' : '#e0f7ff'}
                strokeWidth={isSel ? 2.6 : 1.3}
                opacity={isSel ? 1 : 0.85}
                onClick={() => pick({ kind: 'occupant', instanceId: o.instanceId })}
              />
            );
          })}

          {/* Ring tick marks at the quarters — an orientation cue, not data. */}
          {slots && [0, 0.25, 0.5, 0.75].map(f => {
            const a = polar(RING_R + 12, f);
            const b = polar(RING_R + 15, f);
            return <line key={f} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#334155" strokeWidth={1} />;
          })}
        </svg>

        {/* Body identity plate — text, always present, never inferred from the
            picture. */}
        <div className="absolute left-2 top-2 max-w-[70%]">
          <div className="text-[11px] font-hud font-bold text-white leading-tight truncate">{vitals.name}</div>
          <div className="text-[10px] text-slate-400 leading-tight">
            {BODY_KIND_LABEL[palette.kind]}
            {loc ? ` · T${loc.tier} · ${loc.distanceFromEarthAU} AU` : ''}
          </div>
          {atmo && <div className="text-[10px] text-slate-500 leading-tight truncate">{atmo.label}</div>}
        </div>

        {standing && (
          <div className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded border"
               style={{ color: rimColor || undefined, borderColor: `${rimColor}55` }}>
            <span aria-hidden="true">{standing.isGovernor ? '♛' : '◆'}</span>{' '}
            {standing.isGovernor ? 'Governor' : 'Stakeholder'} · {zoneName}
          </div>
        )}
      </div>

      {/* ── Ring readout ──────────────────────────────────────────────────── */}
      <div className="px-2.5 py-1.5 border-t border-white/[0.06] bg-white/[0.02]" role="status" aria-live="polite">
        <div className="text-[11px] font-semibold text-white">{readout.title}</div>
        <div className="text-[10px] text-slate-400 leading-snug">{readout.body}</div>
      </div>

      {/* ── Slot manifest — the CANONICAL keyboard/screen-reader interface ── */}
      {slots && (
        <div className="p-2 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <GameIcon name="target" size={11} /> Orbital Slots — {slots.ring.badge}
          </div>
          <ul className="space-y-0.5" aria-label={`Orbital slot occupancy at ${vitals.name}`}>
            {(['yours', 'others', 'free'] as SlotRingSegmentKind[]).map(kind => {
              const style = SLOT_SEGMENT_STYLE[kind];
              const count = kind === 'yours' ? slots.ring.yours : kind === 'others' ? slots.ring.others : slots.ring.free;
              const patternWord = kind === 'yours' ? 'solid arc' : kind === 'others' ? 'dashed arc' : 'dotted arc';
              const unknown = kind !== 'yours' && !slots.ring.synced;
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => pick({ kind: 'segment', segment: kind })}
                    aria-pressed={selectedSegment === kind}
                    className={`stc-ldc-row w-full min-h-[44px] flex items-center gap-2 px-2 rounded-lg border text-left ${
                      selectedSegment === kind
                        ? 'border-cyan-500/45 bg-cyan-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-4 h-0 border-t-2"
                      style={{
                        borderColor: style.color,
                        borderTopStyle: kind === 'yours' ? 'solid' : kind === 'others' ? 'dashed' : 'dotted',
                      }}
                    />
                    <span className="flex-1 min-w-0 text-[11px] text-slate-200">{style.label}</span>
                    <span className="font-mono text-[11px] tabular-nums shrink-0"
                          style={{ color: style.color }}>
                      {unknown ? '—' : count}
                    </span>
                    <span className="sr-only">
                      {style.label}, {patternWord}, {unknown ? 'unknown — system-wide occupancy has not synced' : `${count} of ${slots.ring.total} slots`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {slots.occupants.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-2 mb-1">
                Your slot occupants
              </div>
              <ul className="space-y-0.5 max-h-[132px] overflow-y-auto game-scroll" aria-label="Buildings occupying your orbital slots here">
                {slots.occupants.map(o => (
                  <li key={o.instanceId}>
                    <button
                      type="button"
                      onClick={() => pick({ kind: 'occupant', instanceId: o.instanceId })}
                      aria-pressed={selectedOccupant?.instanceId === o.instanceId}
                      className={`stc-ldc-row w-full min-h-[44px] flex items-center gap-2 px-2 rounded-lg border text-left ${
                        selectedOccupant?.instanceId === o.instanceId
                          ? 'border-cyan-500/45 bg-cyan-500/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="flex-1 min-w-0 text-[11px] text-slate-200 truncate">{o.name}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 capitalize">{o.category.replace(/_/g, ' ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {slots.truncated > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  +{slots.truncated} further occupant{slots.truncated === 1 ? '' : 's'} not individually marked on the ring.
                </p>
              )}
            </>
          )}

          {slots.ring.saturated && (
            <p className="text-[10px] text-amber-300 mt-1.5">
              <span aria-hidden="true">▲</span> Pool saturated — a slot-lease auction is required to build here
              (Map HUD → Spatial Strategy → Orbital Slots).
            </p>
          )}
        </div>
      )}

      {/* ── Vitals (MoO2 ledger: icon inline with the value, tabular) ─────── */}
      <VitalsGrid vitals={vitals} onNavigate={onNavigate} />
    </div>
  );
}

function VitalRow({ icon, label, value, glyph, tone, sub }: {
  icon: Parameters<typeof GameIcon>[0]['name'];
  label: string;
  value: string;
  glyph: string;
  tone: VitalTone;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2 px-2 py-1 rounded bg-white/[0.02]">
      <span className="shrink-0 mt-0.5 text-slate-400"><GameIcon name={icon} size={12} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] text-slate-500 leading-tight">{label}</span>
        {sub && <span className="block text-[10px] text-slate-600 leading-tight">{sub}</span>}
      </span>
      <span className={`shrink-0 font-mono text-[11px] tabular-nums ${TONE_TEXT[tone]}`}>
        <span aria-hidden="true">{glyph}</span> {value}
      </span>
    </div>
  );
}

function VitalsGrid({ vitals, onNavigate }: { vitals: LocationVitals; onNavigate?: (t: 'market' | 'workforce') => void }) {
  const { extraction, demand, labor, lanes, chokepoint, hazard, toll } = vitals;
  const bestLane = lanes.find(l => l.bonusPct > 0.001) || null;

  return (
    <div className="p-2 border-t border-white/[0.06] space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Location Vitals</div>

      <div className="space-y-0.5">
        {extraction.length > 0 && extraction.slice(0, 4).map(e => (
          <VitalRow
            key={e.resourceId}
            icon="bld-mining"
            label={`${e.resourceName} deposit`}
            sub={`Extraction pressure — ${e.grade.label}`}
            value={formatMult(e.pressure)}
            glyph={toneGlyph(extractionTone(e.pressure))}
            tone={extractionTone(e.pressure)}
          />
        ))}

        {demand.length > 0 && demand.slice(0, 4).map(d => (
          <VitalRow
            key={d.category}
            icon="market"
            label={`${d.label} demand pool`}
            sub={`${formatMoney(d.dTotal)}/mo · ${d.supplierCount} supplier${d.supplierCount === 1 ? '' : 's'} · your share ${formatPct(d.playerShare)}`}
            value={formatMult(d.mult)}
            glyph={toneGlyph(demandTone(d.mult))}
            tone={demandTone(d.mult)}
          />
        ))}

        {labor.length > 0 && labor.map(l => (
          <VitalRow
            key={l.type}
            icon="workforce"
            label={`${l.label} wage index`}
            sub={`System-wide labour market · you employ ${l.employed}`}
            value={`${l.wageIndex.toFixed(2)}x`}
            glyph={toneGlyph(wageTone(l.wageIndex))}
            tone={wageTone(l.wageIndex)}
          />
        ))}

        <VitalRow
          icon="cargo-truck"
          label={`Lane connections — ${lanes.length}`}
          sub={bestLane
            ? `Best traffic discount: ${bestLane.otherName} ${formatPct(bestLane.bonusPct, 1)} (cap ${formatPct(LANE_BONUS_CAP)})`
            : lanes.length > 0 ? 'No lane here has earned a traffic discount yet' : 'No canonical lane terminates here'}
          value={bestLane ? formatPct(bestLane.bonusPct, 1) : '0%'}
          glyph={toneGlyph(bestLane ? 'good' : 'neutral')}
          tone={bestLane ? 'good' : 'neutral'}
        />

        {chokepoint && (
          <VitalRow
            icon="target"
            label={`Chokepoint — ${chokepoint.severity}`}
            sub={`${chokepoint.laneCount} lanes converge · ${chokepoint.premium.toFixed(2)}x premium on slot bids and freight`}
            value={`${chokepoint.premium.toFixed(2)}x`}
            glyph={toneGlyph('caution')}
            tone="caution"
          />
        )}

        <VitalRow
          icon="shield"
          label="Hazard exposure"
          sub={
            hazard.warnings.length > 0
              ? `${hazard.warnings.length} forecast warning${hazard.warnings.length === 1 ? '' : 's'}${hazard.recentStrikes > 0 ? ` · ${hazard.recentStrikes} recent strike${hazard.recentStrikes === 1 ? '' : 's'}` : ''}`
              : hazard.recentStrikes > 0
                ? `No forecast warning · ${hazard.recentStrikes} recent strike${hazard.recentStrikes === 1 ? '' : 's'} (worst: ${hazard.worstRecentSeverity})`
                : 'No forecast warning here'
          }
          value={hazard.shielding > 0 ? `${formatPct(hazard.shielding)} shielded` : 'unshielded'}
          glyph={toneGlyph(hazardTone(hazard))}
          tone={hazardTone(hazard)}
        />

        {toll && (
          <VitalRow
            icon="money"
            label={`Freight toll — ${toll.zoneName}`}
            sub={toll.exempt
              ? (toll.exemptReason || 'Exempt')
              : `Posted by ${toll.governorName || 'the zone governor'} on cargo value crossing this zone`}
            value={toll.exempt ? 'exempt' : formatPct(toll.tollPct, 1)}
            glyph={toneGlyph(toll.exempt ? 'good' : 'caution')}
            tone={toll.exempt ? 'good' : 'caution'}
          />
        )}
      </div>

      {(demand.length === 0 || labor.length === 0) && (
        <p className="text-[10px] text-slate-600 leading-snug">
          {demand.length === 0 && 'No demand-pool snapshot has synced for this location yet. '}
          {labor.length === 0 && `Labour index is neutral (${WAGE_INDEX_NEUTRAL.toFixed(2)}x) and you employ no crew.`}
        </p>
      )}

      <details className="text-[10px] text-slate-500">
        <summary className="cursor-pointer hover:text-slate-400 min-h-[24px] flex items-center">
          What this console does not show
        </summary>
        <ul className="pl-4 mt-1 space-y-0.5" style={{ listStyle: 'disc' }}>
          {vitals.omitted.map(o => <li key={o}>{o}</li>)}
        </ul>
      </details>

      {onNavigate && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => { playSound('click'); onNavigate('market'); }}
            className="flex-1 min-h-[44px] px-2 rounded-lg text-[10px] font-medium text-cyan-300/80 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30"
          >
            Demand map →
          </button>
          <button
            type="button"
            onClick={() => { playSound('click'); onNavigate('workforce'); }}
            className="flex-1 min-h-[44px] px-2 rounded-lg text-[10px] font-medium text-cyan-300/80 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30"
          >
            Labour market →
          </button>
        </div>
      )}
    </div>
  );
}
