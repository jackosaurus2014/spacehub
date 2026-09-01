'use client';

import { useState } from 'react';
import Link from 'next/link';
import { brightnessHint, BRIGHTNESS_LABEL, formatLocalTime, formatLocalDate } from '@/lib/tonight-cities';

// "Use my location" island for /tonight. Asks the browser for coordinates
// (never stored, never sent anywhere but our own /api/whats-overhead), then
// renders that endpoint's real ISS / Tiangong / Hubble pass list in the same
// card shape as the city pages. The city pages themselves need none of this.

interface ApiPass { name: string; startTime: string; maxElevation: number; durationMinutes: number }
interface ApiData { observer: { lat: number; lon: number }; overheadCount: number; upcomingPasses: ApiPass[] }

type State =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: ApiData }
  | { kind: 'error'; message: string };

const BAND_CLASS: Record<ReturnType<typeof brightnessHint>, string> = {
  bright: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  visible: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  faint: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function UseMyLocation() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ kind: 'error', message: 'Your browser does not offer location. Pick a city below instead.' });
      return;
    }
    setState({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setState({ kind: 'loading' });
        try {
          const lat = pos.coords.latitude.toFixed(3);
          const lon = pos.coords.longitude.toFixed(3);
          const res = await fetch(`/api/whats-overhead?lat=${lat}&lon=${lon}`, { headers: { Accept: 'application/json' } });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) throw new Error(json?.error || `HTTP ${res.status}`);
          setState({ kind: 'ready', data: json.data as ApiData });
        } catch (err) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : 'Could not compute passes. Try a city below.' });
        }
      },
      (err) => {
        setState({
          kind: 'error',
          message: err.code === err.PERMISSION_DENIED
            ? 'Location was blocked — no problem, pick the nearest city below.'
            : 'Could not get a position. Pick the nearest city below.',
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  };

  const busy = state.kind === 'locating' || state.kind === 'loading';

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Not near one of these cities?</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Use your exact position for the next 72 hours of ISS, Tiangong and Hubble passes. Coordinates are rounded to ~100 m, used once, and never stored.
          </div>
        </div>
        <button type="button" onClick={locate} disabled={busy} className="btn-primary text-sm py-2 px-4 flex-shrink-0 disabled:opacity-60" aria-live="polite">
          {state.kind === 'locating' ? 'Locating…' : state.kind === 'loading' ? 'Computing…' : 'Use my location'}
        </button>
      </div>

      {state.kind === 'error' && <p className="text-xs text-amber-300 mt-3" role="alert">{state.message}</p>}

      {state.kind === 'ready' && (
        <div className="mt-4">
          <div className="text-xs text-slate-500 mb-2">
            Observer {state.data.observer.lat.toFixed(2)}°, {state.data.observer.lon.toFixed(2)}° — {state.data.overheadCount} tracked objects above your horizon right now.{' '}
            <Link href="/whats-overhead" className="text-cyan-400 hover:text-cyan-300">See them</Link>
          </div>
          {state.data.upcomingPasses.length === 0 ? (
            <p className="text-sm text-slate-400">No passes above 10° in the next 72 hours from here — see the FAQ on any city page for why that happens.</p>
          ) : (
            <ul className="space-y-2" aria-label="Upcoming passes at your location">
              {state.data.upcomingPasses.map((p, i) => {
                const hint = brightnessHint(p.maxElevation);
                return (
                  <li key={`${p.name}-${p.startTime}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                    <span className="font-semibold text-white min-w-[7rem]">{p.name}</span>
                    <span className="text-slate-300">{formatLocalDate(p.startTime)} · rises {formatLocalTime(p.startTime)}</span>
                    <span className="text-slate-400">peak {Math.round(p.maxElevation)}° · {p.durationMinutes} min</span>
                    <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full border ${BAND_CLASS[hint]}`}>{BRIGHTNESS_LABEL[hint]}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            Times in your device&apos;s zone. This quick view lists every geometric pass, day or night — the city pages below also check for darkness and Earth&apos;s shadow.
          </p>
        </div>
      )}
    </div>
  );
}
