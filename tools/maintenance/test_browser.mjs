import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type().toUpperCase()}]`, msg.text());
  });
  page.on('pageerror', err => {
    console.log(`[Browser Uncaught Error]`, err.message, err.stack);
  });
  page.on('requestfailed', req => {
    console.log(`[Request Failed] ${req.method()} ${req.url()} (${req.failure()?.errorText}) initiator:`, JSON.stringify(req.initiator()));
  });
  page.on('response', res => {
    const u = res.url();
    if (res.status() >= 400 || u.includes('youtubei') || u.includes('browse') || u.includes('player') || u.includes('desktop') || u.includes('googlevideo')) {
      console.log(`[Response ${res.status()}] ${res.request().method()} ${u.slice(0, 100)} initiator:`, JSON.stringify(res.request().initiator()));
    }
  });

  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', e => {
      console.log('[Frame Global Error]', e.message, 'at', e.filename, ':', e.lineno, ':', e.colno, e.error ? e.error.stack : '');
    });
    window.addEventListener('unhandledrejection', e => {
      console.log('[Frame Global UnhandledRejection]', e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : e);
    });
  });

  try {
    console.log('Navigating to https://uiqm.lol in Incognito context...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#term-input', { timeout: 10000 });
    console.log('Waiting for ServiceWorker registration...');
    await page.waitForFunction(() => window._swPromise !== undefined, { timeout: 10000 }).catch(() => {});
    await page.evaluate(async () => {
      if (window._swPromise) {
        try {
          const reg = await window._swPromise;
          if (reg && !reg.active) {
            const worker = reg.installing || reg.waiting;
            if (worker && worker.state !== 'activated') {
              await new Promise(res => {
                worker.addEventListener('statechange', () => {
                  if (worker.state === 'activated') res();
                });
                setTimeout(res, 2000);
              });
            }
          }
        } catch (_) {}
      }
    });
    console.log('ServiceWorker registration confirmed! Waiting 1s...');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type('#term-input', 'https://www.youtube.com');
    await page.keyboard.press('Enter');

    console.log('Waiting 15 seconds for YouTube iframe...');
    await new Promise(r => setTimeout(r, 15000));
    
    const frames = page.frames();
    console.log('Total frames:', frames.length);
    for (const f of frames) {
      console.log('Frame URL:', f.url());
      if (f.url().includes('youtube.com')) {
        try {
          const evalResult = await f.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
              src: s.src,
              type: s.type,
              async: s.async,
              defer: s.defer,
              id: s.id,
              textLen: s.textContent.length
            }));
            return {
              scriptsCount: scripts.length,
              externalScripts: scripts.filter(s => s.src).map(s => s.src),
              scriptIds: scripts.filter(s => s.id).map(s => s.id),
              ytInitialData: typeof window.ytInitialData !== 'undefined',
              ytcfg: typeof window.ytcfg !== 'undefined' ? Object.keys(window.ytcfg.data_ || {}) : null,
              customElementYtdApp: typeof customElements !== 'undefined' ? !!customElements.get('ytd-app') : false,
              customElementYtdMasthead: typeof customElements !== 'undefined' ? !!customElements.get('ytd-masthead') : false,
              ytdAppChildren: Array.from(document.querySelector('ytd-app')?.children || []).map(c => c.tagName.toLowerCase()),
              bodyClasses: document.body ? document.body.className : '',
              hasConsentDialog: !!document.querySelector('tp-yt-paper-dialog, ytd-consent-bump-v2-lightbox, form[action*="consent"]')
            };
          });
          console.log('YouTube Frame DOM Inspection:', JSON.stringify(evalResult, null, 2));
        } catch (e) {
          console.log('Could not evaluate in frame:', e.message);
        }
      }
    }

    await page.screenshot({ path: 'tools/maintenance/live_test.png' });
    console.log('Saved screenshot to tools/maintenance/live_test.png');
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
