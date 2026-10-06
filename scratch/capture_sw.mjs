import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Connect to Service Worker target
  const swTarget = await new Promise(resolve => {
    browser.on('targetcreated', async target => {
      if (target.type() === 'service_worker') {
        resolve(target);
      }
    });
    page.goto('https://uiqm.lol', { waitUntil: 'networkidle2' });
  });

  const swSession = await swTarget.createCDPSession();
  await swSession.send('Runtime.enable');
  swSession.on('Runtime.consoleAPICalled', evt => {
    console.log('[SW CONSOLE]', evt.type, evt.args.map(a => a.value || a.description).join(' '));
  });
  swSession.on('Runtime.exceptionThrown', evt => {
    console.log('[SW EXCEPTION]', evt.exceptionDetails.text, evt.exceptionDetails.exception?.description);
  });

  console.log('SW session attached, typing youtube...');
  await page.waitForSelector('#term-input');
  await page.type('#term-input', 'youtube');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 12000));
  await browser.close();
})();
