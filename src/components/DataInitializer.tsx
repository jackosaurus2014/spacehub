'use client';

import { useEffect, useState, useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export default function DataInitializer() {
  const [status, setStatus] = useState<'checking' | 'initializing' | 'done' | 'error'>('checking');
  const [message, setMessage] = useState('');

  const checkAndRefreshData = useCallback(async (isInitial: boolean) => {
    try {
      // Check if data needs initialization
      const checkRes = await fetch('/api/init');
      const checkData = await checkRes.json();

      if (!checkData.initialized) {
        // Data needs initialization
        if (isInitial) {
          setStatus('initializing');
          setMessage('Setting up your space dashboard...');
        }

        const initRes = await fetch('/api/init', { method: 'POST' });
        const initData = await initRes.json();

        if (initData.success) {
          setStatus('done');
        } else if (isInitial) {
          setStatus('error');
          setMessage(initData.error || 'Initialization failed');
        }
        return;
      }

      // Data exists. Freshness is the scheduler's job: cron-scheduler.ts
      // runs 'news-fetch' (/api/refresh?type=news) every 5 minutes, so the
      // browser no longer triggers ingestion — /api/news/fetch is now
      // CRON_SECRET/admin-gated and an anonymous visitor could never call it.
      setStatus('done');
    } catch (error) {
      clientLogger.error('Data check error', { error: error instanceof Error ? error.message : String(error) });
      if (isInitial) {
        setStatus('error');
        setMessage(String(error));
      }
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkAndRefreshData(true);

    // Set up periodic refresh check (every 15 minutes)
    const interval = setInterval(() => {
      checkAndRefreshData(false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [checkAndRefreshData]);

  // Don't render anything once done
  if (status === 'done' || status === 'checking') {
    return null;
  }

  if (status === 'error') {
    return null; // Silently fail - data can be loaded manually
  }

  // Show loading overlay while initializing
  return (
    <div className="fixed inset-0 bg-space-900/95 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-white/15 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white text-lg font-medium mb-2">Initializing SpaceNexus</p>
        <p className="text-star-300 text-sm">{message || 'Loading space industry data...'}</p>
        <p className="text-star-300 text-xs mt-4">This only happens once</p>
      </div>
    </div>
  );
}
