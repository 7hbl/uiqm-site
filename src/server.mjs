import Fastify from 'fastify';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import createRammerhead from '../lib/rammerhead/src/server/index.js';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import {
  config,
  serverUrl,
  pages,
  externalPages,
  getAltPrefix,
} from './routes.mjs';
import { tryReadFile, preloaded404 } from './templates.mjs';
import { fileURLToPath } from 'node:url';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import {
  assertPublicHttpTarget,
  assertPublicProxyTarget,
  createPublicLookup,
  configureWispSecurity,
  isBlockedDestinationError,
  PublicOnlyProxyAgent,
} from './proxy-security.mjs';

/* Record the server's location as a URL object, including its host and port.
 * The host can be modified at /src/config.json, whereas the ports can be modified
 * at /ecosystem.config.js.
 */
console.log(serverUrl);

// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
configureWispSecurity(wisp.options);

// For security reasons only allow these ports. Any additional regional proxies or default sandboxed Tor ports should be added here.
wisp.options.port_whitelist = [
  80,
  443,
  9050,
  7000,
  7001
];

wisp.options.port_blacklist = [
  [6881, 6889],
  6969,
  1337,
  [6969, 6969], 
  51413,
  [49152, 65535]
];

const safeProxyDispatcher = new PublicOnlyProxyAgent({
  connect: { lookup: createPublicLookup() },
});

// The server will check for the existence of this file when a shutdown is requested.
// The shutdown script in run-command.js will temporarily produce this file.
const shutdown = fileURLToPath(new URL('./.shutdown', import.meta.url));

const lastUpstreamByIp = new Map();
const rh = createRammerhead({ assertPublicProxyTarget, createPublicLookup });
const rammerheadScopes = [
  '/rammerhead.js',
  '/hammerhead.js',
  '/transport-worker.js',
  '/task.js',
  '/iframe-task.js',
  '/worker-hammerhead.js',
  '/messaging',
  '/sessionexists',
  '/deletesession',
  '/newsession',
  '/editsession',
  '/needpassword',
  '/syncLocalStorage',
  '/api/shuffleDict',
  '/mainport',
].map((pathname) => pathname.replace('/', serverUrl.pathname));

const rammerheadSession = new RegExp(
    `^${serverUrl.pathname.replaceAll('.', '\\.')}[a-z0-9]{32}`
  ),
  shouldRouteRh = (req) => {
    try {
      const url = new URL(req.url, serverUrl);
      return (
        url.pathname.startsWith('/rammer/') ||
        url.pathname === '/rammer' ||
        rammerheadScopes.includes(url.pathname) ||
        rammerheadSession.test(url.pathname)
      );
    } catch (e) {
      return false;
    }
  },
  routeRhRequest = (req, res) => {
    req.url = req.url.slice(serverUrl.pathname.length - 1);
    if (req.url.startsWith('/rammer/')) {
      req.url = '/' + req.url.slice(8);
    }
    rh.emit('request', req, res);
  },
  routeRhUpgrade = (req, socket, head) => {
    req.url = req.url.slice(serverUrl.pathname.length - 1);
    if (req.url.startsWith('/rammer/')) {
      req.url = '/' + req.url.slice(8);
    }
    rh.emit('upgrade', req, socket, head);
  };

// Create a server factory for Rammerhead and Wisp
const serverFactory = (handler) => {
  return createServer()
    .on('request', (req, res) => {
      if (shouldRouteRh(req)) routeRhRequest(req, res);
      else handler(req, res);
    })
    .on('upgrade', (req, socket, head) => {
      if (shouldRouteRh(req)) routeRhUpgrade(req, socket, head);
      else if (req.url.includes('/cron') || req.url.includes('/wisp'))
        wisp.routeRequest(req, socket, head);
    });
};

// Set logger to true for logs.
const app = Fastify({
  routerOptions: {
    ignoreDuplicateSlashes: true,
    ignoreTrailingSlash: true,
  },
  logger: false,
  serverFactory: serverFactory,
});

// Proxy prefix routing table — shared between the onRequest hook and
// the setNotFoundHandler fallback further below.
const proxyPrefixes = [
  { prefix: '/proxy/', engine: 'direct' },
  { prefix: '/worker/network/', engine: 'scram' },
  { prefix: '/worker/', engine: 'scram' },
  { prefix: '/scram/network/', engine: 'scram' },
  { prefix: '/scram/', engine: 'scram' },
  { prefix: '/network/service/', engine: 'uv' },
  { prefix: '/network/', engine: 'uv' },
  { prefix: '/uv/service/', engine: 'uv' },
  { prefix: '/uv/', engine: 'uv' },
  { prefix: '/service/', engine: 'uv' },
  { prefix: '/bare/', engine: 'bare' },
  { prefix: '/baremux/', engine: 'bare' },
  { prefix: '/gmt/', engine: 'bare' },
];

const staticAssetFiles = new Set([
  'networking.bundle.js', 'networking.client.js', 'networking.config.js', 'networking.handler.js', 'networking.sw.js',
  'uv.bundle.js', 'uv.client.js', 'uv.config.js', 'uv.handler.js', 'uv.sw.js', 'sw.js', 'sw-blacklist.js', 'workerware.js', 'WWError.js',
  'working.all.js', 'working.sw.js', 'working.wasm.wasm', 'scramjet.js', 'scramjet.mjs', 'scramjet_bundled.js', 'scramjet_bundled.mjs',
  'index.js', 'worker.js', 'index.mjs', 'index.cjs', 'a68dd7a5344f1722.wasm', 'c34a4f083a11eae2.wasm'
]);

function isProxyWildcard(wildcard, prefix) {
  if (!wildcard) return false;
  const clean = wildcard.split('?')[0];
  if (staticAssetFiles.has(clean)) return false;
  if (prefix === '/proxy/') return true;
  if (clean.startsWith('network/') || clean.startsWith('service/')) return true;
  if (/^https?(?:%3A|:)/i.test(clean)) return true;
  if (/^hvtr?s/i.test(clean)) return true;
  if (clean.includes('://') || clean.includes('%3A%2F%2F')) return true;
  return false;
}

app.addHook('onRequest', async (request, reply) => {
  const url = new URL(request.url, serverUrl);
  const reqPath = url.pathname;
  for (const item of proxyPrefixes) {
    if (reqPath.startsWith(item.prefix)) {
      const wildcard = reqPath.slice(item.prefix.length);
      if (isProxyWildcard(wildcard, item.prefix)) {
        await handleProxyRequest(request, reply, item.engine, wildcard + (url.search || ''));
        return; // reply has been sent by handleProxyRequest
      }
    }
  }
});

// Apply Helmet middleware for security (with frameguard disabled for proxy iframes).
app.register(fastifyHelmet, {
  contentSecurityPolicy: false, // Disable CSP
  xFrameOptions: false,
  xPoweredBy: false,
});

app.addHook('onSend', async (request, reply, payload) => {
  reply.removeHeader('x-frame-options');
  reply.removeHeader('content-security-policy');
  reply.removeHeader('content-security-policy-report-only');
  reply.removeHeader('cross-origin-opener-policy');
  reply.removeHeader('cross-origin-embedder-policy');
  reply.removeHeader('cross-origin-resource-policy');
  return payload;
});

// Assign server file paths to different paths, for serving content on the website.
const swHeaderHook = (res, path) => {
  if (path.endsWith('.sw.js') || path.endsWith('sw.js') || path.endsWith('.all.js')) {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
};

app.register(fastifyStatic, {
  root: fileURLToPath(new URL('../views/dist/pages', import.meta.url)),
  prefix: serverUrl.pathname,
  decorateReply: false,
  setHeaders: swHeaderHook,
});

// All entries in the dist folder are created with source rewrites.
// Minified scripts are also served here, if minification is enabled.
[
  'assets',
  'archive',
  'uv',
  'scram',
  'epoxy',
  'libcurl',
  'baremux',
  'chii',
].forEach((prefix) => {
  app.register(fastifyStatic, {
    root: fileURLToPath(new URL('../views/dist/' + prefix, import.meta.url)),
    prefix: getAltPrefix(prefix, serverUrl.pathname),
    decorateReply: false,
    setHeaders: swHeaderHook,
  });
});

app.register(fastifyStatic, {
  root: fileURLToPath(
    new URL('../views/dist/archive/gfiles/rarch', import.meta.url)
  ),
  prefix: getAltPrefix('serving', serverUrl.pathname),
  decorateReply: false,
});

// You should NEVER commit roms, due to piracy concerns.
['cores', 'info', 'roms'].forEach((prefix) => {
  app.register(fastifyStatic, {
    root: fileURLToPath(
      new URL('../views/dist/archive/gfiles/rarch/' + prefix, import.meta.url)
    ),
    prefix: getAltPrefix(prefix, serverUrl.pathname),
    decorateReply: false,
  });
});

app.register(fastifyStatic, {
  root: fileURLToPath(
    new URL('../views/dist/archive/gfiles/rarch/cores', import.meta.url)
  ),
  prefix: getAltPrefix('uauth', serverUrl.pathname),
  decorateReply: false,
});

/* If you are trying to add pages or assets in the root folder and
 * NOT entire folders, check ./src/routes.mjs and add it manually.
 *
 * All website files are stored in the /views directory.
 * This takes one of those files and displays it for a site visitor.
 * Paths like /browsing are converted into paths like /views/dist/pages/surf.html
 * back here. Which path converts to what is defined in routes.mjs.
 */

const supportedTypes = {
    default: config.disguiseFiles ? 'image/vnd.microsoft.icon' : 'text/html',
    html: 'text/html',
    txt: 'text/plain',
    xml: 'application/xml',
    ico: 'image/vnd.microsoft.icon',
  },
  disguise = 'ico';

if (config.disguiseFiles) {
  const getActualPath = (path) =>
      path.slice(0, path.length - 1 - disguise.length),
    shouldNotHandle = new RegExp(`\\.(?!html$|${disguise}$)[\\w-]+$`, 'i'),
    loaderFile = tryReadFile(
      '../views/dist/pages/misc/deobf/loader.html',
      import.meta.url,
      false
    );
  let exemptDirs = [
      'assets',
      'uv',
      'scram',
      'epoxy',
      'libcurl',
      'baremux',
      'wisp',
      'chii',
    ].map((dir) => getAltPrefix(dir, serverUrl.pathname).slice(1, -1)),
    exemptPages = ['login', 'test-shutdown', 'favicon.ico'];
  for (const [key, value] of Object.entries(externalPages))
    if ('string' === typeof value) exemptPages.push(key);
    else exemptDirs.push(key);
  for (const path of rammerheadScopes)
    if (!shouldNotHandle.test(path)) exemptDirs.push(path.slice(1));
  exemptPages = exemptPages.concat(exemptDirs);
  if (pages.default === 'login') exemptPages.push('');

  app.addHook('preHandler', (req, reply, done) => {
    if (req.params.modified) return done();
    const reqPath = new URL(req.url, serverUrl).pathname.slice(
      serverUrl.pathname.length
    );
    if (
      reqPath.startsWith('rammer/') ||
      shouldNotHandle.test(reqPath) ||
      exemptDirs.some((dir) => reqPath.indexOf(dir + '/') === 0) ||
      exemptPages.includes(reqPath) ||
      rammerheadSession.test(serverUrl.pathname + reqPath)
    )
      return done();

    if (!reqPath.endsWith('.' + disguise)) {
      reply.type(supportedTypes.html).send(loaderFile);
      reply.hijack();
      return done();
    } else if (!(reqPath in pages) && !reqPath.endsWith('favicon.ico')) {
      req.params.modified = true;
      req.raw.url = getActualPath(req.raw.url);
      if (req.params.path) req.params.path = getActualPath(req.params.path);
      if (req.params['*']) req.params['*'] = getActualPath(req.params['*']);
      reply.type(supportedTypes[disguise]);
      reply.header('Access-Control-Allow-Origin', 'null');
    }
    return done();
  });
}

app.get(serverUrl.pathname + ':path', (req, reply) => {
  // Testing for future features that need cookies to deliver alternate source files.
  /*
  if (req.raw.rawHeaders.includes('Cookie'))
    console.log(
      'cookie:',
      req.raw.rawHeaders[req.raw.rawHeaders.indexOf('Cookie') + 1]
    );
  */

  const reqPath = req.params.path;

  // Ignore browsers' automatic requests to favicon.ico, since it does not exist.
  // This approach is needed for certain pages to not have an icon.
  if (reqPath === 'favicon.ico') {
    reply.send();
    return reply.hijack();
  }

  if (reqPath in externalPages) {
    if (req.params.modified)
      return reply.code(404).type(supportedTypes.html).send(preloaded404);
    let externalRoute = externalPages[reqPath];
    if (typeof externalRoute !== 'string')
      externalRoute = externalRoute.default;
    return reply.redirect(externalRoute);
  }

  // If a GET request is sent to /test-shutdown and a script-generated shutdown file
  // is present, gracefully shut the server down.
  if (reqPath === 'test-shutdown' && existsSync(shutdown)) {
    console.log('InvisiProxy is shutting down.');
    app.close();
    unlinkSync(shutdown);
    process.exitCode = 0;
  }

  // Return the error page if the query is not found in routes.mjs,
  // or proxy it to upstream if it is a subresource from an active session.
  if (reqPath && !(reqPath in pages)) {
    let upstreamOrigin = null;
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.pathname.includes('/worker/network/')) {
          const enc = refUrl.pathname.split('/worker/network/')[1];
          const dec = decodeURIComponent(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        } else if (refUrl.pathname.includes('/worker/')) {
          const enc = refUrl.pathname.split('/worker/')[1];
          try {
            const dec = decodeURIComponent(enc);
            if (dec.includes('://') || dec.includes('.')) {
              upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
            }
          } catch (_) {}
        } else if (refUrl.pathname.includes('/network/service/')) {
          const enc = refUrl.pathname.split('/network/service/')[1];
          const dec = uvXorDecode(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        } else if (refUrl.pathname.startsWith('/proxy/')) {
          const enc = refUrl.pathname.slice(7);
          const dec = decodeURIComponent(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        }
      } catch (_) {}
    }
    if (!upstreamOrigin && req.headers.cookie) {
      const matchCookie = req.headers.cookie.match(/__active_proxy_origin=([^;]+)/);
      if (matchCookie) {
        try { upstreamOrigin = decodeURIComponent(matchCookie[1]); } catch (_) {}
      }
    }
    if (!upstreamOrigin) {
      const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
      const cached = lastUpstreamByIp.get(clientIp);
      if (cached && (Date.now() - cached.timestamp < 3600000)) {
        upstreamOrigin = cached.origin;
      }
    }
    if (!upstreamOrigin && (
      reqPath === 'generate_204' ||
      reqPath === 'videoplayback' ||
      reqPath === 'error_204' ||
      reqPath.startsWith('s/') ||
      reqPath.startsWith('youtubei/')
    )) {
      upstreamOrigin = 'https://www.youtube.com';
    }
    if (upstreamOrigin) {
      const fullUpstreamUrl = upstreamOrigin + '/' + reqPath + (req.raw.url.includes('?') ? '?' + req.raw.url.split('?')[1] : '');
      return handleProxyRequest(req, reply, 'direct', fullUpstreamUrl);
    }
    return reply.code(404).type(supportedTypes.default).send(preloaded404);
  }

  // Serve the default page if the path is the default path.
  const fileName = reqPath ? pages[reqPath] : pages[pages.default],
    type =
      supportedTypes[fileName.slice(fileName.lastIndexOf('.') + 1)] ||
      supportedTypes.default;

  if (req.params.modified) reply.type(supportedTypes[disguise]);
  else reply.type(type);
  reply.send(tryReadFile('../views/dist/' + fileName, import.meta.url));
});

app.get(serverUrl.pathname + 'github/:redirect', (req, reply) => {
  if (req.params.redirect in externalPages.github)
    reply.redirect(externalPages.github[req.params.redirect]);
  else reply.code(404).type(supportedTypes.default).send(preloaded404);
});

if (serverUrl.pathname === '/') {
  app.setNotFoundHandler(async (request, reply) => {
    const reqUrl = new URL(request.url, serverUrl);
    const reqPath = reqUrl.pathname;
    const cleanPath = reqPath.startsWith(serverUrl.pathname)
      ? reqPath.slice(serverUrl.pathname.length - 1)
      : reqPath;

    for (const item of proxyPrefixes) {
      if (cleanPath.startsWith(item.prefix)) {
        const wildcard = cleanPath.slice(item.prefix.length) + (reqUrl.search || '');
        return handleProxyRequest(request, reply, item.engine, wildcard);
      }
    }

    // Subresource proxy fallback: if a proxied site/app requests root-relative assets
    // (e.g. /s/player/..., /youtubei/..., /static/..., etc.), deduce the upstream target from the Referer header.
    const referer = request.headers.referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        let upstreamOrigin = null;

        if (refUrl.pathname.includes('/worker/network/')) {
          const enc = refUrl.pathname.split('/worker/network/')[1];
          const dec = decodeURIComponent(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        } else if (refUrl.pathname.includes('/worker/')) {
          const enc = refUrl.pathname.split('/worker/')[1];
          try {
            const dec = decodeURIComponent(enc);
            if (dec.includes('://') || dec.includes('.')) {
              upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
            }
          } catch (_) {}
        } else if (refUrl.pathname.includes('/network/service/')) {
          const enc = refUrl.pathname.split('/network/service/')[1];
          const dec = uvXorDecode(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        } else if (refUrl.pathname.startsWith('/proxy/')) {
          const enc = refUrl.pathname.slice(7);
          const dec = decodeURIComponent(enc);
          upstreamOrigin = new URL(dec.includes('://') ? dec : 'https://' + dec).origin;
        } else {
          const m = refUrl.pathname.match(/^\/[a-z0-9]{32}(?:![a-z0-9*_-]+)?\/(https?:\/\/[^\/?#]+)/i);
          if (m) {
            upstreamOrigin = m[1];
          } else {
            const m2 = refUrl.pathname.match(/^\/[a-z0-9]{32}(?:![a-z0-9*_-]+)?\/([^\/?#]+)/i);
            if (m2 && m2[1].includes('.')) {
              upstreamOrigin = 'https://' + m2[1];
            }
          }
        }

        if (upstreamOrigin) {
          const fullUpstreamUrl = upstreamOrigin + cleanPath + (reqUrl.search || '');
          return handleProxyRequest(request, reply, 'direct', fullUpstreamUrl);
        }
      } catch (_) {}
    }

    // Fallback: check __active_proxy_origin cookie or lastUpstreamByIp
    let fallbackOrigin = null;
    if (request.headers.cookie) {
      const matchCookie = request.headers.cookie.match(/__active_proxy_origin=([^;]+)/);
      if (matchCookie) {
        try { fallbackOrigin = decodeURIComponent(matchCookie[1]); } catch (_) {}
      }
    }
    if (!fallbackOrigin) {
      const clientIp = (request.headers['x-forwarded-for'] || '').split(',')[0].trim() || request.socket?.remoteAddress;
      const cached = lastUpstreamByIp.get(clientIp);
      if (cached && (Date.now() - cached.timestamp < 3600000)) {
        fallbackOrigin = cached.origin;
      }
    }
    if (!fallbackOrigin && (
      cleanPath.startsWith('/s/') ||
      cleanPath.startsWith('/youtubei/') ||
      cleanPath.startsWith('/static/') ||
      cleanPath.startsWith('/generate_204') ||
      cleanPath.startsWith('/videoplayback') ||
      cleanPath.startsWith('/error_204') ||
      cleanPath.startsWith('/api/stats/')
    )) {
      fallbackOrigin = 'https://www.youtube.com';
    }
    if (fallbackOrigin) {
      const fullUpstreamUrl = fallbackOrigin + cleanPath + (reqUrl.search || '');
      return handleProxyRequest(request, reply, 'direct', fullUpstreamUrl);
    }

    reply.code(404).type(supportedTypes.default).send(preloaded404);
  });
} else {
  // Apply the following patch(es) if the server URL has a prefix.

  // Patch to fix serving index.html.
  app.get(serverUrl.pathname, (req, reply) => {
    reply
      .type(supportedTypes.default)
      .send(tryReadFile('../views/dist/' + pages.index, import.meta.url));
  });
}

// Ultraviolet XOR decoding helper
const uvXorDecode = (str) => {
  if (!str) return str;
  let [input, ...search] = str.split('?');
  try {
    return (
      decodeURIComponent(input)
        .split('')
        .map((char, ind) =>
          ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
        )
        .join('') + (search.length ? '?' + search.join('?') : '')
    );
  } catch (_) {
    return (
      input
        .split('')
        .map((char, ind) =>
          ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
        )
        .join('') + (search.length ? '?' + search.join('?') : '')
    );
  }
};

async function handleProxyRequest(request, reply, engine, wildcard) {
  let targetLabel = 'unknown destination';
  try {
    let targetUrlStr = wildcard;
    
    // 1. Extract and decode the URL based on the engine and format
    if (targetUrlStr.startsWith('network/')) {
      targetUrlStr = targetUrlStr.slice(8);
    }
    if (targetUrlStr.startsWith('service/')) {
      targetUrlStr = targetUrlStr.slice(8);
    }

    if (/^hvtr?s/i.test(targetUrlStr)) {
      targetUrlStr = uvXorDecode(targetUrlStr);
    } else {
      try {
        targetUrlStr = decodeURIComponent(targetUrlStr);
      } catch (_) {}
    }
    
    // Ensure it starts with http:// or https://
    if (!targetUrlStr.includes('://')) {
      targetUrlStr = 'https://' + targetUrlStr;
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrlStr);
    } catch (_) {
      parsedTarget = new URL('https://' + targetUrlStr);
    }
    targetLabel = parsedTarget.host;
    assertPublicHttpTarget(parsedTarget);
    if (process.env.PROXY_DEBUG === '1') {
      console.log(`[Proxy Server Fallback] Fetching upstream: ${targetLabel}`);
    }
    const targetOrigin = parsedTarget.origin;
    const isYoutubeApi =
      (parsedTarget.hostname === 'youtube.com' || parsedTarget.hostname.endsWith('.youtube.com')) &&
      parsedTarget.pathname.startsWith('/youtubei/');
    const isYoutubeTarget =
      parsedTarget.hostname === 'youtube.com' || parsedTarget.hostname.endsWith('.youtube.com');
    const isYoutubeVideoStream =
      /(^|\.)googlevideo\.com$/i.test(parsedTarget.hostname) &&
      parsedTarget.pathname.startsWith('/videoplayback');
    const responseCookies = [];
    const isTopLevelNavigation =
      request.headers['sec-fetch-mode'] === 'navigate' ||
      request.headers['sec-fetch-dest'] === 'document' ||
      (!request.headers['sec-fetch-dest'] && parsedTarget.pathname === '/' && request.method === 'GET');
    if (isTopLevelNavigation) {
      try {
        const clientIp = (request.headers['x-forwarded-for'] || '').split(',')[0].trim() || request.socket?.remoteAddress;
        lastUpstreamByIp.set(clientIp, { origin: targetOrigin, timestamp: Date.now() });
        responseCookies.push(`__active_proxy_origin=${encodeURIComponent(targetOrigin)}; Path=/; SameSite=Lax`);
      } catch (_) {}
    }

    const forwardHeaders = {};
    const headersToCopy = [
      'user-agent', 'accept', 'accept-language', 'content-type', 'content-encoding',
      'authorization', 'x-origin', 'device-memory', 'priority', 'sec-ch-dpr',
      'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-ch-viewport-width',
      'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'x-client-data',
      'range', 'if-range'
    ];
    for (const h of headersToCopy) {
      if (request.headers[h]) {
        forwardHeaders[h] = request.headers[h];
      }
    }
    for (const [name, value] of Object.entries(request.headers)) {
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith('x-youtube-') || lowerName.startsWith('x-goog-')) {
        forwardHeaders[lowerName] = value;
      }
    }
    if (isYoutubeApi && request.headers.cookie) {
      const youtubeCookieNames = new Set([
        'VISITOR_PRIVACY_METADATA', 'VISITOR_INFO1_LIVE', 'YSC', 'GPS', 'PREF',
        '__Secure-BUCKET', '__Secure-ROLLOUT_TOKEN', '__Secure-YNID',
        'SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PAPISID',
        '__Secure-3PAPISID', '__Secure-1PSID', '__Secure-3PSID', 'LOGIN_INFO',
        'SIDCC', '__Secure-1PSIDCC', '__Secure-3PSIDCC'
      ]);
      const youtubeCookies = request.headers.cookie
        .split(';')
        .map((entry) => entry.trim())
        .filter((entry) => youtubeCookieNames.has(entry.slice(0, entry.indexOf('='))));
      if (youtubeCookies.length) forwardHeaders.cookie = youtubeCookies.join('; ');
    }
    if (!forwardHeaders['user-agent']) {
      forwardHeaders['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    }
    if (!['GET', 'HEAD'].includes(request.method) && !isYoutubeApi) {
      forwardHeaders['origin'] = targetOrigin;
    }
    forwardHeaders['referer'] = targetOrigin + '/';
    if (isYoutubeVideoStream) {
      // The browser referrer is encoded in the proxy route. Send the original
      // YouTube watch URL when available so Google Video sees the player context.
      let watchReferer = null;
      try {
        const browserReferer = new URL(request.headers.referer);
        const routeMarkers = ['/worker/network/', '/worker/', '/scram/network/', '/scram/'];
        const marker = routeMarkers.find((value) => browserReferer.pathname.includes(value));
        if (marker) {
          const encodedTarget = browserReferer.pathname.split(marker).at(-1);
          const decodedTarget = new URL(decodeURIComponent(encodedTarget));
          if (decodedTarget.hostname === 'youtube.com' || decodedTarget.hostname.endsWith('.youtube.com')) {
            watchReferer = decodedTarget.href;
          }
        }
      } catch (_) {}
      forwardHeaders['referer'] = watchReferer || 'https://www.youtube.com/';
      forwardHeaders['sec-fetch-site'] = 'cross-site';
    }
    if (isYoutubeApi) {
      forwardHeaders['origin'] = targetOrigin;
      forwardHeaders['sec-fetch-site'] = 'same-origin';
      forwardHeaders['sec-fetch-mode'] = 'same-origin';
      forwardHeaders['sec-fetch-dest'] = 'empty';
    }

    let fetchTarget = targetUrlStr;
    if (parsedTarget.pathname === '' || parsedTarget.pathname === '/') {
      fetchTarget = parsedTarget.origin + '/' + (parsedTarget.search || '');
    }

    let requestBody = null;
    if (!['GET', 'HEAD'].includes(request.method)) {
      requestBody = request.body;
      if (requestBody === undefined) requestBody = request.raw;
      if (
        requestBody && typeof requestBody === 'object' &&
        !Buffer.isBuffer(requestBody) &&
        typeof requestBody.getReader !== 'function' &&
        typeof requestBody[Symbol.asyncIterator] !== 'function' &&
        !(requestBody instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(requestBody)
      ) {
        requestBody = JSON.stringify(requestBody);
      }
    }

    const fetchOptions = {
      method: request.method,
      headers: forwardHeaders,
      body: requestBody,
      redirect: 'follow',
      dispatcher: safeProxyDispatcher,
    };
    if (
      requestBody &&
      (typeof requestBody.getReader === 'function' || typeof requestBody[Symbol.asyncIterator] === 'function')
    ) {
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(fetchTarget, fetchOptions);

    const responseHeaders = {};
    const upstreamSetCookies = response.headers.getSetCookie?.() || [];
    if (isYoutubeTarget) {
      for (const cookie of upstreamSetCookies) {
        responseCookies.push(cookie.replace(/;\s*domain=[^;]*/ig, ''));
      }
    }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      const blockedHeaders = [
        'x-frame-options',
        'content-security-policy',
        'content-security-policy-report-only',
        'cross-origin-opener-policy',
        'cross-origin-embedder-policy',
        'cross-origin-resource-policy',
        'x-content-type-options',
        'content-length',
        'content-encoding',
        'transfer-encoding',
      ];
      if (!blockedHeaders.includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    
    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE';
    responseHeaders['access-control-allow-headers'] = '*';
    
    let contentType = response.headers.get('content-type') || '';
    const extension = parsedTarget.pathname.toLowerCase().match(/\.([a-z0-9]+)$/i)?.[1];
    const fallbackContentType = (type) =>
      !contentType || /^(?:text\/plain|application\/octet-stream)(?:\s*;|$)/i.test(contentType)
        ? type
        : contentType;

    if (response.status < 400) {
      if (extension === 'js' || extension === 'mjs') {
        contentType = fallbackContentType('application/javascript; charset=UTF-8');
      } else if (extension === 'wasm') {
        contentType = fallbackContentType('application/wasm');
      } else if (extension === 'css') {
        contentType = fallbackContentType('text/css; charset=UTF-8');
      } else if (extension === 'woff2') {
        contentType = fallbackContentType('font/woff2');
      } else if (extension === 'woff') {
        contentType = fallbackContentType('font/woff');
      } else if (extension === 'ttf') {
        contentType = fallbackContentType('font/ttf');
      } else if (extension === 'html' || extension === 'htm' || extension === 'xhtml') {
        contentType = 'text/html; charset=UTF-8';
      }
    }
    
    if (contentType) {
      responseHeaders['content-type'] = contentType;
    }
    if (responseCookies.length) responseHeaders['set-cookie'] = responseCookies;

    reply.headers(responseHeaders);
    reply.code(response.status);
    reply.send(response.body ? Readable.fromWeb(response.body) : null);
    return;

  } catch (err) {
    if (isBlockedDestinationError(err)) {
      console.warn(`[Proxy Server Fallback] Blocked non-public destination: ${targetLabel}`);
      reply.code(403).type('text/plain').send('Proxy destination is blocked.');
      return;
    }
    console.error(`[Proxy Server Fallback Error] ${targetLabel}: ${err.code || err.name || 'upstream request failed'}`);
    reply.code(502).type('text/plain').send('Proxy upstream request failed.');
  }
}

app.listen({ port: serverUrl.port, host: serverUrl.hostname });
console.log(`InvisiProxy is listening on port ${serverUrl.port}.`);
console.log(`When hosting with a reverse proxy please ensure you are using NGINX only.\nCaddy and Apache have security risks due to wisp-js and loopbacks. Please configure them correctly.\nNGINX is recommended and used for production. Ports are whitelisted and security is maintained with NGINX only.`);
if (config.disguiseFiles)
  console.log(
    'disguiseFiles is enabled. Visit src/routes.mjs to see the entry point, listed within the pages variable.'
  );

