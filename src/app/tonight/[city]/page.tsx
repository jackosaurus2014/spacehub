import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import JsonLd from '@/components/seo/JsonLd';
import RelatedModules from '@/components/ui/RelatedModules';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import NewsletterSignup from '@/components/NewsletterSignup';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import {
  TONIGHT_CITIES, getTonightCity, getTonightPasses, tonightTitle,
  formatLocalTime, formatLocalDate, formatDuration, BRIGHTNESS_LABEL,
} from '@/lib/tonight';
import type { TonightPass, TonightSat, BrightnessHint } from '@/lib/tonight';

// /tonight/[city] — tonight's ISS / Tiangong / Hubble passes over a registry
// city (2026-09-01). Fully server-rendered, no geolocation: the city's
// coordinates and time zone come from src/lib/tonight-cities.ts. Registry-
// backed; the middleware 404s unknown slugs (dynamicParams=false). Rendered
// per request — the pass computation is cached 30 min per city.
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return TONIGHT_CITIES.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const city = getTonightCity(params.city);
  if (!city) return {};
  const title = tonightTitle(city.name);
  const description = `Tonight's visible ISS, Tiangong and Hubble passes over ${city.name}, ${city.area}: rise time, peak height, duration and brightness in local time, checked for darkness and Earth's shadow. Updated every 30 minutes from CelesTrak elements.`;
  return {
    title, description,
    alternates: { canonical: `https://spacenexus.us/tonight/${city.slug}` },
    openGraph: { title, description, type: 'website', url: `https://spacenexus.us/tonight/${city.slug}` },
  };
}

const BAND_CLASS: Record<BrightnessHint, string> = {
  bright: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  visible: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  faint: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function tzShort(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
}

function PassCard({ pass, tz, sat }: { pass: TonightPass; tz: string; sat: TonightSat }) {
  const muted = !pass.visible;
  return (
    <li className={`rounded-xl border p-4 ${muted ? 'border-white/[0.05] bg-white/[0.015]' : 'border-white/[0.08] bg-white/[0.03]'}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-lg font-bold ${muted ? 'text-slate-400' : 'text-white'}`}>{formatLocalTime(pass.startIso, tz)}</span>
        <span className="text-xs text-slate-500">{formatLocalDate(pass.startIso, tz)}</span>
        <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full border ${muted ? 'border-white/[0.08] text-slate-500' : BAND_CLASS[pass.brightnessHint]}`}>
          {pass.daylight ? 'Daylight — sky too bright' : pass.eclipsed ? "In Earth's shadow — unlit" : BRIGHTNESS_LABEL[pass.brightnessHint]}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Rises</dt><dd className="text-slate-200">{formatLocalTime(pass.startIso, tz)}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Highest</dt><dd className="text-slate-200">{Math.round(pass.maxElevationDeg)}° at {formatLocalTime(pass.maxElevationAtIso, tz)}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Visible for</dt><dd className="text-slate-200">{formatDuration(pass.durationSec)} · sets {formatLocalTime(pass.endIso, tz)}</dd></div>
      </dl>
      {sat.name !== 'ISS' && pass.visible && (
        <p className="text-[11px] text-slate-500 mt-2">{sat.name} is dimmer than the ISS — read the brightness one step down.</p>
      )}
    </li>
  );
}

export default async function TonightCityPage({ params }: { params: { city: string } }) {
  const city = getTonightCity(params.city);
  if (!city) notFound();
  const r = await getTonightPasses(city.slug);
  if (!r) notFound();

  const tz = city.tz;
  const zone = tzShort(r.windowStartIso, tz);
  const visibleSats = r.sats.map((s) => ({ ...s, visible: s.passes.filter((p) => p.visible), hidden: s.passes.filter((p) => !p.visible) }));
  const anyStale = r.sats.some((s) => !s.error && s.stale);
  const firstVisible = visibleSats.flatMap((s) => s.visible.map((p) => ({ sat: s, p }))).sort((a, b) => a.p.startIso.localeCompare(b.p.startIso))[0];

  const faq = [
    {
      question: 'How bright is the ISS?',
      answer: `On a high pass the International Space Station reaches magnitude −3 to −6 — brighter than any star and comparable to Venus — a steady white point that does not blink and makes no sound. Tiangong is a step dimmer (about −1 to −3) and Hubble is a faint, steady star (+1 to +2) that wants a dark sky. Our brightness hint uses peak elevation only: passes above 60° are the bright ones; below 30° the object stays low in haze.`,
    },
    {
      question: 'Why do passes end abruptly?',
      answer: `A satellite is visible only while it is in sunlight and you are in darkness. When it flies into Earth's shadow it fades out over a few seconds — often still high in the sky. That is not cloud: it is orbital sunset. Passes an hour or two after dusk usually end this way; passes before dawn often begin this way, with the station appearing out of nothing overhead.`,
    },
    {
      question: `Why are there no passes over ${city.name} some nights?`,
      answer: `The ISS orbits at 51.6° inclination and its ground track drifts west about 22° each orbit, so it overflies ${city.name} in runs of a week or two, then swings away for a similar stretch. Even when it does pass over, the sun angle has to line up so the station is lit while your sky is dark. Tiangong (41.5°) and Hubble (28.5°) never climb high for cities north of those latitudes — ${city.name} is at ${Math.abs(city.lat).toFixed(1)}°${city.lat >= 0 ? 'N' : 'S'}${Math.abs(city.lat) > 41.5 ? ', so Tiangong stays low here and Hubble is rarely visible at all' : Math.abs(city.lat) > 28.5 ? ', so Hubble stays low on the southern horizon here' : ''}.`,
    },
  ];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/whats-overhead" className="hover:text-white/80">What&apos;s Overhead</Link><span>/</span>
          <Link href="/tonight" className="hover:text-white/80">Tonight</Link><span>/</span>
          <span className="text-slate-400">{city.name}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">ISS passes tonight over {city.name}</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            {r.error ? (
              <>We could not reach the orbital-elements source just now. Try again in a few minutes, or use <Link href="/whats-overhead" className="text-cyan-400 hover:text-cyan-300">What&apos;s Overhead</Link>.</>
            ) : r.visibleCount === 0 ? (
              <><strong className="text-white">No visible passes tonight.</strong> The station is not crossing a dark {city.name} sky between {formatLocalTime(r.windowStartIso, tz)} and {formatLocalTime(r.windowEndIso, tz)} — see why below, and check back in a day or two.</>
            ) : (
              <><strong className="text-white">{r.visibleCount} visible pass{r.visibleCount === 1 ? '' : 'es'} tonight.</strong> {firstVisible && <>First up: {firstVisible.sat.name} rising at {formatLocalTime(firstVisible.p.startIso, tz)}, peaking {Math.round(firstVisible.p.maxElevationDeg)}° up.</>}</>
            )}
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            ['Tonight\'s window', `${formatLocalTime(r.windowStartIso, tz)} – ${formatLocalTime(r.windowEndIso, tz)}`, `${formatLocalDate(r.windowStartIso, tz)} · ${zone}`],
            ['Visible passes', String(r.visibleCount), 'dark sky + sunlit satellite'],
            ['Observer', `${Math.abs(city.lat).toFixed(2)}°${city.lat >= 0 ? 'N' : 'S'}`, `${Math.abs(city.lon).toFixed(2)}°${city.lon >= 0 ? 'E' : 'W'} — ${city.name} center`],
            ['Elements', r.tleAsOf ? formatLocalDate(r.tleAsOf, 'UTC') : 'unavailable', r.tleAsOf ? `CelesTrak epoch, ${formatLocalTime(r.tleAsOf, 'UTC')} UTC` : 'CelesTrak'],
          ].map(([k, v, sub]) => (
            <div key={k} className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{k}</div>
              <div className="text-xl font-bold text-white">{v}</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{sub}</div>
            </div>
          ))}
        </div>

        {anyStale && !r.error && (
          <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200" role="status">
            Orbital elements are more than 30 days old, so tonight&apos;s times may be off by minutes. We refresh from CelesTrak automatically.
          </p>
        )}

        {visibleSats.map((s) => (
          <section key={s.id} className="mb-8" aria-labelledby={`sat-${s.id}`}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 id={`sat-${s.id}`} className="text-xl font-bold text-white">{s.longName}</h2>
              <span className="text-xs text-slate-500">NORAD {s.id}{s.tleEpochIso ? ` · epoch ${s.tleEpochIso.slice(0, 10)}` : ''}</span>
            </div>
            {s.error ? (
              <p className="card p-4 text-sm text-slate-500">No orbital elements available for this object right now.</p>
            ) : s.visible.length === 0 ? (
              <p className="card p-4 text-sm text-slate-400">
                No visible {s.name} pass over {city.name} tonight{s.hidden.length > 0 ? ` — ${s.hidden.length} pass${s.hidden.length === 1 ? '' : 'es'} in daylight or shadow` : ''}.
              </p>
            ) : (
              <ul className="space-y-3">{s.visible.map((p) => <PassCard key={p.startIso} pass={p} tz={tz} sat={s} />)}</ul>
            )}
            {s.hidden.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">{s.hidden.length} pass{s.hidden.length === 1 ? '' : 'es'} you will not see (daylight or Earth&apos;s shadow)</summary>
                <ul className="space-y-3 mt-3">{s.hidden.map((p) => <PassCard key={p.startIso} pass={p} tz={tz} sat={s} />)}</ul>
              </details>
            )}
          </section>
        ))}

        <p className="text-xs text-slate-500 mb-10">
          {r.sourceLine}. Elevation-only predictor (no direction of travel); passes above 10°; darkness = sun below −6° at {city.name}; shadow check at each pass&apos;s peak.
          All times {zone}. Computed {formatLocalTime(r.nowIso, tz)}, refreshed every 30 minutes.
        </p>

        <section className="mb-10 card p-5">
          <h2 className="text-lg font-bold text-white mb-3">How to spot the ISS</h2>
          <ol className="space-y-2 text-sm text-slate-300 list-decimal pl-5">
            <li><strong className="text-white">Be outside two minutes before the rise time</strong> with as much open sky as you can find. City lights are fine — the station outshines them.</li>
            <li><strong className="text-white">Look for a steady, un-blinking star</strong> moving about as fast as a high airliner. No flashing lights, no sound. If it blinks, it is a plane.</li>
            <li><strong className="text-white">It is brightest near the &ldquo;highest&rdquo; time</strong> on the card — that is when it is closest to you. Passes above 60° go almost overhead.</li>
            <li><strong className="text-white">If it fades out mid-sky, that is normal</strong> — it just flew into Earth&apos;s shadow. Wave anyway; the crew is up there.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Get launch alerts</h2>
          {city.launchSite ? (
            <>
              <p className="text-sm text-slate-400 mb-3">Night launches from {city.launchSite} are visible from {city.name}. One email a day before, an hour before, and at liftoff — no account.</p>
              <LaunchWatchForm site={city.launchSite} label={`every launch from ${city.launchSite}`} source={`tonight-${city.slug}`} />
            </>
          ) : (
            <NewsletterSignup
              variant="cta"
              source={`tonight-${city.slug}`}
              title="Get launch alerts by email"
              description="The Monday/Thursday SpaceNexus digest: the week's launches, what to watch for, and the stories behind them. No account, unsubscribe in one click."
            />
          )}
          <p className="text-xs text-slate-500 mt-3">
            Want an email before each visible pass at your exact coordinates? Pass alerts live in the <Link href="/alerts?tab=satellite-passes" className="text-cyan-400 hover:text-cyan-300">alert center</Link> with a free account.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Frequently asked</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <div key={f.question} className="card p-4"><h3 className="text-sm font-semibold text-white mb-1.5">{f.question}</h3><p className="text-sm text-slate-400 leading-relaxed">{f.answer}</p></div>
            ))}
          </div>
        </section>

        <section className="pt-6 border-t border-white/[0.06] text-sm mb-10">
          <h3 className="text-lg font-bold text-white mb-3">Other cities</h3>
          <div className="flex flex-wrap gap-2">
            {TONIGHT_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/tonight/${c.slug}`} className="card px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-cyan-500/30 transition-colors">{c.name}</Link>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            {city.viewingGuide && <><Link href={`/guide/watch-a-launch/${city.viewingGuide}`} className="text-cyan-400 hover:text-cyan-300">Can you see a rocket launch from {city.name}?</Link> · </>}
            <Link href="/whats-overhead" className="text-cyan-400 hover:text-cyan-300">What&apos;s overhead right now</Link> · <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300">Live satellite tracker</Link>
          </p>
        </section>

        <RelatedModules modules={PAGE_RELATIONS['tonight']} />

        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: tonightTitle(city.name),
          description: `Tonight's visible ISS, Tiangong and Hubble passes over ${city.name}.`,
          url: `https://spacenexus.us/tonight/${city.slug}`,
          dateModified: r.nowIso,
          isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: 'https://spacenexus.us' },
          about: { '@type': 'Place', name: city.name, geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lon } },
        }} />
        <FAQSchema items={faq} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: "What's Overhead", href: '/whats-overhead' }, { name: 'Tonight', href: '/tonight' }, { name: city.name }]} />
      </div>
    </div>
  );
}
