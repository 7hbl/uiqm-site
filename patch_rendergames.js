const fs = require('fs');
const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
let content = fs.readFileSync(hubPath, 'utf8');

// Fix renderGames to show dynamic count and add onerror fallback for images
const oldRender = `        const renderGames = (filter = '') => {
            grid.innerHTML = '';
            const filtered = games.filter(g => g.title.toLowerCase().includes(filter.toLowerCase()));
            filtered.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';
                card.innerHTML = \`
                    <img src="\${game.image}" class="card-img" alt="\${game.title}" loading="lazy">
                    <div class="card-content">
                        <div class="card-title">\${game.title}</div>
                        <div class="card-desc">\${game.desc}</div>
                        <button class="launch-btn" onclick="launchGame('\${game.url}')">Launch Game</button>
                    </div>
                \`;
                card.onclick = (e) => { if(!e.target.classList.contains('launch-btn')) launchGame(game.url); };
                grid.appendChild(card);
            });
        };`;

const newRender = `        const renderGames = (filter = '') => {
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

// Normalize and replace
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOld = oldRender.replace(/\r\n/g, '\n');
const normalizedNew = newRender.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOld)) {
    const fixed = normalizedContent.replace(normalizedOld, normalizedNew);
    fs.writeFileSync(hubPath, fixed);
    console.log('renderGames updated successfully!');
} else {
    // Try a simpler targeted approach - find the block by unique markers
    const startMarker = "const renderGames = (filter = '') => {";
    const endMarker = "        };\n\n        const launchGame";
    
    const startIdx = normalizedContent.indexOf(startMarker);
    const endIdx = normalizedContent.indexOf(endMarker, startIdx);
    
    if (startIdx === -1 || endIdx === -1) {
        console.error('Could not find renderGames block. Start:', startIdx, 'End:', endIdx);
        console.log('Surrounding content around 6081:', normalizedContent.substring(startIdx - 10, startIdx + 200));
    } else {
        // Replace the block
        const before = normalizedContent.substring(0, startIdx);
        const after = normalizedContent.substring(endIdx + "        };".length);
        const fixed = before + normalizedNew + '\n' + after;
        fs.writeFileSync(hubPath, fixed);
        console.log('renderGames patched via index method!');
    }
}
