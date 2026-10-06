import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('load.php') || url.includes('.js') || url.includes('.css')) {
      const ct = res.headers()['content-type'] || 'no-ct';
      const status = res.status();
      let textStart = '';
      try {
        const text = await res.text();
        textStart = text.slice(0, 80).replace(/\r?\n/g, ' ');
      } catch(e) {
        textStart = '<err reading text: ' + e.message + '>';
      }
      console.log(`[RES ${status}] [${ct}] ${url.slice(0, 90)}... | Preview: "${textStart}"`);
    }
  });

  console.log('Navigating to Wikipedia via Scramjet on https://uiqm.lol ...');
  await page.goto('https://uiqm.lol/worker/network/' + encodeURIComponent('https://en.wikipedia.org/wiki/Main_Page'), { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Err:', e.message));

  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'scratch/debug_wikipedia.png' });
  console.log('Saved scratch/debug_wikipedia.png');
  await browser.close();
})();
