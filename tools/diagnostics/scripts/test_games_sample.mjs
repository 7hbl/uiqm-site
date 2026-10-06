import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const content = fs.readFileSync('views/pages/hub.html', 'utf8');
  const gamesMatch = content.match(/const games = (\[[\s\S]*?\]);/);
  const allGames = JSON.parse(gamesMatch[1]);

  console.log(`Loaded ${allGames.length} games. Testing sample...`);
  
  // Test a varied sample of 25 games
  const sampleIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 75, 100, 150, 200, 250, 300, 350, 400, 420, 426];
  const sample = sampleIndices.map(i => allGames[i]).filter(Boolean);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });

  const results = [];

  for (const g of sample) {
    const page = await browser.newPage();
    const proxyUrl = 'https://uiqm.lol/worker/network/' + encodeURIComponent(g.url);
    let error = null;
    let title = '';
    let hasCanvas = false;
    let bodyLen = 0;

    page.on('console', msg => {
      const t = msg.text();
      if (t.includes('refused to connect') || t.includes('net::ERR_')) {
        console.log(`[${g.title} Console Error]`, t);
      }
    });

    try {
      const response = await page.goto(proxyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response ? response.status() : 'NO_RES';
      await new Promise(r => setTimeout(r, 3000));
      title = await page.title();
      hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
      bodyLen = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      results.push({ title: g.title, url: g.url, status, pageTitle: title, hasCanvas, bodyLen });
      console.log(`[${g.title}] HTTP ${status} | Canvas: ${hasCanvas} | BodyLen: ${bodyLen} | PageTitle: '${title}'`);
    } catch(e) {
      console.log(`[${g.title}] ERROR:`, e.message);
      results.push({ title: g.title, url: g.url, error: e.message });
    }
    await page.close();
  }

  await browser.close();
  fs.mkdirSync('tools/diagnostics/results', { recursive: true });
  fs.writeFileSync('tools/diagnostics/results/games_sample_results.json', JSON.stringify(results, null, 2));
  console.log('Sample test completed.');
})();
