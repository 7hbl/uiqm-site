import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
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
    
    // Click Geometry Dash
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
    
    console.log('Waiting 10 seconds for iframe activity...');
    await new Promise(r => setTimeout(r, 10000));
    
    for (const f of page.frames()) {
        console.log('Frame URL:', f.url());
        try {
            const html = await f.evaluate(() => document.documentElement.outerHTML);
            console.log('Frame HTML snippet:', html.slice(0, 500));
            const errors = await f.evaluate(() => window._gameErrors || []);
            console.log('Frame errors:', errors);
            const canvas = await f.evaluate(() => {
                const c = document.querySelector('canvas');
                return c ? { width: c.width, height: c.height, style: c.getAttribute('style') } : null;
            });
            console.log('Canvas info:', canvas);
        } catch(e) {
            console.log('Frame evaluate error:', e.message);
        }
    }

    await browser.close();
})();
