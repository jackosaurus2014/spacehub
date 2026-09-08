import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';
import { SITE_STATS } from '@/lib/site-stats';

// For educators (2026-09-08). Professors, teachers and students were named
// as a core audience but had no landing page: the site's four persona pages
// were all business-facing. Everything linked here is free and needs no
// account, because a classroom cannot sign thirty students up for anything.
export const metadata: Metadata = {
  title: 'Space Resources for Teachers, Professors and Students',
  description:
    'Free, no-account classroom resources: structured courses, a live satellite tracker, every upcoming launch with countdowns, embeddable widgets, a glossary, this-day-in-space history, and fact-checked explainers on Artemis, the ISS and the rockets flying this year.',
  keywords: ['space resources for teachers', 'space classroom resources', 'satellite tracker for students', 'space industry course free', 'rocket launch schedule classroom', 'space glossary', 'artemis lesson', 'embed launch countdown'],
  openGraph: {
    title: 'Space Resources for Teachers, Professors and Students',
    description: 'Free, no-account classroom resources: courses, a live satellite tracker, launch countdowns, embeddable widgets, a glossary and fact-checked explainers.',
    url: 'https://spacenexus.us/solutions/educators',
  },
  alternates: { canonical: 'https://spacenexus.us/solutions/educators' },
};

const PAIN_POINTS = [
  {
    title: 'Textbooks are years behind',
    description: 'The rocket count, the station plan and the launch prices in a printed text are out of date by the time it ships. Students notice. Everything here reads from live trackers or carries a visible "as of" date.',
  },
  {
    title: 'Real data sits behind logins',
    description: 'Most "live" space sites need an account before a student can see anything. Every resource on this page works without one, so a class of thirty can use it on the day.',
  },
  {
    title: 'Good explainers are scattered',
    description: 'A lesson on Artemis, the ISS or launch economics means stitching together press releases, Wikipedia and news. The guides here are written to be assigned, with sources and an FAQ each.',
  },
];

const FEATURES = [
  { name: 'Learning Zone', desc: 'Structured courses with lessons and progress tracking — from how orbits work to how the launch industry makes money. Free; progress saves with a free account if a student wants it.', href: '/learn' },
  { name: 'Live Satellite Tracker', desc: `Track ${SITE_STATS.satellites}+ objects in orbit with pass predictions for your school's location — the ISS overhead tonight, live, in a browser.`, href: '/satellites' },
  { name: 'Mission Control', desc: 'Every upcoming launch with countdowns, streams and where to watch. Put the next launch on the classroom screen.', href: '/mission-control' },
  { name: 'Embeddable widgets', desc: 'Drop a live launch countdown, the launch calendar or the cadence index into a course page or LMS with one iframe. No account, no key.', href: '/widgets' },
  { name: 'Glossary', desc: 'Plain-language definitions of the terms that come up in every space lesson — delta-v, GEO, rideshare, ITAR — each linked to where it matters on the site.', href: '/glossary' },
  { name: 'This day in space history', desc: 'What launched, landed or failed on today\'s date, for a two-minute class opener.', href: '/history' },
  { name: 'Which rockets are flying in 2026', desc: 'Every orbital rocket ranked by launches this year, live — a real dataset for a lesson on the launch market.', href: '/guide/rockets-flying-in-2026' },
  { name: 'When is Artemis III?', desc: 'The current plan, the crew, what has to happen first and a twelve-question FAQ — the Moon programme as it actually stands, not as the 2024 press releases had it.', href: '/guide/when-is-artemis-3' },
  { name: 'When does the ISS retire?', desc: 'The 2030 plan, the push to 2032, how you deorbit 430 tonnes, and where each replacement station stands, dated.', href: '/guide/when-does-the-iss-retire' },
  { name: 'What a launch costs', desc: 'List prices and cost per kilogram for every rocket, with live flight counts — the numbers behind any launch-economics assignment.', href: '/guide/space-launch-cost-comparison' },
  { name: 'Watch a launch in person', desc: 'Site-by-site viewing guides for Cape Canaveral, Vandenberg, Starbase, Wallops and Kourou — the field trip version.', href: '/guide/watch-a-launch' },
  { name: 'Space Tycoon', desc: 'A free economics strategy game: run a space company, buy launches, mine the belt, trade on a live market. Supply and demand you can feel rather than read about.', href: '/space-tycoon' },
];

const FAQ_ITEMS = [
  { question: 'Is any of this paid or account-gated?', answer: 'No. Every resource on this page is free and works without an account. A free account is only needed if a student wants to save Learning Zone progress or set launch alerts. The paid plan exists for business users and gates none of the educational material.' },
  { question: 'Can I embed a live countdown or calendar in my course page?', answer: 'Yes. The widgets page gives you a one-line iframe for a launch countdown, the live launch calendar, the launch-cadence index, space weather and more. They work in any LMS or website that allows iframes, need no key, and link back to the source data.' },
  { question: 'Where does the data come from, and can students cite it?', answer: 'Launch data comes from the Launch Library feed and our own tracker; satellite positions from public orbital elements (TLEs) propagated with SGP4; prices and company figures from public filings and published list prices, each dated on the page where it appears. Cite the page URL and the "as of" date shown; our guides list their sources at the bottom.' },
  { question: 'Is it suitable for school-age students?', answer: 'The trackers, glossary, history and launch pages are written for a general audience and carry no ads on educational guides. The business and investing sections assume more background. Space Tycoon is a strategy game with no real-money purchases that affect play.' },
  { question: 'Do you offer anything for a whole class or department?', answer: 'Not as a product — nothing here needs to be licensed. If you are building a course around SpaceNexus data or want a dataset in a particular shape, tell us through the contact page; several of our guides exist because a reader asked.' },
];

export default function EducatorsSolutionPage() {
  return (
    <div className="min-h-screen pb-16">
      <FAQSchema items={FAQ_ITEMS} />
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-6">
                For Teachers, Professors &amp; Students
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Live Space Data for the{' '}
                <span className="bg-gradient-to-r from-amber-300 to-cyan-400 bg-clip-text text-transparent">Classroom</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Courses, a live satellite tracker, every upcoming launch, embeddable widgets and fact-checked explainers &mdash; free, current, and usable by a class of thirty without a single sign-up.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/learn" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-cyan-500 text-black font-semibold hover:opacity-90 transition-opacity">
                  Open the Learning Zone
                </Link>
                <Link href="/mission-control" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.05] transition-colors">
                  Put the next launch on screen
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why space is hard to teach from a textbook</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">The industry changes faster than any print cycle, and the live sources are usually locked.</p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto" staggerDelay={0.12}>
            {PAIN_POINTS.map((point) => (
              <StaggerItem key={point.title}>
                <div className="rounded-2xl border border-white/[0.06] bg-black/50 backdrop-blur-sm p-6 h-full">
                  <h3 className="text-lg font-semibold text-white mb-2">{point.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{point.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white/[0.04]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything here is free and needs no account</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Twelve resources a lesson can be built on today.</p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" staggerDelay={0.06}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.name}>
                <Link href={feature.href} className="block rounded-2xl border border-white/[0.06] bg-black/50 p-6 h-full hover:border-amber-500/30 transition-colors group">
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-amber-300 transition-colors">{feature.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">Three lessons you can run this week</h2>
              <ol className="space-y-4">
                {[
                  { t: 'The ISS passes overhead', d: 'Open the satellite tracker, find the ISS, and read tonight\'s pass time for your town. Then the ISS-retirement guide: why it comes down in 2030, and what replaces it.', href: '/satellites' },
                  { t: 'Who is actually launching?', d: 'The rockets-flying-in-2026 scorecard as a dataset: rank, count, share. Ask why one vehicle carries most of the launches, then open the launch-cost guide for the price per kilogram behind it.', href: '/guide/rockets-flying-in-2026' },
                  { t: 'Run a space company', d: 'Space Tycoon for a class period: every student founds a corporation, buys a launch, watches a market move. Debrief on supply and demand with the game\'s own price charts.', href: '/space-tycoon' },
                ].map((l, i) => (
                  <li key={l.t} className="flex gap-4 rounded-2xl border border-white/[0.06] bg-black/50 p-5">
                    <span className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-center flex-shrink-0 tabular-nums" aria-hidden="true">{i + 1}</span>
                    <span><Link href={l.href} className="text-white font-semibold hover:text-amber-300">{l.t}</Link><span className="block text-slate-400 text-sm leading-relaxed mt-1">{l.d}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white/[0.04]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">Questions teachers ask</h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((f) => (
                  <div key={f.question} className="rounded-2xl border border-white/[0.06] bg-black/50 p-5">
                    <h3 className="text-base font-semibold text-white mb-2">{f.question}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="rounded-2xl border border-white/[0.06] bg-black/50 backdrop-blur-sm p-8 md:p-12">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Teaching with SpaceNexus?</h2>
                <p className="text-slate-400 text-lg mb-6 max-w-xl mx-auto">Tell us what you used and what was missing. Several guides on this site exist because a teacher asked for them.</p>
                <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] text-white/90 font-semibold hover:bg-white/[0.05] transition-colors">
                  Tell us what your class needs &rarr;
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl">
        <RelatedModules modules={getRelatedModules('solutions/educators')} />
      </div>
    </div>
  );
}
