import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { SITE_STATS } from '@/lib/site-stats';
import LiveEconomyStrip from '@/components/game/LiveEconomyStrip';

// Search-facing companion to the game client (which renders nothing a
// crawler can read). Plain-text answers to "what is this?" for the queries
// people actually type — browser space MMO, space economy game, no-combat
// space strategy, live-service — and an honest comparison. No hype numbers
// that are not in SITE_STATS or the game's own docs.
export const revalidate = 3600;

const TITLE = 'What Is Space Tycoon? A Free Browser Space MMO Built on Economics';
const DESCRIPTION =
  'Space Tycoon is a free, no-download space economy game: one shared live market, real supply chains, manufacturing, corporations and alliances, no combat and no pay-to-win. What it is, how it plays, and how it compares to EVE Online, Prosperous Universe and X4.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['space mmo', 'browser space mmo', 'space economy game', 'space strategy game no combat', 'space tycoon game', 'live service space game', 'free space game browser', 'economic mmo'],
  alternates: { canonical: 'https://spacenexus.us/space-tycoon/about' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', images: [{ url: '/art/hero-space-tycoon.png', width: 1024, height: 1024 }] },
};

const REGIONS = [
  { id: 'inner_system', name: 'Inner system', blurb: 'Earth launch pads, LEO stations, orbital slots — where every corporation starts.' },
  { id: 'lunar', name: 'Lunar environs', blurb: 'Regolith processing, manufacturing plants, the first off-world industry.' },
  { id: 'martian', name: 'Mars', blurb: 'Colonies, Sabatier fuel, a second market centre.' },
  { id: 'asteroid_belt', name: 'Asteroid belt', blurb: 'Contested deposits, refineries, the chokepoint corridors.' },
  { id: 'jovian', name: 'Jovian moons', blurb: 'Deep-space holdings and the long supply lines that feed them.' },
  { id: 'saturnian', name: 'Saturnian moons', blurb: 'Titan chemistry and the outer-system trade.' },
  { id: 'outer_system', name: 'Outer system', blurb: 'Kuiper-belt expeditions, exotic finds, the edge of the heliosphere.' },
  { id: 'interstellar', name: 'Interstellar', blurb: 'The end-game: expeditions beyond the heliopause and what they bring back.' },
];

const COMPARE = [
  { game: 'Space Tycoon', model: 'Free, browser, no download', combat: 'None — rivalry is economic', economy: 'One shared live market; manufacturing; player and NPC-corp listings', pay: 'Cosmetic only, stated policy' },
  { game: 'EVE Online', model: 'Free-to-play + subscription, client', combat: 'Central (PvP fleet warfare)', economy: 'Deep player market, industry, regional hubs', pay: 'PLEX / skill injectors' },
  { game: 'Prosperous Universe', model: 'Free tier + subscription, browser', combat: 'None', economy: 'Deep production chains and commodity exchanges', pay: 'Subscription unlocks' },
  { game: 'X4: Foundations', model: 'Paid, single-player', combat: 'Yes', economy: 'Simulated station economy, single player', pay: 'DLC' },
  { game: 'Elite Dangerous', model: 'Paid, client', combat: 'Yes', economy: 'Trading and mining loops, background sim', pay: 'Cosmetics / expansions' },
];

const FAQ = [
  { q: 'Is Space Tycoon a space MMO?', a: 'Yes. Every player shares one persistent economy: the same live market, contracts, weekly league and faction standings. Corporations, alliances, mergers and takeovers are the end-game. There is no fleet combat; players compete by out-producing, out-trading and out-manoeuvring each other.' },
  { q: 'Is it free? Is there pay-to-win?', a: 'Free to play in the browser with no download. Real-money purchases are cosmetic or convenience only — never resources, money, research acceleration or exclusive gameplay. The no-pay-to-win commitment is written into the public policy.' },
  { q: 'What do you actually do in it?', a: 'Build launch pads, stations and factories; mine and refine; manufacture components at fabrication facilities; list them on the order book; win contracts; research a 270-plus technology tree; expand from Earth to the Moon, Mars, the belt and beyond; and form or join a corporation to do all of it at scale.' },
  { q: 'Is it a live-service game?', a: 'The world moves whether you are logged in or not. Contracts and briefings refresh daily, league and faction standings weekly, corporate quarterlies every game quarter, seasonal events on a calendar. Real launches and NOAA space weather feed the simulation. Balance passes ship continuously and are logged in the dev log, and a public economic balance report is published every quarter.' },
  { q: 'How does it compare to EVE Online or Prosperous Universe?', a: 'Closest to Prosperous Universe in spirit (economy first, no combat) with a lighter on-ramp and a real-solar-system setting; closest to EVE in the corporate end-game, minus the fleet warfare. See the table on this page.' },
  { q: 'Does it work on a phone?', a: 'Yes — every command-centre feature is designed for touch and small screens, and there is an Android build.' },
];

export default function SpaceTycoonAboutPage() {
  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/space-tycoon" className="hover:text-white/80">Space Tycoon</Link><span>/</span>
          <span className="text-slate-400">About</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">What is Space Tycoon?</h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            A free, browser-based <strong className="text-white">space MMO</strong> with no combat. It is a <strong className="text-white">space economy game</strong> first: one shared live market for everything, real supply chains, hardware you have to manufacture, and corporations as the end-game. It runs as a <strong className="text-white">live-service</strong> world on a hard-science 22nd-century solar system, fed by real launches and real space weather.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/space-tycoon" className="btn-primary text-sm py-2.5 px-5">Play free in your browser</Link>
            <Link href="/space-tycoon/faq" className="btn-secondary text-sm py-2.5 px-5">How to play (FAQ)</Link>
            <Link href="/space-tycoon/dev-log" className="btn-secondary text-sm py-2.5 px-5">Dev log</Link>
            <Link href="/space-tycoon/balance-reports" className="btn-secondary text-sm py-2.5 px-5">Balance reports</Link>
          </div>
        </header>

        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/[0.06] mb-10">
          <Image src="/game/region-inner_system.webp" alt="Space Tycoon — the inner system region banner: Earth launch pads and low-orbit stations" fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" priority={false} />
        </div>

        <div className="mb-10"><LiveEconomyStrip /></div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">The idea</h2>
          <p className="text-slate-400 leading-relaxed mb-3">
            Most space games are about ships. Space Tycoon is about balance sheets. Every price is set by supply and demand on one global market; mass extraction depresses a commodity, a procurement drive lifts a service. Logistics cost money — delta-v, transit time, storage. Orbital slots, high-grade deposits and belt corridors are finite and contested. Profit and loss are visible per building, per location and per corporation, because that is where the decisions are.
          </p>
          <p className="text-slate-400 leading-relaxed mb-3">
            Hardware is <strong className="text-slate-300">manufactured, not conjured</strong>. Structural beams, satellite buses, life-support packs and fusion cores come out of fabrication facilities — on Earth, in orbit, on the Moon and Mars — built from mined and refined inputs. They reach the market only when a player or one of the named NPC industrial corporations lists what they built. There is no inventory until someone makes it.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Nothing is destroyed by other players. Solar storms, micrometeoroids, equipment failure, NPC piracy and regulators are the risks; insurance, redundancy and shielding are the answers. Corporate warfare is economic: out-bid, out-research, out-recruit, corner a market, take a rival over.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">Eight regions, one economy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REGIONS.map((r) => (
              <div key={r.id} className="card overflow-hidden">
                <div className="relative w-full aspect-[21/9]">
                  <Image src={`/game/region-${r.id}.webp`} alt={`${r.name} region art`} fill sizes="(min-width: 640px) 440px, 100vw" className="object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-white">{r.name}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">How it compares</h2>
          <p className="text-slate-400 text-sm mb-3">We make one of these, so read the row as a claim, not a verdict. Details on the others are as of their public descriptions.</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                  <th className="px-3 py-2.5">Game</th><th className="px-3 py-2.5">Model</th><th className="px-3 py-2.5">Combat</th><th className="px-3 py-2.5">Economy</th><th className="px-3 py-2.5">Real money</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((c) => (
                  <tr key={c.game} className={`border-b border-white/[0.06] last:border-0 align-top ${c.game === 'Space Tycoon' ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-3 py-2.5 text-white font-medium">{c.game}</td>
                    <td className="px-3 py-2.5 text-slate-300">{c.model}</td>
                    <td className="px-3 py-2.5 text-slate-300">{c.combat}</td>
                    <td className="px-3 py-2.5 text-slate-300">{c.economy}</td>
                    <td className="px-3 py-2.5 text-slate-300">{c.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">Looking for the wider field? <Link href="/guide/space-economy-games" className="text-cyan-400 hover:text-cyan-300">Best space economy games in 2026</Link>.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">What a week looks like</h2>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li><strong className="text-slate-300">Minutes:</strong> market orders, ship dispatch, contract bids, an event to respond to.</li>
            <li><strong className="text-slate-300">Daily:</strong> contracts refresh, maintenance decisions, an intelligence briefing.</li>
            <li><strong className="text-slate-300">Weekly:</strong> league standings, corporate elections, faction standings, seasonal events.</li>
            <li><strong className="text-slate-300">Quarterly:</strong> every corporation publishes a public report — revenue, growth, notable acquisitions.</li>
            <li><strong className="text-slate-300">Epochs:</strong> the world restarts fresh on a set cadence so newcomers start on a level solar system. Epoch 2 began 24 August 2026.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">Built inside a space-industry site</h2>
          <p className="text-slate-400 leading-relaxed">
            Space Tycoon lives on SpaceNexus, which tracks every launch, {SITE_STATS.companies} companies, funding rounds and the space economy for enthusiasts and the industry. That is why the simulation can use real launch schedules and NOAA space weather, and why the game&apos;s canonical lore is written against a real 21st-century starting point. <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Mission Control</Link> is next door.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">Frequently asked</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">No account needed to look around.</div>
            <div className="text-xs text-slate-400">Open the command centre, read the market, then found a corporation when you are ready.</div>
          </div>
          <Link href="/space-tycoon" className="btn-primary text-sm py-2 px-4 flex-shrink-0">Play Space Tycoon</Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Tycoon', href: '/space-tycoon' }, { name: 'About' }]} />
      </div>
    </div>
  );
}
