import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('SyntaxError') || t.includes('TypeError') || msg.type() === 'error') {
      console.log('[CONSOLE ' + msg.type() + ']', t);
    }
  });
  
  page.on('response', async res => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && !url.includes('generate_204') && !url.includes('stats/playback')) {
      console.log(`[HTTP ${status}] ${url}`);
      try {
        const text = await res.text();
        console.log(`   Preview: "${text.slice(0, 100).replace(/\r?\n/g, ' ')}"`);
      } catch(_) {}
    }
  });

  console.log('Navigating to YouTube...');
  await page.goto('https://uiqm.lol/worker/network/https%3A%2F%2Fwww.youtube.com%2F', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Err:', e.message));

  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: 'scratch/yt_failed_details.png' });
  await browser.close();
})();
