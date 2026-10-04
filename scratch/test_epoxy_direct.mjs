import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('[PAGE LOG]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERR]', err.message));

    console.log('Navigating to uiqm.lol...');
    await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
    
    const epoxyResult = await page.evaluate(async () => {
        try {
            // Load epoxy script in page to test directly
            await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = '/epoch/index.js';
                s.onload = res;
                s.onerror = rej;
                document.head.appendChild(s);
            });
            
            const EpoxyTransport = window.EpoxyTransport || (window.EpxMod && window.EpxMod.default);
            if (!EpoxyTransport) return { error: 'No EpoxyTransport found on window or EpxMod' };
            
            const WISP_URL = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/cron/';
            const t = new EpoxyTransport({ wisp: WISP_URL });
            await t.init();
            
            console.log('Epoxy initialized! Sending request to https://duckduckgo.com ...');
            const res = await t.request(new URL('https://duckduckgo.com'), 'GET', null, {});
            
            return {
                status: res.status,
                statusText: res.statusText,
                headersType: typeof res.headers,
                isArray: Array.isArray(res.headers),
                headers: res.headers,
                hasBody: !!res.body
            };
        } catch(e) {
            return { error: e.message, stack: e.stack };
        }
    });

    console.log('Epoxy direct test result:', epoxyResult);
    await browser.close();
})();
