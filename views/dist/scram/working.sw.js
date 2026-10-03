importScripts("/worker/working.all.js"),importScripts("/epoch/index.js");const SCRAM_PREFIX="/worker/",WISP_URL=(self.location.protocol==="https:"?"wss":"ws")+"://"+self.location.host+"/cron/",ORIGIN=self.location.origin;let handler,epoxy=null;globalThis.$scramjet$pushsourcemap=globalThis.$scramjet$pushsourcemap||(()=>{});async function getEpoxy(){if(epoxy&&epoxy.ready)return epoxy;try{const e=self.EpoxyTransport||self.EpxMod&&(self.EpxMod.default||self.EpxMod.EpoxyTransport||self.EpxMod);if(e&&(typeof e=="function"||typeof e.prototype?.init=="function")){const r=new e({wisp:WISP_URL});return await r.init(),epoxy=r,epoxy}}catch(e){console.warn("[SW] Epoxy init failed:",e)}return null}const BLOCKED_HEADERS=["x-frame-options","content-security-policy","content-security-policy-report-only","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-content-type-options"];function sanitizeHeaders(e){return BLOCKED_HEADERS.forEach(r=>e.delete(r)),e.set("access-control-allow-origin","*"),e.set("access-control-allow-methods","GET, POST, OPTIONS, PUT, DELETE"),e.set("access-control-allow-headers","*"),e}const NULL_BODY_STATUSES=new Set([101,204,205,304]);function toResponse(e){const r=e.status||200,s=NULL_BODY_STATUSES.has(r);if(e instanceof Response){const t=new Headers(e.headers);return sanitizeHeaders(t),new Response(s?null:e.body,{status:r,statusText:e.statusText,headers:t})}const c=new Headers;try{const t=e.headers;if(t)if(typeof t.forEach=="function")t.forEach((o,a)=>c.set(a,o));else if(typeof t.entries=="function")for(const[o,a]of t.entries())c.set(o,a);else if(typeof t[Symbol.iterator]=="function")for(const[o,a]of t)c.set(o,a);else for(const o in t)c.set(o,String(t[o]))}catch{}return!s&&!c.has("content-type")&&c.set("content-type","text/html; charset=UTF-8"),sanitizeHeaders(c),new Response(s?null:e.body||null,{status:r,statusText:e.statusText||"OK",headers:c})}function safeURL(e,r){if(e instanceof URL)return e;if(!e||typeof e!="string")return new URL(r||ORIGIN+"/");try{return new URL(e)}catch{}try{return new URL(e,r||ORIGIN)}catch{}return new URL(ORIGIN+"/")}const GLOBAL_SHIM=`
(function() {
    if (globalThis.$scramjet$initialized) return;
    const createSafe = () => {
        const s = new Proxy(function() { return s; }, {
            get: (t, p) => {
                if (p === 'then') return undefined;
                if (p === Symbol.toPrimitive) return () => '';
                if (p === 'toString' || p === 'valueOf') return () => '';
                if (p === 'length') return 0;
                if (p === Symbol.iterator) return function*() {};
                return s;
            },
            set: () => true,
            defineProperty: () => true,
            deleteProperty: () => true,
            has: () => true,
            apply: () => s,
            construct: () => s
        });
        return s;
    };
    const safe = createSafe();
    globalThis.$scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});
    globalThis.$scramjet$initialized = true;

    // Scramjet runtime shims (prevents ReferenceErrors on rewritten scripts)
    globalThis.$scramerr = globalThis.$scramerr || ((e) => {});
    globalThis.$scramjet$get = globalThis.$scramjet$get || ((o, p) => {
        if (!o) return undefined;
        if (p === 'location' && (o === (typeof window !== 'undefined' ? window : null) || o === (typeof document !== 'undefined' ? document : null))) {
            return typeof window !== 'undefined' ? window.location : (typeof self !== 'undefined' ? self.location : undefined);
        }
        try { return o[p]; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$call = globalThis.$scramjet$call || ((o, p, a) => {
        try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; }
    });
    globalThis.$scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => globalThis.$scramjet$call(o, p, a));
    globalThis.$scramjet$prop = (p) => p;
    globalThis.$scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if(o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
    globalThis.$scramjet$wrap = (o) => o;
    globalThis.$scramjet$clean = (...a) => a;
    globalThis.$scramjet$tryset = (o, p, v) => { try { o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$pushsourcemap = () => {};
    globalThis.$scramjet$wrappostmessage = globalThis.$scramjet$wrappostmessage || ((t) => t);
    globalThis.$scramjet$wrapfunction = globalThis.$scramjet$wrapfunction || ((fn) => fn);
    globalThis.$scramjet$wrapworker = globalThis.$scramjet$wrapworker || ((w) => w);
    globalThis.$scramjet$wrapwindow = globalThis.$scramjet$wrapwindow || ((w) => w);
    globalThis.$scramjet$wrapelement = globalThis.$scramjet$wrapelement || ((el) => el);
    var $scramjet$prop = globalThis.$scramjet$prop;
    var $scramjet$wrap = globalThis.$scramjet$wrap;
    var $scramjet$clean = globalThis.$scramjet$clean;
    var $scramjet$tryset = globalThis.$scramjet$tryset;
    var $scramjet$wrappostmessage = globalThis.$scramjet$wrappostmessage;
    var $scramjet$wrapfunction = globalThis.$scramjet$wrapfunction;
    var $scramjet$wrapworker = globalThis.$scramjet$wrapworker;
    var $scramjet$wrapwindow = globalThis.$scramjet$wrapwindow;
    var $scramjet$wrapelement = globalThis.$scramjet$wrapelement;

    if (typeof Object !== 'undefined' && Object.prototype) {
        if (!('$scramjet__eval' in Object.prototype)) {
            try {
                Object.defineProperty(Object.prototype, '$scramjet__eval', {
                    value: function(...a) {
                        var fn = (this && this.eval) || globalThis.eval;
                        return typeof fn === 'function' ? fn.apply(this, a) : undefined;
                    },
                    writable: true,
                    configurable: true,
                    enumerable: false
                });
            } catch(_) {}
        }
        if (!('$scramjet__location' in Object.prototype)) {
            try {
                Object.defineProperty(Object.prototype, '$scramjet__location', {
                    get: function() { return (this && this.location) || globalThis.location; },
                    set: function(v) {
                        if (this === globalThis || (typeof window !== 'undefined' && this === window) || (typeof document !== 'undefined' && this === document)) {
                            globalThis.location = v;
                        } else if (this) {
                            try { Object.defineProperty(this, '$scramjet__location', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__location'] = v; }
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            } catch(_) {}
        }
        if (!('$scramjet__parent' in Object.prototype)) {
            try {
                Object.defineProperty(Object.prototype, '$scramjet__parent', {
                    get: function() { return (this && this.parent) || globalThis.parent; },
                    set: function(v) {
                        if (this === globalThis || (typeof window !== 'undefined' && this === window)) {
                            globalThis.parent = v;
                        } else if (this) {
                            try { Object.defineProperty(this, '$scramjet__parent', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__parent'] = v; }
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            } catch(_) {}
        }
        if (!('$scramjet__top' in Object.prototype)) {
            try {
                Object.defineProperty(Object.prototype, '$scramjet__top', {
                    get: function() { return (this && this.top) || globalThis.top; },
                    set: function(v) {
                        if (this === globalThis || (typeof window !== 'undefined' && this === window)) {
                            globalThis.top = v;
                        } else if (this) {
                            try { Object.defineProperty(this, '$scramjet__top', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__top'] = v; }
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            } catch(_) {}
        }
    }

    // Array/String/Number Guard \u2014 stops "called on null" crashes without corrupting returns
    const wrapProto = (proto, methods) => {
        if (!proto) return;
        methods.forEach(m => {
            const orig = proto[m];
            if (!orig) return;
            proto[m] = function(...args) {
                if (this == null) return undefined;
                return orig.apply(this, args);
            };
        });
    };
    wrapProto(Array.prototype, ['every','forEach','indexOf','join','lastIndexOf','reduce','reduceRight','some','sort','filter','map','find','findIndex','flat','includes']);
    wrapProto(String.prototype, ['endsWith','includes','matchAll','startsWith','split','match','replace','replaceAll','slice','trim']);
    wrapProto(Number.prototype, ['toExponential','toFixed','toPrecision']);

    // Universal Proxy Intercept for fetch/XHR
    var _getProxyOrigin = function() {
        try {
            if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.location && window.parent.location.origin) {
                var po = window.parent.location.origin;
                if (po && !po.includes('youtube') && !po.includes('google')) return po;
            }
        } catch(_) {}
        try {
            var lo = (typeof location !== 'undefined' ? location.origin : '') || (typeof self !== 'undefined' && self.location ? self.location.origin : '');
            if (lo && !lo.includes('youtube') && !lo.includes('google')) return lo;
        } catch(_) {}
        return 'https://uiqm.lol';
    };

    var _wrapUrl = function(u) {
        if (!u || typeof u === 'boolean') return u;
        var s = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : ''));
        if (!s || typeof s !== 'string' || s === 'true' || s === 'false' || s === 'null' || s === 'undefined') return u;
        if (s.indexOf('/worker/network/') !== -1) return s;
        if (s.indexOf('/cron/') !== -1 || s.indexOf('/gmt/') !== -1 || s.indexOf('/unix/') !== -1 || s.indexOf('/epoch/') !== -1 || s.indexOf('/assets/') !== -1) return s;
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('javascript:')) return s;

        var proxyOrigin = _getProxyOrigin();
        var targetOrigin = 'https://www.youtube.com';
        try {
            var loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
            if (loc) {
                if (loc.origin && !loc.origin.includes('uiqm.lol') && loc.origin.startsWith('http')) {
                    targetOrigin = loc.origin;
                } else {
                    var idx = (loc.pathname || '').indexOf('/worker/network/');
                    if (idx !== -1) {
                        var rest = (loc.pathname || '').slice(idx + 16);
                        var rawPart = rest.split('?')[0].split('#')[0];
                        if (rawPart) {
                            try {
                                var d = decodeURIComponent(rawPart);
                                var p = new URL(d.includes('://') ? d : 'https://' + d);
                                targetOrigin = p.origin;
                            } catch(_) {}
                        }
                    }
                }
            }
        } catch(_) {}

        var full = s;
        if (full.startsWith('//')) {
            full = 'https:' + full;
        } else if (full.startsWith('/')) {
            full = targetOrigin + full;
        } else if (!full.includes('://')) {
            full = targetOrigin + '/' + full;
        }

        return proxyOrigin + '/worker/network/' + encodeURIComponent(full);
    };

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        var _realFetch = rootGlobal.fetch;
        if (_realFetch) {
            var _createWrappedFetch = function(origFetch) {
                return function(resource, init) {
                    try {
                        if (typeof resource === 'string') {
                            resource = _wrapUrl(resource);
                        } else if (resource instanceof URL) {
                            resource = _wrapUrl(resource.href);
                        } else if (resource && typeof resource === 'object' && resource.url) {
                            var nw = _wrapUrl(resource.url);
                            if (nw !== resource.url) {
                                try {
                                    resource = new Request(nw, resource);
                                } catch(_) {
                                    try {
                                        resource = new Request(nw, {
                                            method: resource.method,
                                            headers: resource.headers,
                                            credentials: resource.credentials,
                                            cache: resource.cache,
                                            redirect: resource.redirect
                                        });
                                    } catch(__) {
                                        resource = nw;
                                    }
                                }
                            }
                        }
                    } catch(_) {}
                    return origFetch.call(this, resource, init);
                };
            };
            var _currentFetch = _createWrappedFetch(_realFetch);
            try {
                Object.defineProperty(rootGlobal, 'fetch', {
                    get: function() { return _currentFetch; },
                    set: function(fn) {
                        if (typeof fn === 'function' && fn !== _currentFetch) {
                            _realFetch = fn;
                            _currentFetch = _createWrappedFetch(fn);
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch(_) {
                rootGlobal.fetch = _currentFetch;
            }
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.XMLHttpRequest && rootGlobal.XMLHttpRequest.prototype) {
            var _origOpen = rootGlobal.XMLHttpRequest.prototype.open;
            rootGlobal.XMLHttpRequest.prototype.open = function(method, url) {
                try { arguments[1] = _wrapUrl(url); } catch(_) {}
                var rest = Array.prototype.slice.call(arguments, 2);
                return _origOpen.apply(this, [method, arguments[1]].concat(rest));
            };
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.navigator && rootGlobal.navigator.sendBeacon) {
            var _origBeacon = rootGlobal.navigator.sendBeacon;
            rootGlobal.navigator.sendBeacon = function(url, data) {
                try { url = _wrapUrl(url); } catch(_) {}
                return _origBeacon.call(this, url, data);
            };
        }
    } catch(_) {}

    // Stub out commonly missing globals that crash Roblox/React apps
    const stubs = ['jQuery','$','React','ReactDOM','CoreUtilities','CoreRobloxUtilities','angular','bootstrap','ReactStyleGuide','Sentry','require'];
    stubs.forEach(lib => {
        if (!(lib in globalThis)) {
            try { Object.defineProperty(globalThis, lib, { get: () => safe, set: (v) => {}, configurable: true, enumerable: false }); } catch(_) {}
        }
    });

    // Suppress known harmless errors
    if (typeof globalThis.addEventListener === 'function') {
        globalThis.addEventListener('error', e => {
            if (!e.message) return;
            const msg = e.message;
            if (msg.includes('is not defined') || msg.includes('not a function') ||
                msg.includes('$scramjet') || msg.includes('Cannot read properties of null') ||
                msg.includes('Cannot read properties of undefined') ||
                msg.includes('$scramerr') || msg.includes('Bootstrap') ||
                msg.includes('jQuery') || msg.includes('Unsafe legacy')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);

        globalThis.addEventListener('unhandledrejection', e => {
            if (e.reason && (String(e.reason).includes('$scramjet') || String(e.reason).includes('is not defined'))) {
                e.preventDefault();
            }
        });
    }
})();`,SCRIPT_HEADER=`if (typeof globalThis.$scramjet$initialized === 'undefined') {
    globalThis.$scramjet$initialized = true;
    globalThis.$scramerr = globalThis.$scramerr || ((e) => {});
    globalThis.$scramdbg = globalThis.$scramdbg || ((i, e) => e);
    globalThis.$scramjet$prop = (p) => p;
    globalThis.$scramjet$wrap = (o) => o;
    globalThis.$scramjet$get = (o, p) => { try { return o[p]; } catch(_) { return undefined; } };
    globalThis.$scramjet$call = (o, p, a) => { try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; } };
    globalThis.$scramjet$apply = (o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined);
    globalThis.$scramjet$set = (o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$clean = (...a) => a;
    globalThis.$scramjet$tryset = (o, p, v) => { try { o[p] = v; } catch(_) {} return v; };
    globalThis.$scramjet$pushsourcemap = () => {};
}
var $scramerr = globalThis.$scramerr || ((e) => {});
var $scramdbg = globalThis.$scramdbg || ((i, e) => e);
var $scramjet$wrap = globalThis.$scramjet$wrap || ((o) => o);
var $scramjet$prop = globalThis.$scramjet$prop || ((p) => p);
var $scramjet$get = globalThis.$scramjet$get || ((o, p) => { try { return o[p]; } catch(_) { return undefined; } });
var $scramjet$call = globalThis.$scramjet$call || ((o, p, a) => { try { const fn = o && o[p]; return typeof fn === 'function' ? fn.apply(o, a) : undefined; } catch(_) { return undefined; } });
var $scramjet$apply = globalThis.$scramjet$apply || ((o, p, a) => (globalThis.$scramjet$call ? globalThis.$scramjet$call(o, p, a) : undefined));
var $scramjet$set = globalThis.$scramjet$set || ((o, p, v) => { try { if (o && p !== 'undefined') o[p] = v; } catch(_) {} return v; });
var $scramjet$clean = globalThis.$scramjet$clean || ((...a) => a);
var $scramjet$tryset = globalThis.$scramjet$tryset || ((o, p, v) => { try { o[p] = v; } catch(_) {} return v; });
var $scramjet$pushsourcemap = globalThis.$scramjet$pushsourcemap || (() => {});
var $scramjet$wrappostmessage = globalThis.$scramjet$wrappostmessage || ((t) => t);
var $scramjet$wrapfunction = globalThis.$scramjet$wrapfunction || ((fn) => fn);
var $scramjet$wrapworker = globalThis.$scramjet$wrapworker || ((w) => w);
var $scramjet$wrapwindow = globalThis.$scramjet$wrapwindow || ((w) => w);
var $scramjet$wrapelement = globalThis.$scramjet$wrapelement || ((el) => el);
if (typeof Object !== 'undefined' && Object.prototype) {
    if (!('$scramjet__eval' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__eval', {
                value: function(...a) {
                    var fn = (this && this.eval) || globalThis.eval;
                    return typeof fn === 'function' ? fn.apply(this, a) : undefined;
                },
                writable: true,
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__location' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__location', {
                get: function() { return (this && this.location) || globalThis.location; },
                set: function(v) {
                    if (this === globalThis || (typeof window !== 'undefined' && this === window) || (typeof document !== 'undefined' && this === document)) {
                        globalThis.location = v;
                    } else if (this) {
                        try { Object.defineProperty(this, '$scramjet__location', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__location'] = v; }
                    }
                },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__parent' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__parent', {
                get: function() { return (this && this.parent) || globalThis.parent; },
                set: function(v) {
                    if (this === globalThis || (typeof window !== 'undefined' && this === window)) {
                        globalThis.parent = v;
                    } else if (this) {
                        try { Object.defineProperty(this, '$scramjet__parent', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__parent'] = v; }
                    }
                },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
    if (!('$scramjet__top' in Object.prototype)) {
        try {
            Object.defineProperty(Object.prototype, '$scramjet__top', {
                get: function() { return (this && this.top) || globalThis.top; },
                set: function(v) {
                    if (this === globalThis || (typeof window !== 'undefined' && this === window)) {
                        globalThis.top = v;
                    } else if (this) {
                        try { Object.defineProperty(this, '$scramjet__top', { value: v, writable: true, configurable: true, enumerable: true }); } catch(_) { this['$scramjet__top'] = v; }
                    }
                },
                configurable: true,
                enumerable: false
            });
        } catch(_) {}
    }
}

(function() {
    var _getProxyOrigin = function() {
        try {
            if (typeof window !== 'undefined' && window.parent && window.parent !== window && window.parent.location && window.parent.location.origin) {
                var po = window.parent.location.origin;
                if (po && !po.includes('youtube') && !po.includes('google')) return po;
            }
        } catch(_) {}
        try {
            var lo = (typeof location !== 'undefined' ? location.origin : '') || (typeof self !== 'undefined' && self.location ? self.location.origin : '');
            if (lo && !lo.includes('youtube') && !lo.includes('google')) return lo;
        } catch(_) {}
        return 'https://uiqm.lol';
    };

    var _wrapUrl = function(u) {
        if (!u || typeof u === 'boolean') return u;
        var s = typeof u === 'string' ? u : (u.href ? u.href : (u.url ? u.url : ''));
        if (!s || typeof s !== 'string' || s === 'true' || s === 'false' || s === 'null' || s === 'undefined') return u;
        if (s.indexOf('/worker/network/') !== -1) return s;
        if (s.indexOf('/cron/') !== -1 || s.indexOf('/gmt/') !== -1 || s.indexOf('/unix/') !== -1 || s.indexOf('/epoch/') !== -1 || s.indexOf('/assets/') !== -1) return s;
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('javascript:')) return s;

        var proxyOrigin = _getProxyOrigin();
        var targetOrigin = 'https://www.youtube.com';
        try {
            var loc = typeof location !== 'undefined' ? location : (typeof self !== 'undefined' ? self.location : null);
            if (loc) {
                if (loc.origin && !loc.origin.includes('uiqm.lol') && loc.origin.startsWith('http')) {
                    targetOrigin = loc.origin;
                } else {
                    var idx = (loc.pathname || '').indexOf('/worker/network/');
                    if (idx !== -1) {
                        var rest = (loc.pathname || '').slice(idx + 16);
                        var rawPart = rest.split('?')[0].split('#')[0];
                        if (rawPart) {
                            try {
                                var d = decodeURIComponent(rawPart);
                                var p = new URL(d.includes('://') ? d : 'https://' + d);
                                targetOrigin = p.origin;
                            } catch(_) {}
                        }
                    }
                }
            }
        } catch(_) {}

        var full = s;
        if (full.startsWith('//')) {
            full = 'https:' + full;
        } else if (full.startsWith('/')) {
            full = targetOrigin + full;
        } else if (!full.includes('://')) {
            full = targetOrigin + '/' + full;
        }

        return proxyOrigin + '/worker/network/' + encodeURIComponent(full);
    };

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        var _realFetch = rootGlobal.fetch;
        if (_realFetch) {
            var _createWrappedFetch = function(origFetch) {
                return function(resource, init) {
                    try {
                        if (typeof resource === 'string') {
                            resource = _wrapUrl(resource);
                        } else if (resource instanceof URL) {
                            resource = _wrapUrl(resource.href);
                        } else if (resource && typeof resource === 'object' && resource.url) {
                            var nw = _wrapUrl(resource.url);
                            if (nw !== resource.url) {
                                try {
                                    resource = new Request(nw, resource);
                                } catch(_) {
                                    try {
                                        resource = new Request(nw, {
                                            method: resource.method,
                                            headers: resource.headers,
                                            credentials: resource.credentials,
                                            cache: resource.cache,
                                            redirect: resource.redirect
                                        });
                                    } catch(__) {
                                        resource = nw;
                                    }
                                }
                            }
                        }
                    } catch(_) {}
                    return origFetch.call(this, resource, init);
                };
            };
            var _currentFetch = _createWrappedFetch(_realFetch);
            try {
                Object.defineProperty(rootGlobal, 'fetch', {
                    get: function() { return _currentFetch; },
                    set: function(fn) {
                        if (typeof fn === 'function' && fn !== _currentFetch) {
                            _realFetch = fn;
                            _currentFetch = _createWrappedFetch(fn);
                        }
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch(_) {
                rootGlobal.fetch = _currentFetch;
            }
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.XMLHttpRequest && rootGlobal.XMLHttpRequest.prototype) {
            var _origOpen = rootGlobal.XMLHttpRequest.prototype.open;
            rootGlobal.XMLHttpRequest.prototype.open = function(method, url) {
                try { arguments[1] = _wrapUrl(url); } catch(_) {}
                var rest = Array.prototype.slice.call(arguments, 2);
                return _origOpen.apply(this, [method, arguments[1]].concat(rest));
            };
        }
    } catch(_) {}

    try {
        var rootGlobal = typeof window !== 'undefined' ? window : globalThis;
        if (rootGlobal.navigator && rootGlobal.navigator.sendBeacon) {
            var _origBeacon = rootGlobal.navigator.sendBeacon;
            rootGlobal.navigator.sendBeacon = function(url, data) {
                try { url = _wrapUrl(url); } catch(_) {}
                return _origBeacon.call(this, url, data);
            };
        }
    } catch(_) {}
})();`;function injectScriptHeader(e){if(typeof e!="string")return e;const r=e.match(/^\s*(['"])use strict\1;?/);return r?`${r[0]}
${SCRIPT_HEADER}
${e.slice(r[0].length)}`:`${SCRIPT_HEADER}
${e}`}async function initHandler(){if(handler)return handler;const{ScramjetFetchHandler:e,defaultConfig:r}=self.$scramjet,s=await getEpoxy(),c=s?{...s,async request(t,o,a,i,f){let n=i instanceof Headers?i:new Headers(i||{});const l=t&&t.hostname?t.hostname:"";l.includes("youtube.com")||l.includes("googleapis.com")||l.includes("googlevideo.com")||l.includes("gstatic.com")?(n.set("origin","https://www.youtube.com"),n.set("referer","https://www.youtube.com/")):t&&t.origin&&t.origin.startsWith("http")&&(!n.has("origin")&&!["GET","HEAD"].includes((o||"GET").toUpperCase())&&n.set("origin",t.origin),n.has("referer")||n.set("referer",t.origin+"/"));const u=await s.request(t,o,a,n,f);return{body:u.body||null,headers:u.headers instanceof Headers?u.headers:new Headers(u.headers||{}),status:u.status||200,statusText:u.statusText||"OK"}}}:{async init(){},async request(t,o,a,i,f){const n=(o||"GET").toUpperCase(),l=await fetch(t.toString(),{method:n,headers:i||{},body:["GET","HEAD"].includes(n)?null:a||null,signal:f||void 0});return{body:l.body,headers:l.headers,status:l.status,statusText:l.statusText}},async fetch(t,o){return fetch(t.toString(),o||{})},connect(){}};return handler=new e({transport:c,crossOriginIsolated:!1,context:{prefix:new URL(SCRAM_PREFIX,self.location.origin),cookieJar:new self.$scramjet.CookieJar,config:{...r,rewriteHtml:!0,rewriteJs:!0,rewriteCss:!0},interface:{codecEncode:t=>encodeURIComponent(t),codecDecode:t=>{try{if(!t)return new URL(ORIGIN+"/");let o=String(t);if(o.startsWith("#")&&(o=o.slice(1)),o.includes("#")&&(o=o.split("#")[0]),o.startsWith("network/")&&(o=o.slice(8)),!o)return new URL(ORIGIN+"/");try{const a=decodeURIComponent(o),i=a.includes("://")?a:"https://"+a;return new URL(i)}catch{const i=o.includes("://")?o:"https://"+o;return new URL(i)}}catch{return new URL(ORIGIN+"/")}},getInjectScripts:(t,o,a)=>[a("/worker/working.all.js")],getWorkerInjectScripts:(t,o,a)=>a("/worker/working.all.js")}},sendSetCookie:async(t,o)=>{for(const a of await self.clients.matchAll())a.postMessage({type:"scramjet-set-cookie",url:t.href,cookie:o})},fetchBlobUrl:async t=>fetch(t),fetchDataUrl:async t=>fetch(t)}),handler}self.addEventListener("install",()=>self.skipWaiting()),self.addEventListener("activate",e=>e.waitUntil(self.clients.claim())),self.addEventListener("fetch",e=>{const r=new URL(e.request.url);if(["working.all.js","working.sw.js","working.wasm.wasm","epoch/index.js"].some(i=>r.pathname.endsWith(i))||e.request.headers.has("x-scramjet-bypass"))return;const c=r.origin===self.location.origin;if(c&&(r.pathname.startsWith("/cron/")||r.pathname.startsWith("/gmt/")||r.pathname.startsWith("/unix/")||r.pathname.startsWith("/epoch/")||r.pathname.startsWith("/assets/")||r.pathname.startsWith("/dist/")||r.pathname==="/"||r.pathname==="/index.html"||r.pathname==="/games"||r.pathname==="/newsession"||r.pathname==="/favicon.ico"))return;if(!c&&e.request.mode==="navigate"){const i=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r.href),self.location.origin);return e.respondWith(Response.redirect(i.href,307))}let o,a;if(c&&r.pathname.startsWith(SCRAM_PREFIX))o=r,a=e.request.referrer?safeURL(e.request.referrer):new URL(r.origin+"/");else if(c){const i=e.request.referrer||"",f=i.match(/\/worker\/network\/([^/?#]+)/);if(f)try{const n=decodeURIComponent(f[1]),u=new URL(n.includes("://")?n:"https://"+n).origin+r.pathname+r.search;o=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(u),self.location.origin),a=safeURL(i)}catch{return}else return}else{if(r.pathname.startsWith("/worker/network/")){const i=r.pathname.slice(16)+r.search;o=new URL(SCRAM_PREFIX+"network/"+i,self.location.origin)}else o=new URL(SCRAM_PREFIX+"network/"+encodeURIComponent(r.href),self.location.origin);a=e.request.referrer?safeURL(e.request.referrer):new URL("https://www.youtube.com/")}e.respondWith((async()=>{try{const i=await initHandler(),{ScramjetHeaders:f}=self.$scramjet,n=new f;e.request.headers.forEach((p,h)=>{try{n.set(h,p)}catch{}});const l=await i.handleFetch({rawUrl:o,rawClientUrl:a,body:["GET","HEAD"].includes(e.request.method)?null:e.request.body,method:e.request.method,initialHeaders:n,destination:e.request.destination,mode:e.request.mode,referrer:e.request.referrer,cache:e.request.cache}),u=toResponse(l),g=u.headers.get("content-type")||"";if(!NULL_BODY_STATUSES.has(u.status)&&(g.includes("javascript")||o.pathname.endsWith(".js")||e.request.destination==="script"||e.request.destination==="worker"))try{let p=await u.text();p=injectScriptHeader(p);const h=new Headers(u.headers);return h.set("content-type","application/javascript; charset=UTF-8"),new Response(p,{headers:h,status:u.status,statusText:u.statusText})}catch{}return u}catch(i){return console.error("[Scramjet v2 SW] Rewriter crashed, using Epoxy bypass:",i),await emergencyBypass(e.request,o||r)}})())});async function emergencyBypass(e,r){let s;if(r.origin!==self.location.origin)s=r.href;else{s=r.pathname.slice(SCRAM_PREFIX.length)+r.search,s.startsWith("network/")&&(s=s.slice(8));try{s=decodeURIComponent(s)}catch{}s.includes("://")||(s="https://"+s)}console.log("[Scramjet v2 SW] Emergency Bypass for:",s);let c;try{const n=await getEpoxy();if(n){const l={};if(e.headers&&typeof e.headers.forEach=="function"&&e.headers.forEach((p,h)=>{const d=h.toLowerCase();d!=="host"&&d!=="origin"&&d!=="referer"&&(l[h]=p)}),s.includes("youtube.com")||s.includes("googlevideo.com")||s.includes("gstatic.com")||s.includes("googleapis.com"))l.origin="https://www.youtube.com",l.referer="https://www.youtube.com/";else try{const p=new URL(s);!l.origin&&!["GET","HEAD"].includes((e.method||"GET").toUpperCase())&&(l.origin=p.origin),l.referer||(l.referer=p.origin+"/")}catch{}const u=["GET","HEAD"].includes(e.method)?null:e.body,g=await n.request(new URL(s),e.method,u,l);c=toResponse(g)}}catch(n){console.warn("[SW] Epoxy bypass failed:",n.message)}if(!c)try{const n=await fetch(s,{mode:"no-cors",credentials:"omit"});(n.ok||n.type==="opaque")&&(c=n)}catch{}if(!c)return new Response("Proxy Error: All bypass tiers failed for "+s,{status:502});const t=c.status||200,o=NULL_BODY_STATUSES.has(t),a=o?"":c.headers.get("content-type")||"",i=new Headers(c.headers);if(sanitizeHeaders(i),o)return new Response(null,{headers:i,status:t});if(a.includes("font")||a.includes("image")||a.includes("wasm"))return new Response(c.body,{headers:i,status:t});const f=`<script>
(function() {
    if (globalThis.__scramjet_emergency_active) return;
    globalThis.__scramjet_emergency_active = true;
    ${GLOBAL_SHIM}
    console.log('[Scramjet SW] Emergency Runtime Active');
})();
<\/script>`;if(a.includes("text/html")){let n=await c.text();return n.includes("<head>")?n=n.replace("<head>","<head>"+f):n.includes("<HEAD>")&&(n=n.replace("<HEAD>","<HEAD>"+f)),i.set("content-type","text/html; charset=UTF-8"),new Response(n,{headers:i,status:t})}else if(a.includes("javascript")||s.endsWith(".js")||e.destination==="script"||e.destination==="worker"){let n=await c.text();return n=injectScriptHeader(n),i.set("content-type","application/javascript; charset=UTF-8"),new Response(n,{headers:i,status:t})}return new Response(c.body,{headers:i,status:t})}
//# sourceMappingURL=working.sw.js.map
