// Scramjet v2 Service Worker - v2.1.0 (Final Fix)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';

let handler, epoxyClient;

function toPlainHeaders(h) {
    const out = {};
    try {
        if (!h) return out;
        if (typeof h.entries === 'function') { for (const [k,v] of h.entries()) out[k]=v; }
        else if (typeof h === 'object') Object.assign(out, h);
    } catch(_) {}
    return out;
}

async function getEpoxy() {
    if (epoxyClient) return epoxyClient;
    try {
        if (typeof self.EpoxyClient !== 'undefined') {
            epoxyClient = new self.EpoxyClient(WISP_URL);
            await epoxyClient.init();
        }
    } catch(e) { console.warn('[SW] Epoxy unavailable:', e.message); }
    return epoxyClient || null;
}

async function doFetch(url, method, headers, body, signal) {
    const m = (method || 'GET').toUpperCase();
    const init = {
        method: m,
        headers: toPlainHeaders(headers),
        body: ['GET','HEAD'].includes(m) ? undefined : (body || undefined),
        signal: signal || undefined
    };
    const epoxy = await getEpoxy();
    if (epoxy) { try { return await epoxy.fetch(url.toString(), init); } catch(_) {} }
    return fetch(url.toString(), init);
}

// CRITICAL: handleFetch returns a plain obj {body,headers,status,statusText}, not a native Response
function toResponse(raw) {
    if (raw instanceof Response) return raw;
    const h = new Headers();
    try {
        if (raw.headers && typeof raw.headers.entries === 'function')
            for (const [k,v] of raw.headers.entries()) { try { h.set(k,v); } catch(_){} }
        else if (raw.headers && typeof raw.headers === 'object')
            for (const [k,v] of Object.entries(raw.headers)) { try { h.set(k,String(v)); } catch(_){} }
    } catch(_) {}
    return new Response(raw.body ?? null, { status: raw.status||200, statusText: raw.statusText||'OK', headers: h });
}

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, ScramjetHeaders, defaultConfig } = self.$scramjet;
    const transport = {
        async init() { await getEpoxy(); },
        async request(remote, method, headers, body, signal) { return doFetch(remote, method, headers, body, signal); },
        async fetch(url, init) { return doFetch(url, init?.method, init?.headers, init?.body, init?.signal); },
        async connect() {}
    };
    handler = new ScramjetFetchHandler({
        transport,
        crossOriginIsolated: false,
        context: {
            config: defaultConfig,
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            interface: {
                codecEncode: s => encodeURIComponent(s),
                codecDecode: s => {
                    if (!s) return 'https://uiqm.lol/';
                    let p = s;
                    if (p.startsWith('network/')) p = p.slice(8);
                    if (!p) return 'https://uiqm.lol/';
                    try { const d = decodeURIComponent(p); return d.includes('://') ? d : 'https://'+d; }
                    catch { return p; }
                },
                getInjectScripts: (_m,_h,script) => [script('/worker/working.all.js')]
            },
            cookieJar: { getCookies: ()=>'', setCookies: ()=>{} }
        },
        sendSetCookie: async (url, cookie) => {
            for (const c of await self.clients.matchAll()) c.postMessage({type:'scramjet-set-cookie',url:url.href,cookie});
        },
        fetchDataUrl: url => fetch(url.toString()),
        fetchBlobUrl: url => fetch(url.toString())
    });
    return handler;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const skip = ['working.all.js','working.sw.js','working.wasm.wasm'];
    if (!url.pathname.startsWith(SCRAM_PREFIX) || skip.some(s => url.pathname.endsWith(s))) return;
    event.respondWith((async () => {
        try {
            const h = await initHandler();
            const { ScramjetHeaders } = self.$scramjet;
            const sjHeaders = new ScramjetHeaders();
            try { for (const [k,v] of event.request.headers.entries()) sjHeaders.set(k,v); } catch(_) {}
            const isGetHead = ['GET','HEAD'].includes(event.request.method.toUpperCase());
            const raw = await h.handleFetch({
                rawUrl: url,
                method: event.request.method,
                initialHeaders: sjHeaders,
                body: isGetHead ? undefined : event.request.body,
                destination: event.request.destination,
                mode: event.request.mode,
                referrer: event.request.referrer,
                credentials: event.request.credentials,
                clientId: event.clientId || event.resultingClientId
            });
            return toResponse(raw);
        } catch(e) {
            console.error('[Scramjet v2 SW] Fetch error:', e);
            return new Response('Proxy error: '+e.message, {status:500, headers:{'Content-Type':'text/plain'}});
        }
    })());
});
