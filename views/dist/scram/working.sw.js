importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const t=new e({wisp:WISP_URL});return await t.init(),epoxy=t,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(t=>e.delete(t)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const t=e.status||200,i=NULL_BODY_STATUSES.has(t);if(e instanceof Response){const o=new Headers(e.headers);return sanitizeHeaders(o),new Response(i?null:e.body,{status:t,statusText:e.statusText,headers:o})}const c=new Headers;try{const o=e.headers;if(o)if(typeof o.forEach=="function")o.forEach((r,s)=>c.set(s,r));else if(typeof o.entries=="function")for(const[r,s]of o.entries())c.set(r,s);else if(typeof o[Symbol.iterator]=="function")for(const[r,s]of o)c.set(r,s);else for(const r in o)c.set(r,String(o[r]))}catch{}return!i&&!c.has("content-type")&&c.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(c),new Response(i?null:e.body||null,{status:t,statusText:e.statusText||"OK",headers:c})}function safeURL(e,t){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(t||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,t||ORIGIN)}catch{}return new URL(ORIGIN+"/")}const GLOBAL_SHIM=`
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

    // Array/String/Number Guard \u2014 stops "called on null" crashes without corrupting returns
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

    // Universal Proxy Intercept for fetch/XHR
    var _getProxyOrigin = function() {
        try {
            if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.location && window.parent.location.origin) {
                var po = window.parent.location.origin;
                if (po && !po.includes('youtube') && !po.includes('google')) return po;
            }
        } catch(_) {}
        try {
            var lo = (typeof location !== 'undefined' ? location.origin : '') || (typeof self !== 'undefined' && self.location ? self.location.origin : '');
            if (lo && !lo.includes('youtube') && !lo.includes('google')) return lo;
        } catch(_) {}
        return 'https://uiqm.lol';
    };

    var _wrapUrl = function(u) {
        if (!u) return u;
        var s = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : ''));
        if (!s || typeof s !== 'string') return u;
        if (s.indexOf('/worker/network/') !== -1) return s;
        if (s.indexOf('/cron/') !== -1 || s.indexOf('/gmt/') !== -1 || s.indexOf('/unix/') !== -1 || s.indexOf('/epoch/') !== -1 || s.indexOf('/assets/') !== -1) return s;
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('javascript:')) return s;

        var proxyOrigin = _getProxyOrigin();
        var targetOrigin = 'https://www.youtube.com';
        try {
            var loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
            if (loc) {
                var m = loc.pathname.match(//worker/network/([^/?#]+)/);
                if (m) {
                    var d = decodeURIComponent(m[1]);
                    var p = new URL(d.includes('://') ? d : 'https://' + d);
                    targetOrigin = p.origin;
                }
            }
        } catch(_) {}

        var full = s;
        if (full.startsWith('//')) {
            full = 'https:' + full;
        } else if (full.startsWith('/')) {
            full = targetOrigin + full;
        } else if (!full.includes('://')) {
            full = targetOrigin + '/' + full;
        }

        return proxyOrigin + '/worker/network/' + encodeURIComponent(full);
    };

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        var _realFetch = rootGlobal.fetch;
        if (_realFetch) {
            var _createWrappedFetch = function(origFetch) {
                return function(resource, init) {
                    try {
                        if (typeof resource === 'string') {
                            resource = _wrapUrl(resource);
                        } else if (resource instanceof URL) {
                            resource = _wrapUrl(resource.href);
                        } else if (resource && typeof resource === 'object' && resource.url) {
                            var nw = _wrapUrl(resource.url);
                            if (nw !== resource.url) {
                                try {
                                    resource = new Request(nw, resource);
                                } catch(_) {
                                    try {
                                        resource = new Request(nw, {
                                            method: resource.method,
                                            headers: resource.headers,
                                            credentials: resource.credentials,
                                            cache: resource.cache,
                                            redirect: resource.redirect
                                        });
                                    } catch(__) {
                                        resource = nw;
                                    }
                                }
                            }
                        }
                    } catch(_) {}
                    return origFetch.call(this, resource, init);
                };
            };
            var _currentFetch = _createWrappedFetch(_realFetch);
            try {
                Object.defineProperty(rootGlobal, 'fetch', {
                    get: function() { return _currentFetch; },
                    set: function(fn) {
                        if (typeof fn === 'function' && fn !== _currentFetch) {
                            _realFetch = fn;
                            _currentFetch = _createWrappedFetch(fn);
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch(_) {
                rootGlobal.fetch = _currentFetch;
            }
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.XMLHttpRequest && rootGlobal.XMLHttpRequest.prototype) {
            var _origOpen = rootGlobal.XMLHttpRequest.prototype.open;
            rootGlobal.XMLHttpRequest.prototype.open = function(method, url) {
                try { arguments[1] = _wrapUrl(url); } catch(_) {}
                var rest = Array.prototype.slice.call(arguments, 2);
                return _origOpen.apply(this, [method, arguments[1]].concat(rest));
            };
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.navigator && rootGlobal.navigator.sendBeacon) {
            var _origBeacon = rootGlobal.navigator.sendBeacon;
            rootGlobal.navigator.sendBeacon = function(url, data) {
                try { url = _wrapUrl(url); } catch(_) {}
                return _origBeacon.call(this, url, data);
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
})();`,SCRIPT_HEADER=`if (typeof globalThis.$scramjet$initialized === 'undefined') {
    globalThis.$scramjet$initialized = true;
    globalThis.$scramerr = globalThis.$scramerr || ((e) => {});
    globalThis.$scramdbg = globalThis.$scramdbg || ((i, e) => e);
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
var $scramerr = globalThis.$scramerr || ((e) => {});
var $scramdbg = globalThis.$scramdbg || ((i, e) => e);
var $scramjet$wrap = globalThis.$scramjet$wrap || ((o) => o);
var $scramjet$prop = globalThis.$scramjet$prop || ((p) => p);
var $scramjet$get = globalThis.$scramjet$get || ((o, p) => { try { return o[p]; } catch(_) { return undefined; } });
var $scramjet$call = globalThis.$scramjet$call || ((o, p, a) => { try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; } });
var $scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined));
var $scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
var $scramjet$clean = globalThis.$scramjet$clean || ((...a) => a);
var $scramjet$tryset = globalThis.$scramjet$tryset || ((o, p, v) => { try { o[p] = v; } catch(_) {} return v; });
var $scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});
if (typeof Object !== 'undefined' && Object.prototype) {
    if (!('$scramjet__eval' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__eval', {
                value: function(...a) {
                    var fn = (this && this.eval) || globalThis.eval;
                    return typeof fn === 'function' ? fn.apply(this, a) : undefined;
                },
                writable: true,
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__location' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__location', {
                get: function() { return (this && this.location) || globalThis.location; },
                set: function(v) { if (this && 'location' in this) this.location = v; else globalThis.location = v; },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__parent' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__parent', {
                get: function() { return (this && this.parent) || globalThis.parent; },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__top' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__top', {
                get: function() { return (this && this.top) || globalThis.top; },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
}

(function() {
    var _getProxyOrigin = function() {
        try {
            if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.location && window.parent.location.origin) {
                var po = window.parent.location.origin;
                if (po && !po.includes('youtube') && !po.includes('google')) return po;
            }
        } catch(_) {}
        try {
            var lo = (typeof location !== 'undefined' ? location.origin : '') || (typeof self !== 'undefined' && self.location ? self.location.origin : '');
            if (lo && !lo.includes('youtube') && !lo.includes('google')) return lo;
        } catch(_) {}
        return 'https://uiqm.lol';
    };

    var _wrapUrl = function(u) {
        if (!u) return u;
        var s = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : ''));
        if (!s || typeof s !== 'string') return u;
        if (s.indexOf('/worker/network/') !== -1) return s;
        if (s.indexOf('/cron/') !== -1 || s.indexOf('/gmt/') !== -1 || s.indexOf('/unix/') !== -1 || s.indexOf('/epoch/') !== -1 || s.indexOf('/assets/') !== -1) return s;
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('javascript:')) return s;

        var proxyOrigin = _getProxyOrigin();
        var targetOrigin = 'https://www.youtube.com';
        try {
            var loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
            if (loc) {
                var m = loc.pathname.match(//worker/network/([^/?#]+)/);
                if (m) {
                    var d = decodeURIComponent(m[1]);
                    var p = new URL(d.includes('://') ? d : 'https://' + d);
                    targetOrigin = p.origin;
                }
            }
        } catch(_) {}

        var full = s;
        if (full.startsWith('//')) {
            full = 'https:' + full;
        } else if (full.startsWith('/')) {
            full = targetOrigin + full;
        } else if (!full.includes('://')) {
            full = targetOrigin + '/' + full;
        }

        return proxyOrigin + '/worker/network/' + encodeURIComponent(full);
    };

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        var _realFetch = rootGlobal.fetch;
        if (_realFetch) {
            var _createWrappedFetch = function(origFetch) {
                return function(resource, init) {
                    try {
                        if (typeof resource === 'string') {
                            resource = _wrapUrl(resource);
                        } else if (resource instanceof URL) {
                            resource = _wrapUrl(resource.href);
                        } else if (resource && typeof resource === 'object' && resource.url) {
                            var nw = _wrapUrl(resource.url);
                            if (nw !== resource.url) {
                                try {
                                    resource = new Request(nw, resource);
                                } catch(_) {
                                    try {
                                        resource = new Request(nw, {
                                            method: resource.method,
                                            headers: resource.headers,
                                            credentials: resource.credentials,
                                            cache: resource.cache,
                                            redirect: resource.redirect
                                        });
                                    } catch(__) {
                                        resource = nw;
                                    }
                                }
                            }
                        }
                    } catch(_) {}
                    return origFetch.call(this, resource, init);
                };
            };
            var _currentFetch = _createWrappedFetch(_realFetch);
            try {
                Object.defineProperty(rootGlobal, 'fetch', {
                    get: function() { return _currentFetch; },
                    set: function(fn) {
                        if (typeof fn === 'function' && fn !== _currentFetch) {
                            _realFetch = fn;
                            _currentFetch = _createWrappedFetch(fn);
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch(_) {
                rootGlobal.fetch = _currentFetch;
            }
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.XMLHttpRequest && rootGlobal.XMLHttpRequest.prototype) {
            var _origOpen = rootGlobal.XMLHttpRequest.prototype.open;
            rootGlobal.XMLHttpRequest.prototype.open = function(method, url) {
                try { arguments[1] = _wrapUrl(url); } catch(_) {}
                var rest = Array.prototype.slice.call(arguments, 2);
                return _origOpen.apply(this, [method, arguments[1]].concat(rest));
            };
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.navigator && rootGlobal.navigator.sendBeacon) {
            var _origBeacon = rootGlobal.navigator.sendBeacon;
            rootGlobal.navigator.sendBeacon = function(url, data) {
                try { url = _wrapUrl(url); } catch(_) {}
                return _origBeacon.call(this, url, data);
            };
        }
    } catch(_) {}
})();`;function injectScriptHeader(e){if(typeof e!="string")return e;const t=e.match(/^\s*(['"])use strict\1;?/);return t?`${t[0]}
${SCRIPT_HEADER}
${e.slice(t[0].length)}`:`${SCRIPT_HEADER}
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:t}=self.$scramjet,i=await getEpoxy(),c=i?{...i,async request(o,r,s,a,p){let n=a instanceof Headers?a:new Headers(a||{});const u=o&&o.hostname?o.hostname:"";(u.includes("youtube.com")||u.includes("googleapis.com")||u.includes("googlevideo.com")||u.includes("gstatic.com"))&&(n.set("origin","https://www.youtube.com"),n.set("referer","https://www.youtube.com/"));const l=await i.request(o,r,s,n,p);return{body:l.body||null,headers:l.headers instanceof Headers?l.headers:new Headers(l.headers||{}),status:l.status||200,statusText:l.statusText||"OK"}}}:{async init(){},async request(o,r,s,a,p){const n=(r||"GET").toUpperCase(),u=await fetch(o.toString(),{method:n,headers:a||{},body:["GET","HEAD"].includes(n)?null:s||null,signal:p||void 0});return{body:u.body,headers:u.headers,status:u.status,statusText:u.statusText}},async fetch(o,r){return fetch(o.toString(),r||{})},connect(){}};return handler=new e({transport:c,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...t,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:o=>encodeURIComponent(o),codecDecode:o=>{try{if(!o)return new URL(ORIGIN+"/");let r=String(o);if(r.startsWith("#")&&(r=r.slice(1)),r.includes("#")&&(r=r.split("#")[0]),r.startsWith("network/")&&(r=r.slice(8)),!r)return new URL(ORIGIN+"/");try{const s=decodeURIComponent(r),a=s.includes("://")?s:"https://"+s;return new URL(a)}catch{const a=r.includes("://")?r:"https://"+r;return new URL(a)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(o,r,s)=>[s("/worker/working.all.js")],getWorkerInjectScripts:(o,r,s)=>s("/worker/working.all.js")}},sendSetCookie:async(o,r)=>{for(const s of await self.clients.matchAll())s.postMessage({type:"scramjet-set-cookie",url:o.href,cookie:r})},fetchBlobUrl:async o=>fetch(o),fetchDataUrl:async o=>fetch(o)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const t=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(a=>t.pathname.endsWith(a))||e.request.headers.has("x-scramjet-bypass"))return;const c=t.origin===self.location.origin;if(c&&(t.pathname.startsWith("/cron/")||t.pathname.startsWith("/gmt/")||t.pathname.startsWith("/unix/")||t.pathname.startsWith("/epoch/")||t.pathname.startsWith("/assets/")||t.pathname.startsWith("/dist/")||t.pathname==="/"||t.pathname==="/index.html"||t.pathname==="/games"||t.pathname==="/newsession"||t.pathname==="/favicon.ico"))return;if(!c&&e.request.mode==="navigate"){const a=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t.href),self.location.origin);return e.respondWith(Response.redirect(a.href,307))}let r,s;if(c&&t.pathname.startsWith(SCRAM_PREFIX))r=t,s=e.request.referrer?safeURL(e.request.referrer):new URL(t.origin+"/");else if(c){const a=e.request.referrer||"",p=a.match(/\/worker\/network\/([^/?#]+)/);if(p)try{const n=decodeURIComponent(p[1]),l=new URL(n.includes("://")?n:"https://"+n).origin+t.pathname+t.search;r=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(l),self.location.origin),s=safeURL(a)}catch{return}else return}else{if(t.pathname.startsWith("/worker/network/")){const a=t.pathname.slice(16)+t.search;r=new URL(SCRAM_PREFIX+"network/"+a,self.location.origin)}else r=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t.href),self.location.origin);s=e.request.referrer?safeURL(e.request.referrer):new URL("https://www.youtube.com/")}e.respondWith((async()=>{try{const a=await initHandler(),{ScramjetHeaders:p}=self.$scramjet,n=new p;e.request.headers.forEach((f,d)=>{try{n.set(d,f)}catch{}});const u=await a.handleFetch({rawUrl:r,rawClientUrl:s,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:n,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache}),l=toResponse(u),g=l.headers.get("content-type")||"";if(!NULL_BODY_STATUSES.has(l.status)&&(g.includes("javascript")||r.pathname.endsWith(".js")||e.request.destination==="script"||e.request.destination==="worker"))try{let f=await l.text();f=injectScriptHeader(f);const d=new Headers(l.headers);return d.set("content-type","application/javascript; charset=UTF-8"),new Response(f,{headers:d,status:l.status,statusText:l.statusText})}catch{}return l}catch(a){return console.error("[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:",a),await emergencyBypass(e.request,r||t)}})())});async function emergencyBypass(e,t){let i;if(t.origin!==self.location.origin)i=t.href;else{i=t.pathname.slice(SCRAM_PREFIX.length)+t.search,i.startsWith("network/")&&(i=i.slice(8));try{i=decodeURIComponent(i)}catch{}i.includes("://")||(i="https://"+i)}console.log("[Scramjet v2 SW] Emergency Bypass for:",i);let c;try{const n=await getEpoxy();if(n){const u={};e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((f,d)=>{const h=d.toLowerCase();h!=="host"&&h!=="origin"&&h!=="referer"&&(u[d]=f)}),(i.includes("youtube.com")||i.includes("googlevideo.com")||i.includes("gstatic.com")||i.includes("googleapis.com"))&&(u.origin="https://www.youtube.com",u.referer="https://www.youtube.com/");const l=["GET","HEAD"].includes(e.method)?null:e.body,g=await n.request(new URL(i),e.method,l,u);c=toResponse(g)}}catch(n){console.warn("[SW] Epoxy bypass failed:",n.message)}if(!c)try{const n=await fetch(i,{mode:"no-cors",credentials:"omit"});(n.ok||n.type==="opaque")&&(c=n)}catch{}if(!c)return new Response("Proxy Error: All bypass tiers failed for "+i,{status:502});const o=c.status||200,r=NULL_BODY_STATUSES.has(o),s=r?"":c.headers.get("content-type")||"",a=new Headers(c.headers);if(sanitizeHeaders(a),r)return new Response(null,{headers:a,status:o});if(s.includes("font")||s.includes("image")||s.includes("wasm"))return new Response(c.body,{headers:a,status:o});const p=`<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
<\/script>`;if(s.includes("text/html")){let n=await c.text();return n.includes("<head>")?n=n.replace("<head>","<head>"+p):n.includes("<HEAD>")&&(n=n.replace("<HEAD>","<HEAD>"+p)),a.set("content-type","text/html; charset=UTF-8"),new Response(n,{headers:a,status:o})}else if(s.includes("javascript")||i.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let n=await c.text();return n=injectScriptHeader(n),a.set("content-type","application/javascript; charset=UTF-8"),new Response(n,{headers:a,status:o})}return new Response(c.body,{headers:a,status:o})}
//# sourceMappingURL=working.sw.js.map
