importScripts('/worker/working.all.js');
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
  await scramjet.loadConfig();
  if (scramjet.route(event)) {
    return scramjet.fetch(event);
  }
  return fetch(event.request);
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'requestAC') {
    const requestPort = event.ports[0];
    requestPort.addEventListener('message', async (event) => {
      const response = await scramjet.fetch(event.data);
      const responseType = response.headers.get('content-type');
      let responseJSON = {};
      if (responseType && responseType.indexOf('application/json') !== -1)
        responseJSON = await response.json();
      else try { responseJSON = JSON.parse(await response.text()); } catch (e) {}
      requestPort.postMessage({
        responseJSON: responseJSON,
        searchType: event.data.type,
        time: event.data.request.headers.get('Date'),
      });
    });
    requestPort.start();
  }
});
