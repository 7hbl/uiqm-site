importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null,lastUpstreamOrigin="https://www.youtube.com";const clientOriginMap=new Map;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const r=new e({wisp:WISP_URL});return await r.init(),epoxy=r,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(r=>e.delete(r)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const r=e.status||200,o=NULL_BODY_STATUSES.has(r);if(e instanceof Response){const a=new Headers(e.headers);return sanitizeHeaders(a),new Response(o?null:e.body,{status:r,statusText:e.statusText,headers:a})}const c=new Headers;try{const a=e.headers;if(a)if(typeof a.forEach=="function")a.forEach((n,l)=>c.set(l,n));else if(typeof a.entries=="function")for(const[n,l]of a.entries())c.set(n,l);else if(typeof a[Symbol.iterator]=="function")for(const[n,l]of a)c.set(n,l);else for(const n in a)c.set(n,String(a[n]))}catch{}return!o&&!c.has("content-type")&&c.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(c),new Response(o?null:e.body||null,{status:r,statusText:e.statusText||"OK",headers:c})}function safeURL(e,r){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(r||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,r||ORIGIN)}catch{}return new URL(ORIGIN+"/")}function extractTargetFromScram(e){if(!e)return null;const r="/worker/network/",o=e.indexOf(r);if(o!==-1){let c=e.slice(o+r.length);try{c=decodeURIComponent(c)}catch{}return c.includes("://")||(c="https://"+c),c}return null}function fixBlockedMirrors(e){if(!e||typeof e!="string")return e;let r=e;try{r=decodeURIComponent(r)}catch{}try{r=decodeURIComponent(r)}catch{}return r.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/genizy\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/genizy/$1/$2/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/genizy\/([^/]+)\//gi,"https://raw.githack.com/genizy/$1/main/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/mysticful/$1/$2/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/([^/]+)\//gi,"https://raw.githack.com/mysticful/$1/main/").replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"https://raw.githack.com/genizy/google-class/main/mobile.js")}const GLOBAL_SHIM=`
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
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:r}=self.$scramjet,o=await getEpoxy(),c=o?{...o,async request(a,n,l,i,t){let p=i instanceof Headers?i:new Headers(i||{}),h=a;if(h&&h.href){const s=fixBlockedMirrors(h.href);if(s!==h.href)try{h=new URL(s)}catch{}}const g=h&&h.hostname?h.hostname:"";g.includes("youtube.com")||g.includes("googleapis.com")||g.includes("googlevideo.com")||g.includes("gstatic.com")?(p.set("origin","https://www.youtube.com"),p.set("referer","https://www.youtube.com/")):h&&h.origin&&h.origin.startsWith("http")&&(!p.has("origin")&&!["GET","HEAD"].includes((n||"GET").toUpperCase())&&p.set("origin",h.origin),p.has("referer")||p.set("referer",h.origin+"/"));const f=await o.request(h,n,l,p,t);return{body:f.body||null,headers:f.headers instanceof Headers?f.headers:new Headers(f.headers||{}),status:f.status||200,statusText:f.statusText||"OK"}}}:{async init(){},async request(a,n,l,i,t){let p=a?a.toString():"";p=fixBlockedMirrors(p);const h=(n||"GET").toUpperCase(),g=await fetch(p,{method:h,headers:i||{},body:["GET","HEAD"].includes(h)?null:l||null,signal:t||void 0});return{body:g.body,headers:g.headers,status:g.status,statusText:g.statusText}},async fetch(a,n){let l=a?a.toString():"";return l=fixBlockedMirrors(l),fetch(l,n||{})},connect(){}};return handler=new e({transport:c,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...r,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:a=>encodeURIComponent(a),codecDecode:a=>{try{if(!a)return new URL(ORIGIN+"/");let n=String(a);if(n.startsWith("#")&&(n=n.slice(1)),n.includes("#")&&(n=n.split("#")[0]),n.startsWith("network/")&&(n=n.slice(8)),!n)return new URL(ORIGIN+"/");try{const l=decodeURIComponent(n),i=l.includes("://")?l:"https://"+l;return new URL(i)}catch{const i=n.includes("://")?n:"https://"+n;return new URL(i)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(a,n,l)=>[l("/worker/working.all.js")],getWorkerInjectScripts:(a,n,l)=>l("/worker/working.all.js")}},sendSetCookie:async(a,n)=>{for(const l of await self.clients.matchAll())l.postMessage({type:"scramjet-set-cookie",url:a.href,cookie:n})},fetchBlobUrl:async a=>fetch(a),fetchDataUrl:async a=>fetch(a)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const r=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(i=>r.pathname.endsWith(i))||e.request.headers.has("x-scramjet-bypass"))return;const c=r.origin===self.location.origin;if(c&&(r.pathname.startsWith("/cron/")||r.pathname.startsWith("/gmt/")||r.pathname.startsWith("/unix/")||r.pathname.startsWith("/epoch/")||r.pathname.startsWith("/assets/")||r.pathname.startsWith("/dist/")||r.pathname.startsWith("/bare/")||r.pathname.startsWith("/baremux/")||r.pathname.startsWith("/libcurl/")||r.pathname.startsWith("/chii/")||r.pathname.startsWith("/uv/")||r.pathname.startsWith("/scram/")||r.pathname==="/"||r.pathname==="/index.html"||r.pathname==="/games"||r.pathname==="/newsession"||r.pathname==="/favicon.ico"||r.pathname==="/manifest.json"||r.pathname==="/robots.txt"||r.pathname==="/sitemap.xml"||r.pathname==="/browserconfig.xml"))return;if(!c&&e.request.mode==="navigate"){const i=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(fixBlockedMirrors(r.href)),self.location.origin);return e.respondWith(Response.redirect(i.href,307))}let n,l;if(c&&r.pathname.startsWith(SCRAM_PREFIX)){let i=extractTargetFromScram(r.href);if(i){i=fixBlockedMirrors(i);try{const t=new URL(i);if(t.hostname===self.location.hostname){let p=e.clientId&&clientOriginMap.get(e.clientId)||lastUpstreamOrigin||"https://www.youtube.com";if(e.request.referrer){const h=extractTargetFromScram(e.request.referrer);if(h)try{const g=new URL(h);g.hostname!==self.location.hostname&&(p=g.origin)}catch{}}i=p+t.pathname+t.search}else lastUpstreamOrigin=t.origin,e.clientId&&clientOriginMap.set(e.clientId,t.origin)}catch{}n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(i),self.location.origin)}else n=r;l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}else if(c){let i=e.clientId&&clientOriginMap.get(e.clientId)||null;if(!i&&e.request.referrer){const t=extractTargetFromScram(e.request.referrer);if(t)try{const p=new URL(t);p.hostname!==self.location.hostname&&(i=p.origin)}catch{}}if(i||(i=lastUpstreamOrigin),i){const t=fixBlockedMirrors(i+r.pathname+r.search);n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(t),self.location.origin),l=safeURL(i+"/")}else return}else{let i=fixBlockedMirrors(r.href);n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(i),self.location.origin);try{const t=new URL(i);lastUpstreamOrigin=t.origin,e.clientId&&clientOriginMap.set(e.clientId,t.origin)}catch{}l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}e.respondWith((async()=>{try{const i=await initHandler(),{ScramjetHeaders:t}=self.$scramjet,p=new t;e.request.headers.forEach((s,d)=>{try{p.set(d,s)}catch{}});const h=await i.handleFetch({rawUrl:n,rawClientUrl:l,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:p,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache});let g=toResponse(h);if((g.headers.get("content-type")||"").includes("text/html")){let s=await g.text();s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/genizy\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/genizy/$1/$2/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/genizy\/([^/]+)\//gi,"https://raw.githack.com/genizy/$1/main/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/mysticful/$1/$2/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/([^/]+)\//gi,"https://raw.githack.com/mysticful/$1/main/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"https://raw.githack.com/genizy/google-class/main/mobile.js"),s=s.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),s=s.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),s=s.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),s=s.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),s=s.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),s=s.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),s=s.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),s=s.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),s=s.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),s=s.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const d=`<script>${GLOBAL_SHIM}<\/script>`;s.includes("<head>")?s=s.replace("<head>","<head>"+d):s.includes("<HEAD>")?s=s.replace("<HEAD>","<HEAD>"+d):s=d+s;const u=new Headers(g.headers);return u.set("content-type","text/html; charset=UTF-8"),new Response(s,{status:g.status,statusText:g.statusText,headers:u})}return g}catch(i){return console.error("[Scramjet v2 SW] Rewriter exception, falling back to bypass:",i),await emergencyBypass(e.request,n||r)}})())});async function emergencyBypass(e,r){let o;if(r.origin!==self.location.origin)o=r.href;else{o=r.pathname.slice(SCRAM_PREFIX.length)+r.search,o.startsWith("network/")&&(o=o.slice(8));try{o=decodeURIComponent(o)}catch{}o.includes("://")||(o="https://"+o)}o=fixBlockedMirrors(o);try{const t=new URL(o);t.hostname===self.location.hostname&&(o=(lastUpstreamOrigin||"https://www.youtube.com")+t.pathname+t.search)}catch{}console.log("[Scramjet v2 SW] Bypass for:",o);let c;try{const t=await getEpoxy();if(t){const p={};if(e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((f,s)=>{const d=s.toLowerCase();d!=="host"&&d!=="origin"&&d!=="referer"&&(p[s]=f)}),o.includes("youtube.com")||o.includes("googlevideo.com")||o.includes("gstatic.com")||o.includes("googleapis.com"))p.origin="https://www.youtube.com",p.referer="https://www.youtube.com/";else try{const f=new URL(o);!p.origin&&!["GET","HEAD"].includes((e.method||"GET").toUpperCase())&&(p.origin=f.origin),p.referer||(p.referer=f.origin+"/")}catch{}const h=["GET","HEAD"].includes(e.method)?null:e.body,g=await t.request(new URL(o),e.method,h,p);c=toResponse(g)}}catch(t){console.warn("[SW] Epoxy bypass failed:",t.message)}if(!c)try{const t=await fetch("/proxy/"+encodeURIComponent(o),{method:e.method,headers:e.headers,body:["GET","HEAD"].includes(e.method)?null:await e.blob()});(t.ok||t.status<500)&&(c=t)}catch{}if(!c)try{const t=await fetch(o,{mode:"no-cors",credentials:"omit"});(t.ok||t.type==="opaque")&&(c=t)}catch{}if(!c)return new Response("Proxy Error: All bypass tiers failed for "+o,{status:502});const a=c.status||200,n=NULL_BODY_STATUSES.has(a),l=n?"":c.headers.get("content-type")||"",i=new Headers(c.headers);if(sanitizeHeaders(i),n)return new Response(null,{headers:i,status:a});if(l.includes("font")||l.includes("image")||l.includes("wasm"))return new Response(c.body,{headers:i,status:a});if(l.includes("text/html")){let t=await c.text();t=t.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),t=t.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),t=t.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),t=t.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),t=t.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),t=t.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),t=t.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),t=t.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),t=t.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),t=t.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const p=`<style>
#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }
#note { color: #ff3333 !important; font-family: monospace, sans-serif !important; font-size: 16px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-weight: bold !important; }
</style>
<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
})();
<\/script>`;return t.includes("<head>")?t=t.replace("<head>","<head>"+p):t.includes("<HEAD>")?t=t.replace("<HEAD>","<HEAD>"+p):t=p+t,i.set("content-type","text/html; charset=UTF-8"),new Response(t,{headers:i,status:a})}else if(l.includes("javascript")||o.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let t=await c.text();return t=injectScriptHeader(t),i.set("content-type","application/javascript; charset=UTF-8"),new Response(t,{headers:i,status:a})}return new Response(c.body,{headers:i,status:a})}
//# sourceMappingURL=working.sw.js.map
