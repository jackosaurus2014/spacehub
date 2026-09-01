import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { LAUNCH_VEHICLES } from '@/lib/launch-vehicles-data';

// Long-form explainer for the "NSSL Phase 3" / "Lane 1 vs Lane 2" query
// class. Every figure is drawn from repo data (launch-vehicles-data,
// government-contracts-data, deal-flow-data, regulatory-calendar-data,
// cost-to-launch) or from dated blog posts, and each is attributed in the
// Sources section. No DB reads, so the page can be statically revalidated.
export const revalidate = 3600;

const TITLE = 'NSSL Phase 3 Explained: Lane 1, Lane 2, and Who Wins National Security Launches';
const DESCRIPTION =
  'How the U.S. Space Force buys launches under National Security Space Launch Phase 3 — the two-lane structure, on-ramps, who is certified, what it means for SpaceX, ULA and Blue Origin, and how to track awards.';
const OG = `/api/og?title=${encodeURIComponent('NSSL Phase 3 Explained')}&subtitle=${encodeURIComponent('Lane 1, Lane 2, and who wins national security launches')}&type=guide`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['NSSL Phase 3', 'NSSL Lane 1', 'NSSL Lane 2', 'national security space launch', 'space force launch contracts', 'vulcan nssl', 'new glenn nssl', 'falcon 9 nssl'],
  alternates: { canonical: 'https://spacenexus.us/guide/nssl-phase-3' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-09-01T00:00:00Z', modifiedTime: '2026-09-01T00:00:00Z', authors: ['SpaceNexus'], images: [{ url: OG, width: 1200, height: 630 }] },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'what', label: 'What NSSL is and why Phase 3 exists' },
  { id: 'lanes', label: 'Lane 1 vs Lane 2' },
  { id: 'onramps', label: 'On-ramps: how new rockets get in' },
  { id: 'providers', label: 'The providers (live records)' },
  { id: 'money', label: 'What a national-security launch costs' },
  { id: 'stakes', label: 'Why it matters for SpaceX, ULA and Blue Origin' },
  { id: 'track', label: 'How to track awards on SpaceNexus' },
  { id: 'faq', label: 'FAQ' },
  { id: 'sources', label: 'Sources' },
];

const FAQ = [
  { q: 'What is the difference between NSSL Lane 1 and Lane 2?', a: 'Lane 1 covers lower-risk, commercial-like missions — proliferated constellations and payloads that can tolerate a newer rocket — bought as task orders under an indefinite-delivery contract with recurring on-ramps for new providers. Lane 2 covers the most demanding national security payloads, requires full Space Force certification and mission assurance, and is awarded as multi-year mission assignments to a small set of certified providers.' },
  { q: 'Who won NSSL Phase 3 Lane 1?', a: 'Our procurement tracker records the Lane 1 heavy/medium launch IDIQ as awarded to ULA, SpaceX and Blue Origin, with a contract ceiling of $5.6 billion. Lane 1 is not a fixed share — individual missions are competed as task orders among the providers on the contract.' },
  { q: 'Is Blue Origin certified for national security launches?', a: 'Blue Origin is on the Lane 1 contract with New Glenn. Our March 2026 defense-market coverage described ULA and SpaceX as the holders of current Lane 1 and Lane 2 contracts with Blue Origin pursuing certification for the most demanding missions. New Glenn\'s record — two successes in three flights, a second-stage failure in April 2026 and a pad explosion in May 2026 — is the thing to watch.' },
  { q: 'Why did the Space Force pause Vulcan launches?', a: 'Vulcan\'s fourth flight, USSF-87 on February 12, 2026, reached orbit but suffered a second solid-rocket-booster anomaly (the first was on the Cert-2 mission in October 2024). The Space Force paused Vulcan national-security launches pending the SRB investigation, per our launch-vehicle database.' },
  { q: 'How much does an NSSL launch cost compared with a commercial one?', a: 'More. Our cost-to-launch data puts a Falcon 9 NSSL mission at roughly $70-100 million against a ~$74 million commercial list price, and a Vulcan Centaur NSSL mission at $100-150 million. Mission assurance, government engineering oversight and direct high-energy orbit insertion are the reasons.' },
  { q: 'When is the next NSSL on-ramp?', a: 'Our regulatory calendar lists an NSSL Phase 3 Lane 2 on-ramp with applications open from January 15 to March 15, 2027 — the window for new launch providers to enter competed national security missions.' },
];

function n(x: number | null | undefined, unit = ''): string {
  if (x == null) return '—';
  return `${x.toLocaleString('en-US')}${unit}`;
}

export default function NsslPhase3Guide() {
  const now = new Date();
  const spec = (id: string) => LAUNCH_VEHICLES.find((v) => v.id === id);
  const vehicles = [spec('falcon-9'), spec('falcon-heavy'), spec('vulcan-centaur'), spec('new-glenn'), spec('neutron')].filter(Boolean) as NonNullable<ReturnType<typeof spec>>[];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">NSSL Phase 3</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              National Security Space Launch is how the Pentagon and the intelligence community buy rides to orbit for the satellites they cannot afford to lose. Phase 3 rewrote the rules into two lanes, opened the door to new rockets, and turned a two-company duopoly into a three-way contest. This guide explains the structure, the stakes, and how to follow the money.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2200} className="flex items-center gap-1.5" />
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
                <p className="text-slate-400 leading-relaxed mb-4">
                  NSSL Phase 3 splits national security launches into two lanes. <strong className="text-slate-300">Lane 1</strong> is for missions that can accept more risk — constellation batches, experimental payloads, anything with a commercial-like profile — and is run as a multi-award contract where individual missions are competed as task orders and new rockets can join at recurring on-ramps. <strong className="text-slate-300">Lane 2</strong> is for the payloads that must not fail: the exquisite reconnaissance, missile-warning and communications satellites that need a fully certified vehicle, direct insertion to demanding orbits, and the government&apos;s full mission-assurance process.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Our procurement tracker records the Lane 1 heavy/medium launch contract as awarded to <strong className="text-slate-300">ULA, SpaceX and Blue Origin</strong> with a $5.6 billion ceiling. Our defense-market coverage from March 2026 describes ULA and SpaceX as the holders of current Lane 1 and Lane 2 contracts, with Blue Origin pursuing certification for the hardest missions. The next Lane 2 on-ramp in our regulatory calendar opens in January 2027.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Who is winning? On record, SpaceX: Falcon 9 has flown hundreds of times with a 99.6% success rate, and the company won over $5 billion of government contracts in 2025. ULA has the institutional relationship and a vehicle designed for the job, but Vulcan&apos;s national-security flights were paused after a February 2026 booster anomaly. Blue Origin has the contract and the biggest fairing, and a rocket that is grounded as of August 2026. The lanes were built so that this picture can change — that is the whole point of them.
                </p>
              </section>

              <section id="what">
                <h2 className="text-2xl font-bold text-white mb-4">What NSSL is and why Phase 3 exists</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The National Security Space Launch program — the successor to the older Evolved Expendable Launch Vehicle (EELV) effort — is the U.S. Space Force&apos;s mechanism for certifying rockets and contracting launches for the most critical national security payloads. Its founding principle is <em>assured access</em>: the government wants at least two independent families of launch vehicles so that a failure or grounding of one never leaves a reconnaissance or missile-warning satellite stuck on the ground. Our Space Force budget breakdown puts the NSSL line at roughly $3.5 billion a year, covering launch services plus pad infrastructure at Cape Canaveral and Vandenberg.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  For most of the program&apos;s history that meant one company: United Launch Alliance, with Atlas V and Delta IV. SpaceX broke the monopoly when Falcon 9 was certified for national security missions in 2015. Phase 2 formalised a two-provider market — ULA with Vulcan Centaur and SpaceX with Falcon 9 and Falcon Heavy — and our deal-flow ledger records approximately $2.5 billion in Phase 2 awards to ULA and $1.9 billion to SpaceX for missions through 2027.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Phase 2 solved assured access but created a new problem. The Pentagon&apos;s own architecture was changing: instead of a few enormous satellites, programs like the Space Development Agency&apos;s transport and tracking layers now field dozens of smaller spacecraft on a fast cadence. Those payloads do not need — and cannot afford — the full mission-assurance treatment reserved for a billion-dollar reconnaissance satellite. At the same time, a new generation of rockets (New Glenn, Neutron and others) was approaching flight and had no route into the program until the next multi-year competition. Phase 3&apos;s two-lane design is the answer to both problems at once.
                </p>
              </section>

              <section id="lanes">
                <h2 className="text-2xl font-bold text-white mb-4">Lane 1 vs Lane 2</h2>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">&nbsp;</th><th className="px-3 py-2.5">Lane 1</th><th className="px-3 py-2.5">Lane 2</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Missions</td><td className="px-3 py-2.5">Lower-risk, commercial-like: proliferated constellations, experiments, payloads with tolerance for a newer vehicle</td><td className="px-3 py-2.5">The most demanding national security payloads and orbits</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Contract form</td><td className="px-3 py-2.5">Multi-award IDIQ; each mission competed as a task order</td><td className="px-3 py-2.5">Multi-year mission assignments to certified providers</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Entry</td><td className="px-3 py-2.5">Recurring on-ramps; a vehicle needs a credible path to flight, not a full certification record</td><td className="px-3 py-2.5">Full Space Force certification and mission-assurance process</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Providers on record</td><td className="px-3 py-2.5">ULA, SpaceX, Blue Origin (ceiling $5.6B)</td><td className="px-3 py-2.5">ULA and SpaceX; Blue Origin pursuing certification</td></tr>
                      <tr><td className="px-3 py-2.5 text-slate-500">Next on-ramp</td><td className="px-3 py-2.5">Recurring</td><td className="px-3 py-2.5">Applications Jan 15 – Mar 15, 2027 (our regulatory calendar)</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Lane 1</strong> is the commercial-style lane. The Space Force sets up an indefinite-delivery, indefinite-quantity contract with several providers and then competes individual missions among them as task orders. Because the payloads are risk-tolerant, the government accepts a lighter oversight process, and because the contract is periodically re-opened, a rocket that did not exist when the contract was signed can still win missions before the next phase. The trade-off is that a Lane 1 award guarantees nothing: the ceiling is a cap on what can be ordered, not a promise of orders, and each mission goes to whichever provider wins that task order.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Lane 2</strong> is the heritage NSSL model, and it is where the money per launch and the barriers to entry are highest. Providers must certify their vehicle through the Space Force&apos;s process — flight history, design reviews, engineering audits — and then carry that oversight into every mission. Missions are assigned for years at a time, which gives the winners predictable revenue and gives the government schedule certainty for payloads whose replacement cost dwarfs the launch. Lane 2 is also where high-energy orbits live: direct insertion to geosynchronous or highly elliptical orbits is a capability Vulcan&apos;s Centaur V upper stage was specifically built for, and it is a major reason ULA remained the Pentagon&apos;s preferred provider for the hardest missions even as SpaceX took the volume.
                </p>
              </section>

              <section id="onramps">
                <h2 className="text-2xl font-bold text-white mb-4">On-ramps: how new rockets get in</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The on-ramp is the mechanism that makes Phase 3 different from every NSSL phase before it. Under Phase 2, a provider that missed the competition waited years for the next one. Under Phase 3, Lane 1 re-opens periodically so a vehicle that reaches a credible flight milestone can be added to the contract and start bidding on task orders. Lane 2 has its own on-ramp — our regulatory calendar lists the next window as January 15 to March 15, 2027 — which is the path a Lane 1 provider takes once it has enough flight history to pursue full certification.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Two vehicles are the reason the on-ramps exist. Blue Origin&apos;s New Glenn is already on the Lane 1 contract and, as our Blue Origin coverage put it, is competing for the certification that would open the most demanding payloads. Rocket Lab&apos;s Neutron is the other candidate our Space Force budget analysis names for Phase 3; it is still in development, with a maiden flight targeted for 2026 from Wallops Island, and it cannot enter the program until it flies. Whether either becomes a genuine third Lane 2 provider is the question the next two on-ramps will answer.
                </p>
              </section>

              <section id="providers">
                <h2 className="text-2xl font-bold text-white mb-4">The providers (records from our launch-vehicle database)</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Flight records below come from our <Link href="/launch-vehicles" className="text-cyan-400 hover:text-cyan-300">launch-vehicle database</Link>, audited September 1, 2026. List prices are commercial figures; national-security missions cost more (see the next section).
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Vehicle</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">To LEO</th><th className="px-3 py-2.5">List price</th><th className="px-3 py-2.5">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-3 py-2.5 text-white"><Link href={`/rockets/${v.id}`} className="hover:text-cyan-300">{v.name}</Link><span className="text-slate-500 text-xs"> · {v.manufacturer}</span></td>
                          <td className="px-3 py-2.5 text-slate-300">{v.status}</td>
                          <td className="px-3 py-2.5 text-white">{n(v.payloadLeoKg, ' kg')}</td>
                          <td className="px-3 py-2.5 text-white">{v.costMillions ? `~$${v.costMillions}M` : '—'}</td>
                          <td className="px-3 py-2.5 text-slate-300">{v.totalLaunches ? `${v.successes}/${v.totalLaunches} (${v.successRate}%)` : 'No orbital flights yet'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">SpaceX</strong> is the volume provider. Falcon 9&apos;s record — 677 successes in 680 flights and a streak of 330 consecutive successes as of late August 2026 — is the reliability benchmark the rest of the field is measured against, and Falcon Heavy adds heavy-lift and high-energy capability with a perfect 13-for-13 record. SpaceX flies GPS, NRO and Space Force missions and, per our IPO analysis, won over $5 billion in government contracts in 2025. <Link href="/company-profiles/spacex" className="text-cyan-400 hover:text-cyan-300">Company profile</Link>.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">United Launch Alliance</strong> is the incumbent. Atlas V&apos;s roughly 103 flights with a single partial failure is one of the best records in the business, and Vulcan Centaur — two Blue Origin BE-4 engines on the booster, a Centaur V upper stage with RL-10C engines — was designed around national-security orbits. But Vulcan has flown only four times, and two of those flights experienced solid-rocket-booster anomalies while still reaching orbit: Cert-2 in October 2024 and USSF-87 on February 12, 2026. After USSF-87 the Space Force paused Vulcan national-security launches pending the investigation. Vulcan is also expendable, which leaves ULA exposed on price. <Link href="/company-profiles/united-launch-alliance" className="text-cyan-400 hover:text-cyan-300">Company profile</Link>.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Blue Origin</strong> is the newcomer with the biggest rocket. New Glenn lifts about 45 tonnes to LEO under a 7-metre fairing — the widest in production — with a first stage designed for reuse. It reached orbit on its first flight in January 2025 and landed its booster on the second in November 2025. Then flight three (NG-3, April 19, 2026) lost AST SpaceMobile&apos;s BlueBird 7 to a second-stage failure, and a pad explosion on May 28, 2026 destroyed another vehicle and damaged Launch Complex 36. As of August 2026 the fleet is effectively grounded pending an engine fix. Blue Origin holds a Lane 1 slot; converting it into Lane 2 certification depends on a clean return to flight. <Link href="/company-profiles/blue-origin" className="text-cyan-400 hover:text-cyan-300">Company profile</Link>.
                </p>
              </section>

              <section id="money">
                <h2 className="text-2xl font-bold text-white mb-4">What a national-security launch costs</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  NSSL missions are priced above commercial launches on the same rocket, and the premium is not padding. Our cost-to-launch data for a GPS III satellite puts a Falcon 9 NSSL mission at roughly <strong className="text-slate-300">$70-100 million</strong>, against the ~$74 million commercial list price, and a Vulcan Centaur NSSL mission at <strong className="text-slate-300">$100-150 million</strong>. Three things drive the difference: mission assurance and government engineering oversight; direct insertion to demanding orbits (a GPS satellite goes to medium Earth orbit at about 20,200 km, which needs upper-stage performance a LEO constellation launch never uses); and the schedule and configuration flexibility the government reserves.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Put the launch next to the payload and the premium looks small. The same cost guide notes that Lockheed Martin builds GPS III satellites for roughly $500 million each, so the launch is a minority of a $600 million-plus delivered program. That ratio is why the government tolerates higher launch prices in Lane 2 and why providers fight for it: the missions are few, but each one is worth several commercial launches, and the assignments run for years.
                </p>
              </section>

              <section id="stakes">
                <h2 className="text-2xl font-bold text-white mb-4">Why it matters for SpaceX, ULA and Blue Origin</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">For SpaceX</strong>, NSSL is a stable, high-margin base under a business dominated by Starlink. Our IPO analysis lists the program alongside NASA commercial crew and Starshield as the government revenue that public-market investors value. The risk to SpaceX is not losing missions — it is that the Space Force, whose stated policy is assured access through multiple providers, will deliberately route work to competitors to keep them viable. The two-lane structure is that policy made concrete.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">For ULA</strong>, NSSL is the business. Vulcan was designed for Lane 2 orbits, and ULA&apos;s relationships with the Space Force and intelligence community are, as our SpaceX vs ULA comparison puts it, its deepest asset. Every month of the post-USSF-87 pause is a month in which payloads that would have flown on Vulcan either wait or migrate to Falcon. Getting the SRB investigation closed and the manifest moving is ULA&apos;s entire 2026 story.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">For Blue Origin</strong>, NSSL is the path from a launch company with one anchor customer (Amazon Leo, formerly Project Kuiper) to a launch company with two. Our Blue Origin analysis called national security certification the milestone that would &ldquo;open a high-value, long-duration government customer base.&rdquo; It also cuts both ways: BE-4 engines fly on both New Glenn and Vulcan, so a BE-4 problem would ground two of the three NSSL providers at once — a concentration risk the Space Force thinks about when it assigns missions.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Side-by-side comparisons: <Link href="/compare/spacex-vs-ula" className="text-cyan-400 hover:text-cyan-300">SpaceX vs ULA</Link>, <Link href="/compare/vulcan-centaur-vs-falcon-9" className="text-cyan-400 hover:text-cyan-300">Vulcan Centaur vs Falcon 9</Link>, and <Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX</Link>.
                </p>
              </section>

              <section id="track">
                <h2 className="text-2xl font-bold text-white mb-4">How to track awards on SpaceNexus</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><Link href="/procurement" className="text-cyan-400 hover:text-cyan-300">Procurement</Link> — the NSSL Phase 3 Lane 1 contract record, contract awards, and the Space Force procurement pipeline alongside NASA and NRO opportunities.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><Link href="/regulatory-calendar" className="text-cyan-400 hover:text-cyan-300">Regulatory calendar</Link> — on-ramp windows and other DoD procurement dates, including the 2027 Lane 2 on-ramp.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><Link href="/rockets/vulcan-centaur" className="text-cyan-400 hover:text-cyan-300">Vulcan Centaur</Link>, <Link href="/rockets/new-glenn" className="text-cyan-400 hover:text-cyan-300">New Glenn</Link> and <Link href="/rockets/falcon-9" className="text-cyan-400 hover:text-cyan-300">Falcon 9</Link> rocket pages — live 90-day cadence, next launch, and full flight records for each NSSL vehicle.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><Link href="/space-defense" className="text-cyan-400 hover:text-cyan-300">Space defense</Link> — the wider military space market that NSSL missions serve: SDA layers, missile warning, Golden Dome.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><Link href="/alerts" className="text-cyan-400 hover:text-cyan-300">Alerts</Link> — company watchlists for SpaceX, ULA and Blue Origin so contract news reaches you the day it lands.</span></li>
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

              <section id="sources" className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Sources</h2>
                <p className="text-sm text-slate-500 mb-3">Every figure in this guide comes from a SpaceNexus data page or dated article. Where our sources disagree, we have used the more recently audited figure or written qualitatively.</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link href="/procurement" className="text-cyan-400 hover:text-cyan-300">Procurement tracker</Link> — NSSL Phase 3 Lane 1 heavy/medium launch IDIQ: awardees ULA, SpaceX, Blue Origin; $5.6B ceiling.</li>
                  <li><Link href="/launch-vehicles" className="text-cyan-400 hover:text-cyan-300">Launch-vehicle database</Link> (audited 2026-09-01) — Falcon 9 677/680, 99.6%, 330-flight streak, ~$74M list; Falcon Heavy 13/13; Vulcan 4 flights, Cert-2 and USSF-87 (Feb 12, 2026) SRB anomalies, NSSL pause; Atlas V ~103 flights; New Glenn 2/3, NG-3 (Apr 19, 2026) failure, May 28, 2026 pad explosion, 45,000 kg to LEO, 7 m fairing; Neutron in development, 2026 target.</li>
                  <li><Link href="/funding-tracker" className="text-cyan-400 hover:text-cyan-300">Deal flow</Link> — NSSL Phase 2 awards: ULA ~$2.5B, SpaceX ~$1.9B, missions through 2027.</li>
                  <li><Link href="/regulatory-calendar" className="text-cyan-400 hover:text-cyan-300">Regulatory calendar</Link> — NSSL Phase 3 Lane 2 on-ramp, applications Jan 15 – Mar 15, 2027.</li>
                  <li><Link href="/guide/cost-to-launch/gps-satellite" className="text-cyan-400 hover:text-cyan-300">Cost to launch a GPS satellite</Link> — Falcon 9 NSSL $70-100M vs ~$74M commercial; Vulcan NSSL $100-150M; GPS III ~$500M each; MEO at ~20,200 km.</li>
                  <li><Link href="/blog/space-force-budget-where-30-billion-goes" className="text-cyan-400 hover:text-cyan-300">Space Force budget: where $30 billion goes</Link> — NSSL ~$3.5B line; Phase 2 providers; Neutron as a Phase 3 candidate.</li>
                  <li><Link href="/blog/defense-space-market-military-intelligence-satellites" className="text-cyan-400 hover:text-cyan-300">The defense space market</Link> (Mar 2026) — ULA and SpaceX hold current Lane 1 and Lane 2 contracts; Blue Origin pursuing certification.</li>
                  <li><Link href="/blog/spacex-ipo-what-it-means-for-space-investors" className="text-cyan-400 hover:text-cyan-300">The SpaceX IPO</Link> — over $5B in government contracts won in 2025.</li>
                  <li><Link href="/blog/blue-origin-new-glenn-heavy-lift-rocket" className="text-cyan-400 hover:text-cyan-300">Blue Origin&apos;s New Glenn</Link> — competing for Lane 1; certification as the government-customer milestone; BE-4 shared with Vulcan.</li>
                  <li><Link href="/compare/spacex-vs-ula" className="text-cyan-400 hover:text-cyan-300">SpaceX vs ULA</Link> — Falcon 9 certification in 2015; ULA&apos;s Space Force and intelligence-community relationships.</li>
                </ul>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Further reading</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/blog/space-force-budget-where-30-billion-goes" className="text-cyan-400 hover:text-cyan-300">Space Force budget: where $30 billion goes</Link> — the NSSL line in context with SDA, missile warning and space domain awareness.</li>
                  <li><Link href="/blog/defense-space-market-military-intelligence-satellites" className="text-cyan-400 hover:text-cyan-300">The defense space market</Link> — programs, primes and procurement vehicles.</li>
                  <li><Link href="/blog/government-space-contracts-sbir-sttr-prime" className="text-cyan-400 hover:text-cyan-300">Government space contracts explained</Link> — NSSL alongside CLPS, SEWP and SpaceWERX.</li>
                  <li><Link href="/blog/golden-dome-space-missile-defense-program" className="text-cyan-400 hover:text-cyan-300">Golden Dome</Link> — the missile-defense program that will generate the next wave of national-security launch demand.</li>
                </ul>
              </section>

              <GuideNavigation currentSlug="nssl-phase-3" />
              <RelatedModules modules={PAGE_RELATIONS['guide/nssl-phase-3']} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-09-01T00:00:00Z', dateModified: now.toISOString(), mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/nssl-phase-3' },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'NSSL Phase 3' }]} />
        </div>
      </div>
    </div>
  );
}
