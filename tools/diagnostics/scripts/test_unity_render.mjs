import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('Navigating to https://uiqm.lol/games ...');
    await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Clicking Geometry Dash card...');
    await page.evaluate(() => {
        const cards = document.querySelectorAll('.game-card');
        for (const card of cards) {
            if (card.innerText.includes('Geometry Dash')) {
                card.click();
                return;
            }
        }
        if (cards[0]) cards[0].click();
    });
    
    console.log('Waiting 18 seconds for Unity WebGL to render start screen...');
    await new Promise(r => setTimeout(r, 18000));
    
    await page.screenshot({ path: 'tools/diagnostics/screenshots/game_unity_loaded.png' });
    console.log('Saved tools/diagnostics/screenshots/game_unity_loaded.png');

    await browser.close();
})();
