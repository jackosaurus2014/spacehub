import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const revalidate = 3600;

const OG = '/api/og?title=Watch+a+Launch+at+Kourou&subtitle=Carapa%2C+the+seafront+and+getting+to+French+Guiana&type=guide';

export const metadata: Metadata = {
  title: 'Where to Watch a Rocket Launch at Kourou',
  description:
    'How to watch an Ariane 6 or Vega-C launch from the Guiana Space Centre — the Carapa observation site, the Kourou seafront and Pointe des Roches, Cayenne — plus getting into French Guiana, the rainy season, and why cadence is lower than Florida.',
  keywords: [
    'watch a launch kourou',
    'guiana space centre launch viewing',
    'ariane 6 launch viewing',
    'vega-c launch viewing',
    'carapa observation site kourou',
    'where to watch ariane launch',
    'french guiana rocket launch',
    'kourou spaceport visit',
    'cayenne rocket launch',
  ],
  openGraph: {
    title: 'Where to Watch a Rocket Launch at Kourou',
    description:
      'How to watch an Ariane 6 or Vega-C launch from the Guiana Space Centre — Carapa, the Kourou seafront, Cayenne — plus getting to French Guiana and when to go.',
    type: 'article',
    authors: ['SpaceNexus'],
    images: [{ url: OG, width: 1200, height: 630, alt: 'Where to Watch a Rocket Launch at Kourou' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where to Watch a Rocket Launch at Kourou | SpaceNexus',
    description: 'Where to watch an Ariane 6 or Vega-C launch at the Guiana Space Centre, and how to get there.',
    images: [OG],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/watch-a-launch-kourou',
  },
};

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'spots', label: 'Best Viewing Spots' },
  { id: 'getting-there', label: 'Getting There and When to Go' },
  { id: 'expect', label: 'What to Expect' },
  { id: 'tips', label: 'Practical Tips' },
  { id: 'faq', label: 'FAQ' },
];

const VIEWING_SPOTS = [
  {
    name: 'Carapa observation site, Kourou',
    distance: '~7 km from the pads',
    bestFor: 'Ariane 6 (ELA-4) and Vega-C — the public viewing hill',
    cost: 'Free; access arranged per launch',
    notes:
      'The public observation site on a hill at the edge of Kourou, with a direct line to the launch complex — this is the spot for the pad, the ignition and the sound. CNES opens it for launches and manages access, which has varied between open, registration-based and capacity-limited depending on the mission, so confirm the arrangements for your launch with CNES or the Kourou tourist office before you count on it. Arrive well ahead of the window.',
  },
  {
    name: 'Toucan site — Agami and Colibri',
    distance: 'Inside the space centre',
    bestFor: 'Invited guests only',
    cost: 'Invitation only',
    notes:
      'The Toucan hill hosts the Agami and Colibri viewing sites used for guests of CNES, ESA, Arianespace and the payload customers. They are not open to the public and you cannot buy a ticket — if you are not on an invitation list, do not plan around them. Carapa is the public equivalent.',
  },
  {
    name: 'Kourou seafront and Pointe des Roches',
    distance: '~15-20 km from the pads',
    bestFor: 'Any launch, free, no arrangements needed',
    cost: 'Free',
    notes:
      'The seafront at the mouth of the Kourou river — the Pointe des Roches and the beach beside it — is where the town watches. Look northwest along the coast toward the complex; the rocket rises above the treeline within seconds and arcs out over the Atlantic. No registration, plenty of space, and a proper crowd for an Ariane 6.',
  },
  {
    name: 'Cayenne',
    distance: '~60 km southeast of the spaceport',
    bestFor: 'Night launches, or if you are based in the capital',
    cost: 'Free',
    notes:
      'From Cayenne liftoff is below the horizon, but the rocket climbs into view to the northwest within seconds and a night launch is visible across the city — the Fort Cépérou hill in the old town has an elevated view up the coast. The drive to Kourou on the RN1 is about an hour, so most visitors with a car make the trip for the real thing.',
  },
  {
    name: 'Sinnamary',
    distance: '~25 km north of the pads',
    bestFor: 'A quieter alternative north of the complex',
    cost: 'Free',
    notes:
      'The small town on the far side of the Sinnamary river is the closest community north of the launch complex. Look south-southeast from the riverfront. It is well off the visitor track and has few services, which is either the appeal or the drawback.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can anyone go to French Guiana to watch a launch?',
    answer:
      'French Guiana is an overseas region of France and part of the European Union, but it is not in the Schengen Area, so a Schengen visa is not automatically valid there — travellers from outside the EU need to check French entry rules specifically for French Guiana, and a yellow-fever vaccination certificate is required for entry. EU citizens travel as they would to mainland France. Flights connect through Paris, with regional links from the Caribbean and Brazil.',
  },
  {
    question: 'How often do rockets launch from Kourou?',
    answer:
      'Far less often than from Florida. Ariane 6 and Vega-C fly a handful of missions a year between them, so there is no "come for the weekend and catch whatever is flying" — plan the trip around a specific launch and build in several days of slack for scrubs. Our Kourou launch page tracks the current manifest.',
  },
  {
    question: 'When is the best time of year to visit?',
    answer:
      'The dry season, roughly August to November, is the most comfortable and the least likely to hide a launch behind cloud. The rest of the year is the rainy season, with the heaviest rain around May and June; launches still fly in it, but viewing conditions and the roads are worse. Either way it is hot and humid, and mosquito protection matters — dengue is present.',
  },
  {
    question: 'Can you tour the Guiana Space Centre?',
    answer:
      "Yes. CNES runs guided tours of the space centre and the Musée de l'Espace in Kourou; tours must be booked in advance with identification, and they are suspended in the days around a launch. Check current availability before you travel.",
  },
  {
    question: 'What happens if the launch scrubs?',
    answer:
      "Weather, upper-level winds, a technical hold or a range issue can push a launch by a day or more, and Kourou's cadence means the next attempt may not be for a while. Confirm the date the morning of your visit, keep your lodging flexible, and treat the museum, the Îles du Salut boat trip and the beaches as the fallback plan.",
  },
  {
    question: 'Is there a sound delay?',
    answer:
      'Yes. Sound travels roughly a kilometre every three seconds, so from the Carapa site you see ignition some twenty seconds before the sound arrives, and from the Kourou seafront the gap is closer to a minute. An Ariane 6 with solid boosters is loud when it does arrive.',
  },
];

const TIPS = [
  'Confirm the Carapa access arrangements for your specific launch with CNES or the Kourou tourist office — they change from mission to mission.',
  'Sort the paperwork early: entry rules for French Guiana differ from Schengen, and the yellow-fever certificate is checked.',
  'Rent a car. The viewing sites, the space centre and Cayenne are spread along the RN1, and there is no useful public transport on launch night.',
  'Bring repellent, long sleeves for dusk, water and sun protection — equatorial sun and mosquitoes are the two things that spoil the day.',
  'Book the space-centre tour and the museum for the days before the launch; tours are suspended around launch day.',
  'Leave drones at home: the space centre and the range are restricted airspace.',
];

export default function WatchALaunchKourouPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Where to Watch a Rocket Launch at Kourou
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Europe&apos;s spaceport sits on the coast of French Guiana, five degrees north of the
              equator, and an Ariane 6 lifting off over the Atlantic is one of the great sights in
              spaceflight. It is also a real trip. Here is where the public can watch, how to get
              there, when to go, and what to expect from a launch site that flies a few times a year
              rather than every week.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={1900} className="flex items-center gap-1.5" />
            </div>
          </header>

          <HeroArt src="/art/hero-launch-sites.webp" className="mb-8" />

          <div className="mb-8">
            <LaunchWatchForm site="Guiana Space Centre" label="every Ariane 6 and Vega-C launch from Kourou" source="guide-kourou" />
          </div>

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">Table of Contents</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              <section id="overview">
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The Guiana Space Centre (Centre Spatial Guyanais, CSG) is run by the French space
                  agency CNES and used by ESA and Arianespace. Ariane 6 flies from the ELA-4 complex
                  and Vega-C from its own pad nearby, both on the coastal strip between the towns of
                  Kourou and Sinnamary. Launches head out over the Atlantic — east for geostationary
                  missions, north for polar and sun-synchronous ones — which is why the seafront at
                  Kourou gets such a clean view.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Two things make Kourou different from a Florida trip. Cadence is low — a handful of
                  Ariane 6 and Vega-C launches a year — so you plan around one mission and accept
                  scrub risk. And French Guiana is a long way from anywhere: flights connect through
                  Paris, entry rules are France&apos;s but with local exceptions, and the climate is
                  equatorial. Done right, it is worth every hour of it.
                </p>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 text-sm">
                    <strong>Check the current schedule:</strong> Kourou dates move and the next attempt
                    after a scrub can be weeks away.{' '}
                    <Link href="/launches/kourou" className="text-slate-300 underline hover:text-slate-300">
                      See what&apos;s flying from Kourou &rarr;
                    </Link>{' '}
                    or open{' '}
                    <Link href="/mission-control" className="text-slate-300 underline hover:text-slate-300">
                      Mission Control &rarr;
                    </Link>
                  </p>
                </div>
              </section>

              <section id="spots">
                <h2 className="text-2xl font-bold text-white mb-4">Best Viewing Spots</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The public options, from CNES&apos;s own observation hill to the free seafront —
                  and the one set of sites you cannot get into without an invitation.
                </p>
                <div className="space-y-4">
                  {VIEWING_SPOTS.map((spot) => (
                    <div key={spot.name} className="card p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white text-base">{spot.name}</h3>
                        <span className="text-xs text-slate-500">{spot.distance}</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-1"><strong>Best for:</strong> {spot.bestFor}</p>
                      <p className="text-xs text-slate-300 mb-3"><strong>Cost:</strong> {spot.cost}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{spot.notes}</p>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-sm mt-4">
                  Distance, direction and what you will see from{' '}
                  <Link href="/guide/watch-a-launch/kourou" className="text-slate-300 hover:underline">Kourou</Link>,{' '}
                  <Link href="/guide/watch-a-launch/cayenne" className="text-slate-300 hover:underline">Cayenne</Link> and{' '}
                  <Link href="/guide/watch-a-launch/sinnamary" className="text-slate-300 hover:underline">Sinnamary</Link>.
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  <Link href="/spaceports" className="text-slate-300 hover:underline">
                    Explore the full spaceport directory, including pad-by-pad detail &rarr;
                  </Link>
                </p>
              </section>

              <section id="getting-there">
                <h2 className="text-2xl font-bold text-white mb-4">Getting There and When to Go</h2>
                <div className="space-y-4 text-slate-400 leading-relaxed">
                  <p>
                    <strong className="text-white">Entry.</strong> French Guiana is an overseas region
                    of France and part of the European Union, but it is not part of the Schengen Area.
                    EU citizens travel as they would to France. Everyone else should check French
                    entry requirements specifically for French Guiana rather than assuming a Schengen
                    visa covers it, and a yellow-fever vaccination certificate is required for entry.
                    Confirm the current rules with a French consulate before booking.
                  </p>
                  <p>
                    <strong className="text-white">Getting around.</strong> Flights arrive at Cayenne;
                    Kourou is about an hour northwest on the RN1 and a rental car is the practical way
                    to reach the viewing sites and to get back afterward. The currency is the euro, the
                    language is French, and local time is UTC−3 year-round.
                  </p>
                  <p>
                    <strong className="text-white">Season.</strong> The dry season runs roughly August to
                    November and is the best bet for clear skies and passable roads. The rainy season
                    covers the rest of the year, heaviest around May and June. It is hot and humid in
                    every month; mosquito protection is a health measure, not a comfort one.
                  </p>
                  <p>
                    <strong className="text-white">Cadence.</strong> Ariane 6 and Vega-C fly a few times a
                    year between them, so the trip is built around one launch. Book lodging you can
                    extend, and plan the space-centre tour, the Musée de l&apos;Espace and the Îles du
                    Salut boat trip as the days-around-the-launch itinerary rather than the backup.
                  </p>
                </div>
              </section>

              <section id="expect">
                <h2 className="text-2xl font-bold text-white mb-4">What to Expect</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Sound delay</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Sound travels roughly a kilometre every three seconds. From Carapa the rumble
                      arrives some twenty seconds after ignition; from the seafront, closer to a minute.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Scrub odds</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Weather, upper-level winds and technical holds scrub launches here as anywhere,
                      and the next attempt can be days or weeks out. Keep the itinerary flexible.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Ariane 6 vs Vega-C</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Ariane 6 with its solid boosters is the big, loud spectacle. Vega-C is a much
                      smaller solid-fuel rocket — a fast, bright climb that is over sooner.
                    </p>
                  </div>
                </div>
              </section>

              <section id="tips">
                <h2 className="text-2xl font-bold text-white mb-4">Practical Tips</h2>
                <ul className="space-y-3">
                  {TIPS.map((tip, i) => (
                    <li key={tip} className="flex items-start gap-3">
                      <span className="bg-white text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-slate-400 text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/launches/kourou" className="btn-primary text-sm py-2 px-4">
                    Kourou Launch Schedule
                  </Link>
                  <Link href="/mission-control" className="btn-secondary text-sm py-2 px-4">
                    Mission Control
                  </Link>
                </div>
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {FAQ_ITEMS.map((faq) => (
                    <div key={faq.question} className="card p-4">
                      <h3 className="font-semibold text-white text-sm mb-2">{faq.question}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h3 className="text-lg font-bold text-white mb-4">Related Guides</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link href="/guide/watch-a-launch-cape-canaveral" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Cape Canaveral &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-wallops" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Wallops &rarr;
                  </Link>
                  <Link href="/rockets/ariane-6" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Rocket page: Ariane 6 &rarr;
                  </Link>
                  <Link href="/compare/spacex-vs-arianespace" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Compare: SpaceX vs Arianespace &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="watch-a-launch-kourou" />
            </article>
          </ScrollReveal>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQ_ITEMS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Where to Watch a Rocket Launch at Kourou',
                description:
                  'How to watch an Ariane 6 or Vega-C launch from the Guiana Space Centre: public viewing sites, getting to French Guiana, when to go, and what to expect.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-09-01T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/watch-a-launch-kourou' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Watch a Launch at Kourou' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/watch-a-launch-kourou']} />
      </div>
    </div>
  );
}
