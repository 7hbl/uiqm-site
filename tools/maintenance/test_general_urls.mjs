import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing arbitrary URLs in Chrome Incognito...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('ERR_')) {
      console.log('[Console ' + msg.type() + ']', text);
    }
  });

  console.log('Navigating to https://uiqm.lol ...');
  await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#term-input', { timeout: 15000 });

  // Test 1: DuckDuckGo search query
  console.log('Testing DuckDuckGo search query: "minecraft" ...');
  await page.type('#term-input', 'minecraft');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 6000));

  const ddgFrameSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('DDG Frame src:', ddgFrameSrc);
  for (const f of page.frames()) {
    if (f.url().includes('duckduckgo')) {
      const ddgTitle = await f.evaluate(() => document.title);
      console.log('✅ DuckDuckGo Frame title:', ddgTitle);
    }
  }

  // Close proxy
  await page.evaluate(() => closeProxy());
  await new Promise(r => setTimeout(r, 1000));
  await page.waitForSelector('#term-input', { timeout: 5000 });

  // Test 2: Wikipedia URL
  console.log('Testing direct URL: "wikipedia.org" ...');
  await page.type('#term-input', 'wikipedia.org');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 6000));

  const wikiFrameSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
  console.log('Wikipedia Frame src:', wikiFrameSrc);
  for (const f of page.frames()) {
    if (f.url().includes('wikipedia')) {
      const wikiTitle = await f.evaluate(() => document.title);
      console.log('✅ Wikipedia Frame title:', wikiTitle);
    }
  }

  await page.screenshot({ path: 'tools/maintenance/general_urls_verified.png' });
  console.log('Saved screenshot to tools/maintenance/general_urls_verified.png');
  await browser.close();
  console.log('🎉 Arbitrary URL test completed successfully!');
})();
