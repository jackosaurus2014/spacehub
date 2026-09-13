'use client';

// ─── Time scrubber (graphics Phase 3, item 2) ───────────────────────────────
// docs/GRAPHICS_REVIEW_2026-09-12.md (b) row 1: "drag a scrubber to see
// launch-window alignments ... Scrubber is an <input type=range>; date in
// text." Exactly that, plus the payoff from item 3: tick markers over the
// track for the transfer windows involving the selected body, each one also
// written out in text underneath so nothing is conveyed by tick position or
// colour alone.
//
// PRESENTATION ONLY. The value is a game-month offset from the live game
// date; the renderers use it to place the scene and nothing else reads it.
// While it is non-zero the map shell refuses state-mutating actions — see
// map-time.ts's "Preview refusal" note for why we refuse rather than
// silently snapping back.
//
// Accessibility: a real range input (arrow keys, Home/End, Page Up/Down for
// free), an explicit aria-valuetext so a screen reader hears "Nov 2084, +7
// game months" instead of "7", a Now button that is reachable by keyboard
// and states its target date, and a window list that is plain text. No
// animation, so nothing to gate on reduced motion.

import { useCallback, useId, useMemo } from 'react';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from '../GameIcon';
import {
  SCRUB_MAX_MONTHS,
  SCRUB_MIN_MONTHS,
  SCRUB_RANGE_MONTHS,
  SCRUB_STEP_MONTHS,
  clampScrubMonths,
  describeScrubOffset,
  formatGameMonths,
  gameMonthsForEphemerisMs,
} from '@/lib/game/map-time';
import { formatTransferTime, rootName, type TransferWindow } from '@/lib/game/launch-windows';

export interface TimeScrubberProps {
  /** Fractional game months since the server epoch at the LIVE date. */
  nowMonths: number;
  /** Current offset, game months. 0 = live. */
  scrubMonths: number;
  onScrub: (months: number) => void;
  /** Transfer windows involving the selected body, soonest first. */
  windows?: TransferWindow[];
  /** What the windows are about ("Mars"), for the list heading. */
  subject?: string | null;
  /** Phone strip variant — tighter, no window list (the list lives in the
   *  Location List row and the local-scene chip on small screens). */
  compact?: boolean;
  className?: string;
}

interface Marker {
  key: string;
  offset: number;
  pct: number;
  text: string;
}

export default function TimeScrubber({
  nowMonths, scrubMonths, onScrub, windows, subject, compact = false, className = '',
}: TimeScrubberProps) {
  const id = useId();
  const scrub = clampScrubMonths(scrubMonths);
  const label = formatGameMonths(nowMonths + scrub);
  const previewing = scrub !== 0;

  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [];
    for (const w of windows || []) {
      const offset = gameMonthsForEphemerisMs(w.departMs) - nowMonths;
      if (offset < SCRUB_MIN_MONTHS || offset > SCRUB_MAX_MONTHS) continue;
      out.push({
        key: `${w.fromId}-${w.toId}-${w.departMs}`,
        offset,
        pct: ((offset - SCRUB_MIN_MONTHS) / (SCRUB_MAX_MONTHS - SCRUB_MIN_MONTHS)) * 100,
        text: `${rootName(w.fromId)} to ${rootName(w.toId)}, ${formatGameMonths(nowMonths + offset)}, ${formatTransferTime(w.transferDays)} transit`,
      });
    }
    return out;
  }, [windows, nowMonths]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onScrub(clampScrubMonths(e.currentTarget.valueAsNumber));
  }, [onScrub]);

  const snapNow = useCallback(() => {
    playSound('click');
    onScrub(0);
  }, [onScrub]);

  return (
    <div
      className={`flex items-center gap-1.5 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} ${className}`}
      role="group"
      aria-label="Preview date"
    >
      <GameIcon name="clock" size={13} className={previewing ? 'text-amber-300 shrink-0' : 'text-slate-400 shrink-0'} />
      <div className={`relative ${compact ? 'w-[104px]' : 'w-[150px]'} shrink-0`}>
        <input
          id={`${id}-range`}
          type="range"
          min={SCRUB_MIN_MONTHS}
          max={SCRUB_MAX_MONTHS}
          step={SCRUB_STEP_MONTHS}
          value={scrub}
          onChange={handleChange}
          aria-label={`Preview date: game months from now, up to ${SCRUB_RANGE_MONTHS} either way`}
          aria-valuetext={`${label}, ${describeScrubOffset(scrub)}`}
          aria-describedby={markers.length ? `${id}-windows` : undefined}
          title={`Scrub the map's date without changing anything: ${label} (${describeScrubOffset(scrub)}). Arrow keys step one game month; Home and End jump to the ends.`}
          className="w-full h-[22px] accent-cyan-400 cursor-pointer bg-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
        />
        {/* Transfer-window ticks. Decorative: every one is written out in the
            list below (and in the Location List rows), never position-only. */}
        {markers.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5" aria-hidden="true">
            {markers.map(m => (
              <span
                key={m.key}
                className="absolute top-0 h-1.5 w-[2px] -translate-x-1/2 rounded-sm bg-amber-300/80"
                style={{ left: `${m.pct}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <span
        className={`text-[10px] font-semibold whitespace-nowrap tabular-nums ${previewing ? 'text-amber-200' : 'text-slate-300'}`}
        role="status"
        aria-live="polite"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={snapNow}
        disabled={!previewing}
        title={`Return the map to the live game date (${formatGameMonths(nowMonths)})`}
        className="min-h-[28px] px-1.5 text-[10px] font-semibold rounded border border-white/[0.08] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        Now
      </button>
      {!compact && markers.length > 0 && (
        <p id={`${id}-windows`} className="text-[10px] text-slate-400 max-w-[220px] truncate" title={markers.map(m => m.text).join(' · ')}>
          <span className="text-amber-300" aria-hidden="true">◆</span>{' '}
          {subject ? `${subject} windows: ` : 'Windows: '}
          {markers.map(m => m.text).join(' · ')}
        </p>
      )}
      {markers.length > 0 && (
        <ul className="sr-only" aria-label="Transfer windows on this timeline (Hohmann estimates)">
          {markers.map(m => <li key={m.key}>{m.text}</li>)}
        </ul>
      )}
    </div>
  );
}
