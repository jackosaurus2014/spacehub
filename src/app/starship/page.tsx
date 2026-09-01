import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import DataFreshnessBadge from '@/components/ui/DataFreshnessBadge';
import NewsCard from '@/components/NewsCard';
import NewsletterSignup from '@/components/NewsletterSignup';
import { getStarshipNewsArticles } from '@/lib/starship-news';

// Live news rail re-queries every 15 minutes — matches the /artemis pattern.
export const revalidate = 900;

// ────────────────────────────────────────────────────────────────────────
// Flight history + program data
//
// Verified as of Aug 2026 (Google News RSS cross-checked against
// Space.com, Spaceflight Now, Reuters, Florida Today, and Ars Technica
// reporting):
//   - Flight 13 launched Jul 24, 2026 and deployed Starship's first
//     operational payload — next-generation Starlink V3 satellites.
//   - Both the Super Heavy booster and the Starship upper stage completed
//     controlled ocean splashdowns rather than tower catches; SpaceX
//     described the ship's landing as the program's "softest splashdown"
//     to date. Splashing down intact is not the same as full recovery,
//     though — as of Aug 11, 2026, SpaceX/Musk reported the floating ship
//     stage was proving difficult to recover from the Indian Ocean and
//     could still be lost.
//   - Flight 14 is NET Sep 15, 2026 (per NSF/COMPASS reporting; some
//     aggregators list Sep 30) — verified 2026-08-31. On the Aug 4 earnings
//     call Musk said Flight 14 will carry Starlink V3 satellites to an
//     operational orbit; on Aug 20 he walked back the first upper-stage
//     tower-catch to "probably ... in a few months", so whether Flight 14
//     attempts the ship catch is no longer firm (FAA sign-off also pending).
//   - A ship-to-ship propellant transfer demonstration remains targeted
//     for late 2026 — not yet flown as of this writing.
//   - Starship carries the Artemis III Human Landing System (HLS) role;
//     per NASA's Feb 2026 restructuring (see /artemis), Artemis III is now
//     an Earth-orbit docking demonstration NET late 2027, requiring an
//     uncrewed Starship HLS lunar demo landing first.
//   - Earlier flights (IFT-1 through Flight 12, Apr 2023 onward)
//     progressively proved out launch, stage separation, booster
//     "chopstick" tower catches, and Raptor engine reliability — summarized
//     below as a single test-campaign entry rather than itemized, since
//     per-flight outcomes that far back aren't independently re-verified
//     for this tracker.
// ────────────────────────────────────────────────────────────────────────

type FlightStatus = 'complete' | 'in-progress' | 'upcoming' | 'future';

interface FlightEntry {
  id: string;
  label: string;
  title: string;
  date: string;
  status: FlightStatus;
  description: string;
}

const FLIGHT_HISTORY: FlightEntry[] = [
  {
    id: 'early-test-era',
    label: 'IFT-1 – Flight 12',
    title: 'Orbital flight test campaign',
    date: 'Apr 2023 – 2025',
    status: 'complete',
    description:
      'Starship’s early integrated flight tests progressively proved out launch, hot-staging separation, Super Heavy "chopstick" tower catches, and Raptor engine reliability — moving the vehicle from expendable test articles toward a reusable, operational design ahead of its first revenue payload.',
  },
  {
    id: 'flight-13',
    label: 'Flight 13',
    title: 'First operational payload — Starlink V3 deployment',
    date: 'Jul 24, 2026 — complete',
    status: 'complete',
    description:
      'Starship carried its first operational payload: a batch of next-generation Starlink V3 satellites, deployed successfully on orbit. Both the Super Heavy booster and the Starship upper stage completed controlled ocean splashdowns — SpaceX called the ship’s landing the program’s "softest splashdown" yet. Recovery of the floating ship stage from the Indian Ocean afterward proved difficult; as of Aug 11, 2026 SpaceX had not confirmed it was salvaged.',
  },
  {
    id: 'flight-14',
    label: 'Flight 14',
    title: 'Starlink V3 to operational orbit — ship catch under review',
    date: 'NET Sep 15, 2026',
    status: 'upcoming',
    description:
      'SpaceX is targeting Flight 14 — NET Sep 15, 2026 per launch-schedule reporting — to carry Starlink V3 satellites to an operational orbit. The program’s first attempt at catching the Starship upper stage with the launch tower’s "chopstick" arms was originally planned for this flight, but on Aug 20 Musk said the ship catch would "probably" come a few months later, and it still needs FAA sign-off.',
  },
];

interface ProgramRole {
  id: string;
  title: string;
  status: FlightStatus;
  detail: string;
  href?: string;
  linkLabel?: string;
}

const PROGRAM_ROLES: ProgramRole[] = [
  {
    id: 'starlink-v3',
    title: 'Starlink V3 Deployment',
    status: 'in-progress',
    detail:
      'Starship’s first operational cargo role: deploying next-generation Starlink V3 satellites, which are too large for Falcon 9’s fairing. Began with Flight 13 (Jul 24, 2026); cadence still ramping as tower-catch reliability improves.',
  },
  {
    id: 'artemis-hls',
    title: 'Artemis III HLS (Human Landing System)',
    status: 'in-progress',
    detail:
      'Starship HLS is the crewed lunar lander for NASA’s Artemis program. Restructured Feb 2026: Artemis III is now an Earth-orbit docking demonstration, NET late 2027, and requires an uncrewed Starship HLS lunar demo landing first.',
    href: '/artemis',
    linkLabel: 'Full Artemis Program Tracker',
  },
  {
    id: 'propellant-transfer',
    title: 'Propellant Transfer Demonstration',
    status: 'upcoming',
    detail:
      'A ship-to-ship orbital propellant transfer demo — required to give a lunar-bound Starship HLS enough fuel margin for Artemis missions — remains targeted for late 2026. Not yet flown as of this writing; NASA has funded the milestone since 2020.',
  },
  {
    id: 'mars-ambitions',
    title: 'Mars Ambitions',
    status: 'future',
    detail:
      'SpaceX’s stated long-term goal is uncrewed, Mars-bound Starship missions timed to a launch window later this decade. No committed launch date exists yet — treated here as a directional ambition, not a scheduled mission.',
  },
];

const STATUS_STYLES: Record<FlightStatus, { label: string; badge: string; dot: string }> = {
  complete: { label: 'COMPLETE', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  'in-progress': { label: 'IN PROGRESS', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  upcoming: { label: 'UPCOMING', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
  future: { label: 'FUTURE', badge: 'bg-white/10 text-slate-300 border-white/10', dot: 'bg-slate-400' },
};

function StatusPill({ status }: { status: FlightStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export default async function StarshipTrackerPage() {
  let articles: Awaited<ReturnType<typeof getStarshipNewsArticles>> = [];
  try {
    articles = await getStarshipNewsArticles(12);
  } catch {
    articles = [];
  }
  const lastUpdated = articles[0]?.publishedAt ?? null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        {/* ═══════ Hero ═══════ */}
        <section className="pt-8 pb-6 max-w-4xl mx-auto">
          <Breadcrumbs items={[{ label: 'Starship Program Tracker' }]} />

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              OPERATIONAL — FLIGHT 13 COMPLETE
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
              FLIGHT 14 IN DEVELOPMENT
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 leading-tight">
            Starship Program Tracker
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-6">
            SpaceX&apos;s Starship, tracked live: flight history through Flight 13&apos;s first operational Starlink
            V3 deployment, program roles spanning Starlink, Artemis, propellant transfer, and Mars, and a
            continuously-updating feed of Starship-related news — refreshed automatically as new coverage
            publishes.
          </p>

          {/* NET framing — static label, no fake ticking clock. Mirrors the
              honest NET pattern used by /artemis and Mission Control's
              Featured Mission card: a firm countdown implies a firm date
              SpaceX hasn't committed to publicly. */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 p-6 sm:p-8 mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">
                    Next Milestone
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                    NET — Date Not Firm
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-2">
                  Flight 14 — Starlink V3 to Operational Orbit
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-xl">
                  The first flight carrying Starlink V3 satellites to an operational orbit. A first-ever
                  upper-stage tower catch was planned for this flight, but Musk now says the ship catch will
                  &quot;probably&quot; come a few months later — it is no longer confirmed for Flight 14.
                </p>
              </div>
              <div className="shrink-0 text-center lg:text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-medium">No Earlier Than</div>
                <div className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-white">NET Sep 15, 2026</div>
                <a
                  href="#roles"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Full program roles
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3">
            <a
              href="#history"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Flight History
            </a>
            <a
              href="#roles"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Program Roles
            </a>
            <a
              href="#news"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Latest News
            </a>
          </div>

          {/* Program trackers cross-link */}
          <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-medium">Program Trackers:</span>
            <Link
              href="/starship"
              aria-current="page"
              className="px-2.5 py-1 rounded-full bg-white/[0.08] text-white font-medium border border-white/[0.1]"
            >
              Starship
            </Link>
            <Link
              href="/artemis"
              className="px-2.5 py-1 rounded-full bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.06] font-medium border border-white/[0.06] transition-colors"
            >
              Artemis
            </Link>
          </div>
        </section>

        {/* ═══════ Flight History ═══════ */}
        <section id="history" className="max-w-4xl mx-auto py-8 scroll-mt-20">
          <h2 className="text-xl font-bold text-white mb-1">Flight History</h2>
          <p className="text-slate-400 text-sm mb-6">
            From the early orbital test campaign to Flight 13&apos;s first operational payload and beyond.
          </p>

          <ol className="space-y-4">
            {FLIGHT_HISTORY.map((flight) => (
              <li key={flight.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">{flight.label}</span>
                    <StatusPill status={flight.status} />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{flight.date}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{flight.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{flight.description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══════ Program Roles ═══════ */}
        <section id="roles" className="max-w-4xl mx-auto py-8 scroll-mt-20">
          <h2 className="text-xl font-bold text-white mb-1">Program Roles</h2>
          <p className="text-slate-400 text-sm mb-6">
            Starship is a single vehicle carrying four distinct missions at once — each on its own timeline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROGRAM_ROLES.map((role) => (
              <div key={role.id} className="card-data p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="card-data__label">{role.title}</span>
                  <StatusPill status={role.status} />
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-2">{role.detail}</p>
                {role.href && (
                  <Link
                    href={role.href}
                    className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    {role.linkLabel}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ Live News Rail ═══════ */}
        <section id="news" className="max-w-6xl mx-auto py-8 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-xl font-bold text-white">Latest Starship News</h2>
            <DataFreshnessBadge
              lastUpdated={lastUpdated}
              source="SpaceX + industry feeds"
              refreshInterval="every 15 min"
              variant="pill"
            />
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Every Starship, Super Heavy, and Raptor engine story from our live news feed — no manual curation,
            updated automatically as coverage publishes.
          </p>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article, i) => (
                <NewsCard key={article.id} article={article} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-slate-400 text-sm mb-3">
                No Starship-related stories in the current feed window — check the full news search instead.
              </p>
              <Link href="/news?search=starship" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                Search all Starship coverage →
              </Link>
            </div>
          )}
        </section>

        {/* ═══════ Follow CTAs ═══════ */}
        <section className="max-w-4xl mx-auto py-8">
          <NewsletterSignup variant="cta" source="starship-tracker" />
          <div className="text-center mt-6 flex flex-col items-center gap-2">
            <Link
              href="/news?search=starship"
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Browse all Starship coverage in Space News
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/artemis"
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Also tracking: Artemis Program Tracker
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
