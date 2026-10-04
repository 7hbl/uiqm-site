// Scramjet v2 Service Worker - v2.6.2 (High Compatibility & Resilience)
importScripts('/worker/working.all.js');
importScripts('/epoch/index.js');

// Server maps: scram/ -> worker/ so the external URL is /worker/
const SCRAM_PREFIX = '/worker/';
const WISP_URL = (self.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + self.location.host + '/cron/';
const ORIGIN = self.location.origin;

let handler;
let epoxy = null;
let lastUpstreamOrigin = 'https://www.youtube.com';
const clientOriginMap = new Map();

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

function extractTargetFromScram(s) {
    if (!s) return null;
    const marker = '/worker/network/';
    const idx = s.indexOf(marker);
    if (idx !== -1) {
        let part = s.slice(idx + marker.length);
        try { part = decodeURIComponent(part); } catch(_) {}
        if (!part.includes('://')) part = 'https://' + part;
        return part;
    }
    return null;
}

function fixBlockedMirrors(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return urlStr;
    let s = urlStr;
    try { s = decodeURIComponent(s); } catch(_) {}
    try { s = decodeURIComponent(s); } catch(_) {}
    return s
        .replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi, 'https://raw.githack.com/$1/$2/$3/')
        .replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi, 'https://raw.githack.com/$1/$2/master/')
        .replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi, 'data:application/javascript,//mobile.js');
}

const GLOBAL_SHIM = `
(function() {
    if (globalThis.$scramjet$initialized) return;
    globalThis.$scramjet$initialized = true;
    globalThis.$scramerr = globalThis.$scramerr || ((e) => {});
    globalThis.$scramdbg = globalThis.$scramdbg || ((i, e) => e);
    globalThis.$scramjet$prop = (p) => p;
    globalThis.$scramjet$wrap = (o) => o;
    globalThis.$scramjet$get = globalThis.$scramjet$get || ((o, p) => {
        if (!o) return undefined;
        try { return o[p]; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$call = globalThis.$scramjet$call || ((o, p, a) => {
        try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined));
    globalThis.$scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
    globalThis.$scramjet$clean = (...a) => a;
    globalThis.$scramjet$tryset = (o, p, v) => { try { o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$pushsourcemap = () => {};
    var _createPostMessageFn = function(target) {
        var fn = function(message, targetOrigin, transfer) {
            try {
                if (target && typeof target.postMessage === 'function') {
                    return target.postMessage(message, '*', transfer);
                }
            } catch(_) {}
        };
        fn.postMessage = fn;
        return fn;
    };
    globalThis.$scramjet$wrappostmessage = function(target, message, targetOrigin, transfer) {
        if (arguments.length > 1) {
            return _createPostMessageFn(target)(message, targetOrigin, transfer);
        }
        return _createPostMessageFn(target);
    };
    globalThis.$scramjet$wrapfunction = globalThis.$scramjet$wrapfunction || ((fn) => fn);
    globalThis.$scramjet$wrapworker = globalThis.$scramjet$wrapworker || ((w) => w);
    globalThis.$scramjet$wrapwindow = globalThis.$scramjet$wrapwindow || ((w) => w);
    globalThis.$scramjet$wrapelement = globalThis.$scramjet$wrapelement || ((el) => el);

    // YouTube Kevlar / Closure & Polymer DOM compatibility shims
    if (typeof window !== 'undefined') {
        try {
            var _decodeTargetUrl = function(val) {
                if (typeof val === 'string' && val.includes('/worker/network/')) {
                    try {
                        var idx = val.indexOf('/worker/network/');
                        var target = val.slice(idx + 16);
                        target = decodeURIComponent(target);
                        if (!target.includes('://')) target = 'https://' + target;
                        return target;
                    } catch(_) {}
                }
                return val;
            };

            if (typeof HTMLScriptElement !== 'undefined') {
                var scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                if (scriptDesc && scriptDesc.get) {
                    var origScriptGet = scriptDesc.get;
                    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
                        get: function() {
                            return _decodeTargetUrl(origScriptGet.call(this));
                        },
                        set: function(v) {
                            return scriptDesc.set.call(this, v);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            }

            if (typeof HTMLLinkElement !== 'undefined') {
                var linkDesc = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
                if (linkDesc && linkDesc.get) {
                    var origLinkGet = linkDesc.get;
                    Object.defineProperty(HTMLLinkElement.prototype, 'href', {
                        get: function() {
                            return _decodeTargetUrl(origLinkGet.call(this));
                        },
                        set: function(v) {
                            return linkDesc.set.call(this, v);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            }

            if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.getAttribute) {
                var origGetAttr = Element.prototype.getAttribute;
                Element.prototype.getAttribute = function(name) {
                    var val = origGetAttr.call(this, name);
                    if ((name === 'src' || name === 'href') && typeof val === 'string') {
                        return _decodeTargetUrl(val);
                    }
                    return val;
                };
            }
        } catch(_) {}
    }
})();`;

const SCRIPT_HEADER = GLOBAL_SHIM;

function injectScriptHeader(code) {
    if (typeof code !== 'string') return code;
    const strictMatch = code.match(/^\s*(['"])use strict\1;?/);
    if (strictMatch) {
        return `${strictMatch[0]}\n${SCRIPT_HEADER}\n${code.slice(strictMatch[0].length)}`;
    }
    return `${SCRIPT_HEADER}\n${code}`;
}

async function initHandler() {
    if (handler) return handler;
    const { ScramjetFetchHandler, defaultConfig } = self.$scramjet;

    const rawEpoxy = await getEpoxy();
    const transport = rawEpoxy ? {
        ...rawEpoxy,
        async request(remote, method, body, headers, signal) {
            let hdrs = (headers instanceof Headers) ? headers : new Headers(headers || {});
            let targetRemote = remote;
            if (targetRemote && targetRemote.href) {
                const fixed = fixBlockedMirrors(targetRemote.href);
                if (fixed !== targetRemote.href) {
                    try { targetRemote = new URL(fixed); } catch(_) {}
                }
            }
            const host = (targetRemote && targetRemote.hostname) ? targetRemote.hostname : '';
            if (host.includes('youtube.com') || host.includes('googleapis.com') || host.includes('googlevideo.com') || host.includes('gstatic.com')) {
                hdrs.set('origin', 'https://www.youtube.com');
                hdrs.set('referer', 'https://www.youtube.com/');
            } else if (targetRemote && targetRemote.origin && targetRemote.origin.startsWith('http')) {
                if (!hdrs.has('origin') && !['GET', 'HEAD'].includes((method || 'GET').toUpperCase())) {
                    hdrs.set('origin', targetRemote.origin);
                }
                if (!hdrs.has('referer')) {
                    hdrs.set('referer', targetRemote.origin + '/');
                }
            }
            hdrs.delete('accept-encoding');
            hdrs.set('accept-encoding', 'identity');
            const res = await rawEpoxy.request(targetRemote, method, body, hdrs, signal);
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
            let u = remote ? remote.toString() : '';
            u = fixBlockedMirrors(u);
            const m = (method || 'GET').toUpperCase();
            const r = await fetch(u, {
                method: m,
                headers: headers || {},
                body: ['GET','HEAD'].includes(m) ? null : (body || null),
                signal: signal || undefined
            });
            return { body: r.body, headers: r.headers, status: r.status, statusText: r.statusText };
        },
        async fetch(url, init) {
            let u = url ? url.toString() : '';
            u = fixBlockedMirrors(u);
            return fetch(u, init || {});
        },
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
        url.pathname.startsWith('/bare/') ||
        url.pathname.startsWith('/baremux/') ||
        url.pathname.startsWith('/libcurl/') ||
        url.pathname.startsWith('/chii/') ||
        url.pathname.startsWith('/uv/') ||
        url.pathname.startsWith('/scram/') ||
        url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname === '/games' ||
        url.pathname === '/newsession' ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/manifest.json' ||
        url.pathname === '/robots.txt' ||
        url.pathname === '/sitemap.xml' ||
        url.pathname === '/browserconfig.xml'
    );

    if (isLocalAsset) return;

    // Cross-origin top-level navigation inside frame -> redirect to Scramjet URL
    if (!isSameOrigin && event.request.mode === 'navigate') {
        const scramUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(fixBlockedMirrors(url.href)), self.location.origin);
        return event.respondWith(Response.redirect(scramUrl.href, 307));
    }

    let rawUrl;
    let rawClientUrl;

    if (isSameOrigin && url.pathname.startsWith(SCRAM_PREFIX)) {
        let innerTarget = extractTargetFromScram(url.href);
        if (innerTarget) {
            innerTarget = fixBlockedMirrors(innerTarget);
            try {
                const parsedInner = new URL(innerTarget);
                if (parsedInner.hostname === self.location.hostname) {
                    // SAME-ORIGIN LEAK PREVENTED: Site tried to fetch root path against the proxy hostname!
                    // Recover real upstream origin!
                    let activeOrigin = (event.clientId && clientOriginMap.get(event.clientId)) || lastUpstreamOrigin || 'https://www.youtube.com';
                    if (event.request.referrer) {
                        const refTarget = extractTargetFromScram(event.request.referrer);
                        if (refTarget) {
                            try {
                                const refParsed = new URL(refTarget);
                                if (refParsed.hostname !== self.location.hostname) {
                                    activeOrigin = refParsed.origin;
                                }
                            } catch(_) {}
                        }
                    }
                    innerTarget = activeOrigin + parsedInner.pathname + parsedInner.search;
                } else {
                    lastUpstreamOrigin = parsedInner.origin;
                    if (event.clientId) clientOriginMap.set(event.clientId, parsedInner.origin);
                }
            } catch(_) {}
            rawUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(innerTarget), self.location.origin);
        } else {
            rawUrl = url;
        }

        rawClientUrl = event.request.referrer
            ? safeURL(event.request.referrer)
            : new URL(lastUpstreamOrigin + '/');
    } else if (!isSameOrigin) {
        let targetHref = fixBlockedMirrors(url.href);
        rawUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(targetHref), self.location.origin);
        try {
            const p = new URL(targetHref);
            lastUpstreamOrigin = p.origin;
            if (event.clientId) clientOriginMap.set(event.clientId, p.origin);
        } catch(_) {}
        rawClientUrl = event.request.referrer
            ? safeURL(event.request.referrer)
            : new URL(lastUpstreamOrigin + '/');
    } else {
        // Same-origin request NOT starting with /worker/ (e.g. /s/player/base.js, /youtubei/..., /static/...)
        let upstream = (event.clientId && clientOriginMap.get(event.clientId)) || null;
        if (!upstream && event.request.referrer) {
            const refTarget = extractTargetFromScram(event.request.referrer);
            if (refTarget) {
                try {
                    const p = new URL(refTarget);
                    if (p.hostname !== self.location.hostname) upstream = p.origin;
                } catch(_) {}
            }
        }
        if (!upstream) upstream = lastUpstreamOrigin;

        if (upstream) {
            const fullTarget = fixBlockedMirrors(upstream + url.pathname + url.search);
            rawUrl = new URL(SCRAM_PREFIX + 'network/' + encodeURIComponent(fullTarget), self.location.origin);
            rawClientUrl = safeURL(upstream + '/');
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

            let resp = toResponse(response);
            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('text/html')) {
                let html = await resp.text();
                // 1. Universal rewrite: all blocked jsdelivr mirrors to working raw.githack.com
                html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi, 'https://raw.githack.com/$1/$2/$3/');
                html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi, 'https://raw.githack.com/$1/$2/master/');
                html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/web-port@latest\/whosyourdaddy\/TemplateData\/style\.css/gi, 'data:text/css,/*style*/');
                html = html.replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi, 'data:application/javascript,//mobile.js');

                // 2. Strip tutoring branding & cat image
                html = html.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi, '');
                html = html.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi, '');
                html = html.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi, '');
                html = html.replace(/#spinning-logo\s*\{[^}]*\}/gi, '#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }');
                html = html.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi, 'none');
                html = html.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi, '<div id="note">DOWNLOADING...</div>');
                html = html.replaceAll('we ALL loves noahs tutoring hub', 'DOWNLOADING...');
                html = html.replaceAll(/we ALL loves[^\s<]*/gi, 'DOWNLOADING...');
                html = html.replaceAll(/Noahs Tutoring Hub/gi, 'DOWNLOADING...');
                html = html.replaceAll(/noahs tutoring hub/gi, 'DOWNLOADING...');

                // 3. Inject global shim
                const shimTag = `<script>${GLOBAL_SHIM}</script>`;
                if (html.includes('<head>')) {
                    html = html.replace('<head>', '<head>' + shimTag);
                } else if (html.includes('<HEAD>')) {
                    html = html.replace('<HEAD>', '<HEAD>' + shimTag);
                } else {
                    html = shimTag + html;
                }
                const newHeaders = new Headers(resp.headers);
                newHeaders.set('content-type', 'text/html; charset=UTF-8');
                return new Response(html, {
                    status: resp.status,
                    statusText: resp.statusText,
                    headers: newHeaders
                });
            }

            return resp;
        } catch(e) {
            console.error('[Scramjet v2 SW] Rewriter exception, falling back to bypass:', e);
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

    targetUrl = fixBlockedMirrors(targetUrl);

    try {
        const parsed = new URL(targetUrl);
        if (parsed.hostname === self.location.hostname) {
            const activeOrigin = lastUpstreamOrigin || 'https://www.youtube.com';
            targetUrl = activeOrigin + parsed.pathname + parsed.search;
        }
    } catch(_) {}

    console.log('[Scramjet v2 SW] Bypass for:', targetUrl);

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
            if (targetUrl.includes('youtube.com') || targetUrl.includes('googlevideo.com') || targetUrl.includes('gstatic.com') || targetUrl.includes('googleapis.com')) {
                epHeaders['origin'] = 'https://www.youtube.com';
                epHeaders['referer'] = 'https://www.youtube.com/';
            } else {
                try {
                    const u = new URL(targetUrl);
                    if (!epHeaders['origin'] && !['GET', 'HEAD'].includes((request.method || 'GET').toUpperCase())) {
                        epHeaders['origin'] = u.origin;
                    }
                    if (!epHeaders['referer']) {
                        epHeaders['referer'] = u.origin + '/';
                    }
                } catch(_) {}
            }
            const body = ['GET', 'HEAD'].includes(request.method) ? null : request.body;
            const res = await ep.request(new URL(targetUrl), request.method, body, epHeaders);
            response = toResponse(res);
        }
    } catch(e) { console.warn('[SW] Epoxy bypass failed:', e.message); }

    if (!response) {
        try {
            const serverProxy = await fetch('/proxy/' + encodeURIComponent(targetUrl), {
                method: request.method,
                headers: request.headers,
                body: ['GET', 'HEAD'].includes(request.method) ? null : await request.blob()
            });
            if (serverProxy.ok || serverProxy.status < 500) {
                response = serverProxy;
            }
        } catch(_) {}
    }

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

    const bypassHeaders = new Headers(response.headers);
    sanitizeHeaders(bypassHeaders);

    if (bypassNullBody) {
        return new Response(null, { headers: bypassHeaders, status: bypassStatus });
    }

    if (contentType.includes('font') || contentType.includes('image') || contentType.includes('wasm')) {
        return new Response(response.body, { headers: bypassHeaders, status: bypassStatus });
    }

    if (contentType.includes('text/html')) {
        let text = await response.text();
        text = text.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi, '');
        text = text.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi, '');
        text = text.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi, '');
        text = text.replace(/#spinning-logo\s*\{[^}]*\}/gi, '#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }');
        text = text.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi, 'none');
        text = text.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi, '<div id="note">DOWNLOADING...</div>');
        text = text.replaceAll('we ALL loves noahs tutoring hub', 'DOWNLOADING...');
        text = text.replaceAll(/we ALL loves[^\s<]*/gi, 'DOWNLOADING...');
        text = text.replaceAll(/Noahs Tutoring Hub/gi, 'DOWNLOADING...');
        text = text.replaceAll(/noahs tutoring hub/gi, 'DOWNLOADING...');

        const runtimeScript = `<style>
#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }
#note { color: #ff3333 !important; font-family: monospace, sans-serif !important; font-size: 16px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-weight: bold !important; }
</style>
<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
})();
</script>`;
        if (text.includes('<head>')) {
            text = text.replace('<head>', '<head>' + runtimeScript);
        } else if (text.includes('<HEAD>')) {
            text = text.replace('<HEAD>', '<HEAD>' + runtimeScript);
        } else {
            text = runtimeScript + text;
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
