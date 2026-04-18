'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 45_000;

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.id;

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === 'number') {
        setUnreadCount(data.count);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/notifications?page=1&pageSize=10', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: NotificationRow[];
        unreadCount?: number;
      };
      setItems(data.notifications ?? []);
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Poll unread count while visible. Pause when tab is hidden.
  useEffect(() => {
    if (!userId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      fetchCount();
      intervalId = setInterval(fetchCount, POLL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, fetchCount]);

  // Click outside to close.
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      fetchList();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // silent
    }
  };

  const handleItemClick = async (n: NotificationRow) => {
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
      } catch {
        // silent
      }
      setItems((prev) =>
        prev.map((row) => (row.id === n.id ? { ...row, read: true } : row))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        className="relative p-2 text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 bg-black border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadingList && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/50">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-white/70">No notifications yet</p>
                <p className="text-xs text-white/40 mt-1">
                  We&apos;ll let you know when something happens.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const content = (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1.5">
                      <span
                        className={`block w-2 h-2 rounded-full ${
                          n.read ? 'bg-transparent' : 'bg-white'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-white/40 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                const itemClass = `block px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                  n.read ? '' : 'bg-white/[0.03]'
                }`;

                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    href={n.linkUrl}
                    onClick={() => handleItemClick(n)}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left ${itemClass}`}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-white/20">
            <Link
              href="/inbox"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-white/80 hover:text-white transition-colors"
            >
              See all &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
