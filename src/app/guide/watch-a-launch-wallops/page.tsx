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

const OG = '/api/og?title=Watch+a+Launch+at+Wallops&subtitle=Chincoteague%2C+Assateague+and+the+Delmarva+coast&type=guide';

export const metadata: Metadata = {
  title: 'Where to Watch a Rocket Launch at Wallops',
  description:
    'The best public spots to watch a Wallops Island launch — Assateague and Chincoteague, the NASA Visitor Center on Route 175, Robert Reed Park, Arbuckle Neck Road — plus Ocean City and Hampton Roads sightlines, sound delay and scrub odds.',
  keywords: [
    'watch a launch wallops',
    'wallops island launch viewing',
    'where to watch rocket launch chincoteague',
    'assateague rocket launch viewing',
    'wallops visitor center launch viewing',
    'robert reed park launch',
    'antares launch viewing',
    'electron launch wallops viewing',
    'ocean city md rocket launch',
  ],
  openGraph: {
    title: 'Where to Watch a Rocket Launch at Wallops',
    description:
      'The best public spots to watch a Wallops Island launch — Assateague and Chincoteague, the NASA Visitor Center, Robert Reed Park — plus Ocean City and Hampton Roads sightlines.',
    type: 'article',
    authors: ['SpaceNexus'],
    images: [{ url: OG, width: 1200, height: 630, alt: 'Where to Watch a Rocket Launch at Wallops' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where to Watch a Rocket Launch at Wallops | SpaceNexus',
    description: 'Best public spots to watch a Wallops Island launch, plus sound delay, scrub odds and arrival tips.',
    images: [OG],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/watch-a-launch-wallops',
  },
};

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'spots', label: 'Best Viewing Spots' },
  { id: 'expect', label: 'What to Expect' },
  { id: 'tips', label: 'Practical Tips' },
  { id: 'faq', label: 'FAQ' },
];

const VIEWING_SPOTS = [
  {
    name: 'Assateague Island National Seashore / Chincoteague National Wildlife Refuge',
    distance: '~9-10 mi from Pad 0A / LC-2',
    bestFor: 'All Wallops Island pads — Antares, Electron, Neutron; night launches over the ocean',
    cost: 'Refuge entry fee',
    notes:
      'The beach at the southern end of Assateague looks straight down the coast toward Wallops Island with nothing but ocean in between. Two things to check before you go: the refuge has gate hours, so an evening launch may fall after the beach closes, and the parking lots close once they fill. Bring bug spray — the marsh mosquitoes are relentless at dusk.',
  },
  {
    name: 'NASA Wallops Visitor Center viewing area (Route 175)',
    distance: '~7 mi from the island pads',
    bestFor: 'All pads — the closest sanctioned public viewing',
    cost: 'Free',
    notes:
      "NASA's own public viewing site on the Chincoteague Road, with a lawn, parking and restrooms. It opens for many launches but not every one, and it can be closed for range-safety reasons on the day — check the Visitor Center's launch-viewing notice before you drive out. When it is open it is the one spot with the countdown in your ears.",
  },
  {
    name: 'Robert Reed Park, Chincoteague',
    distance: '~9 mi from the pads',
    bestFor: "All pads — the town's designated waterfront viewing",
    cost: 'Free',
    notes:
      'The Main Street waterfront park is where the town watches, with a clear line across the channel and marsh to the island. It is the easiest free option if you are staying in Chincoteague, and it fills up for Antares cargo flights and anything with a NASA crowd attached. Arrive early and expect the causeway to back up afterward.',
  },
  {
    name: 'Arbuckle Neck Road',
    distance: 'A few miles across the marsh',
    bestFor: 'The closest roadside sightline on the mainland',
    cost: 'Free',
    notes:
      'A mainland road west of the island with a straight line across the marsh to the pads — the vantage locals and photographers use. There are no facilities, only shoulder parking, and NASA or the county can restrict access on launch days, so have a fallback. Do not block the road or private drives.',
  },
  {
    name: 'Ocean City, Maryland and the wider Delmarva / Hampton Roads coast',
    distance: '~50 mi north (Ocean City); Virginia Beach to the south',
    bestFor: 'Night launches — the ascent rising on the horizon',
    cost: 'Free',
    notes:
      'You will not see the pad from Ocean City, but the beach has a clear southern horizon and the rocket climbs into view within seconds of liftoff. From Virginia Beach and the rest of Hampton Roads the same happens to the north-northeast. NASA publishes a viewing map for each Wallops launch showing how far along the mid-Atlantic coast it should be visible — night launches are the ones to plan around from this distance.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How far away can you see a Wallops launch?',
    answer:
      'Night launches from Wallops are visible across the mid-Atlantic — NASA publishes a visibility map for each mission that typically reaches from the Carolinas up past New Jersey. For the pad-and-rumble experience you want Chincoteague, Assateague or the Route 175 Visitor Center, all within about ten miles of the pads.',
  },
  {
    question: 'What rockets launch from Wallops?',
    answer:
      "Wallops Island hosts Northrop Grumman's Antares from Pad 0A and Rocket Lab's Electron from Launch Complex 2, with Rocket Lab's larger Neutron being built up next door. Antares carries Cygnus cargo to the International Space Station; Electron flies smaller government and commercial payloads. Suborbital sounding rockets also fly regularly and are a much smaller spectacle.",
  },
  {
    question: 'Is a Wallops launch as dramatic as Cape Canaveral?',
    answer:
      'Antares is a substantial rocket and a night Antares launch is genuinely spectacular from Chincoteague. Electron is small — roughly a quarter the height of a Falcon 9 — so expect a bright, fast climb rather than a wall of sound. Cadence is also far lower than Florida: a few orbital launches a year rather than one most weeks, so plan the trip around a specific mission and build in slack for scrubs.',
  },
  {
    question: 'What happens if the launch scrubs?',
    answer:
      'Scrubs are routine — weather, upper-level winds, a technical hold, or a boat inside the range hazard area can push a launch by a day or more. Antares ISS missions have instantaneous launch windows, so there is no waiting out a problem on the pad: any hold means a scrub to the next day. Check the current schedule the morning of your visit and book lodging you can extend.',
  },
  {
    question: 'Is there a sound delay?',
    answer:
      'Yes. Sound travels roughly a mile every five seconds, so from Chincoteague or Assateague you see ignition and liftoff the better part of a minute before the crackle reaches you. From the Visitor Center the gap is shorter but still obvious.',
  },
  {
    question: 'Are drones allowed at the viewing spots?',
    answer:
      'No. The FAA establishes temporary restricted airspace around the range for every launch, and Chincoteague National Wildlife Refuge prohibits drones at all times. Flying one near a launch is illegal and can delay it for everyone.',
  },
];

const TIPS = [
  "Check the Visitor Center's launch-viewing notice the day before — it does not open for every launch, and it is the only spot with facilities.",
  'Refuge gate hours matter: an evening or pre-dawn launch may fall outside them, which is when Robert Reed Park and the causeway come into their own.',
  'Bug spray is not optional. The marsh mosquitoes and biting flies at dusk are the thing every first-time visitor mentions.',
  'Plan for the causeway. Route 175 is the only road on and off Chincoteague, and it backs up after a launch.',
  'For night launches from Ocean City or Hampton Roads, find the darkest stretch of beach and face the pad — the rocket rises into view within seconds of liftoff.',
  'Leave drones at home. The range airspace is restricted for every launch and the refuge bans them outright.',
];

export default function WatchALaunchWallopsPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Where to Watch a Rocket Launch at Wallops
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              NASA&apos;s Wallops Flight Facility on Virginia&apos;s Eastern Shore is the mid-Atlantic&apos;s
              launch site — Antares cargo flights to the space station, Rocket Lab&apos;s Electron, and
              soon Neutron — and it is one of the easiest places in the country to watch a rocket
              from a public beach. Here is where to stand, what to expect, and how far down the coast
              you can see it.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={1700} className="flex items-center gap-1.5" />
            </div>
          </header>

          <HeroArt src="/art/hero-launch-sites.webp" className="mb-8" />

          <div className="mb-8">
            <LaunchWatchForm site="Wallops" label="every Wallops launch" source="guide-wallops" />
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
                  Wallops Island sits at the bottom of the Delmarva peninsula, a few miles across the
                  marsh from the town of Chincoteague. Northrop Grumman&apos;s Antares flies from Pad 0A,
                  Rocket Lab&apos;s Electron from Launch Complex 2 beside it, and Neutron&apos;s pad is
                  rising next door. Orbital launches head out over the Atlantic, which is why the
                  beaches from Assateague to Ocean City get such a clean view.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Unlike Florida, cadence here is a few orbital launches a year rather than one a
                  week, so most visitors come for a specific mission. The good news is that every
                  public spot on this page looks at the same cluster of pads — you do not need to
                  pick a location by pad the way you do at the Cape.
                </p>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 text-sm">
                    <strong>Check the current schedule:</strong> Wallops dates move, and Antares
                    station flights have instantaneous windows.{' '}
                    <Link href="/launches/wallops" className="text-slate-300 underline hover:text-slate-300">
                      See what&apos;s flying from Wallops &rarr;
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
                  The publicly accessible spots locals and visiting enthusiasts actually use, from
                  NASA&apos;s own viewing lawn to the beaches down the coast.
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
                  Not making the trip? See what a launch looks like from{' '}
                  <Link href="/guide/watch-a-launch/chincoteague" className="text-slate-300 hover:underline">Chincoteague</Link>,{' '}
                  <Link href="/guide/watch-a-launch/ocean-city-md" className="text-slate-300 hover:underline">Ocean City</Link>,{' '}
                  <Link href="/guide/watch-a-launch/virginia-beach" className="text-slate-300 hover:underline">Virginia Beach</Link> or{' '}
                  <Link href="/guide/watch-a-launch/washington-dc" className="text-slate-300 hover:underline">Washington, DC</Link>.
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  <Link href="/spaceports" className="text-slate-300 hover:underline">
                    Explore the full spaceport directory, including pad-by-pad detail &rarr;
                  </Link>
                </p>
              </section>

              <section id="expect">
                <h2 className="text-2xl font-bold text-white mb-4">What to Expect</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Sound delay</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Sound travels roughly a mile every five seconds. From Chincoteague or Assateague
                      you see liftoff the better part of a minute before the rumble arrives across the
                      marsh.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Scrub odds</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Weather, upper-level winds and boats in the hazard area all scrub launches here,
                      and Antares station flights cannot wait out a hold. Treat any single date as
                      tentative and book lodging you can extend.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Big rocket, small rocket</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Antares is a substantial rocket and a night launch lights up the marsh. Electron
                      is small and fast — a bright climb rather than a wall of sound. Sounding rockets
                      are smaller still and over in seconds.
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
                  <Link href="/launches/wallops" className="btn-primary text-sm py-2 px-4">
                    Wallops Launch Schedule
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
                  <Link href="/guide/watch-a-launch-vandenberg" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Vandenberg &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-kourou" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Kourou &rarr;
                  </Link>
                  <Link href="/rockets/electron" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Rocket page: Electron &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="watch-a-launch-wallops" />
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
                headline: 'Where to Watch a Rocket Launch at Wallops',
                description:
                  'The best public spots to watch a Wallops Island rocket launch, what to expect, and practical viewing tips.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-09-01T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/watch-a-launch-wallops' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Watch a Launch at Wallops' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/watch-a-launch-wallops']} />
      </div>
    </div>
  );
}
