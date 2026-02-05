'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production and in browser
    if (typeof window === 'undefined') return;

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers are not supported');
      return;
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
      return () => window.removeEventListener('load', registerServiceWorker);
    }

    // Handle controller change (new service worker activated)
    const handleControllerChange = () => {
      console.log('[PWA] Service worker controller changed');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
