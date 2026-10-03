// Scramjet v2 Service Worker - v2.5.0 (Root Cause Fixed)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

// Server maps: scram/ -> worker/ so the external URL is /worker/
const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';
const ORIGIN = self.location.origin;

let handler;
let epoxy = null;

globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});

async function getEpoxy() {
    if (epoxy && epoxy.ready) return epoxy;
    try {
        const EpoxyTransport = self.EpoxyTransport || (self.EpxMod && (self.EpxMod.default || self.EpxMod.EpoxyTransport || self.EpxMod));
        if (EpoxyTransport && (typeof EpoxyTransport === 'function' || typeof EpoxyTransport.prototype?.init === 'function')) {
            const t = new EpoxyTransport({ wisp: WISP_URL });
            await t.init();
            epoxy = t;
            return epoxy;
        }
    } catch(e) { console.warn('[SW] Epoxy init failed:', e); }
    return null;
}

// Headers that must be stripped from every proxied response to allow iframe embedding
const BLOCKED_HEADERS = [
    'x-frame-options',
    'content-security-policy',
    'content-security-policy-report-only',
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
    'cross-origin-resource-policy',
    'x-content-type-options'
];

function sanitizeHeaders(h) {
    BLOCKED_HEADERS.forEach(name => h.delete(name));
    // Allow all origins so sub-resources load
    h.set('access-control-allow-origin', '*');
    h.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE');
    h.set('access-control-allow-headers', '*');
    return h;
}

// Status codes that must not have a response body per spec
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

function toResponse(raw) {
    const status = raw.status || 200;
    const nullBody = NULL_BODY_STATUSES.has(status);

    if (raw instanceof Response) {
        const h = new Headers(raw.headers);
        sanitizeHeaders(h);
        return new Response(nullBody ? null : raw.body, {
            status,
            statusText: raw.statusText,
            headers: h
        });
    }
    const h = new Headers();
    try {
        const hdrs = raw.headers;
        if (hdrs) {
            if (typeof hdrs.forEach === 'function') hdrs.forEach((v, k) => h.set(k, v));
            else if (typeof hdrs.entries === 'function') { for (const [k, v] of hdrs.entries()) h.set(k, v); }
            else if (typeof hdrs[Symbol.iterator] === 'function') { for (const [k, v] of hdrs) h.set(k, v); }
            else { for (const k in hdrs) h.set(k, String(hdrs[k])); }
        }
    } catch(e) {}
    if (!nullBody && !h.has('content-type')) h.set('content-type', 'text/html; charset=UTF-8');
    sanitizeHeaders(h);
    return new Response(nullBody ? null : (raw.body || null), {
        status,
        statusText: raw.statusText || 'OK',
        headers: h
    });
}

// Safe URL parser — never throws, always returns a URL object
function safeURL(str, base) {
    if (str instanceof URL) return str;
    if (!str || typeof str !== 'string') return new URL(base || (ORIGIN + '/'));
    try { return new URL(str); } catch(_) {}
    try { return new URL(str, base || ORIGIN); } catch(_) {}
    return new URL(ORIGIN + '/');
}

const GLOBAL_SHIM = `
(function() {
    if (globalThis.$scramjet$initialized) return;
    const createSafe = () => {
        const s = new Proxy(function() { return s; }, {
            get: (t, p) => {
                if (p === 'then') return undefined;
                if (p === Symbol.toPrimitive) return () => '';
                if (p === 'toString' || p === 'valueOf') return () => '';
                if (p === 'length') return 0;
                if (p === Symbol.iterator) return function*() {};
                return s;
            },
            set: () => true,
            defineProperty: () => true,
            deleteProperty: () => true,
            has: () => true,
            apply: () => s,
            construct: () => s
        });
        return s;
    };
    const safe = createSafe();
    globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});
    globalThis.$scramjet$initialized = true;

    // Scramjet runtime shims (prevents ReferenceErrors on rewritten scripts)
    globalThis.$scramerr = globalThis.$scramerr || ((e) => {});
    globalThis.$scramjet$get = globalThis.$scramjet$get || ((o, p) => {
        if (!o) return undefined;
        if (p === 'location' && (o === (typeof window !== 'undefined' ? window : null) || o === (typeof document !== 'undefined' ? document : null))) {
            return typeof window !== 'undefined' ? window.location : (typeof self !== 'undefined' ? self.location : undefined);
        }
        try { return o[p]; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$call = globalThis.$scramjet$call || ((o, p, a) => {
        try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => globalThis.$scramjet$call(o, p, a));
    globalThis.$scramjet$prop = (p) => p;
    globalThis.$scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if(o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
    globalThis.$scramjet$wrap = (o) => o;
    globalThis.$scramjet$clean = (...a) => a;
    globalThis.$scramjet$tryset = (o, p, v) => { try { o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$pushsourcemap = () => {};
    var $scramjet$prop = globalThis.$scramjet$prop;
    var $scramjet$wrap = globalThis.$scramjet$wrap;
    var $scramjet$clean = globalThis.$scramjet$clean;
    var $scramjet$tryset = globalThis.$scramjet$tryset;

    // Array/String/Number Guard — stops "called on null" crashes without corrupting returns
    const wrapProto = (proto, methods) => {
        if (!proto) return;
        methods.forEach(m => {
            const orig = proto[m];
            if (!orig) return;
            proto[m] = function(...args) {
                if (this == null) return undefined;
                return orig.apply(this, args);
            };
        });
    };
    wrapProto(Array.prototype, ['every','forEach','indexOf','join','lastIndexOf','reduce','reduceRight','some','sort','filter','map','find','findIndex','flat','includes']);
    wrapProto(String.prototype, ['endsWith','includes','matchAll','startsWith','split','match','replace','replaceAll','slice','trim']);
    wrapProto(Number.prototype, ['toExponential','toFixed','toPrecision']);

    // Proxy intercept for fetch/XHR
    const PROXY_ROOT = '/worker/network/';
    let targetOrigin = '';
    try {
        const loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
        if (loc) {
            const match = loc.pathname.match(/\/worker\/network\/([^/?#]+)/);
            if (match) {
                const decoded = decodeURIComponent(match[1]);
                const parsed = new URL(decoded.includes('://') ? decoded : 'https://' + decoded);
                targetOrigin = parsed.origin;
            }
        }
    } catch(_) {}

    const isExternal = u => {
        if (typeof u !== 'string') return false;
        const myOrigin = (typeof location !== 'undefined' && location.origin) || (typeof self !== 'undefined' && self.location && self.location.origin) || '';
        return u.includes('://') && (!myOrigin || !u.startsWith(myOrigin));
    };

    const wrapUrl = u => {
        if (!u) return u;
        let str = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : String(u)));
        if (!str || typeof str !== 'string') return u;
        if (isExternal(str)) return PROXY_ROOT + encodeURIComponent(str);
        if (str.startsWith('/') && !str.startsWith('/worker/') && !str.startsWith('/cron/') && !str.startsWith('/gmt/') && !str.startsWith('/epoch/') && targetOrigin) {
            return PROXY_ROOT + encodeURIComponent(targetOrigin + str);
        }
        return str;
    };

    try {
        const rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        const origFetch = rootGlobal.fetch;
        if (origFetch) {
            rootGlobal.fetch = function(resource, init) {
                try {
                    if (typeof resource === 'string') {
                        resource = wrapUrl(resource);
                    } else if (resource instanceof URL) {
                        resource = wrapUrl(resource.href);
                    } else if (resource && typeof resource === 'object' && 'url' in resource) {
                        const newUrl = wrapUrl(resource.url);
                        if (newUrl !== resource.url) {
                            resource = new Request(newUrl, resource);
                        }
                    }
                } catch(_) {}
                return origFetch.call(this, resource, init);
            };
        }
    } catch(_) {}

    try {
        const rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.XMLHttpRequest && rootGlobal.XMLHttpRequest.prototype) {
            const origOpen = rootGlobal.XMLHttpRequest.prototype.open;
            rootGlobal.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                try { url = wrapUrl(url); } catch(_) {}
                return origOpen.call(this, method, url, ...rest);
            };
        }
    } catch(_) {}

    // Stub out commonly missing globals that crash Roblox/React apps
    const stubs = ['jQuery','$','React','ReactDOM','CoreUtilities','CoreRobloxUtilities','angular','bootstrap','ReactStyleGuide','Sentry','require'];
    stubs.forEach(lib => {
        if (!(lib in globalThis)) {
            try { Object.defineProperty(globalThis, lib, { get: () => safe, set: (v) => {}, configurable: true, enumerable: false }); } catch(_) {}
        }
    });

    // Suppress known harmless errors
    if (typeof globalThis.addEventListener === 'function') {
        globalThis.addEventListener('error', e => {
            if (!e.message) return;
            const msg = e.message;
            if (msg.includes('is not defined') || msg.includes('not a function') ||
                msg.includes('$scramjet') || msg.includes('Cannot read properties of null') ||
                msg.includes('Cannot read properties of undefined') ||
                msg.includes('$scramerr') || msg.includes('Bootstrap') ||
                msg.includes('jQuery') || msg.includes('Unsafe legacy')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);

        globalThis.addEventListener('unhandledrejection', e => {
            if (e.reason && (String(e.reason).includes('$scramjet') || String(e.reason).includes('is not defined'))) {
                e.preventDefault();
            }
        });
    }
})();`;

const SCRIPT_HEADER = `if (typeof globalThis.$scramjet$initialized === 'undefined') {
    globalThis.$scramjet$initialized = true;
    globalThis.$scramjet$prop = (p) => p;
    globalThis.$scramjet$wrap = (o) => o;
    globalThis.$scramjet$get = (o, p) => { try { return o[p]; } catch(_) { return undefined; } };
    globalThis.$scramjet$call = (o, p, a) => { try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; } };
    globalThis.$scramjet$apply = (o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined);
    globalThis.$scramjet$set = (o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$clean = (...a) => a;
    globalThis.$scramjet$tryset = (o, p, v) => { try { o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$pushsourcemap = () => {};
}
var $scramjet$wrap = globalThis.$scramjet$wrap || ((o) => o);
var $scramjet$prop = globalThis.$scramjet$prop || ((p) => p);
var $scramjet$get = globalThis.$scramjet$get || ((o, p) => { try { return o[p]; } catch(_) { return undefined; } });
var $scramjet$call = globalThis.$scramjet$call || ((o, p, a) => { try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; } });
var $scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined));
var $scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
var $scramjet$clean = globalThis.$scramjet$clean || ((...a) => a);
var $scramjet$tryset = globalThis.$scramjet$tryset || ((o, p, v) => { try { o[p] = v; } catch(_) {} return v; });
var $scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});`;

function injectScriptHeader(code) {
    if (typeof code !== 'string') return code;
    const strictMatch = code.match(/^\\s*(['"])use strict\\1;?/);
    if (strictMatch) {
        return strictMatch[0] + '\\n' + SCRIPT_HEADER + '\\n' + code.slice(strictMatch[0].length);
    }
    return SCRIPT_HEADER + '\\n' + code;
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
                headers: (res.headers instanceof Headers) ? res.headers : new Headers(res.headers || {}),
                status: res.status || 200,
                statusText: res.statusText || 'OK'
            };
        }
    } : {
        async init() {},
        async request(remote, method, body, headers, signal) {
            const m = (method || 'GET').toUpperCase();
            const r = await fetch(remote.toString(), {
                method: m,
                headers: headers || {},
                body: ['GET','HEAD'].includes(m) ? null : (body || null),
                signal: signal || undefined
            });
            return { body: r.body, headers: r.headers, status: r.status, statusText: r.statusText };
        },
        async fetch(url, init) { return fetch(url.toString(), init || {}); },
        connect() {}
    };

    handler = new ScramjetFetchHandler({
        transport,
        crossOriginIsolated: false,
        context: {
            prefix: new URL(SCRAM_PREFIX, self.location.origin),
            cookieJar: new self.$scramjet.CookieJar(),
            config: { ...defaultConfig, rewriteHtml: true, rewriteJs: true, rewriteCss: true },
            interface: {
                codecEncode: s => encodeURIComponent(s),
                // CRITICAL FIX: codecDecode MUST return a URL object.
                // Scramjet internally calls .href on the return value.
                // Returning a string means .href = undefined → crash.
                codecDecode: s => {
                    try {
                        if (!s) return new URL(ORIGIN + '/');
                        let p = String(s);
                        if (p.startsWith('#')) p = p.slice(1);
                        if (p.includes('#')) p = p.split('#')[0];
                        if (p.startsWith('network/')) p = p.slice(8);
                        if (!p) return new URL(ORIGIN + '/');
                        try {
                            const d = decodeURIComponent(p);
                            const urlStr = d.includes('://') ? d : 'https://' + d;
                            return new URL(urlStr);
                        } catch(_) {
                            const urlStr = p.includes('://') ? p : 'https://' + p;
                            return new URL(urlStr);
                        }
                    } catch(_) {
                        return new URL(ORIGIN + '/');
                    }
                },
                getInjectScripts: (_m, _h, script) => [
                    script('/worker/working.all.js')
                ],
                getWorkerInjectScripts: (_m, _t, script) => script('/worker/working.all.js')
            }

        },
        // NOTE: The installed @mercuryworkshop/scramjet npm package (v2.0.2-alpha)
        // calls sendSetCookie(url, cookie) — old 2-arg signature — NOT the array format
        // that appears in the newer unbuilt TypeScript source.
        sendSetCookie: async (url, cookie) => {
            for (const c of await self.clients.matchAll())
                c.postMessage({ type: 'scramjet-set-cookie', url: url.href, cookie });
        },
        fetchBlobUrl: async (url) => fetch(url),
        fetchDataUrl: async (url) => fetch(url)
    });
    return handler;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const skip = ['working.all.js', 'working.sw.js', 'working.wasm.wasm', 'epoch/index.js'];
    if (skip.some(s => url.pathname.endsWith(s))) return;
    if (event.request.headers.has('x-scramjet-bypass')) return;

    const isSameOrigin = url.origin === self.location.origin;
    const isLocalAsset = isSameOrigin && (
        url.pathname.startsWith('/cron/') ||
        url.pathname.startsWith('/gmt/') ||
        url.pathname.startsWith('/unix/') ||
        url.pathname.startsWith('/epoch/') ||
        url.pathname.startsWith('/assets/') ||
        url.pathname.startsWith('/dist/') ||
        url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname === '/games' ||
        url.pathname === '/newsession' ||
        url.pathname === '/favicon.ico'
    );

    if (isLocalAsset) return;

    // Cross-origin top-level navigation inside frame -> redirect to Scramjet URL
    if (!isSameOrigin && event.request.mode === 'navigate') {
        const scramUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(url.href), self.location.origin);
        return event.respondWith(Response.redirect(scramUrl.href, 307));
    }

    let rawUrl;
    let rawClientUrl;

    if (isSameOrigin && url.pathname.startsWith(SCRAM_PREFIX)) {
        rawUrl = url;
        rawClientUrl = event.request.referrer
            ? safeURL(event.request.referrer)
            : new URL(url.origin + '/');
    } else if (!isSameOrigin) {
        rawUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(url.href), self.location.origin);
        rawClientUrl = event.request.referrer
            ? safeURL(event.request.referrer)
            : new URL('https://www.youtube.com/');
    } else {
        // Same-origin request not starting with /worker/
        const ref = event.request.referrer || '';
        const match = ref.match(/\/worker\/network\/([^/?#]+)/);
        if (match) {
            try {
                const dec = decodeURIComponent(match[1]);
                const baseOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
                const fullTarget = baseOrigin + url.pathname + url.search;
                rawUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(fullTarget), self.location.origin);
                rawClientUrl = safeURL(ref);
            } catch(_) {
                return;
            }
        } else {
            return;
        }
    }

    event.respondWith((async () => {
        try {
            const h = await initHandler();
            const { ScramjetHeaders } = self.$scramjet;
            const sjHeaders = new ScramjetHeaders();
            event.request.headers.forEach((v, k) => { try { sjHeaders.set(k, v); } catch(_) {} });

            const response = await h.handleFetch({
                rawUrl,
                rawClientUrl,
                body: ['GET','HEAD'].includes(event.request.method) ? null : event.request.body,
                method: event.request.method,
                initialHeaders: sjHeaders,
                destination: event.request.destination,
                mode: event.request.mode,
                referrer: event.request.referrer,
                cache: event.request.cache
            });

            const res = toResponse(response);
            const contentType = res.headers.get('content-type') || '';

            if (!NULL_BODY_STATUSES.has(res.status) && (contentType.includes('javascript') || rawUrl.pathname.endsWith('.js') || event.request.destination === 'script' || event.request.destination === 'worker')) {
                try {
                    let jsText = await res.text();
                    jsText = injectScriptHeader(jsText);
                    const jsHeaders = new Headers(res.headers);
                    jsHeaders.set('content-type', 'application/javascript; charset=UTF-8');
                    return new Response(jsText, { headers: jsHeaders, status: res.status, statusText: res.statusText });
                } catch(_) {}
            }

            return res;
        } catch(e) {
            console.error('[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:', e);
            return await emergencyBypass(event.request, rawUrl || url);
        }

    })());
});

async function emergencyBypass(request, urlObj) {
    let targetUrl;
    if (urlObj.origin !== self.location.origin) {
        targetUrl = urlObj.href;
    } else {
        targetUrl = urlObj.pathname.slice(SCRAM_PREFIX.length) + urlObj.search;
        if (targetUrl.startsWith('network/')) targetUrl = targetUrl.slice(8);
        try { targetUrl = decodeURIComponent(targetUrl); } catch(_) {}
        if (!targetUrl.includes('://')) targetUrl = 'https://' + targetUrl;
    }

    console.log('[Scramjet v2 SW] Emergency Bypass for:', targetUrl);

    let response;
    try {
        const ep = await getEpoxy();
        if (ep) {
            const epHeaders = {};
            if (request.headers && typeof request.headers.forEach === 'function') {
                request.headers.forEach((v, k) => {
                    const lk = k.toLowerCase();
                    if (lk !== 'host' && lk !== 'origin' && lk !== 'referer') epHeaders[k] = v;
                });
            }
            if (targetUrl.includes('youtube.com') || targetUrl.includes('googlevideo.com') || targetUrl.includes('gstatic.com')) {
                epHeaders['referer'] = 'https://www.youtube.com/';
            }
            const body = ['GET', 'HEAD'].includes(request.method) ? null : request.body;
            const res = await ep.request(new URL(targetUrl), request.method, body, epHeaders);
            response = toResponse(res);
        }
    } catch(e) { console.warn('[SW] Epoxy bypass failed:', e.message); }

    if (!response) {
        try {
            const direct = await fetch(targetUrl, { mode: 'no-cors', credentials: 'omit' });
            if (direct.ok || direct.type === 'opaque') response = direct;
        } catch(_) {}
    }

    if (!response) return new Response('Proxy Error: All bypass tiers failed for ' + targetUrl, { status: 502 });

    const bypassStatus = response.status || 200;
    const bypassNullBody = NULL_BODY_STATUSES.has(bypassStatus);
    const contentType = bypassNullBody ? '' : (response.headers.get('content-type') || '');

    // Strip blocking headers from bypass responses too
    const bypassHeaders = new Headers(response.headers);
    sanitizeHeaders(bypassHeaders);

    // Null-body responses (204, 304, etc.) — return immediately with no body
    if (bypassNullBody) {
        return new Response(null, { headers: bypassHeaders, status: bypassStatus });
    }

    // Skip binary injection
    if (contentType.includes('font') || contentType.includes('image') || contentType.includes('wasm')) {
        return new Response(response.body, { headers: bypassHeaders, status: bypassStatus });
    }

    const runtimeScript = `<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
</script>`;

    if (contentType.includes('text/html')) {
        let text = await response.text();
        if (text.includes('<head>')) {
            text = text.replace('<head>', '<head>' + runtimeScript);
        } else if (text.includes('<HEAD>')) {
            text = text.replace('<HEAD>', '<HEAD>' + runtimeScript);
        }
        bypassHeaders.set('content-type', 'text/html; charset=UTF-8');
        return new Response(text, { headers: bypassHeaders, status: bypassStatus });
    } else if (contentType.includes('javascript') || targetUrl.endsWith('.js') || request.destination === 'script' || request.destination === 'worker') {
        let text = await response.text();
        text = injectScriptHeader(text);
        bypassHeaders.set('content-type', 'application/javascript; charset=UTF-8');
        return new Response(text, { headers: bypassHeaders, status: bypassStatus });
    }

    return new Response(response.body, { headers: bypassHeaders, status: bypassStatus });
}

