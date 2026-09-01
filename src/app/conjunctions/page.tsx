import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import Provenance from '@/components/ui/Provenance';
import EmptyState from '@/components/ui/EmptyState';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getConjunctionsPage, PC_RED, PC_ORANGE, MISS_YELLOW_M, type AlertLevel, type ConjunctionRow } from '@/lib/conjunctions-page';

// Public, indexable close-approach page. Live rows are Space-Track public
// CDMs the 6-hourly cron stores; curated rows are labelled reference
// scenarios. No DB in the Railway build container → force-dynamic.
export const dynamic = 'force-dynamic';

const PAGE_URL = 'https://spacenexus.us/conjunctions';
const TITLE = 'Satellite Conjunctions — Close Approaches (CDMs)';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Upcoming satellite close approaches from Space-Track public conjunction data messages: time of closest approach, the two objects, miss distance, collision probability and alert level — with a plain explanation of what the numbers mean.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: 'Space-Track public CDMs: TCA, objects, miss distance, collision probability and alert level.',
    url: PAGE_URL,
    type: 'website',
    images: [{ url: `/api/og?title=${encodeURIComponent('Satellite Conjunctions')}&subtitle=${encodeURIComponent('Close approaches · miss distance · collision probability')}&type=data`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

const FAQ = [
  {
    question: 'What is a satellite conjunction?',
    answer: 'A conjunction is a predicted close approach between two objects in orbit — two satellites, or a satellite and a piece of debris. Tracking networks propagate every catalogued object forward, and when two paths come within a screening volume (typically a few kilometres) a Conjunction Data Message (CDM) is issued describing the time of closest approach, the predicted miss distance and, where covariance allows, a collision probability.',
  },
  {
    question: 'What miss distance actually matters?',
    answer: 'Miss distance alone is a poor guide because position uncertainty can be hundreds of metres to kilometres. Operators act on collision probability (Pc), which combines miss distance with the uncertainty of both objects. The widely used decision line is Pc of 1 in 10,000 (1e-4): above it most operators plan an avoidance maneuver; between 1e-5 and 1e-4 they watch and refine tracking. A 100 m miss with tight covariance can be safer than a 1 km miss with poor tracking.',
  },
  {
    question: 'Who maneuvers, and who decides?',
    answer: 'Whichever object is active and maneuverable is expected to move — debris cannot. When both are active satellites, operators coordinate directly or through the 18th/19th Space Defense Squadron and commercial services; large constellations such as Starlink maneuver automatically when Pc exceeds their internal threshold. There is no binding right-of-way rule in orbit, which is why conjunction data being public matters.',
  },
  {
    question: 'Where do these rows come from?',
    answer: 'The live table reads the public CDM class on Space-Track.org, the US Space Force catalogue service. SpaceNexus fetches CDMs created in the last seven days with a future time of closest approach every six hours. Space-Track requires a free account; if the fetch credentials are not configured the live table is empty and the page says so rather than showing stand-in data as real.',
  },
];

const LEVEL: Record<AlertLevel, { word: string; glyph: string; text: string; bg: string }> = {
  green: { word: 'Green', glyph: '●', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  yellow: { word: 'Yellow', glyph: '◐', text: 'text-amber-300', bg: 'bg-amber-500/10' },
  orange: { word: 'Orange', glyph: '▲', text: 'text-orange-300', bg: 'bg-orange-500/10' },
  red: { word: 'Red', glyph: '■', text: 'text-red-300', bg: 'bg-red-500/10' },
};

function fmtTca(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
}

function fmtMiss(m: number): string {
  return m >= 10_000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function fmtPc(pc: number | null): string {
  if (pc == null) return '—';
  if (pc >= 0.01) return pc.toFixed(3);
  return pc.toExponential(1);
}

function LevelBadge({ level }: { level: AlertLevel }) {
  const l = LEVEL[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] ${l.text} ${l.bg}`}>
      <span aria-hidden="true">{l.glyph}</span>{l.word}
    </span>
  );
}

function ConjunctionTable({ rows, caption, showNote }: { rows: ConjunctionRow[]; caption: string; showNote: boolean }) {
  const now = Date.now();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
            <th className="py-2 pr-3">TCA (UTC)</th>
            <th className="py-2 pr-3">Objects</th>
            <th className="py-2 pr-3 text-right">Miss</th>
            <th className="py-2 pr-3 text-right">Pc</th>
            <th className="py-2 pr-3 text-right">Rel. vel.</th>
            <th className="py-2 pr-3">Level</th>
            {showNote && <th className="py-2">Note</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const past = Date.parse(r.tca) < now;
            return (
              <tr key={r.id} className={`border-b border-white/[0.04] ${past ? 'opacity-60' : ''}`}>
                <td className="py-2 pr-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">{fmtTca(r.tca)}{past ? <span className="text-slate-600 text-xs"> past</span> : null}</td>
                <td className="py-2 pr-3 text-white/90">
                  <span>{r.primary}</span>{r.primaryId ? <span className="text-slate-600 text-xs"> #{r.primaryId}</span> : null}
                  <span className="text-slate-500"> ↔ </span>
                  <span>{r.secondary}</span>{r.secondaryId ? <span className="text-slate-600 text-xs"> #{r.secondaryId}</span> : null}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{fmtMiss(r.missDistanceM)}</td>
                <td className={`py-2 pr-3 text-right font-mono tabular-nums ${r.pc != null && r.pc >= PC_RED ? 'text-red-300' : r.pc != null && r.pc >= PC_ORANGE ? 'text-orange-300' : 'text-slate-300'}`}>{fmtPc(r.pc)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">{r.relVelKmS == null ? '—' : `${r.relVelKmS.toFixed(1)} km/s`}</td>
                <td className="py-2 pr-3"><LevelBadge level={r.level} /></td>
                {showNote && <td className="py-2 text-slate-500 text-xs capitalize">{r.note || '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ConjunctionsPage() {
  const data = await getConjunctionsPage();
  const liveFresh = data?.live.fetchedAt ? Date.now() - Date.parse(data.live.fetchedAt) < 12 * 3600_000 : false;

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80 inline-flex items-center min-h-[44px]">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/satellites" className="hover:text-white/80 inline-flex items-center min-h-[44px]">Satellites</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Conjunctions</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Satellite Conjunctions</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Predicted close approaches between catalogued objects, read straight from the public conjunction data
            messages on Space-Track.org: when, which two objects, how close, and how likely a collision actually is.
            Sorted by time of closest approach.
          </p>
        </header>

        {!data ? (
          <EmptyState
            icon={<span aria-hidden="true" className="text-2xl">🛰️</span>}
            title="Conjunction data is temporarily unavailable"
            description="The stored CDM feed and the reference scenarios could not be loaded on this request."
            reason="Both reads come from the site database; a connection hiccup, not a change upstream. Reload in a minute."
            suggestions={[{ label: 'Satellite tracker', href: '/satellites' }, { label: 'Debris monitor', href: '/space-environment?tab=debris' }]}
          />
        ) : (
          <div className="space-y-6">
            {/* Headline counts — live feed only; never inflated with curated rows */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label="Public CDMs on file" value={data.live.rows.length} sub={data.live.rows.length ? `${data.live.upcoming} with TCA ahead` : 'Space-Track feed empty'} />
              <Telemetry label="Red · Orange" value={data.live.rows.length ? `${data.live.counts.red} · ${data.live.counts.orange}` : '—'} sub={`Pc ≥ ${PC_RED.toExponential(0)} · ≥ ${PC_ORANGE.toExponential(0)}`} tone={data.live.counts.red > 0 ? 'ember' : 'ink'} />
              <Telemetry label="Next TCA" value={data.live.nextTca ? fmtTca(data.live.nextTca) : '—'} sub="earliest upcoming" tone="ink" />
              <Telemetry label="Closest miss" value={data.live.closestMissM == null ? '—' : fmtMiss(data.live.closestMissM)} sub="in the stored feed" tone="ink" />
            </div>

            {/* Live table */}
            <Console
              title="Close approaches — Space-Track public CDMs"
              source="Space-Track.org cdm_public"
              asOf={data.live.fetchedAt}
              status={data.live.rows.length === 0 ? 'off' : liveFresh ? 'live' : 'stale'}
            >
              {data.live.rows.length === 0 ? (
                <EmptyState
                  icon={<span aria-hidden="true" className="text-2xl">📡</span>}
                  title="No public CDMs stored"
                  description={data.live.credentialsConfigured
                    ? 'The Space-Track feed is configured but returned nothing on its last run.'
                    : 'Space-Track credentials are not configured on this deployment, so the six-hourly CDM fetch is skipped.'}
                  reason={data.live.credentialsConfigured
                    ? `The fetch runs every six hours and keeps CDMs created in the last seven days with a future TCA${data.live.fetchedAt ? `; last successful store ${fmtTca(data.live.fetchedAt)}` : '; no successful store on record'}. An empty result after a login is rare — the next run, or a Space-Track outage, will explain it.`
                    : 'Space-Track requires a free account; the fetcher returns silently without SPACE_TRACK_USER and SPACE_TRACK_PASS. Until they are set, this table stays empty rather than showing reference rows as live alerts.'}
                  suggestions={[{ label: 'Satellite tracker', href: '/satellites' }, { label: 'Debris monitor', href: '/space-environment?tab=debris' }]}
                />
              ) : (
                <>
                  <ConjunctionTable rows={data.live.rows} caption="Space-Track public conjunction data messages sorted by time of closest approach" showNote={false} />
                  <p className="mt-2 text-xs text-slate-500">
                    Miss distance and Pc are as published in the CDM. Relative velocity is not carried by the public
                    class SpaceNexus stores. Rows marked <span className="text-slate-400">past</span> have a TCA earlier than now
                    and remain until the next refresh drops them.
                  </p>
                </>
              )}
            </Console>

            {/* What this means */}
            <Console title="What this means">
              <div className="text-sm text-white/80 leading-relaxed space-y-2">
                <p>
                  A CDM is a warning, not a verdict. Most close approaches resolve as tracking improves and the predicted
                  miss grows; only a small fraction ever cross the maneuver line. The level column here is SpaceNexus&apos;s
                  reading of each row: <LevelBadge level="red" /> collision probability at or above {PC_RED.toExponential(0)} (the common
                  maneuver-decision threshold), <LevelBadge level="orange" /> at or above {PC_ORANGE.toExponential(0)} (watch and refine),
                  {' '}<LevelBadge level="yellow" /> a predicted miss under {MISS_YELLOW_M.toLocaleString('en-US')} m with a lower or
                  unreported Pc, and <LevelBadge level="green" /> everything else.
                </p>
                <p>
                  Debris cannot move, so a satellite-versus-debris conjunction is entirely on the satellite operator.
                  Two active satellites must coordinate; large constellations maneuver automatically at their own
                  internal threshold, which is why so many CDMs involving them never become news.
                </p>
              </div>
            </Console>

            {/* Curated reference scenarios — clearly not live */}
            <Console
              title="Reference scenarios — curated, not live alerts"
              source="SpaceNexus curated"
              status="off"
            >
              {data.curated.rows.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No reference scenarios seeded. They are optional teaching rows; the live feed above is the record.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mb-3">
                    {data.curated.rows.length} hand-written examples ({data.curated.counts.red} red, {data.curated.counts.orange} orange,
                    {' '}{data.curated.counts.yellow} yellow, {data.curated.counts.green} green) showing how conjunctions of each
                    level read — object pairs, miss distances and probabilities modelled on real event classes such as the
                    COSMOS 1408 debris field. Times are relative to when the scenarios were seeded. They do not describe
                    real, current close approaches and are not counted in the headline figures.
                  </p>
                  <ConjunctionTable rows={data.curated.rows} caption="Curated reference conjunction scenarios, not live alerts" showNote={true} />
                </>
              )}
            </Console>

            {/* FAQ */}
            <Console title="Reading a conjunction">
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
              title="Satellite Conjunctions"
              pageUrl={PAGE_URL}
              sourceLine="SpaceNexus Satellite Conjunctions (Space-Track.org public conjunction data messages)"
            />

            <div className="space-y-1">
              <Provenance source="Space-Track.org public CDMs" asOf={data.live.fetchedAt} />
              <p className="text-sm text-slate-500">
                Related: <Link href="/satellites" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Satellite tracker</Link>{' · '}
                <Link href="/space-environment?tab=debris" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Debris monitor</Link>{' · '}
                <Link href="/how-many-satellites" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">How many satellites?</Link>{' · '}
                <Link href="/space-weather" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Space weather</Link>{' · '}
                <Link href="/sustainability-scorecard" className="text-cyan-300 hover:underline inline-flex items-center min-h-[44px]">Sustainability scorecard</Link>
              </p>
            </div>
          </div>
        )}

        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Satellites', href: '/satellites' }, { name: 'Conjunctions' }]} />
        <FAQSchema items={FAQ} />
      </div>
    </div>
  );
}
