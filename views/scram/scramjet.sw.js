importScripts('/worker/working.all.js');
importScripts('/gmt/index.js'); // Bare-mux (gmt)

const SCRAM_PREFIX = '/worker/';

let handler;

async function initHandler() {
    if (handler) return handler;

    const { ScramjetFetchHandler, defaultConfig } = self.$scramjet;
    
    // Initialize BareMux client
    // The worker is at /gmt/worker.js
    const baremux = new self.BareMux.BareClient('/gmt/worker.js');

    handler = new ScramjetFetchHandler({
        transport: baremux,
        crossOriginIsolated: false,
        context: {
            config: defaultConfig,
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            interface: {
                codecEncode: (str) => str, 
                codecDecode: (str) => str,
                getInjectScripts: (meta, handler, script) => {
                    return [
                        script('/worker/working.all.js')
                    ];
                }
            },
            cookieJar: {
                getCookies: () => "",
                setCookies: () => {}
            }
        },
        sendSetCookie: async (url, cookie) => {
            const clients = await self.clients.matchAll();
            for (const client of clients) {
                client.postMessage({
                    type: 'scramjet-set-cookie',
                    url: url.href,
                    cookie: cookie
                });
            }
        },
        fetchDataUrl: async (url) => fetch(url),
        fetchBlobUrl: async (url) => fetch(url)
    });
    return handler;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith(SCRAM_PREFIX) && !url.pathname.endsWith('working.all.js') && !url.pathname.endsWith('working.sw.js') && !url.pathname.endsWith('working.wasm.wasm')) {
        event.respondWith((async () => {
            try {
                const h = await initHandler();
                const response = await h.handleFetch({
                    rawUrl: event.request.url,
                    method: event.request.method,
                    headers: event.request.headers,
                    body: event.request.body,
                    destination: event.request.destination,
                    mode: event.request.mode,
                    referrer: event.request.referrer,
                    credentials: event.request.credentials,
                    clientId: event.clientId || event.resultingClientId
                });
                return response;
            } catch (e) {
                console.error('[Scramjet v2 SW] Fetch error:', e);
                return fetch(event.request);
            }
        })());
    }
});
