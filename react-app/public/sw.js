const CACHE_NAME = 'enduraup-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Hanya proses request GET yang menggunakan protokol HTTP/HTTPS
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return new Response('Network error & no cache found.', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      } catch (err) {
        return new Response('Error', { status: 500 });
      }
    })
  );
});
