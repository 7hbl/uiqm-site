importScripts('/worker/working.all.js');

let scramjet;
try {
    const { ScramjetServiceWorker } = $scramjetLoadWorker();
    scramjet = new ScramjetServiceWorker();
} catch (e) {
    console.error('[UIQM SW] Init error:', e);
}

async function handleRequest(event) {
    if (!scramjet) return fetch(event.request);
    try {
        await scramjet.loadConfig();
        if (scramjet.route(event)) return scramjet.fetch(event);
    } catch (e) {
        console.warn('[UIQM SW] Fetch error:', e);
    }
    return fetch(event.request);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(handleRequest(event)));

self.addEventListener('message', event => {
    if (event.data.type === 'requestAC') {
        const port = event.ports[0];
        port.addEventListener('message', async ev => {
            try {
                const resp = await scramjet.fetch(ev.data);
                const ct = resp.headers.get('content-type');
                let json = {};
                if (ct && ct.includes('application/json')) json = await resp.json();
                else try {
                    const t = await resp.text();
                    try { json = JSON.parse(t); } catch { json = JSON.parse(t.replace(/^[^[{]*|[^\]}]*$/g, '')); }
                } catch {}
                port.postMessage({ responseJSON: json, searchType: ev.data.type, time: ev.data.request.headers.get('Date') });
            } catch (e) {
                port.postMessage({ responseJSON: {}, searchType: ev.data.type });
            }
        });
        port.start();
    }
});
