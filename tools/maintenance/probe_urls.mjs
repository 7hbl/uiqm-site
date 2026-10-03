import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('Navigating to Wikipedia via Scramjet on https://uiqm.lol ...');
  await page.goto('https://uiqm.lol/worker/network/' + encodeURIComponent('https://en.wikipedia.org'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const title = await page.title();
  console.log('Page Title:', title);

  console.log('\nNavigating to DuckDuckGo via Scramjet on https://uiqm.lol ...');
  await page.goto('https://uiqm.lol/worker/network/' + encodeURIComponent('https://duckduckgo.com'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  console.log('DDG Title:', await page.title());

  await browser.close();
})();
