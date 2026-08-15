'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Dashboard "Your Space" strip — previews of the signed-in user's    */
/*  own data (watchlists, reading list, saved searches, alert          */
/*  deliveries). Each card fetches its own small slice of data so one  */
/*  slow endpoint doesn't block the others. Empty states are inviting  */
/*  one-line CTAs rather than blank boxes.                             */
/* ------------------------------------------------------------------ */

interface CardShellProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  count: number | null;
  loading: boolean;
  children: React.ReactNode;
}

function CardShell({ title, icon, href, count, loading, children }: CardShellProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
          <span className="text-sm" aria-hidden="true">{icon}</span>
          {title}
        </h3>
        {!loading && count !== null && count > 0 && (
          <span className="text-[10px] font-medium text-slate-500 tabular-nums">{count}</span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
      >
        View all
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-8 bg-white/[0.05] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function EmptyLine({ text, cta, ctaHref }: { text: string; cta: string; ctaHref: string }) {
  return (
    <div className="py-2">
      <p className="text-xs text-slate-500 leading-relaxed">
        {text}{' '}
        <Link href={ctaHref} className="text-indigo-400 hover:text-indigo-300 font-medium">
          {cta}
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface WatchlistItem {
  id: string;
  priority: string;
  companyProfile: { name: string; slug: string };
}

function WatchlistCard() {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/watchlist/companies', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setItems(json?.data?.items ?? []))
      .catch(() => setItems([]));
    return () => controller.abort();
  }, []);

  const loading = items === null;

  return (
    <CardShell title="Watchlists" icon="⭐" href="/my-watchlists" count={items?.length ?? null} loading={loading}>
      {loading ? (
        <CardSkeleton />
      ) : items.length === 0 ? (
        <EmptyLine
          text="No companies watched yet."
          cta="Browse companies →"
          ctaHref="/company-profiles"
        />
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <Link
                href={`/company-profiles/${item.companyProfile.slug}`}
                className="block text-sm text-slate-300 hover:text-white truncate transition-colors"
              >
                {item.companyProfile.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */

interface ReadingListItem {
  id: string;
  title: string;
  url: string;
}

function ReadingListCard() {
  const [items, setItems] = useState<ReadingListItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/reading-list', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setItems(json?.items ?? []))
      .catch(() => setItems([]));
    return () => controller.abort();
  }, []);

  const loading = items === null;

  return (
    <CardShell title="Reading List" icon="📖" href="/reading-list" count={items?.length ?? null} loading={loading}>
      {loading ? (
        <CardSkeleton />
      ) : items.length === 0 ? (
        <EmptyLine
          text="Nothing saved to read yet."
          cta="Browse news →"
          ctaHref="/news"
        />
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <Link
                href={item.url}
                className="block text-sm text-slate-300 hover:text-white truncate transition-colors"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */

interface SavedSearchItem {
  id: string;
  name: string;
}

function SavedSearchesCard() {
  const [items, setItems] = useState<SavedSearchItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/saved-searches', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setItems(json?.data?.savedSearches ?? []))
      .catch(() => setItems([]));
    return () => controller.abort();
  }, []);

  const loading = items === null;

  return (
    <CardShell
      title="Saved Searches"
      icon="🔍"
      href="/alerts?tab=saved-searches"
      count={items?.length ?? null}
      loading={loading}
    >
      {loading ? (
        <CardSkeleton />
      ) : items.length === 0 ? (
        <EmptyLine
          text="No saved searches yet."
          cta="Save a search →"
          ctaHref="/search"
        />
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <Link
                href="/alerts?tab=saved-searches"
                className="block text-sm text-slate-300 hover:text-white truncate transition-colors"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */

interface DeliveryItem {
  id: string;
  title: string;
  readAt: string | null;
}

function AlertDeliveriesCard() {
  const [items, setItems] = useState<DeliveryItem[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/alerts/deliveries?limit=3', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setItems(json?.data?.deliveries ?? []);
        setUnreadCount(json?.data?.unreadCount ?? 0);
      })
      .catch(() => setItems([]));
    return () => controller.abort();
  }, []);

  const loading = items === null;

  return (
    <CardShell
      title="Alert Deliveries"
      icon="🔔"
      href="/alerts?tab=notifications"
      count={unreadCount > 0 ? unreadCount : (items?.length ?? null)}
      loading={loading}
    >
      {loading ? (
        <CardSkeleton />
      ) : items.length === 0 ? (
        <EmptyLine
          text="No alerts delivered yet."
          cta="Set up an alert →"
          ctaHref="/alerts"
        />
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              {!item.readAt && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" aria-hidden="true" />
              )}
              <Link
                href="/alerts?tab=notifications"
                className="block text-sm text-slate-300 hover:text-white truncate transition-colors"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */

/**
 * "Your Space" — personalized-first preview strip for the dashboard.
 * Shows the signed-in user's own watchlists, reading list, saved searches
 * and alert deliveries, each with an inviting one-line CTA when empty.
 */
export default function MyDataStrip() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{'🧭'}</span>
        Your Space
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WatchlistCard />
        <ReadingListCard />
        <SavedSearchesCard />
        <AlertDeliveriesCard />
      </div>
    </div>
  );
}
