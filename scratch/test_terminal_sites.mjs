import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const sites = [
        'https://duckduckgo.com',
        'https://www.google.com',
        'https://en.wikipedia.org',
        'https://www.youtube.com'
    ];

    for (const site of sites) {
        console.log(`\n=== Testing site: ${site} ===`);
        await page.goto('https://uiqm.lol', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#term-input', { timeout: 10000 });
        
        await page.type('#term-input', site);
        await page.keyboard.press('Enter');
        
        console.log('Waiting 10s for site to load in iframe...');
        await new Promise(r => setTimeout(r, 10000));
        
        const frame = await page.$('#proxy-frame');
        const frameSrc = frame ? await page.evaluate(el => el.src, frame) : 'no frame';
        const loadingDisplay = await page.evaluate(() => document.getElementById('proxy-loading')?.style.display);
        
        let frameInfo = {};
        for (const f of page.frames()) {
            if (f !== page.mainFrame()) {
                try {
                    const title = await f.title();
                    const bodyText = await f.evaluate(() => document.body ? document.body.innerText.slice(0, 100) : 'no body');
                    const htmlLen = await f.evaluate(() => document.documentElement.outerHTML.length);
                    frameInfo = { url: f.url(), title, bodyText, htmlLen };
                } catch(e) {
                    frameInfo = { error: e.message };
                }
            }
        }
        
        const slug = site.replace(/[^a-z0-9]/gi, '_');
        await page.screenshot({ path: `tools/maintenance/site_${slug}.png` });
        console.log({ site, frameSrc, loadingDisplay, frameInfo });
    }

    await browser.close();
})();
