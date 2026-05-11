// Scramjet v2 Service Worker - v2.2.6 (URL Object Fix)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';

let handler;
let epoxy = null;

async function getEpoxy() {
    if (epoxy?.ready) return epoxy;
    try {
        const EpoxyTransport = self.EpxMod?.default || self.EpxMod?.EpoxyTransport || self.EpxMod;
        if (typeof EpoxyTransport === 'function' || (EpoxyTransport && typeof EpoxyTransport.prototype?.init === 'function')) {
            const t = new EpoxyTransport({ wisp: WISP_URL });
            await t.init();
            epoxy = t;
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
        if (hdrs) {
            if (typeof hdrs.forEach === 'function') hdrs.forEach((v, k) => h.set(k, v));
            else if (typeof hdrs.entries === 'function') {
                for (const [k, v] of hdrs.entries()) h.set(k, v);
            } else if (typeof hdrs[Symbol.iterator] === 'function') {
                for (const [k, v] of hdrs) h.set(k, v);
            } else {
                for (const k in hdrs) h.set(k, String(hdrs[k]));
            }
        }
    } catch(e) {}

    if (!h.has('content-type')) h.set('content-type', 'text/html; charset=UTF-8');
    
    return new Response(raw.body || null, {
        status: raw.status || 200,
        statusText: raw.statusText || 'OK',
        headers: h
    });
}

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, defaultConfig } = self.$scramjet;

    const rawEpoxy = await getEpoxy();
    const transport = rawEpoxy ? {
        ...rawEpoxy,
        async request(remote, method, body, headers, signal) {
            const res = await rawEpoxy.request(remote, method, body, headers, signal);
            return {
                body: res.body || null,
                headers: (res.headers instanceof Headers) ? res.headers : new Headers(res.headers),
                status: res.status || 200,
                statusText: res.statusText || 'OK'
            };
        }
    } : {
        async init() {},
        async request(remote, method, body, headers, signal) {
            const plain = {};
            if (headers) headers.forEach((v,k) => plain[k]=v);
            const m = (method||'GET').toUpperCase();
            const r = await fetch(remote.toString(), {
                method: m, headers: plain,
                body: ['GET','HEAD'].includes(m) ? null : (body||null),
                signal: signal||undefined
            });
            return { body: r.body, headers: r.headers, status: r.status, statusText: r.statusText };
        },
        async fetch(url, init) { return fetch(url.toString(), init||{}); },
        connect() {}
    };

    const codecDecode = s => {
        if (!s) return 'https://uiqm.lol/';
        let p = s;
        if (p.startsWith('network/')) p = p.slice(8);
        if (p.startsWith('scramjet/')) p = p.slice(9);
        if (!p) return 'https://uiqm.lol/';
        try { 
            const d = decodeURIComponent(p); 
            return d.includes('://') ? d : 'https://'+d; 
        } catch { return p; }
    };

    handler = new ScramjetFetchHandler({
        transport,
        crossOriginIsolated: false,
        context: {
            config: defaultConfig,
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            interface: {
                codecEncode: s => encodeURIComponent(s),
                codecDecode,
                getInjectScripts: (_m, _h, script) => [
                    script('/worker/working.all.js'),
                    {
                        type: 'script',
                        content: `
                            if (window.$scramjet && !window.$scramjet$pushsourcemap) {
                                try {
                                    const client = new window.$scramjet.ScramjetClient(window, {
                                        context: window.$scramjet.defaultConfig,
                                        transport: { request: () => { throw new Error("Client transport not initialized"); } }
                                    });
                                    client.hook();
                                    window.$scramjet$pushsourcemap = (...args) => {};
                                } catch(e) {}
                            }
                        `
                    }
                ]
            },
            cookieJar: { getCookies: ()=>'', setCookies: ()=>{} }
        },
        sendSetCookie: async (url, cookie) => {
            for (const c of await self.clients.matchAll())
                c.postMessage({ type:'scramjet-set-cookie', url:url.href, cookie });
        }
    });
    handler._codecDecode = codecDecode;
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
            
            const path = url.pathname.slice(SCRAM_PREFIX.length);
            const decodedUrl = h._codecDecode(path);
            
            const isGetHead = ['GET','HEAD'].includes(event.request.method.toUpperCase());
            const raw = await h.handleFetch({
                rawUrl: new URL(decodedUrl),
                rawClientUrl: event.request.referrer ? new URL(event.request.referrer) : new URL(self.location.origin),
                method: event.request.method,
                initialHeaders: sjHeaders,
                body: isGetHead ? null : event.request.body,
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
