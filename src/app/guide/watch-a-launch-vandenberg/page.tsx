import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Where to Watch a Rocket Launch at Vandenberg',
  description:
    'The best public spots to watch a Vandenberg Space Force Base launch — Surf Beach, Harris Grade Road, and Lompoc — plus the marine layer, polar orbits, and arrival tips.',
  keywords: [
    'watch a launch vandenberg',
    'vandenberg rocket launch viewing',
    'surf beach lompoc launch',
    'harris grade road launch viewing',
    'where to watch spacex launch california',
    'vandenberg space force base launch viewing',
    'ocean avenue lompoc launch',
    'polar orbit launch california',
  ],
  openGraph: {
    title: 'Where to Watch a Rocket Launch at Vandenberg',
    description:
      'The best public spots to watch a Vandenberg Space Force Base launch — Surf Beach, Harris Grade Road, and Lompoc — plus the marine layer, polar orbits, and arrival tips.',
    type: 'article',
    authors: ['SpaceNexus'],
    images: [
      {
        url: '/api/og?title=Watch+a+Launch+at+Vandenberg&subtitle=Best+public+viewing+spots%2C+what+to+expect%2C+and+arrival+tips&type=guide',
        width: 1200,
        height: 630,
        alt: 'Where to Watch a Rocket Launch at Vandenberg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where to Watch a Rocket Launch at Vandenberg | SpaceNexus',
    description:
      'Best public spots to watch a Vandenberg launch, plus the marine layer, polar orbits, and arrival tips.',
    images: ['/api/og?title=Watch+a+Launch+at+Vandenberg&subtitle=Best+public+viewing+spots%2C+what+to+expect%2C+and+arrival+tips&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/watch-a-launch-vandenberg',
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
    name: 'Ocean Avenue / Surf Beach area, Lompoc',
    distance: '~2-4 mi from SLC-4E',
    bestFor: "SpaceX Falcon 9 west-coast missions from SLC-4E",
    cost: 'Free',
    notes:
      'The closest easy public viewing for Falcon 9 launches and the go-to spot for locals. Vandenberg Space Force Base occasionally restricts beach access ahead of a launch for range safety, so check current closures before you drive out.',
  },
  {
    name: 'Harris Grade Road',
    distance: 'Several miles inland, elevated',
    bestFor: 'Any pad — best when coastal fog is likely',
    cost: 'Free',
    notes:
      'A high vantage point above the base with sweeping views over the Vandenberg range. Because it sits above the marine layer that often blankets the coast, it is a favorite with photographers on foggy mornings when beach-level spots get socked in.',
  },
  {
    name: 'Ocean Park & Cabrillo area beach access points',
    distance: '~3-5 mi',
    bestFor: 'SLC-4E and SLC-6 missions',
    cost: 'Free (city/county beach access)',
    notes:
      'A handful of lower-key beach access points frequented by locals, offering similar sightlines to Surf Beach with smaller crowds.',
  },
  {
    name: 'Point Sal State Beach',
    distance: 'Further and more remote',
    bestFor: 'Unobstructed sightlines, fewer crowds',
    cost: 'Free',
    notes:
      'A longer drive down an unpaved road, but it rewards you with an open, uncrowded view — a good option when Surf Beach is packed or closed.',
  },
  {
    name: 'Lompoc — the local viewing culture',
    distance: '~8-10 mi from the pads',
    bestFor: 'A social, low-effort viewing experience',
    cost: 'Varies (restaurants, hotel rooftops)',
    notes:
      'Lompoc has an active rocket-watching culture — local Facebook groups post viewing meetups, and several restaurants and hotels with a coastal-facing view host informal launch-watch gatherings.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How far away can you see a Vandenberg launch?',
    answer:
      'From the Surf Beach area, the pads are close enough (2-4 miles) that you get the full experience — light, sound, and vibration. Because Vandenberg launches often head south along the coastline rather than out over open ocean, they can also be visible from much farther away, sometimes from Santa Barbara or even the Los Angeles basin on a clear night.',
  },
  {
    question: 'What happens if the launch scrubs?',
    answer:
      'Just like Florida, scrubs at Vandenberg are routine — weather, technical holds, or range conflicts can push a launch by hours or days. The coastal marine layer adds an extra wrinkle here: a launch can still happen on schedule even when it looks too foggy to see anything from the beach. Check the current schedule before you commit to a long drive.',
  },
  {
    question: 'Why do Vandenberg rockets fly south instead of east?',
    answer:
      "Vandenberg launches predominantly target polar and sun-synchronous orbits, which require flying south over the Pacific to avoid overflying populated land on ascent. That gives Vandenberg launches a distinctly different look from Florida's eastward, equatorial launches — the rocket arcs down the coastline instead of heading straight out to sea.",
  },
  {
    question: 'Does the marine layer ruin the view?',
    answer:
      "It can. California's coastal fog is common, especially in the morning and evening, and it can completely obscure a launch from a beach-level spot even though the rocket clears the cloud deck within seconds. Elevated viewing points like Harris Grade Road sit above the fog line and are the best backup when the marine layer is thick.",
  },
  {
    question: 'Which viewing spot is best for photos?',
    answer:
      'Harris Grade Road is the favorite among local photographers for its elevation and unobstructed sightline over the whole base. Surf Beach gives a lower, closer angle with the launch appearing to rise directly out of the ocean, which many photographers also prefer for dramatic reflection shots.',
  },
];

export default function WatchALaunchVandenbergPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Where to Watch a Rocket Launch at Vandenberg
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              The West Coast&apos;s primary spaceport sends rockets south into polar orbit instead of
              east over open ocean — a different show from Florida, with its own best-kept viewing
              secrets and its own weather challenge: the marine layer.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={1700} className="flex items-center gap-1.5" />
            </div>
          </header>

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
                  Vandenberg Space Force Base, on the central California coast near Lompoc, is the
                  country&apos;s primary launch site for polar and sun-synchronous orbits — the paths
                  used by most Earth-observation and reconnaissance satellites, along with a growing
                  share of Starlink launches. SpaceX flies Falcon 9 regularly from Space Launch
                  Complex 4E (SLC-4E), with additional pads supporting other providers.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Unlike Cape Canaveral, where rockets head east over the Atlantic, Vandenberg
                  launches fly south along the coastline — which means the trajectory itself is
                  part of the show, often visible for a long stretch up and down the California
                  coast rather than just near the pad.
                </p>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 text-sm">
                    <strong>Check the current schedule:</strong> launch dates and pads change
                    frequently. See what&apos;s flying next before you plan a trip.{' '}
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
                  Vandenberg has fewer purpose-built public viewing areas than Florida — most
                  viewing here happens from open beach access points and elevated roads around
                  Lompoc.
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
                    <h3 className="font-semibold text-white text-sm mb-1">Polar trajectory</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Rockets head south along the coast rather than out to sea, targeting polar
                      and sun-synchronous orbits — a visibly different arc than an eastward Florida
                      launch, and sometimes visible from far up and down the coastline.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">The marine layer</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Coastal fog is common, especially in early morning and evening. It can hide a
                      launch from beach-level spots even when the rocket clears it in seconds — an
                      elevated spot is your best backup.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Scrub odds</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      As with any launch, weather and technical holds can push the date. Treat a
                      posted date as tentative and check the schedule again the morning of your
                      visit.
                    </p>
                  </div>
                </div>
              </section>

              {/* Practical Tips */}
              <section id="tips">
                <h2 className="text-2xl font-bold text-white mb-4">Practical Tips</h2>
                <ul className="space-y-3">
                  {[
                    'Check the marine layer forecast, not just the launch weather — a clear inland day can still mean fog at the coast.',
                    'Arrive early for Surf Beach; parking is limited and the area can be closed by the base ahead of a launch for range safety.',
                    'Bring layers — the central California coast is cool and often windy, even in summer.',
                    'If the coast looks foggy, head to Harris Grade Road for an elevated view above the cloud deck.',
                    'Local Facebook groups and Lompoc-area viewing meetups are a good source of real-time closure and access updates.',
                    'Leave drones at home — restricted airspace around the base makes personal drone flights illegal near a launch.',
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
                  <Link href="/guide/watch-a-launch-cape-canaveral" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Cape Canaveral &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-starbase" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Starship Launch at Starbase &rarr;
                  </Link>
                  <Link href="/spaceports" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Spaceport Directory &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="watch-a-launch-vandenberg" />
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
                headline: 'Where to Watch a Rocket Launch at Vandenberg',
                description:
                  'The best public spots to watch a Vandenberg Space Force Base launch, what to expect, and practical viewing tips.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-08-14T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/watch-a-launch-vandenberg' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Watch a Launch at Vandenberg' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/watch-a-launch-vandenberg']} />
      </div>
    </div>
  );
}
