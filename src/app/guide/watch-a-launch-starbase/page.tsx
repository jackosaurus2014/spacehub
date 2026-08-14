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
  title: 'Where to Watch a Starship Launch at Starbase',
  description:
    'The best public spots to watch a Starship test or launch at SpaceX Starbase in Boca Chica — Isla Blanca Park, Rocket Ranch, and South Padre Island — plus road closures explained.',
  keywords: [
    'watch a starship launch',
    'starbase launch viewing',
    'boca chica launch viewing',
    'isla blanca park starship',
    'south padre island rocket launch',
    'starbase road closures',
    'where to watch starship test',
    'rocket ranch boca chica',
  ],
  openGraph: {
    title: 'Where to Watch a Starship Launch at Starbase',
    description:
      'The best public spots to watch a Starship test or launch at SpaceX Starbase in Boca Chica — Isla Blanca Park, Rocket Ranch, and South Padre Island — plus road closures explained.',
    type: 'article',
    authors: ['SpaceNexus'],
    images: [
      {
        url: '/api/og?title=Watch+a+Starship+Launch+at+Starbase&subtitle=Best+public+viewing+spots%2C+road+closures%2C+and+what+to+expect&type=guide',
        width: 1200,
        height: 630,
        alt: 'Where to Watch a Starship Launch at Starbase',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where to Watch a Starship Launch at Starbase | SpaceNexus',
    description:
      'Best public spots to watch a Starship launch at Boca Chica, plus road closures and what to expect.',
    images: ['/api/og?title=Watch+a+Starship+Launch+at+Starbase&subtitle=Best+public+viewing+spots%2C+road+closures%2C+and+what+to+expect&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/watch-a-launch-starbase',
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
    name: 'Isla Blanca Park, South Padre Island',
    distance: '~6-7 mi across the bay',
    bestFor: 'The primary designated public viewing area for Starbase',
    cost: 'Park entry fee',
    notes:
      'The closest easy public access without entering the restricted closure zone. For high-profile test flights the county and local vendors have set up bleachers, food trucks, and organized viewing events here — arrive early since it draws large crowds for anticipated launches.',
  },
  {
    name: 'Rocket Ranch',
    distance: 'Near Starbase, along the approach road',
    bestFor: 'Enthusiasts planning to camp out for a multi-day test window',
    cost: 'Paid site / day-pass',
    notes:
      'A privately run RV park and viewing venue that has become a gathering point for space enthusiasts waiting out Starbase test campaigns, which can slip by days. Amenities and access vary — check current listings before booking.',
  },
  {
    name: 'South Padre Island beach & town',
    distance: '~6-8 mi',
    bestFor: 'A quieter, less crowded fallback with hotel and restaurant views',
    cost: 'Varies (free beach access, or a hotel/restaurant with a view)',
    notes:
      'Further from the pad than Isla Blanca Park but far less crowded, with plenty of places to watch from a hotel balcony or beachfront restaurant while waiting on a launch window.',
  },
  {
    name: 'Boca Chica Blvd / FM 3248 corridor',
    distance: 'Leads directly to the closure zone',
    bestFor: 'Not a viewing spot — this is the road that gets closed',
    cost: 'N/A',
    notes:
      'Cameron County, coordinating with SpaceX and the FAA, closes this road (and the beach it leads to) for static fires, tests, and launches — sometimes with only a day or two of notice, and closures can run well beyond the actual test window. Check the county\'s posted closure schedule before you drive toward Starbase itself.',
  },
  {
    name: '"The Village" (Bocachica Village)',
    distance: 'Adjacent to the launch site',
    bestFor: 'Not public viewing — most homes here were bought out by SpaceX',
    cost: 'N/A',
    notes:
      "This former residential area sits inside the closure zone during an active test or launch window, so it isn't accessible to the public at those times regardless of ownership status. It's mentioned here for context, not as a viewing option.",
  },
];

const FAQ_ITEMS = [
  {
    question: 'How far away can you see a Starship test from Boca Chica?',
    answer:
      "Starship is the largest rocket ever flown, so it's visible from a long way off — Isla Blanca Park on South Padre Island, roughly 6-7 miles across the bay, is the standard public vantage and gives a strong view of liftoff, the plume, and (for orbital-class flights) booster separation.",
  },
  {
    question: 'What happens if a test or launch scrubs?',
    answer:
      'It happens often, and sometimes more than once in a single campaign. Starship testing involves static fires, wet dress rehearsals, and launch attempts that can each scrub independently for weather, technical, or regulatory reasons. Road and beach closures are frequently issued and then rescheduled — always check the current closure status the day of your visit rather than planning around a single announced date.',
  },
  {
    question: 'Can I visit Starbase itself?',
    answer:
      "Starbase is an active SpaceX manufacturing and launch site, not a public visitor facility — there is no general public access to the site or the pad. Public viewing happens from outside the closure zone, primarily from Isla Blanca Park and South Padre Island.",
  },
  {
    question: 'Why do road closures happen even when nothing launches?',
    answer:
      'Cameron County closes Boca Chica Blvd and the beach for static fires, cryogenic proof tests, and wet dress rehearsals as well as actual launch attempts — any activity involving pressurized propellant carries the same safety rationale as a launch. That means a closure does not always mean a launch is imminent.',
  },
  {
    question: 'Is Starbase the same as SpaceX\'s other launch sites?',
    answer:
      "No. Starbase in Boca Chica, Texas is SpaceX's dedicated Starship development and launch site, separate from its Falcon 9/Falcon Heavy pads at Cape Canaveral and Vandenberg. SpaceX is also developing Starship infrastructure at Kennedy Space Center's LC-39A in Florida.",
  },
];

export default function WatchALaunchStarbasePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Where to Watch a Starship Launch at Starbase
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              SpaceX&apos;s Boca Chica launch site runs on an unpredictable test cadence, closes public
              roads on short notice, and has no general public access — here&apos;s how enthusiasts
              actually plan a trip to see Starship fly.
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
                  Starbase, in Boca Chica on the southernmost tip of the Texas coast near Brownsville,
                  is SpaceX&apos;s purpose-built development and launch site for Starship — the largest
                  rocket ever flown. Unlike a scheduled orbital launch out of Florida, Starbase runs
                  on a test-driven cadence: static fires, cryogenic proof tests, and launch attempts
                  that can slip by hours, days, or weeks depending on hardware readiness and
                  regulatory sign-off.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  There is no general public access to the launch site itself, and the roads leading
                  to it are closed by Cameron County for both actual launches and routine testing.
                  Public viewing centers on South Padre Island, across the bay from the pad.
                </p>
                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 text-sm">
                    <strong>Check the current schedule:</strong> Starbase test and launch windows
                    change constantly. Track flight history and what&apos;s planned next on the{' '}
                    <Link href="/starship" className="text-slate-300 underline hover:text-slate-300">
                      Starship tracker &rarr;
                    </Link>{' '}
                    or{' '}
                    <Link href="/mission-control" className="text-slate-300 underline hover:text-slate-300">
                      Mission Control &rarr;
                    </Link>{' '}
                    for the full manifest, and see the{' '}
                    <Link href="/guide/space-launch-schedule-2026" className="text-slate-300 underline hover:text-slate-300">
                      Space Launch Schedule guide &rarr;
                    </Link>{' '}
                    for context on the rest of the year.
                  </p>
                </div>
              </section>

              {/* Viewing Spots */}
              <section id="spots">
                <h2 className="text-2xl font-bold text-white mb-4">Best Viewing Spots</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Because the launch site itself is closed to the public, viewing at Starbase is
                  entirely about picking the right spot outside the closure zone — and understanding
                  which locations are viewing options versus which are simply part of the road that
                  gets shut down.
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
                    <h3 className="font-semibold text-white text-sm mb-1">Unpredictable cadence</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Starship&apos;s test-driven schedule slips far more often than a routine orbital
                      mission. Treat any announced date as a starting point, not a guarantee, and
                      build flexibility into your trip.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Road closures</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Cameron County closes the approach road and beach for static fires and
                      rehearsals as well as launches. A closure alone does not confirm a launch is
                      imminent — check the reason and current status before heading out.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">The scale of Starship</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      At roughly 400 feet tall with the most powerful booster ever flown, Starship
                      is visible and audible from much farther away than a Falcon 9 — Isla Blanca
                      Park&apos;s distance still delivers a strong show.
                    </p>
                  </div>
                </div>
              </section>

              {/* Practical Tips */}
              <section id="tips">
                <h2 className="text-2xl font-bold text-white mb-4">Practical Tips</h2>
                <ul className="space-y-3">
                  {[
                    'Plan a flexible, multi-day trip rather than flying in for a single announced date — test campaigns commonly slip.',
                    'Check Cameron County\'s posted road closure schedule the morning of your visit, not just the day before.',
                    'Isla Blanca Park draws large crowds for high-profile flights — arrive early or expect a long walk from parking.',
                    'Bring shade, water, and sun protection — South Texas summers are intense and viewing areas offer little cover.',
                    'A handheld radio or livestream on your phone helps you follow the countdown from outside cell range near the beach.',
                    'Leave drones at home — restricted airspace during a test or launch window makes personal drone flights illegal near Starbase.',
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
                  <Link href="/starship" className="btn-primary text-sm py-2 px-4">
                    Starship Tracker
                  </Link>
                  <Link href="/mission-control" className="btn-secondary text-sm py-2 px-4">
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
                  <Link href="/starship" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Starship Tracker &rarr;
                  </Link>
                  <Link href="/guide/space-launch-schedule-2026" className="text-slate-300 hover:text-white text-sm transition-colors">
                    2026 Space Launch Schedule &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-cape-canaveral" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Cape Canaveral &rarr;
                  </Link>
                  <Link href="/guide/watch-a-launch-vandenberg" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Where to Watch a Launch at Vandenberg &rarr;
                  </Link>
                  <Link href="/spaceports" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Spaceport Directory &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="watch-a-launch-starbase" />
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
                headline: 'Where to Watch a Starship Launch at Starbase',
                description:
                  'The best public spots to watch a Starship test or launch at SpaceX Starbase in Boca Chica, what to expect, and road closure guidance.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-08-14T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/watch-a-launch-starbase' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Watch a Starship Launch at Starbase' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/watch-a-launch-starbase']} />
      </div>
    </div>
  );
}
