import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.game-card');

  console.log('Launching Slope...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.game-card'));
    const slope = cards.find(c => c.textContent.includes('Slope'));
    slope.querySelector('.launch-btn').click();
  });

  console.log('Waiting for Slope canvas to be rendered...');
  for (let s = 0; s < 45; s++) {
    await new Promise(r => setTimeout(r, 1000));
    const frameEl = await page.$('#proxy-frame');
    const gameFrame = frameEl ? await frameEl.contentFrame() : null;
    if (gameFrame) {
      const ready = await gameFrame.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? { width: c.width, height: c.height } : null;
      }).catch(() => null);
      if (ready) {
        console.log('Slope Canvas initialized!', ready, 'after', s + 1, 'seconds');
        await new Promise(r => setTimeout(r, 6000));
        await page.screenshot({ path: 'tools/diagnostics/screenshots/slope_gameplay_live.png' });
        console.log('Saved tools/diagnostics/screenshots/slope_gameplay_live.png');
        break;
      }
    }
  }
  await browser.close();
})();
