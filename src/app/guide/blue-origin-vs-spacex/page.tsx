import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getRocketIndex } from '@/lib/rockets';
import { LAUNCH_VEHICLES } from '@/lib/launch-vehicles-data';
import { formatLaunchDate } from '@/components/launches/LaunchRow';

// Long-form companion to /compare/spacex-vs-blue-origin (roadmap 2026-09:
// the 1.2k-impression query wants a guide, not a table). Facts shared with
// the compare page; cadence figures come live from the launch tracker so the
// page never says "recently" about something that happened last year.
export const dynamic = 'force-dynamic';

// CTR pass (2026-09-04, roadmap Tier 2). This page and /compare/spacex-vs-blue-origin
// were splitting the "blue origin vs spacex" query with near-identical titles.
// The guide now owns the head term with the direct question a searcher is
// asking; the compare page is retitled to the table intent. The description
// leads with whatever the tracker says about New Glenn's NEXT flight, so the
// snippet carries this week's news instead of a generic promise.
const TITLE = 'Blue Origin vs SpaceX: Who Is Winning in 2026?';
const DESCRIPTION =
  'How the two companies actually differ — rockets, reusability, cadence, Starlink vs Amazon Leo, NASA contracts, engines, money — with live launch counts and what to watch over the next twelve months.';
/** Bumped by hand when the prose changes. The launch figures are live, but a
 *  dateModified that changes on every request is a freshness signal search
 *  engines learn to ignore; this one only moves when the words do. */
const LAST_EDITED = '2026-09-04T00:00:00Z';

// One tracker read per request, shared by generateMetadata and the page.
const getIndex = cache(() => getRocketIndex(new Date()));
type IndexRow = Awaited<ReturnType<typeof getRocketIndex>>[number];

/** The New Glenn line for the snippet and the lede. Phrased from what the
 *  tracker shows so it stays true after flight four: before it, this is a
 *  return to flight; after it, it is a cadence figure. */
function newGlennStatus(ng: IndexRow | undefined): string {
  const flown = ng ? ng.last90Days : 0;
  const times = `${flown} time${flown === 1 ? '' : 's'}`;
  if (!ng?.nextLaunch) {
    return flown > 0
      ? `New Glenn has flown ${times} in the last 90 days and has no next launch on the manifest yet`
      : 'New Glenn has no launch on the manifest yet after the April 2026 loss';
  }
  const d = formatLaunchDate(ng.nextLaunch, false);
  return flown > 0
    ? `New Glenn has flown ${times} in the last 90 days and flies next on ${d}`
    : `New Glenn's return to flight — its first launch since the April 2026 loss — is on the manifest for ${d}`;
}

export async function generateMetadata(): Promise<Metadata> {
  let description = DESCRIPTION;
  try {
    const ng = (await getIndex()).find((r) => r.slug === 'new-glenn');
    if (ng) description = `${newGlennStatus(ng)}; Falcon 9 launches every few days. Rockets, reusability, cadence, Starlink vs Amazon Leo, NASA contracts and money — with live launch counts.`;
  } catch { /* tracker unavailable → the static description */ }
  return {
    title: TITLE,
    description,
    keywords: ['blue origin vs spacex', 'spacex vs blue origin', 'new glenn vs falcon 9', 'new glenn vs starship', 'blue origin spacex comparison', 'amazon leo vs starlink', 'is blue origin catching up to spacex', 'who is winning blue origin or spacex'],
    alternates: { canonical: 'https://spacenexus.us/guide/blue-origin-vs-spacex' },
    openGraph: { title: TITLE, description, type: 'article', publishedTime: '2026-08-29T00:00:00Z', modifiedTime: LAST_EDITED, authors: ['SpaceNexus'], images: [{ url: '/art/hero-rivalry-launch.webp', width: 1344, height: 768 }] },
    twitter: { card: 'summary_large_image', title: TITLE, description, images: ['/art/hero-rivalry-launch.webp'] },
  };
}

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'philosophy', label: 'Two philosophies' },
  { id: 'rockets', label: 'The rockets, side by side' },
  { id: 'cadence', label: 'Cadence and reliability (live)' },
  { id: 'reuse', label: 'Reusability' },
  { id: 'constellations', label: 'Starlink vs Amazon Leo' },
  { id: 'nasa', label: 'NASA and the Moon' },
  { id: 'engines', label: 'Engines and the ULA connection' },
  { id: 'money', label: 'Money' },
  { id: 'watch', label: 'What to watch next' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'Is Blue Origin catching up to SpaceX?', a: 'In capability, yes: New Glenn is an operational heavy-lift rocket with a landed booster, which only SpaceX could say two years ago. In scale, no: SpaceX flies more missions in a typical fortnight than New Glenn has flown in its life. The gap that matters now is cadence, and cadence is a manufacturing problem, not a rocket-science problem.' },
  { q: 'Which rocket is bigger, New Glenn or Falcon 9?', a: 'New Glenn. It carries about 45 tonnes to low Earth orbit against Falcon 9\'s 22.8 tonnes, with a 7-metre fairing that fits payloads Falcon 9 cannot. Starship, when operational, dwarfs both at 100-150 tonnes.' },
  { q: 'Is Blue Origin cheaper than SpaceX?', a: 'On list price they are close: roughly $68 million for a New Glenn launch versus about $74 million for Falcon 9. Per kilogram New Glenn is cheaper on paper because it lifts twice the mass, but Falcon 9\'s reliability record and schedule certainty are what customers actually pay for today.' },
  { q: 'Does Blue Origin have a Starlink competitor?', a: 'Not one it owns. Amazon Leo (formerly Project Kuiper) is Amazon\'s constellation; Blue Origin is one of its launch providers alongside ULA, Arianespace and — awkwardly — SpaceX. Blue Origin and Amazon are separate companies that share a founder.' },
  { q: 'Which company is winning NASA contracts?', a: 'SpaceX has the larger book: cargo and crew to the ISS, the Starship Human Landing System for Artemis III, and science launches. Blue Origin holds the Artemis sustaining-lander contract (Blue Moon Mk2) and flies New Shepard payloads for NASA. Both are in the lunar programme; SpaceX is in it first.' },
  { q: 'Can I invest in either company?', a: 'SpaceX has traded on NASDAQ as SPCX since its June 2026 IPO. Blue Origin is private and funded almost entirely by Jeff Bezos, with no announced plans to list.' },
];

function n(x: number | null | undefined, unit = ''): string {
  if (x == null) return '—';
  return `${x.toLocaleString('en-US')}${unit}`;
}

export default async function BlueOriginVsSpaceXGuide() {
  const now = new Date();
  const index = await getIndex();
  const edited = new Date(LAST_EDITED);
  const live = (slug: string) => index.find((r) => r.slug === slug);
  const f9 = live('falcon-9');
  const ng = live('new-glenn');
  const ss = live('starship');
  const spec = (id: string) => LAUNCH_VEHICLES.find((v) => v.id === id);
  const specF9 = spec('falcon-9');
  const specFH = spec('falcon-heavy');
  const specNG = spec('new-glenn');
  const specSS = spec('starship');
  const vehicles = [specF9, specFH, specSS, specNG].filter(Boolean) as NonNullable<typeof specF9>[];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Blue Origin vs SpaceX</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Two companies founded two years apart by two of the richest people alive, chasing the same prize with opposite temperaments. This is how they actually compare in 2026 — rockets, cadence, reuse, constellations, contracts, engines and money — with the launch numbers pulled live from our tracker.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · launch figures live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={3400} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-rivalry-launch.webp" className="mb-8" />

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
                <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-slate-300 leading-relaxed mb-5">
                  <strong className="text-cyan-300">Where things stand today:</strong> {newGlennStatus(ng)}. Falcon 9 has flown {f9 ? f9.last90Days : '—'} times in the last 90 days.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX is the incumbent by every operational measure: more than 500 orbital launches, a booster fleet that has landed over 400 times, a crew capsule with a dozen-plus missions, and Starlink, a constellation of 9,000-plus satellites that earns well over $10 billion a year and pays for everything else. It went public in June 2026 and trades at roughly $2 trillion.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Blue Origin is, finally, a real orbital launch company. New Glenn reached orbit on its first try in January 2025, landed its booster on the second flight that November, and lost its third vehicle in April 2026. Three flights in fifteen months is an early-programme record, not a cadence — but the rocket is bigger than Falcon 9, priced against it, and has customers waiting: Amazon Leo, NASA science missions and national-security manifests.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  So the honest framing for 2026 is not &ldquo;who is winning&rdquo; — SpaceX is — but <strong className="text-slate-300">whether the launch market is about to have a second heavy-lift supplier that customers can plan around</strong>. That question turns on New Glenn&apos;s return to flight and first booster reflight, and this guide is organised around it.
                </p>
              </section>

              <section id="philosophy">
                <h2 className="text-2xl font-bold text-white mb-4">Two philosophies</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Blue Origin was founded in 2000, SpaceX in 2002. The two-year head start went the other way because the companies were built on opposite bets. SpaceX bet that flying early and often — and occasionally blowing things up in public — teaches you faster than analysis does. Falcon 1 failed three times before it worked; Falcon 9 was landing boosters within five years of its debut; Starship has been iterated through test flights since 2023 with the same tolerance for spectacular failure.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Blue Origin&apos;s motto is <em>Gradatim Ferociter</em> — step by step, ferociously — and for most of its life the emphasis fell on the first half. It spent a decade on New Shepard, a suborbital vehicle that never had to reach orbit, and used it to perfect vertical landing, reusable hydrogen engines and, later, a paying passenger business. New Glenn was announced in 2016 and flew in 2025. That is slow by SpaceX standards and fast by anyone else&apos;s.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The philosophies show up in the balance sheet, too. SpaceX raised outside capital from the beginning and had to earn revenue to survive; Blue Origin was funded for two decades by Jeff Bezos selling roughly a billion dollars of Amazon stock a year, and never had to. Whether that patience was a luxury or a handicap is the argument this rivalry is really about.
                </p>
              </section>

              <section id="rockets">
                <h2 className="text-2xl font-bold text-white mb-4">The rockets, side by side</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Registry figures from our <Link href="/launch-vehicles" className="text-cyan-400 hover:text-cyan-300">launch-vehicle database</Link>; list prices are 2026 published or reported figures, and per-kilogram costs assume a full payload to low Earth orbit.
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Vehicle</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">To LEO</th><th className="px-3 py-2.5">List price</th><th className="px-3 py-2.5">$/kg LEO</th><th className="px-3 py-2.5">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-3 py-2.5 text-white"><Link href={`/rockets/${v.id}`} className="hover:text-cyan-300">{v.name}</Link><span className="text-slate-500 text-xs"> · {v.manufacturer}</span></td>
                          <td className="px-3 py-2.5 text-slate-300">{v.status}</td>
                          <td className="px-3 py-2.5 text-white">{n(v.payloadLeoKg, ' kg')}</td>
                          <td className="px-3 py-2.5 text-white">{v.costMillions ? `~$${v.costMillions}M` : '—'}</td>
                          <td className="px-3 py-2.5 text-white">{v.costPerKgLeo ? `~$${n(v.costPerKgLeo)}` : '—'}</td>
                          <td className="px-3 py-2.5 text-slate-300">{v.totalLaunches ? `${v.successes}/${v.totalLaunches} (${v.successRate}%)` : 'No orbital flights yet'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Falcon 9</strong> is the workhorse of the whole industry: medium-heavy lift, a booster that flies twenty-plus times, and a launch every few days. <strong className="text-slate-300">Falcon Heavy</strong> straps three cores together for the rare payload Falcon 9 cannot lift, and flies a handful of times a year. <strong className="text-slate-300">Starship</strong> is the bet on the future — fully reusable, 100-150 tonnes to orbit, and still in test flights — which is why it appears in the table with an in-development record rather than a price.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">New Glenn</strong> sits between Falcon 9 and Falcon Heavy on lift and above both on volume: its 7-metre fairing is the widest in commercial service, a real advantage for large satellites and for stacking constellation batches. The first stage is designed for reuse from the outset; the hydrogen upper stage is expendable. <strong className="text-slate-300">New Shepard</strong> is not in the table because it does not reach orbit — it is a suborbital tourism and research vehicle, and a very good one, with six crewed flights on its record.
                </p>
              </section>

              <section id="cadence">
                <h2 className="text-2xl font-bold text-white mb-4">Cadence and reliability (live)</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  These numbers come from our launch tracker at the moment you loaded the page, not from the day the guide was written.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[f9, ng, ss].filter(Boolean).map((r) => r && (
                    <div key={r.slug} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="text-xs text-slate-500 mb-1">{r.spec.name}</div>
                      <div className="text-2xl font-bold text-white">{r.last90Days}<span className="text-sm font-normal text-slate-400"> launches / 90 days</span></div>
                      <div className="text-xs text-slate-400 mt-1">{r.nextLaunch ? `Next: ${formatLaunchDate(r.nextLaunch, false)}` : 'No launch scheduled'}</div>
                      <Link href={`/rockets/${r.slug}`} className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">Full record &rarr;</Link>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Cadence is the whole story. A rocket that flies every few days amortises its factory, its pad crews and its engineering staff across a hundred-plus missions a year; a rocket that flies three times in fifteen months carries the same fixed costs on three invoices. It also learns faster: every Falcon 9 flight is a data point, and SpaceX has had hundreds of them since the last time a Falcon 9 lost a payload. Blue Origin has had three, one of them a failure. Its reliability figure is not meaningful yet in either direction — which is exactly why customers who can wait are waiting for flights four, five and six before committing large payloads.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The comparison to keep in mind is not Falcon 9 in 2026 but Falcon 9 in 2011-2013, when it too was flying a few times a year and building the factory that would make the cadence possible. Blue Origin has the advantage of knowing that the destination exists, and the disadvantage of a competitor already standing there.
                </p>
              </section>

              <section id="reuse">
                <h2 className="text-2xl font-bold text-white mb-4">Reusability</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX&apos;s Falcon 9 booster has landed more than 400 times and individual boosters have flown more than twenty missions. Reuse is no longer a demonstration; it is the default, and new boosters are the exception. Fairings are recovered and reflown too. The economic effect is that SpaceX&apos;s marginal cost per launch is far below its list price, which is how it can fly Starlink batches every few days without a customer paying for them.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Blue Origin has landed a New Glenn booster once — on the vehicle&apos;s second flight, in November 2025, on its ship <em>Jacklyn</em> — which is one flight sooner than SpaceX managed with Falcon 9. Landing is the easy half; the hard half is reflight, and New Glenn has not yet reflown a booster. Until it does, every New Glenn launch is effectively an expendable launch on the accounts, whatever the design intent. New Shepard, meanwhile, has been reflying boosters and capsules routinely for years; the institutional knowledge is real, it just has not been proven at orbital scale.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Starship is the next front: full reuse of both stages, with the booster caught by the launch tower. When it works routinely, the cost floor moves again and New Glenn will be competing with a rocket that is cheaper per kilogram by a wide margin. That is the strongest argument for Blue Origin to push cadence now, while its comparison point is still Falcon 9.
                </p>
              </section>

              <section id="constellations">
                <h2 className="text-2xl font-bold text-white mb-4">Starlink vs Amazon Leo</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Starlink is the reason SpaceX&apos;s finances look the way they do. More than 9,000 satellites in orbit, millions of subscribers, and a revenue line that now exceeds launch services — the majority of the company&apos;s income comes from selling broadband, not rockets. It is also SpaceX&apos;s anchor customer: Starlink batches are most of what Falcon 9 flies, which is what keeps the cadence, and therefore the cost, where it is. The rocket company and the constellation company are the same company, and each subsidises the other.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Amazon Leo — the constellation formerly called Project Kuiper — is the closest thing to a rival, with 3,236 satellites planned and deployment under way. But it is not Blue Origin&apos;s constellation; it is Amazon&apos;s. Blue Origin is one launch provider among several, alongside ULA&apos;s Atlas V and Vulcan, Arianespace, and Falcon 9 — Amazon bought SpaceX launches when its own shareholders sued over the original supplier choice. So Blue Origin gets the launch revenue from its share of the manifest and none of the broadband revenue, which is the mirror image of SpaceX&apos;s position.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  For customers of the two networks the comparison is simpler: Starlink is available today almost everywhere; Amazon Leo is in early service and will lean on Amazon&apos;s retail and cloud distribution. Our <Link href="/compare/starlink-vs-oneweb" className="text-cyan-400 hover:text-cyan-300">Starlink vs OneWeb</Link> comparison covers the broadband market in more depth.
                </p>
              </section>

              <section id="nasa">
                <h2 className="text-2xl font-bold text-white mb-4">NASA and the Moon</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Both companies are building lunar landers for NASA&apos;s Artemis programme, and the split is instructive. SpaceX holds the Human Landing System contract for Artemis III, the first crewed landing, with a lunar variant of Starship. Blue Origin&apos;s Blue Moon Mk2 was selected as the &ldquo;sustaining&rdquo; lander for later missions — a second supplier NASA deliberately bought so that it would never again depend on one company for access to the Moon. Read that as NASA&apos;s own answer to the question in this guide&apos;s title: SpaceX first, Blue Origin as insurance, and the agency happy to pay for both.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Beyond the Moon, SpaceX&apos;s government book is far larger: cargo and crew rotation to the International Space Station, science launches, and a long-standing relationship with the Space Force under the National Security Space Launch programme. Blue Origin flies NASA research on New Shepard and is working its way onto the science and national-security manifests with New Glenn. Our <Link href="/artemis" className="text-cyan-400 hover:text-cyan-300">Artemis tracker</Link> follows both landers.
                </p>
              </section>

              <section id="engines">
                <h2 className="text-2xl font-bold text-white mb-4">Engines and the ULA connection</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The least visible and perhaps most important difference is what each company does with its engines. SpaceX builds Merlin for Falcon and Raptor for Starship and sells neither; the engines exist to make its own rockets cheap. Blue Origin builds BE-4, the methane engine that powers New Glenn&apos;s first stage, and <em>sells it</em> — two BE-4s fly on every United Launch Alliance Vulcan, the rocket that carries much of America&apos;s national-security payload.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  That makes Blue Origin a supplier to its own competitor, and it means the company has had steady engine revenue and flight data from Vulcan while New Glenn was still on the ground. It also means a BE-4 problem would ground two rockets at once, which is a concentration risk the Space Force thinks about. The hydrogen BE-3U on New Glenn&apos;s upper stage descends from the New Shepard engine — another case of the suborbital programme paying forward.
                </p>
              </section>

              <section id="money">
                <h2 className="text-2xl font-bold text-white mb-4">Money</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX listed on NASDAQ in June 2026 under the ticker SPCX and trades at a market value around $2 trillion, making it one of the most valuable companies in the world. Its revenue is dominated by Starlink; launch services are the smaller, older business. It raised on the order of $10 billion from outside investors over two decades before the IPO.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Blue Origin is private and is estimated to have absorbed more than $13 billion, nearly all of it from Jeff Bezos. Private valuations are guesses; $30 billion or more is the figure that circulates. It earns money from BE-4 sales, New Shepard tickets and research flights, New Glenn launches and the Blue Moon contract — but it does not have a Starlink, and without one it will be a launch and engine company, which is a fine business and a much smaller one.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  For investors the practical difference is that only one of these companies can be bought: <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">SPCX on our space-stocks page</Link>. Blue Origin&apos;s only public exposure is indirect, through the customers and suppliers around it.
                </p>
              </section>

              <section id="watch">
                <h2 className="text-2xl font-bold text-white mb-4">What to watch over the next twelve months</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">New Glenn&apos;s return to flight.</strong> {ng?.nextLaunch && ng.last90Days === 0 ? `Our tracker has it on ${formatLaunchDate(ng.nextLaunch, false)}. ` : ''}After the April 2026 loss, flight four is the whole ballgame: a clean mission restores the schedule, a second failure would push customers toward Vulcan and Falcon 9 for years. <Link href="/rockets/new-glenn" className="text-cyan-400 hover:text-cyan-300">Track it here</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">The first New Glenn booster reflight.</strong> Landing was proven in November 2025; reflight is what changes the economics.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Starship reaching operational status.</strong> Every Starship milestone lowers the price floor New Glenn will eventually have to meet. <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Amazon Leo&apos;s deployment pace</strong> and how much of it New Glenn actually flies versus the other providers on the manifest.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Artemis III&apos;s date</strong> — the Starship lander&apos;s schedule sets the timeline for Blue Moon too. <Link href="/artemis" className="text-cyan-400 hover:text-cyan-300">Artemis tracker</Link>.</span></li>
                </ul>
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
                  <li><Link href="/compare/spacex-vs-blue-origin" className="text-cyan-400 hover:text-cyan-300">The quick comparison table</Link> — the same facts at a glance, with live funding and valuation figures.</li>
                  <li><Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">Space launch cost comparison 2026</Link> — every vehicle&apos;s price and cost per kilogram.</li>
                  <li><Link href="/launches/cape-canaveral" className="text-cyan-400 hover:text-cyan-300">Cape Canaveral launch schedule</Link> — where both companies fly from Florida.</li>
                </ul>
              </section>

              <GuideNavigation currentSlug="blue-origin-vs-spacex" />
              <RelatedModules modules={PAGE_RELATIONS['guide/blue-origin-vs-spacex']} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-08-29T00:00:00Z', dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/blue-origin-vs-spacex' },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Blue Origin vs SpaceX' }]} />
        </div>
      </div>
    </div>
  );
}
