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
import { getLiveQuoteSafe } from '@/lib/stock-quote';
import { getRocketIndex } from '@/lib/rockets';
import { formatLaunchDate } from '@/components/launches/LaunchRow';

// "Is SpaceX stock a buy?" is the largest new question in the industry since
// the June 2026 IPO, and the honest answer is an explanation, not a verdict.
// This page explains what a share of SPCX is a claim on, what the reported
// numbers say, and what moves the price — with the price, market cap and
// launch cadence read live. It does not say buy or sell anywhere, and the
// disclaimer sits above the fold and again at the end, by design.
export const dynamic = 'force-dynamic';

const SLUG = 'spacex-stock-explained';
const CANONICAL = `https://spacenexus.us/guide/${SLUG}`;
const TITLE = 'SpaceX Stock (SPCX) Explained: What You Actually Own';
const DESCRIPTION =
  'What a share of SpaceX is a claim on — Starlink, launch, Starship — what the first earnings reports said, how to read a valuation near $2 trillion, and what moves the price. Live quote and launch cadence. Informational only; not investment advice.';
/** Bumped by hand when the prose changes; quote and cadence are live. */
const LAST_EDITED = '2026-09-04T00:00:00Z';

// Reported figures, with their sources. Everything below is company-reported
// via the IPO prospectus / earnings coverage or market data at the time this
// page was last edited; the live blocks supersede anything that moves daily.
const IPO = { date: 'June 12, 2026', price: 135, raised: '$75 billion', pricedAt: '~$1.78 trillion' };
const Q2 = {
  label: 'Q2 2026 (reported August 2026)',
  revenue: '$7.8 billion', revenueGrowth: '+92% year on year',
  adjEbitda: '$3.5 billion', netLoss: '$541 million',
  starlinkRevenue: '$4.3 billion', starlinkGrowth: '+66%', starlinkSubs: 'about 12 million',
};

const getQuote = cache(() => getLiveQuoteSafe('SPCX'));
const getIndex = cache(() => getRocketIndex(new Date()));

function usd(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function bigUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export async function generateMetadata(): Promise<Metadata> {
  let description = DESCRIPTION;
  try {
    const q = await getQuote();
    if (q?.marketCap) description = `SPCX trades at ${usd(q.stockPrice)} today, a market value of ${bigUsd(q.marketCap)}. ${DESCRIPTION}`;
  } catch { /* static description */ }
  return {
    title: TITLE,
    description,
    keywords: ['spacex stock', 'spcx stock', 'spacex stock explained', 'is spacex stock a buy', 'spacex ipo', 'spacex valuation', 'starlink revenue', 'spacex earnings', 'how to buy spacex stock'],
    alternates: { canonical: CANONICAL },
    openGraph: { title: TITLE, description, type: 'article', publishedTime: LAST_EDITED, modifiedTime: LAST_EDITED, authors: ['SpaceNexus'] },
    twitter: { card: 'summary_large_image', title: TITLE, description },
  };
}

const TOC = [
  { id: 'disclaimer', label: 'Read this first' },
  { id: 'verdict', label: 'The short answer' },
  { id: 'own', label: 'What a share is a claim on' },
  { id: 'ipo', label: 'The IPO' },
  { id: 'numbers', label: 'What the first numbers said' },
  { id: 'valuation', label: 'How to read the valuation' },
  { id: 'moves', label: 'What moves the price (live)' },
  { id: 'risks', label: 'The risks the filings describe' },
  { id: 'peers', label: 'How it compares to other space stocks' },
  { id: 'faq', label: 'FAQ' },
];

const FAQ = [
  { q: 'Is SpaceX stock a buy?', a: 'This page does not answer that, and you should be wary of anyone who does without knowing your situation. It explains what the company earns, how the market is valuing it, and what changes the price, so that you can form your own view or bring an informed question to a licensed adviser. Nothing on SpaceNexus is investment advice.' },
  { q: 'What is SpaceX\'s ticker and where does it trade?', a: 'SPCX, on the Nasdaq. It listed on June 12, 2026 at $135 a share, raising about $75 billion in the largest IPO in history.' },
  { q: 'Where does SpaceX\'s money come from?', a: 'Mostly Starlink. In the second quarter of 2026 Starlink brought in $4.3 billion of $7.8 billion total revenue and was the profitable part of the business; launch services for outside customers and government work make up most of the rest. Starship is a cost today and a bet on the future.' },
  { q: 'Is SpaceX profitable?', a: 'Not on a net basis in the latest reported quarter: adjusted EBITDA was $3.5 billion but the company reported a net loss of $541 million, reflecting heavy capital spending on Starship and Starlink. Starlink on its own reported operating income.' },
  { q: 'Why is SpaceX worth so much more than its revenue?', a: 'Because the market is pricing the businesses it expects SpaceX to have — a much larger Starlink, Starship flying routinely, and whatever those enable — rather than the one it has. That is a statement about expectations, not a guarantee; the valuation section explains how to read the multiple yourself.' },
  { q: 'Does a SpaceX share give me exposure to Starlink?', a: 'Yes — Starlink is a division of SpaceX, not a separate company, so SPCX is the only way to own it. It is the reverse of the Blue Origin situation, where the constellation (Amazon Leo) belongs to a different company.' },
  { q: 'How do I buy SpaceX stock?', a: 'Through any brokerage that trades Nasdaq-listed shares, under the ticker SPCX, the same way as any other US stock. SpaceNexus does not sell securities or recommend brokers.' },
  { q: 'Can I still invest in Blue Origin or other private space companies?', a: 'Not directly — Blue Origin is private and has announced no listing. Our Startup Tracker follows the private companies and their funding rounds, and the Space Stocks hub lists every company that is publicly traded.' },
];

function Disclaimer({ id, prominent = false }: { id?: string; prominent?: boolean }) {
  return (
    <div
      id={id}
      role="note"
      aria-label="Not investment advice"
      className={`rounded-lg border px-4 py-3 text-slate-300 leading-relaxed ${prominent ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/[0.08] bg-white/[0.03] text-sm'}`}
    >
      <strong className="text-amber-300">For informational purposes only — not investment advice.</strong> SpaceNexus is not a registered investment adviser, broker or dealer. Nothing on this page is a recommendation to buy, sell or hold any security, and nothing here considers your financial situation. Figures are drawn from company filings, earnings coverage and market data that change constantly and may contain errors; verify them against the company&apos;s own filings before acting on anything. Consult a licensed financial professional before making investment decisions.
    </div>
  );
}

export default async function SpaceXStockExplainedGuide() {
  const [quote, index] = await Promise.all([getQuote().catch(() => null), getIndex().catch(() => [] as Awaited<ReturnType<typeof getRocketIndex>>)]);
  const f9 = index.find((r) => r.slug === 'falcon-9');
  const ss = index.find((r) => r.slug === 'starship');
  const edited = new Date(LAST_EDITED);
  // Annualising one quarter is crude; the page says so where it is shown.
  const q2Revenue = 7.8e9;
  const runRate = q2Revenue * 4;
  const multiple = quote?.marketCap ? quote.marketCap / runRate : null;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">SpaceX stock explained</span>
          </nav>

          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            {/* Above everything, by design: a reader who stops after the
                headline has still seen it. */}
            <div className="mb-5"><Disclaimer id="disclaimer" prominent /></div>
            <p className="text-lg text-slate-300 leading-relaxed">
              Since the June 2026 IPO, &ldquo;is SpaceX stock a buy?&rdquo; has become the most-asked question in the industry. This page does not answer it. It explains what a share of SPCX is a claim on, what the company&apos;s first reported numbers said, how to read a valuation near two trillion dollars, and what actually moves the price — with the quote and the launch cadence pulled live.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated {edited.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · quote and cadence live</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2700} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-space-capital.png" className="mb-8" />

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
                    <div className="text-xs text-slate-500 mb-1">SPCX · Nasdaq</div>
                    <div className="text-2xl font-bold text-white">{quote ? usd(quote.stockPrice) : '—'}</div>
                    <div className={`text-xs mt-1 ${quote?.priceChange24h != null && quote.priceChange24h < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      {quote?.priceChange24h != null ? `${quote.priceChange24h >= 0 ? '+' : ''}${quote.priceChange24h.toFixed(2)}% today` : 'live quote unavailable'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">Market value</div>
                    <div className="text-2xl font-bold text-white">{bigUsd(quote?.marketCap)}</div>
                    <div className="text-xs text-slate-400 mt-1">IPO priced at {IPO.pricedAt}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-500 mb-1">Falcon 9 · last 90 days</div>
                    <div className="text-2xl font-bold text-white">{f9 ? f9.last90Days : '—'}<span className="text-sm font-normal text-slate-400"> launches</span></div>
                    <div className="text-xs text-slate-400 mt-1">{ss?.nextLaunch ? `Next Starship: ${formatLaunchDate(ss.nextLaunch, false)}` : 'No Starship flight scheduled'}</div>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  A share of SpaceX is mostly a share of <strong className="text-slate-300">Starlink</strong>, a satellite broadband business with about twelve million subscribers that produced more than half of the company&apos;s revenue and all of its operating profit in the latest reported quarter. Attached to it is the world&apos;s dominant <strong className="text-slate-300">launch business</strong>, which flies more often than every other provider combined and mostly launches Starlink, and <strong className="text-slate-300">Starship</strong>, a rocket that does not yet earn money and absorbs a great deal of it.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The market values that combination at roughly two trillion dollars against revenue that annualises to a few tens of billions. That gap is the whole conversation about this stock: the price is a bet on the businesses SpaceX is expected to have, not the ones it has. Whether that bet is a good one depends on judgements about Starship, Starlink&apos;s growth ceiling and capital spending that this page lays out but does not make for you.
                </p>
              </section>

              <section id="own">
                <h2 className="text-2xl font-bold text-white mb-4">What a share is a claim on</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Starlink.</strong> Consumer, business, aviation, maritime and government broadband delivered from a constellation of more than nine thousand satellites. It is a subscription business with the economics of a telecom and the capital costs of a space programme, and unlike Amazon&apos;s Leo constellation, which belongs to Amazon rather than Blue Origin, Starlink is inside SpaceX — SPCX is the only way to own it.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Launch.</strong> Falcon 9 and Falcon Heavy fly commercial satellites, NASA cargo and crew, national-security payloads and — most of the manifest — Starlink batches. External launch revenue is the older, smaller business; its strategic value is that it makes Starlink deployment cheap and denies rivals the same advantage. Our <Link href="/rockets/falcon-9" className="text-cyan-400 hover:text-cyan-300">Falcon 9 page</Link> tracks every flight.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Starship.</strong> The fully reusable heavy-lift system in development, contracted by NASA as the Artemis lunar lander and intended to launch the next Starlink generation and, eventually, much more. Today it is the largest single reason the company spends more than it earns. Progress is visible on our <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>.
                </p>
              </section>

              <section id="ipo">
                <h2 className="text-2xl font-bold text-white mb-4">The IPO</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX listed on the Nasdaq on <strong className="text-slate-300">{IPO.date}</strong> under the ticker SPCX, pricing at <strong className="text-slate-300">${IPO.price} a share</strong> — a valuation of about {IPO.pricedAt} — and raising roughly <strong className="text-slate-300">{IPO.raised}</strong>, the largest initial public offering in history. Shares traded above the offer price on the first day, and the company has since reported its first quarterly results as a public company.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Two things about the listing matter for a holder. The IPO created the first liquid, public price for a space company of this scale, which is why every other space stock now trades partly in its shadow; and it means the company now publishes audited financials every quarter, so the arguments about its value can at least be had with real numbers. Our <Link href="/startups" className="text-cyan-400 hover:text-cyan-300">Startup Tracker</Link> keeps the record of the IPO and the listings that followed it.
                </p>
              </section>

              <section id="numbers">
                <h2 className="text-2xl font-bold text-white mb-4">What the first numbers said</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Company-reported figures for {Q2.label}, as covered at the time. Verify against the filing before relying on them.
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[480px]">
                    <tbody>
                      {[
                        ['Revenue', `${Q2.revenue} (${Q2.revenueGrowth})`],
                        ['Adjusted EBITDA', Q2.adjEbitda],
                        ['Net result', `${Q2.netLoss} loss`],
                        ['Starlink revenue', `${Q2.starlinkRevenue} (${Q2.starlinkGrowth})`],
                        ['Starlink subscribers', Q2.starlinkSubs],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-3 py-2.5 text-slate-400">{k}</td>
                          <td className="px-3 py-2.5 text-white">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The shape to notice: revenue nearly doubled year on year, the business generates substantial cash before capital spending, and it still reports a net loss because it reinvests more than that into Starship and the constellation. Starlink is the profitable division; everything else is being funded by it. Whether that is a company investing wisely or spending too much is exactly the disagreement between the bulls and the bears, and it will be re-litigated every quarter.
                </p>
              </section>

              <section id="valuation">
                <h2 className="text-2xl font-bold text-white mb-4">How to read the valuation</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The simplest lens is market value divided by revenue. Taking the latest reported quarter times four as a rough run rate — crude, since the company is growing fast — gives revenue of about <strong className="text-slate-300">{bigUsd(runRate)}</strong> a year. Against today&apos;s market value of <strong className="text-slate-300">{bigUsd(quote?.marketCap)}</strong>, that is a multiple of roughly <strong className="text-slate-300">{multiple ? `${multiple.toFixed(0)}×` : '—'}</strong> revenue. Mature telecoms trade at low single digits; high-growth software at ten to twenty; SpaceX is priced as something else entirely.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  That is not by itself a verdict. A multiple that high can be justified if the business keeps compounding at the rate the last quarter showed and if Starship opens markets that do not exist yet, and it cannot be justified if growth slows to something ordinary. Analysts who follow the stock frame it the same way: the price reflects tomorrow&apos;s SpaceX, so the question for any holder is which tomorrow they believe in, and at what odds.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Practical reading: watch how the multiple moves against each quarter&apos;s revenue growth. If growth slows and the multiple does not compress, the market is still extending credit; if the multiple falls faster than growth, it is withdrawing it. Our <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space Stocks hub</Link> keeps the live figures.
                </p>
              </section>

              <section id="moves">
                <h2 className="text-2xl font-bold text-white mb-4">What moves the price (live)</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Starship flights.</strong> Each test is a public referendum on the biggest part of the valuation. {ss?.nextLaunch ? `The next one is on our tracker for ${formatLaunchDate(ss.nextLaunch, false)}.` : 'No Starship flight is currently scheduled on our tracker.'} <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Starlink subscriber growth.</strong> The number that carries the revenue line. Subscriber and average-revenue figures arrive with each quarterly report; a slowdown is the bear case in one line.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Launch cadence.</strong> Falcon 9 has flown {f9 ? f9.last90Days : '—'} times in the last 90 days{f9?.nextLaunch ? `; next on ${formatLaunchDate(f9.nextLaunch, false)}` : ''}. Cadence is what deploys Starlink and what keeps the launch business&apos; costs low; a grounding after a failure hits both at once. <Link href="/rockets/falcon-9" className="text-cyan-400 hover:text-cyan-300">Falcon 9 record</Link>.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Capital spending.</strong> The gap between adjusted EBITDA and net income is Starship and satellites. The market&apos;s tolerance for that gap is finite and changes with interest rates and sentiment.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Government and regulation.</strong> NASA and Space Force contracts, FCC spectrum decisions for Starlink, FAA launch licences, and export rules. Our <Link href="/regulatory-radar" className="text-cyan-400 hover:text-cyan-300">Regulatory Radar</Link> tracks the docket.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Competition.</strong> Amazon Leo against Starlink; New Glenn, Vulcan and the Europeans against Falcon. Our <Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX guide</Link> covers the closest rival.</span></li>
                </ul>
              </section>

              <section id="risks">
                <h2 className="text-2xl font-bold text-white mb-4">The risks the filings describe</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Every prospectus lists risks, and SpaceX&apos;s are unusually concrete. <strong className="text-slate-300">Concentration:</strong> one product line (Starlink) carries the profits, and one person carries the company&apos;s direction and much of its public perception. <strong className="text-slate-300">Programme risk:</strong> Starship&apos;s timeline has slipped repeatedly and the valuation assumes it succeeds. <strong className="text-slate-300">Regulatory exposure:</strong> spectrum, launch licensing, orbital-debris rules and export controls can each change the economics by decree. <strong className="text-slate-300">Capital intensity:</strong> the business must keep spending to keep growing, and a market that stops rewarding that spending would change the stock&apos;s character quickly.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  None of this is unique to SpaceX and none of it is a prediction. It is the list of things that would have to go wrong for the price to be wrong, which is the list worth carrying into any decision.
                </p>
              </section>

              <section id="peers">
                <h2 className="text-2xl font-bold text-white mb-4">How it compares to other space stocks</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  SpaceX is larger than every other publicly traded space company combined, which makes peer comparison awkward. The closest pure-play launch comparison is Rocket Lab (RKLB), a much smaller company with a different profile — our <Link href="/compare/spcx-vs-rklb-stock" className="text-cyan-400 hover:text-cyan-300">SPCX vs RKLB comparison</Link> sets the two side by side. The primes (Lockheed Martin, Northrop Grumman, L3Harris, Boeing) are defence conglomerates where space is one segment; the satellite operators and Earth-observation companies are smaller and priced very differently.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space Stocks hub</Link> lists every listed space company with live prices and lets you see SPCX in context rather than in isolation.
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

              <Disclaimer />

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Keep going</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space Stocks hub</Link> — live prices for every listed space company.</li>
                  <li><Link href="/compare/spcx-vs-rklb-stock" className="text-cyan-400 hover:text-cyan-300">SPCX vs RKLB</Link> — the two launch stocks side by side.</li>
                  <li><Link href="/guide/blue-origin-vs-spacex" className="text-cyan-400 hover:text-cyan-300">Blue Origin vs SpaceX</Link> — the competitive picture, with live cadence.</li>
                  <li><Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link> — the programme the valuation rests on.</li>
                </ul>
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
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'SpaceX stock explained' }]} />
        </div>
      </div>
    </div>
  );
}
