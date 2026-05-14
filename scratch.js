const location_origin = 'https://uiqm.lol';

const codecDecode = s => {
    if (!s) return location_origin + '/';
    let p = s;
    if (p.startsWith('network/')) p = p.slice(8);
    if (p.startsWith('scramjet/')) p = p.slice(9);
    try { 
        const d = decodeURIComponent(p); 
        let finalUrl = d.includes('://') ? d : 'https://'+d;
        new URL(finalUrl); // test if valid
        return finalUrl;
    } catch { return location_origin + '/'; }
};

console.log('network/:', codecDecode('network/'));
console.log('network/https://www.roblox.com/:', codecDecode('network/https://www.roblox.com/'));
console.log('https%3A%2F%2Fwww.roblox.com%2F:', codecDecode('https%3A%2F%2Fwww.roblox.com%2F'));
console.log('://:', codecDecode('://'));
