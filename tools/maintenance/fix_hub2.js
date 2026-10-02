const fs = require('fs');
const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
let content = fs.readFileSync(hubPath, 'utf8').replace(/\r\n/g, '\n');

// FIX 1: Wrong SCRAMJET_PREFIX and SW registration path
// Old: '/worker/network/' and '/worker/working.sw.js'
// New: '/scram/network/' and '/scram/working.sw.js'
content = content.replace(
    "const SCRAMJET_PREFIX = '/worker/network/', WISP_URL",
    "const SCRAMJET_PREFIX = '/scram/network/', WISP_URL"
);
content = content.replace(
    "const WORKER_ROOT = '/worker/';",
    "const WORKER_ROOT = '/scram/';"
);
content = content.replace(
    "await navigator.serviceWorker.register('/worker/working.sw.js', {\n                        scope: '/worker/'",
    "await navigator.serviceWorker.register('/scram/working.sw.js', {\n                        scope: '/scram/'"
);
content = content.replace(
    "script.src = '/worker/working.all.js';",
    "script.src = '/scram/working.all.js';"
);

// FIX 2: Remove nested template literal onerror (causes SyntaxError in Scramjet rewriter)
// Replace the complex card.innerHTML with a simpler version using data- attributes and no template nesting
const badRender = `        const renderGames = (filter = '') => {
            grid.innerHTML = '';
            const filtered = games.filter(g => g.title && g.title.toLowerCase().includes(filter.toLowerCase()));
            if (filter) {
                search.placeholder = \`\${filtered.length} of \${games.length} games...\`;
            } else {
                search.placeholder = \`Search \${games.length} games...\`;
            }
            filtered.forEach(game => {
                if (!game.title || !game.url) return;
                const card = document.createElement('div');
                card.className = 'game-card';
                const fallbackImg = \`https://placehold.co/320x180/0d1117/00ff88?text=\${encodeURIComponent(game.title.substring(0,16))}\`;
                card.innerHTML = \`
                    <img src="\${game.image || fallbackImg}" class="card-img" alt="\${game.title}" loading="lazy" onerror="this.onerror=null;this.src='\${fallbackImg}'">
                    <div class="card-content">
                        <div class="card-title">\${game.title}</div>
                        <div class="card-desc">\${game.desc || ''}</div>
                        <button class="launch-btn" onclick="launchGame('\${game.url}')">Launch Game</button>
                    </div>
                \`;
                card.onclick = (e) => { if(!e.target.classList.contains('launch-btn')) launchGame(game.url); };
                grid.appendChild(card);
            });
        };`;

const goodRender = `        const renderGames = (filter = '') => {
            grid.innerHTML = '';
            const q = (filter || '').toLowerCase();
            const filtered = games.filter(g => g.title && g.title.toLowerCase().includes(q));
            search.placeholder = filter
                ? (filtered.length + ' of ' + games.length + ' games...')
                : ('Search ' + games.length + ' games...');
            filtered.forEach(game => {
                if (!game.title || !game.url) return;
                const card = document.createElement('div');
                card.className = 'game-card';
                const img = document.createElement('img');
                img.className = 'card-img';
                img.alt = game.title;
                img.loading = 'lazy';
                img.src = game.image || '';
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'https://placehold.co/320x180/0d1117/00ff88?text=' + encodeURIComponent((game.title||'Game').substring(0,16));
                };
                const content = document.createElement('div');
                content.className = 'card-content';
                const titleEl = document.createElement('div');
                titleEl.className = 'card-title';
                titleEl.textContent = game.title;
                const descEl = document.createElement('div');
                descEl.className = 'card-desc';
                descEl.textContent = game.desc || '';
                const btn = document.createElement('button');
                btn.className = 'launch-btn';
                btn.textContent = 'Launch Game';
                btn.onclick = function(e) { e.stopPropagation(); launchGame(game.url); };
                content.appendChild(titleEl);
                content.appendChild(descEl);
                content.appendChild(btn);
                card.appendChild(img);
                card.appendChild(content);
                card.onclick = (e) => { if (e.target !== btn) launchGame(game.url); };
                grid.appendChild(card);
            });
        };`;

if (content.includes(badRender.substring(0, 60))) {
    content = content.replace(badRender, goodRender);
    console.log('renderGames replaced OK');
} else {
    // Try finding by unique segment
    const startMark = "        const renderGames = (filter = '') => {";
    const endMark = "        };\n\n        const launchGame";
    const si = content.indexOf(startMark);
    const ei = content.indexOf(endMark, si);
    if (si !== -1 && ei !== -1) {
        content = content.substring(0, si) + goodRender + '\n' + content.substring(ei + "        };".length);
        console.log('renderGames replaced via index OK');
    } else {
        console.error('Could not find renderGames to replace! si='+si+' ei='+ei);
    }
}

fs.writeFileSync(hubPath, content);
console.log('hub.html patched successfully');
