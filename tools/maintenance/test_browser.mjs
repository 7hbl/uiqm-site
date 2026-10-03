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
    console.log(`[Request Failed] ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    console.log('Navigating to https://uiqm.lol in Incognito context...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#term-input', { timeout: 10000 });
    
    await page.type('#term-input', 'https://www.youtube.com');
    await page.keyboard.press('Enter');

    console.log('Waiting 10 seconds for YouTube iframe...');
    await new Promise(r => setTimeout(r, 10000));
    
    const frames = page.frames();
    console.log('Total frames:', frames.length);
    for (const f of frames) {
      console.log('Frame URL:', f.url());
      if (f.url().includes('youtube.com')) {
        try {
          const evalResult = await f.evaluate(() => {
            return {
              hasWindow: typeof window !== 'undefined',
              hasGlobalThis: typeof globalThis !== 'undefined',
              windowMath: typeof window !== 'undefined' ? typeof window.Math : 'no',
              globalThisMath: typeof globalThis !== 'undefined' ? typeof globalThis.Math : 'no',
              mathEquals: typeof window !== 'undefined' ? (window.Math === Math) : 'no',
              undefinedWritable: typeof window !== 'undefined' ? Object.getOwnPropertyDescriptor(window, 'undefined') : null,
              scriptsCount: document.querySelectorAll('script').length,
              title: document.title,
              hasYtdApp: !!document.querySelector('ytd-app'),
              hasMasthead: !!document.querySelector('#masthead'),
              hasButtons: document.querySelectorAll('button').length,
              bodyHtmlLength: document.body ? document.body.innerHTML.length : 0
            };
          });
          console.log('YouTube Frame Diagnosis:', JSON.stringify(evalResult, null, 2));
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
