// Scramjet v2 Service Worker - v2.2.9 (Ultimate Request Fix)
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
                    // Standard prefixes used by this site
                    if (p.startsWith('network/')) p = p.slice(8);
                    else if (p.startsWith('scramjet/')) p = p.slice(9);
                    else if (p.startsWith('worker/')) p = p.slice(7);
                    
                    try { 
                        const d = decodeURIComponent(p); 
                        let finalUrl = d.includes('://') ? d : 'https://' + d;
                        new URL(finalUrl); 
                        return finalUrl;
                    } catch { 
                        // Fallback: try to see if p itself is a URL
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
                        content: `
                            window.$scramjet$pushsourcemap = (...args) => {};
                            if (window.$scramjet && !window.$scramjet$initialized) {
                                try {
                                    const client = new window.$scramjet.ScramjetClient(window, {
                                        context: window.$scramjet.defaultConfig,
                                        transport: { request: () => { throw new Error("Client transport not initialized"); } }
                                    });
                                    client.hook();
                                    window.$scramjet$initialized = true;
                                    console.log('[Scramjet] Client hooked successfully');
                                } catch(e) {
                                    console.error('[Scramjet] Client hook failed:', e);
                                }
                            }
                        `
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

            const isGetHead = ['GET','HEAD'].includes(event.request.method.toUpperCase());
            const response = await h.handleFetch({
                rawUrl: new URL(event.request.url),
                rawClientUrl: event.request.referrer ? new URL(event.request.referrer) : new URL(self.location.origin),
                method: event.request.method,
                initialHeaders: sjHeaders,
                body: isGetHead ? null : event.request.body,
                destination: event.request.destination,
                mode: event.request.mode,
                credentials: event.request.credentials,
                clientId: event.clientId || event.resultingClientId
            });
            return toResponse(response);
        } catch(e) {
            console.error('[Scramjet v2 SW] Fetch error, attempting raw transport bypass:', e);
            
            try {
                // Manually decode the target URL
                const urlObj = new URL(event.request.url);
                let targetUrl = urlObj.pathname.slice(SCRAM_PREFIX.length) + urlObj.search;
                if (targetUrl.startsWith('network/')) targetUrl = targetUrl.slice(8);
                targetUrl = decodeURIComponent(targetUrl);
                if (!targetUrl.includes('://')) targetUrl = 'https://' + targetUrl;

                console.log('[Scramjet v2 SW] Emergency Bypass using Bare Server for:', targetUrl);
                
                // Use Bare server directly for fallback to avoid CORS/404 issues
                const bareServer = location.origin + '/bare/';
                const response = await fetch(bareServer, {
                    headers: {
                        'x-bare-url': targetUrl,
                        'x-bare-headers': JSON.stringify({
                            'User-Agent': navigator.userAgent,
                            'Accept': '*/*',
                            'Referer': targetUrl
                        }),
                        'x-bare-forward-headers': '[]'
                    },
                    credentials: 'omit'
                });

                if (!response.ok) throw new Error('Bare fallback failed with status ' + response.status);

                const contentType = response.headers.get('content-type') || '';
                
                // FALLBACK REWRITING FOR BYPASSED CONTENT
                if (contentType.includes('text/html')) {
                        let text = await response.text();
                        const baseObj = new URL(targetUrl);
                        
                        // Safety script injection (Indestructible Runtime Polyfill)
                        const safetyScript = `
<script>
(function() {
    if (window.__scramjet_emergency_active) return;
    window.__scramjet_emergency_active = true;
    
    // Recursive Safety Proxy: returns a function that returns itself
    const createSafe = () => {
        const fn = function() { return fn; };
        return new Proxy(fn, { get: () => fn });
    };
    const safeObj = createSafe();

    window.$scramjet$prefix = "${SCRAM_PREFIX}";
    window.$scramjet$pushsourcemap = () => {};
    window.$scramjet$unfurl = (o) => o;
    window.$scramjet$wrap = (o) => o;
    window.$scramjet$getSource = (o) => o;
    window.$scramerr = (e) => console.warn('[Scramjet Suppressed]', e);
    
    // Smart Property Access
    window.$scramjet$prop = (o, p) => (o && typeof o === 'object') ? o[p] : undefined;
    window.$scramjet$get = (o, p) => {
        if (!o) return safeObj;
        if (p === 'location' && (o === window || o === document)) return window.location;
        let v = o[p];
        return v === undefined ? safeObj : v;
    };
    window.$scramjet$set = (o, p, v) => { if(o && typeof o === 'object') o[p] = v; return v; };
    window.$scramjet$call = (o, p, a) => {
        const fn = (o && typeof o === 'object') ? o[p] : null;
        return typeof fn === 'function' ? fn.apply(o, a) : safeObj;
    };
    window.$scramjet$apply = (o, p, a) => window.$scramjet$call(o, p, a);
    window.$scramjet$construct = (o, a) => {
        try { return new o(...a); } catch(e) { return safeObj; }
    };
    console.warn('[Scramjet SW] Indestructible Runtime Active');
})();
</script>`;
                        text = text.replace('<head>', '<head>' + safetyScript);
                        if (!text.includes(safetyScript)) text = safetyScript + text;

                        // Basic attribute rewriter
                        text = text.replace(/(src|href|action)\s*=\s*["']([^"']+)["']/gi, (match, attr, val) => {
                            if (val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('javascript:') || val.startsWith('#') || val.startsWith(SCRAM_PREFIX)) return match;
                            try {
                                const abs = new URL(val, baseObj.href).href;
                                return `${attr}="${SCRAM_PREFIX}${encodeURIComponent(abs)}"`;
                            } catch { return match; }
                        });
                        
                        return new Response(text, { status: response.status, headers: response.headers });
                        
                    } else if (contentType.includes('javascript') || contentType.includes('application/x-javascript')) {
                        let text = await response.text();
                        // Inject the polyfill into bypassed JS files as well
                        const jsPolyfill = `
(function(){
    if(typeof window !== "undefined" && !window.__scramjet_emergency_active) {
        const s = function() { return s; };
        const safe = new Proxy(s, { get: () => s });
        window.$scramjet$prop = window.$scramjet$prop || ((o, p) => (o && typeof o === 'object') ? o[p] : undefined);
        window.$scramjet$get = window.$scramjet$get || ((o, p) => {
            if(!o) return safe;
            const v = o[p];
            return v === undefined ? safe : v;
        });
        window.$scramjet$call = window.$scramjet$call || ((o, p, a) => (o && typeof o[p] === 'function') ? o[p].apply(o, a) : safe);
        window.$scramerr = window.$scramerr || (() => {});
        window.$scramjet$wrap = window.$scramjet$wrap || ((o) => o);
    }
})();\n`;
                        return new Response(jsPolyfill + text, { status: response.status, headers: response.headers });
                    }
                    
                    return response;
                }
                throw new Error('Transport unavailable');
            } catch (bypassErr) {
                console.error('[Scramjet v2 SW] Bypass failed:', bypassErr);
                return new Response('Proxy Critical Error: ' + e.message, { status: 500 });
            }
        }
    })());
});
