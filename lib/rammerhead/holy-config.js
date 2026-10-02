'use strict';

const cookie = require('cookie');

module.exports = {
    //// HOSTING CONFIGURATION ////

    bindingAddress: "0.0.0.0",
    port: process.env.PORT || 3000,
    crossDomainPort: null,
    publicDir: null,

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

    password: null,

    // disable or enable localStorage sync (turn off if clients send over huge localStorage data, resulting in huge memory usages)
    disableLocalStorageSync: false,

    // restrict sessions to be only used per IP
    restrictSessionToIP: false,

    //// REWRITE HEADER CONFIGURATION ////

    stripClientHeaders: [
        'cf-ipcountry',
        'cf-ray',
        'x-forwarded-proto',
        'cf-visitor',
        'cf-connecting-ip',
        'cdn-loop',
        'x-forwarded-for'
    ],
    rewriteServerHeaders: {
        // you can also specify a function to modify/add the header using the original value (undefined if adding the header)
        // 'x-frame-options': (originalHeaderValue) => '',
        'x-frame-options': null // set to null to tell rammerhead that you want to delete it
    },

    //// LOGGING CONFIGURATION ////

    // valid values: 'disabled', 'debug', 'traffic', 'info', 'warn', 'error'
    generatePrefix: (level) => `[${new Date().toISOString()}] [${level.toUpperCase()}] `,

    // logger depends on this value
    getIP: (req) => (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
};
