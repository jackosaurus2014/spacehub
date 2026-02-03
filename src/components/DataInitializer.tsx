'use client';

import { useEffect, useState, useCallback } from 'react';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STALE_THRESHOLD = 60; // minutes

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

      // Data exists - check if it's stale
      const refreshRes = await fetch('/api/refresh');
      const refreshData = await refreshRes.json();

      if (refreshData.stale) {
        // Refresh in background (don't show loading screen)
        console.log('Data is stale, refreshing in background...');
        fetch('/api/refresh', { method: 'POST' })
          .then(r => r.json())
          .then(data => console.log('Background refresh complete:', data))
          .catch(err => console.error('Background refresh failed:', err));
      }

      setStatus('done');
    } catch (error) {
      console.error('Data check error:', error);
      if (isInitial) {
        setStatus('error');
        setMessage(String(error));
      }
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkAndRefreshData(true);

    // Set up periodic refresh check (every 30 minutes)
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
          <div className="absolute inset-0 border-4 border-nebula-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-nebula-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white text-lg font-medium mb-2">Initializing SpaceHub</p>
        <p className="text-star-300 text-sm">{message || 'Loading space industry data...'}</p>
        <p className="text-star-400 text-xs mt-4">This only happens once</p>
      </div>
    </div>
  );
}
