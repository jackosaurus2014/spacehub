import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';

// Mid-tail search page ("space economy game", "space trading game no combat",
// "games like Prosperous Universe"). Honest field guide; our own game is
// disclosed and placed last in the list, not first.
export const revalidate = 86400;

const TITLE = 'Best Space Economy Games in 2026: Trading, Industry and Corporate Play';
const DESCRIPTION =
  'A field guide to space games where the economy is the game — EVE Online, Prosperous Universe, X4, Elite Dangerous, Starsector, and the browser-based Space Tycoon. Who each one is for, what the economy actually simulates, and what it costs.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['space economy game', 'space trading game', 'space economy simulation', 'games like eve online without combat', 'games like prosperous universe', 'space tycoon game', 'space industry game', 'economic mmo'],
  alternates: { canonical: 'https://spacenexus.us/guide/space-economy-games' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-08-30T00:00:00Z', authors: ['SpaceNexus'] },
};

interface Entry {
  name: string;
  studio: string;
  platform: string;
  price: string;
  combat: string;
  economy: string;
  bestFor: string;
  caveat: string;
  ours?: boolean;
}

const GAMES: Entry[] = [
  {
    name: 'EVE Online', studio: 'CCP Games', platform: 'PC / Mac client', price: 'Free-to-play tier; subscription for full skills',
    combat: 'Central. The economy exists to feed wars.',
    economy: 'The deepest player-run market in gaming: regional hubs, manufacturing from blueprints, planetary industry, freight, speculation. Prices are entirely player-set and CCP publishes monthly economic reports.',
    bestFor: 'People who want a real economy and are willing to lose ships in it.',
    caveat: 'Two decades of accumulated wealth and knowledge; new players enter an old economy. Losing what you build is the point.',
  },
  {
    name: 'Prosperous Universe', studio: 'Simulogics', platform: 'Browser', price: 'Free tier; subscription for more bases',
    combat: 'None.',
    economy: 'A production-chain simulation with commodity exchanges, contracts and shipping between player bases. Everything is made by someone; spreadsheets are encouraged.',
    bestFor: 'The player who wants the EVE market without the EVE combat.',
    caveat: 'Slow by design — decisions play out over days — and the interface is a spreadsheet with a space theme.',
  },
  {
    name: 'X4: Foundations', studio: 'Egosoft', platform: 'PC', price: 'Paid + expansions',
    combat: 'Yes, and you can fly every ship.',
    economy: 'A fully simulated single-player universe: factions build stations, ships haul wares, prices respond. You can own the whole supply chain.',
    bestFor: 'Solo empire-builders who want to watch an economy they seeded run itself.',
    caveat: 'Single player — the economy is simulated, not contested by other people.',
  },
  {
    name: 'Elite Dangerous', studio: 'Frontier Developments', platform: 'PC / console', price: 'Paid',
    combat: 'Yes.',
    economy: 'Trading, mining and missions on top of a background simulation of a 1:1 Milky Way; commodity prices drift with system states.',
    bestFor: 'Pilots who like the trade loop as a break from the flying.',
    caveat: 'The economy is a backdrop, not a competition — you rarely out-trade another person.',
  },
  {
    name: 'Starsector', studio: 'Fractal Softworks', platform: 'PC', price: 'Paid (in development)',
    combat: 'Yes, tactical fleet battles.',
    economy: 'Colonies, industries, market share and a smuggling economy in a single-player sector; famously moddable.',
    bestFor: 'Players who want colony economics with a real fleet game attached.',
    caveat: 'Single player; economic play is a layer over combat.',
  },
  {
    name: 'Space Tycoon', studio: 'SpaceNexus (that is us)', platform: 'Browser, Android', price: 'Free; cosmetic purchases only, no pay-to-win by policy',
    combat: 'None — rivalry is economic.',
    economy: 'One shared live market for every commodity and service; manufacturing at fabrication facilities; hardware listed by players and named NPC industrial corporations; contracts, corporations, alliances, takeovers; real launches and space weather feed the simulation.',
    bestFor: 'People who want a multiplayer space economy in a browser tab without the combat or the subscription.',
    caveat: 'Young. The player base is small and the world restarts on an epoch cadence (Epoch 2 began August 2026), which is a feature for newcomers and a trade-off for veterans.',
    ours: true,
  },
];

const FAQ = [
  { q: 'Which space game has the best economy?', a: 'For depth and scale, EVE Online — a two-decade player-run market that CCP reports on like a central bank. For an economy without combat, Prosperous Universe and Space Tycoon are the two multiplayer options; X4 is the best single-player simulation.' },
  { q: 'Are there space economy games with no combat?', a: 'Yes: Prosperous Universe (browser, subscription for scale) and Space Tycoon (browser, free, no pay-to-win) are both multiplayer economies where players cannot attack each other; risk comes from markets, hazards and NPC factions instead.' },
  { q: 'Which are free?', a: 'EVE has a free-to-play tier with skill limits; Prosperous Universe has a free tier limited in bases; Space Tycoon is free with cosmetic-only purchases. X4, Elite Dangerous and Starsector are paid.' },
  { q: 'Which run in a browser?', a: 'Prosperous Universe and Space Tycoon. The rest need a client.' },
];

export default function SpaceEconomyGamesGuide() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Space economy games</span>
          </nav>
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              &ldquo;Space game&rdquo; usually means flying. This is the shorter list of games where the market is the game — where what you build, mine, make and sell matters more than what you shoot. One of them is ours; it is listed last and we say so.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: August 2026</span><span>|</span><span>By SpaceNexus Team</span><span>|</span>
              <ReadingTime wordCount={1400} className="flex items-center gap-1.5" />
            </div>
          </header>

          <div className="card overflow-x-auto mb-10">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                  <th className="px-3 py-2.5">Game</th><th className="px-3 py-2.5">Platform</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Combat</th><th className="px-3 py-2.5">Multiplayer economy</th>
                </tr>
              </thead>
              <tbody>
                {GAMES.map((g) => (
                  <tr key={g.name} className={`border-b border-white/[0.06] last:border-0 align-top ${g.ours ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-3 py-2.5 text-white font-medium">{g.name}{g.ours ? <span className="text-[10px] text-cyan-400 ml-1">ours</span> : null}</td>
                    <td className="px-3 py-2.5 text-slate-300">{g.platform}</td>
                    <td className="px-3 py-2.5 text-slate-300">{g.price}</td>
                    <td className="px-3 py-2.5 text-slate-300">{g.combat}</td>
                    <td className="px-3 py-2.5 text-slate-300">{['EVE Online', 'Prosperous Universe', 'Space Tycoon'].includes(g.name) ? 'Yes — shared with other players' : 'Simulated, single player'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-8 mb-10">
            {GAMES.map((g, i) => (
              <section key={g.name} className="card p-6">
                <h2 className="text-xl font-bold text-white mb-1">{i + 1}. {g.name} <span className="text-sm font-normal text-slate-500">— {g.studio}</span></h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-3"><strong className="text-slate-300">The economy:</strong> {g.economy}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-3"><strong className="text-slate-300">Combat:</strong> {g.combat}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-3"><strong className="text-slate-300">Best for:</strong> {g.bestFor}</p>
                <p className="text-slate-400 text-sm leading-relaxed"><strong className="text-slate-300">The catch:</strong> {g.caveat}</p>
                {g.ours && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/space-tycoon" className="btn-primary text-sm py-2 px-4">Play free in your browser</Link>
                    <Link href="/space-tycoon/about" className="btn-secondary text-sm py-2 px-4">What is Space Tycoon?</Link>
                  </div>
                )}
              </section>
            ))}
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Frequently asked</h2>
            <div className="space-y-4">
              {FAQ.map((f) => (
                <div key={f.q}><h3 className="text-base font-semibold text-white mb-1">{f.q}</h3><p className="text-sm text-slate-400 leading-relaxed">{f.a}</p></div>
              ))}
            </div>
          </section>

          <GuideNavigation currentSlug="space-economy-games" />

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'ItemList', name: TITLE,
            itemListElement: GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Space economy games' }]} />
        </div>
      </div>
    </div>
  );
}
