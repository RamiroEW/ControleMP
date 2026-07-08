/* ─────────────────────────────────────────────────────────────
   SERVICE WORKER — Extreme Wind
   Habilita uso offline em parques eólicos.
   • App shell (HTML/manifest/ícone) → pré-cacheado na instalação
   • Font Awesome (cdnjs) → cacheado em tempo de execução (cache-first)
   • POST de sincronização (Google Apps Script) → sempre vai à rede
   Requer hospedagem em http(s); não funciona abrindo o arquivo via file://
   Ao rebrandear/atualizar o app shell, SEMPRE mude o nome de CACHE —
   é o que força o navegador a descartar o cache antigo (ex.: nome/ícone
   velho preso no prompt de instalação do PWA) em vez de servir dados
   obsoletos indefinidamente.
   ───────────────────────────────────────────────────────────── */
const CACHE = 'extremewind-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // Sincronização (POST) e qualquer não-GET → direto para a rede
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Recursos externos (Font Awesome / cdnjs) → cache-first em tempo de execução
  if (url.origin !== self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          c.put(req, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Mesma origem → stale-while-revalidate (serve cache, atualiza em background)
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then(res => { c.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
