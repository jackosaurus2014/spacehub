'use client';

import { useEffect } from 'react';
import { isNativePlatform } from '@/lib/capacitor';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Store last-online timestamp immediately and periodically while online.
    // The offline fallback page reads this from localStorage to show "Last cached".
    const storeLastOnline = () => {
      if (navigator.onLine) {
        try {
          localStorage.setItem('spacenexus-last-online', new Date().toISOString());
        } catch {
          // localStorage may be unavailable
        }
      }
    };
    storeLastOnline();
    const lastOnlineInterval = setInterval(storeLastOnline, 60_000); // every 60s

    // Also store on visibilitychange (user returns to tab) and online event
    const handleOnline = () => storeLastOnline();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') storeLastOnline();
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    // In Capacitor native shell, initialize native features instead of SW
    if (isNativePlatform()) {
      initCapacitorFeatures();
      return () => {
        clearInterval(lastOnlineInterval);
        window.removeEventListener('online', handleOnline);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers are not supported');
      return () => {
        clearInterval(lastOnlineInterval);
        window.removeEventListener('online', handleOnline);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service worker registered successfully:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('[PWA] New service worker installing...');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                console.log('[PWA] New content available, refresh to update');

                // Optionally dispatch a custom event that other components can listen to
                window.dispatchEvent(new CustomEvent('swUpdate', { detail: { registration } }));
              }
            });
          }
        });

        // Check for updates on page load and periodically
        if (registration.waiting) {
          console.log('[PWA] Update is waiting to be activated');
        }

        // Register for Background Sync
        if ('sync' in registration) {
          (registration as any).sync.register('sync-offline-actions').catch(() => {});
        }

        // Register for Periodic Sync (widget data refresh)
        if ('periodicSync' in registration) {
          (registration as any).periodicSync.register('widget-data-refresh', {
            minInterval: 15 * 60 * 1000, // 15 minutes
          }).catch(() => {});
        }

        // Check for updates every hour
        setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    // Wait for the page to fully load before registering
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
      return () => {
        window.removeEventListener('load', registerServiceWorker);
        clearInterval(lastOnlineInterval);
        window.removeEventListener('online', handleOnline);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    // Handle controller change (new service worker activated)
    const handleControllerChange = () => {
      console.log('[PWA] Service worker controller changed');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(lastOnlineInterval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

async function initCapacitorFeatures() {
  console.log('[Capacitor] Initializing native features...');

  try {
    // 1. Initialize native push notifications
    const { initNativePush } = await import('@/lib/native-push');
    await initNativePush();

    // 2. Hide splash screen after app loads
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    // 3. Listen for app state changes (clear badge when app becomes active)
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const { clearBadge } = await import('@/lib/native-badge');
        await clearBadge();
      }
    });

    // 4. Handle deep links / universal links
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const path = new URL(url).pathname;
        if (path && typeof window !== 'undefined') {
          window.location.href = path;
        }
      } catch {
        // Invalid URL
      }
    });

    console.log('[Capacitor] Native features initialized');
  } catch (error) {
    console.error('[Capacitor] Init error:', error);
  }
}
