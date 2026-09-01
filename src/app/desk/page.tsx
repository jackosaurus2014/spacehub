import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDesk, type DeskCompany, type DeskLaunch } from '@/lib/desk';
import Console from '@/components/ui/Console';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Provenance from '@/components/ui/Provenance';

// My Desk — the unified logged-in home (growth plan G6). One screen answering
// "what happened since my last visit?" across every watch silo: followed
// companies (through the company-brief engine), launch watches, unread
// notifications/alerts, and saved searches. The since-watermark advances on
// every load (src/lib/desk.ts).

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Desk | SpaceNexus',
  description: 'Your companies, launches, alerts and saved searches in one screen.',
  robots: { index: false },
};

// ── Small formatters (server-side, UTC-stable) ─────────────────────────────

function relTime(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

function fmtUtc(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return (
    d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

function fmtDateUtc(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function pipFor(status: string): PipState {
  switch (status) {
    case 'in_progress':
      return 'live';
    case 'completed':
      return 'flew';
    case 'failed':
    case 'scrubbed':
      return 'scrub';
    case 'tbd':
      return 'hold';
    default:
      return 'go';
  }
}

// ── Panel fragments ────────────────────────────────────────────────────────

const CHIP =
  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap transition-colors';

function BriefChips({ company }: { company: DeskCompany }) {
  const b = company.brief;
  if (!b) return null;
  const base = `/company-profiles/${company.slug}`;
  const chips: { label: string; href: string }[] = [];
  if (b.jobs > 0) chips.push({ label: `${b.jobs} job${b.jobs === 1 ? '' : 's'}`, href: `${base}?tab=jobs` });
  if (b.contracts > 0) chips.push({ label: `${b.contracts} contract${b.contracts === 1 ? '' : 's'}`, href: `${base}?tab=contracts` });
  if (b.funding > 0) chips.push({ label: `${b.funding} round${b.funding === 1 ? '' : 's'}`, href: `${base}?tab=financials` });
  if (b.filings > 0) chips.push({ label: `${b.filings} filing${b.filings === 1 ? '' : 's'}`, href: `${base}?tab=financials` });
  if (b.news > 0) chips.push({ label: `${b.news} news`, href: `${base}?tab=news` });
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Link
          key={c.href + c.label}
          href={c.href}
          className={`${CHIP} border-[rgba(34,211,238,.3)] text-[var(--signal)] hover:border-[rgba(34,211,238,.6)]`}
        >
          {c.label}
        </Link>
      ))}
    </span>
  );
}

function CompanyRow({ company }: { company: DeskCompany }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
      <Link
        href={`/company-profiles/${company.slug}`}
        className="font-mono text-[13px] font-medium text-[var(--ink)] hover:text-[var(--signal)]"
      >
        {company.name}
      </Link>
      {company.ticker && (
        <span className={`${CHIP} border-[var(--line)] text-[var(--ink-3)]`}>{company.ticker}</span>
      )}
      <BriefChips company={company} />
    </li>
  );
}

function LaunchRow({ launch }: { launch: DeskLaunch }) {
  return (
    <li className="border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href={`/launch/${launch.eventId}`}
          className="font-mono text-[13px] font-medium text-[var(--ink)] hover:text-[var(--signal)]"
        >
          {launch.name}
        </Link>
        <StatusPip state={pipFor(launch.status)} />
        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-3)]">{fmtUtc(launch.launchDate)}</span>
      </div>
      {launch.slip && launch.slip.days !== 0 && (
        <p className="mt-1 font-mono text-[11px]" style={{ color: launch.slip.days > 0 ? 'var(--caution)' : 'var(--go)' }}>
          {launch.slip.days > 0 ? `slipped +${launch.slip.days} day${launch.slip.days === 1 ? '' : 's'}` : `moved up ${-launch.slip.days} day${launch.slip.days === -1 ? '' : 's'}`}{' '}
          on {fmtDateUtc(launch.slip.observedAt)}
        </p>
      )}
    </li>
  );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)]">{children}</p>;
}

// ── The page ───────────────────────────────────────────────────────────────

export default async function DeskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/desk');
  }

  const desk = await getDesk(session.user.id, session.user.email);
  const now = new Date(desk.generatedAt);
  const active = desk.companies.list.filter((c) => !c.quiet);
  const quiet = desk.companies.list.filter((c) => c.quiet);
  const hasAnyWatch =
    desk.companies.total > 0 ||
    desk.launches.list.length > 0 ||
    desk.unread.total > 0 ||
    desk.searches.saved.length > 0 ||
    desk.searches.procurement.length > 0;

  return (
    <div className="min-h-screen bg-[var(--void)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header strip */}
        <header className="mb-6">
          <h1 className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">
            My Desk
          </h1>
          <p className="mt-2 font-mono text-[13px] leading-relaxed text-[var(--ink-2)]">
            Since your last visit ({relTime(desk.since, now)}):{' '}
            <span className="text-[var(--signal)] tabular-nums">{desk.totals.companyEvents}</span> company event{desk.totals.companyEvents === 1 ? '' : 's'}
            {' · '}
            <span className="text-[var(--signal)] tabular-nums">{desk.totals.launchUpdates}</span> launch update{desk.totals.launchUpdates === 1 ? '' : 's'}
            {' · '}
            <span className="text-[var(--signal)] tabular-nums">{desk.totals.unread}</span> unread
            {' · '}
            <span className="text-[var(--signal)] tabular-nums">{desk.totals.newMatches}</span> new match{desk.totals.newMatches === 1 ? '' : 'es'}
          </p>
        </header>

        {!hasAnyWatch ? (
          /* First-visit onboarding: never a blank page. */
          <Console title="Set up your desk" padded>
            <p className="font-mono text-[13px] leading-relaxed text-[var(--ink-2)]">
              Your desk fills itself from what you watch. Nothing is watched yet — start anywhere:
            </p>
            <ul className="mt-4 space-y-3 font-mono text-[13px]">
              <li>
                <Link href="/company-profiles" className="text-[var(--signal)] hover:underline">
                  Follow a company →
                </Link>
                <span className="ml-2 text-[var(--ink-3)]">new jobs, contracts, rounds, filings and news land here</span>
              </li>
              <li>
                <Link href="/mission-control" className="text-[var(--signal)] hover:underline">
                  Watch a launch →
                </Link>
                <span className="ml-2 text-[var(--ink-3)]">dates, slips and outcomes for missions you care about</span>
              </li>
              <li>
                <Link href="/alerts" className="text-[var(--signal)] hover:underline">
                  Set an alert →
                </Link>
                <span className="ml-2 text-[var(--ink-3)]">launch, regulatory and market alerts by email</span>
              </li>
              <li>
                <Link href="/procurement" className="text-[var(--signal)] hover:underline">
                  Save a contract search →
                </Link>
                <span className="ml-2 text-[var(--ink-3)]">new matching opportunities count up on your desk</span>
              </li>
            </ul>
          </Console>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Your companies — full width */}
            <Console
              title={`Your companies (${desk.companies.total})`}
              className="lg:col-span-2"
              padded={false}
              actions={
                <Link href="/company-profiles" className="font-mono text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                  directory →
                </Link>
              }
            >
              {desk.companies.error ? (
                <PanelEmpty>Company tracking is temporarily unavailable — the rest of the desk still works.</PanelEmpty>
              ) : desk.companies.total === 0 ? (
                <PanelEmpty>
                  No companies followed yet.{' '}
                  <Link href="/company-profiles" className="text-[var(--signal)] hover:underline">
                    Follow one from its profile page →
                  </Link>
                </PanelEmpty>
              ) : (
                <>
                  <ul>
                    {active.map((c) => (
                      <CompanyRow key={c.id} company={c} />
                    ))}
                  </ul>
                  {active.length === 0 && (
                    <PanelEmpty>All quiet — nothing new at your companies since your last visit.</PanelEmpty>
                  )}
                  {quiet.length > 0 && (
                    <details className="border-t border-[var(--line)]">
                      <summary className="cursor-pointer px-4 py-2.5 font-mono text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-2)]">
                        {quiet.length} quiet compan{quiet.length === 1 ? 'y' : 'ies'}
                      </summary>
                      <ul>
                        {quiet.map((c) => (
                          <CompanyRow key={c.id} company={c} />
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
              <div className="border-t border-[var(--line)] px-4 py-2">
                <Provenance source="SpaceNexus tracking — jobs, contracts, rounds, filings, tagged news" asOf={desk.generatedAt} />
              </div>
            </Console>

            {/* Launches you're watching */}
            <Console
              title="Launches you're watching"
              padded={false}
              actions={
                <Link href="/mission-control" className="font-mono text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                  mission control →
                </Link>
              }
            >
              {desk.launches.error ? (
                <PanelEmpty>Launch tracking is temporarily unavailable.</PanelEmpty>
              ) : desk.launches.list.length === 0 ? (
                <PanelEmpty>
                  No watched launches upcoming.{' '}
                  <Link href="/mission-control" className="text-[var(--signal)] hover:underline">
                    Watch one from its launch page →
                  </Link>
                </PanelEmpty>
              ) : (
                <ul>
                  {desk.launches.list.map((l) => (
                    <LaunchRow key={l.eventId} launch={l} />
                  ))}
                </ul>
              )}
              <div className="border-t border-[var(--line)] px-4 py-2">
                <Provenance source="Launch Library 2 via SpaceNexus sync" asOf={desk.generatedAt} />
              </div>
            </Console>

            {/* Unread */}
            <Console
              title={`Unread (${desk.unread.total})`}
              padded={false}
              actions={
                <Link href="/alerts" className="font-mono text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                  alerts →
                </Link>
              }
            >
              {desk.unread.error ? (
                <PanelEmpty>Unread items are temporarily unavailable.</PanelEmpty>
              ) : desk.unread.list.length === 0 ? (
                <PanelEmpty>Inbox zero — no unread notifications or alert deliveries.</PanelEmpty>
              ) : (
                <ul>
                  {desk.unread.list.map((u) => (
                    <li key={`${u.origin}-${u.id}`} className="border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
                      <Link href={u.href} className="group block">
                        <span className="flex items-baseline gap-2">
                          <span className={`${CHIP} shrink-0 border-[var(--line)] text-[var(--ink-3)]`}>
                            {u.origin === 'alert' ? 'ALERT' : 'NOTIF'}
                          </span>
                          <span className="font-mono text-[13px] text-[var(--ink)] group-hover:text-[var(--signal)]">
                            {u.title}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate pl-1 font-mono text-[11px] text-[var(--ink-3)]">
                          {u.message}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-[var(--line)] px-4 py-2">
                <Provenance source="SpaceNexus notifications and alert deliveries" asOf={desk.generatedAt} />
              </div>
            </Console>

            {/* Saved searches */}
            <Console
              title="Saved searches"
              padded={false}
              actions={
                <Link href="/procurement" className="font-mono text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                  screener →
                </Link>
              }
            >
              {desk.searches.error ? (
                <PanelEmpty>Saved searches are temporarily unavailable.</PanelEmpty>
              ) : desk.searches.saved.length === 0 && desk.searches.procurement.length === 0 ? (
                <PanelEmpty>
                  No saved searches with alerts.{' '}
                  <Link href="/procurement" className="text-[var(--signal)] hover:underline">
                    Save one from the contract screener →
                  </Link>
                </PanelEmpty>
              ) : (
                <ul>
                  {desk.searches.procurement.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
                      <Link href="/procurement" className="font-mono text-[13px] text-[var(--ink)] hover:text-[var(--signal)]">
                        {p.name}
                      </Link>
                      {p.newMatches > 0 ? (
                        <span className={`${CHIP} border-[rgba(255,197,61,.4)] text-[var(--caution)]`}>
                          {p.newMatches} new
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-[var(--ink-3)]">no new matches</span>
                      )}
                    </li>
                  ))}
                  {desk.searches.saved.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5 last:border-b-0">
                      <Link href={s.href} className="font-mono text-[13px] text-[var(--ink)] hover:text-[var(--signal)]">
                        {s.name}
                      </Link>
                      <span className="font-mono text-[11px] text-[var(--ink-3)]">{s.searchType.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-[var(--line)] px-4 py-2">
                <Provenance source="Your saved searches" asOf={desk.generatedAt} />
              </div>
            </Console>

            {/* Tickers strip — full width */}
            {desk.tickers.length > 0 && (
              <Console
                title="Tickers"
                className="lg:col-span-2"
                padded={false}
                actions={
                  <Link href="/space-stocks" className="font-mono text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                    space stocks →
                  </Link>
                }
              >
                <ul className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3">
                  {desk.tickers.map((t) => {
                    const up = (t.changePct ?? 0) > 0;
                    const flat = t.changePct == null || t.changePct === 0;
                    return (
                      <li key={t.ticker} className="font-mono text-[13px] tabular-nums">
                        <Link href={`/company-profiles/${t.slug}`} className="text-[var(--ink)] hover:text-[var(--signal)]">
                          {t.ticker}
                        </Link>{' '}
                        <span className="text-[var(--ink-2)]">{t.price != null ? `$${t.price.toFixed(2)}` : '—'}</span>{' '}
                        {t.changePct != null && (
                          <span style={{ color: flat ? 'var(--ink-3)' : up ? 'var(--go)' : 'var(--crit)' }}>
                            <span aria-hidden="true">{flat ? '─' : up ? '▲' : '▼'}</span> {Math.abs(t.changePct).toFixed(2)}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-[var(--line)] px-4 py-2">
                  <Provenance
                    source={desk.tickers.some((t) => t.live) ? 'Yahoo Finance (live)' : 'Yahoo Finance via daily sync'}
                    asOf={desk.tickers.some((t) => t.live) ? desk.generatedAt : null}
                  />
                </div>
              </Console>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
