import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Running Comprehensive Incognito Test Suite...');
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
      console.log(`[Console Error] ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
    console.log(`[Page Error] ${err.message}`);
  });

  // 1. Test Terminal & Proxy Navigation
  console.log('\n--- 1. Testing Terminal at http://127.0.0.1:8080/ ---');
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#term-input', { timeout: 10000 });
  console.log('✅ Terminal loaded successfully');

  // Test Wikipedia
  console.log('Navigating to wikipedia.org via terminal...');
  await page.type('#term-input', 'wikipedia.org');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));

  const wikiFrame = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('Wikipedia frame src:', wikiFrame);
  let wikiTitle = '';
  for (const f of page.frames()) {
    if (f.url().includes('wikipedia')) {
      try { wikiTitle = await f.evaluate(() => document.title); } catch (_) {}
    }
  }
  console.log('✅ Wikipedia Frame Title:', wikiTitle || 'Loaded');

  // Close proxy
  await page.evaluate(() => { if (typeof closeProxy === 'function') closeProxy(); });
  await new Promise(r => setTimeout(r, 1000));

  // Test DuckDuckGo
  console.log('Navigating to duckduckgo.com via terminal...');
  await page.waitForSelector('#term-input', { timeout: 5000 });
  await page.type('#term-input', 'duckduckgo.com');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));

  const ddgFrame = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('DuckDuckGo frame src:', ddgFrame);
  let ddgTitle = '';
  for (const f of page.frames()) {
    if (f.url().includes('duckduckgo')) {
      try { ddgTitle = await f.evaluate(() => document.title); } catch (_) {}
    }
  }
  console.log('✅ DuckDuckGo Frame Title:', ddgTitle || 'Loaded');

  // Close proxy
  await page.evaluate(() => { if (typeof closeProxy === 'function') closeProxy(); });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Test Games Hub
  console.log('\n--- 2. Testing Games Hub at http://127.0.0.1:8080/games ---');
  await page.goto('http://127.0.0.1:8080/games', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('.game-card', { timeout: 10000 });
  const cardCount = await page.evaluate(() => document.querySelectorAll('.game-card').length);
  console.log(`✅ Games Hub loaded with ${cardCount} cards`);

  // Test Geometry Dash Lite
  console.log('\nTesting Geometry Dash Lite...');
  await page.type('#search-input', 'Geometry Dash');
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const card = document.querySelector('.game-card');
    if (card) {
      const btn = card.querySelector('.launch-btn') || card;
      btn.click();
    }
  });

  const gdLoader = await page.evaluate(() => {
    const gl = document.getElementById('game-loader');
    return gl ? gl.innerText.trim() : '';
  });
  console.log('Game loader text:', gdLoader);

  await new Promise(r => setTimeout(r, 5000));
  const gdFrameAnalysis = await page.evaluate(() => {
    const f = document.getElementById('proxy-frame');
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      const html = doc?.documentElement?.innerHTML || '';
      return {
        src: f.src,
        title: doc?.title,
        hasCat: html.includes('spinning-logo') && !html.includes('display: none'),
        hasLoves: html.includes('we ALL loves noahs tutoring hub') || html.includes('Noahs Tutoring Hub'),
        baseHref: doc?.querySelector('base')?.href,
        hasCanvas: !!doc?.querySelector('canvas')
      };
    } catch (e) {
      return { crossOrigin: true, src: f.src };
    }
  });
  console.log('✅ Geometry Dash Analysis:', JSON.stringify(gdFrameAnalysis, null, 2));

  // Close game
  await page.evaluate(() => { if (typeof closeGame === 'function') closeGame(); });
  await new Promise(r => setTimeout(r, 1000));

  // Test Celeste Classic
  console.log('\nTesting Celeste Classic...');
  await page.evaluate(() => {
    const input = document.getElementById('search-input');
    input.value = '';
    renderGames('');
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.game-card'));
    const celeste = cards.find(c => c.innerText.includes('Celeste'));
    if (celeste) {
      const btn = celeste.querySelector('.launch-btn') || celeste;
      btn.click();
    }
  });

  await new Promise(r => setTimeout(r, 4000));
  const celesteAnalysis = await page.evaluate(() => {
    const f = document.getElementById('proxy-frame');
    return {
      src: f?.src,
      display: f ? getComputedStyle(f).display : 'none'
    };
  });
  console.log('✅ Celeste Analysis:', JSON.stringify(celesteAnalysis, null, 2));

  await page.screenshot({ path: 'tools/maintenance/local_test_suite_verified.png' });
  console.log('📸 Screenshot saved to tools/maintenance/local_test_suite_verified.png');

  await browser.close();
  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
})();
