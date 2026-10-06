import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
    page.on('requestfailed', req => {
        console.error('[REQUEST FAILED]', req.url(), req.failure()?.errorText);
    });
    page.on('response', res => {
        if (res.status() >= 400) {
            console.error('[HTTP ERROR]', res.status(), res.url());
        }
    });

    console.log('Navigating to https://uiqm.lol/games ...');
    await page.goto('https://uiqm.lol/games', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Searching for Jelly Drift...');
    await page.type('#search-input', 'Jelly Drift');
    await new Promise(r => setTimeout(r, 500));
    
    console.log('Clicking Jelly Drift...');
    await page.evaluate(() => {
        const cards = document.querySelectorAll('.game-card');
        for (const c of cards) {
            if (c.innerText.includes('Jelly Drift')) {
                c.click();
                return;
            }
        }
    });
    
    console.log('Waiting 20 seconds for Jelly Drift...');
    await new Promise(r => setTimeout(r, 20000));
    
    await page.screenshot({ path: 'tools/diagnostics/screenshots/jelly_drift_loaded.png' });
    console.log('Saved tools/diagnostics/screenshots/jelly_drift_loaded.png');

    await browser.close();
})();
