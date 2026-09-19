/* ヒキザン サービスワーカー
   ・アプリ本体とアイコンを端末に保存して、オフラインでも開けるようにします。
   ・家計データ（IndexedDB）には触りません。通信もしません。
   ・アプリを更新したときは、下の VERSION を書きかえてください（古い保存が入れかわります）。 */
const VERSION = 'hikizan-v2';
const CORE = [
  './hikizan.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './maskable-192.png',
  './maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // 外部（OCR部品など）は、そのまま通信

  // ページ本体：ネットにつながっていれば最新を使い、つながらなければ保存したものを使う
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./hikizan.html', copy)); } return res; })
        .catch(() => caches.match('./hikizan.html'))
    );
    return;
  }
  // アイコンなど：保存したものを先に使う
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
