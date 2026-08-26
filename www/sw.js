// Service Worker — Controle do Negócio PWA
const CACHE_NAME = 'controle-negocio-v4.0.0';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './css/index.css',
    './img/logo.png',
    './img/logo.svg',
    './js/annual.js',
    './js/app.js',
    './js/backup.js',
    './js/calendar.js',
    './js/crypto.js',
    './js/database.js',
    './js/decimo.js',
    './js/forms.js',
    './js/inventory.js',
    './js/modals.js',
    './js/notes.js',
    './js/notifications.js',
    './js/pdf.js',
    './js/privacy.js',
    './js/render.js',
    './js/utils.js',
    './js/whatsapp.js'
];

// 1. Instalação: Cacheia todos os arquivos e força ativação imediata
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker v4] Cacheando arquivos essenciais...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. Ativação: Limpa TODOS os caches antigos e assume controle imediato
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker v4] Removendo cache antigo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Interceptação: Network-First para HTML/JS/CSS, Cache-First para imagens
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = event.request.url;
    if (!url.startsWith('http')) return;

    // Para arquivos HTML, JS e CSS: tenta a rede primeiro (garante atualizações)
    const isAppFile = url.endsWith('.html') || url.endsWith('.js') || url.endsWith('.css') || url.endsWith('/');

    if (isAppFile) {
        // Network-First: tenta buscar da rede, se falhar usa cache
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    // Fallback para index.html em navegação
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
        );
    } else {
        // Cache-First para imagens e outros recursos estáticos
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch(() => {
                    // Sem rede e sem cache, retorna vazio
                    return new Response('', { status: 404 });
                });
            })
        );
    }
});
