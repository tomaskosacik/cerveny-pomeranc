// Červený pomeranč – service worker: push upozornění, číslo na ikoně, otevření nabídky.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function myId() {
  const sub = await self.registration.pushManager.getSubscription();
  if (!sub) return null;
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 22);
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let msgs = [];
    try {
      const id = await myId();
      const r = await fetch('/api/inbox?id=' + encodeURIComponent(id), { cache: 'no-store' });
      msgs = (await r.json()).msgs || [];
    } catch (err) {}
    if (!msgs.length) msgs = [{ title: 'Červený pomeranč', body: 'Máme nové ceny zájezdů.', url: '/', tag: 'obecne' }];
    let badge = 0, shown = 0;
    const seen = await caches.open('cp-seen');
    for (const m of msgs) {
      if (m.once) { const key = '/__seen/' + m.once; if (await seen.match(key)) continue; await seen.put(key, new Response('1')); }
      badge += m.badge || 0; shown++;
      await self.registration.showNotification(m.title, {
        body: m.body, tag: m.tag, renotify: true, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: m.url || '/' },
      });
    }
    if (!shown) await self.registration.showNotification('Červený pomeranč', { body: 'Máme nové ceny zájezdů.', tag: 'obecne', icon: '/icon-192.png', data: { url: '/' } });
    if (badge && self.navigator && 'setAppBadge' in self.navigator) { try { await self.navigator.setAppBadge(badge); } catch (err) {} }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
