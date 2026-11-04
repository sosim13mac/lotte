/* 쫄깃로또 서비스 워커
 * - 정적 자산(_next/static, 아이콘, OCR 엔진) 캐시 우선
 * - 페이지 이동은 네트워크 우선, 실패 시 /offline
 * - Supabase 등 외부 요청과 사진은 절대 캐시하지 않음
 */
const VERSION = 'v2';
const STATIC_CACHE = `zzolgit-static-${VERSION}`;
const PRECACHE = ['/offline', '/manifest.json', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('zzolgit-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  url.pathname.startsWith('/tesseract/') ||
  url.pathname === '/icon.svg';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, 카카오맵 등은 네트워크 그대로

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline')) || Response.error()));
  }
});

// FCM 웹 푸시 수신 (Firebase SDK 없이 직접 표시) — "내 단골 OO에서 2등 나왔어요!" 등
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: '쫄깃로또', body: event.data ? event.data.text() : '' } };
  }
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || data.title || '쫄깃로또';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || n.tag || undefined,
      data: { url: data.url || (payload.fcmOptions && payload.fcmOptions.link) || '/' },
    }),
  );
});

// 알림 클릭 → 해당 화면 열기 (명당 근처 알림, 단골점 당첨 푸시 공통)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
