import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });

  const gamesToTest = [
    { name: 'Geometry Dash', url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/46.html' },
    { name: 'Retro Bowl', url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/191.html' },
    { name: 'Cookie Clicker', url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/428.html' },
    { name: 'Slope', url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/182.html' }
  ];

  for (const g of gamesToTest) {
    const page = await browser.newPage();
    const proxyUrl = 'https://uiqm.lol/worker/network/' + encodeURIComponent(g.url);
    console.log('Testing', g.name);
    try {
      await page.goto(proxyUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 5000));
      const title = await page.title();
      const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
      const bodyLen = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      console.log(`[${g.name}] Title: '${title}', Canvas: ${hasCanvas}, BodyLen: ${bodyLen}`);
    } catch(e) {
      console.log(`[${g.name}] ERROR:`, e.message);
    }
    await page.close();
  }
  await browser.close();
})();
