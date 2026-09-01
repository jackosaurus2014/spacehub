import type { ReactNode } from 'react';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Provenance from '@/components/ui/Provenance';
import { formatUtcHHMM } from '@/components/ui/StatusBadge';
import {
  getLaunchWeatherOdds,
  isNwsCovered,
  resolvePadCoords,
  siteDisplayName,
  weatherWindowOpen,
  ODDS_METHOD,
  type LaunchWeatherCriterion,
  type RangeStatus,
} from '@/lib/launch-weather';

// Server-rendered weather odds strip for /launch/[eventId]: the number every
// fan wants, in the HTML before the client dashboard hydrates. Renders only
// inside the NWS hourly horizon (7 days) for launches that have not flown.
// Status is carried by word + pip shape, never colour alone.

export interface LaunchWeatherOddsProps {
  event: {
    id: string;
    status: string;
    launchDate: Date | null;
    location: string | null;
    padLatitude: number | null;
    padLongitude: number | null;
  };
  now?: Date;
}

const PIP: Record<RangeStatus, { state: PipState; word: string }> = {
  green: { state: 'go', word: 'GO' },
  yellow: { state: 'hold', word: 'CAUTION' },
  red: { state: 'scrub', word: 'NO-GO' },
};

// Shape per state (check / hollow diamond / slashed circle) so the list reads
// without colour — mirrors StatusPip's glyph language.
const GLYPH: Record<LaunchWeatherCriterion['status'], string> = { go: '✓', caution: '◇', no_go: '⊘' };
const WORD: Record<LaunchWeatherCriterion['status'], string> = { go: 'GO', caution: 'CAUTION', no_go: 'NO-GO' };

function Shell({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Launch weather" className="max-w-[1400px] mx-auto px-4 mb-6">
      <div className="rounded-lg border border-white/[0.08] bg-black/60 px-4 py-3">{children}</div>
    </section>
  );
}

export default async function LaunchWeatherOdds({ event, now = new Date() }: LaunchWeatherOddsProps) {
  if (!weatherWindowOpen(event.status, event.launchDate, now)) return null;

  const coords = resolvePadCoords({ padLatitude: event.padLatitude, padLongitude: event.padLongitude, location: event.location });
  const siteName = siteDisplayName(coords, event.location);

  if (!coords || !isNwsCovered(coords)) {
    return (
      <Shell>
        <p className="text-[14px] text-[var(--ink-2)]">
          <span className="font-medium text-[var(--ink)]">Weather:</span> no forecast source for {siteName} yet.
          {coords ? ' Our only launch-weather feed (US National Weather Service) does not cover this range.' : ' We do not have pad coordinates for this launch.'}
        </p>
        <Provenance source="SpaceNexus · NWS coverage is US ranges only" className="mt-1" />
      </Shell>
    );
  }

  const odds = await getLaunchWeatherOdds(event.id, coords, event.launchDate);
  if (!odds) {
    return (
      <Shell>
        <p className="text-[14px] text-[var(--ink-2)]">
          <span className="font-medium text-[var(--ink)]">Weather:</span> forecast unavailable right now for {siteName}. No numbers are shown rather than a guess.
        </p>
        <Provenance source="NWS (api.weather.gov)" className="mt-1" />
      </Shell>
    );
  }

  const pip = PIP[odds.status];
  const w = odds.weather;
  const forecastStamp = formatUtcHHMM(odds.forecastFor);
  const fetchedStamp = formatUtcHHMM(odds.fetchedAt);

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusPip state={pip.state} label={pip.word} />
        <p className="text-[14px] text-[var(--ink)]">
          <span className="font-medium">Weather: {odds.oddsPct}% {pip.word}</span>
          <span className="text-[var(--ink-2)]">
            {' · '}winds {w.windSpeed} kt {w.windDirection}
            {' · '}clouds {w.cloudCover}%
            {' · '}precip {w.precipitation}%
            {' · '}{w.temperature}&deg;F
            {' · '}NWS{fetchedStamp ? `, updated ${fetchedStamp}` : ''}
          </span>
        </p>
      </div>
      <details className="mt-2 group">
        <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ink-3)] hover:text-[var(--ink-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal)]">
          {odds.criteria.length} weather constraints{forecastStamp ? ` · forecast hour ${forecastStamp}` : ''} <span aria-hidden="true" className="group-open:hidden">&#9656;</span><span aria-hidden="true" className="hidden group-open:inline">&#9662;</span>
        </summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {odds.criteria.map((c) => (
            <li key={c.name} className="flex items-baseline gap-2 text-[13px]" data-status={c.status}>
              <span aria-hidden="true" className="font-mono text-[12px] text-[var(--ink-3)]">{GLYPH[c.status]}</span>
              <span className="text-[var(--ink)]">{c.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-2)]">{WORD[c.status]}</span>
              <span className="text-[var(--ink-3)] truncate">{c.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-[var(--ink-3)]">
          {w.shortForecast ? `NWS wording: "${w.shortForecast}". ` : ''}Odds method: {ODDS_METHOD}. Not the range weather squadron&apos;s probability of violation.
        </p>
      </details>
      <Provenance source={`NWS hourly forecast (api.weather.gov) · pad ${odds.coords.source === 'pad' ? 'coordinates from the launch record' : `representative pad for ${siteName}`}`} asOf={odds.fetchedAt} className="mt-2" />
    </Shell>
  );
}
