// Scramjet v2 Service Worker - v2.0.7 (Direct Fetch Transport)
importScripts('/worker/working.all.js');

const SCRAM_PREFIX = '/worker/';
let handler;

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, ScramjetHeaders, defaultConfig } = self.$scramjet;

    // CRITICAL FIX: Use a direct fetch transport - BareClient uses SharedWorker
    // which cannot communicate with Service Workers. This bypasses BareMux entirely.
    const transport = {
        fetch: (url, init) => fetch(url, init)
    };

    handler = new ScramjetFetchHandler({
        transport,
        crossOriginIsolated: false,
        context: {
            config: defaultConfig,
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            interface: {
                codecEncode: (str) => encodeURIComponent(str),
                codecDecode: (str) => {
                    if (!str) return 'https://uiqm.lol/';
                    let path = str;
                    if (path.startsWith('network/')) path = path.slice(8);
                    if (!path) return 'https://uiqm.lol/';
                    try {
                        const decoded = decodeURIComponent(path);
                        return decoded.includes('://') ? decoded : 'https://' + decoded;
                    } catch { return path; }
                },
                getInjectScripts: (_meta, _handler, script) => [script('/worker/working.all.js')]
            },
            cookieJar: { getCookies: () => '', setCookies: () => {} }
        },
        sendSetCookie: async (url, cookie) => {
            const clients = await self.clients.matchAll();
            for (const c of clients) c.postMessage({ type: 'scramjet-set-cookie', url: url.href, cookie });
        },
        fetchDataUrl: async (url) => fetch(url),
        fetchBlobUrl: async (url) => fetch(url)
    });
    return handler;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const skip = ['working.all.js', 'working.sw.js', 'working.wasm.wasm'];
    if (url.pathname.startsWith(SCRAM_PREFIX) && !skip.some(s => url.pathname.endsWith(s))) {
        event.respondWith((async () => {
            try {
                const h = await initHandler();
                const { ScramjetHeaders } = self.$scramjet;
                const sjHeaders = new ScramjetHeaders();
                for (const [k, v] of event.request.headers.entries()) sjHeaders.set(k, v);
                return await h.handleFetch({
                    rawUrl: url,
                    method: event.request.method,
                    initialHeaders: sjHeaders,
                    body: event.request.body,
                    destination: event.request.destination,
                    mode: event.request.mode,
                    referrer: event.request.referrer,
                    credentials: event.request.credentials,
                    clientId: event.clientId || event.resultingClientId
                });
            } catch (e) {
                console.error('[Scramjet v2 SW] Fetch error:', e);
                return new Response('Proxy error: ' + e.message, { status: 500 });
            }
        })());
    }
});
