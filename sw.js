const CACHE_STATIC = "irrigapp-static-v3.2";
const CACHE_DATA = "irrigapp-data-v3.2";
const OFFLINE_URL = "offline.html";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const validCaches = [CACHE_STATIC, CACHE_DATA];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !validCaches.includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes("read_data.php")) {
    event.respondWith(networkFirstData(event.request));
    return;
  }

  event.respondWith(networkFirstStatic(event.request));
});

async function networkFirstData(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DATA);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) {
      const body = await cached.json();
      body._offline = true;
      body._cachedAt = body.timestamp || null;
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        soil: null,
        temp: null,
        _offline: true,
        _cachedAt: null,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
}

async function networkFirstStatic(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const offlinePage = await caches.match("./offline.html");
      if (offlinePage) return offlinePage;
    }

    return new Response("Service indisponible", { status: 503 });
  }
}

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "IrrigApp", body: "Alerte !" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "https://cdn-icons-png.flaticon.com/512/2942/2942531.png",
      badge: "https://cdn-icons-png.flaticon.com/512/2942/2942531.png",
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
