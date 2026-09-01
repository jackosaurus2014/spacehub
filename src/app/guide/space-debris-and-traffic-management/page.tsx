import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getSatelliteTotals, CONSTELLATION_COUNTS, CONSTELLATION_COUNTS_AS_OF } from '@/lib/satellite-counts';

// Catalogue totals come live from the daily SATCAT snapshot (the same
// source as /how-many-satellites) so the guide never quotes a stale
// "tracked objects" figure. Everything else is attributed to dated posts.
// Railway's build container has no DB access — fetch at request time.
export const dynamic = 'force-dynamic';

const TITLE = 'Space Debris and Space Traffic Management: The 2026 Guide';
const DESCRIPTION =
  'How much is in orbit (live catalogue count), how the Kessler syndrome works, how conjunction assessment and collision avoidance operate, the FCC 5-year rule and the rest of the rulebook, who is building debris removal, and what operators actually do.';
const OG = `/api/og?title=${encodeURIComponent('Space Debris and Space Traffic Management')}&subtitle=${encodeURIComponent('The 2026 guide — live catalogue counts, Kessler, conjunctions, rules, removal')}&type=guide`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['space debris', 'space traffic management', 'kessler syndrome', 'conjunction assessment', 'fcc 5 year rule', 'orbital debris 2026', 'active debris removal', 'how much space junk is there'],
  alternates: { canonical: 'https://spacenexus.us/guide/space-debris-and-traffic-management' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-09-01T00:00:00Z', modifiedTime: '2026-09-01T00:00:00Z', authors: ['SpaceNexus'], images: [{ url: OG, width: 1200, height: 630 }] },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'count', label: 'How much is up there (live)' },
  { id: 'events', label: 'Where the debris came from' },
  { id: 'kessler', label: 'Kessler syndrome, explained properly' },
  { id: 'conjunctions', label: 'Conjunction assessment and collision avoidance' },
  { id: 'rules', label: 'The rulebook: FCC 5-year rule and beyond' },
  { id: 'removal', label: 'Active debris removal: who is building it' },
  { id: 'operators', label: 'What operators actually do' },
  { id: 'faq', label: 'FAQ' },
  { id: 'sources', label: 'Sources' },
];

const FAQ = [
  { q: 'How many pieces of space debris are there?', a: 'The public catalogue tracks on the order of 35,000 objects in Earth orbit, of which roughly 12,500 are debris fragments (the live figure is at the top of this guide). Below the tracking threshold, statistical models estimate about 1 million objects between 1 and 10 cm and about 130 million smaller than 1 cm — untrackable, but fast enough to damage a spacecraft.' },
  { q: 'What is the Kessler syndrome?', a: 'A scenario described by NASA scientist Donald Kessler in 1978 in which the density of objects in an orbital band becomes high enough that collisions generate fragments faster than atmospheric drag removes them, so the debris population grows on its own even with no new launches. Modelling suggests the 700-1,000 km band may already be at or near that threshold; the lower shells where most mega-constellations fly are self-cleaning by comparison.' },
  { q: 'What is the FCC 5-year rule?', a: 'FCC Report and Order 22-74, adopted in September 2022, requires satellites in or passing through low Earth orbit to deorbit within 5 years of the end of their mission, replacing the old 25-year guideline. It applies to new licences and market-access grants after the September 2024 effective date and to foreign satellites serving the U.S. market; existing constellations are grandfathered until they modify or renew.' },
  { q: 'What is a conjunction data message?', a: 'A CDM is the warning an operator receives when two catalogued objects are predicted to pass within a screening threshold — typically about 1 km. It carries the time of closest approach, the miss distance, a probability of collision, and the position and velocity uncertainty for both objects. The 18th Space Defense Squadron issues on the order of 100 a day, free, through Space-Track.org.' },
  { q: 'Which companies remove space debris?', a: 'Astroscale is the furthest along: ELSA-d demonstrated magnetic capture in 2021 and ADRAS-J rendezvoused with a real H-2A upper stage in 2024, with the multi-client ELSA-M to follow. ClearSpace is building ESA\'s ClearSpace-1 to capture a Vega payload adapter at about 800 km. Orbit Fab (refuelling), TransAstra (capture bags) and Neumann Space (debris-as-propellant thrusters) are building supporting technology.' },
  { q: 'How does a satellite deorbit at end of life?', a: 'In LEO, it lowers its perigee with onboard propulsion until drag finishes the job — roughly 150-200 m/s of delta-v from an 800 km circular orbit — or, below about 400 km, simply lets drag do it. In GEO, deorbit is impractical, so satellites are raised at least 300 km into a graveyard orbit for about 10-15 m/s. Either way the spacecraft must be passivated: propellant vented, batteries discharged, pressurant released.' },
];

export default async function SpaceDebrisGuide() {
  const now = new Date();
  const t = await getSatelliteTotals();
  const asOf = t ? new Date(t.asOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  const starlink = CONSTELLATION_COUNTS.find((c) => c.name === 'Starlink');

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Space Debris and Traffic Management</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Everything humanity has launched is still up there, or its fragments are. This guide counts it from the public catalogue every morning, explains why the count matters, walks through how operators avoid each other, sets out the rules that now apply, and looks at who is trying to clean up.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2400} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-debris.png" className="mb-8" />

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
                <p className="text-slate-400 leading-relaxed mb-4">
                  Low Earth orbit is crowded but not yet closed. The public catalogue tracks on the order of 35,000 objects, roughly a third of them debris, and models estimate over a hundred million fragments too small to track. Two events — a Chinese anti-satellite test in 2007 and the Iridium-Cosmos collision in 2009 — account for roughly a third of all catalogued LEO debris on their own. The 700-1,000 km band may already be past the point where collisions breed faster than drag cleans up; the 400-600 km shells where Starlink and Amazon Leo fly are self-cleaning within years, which is why regulators have pushed operators lower.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Space traffic management, meanwhile, is not a system so much as a practice: the U.S. Space Force screens the catalogue, sends free conjunction warnings to anyone who registers, and each operator decides for itself whether to move. The FCC&apos;s 5-year deorbit rule is the sharpest regulation in force anywhere; most international frameworks remain voluntary. Active debris removal has been demonstrated in orbit but is not yet a business. That is the state of play; the rest of this guide is the detail.
                </p>
              </section>

              <section id="count">
                <h2 className="text-2xl font-bold text-white mb-4">How much is up there (live)</h2>
                {t ? (
                  <>
                    <p className="text-slate-400 leading-relaxed mb-4">
                      Counted from the public satellite catalogue (CelesTrak SATCAT) in our daily snapshot of <strong className="text-slate-300">{asOf}</strong>:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        { k: 'Tracked objects', v: t.totalTracked, sub: 'everything in the catalogue' },
                        { k: 'Payloads', v: t.totalPayloads, sub: 'working and defunct satellites' },
                        { k: 'Rocket bodies', v: t.totalRocketBodies, sub: 'spent stages' },
                        { k: 'Debris fragments', v: t.totalDebris, sub: 'tracked junk' },
                      ].map((s) => (
                        <div key={s.k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="text-xs text-slate-500 mb-1">{s.k}</div>
                          <div className="text-2xl font-bold text-white">{s.v.toLocaleString('en-US')}</div>
                          <div className="text-xs text-slate-400 mt-1">{s.sub}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-400 leading-relaxed mb-4">
                      By orbit: {t.leo.toLocaleString('en-US')} objects in low Earth orbit, {t.meo.toLocaleString('en-US')} in medium Earth orbit and {t.geo.toLocaleString('en-US')} at geostationary altitude. The full breakdown, refreshed every morning, is on <Link href="/how-many-satellites" className="text-cyan-400 hover:text-cyan-300">How many satellites are in orbit?</Link>
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 leading-relaxed mb-4">
                    Our daily catalogue snapshot is temporarily unavailable. The public catalogue lists on the order of 35,000 on-orbit objects, about 12,500 of them debris; the live figures are on <Link href="/how-many-satellites" className="text-cyan-400 hover:text-cyan-300">How many satellites are in orbit?</Link>
                  </p>
                )}
                <p className="text-slate-400 leading-relaxed mb-4">
                  Three caveats make these numbers honest. First, the catalogue only holds what radar and telescopes can track — in practice objects larger than about 10 cm in LEO, the threshold the Space Fence radar on Kwajalein is designed to reach. Below that, the population is estimated statistically: our coverage puts it at roughly <strong className="text-slate-300">1 million objects between 1 and 10 cm</strong> and <strong className="text-slate-300">130 million smaller than 1 cm</strong>. At LEO closing speeds — around 28,000 km/h relative velocity in a typical collision — a 1 cm fragment carries the energy of a hand grenade, and a 10 cm one roughly a stick of dynamite.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Second, the public catalogue is smaller than the Space Force&apos;s own: our space situational awareness guide cites U.S. Space Command tracking around 47,000 objects, some of which are not published. Third, &ldquo;payloads&rdquo; includes dead satellites, and a dead satellite is debris in every sense but the label. One more perspective: a single operator, Starlink, accounts for {starlink ? starlink.satellites.toLocaleString('en-US') : 'over 11,000'} of the payloads as of {starlink?.countDate ?? CONSTELLATION_COUNTS_AS_OF} — more than every other active spacecraft combined.
                </p>
              </section>

              <section id="events">
                <h2 className="text-2xl font-bold text-white mb-4">Where the debris came from</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Most catalogued debris comes from a small number of events. The worst was deliberate: on January 11, 2007, China destroyed its defunct Fengyun-1C weather satellite with a kinetic interceptor at 865 km, producing more than 3,500 tracked fragments — and because drag is negligible at that altitude, most will stay up for centuries. The worst accident followed two years later: on February 10, 2009, the dead Russian Cosmos 2251 struck the operational Iridium 33 at 790 km and 11.7 km/s, creating over 2,300 tracked fragments. Together, our debris-removal coverage notes, those two events account for roughly a third of all catalogued LEO debris.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Russia&apos;s November 2021 destruction of Cosmos 1408 with a direct-ascent ASAT weapon added over 1,500 tracked fragments and sent the International Space Station crew into their return vehicles for shelter. India&apos;s 2019 test was at lower altitude and its fragments are decaying. Beyond the headline events, there have been more than 640 known breakup events since the space age began — spent stages exploding from residual propellant, batteries failing, structures degrading. Historically, propulsion-system explosions are the second-largest source of catalogued debris after ASAT tests, which is why passivation at end of life is mandatory.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Altitude decides how long any of this lasts. Between 700 and 1,000 km — home to Earth-observation satellites, the Fengyun-1C cloud and the Iridium-Cosmos field — objects persist for centuries. At 400-500 km, where the ISS and most mega-constellation shells operate, drag removes debris within roughly 5-25 years, and a dead Starlink satellite at 550 km comes down within a handful of years. Geostationary orbit has no drag at all; retired satellites are pushed into a graveyard about 300 km above the belt and stay there indefinitely.
                </p>
              </section>

              <section id="kessler">
                <h2 className="text-2xl font-bold text-white mb-4">Kessler syndrome, explained properly</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  In 1978 NASA scientist Donald J. Kessler described a feedback loop: two large objects collide, the collision produces thousands of fragments, each fragment raises the collision probability for everything else in the band, further collisions produce more fragments, and above a certain density the process becomes self-sustaining — the population grows even if launches stop entirely, because collisions create debris faster than drag removes it.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The popular version — orbit becomes an impassable wall of shrapnel overnight — is wrong in an important way. The cascade is slow, measured in decades, and it is regional: it depends on the density and drag environment of a specific altitude band. NASA&apos;s and ESA&apos;s debris models suggest the 700-1,000 km band (ESA&apos;s Space Debris Office highlights 750-900 km specifically) may already be at or past the self-sustaining threshold. The practical effect is not that those orbits become unusable, but that they become progressively more expensive to operate in: more warnings, more manoeuvres, more fuel, higher insurance.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Mega-constellations change the arithmetic in the lower shells. Even a 1% failure rate in a 12,000-satellite constellation is 120 uncontrollable objects, and a failed satellite at 550 km takes years to decay. What keeps the lower bands healthy is that drag provides margin — as long as failure rates stay low and disposal is reliable. Starlink reports a controlled-deorbit success rate above 99%; at its scale even that leaves a meaningful number of derelicts.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  How many large objects need removing each year to stabilise the environment? Our sources disagree, which is itself informative: our debris-removal coverage cites ESA modelling at 5-10 per year as a minimum, while our Kessler explainer cites 50-100. Either way, no current technology or business model removes any at that rate — see the removal section below.
                </p>
              </section>

              <section id="conjunctions">
                <h2 className="text-2xl font-bold text-white mb-4">Conjunction assessment and collision avoidance</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  &ldquo;Space traffic management&rdquo; today means conjunction assessment. The U.S. Space Force&apos;s 18th Space Defense Squadron runs the Space Surveillance Network — radars such as the AN/FPS-85 in Florida and the Space Fence on Kwajalein, plus the GEODSS telescopes for high orbits — maintains the catalogue, and screens every object against every other. When two are predicted to pass within a threshold (typically about 1 km), the operator receives a <strong className="text-slate-300">Conjunction Data Message</strong> with the time of closest approach, miss distance, probability of collision, and the covariance — the position and velocity uncertainty — for both objects. The service is free to any operator registered on Space-Track.org, commercial or foreign.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The volume is large: our coverage puts the 18th SDS at roughly 100 conjunction warnings a day, and an individual satellite operator can see on the order of 30 alerts a week per satellite, the vast majority of which never require action. The decision is probabilistic. Uncertainty in both objects&apos; orbits is large relative to the miss distance, so operators set a probability threshold and manoeuvre when a conjunction crosses it. Starlink automates this and performs thousands of avoidance manoeuvres a year; the ISS manoeuvres by hand — our sources put it anywhere from a few to a few dozen times a year — each one coordinated with visiting vehicles and crew schedules.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The weaknesses of the system are structural. There is no traffic controller: each operator decides independently, and two operators with satellites on a collision course have no binding rule for who moves. Government catalogue accuracy is limited, which is why commercial providers — LeoLabs, ExoAnalytic, Slingshot Aerospace and others — sell higher-accuracy tracking and faster warnings, and why the Space Force budget now buys commercial data. Formal space traffic management — traffic rules for orbit, analogous to air traffic control — remains under international discussion, and the U.S. Office of Space Commerce is building civil space situational awareness capabilities meant to take on the civil-operator workload.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Follow live close approaches on our <Link href="/conjunctions" className="text-cyan-400 hover:text-cyan-300">conjunctions page</Link> and the <Link href="/space-environment?tab=debris" className="text-cyan-400 hover:text-cyan-300">debris tracker</Link>.
                </p>
              </section>

              <section id="rules">
                <h2 className="text-2xl font-bold text-white mb-4">The rulebook: the FCC 5-year rule and beyond</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The most consequential debris regulation in force anywhere is the <strong className="text-slate-300">FCC&apos;s 5-year post-mission disposal rule</strong>, Report and Order 22-74, adopted in September 2022. Satellites in or passing through LEO must deorbit within 5 years of completing their mission, down from the 25-year guideline the Inter-Agency Space Debris Coordination Committee adopted in 2002. It applies to new FCC licences and market-access grants after the September 2024 effective date — and because market access covers any satellite serving U.S. customers, it reaches foreign operators too. Existing constellations are grandfathered until they modify or renew. Applicants must show a credible deorbit plan, and the FCC can deny, condition or revoke authorisations for non-compliance. The first enforcement action came in 2023, when Dish Network was fined $150,000 over a disposal failure.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The rule has already changed how satellites are designed. Above roughly 500 km, natural decay takes longer than 5 years, so satellites there now need propulsion — or a drag sail — to comply; below 400 km, drag does the work but station-keeping costs more fuel during the mission. CubeSats that used to fly without propulsion must either add it or fly lower. Insurers now treat deorbit capability as an underwriting criterion. And the compliance economics differ sharply by altitude: a constellation at 550 km has an easy path, one at 1,200 km — where natural decay takes decades — does not.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The <strong className="text-slate-300">FAA</strong> went the other way. In March 2026 it withdrew its proposed rule that would have required launch operators to dispose of upper stages within 25 years, after industry argued the timeline was already obsolete next to the FCC&apos;s and that two agencies with overlapping rules would conflict. The FAA keeps its authority to attach debris conditions to individual launch licences; there is simply no blanket upper-stage rule.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Internationally, almost everything is voluntary. The UN COPUOS guidelines (2007) and Long-term Sustainability guidelines (2019) recommend limiting released debris, preventing post-mission breakups, disposing of spacecraft and avoiding collisions — but bind no one until a national regulator adopts them. ESA&apos;s Zero Debris Charter commits ESA and signatories to generating no new debris by 2030 and covers active removal and design-for-demise. ISO 24113 is increasingly cited in national licence conditions, and the ITU&apos;s spectrum coordination process now asks for disposal plans, an indirect lever. The result, as our regulatory coverage notes, is asymmetry: U.S.-licensed operators face stricter rules than competitors launching under lighter regimes. Track rulemaking in the <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300">Compliance Hub</Link>.
                </p>
              </section>

              <section id="removal">
                <h2 className="text-2xl font-bold text-white mb-4">Active debris removal: who is building it</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Removal is technically proven and commercially unproven. <strong className="text-slate-300">Astroscale</strong> (Japan/UK) is the furthest along: ELSA-d, launched in 2021, captured and released a cooperative target with a magnetic docking plate multiple times; ADRAS-J, launched in 2024, performed the first rendezvous and proximity operation with a real, tumbling piece of debris — a Japanese H-2A upper stage — and imaged it from metres away; ELSA-M, the multi-client commercial follow-on with a robotic arm, is expected to begin operations in 2026-2027. <Link href="/company-profiles/astroscale" className="text-cyan-400 hover:text-cyan-300">Company profile</Link>.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">ClearSpace</strong> (Switzerland) was selected by ESA for ClearSpace-1, the first institutional removal mission: a four-armed &ldquo;space claw&rdquo; that will close around a Vega payload adapter left at about 800 km in 2013 and drag it to a controlled reentry. Our March 2026 coverage had it scheduled for 2026. See our <Link href="/compare/clearspace-vs-astroscale" className="text-cyan-400 hover:text-cyan-300">ClearSpace vs Astroscale</Link> comparison. Around them, <strong className="text-slate-300">Orbit Fab</strong> is building the refuelling infrastructure (its RAFTI port and depots) that would let a servicer remove several objects per mission; <strong className="text-slate-300">TransAstra</strong> is developing inflatable capture bags suited to large, tumbling rocket bodies; and <strong className="text-slate-300">Neumann Space</strong> (Australia) is developing ion thrusters that run on metal processed from captured debris.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The obstacle is the business model — a textbook tragedy of the commons, where everyone benefits from a cleaner orbit and no one has enough incentive to pay for it. Candidate models include government procurement (ESA and JAXA are buying demonstrations; the Zero Debris Charter creates demand for European-origin cleanup), insurance-funded removal as a cheaper alternative to collision payouts, compliance-driven demand from operators whose own deorbit systems fail, bundling removal with satellite servicing, and per-satellite sustainability fees. Our coverage cites estimates of a $2.5 billion annual removal market by 2030 and per-object costs of $5-50 million for large debris. Neither number is a business yet.
                </p>
              </section>

              <section id="operators">
                <h2 className="text-2xl font-bold text-white mb-4">What operators actually do</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Debris management is a lifecycle discipline, not a manoeuvre. From our end-of-life and compliance coverage, the practical checklist:
                </p>
                <ul className="space-y-3 text-slate-400 leading-relaxed mb-4">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Design phase.</strong> Reserve delta-v for disposal, not just station-keeping (roughly 150-200 m/s from 800 km circular; 10-15 m/s to reach a GEO graveyard). Choose altitude with the 5-year clock in mind. Design for demise — avoid titanium tanks and optical glass that survive reentry — or plan a targeted ocean disposal with casualty risk below 1 in 10,000. Build in passivation: vent propellant and pressurant, discharge batteries, safe pyrotechnics.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Licensing.</strong> Map every jurisdiction — FCC, FAA, NOAA, ITU, and any foreign licensing state — and their specific debris conditions. Submit a credible deorbit plan; it is now a gating item, not a formality.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Operations.</strong> Register on Space-Track.org for CDMs; set a collision-probability threshold and a manoeuvre decision process; consider commercial SSA data for higher accuracy; share ephemerides so others can screen against you; keep records of every conjunction assessment and manoeuvre for renewals, insurers and audits.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">End of life.</strong> The 5-year clock starts at mission completion, not launch — retain enough propellant and power to execute disposal after the primary mission. In LEO, deorbit (active propulsion finishes in hours to days; passive drag from 400 km takes weeks, from 600 km months to years). In GEO, graveyard and passivate. In MEO, move above or below the navigation belt.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Insurance and reputation.</strong> Insurers price deorbit capability and third-party liability exposure; the Space Sustainability Rating scores operators publicly. Both are becoming commercial differentiators, not just compliance boxes.</span></li>
                </ul>
                <p className="text-slate-400 leading-relaxed">
                  Tools on SpaceNexus: the <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300">satellite tracker</Link>, the <Link href="/space-environment" className="text-cyan-400 hover:text-cyan-300">space environment monitor</Link> (debris catalogue, conjunction events, sustainability scores), the <Link href="/orbital-calculator" className="text-cyan-400 hover:text-cyan-300">orbital calculator</Link> for deorbit delta-v and decay timelines, and the <Link href="/sustainability-scorecard" className="text-cyan-400 hover:text-cyan-300">sustainability scorecard</Link>.
                </p>
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

              <section id="sources" className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Sources</h2>
                <p className="text-sm text-slate-500 mb-3">Catalogue totals are live from our daily SATCAT snapshot. Every other figure is from a SpaceNexus data page or dated article; where two of our articles disagree, both figures are given.</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link href="/how-many-satellites" className="text-cyan-400 hover:text-cyan-300">How many satellites are in orbit?</Link> — live tracked / payload / rocket-body / debris totals and orbit split; Starlink {starlink?.satellites.toLocaleString('en-US')} as of {starlink?.countDate}.</li>
                  <li><Link href="/blog/kessler-syndrome-space-debris-orbit-unusable" className="text-cyan-400 hover:text-cyan-300">The Kessler syndrome</Link> (Mar 2026) — 1978 Kessler paper; Fengyun-1C Jan 11, 2007, 865 km, 3,500+ fragments; Cosmos 2251 / Iridium 33 Feb 10, 2009, 790 km, 11.7 km/s, 2,300+ fragments; Cosmos 1408 Nov 2021, 1,500+ fragments; 640+ breakup events; 700-1,000 km band; 5-25 year decay at 400-500 km; 1% of 12,000 = 120; 50-100 removals/yr; $5-50M per object; ISS shelter.</li>
                  <li><Link href="/blog/space-debris-removal-companies-cleaning-orbit" className="text-cyan-400 hover:text-cyan-300">Space debris removal companies</Link> (Mar 2026) — ~1M objects 1-10 cm, ~130M under 1 cm; ~28,000 km/h; hand grenade / dynamite comparisons; ~30 alerts per week per satellite; two events ≈ one-third of LEO debris; ESA 750-900 km, 5-10 removals/yr; Astroscale ELSA-d 2021, ADRAS-J 2024, ELSA-M 2026-27; ClearSpace-1 VESPA ~800 km, 2013, scheduled 2026; Orbit Fab, TransAstra, Neumann Space; business models; $2.5B by 2030.</li>
                  <li><Link href="/blog/space-debris-regulations-changes-2026" className="text-cyan-400 hover:text-cyan-300">Space debris regulations: what changed in 2026</Link> (Mar 2026) — FAA 25-year rule withdrawn Mar 2026; FCC rule adopted Sept 2022; IADC 2002; foreign-operator reach; altitude economics at 550 vs 1,200 km; COPUOS 2007 / LTS 2019; Zero Debris Charter 2030; ITU; Dish $150,000 fine 2023; compliance checklist.</li>
                  <li><Link href="/blog/space-debris-five-year-rule-what-operators-need-know" className="text-cyan-400 hover:text-cyan-300">The FCC 5-year deorbit rule</Link> (Mar 2026) — Report and Order 22-74; Sept 2024 effective date; grandfathering; ~500 km / ~400 km thresholds; drag sails; design for demise.</li>
                  <li><Link href="/blog/satellite-end-of-life-deorbit-graveyard-passivation" className="text-cyan-400 hover:text-cyan-300">Satellite end-of-life management</Link> (Mar 2026) — 150-200 m/s from 800 km; GEO graveyard ≥300 km, 10-15 m/s; 1-in-10,000 casualty risk; passivation steps; decay timelines; propulsion explosions as second-largest debris source.</li>
                  <li><Link href="/blog/what-is-space-situational-awareness-ssa-guide" className="text-cyan-400 hover:text-cyan-300">What is space situational awareness?</Link> (Mar 2026) — ~47,000 objects tracked by U.S. Space Command; ~100 warnings/day; ~1 km screening threshold; CDM contents; AN/FPS-85, Space Fence, GEODSS; LeoLabs, ExoAnalytic, Numerica; ISS 2-3 manoeuvres/yr; STM under discussion.</li>
                  <li><Link href="/blog/space-debris-problem-explained-solutions-2026" className="text-cyan-400 hover:text-cyan-300">The space debris problem</Link> (Mar 2026) — operator checklist; Space Fence 10 cm; India 2019 test fragments decaying (conjunction record in our debris tracker).</li>
                  <li><Link href="/blog/10000-starlink-satellites-mega-constellation-internet" className="text-cyan-400 hover:text-cyan-300">10,000 Starlink satellites</Link> (Mar 2026) — 99%+ controlled-deorbit success rate.</li>
                  <li><Link href="/blog/space-force-budget-where-30-billion-goes" className="text-cyan-400 hover:text-cyan-300">Space Force budget</Link> — commercial SSA data purchases from LeoLabs, ExoAnalytic and Slingshot.</li>
                </ul>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Further reading</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/blog/space-debris-regulations-changes-2026" className="text-cyan-400 hover:text-cyan-300">Space debris regulations: what changed in 2026 and what&apos;s coming</Link> — the full regulatory picture for operators, insurers and investors.</li>
                  <li><Link href="/blog/space-debris-removal-companies-cleaning-orbit" className="text-cyan-400 hover:text-cyan-300">Space debris removal: companies cleaning up Earth&apos;s orbit</Link> — technologies and business models in depth.</li>
                  <li><Link href="/blog/kessler-syndrome-space-debris-orbit-unusable" className="text-cyan-400 hover:text-cyan-300">The Kessler syndrome: could space debris make orbit unusable?</Link> — the cascade, band by band.</li>
                  <li><Link href="/blog/satellite-end-of-life-deorbit-graveyard-passivation" className="text-cyan-400 hover:text-cyan-300">Satellite end-of-life management</Link> — deorbit, graveyard or passivation, with the numbers.</li>
                  <li><Link href="/guide/space-weather-risk-for-operators" className="text-cyan-400 hover:text-cyan-300">Space weather risk for satellite operators</Link> — the other environmental hazard, and why storms make conjunction screening unreliable.</li>
                </ul>
              </section>

              <GuideNavigation currentSlug="space-debris-and-traffic-management" />
              <RelatedModules modules={PAGE_RELATIONS['guide/space-debris-and-traffic-management']} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-09-01T00:00:00Z', dateModified: now.toISOString(), mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-debris-and-traffic-management' },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Space Debris and Traffic Management' }]} />
        </div>
      </div>
    </div>
  );
}
