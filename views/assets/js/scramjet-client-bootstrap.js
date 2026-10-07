(async () => {
  const { CookieJar, ScramjetClient, defaultConfig, setWasm } = self.$scramjet || {};
  const transportModule = self.EpxMod;
  const EpoxyTransport =
    (transportModule && (transportModule.default || transportModule.EpoxyTransport)) ||
    self.EpoxyTransport;

  if (!CookieJar || !ScramjetClient || !defaultConfig || !setWasm || !EpoxyTransport) {
    console.error('[Scramjet] The page runtime or Epoxy transport did not load.');
    return;
  }

  if (!self.WASM) {
    console.error('[Scramjet] The WebAssembly initializer did not load.');
    return;
  }

  if (self.$scramjet.SCRAMJETCLIENT in self) return;

  try {
    setWasm(Uint8Array.from(atob(self.WASM), (character) => character.charCodeAt(0)));
  } catch (error) {
    console.error('[Scramjet] Could not initialize the WebAssembly rewriter:', error);
    return;
  }
  delete self.WASM;

  const cookieJar = new CookieJar();
  const loadCookieJarSnapshot = () => new Promise((resolve) => {
    const controller = self.navigator.serviceWorker?.controller;
    if (!controller || typeof MessageChannel !== 'function') {
      resolve();
      return;
    }

    const channel = new MessageChannel();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      channel.port1.close();
      resolve();
    };
    const timeoutId = setTimeout(finish, 350);
    channel.port1.onmessage = (event) => {
      try {
        if (typeof event.data?.cookies === 'string') cookieJar.load(event.data.cookies);
      } catch (error) {
        console.warn('[Scramjet] Could not restore the worker cookie snapshot:', error);
      }
      finish();
    };

    try {
      controller.postMessage({ type: 'scramjet-cookie-jar-snapshot' }, [channel.port2]);
    } catch (_) {
      finish();
    }
  });
  const origin = self.location.origin;
  const prefix = new URL('/worker/network/', origin);
  const wisp = `${self.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${self.location.host}/cron/`;
  const transport = new EpoxyTransport({ wisp });
  const codecDecode = (value) => {
    const encoded = String(value || '').replace(/^#/, '').split('#')[0];
    try {
      return decodeURIComponent(encoded);
    } catch (_) {
      return encoded;
    }
  };
  const patchUnityBlobResponseUrl = (global) => {
    const prototype = global.XMLHttpRequest?.prototype;
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'responseURL');
    if (!descriptor?.get || !descriptor.configurable) return;

    try {
      Object.defineProperty(prototype, 'responseURL', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          const responseUrl = descriptor.get.call(this);
          const merged = global.mergedBlobUrls;
          if (!merged || typeof merged !== 'object') return responseUrl;
          const requestUrl = typeof this._url === 'string' ? this._url : '';
          const entry = Object.entries(merged).find(([filename, blobUrl]) =>
            blobUrl === responseUrl || requestUrl.includes(filename)
          );
          if (!entry) return responseUrl;

          try {
            return new URL(`Build/${entry[0]}`, global.document.baseURI).href;
          } catch (_) {
            return responseUrl;
          }
        },
      });
    } catch (error) {
      console.warn('[Scramjet] Could not normalize a Unity blob response URL:', error);
    }
  };
  const interfaceConfig = {
    codecEncode: (value) => encodeURIComponent(String(value)),
    codecDecode,
    getInjectScripts: (_meta, _handler, script) => [
      script(new URL('/worker/working.all.js?v=2.7.7', origin).href),
      script(new URL('/worker/scramjet.wasm.js?v=2.7.7', origin).href),
      script(new URL('/epoch/index.js?v=2.7.7', origin).href),
      script(new URL('/assets/js/scramjet-client-bootstrap.js?v=2.7.7', origin).href),
    ],
    getWorkerInjectScripts: (_meta, _type, script) =>
      script(new URL('/worker/working.all.js?v=2.7.7', origin).href),
  };

  const createContext = (global) => {
    const context = {
      config: defaultConfig,
      prefix,
      cookieJar,
      interface: interfaceConfig,
    };
    const client = new ScramjetClient(global, {
      context,
      transport,
      initHeaders: [],
      history: [],
      shouldPassthroughWebsocket: () => false,
      shouldBlockMessageEvent: () => false,
      sendSetCookie: async (cookies, options) => {
        // Scramjet 2.x calls this with CookieSyncEntry[] and optional options.
        // Forward the actual upstream URLs so the service worker can keep its
        // cookie jar in sync for the next proxied request.
        if (options?.clear) cookieJar.clear();
        const entries = Array.isArray(cookies) ? cookies.flatMap((entry) => {
          if (!entry || typeof entry.cookie !== 'string') return [];
          try {
            const cookieUrl = entry.url instanceof URL ? entry.url : new URL(entry.url);
            cookieJar.setCookies(entry.cookie, cookieUrl);
            return [{ url: cookieUrl.href, cookie: entry.cookie }];
          } catch (_) {
            return [];
          }
        }) : [];
        self.navigator.serviceWorker?.controller?.postMessage({
          type: 'scramjet-cookie-sync',
          cookies: entries,
          clear: Boolean(options?.clear),
        });
      },
      hookSubcontext: (childGlobal) => createContext(childGlobal),
    });
    client.hook();
    patchUnityBlobResponseUrl(global);
    return client;
  };

  try {
    // Load cookies stored by the service worker before page scripts inspect
    // document.cookie (for example, during a site's own verification flow).
    await loadCookieJarSnapshot();
    self.__scramjetClient = createContext(self);
    self.navigator.serviceWorker?.addEventListener('message', (event) => {
      const message = event.data;
      if (message?.type === 'scramjet-cookie-sync') {
        if (message.clear) cookieJar.clear();
        for (const entry of Array.isArray(message.cookies) ? message.cookies : []) {
          if (!entry || typeof entry.cookie !== 'string') continue;
          try {
            const cookieUrl = entry.url instanceof URL ? entry.url : new URL(entry.url);
            cookieJar.setCookies(entry.cookie, cookieUrl);
          } catch (error) {
            console.warn('[Scramjet] Could not apply a synchronized cookie:', error);
          }
        }
        return;
      }
      // Keep compatibility with redirect-cookie messages from older workers.
      if (message?.type === 'scramjet-set-cookie' && message.url && message.cookie) {
        try { cookieJar.setCookies(message.cookie, new URL(message.url)); }
        catch (error) { console.warn('[Scramjet] Could not apply a proxied cookie:', error); }
      }
    });
  } catch (error) {
    console.error('[Scramjet] Could not initialize the page runtime:', error);
  }
})();
