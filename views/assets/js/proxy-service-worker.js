(() => {
  const workerRelease = '2.7.7';
  const scriptPath = '/worker/working.sw.js';
  const scriptUrl = new URL(`${scriptPath}?v=${workerRelease}`, window.location.origin).href;
  let startupPromise;

  const isCurrentWorker = (worker) => {
    if (!worker) return false;
    try {
      const url = new URL(worker.scriptURL);
      return url.origin === window.location.origin &&
        url.pathname === scriptPath &&
        url.searchParams.get('v') === workerRelease;
    } catch (_) {
      return false;
    }
  };

  const waitForController = (registration) => new Promise((resolve, reject) => {
    let timeoutId;
    let intervalId;
    let skipRequested = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', check);
      registration.removeEventListener('updatefound', onUpdateFound);
    };

    const check = () => {
      if (isCurrentWorker(navigator.serviceWorker.controller) && isCurrentWorker(registration.active)) {
        cleanup();
        resolve(registration);
        return;
      }

      const waiting = registration.waiting;
      if (waiting && !skipRequested) {
        skipRequested = true;
        waiting.postMessage({ type: 'uiqm-skip-waiting' });
      }
    };

    const onUpdateFound = () => {
      registration.installing?.addEventListener('statechange', check);
      check();
    };

    navigator.serviceWorker.addEventListener('controllerchange', check);
    registration.addEventListener('updatefound', onUpdateFound);
    registration.installing?.addEventListener('statechange', check);
    intervalId = setInterval(check, 100);
    timeoutId = setTimeout(() => {
      cleanup();
      const controllerUrl = navigator.serviceWorker.controller?.scriptURL || 'none';
      reject(new Error(`Scramjet worker ${workerRelease} did not take control within 15 seconds (active: ${controllerUrl}).`));
    }, 15000);
    check();
  });

  window.ensureUiqmProxyWorker = () => {
    if (startupPromise) return startupPromise;
    startupPromise = (async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('This browser does not support service workers.');
      }

      const registration = await navigator.serviceWorker.register(scriptUrl, {
        scope: '/',
        updateViaCache: 'none',
      });
      if (!isCurrentWorker(navigator.serviceWorker.controller) || !isCurrentWorker(registration.active)) {
        try {
          await registration.update();
        } catch (error) {
          if (!isCurrentWorker(registration.active)) throw error;
        }
      }
      const readyRegistration = await waitForController(registration);
      console.info(`[UIQM] Scramjet worker ${workerRelease} controls this page.`);
      return readyRegistration;
    })().catch((error) => {
      startupPromise = null;
      throw error;
    });

    return startupPromise;
  };
})();
