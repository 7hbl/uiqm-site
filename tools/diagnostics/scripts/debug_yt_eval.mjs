import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Intercept scripts evaluated in the page
  page.on('response', async resp => {
    if (resp.url().includes('sync_mod_chunk')) {
      const text = await resp.text();
      console.log('Intercepted sync_mod_chunk from network: length =', text.length);
    }
  });

  await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#term-input');
  await page.type('#term-input', 'youtube');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 10000));

  const frame = page.frames().find(f => f.name() === 'proxy-frame');
  if (frame) {
    const errorDetails = await frame.evaluate(() => {
      // Find all script elements
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => ({
        id: s.id,
        src: s.src,
        snippet: s.textContent ? s.textContent.slice(0, 100) : null
      }));
    }).catch(e => ({ error: e.message }));
    console.log('Scripts in proxy frame:', JSON.stringify(errorDetails, null, 2));
  }

  await browser.close();
})();
