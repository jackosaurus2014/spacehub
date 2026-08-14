import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import DataFreshnessBadge from '@/components/ui/DataFreshnessBadge';
import NewsCard from '@/components/NewsCard';
import NewsletterSignup from '@/components/NewsletterSignup';
import { getArtemisNewsArticles } from '@/lib/artemis-news';

// Live news rail re-queries every 15 minutes — cheap enough for a page this
// central, and frequent enough that "daily if there's fresh news" (the
// founder's ask) is comfortably covered without any manual upkeep.
export const revalidate = 900;

// ────────────────────────────────────────────────────────────────────────
// Mission timeline data
// Verified as of Aug 2026: Artemis II flew successfully Apr 1-10, 2026.
// Artemis III was restructured Feb 2026 from a lunar landing to an
// Earth-orbit demonstration docking Orion with the SpaceX Starship HLS and
// Blue Origin Blue Moon landers, NET (No Earlier Than) late 2027; crew
// (incl. ESA's Luca Parmitano) announced Jun 9, 2026. Artemis IV carries
// the first crewed lunar landing since Apollo 17, targeted 2028.
// ────────────────────────────────────────────────────────────────────────

type MissionStatus = 'complete' | 'in-progress' | 'upcoming' | 'future';

interface MissionEntry {
  id: string;
  label: string;
  title: string;
  date: string;
  status: MissionStatus;
  description: string;
  href?: string;
  linkLabel?: string;
}

const MISSION_TIMELINE: MissionEntry[] = [
  {
    id: 'artemis-i',
    label: 'Artemis I',
    title: 'Uncrewed test flight around the Moon',
    date: 'Nov-Dec 2022',
    status: 'complete',
    description:
      'The first integrated flight of SLS and Orion — a 25-day uncrewed mission that sent Orion around the Moon and back, proving the launch vehicle and spacecraft ahead of putting a crew aboard.',
  },
  {
    id: 'artemis-ii',
    label: 'Artemis II',
    title: 'Crewed lunar flyby',
    date: 'Apr 1-10, 2026 — complete',
    status: 'complete',
    description:
      'The first crewed mission beyond low Earth orbit since Apollo 17. Astronauts Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen flew around the Moon aboard Orion and returned safely to Earth.',
    href: '/live/artemis-ii-blog',
    linkLabel: 'Read the full live-blog archive',
  },
  {
    id: 'artemis-iii',
    label: 'Artemis III',
    title: 'Earth-orbit HLS demonstration (restructured)',
    date: 'NET Late 2027',
    status: 'in-progress',
    description:
      'Restructured by NASA in Feb 2026: instead of an immediate lunar landing, Orion will dock in Earth orbit with commercial human landing systems from SpaceX (Starship HLS) and Blue Origin (Blue Moon), rehearsing rendezvous and crew transfer ahead of Artemis IV\'s landing. Crew — including ESA astronaut Luca Parmitano — announced Jun 9, 2026.',
  },
  {
    id: 'artemis-iv',
    label: 'Artemis IV',
    title: 'First crewed lunar landing since Apollo 17',
    date: '~2028 (planned)',
    status: 'upcoming',
    description:
      'The landing originally planned for Artemis III moves here: a crew descends to the lunar south pole aboard the SpaceX Starship HLS, delivering the first boots on the Moon in over half a century. Also the first Gateway-era mission, docking with the lunar space station.',
  },
  {
    id: 'artemis-v-plus',
    label: 'Artemis V+',
    title: 'Sustained lunar presence & Gateway build-out',
    date: '2029 and beyond',
    status: 'future',
    description:
      'Later Artemis missions add international partner contributions — a pressurized rover (JAXA), surface habitats (Blue Origin), and additional Gateway modules (ESA, CSA, ASI) — working toward a permanent human presence at the lunar south pole.',
  },
];

interface HardwareMilestone {
  id: string;
  title: string;
  status: MissionStatus;
  detail: string;
}

const ARTEMIS_III_MILESTONES: HardwareMilestone[] = [
  {
    id: 'crew-announced',
    title: 'Crew announced',
    status: 'complete',
    detail: 'Jun 9, 2026 — includes ESA astronaut Luca Parmitano, NASA\'s first non-U.S. crew assignment on an Artemis mission.',
  },
  {
    id: 'sls-stacking',
    title: 'SLS core stage stacking',
    status: 'in-progress',
    detail: 'Underway at Kennedy Space Center as of Aug 2026, with milestones through the summer.',
  },
  {
    id: 'orion-integration',
    title: 'Orion crew module integration',
    status: 'in-progress',
    detail: 'Crew module and service module integration proceeding in parallel with SLS stacking.',
  },
  {
    id: 'starship-hls-demo',
    title: 'Starship HLS uncrewed demo landing',
    status: 'upcoming',
    detail: 'SpaceX must complete an uncrewed Starship HLS lunar demonstration before the crewed docking rehearsal.',
  },
  {
    id: 'blue-moon-milestone',
    title: 'Blue Moon lander development',
    status: 'upcoming',
    detail: 'Blue Origin continues Blue Moon MK1/MK2 milestones toward its own HLS docking demonstration.',
  },
];

const STATUS_STYLES: Record<MissionStatus, { label: string; badge: string; dot: string }> = {
  complete: { label: 'COMPLETE', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  'in-progress': { label: 'IN PROGRESS', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  upcoming: { label: 'UPCOMING', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
  future: { label: 'FUTURE', badge: 'bg-white/10 text-slate-300 border-white/10', dot: 'bg-slate-400' },
};

function StatusPill({ status }: { status: MissionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export default async function ArtemisTrackerPage() {
  let articles: Awaited<ReturnType<typeof getArtemisNewsArticles>> = [];
  try {
    articles = await getArtemisNewsArticles(12);
  } catch {
    articles = [];
  }
  const lastUpdated = articles[0]?.publishedAt ?? null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        {/* ═══════ Hero ═══════ */}
        <section className="pt-8 pb-6 max-w-4xl mx-auto">
          <Breadcrumbs items={[{ label: 'Artemis Program Tracker' }]} />

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              ARTEMIS II COMPLETE
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
              ARTEMIS III IN DEVELOPMENT
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 leading-tight">
            Artemis Program Tracker
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-6">
            NASA&apos;s return-to-the-Moon program, tracked live: the full mission timeline, Artemis III&apos;s
            restructured Earth-orbit demonstration, hardware milestones, and a continuously-updating feed of
            Artemis-related news — refreshed automatically as new coverage publishes.
          </p>

          {/* NET framing — static label, no fake ticking clock. Mirrors the
              honest NET pattern used by Mission Control's Featured Mission
              card: a firm countdown implies a firm date NASA hasn't set. */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 p-6 sm:p-8 mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full">
                    Next Mission
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                    NET — Date Not Firm
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-2">
                  Artemis III — Earth-Orbit HLS Demonstration
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-xl">
                  Orion docks with SpaceX Starship HLS and Blue Origin Blue Moon in Earth orbit, rehearsing
                  crew transfer ahead of Artemis IV&apos;s lunar landing.
                </p>
              </div>
              <div className="shrink-0 text-center lg:text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-medium">No Earlier Than</div>
                <div className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-white">NET Late 2027</div>
                <Link
                  href="/ignition"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Full program milestones
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3">
            <a
              href="#timeline"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Mission Timeline
            </a>
            <a
              href="#news"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Latest News
            </a>
            <Link
              href="/live/artemis-ii-blog"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]"
            >
              Artemis II Archive
            </Link>
          </div>
        </section>

        {/* ═══════ Mission Timeline ═══════ */}
        <section id="timeline" className="max-w-4xl mx-auto py-8 scroll-mt-20">
          <h2 className="text-xl font-bold text-white mb-1">Mission Timeline</h2>
          <p className="text-slate-400 text-sm mb-6">Artemis I through the long-horizon Moon program.</p>

          <ol className="space-y-4">
            {MISSION_TIMELINE.map((mission) => (
              <li key={mission.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">{mission.label}</span>
                    <StatusPill status={mission.status} />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{mission.date}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{mission.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{mission.description}</p>

                {mission.href && (
                  <Link
                    href={mission.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    {mission.linkLabel}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                )}

                {mission.id === 'artemis-iii' && (
                  <div className="mt-5 pt-5 border-t border-white/[0.06]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                      Hardware &amp; readiness milestones
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ARTEMIS_III_MILESTONES.map((m) => (
                        <div key={m.id} className="card-data">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="card-data__label">{m.title}</span>
                            <StatusPill status={m.status} />
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{m.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ═══════ Live News Rail ═══════ */}
        <section id="news" className="max-w-6xl mx-auto py-8 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-xl font-bold text-white">Latest Artemis News</h2>
            <DataFreshnessBadge
              lastUpdated={lastUpdated}
              source="NASA + industry feeds"
              refreshInterval="every 15 min"
              variant="pill"
            />
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Every Artemis, Orion, Starship HLS, and Blue Moon story from our live news feed — no manual curation,
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
                No Artemis-related stories in the current feed window — check the full news search instead.
              </p>
              <Link href="/news?search=artemis" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                Search all Artemis coverage →
              </Link>
            </div>
          )}
        </section>

        {/* ═══════ Follow CTAs ═══════ */}
        <section className="max-w-4xl mx-auto py-8">
          <NewsletterSignup variant="cta" source="artemis-tracker" />
          <div className="text-center mt-6">
            <Link
              href="/news?search=artemis"
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Browse all Artemis coverage in Space News
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
