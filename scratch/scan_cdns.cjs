const fs = require('fs');
const content = fs.readFileSync('views/pages/hub.html', 'utf8');
const gamesMatch = content.match(/const games = (\[[\s\S]*?\]);/);
const games = eval(gamesMatch[1]);

async function checkGameUrls() {
    const domains = new Set();
    const samples = games.slice(0, 30);
    for (const g of samples) {
        if (!g.url) continue;
        try {
            const r = await fetch(g.url);
            const html = await r.text();
            const baseMatch = html.match(/<base\s+href=["']([^"']+)["']/i);
            if (baseMatch) {
                try {
                    const u = new URL(baseMatch[1]);
                    domains.add(u.hostname);
                } catch(_) {}
            }
            const scriptMatches = html.matchAll(/src=["'](https?:\/\/[^"']+)["']/gi);
            for (const sm of scriptMatches) {
                try {
                    const u = new URL(sm[1]);
                    domains.add(u.hostname);
                } catch(_) {}
            }
        } catch(_) {}
    }
    console.log('Detected base/script domains across games:', Array.from(domains));
}

checkGameUrls();
