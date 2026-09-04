import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import NewsCard from '@/components/NewsCard';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getArtemisNewsArticles } from '@/lib/artemis-news';

// "When is Artemis 3?" (2026-09-04). The question is asked constantly and
// most of the answers on the internet are wrong, because the mission was
// restructured in February 2026 and a great deal of published content still
// describes the pre-restructure lunar landing. This page states the current
// plan from NASA's own June 9, 2026 release, says plainly what changed, and
// keeps a live news rail so the answer ages honestly. Facts here mirror the
// /artemis tracker's MISSION_TIMELINE; change both together.
export const revalidate = 900;

const SLUG = 'when-is-artemis-3';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = 'When Is Artemis III? Date, Crew, and What the Mission Actually Does (2026 Update)';
const DESCRIPTION =
  'Artemis III is planned for 2027 — but it is no longer a Moon landing. NASA restructured it in February 2026 into an Earth-orbit test that docks Orion with the SpaceX and Blue Origin landers; the first landing since Apollo moves to Artemis IV in 2028. Crew, timeline, what has to happen first, and a full FAQ.';
/** Bumped by hand when the prose changes. */
const LAST_EDITED = '2026-09-04T00:00:00Z';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['when is artemis 3', 'artemis 3 launch date', 'artemis iii date', 'artemis 3 crew', 'artemis 3 moon landing', 'artemis iii restructured', 'artemis 4 landing 2028', 'when will nasa land on the moon again'],
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'changed', label: 'What changed in February 2026' },
  { id: 'crew', label: 'The crew' },
  { id: 'mission', label: 'The mission, step by step' },
  { id: 'before', label: 'What has to happen first' },
  { id: 'landing', label: 'So when do humans land on the Moon?' },
  { id: 'landers', label: 'Starship HLS and Blue Moon' },
  { id: 'news', label: 'Latest Artemis news (live)' },
  { id: 'faq', label: 'Artemis III FAQ' },
];

const CREW = [
  { name: 'Randy Bresnik', role: 'Commander', agency: 'NASA' },
  { name: 'Luca Parmitano', role: 'Pilot', agency: 'ESA' },
  { name: 'Andre Douglas', role: 'Mission Specialist', agency: 'NASA' },
  { name: 'Frank Rubio', role: 'Mission Specialist', agency: 'NASA' },
];

const STEPS = [
  { t: 'Launch', d: 'The Space Launch System lifts Orion and its four-person crew from Launch Complex 39B at Kennedy Space Center into low Earth orbit.' },
  { t: 'Checkout', d: 'Orion runs systems checkouts in orbit — life support, navigation, communications and the docking system it has never used with a crew aboard.' },
  { t: 'First docking: Blue Origin', d: 'Orion performs a first-ever rendezvous and docking with a Blue Moon lander test article, and stays docked for about two days of joint operations.' },
  { t: 'Second docking: SpaceX', d: 'After separating, Orion rendezvous and docks with a Starship pathfinder for roughly a day of docked operations.' },
  { t: 'Return', d: 'Orion undocks, deorbits and splashes down in the Pacific. NASA expects roughly two weeks in total, with the exact length set in real time by how the rendezvous and docked operations go.' },
];

const PREREQS = [
  { t: 'Orion crew and service modules joined', s: 'in progress', d: 'Integration of the crew module and the ESA-built service module at Kennedy.' },
  { t: 'Docking system integration', s: 'in progress', d: 'The hardware that makes this mission possible: Orion has flown twice but has never docked with anything.' },
  { t: 'Heat shield installed and tested', s: 'in progress', d: 'The heat shield was the focus of post-Artemis-I scrutiny; Artemis II flew the updated approach successfully in April 2026.' },
  { t: 'SLS core stage engine integration and stacking', s: 'in progress', d: 'Underway at Kennedy as of summer 2026, with milestones running through the rest of the year.' },
  { t: 'A Blue Moon test article and a Starship pathfinder ready to fly', s: 'upcoming', d: 'Both companies must deliver dockable vehicles to orbit on their own rockets — New Glenn and Starship respectively — ahead of Orion\'s launch.' },
];

const FAQ = [
  { q: 'When is Artemis III launching?', a: 'NASA\'s current plan is 2027. The agency has not published a specific date; its June 9, 2026 crew announcement says the mission will "conduct a series of challenging tests in Earth orbit in 2027." Treat any exact date you see elsewhere as speculation until NASA sets one.' },
  { q: 'Is Artemis III landing on the Moon?', a: 'No. In February 2026 NASA restructured Artemis III from a lunar landing into an Earth-orbit demonstration: Orion will rendezvous and dock with the commercial landers from Blue Origin and SpaceX in low Earth orbit. The first crewed landing since Apollo 17 is now planned for Artemis IV.' },
  { q: 'Why was Artemis III changed?', a: 'Because the landers were not going to be ready for a crewed lunar landing on the original schedule, and rendezvous and docking between Orion and a lander had never been demonstrated. Rehearsing those operations in Earth orbit, where an abort is a deorbit burn rather than a multi-day return from the Moon, retires the riskiest unknowns before a landing depends on them.' },
  { q: 'Who is on the Artemis III crew?', a: 'Commander Randy Bresnik (NASA), Pilot Luca Parmitano (ESA), and Mission Specialists Andre Douglas and Frank Rubio (both NASA), announced June 9, 2026. Bob Hines (NASA) is the backup. Parmitano is the first non-US astronaut assigned to an Artemis crew as a pilot.' },
  { q: 'How long is the Artemis III mission?', a: 'About two weeks, according to NASA, with the precise duration decided during the flight based on the launch, the rendezvous and how long the docked operations take.' },
  { q: 'Where does Artemis III launch from?', a: 'Kennedy Space Center in Florida, on the Space Launch System rocket — the same pad and vehicle as Artemis I and II. Our Cape Canaveral launch guide covers how to watch a launch from the Space Coast.' },
  { q: 'Does Artemis III go to the Moon at all?', a: 'No — it stays in low Earth orbit for the whole mission. Artemis II, which flew in April 2026, was the crewed lunar flyby; Artemis III tests the landers in Earth orbit; Artemis IV goes back to the Moon to land.' },
  { q: 'When will NASA land astronauts on the Moon?', a: 'Artemis IV, planned for 2028, is the first crewed landing at the lunar south pole, using the SpaceX Starship Human Landing System. That date depends on Artemis III going well and on Starship completing an uncrewed lunar landing demonstration first.' },
  { q: 'Which lander will be used for the landing?', a: 'The SpaceX Starship HLS is contracted for the first landing on Artemis IV. Blue Origin\'s Blue Moon Mk2 is the "sustaining" lander NASA bought as a second supplier for later missions. Artemis III tests docking with test versions of one or both.' },
  { q: 'Did Artemis II succeed?', a: 'Yes. Artemis II flew April 1-10, 2026 with Reid Wiseman, Victor Glover, Christina Koch and Jeremy Hansen, the first crewed flight beyond low Earth orbit since 1972. Our Artemis II live-blog archive has the full mission record.' },
  { q: 'Is the Lunar Gateway part of Artemis III?', a: 'No. The restructured Artemis III stays in Earth orbit and does not visit Gateway. Gateway-era operations begin with the landing missions that follow.' },
  { q: 'Could Artemis III slip past 2027?', a: 'It could; every Artemis mission so far has moved. The prerequisites section of this page lists what has to be finished first — Orion integration, SLS stacking, and both companies delivering dockable test vehicles — and the live news rail below will show any change the day it is announced.' },
];

const STATUS_STYLE: Record<string, string> = {
  'in progress': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  upcoming: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  complete: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default async function WhenIsArtemis3Guide() {
  const edited = new Date(LAST_EDITED);
  let articles: Awaited<ReturnType<typeof getArtemisNewsArticles>> = [];
  try { articles = await getArtemisNewsArticles(4); } catch { /* the rail is optional */ }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">When is Artemis III?</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Most of what you will read about Artemis III is out of date. The mission was rebuilt in February 2026, the crew was named in June, and the Moon landing it was supposed to be now belongs to a different flight. Here is the current plan, from NASA&apos;s own statements, and what has to happen before it flies.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · news rail live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2200} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-cislunar.png" className="mb-8" />

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
                    <div className="text-xs text-slate-500 mb-1">Artemis III</div>
                    <div className="text-2xl font-bold text-white">2027</div>
                    <div className="text-xs text-slate-400 mt-1">Earth-orbit lander docking test · ~2 weeks</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">First Moon landing</div>
                    <div className="text-2xl font-bold text-white">Artemis IV · 2028</div>
                    <div className="text-xs text-slate-400 mt-1">Lunar south pole, on Starship HLS</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">Crew named</div>
                    <div className="text-2xl font-bold text-white">June 9, 2026</div>
                    <div className="text-xs text-slate-400 mt-1">Bresnik · Parmitano · Douglas · Rubio</div>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Artemis III is planned for 2027, and it is not a Moon landing.</strong> NASA restructured the mission in February 2026: instead of flying to the Moon, Orion and a crew of four will spend about two weeks in low Earth orbit rehearsing the one thing the programme has never done — rendezvous and docking between Orion and the commercial landers that will carry astronauts to the surface. It docks first with a Blue Origin Blue Moon test article, then with a SpaceX Starship pathfinder, then comes home.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The landing that Artemis III was originally going to be now belongs to <strong className="text-slate-300">Artemis IV, planned for 2028</strong>: a crew descends to the lunar south pole aboard the Starship Human Landing System, the first human steps on the Moon since December 1972. NASA has not set an exact date for either mission; both are year-level targets that depend on the hardware milestones listed further down.
                </p>
              </section>

              <section id="changed">
                <h2 className="text-2xl font-bold text-white mb-4">What changed in February 2026</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The original Artemis III plan — announced years ago and repeated in countless articles that are still online — was a crewed lunar landing using SpaceX&apos;s Starship as the lander. Two things made that untenable on the old schedule. The landers were not going to be ready for crew, and Orion had never docked with anything: neither Artemis I nor Artemis II carried a docking system, so the first Orion-to-lander docking would have happened in lunar orbit, on the mission that depended on it, with astronauts aboard.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  NASA&apos;s answer was to split the risk. Artemis III became an Earth-orbit demonstration where an abort is a deorbit burn and a splashdown rather than a multi-day return from the Moon, and the landing moved to Artemis IV with a rehearsal already behind it. That is the same logic Apollo used: Apollo 9 tested the lunar module in Earth orbit before Apollo 10 and 11 took it to the Moon.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The practical effect for anyone following the programme: a page that says &ldquo;Artemis III will land astronauts on the Moon&rdquo; without a February 2026 caveat is describing a plan that no longer exists.
                </p>
              </section>

              <section id="crew">
                <h2 className="text-2xl font-bold text-white mb-4">The crew</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Named by NASA on June 9, 2026. Bob Hines (NASA) is the backup.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {CREW.map((c) => (
                    <div key={c.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                      <div className="text-white font-semibold">{c.name}</div>
                      <div className="text-sm text-slate-400">{c.role} · {c.agency}</div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Parmitano&apos;s assignment as pilot makes this the first Artemis crew with a non-US astronaut in a flying role, reflecting ESA&apos;s contribution of Orion&apos;s service module. Bresnik and Rubio are both long-duration ISS veterans; Rubio holds the US single-flight duration record from his unplanned year-long stay in 2022-23.
                </p>
              </section>

              <section id="mission">
                <h2 className="text-2xl font-bold text-white mb-4">The mission, step by step</h2>
                <ol className="space-y-3">
                  {STEPS.map((s, i) => (
                    <li key={s.t} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-center flex-shrink-0 tabular-nums" aria-hidden="true">{i + 1}</span>
                      <span className="text-slate-400 leading-relaxed"><strong className="text-slate-300">{s.t}.</strong> {s.d}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="before">
                <h2 className="text-2xl font-bold text-white mb-4">What has to happen first</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The milestones NASA itself lists, plus the one that sits with the contractors. Any of these slipping moves the launch.
                </p>
                <div className="space-y-2">
                  {PREREQS.map((p) => (
                    <div key={p.t} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-white font-medium">{p.t}</span>
                        <span className={`text-[10px] uppercase tracking-wider border rounded px-2 py-0.5 ${STATUS_STYLE[p.s]}`}>{p.s}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{p.d}</p>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed mt-4">
                  The <Link href="/artemis" className="text-cyan-400 hover:text-cyan-300">Artemis tracker</Link> keeps these milestones current alongside the full programme timeline.
                </p>
              </section>

              <section id="landing">
                <h2 className="text-2xl font-bold text-white mb-4">So when do humans land on the Moon?</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Artemis IV, 2028</strong>, on NASA&apos;s current plan. A crew rides Orion to lunar orbit, transfers to the Starship Human Landing System, descends to the south polar region, and returns the same way. It is also the first mission of the Gateway era, docking with the lunar space station.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Two things gate that date beyond Artemis III itself: SpaceX must fly an uncrewed Starship HLS demonstration landing on the Moon first, and Starship must demonstrate the in-orbit propellant transfer that a lunar mission requires. Both are tracked on our <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>. Anyone quoting a 2028 landing as settled is ahead of the hardware.
                </p>
              </section>

              <section id="landers">
                <h2 className="text-2xl font-bold text-white mb-4">Starship HLS and Blue Moon</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  NASA deliberately bought two landers. <strong className="text-slate-300">SpaceX&apos;s Starship HLS</strong> holds the contract for the first landing; it is a lunar variant of the Starship upper stage, refuelled in Earth orbit by tanker flights before departing for the Moon. <strong className="text-slate-300">Blue Origin&apos;s Blue Moon Mk2</strong> is the &ldquo;sustaining&rdquo; lander for later missions, launched on New Glenn — a second supplier so the programme never again depends on one company for surface access.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Artemis III tests docking with test versions of one or both. Which flies, and in what order, is itself a status signal for the two programmes; our <Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX guide</Link> follows both companies&apos; progress with live launch data.
                </p>
              </section>

              <section id="news">
                <h2 className="text-2xl font-bold text-white mb-4">Latest Artemis news (live)</h2>
                {articles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {articles.map((a) => <NewsCard key={a.id} article={a} />)}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">The live news rail is unavailable right now — the <Link href="/artemis#news" className="text-cyan-400 hover:text-cyan-300">Artemis tracker</Link> has the latest.</p>
                )}
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Artemis III FAQ</h2>
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
                  <li><Link href="/artemis" className="text-cyan-400 hover:text-cyan-300">Artemis programme tracker</Link> — every mission, every milestone, live news.</li>
                  <li><Link href="/live/artemis-ii-blog" className="text-cyan-400 hover:text-cyan-300">Artemis II live-blog archive</Link> — the April 2026 lunar flyby, as it happened.</li>
                  <li><Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link> — the lander&apos;s progress.</li>
                  <li><Link href="/guide/watch-a-launch-cape-canaveral" className="text-cyan-400 hover:text-cyan-300">Watch a launch from Cape Canaveral</Link> — where Artemis III lifts off.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">
                  Sources: NASA&apos;s Artemis III mission page and its June 9, 2026 crew announcement. Dates are NASA&apos;s stated year-level targets, not launch dates; this page is updated when NASA updates them.
                </p>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: LAST_EDITED, dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'When is Artemis III?' }]} />
        </div>
      </div>
    </div>
  );
}
