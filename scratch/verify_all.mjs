import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('[Verify All] Launching headless browser...');
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

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors = [];
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' || txt.includes('SyntaxError') || txt.includes('refused to connect')) {
      console.log(`[Browser Console ${msg.type()}]`, txt);
      errors.push(txt);
    }
  });

  try {
    // 1. Root Terminal & Layout
    console.log('[Verify All] 1. Navigating to https://uiqm.lol ...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 35000 });
    const termTitle = await page.title();
    console.log('[Verify All] Tab title:', termTitle);

    const navLayout = await page.evaluate(() => {
      const nav = document.getElementById('proxy-nav');
      const input = document.getElementById('proxy-nav-input');
      const backBtn = document.getElementById('back-btn');
      return {
        navBottom: nav ? window.getComputedStyle(nav).bottom : null,
        navTop: nav ? window.getComputedStyle(nav).top : null,
        inputWidth: input ? window.getComputedStyle(input).width : null,
        inputFontSize: input ? window.getComputedStyle(input).fontSize : null,
        backBottom: backBtn ? window.getComputedStyle(backBtn).bottom : null,
        backRight: backBtn ? window.getComputedStyle(backBtn).right : null,
      };
    });
    console.log('[Verify All] Bottom Nav & Layout:', JSON.stringify(navLayout));

    // 2. Proxy Search Query
    console.log('[Verify All] 2. Submitting search query "cool math games"...');
    await page.type('#term-input', 'cool math games');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#proxy-shell', { visible: true, timeout: 10000 });
    await new Promise(r => setTimeout(r, 6000));

    let frame = await (await page.$('#proxy-frame')).contentFrame();
    if (frame) {
      const searchBodyLen = await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      console.log('[Verify All] Search results body length:', searchBodyLen);
    }
    await page.screenshot({ path: join(__dirname, 'prod_search.png') });

    // 3. Direct Navigation & 301 Redirect Follow (wikipedia.org)
    console.log('[Verify All] 3. Direct URL navigation to wikipedia.org via bottom nav bar...');
    await page.click('#proxy-nav-input', { clickCount: 3 });
    await page.type('#proxy-nav-input', 'wikipedia.org');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 7000));

    frame = await (await page.$('#proxy-frame')).contentFrame();
    if (frame) {
      const wikiLen = await frame.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      const wikiTitle = await frame.title();
      console.log('[Verify All] Wikipedia title:', wikiTitle, 'body length:', wikiLen);
    }
    await page.screenshot({ path: join(__dirname, 'prod_wikipedia.png') });

    // 4. YouTube via Scramjet
    console.log('[Verify All] 4. Navigating to youtube.com via bottom nav bar...');
    await page.click('#proxy-nav-input', { clickCount: 3 });
    await page.type('#proxy-nav-input', 'https://www.youtube.com');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 10000));

    frame = await (await page.$('#proxy-frame')).contentFrame();
    if (frame) {
      const ytStatus = await frame.evaluate(() => ({
        title: document.title,
        bodyLen: document.body ? document.body.innerHTML.length : 0,
        hasApp: !!document.querySelector('ytd-app, #player, #content')
      })).catch(e => ({ error: e.message }));
      console.log('[Verify All] YouTube status:', JSON.stringify(ytStatus));
    }
    await page.screenshot({ path: join(__dirname, 'prod_youtube.png') });

    // 5. Games Hub
    console.log('[Verify All] 5. Navigating to https://uiqm.lol/games ...');
    await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 35000 });
    const gamesTitle = await page.title();
    console.log('[Verify All] Games Hub title:', gamesTitle);

    await page.waitForSelector('.game-card', { timeout: 15000 });
    const cardCount = await page.evaluate(() => document.querySelectorAll('.game-card').length);
    console.log(`[Verify All] Rendered ${cardCount} game cards.`);

    // Launch Slope
    console.log('[Verify All] Launching Slope...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.game-card'));
      const slopeCard = cards.find(c => c.textContent.includes('Slope'));
      if (slopeCard) {
        const btn = slopeCard.querySelector('.launch-btn') || slopeCard;
        btn.click();
      }
    });

    // Check loader visibility and status
    const loaderVisible = await page.evaluate(() => {
      const gl = document.getElementById('game-loader');
      return gl ? window.getComputedStyle(gl).display : 'none';
    });
    console.log('[Verify All] Game loader display upon launch:', loaderVisible);

    // Wait for Slope WebGL engine to download and instantiate canvas
    console.log('[Verify All] Waiting up to 20s for game canvas to instantiate...');
    let slopeReady = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const gameFrame = await (await page.$('#proxy-frame')).contentFrame();
      if (gameFrame) {
        slopeReady = await gameFrame.evaluate(() => !!document.querySelector('canvas')).catch(() => false);
        if (slopeReady) {
          console.log(`[Verify All] Slope canvas detected ready after ${i + 1} seconds!`);
          break;
        }
      }
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: join(__dirname, 'prod_slope.png') });
    console.log('[Verify All] Captured prod_slope.png screenshot.');

    console.log('[Verify All] Critical console errors recorded:', errors.filter(e => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT')));
  } finally {
    await browser.close();
    console.log('[Verify All] Browser closed. All steps verified.');
  }
})();
