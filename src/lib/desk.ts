/**
 * My Desk — the unified logged-in home (growth plan G6).
 *
 * One composition, `getDesk(userId, email)`, gathers everything the signed-in
 * user is watching across the site's watch silos and answers a single
 * question: "what happened since my last visit?"
 *
 *  (a) companies — CompanyWatchlistItem ∪ CompanyFollow ∪ CompanyWatch (by
 *      email), deduped, hydrated, each run through the company-brief engine
 *      (src/lib/company-brief.ts) against the since-watermark. Companies with
 *      an empty brief stay listed but are flagged `quiet`.
 *  (b) launches — LaunchWatch scopes resolved to upcoming SpaceEvents via the
 *      launch-watch matcher, plus LaunchDateChange slips since the watermark.
 *  (c) unread — Notification(read:false) ∪ AlertDelivery(readAt:null), merged.
 *  (d) saved searches — SavedSearch(alertEnabled) + SavedProcurementSearch
 *      with their isNew match counts.
 *  (e) tickers — live quotes for the watched companies' tickers, with the DB
 *      snapshot as fallback when Yahoo is slow or down.
 *
 * The since-watermark is User.lastDeskVisitAt (default 7 days back, capped at
 * 30) and is only advanced AFTER the desk composes — a crash never eats a
 * visit's delta. Every section is individually try-caught: one dead silo
 * degrades that panel, never the desk.
 *
 * All dates cross the wire as ISO strings (the page and /api/desk share this
 * shape).
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { collectCompanyBrief, briefIsEmpty } from '@/lib/company-brief';
import { watchMatchesEvent, type WatchLike, type EventLike } from '@/lib/launch-watch';
import { getLiveQuotesBatch } from '@/lib/stock-quote';

export const DESK_DEFAULT_WINDOW_MS = 7 * 24 * 3600_000;
export const DESK_MAX_WINDOW_MS = 30 * 24 * 3600_000;
/** Company briefs are composed for at most this many watched companies per load. */
export const DESK_BRIEF_CAP = 8;
const UNREAD_TAKE = 8;
const LAUNCH_TAKE = 10;
const QUOTE_TIMEOUT_MS = 3000;

// ── Shapes ─────────────────────────────────────────────────────────────────

export interface DeskCompanyBrief {
  jobs: number;
  contracts: number;
  funding: number;
  filings: number;
  news: number;
}

export interface DeskCompany {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  stockPrice: number | null;
  priceChange24h: number | null;
  /** True when nothing happened since the watermark (or the brief was not composed — past the cap). */
  quiet: boolean;
  brief: DeskCompanyBrief | null;
}

export interface DeskLaunch {
  eventId: string;
  name: string;
  launchDate: string | null;
  status: string;
  rocket: string | null;
  location: string | null;
  /** Most recent date change since the watermark, when one exists. */
  slip: { days: number; observedAt: string } | null;
}

export interface DeskUnreadItem {
  id: string;
  origin: 'notification' | 'alert';
  title: string;
  message: string;
  createdAt: string;
  href: string;
}

export interface DeskSavedSearch {
  id: string;
  name: string;
  searchType: string;
  href: string;
}

export interface DeskProcurementSearch {
  id: string;
  name: string;
  newMatches: number;
}

export interface DeskTicker {
  ticker: string;
  name: string;
  slug: string;
  price: number | null;
  changePct: number | null;
  live: boolean;
}

export interface DeskData {
  since: string;
  generatedAt: string;
  /** Visit count BEFORE this visit was recorded (0 on the first ever visit). */
  visitCount: number;
  totals: {
    companyEvents: number;
    launchUpdates: number;
    unread: number;
    newMatches: number;
  };
  companies: { list: DeskCompany[]; total: number; error: boolean };
  launches: { list: DeskLaunch[]; error: boolean };
  unread: { list: DeskUnreadItem[]; total: number; error: boolean };
  searches: {
    saved: DeskSavedSearch[];
    procurement: DeskProcurementSearch[];
    error: boolean;
  };
  tickers: DeskTicker[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SEARCH_TYPE_HREF: Record<string, string> = {
  company_directory: '/company-profiles',
  marketplace_listings: '/marketplace',
  marketplace_rfqs: '/marketplace?tab=rfqs',
  space_jobs: '/jobs',
};

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function briefCounts(b: Awaited<ReturnType<typeof collectCompanyBrief>>): DeskCompanyBrief {
  return {
    jobs: b.jobs.count,
    contracts: b.contracts.length,
    funding: b.funding.length,
    filings: b.filings.length,
    news: b.news.length,
  };
}

function briefTotal(b: DeskCompanyBrief): number {
  return b.jobs + b.contracts + b.funding + b.filings + b.news;
}

// ── Section collectors (each fully self-contained and try-caught) ──────────

async function collectCompanies(
  userId: string,
  email: string | null | undefined,
  since: Date
): Promise<{ list: DeskCompany[]; total: number; error: boolean }> {
  try {
    const normalizedEmail = email?.trim().toLowerCase() || null;
    // Three silos in parallel; a failed silo contributes nothing rather than
    // sinking the section.
    const [watchlist, follows, watches] = await Promise.all([
      prisma.companyWatchlistItem
        .findMany({ where: { userId }, select: { companyProfileId: true } })
        .catch(() => [] as { companyProfileId: string }[]),
      prisma.companyFollow
        .findMany({ where: { userId }, select: { companyId: true } })
        .catch(() => [] as { companyId: string }[]),
      normalizedEmail
        ? prisma.companyWatch
            .findMany({
              where: { email: normalizedEmail, verified: true, unsubscribedAt: null },
              select: { companyProfileId: true },
            })
            .catch(() => [] as { companyProfileId: string }[])
        : Promise.resolve([] as { companyProfileId: string }[]),
    ]);

    const ids = Array.from(
      new Set([
        ...watchlist.map((w) => w.companyProfileId),
        ...follows.map((f) => f.companyId),
        ...watches.map((w) => w.companyProfileId),
      ])
    );
    if (ids.length === 0) return { list: [], total: 0, error: false };

    const profiles = await prisma.companyProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, name: true, ticker: true, stockPrice: true, priceChange24h: true },
      orderBy: { name: 'asc' },
    });

    // Compose briefs for the first DESK_BRIEF_CAP companies; the rest are
    // listed quiet (their delta is one click away on the profile page).
    const list: DeskCompany[] = await Promise.all(
      profiles.map(async (p, i): Promise<DeskCompany> => {
        const base: DeskCompany = {
          id: p.id,
          slug: p.slug,
          name: p.name,
          ticker: p.ticker ?? null,
          stockPrice: p.stockPrice ?? null,
          priceChange24h: p.priceChange24h ?? null,
          quiet: true,
          brief: null,
        };
        if (i >= DESK_BRIEF_CAP) return base;
        try {
          const brief = await collectCompanyBrief(p.id, since);
          if (briefIsEmpty(brief)) return base;
          return { ...base, quiet: false, brief: briefCounts(brief) };
        } catch {
          return base;
        }
      })
    );

    // Active companies first, alphabetical within each partition.
    list.sort((a, b) => Number(a.quiet) - Number(b.quiet) || a.name.localeCompare(b.name));
    return { list, total: profiles.length, error: false };
  } catch (err) {
    logger.error('[desk] companies section failed', { error: err instanceof Error ? err.message : String(err) });
    return { list: [], total: 0, error: true };
  }
}

async function collectLaunches(
  email: string | null | undefined,
  since: Date,
  now: Date
): Promise<{ list: DeskLaunch[]; slipCount: number; error: boolean }> {
  try {
    const normalizedEmail = email?.trim().toLowerCase() || null;
    if (!normalizedEmail) return { list: [], slipCount: 0, error: false };

    const watches = (await prisma.launchWatch.findMany({
      where: { email: normalizedEmail, verified: true, unsubscribedAt: null },
      select: { id: true, email: true, eventId: true, rocket: true, site: true, unsubscribeToken: true },
    })) as WatchLike[];
    if (watches.length === 0) return { list: [], slipCount: 0, error: false };

    // Upcoming (and just-flown) events the watches could match. 12h grace so
    // a launch that just flew still shows on the desk.
    const events = (await prisma.spaceEvent.findMany({
      where: { launchDate: { gte: new Date(now.getTime() - 12 * 3600_000) } },
      orderBy: { launchDate: 'asc' },
      take: 500,
      select: { id: true, name: true, rocket: true, location: true, agency: true, launchDate: true, status: true, mission: true },
    })) as EventLike[];

    const matched = new Map<string, EventLike>();
    for (const e of events) {
      if (matched.size >= LAUNCH_TAKE) break;
      if (watches.some((w) => watchMatchesEvent(w, e))) matched.set(e.id, e);
    }
    if (matched.size === 0) return { list: [], slipCount: 0, error: false };

    const changes = await prisma.launchDateChange
      .findMany({
        where: { eventId: { in: Array.from(matched.keys()) }, observedAt: { gte: since } },
        orderBy: { observedAt: 'desc' },
        select: { eventId: true, fromDate: true, toDate: true, observedAt: true },
      })
      .catch(() => [] as { eventId: string; fromDate: Date; toDate: Date; observedAt: Date }[]);

    // Latest change per event decides the slip line.
    const slipByEvent = new Map<string, { days: number; observedAt: string }>();
    for (const c of changes) {
      if (slipByEvent.has(c.eventId)) continue;
      const days = Math.round((c.toDate.getTime() - c.fromDate.getTime()) / 86400_000);
      slipByEvent.set(c.eventId, { days, observedAt: c.observedAt.toISOString() });
    }

    const list: DeskLaunch[] = Array.from(matched.values()).map((e) => ({
      eventId: e.id,
      name: e.name,
      launchDate: iso(e.launchDate),
      status: e.status,
      rocket: e.rocket,
      location: e.location,
      slip: slipByEvent.get(e.id) ?? null,
    }));
    return { list, slipCount: changes.length, error: false };
  } catch (err) {
    logger.error('[desk] launches section failed', { error: err instanceof Error ? err.message : String(err) });
    return { list: [], slipCount: 0, error: true };
  }
}

async function collectUnread(
  userId: string
): Promise<{ list: DeskUnreadItem[]; total: number; error: boolean }> {
  try {
    const [notifications, deliveries, notifCount, deliveryCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: UNREAD_TAKE,
        select: { id: true, title: true, message: true, linkUrl: true, createdAt: true },
      }),
      prisma.alertDelivery.findMany({
        where: { userId, readAt: null },
        orderBy: { createdAt: 'desc' },
        take: UNREAD_TAKE,
        select: { id: true, title: true, message: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.alertDelivery.count({ where: { userId, readAt: null } }),
    ]);

    const merged: DeskUnreadItem[] = [
      ...notifications.map((n) => ({
        id: n.id,
        origin: 'notification' as const,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
        // No /notifications page exists — a notification carries its own link.
        href: n.linkUrl || '/community',
      })),
      ...deliveries.map((d) => ({
        id: d.id,
        origin: 'alert' as const,
        title: d.title,
        message: d.message,
        createdAt: d.createdAt.toISOString(),
        href: '/alerts',
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, UNREAD_TAKE);

    return { list: merged, total: notifCount + deliveryCount, error: false };
  } catch (err) {
    logger.error('[desk] unread section failed', { error: err instanceof Error ? err.message : String(err) });
    return { list: [], total: 0, error: true };
  }
}

async function collectSearches(
  userId: string
): Promise<{ saved: DeskSavedSearch[]; procurement: DeskProcurementSearch[]; newMatches: number; error: boolean }> {
  try {
    const [saved, procurement] = await Promise.all([
      prisma.savedSearch.findMany({
        where: { userId, alertEnabled: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, searchType: true },
      }),
      prisma.savedProcurementSearch.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true },
      }),
    ]);

    let matchCounts: { searchId: string; _count: number }[] = [];
    if (procurement.length > 0) {
      const grouped = await prisma.savedSearchMatch
        .groupBy({
          by: ['searchId'],
          where: { searchId: { in: procurement.map((p) => p.id) }, isNew: true },
          _count: true,
        })
        .catch(() => []);
      matchCounts = grouped as { searchId: string; _count: number }[];
    }
    const countBySearch = new Map(matchCounts.map((m) => [m.searchId, m._count]));

    const procurementOut: DeskProcurementSearch[] = procurement.map((p) => ({
      id: p.id,
      name: p.name,
      newMatches: countBySearch.get(p.id) ?? 0,
    }));

    return {
      saved: saved.map((s) => ({
        id: s.id,
        name: s.name,
        searchType: s.searchType,
        href: SEARCH_TYPE_HREF[s.searchType] ?? '/dashboard',
      })),
      procurement: procurementOut,
      newMatches: procurementOut.reduce((sum, p) => sum + p.newMatches, 0),
      error: false,
    };
  } catch (err) {
    logger.error('[desk] searches section failed', { error: err instanceof Error ? err.message : String(err) });
    return { saved: [], procurement: [], newMatches: 0, error: true };
  }
}

async function collectTickers(companies: DeskCompany[]): Promise<DeskTicker[]> {
  const withTicker = companies.filter((c): c is DeskCompany & { ticker: string } => Boolean(c.ticker));
  if (withTicker.length === 0) return [];
  // Live quotes with a hard deadline; the DB snapshot covers a slow Yahoo.
  let quotes: Awaited<ReturnType<typeof getLiveQuotesBatch>> | null = null;
  try {
    quotes = await Promise.race([
      getLiveQuotesBatch(withTicker.map((c) => c.ticker)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), QUOTE_TIMEOUT_MS)),
    ]);
  } catch {
    quotes = null;
  }
  return withTicker.map((c) => {
    const q = quotes?.get(c.ticker.toUpperCase()) ?? null;
    return {
      ticker: c.ticker,
      name: c.name,
      slug: c.slug,
      price: q?.stockPrice ?? c.stockPrice,
      changePct: q?.priceChange24h ?? c.priceChange24h,
      live: Boolean(q),
    };
  });
}

// ── The composition ────────────────────────────────────────────────────────

/**
 * Compose the desk for a user. `now` is injectable for tests.
 * Never throws — worst case is a desk of empty, error-flagged panels.
 */
export async function getDesk(userId: string, email?: string | null, now: Date = new Date()): Promise<DeskData> {
  // Watermark read: default 7 days back, never further than 30.
  let lastVisit: Date | null = null;
  let visitCount = 0;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastDeskVisitAt: true, deskVisitCount: true, email: true },
    });
    lastVisit = user?.lastDeskVisitAt ?? null;
    visitCount = user?.deskVisitCount ?? 0;
    if (!email && user?.email) email = user.email;
  } catch (err) {
    logger.error('[desk] watermark read failed', { error: err instanceof Error ? err.message : String(err) });
  }
  const floor = now.getTime() - DESK_MAX_WINDOW_MS;
  const since = new Date(Math.max(lastVisit?.getTime() ?? now.getTime() - DESK_DEFAULT_WINDOW_MS, floor));

  const [companies, launches, unread, searches] = await Promise.all([
    collectCompanies(userId, email, since),
    collectLaunches(email, since, now),
    collectUnread(userId),
    collectSearches(userId),
  ]);
  const tickers = await collectTickers(companies.list);

  const companyEvents = companies.list.reduce((sum, c) => sum + (c.brief ? briefTotal(c.brief) : 0), 0);

  // Advance the watermark only now that the desk composed — a crash above
  // leaves lastDeskVisitAt untouched so the next load re-shows this delta.
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastDeskVisitAt: now, deskVisitCount: { increment: 1 } },
    });
  } catch (err) {
    logger.error('[desk] watermark write failed', { error: err instanceof Error ? err.message : String(err) });
  }

  return {
    since: since.toISOString(),
    generatedAt: now.toISOString(),
    visitCount,
    totals: {
      companyEvents,
      launchUpdates: launches.slipCount,
      unread: unread.total,
      newMatches: searches.newMatches,
    },
    companies: { list: companies.list, total: companies.total, error: companies.error },
    launches: { list: launches.list, error: launches.error },
    unread: { list: unread.list, total: unread.total, error: unread.error },
    searches: { saved: searches.saved, procurement: searches.procurement, error: searches.error },
    tickers,
  };
}
