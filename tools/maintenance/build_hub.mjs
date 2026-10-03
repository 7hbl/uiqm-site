import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Fetching base games.js from repository...');
  const res = await fetch('https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games.js');
  const noahGamesJs = await res.text();
  const rawList = eval(noahGamesJs.replace('const games =', ''));
  console.log('Fetched raw games:', rawList.length);

  // Clean raw games: remove 440.html (Who's Your Daddy with cat loader)
  const cleaned = rawList.filter(g => g.url && !g.url.includes('440.html'));

  // Define top priority games with verified working URLs & local webp images
  const featuredGames = [
    {
      title: 'Geometry Dash',
      desc: 'Jump, fly, and flip your way through dangerous obstacles and rhythm-based action in the ultimate HTML5 Geometry Dash.',
      url: 'https://cdn.jsdelivr.net/gh/web-dashers/web-dashers.github.io@latest/index.html',
      image: '/assets/img/h5g/geometrydash.webp'
    },
    {
      title: 'Celeste Classic',
      desc: 'The original, acclaimed PICO-8 platformer classic playable directly in your browser.',
      url: 'https://celesteclassic.github.io/',
      image: '/assets/img/h5g/celeste.webp'
    },
    {
      title: 'Retro Bowl',
      desc: 'The smash-hit retro American football game. Manage your team, call the plays, and lead your squad to victory.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/191.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/191.jpg'
    },
    {
      title: 'Slope',
      desc: 'Drive a ball down a 3D futuristic race track full of obstacles, ramps, and incredible speed.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/182.html',
      image: '/assets/img/h5g/slope.webp'
    },
    {
      title: 'Subway Surfers',
      desc: 'Dash as fast as you can through subway tracks, dodging oncoming trains and obstacles.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/200.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/200.jpg'
    },
    {
      title: 'Super Mario 64',
      desc: 'Play the iconic 3D Nintendo 64 platforming masterpiece right inside your browser.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/222.html',
      image: '/assets/img/h5g/sm64.webp'
    },
    {
      title: 'Cookie Clicker',
      desc: 'Bake billions of delicious cookies, buy grandmas and factories, and trigger golden cookie frenzy.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/428.html',
      image: '/assets/img/h5g/cookie.webp'
    },
    {
      title: 'Run 3',
      desc: 'Guide your alien through space tunnels in the galaxy with gravity-defying physics.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/235.html',
      image: '/assets/img/h5g/r3.webp'
    },
    {
      title: '2048',
      desc: 'Slide matching numbered tiles across the grid to combine them and reach the 2048 tile.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/48.html',
      image: '/assets/img/h5g/2048.webp'
    },
    {
      title: 'Flappy Bird',
      desc: 'Flap your wings and navigate between green pipes in this legendary addictive arcade game.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/42.html',
      image: '/assets/img/h5g/flappybird.webp'
    },
    {
      title: 'Fireboy and Watergirl',
      desc: 'Work cooperatively to solve temple puzzles and reach the exit using elemental powers.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/1.html',
      image: '/assets/img/h5g/firewater.webp'
    },
    {
      title: 'Duck Life',
      desc: 'Train your duck in running, swimming, flying, and climbing to become the champion racer.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/62.html',
      image: '/assets/img/h5g/ducklife.webp'
    },
    {
      title: 'Eggy Car',
      desc: 'Drive a car carrying an egg over hills and bumpy roads without letting it drop.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/415.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/415.jpg'
    },
    {
      title: 'Basketball Stars',
      desc: 'Show off your dribbling and shooting skills in 1v1 fast-paced street basketball matchups.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/137.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/137.jpg'
    },
    {
      title: 'PEAK',
      desc: 'A physics-based climbing game where you scale a procedurally generated mountain with realistic movement.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/471.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/471.jpg'
    },
    {
      title: 'Trombone Champ',
      desc: 'A rhythm game where you play the trombone by sliding your mouse to match musical notes.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/472.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/472.jpg'
    },
    {
      title: 'Clustertruck',
      desc: 'A fast-paced parkour game where you jump between moving trucks in chaotic highway levels.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/473.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/473.jpg'
    },
    {
      title: 'Going Balls',
      desc: 'Roll through tricky tracks, overcome unexpected obstacles, and balance your rolling ball.',
      url: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/424.html',
      image: 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/424.jpg'
    }
  ];

  const featuredTitles = new Set(featuredGames.map(g => g.title.toLowerCase()));
  const remaining = cleaned.filter(g => !featuredTitles.has((g.title || '').toLowerCase()));

  const localWebpMap = {
    'dino': '/assets/img/h5g/dino.webp',
    'minecraft 1.12.1': '/assets/img/h5g/mc.webp',
    'retro bowl college': 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/399.jpg'
  };

  remaining.forEach(g => {
    const key = (g.title || '').trim().toLowerCase();
    if (localWebpMap[key]) {
      g.image = localWebpMap[key];
    }
  });

  const finalGames = featuredGames.concat(remaining);
  console.log('Final games count:', finalGames.length);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>andy web proxy | games hub</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22black%22/><circle cx=%2235%22 cy=%2240%22 r=%228%22 fill=%22red%22/><circle cx=%2265%22 cy=%2240%22 r=%228%22 fill=%22red%22/></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <script src="/gmt/index.js"></script>
    <script src="/assets/js/core.js"></script>
    <script>
        window._proxyReady = (async () => {
            const clearDB = (name) => new Promise(res => {
                const r = indexedDB.deleteDatabase(name);
                r.onsuccess = r.onerror = r.onblocked = () => res();
            });
            try {
                await clearDB('__sj'); await clearDB('sj');
            } catch (_) {}
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = '/worker/working.all.js';
                s.onload = resolve;
                s.onerror = () => reject(new Error('Failed to load proxy engine'));
                document.head.appendChild(s);
            });
        })();
    </script>
    <style>
        :root {
            --glow: #ff0000;
            --bg: #050505;
            --card-bg: #0f0f0f;
            --text: #ffffff;
            --sub-text: #888888;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: 'Outfit', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
        }
        body::-webkit-scrollbar { width: 8px; }
        body::-webkit-scrollbar-track { background: #000; }
        body::-webkit-scrollbar-thumb { background: var(--glow); border-radius: 10px; }

        /* Header & Nav */
        header {
            padding: 20px 5%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: #000;
            border-bottom: 1px solid var(--glow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 32px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 4px;
            color: var(--glow);
            text-shadow: 0 0 15px var(--glow);
        }
        .live-tag {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(255, 0, 0, 0.1);
            padding: 8px 20px;
            border-radius: 4px;
            border: 1px solid var(--glow);
            font-size: 13px;
            font-weight: bold;
            color: var(--glow);
            text-shadow: 0 0 5px var(--glow);
        }
        .pulse {
            width: 8px;
            height: 8px;
            background: var(--glow);
            border-radius: 50%;
            animation: pulse-kf 1.5s infinite;
            box-shadow: 0 0 10px var(--glow);
        }
        @keyframes pulse-kf { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

        .search-container {
            width: 100%;
            max-width: 600px;
            position: relative;
        }
        #search-input {
            width: 100%;
            padding: 15px 25px;
            background: var(--card-bg);
            border: 2px solid #222;
            border-radius: 12px;
            color: #fff;
            font-family: inherit;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }
        #search-input:focus {
            border-color: var(--glow);
            box-shadow: 0 0 20px rgba(255,0,0,0.2);
        }

        .actions { display: flex; gap: 15px; }
        .btn {
            padding: 10px 20px;
            background: transparent;
            border: 2px solid var(--glow);
            color: var(--glow);
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn:hover { background: var(--glow); color: #fff; box-shadow: 0 0 15px var(--glow); }

        /* Grid */
        .container { padding: 0 5% 50px; }
        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 30px;
        }

        .game-card {
            background: var(--card-bg);
            border-radius: 15px;
            overflow: hidden;
            border: 1px solid #222;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            cursor: pointer;
        }
        .game-card:hover {
            transform: translateY(-10px);
            border-color: var(--glow);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,0,0.2);
        }
        .card-img {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
            border-bottom: 2px solid #222;
            transition: border-color 0.4s;
            background: #0d1117;
        }
        .game-card:hover .card-img { border-color: var(--glow); }
        .card-content { padding: 20px; }
        .card-title {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 10px;
            color: var(--glow);
            text-transform: uppercase;
        }
        .card-desc {
            font-size: 14px;
            color: var(--sub-text);
            line-height: 1.5;
            height: 4.5em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }
        .launch-btn {
            margin-top: 20px;
            width: 100%;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--glow);
            color: #fff;
            border-radius: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .game-card:hover .launch-btn { background: var(--glow); }

        /* Proxy Overlay */
        #proxy-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #000;
            z-index: 1000;
            display: none;
        }
        #proxy-frame { width: 100%; height: 100%; border: none; }
        .overlay-tools {
            position: fixed;
            top: 20px; right: 20px;
            display: flex; gap: 10px;
            z-index: 1003;
        }
        .tool-btn {
            background: rgba(0,0,0,0.8);
            border: 1px solid #fff;
            color: #fff;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
            font-weight: bold;
        }
        .tool-btn:hover { background: #fff; color: #000; }

        /* Game Loading Overlay - Clean DOWNLOADING... */
        #game-loader {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #050505;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 25px;
            z-index: 1002;
            pointer-events: none;
        }
        .game-loader-spinner {
            width: 60px; height: 60px;
            border: 4px solid rgba(255, 0, 0, 0.15);
            border-top: 4px solid var(--glow);
            border-radius: 50%;
            animation: spin-kf 1s linear infinite;
            box-shadow: 0 0 25px rgba(255, 0, 0, 0.4);
        }
        @keyframes spin-kf {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .game-loader-text {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 5px;
            color: var(--glow);
            text-shadow: 0 0 20px var(--glow);
            animation: flash 1s infinite alternate;
        }

        /* Settings Modal */
        #settings-modal {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: var(--card-bg);
            padding: 40px;
            border-radius: 20px;
            border: 2px solid var(--glow);
            z-index: 2000;
            display: none;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 0 50px rgba(0,0,0,1);
        }
        .settings-title { font-size: 24px; font-weight: 900; margin-bottom: 25px; text-transform: uppercase; color: var(--glow); }
        .color-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .color-swatch {
            aspect-ratio: 1;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: transform 0.2s;
        }
        .color-swatch:hover { transform: scale(1.1); }
        .color-swatch.active { border-color: #fff; transform: scale(1.1); }

        #loading-screen {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 5px;
            color: var(--glow);
            text-shadow: 0 0 20px var(--glow);
            animation: flash 1s infinite alternate;
        }
        @keyframes flash { from { opacity: 0.5; } to { opacity: 1; } }

        @media (max-width: 768px) {
            .top-row { flex-direction: column; gap: 20px; align-items: flex-start; }
            .games-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div id="loading-screen">INITIALIZING...</div>

    <header>
        <div class="top-row">
            <div class="logo">UIQM Hub</div>
            <div class="actions">
                <div class="live-tag">
                    <div class="pulse"></div>
                    <span><span id="user-count">1</span> LIVE USERS</span>
                    <span id="live-clock" style="margin-left: 10px; border-left: 1px solid rgba(255,0,0,0.3); padding-left: 10px;">--:--:-- --</span>
                </div>
                <button class="btn" onclick="openSettings()">SETTINGS</button>
                <a href="/" class="btn">TERMINAL</a>
            </div>
        </div>
        <div class="search-container">
            <input type="text" id="search-input" placeholder="Search 425+ games..." autocomplete="off">
        </div>
    </header>

    <div class="container">
        <div class="games-grid" id="games-grid">
            <!-- Games injected here -->
        </div>
    </div>

    <div id="proxy-overlay">
        <div id="game-loader">
            <div class="game-loader-spinner"></div>
            <div class="game-loader-text">DOWNLOADING...</div>
        </div>
        <div class="overlay-tools">
            <button class="tool-btn" onclick="toggleFullscreen()">FULLSCREEN</button>
            <button class="tool-btn" onclick="closeGame()" style="border-color: #ff0000; color: #ff0000;">EXIT</button>
        </div>
        <iframe id="proxy-frame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; gamepad" allowfullscreen></iframe>
    </div>

    <div id="settings-modal">
        <div class="settings-title">Theme Color</div>
        <div class="color-options" id="color-options">
            <div class="color-swatch active" style="background: #ff0000;" data-color="#ff0000"></div>
            <div class="color-swatch" style="background: #0088ff;" data-color="#0088ff"></div>
            <div class="color-swatch" style="background: #00ff00;" data-color="#00ff00"></div>
            <div class="color-swatch" style="background: #ff00ff;" data-color="#ff00ff"></div>
            <div class="color-swatch" style="background: #00ffff;" data-color="#00ffff"></div>
            <div class="color-swatch" style="background: #ffaa00;" data-color="#ffaa00"></div>
            <div class="color-swatch" style="background: #ffffff;" data-color="#ffffff"></div>
            <div class="color-swatch" style="background: #aa00ff;" data-color="#aa00ff"></div>
            <div class="color-swatch" style="background: #000; border: 1px solid #0f0; display: flex; align-items: center; justify-content: center; color: #0f0; font-size: 10px; font-weight: bold;" data-color="hacker">01</div>
        </div>
        <button class="btn" style="margin-top: 30px; width: 100%; justify-content: center;" onclick="closeSettings()">CLOSE</button>
    </div>

    <canvas id="matrix-canvas" style="position: fixed; top: 0; left: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity 1s;"></canvas>

    <style>
        body[data-theme="hacker"] { background: #000; color: #0f0; }
        body[data-theme="hacker"] .logo { color: #0f0; text-shadow: 0 0 10px #0f0; }
        body[data-theme="hacker"] .btn { border-color: #0f0; color: #0f0; }
        body[data-theme="hacker"] .btn:hover { background: #0f0; color: #000; }
        body[data-theme="hacker"] .game-card { border-color: #050; }
        body[data-theme="hacker"] .game-card:hover { border-color: #0f0; box-shadow: 0 0 20px rgba(0,255,0,0.3); }
        body[data-theme="hacker"] .card-title { color: #0f0; }
        body[data-theme="hacker"] .launch-btn { border-color: #0f0; }
        body[data-theme="hacker"] .game-card:hover .launch-btn { background: #0f0; color: #000; }
    </style>

    <script>
        function initMatrix() {
            const canvas = document.getElementById('matrix-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const letters = "0101010101010101";
            const fontSize = 16;
            const columns = canvas.width / fontSize;
            const drops = [];
            for (let i = 0; i < columns; i++) drops[i] = 1;
            function draw() {
                ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#0f0";
                ctx.font = fontSize + "px arial";
                for (let i = 0; i < drops.length; i++) {
                    const text = letters.charAt(Math.floor(Math.random() * letters.length));
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                    drops[i]++;
                }
            }
            setInterval(draw, 33);
        }
        initMatrix();

        const games = ${JSON.stringify(finalGames, null, 4)};

        let sjEncode = null;
        const grid = document.getElementById('games-grid');
        const search = document.getElementById('search-input');
        const overlay = document.getElementById('proxy-overlay');
        const frame = document.getElementById('proxy-frame');

        const BARE_MUX_WORKER = '/gmt/worker.js', TRANSPORT_MJS = '/unix/index.mjs';
        const SCRAMJET_PREFIX = '/worker/network/', WISP_URL = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/cron/';
        const WORKER_ROOT = '/worker/';

        const initProxy = async () => {
            try {
                if ('serviceWorker' in navigator) {
                    await navigator.serviceWorker.register('/worker/working.sw.js', {
                        scope: '/worker/'
                    });
                    
                    const script = document.createElement('script');
                    script.src = '/worker/working.all.js';
                    document.head.appendChild(script);
                    script.onload = () => {
                        console.log('Scramjet v2 Engine Loaded');
                        sjEncode = url => WORKER_ROOT + 'network/' + encodeURIComponent(url);
                    };
                }
            } catch (e) {
                console.warn('Service Worker initialization note:', e);
            } finally {
                const ls = document.getElementById('loading-screen');
                if (ls) ls.style.display = 'none';
            }
            
            // Pre-fetch Rammerhead session ID for games
            fetch('/newsession')
                .then(r => r.text())
                .then(id => {
                    if (id && id.length === 32) window._rhSession = id;
                })
                .catch(() => {});
        };

        const renderGames = (filter = '') => {
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
                    const titleText = (game.title || 'Game').replace(/</g, '').replace(/>/g, '');
                    this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="%230d1117"/><text x="50%" y="50%" fill="%23ff0000" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="middle">' + encodeURIComponent(titleText) + '</text></svg>';
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
        };

        const launchGame = (url) => {
            overlay.style.display = 'block';
            const gl = document.getElementById('game-loader');
            if (gl) gl.style.display = 'flex';

            if (window._gameLoadTimer) clearTimeout(window._gameLoadTimer);
            window._gameLoadTimer = setTimeout(() => {
                if (gl) gl.style.display = 'none';
            }, 6000);

            frame.onload = () => {
                if (gl) gl.style.display = 'none';
                try {
                    const doc = frame.contentDocument || frame.contentWindow?.document;
                    if (doc) {
                        const cat = doc.getElementById('spinning-logo');
                        if (cat) cat.remove();
                        const note = doc.getElementById('note');
                        if (note) note.textContent = 'DOWNLOADING...';
                        const style = doc.createElement('style');
                        style.textContent = '#spinning-logo { display: none !important; } #note { color: #ff0000 !important; font-family: sans-serif !important; }';
                        doc.head?.appendChild(style);
                    }
                } catch(_) {}
            };

            // Fast direct or proxied launch
            if (url.startsWith('https://cdn.jsdelivr.net/gh/web-dashers') || url.startsWith('https://celesteclassic.github.io')) {
                frame.src = url;
            } else if (sjEncode) {
                frame.src = sjEncode(url);
            } else if (window._rhSession) {
                frame.src = '/' + window._rhSession + '/' + url;
            } else {
                frame.src = '/proxy/' + encodeURIComponent(url);
            }
        };

        const closeGame = () => {
            overlay.style.display = 'none';
            const gl = document.getElementById('game-loader');
            if (gl) gl.style.display = 'none';
            if (window._gameLoadTimer) clearTimeout(window._gameLoadTimer);
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

        search.oninput = () => renderGames(search.value);

        // Live users
        const updateUsers = () => {
            const count = Math.floor(Math.random() * (3 - 1) + 1);
            document.getElementById('user-count').innerText = count;
        };
        updateUsers(); setInterval(updateUsers, 10000);

        // Live clock
        function updateClock() {
            const el = document.getElementById('live-clock');
            if (!el) return;
            const now = new Date();
            el.innerText = now.toLocaleTimeString();
        }
        updateClock(); setInterval(updateClock, 1000);

        // Restore saved tab cloak from localStorage
        const savedTitle = localStorage.getItem('term-cloak-title');
        const savedIcon = localStorage.getItem('term-cloak-icon');
        if (savedTitle) document.title = savedTitle;
        if (savedIcon) {
            const l = document.querySelector("link[rel*='icon']") || document.createElement('link');
            l.type = 'image/x-icon'; l.rel = 'shortcut icon'; l.href = savedIcon;
            document.head.appendChild(l);
        }

        renderGames();
        initProxy();
    </script>
</body>
</html>
`;

  fs.writeFileSync('views/pages/hub.html', fullHtml, 'utf8');
  fs.writeFileSync('hub.html', fullHtml, 'utf8');
  fs.writeFileSync('views/dist/pages/hub.html', fullHtml, 'utf8');
  console.log('Successfully wrote views/pages/hub.html, hub.html, and views/dist/pages/hub.html!');
}

main().catch(err => {
  console.error('Build hub failed:', err);
  process.exit(1);
});
