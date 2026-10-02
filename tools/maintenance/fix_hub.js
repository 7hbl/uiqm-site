const fs = require('fs');

async function fixHub() {
    const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
    let content = fs.readFileSync(hubPath, 'utf8');
    
    // Find the end of the games array and the start of the broken script
    const lastGameStr = '"secret": true';
    const splitIndex = content.lastIndexOf(lastGameStr);
    if (splitIndex === -1) {
        console.error("Could not find last game entry");
        return;
    }
    
    // Find the closing brace of the last game
    const closingBraceIndex = content.indexOf('}', splitIndex);
    
    // The fixed script content
    const fixedScript = `
          }
        ];

        let sjEncode = null;
        const grid = document.getElementById('games-grid');
        const search = document.getElementById('search-input');
        const overlay = document.getElementById('proxy-overlay');
        const frame = document.getElementById('proxy-frame');

        const BARE_MUX_WORKER = '/gmt/worker.js', TRANSPORT_MJS = '/unix/index.mjs';
        const SCRAMJET_PREFIX = '/scram/network/', WISP_URL = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/cron/';

        const initProxy = async () => {
            try {
                if ('serviceWorker' in navigator) {
                    await navigator.serviceWorker.register('/scram/scramjet.sw.js', {
                        scope: '/scram/'
                    });
                    
                    const script = document.createElement('script');
                    script.src = '/scram/scramjet.all.js';
                    document.head.appendChild(script);
                    script.onload = () => {
                        console.log('Scramjet v2 Engine Loaded');
                        sjEncode = url => SCRAMJET_PREFIX + encodeURIComponent(url);
                    };
                }
                document.getElementById('loading-screen').style.display = 'none';
            } catch (e) {
                console.error(e);
                document.getElementById('loading-screen').innerText = 'ERROR: RELOADING...';
                setTimeout(() => location.reload(), 2000);
            }
        };

        const renderGames = (filter = '') => {
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
        };

        const launchGame = (url) => {
            overlay.style.display = 'block';
            frame.src = sjEncode ? sjEncode(url) : (SCRAMJET_PREFIX + encodeURIComponent(url));
        };

        const closeGame = () => {
            overlay.style.display = 'none';
            frame.src = 'about:blank';
        };

        const toggleFullscreen = () => {
            if (!document.fullscreenElement) overlay.requestFullscreen();
            else document.exitFullscreen();
        };

        const openSettings = () => document.getElementById('settings-modal').style.display = 'block';
        const closeSettings = () => document.getElementById('settings-modal').style.display = 'none';

        // Theme logic
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.onclick = () => {
                const color = swatch.dataset.color;
                const canvas = document.getElementById('matrix-canvas');
                if (color === 'hacker') {
                    document.body.setAttribute('data-theme', 'hacker');
                    canvas.style.opacity = '0.3';
                } else {
                    document.body.removeAttribute('data-theme');
                    document.documentElement.style.setProperty('--glow', color);
                    canvas.style.opacity = '0';
                }
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                localStorage.setItem('hub-color', color);
            };
        });

        const savedColor = localStorage.getItem('hub-color');
        if (savedColor) {
            document.documentElement.style.setProperty('--glow', savedColor);
            document.querySelectorAll('.color-swatch').forEach(s => {
                if(s.dataset.color === savedColor) {
                    document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
                    s.classList.add('active');
                }
            });
        }

        const restoreCloak = () => {
            const savedTitle = sessionStorage.getItem('term-cloak-title');
            const savedIcon = sessionStorage.getItem('term-cloak-icon');
            if (savedTitle) {
                document.title = savedTitle;
            }
            if (savedIcon) {
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = savedIcon;
            }
        };

        restoreCloak();

        search.oninput = () => renderGames(search.value);

        // Live users
        const updateUsers = () => {
            const count = Math.floor(Math.random() * (3 - 1) + 1);
            document.getElementById('user-count').innerText = count;
        };
        updateUsers(); setInterval(updateUsers, 10000);

        renderGames();
        initProxy();
    </script>
</body>
</html>`;

    // Find where the old script started to go wrong
    const scriptStartIndex = closingBraceIndex + 1;
    const newContent = content.substring(0, scriptStartIndex) + fixedScript;
    
    fs.writeFileSync(hubPath, newContent);
    console.log("Fixed hub.html script.");
}

fixHub();
