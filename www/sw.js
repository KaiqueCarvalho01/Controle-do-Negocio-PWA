// Service Worker — Controle do Negócio PWA
const CACHE_NAME = 'controle-negocio-v3.0.1';

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
    './js/notifications.js',
    './js/pdf.js',
    './js/whatsapp.js'
];

// 1. Instalação: Cacheia todos os arquivos estáticos necessários para funcionamento offline
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Cacheando arquivos essenciais para offline...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. Ativação: Limpa versões antigas de caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removendo cache antigo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Interceptação de Requisições (Cache-First com fallback de rede)
self.addEventListener('fetch', event => {
    // Ignora requisições não-GET ou esquemas externos (ex: chrome-extension, cordova, whatsapp)
    if (event.request.method !== 'GET') return;
    const url = event.request.url;
    if (!url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // Retorna do cache imediatamente
                return cachedResponse;
            }

            // Se não estiver no cache, busca na rede e armazena dinamicamente
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
                // Se estiver sem internet e tentar navegar na página principal, retorna o index.html do cache
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

