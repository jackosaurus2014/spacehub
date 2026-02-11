'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  isWatching,
  scheduleNotification,
  cancelNotification,
  requestNotificationPermission,
} from '@/lib/launch/notification-manager';

interface NotificationBellProps {
  eventId: string;
  eventName: string;
  launchDate: string | null;
  size?: 'sm' | 'md';
}

export default function NotificationBell({ eventId, eventName, launchDate, size = 'md' }: NotificationBellProps) {
  const [watching, setWatching] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setWatching(isWatching(eventId));
    setSupported(typeof window !== 'undefined' && 'Notification' in window);
  }, [eventId]);

  if (!supported || !launchDate) return null;

  const handleToggle = async () => {
    if (watching) {
      cancelNotification(eventId);
      setWatching(false);
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        scheduleNotification(eventId, eventName, launchDate);
        setWatching(true);
      }
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const btnSize = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      className={`${btnSize} rounded-lg transition-all ${
        watching
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600/50'
      }`}
      title={watching ? 'Cancel launch alerts' : 'Get launch alerts'}
    >
      {watching ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5z" />
          <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 11-4.5 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
    </motion.button>
  );
}
