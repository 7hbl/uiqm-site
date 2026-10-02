const cookie = require('cookie');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = {
    //// HOSTING CONFIGURATION ////

    bindingAddress: '127.0.0.1',
    port: process.env.PORT,
    crossDomainPort: null,
    publicDir: path.join(__dirname, '../public'), // set to null to disable

    // if workers is null or 1, multithreading is disabled
    workers: os.cpus().length,

    // ssl object is either null or { key: fs.readFileSync('path/to/key'), cert: fs.readFileSync('path/to/cert') }
    // for more info, see https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    ssl: null,

    // this function's return object will determine how the client url rewriting will work.
    // set them differently from bindingAddress and port if rammerhead is being served
    // from a reverse proxy.
    getServerInfo: (req) => {
        const { origin_proxy } = cookie.parse(req.headers.cookie || '');

        let isHttps = false;
        if (req.socket && req.socket.encrypted) {
            isHttps = true;
        } else {
            const proto = req.headers['x-forwarded-proto'];
            if (proto) {
                isHttps = proto.split(',')[0].trim().toLowerCase() === 'https';
            } else if (req.headers['cf-visitor'] && req.headers['cf-visitor'].includes('"https"')) {
                isHttps = true;
            } else if (req.headers['x-forwarded-ssl'] === 'on' || req.headers['x-url-scheme'] === 'https' || req.headers['front-end-https'] === 'on') {
                isHttps = true;
            } else if (req.headers.referer && /^https:/i.test(req.headers.referer)) {
                isHttps = true;
            } else if (req.headers.origin && /^https:/i.test(req.headers.origin)) {
                isHttps = true;
            } else {
                const host = req.headers.host || '';
                if (host && !host.includes('localhost') && !host.startsWith('127.0.0.1') && !host.startsWith('192.168.') && !host.startsWith('10.')) {
                    isHttps = !host.endsWith(':80') && !host.endsWith(':8080');
                }
            }
        }

        const defaultProtocol = isHttps ? 'https:' : 'http:';
        const defaultPort = isHttps ? '443' : '80';

        let origin;
        try {
            origin = new URL(origin_proxy);
        } catch (error) {
            origin = new URL(`${defaultProtocol}//${req.headers.host || 'localhost'}`);
        }

        const hostname = origin.hostname || req.headers.host?.split(':')[0] || 'localhost';
        const port = origin.port || (req.headers.host?.includes(':') ? req.headers.host.split(':')[1] : defaultPort);
        const protocol = origin.protocol || defaultProtocol;

        return {
            hostname,
            port,
            crossDomainPort: port,
            protocol
        };
    },
    // example of non-hard-coding the hostname header
    // getServerInfo: (req) => {
    //     return { hostname: new URL('http://' + req.headers.host).hostname, port: 443, crossDomainPort: 8443, protocol: 'https: };
    // },

    // enforce a password for creating new sessions. set to null to disable
    password: null,

    // disable or enable localStorage sync (turn off if clients send over huge localStorage data, resulting in huge memory usages)
    disableLocalStorageSync: false,

    // restrict sessions to be only used per IP
    restrictSessionToIP: true,

    // use disk for caching js rewrites. set to null to use memory instead (not recommended for HDD disks)
    diskJsCachePath: null,
    jsCacheSize: 50 * 1024 * 1024, // 50mb in-memory cache

    //// REWRITE HEADER CONFIGURATION ////

    // removes reverse proxy headers
    // cloudflare example:
    // stripClientHeaders: ['cf-ipcountry', 'cf-ray', 'x-forwarded-proto', 'cf-visitor', 'cf-connecting-ip', 'cdn-loop', 'x-forwarded-for'],
    stripClientHeaders: [],
    // if you want to modify response headers, like removing the x-frame-options header, do it like so:
    // rewriteServerHeaders: {
    //     // you can also specify a function to modify/add the header using the original value (undefined if adding the header)
    //     // 'x-frame-options': (originalHeaderValue) => '',
    //     'x-frame-options': null, // set to null to tell rammerhead that you want to delete it
    // },
    rewriteServerHeaders: {
        // you can also specify a function to modify/add the header using the original value (undefined if adding the header)
        // 'x-frame-options': (originalHeaderValue) => '',
        'x-frame-options': null // set to null to tell rammerhead that you want to delete it
    },

    //// SESSION STORE CONFIG ////

    // see src/classes/RammerheadSessionFileCache.js for more details and options
    fileCacheSessionConfig: {
        saveDirectory: path.join(__dirname, '../sessions'),
        cacheTimeout: 1000 * 60 * 20, // 20 minutes
        cacheCheckInterval: 1000 * 60 * 10, // 10 minutes
        deleteUnused: true,
        staleCleanupOptions: {
            staleTimeout: 1000 * 60 * 60 * 24 * 3, // 3 days
            maxToLive: null,
            staleCheckInterval: 1000 * 60 * 60 * 6 // 6 hours
        },
        // corrupted session files happens when nodejs exits abruptly while serializing the JSON sessions to disk
        deleteCorruptedSessions: true,
    },

    //// LOGGING CONFIGURATION ////

    // valid values: 'disabled', 'debug', 'traffic', 'info', 'warn', 'error'
    logLevel: process.env.DEVELOPMENT ? 'debug' : 'info',
    generatePrefix: (level) => `[${new Date().toISOString()}] [${level.toUpperCase()}] `,

    // logger depends on this value
    getIP: (req) => (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
    // use the example below if rammerhead is sitting behind a reverse proxy like nginx
    // getIP: req => (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
};

if (fs.existsSync(path.join(__dirname, '../holy-config.js'))) Object.assign(module.exports, require('../holy-config'));
