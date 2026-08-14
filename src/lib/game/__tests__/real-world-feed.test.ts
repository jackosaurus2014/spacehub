/**
 * Sol Events real-world feed — pure derivation logic.
 *
 * These functions turn already-fetched real-world data (NOAA space weather,
 * SpaceEvent launch rows, Artemis/Starship news candidates) into the
 * WorldEvent list the game banner renders. No DB/network access — mock data
 * only, so this suite covers the derivation rules precisely.
 */
import {
  deriveSolarStormEvent,
  deriveLaunchWindowEvent,
  deriveMilestoneEvent,
  deriveWorldEventBonuses,
  type SpaceWeatherSnapshot,
  type LaunchEventLite,
  type MilestoneCandidate,
  type WorldEvent,
} from '../real-world-feed';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0); // 2026-08-14 12:00 UTC

function baseWeather(overrides: Partial<SpaceWeatherSnapshot> = {}): SpaceWeatherSnapshot {
  return {
    currentKp: 2,
    stormLevel: 'Quiet',
    kpRefreshedAtMs: NOW - 5 * 60 * 1000,
    flareClass: 'B2.1',
    flareRefreshedAtMs: NOW - 5 * 60 * 1000,
    ...overrides,
  };
}

describe('deriveSolarStormEvent', () => {
  it('returns null when Kp and flare class are both quiet', () => {
    expect(deriveSolarStormEvent(baseWeather(), NOW)).toBeNull();
  });

  it('fires an "elevated" event when Kp >= 5', () => {
    const evt = deriveSolarStormEvent(baseWeather({ currentKp: 5 }), NOW);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe('solar-storm');
    expect(evt!.severity).toBe('elevated');
    expect(evt!.headline).toContain('Kp 5');
    expect(evt!.href).toBe('/space-environment');
  });

  it('fires a "severe" event when Kp >= 7', () => {
    const evt = deriveSolarStormEvent(baseWeather({ currentKp: 8 }), NOW);
    expect(evt!.severity).toBe('severe');
  });

  it('fires an "elevated" event on an M-class flare even with quiet Kp', () => {
    const evt = deriveSolarStormEvent(baseWeather({ flareClass: 'M4.2' }), NOW);
    expect(evt).not.toBeNull();
    expect(evt!.severity).toBe('elevated');
    expect(evt!.headline).toContain('M4.2');
  });

  it('fires a "severe" event on an X-class flare', () => {
    const evt = deriveSolarStormEvent(baseWeather({ flareClass: 'X1.0' }), NOW);
    expect(evt!.severity).toBe('severe');
  });

  it('mentions both conditions when Kp and flare are simultaneously active', () => {
    const evt = deriveSolarStormEvent(baseWeather({ currentKp: 6, flareClass: 'M1.1' }), NOW);
    expect(evt!.headline).toContain('Kp 6');
    expect(evt!.headline).toContain('M1.1');
  });

  it('ignores a C-class flare (not elevated)', () => {
    expect(deriveSolarStormEvent(baseWeather({ flareClass: 'C5.0' }), NOW)).toBeNull();
  });

  it('ignores stale Kp data older than the freshness window', () => {
    const evt = deriveSolarStormEvent(
      baseWeather({ currentKp: 8, kpRefreshedAtMs: NOW - 7 * 60 * 60 * 1000 }),
      NOW,
    );
    expect(evt).toBeNull();
  });

  it('ignores stale flare data older than the freshness window', () => {
    const evt = deriveSolarStormEvent(
      baseWeather({ flareClass: 'X2.0', flareRefreshedAtMs: NOW - 7 * 60 * 60 * 1000 }),
      NOW,
    );
    expect(evt).toBeNull();
  });

  it('produces a real, non-fabricated sourceLabel', () => {
    const evt = deriveSolarStormEvent(baseWeather({ currentKp: 6 }), NOW);
    expect(evt!.sourceLabel).toMatch(/NOAA/i);
  });
});

describe('deriveLaunchWindowEvent', () => {
  function launch(overrides: Partial<LaunchEventLite> = {}): LaunchEventLite {
    return {
      name: 'Falcon 9 | Starlink Group 12-3',
      agency: 'SpaceX',
      launchDateMs: NOW + 30 * 60 * 1000, // 30 min from now
      status: 'upcoming',
      webcastLive: false,
      isLive: false,
      ...overrides,
    };
  }

  it('returns null when there is no nearby launch', () => {
    expect(deriveLaunchWindowEvent([launch({ launchDateMs: NOW + 5 * 60 * 60 * 1000 })], NOW)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(deriveLaunchWindowEvent([], NOW)).toBeNull();
  });

  it('fires an "opening soon" event for a launch within 1h of T-0', () => {
    const evt = deriveLaunchWindowEvent([launch()], NOW);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe('launch-window');
    expect(evt!.headline).toContain('SpaceX: Falcon 9 | Starlink Group 12-3');
    expect(evt!.headline.toLowerCase()).toContain('window opening soon');
    expect(evt!.href).toBe('/live');
  });

  it('fires a "live now" event once T-0 has passed', () => {
    const evt = deriveLaunchWindowEvent([launch({ launchDateMs: NOW - 10 * 60 * 1000 })], NOW);
    expect(evt!.headline.toLowerCase()).toContain('live now');
    expect(evt!.sourceLabel).toBe('Happening now in reality');
  });

  it('fires a "live now" event when explicitly flagged webcastLive, even before T-0', () => {
    const evt = deriveLaunchWindowEvent(
      [launch({ launchDateMs: NOW + 20 * 60 * 1000, webcastLive: true })],
      NOW,
    );
    expect(evt!.headline.toLowerCase()).toContain('live now');
  });

  it('expires 90 minutes after the flagged launch time', () => {
    const t0 = NOW - 10 * 60 * 1000;
    const evt = deriveLaunchWindowEvent([launch({ launchDateMs: t0 })], NOW);
    expect(new Date(evt!.expiresAt).getTime()).toBe(t0 + 90 * 60 * 1000);
  });

  it('excludes scrubbed/completed launches', () => {
    expect(deriveLaunchWindowEvent([launch({ status: 'scrubbed' })], NOW)).toBeNull();
  });

  it('drops out of the window more than 90 minutes after liftoff', () => {
    expect(deriveLaunchWindowEvent([launch({ launchDateMs: NOW - 2 * 60 * 60 * 1000 })], NOW)).toBeNull();
  });

  it('prefers the explicitly live stream over a merely-soon upcoming one', () => {
    const soon = launch({ name: 'Soon Mission', launchDateMs: NOW + 5 * 60 * 1000 });
    const live = launch({ name: 'Live Mission', launchDateMs: NOW - 20 * 60 * 1000, isLive: true });
    const evt = deriveLaunchWindowEvent([soon, live], NOW);
    expect(evt!.headline).toContain('Live Mission');
  });
});

describe('deriveMilestoneEvent', () => {
  function candidate(overrides: Partial<MilestoneCandidate> = {}): MilestoneCandidate {
    return {
      title: 'Orion capsule completes lunar flyby',
      publishedAtMs: NOW - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      program: 'artemis',
      ...overrides,
    };
  }

  it('returns null when there are no candidates', () => {
    expect(deriveMilestoneEvent([], NOW)).toBeNull();
  });

  it('fires an event for a milestone less than 7 days old', () => {
    const evt = deriveMilestoneEvent([candidate()], NOW);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe('milestone');
    expect(evt!.headline).toContain('Orion capsule completes lunar flyby');
    expect(evt!.headline).toContain('Artemis program');
    expect(evt!.href).toBe('/artemis');
  });

  it('routes to /starship for a starship-program candidate', () => {
    const evt = deriveMilestoneEvent(
      [candidate({ program: 'starship', title: 'Starship completes booster catch' })],
      NOW,
    );
    expect(evt!.href).toBe('/starship');
  });

  it('ignores a milestone older than 7 days', () => {
    expect(
      deriveMilestoneEvent([candidate({ publishedAtMs: NOW - 8 * 24 * 60 * 60 * 1000 })], NOW),
    ).toBeNull();
  });

  it('ignores a bogus future-dated article', () => {
    expect(
      deriveMilestoneEvent([candidate({ publishedAtMs: NOW + 60_000 })], NOW),
    ).toBeNull();
  });

  it('picks the newest of multiple fresh candidates', () => {
    const older = candidate({ title: 'Older Artemis update', publishedAtMs: NOW - 5 * 24 * 60 * 60 * 1000 });
    const newer = candidate({
      title: 'Fresh Starship milestone',
      program: 'starship',
      publishedAtMs: NOW - 1 * 60 * 60 * 1000,
    });
    const evt = deriveMilestoneEvent([older, newer], NOW);
    expect(evt!.headline).toContain('Fresh Starship milestone');
  });

  it('expires exactly 7 days after publication', () => {
    const publishedAtMs = NOW - 3 * 24 * 60 * 60 * 1000;
    const evt = deriveMilestoneEvent([candidate({ publishedAtMs })], NOW);
    expect(new Date(evt!.expiresAt).getTime()).toBe(publishedAtMs + 7 * 24 * 60 * 60 * 1000);
  });
});

describe('deriveWorldEventBonuses', () => {
  function makeEvent(type: WorldEvent['type'], expiresAt: string): WorldEvent {
    return {
      id: type,
      type,
      severity: 'notice',
      headline: 'test',
      sourceLabel: 'test',
      href: '/live',
      expiresAt,
    };
  }

  it('returns null when there is no launch-window or milestone event', () => {
    expect(deriveWorldEventBonuses([makeEvent('solar-storm', new Date(NOW + 1000).toISOString())], NOW)).toBeNull();
  });

  it('grants a contract payout bonus while a launch window is active', () => {
    const bonuses = deriveWorldEventBonuses(
      [makeEvent('launch-window', new Date(NOW + 60 * 60 * 1000).toISOString())],
      NOW,
    );
    expect(bonuses).not.toBeNull();
    expect(bonuses!.contractPayoutBonus).toBeCloseTo(0.10);
    expect(bonuses!.researchSpeedBonus).toBe(0);
  });

  it('grants a research speed bonus while a milestone is active', () => {
    const bonuses = deriveWorldEventBonuses(
      [makeEvent('milestone', new Date(NOW + 60 * 60 * 1000).toISOString())],
      NOW,
    );
    expect(bonuses!.researchSpeedBonus).toBeCloseTo(0.10);
    expect(bonuses!.contractPayoutBonus).toBe(0);
  });

  it('grants both bonuses when both event types are active, capped modestly', () => {
    const bonuses = deriveWorldEventBonuses(
      [
        makeEvent('launch-window', new Date(NOW + 60 * 60 * 1000).toISOString()),
        makeEvent('milestone', new Date(NOW + 2 * 60 * 60 * 1000).toISOString()),
      ],
      NOW,
    );
    expect(bonuses!.contractPayoutBonus).toBeCloseTo(0.10);
    expect(bonuses!.researchSpeedBonus).toBeCloseTo(0.10);
    // expiresAtMs should track the later of the two expirations
    expect(bonuses!.expiresAtMs).toBe(NOW + 2 * 60 * 60 * 1000);
  });
});
