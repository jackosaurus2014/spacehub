// SpaceNexus Service Worker
const CACHE_NAME = 'spacenexus-v1';
const STATIC_CACHE_NAME = 'spacenexus-static-v1';
const DYNAMIC_CACHE_NAME = 'spacenexus-dynamic-v1';

// Module-specific API cache TTLs (in milliseconds)
const API_CACHE_TTLS = {
  '/api/news': 60000,          // 1 min
  '/api/events': 120000,       // 2 min
  '/api/stocks': 60000,        // 1 min
  '/api/space-weather': 300000, // 5 min
  '/api/modules': 3600000,     // 1 hr
  '/api/blogs': 300000,        // 5 min
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/spacenexus-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old caches that don't match current version
              return name.startsWith('spacenexus-') &&
                     name !== STATIC_CACHE_NAME &&
                     name !== DYNAMIC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Helper function to check if request is for API
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_ROUTES.some(route => url.pathname.startsWith(route));
}

// Helper function to check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Helper function to check if request is for HTML page
function isPageRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Network-first strategy for API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Clone the response before caching
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return a JSON error response for API requests
    return new Response(
      JSON.stringify({ error: 'You are offline', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Failed to fetch static asset:', request.url);
    // Return nothing for failed static assets
    return new Response('', { status: 404 });
  }
}

// Stale-while-revalidate strategy for pages
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // If network fails and no cache, return offline page
      return caches.match('/offline.html');
    });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Route to appropriate caching strategy
  if (isApiRequest(request)) {
    // Network-first for API calls
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else if (isPageRequest(request)) {
    // Stale-while-revalidate for pages, with offline fallback
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to return cached page
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          // Fall back to offline page
          return caches.match('/offline.html');
        })
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New update from SpaceNexus',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SpaceNexus', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline form submissions (for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Handle background sync
      console.log('[ServiceWorker] Background sync triggered')
    );
  }
});

// Background Sync: process offline action queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
        });
      })
    );
  }
});

// Periodic Sync: refresh widget data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'widget-data-refresh') {
    event.waitUntil(
      Promise.all([
        fetch('/api/widgets/next-launch').then(r => {
          if (r.ok) return caches.open(DYNAMIC_CACHE_NAME).then(c => c.put('/api/widgets/next-launch', r));
        }).catch(() => {}),
        fetch('/api/widgets/market-snapshot').then(r => {
          if (r.ok) return caches.open(DYNAMIC_CACHE_NAME).then(c => c.put('/api/widgets/market-snapshot', r));
        }).catch(() => {}),
        fetch('/api/widgets/space-weather').then(r => {
          if (r.ok) return caches.open(DYNAMIC_CACHE_NAME).then(c => c.put('/api/widgets/space-weather', r));
        }).catch(() => {}),
      ])
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        event.ports[0].postMessage({ cleared: true });
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_API_RESPONSE') {
    const { url, response } = event.data;
    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
      cache.put(url, new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.source.postMessage({ type: 'CACHE_SIZE', count: keys.length });
      });
    });
  }
});
