import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getLaunchCalendar } from '@/lib/launch-calendar';
import { getSiteSummaries } from '@/lib/launch-sites';

// "1,000 launches a year by 2030" explainer (2026-09-09). NSPM-17, the new
// National Space Transportation Policy of August 20, 2026, sets a number the
// press repeats and nobody sizes: where the United States actually is, what
// the memo directs (with dates), and what would have to change. The cadence
// figures come from our own launch tracker at request time, so the gap the
// page describes is the live gap, not the one on the day it was written.
export const dynamic = 'force-dynamic';

const SLUG = '1000-launches-a-year';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = '1,000 Launches a Year by 2030: What the National Space Transportation Policy Orders, Where the U.S. Is Today, and What Has to Change';
const DESCRIPTION =
  'NSPM-17 (August 20, 2026) tells U.S. ranges to support more than 1,000 launches and reentries a year by 2030. The U.S. flew 176 orbital launches in 2025. Every directive and deadline in the memo, the live cadence from our tracker, and the six bottlenecks between here and a thousand.';
/** Bumped by hand when the prose changes. */
const LAST_EDITED = '2026-09-09T00:00:00Z';
const MEMO_DATE = '2026-08-20';
const TARGET = 1000;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['1000 launches a year', 'national space transportation policy', 'nspm-17', 'space transportation policy 2026', 'us launches per year', 'launch cadence 2030', 'how many rocket launches per year', 'federal land reentry site', 'launch corridors airspace'],
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus Team'], url: CANONICAL },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'today', label: 'Where the U.S. is today (live)' },
  { id: 'memo', label: 'What NSPM-17 actually orders' },
  { id: 'deadlines', label: 'The deadlines, dated' },
  { id: 'counting', label: 'What counts as a launch or reentry' },
  { id: 'math', label: 'The arithmetic of a thousand' },
  { id: 'bottlenecks', label: 'Six things that have to change' },
  { id: 'sites', label: 'Where the new capacity could come from' },
  { id: 'faq', label: 'FAQ' },
];

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const DIRECTIVES: Array<{ who: string; days: number; what: string }> = [
  { who: 'Secretary of the Interior', days: 90, what: 'Identify Federal lands to serve as an additional designated Federal land reentry site.' },
  { who: 'Assistant to the President for Science and Technology', days: 120, what: 'Begin the space transportation industrial base strategy (due at 180 days).' },
  { who: 'Secretaries of State and Commerce', days: 120, what: 'Start the export policy and control updates, then repeat every two years.' },
  { who: 'Secretary of Transportation (FAA)', days: 180, what: 'Report potential new launch facility locations; integrate launch and reentry into airspace modernization; designate priority airspace for critical launch corridors; evaluate reentry safety criteria for the Federal land reentry site.' },
  { who: 'Secretary of War', days: 180, what: 'Publish Federal range scheduling criteria and transparent range schedules; report on securing launch infrastructure on Federal property; evaluate barriers to responsive space access on 48-hour timelines.' },
  { who: 'Secretary of Commerce, with the FCC', days: 180, what: 'Report on spectrum access for launch, reentry and recovery, then every two years.' },
  { who: 'Secretary of Commerce', days: 240, what: 'Produce the development plan for the designated Federal land reentry site.' },
  { who: 'NASA Administrator', days: 0, what: 'Develop a commercial lunar logistics transportation architecture; explore commercial robotic and human Mars mission architectures. No fixed deadline.' },
];

const BOTTLENECKS = [
  { t: 'Range capacity', d: 'Two federal ranges carry almost everything: the Eastern Range at Cape Canaveral and Kennedy, and the Western Range at Vandenberg. Vandenberg’s SpaceX cadence is capped at 70 a year by its current approvals. The memo’s answer is scheduling criteria, published schedules and new sites; the analysts’ answer is that Kennedy and Wallops could be at operating capacity by 2028–2029 regardless.' },
  { t: 'Licensing throughput', d: 'The FAA authorized 205 commercial space operations in fiscal 2025 and its own forecast for fiscal 2030 tops out at 385 in the high case. Part 450, the performance-based licence, became the only path in March 2026. A faster application does not build a pad, so licensing is necessary, not sufficient.' },
  { t: 'Airspace', d: 'Every launch closes airspace and re-routes aircraft. At three a day that stops being an exception the air traffic system absorbs and becomes a scheduled flow it must plan around — hence the memo’s priority corridors and the order to fold launch into airspace modernization.' },
  { t: 'Environmental review', d: 'New pads and new sites mean NEPA. The memo leans on Executive Order 14335 (August 13, 2025) and the FAA’s July 2026 proposal to waive environmental reviews for launch infrastructure; both will be litigated.' },
  { t: 'Vehicles that fly that often', d: 'Falcon 9 flew roughly 165 times in 2025 and is the only vehicle on Earth that has ever exceeded a hundred flights in a year. A thousand operations needs several vehicles at Falcon-like cadence, or Starship at a cadence nobody has demonstrated — or, most likely, both.' },
  { t: 'Demand', d: 'Starlink is most of today’s manifest. A thousand operations a year is a bet that Starship-scale payloads, lunar logistics, in-space transportation and a second or third megaconstellation all arrive on schedule. The memo directs the government to buy commercial and to stop competing with it, which helps the demand side at the margin.' },
];

const FAQ = [
  { q: 'What is the 1,000 launches a year goal?', a: 'It is the headline of NSPM-17, the National Space Transportation Policy President Trump signed on August 20, 2026: “By 2030, our space transportation ranges must grow to support more than 1,000 launches and reentries every year.” It replaces the 2013 policy (PPD-26) and directs the Departments of Transportation, War, Commerce, Interior and State, plus NASA and the FCC, to expand ranges, sites, airspace, spectrum and licensing to carry that traffic.' },
  { q: 'How many launches does the United States do now?', a: 'In 2025 there were 176 orbital launch attempts from U.S. soil, all but one successful, according to SpacePolicyOnline’s count — roughly 85% of them SpaceX. This page shows the live figure from our tracker for the last twelve months and for the current year, by site.' },
  { q: 'Does the target count launches or reentries?', a: 'Both, combined: “launches and reentries.” A Falcon 9 booster landing is not a licensed reentry; a Dragon capsule return, a Starship ship return, a Varda capsule or any other licensed reentry is. Reentries are a small share today, which is why the memo carves out a new designated Federal land reentry site.' },
  { q: 'Is 1,000 by 2030 realistic?', a: 'Not on the FAA’s own forecast, which sees 252 to 385 authorized operations in fiscal 2030. Getting from the 2025 count to a thousand means growing every part of the system — ranges, sites, licensing, airspace, spectrum, vehicles and demand — roughly four to five times over in four years, at the same time. The memo can order the government’s parts to move; it cannot order customers or Starship’s flight rate into existence.' },
  { q: 'What is the Federal land reentry site?', a: 'A new designated site on Federal land for licensed reentries, distinct from the launch ranges. Interior has 90 days to identify candidate lands, Transportation 180 days to evaluate the safety criteria, and Commerce 240 days to produce a development plan with commercial access and co-development options.' },
  { q: 'What does the memo do about the Cape being full?', a: 'It orders the Secretary of War to publish Federal range scheduling criteria and transparent range schedules, to report on securing launch infrastructure on Federal property, and, with NASA, to run the ranges “in a transparent manner that accommodates government and non government users” with “fair and transparent cost recovery.” It also orders Transportation to identify new launch facility locations within 180 days.' },
  { q: 'Does this affect NASA’s Moon and Mars plans?', a: 'Yes: NASA is told to develop a commercial transportation architecture for lunar logistics and to explore commercial architectures for robotic and human Mars missions — and, across government, to favour commercial services and to refrain from activities that compete with them unless public safety or national security requires it.' },
  { q: 'Is there money attached?', a: 'No. Like most presidential memoranda it is “subject to the availability of appropriations.” Range modernization, a new reentry site and airspace modernization all need Congress.' },
  { q: 'What are the key dates?', a: 'Counting from August 20, 2026: 90 days is November 18, 2026 (Interior’s reentry-site lands); 120 days is December 18, 2026 (industrial base and export-control work begins); 180 days is February 16, 2027 (FAA sites, corridors and airspace; War range criteria and schedules; Commerce spectrum report); 240 days is April 17, 2027 (the reentry-site development plan).' },
];

export default async function ThousandLaunchesGuide() {
  const edited = new Date(LAST_EDITED);
  let calendar: Awaited<ReturnType<typeof getLaunchCalendar>> | null = null;
  let sites: Awaited<ReturnType<typeof getSiteSummaries>> = [];
  try { calendar = await getLaunchCalendar(); } catch { /* live block degrades to prose */ }
  try { sites = await getSiteSummaries(); } catch { /* same */ }
  const usSites = sites.filter((s) => s.site.country === 'USA').sort((a, b) => b.last12Months - a.last12Months);
  const usLast12 = usSites.reduce((a, s) => a + s.last12Months, 0);
  const worldLast12 = sites.reduce((a, s) => a + s.last12Months, 0);
  const multiple = usLast12 > 0 ? (TARGET / usLast12).toFixed(1) : null;
  const perDay = (TARGET / 365).toFixed(1);
  const year = calendar?.year ?? new Date().getUTCFullYear();

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">1,000 launches a year</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              On August 20, 2026 the White House replaced a 2013 policy with a number: more than a thousand launches and reentries a year from American ranges by 2030. The United States flew 176 orbital launches in 2025. This guide puts the live cadence from our tracker next to the target, walks through every directive and deadline in the memorandum, and names the six things that would have to change for the arithmetic to work.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · cadence figures live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2600} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-launch-sites.webp" className="mb-8" />

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">The target</div>
                    <div className="text-white font-semibold">1,000+ a year by 2030</div>
                    <div className="text-xs text-slate-400 mt-1">launches and reentries, U.S. ranges · {perDay} a day</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">U.S. launches, last 12 months</div>
                    <div className="text-white font-semibold">{usLast12 > 0 ? usLast12.toLocaleString() : '—'}</div>
                    <div className="text-xs text-slate-400 mt-1">{usLast12 > 0 ? `from our tracker · ${multiple}× short of the target` : 'tracker unavailable right now'}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">2025, for the record</div>
                    <div className="text-white font-semibold">176 orbital attempts</div>
                    <div className="text-xs text-slate-400 mt-1">from U.S. soil, all but one successful</div>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  The memorandum is real policy with real deadlines, and it aims every federal lever it has — ranges, sites, airspace, spectrum, licensing, export controls, procurement — at the same number. What it cannot order is the other half of the equation: vehicles that fly that often and customers who need them to. The FAA’s own forecast for fiscal 2030 is 252 to 385 authorized operations. Read the target as a direction and a deadline for the government’s side of the system, not as a forecast.
                </p>
              </section>

              <section id="today">
                <h2 className="text-2xl font-bold text-white mb-4">Where the U.S. is today (live)</h2>
                {usSites.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                            <th className="pb-2 pr-4">U.S. site</th><th className="pb-2 pr-4 text-right">Last 12 months</th><th className="pb-2 pr-4 text-right">Scheduled ahead</th><th className="pb-2">Share of 1,000</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usSites.map((s) => (
                            <tr key={s.site.slug} className="border-b border-white/[0.04]">
                              <td className="py-2 pr-4 text-white"><Link href={`/launches/${s.site.slug}`} className="hover:text-cyan-300">{s.site.shortName}</Link></td>
                              <td className="py-2 pr-4 text-right text-slate-200 tabular-nums">{s.last12Months}</td>
                              <td className="py-2 pr-4 text-right text-slate-400 tabular-nums">{s.upcoming}</td>
                              <td className="py-2 text-slate-400 tabular-nums">{(s.last12Months / TARGET * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                          <tr>
                            <td className="py-2 pr-4 text-white font-semibold">All U.S. sites</td>
                            <td className="py-2 pr-4 text-right text-white font-semibold tabular-nums">{usLast12}</td>
                            <td className="py-2 pr-4 text-right text-slate-400 tabular-nums">{usSites.reduce((a, s) => a + s.upcoming, 0)}</td>
                            <td className="py-2 text-slate-300 tabular-nums">{(usLast12 / TARGET * 100).toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">
                      Orbital and suborbital launches our tracker holds for each site, trailing 12 months, computed when you loaded this page. World total across tracked sites: {worldLast12}. {calendar ? `Worldwide ${year} so far: ${calendar.flownYearToDate} flown, ${calendar.scheduledRestOfYear} more scheduled.` : ''} Reentries are not counted here; see the section below.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">The live cadence table is unavailable at the moment. The <Link href="/launch-cadence" className="text-cyan-400 hover:text-cyan-300">launch cadence tracker</Link> has the same figures.</p>
                )}
              </section>

              <section id="memo">
                <h2 className="text-2xl font-bold text-white mb-4">What NSPM-17 actually orders</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  National Security Presidential Memorandum 17, titled &ldquo;The National Space Transportation Policy,&rdquo; supersedes Presidential Policy Directive 26 of November 21, 2013 and waives the 2004 policy before it. Its goal sentence is the one quoted everywhere: &ldquo;By 2030, our space transportation ranges must grow to support more than 1,000 launches and reentries every year.&rdquo; Around it sit four kinds of instruction.
                </p>
                <ul className="space-y-3 text-slate-300">
                  <li><strong className="text-white">Run the ranges for everyone.</strong> The Secretary of War and the NASA Administrator &ldquo;shall operate Federal launch and reentry ranges and facilities in a transparent manner that accommodates government and non government users,&rdquo; with &ldquo;fair and transparent cost recovery policies for common services, commodities, and infrastructure.&rdquo;</li>
                  <li><strong className="text-white">Add places to launch and land.</strong> Transportation identifies new launch facility locations; Interior identifies Federal land for a new designated reentry site; Commerce plans it; Transportation designates priority airspace for launch corridors and folds launch into airspace modernization.</li>
                  <li><strong className="text-white">Cut the queue.</strong> Agencies are to &ldquo;expedite facility permitting and environmental reviews, consistent with Executive Order 14335 of August 13, 2025,&rdquo; and War is to evaluate what stops responsive launch on 48-hour timelines.</li>
                  <li><strong className="text-white">Buy commercial, don&apos;t compete.</strong> The government is to &ldquo;favor commercial space transportation services&rdquo; for its own needs and &ldquo;refrain from conducting United States Government space transportation activities that preclude, discourage, or compete with&rdquo; commercial ones &ldquo;unless required by public safety or national security.&rdquo; NASA gets commercial lunar logistics and Mars architectures to develop.</li>
                </ul>
                <p className="text-slate-300 leading-relaxed mt-4">
                  Two things are absent. The memo never mentions Part 450, the FAA licence regime that became the only path in March 2026, so licensing throughput is addressed only indirectly through &ldquo;expedite.&rdquo; And it carries the standard clause: implementation is &ldquo;subject to the availability of appropriations.&rdquo; The White House fact sheet frames it as the third act after an August 2025 order on competition and a December 2025 &ldquo;America First&rdquo; space policy, alongside the FAA&apos;s July 2026 proposal to waive environmental reviews for launch infrastructure.
                </p>
              </section>

              <section id="deadlines">
                <h2 className="text-2xl font-bold text-white mb-4">The deadlines, dated</h2>
                <p className="text-slate-400 text-sm mb-4">Counted from the signing date, August 20, 2026.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                        <th className="pb-2 pr-4">Due</th><th className="pb-2 pr-4">Who</th><th className="pb-2">What</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIRECTIVES.map((d) => (
                        <tr key={d.who + d.days} className="border-b border-white/[0.04] align-top">
                          <td className="py-2 pr-4 text-white whitespace-nowrap">{d.days ? `${addDays(MEMO_DATE, d.days)} (${d.days} d)` : 'Open'}</td>
                          <td className="py-2 pr-4 text-slate-300">{d.who}</td>
                          <td className="py-2 text-slate-300">{d.what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="counting">
                <h2 className="text-2xl font-bold text-white mb-4">What counts as a launch or reentry</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The number is launches <em>and</em> reentries, and the second word does work. A Falcon 9 booster landing is part of a launch, not a licensed reentry. A Dragon splashdown, a Starship ship coming back, a Varda or Inversion capsule, or a future crew return to a land site each counts as a reentry under FAA authorization. Today reentries are a small fraction of operations, which is exactly why the memo spends three of its deadlines on a new Federal land reentry site: at scale, bringing things back needs its own real estate, its own safety criteria and its own schedule.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  It also means the honest comparison is not &ldquo;176 launches versus 1,000.&rdquo; If a Starship flight is a launch plus two reentries (ship and booster catch), and Dragon and cargo returns are counted, a thousand operations could be reached with something like 600&ndash;700 launches. That is still three and a half to four times the 2025 count in four years. The FAA&apos;s fiscal 2025 figure of 205 authorized operations is the number to grow.
                </p>
              </section>

              <section id="math">
                <h2 className="text-2xl font-bold text-white mb-4">The arithmetic of a thousand</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['Per day', `${perDay} operations, every day of the year, weather and range turnaround included.`],
                    ['Per site', 'Cape Canaveral and Kennedy set a record in 2023 with 58 orbital launches; the Eastern Range now clears roughly a hundred a year. A thousand operations across four or five active U.S. sites is 200+ each, or one site at Starship-fantasy cadence.'],
                    ['Per vehicle', 'Falcon 9 flew about 165 times in 2025 — the only vehicle ever past a hundred in a year. The target needs Falcon at 200, plus Starship, New Glenn, Vulcan and Neutron each flying dozens of times, plus reentries.'],
                    ['Versus the forecast', 'The FAA projects 252 (low) to 385 (high) authorized operations in fiscal 2030. The memo asks for 2.6–4× the agency’s own high case.'],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="text-white font-semibold mb-1">{t}</div>
                      <div className="text-slate-300 text-sm leading-relaxed">{d}</div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-xs mt-3">Per-site and per-vehicle figures are our reading of the tracker and public counts; the FAA forecast is as reported by New Space Economy on August 21, 2026.</p>
              </section>

              <section id="bottlenecks">
                <h2 className="text-2xl font-bold text-white mb-4">Six things that have to change</h2>
                <div className="space-y-4">
                  {BOTTLENECKS.map((b, i) => (
                    <div key={b.t} className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div><span className="text-white font-semibold">{b.t}.</span> <span className="text-slate-300">{b.d}</span></div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="sites">
                <h2 className="text-2xl font-bold text-white mb-4">Where the new capacity could come from</h2>
                <p className="text-slate-400 text-sm mb-4">Analysis. The memo asks Transportation for candidate locations within 180 days; these are the places that reporting and existing licences point to.</p>
                <ul className="space-y-3 text-slate-300">
                  <li><strong className="text-white">The Cape, more of it.</strong> SpaceX&apos;s Starship pads at LC-39A and SLC-37, Blue Origin&apos;s LC-36 back in service, ULA&apos;s SLC-41 at Vulcan cadence, and a Space Force range that already publishes near-daily windows. Most of any growth to 2030 happens here, which is why range scheduling and cost recovery are in the memo.</li>
                  <li><strong className="text-white">Starbase.</strong> The one site built for a vehicle that could, alone, move the number — if Starship&apos;s flight rate rises from a handful a year to dozens. Our <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link> is the honest scoreboard.</li>
                  <li><strong className="text-white">Vandenberg.</strong> Capped at 70 SpaceX launches a year today; polar and sun-synchronous demand is real, so the cap is the constraint, not the market.</li>
                  <li><strong className="text-white">Wallops and the small-launch sites.</strong> Rocket Lab&apos;s Neutron from Wallops, Firefly and others; useful dozens, not hundreds. Analysts already expect Wallops near capacity by 2028–2029.</li>
                  <li><strong className="text-white">A Federal land reentry site.</strong> The genuinely new thing in the memo. Interior&apos;s November list will tell us whether that means the Utah Test and Training Range, White Sands, a Nevada range or something else.</li>
                </ul>
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">FAQ</h2>
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
                  <li><Link href="/launch-cadence" className="text-cyan-400 hover:text-cyan-300">Launch cadence tracker</Link> — the live month-by-month count behind the table above.</li>
                  <li><Link href="/guide/rockets-flying-in-2026" className="text-cyan-400 hover:text-cyan-300">Which rockets are flying in 2026</Link> — per-vehicle cadence, live.</li>
                  <li><Link href="/guide/space-launch-schedule-2026" className="text-cyan-400 hover:text-cyan-300">Cape Canaveral launch schedule</Link> — what the Eastern Range is doing this month.</li>
                  <li><Link href="/guide/space-force-academy" className="text-cyan-400 hover:text-cyan-300">The U.S. Space Academy explained</Link> — the other August 2026 space order.</li>
                  <li><Link href="/regulatory-radar" className="text-cyan-400 hover:text-cyan-300">Regulatory Radar</Link> — the FAA and FCC actions the memo’s deadlines will produce.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">
                  Sources: NSPM-17 &ldquo;The National Space Transportation Policy&rdquo; (White House, Aug 20, 2026) and the accompanying fact sheet; SpacePolicyOnline (2025 U.S. launch count); Spaceflight Now (Falcon 9 2025 cadence, Vandenberg cap); New Space Economy, Aug 21, 2026 (FAA FY2025 authorizations and FY2030 forecast, capacity outlook). Live cadence is from the SpaceNexus launch tracker at page load. Analysis and estimates are ours.
                </p>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/icons/icon-512x512.png' } },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: '1,000 launches a year' }]} />
        </div>
      </div>
    </div>
  );
}
