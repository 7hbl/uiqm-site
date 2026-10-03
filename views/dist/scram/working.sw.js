importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const t=new e({wisp:WISP_URL});return await t.init(),epoxy=t,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(t=>e.delete(t)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const t=e.status||200,a=NULL_BODY_STATUSES.has(t);if(e instanceof Response){const s=new Headers(e.headers);return sanitizeHeaders(s),new Response(a?null:e.body,{status:t,statusText:e.statusText,headers:s})}const i=new Headers;try{const s=e.headers;if(s)if(typeof s.forEach=="function")s.forEach((r,n)=>i.set(n,r));else if(typeof s.entries=="function")for(const[r,n]of s.entries())i.set(r,n);else if(typeof s[Symbol.iterator]=="function")for(const[r,n]of s)i.set(r,n);else for(const r in s)i.set(r,String(s[r]))}catch{}return!a&&!i.has("content-type")&&i.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(i),new Response(a?null:e.body||null,{status:t,statusText:e.statusText||"OK",headers:i})}function safeURL(e,t){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(t||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,t||ORIGIN)}catch{}return new URL(ORIGIN+"/")}const GLOBAL_SHIM=`
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

    // Proxy intercept for fetch/XHR
    const PROXY_ROOT = '/worker/network/';
    let targetOrigin = '';
    try {
        const loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
        if (loc) {
            const match = loc.pathname.match(//worker/network/([^/?#]+)/);
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
    if (globalThis.__sj_fetch_wrapped) return;
    globalThis.__sj_fetch_wrapped = true;
    var _P = '/worker/network/';
    var _wrap = function(u) {
        if (!u) return u;
        var s = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : ''));
        if (!s || typeof s !== 'string') return u;
        var o = (typeof location !== 'undefined' && location.origin) || (typeof self !== 'undefined' && self.location && self.location.origin) || '';
        if (s.indexOf('://') !== -1 && (!o || s.indexOf(o) !== 0)) {
            return _P + encodeURIComponent(s);
        }
        return s;
    };
    try {
        var _f = globalThis.fetch;
        if (_f) {
            globalThis.fetch = function(r, i) {
                try {
                    if (typeof r === 'string') r = _wrap(r);
                    else if (r && typeof r === 'object' && r.href) r = _wrap(r.href);
                    else if (r && typeof r === 'object' && r.url) {
                        var nw = _wrap(r.url);
                        if (nw !== r.url) r = new Request(nw, r);
                    }
                } catch(_) {}
                return _f.call(this, r, i);
            };
        }
    } catch(_) {}
    try {
        if (globalThis.XMLHttpRequest && globalThis.XMLHttpRequest.prototype) {
            var _op = globalThis.XMLHttpRequest.prototype.open;
            globalThis.XMLHttpRequest.prototype.open = function(m, u) {
                try { u = _wrap(u); } catch(_) {}
                var rest = Array.prototype.slice.call(arguments, 2);
                return _op.apply(this, [m, u].concat(rest));
            };
        }
    } catch(_) {}
})();`;function injectScriptHeader(e){if(typeof e!="string")return e;const t=e.match(/^\s*(['"])use strict\1;?/);return t?`${t[0]}
${SCRIPT_HEADER}
${e.slice(t[0].length)}`:`${SCRIPT_HEADER}
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:t}=self.$scramjet,a=await getEpoxy(),i=a?{...a,async request(s,r,n,c,l){const o=await a.request(s,r,n,c,l);return{body:o.body||null,headers:o.headers instanceof Headers?o.headers:new Headers(o.headers||{}),status:o.status||200,statusText:o.statusText||"OK"}}}:{async init(){},async request(s,r,n,c,l){const o=(r||"GET").toUpperCase(),u=await fetch(s.toString(),{method:o,headers:c||{},body:["GET","HEAD"].includes(o)?null:n||null,signal:l||void 0});return{body:u.body,headers:u.headers,status:u.status,statusText:u.statusText}},async fetch(s,r){return fetch(s.toString(),r||{})},connect(){}};return handler=new e({transport:i,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...t,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:s=>encodeURIComponent(s),codecDecode:s=>{try{if(!s)return new URL(ORIGIN+"/");let r=String(s);if(r.startsWith("#")&&(r=r.slice(1)),r.includes("#")&&(r=r.split("#")[0]),r.startsWith("network/")&&(r=r.slice(8)),!r)return new URL(ORIGIN+"/");try{const n=decodeURIComponent(r),c=n.includes("://")?n:"https://"+n;return new URL(c)}catch{const c=r.includes("://")?r:"https://"+r;return new URL(c)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(s,r,n)=>[n("/worker/working.all.js")],getWorkerInjectScripts:(s,r,n)=>n("/worker/working.all.js")}},sendSetCookie:async(s,r)=>{for(const n of await self.clients.matchAll())n.postMessage({type:"scramjet-set-cookie",url:s.href,cookie:r})},fetchBlobUrl:async s=>fetch(s),fetchDataUrl:async s=>fetch(s)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const t=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(c=>t.pathname.endsWith(c))||e.request.headers.has("x-scramjet-bypass"))return;const i=t.origin===self.location.origin;if(i&&(t.pathname.startsWith("/cron/")||t.pathname.startsWith("/gmt/")||t.pathname.startsWith("/unix/")||t.pathname.startsWith("/epoch/")||t.pathname.startsWith("/assets/")||t.pathname.startsWith("/dist/")||t.pathname==="/"||t.pathname==="/index.html"||t.pathname==="/games"||t.pathname==="/newsession"||t.pathname==="/favicon.ico"))return;if(!i&&e.request.mode==="navigate"){const c=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t.href),self.location.origin);return e.respondWith(Response.redirect(c.href,307))}let r,n;if(i&&t.pathname.startsWith(SCRAM_PREFIX))r=t,n=e.request.referrer?safeURL(e.request.referrer):new URL(t.origin+"/");else if(!i)r=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t.href),self.location.origin),n=e.request.referrer?safeURL(e.request.referrer):new URL("https://www.youtube.com/");else{const c=e.request.referrer||"",l=c.match(/\/worker\/network\/([^/?#]+)/);if(l)try{const o=decodeURIComponent(l[1]),p=new URL(o.includes("://")?o:"https://"+o).origin+t.pathname+t.search;r=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(p),self.location.origin),n=safeURL(c)}catch{return}else return}e.respondWith((async()=>{try{const c=await initHandler(),{ScramjetHeaders:l}=self.$scramjet,o=new l;e.request.headers.forEach((f,h)=>{try{o.set(h,f)}catch{}});const u=await c.handleFetch({rawUrl:r,rawClientUrl:n,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:o,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache}),p=toResponse(u),m=p.headers.get("content-type")||"";if(!NULL_BODY_STATUSES.has(p.status)&&(m.includes("javascript")||r.pathname.endsWith(".js")||e.request.destination==="script"||e.request.destination==="worker"))try{let f=await p.text();f=injectScriptHeader(f);const h=new Headers(p.headers);return h.set("content-type","application/javascript; charset=UTF-8"),new Response(f,{headers:h,status:p.status,statusText:p.statusText})}catch{}return p}catch(c){return console.error("[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:",c),await emergencyBypass(e.request,r||t)}})())});async function emergencyBypass(e,t){let a;if(t.origin!==self.location.origin)a=t.href;else{a=t.pathname.slice(SCRAM_PREFIX.length)+t.search,a.startsWith("network/")&&(a=a.slice(8));try{a=decodeURIComponent(a)}catch{}a.includes("://")||(a="https://"+a)}console.log("[Scramjet v2 SW] Emergency Bypass for:",a);let i;try{const o=await getEpoxy();if(o){const u={};e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((f,h)=>{const d=h.toLowerCase();d!=="host"&&d!=="origin"&&d!=="referer"&&(u[h]=f)}),(a.includes("youtube.com")||a.includes("googlevideo.com")||a.includes("gstatic.com"))&&(u.referer="https://www.youtube.com/");const p=["GET","HEAD"].includes(e.method)?null:e.body,m=await o.request(new URL(a),e.method,p,u);i=toResponse(m)}}catch(o){console.warn("[SW] Epoxy bypass failed:",o.message)}if(!i)try{const o=await fetch(a,{mode:"no-cors",credentials:"omit"});(o.ok||o.type==="opaque")&&(i=o)}catch{}if(!i)return new Response("Proxy Error: All bypass tiers failed for "+a,{status:502});const s=i.status||200,r=NULL_BODY_STATUSES.has(s),n=r?"":i.headers.get("content-type")||"",c=new Headers(i.headers);if(sanitizeHeaders(c),r)return new Response(null,{headers:c,status:s});if(n.includes("font")||n.includes("image")||n.includes("wasm"))return new Response(i.body,{headers:c,status:s});const l=`<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
<\/script>`;if(n.includes("text/html")){let o=await i.text();return o.includes("<head>")?o=o.replace("<head>","<head>"+l):o.includes("<HEAD>")&&(o=o.replace("<HEAD>","<HEAD>"+l)),c.set("content-type","text/html; charset=UTF-8"),new Response(o,{headers:c,status:s})}else if(n.includes("javascript")||a.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let o=await i.text();return o=injectScriptHeader(o),c.set("content-type","application/javascript; charset=UTF-8"),new Response(o,{headers:c,status:s})}return new Response(i.body,{headers:c,status:s})}
//# sourceMappingURL=working.sw.js.map
