importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null,lastUpstreamOrigin="https://www.youtube.com";const clientOriginMap=new Map;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const t=new e({wisp:WISP_URL});return await t.init(),epoxy=t,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(t=>e.delete(t)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const t=e.status||200,o=NULL_BODY_STATUSES.has(t);if(e instanceof Response){const c=new Headers(e.headers);return sanitizeHeaders(c),new Response(o?null:e.body,{status:t,statusText:e.statusText,headers:c})}const p=new Headers;try{const c=e.headers;if(c)if(typeof c.forEach=="function")c.forEach((a,l)=>p.set(l,a));else if(typeof c.entries=="function")for(const[a,l]of c.entries())p.set(a,l);else if(typeof c[Symbol.iterator]=="function")for(const[a,l]of c)p.set(a,l);else for(const a in c)p.set(a,String(c[a]))}catch{}return!o&&!p.has("content-type")&&p.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(p),new Response(o?null:e.body||null,{status:t,statusText:e.statusText||"OK",headers:p})}function safeURL(e,t){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(t||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,t||ORIGIN)}catch{}return new URL(ORIGIN+"/")}function extractTargetFromScram(e){if(!e||typeof e!="string")return null;if(e.includes("/worker/network/")){let t=e.split("/worker/network/")[1];if(!t)return null;try{t=decodeURIComponent(t)}catch{}return t.includes("://")||(t="https://"+t),t}if(e.includes("/worker/")){let t=e.split("/worker/")[1];if(!t)return null;if(/^(?:https?%3A|https?:\/\/)/i.test(t)){try{t=decodeURIComponent(t)}catch{}return t.includes("://")||(t="https://"+t),t}}return null}function fixBlockedMirrors(e){if(!e||typeof e!="string")return e;let t=e;try{t=decodeURIComponent(t)}catch{}try{t=decodeURIComponent(t)}catch{}return t.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/").replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js")}const GLOBAL_SHIM=`
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
})();`,SCRIPT_HEADER=GLOBAL_SHIM;function injectScriptHeader(e){if(typeof e!="string")return e;const t=e.match(/^\s*(['"])use strict\1;?/);return t?`${t[0]}
${SCRIPT_HEADER}
${e.slice(t[0].length)}`:`${SCRIPT_HEADER}
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:t}=self.$scramjet,o=await getEpoxy(),p=o?{...o,async request(c,a,l,n,r){let i=c,u=(a||"GET").toUpperCase(),h=["GET","HEAD"].includes(u)?null:l,g=0,s=null;for(;g<6;){let d=n instanceof Headers?new Headers(n):new Headers(n||{});if(i&&i.href){const y=fixBlockedMirrors(i.href);if(y!==i.href)try{i=new URL(y)}catch{}}const f=i&&i.hostname?i.hostname:"";f.includes("youtube.com")||f.includes("googleapis.com")||f.includes("googlevideo.com")||f.includes("gstatic.com")?(d.set("origin","https://www.youtube.com"),d.set("referer","https://www.youtube.com/")):i&&i.origin&&i.origin.startsWith("http")&&(!d.has("origin")&&!["GET","HEAD"].includes(u)&&d.set("origin",i.origin),d.has("referer")||d.set("referer",i.origin+"/")),d.delete("accept-encoding"),d.set("accept-encoding","identity");try{s=await o.request(i,u,h,d,r)}catch(y){console.warn("[SW Transport] Epoxy error, trying server fallback:",y.message);try{const m=await fetch("/proxy/"+encodeURIComponent(i.href),{method:u,headers:d,body:h});return{body:m.body||null,headers:m.headers instanceof Headers?m.headers:new Headers(m.headers||{}),status:m.status||200,statusText:m.statusText||"OK"}}catch{throw y}}const b=s.status||200;let w=null;if(s.headers&&(typeof s.headers.get=="function"?w=s.headers.get("location"):s.headers.location&&(w=s.headers.location)),b>=300&&b<400&&w){g++;try{i=new URL(w,i.href||i),u="GET",h=null;continue}catch{break}}break}return{body:s&&s.body||null,headers:s&&s.headers instanceof Headers?s.headers:new Headers(s?.headers||{}),status:s?.status||200,statusText:s?.statusText||"OK"}}}:{async init(){},async request(c,a,l,n,r){let i=c?c.toString():"";i=fixBlockedMirrors(i);const u=(a||"GET").toUpperCase(),h=await fetch(i,{method:u,headers:n||{},body:["GET","HEAD"].includes(u)?null:l||null,signal:r||void 0});return{body:h.body,headers:h.headers,status:h.status,statusText:h.statusText}},async fetch(c,a){let l=c?c.toString():"";return l=fixBlockedMirrors(l),fetch(l,a||{})},connect(){}};return handler=new e({transport:p,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...t,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:c=>encodeURIComponent(c),codecDecode:c=>{try{if(!c)return new URL(ORIGIN+"/");let a=String(c);if(a.startsWith("#")&&(a=a.slice(1)),a.includes("#")&&(a=a.split("#")[0]),a.startsWith("network/")&&(a=a.slice(8)),!a)return new URL(ORIGIN+"/");try{const l=decodeURIComponent(a),n=l.includes("://")?l:"https://"+l;return new URL(n)}catch{const n=a.includes("://")?a:"https://"+a;return new URL(n)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(c,a,l)=>[l("/worker/working.all.js")],getWorkerInjectScripts:(c,a,l)=>l("/worker/working.all.js")}},sendSetCookie:async(c,a)=>{for(const l of await self.clients.matchAll())l.postMessage({type:"scramjet-set-cookie",url:c.href,cookie:a})},fetchBlobUrl:async c=>fetch(c),fetchDataUrl:async c=>fetch(c)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const t=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(n=>t.pathname.endsWith(n))||e.request.headers.has("x-scramjet-bypass"))return;const p=t.origin===self.location.origin;if(p&&(t.pathname.startsWith("/cron/")||t.pathname.startsWith("/gmt/")||t.pathname.startsWith("/unix/")||t.pathname.startsWith("/epoch/")||t.pathname.startsWith("/assets/")||t.pathname.startsWith("/dist/")||t.pathname.startsWith("/bare/")||t.pathname.startsWith("/baremux/")||t.pathname.startsWith("/libcurl/")||t.pathname.startsWith("/chii/")||t.pathname.startsWith("/uv/")||t.pathname.startsWith("/scram/")||t.pathname==="/"||t.pathname==="/index.html"||t.pathname==="/games"||t.pathname==="/newsession"||t.pathname==="/favicon.ico"||t.pathname==="/manifest.json"||t.pathname==="/robots.txt"||t.pathname==="/sitemap.xml"||t.pathname==="/browserconfig.xml"))return;if(!p&&e.request.mode==="navigate"){const n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(fixBlockedMirrors(t.href)),self.location.origin);return e.respondWith(Response.redirect(n.href,307))}let a,l;if(p&&t.pathname.startsWith(SCRAM_PREFIX)){let n=extractTargetFromScram(t.href);if(n){n=fixBlockedMirrors(n);try{const r=new URL(n);if(r.hostname===self.location.hostname){let i=e.clientId&&clientOriginMap.get(e.clientId)||lastUpstreamOrigin||"https://www.youtube.com";if(e.request.referrer){const u=extractTargetFromScram(e.request.referrer);if(u)try{const h=new URL(u);h.hostname!==self.location.hostname&&(i=h.origin)}catch{}}n=i+r.pathname+r.search}else lastUpstreamOrigin=r.origin,e.clientId&&clientOriginMap.set(e.clientId,r.origin)}catch{}if(n.includes("githack.com")||n.includes("githubusercontent.com")){e.respondWith(emergencyBypass(e.request,n));return}if(n.includes("sync_mod_chunk")||n.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,n));return}a=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(n),self.location.origin)}else a=t;l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}else if(p){let n=e.clientId&&clientOriginMap.get(e.clientId)||null;if(!n&&e.request.referrer){const r=extractTargetFromScram(e.request.referrer);if(r)try{const i=new URL(r);i.hostname!==self.location.hostname&&(n=i.origin)}catch{}}if(!n&&(t.pathname.startsWith("/s/")||t.pathname.startsWith("/youtubei/")||t.pathname.startsWith("/static/")||t.pathname.startsWith("/videoplayback")||t.pathname.startsWith("/generate_204")||t.pathname.startsWith("/error_204")||t.pathname.startsWith("/api/stats/"))&&(n="https://www.youtube.com"),n||(n=lastUpstreamOrigin),n){const r=fixBlockedMirrors(n+t.pathname+t.search);if(r.includes("sync_mod_chunk")||r.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,r));return}a=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r),self.location.origin),l=safeURL(n+"/")}else return}else{if(t.hostname.includes("githack.com")||t.hostname.includes("githubusercontent.com")||t.hostname.includes("cdnjs.cloudflare.com"))return;let n=fixBlockedMirrors(t.href);if(n.includes("sync_mod_chunk")||n.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,n));return}a=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(n),self.location.origin);try{const r=new URL(n);lastUpstreamOrigin=r.origin,e.clientId&&clientOriginMap.set(e.clientId,r.origin)}catch{}l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}e.respondWith((async()=>{try{const n=await initHandler(),{ScramjetHeaders:r}=self.$scramjet,i=new r;e.request.headers.forEach((s,d)=>{try{i.set(d,s)}catch{}});const u=await n.handleFetch({rawUrl:a,rawClientUrl:l,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:i,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache});let h=toResponse(u);if((h.headers.get("content-type")||"").includes("text/html")){let s=await h.text();s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/web-port@latest\/whosyourdaddy\/TemplateData\/style\.css/gi,"data:text/css,/*style*/"),s=s.replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js"),s=s.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),s=s.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),s=s.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),s=s.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),s=s.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),s=s.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),s=s.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),s=s.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),s=s.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),s=s.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const d=`<script>${GLOBAL_SHIM}<\/script>`;s.includes("<head>")?s=s.replace("<head>","<head>"+d):s.includes("<HEAD>")?s=s.replace("<HEAD>","<HEAD>"+d):s=d+s;const f=new Headers(h.headers);return f.set("content-type","text/html; charset=UTF-8"),new Response(s,{status:h.status,statusText:h.statusText,headers:f})}return h}catch(n){return console.error("[Scramjet v2 SW] Rewriter exception, falling back to bypass:",n),await emergencyBypass(e.request,a||t)}})())});async function emergencyBypass(e,t){let o;if(typeof t=="string")o=t;else if(t&&t.origin&&t.origin!==self.location.origin)o=t.href;else if(t){let r=extractTargetFromScram(t.href||t.toString());if(r)o=r;else{o=(t.pathname||"").slice(SCRAM_PREFIX.length)+(t.search||""),o.startsWith("network/")&&(o=o.slice(8));try{o=decodeURIComponent(o)}catch{}o.includes("://")||(o="https://"+o)}}else return new Response("Bypass Error: Invalid target",{status:400});o=fixBlockedMirrors(o);try{const r=new URL(o);r.hostname===self.location.hostname&&(o=(lastUpstreamOrigin||"https://www.youtube.com")+r.pathname+r.search)}catch{}console.log("[Scramjet v2 SW] Bypass for:",o);let p;try{const r=await getEpoxy();if(r){const i={};if(e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((s,d)=>{const f=d.toLowerCase();f!=="host"&&f!=="origin"&&f!=="referer"&&(i[d]=s)}),o.includes("youtube.com")||o.includes("googlevideo.com")||o.includes("gstatic.com")||o.includes("googleapis.com"))i.origin="https://www.youtube.com",i.referer="https://www.youtube.com/";else try{const s=new URL(o);!i.origin&&!["GET","HEAD"].includes((e.method||"GET").toUpperCase())&&(i.origin=s.origin),i.referer||(i.referer=s.origin+"/")}catch{}let u=o,h=0,g=null;for(;h<6;){const s=["GET","HEAD"].includes(e.method)?null:e.body;g=await r.request(new URL(u),e.method,s,i);const d=g.status||200;let f=null;if(g.headers&&(typeof g.headers.get=="function"?f=g.headers.get("location"):g.headers.location&&(f=g.headers.location)),d>=300&&d<400&&f){h++;try{u=new URL(f,u).href;continue}catch{break}}break}g&&(p=toResponse(g))}}catch(r){console.warn("[SW] Epoxy bypass failed:",r.message)}if(!p)try{const r=await fetch("/proxy/"+encodeURIComponent(o),{method:e.method,headers:e.headers,body:["GET","HEAD"].includes(e.method)?null:await e.blob()});(r.ok||r.status<500)&&(p=r)}catch{}if(!p)try{const r=await fetch(o,{mode:"no-cors",credentials:"omit"});(r.ok||r.type==="opaque")&&(p=r)}catch{}if(!p)return new Response("Proxy Error: All bypass tiers failed for "+o,{status:502});const c=p.status||200,a=NULL_BODY_STATUSES.has(c),l=a?"":p.headers.get("content-type")||"",n=new Headers(p.headers);if(sanitizeHeaders(n),a)return new Response(null,{headers:n,status:c});if(l.includes("font")||l.includes("image")||l.includes("wasm"))return new Response(p.body,{headers:n,status:c});if(l.includes("text/html")){let r=await p.text();r=r.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),r=r.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),r=r.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),r=r.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),r=r.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),r=r.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),r=r.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),r=r.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),r=r.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),r=r.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const i=`<style>
#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }
#note { color: #ff3333 !important; font-family: monospace, sans-serif !important; font-size: 16px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-weight: bold !important; }
</style>
<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
})();
<\/script>`;return r.includes("<head>")?r=r.replace("<head>","<head>"+i):r.includes("<HEAD>")?r=r.replace("<HEAD>","<HEAD>"+i):r=i+r,n.set("content-type","text/html; charset=UTF-8"),new Response(r,{headers:n,status:c})}else if(l.includes("javascript")||o.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let r=await p.text();return r=injectScriptHeader(r),n.set("content-type","application/javascript; charset=UTF-8"),new Response(r,{headers:n,status:c})}return new Response(p.body,{headers:n,status:c})}
//# sourceMappingURL=working.sw.js.map
