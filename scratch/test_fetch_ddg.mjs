import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    const hookWorker = async (target) => {
        if (target.type() === 'service_worker') {
            const worker = await target.worker();
            if (!worker) return;
            console.log('[ATTACHED TO SW]', worker.url());
            worker.on('console', msg => console.log('[SW LOG]', msg.type(), msg.text()));
            worker.on('error', err => console.error('[SW ERROR]', err));
        }
    };
    
    browser.on('targetcreated', hookWorker);

    console.log('Navigating to uiqm.lol...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
    
    for (const t of browser.targets()) {
        await hookWorker(t);
    }
    
    console.log('Checking controller...');
    await page.evaluate(async () => {
        if (!navigator.serviceWorker.controller) {
            await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
        }
    });
    
    console.log('Fetching DDG from page with 10s timeout...');
    const result = await page.evaluate(async () => {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort('Fetch timeout'), 10000);
        try {
            const r = await fetch('/worker/network/https%3A%2F%2Fduckduckgo.com', { signal: controller.signal });
            clearTimeout(tid);
            const text = await r.text();
            return { ok: r.ok, status: r.status, len: text.length };
        } catch(e) {
            return { error: e.message };
        }
    });
    
    console.log('Result:', result);
    await browser.close();
})();
