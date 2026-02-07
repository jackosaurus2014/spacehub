'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  formatRelativeTime,
  type Notification,
  type NotificationType,
} from '@/lib/notifications';

// Notification type icons as SVG components
function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function NewspaperIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function getNotificationIcon(type: NotificationType) {
  const iconClass = 'w-5 h-5';
  switch (type) {
    case 'launch':
      return <RocketIcon className={iconClass} />;
    case 'price_alert':
      return <ChartIcon className={iconClass} />;
    case 'news':
      return <NewspaperIcon className={iconClass} />;
    case 'system':
      return <SettingsIcon className={iconClass} />;
    default:
      return <BellIcon className={iconClass} />;
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'launch':
      return 'text-orange-400 bg-orange-400/10';
    case 'price_alert':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'news':
      return 'text-blue-400 bg-blue-400/10';
    case 'system':
      return 'text-purple-400 bg-purple-400/10';
    default:
      return 'text-cyan-400 bg-cyan-400/10';
  }
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = () => {
      const notifs = getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    };

    loadNotifications();

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spacenexus_notifications') {
        loadNotifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    const updated = markAsRead(notificationId);
    setNotifications(updated);
    setUnreadCount(updated.filter(n => !n.read).length);
  };

  const handleMarkAllAsRead = () => {
    const updated = markAllAsRead();
    setNotifications(updated);
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-cyan-300 transition-colors rounded-lg hover:bg-slate-700/50"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-3 w-96 max-h-[480px] backdrop-blur-xl border border-cyan-400/30 rounded-xl overflow-hidden animate-fade-in-down z-50"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 25%, rgba(51, 65, 85, 0.95) 50%, rgba(30, 41, 59, 0.96) 75%, rgba(15, 23, 42, 0.98) 100%)',
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-slate-200 font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[360px]">
            {notifications.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                  <BellIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm text-center">No notifications yet</p>
                <p className="text-slate-400 text-xs text-center mt-1">
                  We&apos;ll notify you about launches, price alerts, and news
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative ${!notification.read ? 'bg-cyan-400/5' : ''}`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block px-4 py-3 hover:bg-slate-700/30 transition-colors"
                      >
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div
                        className="px-4 py-3 hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <NotificationContent notification={notification} />
                      </div>
                    )}

                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700/50 px-4 py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium py-1"
            >
              Notification Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Notification item content component
function NotificationContent({ notification }: { notification: Notification }) {
  const colorClass = getNotificationColor(notification.type);

  return (
    <div className="flex gap-3">
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${notification.read ? 'text-slate-300' : 'text-slate-100'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
    </div>
  );
}
