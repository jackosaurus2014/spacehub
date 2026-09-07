import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getRocketScorecard, summarizeScorecard, fmtPrice, fmtPerKg, type ScorecardRow, fmtNextLaunch } from '@/lib/rocket-scorecard';
import { getLaunchCadence } from '@/lib/launch-cadence';
import { getVehicleStatus } from '@/lib/vehicle-status';
import { formatLaunchDate } from '@/components/launches/LaunchRow';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';

// "Which rockets are actually flying in 2026?" (2026-09-06). More orbital-
// class rockets are operational at once than at any point in history, and
// the question is answered everywhere with brochures. This is the tracker's
// answer: every vehicle in our registry ranked by launches this year, with
// its last flight, its next flight and its record, read at request time.
// Shares its derivation with the launch-cost and launch-schedule guides
// (src/lib/rocket-scorecard.ts), so the three never disagree.
export const dynamic = 'force-dynamic';

const SLUG = 'rockets-flying-in-2026';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const DESCRIPTION =
  'Every orbital rocket ranked by launches this year, live from our tracker: flights, failures, last and next launch, lift, list price and lifetime record. Which are flying, which are quiet, which have not flown yet, and what to watch.';
/** Bumped by hand when the prose changes. The scorecard is live. */
const LAST_EDITED = '2026-09-06T00:00:00Z';

const getCard = cache(() => getRocketScorecard(new Date()));

function titleFor(flying: number): string {
  return flying > 0
    ? `Which Rockets Are Flying in 2026? Live Scorecard of ${flying} Active Vehicles`
    : 'Which Rockets Are Flying in 2026? The Live Scorecard';
}

export async function generateMetadata(): Promise<Metadata> {
  let flying = 0;
  let description = DESCRIPTION;
  try {
    const rows = await getCard();
    const s = summarizeScorecard(rows);
    flying = s.flyingCount;
    if (s.busiest) description = `${s.flyingCount} orbital rockets have flown or are scheduled this year; ${s.busiest.name} leads with ${s.busiest.thisYear} launches. ${DESCRIPTION}`;
  } catch { /* static */ }
  const title = titleFor(flying);
  return {
    title,
    description,
    keywords: ['rockets flying in 2026', 'active rockets 2026', 'which rockets are operational', 'orbital rockets list', 'rocket launch count 2026', 'falcon 9 launches 2026', 'starship launches 2026', 'new glenn status'],
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'scorecard', label: 'The scorecard (live)' },
  { id: 'read', label: 'How to read it' },
  { id: 'flying', label: 'Flying now' },
  { id: 'quiet', label: 'Operational but quiet' },
  { id: 'development', label: 'Not yet flown' },
  { id: 'watch', label: 'What to watch' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'How many rockets are flying in 2026?', a: 'The scorecard on this page counts them live: every vehicle in our registry that has launched this year or has a launch on the manifest. The number in the title is that count at the moment the page loaded.' },
  { q: 'Which rocket launches the most?', a: 'Falcon 9, by a margin no other vehicle approaches — it flies more missions in a typical month than most rockets fly in a year. The live table shows the exact count this year and in the last 90 days.' },
  { q: 'Is Starship operational?', a: 'It is flying operational payloads — Starlink V3 batches since July 2026 — while still working toward routine full reuse. It appears on the scorecard with its flight count and next tracked launch.' },
  { q: 'Why is New Glenn listed as quiet?', a: 'Because it is grounded. After an upper-stage anomaly on its third flight in April 2026 and a static-fire explosion that damaged its only pad in May, Blue Origin is targeting a return to flight before the end of the year. When the tracker holds a next launch, it moves back to the flying list.' },
  { q: 'What counts as a launch here?', a: 'A lift-off — status completed or failed — with a rocket named in the record. Scrubs and stand-downs are not launches. This is the same definition our cadence index and launch-schedule guide use, so the three pages agree.' },
  { q: 'Where do the prices come from?', a: 'From our launch-vehicle registry: published list prices where a provider publishes one, reported figures otherwise, and a dash where neither exists. The cost-per-kilogram column assumes a full payload to low Earth orbit. Our launch-cost guide goes deeper.' },
  { q: 'Which new rockets are expected to debut?', a: 'The "not yet flown" section lists every registry vehicle still in development, and the scorecard flags any with a first flight on the manifest. Rocket Lab\'s Neutron and Relativity\'s Terran R are the ones to watch for a late-2026 debut.' },
];

function StatusPill({ r }: { r: ScorecardRow }) {
  const map: Record<ScorecardRow['activity'], string> = {
    flying: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    quiet: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    development: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    retired: 'bg-white/10 text-slate-300 border-white/10',
  };
  const label: Record<ScorecardRow['activity'], string> = { flying: 'Flying', quiet: 'Quiet', development: 'Not yet flown', retired: 'Retired' };
  return <span className={`inline-block text-[10px] uppercase tracking-wider border rounded px-2 py-0.5 ${map[r.activity]}`}>{label[r.activity]}</span>;
}

export default async function RocketsFlyingGuide() {
  const [rows, cadence] = await Promise.all([getCard().catch(() => [] as ScorecardRow[]), getLaunchCadence().catch(() => null)]);
  const summary = summarizeScorecard(rows);
  const title = titleFor(summary.flyingCount);
  const edited = new Date(LAST_EDITED);
  const flying = rows.filter((r) => r.activity === 'flying');
  const quiet = rows.filter((r) => r.activity === 'quiet');
  const dev = rows.filter((r) => r.activity === 'development');
  const retired = rows.filter((r) => r.activity === 'retired');
  const busiestSite = flying[0];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Rockets flying in 2026</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Brochures say what a rocket can do. The launch tracker says what it did. This is every orbital vehicle in our registry ranked by launches this year — with failures, the last and next flight, lift, price and lifetime record — read from the tracker at the moment you loaded the page.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · scorecard live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={1900} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-rockets-index.webp" className="mb-8" />

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">In this guide</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">{i + 1}. {item.label}</a></li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              <section id="verdict">
                <h2 className="text-2xl font-bold text-white mb-4">The short answer</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Flying this year</div><div className="text-2xl font-bold text-white tabular-nums">{summary.flyingCount}</div><div className="text-xs text-slate-400 mt-1">vehicles with a 2026 flight or a next launch</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Launches by them, 2026</div><div className="text-2xl font-bold text-white tabular-nums">{summary.flownThisYear}</div><div className="text-xs text-slate-400 mt-1">{cadence ? `of ${cadence.thisYearToDate} orbital attempts tracked` : 'lift-offs, incl. failures'}</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Busiest</div><div className="text-2xl font-bold text-white truncate">{summary.busiest?.name ?? '—'}</div><div className="text-xs text-slate-400 mt-1">{summary.busiest ? `${summary.busiest.thisYear} launches this year` : ''}</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Debuting soon</div><div className="text-2xl font-bold text-white tabular-nums">{summary.debutingSoon.length}</div><div className="text-xs text-slate-400 mt-1">{summary.debutingSoon.slice(0, 2).map((r) => r.name).join(', ') || 'none on the manifest'}</div></div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  {summary.flyingCount} orbital rockets have flown this year or have a launch on the manifest{summary.busiest ? <>, and one of them — <Link href={`/rockets/${summary.busiest.slug}`} className="text-cyan-400 hover:text-cyan-300">{summary.busiest.name}</Link> — accounts for {summary.flownThisYear > 0 ? Math.round((summary.busiest.thisYear / summary.flownThisYear) * 100) : 0}% of their launches</> : ''}. The rest of the field divides into a few vehicles flying monthly, a longer tail flying a few times a year, and a handful of operational rockets that have not flown at all this year — grounded, between customers, or waiting on a pad.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  That concentration is the story of 2026 launch: more distinct rockets are operational than ever, and the market is still one company&apos;s. Every number here comes from the tracker, not from a press kit, so &ldquo;operational&rdquo; on this page means &ldquo;has actually flown recently&rdquo;.
                </p>
              </section>

              <section id="scorecard">
                <h2 className="text-2xl font-bold text-white mb-4">The scorecard (live)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <caption className="text-left text-xs text-slate-500 mb-2">Ranked by launches this year, then by the last 90 days. A launch is a lift-off (completed or failed); scrubs are not counted. Registry figures (lift, price, lifetime record) are hand-verified; everything with a date is live.</caption>
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Vehicle</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">2026</th><th className="px-3 py-2.5 text-right">90 days</th><th className="px-3 py-2.5">Last flight</th><th className="px-3 py-2.5">Next launch</th><th className="px-3 py-2.5 text-right">To LEO</th><th className="px-3 py-2.5 text-right">List price</th><th className="px-3 py-2.5 text-right">Lifetime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.slug} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-3 py-2.5 text-slate-500 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2.5 text-white"><Link href={`/rockets/${r.slug}`} className="hover:text-cyan-300">{r.name}</Link><span className="block text-xs text-slate-500">{r.manufacturer} · {r.country}</span></td>
                          <td className="px-3 py-2.5"><StatusPill r={r} /></td>
                          <td className="px-3 py-2.5 text-right text-white tabular-nums">{r.thisYear}{r.thisYearFailed > 0 ? <span className="text-red-300 text-xs"> ({r.thisYearFailed}✕)</span> : null}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{r.last90Days}</td>
                          <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{r.lastFlight ? formatLaunchDate(r.lastFlight, false) : '—'}</td>
                          <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{r.nextLaunch ? fmtNextLaunch(r.nextLaunch, r.nextLaunchPrecision) : '—'}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{r.payloadLeoKg.toLocaleString('en-US')} kg</td>
                          <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{fmtPrice(r.costMillions)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{r.lifetimeLaunches > 0 ? `${r.lifetimeLaunches} · ${r.lifetimeSuccessRate}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 && <p className="text-slate-500 text-sm mt-3">The live scorecard is unavailable right now — the <Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">rocket index</Link> has every vehicle.</p>}
              </section>

              <section id="read">
                <h2 className="text-2xl font-bold text-white mb-4">How to read it</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Status</strong> is derived, not declared. <em>Flying</em> means the vehicle has launched this year or has a launch on the manifest. <em>Quiet</em> means the registry calls it operational but the tracker holds neither — grounded, between customers, or waiting on a pad. <em>Not yet flown</em> is a vehicle in development, and it moves to flying the moment a first launch appears on the manifest.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">2026 and 90 days</strong> are lift-off counts; a failure counts as a launch and is marked. The 90-day column is the better cadence measure for a rocket that has just returned to flight or just started flying.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Lifetime</strong> is the registry&apos;s hand-verified all-time count and success rate, which covers flights before our tracker&apos;s history begins. Where a list price is a dash, the provider does not publish one and no reliable figure has been reported; our <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">launch-cost guide</Link> explains what is known.
                </p>
              </section>

              <section id="flying">
                <h2 className="text-2xl font-bold text-white mb-4">Flying now</h2>
                {flying.length > 0 ? (
                  <ul className="space-y-3">
                    {flying.map((r) => (
                      <li key={r.slug} className="flex items-start gap-3 text-slate-400 leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true" />
                        <span><Link href={`/rockets/${r.slug}`} className="text-white font-medium hover:text-cyan-300">{r.name}</Link> — {r.thisYear} launch{r.thisYear === 1 ? '' : 'es'} this year{r.thisYearFailed > 0 ? ` (${r.thisYearFailed} failed)` : ''}{r.last90Days > 0 ? `, ${r.last90Days} in the last 90 days` : ''}{r.nextLaunch ? `; next on ${fmtNextLaunch(r.nextLaunch, r.nextLaunchPrecision)}` : ''}{r.thisYear === 0 && r.nextLaunch ? ' — first flight of the year' : ''}.</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-sm">Unavailable right now.</p>}
              </section>

              <section id="quiet">
                <h2 className="text-2xl font-bold text-white mb-4">Operational but quiet</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Rockets the registry lists as operational that the tracker has not seen fly this year and holds no next launch for. Each has a reason — a grounding, a retiring line, a market that dried up, or simply a customer gap — and each is one manifest entry away from moving up.
                </p>
                {quiet.length > 0 ? (
                  <ul className="space-y-2">
                    {quiet.map((r) => (
                      <li key={r.slug} className="flex items-start gap-3 text-slate-400 text-sm">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
                        <span><Link href={`/rockets/${r.slug}`} className="text-white hover:text-cyan-300">{r.name}</Link> · {r.manufacturer}{r.lastFlight ? ` · last tracked flight ${formatLaunchDate(r.lastFlight, false)}` : ''} · lifetime {r.lifetimeLaunches} at {r.lifetimeSuccessRate}%{getVehicleStatus(r.slug) ? <span className="block text-slate-300 mt-0.5">{getVehicleStatus(r.slug)!.headline} <span className="text-slate-500">(as of {getVehicleStatus(r.slug)!.asOf})</span></span> : null}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-sm">Every operational vehicle in the registry has flown or is scheduled this year.</p>}
              </section>

              <section id="development">
                <h2 className="text-2xl font-bold text-white mb-4">Not yet flown</h2>
                {dev.length > 0 ? (
                  <ul className="space-y-2">
                    {dev.map((r) => (
                      <li key={r.slug} className="flex items-start gap-3 text-slate-400 text-sm">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" />
                        <span><Link href={`/rockets/${r.slug}`} className="text-white hover:text-cyan-300">{r.name}</Link> · {r.manufacturer} · {r.payloadLeoKg.toLocaleString('en-US')} kg to LEO{r.nextLaunch ? ` · first flight on the manifest for ${fmtNextLaunch(r.nextLaunch, r.nextLaunchPrecision)}` : ' · no first flight on the manifest yet'}{getVehicleStatus(r.slug) ? <span className="block text-slate-300 mt-0.5">{getVehicleStatus(r.slug)!.headline}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-sm">No vehicles in development in the registry.</p>}
                {retired.length > 0 && (
                  <p className="text-xs text-slate-500 mt-4">Retired this cycle: {retired.map((r) => r.name).join(', ')}.</p>
                )}
              </section>

              <section id="watch">
                <h2 className="text-2xl font-bold text-white mb-4">What to watch</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Starship&apos;s cadence.</strong> Each flight moves the price floor for everyone else. <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">New Glenn&apos;s return to flight</strong> from a rebuilt LC-36, and whether it reuses a booster again. <Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">The debutants.</strong> Any vehicle in the not-yet-flown list that gains a manifest date. Neutron and Terran R are the ones the market is waiting on.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Vulcan and Ariane 6 cadence</strong> — the two rockets governments bought as alternatives to SpaceX, and whether they reach the rates their customers were promised.</span></li>
                </ul>
                <div className="mt-6">
                  <LaunchCrossLinks rocket={busiestSite?.name ?? 'Falcon 9'} upcoming hide={['mc', 'site', 'watch']} />
                </div>
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently asked</h2>
                <div className="space-y-4">
                  {FAQ.map((f) => (
                    <div key={f.q}>
                      <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Keep going</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">Rocket index</Link> — every vehicle&apos;s full page and flight log.</li>
                  <li><Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">What each rocket costs</Link> — list prices and cost per kilogram.</li>
                  <li><Link href="/guide/space-launch-schedule-2026" className="text-cyan-400 hover:text-cyan-300">2026 launch schedule</Link> — month by month, live.</li>
                  <li><Link href="/launch-cadence" className="text-cyan-400 hover:text-cyan-300">Launch cadence index</Link> — this year against last, by provider and country.</li>
                </ul>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: title, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Rockets flying in 2026' }]} />
        </div>
      </div>
    </div>
  );
}
