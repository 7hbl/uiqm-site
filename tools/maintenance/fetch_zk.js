const fs = require('fs');
async function fetchZK() {
    try {
        const r = await fetch('https://z-kit.net/abc', {headers: {'User-Agent': 'Mozilla/5.0'}});
        const html = await r.text();
        const scripts = [...html.matchAll(/src="(\/assets\/static\/[^"]+)"/g)].map(m=>m[1]);
        for(const s of scripts) {
            if(s.endsWith('.js')) {
                const jsR = await fetch('https://z-kit.net' + s, {headers: {'User-Agent': 'Mozilla/5.0'}});
                const js = await jsR.text();
                if(js.includes('Antonblast')) {
                    console.log('Found games in ' + s);
                    fs.writeFileSync('zk_games_script.js', js);
                    return;
                }
            }
        }
    } catch(e) {
        console.error(e);
    }
}
fetchZK();
