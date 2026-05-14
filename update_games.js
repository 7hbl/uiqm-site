const fs = require('fs');

async function main() {
    const response = await fetch('https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/games.js');
    const text = await response.text();
    
    // Extract the array content
    const match = text.match(/const games = (\[[\s\S]*?\]);/);
    if (!match) {
        console.error("Could not find games array in fetched file");
        return;
    }
    
    let games = eval(match[1]);
    
    // Remove Roblox if present
    games = games.filter(g => g.title.toLowerCase() !== 'roblox');
    
    // Fix URLs if they are relative
    games = games.map(g => {
        if (g.url && g.url.startsWith('games/')) {
            g.url = 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/' + g.url;
        }
        if (g.image && g.image.startsWith('images/')) {
            g.image = 'https://raw.githubusercontent.com/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor/refs/heads/master/' + g.image;
        }
        return g;
    });

    // Add some Z-Kit games mentioned in the screenshot
    const zKitGames = [
        { title: "Antonblast", desc: "A fast-paced explosion-filled platformer", url: "https://antonblast.com/", image: "https://z-kit.net/assets/games/antonblast.png" },
        { title: "Bad Parenting 1", desc: "A psychological horror game", url: "https://98corbins.itch.io/bad-parenting-1", image: "https://z-kit.net/assets/games/badparenting.png" },
        { title: "Baldi's Basics Plus", desc: "A surreal horror game set in a school", url: "https://basically-games.itch.io/baldis-basics-plus", image: "https://z-kit.net/assets/games/baldi.png" },
        { title: "Bendy and the Ink Machine", desc: "A first-person puzzle-action-horror game", url: "https://joeydrewstudios.com/batim", image: "https://z-kit.net/assets/games/bendy.png" },
        { title: "Buckshot Roulette", desc: "A deadly game of Russian Roulette", url: "https://mikeklubnika.itch.io/buckshot-roulette", image: "https://z-kit.net/assets/games/buckshot.png" },
        { title: "Celeste", desc: "A precise, challenging platformer", url: "https://maddymakesgames.com/celeste", image: "https://z-kit.net/assets/games/celeste.png" }
    ];

    // Merge and remove duplicates
    const allGames = [...zKitGames, ...games];
    const seen = new Set();
    const uniqueGames = allGames.filter(g => {
        const key = g.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const gamesString = JSON.stringify(uniqueGames, null, 12);
    
    // Read hub.html
    const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
    let hubContent = fs.readFileSync(hubPath, 'utf8');
    
    // Replace the games array
    const gamesRegex = /const games = \[[\s\S]*?\];/;
    hubContent = hubContent.replace(gamesRegex, `const games = ${gamesString};`);
    
    fs.writeFileSync(hubPath, hubContent);
    console.log("Updated hub.html with " + uniqueGames.length + " games.");
}

main();
