'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the current online/offline status of the browser.
 * Listens to 'online' and 'offline' events for real-time updates.
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial value
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
