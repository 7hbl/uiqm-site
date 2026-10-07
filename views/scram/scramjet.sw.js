// Scramjet service worker integration.
importScripts('/worker/working.all.js?v=2.7.4');
importScripts('/epoch/index.js?v=2.7.4');

const SCRAM_PREFIX = '/worker/';
const NETWORK_PREFIX = SCRAM_PREFIX + 'network/';
const ORIGIN = self.location.origin;
const RUNTIME_SCRIPT_URL = new URL('/worker/working.all.js?v=2.7.4', ORIGIN).href;
const WASM_SCRIPT_PATH = '/worker/scramjet.wasm.js';
const WASM_SCRIPT_URL = new URL(`${WASM_SCRIPT_PATH}?v=2.7.4`, ORIGIN).href;
const EPOXY_SCRIPT_URL = new URL('/epoch/index.js?v=2.7.4', ORIGIN).href;
const CLIENT_BOOTSTRAP_URL = new URL('/assets/js/scramjet-client-bootstrap.js?v=2.7.4', ORIGIN).href;
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
const transportBackoffUntil = new Map();
const TRANSPORT_BACKOFF_MS = 8000;
const googleVideoServerRoute = {
  preferUntil: 0,
  retryAfter: 0,
};
const GOOGLE_VIDEO_SERVER_PREFERENCE_MS = 120000;
const GOOGLE_VIDEO_SERVER_RETRY_MS = 60000;

function isGoogleVideoRequest(url) {
  return /(^|\.)googlevideo\.com$/i.test(url.hostname) &&
    url.pathname.startsWith('/videoplayback');
}

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

async function responseStartsWithHtml(response) {
  if (!response?.body || response.bodyUsed) return false;

  let reader;
  let sample = '';
  try {
    reader = response.clone().body?.getReader();
    if (!reader) return false;
    const decoder = new TextDecoder();
    let bytesRead = 0;
    while (bytesRead < 2048) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      sample += decoder.decode(value, { stream: true });
      if (/<\/?html\b|<!doctype\s+html\b/i.test(sample)) break;
    }
  } catch (_) {
    return false;
  } finally {
    reader?.cancel().catch(() => {});
  }

  const firstMarkup = sample.replace(/^\uFEFF?\s*(?:<!--[\s\S]*?-->\s*)*/, '');
  return /^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b|<script\b)/i.test(firstMarkup);
}

async function normalizeResourceResponse(response, targetUrl, destination) {
  const headers = cleanResponseHeaders(makeHeaders(response.headers));
  let pathname = '';
  try {
    pathname = new URL(targetUrl).pathname.toLowerCase();
  } catch (_) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1];
  const contentType = headers.get('content-type') || '';
  const replaceUnknownType =
    !contentType || /^(?:text\/plain|application\/octet-stream)(?:\s*;|$)/i.test(contentType);
  const isDocument =
    destination === 'document' ||
    destination === 'iframe' ||
    /^(?:html?|xhtml)$/i.test(extension || '');

  // Upstream protection pages are often sent with text/plain on 403/429 responses.
  // Let the browser render those HTML pages, while keeping actual plain-text errors intact.
  if (isDocument && replaceUnknownType && await responseStartsWithHtml(response)) {
    headers.set('content-type', 'text/html; charset=UTF-8');
  }

  if (response.status >= 400) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

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

  if (replaceUnknownType && fallbackTypes[extension]) {
    headers.set('content-type', fallbackTypes[extension]);
  } else if (replaceUnknownType && ['script', 'worker', 'sharedworker'].includes(destination)) {
    headers.set('content-type', 'application/javascript; charset=UTF-8');
  } else if (replaceUnknownType && destination === 'style') {
    headers.set('content-type', 'text/css; charset=UTF-8');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

function shouldBackoffEpoxy(error) {
  const message = String(error?.message || error || '');
  return /tls handshake|unexpected eof|network error|fetch failed|connection (?:reset|closed|refused)|timed? ?out/i.test(message);
}

function rememberEpoxyFailure(origin, error) {
  const existingExpiry = transportBackoffUntil.get(origin) || 0;
  const expiresAt = Date.now() + TRANSPORT_BACKOFF_MS;
  transportBackoffUntil.delete(origin);
  transportBackoffUntil.set(origin, expiresAt);
  if (transportBackoffUntil.size > 128) {
    const oldestOrigin = transportBackoffUntil.keys().next().value;
    transportBackoffUntil.delete(oldestOrigin);
  }
  if (existingExpiry <= Date.now()) {
    console.warn(`[Scramjet] Temporary transport failure for ${new URL(origin).host}; using the server proxy for ${TRANSPORT_BACKOFF_MS / 1000}s.`, error);
  }
}

async function storeRedirectCookies(response, url) {
  const headers = response?.headers;
  const cookies = typeof headers?.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers?.get?.('set-cookie')].filter(Boolean);
  if (!cookies.length) return;

  try {
    workerCookieJar?.setCookies(cookies, new URL(url));
  } catch (error) {
    console.warn('[Scramjet] Could not store cookies from an upstream redirect:', error);
  }

  for (const client of await self.clients.matchAll()) {
    for (const cookie of cookies) {
      client.postMessage({ type: 'scramjet-set-cookie', url: url.href || String(url), cookie });
    }
  }
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
          const originalOrigin = currentUrl.origin;
          const originalHeaders = headers?.clone ? headers.clone() : makeHeaders(headers);
          const visited = new Set();

          for (let redirectCount = 0; redirectCount <= 10; redirectCount++) {
            if (visited.has(currentUrl.href)) throw new Error('The upstream site returned a redirect loop.');
            visited.add(currentUrl.href);

            const requestHeaders = originalHeaders.clone ? originalHeaders.clone() : makeHeaders(originalHeaders);
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

            if (currentUrl.origin !== originalOrigin) {
              requestHeaders.delete?.('authorization');
              requestHeaders.delete?.('origin');
              requestHeaders.delete?.('cookie');
            }
            const jarCookies = workerCookieJar?.getCookies(currentUrl, false);
            if (jarCookies) requestHeaders.set('cookie', jarCookies);

            const googleVideoRequest = isGoogleVideoRequest(currentUrl);
            if (googleVideoRequest && googleVideoServerRoute.preferUntil > Date.now()) {
              try {
                const serverResponse = await fetchServerProxyResponse(
                  currentUrl.href,
                  currentMethod,
                  requestHeaders,
                  currentBody
                );
                if (serverResponse && [200, 206].includes(serverResponse.status)) {
                  return responseToTransport(serverResponse, currentUrl.href);
                }
              } catch (error) {
                console.warn('[Scramjet] Preferred Google Video server route failed; trying the direct route.', error);
              }
              googleVideoServerRoute.preferUntil = 0;
              googleVideoServerRoute.retryAfter = Date.now() + GOOGLE_VIDEO_SERVER_RETRY_MS;
            }

            const backoffExpiry = transportBackoffUntil.get(currentUrl.origin) || 0;
            if (backoffExpiry > Date.now()) {
              const error = new Error('The direct transport is cooling down; retrying through the server proxy.');
              error.code = 'SCRAM_TRANSPORT_BACKOFF';
              throw error;
            }
            if (backoffExpiry) transportBackoffUntil.delete(currentUrl.origin);

            let response;
            try {
              response = await rawTransport.request(
                currentUrl,
                currentMethod,
                currentBody,
                requestHeaders,
                signal
              );
            } catch (error) {
              if (shouldBackoffEpoxy(error)) rememberEpoxyFailure(currentUrl.origin, error);
              throw error;
            }

            response = await normalizeUnityLoaderBlobProgress(response, currentUrl.href);
            const normalized = normalizeHtmlMime(response, currentUrl.href);
            if (
              googleVideoRequest &&
              normalized.status === 403 &&
              Date.now() >= googleVideoServerRoute.retryAfter
            ) {
              try {
                const serverResponse = await fetchServerProxyResponse(
                  currentUrl.href,
                  currentMethod,
                  requestHeaders,
                  currentBody
                );
                if (serverResponse && [200, 206].includes(serverResponse.status)) {
                  normalized.body?.cancel?.().catch(() => {});
                  googleVideoServerRoute.preferUntil = Date.now() + GOOGLE_VIDEO_SERVER_PREFERENCE_MS;
                  googleVideoServerRoute.retryAfter = 0;
                  console.info('[Scramjet] Google Video playback switched to the server route after a CDN 403.');
                  return responseToTransport(serverResponse, currentUrl.href);
                }
              } catch (error) {
                console.warn('[Scramjet] Google Video server fallback failed after a CDN 403.', error);
              }
              googleVideoServerRoute.retryAfter = Date.now() + GOOGLE_VIDEO_SERVER_RETRY_MS;
            }
            const responseHeaders = makeHeaders(normalized.headers);
            const location = responseHeaders.get('location');
            if (normalized.status >= 300 && normalized.status < 400 && normalized.status !== 304) {
              if (!location) throw new Error(`The upstream returned ${normalized.status} without a redirect destination.`);
              if (redirectCount === 10) throw new Error('The upstream site redirected too many times.');

              await storeRedirectCookies(normalized, currentUrl);
              const nextUrl = new URL(location, currentUrl);
              if (!['http:', 'https:'].includes(nextUrl.protocol)) {
                throw new Error('The upstream returned an unsupported redirect destination.');
              }
              if (nextUrl.origin !== currentUrl.origin) {
                originalHeaders.delete?.('authorization');
                originalHeaders.delete?.('origin');
                originalHeaders.delete?.('cookie');
              }
              if (
                normalized.status === 303 ||
                ((normalized.status === 301 || normalized.status === 302) && currentMethod === 'POST')
              ) {
                currentMethod = 'GET';
                currentBody = null;
              }
              currentUrl = nextUrl;
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
                  requestHeaders,
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

    return normalizeResourceResponse(
      toResponse(response),
      targetUrl,
      event.request.destination
    );
  } catch (error) {
    if (error?.code !== 'SCRAM_TRANSPORT_BACKOFF') {
      console.warn('[Scramjet] Request failed; retrying through the server proxy:', error);
    }
    try {
      const response = await fetchServerProxy(targetUrl, fallbackRequest);
      return normalizeResourceResponse(response, targetUrl, event.request.destination);
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
    wasmScriptPromise = fetch(new URL('/worker/working.wasm.wasm?v=2.7.4', ORIGIN), {
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
