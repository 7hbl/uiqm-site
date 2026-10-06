import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('[Verify] Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--ignore-certificate-errors',
      '--use-gl=angle',
      '--use-angle=swiftshader'
    ]
  });

  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    page.on('console', msg => {
      const txt = msg.text();
      if (msg.type() === 'error' || txt.includes('SyntaxError') || txt.includes('refused to connect')) {
        console.log(`[Browser Console ${msg.type()}]`, txt);
        errors.push(txt);
      }
    });

    console.log('[Verify] 1. Navigating to https://uiqm.lol ...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 35000 });

    const title = await page.title();
    console.log('[Verify] Tab title:', title);

    // Verify proxy-nav is positioned at bottom
    const navBottom = await page.evaluate(() => {
      const el = document.getElementById('proxy-nav');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return { bottom: style.bottom, top: style.top, rectBottom: rect.bottom, windowHeight: window.innerHeight };
    });
    console.log('[Verify] Proxy Nav Position:', JSON.stringify(navBottom));

    // Test Search Query
    console.log('[Verify] 2. Typing "math notes" into terminal...');
    await page.type('#term-input', 'math notes');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#proxy-shell', { visible: true, timeout: 10000 });
    await new Promise(r => setTimeout(r, 6000));

    let frame = await (await page.$('#proxy-frame')).contentFrame();
    if (frame) {
      const bodyLen = await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      console.log('[Verify] Search results body length:', bodyLen);
    }
    await page.screenshot({ path: join(__dirname, 'verified_search.png') });

    // Test Wikipedia (301 redirect following test)
    console.log('[Verify] 3. Testing navigation to wikipedia.org...');
    await page.click('#back-btn');
    await new Promise(r => setTimeout(r, 800));
    await page.type('#term-input', 'wikipedia.org');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 8000));

    frame = await (await page.$('#proxy-frame')).contentFrame();
    if (frame) {
      const wikiLen = await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      const wikiTitle = await frame.title();
      console.log('[Verify] Wikipedia title:', wikiTitle, 'body length:', wikiLen);
    }
    await page.screenshot({ path: join(__dirname, 'verified_wikipedia.png') });

    // Test Games Hub
    console.log('[Verify] 4. Navigating to https://uiqm.lol/games ...');
    await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 35000 });
    const gamesTitle = await page.title();
    console.log('[Verify] Games Hub title:', gamesTitle);

    await page.waitForSelector('.game-card', { timeout: 15000 });
    const cardCount = await page.evaluate(() => document.querySelectorAll('.game-card').length);
    console.log(`[Verify] Rendered ${cardCount} game cards.`);

    // Launch Slope
    console.log('[Verify] Launching Slope...');
    const slopeLaunched = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.game-card'));
      const slopeCard = cards.find(c => c.textContent.includes('Slope'));
      if (slopeCard) {
        const btn = slopeCard.querySelector('.launch-btn') || slopeCard;
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[Verify] Slope launch button clicked:', slopeLaunched);

    // Wait 12 seconds for game to load
    await new Promise(r => setTimeout(r, 12000));

    const gameFrame = await (await page.$('#proxy-frame')).contentFrame();
    let gameStatus = '';
    if (gameFrame) {
      gameStatus = await gameFrame.evaluate(() => ({
        url: location.href,
        title: document.title,
        hasCanvas: !!document.querySelector('canvas'),
        canvasWidth: document.querySelector('canvas')?.width,
        canvasHeight: document.querySelector('canvas')?.height,
        bodyLen: document.body ? document.body.innerHTML.length : 0
      })).catch(e => ({ error: e.message }));
    }
    console.log('[Verify] Game frame status:', JSON.stringify(gameStatus));

    await page.screenshot({ path: join(__dirname, 'verified_slope_game.png') });
    console.log('[Verify] Saved verified_slope_game.png');

    console.log('[Verify] Critical errors encountered:', errors);
  } finally {
    await browser.close();
  }
})();
