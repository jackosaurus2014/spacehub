import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { SITE_STATS } from '@/lib/site-stats';
import NewsletterSignup from '@/components/NewsletterSignup';

import { getLaunchCadence } from '@/lib/launch-cadence';
import { getLaunchCalendar, launchDisplayName } from '@/lib/launch-calendar';
import { getSlipData, RECORDING_SINCE } from '@/lib/launch-slips';
import { getRocketScorecard, fmtNextLaunch } from '@/lib/rocket-scorecard';
import { formatLaunchDate } from '@/components/launches/LaunchRow';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';

// Tier 2 #11 (2026-09-06). This page carries ~27k impressions a month and,
// until today, showed a hand-typed month grid reading "Flown / 25-30
// expected" for every month and a providers table of estimates. Every
// count below now comes from the tracker at request time: launches flown
// per month, the next thirty days as a clickable list, providers ranked by
// launches this year against the same date last year, the vehicles that
// are actually flying, and the manifest changes we recorded this week.
// force-dynamic rather than ISR because the Railway build container has
// no database.
export const dynamic = 'force-dynamic';
/** Bumped by hand when the prose changes. Live figures do not move it. */
const LAST_EDITED = '2026-09-06T00:00:00Z';

export const metadata: Metadata = {
  title: 'Cape Canaveral Launch Schedule: 150+ in 2026',
  description:
    'See every Cape Canaveral rocket launch in 2026 -- SpaceX, ULA, and Blue Origin missions from SLC-40 and SLC-41, with dates, times, and how to watch live.',
  keywords: [
    'cape canaveral launch schedule 2026',
    'space launch schedule 2026',
    'rocket launch schedule',
    'SpaceX launch schedule',
    'upcoming rocket launches',
    'satellite launch dates',
    'Starship launch date',
    'space launch calendar',
    'orbital launch manifest',
  ],
  openGraph: {
    title: 'Cape Canaveral Launch Schedule: 150+ in 2026',
    description:
      'See every Cape Canaveral rocket launch in 2026 -- SpaceX, ULA, and Blue Origin missions, with dates, times, and how to watch live.',
    type: 'article',
    publishedTime: '2026-02-14T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-schedule-2026',
  },
};

const TOC = [
  { id: 'overview', label: 'Launch Activity Overview' },
  { id: 'providers', label: 'Launch Providers' },
  { id: 'monthly', label: 'Month-by-Month Schedule' },
  { id: 'vehicles', label: 'Launch Vehicles in 2026' },
  { id: 'sites', label: 'Launch Sites' },
  { id: 'milestones', label: 'Key Milestones' },
  { id: 'track', label: 'How to Track Launches' },
  { id: 'faq', label: 'FAQ' },
];


const LAUNCH_SITES = [
  { name: 'Kennedy Space Center (KSC)', location: 'Florida, USA', pads: 'LC-39A, LC-39B' },
  { name: 'Cape Canaveral SFS', location: 'Florida, USA', pads: 'SLC-40, SLC-41' },
  { name: 'Vandenberg SFB', location: 'California, USA', pads: 'SLC-4E, SLC-6' },
  { name: 'Mahia Peninsula', location: 'New Zealand', pads: 'LC-1A, LC-1B' },
  { name: 'Kourou', location: 'French Guiana', pads: 'ELA-4 (Ariane 6)' },
  { name: 'Boca Chica (Starbase)', location: 'Texas, USA', pads: 'OLP-A, OLP-B' },
  { name: 'Satish Dhawan', location: 'Sriharikota, India', pads: 'FLP, SLP' },
  { name: 'Wenchang', location: 'Hainan, China', pads: 'LC-1, LC-2' },
];

const FAQ_ITEMS = [
  {
    question: 'How many rocket launches are expected in 2026?',
    answer: `2026 is on track to exceed the record ${SITE_STATS.launches2025} orbital launch attempts set in 2025. SpaceX alone completed roughly 80 Falcon 9 missions before mid-2026 and is on pace for 150 or more this year, with China conducting 90+ launches and Europe, India, and emerging providers adding the rest.`,
  },
  {
    question: 'Where can I watch rocket launches live?',
    answer: 'SpaceNexus provides live launch tracking with countdown timers and links to official webcasts. Most launches are streamed live on YouTube by their providers (SpaceX, Rocket Lab, ULA, etc.). SpaceNexus aggregates all launch streams in one place.',
  },
  {
    question: 'What is the most anticipated launch of 2026?',
    answer: 'The year\'s biggest moments have already included Artemis II, NASA\'s first crewed lunar flyby since Apollo (flown April 2026), and Starship\'s first operational payload deployment of Starlink V3 satellites in July. Still ahead: Rocket Lab\'s Neutron debut, SpaceX\'s Starship propellant-transfer demonstration, JAXA\'s MMX Mars-moon sample-return launch window (October-December), and ESA\'s PLATO exoplanet telescope on Ariane 62 in December.',
  },
  {
    question: 'How do I get launch notifications?',
    answer: 'Enter your email on any launch, rocket or launch-site page on SpaceNexus and you get three emails for that scope — a day before, an hour before, and when it flies — with no account. The form on this page covers the next launch on the manifest. Signed-in members can also enable push notifications and customise alerts by provider, vehicle or mission type.',
  },
  {
    question: 'What launch vehicles are new in 2026?',
    answer: 'Starship reached a major operational milestone in July 2026, deploying its first functioning payloads (Starlink V3). Both the Super Heavy booster and the Starship upper stage completed controlled ocean splashdowns on that flight, though recovery/salvage of the floating ship stage was not confirmed. Rocket Lab Neutron is targeting its first flight late in the year, Blue Origin New Glenn is ramping commercial cadence after its 2025 debut, and Relativity Space Terran R and several small launchers from Firefly and international startups round out the new entrants.',
  },
];

export default async function SpaceLaunchSchedule2026Page() {
  const [cadence, calendar, slips, scorecard] = await Promise.all([
    getLaunchCadence().catch(() => null),
    getLaunchCalendar().catch(() => null),
    getSlipData().catch(() => null),
    getRocketScorecard().catch(() => []),
  ]);
  const edited = new Date(LAST_EDITED);
  const next = calendar?.nextLaunch ?? null;
  const flying = scorecard.filter((r) => r.activity === 'flying').slice(0, 10);
  const isFlorida = (loc: string | null) => /cape canaveral|kennedy|ksc|florida/i.test(loc ?? '');
  const fromCape = (calendar?.next30Days ?? []).filter((l) => isFlorida(l.location)).slice(0, 8);
  const fmtDay = (iso: string) => formatLaunchDate(new Date(iso), false);
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6">
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cape Canaveral Launch Schedule 2026 — and Every Mission Worldwide This Year
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              A comprehensive, continuously updated guide to 2026 launch activity — what has flown
              so far this record-setting year, and every major mission still to come before December.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
                <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · counts live from the tracker</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={3000} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-launch-schedule.webp" className="mb-8" />

          {/* Table of Contents */}
          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">Table of Contents</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content */}
          <ScrollReveal delay={0.1}>
          <article className="card p-8 space-y-10">
            {/* Overview */}
            <section id="overview">
                <h2 className="text-2xl font-bold text-white mb-4">Launch Activity Overview</h2>
                {cadence && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="card p-4"><div className="text-xs text-slate-500 mb-1">Orbital launches, {cadence.year} to date</div><div className="text-2xl font-bold text-white tabular-nums">{cadence.thisYearToDate}</div><div className="text-xs text-slate-400 mt-1">lifted off, incl. failures</div></div>
                    <div className="card p-4"><div className="text-xs text-slate-500 mb-1">Same date last year</div><div className="text-2xl font-bold text-white tabular-nums">{cadence.lastYearToDate}</div><div className={`text-xs mt-1 ${cadence.paceDeltaPct != null && cadence.paceDeltaPct < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{cadence.paceDeltaPct != null ? `${cadence.paceDeltaPct >= 0 ? '+' : ''}${cadence.paceDeltaPct}% pace` : '—'}</div></div>
                    <div className="card p-4"><div className="text-xs text-slate-500 mb-1">Projected full year</div><div className="text-2xl font-bold text-white tabular-nums">{cadence.projectedFullYear}</div><div className="text-xs text-slate-400 mt-1">at the current pace</div></div>
                    <div className="card p-4"><div className="text-xs text-slate-500 mb-1">Success rate this year</div><div className="text-2xl font-bold text-white tabular-nums">{cadence.successRateThisYear}%</div><div className="text-xs text-slate-400 mt-1"><Link href="/launch-cadence" className="text-cyan-400 hover:text-cyan-300">Cadence index &rarr;</Link></div></div>
                  </div>
                )}
                <p className="text-slate-400 leading-relaxed mb-4">
                  2026 is the busiest year in spaceflight history. 2025 set the standing record with{' '}
                <strong className="text-slate-300">{SITE_STATS.launches2025} orbital launch attempts</strong> — a 25 percent
                jump over 2024 — and 2026 is running ahead of that pace. SpaceX completed roughly 80
                Falcon 9 missions before mid-year and is on pace for 150 or more, accounting for close
                to half of global launches, while China maintains a robust 90+ launch campaign.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                The year has already delivered historic milestones: Artemis II carried a crew around
                the Moon in April, and Starship deployed its first operational payloads — 20 Starlink
                V3 satellites — in July. Both the booster and upper stage completed controlled ocean
                splashdowns on that flight, though recovery of the floating ship stage was not
                confirmed. Blue Origin&apos;s New Glenn is ramping toward operational cadence, Ariane 6
                is flying regularly in Europe, and the mega-constellation buildout continues with
                Starlink, OneWeb, and Amazon Leo (formerly Project Kuiper) all requiring dozens of flights.
              </p>
              <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                <p className="text-white/90 text-sm">
                  <strong>Live tracking:</strong> SpaceNexus tracks every launch in real time with countdown
                  timers, mission details, and launch vehicle specs.{' '}
                  <Link href="/launch" className="text-slate-300 underline hover:text-slate-300">
                    View the live launch dashboard &rarr;
                  </Link>
                </p>
              </div>
            </section>

            {/* Providers */}
              <section id="providers">
                <h2 className="text-2xl font-bold text-white mb-4">Launch Providers in 2026</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Providers ranked by orbital launches this year, against their own count on the same date last year. A launch counts when it lifts off — scrubs do not — and the success rate is this year&apos;s.
                </p>
                {cadence && cadence.providers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="py-3 pr-4 text-left text-slate-300 font-semibold">Provider</th>
                          <th className="py-3 pr-4 text-right text-slate-300 font-semibold">{cadence.year} to date</th>
                          <th className="py-3 pr-4 text-right text-slate-300 font-semibold">Same date {cadence.year - 1}</th>
                          <th className="py-3 pr-4 text-right text-slate-300 font-semibold">Change</th>
                          <th className="py-3 text-right text-slate-300 font-semibold">Success</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cadence.providers.map((p) => (
                          <tr key={p.provider} className="border-b border-white/[0.06]">
                            <td className="py-3 pr-4 text-white font-medium">{p.provider}</td>
                            <td className="py-3 pr-4 text-right text-white tabular-nums">{p.thisYear}</td>
                            <td className="py-3 pr-4 text-right text-slate-400 tabular-nums">{p.lastYearToDate}</td>
                            <td className={`py-3 pr-4 text-right tabular-nums ${p.delta > 0 ? 'text-emerald-300' : p.delta < 0 ? 'text-red-300' : 'text-slate-400'}`}>{p.delta > 0 ? '+' : ''}{p.delta}</td>
                            <td className="py-3 text-right text-slate-300 tabular-nums">{p.successRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Live provider counts are unavailable right now — the <Link href="/launch-cadence" className="text-cyan-400 hover:text-cyan-300">cadence index</Link> has them.</p>
                )}
                <p className="text-slate-400 text-sm mt-4">
                  <Link href="/company-profiles" className="text-slate-300 hover:underline">
                    View detailed profiles for {SITE_STATS.companies} space companies &rarr;
                  </Link>
                </p>
              </section>

            {/* Monthly */}
              <section id="monthly">
                <h2 className="text-2xl font-bold text-white mb-4">Month-by-Month Launch Schedule</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Launches that flew each month this year, and what is on the manifest for the months ahead. Manifests move constantly — the changes we record are further down — so the scheduled counts are a snapshot, not a promise, and a launch the feed only knows to the month is counted as “month-only” rather than as a date. For countdowns and streams, use{' '}
                  <Link href="/mission-control" className="text-slate-300 hover:underline">Mission Control</Link>.
                </p>
                {calendar ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {calendar.months.map((m) => (
                      <div key={m.month} className={`card p-3 text-center ${m.isCurrent ? 'border-cyan-500/40' : ''}`}>
                        <div className="text-sm font-semibold text-slate-300">{m.label} {calendar.year}</div>
                        {m.isPast || m.isCurrent ? (
                          <>
                            <div className="text-lg font-bold text-white mt-1 tabular-nums">{m.flown}</div>
                            <div className="text-xs text-slate-400">flown{m.failed > 0 ? ` · ${m.failed} failed` : ''}{m.isCurrent && m.scheduled > 0 ? ` · ${m.scheduled} to go` : ''}</div>
                          </>
                        ) : calendar.horizonMonth != null && m.month - 1 > calendar.horizonMonth ? (
                          <>
                            <div className="text-lg font-bold text-slate-500 mt-1">—</div>
                            <div className="text-xs text-slate-500">beyond the manifest window</div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-slate-300 mt-1 tabular-nums">{m.scheduled}</div>
                            <div className="text-xs text-slate-400">{m.scheduledCoarse > 0 ? `${m.scheduledDated} dated · ${m.scheduledCoarse} month-only` : 'on the manifest'}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">The live calendar is unavailable right now — <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Mission Control</Link> has every upcoming launch.</p>
                )}

                {calendar && calendar.next30Days.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-3">The next 30 days</h3>
                    <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06]">
                      {calendar.next30Days.slice(0, 12).map((l) => (
                        <li key={l.id}>
                          <Link href={`/launch/${l.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.04] transition-colors">
                            <span className="min-w-0">
                              <span className="block text-sm text-white truncate">{launchDisplayName(l.name, l.rocket)}</span>
                              <span className="block text-xs text-slate-400 truncate">{[l.rocket, l.agency, l.location].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className="text-xs text-slate-300 whitespace-nowrap tabular-nums">{fmtDay(l.launchDate)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {calendar.next30Days.length > 12 && (
                      <p className="text-xs text-slate-500 mt-2">{calendar.next30Days.length - 12} more in the next 30 days on <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Mission Control</Link>.</p>
                    )}
                  </div>
                )}

                {fromCape.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-3">From Cape Canaveral and Kennedy</h3>
                    <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06]">
                      {fromCape.map((l) => (
                        <li key={l.id}>
                          <Link href={`/launch/${l.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.04] transition-colors">
                            <span className="min-w-0"><span className="block text-sm text-white truncate">{launchDisplayName(l.name, l.rocket)}</span><span className="block text-xs text-slate-400 truncate">{[l.rocket, l.agency].filter(Boolean).join(' · ')}</span></span>
                            <span className="text-xs text-slate-300 whitespace-nowrap tabular-nums">{fmtDay(l.launchDate)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500 mt-2">Full Florida manifest and archive: <Link href="/launches/cape-canaveral" className="text-cyan-400 hover:text-cyan-300">Cape Canaveral launch schedule</Link> · <Link href="/guide/watch-a-launch-cape-canaveral" className="text-cyan-400 hover:text-cyan-300">how to watch in person</Link>.</p>
                  </div>
                )}

                {slips && slips.totalChanges > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-3">Manifest changes we recorded</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Every date move on the manifest, recorded as we observe it (since {RECORDING_SINCE} — no upstream source keeps this history). {slips.totalChanges.toLocaleString('en-US')} changes across {slips.launchesTracked.toLocaleString('en-US')} launches so far{slips.biggestRecentSlipDays != null ? `; the biggest recent slip was ${slips.biggestRecentSlipDays} days` : ''}.
                    </p>
                    <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06]">
                      {slips.recent.slice(0, 5).map((r) => (
                        <li key={`${r.eventId}-${r.observedAt}`} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                          <Link href={`/launch/${r.eventId}`} className="min-w-0 text-white hover:text-cyan-300 truncate">{r.mission}</Link>
                          <span className={`whitespace-nowrap tabular-nums text-xs ${r.deltaDays > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{r.deltaDays > 0 ? `+${r.deltaDays}d later` : `${Math.abs(r.deltaDays)}d earlier`} · {fmtDay(r.toDate)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500 mt-2"><Link href="/launch-slips" className="text-cyan-400 hover:text-cyan-300">Slip explorer &rarr;</Link></p>
                  </div>
                )}
              </section>

            {/* Vehicles */}
              <section id="vehicles">
                <h2 className="text-2xl font-bold text-white mb-4">Launch Vehicles Active in 2026</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The rockets that have actually flown this year or have a flight on the manifest, ranked by launches this year — from the tracker, not a brochure. Each links to its full record.
                </p>
                {flying.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="py-3 pr-4 text-left text-slate-300 font-semibold">Vehicle</th>
                          <th className="py-3 pr-4 text-right text-slate-300 font-semibold">This year</th>
                          <th className="py-3 pr-4 text-right text-slate-300 font-semibold">Last 90 days</th>
                          <th className="py-3 pr-4 text-left text-slate-300 font-semibold">Next launch</th>
                          <th className="py-3 text-right text-slate-300 font-semibold">To LEO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flying.map((r) => (
                          <tr key={r.slug} className="border-b border-white/[0.06]">
                            <td className="py-3 pr-4 text-white font-medium"><Link href={`/rockets/${r.slug}`} className="hover:text-cyan-300">{r.name}</Link><span className="text-slate-500 text-xs"> · {r.manufacturer}</span></td>
                            <td className="py-3 pr-4 text-right text-white tabular-nums">{r.thisYear}{r.thisYearFailed > 0 ? <span className="text-red-300 text-xs"> ({r.thisYearFailed} failed)</span> : null}</td>
                            <td className="py-3 pr-4 text-right text-slate-300 tabular-nums">{r.last90Days}</td>
                            <td className="py-3 pr-4 text-slate-300">{r.nextLaunch ? fmtNextLaunch(r.nextLaunch, r.nextLaunchPrecision) : '—'}</td>
                            <td className="py-3 text-right text-slate-400 tabular-nums">{r.payloadLeoKg.toLocaleString('en-US')} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">The live vehicle table is unavailable right now — see the <Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">rocket index</Link>.</p>
                )}
                <p className="text-slate-400 text-sm mt-4">
                  Every vehicle, including the ones still in development: <Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">rocket index</Link> · <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">what each one costs</Link>.
                </p>
              </section>

            {/* Sites */}
            <section id="sites">
              <h2 className="text-2xl font-bold text-white mb-4">Global Launch Sites</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Each site now has its own live page with this month&apos;s manifest and a month-by-month archive:{' '}
                  <Link href="/launches/cape-canaveral" className="text-cyan-400 hover:text-cyan-300">Cape Canaveral &amp; KSC</Link>,{' '}
                  <Link href="/launches/vandenberg" className="text-cyan-400 hover:text-cyan-300">Vandenberg</Link>,{' '}
                  <Link href="/launches/starbase" className="text-cyan-400 hover:text-cyan-300">Starbase</Link>,{' '}
                  <Link href="/launches/kourou" className="text-cyan-400 hover:text-cyan-300">Kourou</Link>,{' '}
                  <Link href="/launches/wenchang" className="text-cyan-400 hover:text-cyan-300">Wenchang</Link> — or{' '}
                  <Link href="/launches" className="text-cyan-400 hover:text-cyan-300">all launch sites</Link>.
                </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="py-3 pr-4 text-left text-slate-300 font-semibold">Site</th>
                      <th className="py-3 pr-4 text-left text-slate-300 font-semibold">Location</th>
                      <th className="py-3 text-left text-slate-300 font-semibold">Active Pads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LAUNCH_SITES.map((site) => (
                      <tr key={site.name} className="border-b border-white/[0.06]">
                        <td className="py-3 pr-4 text-white font-medium">{site.name}</td>
                        <td className="py-3 pr-4 text-slate-400">{site.location}</td>
                        <td className="py-3 text-slate-400">{site.pads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                <Link href="/spaceports" className="text-slate-300 hover:underline">
                  Explore our interactive spaceport map &rarr;
                </Link>
              </p>
            </section>

            {/* Milestones */}
            <section id="milestones">
              <h2 className="text-2xl font-bold text-white mb-4">Key 2026 Milestones</h2>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Completed so far</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'Artemis II — NASA’s first crewed lunar flyby since Apollo, flown April 2026',
                  'Starship Flight 13 — first operational payload deployment (20 Starlink V3 satellites); booster and upper stage both completed controlled ocean splashdowns, though ship-stage recovery was not confirmed, July 2026',
                  'SpaceX’s ~80th Falcon 9 mission of the year before mid-2026 — a record cadence',
                ].map((milestone) => (
                  <li key={milestone} className="flex items-start gap-3">
                    <span className="text-slate-300 mt-1 flex-shrink-0">&#10003;</span>
                    <span className="text-slate-400 text-sm">{milestone}</span>
                  </li>
                ))}
              </ul>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Still to come in 2026</h3>
              <ul className="space-y-3">
                {[
                  'Rocket Lab Neutron first flight (targeted late 2026)',
                  'SpaceX Starship propellant-transfer demonstration (late 2026)',
                  'JAXA MMX Mars-moon sample-return mission launch window (October-December)',
                  'ESA PLATO exoplanet telescope launch on Ariane 62 (December)',
                  'BepiColombo arrival at Mercury and Hera arrival at asteroid Didymos (November)',
                  'Amazon Leo (formerly Project Kuiper) constellation buildout toward initial service',
                  'Blue Origin New Glenn ramping toward operational cadence',
                  'Commercial space station progress (Axiom, Orbital Reef, Starlab)',
                ].map((milestone) => (
                  <li key={milestone} className="flex items-start gap-3">
                    <span className="text-slate-300 mt-1 flex-shrink-0">&#9656;</span>
                    <span className="text-slate-400 text-sm">{milestone}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* How to Track */}
            <section id="track">
              <h2 className="text-2xl font-bold text-white mb-4">How to Track Launches with SpaceNexus</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus provides the most comprehensive launch tracking experience available:
              </p>
              <ol className="space-y-3">
                {[
                  'Visit the Launch Dashboard for all upcoming missions with countdown timers',
                  'Get email alerts for a launch, a rocket or a site — no account needed — a day before, an hour before, and when it flies',
                  'Use Mission Control for a real-time overview with live launch status',
                  'Track launched payloads on the Satellite Tracker after deployment',
                  'Read post-launch analysis in our News feed, auto-tagged by company',
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="bg-white text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-400 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/launch" className="btn-primary text-sm py-2 px-4">
                  Launch Dashboard
                </Link>
                <Link href="/mission-control" className="btn-secondary text-sm py-2 px-4">
                  Mission Control
                </Link>
                  <Link href="/register" className="btn-secondary text-sm py-2 px-4">
                    Sign Up Free
                  </Link>
                </div>
                <div id="launch-alerts" className="mt-8 scroll-mt-24 space-y-6">
                  <LaunchCrossLinks rocket={next?.rocket ?? 'Falcon 9'} location={next?.location ?? null} upcoming alertsAnchor hide={['mc']} />
                  {next && (
                    <LaunchWatchForm eventId={next.id} label={`Email me about the next launch: ${launchDisplayName(next.name, next.rocket)}, ${fmtDay(next.launchDate)}`} source="guide-launch-schedule" />
                  )}
                </div>
              </section>

            {/* Launch-week email opt-in */}
            <section>
              <NewsletterSignup
                variant="cta"
                source="launch-week-guide"
                title="Get the week's launches every Monday"
                description="Every Monday morning, get a rundown of the week's scheduled launches — vehicle, provider, site, and a direct link back to Mission Control to watch. Part of the SpaceNexus newsletter; unsubscribe anytime."
              />
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((faq) => (
                  <div key={faq.question} className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-2">{faq.question}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Related Content */}
            <section className="pt-6 border-t border-white/[0.06]">
              <h3 className="text-lg font-bold text-white mb-4">Related Guides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link href="/guide/space-industry" className="text-slate-300 hover:text-white text-sm transition-colors">
                  Complete Guide to the Space Industry &rarr;
                </Link>
                <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 hover:text-white text-sm transition-colors">
                  Space Launch Cost Comparison &rarr;
                </Link>
                <Link href="/guide/space-industry-market-size" className="text-slate-300 hover:text-white text-sm transition-colors">
                  Space Industry Market Size &rarr;
                </Link>
                <Link href="/guide/how-satellite-tracking-works" className="text-slate-300 hover:text-white text-sm transition-colors">
                  How Satellite Tracking Works &rarr;
                </Link>
              </div>
            </section>

            {/* Guide Navigation */}
            <GuideNavigation currentSlug="space-launch-schedule-2026" />
          </article>
          </ScrollReveal>

          {/* FAQ Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQ_ITEMS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />

          {/* Article Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: '2026 Space Launch Schedule: Every Mission This Year',
                description: 'Complete 2026 space launch schedule with dates, launch vehicles, payloads, and launch sites.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
                datePublished: '2026-02-14T00:00:00Z',
                dateModified: LAST_EDITED,
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-launch-schedule-2026' },
              }).replace(/</g, '\\u003c'),
            }}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/space-launch-schedule-2026']} />
      </div>
    </div>
  );
}
