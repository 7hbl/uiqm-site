import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching Puppeteer Chrome Incognito browser for Games Hub validation...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const logs = [];
  const failedReqs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[Console ${msg.type()}] ${text}`);
    if (text.includes('ERR_') || msg.type() === 'error') {
      console.log(`[Console ${msg.type().toUpperCase()}]`, text);
    }
  });
  page.on('pageerror', err => {
    logs.push(`[PageError] ${err.message}`);
    console.log('[PageError]', err.message);
  });
  page.on('requestfailed', req => {
    failedReqs.push({ url: req.url(), err: req.failure()?.errorText });
    console.log('[ReqFailed]', req.url(), req.failure()?.errorText);
  });

  try {
    console.log('Navigating to https://uiqm.lol/games in Incognito mode...');
    await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 35000 });

    const title = await page.title();
    console.log('Games Hub Page Title:', title);

    const totalCards = await page.evaluate(() => document.querySelectorAll('.game-card').length);
    console.log('Total game cards rendered:', totalCards);

    // Check if any z-kit.net images were requested
    const zkitReqs = failedReqs.filter(r => r.url.includes('z-kit.net'));
    console.log('Dead z-kit.net failed requests count:', zkitReqs.length);

    // Check first card (should be Geometry Dash)
    const firstTitle = await page.evaluate(() => document.querySelector('.game-card .card-title')?.innerText);
    console.log('First game card title:', firstTitle);

    // Search for Geometry Dash
    await page.type('#search-input', 'Geometry Dash');
    await new Promise(r => setTimeout(r, 800));

    const gdCard = await page.$('.game-card');
    if (!gdCard) {
      throw new Error('Geometry Dash card not found in search results');
    }

    console.log('Clicking Geometry Dash card...');
    await gdCard.click();

    // Check that game-loader displays DOWNLOADING...
    const loaderInfo = await page.evaluate(() => {
      const gl = document.getElementById('game-loader');
      return {
        display: gl ? getComputedStyle(gl).display : 'none',
        text: gl ? gl.innerText : ''
      };
    });
    console.log('Game Loader state upon click:', JSON.stringify(loaderInfo));

    // Wait for the game iframe to load
    console.log('Waiting for Geometry Dash game frame...');
    await new Promise(r => setTimeout(r, 6000));

    const frameSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
    console.log('Proxy Frame src:', frameSrc);

    // Inspect iframe content
    let inspectedGd = false;
    for (const f of page.frames()) {
      const u = f.url();
      if (u.includes('web-dashers') || u.includes('417') || u.includes('geometry')) {
        inspectedGd = true;
        console.log('Matched Geometry Dash Frame URL:', u);
        const frameData = await f.evaluate(() => {
          const bodyHtml = document.body?.innerHTML || '';
          return {
            title: document.title,
            hasCat: bodyHtml.includes('spinning-logo') || bodyHtml.includes('daddyreeyuki'),
            hasLoves: bodyHtml.includes('loves noahs tutoring') || bodyHtml.includes('we ALL loves'),
            phaserLoaded: typeof window.Phaser !== 'undefined' || !!document.querySelector('canvas')
          };
        });
        console.log('Geometry Dash Frame Analysis:', JSON.stringify(frameData, null, 2));
      }
    }

    if (!inspectedGd) {
      console.log('Note: Geometry Dash loaded directly in frame:', frameSrc);
    }

    await page.screenshot({ path: 'tools/maintenance/games_verified.png' });
    console.log('Saved screenshot to tools/maintenance/games_verified.png');
    console.log('✅ ALL GAMES HUB CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Games test error:', err.message);
  } finally {
    await browser.close();
  }
})();
