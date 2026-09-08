import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// "When does the ISS retire, and what replaces it?" (2026-09-07). The March
// blog post on this question had the plan as it stood in 2024: a 2030 deorbit
// and four free-flying commercial stations arriving in time. By September
// 2026 every part of that has moved — NASA's March "Ignition" pivot to a
// government-owned core module, a Senate draft to push the station to 2032,
// a GAO warning about a gap, a joint NASA-Roscosmos deorbit audit, and
// Haven-1 slipping to 2027. Promoted to a guide (the blog URL 301s here)
// with every date sourced and the honest framing: the retirement date is
// now a political question as much as an engineering one.
export const revalidate = 3600;

const SLUG = 'when-does-the-iss-retire';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = 'When Does the ISS Retire? The 2030 Plan, the Push to 2032, and What Replaces It (2026)';
const DESCRIPTION =
  'NASA still plans to deorbit the ISS in late 2030 with a SpaceX tug, but a Senate draft would extend it to 2032, GAO warns of a gap, and NASA rewrote its replacement plan in March 2026. Every date, the deorbit mechanics, and where each commercial station actually stands.';
/** Bumped by hand when the prose changes. */
const LAST_EDITED = '2026-09-07T00:00:00Z';
const AS_OF = 'September 7, 2026';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['when does the iss retire', 'iss deorbit 2030', 'iss decommission', 'what replaces the iss', 'iss deorbit vehicle', 'commercial space stations 2026', 'haven-1 launch date', 'axiom station', 'iss 2032 extension'],
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-03-17T00:00:00Z', modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

interface StationRow {
  name: string; who: string; what: string; target: string; status: string; tone: 'building' | 'slipped' | 'planned'; asOf: string; href?: string;
}
const STATIONS: StationRow[] = [
  { name: 'Haven-1', who: 'Vast', what: 'Single-module free-flyer on Falcon 9; crews of four for ~10 days via Crew Dragon.', target: 'NET Q1 2027', status: 'In final assembly; slipped from 2026 because system integration took longer than planned.', tone: 'slipped', asOf: '2026', href: '/compare/axiom-vs-vast' },
  { name: 'Axiom Station', who: 'Axiom Space', what: 'Modules attach to the ISS first. At NASA\'s request the order changed: the Payload Power Thermal Module goes up first, then undocks and joins the Hab One habitat to free-fly.', target: 'PPTM to ISS early 2027; free-flying two-module station early 2028', status: 'Building; Ax-5, the fifth private crew mission, is NET January 2027.', tone: 'building', asOf: '2026', href: '/compare/axiom-vs-vast' },
  { name: 'Starlab', who: 'Voyager Space / Airbus, with Northrop Grumman', what: 'One large module launched whole on a single Starship.', target: '2029', status: 'Design; depends on Starship being available to launch it.', tone: 'planned', asOf: '2026', href: '/compare/starlab-vs-orbital-reef' },
  { name: 'Orbital Reef', who: 'Blue Origin / Sierra Space', what: 'Multi-module station with an inflatable LIFE habitat; core on New Glenn.', target: '2030', status: 'Design; New Glenn is grounded until its pad is rebuilt.', tone: 'planned', asOf: '2026', href: '/compare/starlab-vs-orbital-reef' },
  { name: 'NASA core module (Ignition)', who: 'NASA, contractor TBD', what: 'A government-owned core attached to the ISS that commercial modules dock to; the whole assembly later detaches as a free-flyer.', target: 'Not announced', status: 'Announced March 24, 2026; Phase 2 awards to at least two providers expected in 2026.', tone: 'planned', asOf: '2026-03-24' },
  { name: 'Russian Orbital Station (ROS)', who: 'Roscosmos', what: 'Russia\'s successor, built partly from new modules; Russia is formally committed to the ISS only through 2028.', target: 'First module 2028', status: 'Confirmed by Roscosmos in the August 9, 2026 audit report.', tone: 'planned', asOf: '2026-08-09' },
  { name: 'Tiangong', who: 'China', what: 'Three-module national station, crewed continuously since 2022.', target: 'Operating', status: 'The only other crewed station in orbit; would be the only one if the ISS left before a successor was up.', tone: 'building', asOf: '2026' },
];

const TIMELINE = [
  { when: 'Jun 2024', what: 'NASA awards SpaceX up to $843M to build the U.S. Deorbit Vehicle, a heavily modified Dragon.' },
  { when: 'Feb 2026', what: 'USDV cost and schedule baselines approved — formally in development; delivery scheduled for late 2028.' },
  { when: 'Mar 6, 2026', what: 'Senate Commerce draft for the NASA Authorization Act of 2026: extend the ISS through 2032 and forbid deorbiting until a replacement commercial station is operational. Not passed.' },
  { when: 'Mar 24, 2026', what: 'NASA\'s "Ignition" strategy replaces the free-flyer-first plan with a government-owned core module on the ISS that commercial modules dock to.' },
  { when: 'Jun 2026', what: 'GAO finds a significant risk of a gap in continuous U.S. presence in low Earth orbit if commercial successors miss their schedules.' },
  { when: 'Aug 9, 2026', what: 'NASA and Roscosmos begin a joint technical audit of the station\'s critical systems for a controlled deorbit; Roscosmos confirms the first ROS module for 2028 and joint work through end of operations.' },
  { when: '2028', what: 'USDV delivered (plan). Russia\'s formal ISS commitment ends; NASA expects an extension to 2030.' },
  { when: 'Late 2030', what: 'Final crew departs; USDV docks and, over a series of burns, steers the station into the South Pacific near Point Nemo — the current plan.' },
];

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'changed', label: 'What changed in 2026' },
  { id: 'how', label: 'How you deorbit 430 tonnes' },
  { id: 'timeline', label: 'The timeline, dated' },
  { id: 'replacements', label: 'What replaces it — where each station stands' },
  { id: 'gap', label: 'The gap' },
  { id: 'watch', label: 'What to watch' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'When does the ISS retire?', a: 'NASA\'s plan of record is the end of 2030: the last crew leaves, and a SpaceX-built deorbit vehicle steers the station into the South Pacific in a controlled re-entry. But a Senate draft of the 2026 NASA Authorization Act would extend operations to 2032 and forbid deorbiting until a replacement commercial station is operating, and it has not been voted on. As of September 2026 the honest answer is "2030 on paper, possibly later".' },
  { q: 'Why not just leave it up there?', a: 'Because it would come down anyway, uncontrolled. The station is 430 tonnes in an orbit that decays without regular reboosts; abandoned, it would re-enter within a few years and large pieces would survive to the ground somewhere unpredictable. A controlled deorbit over the remote Pacific is the only responsible ending. Proposals to boost it to a higher parking orbit have some congressional support but no NASA plan behind them.' },
  { q: 'What is the U.S. Deorbit Vehicle?', a: 'A SpaceX Dragon modified for one job: 46 Draco thrusters (a normal Dragon has 16) and roughly 16,000 kg of propellant in an extended trunk. It docks with the empty station and performs the final burns. NASA awarded the contract in June 2024 for up to $843 million; the baselines were approved in February 2026 and delivery is scheduled for late 2028.' },
  { q: 'What replaces the ISS?', a: 'Nothing on the same scale, and not on the same date. The candidates are Vast\'s Haven-1 (small, NET Q1 2027), Axiom\'s station (built on the ISS from 2027, free-flying from 2028), Starlab (2029) and Orbital Reef (2030) — plus, since March 2026, a NASA-owned core module that commercial modules would attach to. Russia is building its own station, ROS, from 2028, and China\'s Tiangong is already flying.' },
  { q: 'What is NASA\'s "Ignition" plan?', a: 'A strategy announced March 24, 2026 that changed the replacement approach. Instead of paying companies to build independent free-flying stations, NASA will build and own a core module, attach it to the ISS, have commercial developers dock their modules to it, and eventually detach the whole assembly as a free-flyer. NASA\'s stated reasons: the companies\' business cases did not close and they could not deliver in time. Critics answer that NASA is the market and had funded the effort with under $600 million against the $150 billion the ISS cost.' },
  { q: 'Will there be a gap with no Americans in orbit?', a: 'The Government Accountability Office said in June 2026 that the risk is significant if the commercial stations miss their dates — and Haven-1 has already slipped to 2027. That risk is the reason behind both the Senate\'s 2032 draft and NASA\'s Ignition pivot. Whether a gap happens depends on whether any successor is crewed before the ISS leaves.' },
  { q: 'Is Russia leaving the ISS?', a: 'Russia is formally committed only through 2028 and is building the Russian Orbital Station, with a first module planned for 2028. NASA expects Russia to extend to 2030, and Roscosmos said in August 2026 that joint work continues through the station\'s end of operations — the two agencies are auditing the deorbit together.' },
  { q: 'Is the station still safe?', a: 'It is flying and crewed, but it is old: persistent cracking in the Russian segment and repeated air-leak investigations are the engineering reasons NASA is reluctant to extend past 2030. The August 2026 audit is the first structured assessment of the systems a controlled deorbit depends on.' },
  { q: 'Can I visit before it goes?', a: 'Through Axiom Space, at roughly $55-70 million a seat on a private astronaut mission; Ax-5 is targeted for January 2027. Our space-tourism cost guide has the current figures.' },
];

const TONE: Record<StationRow['tone'], string> = {
  building: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  slipped: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  planned: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export default function WhenDoesTheIssRetireGuide() {
  const edited = new Date(LAST_EDITED);
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">When does the ISS retire?</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              The plan you will read almost everywhere — deorbit in 2030, four commercial stations ready to take over — is the 2024 plan. In 2026 NASA rewrote the replacement strategy, the Senate drafted a two-year extension, the GAO warned of a gap, and the first commercial station slipped again. Here is where it actually stands, every date sourced.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Checked {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2400} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-space-stations.png" className="mb-8" />

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
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Plan of record</div><div className="text-2xl font-bold text-white">Late 2030</div><div className="text-xs text-slate-400 mt-1">final crew leaves, controlled deorbit</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">On the table in Congress</div><div className="text-2xl font-bold text-white">2032</div><div className="text-xs text-amber-300 mt-1">Senate draft, not passed</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">First commercial station</div><div className="text-2xl font-bold text-white">NET Q1 2027</div><div className="text-xs text-slate-400 mt-1">Haven-1, one module, ten-day stays</div></div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">NASA&apos;s plan of record is still the end of 2030.</strong> The last crew leaves, and a purpose-built SpaceX tug docks with the empty station and steers all 430 tonnes of it into the South Pacific near Point Nemo. The tug is under contract, formally in development since February 2026, and due for delivery in late 2028.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">But 2030 is no longer a settled date.</strong> In March 2026 the Senate Commerce Committee drafted language for the NASA Authorization Act that would extend the station to 2032 and forbid deorbiting it until a commercial replacement is operating. It has not passed. In June the GAO said the risk of a gap — no American station in orbit — is significant if the commercial successors miss their schedules, and the first of them has since slipped to 2027. NASA itself tore up the replacement plan in March.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  So: 2030 on paper, with real pressure toward later, and a replacement picture that is smaller and later than it looked a year ago. The rest of this guide is the detail, dated as of {AS_OF}.
                </p>
              </section>

              <section id="changed">
                <h2 className="text-2xl font-bold text-white mb-4">What changed in 2026</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">NASA rewrote the replacement plan.</strong> On March 24, 2026 the agency announced &ldquo;Ignition&rdquo;, a strategy that abandons the idea of paying several companies to build independent free-flying stations by 2030. Instead NASA will build and own a core module, attach it to the ISS, have commercial developers dock their modules to it, and eventually detach the assembly as a free-flyer. NASA&apos;s stated reasons were that the companies&apos; business cases did not close and that none could deliver an operational station soon enough. The counter-argument, made by CSIS among others, is that NASA is the market — it had put less than $600 million into the programme against the $150 billion the ISS cost — and that switching architecture mid-stream may cost more time than it saves.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Congress pushed back on the date.</strong> The Senate&apos;s draft authorisation language would keep the station flying through 2032, bar deorbiting until a replacement is operational, and set NASA deadlines to publish station requirements and sign contracts with at least two providers. It is a draft, not law, but it is the clearest signal yet that the legislature does not accept a gap.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">The partners started the ending.</strong> On August 9, 2026 NASA and Roscosmos began a joint audit of the station&apos;s critical systems for a controlled deorbit — the first structured assessment of whether the ageing structure, with its persistent cracks in the Russian segment and recurring air-leak investigations, can be brought down as planned. Roscosmos used the same report to confirm its own station&apos;s first module for 2028.
                </p>
              </section>

              <section id="how">
                <h2 className="text-2xl font-bold text-white mb-4">How you deorbit 430 tonnes</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  You cannot leave it. The ISS orbits low enough that atmospheric drag pulls it down without regular reboosts; abandoned, it would re-enter uncontrolled within a few years and large pieces would reach the ground somewhere nobody chose. So the ending has to be steered.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The tool is the <strong className="text-slate-300">U.S. Deorbit Vehicle</strong>: a SpaceX Dragon modified for one mission, with 46 Draco thrusters where a normal Dragon has 16 and about 16,000 kg of hypergolic propellant in an extended trunk. NASA awarded the contract in June 2024 for up to $843 million. After the final crew departs, the vehicle docks, the station&apos;s own thrusters and the tug lower the orbit over months, and a final series of burns targets re-entry over the South Pacific near Point Nemo, the &ldquo;spacecraft cemetery&rdquo; farthest from any coastline. Most of the structure burns up; the pieces that do not fall into open ocean.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The alternative that comes up in Congress — boosting the station to a higher storage orbit — would need propellant the station does not have and a vehicle nobody has contracted, and it defers the same problem to a later decade. It has advocates; it does not have a plan.
                </p>
              </section>

              <section id="timeline">
                <h2 className="text-2xl font-bold text-white mb-4">The timeline, dated</h2>
                <ol className="space-y-3">
                  {TIMELINE.map((t) => (
                    <li key={t.when + t.what.slice(0, 12)} className="flex gap-4 text-slate-400 leading-relaxed">
                      <span className="text-slate-300 font-medium whitespace-nowrap tabular-nums w-24 shrink-0">{t.when}</span>
                      <span>{t.what}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="replacements">
                <h2 className="text-2xl font-bold text-white mb-4">What replaces it — where each station stands</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Status as of {AS_OF}. Every target is the developer&apos;s stated one; the status column says what has actually happened.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Station</th><th className="px-3 py-2.5">What it is</th><th className="px-3 py-2.5">Target</th><th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATIONS.map((s) => (
                        <tr key={s.name} className="border-b border-white/[0.06] last:border-0 align-top">
                          <td className="px-3 py-3 text-white">{s.href ? <Link href={s.href} className="hover:text-cyan-300">{s.name}</Link> : s.name}<span className="block text-xs text-slate-500">{s.who}</span></td>
                          <td className="px-3 py-3 text-slate-300 text-xs leading-relaxed">{s.what}</td>
                          <td className="px-3 py-3 text-white whitespace-nowrap">{s.target}</td>
                          <td className="px-3 py-3"><span className={`inline-block text-[10px] uppercase tracking-wider border rounded px-2 py-0.5 ${TONE[s.tone]}`}>{s.tone}</span><span className="block text-xs text-slate-400 mt-1">{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 text-sm mt-4">Side by side: <Link href="/compare/axiom-vs-vast" className="text-cyan-400 hover:text-cyan-300">Axiom vs Vast</Link> · <Link href="/compare/starlab-vs-orbital-reef" className="text-cyan-400 hover:text-cyan-300">Starlab vs Orbital Reef</Link> · <Link href="/space-stations" className="text-cyan-400 hover:text-cyan-300">every station, including the ISS and Tiangong</Link>.</p>
              </section>

              <section id="gap">
                <h2 className="text-2xl font-bold text-white mb-4">The gap</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Put the two halves of this guide together and the problem is visible. The ISS leaves at the end of 2030 on the current plan. The only commercial station with hardware in final assembly, Haven-1, is a single module for ten-day visits, targeted for early 2027 after two slips. Axiom&apos;s free-flyer is early 2028 if the ISS-attached phase goes to plan. Starlab is 2029 and needs Starship. Orbital Reef is 2030 and needs New Glenn, which is grounded. NASA&apos;s own core module has no announced date.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  That is why the GAO used the word &ldquo;significant&rdquo; in June, why the Senate wrote &ldquo;until a replacement commercial space station is operational&rdquo; into its draft, and why NASA pivoted to a plan it controls. A gap would mean that for the first time since November 2000 there would be no continuous American presence in orbit — while China&apos;s Tiangong flies on. Whether that happens turns on two dates: when a successor is crewed, and when the deorbit vehicle actually fires.
                </p>
              </section>

              <section id="watch">
                <h2 className="text-2xl font-bold text-white mb-4">What to watch</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">The NASA Authorization Act of 2026.</strong> If the 2032 extension and the no-deorbit-without-replacement clause survive to a signed bill, the plan of record changes.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Ignition Phase 2 awards</strong> — which two or more companies NASA picks to build modules for its core, and what date it puts on the core itself.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Haven-1&apos;s Q1 2027 launch</strong> — the first commercial station in orbit, or a third slip. <Link href="/compare/axiom-vs-vast" className="text-cyan-400 hover:text-cyan-300">Axiom vs Vast</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">The deorbit audit&apos;s findings</strong> — the first hard statement of whether the station can be brought down as planned, and when.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">USDV delivery, late 2028.</strong> The tug&apos;s schedule is the deorbit&apos;s schedule.</span></li>
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
                  <li><Link href="/space-stations" className="text-cyan-400 hover:text-cyan-300">Space stations tracker</Link> — the ISS, Tiangong and every commercial station, compared.</li>
                  <li><Link href="/compare/axiom-vs-vast" className="text-cyan-400 hover:text-cyan-300">Axiom vs Vast</Link> — the two successors with hardware.</li>
                  <li><Link href="/guide/space-tourism-cost" className="text-cyan-400 hover:text-cyan-300">What it costs to visit</Link> — Axiom&apos;s ISS missions are the only orbital ticket on sale.</li>
                  <li><Link href="/guide/when-is-artemis-3" className="text-cyan-400 hover:text-cyan-300">When is Artemis III?</Link> — the other NASA schedule everyone gets wrong.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">Sources: NASA FY2027 budget request and Ignition announcement (Mar 24, 2026); Senate Commerce Committee draft, NASA Authorization Act of 2026 (reported Mar 6, 2026); GAO, June 2026; NASA–Roscosmos audit report, Aug 9, 2026; CSIS analysis; SpaceNews and Payload on Haven-1 and Axiom schedules. Dates are the developers&apos; stated targets as of {AS_OF}.</p>
              </section>
              <GuideNavigation currentSlug={SLUG} />
              <RelatedModules modules={PAGE_RELATIONS[`guide/${SLUG}`]} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-03-17T00:00:00Z', dateModified: LAST_EDITED, mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'When does the ISS retire?' }]} />
        </div>
      </div>
    </div>
  );
}
