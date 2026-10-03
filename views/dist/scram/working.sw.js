importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const r=new e({wisp:WISP_URL});return await r.init(),epoxy=r,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(r=>e.delete(r)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const r=e.status||200,o=NULL_BODY_STATUSES.has(r);if(e instanceof Response){const s=new Headers(e.headers);return sanitizeHeaders(s),new Response(o?null:e.body,{status:r,statusText:e.statusText,headers:s})}const i=new Headers;try{const s=e.headers;if(s)if(typeof s.forEach=="function")s.forEach((t,a)=>i.set(a,t));else if(typeof s.entries=="function")for(const[t,a]of s.entries())i.set(t,a);else if(typeof s[Symbol.iterator]=="function")for(const[t,a]of s)i.set(t,a);else for(const t in s)i.set(t,String(s[t]))}catch{}return!o&&!i.has("content-type")&&i.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(i),new Response(o?null:e.body||null,{status:r,statusText:e.statusText||"OK",headers:i})}function safeURL(e,r){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(r||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,r||ORIGIN)}catch{}return new URL(ORIGIN+"/")}const GLOBAL_SHIM=`
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
        if (p === 'location' && (o === window || o === document)) return window.location;
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
        const match = location.pathname.match(//worker/network/([^/?#]+)/);
        if (match) {
            const decoded = decodeURIComponent(match[1]);
            const parsed = new URL(decoded.includes('://') ? decoded : 'https://' + decoded);
            targetOrigin = parsed.origin;
        }
    } catch(_) {}

    const isExternal = u => typeof u === 'string' && u.includes('://') && !u.startsWith(location.origin);
    const wrapUrl = u => {
        if (!u || typeof u !== 'string') return u;
        if (isExternal(u)) return PROXY_ROOT + encodeURIComponent(u);
        if (u.startsWith('/') && !u.startsWith('/worker/') && !u.startsWith('/cron/') && !u.startsWith('/gmt/') && !u.startsWith('/epoch/') && targetOrigin) {
            return PROXY_ROOT + encodeURIComponent(targetOrigin + u);
        }
        return u;
    };

    try {
        const origFetch = window.fetch;
        window.fetch = function(resource, init) {
            try { if (typeof resource === 'string') resource = wrapUrl(resource); } catch(_) {}
            return origFetch.call(this, resource, init);
        };
    } catch(_) {}

    try {
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            try { url = wrapUrl(url); } catch(_) {}
            return origOpen.call(this, method, url, ...rest);
        };
    } catch(_) {}

    // Stub out commonly missing globals that crash Roblox/React apps
    const stubs = ['jQuery','$','React','ReactDOM','CoreUtilities','CoreRobloxUtilities','angular','bootstrap','ReactStyleGuide','Sentry','require'];
    stubs.forEach(lib => {
        if (!(lib in globalThis)) {
            try { Object.defineProperty(globalThis, lib, { get: () => safe, set: (v) => {}, configurable: true, enumerable: false }); } catch(_) {}
        }
    });

    // Suppress known harmless errors
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
})();`;async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:r}=self.$scramjet,o=await getEpoxy(),i=o?{...o,async request(s,t,a,c,u){const n=await o.request(s,t,a,c,u);return{body:n.body||null,headers:n.headers instanceof Headers?n.headers:new Headers(n.headers||{}),status:n.status||200,statusText:n.statusText||"OK"}}}:{async init(){},async request(s,t,a,c,u){const n=(t||"GET").toUpperCase(),l=await fetch(s.toString(),{method:n,headers:c||{},body:["GET","HEAD"].includes(n)?null:a||null,signal:u||void 0});return{body:l.body,headers:l.headers,status:l.status,statusText:l.statusText}},async fetch(s,t){return fetch(s.toString(),t||{})},connect(){}};return handler=new e({transport:i,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...r,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:s=>encodeURIComponent(s),codecDecode:s=>{try{if(!s)return new URL(ORIGIN+"/");let t=String(s);if(t.startsWith("#")&&(t=t.slice(1)),t.includes("#")&&(t=t.split("#")[0]),t.startsWith("network/")&&(t=t.slice(8)),!t)return new URL(ORIGIN+"/");try{const a=decodeURIComponent(t),c=a.includes("://")?a:"https://"+a;return new URL(c)}catch{const c=t.includes("://")?t:"https://"+t;return new URL(c)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(s,t,a)=>[a("/worker/working.all.js"),{type:"script",content:GLOBAL_SHIM}]}},sendSetCookie:async(s,t)=>{for(const a of await self.clients.matchAll())a.postMessage({type:"scramjet-set-cookie",url:s.href,cookie:t})},fetchBlobUrl:async s=>fetch(s),fetchDataUrl:async s=>fetch(s)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const r=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(c=>r.pathname.endsWith(c))||e.request.headers.has("x-scramjet-bypass"))return;const i=r.origin===self.location.origin;if(i&&(r.pathname.startsWith("/cron/")||r.pathname.startsWith("/gmt/")||r.pathname.startsWith("/unix/")||r.pathname.startsWith("/epoch/")||r.pathname.startsWith("/assets/")||r.pathname.startsWith("/dist/")||r.pathname==="/"||r.pathname==="/index.html"||r.pathname==="/games"||r.pathname==="/newsession"||r.pathname==="/favicon.ico"))return;if(!i&&e.request.mode==="navigate"){const c=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r.href),self.location.origin);return e.respondWith(Response.redirect(c.href,307))}let t,a;if(i&&r.pathname.startsWith(SCRAM_PREFIX))t=r,a=e.request.referrer?safeURL(e.request.referrer):new URL(r.origin+"/");else if(!i)t=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r.href),self.location.origin),a=e.request.referrer?safeURL(e.request.referrer):new URL("https://www.youtube.com/");else{const c=e.request.referrer||"",u=c.match(/\/worker\/network\/([^/?#]+)/);if(u)try{const n=decodeURIComponent(u[1]),p=new URL(n.includes("://")?n:"https://"+n).origin+r.pathname+r.search;t=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(p),self.location.origin),a=safeURL(c)}catch{return}else return}e.respondWith((async()=>{try{const c=await initHandler(),{ScramjetHeaders:u}=self.$scramjet,n=new u;e.request.headers.forEach((f,d)=>{try{n.set(d,f)}catch{}});const l=await c.handleFetch({rawUrl:t,rawClientUrl:a,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:n,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache}),p=toResponse(l),m=p.headers.get("content-type")||"";return p}catch(c){return console.error("[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:",c),await emergencyBypass(e.request,t||r)}})())});async function emergencyBypass(e,r){let o;if(r.origin!==self.location.origin)o=r.href;else{o=r.pathname.slice(SCRAM_PREFIX.length)+r.search,o.startsWith("network/")&&(o=o.slice(8));try{o=decodeURIComponent(o)}catch{}o.includes("://")||(o="https://"+o)}console.log("[Scramjet v2 SW] Emergency Bypass for:",o);let i;try{const n=await getEpoxy();if(n){const l={};e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((f,d)=>{const h=d.toLowerCase();h!=="host"&&h!=="origin"&&h!=="referer"&&(l[d]=f)}),(o.includes("youtube.com")||o.includes("googlevideo.com")||o.includes("gstatic.com"))&&(l.referer="https://www.youtube.com/");const p=["GET","HEAD"].includes(e.method)?null:e.body,m=await n.request(new URL(o),e.method,p,l);i=toResponse(m)}}catch(n){console.warn("[SW] Epoxy bypass failed:",n.message)}if(!i)try{const n=await fetch(o,{mode:"no-cors",credentials:"omit"});(n.ok||n.type==="opaque")&&(i=n)}catch{}if(!i)return new Response("Proxy Error: All bypass tiers failed for "+o,{status:502});const s=i.status||200,t=NULL_BODY_STATUSES.has(s),a=t?"":i.headers.get("content-type")||"",c=new Headers(i.headers);if(sanitizeHeaders(c),t)return new Response(null,{headers:c,status:s});if(a.includes("font")||a.includes("image")||a.includes("wasm"))return new Response(i.body,{headers:c,status:s});const u=`<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
<\/script>`;if(a.includes("text/html")){let n=await i.text();return n=u+n,c.set("content-type","text/html; charset=UTF-8"),new Response(n,{headers:c,status:s})}else if(a.includes("javascript")||o.endsWith(".js")){let n=await i.text();const l=`(function(){if(globalThis.__scramjet_emergency_active)return;globalThis.__scramjet_emergency_active=true;${GLOBAL_SHIM}})();
`;return c.set("content-type","application/javascript; charset=UTF-8"),new Response(l+n,{headers:c,status:s})}return new Response(i.body,{headers:c,status:s})}
//# sourceMappingURL=working.sw.js.map
