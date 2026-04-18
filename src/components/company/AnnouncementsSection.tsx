'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  category: string | null;
  pinned: boolean;
  createdAt: string;
  author?: { id: string; name: string | null } | null;
}

interface AnnouncementsSectionProps {
  companyId: string;
  companySlug: string;
  companyName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Update',
  product: 'Product',
  hiring: 'Hiring',
  funding: 'Funding',
  milestone: 'Milestone',
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AnnouncementsSection({
  companyId,
  companySlug,
  companyName,
}: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/companies/${companyId}/announcements`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setAnnouncements(data.announcements || []);
      } catch (err) {
        clientLogger.error('Load announcements failed', {
          error: err instanceof Error ? err.message : String(err),
          companyId,
        });
        if (!cancelled) setAnnouncements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-5 w-40 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-white/[0.04] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return null;
  }

  // Pinned first, then take top 5 non-pinned (pinned already sorted first by API)
  const pinned = announcements.filter(a => a.pinned);
  const unpinned = announcements.filter(a => !a.pinned).slice(0, 5);
  const display = [...pinned, ...unpinned].slice(0, pinned.length + 5);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">📣</span>
          Announcements from {companyName}
        </h2>
        {announcements.length > display.length && (
          <Link
            href={`/company-profiles/${companySlug}#announcements`}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            View all ({announcements.length})
          </Link>
        )}
      </div>

      <div id="announcements" className="space-y-3">
        {display.map(a => (
          <article
            key={a.id}
            id={`announcement-${a.id}`}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {a.pinned && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-900 rounded uppercase tracking-wide"
                      title="Pinned announcement"
                    >
                      Pinned
                    </span>
                  )}
                  {a.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white/[0.08] text-slate-300 rounded uppercase tracking-wide">
                      {CATEGORY_LABELS[a.category] || a.category}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap break-words">
                  {a.body}
                </p>
                {a.linkUrl && (
                  <a
                    href={a.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                  >
                    Read more →
                  </a>
                )}
              </div>
              <time
                dateTime={a.createdAt}
                className="text-[11px] text-slate-500 whitespace-nowrap"
              >
                {fmtDate(a.createdAt)}
              </time>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
