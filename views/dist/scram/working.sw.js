importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null,lastUpstreamOrigin="https://www.youtube.com";const clientOriginMap=new Map;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const t=new e({wisp:WISP_URL});return await t.init(),epoxy=t,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(t=>e.delete(t)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const t=e.status||200,a=NULL_BODY_STATUSES.has(t);if(e instanceof Response){const o=new Headers(e.headers);return sanitizeHeaders(o),new Response(a?null:e.body,{status:t,statusText:e.statusText,headers:o})}const p=new Headers;try{const o=e.headers;if(o)if(typeof o.forEach=="function")o.forEach((n,l)=>p.set(l,n));else if(typeof o.entries=="function")for(const[n,l]of o.entries())p.set(n,l);else if(typeof o[Symbol.iterator]=="function")for(const[n,l]of o)p.set(n,l);else for(const n in o)p.set(n,String(o[n]))}catch{}return!a&&!p.has("content-type")&&p.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(p),new Response(a?null:e.body||null,{status:t,statusText:e.statusText||"OK",headers:p})}function safeURL(e,t){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(t||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,t||ORIGIN)}catch{}return new URL(ORIGIN+"/")}function extractTargetFromScram(e){if(!e||typeof e!="string")return null;if(e.includes("/worker/network/")){let t=e.split("/worker/network/")[1];if(!t)return null;try{t=decodeURIComponent(t)}catch{}return t.includes("://")||(t="https://"+t),t}if(e.includes("/worker/")){let t=e.split("/worker/")[1];if(!t)return null;if(/^(?:https?%3A|https?:\/\/)/i.test(t)){try{t=decodeURIComponent(t)}catch{}return t.includes("://")||(t="https://"+t),t}}return null}function fixBlockedMirrors(e){if(!e||typeof e!="string")return e;let t=e;try{t=decodeURIComponent(t)}catch{}try{t=decodeURIComponent(t)}catch{}return t.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/").replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/").replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js")}const GLOBAL_SHIM=`
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
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:t}=self.$scramjet,a=await getEpoxy(),p=a?{...a,async request(o,n,l,r,s){let c=r instanceof Headers?r:new Headers(r||{}),h=o;if(h&&h.href){const i=fixBlockedMirrors(h.href);if(i!==h.href)try{h=new URL(i)}catch{}}const d=h&&h.hostname?h.hostname:"";d.includes("youtube.com")||d.includes("googleapis.com")||d.includes("googlevideo.com")||d.includes("gstatic.com")?(c.set("origin","https://www.youtube.com"),c.set("referer","https://www.youtube.com/")):h&&h.origin&&h.origin.startsWith("http")&&(!c.has("origin")&&!["GET","HEAD"].includes((n||"GET").toUpperCase())&&c.set("origin",h.origin),c.has("referer")||c.set("referer",h.origin+"/")),c.delete("accept-encoding"),c.set("accept-encoding","identity");const u=await a.request(h,n,l,c,s);return{body:u.body||null,headers:u.headers instanceof Headers?u.headers:new Headers(u.headers||{}),status:u.status||200,statusText:u.statusText||"OK"}}}:{async init(){},async request(o,n,l,r,s){let c=o?o.toString():"";c=fixBlockedMirrors(c);const h=(n||"GET").toUpperCase(),d=await fetch(c,{method:h,headers:r||{},body:["GET","HEAD"].includes(h)?null:l||null,signal:s||void 0});return{body:d.body,headers:d.headers,status:d.status,statusText:d.statusText}},async fetch(o,n){let l=o?o.toString():"";return l=fixBlockedMirrors(l),fetch(l,n||{})},connect(){}};return handler=new e({transport:p,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...t,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:o=>encodeURIComponent(o),codecDecode:o=>{try{if(!o)return new URL(ORIGIN+"/");let n=String(o);if(n.startsWith("#")&&(n=n.slice(1)),n.includes("#")&&(n=n.split("#")[0]),n.startsWith("network/")&&(n=n.slice(8)),!n)return new URL(ORIGIN+"/");try{const l=decodeURIComponent(n),r=l.includes("://")?l:"https://"+l;return new URL(r)}catch{const r=n.includes("://")?n:"https://"+n;return new URL(r)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(o,n,l)=>[l("/worker/working.all.js")],getWorkerInjectScripts:(o,n,l)=>l("/worker/working.all.js")}},sendSetCookie:async(o,n)=>{for(const l of await self.clients.matchAll())l.postMessage({type:"scramjet-set-cookie",url:o.href,cookie:n})},fetchBlobUrl:async o=>fetch(o),fetchDataUrl:async o=>fetch(o)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const t=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(r=>t.pathname.endsWith(r))||e.request.headers.has("x-scramjet-bypass"))return;const p=t.origin===self.location.origin;if(p&&(t.pathname.startsWith("/cron/")||t.pathname.startsWith("/gmt/")||t.pathname.startsWith("/unix/")||t.pathname.startsWith("/epoch/")||t.pathname.startsWith("/assets/")||t.pathname.startsWith("/dist/")||t.pathname.startsWith("/bare/")||t.pathname.startsWith("/baremux/")||t.pathname.startsWith("/libcurl/")||t.pathname.startsWith("/chii/")||t.pathname.startsWith("/uv/")||t.pathname.startsWith("/scram/")||t.pathname==="/"||t.pathname==="/index.html"||t.pathname==="/games"||t.pathname==="/newsession"||t.pathname==="/favicon.ico"||t.pathname==="/manifest.json"||t.pathname==="/robots.txt"||t.pathname==="/sitemap.xml"||t.pathname==="/browserconfig.xml"))return;if(!p&&e.request.mode==="navigate"){const r=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(fixBlockedMirrors(t.href)),self.location.origin);return e.respondWith(Response.redirect(r.href,307))}let n,l;if(p&&t.pathname.startsWith(SCRAM_PREFIX)){let r=extractTargetFromScram(t.href);if(r){r=fixBlockedMirrors(r);try{const s=new URL(r);if(s.hostname===self.location.hostname){let c=e.clientId&&clientOriginMap.get(e.clientId)||lastUpstreamOrigin||"https://www.youtube.com";if(e.request.referrer){const h=extractTargetFromScram(e.request.referrer);if(h)try{const d=new URL(h);d.hostname!==self.location.hostname&&(c=d.origin)}catch{}}r=c+s.pathname+s.search}else lastUpstreamOrigin=s.origin,e.clientId&&clientOriginMap.set(e.clientId,s.origin)}catch{}if(r.includes("githack.com")||r.includes("githubusercontent.com")){e.respondWith(fetch(r,{mode:"cors"}).catch(()=>emergencyBypass(e.request,r)));return}if(r.includes("sync_mod_chunk")||r.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,r));return}n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r),self.location.origin)}else n=t;l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}else if(p){let r=e.clientId&&clientOriginMap.get(e.clientId)||null;if(!r&&e.request.referrer){const s=extractTargetFromScram(e.request.referrer);if(s)try{const c=new URL(s);c.hostname!==self.location.hostname&&(r=c.origin)}catch{}}if(!r&&(t.pathname.startsWith("/s/")||t.pathname.startsWith("/youtubei/")||t.pathname.startsWith("/static/")||t.pathname.startsWith("/videoplayback")||t.pathname.startsWith("/generate_204")||t.pathname.startsWith("/error_204")||t.pathname.startsWith("/api/stats/"))&&(r="https://www.youtube.com"),r||(r=lastUpstreamOrigin),r){const s=fixBlockedMirrors(r+t.pathname+t.search);if(s.includes("sync_mod_chunk")||s.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,s));return}n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(s),self.location.origin),l=safeURL(r+"/")}else return}else{if(t.hostname.includes("githack.com")||t.hostname.includes("githubusercontent.com")||t.hostname.includes("cdnjs.cloudflare.com"))return;let r=fixBlockedMirrors(t.href);if(r.includes("sync_mod_chunk")||r.includes("kevlar_base")){e.respondWith(emergencyBypass(e.request,r));return}n=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r),self.location.origin);try{const s=new URL(r);lastUpstreamOrigin=s.origin,e.clientId&&clientOriginMap.set(e.clientId,s.origin)}catch{}l=e.request.referrer?safeURL(e.request.referrer):new URL(lastUpstreamOrigin+"/")}e.respondWith((async()=>{try{const r=await initHandler(),{ScramjetHeaders:s}=self.$scramjet,c=new s;e.request.headers.forEach((i,f)=>{try{c.set(f,i)}catch{}});const h=await r.handleFetch({rawUrl:n,rawClientUrl:l,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:c,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache});let d=toResponse(h);if((d.headers.get("content-type")||"").includes("text/html")){let i=await d.text();i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi,"https://raw.githack.com/$1/$2/$3/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi,"https://raw.githack.com/$1/$2/master/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/mysticful\/web-port@latest\/whosyourdaddy\/TemplateData\/style\.css/gi,"data:text/css,/*style*/"),i=i.replace(/https?:\/\/cdn\.jsdelivr\.net\/js\/mobile\.js/gi,"data:application/javascript,//mobile.js"),i=i.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),i=i.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),i=i.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),i=i.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),i=i.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),i=i.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),i=i.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),i=i.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),i=i.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),i=i.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const f=`<script>${GLOBAL_SHIM}<\/script>`;i.includes("<head>")?i=i.replace("<head>","<head>"+f):i.includes("<HEAD>")?i=i.replace("<HEAD>","<HEAD>"+f):i=f+i;const g=new Headers(d.headers);return g.set("content-type","text/html; charset=UTF-8"),new Response(i,{status:d.status,statusText:d.statusText,headers:g})}return d}catch(r){return console.error("[Scramjet v2 SW] Rewriter exception, falling back to bypass:",r),await emergencyBypass(e.request,n||t)}})())});async function emergencyBypass(e,t){let a;if(typeof t=="string")a=t;else if(t&&t.origin&&t.origin!==self.location.origin)a=t.href;else if(t){let s=extractTargetFromScram(t.href||t.toString());if(s)a=s;else{a=(t.pathname||"").slice(SCRAM_PREFIX.length)+(t.search||""),a.startsWith("network/")&&(a=a.slice(8));try{a=decodeURIComponent(a)}catch{}a.includes("://")||(a="https://"+a)}}else return new Response("Bypass Error: Invalid target",{status:400});a=fixBlockedMirrors(a);try{const s=new URL(a);s.hostname===self.location.hostname&&(a=(lastUpstreamOrigin||"https://www.youtube.com")+s.pathname+s.search)}catch{}console.log("[Scramjet v2 SW] Bypass for:",a);let p;try{const s=await getEpoxy();if(s){const c={};if(e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((u,i)=>{const f=i.toLowerCase();f!=="host"&&f!=="origin"&&f!=="referer"&&(c[i]=u)}),a.includes("youtube.com")||a.includes("googlevideo.com")||a.includes("gstatic.com")||a.includes("googleapis.com"))c.origin="https://www.youtube.com",c.referer="https://www.youtube.com/";else try{const u=new URL(a);!c.origin&&!["GET","HEAD"].includes((e.method||"GET").toUpperCase())&&(c.origin=u.origin),c.referer||(c.referer=u.origin+"/")}catch{}const h=["GET","HEAD"].includes(e.method)?null:e.body,d=await s.request(new URL(a),e.method,h,c);p=toResponse(d)}}catch(s){console.warn("[SW] Epoxy bypass failed:",s.message)}if(!p)try{const s=await fetch("/proxy/"+encodeURIComponent(a),{method:e.method,headers:e.headers,body:["GET","HEAD"].includes(e.method)?null:await e.blob()});(s.ok||s.status<500)&&(p=s)}catch{}if(!p)try{const s=await fetch(a,{mode:"no-cors",credentials:"omit"});(s.ok||s.type==="opaque")&&(p=s)}catch{}if(!p)return new Response("Proxy Error: All bypass tiers failed for "+a,{status:502});const o=p.status||200,n=NULL_BODY_STATUSES.has(o),l=n?"":p.headers.get("content-type")||"",r=new Headers(p.headers);if(sanitizeHeaders(r),n)return new Response(null,{headers:r,status:o});if(l.includes("font")||l.includes("image")||l.includes("wasm"))return new Response(p.body,{headers:r,status:o});if(l.includes("text/html")){let s=await p.text();s=s.replace(/<div\s+id=["']spinning-logo["'][^>]*>[\s\S]*?<\/div>/gi,""),s=s.replace(/<img[^>]*id=["']spinning-logo["'][^>]*>/gi,""),s=s.replace(/<img[^>]*src=["']data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^"']*["'][^>]*>/gi,""),s=s.replace(/#spinning-logo\s*\{[^}]*\}/gi,"#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }"),s=s.replace(/url\(\s*['"]?data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC[^'")]*['"]?\s*\)/gi,"none"),s=s.replace(/<div\s+id=["']note["'][^>]*>[\s\S]*?<\/div>/gi,'<div id="note">DOWNLOADING...</div>'),s=s.replaceAll("we ALL loves noahs tutoring hub","DOWNLOADING..."),s=s.replaceAll(/we ALL loves[^\s<]*/gi,"DOWNLOADING..."),s=s.replaceAll(/Noahs Tutoring Hub/gi,"DOWNLOADING..."),s=s.replaceAll(/noahs tutoring hub/gi,"DOWNLOADING...");const c=`<style>
#spinning-logo { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; visibility: hidden !important; }
#note { color: #ff3333 !important; font-family: monospace, sans-serif !important; font-size: 16px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-weight: bold !important; }
</style>
<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
})();
<\/script>`;return s.includes("<head>")?s=s.replace("<head>","<head>"+c):s.includes("<HEAD>")?s=s.replace("<HEAD>","<HEAD>"+c):s=c+s,r.set("content-type","text/html; charset=UTF-8"),new Response(s,{headers:r,status:o})}else if(l.includes("javascript")||a.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let s=await p.text();return s=injectScriptHeader(s),r.set("content-type","application/javascript; charset=UTF-8"),new Response(s,{headers:r,status:o})}return new Response(p.body,{headers:r,status:o})}
//# sourceMappingURL=working.sw.js.map
