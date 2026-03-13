'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';
import {
  getNotifications as getLocalNotifications,
  markAllAsRead as markAllLocalAsRead,
  markAsRead as markLocalAsRead,
  deleteNotification as deleteLocalNotification,
  clearAllNotifications,
  formatRelativeTime,
  type Notification,
  type NotificationType,
} from '@/lib/notifications';

type FilterType = 'all' | 'unread' | 'watchlist' | 'news' | 'system' | 'launch' | 'price_alert';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'news', label: 'Community' },
  { key: 'system', label: 'System' },
  { key: 'launch', label: 'Launches' },
];

function getTypeColor(type: NotificationType): string {
  switch (type) {
    case 'launch': return 'text-orange-400 bg-orange-400/10';
    case 'price_alert': return 'text-emerald-400 bg-emerald-400/10';
    case 'news': return 'text-blue-400 bg-blue-400/10';
    case 'system': return 'text-purple-400 bg-purple-400/10';
    case 'watchlist': return 'text-indigo-400 bg-indigo-400/10';
    default: return 'text-slate-300 bg-white/5';
  }
}

function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'launch': return 'Launch';
    case 'price_alert': return 'Alert';
    case 'news': return 'Community';
    case 'system': return 'System';
    case 'watchlist': return 'Watchlist';
    default: return 'Notification';
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadNotifications = useCallback(async () => {
    const localNotifs = getLocalNotifications();

    let serverNotifs: Notification[] = [];
    try {
      const res = await fetch('/api/alerts/watchlist?limit=50');
      if (res.ok) {
        const data = await res.json();
        serverNotifs = (data.alerts || []).map((alert: any) => ({
          id: `srv_${alert.id}`,
          type: 'watchlist' as NotificationType,
          title: alert.title,
          message: alert.message,
          timestamp: alert.createdAt,
          read: !!alert.readAt,
          link: alert.data?.link || undefined,
          metadata: alert.data || undefined,
        }));
      }
    } catch {
      // Not authenticated or fetch failed
    }

    let communityNotifs: Notification[] = [];
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        communityNotifs = (data.notifications || []).map((n: any) => ({
          id: `community_${n.id}`,
          type: (
            n.type === 'reply' || n.type === 'mention' ? 'news' :
            n.type === 'vote' || n.type === 'accepted_answer' ? 'price_alert' :
            n.type === 'follow' ? 'watchlist' :
            'system'
          ) as NotificationType,
          title: n.title,
          message: n.message,
          timestamp: n.createdAt,
          read: n.read,
          link: n.linkUrl || undefined,
          metadata: { communityNotifId: n.id, communityType: n.type },
        }));
      }
    } catch {
      // Not authenticated or fetch failed
    }

    const merged = [...communityNotifs, ...serverNotifs, ...localNotifs];
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    markAllLocalAsRead();
    try { await fetch('/api/alerts/watchlist', { method: 'PUT' }); } catch {}
    try { await fetch('/api/notifications/read-all', { method: 'POST' }); } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkAsRead = async (notif: Notification) => {
    if (notif.read) return;
    if (notif.id.startsWith('community_')) {
      const realId = notif.id.replace('community_', '');
      try {
        await fetch(`/api/notifications/${realId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch {}
    } else if (notif.id.startsWith('srv_')) {
      // Server watchlist — marking individual not supported, will be caught by mark-all
    } else {
      markLocalAsRead(notif.id);
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
  };

  const handleDelete = (notif: Notification) => {
    if (!notif.id.startsWith('community_') && !notif.id.startsWith('srv_')) {
      deleteLocalNotification(notif.id);
    }
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleClearAll = async () => {
    clearAllNotifications();
    try { await fetch('/api/alerts/watchlist', { method: 'PUT' }); } catch {}
    try { await fetch('/api/notifications/read-all', { method: 'POST' }); } catch {}
    setNotifications([]);
  };

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You\'re all caught up'}
          icon={
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          }
        />

        {/* Actions bar */}
        <ScrollReveal>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'all'
                ? notifications.length
                : tab.key === 'unread'
                  ? unreadCount
                  : notifications.filter(n => n.type === tab.key).length;
              if (tab.key !== 'all' && tab.key !== 'unread' && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    filter === tab.key
                      ? 'bg-white/10 text-slate-200 border border-white/10'
                      : 'text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {tab.label}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-slate-300 hover:text-white font-medium whitespace-nowrap"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-500 hover:text-red-400 font-medium whitespace-nowrap"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        </ScrollReveal>

        {/* Notification list */}
        <ScrollReveal delay={0.1}>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">{filter === 'unread' ? '✅' : '🔔'}</span>}
            title={filter === 'unread' ? "You're all caught up!" : 'No new notifications'}
            description={filter === 'unread'
              ? 'No unread notifications. Nicely done!'
              : 'Notifications about launches, watchlist alerts, and community activity will appear here.'}
            action={filter !== 'all' ? (
              <button
                onClick={() => setFilter('all')}
                className="text-xs text-slate-300 hover:text-white font-medium"
              >
                View all notifications
              </button>
            ) : (
              <div className="flex justify-center gap-3">
                <Link
                  href="/alerts"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Set Up Alerts
                </Link>
                <Link
                  href="/community"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Join Community
                </Link>
              </div>
            )}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(notif => (
              <div
                key={notif.id}
                className={`card group relative transition-colors ${
                  !notif.read ? 'bg-white/5 border-white/10' : ''
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg shadow-black/20" />
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${getTypeColor(notif.type)}`}>
                    <TypeIcon type={notif.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {notif.link ? (
                          <Link
                            href={notif.link}
                            onClick={() => handleMarkAsRead(notif)}
                            className={`text-sm font-medium hover:text-white transition-colors block ${
                              notif.read ? 'text-slate-300' : 'text-white'
                            }`}
                          >
                            {notif.title}
                          </Link>
                        ) : (
                          <p className={`text-sm font-medium ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                            {notif.title}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeColor(notif.type)}`}>
                            {getTypeLabel(notif.type)}
                          </span>
                          <span className="text-xs text-slate-500">{formatRelativeTime(notif.timestamp)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Mark as read"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          aria-label="Dismiss"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification settings link */}
        </ScrollReveal>

        <div className="mt-8 text-center">
          <Link
            href="/account"
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Manage notification preferences in Account Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'launch':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );
    case 'price_alert':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'news':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      );
    case 'watchlist':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'system':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      );
  }
}
