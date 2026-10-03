importScripts("uv.bundle.js"),importScripts("uv.config.js"),importScripts(__uv$config.sw||"uv.sw.js");const uv=new UVServiceWorker;async function handleRequest(t){return uv.route(t)?await uv.fetch(t):await fetch(t.request)}self.addEventListener("fetch",t=>{t.respondWith(handleRequest(t))});
//# sourceMappingURL=sw.js.map
