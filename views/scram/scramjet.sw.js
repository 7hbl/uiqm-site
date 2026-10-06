// Scramjet service worker integration.
importScripts('/worker/working.all.js?v=2.7.3');
importScripts('/epoch/index.js?v=2.7.3');

const SCRAM_PREFIX = '/worker/';
const NETWORK_PREFIX = SCRAM_PREFIX + 'network/';
const ORIGIN = self.location.origin;
const RUNTIME_SCRIPT_URL = new URL('/worker/working.all.js?v=2.7.3', ORIGIN).href;
const WASM_SCRIPT_PATH = '/worker/scramjet.wasm.js';
const WASM_SCRIPT_URL = new URL(`${WASM_SCRIPT_PATH}?v=2.7.3`, ORIGIN).href;
const EPOXY_SCRIPT_URL = new URL('/epoch/index.js?v=2.7.3', ORIGIN).href;
const CLIENT_BOOTSTRAP_URL = new URL('/assets/js/scramjet-client-bootstrap.js?v=2.7.3', ORIGIN).href;
const WISP_URL =
  (self.location.protocol === 'https:' ? 'wss' : 'ws') +
  '://' +
  self.location.host +
  '/cron/';

const INTERNAL_PREFIXES = [
  '/assets/',
  '/archive/',
  '/baremux/',
  '/chii/',
  '/cron/',
  '/epoxy/',
  '/epoch/',
  '/gmt/',
  '/libcurl/',
  '/scram/',
  '/unix/',
  '/uv/',
];
const INTERNAL_FILES = new Set([
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/browserconfig.xml',
]);
const BLOCKED_RESPONSE_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'x-content-type-options',
  'x-frame-options',
];
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

let fetchHandler;
let epoxyTransport;
let wasmScriptPromise;
let workerCookieJar;
const clientOrigins = new Map();

function makeHeaders(input) {
  if (input instanceof Headers) return new Headers(input);
  const headers = new Headers();
  if (!input) return headers;

  try {
    if (Array.isArray(input)) {
      for (const [name, value] of input) headers.append(name, value);
    } else if (typeof input.forEach === 'function') {
      input.forEach((value, name) => headers.set(name, value));
    } else if (typeof input[Symbol.iterator] === 'function') {
      for (const [name, value] of input) headers.set(name, value);
    } else {
      for (const [name, value] of Object.entries(input)) {
        if (value !== undefined && value !== null) headers.set(name, String(value));
      }
    }
  } catch (_) {}

  return headers;
}

function cleanResponseHeaders(headers) {
  for (const name of BLOCKED_RESPONSE_HEADERS) headers.delete(name);
  return headers;
}

function htmlFileUrl(url) {
  try {
    return /\.(?:html?|xhtml)$/i.test(new URL(url).pathname);
  } catch (_) {
    return false;
  }
}

function normalizeHtmlMime(response, targetUrl) {
  const headers = makeHeaders(response.headers);
  const contentType = headers.get('content-type') || '';
  if (
    response.status < 400 &&
    htmlFileUrl(targetUrl) &&
    (!contentType || /^(?:text\/plain|application\/octet-stream)(?:\s*;|$)/i.test(contentType))
  ) {
    headers.set('content-type', 'text/html; charset=UTF-8');
  }
  return { ...response, headers };
}

function normalizeResourceMime(headers, targetUrl, destination, status = 200) {
  if (status >= 400) return headers;
  let pathname = '';
  try {
    pathname = new URL(targetUrl).pathname.toLowerCase();
  } catch (_) {
    return headers;
  }

  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1];
  const contentType = headers.get('content-type') || '';
  const replaceUnknownType =
    !contentType || /^(?:text\/plain|application\/octet-stream)(?:\s*;|$)/i.test(contentType);
  const fallbackTypes = {
    js: 'application/javascript; charset=UTF-8',
    mjs: 'application/javascript; charset=UTF-8',
    css: 'text/css; charset=UTF-8',
    wasm: 'application/wasm',
    json: 'application/json; charset=UTF-8',
    svg: 'image/svg+xml',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
  };

  if (
    destination === 'document' ||
    destination === 'iframe' ||
    /^(?:html?|xhtml)$/i.test(extension || '')
  ) {
    headers.set('content-type', 'text/html; charset=UTF-8');
  } else if (replaceUnknownType && fallbackTypes[extension]) {
    headers.set('content-type', fallbackTypes[extension]);
  } else if (replaceUnknownType && ['script', 'worker', 'sharedworker'].includes(destination)) {
    headers.set('content-type', 'application/javascript; charset=UTF-8');
  } else if (replaceUnknownType && destination === 'style') {
    headers.set('content-type', 'text/css; charset=UTF-8');
  }
  return headers;
}

function responseToTransport(response, targetUrl) {
  const normalized = normalizeHtmlMime(
    {
      body: response.body,
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    },
    targetUrl
  );
  normalized.headers = [...makeHeaders(normalized.headers).entries()];
  return normalized;
}

function dataUrlResponse(value) {
  const comma = value.indexOf(',');
  if (!value.startsWith('data:') || comma < 5) throw new TypeError('Invalid data URL.');

  const metadata = value.slice(5, comma);
  const content = value.slice(comma + 1);
  const parts = metadata.split(';');
  const mediaType = parts.shift() || 'text/plain';
  const isBase64 = parts.some((part) => part.toLowerCase() === 'base64');
  const parameters = parts.filter((part) => part && part.toLowerCase() !== 'base64');
  const contentType = mediaType + (parameters.length ? `;${parameters.join(';')}` : '');
  let bytes;

  if (isBase64) {
    let base64 = decodeURIComponent(content).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    base64 += '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(content));
  }

  return new Response(bytes, {
    headers: { 'content-type': contentType },
  });
}

function toResponse(raw) {
  const status = Number(raw.status) || 200;
  const headers = cleanResponseHeaders(makeHeaders(raw.headers));
  const body = NULL_BODY_STATUSES.has(status) ? null : raw.body || null;
  return new Response(body, {
    status,
    statusText: raw.statusText || 'OK',
    headers,
  });
}

function isInternalRequest(url) {
  if (url.origin !== ORIGIN) return false;
  return (
    INTERNAL_FILES.has(url.pathname) ||
    INTERNAL_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    /^\/worker\/working\.(?:all|sw|wasm\.wasm)/.test(url.pathname)
  );
}

function extractTargetFromScram(value) {
  try {
    const url = value instanceof URL ? value : new URL(value, ORIGIN);
    if (url.origin !== ORIGIN || !url.pathname.startsWith(NETWORK_PREFIX)) return null;

    const encodedTarget = url.pathname.slice(NETWORK_PREFIX.length);
    const decodedTarget = decodeURIComponent(encodedTarget);
    const target = new URL(decodedTarget);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(target.protocol)) return null;
    return target;
  } catch (_) {
    return null;
  }
}

function getClientOrigin(event) {
  const knownOrigin = event.clientId && clientOrigins.get(event.clientId);
  if (knownOrigin) return knownOrigin;

  const referrerTarget = event.request.referrer
    ? extractTargetFromScram(event.request.referrer)
    : null;
  if (referrerTarget) {
    if (event.clientId) rememberClientOrigin(event.clientId, referrerTarget.origin);
    return referrerTarget.origin;
  }
  return null;
}

function rememberClientOrigin(clientId, origin) {
  if (!clientId || !origin) return;
  try {
    clientOrigins.set(clientId, new URL(origin).origin);
    if (clientOrigins.size > 512) {
      clientOrigins.delete(clientOrigins.keys().next().value);
    }
  } catch (_) {}
}

function encodeProxyUrl(targetUrl) {
  return new URL(NETWORK_PREFIX + encodeURIComponent(targetUrl), ORIGIN);
}

function pickProxyHeaders(source) {
  const headers = new Headers();
  source.forEach((value, name) => {
    const lowerName = name.toLowerCase();
    if (
      [
        'accept',
        'accept-language',
        'authorization',
        'content-type',
        'if-modified-since',
        'if-none-match',
        'range',
        'referer',
        'x-requested-with',
      ].includes(lowerName) ||
      lowerName.startsWith('x-goog-') ||
      lowerName.startsWith('x-youtube-')
    ) {
      try {
        headers.set(name, value);
      } catch (_) {}
    }
  });
  return headers;
}

async function fetchServerProxy(targetUrl, request) {
  const method = request.method || 'GET';
  const init = {
    method,
    headers: pickProxyHeaders(request.headers),
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(method)) {
    init.body = request.body || null;
    if (init.body && typeof init.body.getReader === 'function') init.duplex = 'half';
  }

  return fetch('/proxy/' + encodeURIComponent(targetUrl), init);
}

async function fetchServerProxyResponse(targetUrl, method, headers, body) {
  const init = {
    method,
    headers: pickProxyHeaders(makeHeaders(headers)),
    redirect: 'follow',
  };
  if (!['GET', 'HEAD'].includes(method)) {
    init.body = body || null;
    if (init.body && typeof init.body.getReader === 'function') init.duplex = 'half';
  }

  const response = await fetch('/proxy/' + encodeURIComponent(targetUrl), init);
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) {
    return null;
  }
  return response;
}

async function getEpoxyTransport() {
  if (epoxyTransport) return epoxyTransport;
  const Transport =
    self.EpoxyTransport ||
    (self.EpxMod && (self.EpxMod.default || self.EpxMod.EpoxyTransport || self.EpxMod));
  if (!Transport) return null;

  try {
    const transport = new Transport({ wisp: WISP_URL });
    await transport.init();
    epoxyTransport = transport;
    return epoxyTransport;
  } catch (error) {
    console.warn('[Scramjet] Epoxy transport unavailable; using the server proxy.', error);
    return null;
  }
}

async function initFetchHandler() {
  if (fetchHandler) return fetchHandler;

  const { ScramjetFetchHandler, defaultConfig, CookieJar } = self.$scramjet;
  const rawTransport = await getEpoxyTransport();
  const transport = rawTransport
    ? {
        ...rawTransport,
        async request(remote, method, body, headers, signal) {
          let currentUrl = new URL(remote.href || String(remote));
          let currentMethod = (method || 'GET').toUpperCase();
          let currentBody = ['GET', 'HEAD'].includes(currentMethod) ? null : body;

          for (let redirects = 0; redirects < 8; redirects++) {
            const requestHeaders = headers?.clone ? headers.clone() : headers;
            const youtubeApi =
              (currentUrl.hostname === 'youtube.com' || currentUrl.hostname.endsWith('.youtube.com')) &&
              currentUrl.pathname.startsWith('/youtubei/');
            if (youtubeApi && requestHeaders?.set) {
              requestHeaders.set('origin', currentUrl.origin);
              if (!requestHeaders.has('referer')) requestHeaders.set('referer', `${currentUrl.origin}/`);
              requestHeaders.set('sec-fetch-site', 'same-origin');
              requestHeaders.set('sec-fetch-mode', 'same-origin');
              requestHeaders.set('sec-fetch-dest', 'empty');
            }
            let response = await rawTransport.request(
              currentUrl,
              currentMethod,
              currentBody,
              requestHeaders,
              signal
            );
            response = await normalizeUnityLoaderBlobProgress(response, currentUrl.href);
            const normalized = normalizeHtmlMime(response, currentUrl.href);
            const responseHeaders = makeHeaders(normalized.headers);
            const location = responseHeaders.get('location');

            if (normalized.status >= 300 && normalized.status < 400 && location) {
              currentUrl = new URL(location, currentUrl);
              currentMethod = 'GET';
              currentBody = null;
              continue;
            }

            const contentType = responseHeaders.get('content-type') || '';
            if (
              isScriptUrl(currentUrl) &&
              currentMethod === 'GET' &&
              (normalized.status >= 400 || /text\/html/i.test(contentType))
            ) {
              try {
                const fallback = await fetchServerProxyResponse(
                  currentUrl.href,
                  currentMethod,
                  headers,
                  null
                );
                if (fallback) return responseToTransport(fallback, currentUrl.href);
              } catch (error) {
                console.warn('[Scramjet] Script response fallback failed:', error);
              }
              throw new Error(`Upstream returned ${normalized.status} ${normalized.statusText || ''} for script ${currentUrl.href}`.trim());
            }

            return {
              ...normalized,
              headers: [...responseHeaders.entries()],
            };
          }

          throw new Error('The upstream site redirected too many times.');
        },
      }
    : {
        async init() {},
        async request(remote, method, body, headers) {
          const targetUrl = new URL(remote.href || String(remote)).href;
          const response = await fetchServerProxy(targetUrl, {
            method: (method || 'GET').toUpperCase(),
            headers: makeHeaders(headers),
            body,
          });
          return responseToTransport(response, targetUrl);
        },
        async fetch(remote, init) {
          const targetUrl = new URL(remote.href || String(remote)).href;
          return fetchServerProxy(targetUrl, {
            method: (init && init.method) || 'GET',
            headers: makeHeaders((init && init.headers) || {}),
            body: (init && init.body) || null,
          });
        },
        connect() {
          throw new Error('WebSocket proxying requires the Epoxy transport.');
        },
      };

  fetchHandler = new ScramjetFetchHandler({
    transport,
    crossOriginIsolated: false,
    context: {
      prefix: new URL(NETWORK_PREFIX, ORIGIN),
      cookieJar: (workerCookieJar = new CookieJar()),
      config: defaultConfig,
      interface: {
        codecEncode: (value) => encodeURIComponent(value),
        codecDecode: (value) => {
          let encoded = String(value || '').replace(/^#/, '').split('#')[0];
          if (encoded.startsWith('network/')) encoded = encoded.slice(8);
          try {
            return decodeURIComponent(encoded);
          } catch (_) {
            return encoded;
          }
        },
        getInjectScripts: (_meta, _target, script) => [
          script(RUNTIME_SCRIPT_URL),
          script(WASM_SCRIPT_URL),
          script(EPOXY_SCRIPT_URL),
          script(CLIENT_BOOTSTRAP_URL),
        ],
        getWorkerInjectScripts: (_meta, _target, script) => {
          const workerBootstrap = `(() => {
            const { ScramjetClient, CookieJar, setWasm, defaultConfig } = self.$scramjet;
            setWasm(Uint8Array.from(atob(self.WASM), (character) => character.charCodeAt(0)));
            delete self.WASM;
            const context = {
              config: defaultConfig,
              prefix: new URL(${JSON.stringify(NETWORK_PREFIX)}, self.location.origin),
              cookieJar: new CookieJar(),
              interface: {
                codecEncode: (value) => encodeURIComponent(value),
                codecDecode: (value) => {
                  const encoded = String(value || '').replace(/^#/, '').split('#')[0];
                  try { return decodeURIComponent(encoded); } catch (_) { return encoded; }
                },
              },
            };
            const client = new ScramjetClient(globalThis, {
              context,
              transport: null,
              shouldPassthroughWebsocket: () => false,
            });
            client.hook();
          })();`;
          const encodedBootstrap = `data:text/javascript;base64,${btoa(workerBootstrap)}`;
          return script(RUNTIME_SCRIPT_URL) + script(WASM_SCRIPT_URL) + script(encodedBootstrap);
        },
      },
    },
    sendSetCookie: async (url, cookie) => {
      for (const client of await self.clients.matchAll()) {
        client.postMessage({ type: 'scramjet-set-cookie', url: url.href, cookie });
      }
    },
    fetchBlobUrl: (url) => fetch(url),
    fetchDataUrl: (url) => dataUrlResponse(url),
  });

  return fetchHandler;
}

function isScriptUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    return /\.(?:m?js)$/i.test(pathname) || pathname.includes('/js/');
  } catch (_) {
    return false;
  }
}

async function normalizeUnityLoaderBlobProgress(response, targetUrl) {
  if (response.status >= 400 || !/\/UnityLoader[^/]*\.js$/i.test(new URL(targetUrl).pathname) || !response.body) {
    return response;
  }

  const source = await new Response(response.body).text();
  const patched = source.replace(
    /var\s+n\s*=\s*r\.target\.responseURL\s*,\s*o\s*=\s*n\.split\(["']\/Build\/["']\)\[1\]\s*;\s*o\s*=\s*o\.split\(["']\?["']\)\[0\]\s*;/,
    'var n = r.target.responseURL || r.target._url || "", o = (n.split("/Build/")[1] || n.split("/").pop() || "").split("?")[0]; if (window.mergedBlobUrls) { for (var uiqmMergedName in window.mergedBlobUrls) { if (window.mergedBlobUrls[uiqmMergedName] === n || (r.target._url && String(r.target._url).indexOf(uiqmMergedName) !== -1)) { o = uiqmMergedName; break; } } }'
  );

  const headers = makeHeaders(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  if (patched === source) {
    return { ...response, body: new TextEncoder().encode(source).buffer, headers: [...headers.entries()] };
  }

  headers.delete('etag');
  return {
    ...response,
    body: new TextEncoder().encode(patched).buffer,
    headers: [...headers.entries()],
  };
}

async function routeProxyRequest(event, proxyUrl, targetUrl, fallbackRequest) {
  if (event.request.mode === 'navigate' && event.resultingClientId) {
    rememberClientOrigin(event.resultingClientId, new URL(targetUrl).origin);
  }

  if (targetUrl.startsWith('data:')) {
    try {
      return dataUrlResponse(targetUrl);
    } catch (error) {
      console.error('[Scramjet] Could not decode a proxied data URL:', error);
      return new Response('The proxied data URL is invalid.', {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=UTF-8' },
      });
    }
  }

  try {
    const handler = await initFetchHandler();
    const request = event.request.clone();
    const headers = new self.$scramjet.ScramjetHeaders();
    request.headers.forEach((value, name) => {
      try {
        headers.set(name, value);
      } catch (_) {}
    });

    const response = await handler.handleFetch({
      rawUrl: proxyUrl,
      rawClientUrl: request.referrer ? new URL(request.referrer) : undefined,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      method: request.method,
      initialHeaders: headers,
      destination: request.destination,
      mode: request.mode,
      referrer: request.referrer,
      cache: request.cache,
      clientId: event.clientId || event.resultingClientId,
    });

    const responseHeaders = normalizeResourceMime(
      makeHeaders(response.headers),
      targetUrl,
      event.request.destination,
      response.status
    );
    return toResponse({ ...response, headers: responseHeaders });
  } catch (error) {
    console.error('[Scramjet] Request failed; retrying through the server proxy:', error);
    try {
      const response = await fetchServerProxy(targetUrl, fallbackRequest);
      const headers = cleanResponseHeaders(makeHeaders(response.headers));
      return new Response(NULL_BODY_STATUSES.has(response.status) ? null : response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (fallbackError) {
      console.error('[Scramjet] Server proxy fallback failed:', fallbackError);
      return new Response('The proxy could not load this site. Please try again.', {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=UTF-8' },
      });
    }
  }
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function wasmScriptResponse() {
  if (!wasmScriptPromise) {
    wasmScriptPromise = fetch(new URL('/worker/working.wasm.wasm?v=2.7.3', ORIGIN), {
      headers: { 'x-scramjet-bypass': '1' },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load Scramjet WebAssembly (${response.status}).`);
      return `self.WASM=${JSON.stringify(encodeBase64(await response.arrayBuffer()))};`;
    }).catch((error) => {
      wasmScriptPromise = null;
      throw error;
    });
  }

  try {
    const source = await wasmScriptPromise;
    return new Response(source, {
      headers: { 'content-type': 'application/javascript; charset=UTF-8', 'cache-control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[Scramjet] Unable to provide the WebAssembly initializer:', error);
    return new Response('throw new Error("Scramjet WebAssembly could not be loaded.");', {
      status: 503,
      headers: { 'content-type': 'application/javascript; charset=UTF-8' },
    });
  }
}

self.addEventListener('message', (event) => {
  const message = event.data;
  if (message?.type === 'uiqm-skip-waiting') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (message?.type !== 'scramjet-set-cookie' || !workerCookieJar) return;
  try {
    workerCookieJar.setCookies([message.cookie], new URL(message.url));
  } catch (error) {
    console.warn('[Scramjet] Could not sync a page cookie:', error);
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === ORIGIN && requestUrl.pathname === WASM_SCRIPT_PATH) {
    event.respondWith(wasmScriptResponse());
    return;
  }
  if (event.request.headers.has('x-scramjet-bypass') || isInternalRequest(requestUrl)) {
    return;
  }

  const isSameOrigin = requestUrl.origin === ORIGIN;
  const alreadyProxied = isSameOrigin && requestUrl.pathname.startsWith(NETWORK_PREFIX);
  const upstreamOrigin = getClientOrigin(event);

  if (isSameOrigin && event.request.mode === 'navigate' && !alreadyProxied) {
    if (event.resultingClientId) clientOrigins.delete(event.resultingClientId);
    return;
  }

  let targetUrl;
  if (alreadyProxied) {
    const target = extractTargetFromScram(requestUrl);
    if (!target) return;
    targetUrl = target.href;
  } else if (!isSameOrigin) {
    // App-owned images and fonts load directly; proxied pages stay inside Scramjet.
    if (event.request.mode !== 'navigate' && !upstreamOrigin) return;
    targetUrl = requestUrl.href;
  } else if (upstreamOrigin) {
    targetUrl = new URL(requestUrl.pathname + requestUrl.search, upstreamOrigin).href;
  } else {
    return;
  }

  const proxyUrl = alreadyProxied ? requestUrl : encodeProxyUrl(targetUrl);
  const fallbackRequest = event.request.clone();
  event.respondWith(routeProxyRequest(event, proxyUrl, targetUrl, fallbackRequest));
});
