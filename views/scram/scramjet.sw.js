// Scramjet v2 Service Worker - v2.2.1 (Epoxy Fix)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';

let handler;
let epoxy = null;

async function getEpoxy() {
    if (epoxy?.ready) return epoxy;
    try {
        console.log('[SW] Initializing EpoxyTransport...');
        const EpoxyTransport = self.EpxMod?.default || self.EpxMod?.EpoxyTransport || self.EpxMod;
        if (typeof EpoxyTransport === 'function' || (EpoxyTransport && typeof EpoxyTransport.prototype?.init === 'function')) {
            const t = new EpoxyTransport({ wisp: WISP_URL });
            await t.init();
            epoxy = t;
            console.log('[SW] EpoxyTransport ready ✅');
            return epoxy;
        }
    } catch(e) { console.warn('[SW] Epoxy init failed:', e); }
    return null;
}

function toResponse(raw) {
    if (raw instanceof Response) return raw;
    const h = new Headers();
    try {
        const hdrs = raw.headers;
        if (hdrs instanceof Headers) {
            hdrs.forEach((v, k) => h.set(k, v));
        } else if (Array.isArray(hdrs)) {
            for (const [k,v] of hdrs) { try { h.set(k, String(v)); } catch(_){} }
        } else if (hdrs && typeof hdrs.entries === 'function') {
            for (const [k,v] of hdrs.entries()) { try { h.set(k,v); } catch(_){} }
        } else if (hdrs && typeof hdrs === 'object') {
            for (const [k,v] of Object.entries(hdrs)) { try { h.set(k,String(v)); } catch(_){} }
        }
    } catch(_) {}
    return new Response(raw.body ?? null, {
        status: raw.status || 200,
        statusText: raw.statusText || 'OK',
        headers: h
    });
}

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, ScramjetHeaders, defaultConfig } = self.$scramjet;

    const rawEpoxy = await getEpoxy();
    const transport = rawEpoxy ? {
        ...rawEpoxy,
        async request(remote, method, body, headers, signal) {
            // Scramjet expects transport.request to return { body, headers, status, statusText }
            // where headers is ideally a Headers object or something iterable.
            const res = await rawEpoxy.request(remote, method, body, headers, signal);
            if (res && res.headers && !(res.headers instanceof Headers)) {
                // Convert plain object/array headers to Headers object to fix "k is not iterable"
                res.headers = new Headers(res.headers);
            }
            console.log(`[SW] ${method} ${remote.origin} -> ${res.status}`);
            return res;
        }
    } : {
        async init() {},
        async request(remote, method, body, headers, signal) {
            const plain = {};
            if (headers) headers.forEach((v,k) => plain[k]=v);
            const m = (method||'GET').toUpperCase();
            return fetch(remote.toString(), {
                method: m, headers: plain,
                body: ['GET','HEAD'].includes(m) ? undefined : (body||undefined),
                signal: signal||undefined
            });
        },
        async fetch(url, init) { return fetch(url.toString(), init||{}); },
        connect() {}
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
            for (const c of await self.clients.matchAll())
                c.postMessage({ type:'scramjet-set-cookie', url:url.href, cookie });
        }
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
            event.request.headers.forEach((v, k) => { try { sjHeaders.set(k, v); } catch(_) {} });
            
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
            return new Response('Proxy error: '+e.message, { status:500 });
        }
    })());
});
