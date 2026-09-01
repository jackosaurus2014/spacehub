import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { getContentItem } from '@/lib/dynamic-content';
import { fetchPlanetaryKp } from '@/lib/noaa-fetcher';
import { SOLAR_FLARES_SEED } from '@/lib/solar-flare-data';

// /space-weather — the public, indexable read of what the site already
// ingests about the Sun–Earth environment. Sources, all real:
//   • SolarFlare rows       — NASA DONKI + NOAA GOES X-ray, cron every 6h
//                             (/api/solar-flares/fetch).
//   • DynamicContent        — NOAA SWPC products stored by
//                             fetchAndStoreEnhancedSpaceWeather() every 30 min
//                             (solar_probabilities, RTSW plasma/mag, noaa-scales,
//                             planetary_k_index_1m).
//   • Live Kp               — SWPC planetary K-index, fetched per request.
// Deliberately NOT used: SolarForecast rows. That table is filled by
// SOLAR_FORECASTS_SEED, which generates its probabilities with Math.random();
// an indexable page must not publish invented numbers. The 3-day table below
// reads SWPC's own 1/2/3-day flare probabilities instead.
//
// Cached payloads carry ISO strings, never Date objects.

export type Severity = 'quiet' | 'minor' | 'moderate' | 'severe';

export interface FlareRow {
  flareId: string;
  classLabel: string; // e.g. "X2.5"
  classification: string; // X / M / C / B / A
  intensity: number;
  startTime: string;
  peakTime: string | null;
  activeRegion: string | null;
  sourceLocation: string | null;
  radioBlackout: string | null;
  solarRadiation: string | null;
  geomagneticStorm: string | null;
  linkedCME: boolean;
}

export interface ForecastDay {
  label: string; // "Day 1" …
  date: string | null; // ISO date when derivable
  probC: number | null;
  probM: number | null;
  probX: number | null;
  probProton: number | null;
  gScale: number | null; // NOAA G-scale (0-5) from noaa-scales.json when present
  gText: string | null;
}

export interface SolarWindReading {
  speed: number | null; // km/s
  density: number | null; // p/cm³
  bz: number | null; // nT (GSM)
  bt: number | null; // nT
  time: string | null; // SWPC time_tag (UTC, no zone suffix)
  fetchedAt: string | null;
}

export interface SpaceWeatherPageData {
  asOf: string;
  kp: {
    value: number | null;
    time: string | null;
    source: 'swpc-live' | 'swpc-stored' | 'db' | null;
    maxKp24h: number | null;
  };
  severity: Severity;
  severityLabel: string;
  solarWind: SolarWindReading;
  forecast: {
    days: ForecastDay[];
    issued: string | null; // SWPC date_tag
    fetchedAt: string | null;
  };
  flares: {
    rows: FlareRow[];
    windowDays: number;
    countByClass: Record<string, number>;
    latestFetch: string | null; // newest SolarFlare.updatedAt
  };
  operatorsRead: string[]; // computed sentences, no invented numbers
}

const FLARE_WINDOW_DAYS = 14;

function kpSeverity(kp: number | null): { severity: Severity; label: string } {
  // Same banding as /api/pulse: ≥7 severe, ≥5 moderate, ≥4 minor.
  if (kp == null) return { severity: 'quiet', label: 'no live Kp reading' };
  if (kp >= 7) return { severity: 'severe', label: 'strong geomagnetic storm' };
  if (kp >= 5) return { severity: 'moderate', label: 'geomagnetic storm' };
  if (kp >= 4) return { severity: 'minor', label: 'unsettled' };
  return { severity: 'quiet', label: 'quiet' };
}

export function formatKp(kp: number | null): string {
  if (kp == null) return '—';
  return kp % 1 === 0 ? kp.toFixed(0) : kp.toFixed(1);
}

/** NOAA G-scale from Kp (G1 = Kp5 … G5 = Kp9). */
export function gScaleFromKp(kp: number | null): number {
  if (kp == null || kp < 5) return 0;
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  return 1;
}

/** NOAA R-scale from GOES class: M1 = R1, M5 = R2, X1 = R3, X10 = R4, X20 = R5. */
export function rScaleFromFlare(classification: string, intensity: number): number {
  if (classification === 'X') {
    if (intensity >= 20) return 5;
    if (intensity >= 10) return 4;
    return 3;
  }
  if (classification === 'M') return intensity >= 5 ? 2 : 1;
  return 0;
}

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

interface StoredProbabilities {
  forecastDate?: string | null;
  day1?: { cClass?: number | null; mClass?: number | null; xClass?: number | null; protonEvent?: number | null };
  day2?: StoredProbabilities['day1'];
  day3?: StoredProbabilities['day1'];
  fetchedAt?: string;
}
interface StoredGeomag {
  forecast?: Array<{ date: string | null; time: string | null; gScale: number | null; gText: string | null }>;
  fetchedAt?: string;
}
interface StoredPlasma {
  latest?: { time: string; density: number | null; speed: number | null } | null;
  fetchedAt?: string;
}
interface StoredMag {
  latest?: { time: string; bzGsm: number | null; bt: number | null } | null;
  fetchedAt?: string;
}
interface StoredKp {
  currentKp?: number;
  maxKp24h?: number;
  recentReadings?: Array<{ time: string; kp: number }>;
  fetchedAt?: string;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86400_000);
  return d.toISOString().slice(0, 10);
}

/** DB + DynamicContent half — cached 10 minutes; the SWPC cron refreshes every 30. */
const getStoredSpaceWeather = unstable_cache(async () => {
  const since = new Date(Date.now() - FLARE_WINDOW_DAYS * 86400_000);
  const [flares, latestActivity, probs, geomag, plasma, mag, storedKp] = await Promise.all([
    prisma.solarFlare.findMany({
      // SOLAR_FLARES_SEED rows are hand-written with startTime relative to
      // seed time; a re-seed would drop invented flares into a live log.
      where: { startTime: { gte: since }, flareId: { notIn: SOLAR_FLARES_SEED.map((s) => s.flareId) } },
      orderBy: { startTime: 'desc' },
      take: 60,
    }),
    prisma.solarActivity.findFirst({ orderBy: { timestamp: 'desc' } }),
    getContentItem<StoredProbabilities>('space-environment:solar-probabilities'),
    getContentItem<StoredGeomag>('space-environment:geomagnetic-forecast'),
    getContentItem<StoredPlasma>('space-environment:solar-wind-plasma'),
    getContentItem<StoredMag>('space-environment:solar-wind-mag'),
    getContentItem<StoredKp>('space-environment:kp-index-live'),
  ]);

  const rows: FlareRow[] = flares.map((f) => ({
    flareId: f.flareId,
    classLabel: `${f.classification}${Number.isFinite(f.intensity) ? f.intensity.toFixed(1) : ''}`,
    classification: f.classification,
    intensity: f.intensity,
    startTime: f.startTime.toISOString(),
    peakTime: isoOrNull(f.peakTime),
    activeRegion: f.activeRegion,
    sourceLocation: f.sourceLocation,
    radioBlackout: f.radioBlackout,
    solarRadiation: f.solarRadiation,
    geomagneticStorm: f.geomagneticStorm,
    linkedCME: f.linkedCME,
  }));
  const countByClass: Record<string, number> = {};
  for (const r of rows) countByClass[r.classification] = (countByClass[r.classification] || 0) + 1;
  const latestFetch = flares.length ? new Date(Math.max(...flares.map((f) => f.updatedAt.getTime()))).toISOString() : null;

  // 3-day flare probabilities — SWPC solar_probabilities.json (real forecast).
  const days: ForecastDay[] = [];
  const p = probs?.data;
  const issuedRaw = p?.forecastDate ?? null;
  const issued = issuedRaw && !Number.isNaN(Date.parse(issuedRaw)) ? new Date(issuedRaw) : null;
  const geomagByDate = new Map<string, { gScale: number | null; gText: string | null }>();
  for (const g of geomag?.data?.forecast ?? []) {
    if (g.date) geomagByDate.set(g.date.slice(0, 10), { gScale: num(g.gScale), gText: g.gText ?? null });
  }
  if (p) {
    const trio = [p.day1, p.day2, p.day3];
    trio.forEach((d, i) => {
      if (!d) return;
      const date = issued ? addDays(issued, i) : null;
      const g = date ? geomagByDate.get(date) : undefined;
      days.push({
        label: `Day ${i + 1}`,
        date,
        probC: num(d.cClass),
        probM: num(d.mClass),
        probX: num(d.xClass),
        probProton: num(d.protonEvent),
        gScale: g?.gScale ?? null,
        gText: g?.gText ?? null,
      });
    });
  }

  const solarWind: SolarWindReading = {
    speed: num(plasma?.data?.latest?.speed),
    density: num(plasma?.data?.latest?.density),
    bz: num(mag?.data?.latest?.bzGsm),
    bt: num(mag?.data?.latest?.bt),
    time: mag?.data?.latest?.time ?? plasma?.data?.latest?.time ?? null,
    fetchedAt: mag?.data?.fetchedAt ?? plasma?.data?.fetchedAt ?? isoOrNull(mag?.refreshedAt ?? plasma?.refreshedAt),
  };

  return {
    flares: { rows, windowDays: FLARE_WINDOW_DAYS, countByClass, latestFetch },
    forecast: { days, issued: issued ? issued.toISOString().slice(0, 10) : null, fetchedAt: p?.fetchedAt ?? isoOrNull(probs?.refreshedAt) },
    solarWind,
    storedKp: {
      value: num(storedKp?.data?.currentKp),
      maxKp24h: num(storedKp?.data?.maxKp24h),
      time: storedKp?.data?.recentReadings?.slice(-1)[0]?.time ?? null,
      fetchedAt: storedKp?.data?.fetchedAt ?? isoOrNull(storedKp?.refreshedAt),
    },
    dbKp: { value: num(latestActivity?.kpIndex), time: isoOrNull(latestActivity?.timestamp) },
  };
}, ['space-weather-page'], { revalidate: 600 });

const FRESH_MS = 6 * 60 * 60 * 1000;
function fresh(iso: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return Number.isFinite(t) && Date.now() - t < FRESH_MS;
}

export async function getSpaceWeatherPage(): Promise<SpaceWeatherPageData | null> {
  let stored: Awaited<ReturnType<typeof getStoredSpaceWeather>> | null = null;
  try {
    stored = await getStoredSpaceWeather();
  } catch {
    stored = null;
  }
  // Live Kp sits outside the cache: SWPC answers in well under a second and a
  // `no-store` fetch inside unstable_cache is not something to lean on.
  const live = await fetchPlanetaryKp().catch(() => null);
  if (!stored && !live) return null;

  let kp: SpaceWeatherPageData['kp'] = { value: null, time: null, source: null, maxKp24h: stored?.storedKp.maxKp24h ?? null };
  if (live) kp = { ...kp, value: live.kp, time: live.time || null, source: 'swpc-live' };
  else if (stored?.storedKp.value != null && fresh(stored.storedKp.fetchedAt)) kp = { ...kp, value: stored.storedKp.value, time: stored.storedKp.time, source: 'swpc-stored' };
  else if (stored?.dbKp.value != null && fresh(stored.dbKp.time)) kp = { ...kp, value: stored.dbKp.value, time: stored.dbKp.time, source: 'db' };

  const band = kpSeverity(kp.value);
  const flares = stored?.flares ?? { rows: [], windowDays: FLARE_WINDOW_DAYS, countByClass: {}, latestFetch: null };
  const forecast = stored?.forecast ?? { days: [], issued: null, fetchedAt: null };
  const solarWind = stored?.solarWind ?? { speed: null, density: null, bz: null, bt: null, time: null, fetchedAt: null };

  // ── Operators' read: every sentence is derived from a value on this page ──
  const read: string[] = [];
  const g = gScaleFromKp(kp.value);
  if (kp.value != null) {
    read.push(
      g === 0
        ? `Geomagnetic field: Kp ${formatKp(kp.value)} — below the G1 storm threshold (Kp 5). No storm-level drag or charging concern from the current index.`
        : `Geomagnetic field: Kp ${formatKp(kp.value)} — NOAA G${g} conditions. Expect elevated LEO drag, degraded orbit determination and increased surface-charging risk on high-inclination and GEO assets.`
    );
  }
  const cutoff72 = Date.now() - 72 * 3600_000;
  const recent72 = flares.rows.filter((r) => Date.parse(r.startTime) >= cutoff72);
  if (recent72.length) {
    const top = recent72.reduce((a, b) => (rScaleFromFlare(b.classification, b.intensity) > rScaleFromFlare(a.classification, a.intensity) ? b : a));
    const r = rScaleFromFlare(top.classification, top.intensity);
    read.push(
      r === 0
        ? `Radio blackout: largest flare in the last 72 h was ${top.classLabel} — below M1, so no R-scale blackout from flares in this window.`
        : `Radio blackout: ${top.classLabel} flare ${top.activeRegion ? `from ${top.activeRegion} ` : ''}in the last 72 h reached NOAA R${r}. Dayside HF and low-frequency navigation signals degrade during flares of this class.`
    );
  } else if (flares.rows.length) {
    read.push(`Radio blackout: no flare recorded in the last 72 h (${flares.rows.length} in the ${flares.windowDays}-day log).`);
  }
  if (solarWind.bz != null && fresh(solarWind.fetchedAt)) {
    read.push(
      solarWind.bz <= -10
        ? `Solar wind: Bz ${solarWind.bz.toFixed(1)} nT — strongly southward. Coupling to the magnetosphere is efficient; Kp tends to rise within hours of sustained readings like this.`
        : solarWind.bz < -5
          ? `Solar wind: Bz ${solarWind.bz.toFixed(1)} nT — moderately southward, geoeffective if it holds.`
          : `Solar wind: Bz ${solarWind.bz.toFixed(1)} nT — northward or near zero, so the magnetosphere is mostly closed to incoming energy right now.`
    );
  }
  const d1 = forecast.days[0];
  if (d1 && (d1.probM != null || d1.probX != null)) {
    read.push(`Flare outlook (SWPC day 1): ${d1.probM ?? '—'}% chance of an M-class and ${d1.probX ?? '—'}% of an X-class flare${d1.probProton != null ? `; ${d1.probProton}% for a proton event` : ''}.`);
  }

  return {
    asOf: new Date().toISOString(),
    kp,
    severity: band.severity,
    severityLabel: band.label,
    solarWind,
    forecast,
    flares,
    operatorsRead: read,
  };
}
