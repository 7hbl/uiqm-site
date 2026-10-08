const config = require('../config');
const getSessionId = require('../util/getSessionId');
const StrShuffler = require('../util/StrShuffler');
const { parseProxyUrl } = require('testcafe-hammerhead/lib/utils/url');
const RequestOptions = require('testcafe-hammerhead/lib/request-pipeline/request-options');

const replaceUrl = (url, replacer) => (url || '').replace(
    /^((?:[a-z0-9]+:\/\/[^/]+)?(?:\/[^/]+\/))([^]+)/i,
    (_match, prefix, target) => prefix + replacer(target)
);
const unpatch = (url) => url.replace(/^.*?:\/(?!\/)/, '$&/');

/**
 * @param {import('../classes/RammerheadProxy')} proxyServer
 * @param {import('../classes/RammerheadSessionAbstractStore')} sessionStore
 */
module.exports = function setupPipeline(proxyServer, sessionStore, security = {}) {
    if (security.createPublicLookup && security.assertPublicProxyTarget) {
        const RequestOptionsClass = RequestOptions.default || RequestOptions;
        const prototype = RequestOptionsClass.prototype;
        const lookupPatch = Symbol.for('uiqm.publicProxyLookupPatch');
        if (!prototype[lookupPatch]) {
            const originalPrepare = prototype.prepare;
            const lookup = security.createPublicLookup();
            prototype.prepare = function prepareWithPublicLookup(...args) {
                const prepared = originalPrepare.apply(this, args);
                prepared.lookup = lookup;
                // Hammerhead's HTTP/2 client opens sockets outside Node's
                // http(s).request lookup option. Keep this request on the
                // guarded HTTP/1 path so the checked resolver is always used.
                prepared.disableHttp2 = true;
                return prepared;
            };
            Object.defineProperty(prototype, lookupPatch, { value: true });
        }
    }

    proxyServer.addToOnRequestPipeline((req, res, _serverInfo, isRoute, isWebsocket) => {
        if (isRoute || !security.assertPublicProxyTarget) return false;

        let requestUrl = req.url || '';
        let referer = req.headers.referer || '';
        const requestSessionId = getSessionId(requestUrl);
        const refererSessionId = getSessionId(referer);
        const sessionId = requestSessionId || refererSessionId;
        const session = sessionId && sessionStore.get(sessionId);
        if (session && session.shuffleDict) {
            const shuffler = new StrShuffler(session.shuffleDict);
            if (requestSessionId === sessionId) {
                requestUrl = replaceUrl(requestUrl, (target) => shuffler.unshuffle(unpatch(target)));
            }
            if (refererSessionId === sessionId) {
                referer = replaceUrl(referer, (target) => shuffler.unshuffle(unpatch(target)));
            }
        }

        const parsedTarget = parseProxyUrl(requestUrl) || parseProxyUrl(referer);
        // Unparseable service routes never reach a destination request in
        // Hammerhead; let its normal route handling return the appropriate page.
        if (!parsedTarget) return false;

        try {
            security.assertPublicProxyTarget(new URL(parsedTarget.destUrl));
            return false;
        } catch (_) {
            const body = 'Proxy destination is blocked.';
            if (isWebsocket) {
                res.end(`HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
            } else {
                res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
                res.end(body);
            }
            return true;
        }
    });

    // remove headers defined in config.js
    proxyServer.addToOnRequestPipeline((req, res, _serverInfo, isRoute) => {
        if (isRoute) return; // only strip those that are going to the proxy destination website

        // restrict session to IP if enabled
        if (config.restrictSessionToIP) {
            const sessionId = getSessionId(req.url);
            const session = sessionId && sessionStore.get(sessionId);
            if (session && session.data.restrictIP && session.data.restrictIP !== config.getIP(req)) {
                res.writeHead(403);
                res.end('Sessions must come from the same IP');
                return true;
            }
        }

        for (const eachHeader of config.stripClientHeaders) {
            delete req.headers[eachHeader];
        }
    });
    Object.assign(proxyServer.rewriteServerHeaders, config.rewriteServerHeaders);
};
