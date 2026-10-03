import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('[Console ' + msg.type() + ']', msg.text()));
  page.on('pageerror', err => console.log('[PageError]', err.message));
  page.on('requestfailed', req => console.log('[ReqFailed]', req.url(), req.failure()?.errorText));

  console.log('Navigating to https://uiqm.lol/games ...');
  await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Games page loaded.');

  const cardsCount = await page.evaluate(() => document.querySelectorAll('.game-card').length);
  console.log('Total game cards rendered:', cardsCount);

  // Search Geometry Dash
  await page.type('#search-input', 'Geometry Dash');
  await new Promise(r => setTimeout(r, 1000));

  const foundTitles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.game-card .card-title')).map(el => el.innerText);
  });
  console.log('Filtered game titles:', foundTitles);

  const firstCard = await page.$('.game-card');
  if (firstCard) {
    console.log('Clicking on Geometry Dash...');
    await firstCard.click();
    await new Promise(r => setTimeout(r, 8000));

    const overlayDisplay = await page.evaluate(() => document.getElementById('proxy-overlay')?.style.display);
    const frameSrc = await page.evaluate(() => document.getElementById('proxy-frame')?.src);
    console.log('Overlay display:', overlayDisplay);
    console.log('Frame src:', frameSrc);

    for (const f of page.frames()) {
      console.log('Subframe URL:', f.url());
      if (f.url().includes('440') || f.url().includes('417') || f.url().includes('dash')) {
        try {
          const bodyHTML = await f.evaluate(() => document.body?.innerHTML || '');
          const hasCat = bodyHTML.includes('spinning-logo') || bodyHTML.includes('data:image/png;base64');
          const hasLoves = bodyHTML.includes('loves noahs tutoring');
          console.log('In-frame check: hasCat =', hasCat, 'hasLoves =', hasLoves);
          console.log('In-frame HTML length:', bodyHTML.length);
        } catch(e) {
          console.log('Cannot inspect frame body:', e.message);
        }
      }
    }
  }

  await page.screenshot({ path: 'tools/maintenance/games_test.png' }).catch(() => {});
  console.log('Saved screenshot to tools/maintenance/games_test.png');
  await browser.close();
  console.log('Test completed.');
})();
