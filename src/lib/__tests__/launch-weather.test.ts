/**
 * @jest-environment node
 */

// Launch weather odds: pad-coordinate precedence, criteria → status/odds,
// non-US ranges return null (no simulated fallback, no fetch), and the NWS
// hourly parse against a mocked api.weather.gov.

jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  resolvePadCoords,
  siteSlugForWeather,
  isNwsCovered,
  evaluateCriteria,
  statusFromCriteria,
  oddsFromCriteria,
  parsePeriod,
  pickPeriod,
  getLaunchWeatherOdds,
  weatherWindowOpen,
  type WeatherObservation,
  type NWSHourlyPeriod,
} from '../launch-weather';
import { SITE_PADS } from '../launch-viewing-cities';
import { LAUNCH_SITES } from '../launch-site-registry';

const clear: WeatherObservation = {
  windSpeed: 8, windDirection: 'E', temperature: 78, cloudCover: 10, lightningRisk: 'none',
  precipitation: 5, visibility: 10, humidity: 60, shortForecast: 'Sunny',
};

describe('resolvePadCoords', () => {
  it('prefers the event pad coordinates over the site pad', () => {
    const r = resolvePadCoords({ padLatitude: 28.6082, padLongitude: -80.6041, location: 'Kennedy Space Center, FL, USA' });
    expect(r).toEqual({ lat: 28.6082, lon: -80.6041, source: 'pad', siteSlug: 'cape-canaveral' });
  });

  it('falls back to the registry site pad when the event has no coordinates', () => {
    const r = resolvePadCoords({ padLatitude: null, padLongitude: null, location: 'Vandenberg SFB, CA, USA' });
    expect(r).toEqual({ lat: SITE_PADS.vandenberg.lat, lon: SITE_PADS.vandenberg.lon, source: 'site', siteSlug: 'vandenberg' });
  });

  it('rejects 0,0 and out-of-range pad values and uses the site instead', () => {
    expect(resolvePadCoords({ padLatitude: 0, padLongitude: 0, location: 'Wallops Island, VA' })?.source).toBe('site');
    expect(resolvePadCoords({ padLatitude: 999, padLongitude: 0, location: 'Wallops Island, VA' })?.source).toBe('site');
  });

  it('returns null when neither pad nor site is known', () => {
    expect(resolvePadCoords({ location: 'Somewhere, Antarctica' })).toBeNull();
    expect(resolvePadCoords({})).toBeNull();
  });

  it('matches common US location variants the registry misses', () => {
    expect(siteSlugForWeather('Boca Chica, TX')).toBe('starbase');
    expect(siteSlugForWeather('SLC-40, CCSFS')).toBe('cape-canaveral');
    expect(siteSlugForWeather('VSFB SLC-4E')).toBe('vandenberg');
    expect(siteSlugForWeather('Guiana Space Centre, Kourou')).toBe('kourou');
  });

  it('has a pad for every registry site except the sea-launch base', () => {
    for (const s of LAUNCH_SITES) {
      if (s.slug === 'haiyang') continue;
      expect(SITE_PADS[s.slug]).toBeDefined();
    }
  });
});

describe('NWS coverage', () => {
  it('covers the four US ranges', () => {
    for (const slug of ['cape-canaveral', 'vandenberg', 'starbase', 'wallops']) expect(isNwsCovered(SITE_PADS[slug])).toBe(true);
  });
  it('does not cover foreign ranges', () => {
    for (const slug of ['kourou', 'baikonur', 'jiuquan', 'sriharikota', 'mahia', 'tanegashima', 'andoya', 'plesetsk']) {
      expect(isNwsCovered(SITE_PADS[slug])).toBe(false);
    }
  });
});

describe('criteria → status / odds', () => {
  it('all-go forecast is green at 90', () => {
    const c = evaluateCriteria(clear);
    expect(c.every((x) => x.status === 'go')).toBe(true);
    expect(statusFromCriteria(c)).toBe('green');
    expect(oddsFromCriteria(c)).toBe(90);
  });

  it('one caution is yellow at 60; each extra caution costs 10 down to 40', () => {
    const one = evaluateCriteria({ ...clear, windSpeed: 20 });
    expect(statusFromCriteria(one)).toBe('yellow');
    expect(oddsFromCriteria(one)).toBe(60);
    const two = evaluateCriteria({ ...clear, windSpeed: 20, cloudCover: 85 });
    expect(oddsFromCriteria(two)).toBe(50);
    const four = evaluateCriteria({ ...clear, windSpeed: 20, cloudCover: 85, precipitation: 30, visibility: 2 });
    expect(oddsFromCriteria(four)).toBe(40);
  });

  it('any no-go is red at 25, floor 10', () => {
    const one = evaluateCriteria({ ...clear, windSpeed: 30 });
    expect(statusFromCriteria(one)).toBe('red');
    expect(oddsFromCriteria(one)).toBe(25);
    const three = evaluateCriteria({ ...clear, windSpeed: 30, lightningRisk: 'high', precipitation: 70 });
    expect(oddsFromCriteria(three)).toBe(10);
  });

  it('never fabricates non-weather constraints', () => {
    const names = evaluateCriteria(clear).map((c) => c.name.toLowerCase());
    expect(names.some((n) => /vehicle|range safety|termination/.test(n))).toBe(false);
  });
});

describe('NWS parse', () => {
  it('uses the upper bound of a wind range, converts to knots and reads the wording', () => {
    const w = parsePeriod({
      startTime: '2026-09-02T14:00:00-04:00', endTime: '2026-09-02T15:00:00-04:00', temperature: 84,
      windSpeed: '10 to 20 mph', windDirection: 'ESE', relativeHumidity: { value: 71 },
      probabilityOfPrecipitation: { value: 65 }, shortForecast: 'Scattered Showers And Thunderstorms',
    });
    expect(w.windSpeed).toBe(17);
    expect(w.windDirection).toBe('SE');
    expect(w.precipitation).toBe(65);
    expect(w.lightningRisk).toBe('high');
    expect(w.visibility).toBe(5);
  });

  it('distinguishes mostly/partly cloudy from cloudy', () => {
    const base = { startTime: '', endTime: '', temperature: 70, windSpeed: '5 mph', windDirection: 'N', shortForecast: '' };
    expect(parsePeriod({ ...base, shortForecast: 'Partly Cloudy' }).cloudCover).toBe(45);
    expect(parsePeriod({ ...base, shortForecast: 'Mostly Cloudy' }).cloudCover).toBe(70);
    expect(parsePeriod({ ...base, shortForecast: 'Cloudy' }).cloudCover).toBe(85);
  });

  it('picks the hourly period covering the launch and refuses to stretch past the horizon', () => {
    const periods: NWSHourlyPeriod[] = [0, 1, 2].map((h) => ({
      startTime: new Date(Date.UTC(2026, 8, 2, 12 + h)).toISOString(), endTime: new Date(Date.UTC(2026, 8, 2, 13 + h)).toISOString(),
      temperature: 70, windSpeed: '5 mph', windDirection: 'N', shortForecast: 'Clear',
    }));
    expect(pickPeriod(periods, new Date(Date.UTC(2026, 8, 2, 13, 30)))).toBe(periods[1]);
    expect(pickPeriod(periods, new Date(Date.UTC(2026, 8, 2, 11, 0)))).toBe(periods[0]);
    expect(pickPeriod(periods, new Date(Date.UTC(2026, 8, 2, 16, 0)))).toBeNull();
  });
});

describe('getLaunchWeatherOdds', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('returns null for a non-US range without calling NWS', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const r = await getLaunchWeatherOdds('evt', { ...SITE_PADS.kourou, source: 'site', siteSlug: 'kourou' }, new Date());
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for unknown coordinates', async () => {
    expect(await getLaunchWeatherOdds('evt', null, new Date())).toBeNull();
  });

  it('parses a mocked NWS points → hourly chain into odds', async () => {
    const launch = new Date(Date.now() + 5 * 3600000);
    const hourStart = new Date(Math.floor(launch.getTime() / 3600000) * 3600000);
    const periods = Array.from({ length: 12 }, (_, i) => ({
      startTime: new Date(hourStart.getTime() + (i - 6) * 3600000).toISOString(),
      endTime: new Date(hourStart.getTime() + (i - 5) * 3600000).toISOString(),
      temperature: 80, windSpeed: i === 6 ? '5 to 10 mph' : '30 mph', windDirection: i === 6 ? 'NNE' : 'W',
      relativeHumidity: { value: 55 }, probabilityOfPrecipitation: { value: i === 6 ? 10 : 90 }, shortForecast: i === 6 ? 'Mostly Sunny' : 'Thunderstorms',
    }));
    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).startsWith('https://api.weather.gov/points/')) {
        return { ok: true, status: 200, json: async () => ({ properties: { forecastHourly: 'https://api.weather.gov/gridpoints/MLB/26,68/forecast/hourly' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ properties: { periods } }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const r = await getLaunchWeatherOdds('evt', { ...SITE_PADS['cape-canaveral'], source: 'site', siteSlug: 'cape-canaveral' }, launch);
    expect(r).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.weather.gov/points/28.5619,-80.5773');
    // The launch hour (index 6) is benign even though the surrounding hours are stormy.
    expect(r!.weather.windSpeed).toBe(9);
    expect(r!.weather.windDirection).toBe('NE');
    expect(r!.status).toBe('green');
    expect(r!.oddsPct).toBe(90);
    expect(r!.source).toBe('NWS');
    expect(r!.simulated).toBe(false);
    expect(r!.forecastFor).toBe(hourStart.toISOString());
    expect(Date.parse(r!.fetchedAt)).not.toBeNaN();
  });

  it('returns null (not fake numbers) when NWS fails', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    const r = await getLaunchWeatherOdds('evt-fail', { ...SITE_PADS.wallops, source: 'site', siteSlug: 'wallops' }, new Date(Date.now() + 3600000));
    expect(r).toBeNull();
  });
});

describe('weatherWindowOpen', () => {
  const now = new Date('2026-09-01T12:00:00Z');
  it('is open inside 7 days for an unflown launch', () => {
    expect(weatherWindowOpen('scheduled', new Date('2026-09-03T12:00:00Z'), now)).toBe(true);
    expect(weatherWindowOpen('go', new Date('2026-09-01T11:45:00Z'), now)).toBe(true);
  });
  it('is closed beyond 7 days, without a date, or once flown', () => {
    expect(weatherWindowOpen('scheduled', new Date('2026-09-10T12:00:00Z'), now)).toBe(false);
    expect(weatherWindowOpen('scheduled', null, now)).toBe(false);
    expect(weatherWindowOpen('completed', new Date('2026-09-01T11:00:00Z'), now)).toBe(false);
    expect(weatherWindowOpen('scheduled', new Date('2026-08-30T12:00:00Z'), now)).toBe(false);
  });
});
