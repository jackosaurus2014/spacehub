import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Where to Watch a Rocket Launch at Cape Canaveral',
  description:
    'The best public spots to watch a Cape Canaveral or KSC rocket launch — Playalinda Beach, Titusville, Jetty Park, and KSC paid viewing — plus sound delay, scrub odds, and arrival tips.',
  keywords: [
    'watch a launch cape canaveral',
    'where to watch spacex launch florida',
    'best spot to watch rocket launch',
    'playalinda beach launch viewing',
    'titusville rocket launch viewing',
    'jetty park launch viewing',
    'ksc visitor complex launch viewing',
    'space view park titusville',
    'cape canaveral launch viewing spots',
  ],
  openGraph: {
    title: 'Where to Watch a Rocket Launch at Cape Canaveral',
    description:
      'The best public spots to watch a Cape Canaveral or KSC rocket launch — Playalinda Beach, Titusville, Jetty Park, and KSC paid viewing — plus sound delay, scrub odds, and arrival tips.',
    type: 'article',
    authors: ['SpaceNexus'],
    images: [
      {
        url: '/api/og?title=Watch+a+Launch+at+Cape+Canaveral&subtitle=Best+public+viewing+spots%2C+what+to+expect%2C+and+arrival+tips&type=guide',
        width: 1200,
        height: 630,
        alt: 'Where to Watch a Rocket Launch at Cape Canaveral',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where to Watch a Rocket Launch at Cape Canaveral | SpaceNexus',
    description:
      'Best public spots to watch a Cape Canaveral launch, plus sound delay, scrub odds, and arrival tips.',
    images: ['/api/og?title=Watch+a+Launch+at+Cape+Canaveral&subtitle=Best+public+viewing+spots%2C+what+to+expect%2C+and+arrival+tips&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/watch-a-launch-cape-canaveral',
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
    name: 'Playalinda Beach (Canaveral National Seashore)',
    distance: '~3-6 mi from LC-39A / 39B',
    bestFor: 'KSC pads (39A, 39B) — Artemis/SLS, Falcon Heavy, future Starship',
    cost: 'NPS entry fee (~$10/vehicle)',
    notes:
      'The closest public option to the Kennedy Space Center pads. NASA and the National Park Service frequently close the beach and access road ahead of launches with a trajectory near 39A — always check park alerts before driving out, especially for high-profile missions.',
  },
  {
    name: 'Space View Park, Titusville',
    distance: '~12 mi from most pads',
    bestFor: 'All pads — 39A/39B, SLC-40, SLC-41, LC-36',
    cost: 'Free',
    notes:
      'An unobstructed view across the Indian River and the most popular free viewing spot on the Space Coast. It fills up fast for big launches — arrive at least two hours early for anything high-profile.',
  },
  {
    name: 'Jetty Park, Port Canaveral',
    distance: '~4-7 mi from SLC-40 / SLC-41 / LC-36',
    bestFor: 'Cape Canaveral SFS pads — Falcon 9, Vulcan, New Glenn',
    cost: 'Small vehicle/parking fee',
    notes:
      'The closest easy public vantage to the southern Cape pads. Sightlines to 39A/39B further north are less ideal — pick this spot when the mission is flying from SLC-40 or SLC-41.',
  },
  {
    name: 'Max Brewer Bridge & Causeway, Titusville',
    distance: '~12 mi from most pads',
    bestFor: 'All pads',
    cost: 'Free',
    notes:
      'The elevated pedestrian walkway on the bridge gives a clean, unobstructed sightline similar to Space View Park nearby. Parking lots along the causeway fill quickly and can close once at capacity.',
  },
  {
    name: 'KSC Visitor Complex paid viewing',
    distance: '~3.5-6 mi (closest public option)',
    bestFor: '39A/39B especially, with sightlines across the wider Cape',
    cost: 'Paid ticket, add-on to admission',
    notes:
      'Official bus-transported viewing sites — including the LC-39 Observation Gantry — with live countdown audio and expert commentary. Tickets sell out for popular missions and policies on scrub refunds vary, so confirm the current terms when booking.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How far away can you see a rocket launch from Cape Canaveral?',
    answer:
      'On a clear day the exhaust plume is visible from 60+ miles away across much of central Florida, and a nighttime launch can light up the sky from even farther. For the full experience — feeling the rumble and hearing the crackle, not just seeing the flame — you want to be within roughly 10-12 miles, which is what Titusville\'s public spots offer.',
  },
  {
    question: 'What happens if the launch scrubs?',
    answer:
      'Scrubs are common — weather (both ground-level and upper-atmosphere winds), technical holds, range safety conflicts, or a stray boat or aircraft in the restricted zone can all trigger one, even for an otherwise healthy rocket. If you\'re planning a trip around a specific launch, build in flexibility for a day or more, and check the current schedule the morning of your visit rather than relying on the original date.',
  },
  {
    question: 'Is there a sound delay when you watch a launch?',
    answer:
      "Yes. Sound travels roughly one mile every five seconds, so from a 10-12 mile vantage point you'll see ignition and liftoff nearly a minute before the sound and low-frequency rumble reach you — one of the most memorable parts of watching in person.",
  },
  {
    question: 'Which pad is used for which rocket at Cape Canaveral?',
    answer:
      "SLC-40 hosts most SpaceX Falcon 9 missions, LC-39A is used for Falcon Heavy and crewed Dragon flights (and is being developed for Starship), SLC-41 hosts ULA's Vulcan Centaur, and LC-36 hosts Blue Origin's New Glenn. Pad assignments can change close to launch, so check the current schedule before picking a viewing spot.",
  },
  {
    question: 'Are drones allowed at the viewing spots?',
    answer:
      'No. The FAA establishes temporary restricted airspace around every active launch pad, and flying a personal drone anywhere near it — including from public viewing areas — is illegal and can trigger a launch delay or scrub for everyone.',
  },
  {
    question: 'Night launch or day launch — which is better?',
    answer:
      "Both are worth seeing. Night launches are the more dramatic spectacle — the plume can create a glowing, expanding \"jellyfish\" effect visible for hundreds of miles at dawn or dusk. Day launches show more structural detail: the vehicle, the separation events, and the contrail arcing downrange.",
  },
];

export default function WatchALaunchCapeCanaveralPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Where to Watch a Rocket Launch at Cape Canaveral
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Florida&apos;s Space Coast is the busiest launch range on Earth. Here&apos;s where locals
              and visitors actually go to watch — which spot to pick for which pad, what a launch
              feels like in person, and how to avoid getting stuck in traffic afterward.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={1800} className="flex items-center gap-1.5" />
            </div>
          </header>

          {/* Alert capture where the enthusiast journey actually is (SYNTHESIS item 17) */}
          <div className="mb-8">
            <LaunchWatchForm site="Cape Canaveral" label="every Cape Canaveral and Kennedy launch" source="guide-cape-canaveral" />
          </div>

          {/* Table of Contents */}
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
              {/* Overview */}
              <section id="overview">
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Cape Canaveral Space Force Station and the adjacent Kennedy Space Center fly more
                  orbital missions than anywhere else on the planet — most weeks bring at least one
                  Falcon 9, and the range regularly hosts ULA Vulcan, Blue Origin New Glenn, and
                  crewed or cargo missions to the ISS. You don&apos;t need a ticket to watch most of
                  them; a handful of free public spots along the Indian River and Space Coast give
                  a clear line of sight to every active pad.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Which spot is &quot;best&quot; depends entirely on which pad the mission is flying
                  from — SLC-40 and SLC-41 sit at the southern end of the Cape, while LC-39A and
                  LC-39B are several miles north at Kennedy Space Center itself. Check the pad
                  before you pick a viewing location.
                </p>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 text-sm">
                    <strong>Check the current schedule:</strong> launch dates and pad assignments
                    change constantly. See what&apos;s flying next before you plan a trip.{' '}
                    <Link href="/mission-control" className="text-slate-300 underline hover:text-slate-300">
                      Open Mission Control &rarr;
                    </Link>{' '}
                    or read the full{' '}
                    <Link href="/guide/space-launch-schedule-2026" className="text-slate-300 underline hover:text-slate-300">
                      Space Launch Schedule guide &rarr;
                    </Link>
                  </p>
                </div>
              </section>

              {/* Viewing Spots */}
              <section id="spots">
                <h2 className="text-2xl font-bold text-white mb-4">Best Viewing Spots</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  These are the well-known, publicly accessible spots that locals and visiting
                  enthusiasts actually use — from free roadside parks to the closest paid viewing
                  Kennedy Space Center offers.
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
                  <Link href="/spaceports" className="text-slate-300 hover:underline">
                    Explore the full spaceport directory, including pad-by-pad detail &rarr;
                  </Link>
                </p>
              </section>

              {/* What to Expect */}
              <section id="expect">
                <h2 className="text-2xl font-bold text-white mb-4">What to Expect</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Sound delay</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Sound travels roughly a mile every five seconds. From 10-12 miles away you&apos;ll
                      see ignition nearly a minute before the crackle and rumble reach you — a strange,
                      unforgettable lag the first time you experience it.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Scrub odds</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Scrubs are routine — weather, upper-level winds, technical holds, or a boat
                      drifting into the restricted zone can all delay a launch, sometimes more than
                      once. Treat any single launch date as tentative and have a backup plan.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Night vs. day</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Night launches are the visual showstopper — glowing exhaust plumes can be seen
                      for hundreds of miles at twilight. Day launches show more detail: the vehicle
                      itself, stage separation, and a long downrange contrail.
                    </p>
                  </div>
                </div>
              </section>

              {/* Practical Tips */}
              <section id="tips">
                <h2 className="text-2xl font-bold text-white mb-4">Practical Tips</h2>
                <ul className="space-y-3">
                  {[
                    'Arrive early — at least 2 hours before a popular launch, earlier for anything crewed or historic. Prime spots at Space View Park and Playalinda fill up.',
                    'Plan for traffic after the launch, not before. SR-405 and US-1 through Titusville can take an hour or more to clear once thousands of cars leave at once.',
                    'Bring water, sunscreen, and bug spray — Florida heat and mosquitoes near the river are no joke, even for a 10-minute wait.',
                    'A countdown radio or app helps — many official streams broadcast the countdown audio, so you can follow along even from a spot without a screen.',
                    'Leave drones at home. Restricted airspace around every active pad makes personal drone flights illegal near a launch.',
                    'Double-check the pad and the schedule the morning of your visit — both can change with little notice.',
                  ].map((tip, i) => (
                    <li key={tip} className="flex items-start gap-3">
                      <span className="bg-white text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-slate-400 text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/mission-control" className="btn-primary text-sm py-2 px-4">
                    Mission Control
                  </Link>
                  <Link href="/guide/space-launch-schedule-2026" className="btn-secondary text-sm py-2 px-4">
                    Full Launch Schedule
                  </Link>
                </div>
              </section>

              {/* FAQ */}
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

              {/* Related Content */}
              <section className="pt-6 border-t border-white/[0.06]">
                <h3 className="text-lg font-bold text-white mb-4">Related Guides</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link href="/guide/space-launch-schedule-2026" className="text-slate-300 hover:text-white text-sm transition-colors">
                    2026 Space Launch Schedule &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-vandenberg" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Vandenberg &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-starbase" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Starship Launch at Starbase &rarr;
                  </Link>
                  <Link href="/spaceports" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Spaceport Directory &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="watch-a-launch-cape-canaveral" />
            </article>
          </ScrollReveal>

          {/* FAQ Schema */}
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

          {/* Article Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Where to Watch a Rocket Launch at Cape Canaveral',
                description:
                  'The best public spots to watch a Cape Canaveral or KSC rocket launch, what to expect, and practical viewing tips.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-08-14T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/watch-a-launch-cape-canaveral' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Watch a Launch at Cape Canaveral' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/watch-a-launch-cape-canaveral']} />
      </div>
    </div>
  );
}
