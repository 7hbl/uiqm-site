import Fastify from 'fastify';
import { createServer } from 'node:http';
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

/* Record the server's location as a URL object, including its host and port.
 * The host can be modified at /src/config.json, whereas the ports can be modified
 * at /ecosystem.config.js.
 */
console.log(serverUrl);

// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
wisp.options.allow_udp_streams = false;
wisp.options.allow_loopback_ips = true;

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

wisp.options.hostname_blacklist = [];

// The server will check for the existence of this file when a shutdown is requested.
// The shutdown script in run-command.js will temporarily produce this file.
const shutdown = fileURLToPath(new URL('./.shutdown', import.meta.url));

const rh = createRammerhead();
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
      else if (req.url.endsWith(getAltPrefix('wisp', serverUrl.pathname)))
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

// Apply Helmet middleware for security.
app.register(fastifyHelmet, {
  contentSecurityPolicy: false, // Disable CSP
  xPoweredBy: false,
});

// Assign server file paths to different paths, for serving content on the website.
app.register(fastifyStatic, {
  root: fileURLToPath(new URL('../views/dist/pages', import.meta.url)),
  prefix: serverUrl.pathname,
  decorateReply: false,
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

  // Return the error page if the query is not found in routes.mjs.
  if (reqPath && !(reqPath in pages))
    return reply.code(404).type(supportedTypes.default).send(preloaded404);

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
  // setNotFoundHandler is a last-resort fallback for proxy paths not caught
  // by the onRequest hook (e.g. requests from older cached service workers).
  // proxyPrefixes is defined at module scope above.
  app.setNotFoundHandler(async (request, reply) => {
    const reqPath = new URL(request.url, serverUrl).pathname;
    const cleanPath = reqPath.startsWith(serverUrl.pathname)
      ? reqPath.slice(serverUrl.pathname.length - 1)
      : reqPath;

    for (const item of proxyPrefixes) {
      if (cleanPath.startsWith(item.prefix)) {
        const wildcard = cleanPath.slice(item.prefix.length) + (new URL(request.url, serverUrl).search || '');
        return handleProxyRequest(request, reply, item.engine, wildcard);
      }
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

    // YouTube watch embed optimizer for iframe compatibility
    const ytWatchMatch = targetUrlStr.match(/(?:watch\?v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/i);
    if (ytWatchMatch && ytWatchMatch[1]) {
      reply.redirect(`https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?autoplay=1`, 302);
      return;
    }

    if (/youtube\.com/i.test(targetUrlStr)) {
      const searchMatch = targetUrlStr.match(/[?&]search_query=([^&]+)/i);
      const initialQuery = searchMatch && searchMatch[1] ? decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')) : '';
      const initialSrc = initialQuery
        ? `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(initialQuery)}`
        : 'https://www.youtube-nocookie.com/embed?listType=search&list=trending';

      const ytPortalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YouTube Web Player</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; color: #fff; font-family: 'Courier New', monospace; height: 100vh; display: flex; flex-direction: column; }
header { background: #111; padding: 15px 25px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #ff0000; box-shadow: 0 0 15px rgba(255,0,0,0.3); }
.logo { font-size: 20px; font-weight: bold; color: #ff0000; text-shadow: 0 0 10px #ff0000; }
.search-bar { display: flex; flex: 1; max-width: 650px; margin: 0 20px; }
.search-bar input { flex: 1; padding: 10px 15px; border-radius: 4px 0 0 4px; border: 1px solid #ff0000; background: #000; color: #ff0000; font-family: inherit; font-size: 14px; outline: none; }
.search-bar button { padding: 10px 20px; border-radius: 0 4px 4px 0; border: 1px solid #ff0000; border-left: none; background: #200; color: #fff; font-family: inherit; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.search-bar button:hover { background: #ff0000; color: #000; }
.player-container { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; padding: 20px; }
iframe { width: 100%; height: 100%; max-width: 1200px; max-height: 700px; border: 2px solid #ff0000; border-radius: 6px; box-shadow: 0 0 25px rgba(255,0,0,0.4); }
</style>
</head>
<body>
<header>
  <div class="logo">▶ YOUTUBE WEB PLAYER</div>
  <form class="search-bar" onsubmit="playVideo(event)">
    <input type="text" id="yt-query" value="${initialQuery.replace(/"/g, '&quot;')}" placeholder="Enter video URL, Video ID, or search query..." spellcheck="false" autocomplete="off" />
    <button type="submit">PLAY</button>
  </form>
</header>
<div class="player-container">
  <iframe id="main-player" src="${initialSrc}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>
</div>
<script>
function playVideo(e) {
  if (e) e.preventDefault();
  const val = document.getElementById('yt-query').value.trim();
  if (!val) return;
  const match = val.match(/(?:watch\\?v=|youtu\\.be\\/|embed\\/|shorts\\/)([a-zA-Z0-9_-]{11})/i);
  const id = match ? match[1] : (val.length === 11 && !val.includes(' ') && !val.includes('?') ? val : null);
  if (id) {
    document.getElementById('main-player').src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
  } else {
    document.getElementById('main-player').src = 'https://www.youtube-nocookie.com/embed?listType=search&list=' + encodeURIComponent(val);
  }
}
</script>
</body>
</html>`;
      reply.type('text/html; charset=UTF-8').send(ytPortalHtml);
      return;
    }
    
    console.log(`[Proxy Server Fallback] Fetching upstream: ${targetUrlStr}`);
    
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrlStr);
    } catch (_) {
      parsedTarget = new URL('https://' + targetUrlStr);
    }
    const targetOrigin = parsedTarget.origin;

    const forwardHeaders = {};
    const headersToCopy = ['user-agent', 'accept', 'accept-language', 'referer'];
    for (const h of headersToCopy) {
      if (request.headers[h]) {
        forwardHeaders[h] = request.headers[h];
      }
    }
    if (!forwardHeaders['user-agent']) {
      forwardHeaders['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    }
    forwardHeaders['referer'] = targetOrigin + '/';
    
    const response = await fetch(targetUrlStr, {
      method: request.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      redirect: 'follow',
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
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
    const cleanUrl = targetUrlStr.split('?')[0].toLowerCase();
    const ext = cleanUrl.split('.').pop();
    
    if (ext === 'js' || cleanUrl.includes('/js/')) {
      contentType = 'application/javascript; charset=UTF-8';
    } else if (ext === 'css') {
      contentType = 'text/css; charset=UTF-8';
    } else if (ext === 'woff2') {
      contentType = 'font/woff2';
    } else if (ext === 'woff') {
      contentType = 'font/woff';
    } else if (ext === 'ttf') {
      contentType = 'font/ttf';
    } else if (ext === 'html' || cleanUrl.endsWith('.html')) {
      contentType = 'text/html; charset=UTF-8';
    }
    
    if (contentType) {
      responseHeaders['content-type'] = contentType;
    }

    // HTML Rewriting for seamless in-iframe browsing
    if (contentType.includes('text/html') || cleanUrl.endsWith('.html')) {
      let html = await response.text();
      const proxyPrefix = request.url.startsWith('/worker/network/')
        ? '/worker/network/'
        : (request.url.startsWith('/network/service/') ? '/network/service/' : '/proxy/');

      const baseTag = `<base href="${targetOrigin}/">`;
      const clientScript = `
<script>
(function() {
  const PROXY_ROOT = '${proxyPrefix}';
  try { Object.defineProperty(window, 'top', { get: () => window }); } catch(e) {}
  try { Object.defineProperty(window, 'parent', { get: () => window }); } catch(e) {}
  
  // Intercept fetch
  try {
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        try {
          const u = new URL(input, window.location.href);
          if (u.origin === window.location.origin && !u.pathname.startsWith(PROXY_ROOT)) {
            input = PROXY_ROOT + encodeURIComponent('${targetOrigin}' + u.pathname + u.search);
          }
        } catch (_) {}
      }
      return origFetch.call(this, input, init);
    };
  } catch(_) {}

  // Intercept XHR
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (typeof url === 'string') {
        try {
          const u = new URL(url, window.location.href);
          if (u.origin === window.location.origin && !u.pathname.startsWith(PROXY_ROOT)) {
            url = PROXY_ROOT + encodeURIComponent('${targetOrigin}' + u.pathname + u.search);
          }
        } catch (_) {}
      }
      return origOpen.call(this, method, url, ...args);
    };
  } catch(_) {}

  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (!a || !a.href) return;
    try {
      const u = new URL(a.href, window.location.href);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        e.preventDefault();
        window.location.href = PROXY_ROOT + encodeURIComponent(u.href);
      }
    } catch(_) {}
  }, true);
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form || !form.action) return;
    try {
      const u = new URL(form.action, window.location.href);
      form.action = PROXY_ROOT + encodeURIComponent(u.href);
    } catch(_) {}
  }, true);
})();
</script>`;

      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + baseTag + clientScript);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', '<HEAD>' + baseTag + clientScript);
      } else {
        html = baseTag + clientScript + html;
      }

      responseHeaders['content-type'] = 'text/html; charset=UTF-8';
      reply.headers(responseHeaders);
      reply.code(response.status);
      reply.send(html);
      return;
    }
    
    reply.headers(responseHeaders);
    reply.code(response.status);
    
    const arrayBuffer = await response.arrayBuffer();
    reply.send(Buffer.from(arrayBuffer));
    return;

  } catch (err) {
    console.error(`[Proxy Server Fallback Error] ${err.message} for wildcard: ${wildcard}`);
    reply.code(500).type('text/plain').send(`Proxy Error: ${err.message}`);
  }
}

app.listen({ port: serverUrl.port, host: serverUrl.hostname });
console.log(`InvisiProxy is listening on port ${serverUrl.port}.`);
console.log(`When hosting with a reverse proxy please ensure you are using NGINX only.\nCaddy and Apache have security risks due to wisp-js and loopbacks. Please configure them correctly.\nNGINX is recommended and used for production. Ports are whitelisted and security is maintained with NGINX only.`);
if (config.disguiseFiles)
  console.log(
    'disguiseFiles is enabled. Visit src/routes.mjs to see the entry point, listed within the pages variable.'
  );

