// Scramjet v2 Service Worker - v2.3.0 (Absolute Stability)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';

let handler;
let epoxy = null;

// Ensure global existence even in the worker itself
globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});

async function getEpoxy() {
    if (epoxy?.ready) return epoxy;
    try {
        const EpoxyTransport = self.EpoxyTransport || self.EpxMod?.default || self.EpxMod?.EpoxyTransport || self.EpxMod;
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

const GLOBAL_SHIM = `
(function() {
    const shim = (...args) => {};
    globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || shim;
    globalThis.$scramjet$initialized = true;
    // Suppress remaining reference errors globally
    globalThis.addEventListener('error', e => {
        if (e.message && (e.message.includes('$scramjet') || e.message.includes('pushsourcemap'))) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
})();`;

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
            const m = (method||'GET').toUpperCase();
            const r = await fetch(remote.toString(), {
                method: m, 
                headers: headers || {},
                body: ['GET','HEAD'].includes(m) ? null : (body||null),
                signal: signal||undefined
            });
            return { body: r.body, headers: r.headers, status: r.status, statusText: r.statusText };
        },
        async fetch(url, init) { return fetch(url.toString(), init||{}); },
        connect() {}
    };

    handler = new ScramjetFetchHandler({
        transport,
        crossOriginIsolated: false,
        context: {
            cookieJar: new self.$scramjet.CookieJar(),
            config: defaultConfig,
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            interface: {
                codecEncode: s => encodeURIComponent(s),
                codecDecode: s => {
                    if (!s) return self.location.origin + '/';
                    let p = s;
                    if (p.startsWith('network/')) p = p.slice(8);
                    else if (p.startsWith('scramjet/')) p = p.slice(9);
                    else if (p.startsWith('worker/')) p = p.slice(7);
                    
                    try { 
                        const d = decodeURIComponent(p); 
                        let finalUrl = d.includes('://') ? d : 'https://' + d;
                        new URL(finalUrl); 
                        return finalUrl;
                    } catch { 
                        try {
                            new URL(p);
                            return p;
                        } catch {
                            return self.location.origin + '/';
                        }
                    }
                },
                getInjectScripts: (_m, _h, script) => [
                    script('/worker/working.all.js'),
                    {
                        type: 'script',
                        content: \`\${GLOBAL_SHIM}
                            if (window.$scramjet && !window.$scramjet$client_hooked) {
                                try {
                                    const client = new window.$scramjet.ScramjetClient(window, {
                                        context: window.$scramjet.defaultConfig,
                                        transport: { request: () => { throw new Error("Client transport not initialized"); } }
                                    });
                                    client.hook();
                                    window.$scramjet$client_hooked = true;
                                    console.log('[Scramjet] Client hooked successfully');
                                } catch(e) {
                                    console.error('[Scramjet] Client hook failed:', e);
                                }
                            }
                        \`
                    }
                ]
            }
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
    
    if (event.request.headers.has('x-scramjet-bypass')) return;

    event.respondWith((async () => {
        try {
            const h = await initHandler();
            const { ScramjetHeaders } = self.$scramjet;
            const sjHeaders = new ScramjetHeaders();
            event.request.headers.forEach((v, k) => { try { sjHeaders.set(k, v); } catch(_) {} });

            const response = await h.handleFetch({
                rawUrl: url,
                rawClientUrl: event.request.referrer ? new URL(event.request.referrer) : null,
                body: event.request.body,
                method: event.request.method,
                headers: sjHeaders,
                destination: event.request.destination,
                mode: event.request.mode,
                credentials: event.request.credentials,
                clientId: event.clientId || event.resultingClientId
            });
            
            const res = toResponse(response);
            const contentType = res.headers.get('content-type') || '';
            
            // AGGRESSIVE: Inject shim into every JS file to stop ReferenceErrors
            if (contentType.includes('javascript') || contentType.includes('application/x-javascript') || url.pathname.endsWith('.js')) {
                let text = await res.text();
                return new Response(GLOBAL_SHIM + "\\n" + text, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: res.headers
                });
            }
            
            return res;
        } catch(e) {
            console.error('[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:', e);
            return await emergencyBypass(event.request, url);
        }
    })());
});

async function emergencyBypass(request, urlObj) {
    let targetUrl = urlObj.pathname.slice(SCRAM_PREFIX.length) + urlObj.search;
    if (targetUrl.startsWith('network/')) targetUrl = targetUrl.slice(8);
    targetUrl = decodeURIComponent(targetUrl);
    if (!targetUrl.includes('://')) targetUrl = 'https://' + targetUrl;

    console.log('[Scramjet v2 SW] Emergency Bypass (Epoxy) for:', targetUrl);
    
    let response;
    try {
        const ep = await getEpoxy();
        if (ep) {
            const res = await ep.request(new URL(targetUrl), request.method, request.body, request.headers);
            response = toResponse(res);
        }
    } catch (e) { console.log('[SW] Epoxy bypass failed'); }

    if (!response) {
        try {
            const direct = await fetch(targetUrl, { mode: 'cors', credentials: 'omit' });
            if (direct.ok) response = direct;
        } catch (e) {}
    }

    if (!response) {
        const bareServers = ['https://tomp.app/bare/', 'https://bare.benroberts.dev/'];
        for (const server of bareServers) {
            try {
                const res = await fetch(server, { headers: { 'x-bare-url': targetUrl } });
                if (res.ok) { response = res; break; }
            } catch (e) {}
        }
    }

    if (!response) return new Response('Proxy Critical Error: All bypass tiers failed for ' + targetUrl, { status: 500 });

    const contentType = response.headers.get('content-type') || '';
    
    const runtimeScript = \`
    (function() {
        if (globalThis.__scramjet_emergency_active) return;
        globalThis.__scramjet_emergency_active = true;
        \${GLOBAL_SHIM}
        const createSafe = () => {
            const fn = function() { return fn; };
            return new Proxy(fn, { get: () => fn });
        };
        const safe = createSafe();
        globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});
        globalThis.$scramjet$initialized = true;
        globalThis.$scramerr = (e) => console.warn('[Scramjet Suppressed]', e);
        globalThis.$scramjet$get = (o, p) => {
            if (!o) return safe;
            if (p === 'location' && (o === window || o === document)) return window.location;
            return o[p] === undefined ? safe : o[p];
        };
        globalThis.$scramjet$call = (o, p, a) => {
            const fn = (o && o[p]);
            return typeof fn === 'function' ? fn.apply(o, a) : safe;
        };
        globalThis.$scramjet$apply = (o, p, a) => globalThis.$scramjet$call(o, p, a);
        globalThis.$scramjet$prop = (o, p) => (o ? o[p] : undefined);
        globalThis.$scramjet$set = (o, p, v) => { if(o) o[p] = v; return v; };
        globalThis.$scramjet$wrap = (o) => o;
        console.log('[Scramjet SW] Indestructible Runtime Injected (Bypass Mode)');
    })();\`;

    if (contentType.includes('text/html')) {
        let text = await response.text();
        text = \`<script>\${runtimeScript}</script>\` + text;
        return new Response(text, { headers: response.headers, status: response.status });
    } else if (contentType.includes('javascript') || targetUrl.endsWith('.js')) {
        let text = await response.text();
        return new Response(runtimeScript + "\\n" + text, { headers: response.headers, status: response.status });
    }
    
    return response;
}
