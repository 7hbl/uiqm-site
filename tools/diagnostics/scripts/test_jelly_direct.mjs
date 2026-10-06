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
    
    console.log('Calling window.launchGame for Jelly Drift (153.html)...');
    await page.evaluate(() => {
        window.launchGame('https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/153.html');
    });
    
    console.log('Waiting 15 seconds...');
    await new Promise(r => setTimeout(r, 15000));
    
    await page.screenshot({ path: 'tools/diagnostics/screenshots/jelly_direct_launch.png' });
    console.log('Saved tools/diagnostics/screenshots/jelly_direct_launch.png');

    await browser.close();
})();
