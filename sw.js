/* ヒキザン サービスワーカー
   ・アプリ本体とアイコンを端末に保存して、オフラインでも開けるようにします。
   ・家計データ（IndexedDB）には触りません。通信もしません。
   ・アプリ本体は index.html です（GitHub Pages では https://ユーザー名.github.io/hikizan/ で開きます）。
   ・アイコンや名前（manifest）を変えたときは、下の VERSION を書きかえてください（古い保存が入れかわります）。 */
const VERSION = 'hikizan-v4';
const PAGE = './index.html';
const CORE = [
  PAGE,
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './maskable-192.png',
  './maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', event => {
  // { cache: 'reload' }：ブラウザの一時保存を使わず、いつも最新のファイルを取ってくる
  event.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      // 消すのは「hikizan-」で始まる古い保存だけ（同じサイトにある別のアプリの保存は消さない）
      .then(keys => Promise.all(keys.filter(k => k.startsWith('hikizan-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // 外部（OCR部品など）は、そのまま通信

  const isPage = req.mode === 'navigate';
  const isManifest = url.pathname.endsWith('/manifest.webmanifest');

  // ページ本体と manifest（アプリの名前・アイコンの設定）：
  // ネットにつながっていれば、いつも最新を確認して使い、つながらなければ保存したものを使う
  if (isPage || isManifest) {
    event.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(isPage ? PAGE : req.url, copy)); }
          return res;
        })
        .catch(() => caches.match(isPage ? PAGE : req.url))
    );
    return;
  }
  // アイコンなど：保存したものを先に使う
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
