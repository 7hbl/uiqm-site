import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    browser.on('targetcreated', async target => {
        if (target.type() === 'service_worker') {
            const worker = await target.worker();
            console.log('[SW FOUND]', worker.url());
            worker.on('console', msg => console.log('[SW CONSOLE]', msg.type(), msg.text()));
            worker.on('error', err => console.error('[SW ERROR]', err));
        }
    });

    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
    page.on('requestfailed', req => console.error('[REQ FAILED]', req.url(), req.failure()?.errorText));
    page.on('response', res => {
        if (res.status() >= 400) console.log('[HTTP RESP]', res.status(), res.url());
    });

    console.log('Navigating to https://uiqm.lol ...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Typing https://duckduckgo.com ...');
    await page.type('#term-input', 'https://duckduckgo.com');
    await page.keyboard.press('Enter');
    
    await new Promise(r => setTimeout(r, 8000));

    await browser.close();
})();
