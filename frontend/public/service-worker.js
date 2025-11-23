// Service Worker minimal pour permettre l'installation PWA
// Version simple sans cache (pas de fonctionnalité hors ligne)

const CACHE_NAME = 'vitalinfo-v1';

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  self.skipWaiting(); // Active immédiatement le nouveau service worker
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Prend le contrôle de toutes les pages
});

// Interception des requêtes (on laisse passer, pas de cache)
self.addEventListener('fetch', (event) => {
  // On laisse toutes les requêtes passer normalement
  // Pas de mise en cache = toujours à jour
  event.respondWith(fetch(event.request));
});

