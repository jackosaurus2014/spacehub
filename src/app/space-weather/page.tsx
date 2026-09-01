import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import Provenance from '@/components/ui/Provenance';
import EmptyState from '@/components/ui/EmptyState';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getSpaceWeatherPage, formatKp, gScaleFromKp, rScaleFromFlare, type Severity } from '@/lib/space-weather-page';

// Public, indexable space-weather read built on feeds the site already
// ingests (NOAA SWPC every 30 min, NASA DONKI/GOES flares every 6 h). No DB
// in the Railway build container → force-dynamic, cache inside the loader.
export const dynamic = 'force-dynamic';

const PAGE_URL = 'https://spacenexus.us/space-weather';
const TITLE = 'Space Weather Now — Kp, Solar Wind, Flares';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Current geomagnetic Kp, solar wind speed and Bz, the NOAA 3-day flare probability outlook and a 14-day solar flare log — with a plain-language read for satellite and launch operators. NOAA SWPC and NASA DONKI data.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: 'Live Kp, solar wind, 3-day flare outlook and the last 14 days of flares — NOAA SWPC and NASA DONKI.',
    url: PAGE_URL,
    type: 'website',
    images: [{ url: `/api/og?title=${encodeURIComponent('Space Weather Now')}&subtitle=${encodeURIComponent('Kp · solar wind · flare outlook · 14-day flare log')}&type=data`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

const FAQ = [
  {
    question: 'What is the Kp index?',
    answer: 'Kp is a 0–9 planetary index of geomagnetic disturbance, computed every three hours from a network of ground magnetometers. Kp 0–3 is quiet, 4 is unsettled, and Kp 5 and above corresponds to NOAA geomagnetic storm levels G1 (Kp 5) through G5 (Kp 9). Higher Kp means more energy entering the magnetosphere from the solar wind.',
  },
  {
    question: 'What does an X-class solar flare do to satellites?',
    answer: 'Flares are classed by peak X-ray flux: C, M and X, each ten times stronger than the last. An X-class flare produces an R3 or stronger radio blackout on the sunlit side of Earth within minutes, degrading HF communications and GNSS signal quality. Satellites do not feel the flare directly, but the extra ultraviolet and X-ray energy heats the upper atmosphere, raising drag on low-Earth-orbit spacecraft, and an associated coronal mass ejection or proton event can follow hours to days later.',
  },
  {
    question: 'How do I read Bz?',
    answer: 'Bz is the north–south component of the interplanetary magnetic field carried by the solar wind, measured in nanotesla. When Bz is negative (southward) it reconnects with Earth’s northward field and lets solar-wind energy in; sustained Bz below about −5 nT is geoeffective and below −10 nT usually drives a geomagnetic storm within hours. Positive (northward) Bz keeps the magnetosphere largely closed, even when the solar wind is fast.',
  },
  {
    question: 'Where does this data come from and how fresh is it?',
    answer: 'Kp and solar-wind readings come from NOAA’s Space Weather Prediction Center (planetary K-index and the DSCOVR/ACE real-time solar wind feed). The 3-day outlook is SWPC’s published flare-probability forecast. The flare log is built from NASA DONKI and NOAA GOES X-ray event lists. Each panel shows its own “as of” timestamp; SWPC feeds are stored every 30 minutes and the flare log every six hours.',
  },
];

function fmtUtc(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const t = Date.parse(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  if (!Number.isFinite(t)) return iso;
  const d = new Date(t);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (!withTime) return date;
  return `${date} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
}

function isFresh(iso: string | null | undefined, hours: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return Number.isFinite(t) && Date.now() - t < hours * 3600_000;
}

// Colour + glyph + word: state never rides on colour alone.
const SEVERITY: Record<Severity, { dot: string; text: string; word: string; glyph: string }> = {
  quiet: { dot: 'bg-emerald-400', text: 'text-emerald-300', word: 'Quiet', glyph: '●' },
  minor: { dot: 'bg-amber-400', text: 'text-amber-300', word: 'Unsettled', glyph: '◐' },
  moderate: { dot: 'bg-orange-400', text: 'text-orange-300', word: 'Storm', glyph: '▲' },
  severe: { dot: 'bg-red-500', text: 'text-red-300', word: 'Severe storm', glyph: '■' },
};

function classTone(c: string): string {
  if (c === 'X') return 'text-red-300';
  if (c === 'M') return 'text-amber-300';
  return 'text-slate-300';
}

function impactWord(v: string | null): string {
  if (!v || v === 'none') return '—';
  return v;
}

export default async function SpaceWeatherPage() {
  const data = await getSpaceWeatherPage();
  const sev = data ? SEVERITY[data.severity] : null;
  const windFresh = data ? isFresh(data.solarWind.fetchedAt, 6) : false;
  const kpFresh = data ? isFresh(data.kp.time, 6) : false;

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80 inline-flex items-center min-h-[44px]">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/space-environment" className="hover:text-white/80 inline-flex items-center min-h-[44px]">Space Environment</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Space Weather</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Space Weather Now</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            The current state of the Sun–Earth environment in the numbers operators actually watch: the planetary Kp
            index, solar-wind speed and the Bz field component, NOAA&apos;s three-day flare outlook, and every flare
            logged in the last two weeks. Each panel carries its own source and timestamp.
          </p>
        </header>

        {!data ? (
          <EmptyState
            icon={<span aria-hidden="true" className="text-2xl">☀️</span>}
            title="Space weather data is temporarily unavailable"
            description="Neither the stored NOAA feeds nor the live Kp reading could be loaded just now."
            reason="The page reads NOAA SWPC products stored every 30 minutes plus a live SWPC Kp call; both failed on this request. Reload in a minute — a database or upstream hiccup, not a change in the Sun."
            suggestions={[{ label: 'Aurora forecast', href: '/aurora-forecast' }, { label: 'Space environment', href: '/space-environment' }]}
          />
        ) : (
          <div className="space-y-6">
            {/* Current conditions */}
            <Console
              title="Current conditions"
              source={data.kp.source === 'swpc-live' ? 'NOAA SWPC (live)' : data.kp.source === 'swpc-stored' ? 'NOAA SWPC (stored)' : data.kp.source === 'db' ? 'NOAA via SpaceNexus store' : 'NOAA SWPC'}
              asOf={data.kp.time ? (data.kp.time.endsWith('Z') ? data.kp.time : `${data.kp.time}Z`) : null}
              status={data.kp.value == null ? 'off' : kpFresh ? 'live' : 'stale'}
            >
              <div className="flex items-center gap-3 mb-4" role="status" aria-live="polite">
                {sev && (
                  <>
                    <span className={`inline-block h-3 w-3 rounded-full ${sev.dot}`} aria-hidden="true" />
                    <span className={`font-mono text-sm ${sev.text}`}>
                      <span aria-hidden="true">{sev.glyph} </span>{sev.word}
                      <span className="text-slate-500"> · {data.severityLabel}</span>
                    </span>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Telemetry
                  label="Planetary Kp"
                  value={formatKp(data.kp.value)}
                  sub={data.kp.value == null ? 'no reading' : gScaleFromKp(data.kp.value) > 0 ? `NOAA G${gScaleFromKp(data.kp.value)}` : 'below G1 (Kp 5)'}
                />
                <Telemetry
                  label="Solar wind speed"
                  value={windFresh && data.solarWind.speed != null ? Math.round(data.solarWind.speed) : '—'}
                  unit={windFresh && data.solarWind.speed != null ? 'km/s' : undefined}
                  sub={windFresh && data.solarWind.density != null ? `${data.solarWind.density.toFixed(1)} p/cm³` : windFresh ? 'DSCOVR/ACE' : 'feed older than 6 h'}
                  tone="ink"
                />
                <Telemetry
                  label="Bz (GSM)"
                  value={windFresh && data.solarWind.bz != null ? `${data.solarWind.bz > 0 ? '+' : ''}${data.solarWind.bz.toFixed(1)}` : '—'}
                  unit={windFresh && data.solarWind.bz != null ? 'nT' : undefined}
                  sub={windFresh && data.solarWind.bz != null ? (data.solarWind.bz < -5 ? 'southward — geoeffective' : data.solarWind.bz < 0 ? 'slightly southward' : 'northward') : 'feed older than 6 h'}
                  tone="ink"
                />
                <Telemetry
                  label="Max Kp, 24 h"
                  value={formatKp(data.kp.maxKp24h)}
                  sub={data.kp.maxKp24h == null ? 'not stored' : 'peak stored reading'}
                  tone="ink"
                />
              </div>
              {data.solarWind.time && (
                <Provenance
                  className="mt-3"
                  source="NOAA SWPC real-time solar wind (DSCOVR/ACE)"
                  asOf={data.solarWind.time.endsWith('Z') ? data.solarWind.time : `${data.solarWind.time}Z`}
                />
              )}
            </Console>

            {/* Operators' read */}
            <Console title="Operators&apos; read" source="computed from the values above">
              {data.operatorsRead.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  Nothing to summarise: no live Kp, no fresh solar-wind sample and no flares in the log. The paragraph
                  appears once any of those has a value.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-white/80 leading-relaxed">
                  {data.operatorsRead.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-slate-600" aria-hidden="true">▸</span><span>{s}</span></li>
                  ))}
                </ul>
              )}
            </Console>

            {/* 3-day forecast */}
            <Console
              title="3-day flare probability outlook"
              source="NOAA SWPC solar_probabilities"
              asOf={data.forecast.fetchedAt}
              status={data.forecast.days.length === 0 ? 'off' : isFresh(data.forecast.fetchedAt, 24) ? 'verified' : 'stale'}
            >
              {data.forecast.days.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No SWPC outlook stored yet. The forecast row is written by the half-hourly space-weather refresh; if
                  it stays empty for more than an hour the upstream product is down, not the Sun.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">NOAA three-day probabilities of C, M and X-class flares and proton events, with the geomagnetic G-scale forecast where available</caption>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="py-2 pr-3">Day</th>
                        <th className="py-2 pr-3 text-right">C-class</th>
                        <th className="py-2 pr-3 text-right">M-class</th>
                        <th className="py-2 pr-3 text-right">X-class</th>
                        <th className="py-2 pr-3 text-right">Proton</th>
                        <th className="py-2 text-left">Geomagnetic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.forecast.days.map((d) => (
                        <tr key={d.label} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-3 text-white/90">{d.label}{d.date ? <span className="text-slate-500 text-xs"> · {fmtUtc(`${d.date}T00:00:00Z`, false)}</span> : null}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{d.probC == null ? '—' : `${d.probC}%`}</td>
                          <td className={`py-2 pr-3 text-right font-mono tabular-nums ${d.probM != null && d.probM >= 50 ? 'text-amber-300' : 'text-slate-300'}`}>{d.probM == null ? '—' : `${d.probM}%`}</td>
                          <td className={`py-2 pr-3 text-right font-mono tabular-nums ${d.probX != null && d.probX >= 20 ? 'text-red-300' : 'text-slate-300'}`}>{d.probX == null ? '—' : `${d.probX}%`}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{d.probProton == null ? '—' : `${d.probProton}%`}</td>
                          <td className="py-2 text-slate-300">{d.gScale == null ? <span className="text-slate-500">not in stored scales</span> : `G${d.gScale}${d.gText ? ` · ${d.gText}` : ''}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-slate-500">
                    Percentages are SWPC&apos;s published probability of at least one flare of that class in the 24-hour
                    period{data.forecast.issued ? `, issued ${fmtUtc(`${data.forecast.issued}T00:00:00Z`, false)}` : ''}.
                    The geomagnetic column uses the NOAA scales product when the refresh has stored it.
                  </p>
                </div>
              )}
            </Console>

            {/* Flare log */}
            <Console
              title={`Solar flare log — last ${data.flares.windowDays} days`}
              source="NASA DONKI + NOAA GOES X-ray"
              asOf={data.flares.latestFetch}
              status={data.flares.rows.length === 0 ? 'off' : isFresh(data.flares.latestFetch, 12) ? 'verified' : 'stale'}
            >
              {data.flares.rows.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No flares in the last {data.flares.windowDays} days of the log. Either the Sun has been quiet at the
                  C-class threshold and above, or the six-hourly DONKI/GOES ingest has not run — the status badge on
                  this panel says which.
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    {Object.entries(data.flares.countByClass).sort().map(([c, n]) => `${n} ${c}-class`).join(' · ')}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Solar flares in the last two weeks: class, peak time, active region, and NOAA impact levels</caption>
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                          <th className="py-2 pr-3">Class</th>
                          <th className="py-2 pr-3">Peak (UTC)</th>
                          <th className="py-2 pr-3">Region</th>
                          <th className="py-2 pr-3">Radio</th>
                          <th className="py-2 pr-3">Radiation</th>
                          <th className="py-2 pr-3">Geomag.</th>
                          <th className="py-2">CME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.flares.rows.map((f) => {
                          const r = rScaleFromFlare(f.classification, f.intensity);
                          return (
                            <tr key={f.flareId} className="border-b border-white/[0.04]">
                              <td className={`py-2 pr-3 font-mono tabular-nums font-semibold ${classTone(f.classification)}`}>
                                {f.classLabel}{r > 0 ? <span className="text-slate-500 font-normal"> R{r}</span> : null}
                              </td>
                              <td className="py-2 pr-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">{fmtUtc(f.peakTime ?? f.startTime)}</td>
                              <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{f.activeRegion || '—'}{f.sourceLocation ? <span className="text-slate-600 text-xs"> {f.sourceLocation}</span> : null}</td>
                              <td className="py-2 pr-3 text-slate-400 capitalize">{impactWord(f.radioBlackout)}</td>
                              <td className="py-2 pr-3 text-slate-400 capitalize">{impactWord(f.solarRadiation)}</td>
                              <td className="py-2 pr-3 text-slate-400 capitalize">{impactWord(f.geomagneticStorm)}</td>
                              <td className="py-2 text-slate-400">{f.linkedCME ? 'yes' : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Console>

            {/* FAQ (visible + schema) */}
            <Console title="Reading the numbers">
              <dl className="space-y-4">
                {FAQ.map((f) => (
                  <div key={f.question}>
                    <dt className="text-white font-medium text-sm">{f.question}</dt>
                    <dd className="text-slate-400 text-sm mt-1 leading-relaxed">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </Console>

            <CiteEmbed
              title="Space Weather Now"
              pageUrl={PAGE_URL}
              embedUrl="https://spacenexus.us/embed/space-weather"
              sourceLine="SpaceNexus Space Weather Now (NOAA SWPC planetary Kp and real-time solar wind; NASA DONKI / NOAA GOES flare lists)"
            />

            <div className="space-y-1">
              <Provenance source="NOAA SWPC (Kp, solar wind, 3-day outlook) · NASA DONKI + NOAA GOES (flare log)" asOf={data.asOf} />
              <p className="text-sm text-slate-500">
                Related: <Link href="/aurora-forecast" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Aurora forecast</Link>{' · '}
                <Link href="/space-environment" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Space environment dashboard</Link>{' · '}
                <Link href="/conjunctions" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Satellite conjunctions</Link>{' · '}
                <Link href="/radiation-calculator" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Radiation dose calculator</Link>
              </p>
            </div>
          </div>
        )}

        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Environment', href: '/space-environment' }, { name: 'Space Weather' }]} />
        <FAQSchema items={FAQ} />
      </div>
    </div>
  );
}
