// StackForge Service Worker — Offline Support
const CACHE_NAME = 'stackforge-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache first, fallback to network
self.addEventListener('fetch', function(e) {
  // Skip non-GET and external requests
  if(e.request.method !== 'GET') return;
  if(!e.request.url.startsWith(self.location.origin)) return;
  
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) return cached;
      
      return fetch(e.request).then(function(response) {
        // Cache successful responses
        if(response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback for navigation requests
        if(e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', function(e) {
  if(e.tag === 'sf-sync') {
    e.waitUntil(
      // When back online, sync any pending data
      clients.matchAll().then(function(clients) {
        clients.forEach(function(c) {
          c.postMessage({ type: 'SYNC_COMPLETE' });
        });
      })
    );
  }
});

// Push notifications (future feature)
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(
      data.title || 'StackForge',
      {
        body: data.body || 'Your supplement reminder!',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: 'sf-reminder',
        requireInteraction: false,
      }
    )
  );
});
