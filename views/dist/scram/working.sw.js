importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const s=new e({wisp:WISP_URL});return await s.init(),epoxy=s,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(s=>e.delete(s)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const s=e.status||200,c=NULL_BODY_STATUSES.has(s);if(e instanceof Response){const r=new Headers(e.headers);return sanitizeHeaders(r),new Response(c?null:e.body,{status:s,statusText:e.statusText,headers:r})}const a=new Headers;try{const r=e.headers;if(r)if(typeof r.forEach=="function")r.forEach((t,o)=>a.set(o,t));else if(typeof r.entries=="function")for(const[t,o]of r.entries())a.set(t,o);else if(typeof r[Symbol.iterator]=="function")for(const[t,o]of r)a.set(t,o);else for(const t in r)a.set(t,String(r[t]))}catch{}return!c&&!a.has("content-type")&&a.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(a),new Response(c?null:e.body||null,{status:s,statusText:e.statusText||"OK",headers:a})}function safeURL(e,s){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(s||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,s||ORIGIN)}catch{}return new URL(ORIGIN+"/")}const GLOBAL_SHIM=`
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
})();`;async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:s}=self.$scramjet,c=await getEpoxy(),a=c?{...c,async request(r,t,o,i,p){const n=await c.request(r,t,o,i,p);return{body:n.body||null,headers:n.headers instanceof Headers?n.headers:new Headers(n.headers||{}),status:n.status||200,statusText:n.statusText||"OK"}}}:{async init(){},async request(r,t,o,i,p){const n=(t||"GET").toUpperCase(),u=await fetch(r.toString(),{method:n,headers:i||{},body:["GET","HEAD"].includes(n)?null:o||null,signal:p||void 0});return{body:u.body,headers:u.headers,status:u.status,statusText:u.statusText}},async fetch(r,t){return fetch(r.toString(),t||{})},connect(){}};return handler=new e({transport:a,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...s,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:r=>encodeURIComponent(r),codecDecode:r=>{try{if(!r)return new URL(ORIGIN+"/");let t=String(r);if(t.startsWith("#")&&(t=t.slice(1)),t.includes("#")&&(t=t.split("#")[0]),t.startsWith("network/")&&(t=t.slice(8)),!t)return new URL(ORIGIN+"/");try{const o=decodeURIComponent(t),i=o.includes("://")?o:"https://"+o;return new URL(i)}catch{const i=t.includes("://")?t:"https://"+t;return new URL(i)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(r,t,o)=>[o("/worker/working.all.js"),{type:"script",content:GLOBAL_SHIM}]}},sendSetCookie:async(r,t)=>{for(const o of await self.clients.matchAll())o.postMessage({type:"scramjet-set-cookie",url:r.href,cookie:t})},fetchBlobUrl:async r=>fetch(r),fetchDataUrl:async r=>fetch(r)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const s=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(i=>s.pathname.endsWith(i))||e.request.headers.has("x-scramjet-bypass"))return;const a=s.origin===self.location.origin;if(a&&(s.pathname.startsWith("/cron/")||s.pathname.startsWith("/gmt/")||s.pathname.startsWith("/unix/")||s.pathname.startsWith("/epoch/")||s.pathname.startsWith("/assets/")||s.pathname.startsWith("/dist/")||s.pathname==="/"||s.pathname==="/index.html"||s.pathname==="/games"||s.pathname==="/newsession"||s.pathname==="/favicon.ico"))return;if(!a&&e.request.mode==="navigate"){const i=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(s.href),self.location.origin);return e.respondWith(Response.redirect(i.href,307))}let t,o;if(a&&s.pathname.startsWith(SCRAM_PREFIX))t=s,o=e.request.referrer?safeURL(e.request.referrer):new URL(s.origin+"/");else if(!a)t=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(s.href),self.location.origin),o=e.request.referrer?safeURL(e.request.referrer):new URL("https://www.youtube.com/");else{const i=e.request.referrer||"",p=i.match(/\/worker\/network\/([^/?#]+)/);if(p)try{const n=decodeURIComponent(p[1]),l=new URL(n.includes("://")?n:"https://"+n).origin+s.pathname+s.search;t=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(l),self.location.origin),o=safeURL(i)}catch{return}else return}e.respondWith((async()=>{try{const i=await initHandler(),{ScramjetHeaders:p}=self.$scramjet,n=new p;e.request.headers.forEach((f,d)=>{try{n.set(d,f)}catch{}});const u=await i.handleFetch({rawUrl:t,rawClientUrl:o,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:n,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache}),l=toResponse(u),h=l.headers.get("content-type")||"";if(h.includes("font")||h.includes("image")||h.includes("audio")||h.includes("video")||h.includes("wasm"))return l;if(h.includes("javascript")||h.includes("application/x-javascript")||t.pathname.endsWith(".js")){let f=await l.text();const d=new Headers(l.headers);return d.set("content-type","application/javascript; charset=UTF-8"),sanitizeHeaders(d),new Response(GLOBAL_SHIM+`
`+f,{status:l.status,statusText:l.statusText,headers:d})}else if(h.includes("text/html")){let f=await l.text();f="<script>"+GLOBAL_SHIM+`<\/script>
`+f;const d=new Headers(l.headers);return d.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(d),new Response(f,{status:l.status,statusText:l.statusText,headers:d})}return l}catch(i){return console.error("[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:",i),await emergencyBypass(e.request,t||s)}})())});async function emergencyBypass(e,s){let c;if(s.origin!==self.location.origin)c=s.href;else{c=s.pathname.slice(SCRAM_PREFIX.length)+s.search,c.startsWith("network/")&&(c=c.slice(8));try{c=decodeURIComponent(c)}catch{}c.includes("://")||(c="https://"+c)}console.log("[Scramjet v2 SW] Emergency Bypass for:",c);let a;try{const n=await getEpoxy();if(n){const u=await n.request(new URL(c),e.method,e.body,e.headers);a=toResponse(u)}}catch(n){console.warn("[SW] Epoxy bypass failed:",n.message)}if(!a)try{const n=await fetch(c,{mode:"cors",credentials:"omit"});n.ok&&(a=n)}catch{}if(!a)return new Response("Proxy Error: All bypass tiers failed for "+c,{status:502});const r=a.status||200,t=NULL_BODY_STATUSES.has(r),o=t?"":a.headers.get("content-type")||"",i=new Headers(a.headers);if(sanitizeHeaders(i),t)return new Response(null,{headers:i,status:r});if(o.includes("font")||o.includes("image")||o.includes("wasm"))return new Response(a.body,{headers:i,status:r});const p=`<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
<\/script>`;if(o.includes("text/html")){let n=await a.text();return n=p+n,i.set("content-type","text/html; charset=UTF-8"),new Response(n,{headers:i,status:r})}else if(o.includes("javascript")||c.endsWith(".js")){let n=await a.text();const u=`(function(){if(globalThis.__scramjet_emergency_active)return;globalThis.__scramjet_emergency_active=true;${GLOBAL_SHIM}})();
`;return i.set("content-type","application/javascript; charset=UTF-8"),new Response(u+n,{headers:i,status:r})}return new Response(a.body,{headers:i,status:r})}
//# sourceMappingURL=working.sw.js.map
