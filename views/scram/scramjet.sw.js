// Scramjet v2 Service Worker - v2.0.9 (Epoxy Wisp Transport)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js'); // EpoxyClient - WebSocket-based, works in SW

const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';

let handler;
let epoxyReady = false;
let epoxyClient = null;

async function getEpoxy() {
    if (epoxyReady && epoxyClient) return epoxyClient;
    try {
        // EpoxyClient is the global exposed by /epoch/index.js
        if (typeof self.EpoxyClient !== 'undefined') {
            epoxyClient = new self.EpoxyClient(WISP_URL);
            await epoxyClient.init();
            epoxyReady = true;
            return epoxyClient;
        }
    } catch (e) {
        console.warn('[SW] EpoxyClient failed, falling back to direct fetch:', e.message);
    }
    return null;
}

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, ScramjetHeaders, defaultConfig } = self.$scramjet;

    const transport = {
        async init() {
            await getEpoxy();
        },
        async request(remote, headers, body, method, signal) {
            const epoxy = await getEpoxy();
            if (epoxy && typeof epoxy.fetch === 'function') {
                return await epoxy.fetch(remote.toString(), {
                    method: method || 'GET',
                    headers: headers || {},
                    body: body || undefined,
                    signal: signal || undefined
                });
            }
            // Fallback to native fetch
            return await fetch(remote.toString(), {
                method: method || 'GET',
                headers: headers || {},
                body: body || undefined,
                signal: signal || undefined,
                mode: 'cors'
            });
        },
        async fetch(url, init) {
            const epoxy = await getEpoxy();
            if (epoxy && typeof epoxy.fetch === 'function') {
                return await epoxy.fetch(url, init);
            }
            return await fetch(url, init);
        },
        async connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
            const epoxy = await getEpoxy();
            if (epoxy && typeof epoxy.connect === 'function') {
                return epoxy.connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror);
            }
        }
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
                getInjectScripts: (_m, _h, script) => [script('/worker/working.all.js')]
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
                try {
                    for (const [k, v] of event.request.headers.entries()) sjHeaders.set(k, v);
                } catch (_) {}
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
                return new Response('Proxy error: ' + e.message, {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })());
    }
});
