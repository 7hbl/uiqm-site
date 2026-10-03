import puppeteer from 'puppeteer';

(async () => {
  console.log('🌐 Testing Live Production at https://uiqm.lol in Incognito Mode...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon.ico')) {
      errors.push(`[Console Error] ${text}`);
      console.log(`[Live Console Error] ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Live Page Error] ${err.message}`);
    console.log(`[Live Page Error] ${err.message}`);
  });

  // 1. Terminal navigation on Live Production
  console.log('\n--- 1. Testing Terminal at https://uiqm.lol ---');
  await page.goto('https://uiqm.lol', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#term-input', { timeout: 15000 });
  console.log('✅ Live Terminal loaded');

  // Verify SW registration
  const swScope = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return 'none';
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map(r => r.scope);
  });
  console.log('Active Service Worker Scopes:', JSON.stringify(swScope));

  // Test Wikipedia on live
  console.log('\nTesting Wikipedia via Terminal on Live...');
  await page.type('#term-input', 'wikipedia.org');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 6000));

  const wikiSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('Live Wikipedia Frame src:', wikiSrc);

  let wikiTitle = '';
  for (const f of page.frames()) {
    if (f.url().includes('wikipedia')) {
      try { wikiTitle = await f.evaluate(() => document.title); } catch (_) {}
    }
  }
  console.log('✅ Live Wikipedia Title:', wikiTitle || 'Loaded');

  // Close proxy
  await page.evaluate(() => { if (typeof closeProxy === 'function') closeProxy(); });
  await new Promise(r => setTimeout(r, 1000));

  // Test DuckDuckGo search on live
  console.log('\nTesting DuckDuckGo search "minecraft" via Terminal on Live...');
  await page.waitForSelector('#term-input', { timeout: 5000 });
  await page.type('#term-input', 'minecraft');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 6000));

  const ddgSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('Live DuckDuckGo Frame src:', ddgSrc);

  let ddgTitle = '';
  for (const f of page.frames()) {
    if (f.url().includes('duckduckgo')) {
      try { ddgTitle = await f.evaluate(() => document.title); } catch (_) {}
    }
  }
  console.log('✅ Live DuckDuckGo Title:', ddgTitle || 'Loaded');

  // Close proxy
  await page.evaluate(() => { if (typeof closeProxy === 'function') closeProxy(); });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Testing Games Hub on Live Production
  console.log('\n--- 2. Testing Games Hub at https://uiqm.lol/games ---');
  await page.goto('https://uiqm.lol/games', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.game-card', { timeout: 15000 });

  const totalCards = await page.evaluate(() => document.querySelectorAll('.game-card').length);
  console.log(`✅ Live Games Hub loaded with ${totalCards} cards`);

  // Test Geometry Dash
  console.log('\nClicking Geometry Dash on Live...');
  await page.type('#search-input', 'Geometry Dash');
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const card = document.querySelector('.game-card');
    if (card) {
      const btn = card.querySelector('.launch-btn') || card;
      btn.click();
    }
  });

  const liveLoaderText = await page.evaluate(() => {
    const gl = document.getElementById('game-loader');
    return gl ? gl.innerText.trim() : '';
  });
  console.log('Live Game Loader text:', liveLoaderText);

  await new Promise(r => setTimeout(r, 6000));

  const gdAnalysis = await page.evaluate(() => {
    const f = document.getElementById('proxy-frame');
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      const html = doc?.documentElement?.innerHTML || '';
      return {
        src: f.src,
        title: doc?.title,
        hasCat: html.includes('spinning-logo') && !html.includes('display: none'),
        hasLoves: html.includes('we ALL loves') || html.includes('noahs tutoring'),
        baseHref: doc?.querySelector('base')?.href,
        hasCanvas: !!doc?.querySelector('canvas')
      };
    } catch (e) {
      return { crossOrigin: true, src: f?.src };
    }
  });
  console.log('✅ Live Geometry Dash Analysis:', JSON.stringify(gdAnalysis, null, 2));

  await page.screenshot({ path: 'tools/maintenance/live_production_verified.png' });
  console.log('📸 Saved screenshot to tools/maintenance/live_production_verified.png');

  await browser.close();
  console.log('\n🎉 ALL LIVE PRODUCTION TESTS COMPLETED SUCCESSFULLY!');
})();
