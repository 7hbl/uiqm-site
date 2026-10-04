importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null,lastUpstreamOrigin="https://www.youtube.com";const clientOriginMap=new Map;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const r=new e({wisp:WISP_URL});return await r.init(),epoxy=r,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(r=>e.delete(r)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const r=e.status||200,o=NULL_BODY_STATUSES.has(r);if(e instanceof Response){const a=new Headers(e.headers);return sanitizeHeaders(a),new Response(o?null:e.body,{status:r,statusText:e.statusText,headers:a})}const l=new Headers;try{const a=e.headers;if(a)if(typeof a.forEach=="function")a.forEach((n,p)=>l.set(p,n));else if(typeof a.entries=="function")for(const[n,p]of a.entries())l.set(n,p);else if(typeof a[Symbol.iterator]=="function")for(const[n,p]of a)l.set(n,p);else for(const n in a)l.set(n,String(a[n]))}catch{}return!o&&!l.has("content-type")&&l.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(l),new Response(o?null:e.body||null,{status:r,statusText:e.statusText||"OK",headers:l})}function safeURL(e,r){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(r||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,r||ORIGIN)}catch{}return new URL(ORIGIN+"/")}function extractTargetFromScram(e){if(!e)return null;const r="/worker/network/",o=e.indexOf(r);if(o!==-1){let l=e.slice(o+r.length);try{l=decodeURIComponent(l)}catch{}return l.includes("://")||(l="https://"+l),l}return null}function fixBlockedMirrors(e){if(!e||typeof e!="string")return e;let r=e;try{r=decodeURIComponent(r)}catch{}try{r=decodeURIComponent(r)}catch{}return r.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/").replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js")}const GLOBAL_SHIM=`
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
})();`,SCRIPT_HEADER=GLOBAL_SHIM;function injectScriptHeader(e){if(typeof e!="string")return e;const r=e.match(/^\s*(['"])use strict\1;?/);return r?`${r[0]}
${SCRIPT_HEADER}
${e.slice(r[0].length)}`:`${SCRIPT_HEADER}
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:r}=self.$scramjet,o=await getEpoxy(),l=o?{...o,async request(a,n,p,s,t){let c=s instanceof Headers?s:new Headers(s||{}),h=a;if(h&&h.href){const i=fixBlockedMirrors(h.href);if(i!==h.href)try{h=new URL(i)}catch{}}const d=h&&h.hostname?h.hostname:"";d.includes("youtube.com")||d.includes("googleapis.com")||d.includes("googlevideo.com")||d.includes("gstatic.com")?(c.set("origin","https://www.youtube.com"),c.set("referer","https://www.youtube.com/")):h&&h.origin&&h.origin.startsWith("http")&&(!c.has("origin")&&!["GET","HEAD"].includes((n||"GET").toUpperCase())&&c.set("origin",h.origin),c.has("referer")||c.set("referer",h.origin+"/")),c.delete("accept-encoding"),c.set("accept-encoding","identity");const g=await o.request(h,n,p,c,t);return{body:g.body||null,headers:g.headers instanceof Headers?g.headers:new Headers(g.headers||{}),status:g.status||200,statusText:g.statusText||"OK"}}}:{async init(){},async request(a,n,p,s,t){let c=a?a.toString():"";c=fixBlockedMirrors(c);const h=(n||"GET").toUpperCase(),d=await fetch(c,{method:h,headers:s||{},body:["GET","HEAD"].includes(h)?null:p||null,signal:t||void 0});return{body:d.body,headers:d.headers,status:d.status,statusText:d.statusText}},async fetch(a,n){let p=a?a.toString():"";return p=fixBlockedMirrors(p),fetch(p,n||{})},connect(){}};return handler=new e({transport:l,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...r,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:a=>encodeURIComponent(a),codecDecode:a=>{try{if(!a)return new URL(ORIGIN+"/");let n=String(a);if(n.startsWith("#")&&(n=n.slice(1)),n.includes("#")&&(n=n.split("#")[0]),n.startsWith("network/")&&(n=n.slice(8)),!n)return new URL(ORIGIN+"/");try{const p=decodeURIComponent(n),s=p.includes("://")?p:"https://"+p;return new URL(s)}catch{const s=n.includes("://")?n:"https://"+n;return new URL(s)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(a,n,p)=>[p("/worker/working.all.js")],getWorkerInjectScripts:(a,n,p)=>p("/worker/working.all.js")}},sendSetCookie:async(a,n)=>{for(const p of await self.clients.matchAll())p.postMessage({type:"scramjet-set-cookie",url:a.href,cookie:n})},fetchBlobUrl:async a=>fetch(a),fetchDataUrl:async a=>fetch(a)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const r=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(s=>r.pathname.endsWith(s))||e.request.headers.has("x-scramjet-bypass"))return;const l=r.origin===self.location.origin;if(l&&(r.pathname.startsWith("/cron/")||r.pathname.startsWith("/gmt/")||r.pathname.startsWith("/unix/")||r.pathname.startsWith("/epoch/")||r.pathname.startsWith("/assets/")||r.pathname.startsWith("/dist/")||r.pathname.startsWith("/bare/")||r.pathname.startsWith("/baremux/")||r.pathname.startsWith("/libcurl/")||r.pathname.startsWith("/chii/")||r.pathname.startsWith("/uv/")||r.pathname.startsWith("/scram/")||r.pathname==="/"||r.pathname==="/index.html"||r.pathname==="/games"||r.pathname==="/newsession"||r.pathname==="/favicon.ico"||r.pathname==="/manifest.json"||r.pathname==="/robots.txt"||r.pathname==="/sitemap.xml"||r.pathname==="/browserconfig.xml"))return;if(!l&&e.request.mode==="navigate"){const s=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(fixBlockedMirrors(r.href)),self.location.origin);return e.respondWith(Response.redirect(s.href,307))}let n,p;if(l&&r.pathname.startsWith(SCRAM_PREFIX)){let s=extractTargetFromScram(r.href);if(s){s=fixBlockedMirrors(s);try{const t=new URL(s);if(t.hostname===self.location.hostname){let c=e.clientId&&clientOriginMap.get(e.clientId)||lastUpstreamOrigin||"https://www.youtube.com";if(e.request.referrer){const h=extractTargetFromScram(e.request.referrer);if(h)try{const d=new URL(h);d.hostname!==self.location.hostname&&(c=d.origin)}catch{}}s=c+t.pathname+t.search}else lastUpstreamOrigin=t.origin,e.clientId&&clientOriginMap.set(e.clientId,t.origin)}catch{}if(s.includes("githack.com")||s.includes("githubusercontent.com")){e.respondWith(fetch(s,{mode:"cors"}).catch(()=>emergencyBypass(e.request,s)));return}n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(s),self.location.origin)}else n=r;p=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}else if(l){let s=e.clientId&&clientOriginMap.get(e.clientId)||null;if(!s&&e.request.referrer){const t=extractTargetFromScram(e.request.referrer);if(t)try{const c=new URL(t);c.hostname!==self.location.hostname&&(s=c.origin)}catch{}}if(s||(s=lastUpstreamOrigin),s){const t=fixBlockedMirrors(s+r.pathname+r.search);n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t),self.location.origin),p=safeURL(s+"/")}else return}else{if(r.hostname.includes("githack.com")||r.hostname.includes("githubusercontent.com")||r.hostname.includes("cdnjs.cloudflare.com"))return;let s=fixBlockedMirrors(r.href);n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(s),self.location.origin);try{const t=new URL(s);lastUpstreamOrigin=t.origin,e.clientId&&clientOriginMap.set(e.clientId,t.origin)}catch{}p=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}e.respondWith((async()=>{try{const s=await initHandler(),{ScramjetHeaders:t}=self.$scramjet,c=new t;e.request.headers.forEach((i,f)=>{try{c.set(f,i)}catch{}});const h=await s.handleFetch({rawUrl:n,rawClientUrl:p,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:c,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache});let d=toResponse(h);if((d.headers.get("content-type")||"").includes("text/html")){let i=await d.text();i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/web-port@latest\/whosyourdaddy\/TemplateData\/style\.css/gi,"data:text/css,/*style*/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js"),i=i.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),i=i.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),i=i.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),i=i.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),i=i.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),i=i.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),i=i.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),i=i.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),i=i.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),i=i.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const f=`<script>${GLOBAL_SHIM}<\/script>`;i.includes("<head>")?i=i.replace("<head>","<head>"+f):i.includes("<HEAD>")?i=i.replace("<HEAD>","<HEAD>"+f):i=f+i;const u=new Headers(d.headers);return u.set("content-type","text/html; charset=UTF-8"),new Response(i,{status:d.status,statusText:d.statusText,headers:u})}return d}catch(s){return console.error("[Scramjet v2 SW] Rewriter exception, falling back to bypass:",s),await emergencyBypass(e.request,n||r)}})())});async function emergencyBypass(e,r){let o;if(r.origin!==self.location.origin)o=r.href;else{o=r.pathname.slice(SCRAM_PREFIX.length)+r.search,o.startsWith("network/")&&(o=o.slice(8));try{o=decodeURIComponent(o)}catch{}o.includes("://")||(o="https://"+o)}o=fixBlockedMirrors(o);try{const t=new URL(o);t.hostname===self.location.hostname&&(o=(lastUpstreamOrigin||"https://www.youtube.com")+t.pathname+t.search)}catch{}console.log("[Scramjet v2 SW] Bypass for:",o);let l;try{const t=await getEpoxy();if(t){const c={};if(e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((g,i)=>{const f=i.toLowerCase();f!=="host"&&f!=="origin"&&f!=="referer"&&(c[i]=g)}),o.includes("youtube.com")||o.includes("googlevideo.com")||o.includes("gstatic.com")||o.includes("googleapis.com"))c.origin="https://www.youtube.com",c.referer="https://www.youtube.com/";else try{const g=new URL(o);!c.origin&&!["GET","HEAD"].includes((e.method||"GET").toUpperCase())&&(c.origin=g.origin),c.referer||(c.referer=g.origin+"/")}catch{}const h=["GET","HEAD"].includes(e.method)?null:e.body,d=await t.request(new URL(o),e.method,h,c);l=toResponse(d)}}catch(t){console.warn("[SW] Epoxy bypass failed:",t.message)}if(!l)try{const t=await fetch("/proxy/"+encodeURIComponent(o),{method:e.method,headers:e.headers,body:["GET","HEAD"].includes(e.method)?null:await e.blob()});(t.ok||t.status<500)&&(l=t)}catch{}if(!l)try{const t=await fetch(o,{mode:"no-cors",credentials:"omit"});(t.ok||t.type==="opaque")&&(l=t)}catch{}if(!l)return new Response("Proxy Error: All bypass tiers failed for "+o,{status:502});const a=l.status||200,n=NULL_BODY_STATUSES.has(a),p=n?"":l.headers.get("content-type")||"",s=new Headers(l.headers);if(sanitizeHeaders(s),n)return new Response(null,{headers:s,status:a});if(p.includes("font")||p.includes("image")||p.includes("wasm"))return new Response(l.body,{headers:s,status:a});if(p.includes("text/html")){let t=await l.text();t=t.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),t=t.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),t=t.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),t=t.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),t=t.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),t=t.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),t=t.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),t=t.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),t=t.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),t=t.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const c=`<style>
#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }
#note { color: #ff3333 !important; font-family: monospace, sans-serif !important; font-size: 16px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-weight: bold !important; }
</style>
<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
})();
<\/script>`;return t.includes("<head>")?t=t.replace("<head>","<head>"+c):t.includes("<HEAD>")?t=t.replace("<HEAD>","<HEAD>"+c):t=c+t,s.set("content-type","text/html; charset=UTF-8"),new Response(t,{headers:s,status:a})}else if(p.includes("javascript")||o.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let t=await l.text();return t=injectScriptHeader(t),s.set("content-type","application/javascript; charset=UTF-8"),new Response(t,{headers:s,status:a})}return new Response(l.body,{headers:s,status:a})}
//# sourceMappingURL=working.sw.js.map
