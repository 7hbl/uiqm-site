import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
    
    console.log('Navigating to https://uiqm.lol ...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
    
    console.log('Waiting for navigator.serviceWorker.controller...');
    await page.evaluate(async () => {
        if (!navigator.serviceWorker.controller) {
            await new Promise(resolve => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
                setTimeout(resolve, 3000);
            });
        }
        return !!navigator.serviceWorker.controller;
    });
    
    const isControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    console.log('Is controlled by SW?:', isControlled);
    
    console.log('Typing https://duckduckgo.com into terminal...');
    await page.type('#term-input', 'https://duckduckgo.com');
    await page.keyboard.press('Enter');
    
    console.log('Waiting 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    
    for (const f of page.frames()) {
        if (f !== page.mainFrame()) {
            console.log('Frame URL:', f.url());
            const title = await f.title().catch(() => '');
            const bodyLen = await f.evaluate(() => document.body ? document.body.innerHTML.length : 0).catch(() => -1);
            console.log({ title, bodyLen });
        }
    }
    
    await page.screenshot({ path: 'tools/maintenance/ddg_controlled.png' });
    console.log('Saved tools/maintenance/ddg_controlled.png');
    
    await browser.close();
})();
