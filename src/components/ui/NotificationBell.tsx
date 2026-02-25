'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!session?.user) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?limit=5');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  if (!session?.user) return null;

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-cyan-300 transition-colors rounded-lg hover:bg-slate-800/50"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full min-w-[18px] h-[18px] px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm text-slate-400">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">We&apos;ll notify you about important updates</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-cyan-500/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                    if (notification.link) {
                      window.location.href = notification.link;
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${notification.read ? 'ml-5' : ''}`}>
                      <p className="text-sm text-white font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{timeAgo(notification.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-700/50">
            <Link
              href="/notifications"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              onClick={() => setIsOpen(false)}
            >
              View all notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
