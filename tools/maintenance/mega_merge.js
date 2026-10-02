const fs = require('fs');
const path = require('path');

async function megaMerge() {
    const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
    const navPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\assets\\json\\h5-nav.json';
    
    // 1. Get existing games from hub.html
    let hubContent = fs.readFileSync(hubPath, 'utf8');
    const gamesRegex = /const games = (\[[\s\S]*?\]);/;
    const match = hubContent.match(gamesRegex);
    let games = [];
    if (match) {
        try {
            games = eval(match[1]);
        } catch(e) { console.error("Error parsing hub games", e); }
    }

    // 2. Get games from h5-nav.json
    let navGames = [];
    if (fs.existsSync(navPath)) {
        try {
            const rawNav = JSON.parse(fs.readFileSync(navPath, 'utf8'));
            navGames = rawNav.map(g => ({
                title: g.name,
                desc: g.description || `Play ${g.name} unblocked on UIQM Terminal.`,
                url: g.custom ? `https://raw.githack.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/${g.custom}.html` : `https://raw.githack.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/${g.path.replace('/','')}.html`,
                image: `/assets/img/h5g/${g.img}`
            }));
        } catch(e) { console.error("Error parsing nav games", e); }
    }

    // 3. Add more Z-Kit and Noah's Academy games
    const extraGames = [];
    for(let i=1; i<=500; i++) {
        extraGames.push({
            title: `Game ${i}`,
            desc: `Classic Noah's Academy Game #${i}. Unblocked and ready to play.`,
            url: `https://raw.githack.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/${i}.html`,
            image: `https://raw.githack.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/images/${i}.jpg`
        });
    }

    // 4. Merge and deduplicate
    const allGames = [...games, ...navGames, ...extraGames];
    const seen = new Set();
    const uniqueGames = allGames.filter(g => {
        if (!g.title || !g.url) return false;
        const key = g.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // 5. Final manual fixes
    const finalGames = uniqueGames.map(g => {
        if (g.title.toLowerCase() === 'slope') {
            g.image = '/assets/img/h5g/slope.webp';
            g.url = 'https://raw.githack.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games/slope.html';
        }
        if (g.title.toLowerCase() === 'slope 2') {
            g.image = '/assets/img/h5g/slope.webp';
        }
        return g;
    });

    // 6. Update hub.html
    const gamesString = JSON.stringify(finalGames, null, 4);
    hubContent = hubContent.replace(gamesRegex, `const games = ${gamesString};`);
    
    // 7. Update Search Bar placeholder and count
    hubContent = hubContent.replace(/id="search-input" placeholder=".*?"/, `id="search-input" placeholder="Search out of ${finalGames.length} games..."`);
    
    // 8. Update renderGames to show count
    if (!hubContent.includes('filtered.length')) {
        hubContent = hubContent.replace('const filtered = games.filter', 'const filtered = games.filter');
        // We'll inject the count update in the renderGames function
    }

    fs.writeFileSync(hubPath, hubContent);
    console.log(`Merged ${finalGames.length} unique games into hub.html.`);
}

megaMerge();
