import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// "How much does it cost to go to space?" (2026-09-06). The March blog post on
// this question was ranking third on the query with prices that were wrong
// by September — Virgin Galactic's seat went from $450,000 to $750,000 and
// Blue Origin stopped selling seats at all — and its Starship line described
// a mission cancelled in 2024. Promoted to a guide (the blog URL 301s here)
// with every price dated and sourced, and with the honest lead: today, one
// company will actually sell you a ride to space.
export const revalidate = 3600;

const SLUG = 'space-tourism-cost';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = 'How Much Does It Cost to Go to Space? Every Ticket Price, Fact-Checked (2026)';
const DESCRIPTION =
  'Orbital: about $55-70 million a seat with Axiom, the only ride on sale today. Suborbital: $750,000 at Virgin Galactic for late-2026 flights; Blue Origin is paused until 2028. Balloon: $125,000. Every price dated and sourced, what it includes, and who is actually flying.';
/** Bumped by hand when the prices or the prose change. */
const LAST_EDITED = '2026-09-06T00:00:00Z';
const PRICES_AS_OF = 'September 6, 2026';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['how much does it cost to go to space', 'space tourism cost', 'space tourism price 2026', 'virgin galactic ticket price', 'blue origin ticket price', 'axiom mission cost', 'how to book a space flight', 'space travel cost'],
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-03-17T00:00:00Z', modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

interface PriceRow {
  operator: string;
  product: string;
  kind: 'Orbital' | 'Suborbital' | 'Stratospheric';
  price: string;
  includes: string;
  status: string;
  statusTone: 'on-sale' | 'paused' | 'pending';
  asOf: string;
  source: string;
  href?: string;
}

const PRICES: PriceRow[] = [
  {
    operator: 'Axiom Space (on SpaceX Crew Dragon)', product: 'Private astronaut mission to the ISS', kind: 'Orbital',
    price: '~$55-70 million per seat', includes: 'Months of training, launch, roughly two weeks aboard the station, return. Sold to governments and individuals; missions Ax-1 through Ax-4 flown.',
    status: 'Selling — the only human spaceflight you can buy today', statusTone: 'on-sale', asOf: '2026', source: 'Reported mission pricing; Axiom does not publish a list price', href: '/compare/axiom-vs-vast',
  },
  {
    operator: 'Virgin Galactic', product: 'Delta-class suborbital flight, ~90 km, minutes of weightlessness', kind: 'Suborbital',
    price: '$750,000 per seat', includes: 'Several days of training at Spaceport America, the flight, a six-passenger cabin. First 50 seats at this price; the company said later batches cost more.',
    status: 'Selling — flights targeted from Q4 2026 once Delta completes testing', statusTone: 'pending', asOf: 'Apr 1, 2026', source: 'Virgin Galactic sales reopening (The Register, SpaceNews, Fox Business)', href: '/compare/virgin-galactic-vs-blue-origin',
  },
  {
    operator: 'Blue Origin', product: 'New Shepard suborbital flight, ~107 km', kind: 'Suborbital',
    price: 'Not on sale (never published; seats were auctioned or sold privately)', includes: 'Two days of training in West Texas, a ten-minute flight above the Kármán line in an autonomous capsule.',
    status: 'Paused — flights halted Jan 30, 2026 for at least two years to focus on the Blue Moon lander; last flight NS-38', statusTone: 'paused', asOf: 'Jan 30, 2026', source: 'Blue Origin release; SpaceNews; CNN', href: '/compare/virgin-galactic-vs-blue-origin',
  },
  {
    operator: 'Space Perspective', product: 'Spaceship Neptune balloon to ~30 km, six hours', kind: 'Stratospheric',
    price: '$125,000 per seat (deposit-based reservations)', includes: 'A pressurised capsule under a balloon, eight passengers, a lounge and a bathroom; no rocket, no weightlessness, no training.',
    status: 'Pending — furloughed staff and lost its Florida base in 2025, acquired by Eos X Space; commercial flights targeted 2026 after crewed tests', statusTone: 'pending', asOf: '2026', source: 'Space.com; Travel Weekly; company statements',
  },
  {
    operator: 'SpaceX (direct)', product: 'Private Crew Dragon free-flyer missions (Inspiration4, Polaris Dawn, Fram2)', kind: 'Orbital',
    price: 'Undisclosed — chartered whole missions, not seats', includes: 'Multi-day orbital flights bought by a single sponsor who fills the seats. SpaceX does not sell individual tickets.',
    status: 'By arrangement only', statusTone: 'pending', asOf: '2026', source: 'Mission announcements; SpaceX publishes no price',
  },
];

const RETIRED = [
  { what: 'dearMoon (Starship around the Moon)', note: 'Cancelled June 2024 by its sponsor after Starship delays. Any page still quoting a circumlunar ticket is describing a mission that no longer exists.' },
  { what: 'Soyuz seats to the ISS via Space Adventures', note: 'The original space tourism product ($20 million for Dennis Tito in 2001, rising to ~$50 million). No seats have been sold since 2021.' },
  { what: 'Virgin Galactic VSS Unity', note: 'Retired after Galactic 06 in January 2024. The $450,000 price attached to it is historical.' },
];

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'table', label: 'Every price, dated and sourced' },
  { id: 'orbital', label: 'Orbital: what $55 million buys' },
  { id: 'suborbital', label: 'Suborbital: the $750,000 tier' },
  { id: 'balloon', label: 'Balloons: space-adjacent for $125,000' },
  { id: 'gone', label: 'Prices you will still see quoted that are gone' },
  { id: 'book', label: 'How to actually book' },
  { id: 'trend', label: 'Where prices are going' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'How much does it cost to go to space in 2026?', a: 'Between about $125,000 and $70 million depending on what you mean by space. A stratospheric balloon flight is $125,000; a suborbital rocket flight past the edge of space is $750,000 at Virgin Galactic; an orbital mission to the International Space Station is roughly $55-70 million a seat through Axiom Space. Only the orbital seat is a flight you can actually book and take today.' },
  { q: 'Can I buy a ticket to space right now?', a: 'For a flight this year, only through Axiom Space — an orbital ISS mission at roughly $55-70 million. Virgin Galactic is selling $750,000 seats for flights it expects to start late in 2026. Blue Origin paused New Shepard in January 2026 for at least two years and is not selling seats. Space Perspective takes deposits but has not flown a passenger.' },
  { q: 'How much is a Virgin Galactic ticket?', a: '$750,000 a seat, since sales reopened on April 1, 2026 — up from $450,000 in 2021 and $600,000 in 2023. The first batch of 50 seats was at that price and the company said later batches would cost more. Flights are on the new Delta-class ships, targeted from the fourth quarter of 2026.' },
  { q: 'How much is a Blue Origin ticket?', a: 'Blue Origin never published a New Shepard price; the first seat was auctioned for $28 million and later ones were sold privately, with figures in the hundreds of thousands reported but not confirmed. It does not matter this year: the company halted New Shepard flights on January 30, 2026 for at least two years.' },
  { q: 'Why is orbital so much more expensive than suborbital?', a: 'Energy and time. A suborbital flight reaches about 100 km and falls back within minutes; orbit requires roughly thirty times the kinetic energy, a heat shield to come home, life support for days, and a seat on a rocket that costs tens of millions to fly. The orbital price is mostly the rocket and the spacecraft; the suborbital price is mostly the company\'s development cost spread across a few hundred seats.' },
  { q: 'Do I need training or a medical?', a: 'Suborbital flights ask for a few days of training and a medical screening; most healthy adults qualify, and passengers in their eighties and nineties have flown. Orbital missions require months of training and a much stricter medical, closer to what professional astronauts pass.' },
  { q: 'Will prices come down?', a: 'Suborbital prices have gone up, not down — Virgin Galactic\'s seat has risen 67 percent since 2021 — because demand exceeds the handful of seats a year either company can fly. Orbital prices track rocket prices, and the only thing that would move those substantially is Starship flying people routinely, which has no date.' },
  { q: 'Is space tourism safe?', a: 'No passenger has been hurt on a commercial spaceflight. Blue Origin\'s one failure was an uncrewed 2022 flight whose capsule escape system worked as designed; Virgin Galactic lost a pilot in a 2014 test flight of an earlier ship. Every operator flies under an FAA licence and passengers sign informed-consent waivers — the regulatory regime treats it as experimental, not as an airline.' },
];

const TONE: Record<PriceRow['statusTone'], string> = {
  'on-sale': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  pending: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export default function SpaceTourismCostGuide() {
  const edited = new Date(LAST_EDITED);
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Space tourism cost</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Most pages that answer this question quote prices from a year or two ago, for flights that are not for sale. This one dates every number, names its source, and says plainly which companies will actually take your money and fly you this year. As of {PRICES_AS_OF}, that is one of them.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Prices checked {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2300} className="flex items-center gap-1.5" />
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
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Orbit (ISS, ~2 weeks)</div><div className="text-2xl font-bold text-white">$55-70M</div><div className="text-xs text-emerald-300 mt-1">Axiom — on sale now</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Edge of space (minutes)</div><div className="text-2xl font-bold text-white">$750,000</div><div className="text-xs text-cyan-300 mt-1">Virgin Galactic — flights from late 2026</div></div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="text-xs text-slate-500 mb-1">Stratosphere by balloon</div><div className="text-2xl font-bold text-white">$125,000</div><div className="text-xs text-cyan-300 mt-1">Space Perspective — deposits, not yet flown</div></div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">If you want to go to orbit, it costs about $55-70 million</strong> and you buy it from Axiom Space, which flies private crews to the International Space Station on SpaceX&apos;s Crew Dragon. It is the only human spaceflight anyone will sell you for a flight this year.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">If you want a few minutes above the edge of space, it costs $750,000</strong> at Virgin Galactic, which reopened sales in April 2026 for flights it expects to begin late this year on its new Delta-class ships. The other suborbital operator, Blue Origin, stopped flying New Shepard in January 2026 for at least two years and is not selling seats.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">If a balloon to 30 km counts</strong> — it is not space, but the view is most of the way there — Space Perspective takes $125,000 reservations for a product that has not yet carried a passenger, from a company that nearly failed in 2025 and was bought by a Spanish firm. Everything else you will see priced online is either a chartered mission with no public price or a product that no longer exists.
                </p>
              </section>

              <section id="table">
                <h2 className="text-2xl font-bold text-white mb-4">Every price, dated and sourced</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Prices as of {PRICES_AS_OF}. A price without a date is a rumour; each row says when its figure was set and where it comes from.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Operator</th><th className="px-3 py-2.5">What you get</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">As of · source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICES.map((r) => (
                        <tr key={r.operator} className="border-b border-white/[0.06] last:border-0 align-top">
                          <td className="px-3 py-3 text-white">{r.href ? <Link href={r.href} className="hover:text-cyan-300">{r.operator}</Link> : r.operator}<span className="block text-xs text-slate-500">{r.kind}</span></td>
                          <td className="px-3 py-3 text-slate-300"><span className="block text-white">{r.product}</span><span className="block text-xs text-slate-400 mt-1">{r.includes}</span></td>
                          <td className="px-3 py-3 text-white whitespace-nowrap font-semibold">{r.price}</td>
                          <td className="px-3 py-3"><span className={`inline-block text-[10px] uppercase tracking-wider border rounded px-2 py-0.5 ${TONE[r.statusTone]}`}>{r.statusTone === 'on-sale' ? 'On sale' : r.statusTone === 'paused' ? 'Paused' : 'Pending'}</span><span className="block text-xs text-slate-400 mt-1">{r.status}</span></td>
                          <td className="px-3 py-3 text-xs text-slate-400">{r.asOf}<span className="block text-slate-500">{r.source}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="orbital">
                <h2 className="text-2xl font-bold text-white mb-4">Orbital: what $55 million buys</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  An Axiom mission is the closest thing to being a professional astronaut that money can buy: months of training at Axiom and SpaceX facilities, a Falcon 9 launch from Florida in a Crew Dragon, roughly two weeks aboard the International Space Station doing research and outreach alongside the resident crew, and a splashdown return. Axiom has flown four such missions since 2022, mostly with seats bought by national governments — Saudi Arabia, Turkey, Italy, Hungary, India, Poland — which is why the reported price range is wide: government seats bundle science programmes and national-astronaut status that individuals do not need.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX also flies private Crew Dragon missions that do not visit the station — Inspiration4 in 2021, Polaris Dawn in 2024, Fram2 over the poles in 2025 — but those are whole missions chartered by a single sponsor who chooses the crew. SpaceX publishes no price and sells no individual seats.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  What would change the orbital price is a cheaper ride to orbit or somewhere new to stay: Starship flying people, or the commercial stations Axiom, Vast and others are building to replace the ISS. Our <Link href="/compare/axiom-vs-vast" className="text-cyan-400 hover:text-cyan-300">Axiom vs Vast</Link> comparison and <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link> follow both.
                </p>
              </section>

              <section id="suborbital">
                <h2 className="text-2xl font-bold text-white mb-4">Suborbital: the $750,000 tier</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  A suborbital flight goes straight up past the edge of space and comes straight back: a few minutes of weightlessness, the black sky and the curved horizon, then landing within the hour. Two companies built vehicles for it and, as of September 2026, neither is carrying tourists.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Virgin Galactic</strong> retired its first spaceplane, VSS Unity, after its sixth commercial flight in January 2024 and spent two years building the six-passenger Delta class. It reopened sales on April 1, 2026 at $750,000 a seat — the first batch of 50 at that price, later batches higher — with commercial flights targeted for the fourth quarter of 2026 once flight testing is done. Flights reach about 90 km, above the 80 km line the US uses for astronaut wings but below the 100 km Kármán line.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Blue Origin</strong> flew paying passengers on New Shepard from 2021 through NS-38 in January 2026 to about 107 km, above the Kármán line, and never published a price: the first seat went at auction for $28 million and later ones sold privately. On January 30, 2026 the company halted New Shepard for at least two years to put its people on the Blue Moon lunar lander for NASA, keeping what it called a multi-year customer backlog. It is not selling seats. Our <Link href="/compare/virgin-galactic-vs-blue-origin" className="text-cyan-400 hover:text-cyan-300">Virgin Galactic vs Blue Origin</Link> page has the two vehicles side by side.
                </p>
              </section>

              <section id="balloon">
                <h2 className="text-2xl font-bold text-white mb-4">Balloons: space-adjacent for $125,000</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Space Perspective&apos;s Spaceship Neptune is a pressurised capsule carried by a balloon to about 30 km — not space by any definition, but high enough for the curvature of the Earth and the black sky, over a six-hour flight with a lounge and a bathroom and no training, weightlessness or rocket. It flew an uncrewed test capsule in September 2024, then furloughed almost its entire staff in early 2025 and was evicted from its Florida base before being acquired by the Spanish company Eos X Space. It still takes $125,000 reservations and says crewed test flights come before commercial ones, targeted for 2026.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Treat a deposit here as a deposit with a start-up, and read the refund terms.
                </p>
              </section>

              <section id="gone">
                <h2 className="text-2xl font-bold text-white mb-4">Prices you will still see quoted that are gone</h2>
                <ul className="space-y-3">
                  {RETIRED.map((r) => (
                    <li key={r.what} className="flex items-start gap-3 text-slate-400 leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" aria-hidden="true" />
                      <span><strong className="text-slate-300">{r.what}.</strong> {r.note}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section id="book">
                <h2 className="text-2xl font-bold text-white mb-4">How to actually book</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Orbital:</strong> contact Axiom Space directly. Expect a screening conversation before any price; missions are assembled a year or more ahead.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Suborbital:</strong> Virgin Galactic sells through its own site with a deposit; ask which batch and which price tier you are in, and what happens to the deposit if Delta&apos;s schedule slips. Blue Origin is not selling.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Balloon:</strong> Space Perspective takes deposits online. Given the company&apos;s 2025, ask about escrow.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Cheaper ways to get most of the experience:</strong> parabolic zero-g flights run a few thousand dollars, and a launch viewed in person from the Space Coast is free — our <Link href="/guide/watch-a-launch" className="text-cyan-400 hover:text-cyan-300">watch-a-launch guides</Link> cover every site.</span></li>
                </ul>
              </section>

              <section id="trend">
                <h2 className="text-2xl font-bold text-white mb-4">Where prices are going</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Up, so far. The suborbital seat that cost $450,000 in 2021 costs $750,000 in 2026, because the constraint is seats, not demand: a Delta-class ship carries six people and the fleet is small. Blue Origin&apos;s exit for two years removes half the supply. Nothing about that changes until an operator can fly weekly, which is a fleet-size problem, not a physics one.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Orbital prices are a rocket-price problem. A Falcon 9 seat on a four-person Dragon is a fraction of a $74 million launch plus the spacecraft, training and station time; the number only moves substantially if Starship starts flying people, which has no date, or if the commercial stations offer a cheaper place to stay. Our <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">launch-cost guide</Link> tracks the rocket side of that equation live.
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

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Keep going</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/compare/virgin-galactic-vs-blue-origin" className="text-cyan-400 hover:text-cyan-300">Virgin Galactic vs Blue Origin</Link> — the two suborbital vehicles side by side.</li>
                  <li><Link href="/compare/axiom-vs-vast" className="text-cyan-400 hover:text-cyan-300">Axiom vs Vast</Link> — who is building the stations tourists will stay on next.</li>
                  <li><Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">What a rocket launch costs</Link> — the number underneath every orbital ticket.</li>
                  <li><Link href="/guide/watch-a-launch" className="text-cyan-400 hover:text-cyan-300">Watch a launch in person</Link> — the free version.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">Prices are operator-stated or reported figures as of {PRICES_AS_OF}, in US dollars, and change; confirm with the operator before paying a deposit. This page is not a booking service and receives nothing from any operator.</p>
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
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Space tourism cost' }]} />
        </div>
      </div>
    </div>
  );
}
