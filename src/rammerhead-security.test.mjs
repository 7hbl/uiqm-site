import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { assertPublicProxyTarget, createPublicLookup } from './proxy-security.mjs';

const requireRammerhead = createRequire(new URL('../lib/rammerhead/package.json', import.meta.url));
const setupPipeline = requireRammerhead('./src/server/setupPipeline.js');
const StrShuffler = requireRammerhead('./src/util/StrShuffler.js');

function setupSecurityPipeline(session) {
  const handlers = [];
  const proxyServer = {
    addToOnRequestPipeline(handler) { handlers.push(handler); },
    rewriteServerHeaders: {},
  };
  const sessionStore = { get(id) { return id === session.id ? session : null; } };
  setupPipeline(proxyServer, sessionStore, { assertPublicProxyTarget, createPublicLookup });
  return handlers[0];
}

function responseRecorder() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(body) { this.body = body; },
  };
}

test('Rammerhead rejects private destinations before forwarding', () => {
  const session = { id: 'a'.repeat(32), shuffleDict: null };
  const guard = setupSecurityPipeline(session);
  const response = responseRecorder();
  const stopped = guard({
    url: `/${session.id}/http://127.0.0.1:8080/admin`,
    headers: {},
  }, response, {}, false, false);

  assert.equal(stopped, true);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body, 'Proxy destination is blocked.');
});

test('Rammerhead rejects private WebSocket destinations with an HTTP upgrade error', () => {
  const session = { id: 'd'.repeat(32), shuffleDict: null };
  const guard = setupSecurityPipeline(session);
  const response = responseRecorder();
  const proxyUrl = requireRammerhead('testcafe-hammerhead/lib/utils/url').getProxyUrl(
    'https://127.0.0.1/socket',
    { sessionId: session.id, proxyHostname: 'uiqm.lol', proxyPort: '443', resourceType: 'w' },
  );

  const stopped = guard({ url: new URL(proxyUrl).pathname, headers: {} }, response, {}, false, true);

  assert.equal(stopped, true);
  assert.match(response.body, /^HTTP\/1\.1 403 Forbidden\r\n/);
  assert.match(response.body, /Proxy destination is blocked\./);
});

test('Rammerhead validates shuffled targets and root-relative resources', () => {
  const session = { id: 'b'.repeat(32), shuffleDict: StrShuffler.generateDictionary() };
  const guard = setupSecurityPipeline(session);
  const shuffler = new StrShuffler(session.shuffleDict);
  const shuffledTarget = shuffler.shuffle('https://example.com/home');
  const patchedTarget = shuffledTarget.replace(/(^.*?:\/)\//, '$1');
  const shuffledResponse = responseRecorder();
  const shuffledStopped = guard({
    url: `/${session.id}/${patchedTarget}`,
    headers: {},
  }, shuffledResponse, {}, false, false);
  assert.equal(shuffledStopped, false);

  const relativeResponse = responseRecorder();
  const relativeStopped = guard({
    url: '/assets/app.js',
    headers: { referer: `https://uiqm.lol/${session.id}/https://example.com/home` },
  }, relativeResponse, {}, false, false);
  assert.equal(relativeStopped, false);
});

test('Rammerhead outbound requests use the guarded DNS resolver and disable unguarded HTTP/2', () => {
  const session = { id: 'c'.repeat(32), shuffleDict: null };
  setupSecurityPipeline(session);
  const RequestOptions = requireRammerhead('testcafe-hammerhead/lib/request-pipeline/request-options');
  const options = Object.create(RequestOptions.prototype);
  options.headers = {};
  options.rawHeaders = [];

  const prepared = options.prepare();
  assert.equal(typeof prepared.lookup, 'function');
  assert.equal(prepared.disableHttp2, true);
});
