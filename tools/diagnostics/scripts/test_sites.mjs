import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('[Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PageError]', err.message));

  console.log('Visiting uiqm.lol...');
  await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });

  // Test 1: Search query "hello world"
  console.log('Testing search query "hello world"...');
  await page.type('#term-input', 'hello world');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 6000));

  let frame = await (await page.$('#proxy-frame')).contentFrame();
  if (frame) {
    console.log('Search frame URL:', frame.url());
    console.log('Search frame title:', await frame.title());
    console.log('Search frame body len:', await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0));
  }

  // Click RETURN TO TERMINAL
  await page.click('#back-btn');
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Direct site "wikipedia.org"
  console.log('Testing wikipedia.org...');
  await page.type('#term-input', 'wikipedia.org');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 8000));

  frame = await (await page.$('#proxy-frame')).contentFrame();
  if (frame) {
    console.log('Wiki frame URL:', frame.url());
    console.log('Wiki frame title:', await frame.title());
    console.log('Wiki frame body len:', await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0));
  }

  // Test 3: Direct site "bing.com"
  await page.click('#back-btn');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Testing bing.com...');
  await page.type('#term-input', 'bing.com');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 8000));

  frame = await (await page.$('#proxy-frame')).contentFrame();
  if (frame) {
    console.log('Bing frame URL:', frame.url());
    console.log('Bing frame title:', await frame.title());
    console.log('Bing frame body len:', await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0));
  }

  await browser.close();
})();
