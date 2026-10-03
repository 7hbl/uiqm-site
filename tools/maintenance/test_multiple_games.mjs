import puppeteer from 'puppeteer';

const gamesToTest = [
  { name: 'Geometry Dash', expectedTitlePart: 'Dash' },
  { name: 'Celeste Classic', expectedTitlePart: 'Celeste' },
  { name: 'Retro Bowl', expectedTitlePart: 'Retro' },
  { name: 'Slope', expectedTitlePart: 'Slope' },
  { name: 'Cookie Clicker', expectedTitlePart: 'Cookie' }
];

(async () => {
  console.log('Testing multiple games in Chrome Incognito mode...');
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
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('z-kit.net')) {
      errors.push(`[Dead Domain] Failed request to: ${url}`);
    }
  });

  console.log('Navigating to https://uiqm.lol/games ...');
  await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('.game-card', { timeout: 10000 });

  for (const game of gamesToTest) {
    console.log(`\n--- Testing ${game.name} ---`);
    const cardFound = await page.evaluate((targetName) => {
      const cards = Array.from(document.querySelectorAll('.game-card'));
      for (const c of cards) {
        const titleEl = c.querySelector('.card-title');
        if (titleEl && titleEl.textContent.trim().toLowerCase().includes(targetName.toLowerCase())) {
          c.scrollIntoView();
          const btn = c.querySelector('.launch-btn') || c;
          btn.click();
          return true;
        }
      }
      return false;
    }, game.name);

    if (!cardFound) {
      console.error(`❌ Card not found for ${game.name}`);
      continue;
    }

    // Check loader
    await new Promise(r => setTimeout(r, 600));
    const loaderInfo = await page.evaluate(() => {
      const gl = document.getElementById('game-loader');
      return {
        display: gl ? window.getComputedStyle(gl).display : 'none',
        text: gl ? gl.innerText.trim() : ''
      };
    });
    console.log(`Loader state for ${game.name}:`, JSON.stringify(loaderInfo));

    // Wait for frame to update
    await new Promise(r => setTimeout(r, 4000));
    const frameSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
    console.log(`Frame src for ${game.name}:`, frameSrc);

    // Inspect iframe content for unwanted cat / tutoring hub text
    const frameAnalysis = await page.evaluate(() => {
      const f = document.getElementById('proxy-frame');
      try {
        const doc = f.contentDocument || f.contentWindow.document;
        const html = doc.documentElement.innerHTML;
        return {
          hasCat: !!doc.getElementById('spinning-logo') || html.includes('we ALL loves'),
          hasLoves: html.includes('we ALL loves noahs tutoring hub') || html.includes('Noahs Tutoring Hub'),
          bodyLen: html.length
        };
      } catch (e) {
        return { crossOrigin: true, error: e.message };
      }
    });
    console.log(`Frame analysis for ${game.name}:`, JSON.stringify(frameAnalysis));

    // Close game
    await page.evaluate(() => {
      if (typeof closeGame === 'function') closeGame();
    });
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n--- Test Summary ---');
  console.log(`Total critical errors tracked: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors.slice(0, 10));
  }
  await browser.close();
  console.log('✅ Multi-game test finished.');
})();
