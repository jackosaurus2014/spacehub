import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { CONSTELLATION_COUNTS, CONSTELLATION_COUNTS_AS_OF } from '@/lib/satellite-counts';
import { LAUNCH_VEHICLES } from '@/lib/launch-vehicles-data';

// Long-form companion to /compare/starlink-vs-kuiper. Consolidates four
// March 2026 blog posts; current satellite counts come from the curated
// satellite-counts registry (with its as-of date) rather than the posts,
// which are five months stale on that one number. No DB reads.
export const revalidate = 3600;

const TITLE = 'Amazon Leo vs Starlink: Constellation Size, Speed, Price and Coverage Compared';
const DESCRIPTION =
  'Starlink and Amazon Leo (formerly Project Kuiper) compared on satellites in orbit, orbital shells, speed and latency, pricing, launch supply, government business, and the honest state of Amazon Leo service in 2026.';
const OG = `/api/og?title=${encodeURIComponent('Amazon Leo vs Starlink')}&subtitle=${encodeURIComponent('Constellation size, speed, price and coverage compared')}&type=guide`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['amazon leo vs starlink', 'kuiper vs starlink', 'project kuiper vs starlink', 'amazon satellite internet', 'starlink competitor', 'leo broadband comparison', 'amazon leo launch'],
  alternates: { canonical: 'https://spacenexus.us/guide/kuiper-vs-starlink' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-09-01T00:00:00Z', modifiedTime: '2026-09-01T00:00:00Z', authors: ['SpaceNexus'], images: [{ url: OG, width: 1200, height: 630 }] },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'size', label: 'Constellation size (verified counts)' },
  { id: 'orbits', label: 'Orbital shells and spectrum' },
  { id: 'performance', label: 'Speed, latency and coverage' },
  { id: 'price', label: 'Price' },
  { id: 'launch', label: 'Launch supply: vertical integration vs a multi-provider buy' },
  { id: 'business', label: 'Business models and government work' },
  { id: 'availability', label: 'The honest state of Amazon Leo service' },
  { id: 'watch', label: 'What to watch' },
  { id: 'faq', label: 'FAQ' },
  { id: 'sources', label: 'Sources' },
];

const starlink = CONSTELLATION_COUNTS.find((c) => c.name === 'Starlink');
const leo = CONSTELLATION_COUNTS.find((c) => c.name.startsWith('Amazon Leo'));

const FAQ = [
  { q: 'Is Amazon Leo the same thing as Project Kuiper?', a: 'Yes. Amazon renamed Project Kuiper to Amazon Leo in November 2025. The constellation, the FCC authorisation for 3,236 satellites, and the launch contracts are unchanged; only the brand is new.' },
  { q: 'How many satellites does each constellation have?', a: `Verified counts as of ${CONSTELLATION_COUNTS_AS_OF}: Starlink ${starlink?.satellites.toLocaleString('en-US') ?? '—'} satellites in orbit (counted ${starlink?.countDate ?? '—'}), Amazon Leo about ${leo?.satellites.toLocaleString('en-US') ?? '—'} (counted ${leo?.countDate ?? '—'}). Starlink is the largest constellation ever flown; Amazon Leo is the third-largest and growing fast.` },
  { q: 'Is Amazon Leo faster than Starlink?', a: 'Not yet in any way a customer can measure. Amazon has demonstrated up to 400 Mbps in testing and targets latency under 30 ms. Starlink delivers 50-250 Mbps to residential customers with 20-60 ms latency today, across a network millions of people use. A claimed peak is not the same as a delivered median.' },
  { q: 'How much will Amazon Leo cost?', a: 'Amazon has not published consumer pricing. Our March 2026 coverage reported Amazon CEO Andy Jassy indicating a target of roughly $100 a month or less, against Starlink\'s $120 a month residential plan in the United States.' },
  { q: 'Can I get Amazon Leo service now?', a: 'Not at scale. Our August 2026 comparison records Amazon Leo as not yet commercially available at scale, with a small in-orbit fleet, and notes the FCC waived the original 50%-by-2026 deployment deadline to 2029. Starlink is available in more than 75 countries.' },
  { q: 'Which rockets launch Amazon Leo?', a: 'ULA\'s Atlas V and Vulcan Centaur, Arianespace\'s Ariane 6, Blue Origin\'s New Glenn and — after a shareholder lawsuit over the original supplier choice — SpaceX\'s Falcon 9. Starlink launches only on SpaceX\'s own Falcon 9 and, since July 2026, Starship.' },
];

function n(x: number | null | undefined, unit = ''): string {
  if (x == null) return '—';
  return `${x.toLocaleString('en-US')}${unit}`;
}

export default function KuiperVsStarlinkGuide() {
  const now = new Date();
  const spec = (id: string) => LAUNCH_VEHICLES.find((v) => v.id === id);
  const leoVehicles = [spec('atlas-v'), spec('vulcan-centaur'), spec('ariane-6'), spec('new-glenn'), spec('falcon-9')].filter(Boolean) as NonNullable<ReturnType<typeof spec>>[];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Amazon Leo vs Starlink</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              One constellation is the largest ever flown and serves millions of subscribers. The other is backed by one of the most valuable companies on Earth and is still, in 2026, mostly a promise. This is the long-form comparison: what is actually in orbit, how the two networks are built, what they cost, who launches them, and what Amazon Leo can and cannot offer you today.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2300} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-space-comms.png" className="mb-8" />

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
                  Starlink wins every comparison you can measure today. It has {starlink ? n(starlink.satellites) : 'over eleven thousand'} satellites in orbit against Amazon Leo&apos;s roughly {leo ? n(leo.satellites) : 'four hundred'}; it serves more than 4 million subscribers in over 75 countries; it earned an estimated $6.6 billion in 2025; and it launches on rockets its parent company owns. Amazon Leo — the constellation Amazon renamed from Project Kuiper in November 2025 — has an FCC licence for 3,236 satellites, a factory, launch contracts with four providers, more than $10 billion committed, and no service at scale.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The interesting question is not who is ahead but <strong className="text-slate-300">whether the gap is structural or just early</strong>. Amazon has the balance sheet, the retail channel and AWS, and it has been willing to lose money for a decade to win a market before. SpaceX has a five-year head start, a launch cost floor nobody can match, and a network that is already the benchmark. This guide is organised around that tension.
                </p>
              </section>

              <section id="size">
                <h2 className="text-2xl font-bold text-white mb-4">Constellation size (verified counts)</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Satellite counts are the most-quoted and most-misquoted number in this comparison. The figures below are from our curated constellation registry, verified against primary tracking sources with an explicit count date; the live catalogue totals are on <Link href="/how-many-satellites" className="text-cyan-400 hover:text-cyan-300">How many satellites are in orbit?</Link>
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Constellation</th><th className="px-3 py-2.5">In orbit</th><th className="px-3 py-2.5">Counted</th><th className="px-3 py-2.5">Authorised</th><th className="px-3 py-2.5">Note</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-white">Starlink (SpaceX)</td><td className="px-3 py-2.5 text-white">{starlink ? n(starlink.satellites) : '—'}</td><td className="px-3 py-2.5">{starlink?.countDate ?? '—'}</td><td className="px-3 py-2.5">12,000 first-generation; filings up to 42,000</td><td className="px-3 py-2.5 text-slate-400">{starlink?.note ?? ''}</td></tr>
                      <tr><td className="px-3 py-2.5 text-white">Amazon Leo (Amazon)</td><td className="px-3 py-2.5 text-white">~{leo ? n(leo.satellites) : '—'}</td><td className="px-3 py-2.5">{leo?.countDate ?? '—'}</td><td className="px-3 py-2.5">3,236 (FCC)</td><td className="px-3 py-2.5 text-slate-400">{leo?.note ?? ''}</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The scale difference is not a matter of Amazon being behind schedule on a similar plan. Even fully deployed, Amazon Leo&apos;s 3,236 satellites would be less than a third of what Starlink flies today, and SpaceX has FCC authorisation for 12,000 first-generation satellites with filings for up to 42,000. Amazon&apos;s bet is that a smaller constellation of more capable satellites in slightly higher orbits can deliver competitive service without matching SpaceX satellite-for-satellite.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Growth rate is the number to watch. Starlink added roughly 1,500 satellites a year at its March 2026 cadence, launching about every 4-5 days, and has since begun flying larger V3 satellites on Starship. Amazon Leo went from a first pair of prototypes in late 2023 to production launches in 2025 and about {leo ? n(leo.satellites) : '400'} satellites by the end of August 2026 — our registry describes it as the third-largest constellation and climbing fast, which is true, and still a long way from 3,236.
                </p>
              </section>

              <section id="orbits">
                <h2 className="text-2xl font-bold text-white mb-4">Orbital shells and spectrum</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Starlink</strong> flies between roughly 340 and 570 km, with most of the first-generation constellation clustered around 550 km. Low altitude buys low latency and a self-cleaning orbit — a failed satellite at 550 km decays within a few years without help — at the cost of needing more satellites to cover the same ground. Coverage from the main shells spans about 53° north to 53° south, with polar planes extending it toward the poles. V2 Mini satellites (about 800 kg, 23 per Falcon 9) carry laser inter-satellite links that route traffic through the constellation without touching a ground station, which is what makes ocean and polar coverage work.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Amazon Leo</strong> is licensed for three shells at 590, 610 and 630 km — a little higher than Starlink, which trades a few milliseconds of latency for a larger footprint per satellite and a slower natural decay. Each satellite carries a Ka-band phased-array antenna and custom silicon for signal processing, with inter-satellite links planned on the production design. Satellites are built at Amazon&apos;s purpose-built facility in Kirkland, Washington.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Both networks use Ku- and Ka-band spectrum coordinated through the ITU and licensed nationally through the FCC, and both are parties to the increasingly crowded coordination between LEO constellations and geostationary operators. The FCC&apos;s 5-year post-mission deorbit rule applies to both; Starlink&apos;s lower shells make compliance easier by physics, while Amazon Leo&apos;s 590-630 km orbits require the onboard propulsion the satellites carry. Our <Link href="/guide/space-debris-and-traffic-management" className="text-cyan-400 hover:text-cyan-300">debris and traffic-management guide</Link> covers the rules.
                </p>
              </section>

              <section id="performance">
                <h2 className="text-2xl font-bold text-white mb-4">Speed, latency and coverage</h2>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">&nbsp;</th><th className="px-3 py-2.5">Starlink (delivered)</th><th className="px-3 py-2.5">Amazon Leo (claimed / target)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Download</td><td className="px-3 py-2.5">50-250 Mbps residential; up to 350 Mbps Priority</td><td className="px-3 py-2.5">Up to 400 Mbps demonstrated in testing</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Upload</td><td className="px-3 py-2.5">10-40 Mbps</td><td className="px-3 py-2.5">Not published</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Latency</td><td className="px-3 py-2.5">20-60 ms</td><td className="px-3 py-2.5">Target under 30 ms</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5 text-slate-500">Coverage</td><td className="px-3 py-2.5">75+ countries; maritime, aviation, polar</td><td className="px-3 py-2.5">No commercial service at scale</td></tr>
                      <tr><td className="px-3 py-2.5 text-slate-500">Subscribers</td><td className="px-3 py-2.5">4M+ (as of 2025)</td><td className="px-3 py-2.5">—</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The asymmetry in the table is the whole story. Starlink&apos;s numbers are what millions of subscribers experience; Amazon&apos;s are engineering demonstrations and design targets. A 400 Mbps peak in a test is entirely plausible — the satellites are newer and the shells are less loaded — but it says nothing about what a customer in a congested cell will see once the network has users. Starlink itself deprioritises standard residential traffic during peak hours in busy cells, which is the reality of shared satellite capacity that Amazon Leo will meet too.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Coverage is where the head start compounds. Starlink&apos;s laser links, dense shells and 100-plus gateway stations give it working service over oceans, in polar regions and in countries with no local ground station. Amazon Leo will have to build all of that, though AWS ground stations and Amazon&apos;s global logistics give it a better starting position than any previous challenger. Our <Link href="/compare/starlink-vs-oneweb" className="text-cyan-400 hover:text-cyan-300">Starlink vs OneWeb</Link> comparison covers the enterprise-only alternative.
                </p>
              </section>

              <section id="price">
                <h2 className="text-2xl font-bold text-white mb-4">Price</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Starlink residential service in the United States is <strong className="text-slate-300">$120 a month</strong> plus <strong className="text-slate-300">$599</strong> for the terminal, per our March 2026 pricing coverage, with a Priority tier at $250, business plans at $250-500, maritime from $250 to $5,000 a month depending on data allocation, and aviation typically $12,500-25,000 a month per aircraft. Prices vary by market — our coverage cites a global range of $30-120 a month for residential plans.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Amazon Leo has published no consumer price. What exists is intent: Andy Jassy has indicated a target of roughly <strong className="text-slate-300">$100 a month or less</strong>, and Amazon&apos;s history — retail, AWS, Alexa — is of absorbing early losses to buy share. Two distribution levers make that credible. Terminals can be sold through Amazon.com and its physical retail, and service can be bundled with Prime, a channel no other constellation operator has.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The hidden variable is terminal cost. Starlink&apos;s user terminal reportedly cost more than $1,300 to build in its first generation and was sold at $499; custom silicon and volume have since brought the manufacturing cost under $600. Amazon has designed its own phased-array terminal and custom chips, but it starts that cost-down curve from zero, and a $100 price only works if the hardware subsidy is survivable.
                </p>
              </section>

              <section id="launch">
                <h2 className="text-2xl font-bold text-white mb-4">Launch supply: vertical integration vs a multi-provider buy</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  This is the deepest structural difference. <strong className="text-slate-300">SpaceX launches Starlink on its own rockets.</strong> Falcon 9 flies a Starlink batch every few days, the boosters are reused twenty-plus times, and the marginal cost of a launch is far below the list price a customer would pay. Since Starship&apos;s Flight 13 on July 24, 2026 deployed the first operational Starlink V3 satellites — too large for Falcon 9&apos;s fairing — SpaceX also has a second, larger vehicle on the way to routine service. The rocket company and the constellation company are the same company, and each subsidises the other.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Amazon buys launches.</strong> Its contract — described in our launch-schedule coverage as requiring 83 launches across multiple providers — is spread over ULA&apos;s Atlas V and Vulcan Centaur, Arianespace&apos;s Ariane 6 and Blue Origin&apos;s New Glenn, with Falcon 9 added after shareholders sued over the original supplier choice. Diversification protects against any one rocket being grounded; it also means Amazon&apos;s deployment pace is hostage to other people&apos;s factories. Records from our <Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">rocket pages</Link>:
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Vehicle</th><th className="px-3 py-2.5">Provider</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leoVehicles.map((v) => (
                        <tr key={v.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-3 py-2.5 text-white"><Link href={`/rockets/${v.id}`} className="hover:text-cyan-300">{v.name}</Link></td>
                          <td className="px-3 py-2.5 text-slate-300">{v.manufacturer}</td>
                          <td className="px-3 py-2.5 text-slate-300">{v.status}</td>
                          <td className="px-3 py-2.5 text-slate-300">{v.totalLaunches ? `${v.successes}/${v.totalLaunches} (${v.successRate}%)` : 'No orbital flights yet'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The 2026 reality of that manifest is uncomfortable. Atlas V is flying out its final missions, primarily for Amazon Leo, with no new orders. Vulcan has four flights and had its national-security launches paused after a February 2026 booster anomaly. New Glenn lost its third flight in April 2026, then a vehicle on the pad in May, and is effectively grounded as of August. That leaves Ariane 6 and — ironically — Falcon 9 carrying much of the near-term load. Amazon&apos;s multi-provider strategy was designed for exactly this kind of resilience, but it was not designed for three of the four providers to have problems at once.
                </p>
              </section>

              <section id="business">
                <h2 className="text-2xl font-bold text-white mb-4">Business models and government work</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Starlink</strong> is a consumer business with high-margin enterprise and mobility tiers on top, and a government business — Starshield — alongside. It generated an estimated $6.6 billion in 2025 and has become SpaceX&apos;s largest revenue line; our post-IPO analysis notes that the estimates investors lean on run to $10 billion-plus annualised across 4.5 million-plus subscribers, pending audited segment disclosure. Its use by Ukrainian forces since 2022 made it the benchmark for resilient military communications, and Starshield holds contracts across the Space Force, Army and intelligence community.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Amazon Leo</strong> is positioned less as satellite internet than as &ldquo;AWS connectivity everywhere.&rdquo; The pitch to enterprises is satellite data landing directly in AWS regions; the pitch to carriers is backhaul — Amazon has announced a partnership with Verizon to extend rural coverage. AWS&apos;s position as the largest cloud provider to the U.S. intelligence community is the natural entry to government work, and that door is opening: on August 13, 2026 the Space Force awarded $60 million across five companies, Amazon Leo among them, to prototype connections to the SpaceX-built data network backbone. Note the shape of that award — the Pentagon is deliberately cultivating a multi-vendor ecosystem on top of SpaceX&apos;s infrastructure, which is the opening Amazon needs.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Sovereignty is the other lever. Governments in Europe, India and elsewhere are reluctant to depend on a single U.S. company for critical communications; a second American constellation with different ownership does not solve that, but many buyers will still prefer a two-vendor strategy, and Amazon is the obvious second vendor for anyone who does not want OneWeb&apos;s enterprise-only model.
                </p>
              </section>

              <section id="availability">
                <h2 className="text-2xl font-bold text-white mb-4">The honest state of Amazon Leo service</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  As our August 2026 comparison records it: Amazon Leo is <strong className="text-slate-300">not yet commercially available at scale</strong>. Production launches began in 2025, the in-orbit fleet is small relative to the licence, consumer pricing is unannounced, and the terminal is not on sale to the public. The FCC&apos;s original condition that half the constellation be deployed by mid-2026 — a deadline our March coverage noted Amazon had acknowledged it would miss — was waived to 2029.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  What has happened is real, though. The Kirkland factory is producing satellites; roughly {leo ? n(leo.satellites) : '400'} are in orbit; the network has demonstrated 400 Mbps downlinks; enterprise and government pilots are under way; and the Space Force is paying Amazon Leo to plug into military networks. That is a constellation in build-out, not a paper project. It is also, five years after Starlink&apos;s public beta, still at the stage Starlink was at in 2020.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  If you need satellite broadband today, the comparison is not close: Starlink is the answer almost everywhere it is licensed. If you are an enterprise or carrier planning a 2027-2028 procurement, Amazon Leo is a credible second bidder worth keeping in the process — if only for the leverage it gives you on the first one.
                </p>
              </section>

              <section id="watch">
                <h2 className="text-2xl font-bold text-white mb-4">What to watch</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Amazon Leo&apos;s launch cadence</strong> given the state of its providers — track <Link href="/rockets/vulcan-centaur" className="text-cyan-400 hover:text-cyan-300">Vulcan</Link>, <Link href="/rockets/new-glenn" className="text-cyan-400 hover:text-cyan-300">New Glenn</Link> and <Link href="/rockets/ariane-6" className="text-cyan-400 hover:text-cyan-300">Ariane 6</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">A published Amazon Leo price and terminal.</strong> Until there is one, the &ldquo;$100 or less&rdquo; target is an aspiration.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Starship&apos;s Starlink V3 cadence.</strong> Each V3 satellite carries roughly ten times a V1.5 satellite&apos;s capacity; routine Starship flights would widen the gap faster than any Amazon launch schedule can close it. <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Direct-to-cell.</strong> Starlink&apos;s T-Mobile partnership is first; Amazon has similar ambitions. The first network that reliably connects unmodified phones at scale wins a market neither serves today.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">SpaceX&apos;s first audited Starlink disclosures</strong> as a public company (SPCX) — the moment estimates become numbers. <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space stocks</Link>.</span></li>
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
                <p className="text-sm text-slate-500 mb-3">Figures are drawn from SpaceNexus data pages and dated articles. Satellite counts are from our curated registry (as of {CONSTELLATION_COUNTS_AS_OF}); where older articles carry a different count, the registry wins.</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link href="/how-many-satellites" className="text-cyan-400 hover:text-cyan-300">How many satellites are in orbit?</Link> — Starlink {starlink ? n(starlink.satellites) : '—'} ({starlink?.countDate}); Amazon Leo ~{leo ? n(leo.satellites) : '—'} ({leo?.countDate}); rename from Project Kuiper in Nov 2025.</li>
                  <li><Link href="/compare/starlink-vs-kuiper" className="text-cyan-400 hover:text-cyan-300">Starlink vs Kuiper comparison</Link> (Aug 2026) — Amazon Leo not yet commercially available at scale; FCC 50%-by-2026 deadline waived to 2029; Starlink 4M+ subscribers (2025), 20-60 ms latency, $120/mo; Amazon Leo target under 30 ms, up to 400 Mbps, launch providers.</li>
                  <li><Link href="/blog/spacex-starlink-everything-you-need-to-know-2026" className="text-cyan-400 hover:text-cyan-300">SpaceX Starlink: everything you need to know</Link> (Mar 2026, updated Aug 2026) — $120/mo + $599 hardware; $30-120 global range; Priority $250; business $250-500; maritime $250-5,000; aviation $12,500-25,000; 50-200 Mbps, up to 350 Mbps Priority; 10-25 Mbps up; 20-40 ms; 70+ countries; ~1,500 satellites/yr; launch every 4-5 days; V2 Mini 800 kg, 23 per Falcon 9; 12,000 authorised, 42,000 filed; 100+ ground stations; terminal cost under $600.</li>
                  <li><Link href="/blog/starlink-oneweb-kuiper-mega-constellation-comparison" className="text-cyan-400 hover:text-cyan-300">Starlink vs OneWeb vs Kuiper</Link> (Mar 2026) — shells 340-570 km and 590/610/630 km; Ka-band phased array, Kirkland factory; $10B+ invested; $6.6B 2025 revenue; 75+ countries; Jassy ~$100/mo target; Prime and retail distribution; Verizon partnership; Starshield; deployment deadline acknowledged.</li>
                  <li><Link href="/blog/10000-starlink-satellites-mega-constellation-internet" className="text-cyan-400 hover:text-cyan-300">10,000 Starlink satellites</Link> (Mar 2026) — 53°N-53°S main-shell coverage; V3 ~10x V1.5 capacity; 40-60 per Starship; prototypes late 2023, production launches 2025; 4M+ subscribers.</li>
                  <li><Link href="/blog/satellite-internet-starlink-kuiper-comparison-2026" className="text-cyan-400 hover:text-cyan-300">Satellite internet in 2026</Link> (Mar 2026) — 10-40 Mbps upload; 25-60 ms; up to 400 Mbps claimed; AWS integration.</li>
                  <li><Link href="/blog/satellite-internet-explained-broadband-space" className="text-cyan-400 hover:text-cyan-300">Satellite internet explained</Link> — first-gen terminal &gt;$1,300 to build, sold at $499.</li>
                  <li><Link href="/blog/spcx-stock-since-ipo-h2-2026-outlook" className="text-cyan-400 hover:text-cyan-300">SPCX since the IPO</Link> (Aug 2026) — Starship Flight 13 (Jul 24, 2026) deployed first V3 satellites; $10B+ annualised Starlink estimate, 4.5M+ subscribers; Aug 13, 2026 Space Force $60M award to five companies including Amazon Leo.</li>
                  <li><Link href="/blog/space-launch-schedule-2026-complete-guide" className="text-cyan-400 hover:text-cyan-300">2026 launch schedule</Link> — Amazon contract requiring 83 launches across multiple providers.</li>
                  <li><Link href="/launch-vehicles" className="text-cyan-400 hover:text-cyan-300">Launch-vehicle database</Link> (audited 2026-09-01) — Atlas V flying out remaining Kuiper missions; Vulcan 4 flights and NSSL pause; New Glenn NG-3 failure, May 28, 2026 pad explosion, grounded as of Aug 2026.</li>
                  <li><Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX</Link> — Falcon 9 added to the Amazon manifest after a shareholder suit.</li>
                </ul>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Further reading</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/compare/starlink-vs-kuiper" className="text-cyan-400 hover:text-cyan-300">Starlink vs Kuiper: the quick comparison table</Link> — the same facts at a glance with a live SpaceX market cap.</li>
                  <li><Link href="/blog/spacex-starlink-everything-you-need-to-know-2026" className="text-cyan-400 hover:text-cyan-300">SpaceX Starlink: everything you need to know in 2026</Link> — plans, hardware, direct-to-cell.</li>
                  <li><Link href="/blog/starlink-oneweb-kuiper-mega-constellation-comparison" className="text-cyan-400 hover:text-cyan-300">The mega-constellation wars</Link> — Starlink, OneWeb and Kuiper across architecture, partnerships and military use.</li>
                  <li><Link href="/blog/10000-starlink-satellites-mega-constellation-internet" className="text-cyan-400 hover:text-cyan-300">10,000 Starlink satellites</Link> — what the milestone meant for global broadband.</li>
                  <li><Link href="/constellations" className="text-cyan-400 hover:text-cyan-300">Constellation tracker</Link> — deployment progress for every major network.</li>
                </ul>
              </section>

              <GuideNavigation currentSlug="kuiper-vs-starlink" />
              <RelatedModules modules={PAGE_RELATIONS['guide/kuiper-vs-starlink']} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-09-01T00:00:00Z', dateModified: now.toISOString(), mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/kuiper-vs-starlink' },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Amazon Leo vs Starlink' }]} />
        </div>
      </div>
    </div>
  );
}
